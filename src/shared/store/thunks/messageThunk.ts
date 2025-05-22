import { v4 as uuid } from 'uuid';
import { DataRepository } from '../../services/DataRepository';
import { dexieStorage } from '../../services/DexieStorageService'; // 保持兼容性，逐步迁移
import { createUserMessage, createAssistantMessage } from '../../utils/messageUtils';
import { getMainTextContent } from '../../utils/blockUtils';
import { newMessagesActions } from '../slices/newMessagesSlice';
import { upsertManyBlocks, upsertOneBlock, updateOneBlock, removeManyBlocks } from '../slices/messageBlocksSlice';
import { MessageBlockStatus, AssistantMessageStatus } from '../../types/newMessage';
import { createResponseHandler } from '../../services/messages/ResponseHandler';
import { ApiProviderRegistry } from '../../services/messages/ApiProvider';
import { throttle } from 'lodash';
import type { Message, MessageBlock } from '../../types/newMessage';
import type { Model } from '../../types';
import type { RootState, AppDispatch } from '../index';

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
  // 更新Redux状态
  store.dispatch(updateOneBlock({ id, changes: blockUpdate }));

  // 更新数据库
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
  toolsEnabled?: boolean
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
      images
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
  _getState: () => RootState, // 添加下划线前缀表示未使用的参数
  assistantMessage: Message,
  topicId: string,
  model: Model,
  toolsEnabled?: boolean
) => {
  try {
    // 1. 准备API请求
    const messages = await prepareMessagesForApi(topicId, assistantMessage.id);

    // 2. 设置消息状态为处理中，避免显示错误消息
    dispatch(newMessagesActions.updateMessage({
      id: assistantMessage.id,
      changes: {
        status: AssistantMessageStatus.PROCESSING
      }
    }));

    // 3. 无论是否有现有块，都创建新的主文本块
    const mainBlock = {
      id: uuid(),
      messageId: assistantMessage.id,
      type: 'main_text' as const,
      content: '正在生成回复...',
      createdAt: new Date().toISOString(),
      status: MessageBlockStatus.STREAMING // 直接设置为STREAMING状态，而不是PROCESSING
    };

    const mainTextBlockId = mainBlock.id;

    // 4. 关联块到消息
    dispatch(newMessagesActions.updateMessage({
      id: assistantMessage.id,
      changes: {
        blocks: [mainTextBlockId]
      }
    }));

    // 5. 保存块到Redux和数据库
    dispatch(upsertOneBlock(mainBlock));
    await DataRepository.blocks.save(mainBlock);

    // 6. 更新消息
    await DataRepository.messages.update(assistantMessage.id, {
      blocks: [mainTextBlockId]
    });

    // 7. 创建响应处理器
    const responseHandler = createResponseHandler({
      messageId: assistantMessage.id,
      blockId: mainTextBlockId,
      topicId
    });

    // 8. 获取API提供者
    const apiProvider = ApiProviderRegistry.get(model);

    // 9. 发送API请求
    try {
      // 传递工具开关参数
      const response = await apiProvider.sendChatRequest(
        messages,
        model,
        responseHandler.handleChunk,
        { enableTools: toolsEnabled !== false } // 默认启用工具
      );
      return await responseHandler.complete(response);
    } catch (error) {
      return await responseHandler.fail(error as Error);
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
const prepareMessagesForApi = async (topicId: string, assistantMessageId: string) => {
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
  const apiMessages = sortedMessages
    .filter(message => {
      // 跳过当前正在处理的助手消息和所有system消息
      if (message.id === assistantMessageId || message.role === 'system') {
        return false;
      }

      // 只包含创建时间早于当前助手消息的消息
      const messageTime = new Date(message.createdAt).getTime();
      return messageTime < assistantMessageTime;
    })
    .map(message => {
      // 获取消息内容
      const content = getMainTextContent(message);

      // 记录消息内容，便于调试
      console.log(`[prepareMessagesForApi] 消息 ${message.id}, 角色: ${message.role}, 内容: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);

      return {
        role: message.role,
        content: content
      };
    });

  // 在数组开头无条件添加新的系统消息
  apiMessages.unshift({
    role: 'system',
    content: systemPrompt
  });

  // 记录日志
  console.log(`[prepareMessagesForApi] 准备API消息: 总数=${apiMessages.length}, 系统提示词=${systemPrompt.substring(0, 50)}${systemPrompt.length > 50 ? '...' : ''}`);
  console.log(`[prepareMessagesForApi] 只包含助手消息 ${assistantMessageId} 之前的消息`);

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
        await dexieStorage.deleteMessageBlocksByIds(blockIds);
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
    console.error(`删除消息 ${messageId} 失败:`, error);
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

// 导出store实例，用于throttledBlockUpdate
import store from '../index';
