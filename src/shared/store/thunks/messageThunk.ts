import { v4 as uuid } from 'uuid';
import { DataRepository } from '../../services/DataRepository';
import { dexieStorage } from '../../services/DexieStorageService'; // 保持兼容性，逐步迁移
import { createUserMessage, createAssistantMessage } from '../../utils/messageUtils';
import { getMainTextContent, findImageBlocks, findFileBlocks } from '../../utils/blockUtils';
import { newMessagesActions } from '../slices/newMessagesSlice';
import { upsertManyBlocks, upsertOneBlock, removeManyBlocks, addOneBlock } from '../slices/messageBlocksSlice';
import { MessageBlockStatus, MessageBlockType, AssistantMessageStatus } from '../../types/newMessage';
import { createResponseHandler } from '../../services/messages/ResponseHandler';
import { ApiProviderRegistry } from '../../services/messages/ApiProvider';
import { getFileTypeByExtension, readFileContent, FileTypes } from '../../utils/fileUtils';
import { generateImage as generateOpenAIImage } from '../../api/openai/image';
import { generateImage as generateGeminiImage } from '../../api/gemini/image';
import { createImageBlock } from '../../utils/messageUtils';
import { throttle } from 'lodash';
import { createAbortController } from '../../utils/abortController';
import type { Message, MessageBlock } from '../../types/newMessage';
import type { Model, MCPTool } from '../../types';
import type { FileType } from '../../types';
import type { RootState, AppDispatch } from '../index';
import { mcpService } from '../../services/MCPService';

// 移除未使用的导入 - MCP 工具注入现在由提供商层处理

// 保存消息和块到数据库
export const saveMessageAndBlocksToDB = async (message: Message, blocks: MessageBlock[]) => {
  try {
    // 使用事务保证原子性
    await dexieStorage.transaction('rw', [
      dexieStorage.topics,
      dexieStorage.messages,
      dexieStorage.message_blocks
    ], async () => {
      // 保存消息块
      if (blocks.length > 0) {
        await dexieStorage.bulkSaveMessageBlocks(blocks);
      }

      // 保存消息到messages表（保持兼容性）
      await dexieStorage.messages.put(message);

      // 更新topics表中的messages数组（电脑端方式）
      const topic = await dexieStorage.topics.get(message.topicId);
      if (topic) {
        // 确保messages数组存在
        if (!topic.messages) {
          topic.messages = [];
        }

        // 查找消息在数组中的位置
        const messageIndex = topic.messages.findIndex(m => m.id === message.id);

        // 更新或添加消息
        if (messageIndex >= 0) {
          topic.messages[messageIndex] = message;
        } else {
          topic.messages.push(message);
        }

        // 同时更新messageIds数组（保持兼容性）
        if (!topic.messageIds) {
          topic.messageIds = [];
        }

        if (!topic.messageIds.includes(message.id)) {
          topic.messageIds.push(message.id);
        }

        // 更新话题的lastMessageTime
        topic.lastMessageTime = message.createdAt || message.updatedAt || new Date().toISOString();

        // 保存更新后的话题
        await dexieStorage.topics.put(topic);
      }
    });
  } catch (error) {
    console.error('保存消息和块到数据库失败:', error);
    throw error;
  }
};

// 节流更新块 - 在processAssistantResponse中使用
export const throttledBlockUpdate = throttle(async (id: string, blockUpdate: Partial<MessageBlock>) => {
  // 只更新数据库，Redux状态由ResponseHandler处理
  await dexieStorage.updateMessageBlock(id, blockUpdate);
}, 150);

// 取消节流更新函数，在需要时可以使用
// const cancelThrottledBlockUpdate = throttledBlockUpdate.cancel;

/**
 * 发送消息并处理助手回复的Thunk
 */
