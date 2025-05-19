import { createAsyncThunk } from '@reduxjs/toolkit';
import type { ChatTopic, Model } from '../../types';
import type { RootState } from '../../store';
import { 
  addMessage, 
  updateMessage, 
  setError,
  setCurrentTopic,
  initializeTopics
} from '../../store/slices/messagesSlice';
import { handleChatRequest, saveTopics } from './messageService';
import { TopicService } from '../TopicService';
import { createUserMessage, createAssistantMessage } from '../../utils/messageUtils';
import { addManyBlocks, updateOneBlock } from '../../store/slices/messageBlocksSlice';
import { dexieStorage } from '../DexieStorageService';
import { MessageBlockStatus, AssistantMessageStatus } from '../../types/newMessage.ts';
import store from '../../store';
import { EventService, EVENT_NAMES } from '../EventService';

/**
 * 发送消息的异步action
 */
export const sendMessage = createAsyncThunk(
  'messages/sendMessage',
  async (
    {
      topicId,
      content,
      model
    }: {
      topicId: string;
      content: string;
      model: Model
    },
    { dispatch, getState }
  ) => {
    try {
      // 获取当前助手ID
      const state = getState() as RootState;
      const currentTopic = state.messages.topics.find(t => t.id === topicId);
      const assistantId = currentTopic?.assistantId || '';

      // 创建用户消息和块
      const { message: userMessage, blocks: userBlocks } = createUserMessage({
        content,
        assistantId,
        topicId,
        modelId: model.id,
        model
      });

      // 保存消息块到数据库
      for (const block of userBlocks) {
        await dexieStorage.saveMessageBlock(block);
      }
      
      // 添加块到Redux
      dispatch(addManyBlocks(userBlocks));
      
      // 添加用户消息
      dispatch(addMessage({ topicId, message: userMessage }));

      // 发送消息创建事件
      EventService.emit(EVENT_NAMES.MESSAGE_CREATED, { 
        topicId, 
        messageId: userMessage.id,
        message: userMessage
      });

      // 设置加载状态
      store.dispatch({
        type: 'messages/setTopicLoading',
        payload: { topicId, loading: true }
      });

      // 创建助手消息和块
      const { message: assistantMessage, blocks: assistantBlocks } = createAssistantMessage({
        assistantId,
        topicId,
        modelId: model.id,
        model,
        askId: userMessage.id
      });

      // 保存消息块到数据库
      for (const block of assistantBlocks) {
        await dexieStorage.saveMessageBlock(block);
      }
      
      // 添加块到Redux
      dispatch(addManyBlocks(assistantBlocks));
      
      // 添加助手消息
      dispatch(addMessage({ topicId, message: assistantMessage }));

      // 发送消息创建事件
      EventService.emit(EVENT_NAMES.MESSAGE_CREATED, { 
        topicId, 
        messageId: assistantMessage.id,
        message: assistantMessage
      });

      // 设置流式响应状态
      store.dispatch({
        type: 'messages/setTopicStreaming',
        payload: { topicId, streaming: true }
      });

      // 发送流式开始事件
      EventService.emit(EVENT_NAMES.STREAMING_STARTED, { topicId });

      // 获取当前主题的所有消息
      const messages = state.messages.messagesByTopic[topicId] || [];

      // 获取主文本块ID
      const mainTextBlockId = assistantBlocks.length > 0 ? assistantBlocks[0].id : '';

      // 发送聊天请求
      const response = await handleChatRequest({
        messages,
        model,
        onChunk: (chunk: string) => {
          if (mainTextBlockId) {
            // 更新块内容
            const currentBlock = state.messageBlocks.entities[mainTextBlockId];
            if (currentBlock) {
              // 获取现有内容并附加新内容
              const existingContent = currentBlock.type === 'main_text' ? 
                (currentBlock as any).content || '' : '';
              
              // 更新块内容
              dispatch(updateOneBlock({ 
                id: mainTextBlockId, 
                changes: { 
                  content: existingContent + chunk,
                  status: MessageBlockStatus.STREAMING
                }
              }));
              
              // 保存更新后的块
              dexieStorage.updateMessageBlock(mainTextBlockId, {
                content: existingContent + chunk,
                status: MessageBlockStatus.STREAMING
              });
              
              // 触发块更新事件
              EventService.emit(EVENT_NAMES.BLOCK_UPDATED, { 
                blockId: mainTextBlockId,
                messageId: assistantMessage.id,
                topicId
              });
            }
          }
          
          // 更新消息状态
          dispatch(updateMessage({
            topicId,
            messageId: assistantMessage.id,
            updates: { 
              status: AssistantMessageStatus.STREAMING
            }
          }));

          // 发送消息更新事件
          EventService.emit(EVENT_NAMES.MESSAGE_UPDATED, {
            topicId,
            messageId: assistantMessage.id,
            status: AssistantMessageStatus.STREAMING
          });
        }
      });

      // 更新最终响应状态
      if (mainTextBlockId) {
        // 更新块状态
        dispatch(updateOneBlock({ 
          id: mainTextBlockId, 
          changes: { 
            status: MessageBlockStatus.SUCCESS
          }
        }));
        
        // 保存更新后的块
        dexieStorage.updateMessageBlock(mainTextBlockId, {
          status: MessageBlockStatus.SUCCESS
        });

        // 发送块更新事件
        EventService.emit(EVENT_NAMES.BLOCK_UPDATED, {
          blockId: mainTextBlockId,
          messageId: assistantMessage.id,
          topicId,
          status: MessageBlockStatus.SUCCESS
        });
      }
      
      // 更新消息状态
      dispatch(updateMessage({
        topicId,
        messageId: assistantMessage.id,
        updates: { 
          status: AssistantMessageStatus.SUCCESS
        }
      }));

      // 发送消息更新事件
      EventService.emit(EVENT_NAMES.MESSAGE_UPDATED, {
        topicId,
        messageId: assistantMessage.id,
        status: AssistantMessageStatus.SUCCESS
      });

      // 清除流式响应状态
      store.dispatch({
        type: 'messages/setTopicStreaming',
        payload: { topicId, streaming: false }
      });

      // 发送流式结束事件
      EventService.emit(EVENT_NAMES.STREAMING_ENDED, { topicId });

      // 清除加载状态
      store.dispatch({
        type: 'messages/setTopicLoading',
        payload: { topicId, loading: false }
      });

      return response;
    } catch (error) {
      // 处理错误
      const errorMessage = error instanceof Error ? error.message : '发送消息失败';

      dispatch(setError(errorMessage));

      // 清除流式响应状态
      store.dispatch({
        type: 'messages/setTopicStreaming',
        payload: { topicId, streaming: false }
      });

      // 发送流式结束事件
      EventService.emit(EVENT_NAMES.STREAMING_ENDED, { topicId });

      // 清除加载状态
      store.dispatch({
        type: 'messages/setTopicLoading',
        payload: { topicId, loading: false }
      });

      // 发送服务错误事件
      EventService.emit(EVENT_NAMES.SERVICE_ERROR, {
        message: errorMessage,
        source: 'sendMessage'
      });

      throw error;
    }
  }
);

