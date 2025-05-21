import { v4 as uuid } from 'uuid';
import { dexieStorage } from '../../services/DexieStorageService';
import { createUserMessage, createAssistantMessage, resetAssistantMessage } from '../../utils/messageUtils';
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
    // 保存消息块
    if (blocks.length > 0) {
      await dexieStorage.bulkSaveMessageBlocks(blocks);
    }

    // 保存消息
    await dexieStorage.saveMessage(message);

    // 更新主题的消息ID列表
    await dexieStorage.addMessageToTopic(message.topicId, message);
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
  images?: Array<{ url: string }>
) => async (dispatch: AppDispatch, getState: () => RootState) => {
  try {
    // 获取当前助手ID
    // 直接从数据库获取主题信息
    const topic = await dexieStorage.getTopic(topicId);
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
    await processAssistantResponse(dispatch, getState, assistantMessage, topicId, model);

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
  model: Model
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
      status: MessageBlockStatus.PROCESSING
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
    await dexieStorage.saveMessageBlock(mainBlock);

    // 6. 更新消息
    await dexieStorage.updateMessage(assistantMessage.id, {
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
      const response = await apiProvider.sendChatRequest(messages, model, responseHandler.handleChunk);
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

  // 转换为API请求格式
  const apiMessages = sortedMessages
    .filter(message => message.id !== assistantMessageId && message.role !== 'system') // 跳过当前正在处理的助手消息和所有system消息
    .map(message => ({
      role: message.role,
      content: getMainTextContent(message)
    }));

  // 在数组开头无条件添加新的系统消息
  apiMessages.unshift({
    role: 'system',
    content: systemPrompt
  });

  // 记录日志
  console.log(`[prepareMessagesForApi] 准备API消息: 总数=${apiMessages.length}, 系统提示词=${systemPrompt.substring(0, 50)}${systemPrompt.length > 50 ? '...' : ''}`);

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

    // 5. 从数据库中删除消息块
    await dexieStorage.transaction('rw', [
      dexieStorage.messages,
      dexieStorage.message_blocks,
      dexieStorage.topics
    ], async () => {
      // 删除消息块
      if (blockIds.length > 0) {
        await dexieStorage.deleteMessageBlocksByIds(blockIds);
      }

      // 删除消息
      await dexieStorage.deleteMessage(messageId);

      // 更新主题的消息ID列表
      const topic = await dexieStorage.getTopic(topicId);
      if (topic) {
        if (topic.messageIds) {
          topic.messageIds = topic.messageIds.filter(id => id !== messageId);
        }

        // 兼容旧版本
        if (topic.messages) {
          topic.messages = topic.messages.filter(m => m.id !== messageId);
        }

        await dexieStorage.saveTopic(topic);
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

    // 4. 从Redux中移除消息块
    if (blockIds.length > 0) {
      dispatch(removeManyBlocks(blockIds));
    }

    // 5. 使用resetAssistantMessage函数重置消息
    const resetMessage = resetAssistantMessage(message, {
      status: AssistantMessageStatus.PENDING,
      updatedAt: new Date().toISOString(),
      model: model
    });

    // 6. 更新Redux状态
    dispatch(newMessagesActions.updateMessage({
      id: messageId,
      changes: resetMessage
    }));

    // 7. 从数据库中删除消息块并更新消息
    await dexieStorage.transaction('rw', [
      dexieStorage.messages,
      dexieStorage.message_blocks
    ], async () => {
      // 删除消息块
      if (blockIds.length > 0) {
        await dexieStorage.deleteMessageBlocksByIds(blockIds);
      }

      // 更新消息
      await dexieStorage.updateMessage(messageId, resetMessage);
    });

    // 8. 处理助手响应
    await processAssistantResponse(dispatch, getState, resetMessage, topicId, model);

    return true;
  } catch (error) {
    console.error(`重新生成消息 ${messageId} 失败:`, error);
    throw error;
  }
};

// 导出store实例，用于throttledBlockUpdate
import store from '../index';