export const sendMessage = (
  content: string,
  topicId: string,
  model: Model,
  images?: Array<{ url: string }>,
  toolsEnabled?: boolean,
  files?: FileType[]
) => async (dispatch: AppDispatch, getState: () => RootState) => {
  try {
    // 获取当前助手ID
    // 直接从数据库获取主题信息
    const topic = await DataRepository.topics.getById(topicId);
    if (!topic) {
      throw new Error(`主题 ${topicId} 不存在`);
    }
    const assistantId = topic.assistantId || '';

    if (!assistantId) {
      throw new Error('找不到当前助手ID');
    }

    // 1. 创建用户消息和块
    const { message: userMessage, blocks: userBlocks } = createUserMessage({
      content,
      assistantId,
      topicId,
      modelId: model.id,
      model,
      images,
      files
    });

    // 2. 保存用户消息和块到数据库
    await saveMessageAndBlocksToDB(userMessage, userBlocks);

    // 3. 更新Redux状态
    dispatch(newMessagesActions.addMessage({ topicId, message: userMessage }));
    if (userBlocks.length > 0) {
      dispatch(upsertManyBlocks(userBlocks));
    }

    // 4. 创建助手消息
    const { message: assistantMessage, blocks: assistantBlocks } = createAssistantMessage({
      assistantId,
      topicId,
      modelId: model.id,
      model,
      askId: userMessage.id
    });

    // 5. 保存助手消息到数据库
    await saveMessageAndBlocksToDB(assistantMessage, assistantBlocks);

    // 6. 更新Redux状态
    dispatch(newMessagesActions.addMessage({ topicId, message: assistantMessage }));

    // 7. 设置加载状态
    dispatch(newMessagesActions.setTopicLoading({ topicId, loading: true }));
    dispatch(newMessagesActions.setTopicStreaming({ topicId, streaming: true }));

    // 8. 处理助手响应
    await processAssistantResponse(dispatch, getState, assistantMessage, topicId, model, toolsEnabled);

    return userMessage.id;
  } catch (error) {
    console.error('发送消息失败:', error);

    // 清除加载状态
    dispatch(newMessagesActions.setTopicLoading({ topicId, loading: false }));
    dispatch(newMessagesActions.setTopicStreaming({ topicId, streaming: false }));

    throw error;
  }
};

/**
 * 处理助手响应
 */
