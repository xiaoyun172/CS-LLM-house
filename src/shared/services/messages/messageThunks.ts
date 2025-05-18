import { createAsyncThunk } from '@reduxjs/toolkit';
import type { Message, ChatTopic, Model } from '../../types';
import type { RootState } from '../../store';
import { 
  addMessage, 
  updateMessage, 
  setTopicLoading, 
  setTopicStreaming, 
  setError,
  setCurrentTopic,
  initializeTopics
} from '../../store/slices/messagesSlice';
import { handleChatRequest, saveTopics } from './messageService';
import { TopicService } from '../TopicService';

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
      const state = getState() as RootState;

      // 创建用户消息
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        content,
        role: 'user',
        timestamp: new Date().toISOString(),
        modelId: model.id,
      };

      // 添加用户消息
      dispatch(addMessage({ topicId, message: userMessage }));

      // 设置加载状态
      dispatch(setTopicLoading({ topicId, loading: true }));

      // 创建助手消息
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        content: '',
        role: 'assistant',
        timestamp: new Date().toISOString(),
        status: 'pending',
        modelId: model.id,
      };

      // 添加助手消息
      dispatch(addMessage({ topicId, message: assistantMessage }));

      // 设置流式响应状态
      dispatch(setTopicStreaming({ topicId, streaming: true }));

      // 获取当前主题的所有消息
      const messages = state.messages.messagesByTopic[topicId] || [];

      // 发送聊天请求
      const response = await handleChatRequest({
        messages,
        model,
        onChunk: (chunk: string) => {
          // 更新流式响应内容
          dispatch(updateMessage({
            topicId,
            messageId: assistantMessage.id,
            updates: { content: assistantMessage.content + chunk, status: 'pending' },
          }));
        }
      });

      // 更新最终响应
      dispatch(updateMessage({
        topicId,
        messageId: assistantMessage.id,
        updates: { 
          content: response.content || '响应为空', 
          status: 'complete' 
        },
      }));

      // 清除流式响应状态
      dispatch(setTopicStreaming({ topicId, streaming: false }));

      // 清除加载状态
      dispatch(setTopicLoading({ topicId, loading: false }));

      return response;
    } catch (error) {
      // 处理错误
      const errorMessage = error instanceof Error ? error.message : '发送消息失败';

      dispatch(setError(errorMessage));

      // 清除流式响应状态
      dispatch(setTopicStreaming({ topicId, streaming: false }));

      // 清除加载状态
      dispatch(setTopicLoading({ topicId, loading: false }));

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