/**
 * 设置当前主题的异步action
 */
export const setCurrentTopicThunk = createAsyncThunk(
  'messages/setCurrentTopicThunk',
  async (topic: ChatTopic, { dispatch }) => {
    try {
      dispatch(setCurrentTopic(topic));
      
      // 直接保存单个话题到数据库，不需要依赖状态中的topics列表
      await saveTopics([topic]);
      
      return topic;
    } catch (error) {
      console.error('设置当前主题失败:', error);
      throw error;
    }
  }
);

/**
 * 加载所有话题的异步action
 */
export const loadTopicsThunk = createAsyncThunk(
  'messages/loadTopicsThunk',
  async (_, { dispatch }) => {
    try {
      await dispatch(initializeTopics());
      return true;
    } catch (error) {
      console.error('加载话题失败:', error);
      return false;
    }
  }
);

/**
 * 删除主题的异步action
 */
export const deleteTopicThunk = createAsyncThunk(
  'messages/deleteTopicThunk',
  async (topicId: string, { dispatch }) => {
    try {
      // 使用TopicService的deleteTopic方法删除话题
      await TopicService.deleteTopic(topicId);
      
      // 重新加载主题
      await dispatch(initializeTopics());
      
      return true;
    } catch (error) {
      console.error('删除主题失败:', error);
      return false;
    }
  }
); 