const processAssistantResponse = async (
  dispatch: AppDispatch,
  _getState: () => RootState,
  assistantMessage: Message,
  topicId: string,
  model: Model,
  toolsEnabled?: boolean
) => {
  try {
    // 1. 获取 MCP 工具（如果启用）
    let mcpTools: MCPTool[] = [];
    if (toolsEnabled) {
      try {
        mcpTools = await mcpService.getAllAvailableTools();
        console.log(`[MCP] 获取到 ${mcpTools.length} 个可用工具`);
        if (mcpTools.length > 0) {
          console.log(`[MCP] 工具列表:`, mcpTools.map(t => t.name || t.id).join(', '));
        }
      } catch (error) {
        console.error('[MCP] 获取工具失败:', error);
      }
    } else {
      console.log(`[MCP] 工具未启用 (toolsEnabled=${toolsEnabled})`);
    }

    // 2. 准备API请求
    const messages = await prepareMessagesForApi(topicId, assistantMessage.id, mcpTools);

    // 2. 设置消息状态为处理中，避免显示错误消息
    dispatch(newMessagesActions.updateMessage({
      id: assistantMessage.id,
      changes: {
        status: AssistantMessageStatus.PROCESSING
      }
    }));

    // 3. 创建占位符块（参考最佳实例逻辑）
    // 这避免了重复创建块的问题，通过动态转换块类型来处理不同的内容
    const placeholderBlock: MessageBlock = {
      id: uuid(),
      messageId: assistantMessage.id,
      type: MessageBlockType.UNKNOWN,
      content: '',
      createdAt: new Date().toISOString(),
      status: MessageBlockStatus.PROCESSING
    };

    console.log(`[sendMessage] 创建占位符块: ${placeholderBlock.id}`);

    // 添加占位符块到Redux
    dispatch(upsertOneBlock(placeholderBlock));

    // 保存占位符块到数据库
    await dexieStorage.saveMessageBlock(placeholderBlock);

    // 4. 关联占位符块到消息
    dispatch(newMessagesActions.updateMessage({
      id: assistantMessage.id,
      changes: {
        blocks: [placeholderBlock.id]
      }
    }));

    // 5. 更新消息数据库（同时更新messages表和topic.messages数组）
    await dexieStorage.transaction('rw', [
      dexieStorage.messages,
      dexieStorage.topics
    ], async () => {
      // 更新messages表
      await dexieStorage.updateMessage(assistantMessage.id, {
        blocks: [placeholderBlock.id]
      });

      // 更新topic.messages数组
      const topic = await dexieStorage.topics.get(topicId);
      if (topic && topic.messages) {
        const messageIndex = topic.messages.findIndex(m => m.id === assistantMessage.id);
        if (messageIndex >= 0) {
          topic.messages[messageIndex] = {
            ...topic.messages[messageIndex],
            blocks: [placeholderBlock.id]
          };
          await dexieStorage.topics.put(topic);
        }
      }
    });

    // 7. 创建AbortController
    const { abortController, cleanup } = createAbortController(assistantMessage.askId, true);



    // 8. 创建响应处理器，使用占位符块ID
    const responseHandler = createResponseHandler({
      messageId: assistantMessage.id,
      blockId: placeholderBlock.id,
      topicId
    });

    // 10. 获取API提供者
    const apiProvider = ApiProviderRegistry.get(model);

    // 9. 检查是否为图像生成模型
    // 优先检查模型编辑界面中的"输出能力"标签（modelTypes）
    const isImageGenerationModel =
      // 1. 优先检查 modelTypes 中是否包含图像生成类型（对应编辑界面的"输出能力"）
      (model.modelTypes && model.modelTypes.includes('image_gen' as any)) ||
      // 2. 检查模型的图像生成标志
      model.imageGeneration ||
      model.capabilities?.imageGeneration ||
      // 3. 兼容旧的字符串格式
      (model.modelTypes && model.modelTypes.includes('image-generation' as any)) ||
      // 4. 基于模型ID的后备检测（用于未正确配置的模型）
      model.id.toLowerCase().includes('flux') ||
      model.id.toLowerCase().includes('black-forest') ||
      model.id.toLowerCase().includes('stable-diffusion') ||
      model.id.toLowerCase().includes('sd') ||
      model.id.toLowerCase().includes('dalle') ||
      model.id.toLowerCase().includes('midjourney') ||
      model.id.toLowerCase().includes('grok-2-image') ||
      model.id === 'grok-2-image-1212' ||
      model.id === 'grok-2-image' ||
      model.id === 'grok-2-image-latest' ||
      model.id === 'gemini-2.0-flash-exp-image-generation' ||
      model.id === 'gemini-2.0-flash-preview-image-generation' ||
      (model.id === 'gemini-2.0-flash-exp' && model.imageGeneration);

    // 10. 发送API请求
    try {
      let response: any;

      if (isImageGenerationModel) {
        // 获取最后一条用户消息作为图像生成提示词
        const lastUserMessage = messages.filter(msg => msg.role === 'user').pop();
        let prompt = '生成一张图片';

        // 处理不同类型的content
        if (lastUserMessage?.content) {
          if (typeof lastUserMessage.content === 'string') {
            prompt = lastUserMessage.content;
          } else if (Array.isArray(lastUserMessage.content)) {
            // 从多模态内容中提取文本
            const textParts = lastUserMessage.content
              .filter((part: any) => part.type === 'text')
              .map((part: any) => part.text);
            prompt = textParts.join(' ') || '生成一张图片';
          }
        }

        // 根据模型类型选择不同的图像生成API
        let imageUrls: string[] = [];

        if (model.provider === 'google' || model.id.startsWith('gemini-')) {
          // 使用 Gemini 图像生成API
          imageUrls = await generateGeminiImage(model, {
            prompt: prompt,
            imageSize: '1024x1024',
            batchSize: 1
          });
          responseHandler.handleChunk('Gemini 图像生成完成！');
        } else {
          // 使用 OpenAI 兼容的图像生成API（支持 Grok、SiliconFlow 等）
          imageUrls = await generateOpenAIImage(model, {
            prompt: prompt,
            imageSize: '1024x1024',
            batchSize: 1
          });
          responseHandler.handleChunk('图像生成完成！');
        }

        // 处理图像生成结果
        if (imageUrls && imageUrls.length > 0) {
          const imageUrl = imageUrls[0];

          // 如果是base64图片，保存到数据库并创建引用
          let finalImageUrl = imageUrl;
          if (imageUrl.startsWith('data:image/')) {
            try {
              // 保存base64图片到数据库
              const imageId = await dexieStorage.saveBase64Image(imageUrl, {
                topicId: topicId,
                messageId: assistantMessage.id,
                source: 'ai_generated',
                model: model.id
              });

              // 使用图片引用格式
              finalImageUrl = `[图片:${imageId}]`;
            } catch (error) {
              console.error('保存生成的图片失败，使用原始base64:', error);
              // 如果保存失败，继续使用原始base64
            }
          }

          // 创建图片块
          const imageBlock = createImageBlock(assistantMessage.id, {
            url: finalImageUrl,
            mimeType: imageUrl.startsWith('data:image/png') ? 'image/png' :
                     imageUrl.startsWith('data:image/jpeg') ? 'image/jpeg' :
                     'image/png'
          });

          // 添加图片块到 Redux 状态
          dispatch(addOneBlock(imageBlock));

          // 保存图片块到数据库
          await dexieStorage.saveMessageBlock(imageBlock);

          // 将图片块ID添加到消息的blocks数组
          dispatch(newMessagesActions.upsertBlockReference({
            messageId: assistantMessage.id,
            blockId: imageBlock.id,
            status: imageBlock.status
          }));

          // 更新消息的blocks数组并保存到数据库
          const updatedMessage = {
            ...assistantMessage,
            blocks: [...(assistantMessage.blocks || []), imageBlock.id],
            updatedAt: new Date().toISOString()
          };

          // 更新Redux中的消息
          dispatch(newMessagesActions.updateMessage({
            id: assistantMessage.id,
            changes: updatedMessage
          }));

          // 保存消息到数据库并更新topics表
          await dexieStorage.transaction('rw', [
            dexieStorage.messages,
            dexieStorage.topics
          ], async () => {
            // 更新messages表
            await dexieStorage.updateMessage(assistantMessage.id, updatedMessage);

            // 更新topics表中的messages数组
            const topic = await dexieStorage.topics.get(topicId);
            if (topic && topic.messages) {
              const messageIndex = topic.messages.findIndex(m => m.id === assistantMessage.id);
              if (messageIndex >= 0) {
                topic.messages[messageIndex] = updatedMessage;
                await dexieStorage.topics.put(topic);
              }
            }
          });

          response = '图像生成完成！';
        } else {
          response = '图像生成失败，没有返回有效的图像URL。';
        }
      } else {

        // 将简化的消息对象转换为Message类型，但保持content的原始格式
        const convertedMessages = messages.map((msg: any) => ({
          id: `temp-${Date.now()}-${Math.random()}`,
          role: msg.role,
          content: msg.content, // 保持原始content格式（可能是字符串或数组）
          assistantId: '',
          topicId: topicId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'success' as any,
          blocks: []
        }));

        // 获取 MCP 模式设置
        const mcpMode = localStorage.getItem('mcp-mode') as 'prompt' | 'function' || 'function';
        console.log(`[MCP] 当前模式: ${mcpMode}`);

        // 使用Provider的sendChatMessage方法，避免重复调用
        response = await apiProvider.sendChatMessage(
          convertedMessages,
          {
            onUpdate: (content: string, reasoning?: string) => {
              // 传递推理内容给ResponseHandler（兼容旧接口）
              responseHandler.handleChunk(content, reasoning);
            },
            onChunk: (chunk: import('../../types/chunk').Chunk) => {
              // 使用新的 Chunk 事件处理（最佳实例架构）
              responseHandler.handleChunkEvent(chunk);
            },
            enableTools: toolsEnabled !== false, // 默认启用工具
            // 始终传递 MCP 工具给提供商，让提供商的智能切换机制决定如何使用
            mcpTools: mcpTools,
            mcpMode: mcpMode, // 传递 MCP 模式
            abortSignal: abortController.signal // 传递中断信号
          }
        );
      }

      // 处理不同类型的响应
      let finalContent: string;
      let reasoning: string | undefined;

      if (typeof response === 'string') {
        finalContent = response;
      } else if (response && typeof response === 'object' && 'content' in response) {
        finalContent = response.content;
        // 提取思考过程
        reasoning = response.reasoning || response.reasoning_content;
      } else {
        finalContent = '';
      }

      // 工具调用现在完全在 AI 提供者层面处理（包括函数调用和 XML 格式）
      // AI 提供者会自动检测工具调用、执行工具、将结果添加到对话历史并继续对话
      console.log(`[processAssistantResponse] 工具调用已在 AI 提供者层面处理完成`);

      // 对于非流式响应，onUpdate回调已经在Provider层正确处理了思考过程和普通文本
      // 不需要重复处理，避免重复调用导致的问题
      console.log(`[processAssistantResponse] 非流式响应处理完成，内容长度: ${finalContent.length}, 思考过程长度: ${reasoning?.length || 0}`);

      return await responseHandler.complete(finalContent);
    } catch (error) {
      return await responseHandler.fail(error as Error);
    } finally {
      // 清理AbortController
      if (cleanup) {
        cleanup();
      }
    }
  } catch (error) {
    console.error('处理助手响应失败:', error);

    // 错误恢复：确保状态重置
    dispatch(newMessagesActions.setTopicLoading({ topicId, loading: false }));
    dispatch(newMessagesActions.setTopicStreaming({ topicId, streaming: false }));

    throw error;
  }
};

