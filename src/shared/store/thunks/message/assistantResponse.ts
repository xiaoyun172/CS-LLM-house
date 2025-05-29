import { v4 as uuid } from 'uuid';
import { MessageBlockStatus, MessageBlockType, AssistantMessageStatus } from '../../../types/newMessage';
import { createResponseHandler } from '../../../services/messages/ResponseHandler';
import { ApiProviderRegistry } from '../../../services/messages/ApiProvider';
import { generateImage as generateOpenAIImage } from '../../../api/openai/image';
import { generateImage as generateGeminiImage } from '../../../api/gemini/image';
import { createImageBlock } from '../../../utils/messageUtils';
import { createAbortController } from '../../../utils/abortController';
import { mcpService } from '../../../services/MCPService';
import { newMessagesActions } from '../../slices/newMessagesSlice';
import { upsertOneBlock, addOneBlock } from '../../slices/messageBlocksSlice';
import { dexieStorage } from '../../../services/DexieStorageService';
import type { Message, MessageBlock } from '../../../types/newMessage';
import type { Model, MCPTool } from '../../../types';
import type { RootState, AppDispatch } from '../../index';
import { processKnowledgeSearch } from './knowledgeIntegration';
import { prepareMessagesForApi } from './apiPreparation';

export const processAssistantResponse = async (
  dispatch: AppDispatch,
  _getState: () => RootState,
  assistantMessage: Message,
  topicId: string,
  model: Model,
  toolsEnabled?: boolean
) => {
  try {
    // 1. 检查是否有知识库需要搜索（风格）
    await processKnowledgeSearch(assistantMessage, topicId, dispatch);

    // 2. 获取 MCP 工具（如果启用）
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

    const messages = await prepareMessagesForApi(topicId, assistantMessage.id, mcpTools);

// 3. 设置消息状态为处理中，避免显示错误消息
    dispatch(newMessagesActions.updateMessage({
      id: assistantMessage.id,
      changes: {
        status: AssistantMessageStatus.PROCESSING
      }
    }));

// 4. 创建占位符块（参考最佳实例逻辑）
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

// 5. 关联占位符块到消息
    dispatch(newMessagesActions.updateMessage({
      id: assistantMessage.id,
      changes: {
        blocks: [placeholderBlock.id]
      }
    }));

// 6. 更新消息数据库（同时更新messages表和topic.messages数组）
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
        const messageIndex = topic.messages.findIndex((m: Message) => m.id === assistantMessage.id);
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

// 9. 获取API提供者
    const apiProvider = ApiProviderRegistry.get(model);

// 10. 检查是否为图像生成模型
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

// 11. 发送API请求
    try {
      let response: any;

      if (isImageGenerationModel) {
        // 获取最后一条用户消息作为图像生成提示词
        const lastUserMessage = messages.filter((msg: { role: string; content: any }) => msg.role === 'user').pop();
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
              const messageIndex = topic.messages.findIndex((m: Message) => m.id === assistantMessage.id);
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
        // 🔥 修复组合模型推理显示问题：同时使用onUpdate和onChunk
        response = await apiProvider.sendChatMessage(
          convertedMessages,
          {
            onUpdate: (content: string, reasoning?: string) => {
              // 组合模型的推理内容通过onUpdate传递
              responseHandler.handleChunk(content, reasoning);
            },
            onChunk: (chunk: import('../../../types/chunk').Chunk) => {
              // 普通模型的流式内容通过onChunk传递
              responseHandler.handleChunkEvent(chunk);
            },
            enableTools: toolsEnabled !== false,
            mcpTools: mcpTools,
            mcpMode: mcpMode,
            abortSignal: abortController.signal
          }
        );
      }

      // 处理不同类型的响应
      let finalContent: string;
      let reasoning: string | undefined;
      let isInterrupted = false;

      if (typeof response === 'string') {
        finalContent = response;
      } else if (response && typeof response === 'object' && 'content' in response) {
        finalContent = response.content;
        // 提取思考过程
        reasoning = response.reasoning || response.reasoning_content;
        // 检查是否被中断
        isInterrupted = response.interrupted === true;
      } else {
        finalContent = '';
      }

      // 工具调用现在完全在 AI 提供者层面处理（包括函数调用和 XML 格式）
      // AI 提供者会自动检测工具调用、执行工具、将结果添加到对话历史并继续对话
      console.log(`[processAssistantResponse] 工具调用已在 AI 提供者层面处理完成`);

      // 对于非流式响应，onUpdate回调已经在Provider层正确处理了思考过程和普通文本
      // 不需要重复处理，避免重复调用导致的问题
      console.log(`[processAssistantResponse] 非流式响应处理完成，内容长度: ${finalContent.length}, 思考过程长度: ${reasoning?.length || 0}, 是否被中断: ${isInterrupted}`);

      // 如果响应被中断，使用中断处理方法
      if (isInterrupted) {
        return await responseHandler.completeWithInterruption();
      }

      return await responseHandler.complete(finalContent);
    } catch (error: any) {
      // 检查是否为中断错误
      if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
        console.log('[processAssistantResponse] 请求被用户中断');
        // 对于中断错误，完成响应并标记为被中断
        return await responseHandler.completeWithInterruption();
      }

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