/**
 * 准备API请求的消息
 */
const prepareMessagesForApi = async (
  topicId: string,
  assistantMessageId: string,
  _mcpTools?: MCPTool[] // 添加下划线前缀表示未使用的参数
) => {
  // 获取主题的所有消息
  const messages = await dexieStorage.getMessagesByTopicId(topicId);

  // 按创建时间排序消息，确保顺序正确
  const sortedMessages = [...messages].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return timeA - timeB; // 升序排列，最早的在前面
  });

  // 获取当前助手消息
  const assistantMessage = sortedMessages.find(msg => msg.id === assistantMessageId);
  if (!assistantMessage) {
    throw new Error(`找不到助手消息 ${assistantMessageId}`);
  }

  // 获取当前助手消息的创建时间
  const assistantMessageTime = new Date(assistantMessage.createdAt).getTime();

  // 获取当前助手ID，用于获取系统提示词
  const topic = await dexieStorage.getTopic(topicId);
  const assistantId = topic?.assistantId;

  // 获取系统提示词
  let systemPrompt = '';
  if (assistantId) {
    const assistant = await dexieStorage.getAssistant(assistantId);
    if (assistant) {
      systemPrompt = assistant.systemPrompt || '';

      // 如果话题有自定义提示词，优先使用话题的提示词
      if (topic && topic.prompt) {
        systemPrompt = topic.prompt;
      }
    }
  }

  // 转换为API请求格式，只包含当前助手消息之前的消息
  const apiMessages = [];

  for (const message of sortedMessages) {
    // 跳过当前正在处理的助手消息和所有system消息
    if (message.id === assistantMessageId || message.role === 'system') {
      continue;
    }

    // 只包含创建时间早于当前助手消息的消息
    const messageTime = new Date(message.createdAt).getTime();
    if (messageTime >= assistantMessageTime) {
      continue;
    }

    // 获取消息内容 - 简单版本，直接使用文本内容
    const content = getMainTextContent(message);

    // 检查是否有文件或图片块
    const imageBlocks = findImageBlocks(message);
    const fileBlocks = findFileBlocks(message);

    // 如果没有文件和图片，使用简单格式
    if (imageBlocks.length === 0 && fileBlocks.length === 0) {
      apiMessages.push({
        role: message.role,
        content: content || '' // 确保content不为undefined或null
      });
    } else {
      // 有文件或图片时，使用多模态格式
      const parts = [];

      // 确保至少有一个文本部分，即使内容为空
      // 这样可以避免parts数组为空导致API请求失败
      parts.push({ type: 'text', text: content || '' });

      // 处理图片块
      for (const imageBlock of imageBlocks) {
        if (imageBlock.url) {
          parts.push({
            type: 'image_url',
            image_url: {
              url: imageBlock.url
            }
          });
        } else if (imageBlock.file && imageBlock.file.base64Data) {
          let base64Data = imageBlock.file.base64Data;
          if (base64Data.includes(',')) {
            base64Data = base64Data.split(',')[1];
          }
          parts.push({
            type: 'image_url',
            image_url: {
              url: `data:${imageBlock.file.mimeType || 'image/jpeg'};base64,${base64Data}`
            }
          });
        }
      }

      // 处理文件块
      for (const fileBlock of fileBlocks) {
        if (fileBlock.file) {
          const fileType = getFileTypeByExtension(fileBlock.file.name || fileBlock.file.origin_name || '');

          // 只处理文本和文档类型的文件
          if (fileType === FileTypes.TEXT || fileType === FileTypes.DOCUMENT) {
            try {
              const fileContent = await readFileContent(fileBlock.file);
              if (fileContent) {
                // 按照最佳实例格式：文件名\n文件内容
                const fileName = fileBlock.file.origin_name || fileBlock.file.name || '未知文件';
                parts.push({
                  type: 'text',
                  text: `${fileName}\n${fileContent}`
                });
              }
            } catch (error) {
              console.error(`[prepareMessagesForApi] 读取文件内容失败:`, error);
            }
          }
        }
      }

      apiMessages.push({
        role: message.role,
        content: parts
      });
    }
  }

  // 在数组开头添加系统消息
  // 注意：MCP 工具注入现在由提供商层的智能切换机制处理
  apiMessages.unshift({
    role: 'system',
    content: systemPrompt
  });

  return apiMessages;
};

/**
 * 删除消息的Thunk
 */
export const deleteMessage = (messageId: string, topicId: string) => async (dispatch: AppDispatch) => {
  try {
    // 1. 获取消息
    const message = await dexieStorage.getMessage(messageId);
    if (!message) {
      throw new Error(`消息 ${messageId} 不存在`);
    }

    // 2. 获取消息块
    const blocks = await dexieStorage.getMessageBlocksByMessageId(messageId);
    const blockIds = blocks.map(block => block.id);

    // 3. 从Redux中移除消息块
    if (blockIds.length > 0) {
      dispatch(removeManyBlocks(blockIds));
    }

    // 4. 从Redux中移除消息
    dispatch(newMessagesActions.removeMessage({ topicId, messageId }));

    // 5. 从数据库中删除消息块和消息
    await dexieStorage.transaction('rw', [
      dexieStorage.messages,
      dexieStorage.message_blocks,
      dexieStorage.topics
    ], async () => {
      // 删除消息块
      if (blockIds.length > 0) {
        await dexieStorage.message_blocks.bulkDelete(blockIds);
      }

      // 删除messages表中的消息（保持兼容性）
      await dexieStorage.messages.delete(messageId);

      // 更新topics表中的messages数组（电脑端方式）
      const topic = await dexieStorage.topics.get(topicId);
      if (topic) {
        // 更新messageIds数组（保持兼容性）
        if (topic.messageIds) {
          topic.messageIds = topic.messageIds.filter(id => id !== messageId);
        }

        // 更新messages数组
        if (topic.messages) {
          topic.messages = topic.messages.filter(m => m.id !== messageId);
        }

        // 更新lastMessageTime
        if (topic.messages && topic.messages.length > 0) {
          const lastMessage = topic.messages[topic.messages.length - 1];
          topic.lastMessageTime = lastMessage.createdAt || lastMessage.updatedAt || new Date().toISOString();
        } else {
          topic.lastMessageTime = new Date().toISOString();
        }

        // 保存更新后的话题
        await dexieStorage.topics.put(topic);
      }
    });

    return true;
  } catch (error) {
    console.error(`删除消息失败:`, error);
    throw error;
  }
};

/**
 * 重新生成消息的Thunk
 */
export const regenerateMessage = (messageId: string, topicId: string, model: Model) =>
  async (dispatch: AppDispatch, getState: () => RootState) => {
  try {
    // 1. 获取消息
    const message = await dexieStorage.getMessage(messageId);
    if (!message) {
      throw new Error(`消息 ${messageId} 不存在`);
    }

    // 只能重新生成助手消息
    if (message.role !== 'assistant') {
      throw new Error('只能重新生成助手消息');
    }

    // 2. 获取原始用户消息
    const askId = message.askId;
    if (!askId) {
      throw new Error('找不到原始用户消息ID');
    }

    const userMessage = await dexieStorage.getMessage(askId);
    if (!userMessage) {
      throw new Error(`找不到原始用户消息 ${askId}`);
    }

    // 3. 获取消息块
    const blocks = await dexieStorage.getMessageBlocksByMessageId(messageId);
    const blockIds = blocks.map(block => block.id);

    // 4. 创建版本历史记录 - 保存当前版本
    // 初始化versions数组，如果不存在则创建
    const versions = message.versions || [];

    // 创建新版本ID
    const currentVersionId = uuid();

    // 深拷贝块数据，确保版本历史中保存完整的块数据
    const blocksForVersion = [];
    for (const block of blocks) {
      // 创建块的深拷贝
      const blockCopy = { ...block };
      // 生成新的ID，避免ID冲突
      blockCopy.id = uuid();
      // 在metadata中存储版本信息
      if (!blockCopy.metadata) blockCopy.metadata = {};
      blockCopy.metadata.versionId = currentVersionId;
      // 保存到数据库
      await dexieStorage.saveMessageBlock(blockCopy);
      // 添加到版本块列表
      blocksForVersion.push(blockCopy.id);
    }

    // 获取消息的主文本内容
    const messageContent = getMainTextContent(message);

    // 创建当前版本记录
    const currentVersion = {
      id: currentVersionId,
      messageId: message.id,
      blocks: blocksForVersion, // 使用新创建的块ID列表
      content: messageContent, // 保存当前版本的文本内容
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      modelId: message.modelId,
      model: message.model,
      isActive: false, // 新版本将是活跃的，旧版本设为非活跃
      metadata: {
        content: messageContent, // 保存内容到metadata
        blockIds: blocksForVersion // 额外保存块ID，确保版本与块的关联
      }
    };

    // 将当前版本添加到版本历史中
    versions.push(currentVersion);

    console.log(`[regenerateMessage] 创建版本历史记录: 版本ID=${currentVersionId}, 块数量=${blocksForVersion.length}`);

    // 5. 从Redux中移除消息块
    if (blockIds.length > 0) {
      dispatch(removeManyBlocks(blockIds));
    }

    // 6. 重置消息状态
    // const resetMessage = resetAssistantMessage(message, {
    //   status: AssistantMessageStatus.PENDING,
    //   updatedAt: new Date().toISOString(),
    //   model: model,
    //   // 添加版本历史
    //   versions: versions.map((v, index) => ({
    //     ...v,
    //     // 最后添加的版本设置为活跃状态
    //     isActive: index === versions.length - 1
    //   }))
    // });

    // 创建更新对象
    const resetMessage = {
      ...message,
      status: AssistantMessageStatus.PENDING,
      updatedAt: new Date().toISOString(),
      model: model,
      modelId: model.id,
      blocks: [], // 清空块，等待processAssistantResponse创建新的块
      // 设置版本的活跃状态
      versions: versions.map((v, index) => {
        // 记录版本信息
        if (Array.isArray(v.blocks) && v.blocks.length > 0) {
          console.log(`[regenerateMessage] 版本 ${v.id} 有 ${v.blocks.length} 个块`);
        }

        return {
          ...v,
          // 最后添加的版本设置为活跃状态
          isActive: index === versions.length - 1
        };
      })
    };

    // 保存最新版本ID，用于后续自动加载
    const latestVersionId = versions.length > 0 ? versions[versions.length - 1].id : null;
    console.log(`[regenerateMessage] 最新版本ID: ${latestVersionId}`);

    // 将最新版本ID保存到localStorage，用于页面刷新后自动加载
    if (latestVersionId) {
      localStorage.setItem(`message_latest_version_${messageId}`, latestVersionId);
    }

    // 7. 更新Redux状态
    dispatch(newMessagesActions.updateMessage({
      id: messageId,
      changes: resetMessage
    }));

    // 8. 从数据库中删除消息块并更新消息（同时更新topics表）
    await dexieStorage.transaction('rw', [
      dexieStorage.messages,
      dexieStorage.message_blocks,
      dexieStorage.topics // 添加topics表到事务中
    ], async () => {
      // 删除消息块
      if (blockIds.length > 0) {
        await dexieStorage.deleteMessageBlocksByIds(blockIds);
      }

      // 更新消息
      await dexieStorage.updateMessage(messageId, resetMessage);

      // 更新topics表中的messages数组
      const topic = await dexieStorage.topics.get(topicId);
      if (topic && topic.messages) {
        // 查找消息在数组中的位置
        const messageIndex = topic.messages.findIndex(m => m.id === messageId);

        // 更新或添加消息
        if (messageIndex >= 0) {
          topic.messages[messageIndex] = resetMessage;
        } else if (topic.messages.some(m => m.askId === resetMessage.askId)) {
          // 如果找不到当前消息但存在相同askId的消息，添加到这些消息之后
          const lastRelatedMsgIndex = topic.messages.reduce((maxIdx, msg, idx) =>
            msg.askId === resetMessage.askId ? idx : maxIdx, -1);

          if (lastRelatedMsgIndex >= 0) {
            topic.messages.splice(lastRelatedMsgIndex + 1, 0, resetMessage);
          } else {
            topic.messages.push(resetMessage);
          }
        } else {
          // 如果都找不到，添加到末尾
          topic.messages.push(resetMessage);
        }

        // 保存更新后的话题
        await dexieStorage.topics.put(topic);
      }
    });

    // 9. 处理助手响应
    await processAssistantResponse(dispatch, getState, resetMessage, topicId, model, true); // 默认启用工具

    return true;
  } catch (error) {
    console.error(`重新生成消息 ${messageId} 失败:`, error);
    throw error;
  }
};




