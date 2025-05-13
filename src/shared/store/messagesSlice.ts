import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Message, ChatTopic, Model } from '../types';
import { sendChatRequest } from '../api';
import type { RootState } from '.';

// 消息状态接口
export interface MessagesState {
  messagesByTopic: Record<string, Message[]>;
  topics: ChatTopic[];
  currentTopic: ChatTopic | null;
  loadingByTopic: Record<string, boolean>;
  streamingByTopic: Record<string, boolean>;
  error: string | null;
}

// 初始状态
const initialState: MessagesState = {
  messagesByTopic: {},
  topics: [],
  currentTopic: null,
  loadingByTopic: {},
  streamingByTopic: {},
  error: null,
};

// 异步发送消息
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

      // 发送API请求
      const response = await sendChatRequest({
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        modelId: model.id,
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

// 创建消息slice
const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    // 设置当前主题
    setCurrentTopic: (state, action: PayloadAction<ChatTopic>) => {
      state.currentTopic = action.payload;
    },

    // 加载所有话题
    loadTopics: (state) => {
      try {
        const topicsJson = localStorage.getItem('chatTopics');
        if (topicsJson) {
          const topics = JSON.parse(topicsJson);
          state.topics = topics;
          
          // 初始化消息记录
          topics.forEach((topic: ChatTopic) => {
            state.messagesByTopic[topic.id] = topic.messages || [];
          });
        }
      } catch (error) {
        console.error('从localStorage加载话题失败:', error);
      }
    },

    // 设置主题加载状态
    setTopicLoading: (state, action: PayloadAction<{ topicId: string; loading: boolean }>) => {
      const { topicId, loading } = action.payload;
      state.loadingByTopic[topicId] = loading;
    },

    // 设置主题流式响应状态
    setTopicStreaming: (state, action: PayloadAction<{ topicId: string; streaming: boolean }>) => {
      const { topicId, streaming } = action.payload;
      state.streamingByTopic[topicId] = streaming;
    },

    // 设置错误
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    // 添加消息
    addMessage: (state, action: PayloadAction<{ topicId: string; message: Message }>) => {
      const { topicId, message } = action.payload;

      if (!state.messagesByTopic[topicId]) {
        state.messagesByTopic[topicId] = [];
      }

      state.messagesByTopic[topicId].push(message);

      // 如果是当前主题，更新主题的最后消息时间
      if (state.currentTopic && state.currentTopic.id === topicId) {
        state.currentTopic.lastMessageTime = message.timestamp;
        state.currentTopic.messages = state.messagesByTopic[topicId];
      }

      // 保存到localStorage
      try {
        const topicsJson = localStorage.getItem('chatTopics');
        if (topicsJson) {
          const topics = JSON.parse(topicsJson);
          const topicIndex = topics.findIndex((t: ChatTopic) => t.id === topicId);

          if (topicIndex !== -1) {
            topics[topicIndex].messages = state.messagesByTopic[topicId];
            topics[topicIndex].lastMessageTime = message.timestamp;
            localStorage.setItem('chatTopics', JSON.stringify(topics));
          }
        }
      } catch (error) {
        console.error('保存消息到localStorage失败:', error);
      }
    },

    // 更新消息
    updateMessage: (state, action: PayloadAction<{ topicId: string; messageId: string; updates: Partial<Message> }>) => {
      const { topicId, messageId, updates } = action.payload;

      if (state.messagesByTopic[topicId]) {
        const messageIndex = state.messagesByTopic[topicId].findIndex(msg => msg.id === messageId);

        if (messageIndex !== -1) {
          state.messagesByTopic[topicId][messageIndex] = {
            ...state.messagesByTopic[topicId][messageIndex],
            ...updates
          };

          // 如果是当前主题，更新主题的消息
          if (state.currentTopic && state.currentTopic.id === topicId) {
            state.currentTopic.messages = state.messagesByTopic[topicId];
          }

          // 保存到localStorage
          try {
            const topicsJson = localStorage.getItem('chatTopics');
            if (topicsJson) {
              const topics = JSON.parse(topicsJson);
              const topicIndex = topics.findIndex((t: ChatTopic) => t.id === topicId);

              if (topicIndex !== -1) {
                topics[topicIndex].messages = state.messagesByTopic[topicId];
                localStorage.setItem('chatTopics', JSON.stringify(topics));
              }
            }
          } catch (error) {
            console.error('保存消息到localStorage失败:', error);
          }
        }
      }
    },

    // 添加替代版本的消息回复
    addAlternateVersion: (state, action: PayloadAction<{ 
      topicId: string; 
      originalMessageId: string; 
      newMessage: Message;
    }>) => {
      const { topicId, originalMessageId, newMessage } = action.payload;
      
      if (!state.messagesByTopic[topicId]) {
        return;
      }
      
      // 找到原始消息
      const originalMsgIndex = state.messagesByTopic[topicId].findIndex(
        msg => msg.id === originalMessageId
      );
      
      if (originalMsgIndex === -1) {
        return;
      }
      
      const originalMessage = state.messagesByTopic[topicId][originalMsgIndex];
      
      // 如果原始消息没有alternateVersions数组，则初始化它
      if (!originalMessage.alternateVersions) {
        originalMessage.alternateVersions = [];
      }
      
      // 标记原来的消息为非当前版本
      state.messagesByTopic[topicId][originalMsgIndex] = {
        ...originalMessage,
        isCurrentVersion: false
      };
      
      // 添加原始消息ID到alternateVersions列表
      const previousVersions = originalMessage.alternateVersions || [];
      
      // 查找用户消息ID（父消息）
      let parentMessageId = originalMessage.parentMessageId;
      if (!parentMessageId) {
        // 尝试查找上一条用户消息
        for (let i = originalMsgIndex - 1; i >= 0; i--) {
          if (state.messagesByTopic[topicId][i].role === 'user') {
            parentMessageId = state.messagesByTopic[topicId][i].id;
            break;
          }
        }
      }
      
      // 设置新消息的关联信息
      const versionedNewMessage: Message = {
        ...newMessage,
        parentMessageId,
        alternateVersions: [...previousVersions, originalMessageId],
        version: (originalMessage.version || 1) + 1,
        isCurrentVersion: true
      };
      
      // 添加新消息
      state.messagesByTopic[topicId].push(versionedNewMessage);
      
      // 如果是当前主题，更新主题的消息
      if (state.currentTopic && state.currentTopic.id === topicId) {
        state.currentTopic.messages = state.messagesByTopic[topicId];
      }
      
      // 保存到localStorage
      try {
        const topicsJson = localStorage.getItem('chatTopics');
        if (topicsJson) {
          const topics = JSON.parse(topicsJson);
          const topicIndex = topics.findIndex((t: ChatTopic) => t.id === topicId);
          
          if (topicIndex !== -1) {
            topics[topicIndex].messages = state.messagesByTopic[topicId];
            localStorage.setItem('chatTopics', JSON.stringify(topics));
          }
        }
      } catch (error) {
        console.error('保存消息到localStorage失败:', error);
      }
    },
    
    // 切换到消息的特定版本
    switchToVersion: (state, action: PayloadAction<{
      topicId: string;
      messageId: string;
    }>) => {
      const { topicId, messageId } = action.payload;
      
      if (!state.messagesByTopic[topicId]) {
        return;
      }
      
      // 找到指定版本的消息
      const targetMsgIndex = state.messagesByTopic[topicId].findIndex(
        msg => msg.id === messageId
      );
      
      if (targetMsgIndex === -1) {
        return;
      }
      
      const targetMessage = state.messagesByTopic[topicId][targetMsgIndex];
      
      // 如果该消息没有alternateVersions，则无需切换
      if (!targetMessage.alternateVersions || targetMessage.alternateVersions.length === 0) {
        return;
      }
      
      // 将所有相关版本标记为非当前版本
      const allVersionIds = [...targetMessage.alternateVersions, messageId];
      
      state.messagesByTopic[topicId] = state.messagesByTopic[topicId].map(msg => {
        if (allVersionIds.includes(msg.id)) {
          return {
            ...msg,
            isCurrentVersion: msg.id === messageId
          };
        }
        return msg;
      });
      
      // 如果是当前主题，更新主题的消息
      if (state.currentTopic && state.currentTopic.id === topicId) {
        state.currentTopic.messages = state.messagesByTopic[topicId];
      }
      
      // 保存到localStorage
      try {
        const topicsJson = localStorage.getItem('chatTopics');
        if (topicsJson) {
          const topics = JSON.parse(topicsJson);
          const topicIndex = topics.findIndex((t: ChatTopic) => t.id === topicId);
          
          if (topicIndex !== -1) {
            topics[topicIndex].messages = state.messagesByTopic[topicId];
            localStorage.setItem('chatTopics', JSON.stringify(topics));
          }
        }
      } catch (error) {
        console.error('保存消息到localStorage失败:', error);
      }
    },

    // 创建新主题
    createTopic: (state, action: PayloadAction<ChatTopic>) => {
      const topic = action.payload;
      state.currentTopic = topic;
      state.messagesByTopic[topic.id] = topic.messages || [];
      
      // 添加到话题列表
      state.topics.unshift(topic);

      // 保存到localStorage
      try {
        const topicsJson = localStorage.getItem('chatTopics');
        const topics = topicsJson ? JSON.parse(topicsJson) : [];
        topics.unshift(topic);
        localStorage.setItem('chatTopics', JSON.stringify(topics));
      } catch (error) {
        console.error('保存主题到localStorage失败:', error);
      }
    },

    // 删除主题
    deleteTopic: (state, action: PayloadAction<string>) => {
      const topicId = action.payload;

      // 删除主题的消息
      delete state.messagesByTopic[topicId];
      
      // 从topics列表中移除
      state.topics = state.topics.filter(topic => topic.id !== topicId);

      // 如果是当前主题，清除当前主题
      if (state.currentTopic && state.currentTopic.id === topicId) {
        state.currentTopic = null;
      }

      // 从localStorage中删除
      try {
        const topicsJson = localStorage.getItem('chatTopics');
        if (topicsJson) {
          const topics = JSON.parse(topicsJson);
          const filteredTopics = topics.filter((t: ChatTopic) => t.id !== topicId);
          localStorage.setItem('chatTopics', JSON.stringify(filteredTopics));
        }
      } catch (error) {
        console.error('从localStorage删除主题失败:', error);
      }
    },

    // 更新话题
    updateTopic: (state, action: PayloadAction<ChatTopic>) => {
      const updatedTopic = action.payload;
      
      // 更新topics中的话题
      const topicIndex = state.topics.findIndex(topic => topic.id === updatedTopic.id);
      if (topicIndex !== -1) {
        state.topics[topicIndex] = updatedTopic;
      }
      
      // 如果是当前话题，也更新当前话题
      if (state.currentTopic && state.currentTopic.id === updatedTopic.id) {
        state.currentTopic = updatedTopic;
      }
      
      // 保存到localStorage
      try {
        const topicsJson = localStorage.getItem('chatTopics');
        if (topicsJson) {
          const topics = JSON.parse(topicsJson);
          const localTopicIndex = topics.findIndex((t: ChatTopic) => t.id === updatedTopic.id);
          
          if (localTopicIndex !== -1) {
            topics[localTopicIndex] = updatedTopic;
            localStorage.setItem('chatTopics', JSON.stringify(topics));
          }
        }
      } catch (error) {
        console.error('保存话题到localStorage失败:', error);
      }
    },

    // 设置主题的消息列表
    setTopicMessages: (state, action: PayloadAction<{ topicId: string; messages: Message[] }>) => {
      const { topicId, messages } = action.payload;
      
      // 更新消息列表
      state.messagesByTopic[topicId] = messages;
      
      // 如果是当前主题，也更新当前主题的消息
      if (state.currentTopic && state.currentTopic.id === topicId) {
        state.currentTopic.messages = messages;
      }
      
      // 保存到localStorage
      try {
        const topicsJson = localStorage.getItem('chatTopics');
        if (topicsJson) {
          const topics = JSON.parse(topicsJson);
          const topicIndex = topics.findIndex((t: ChatTopic) => t.id === topicId);
          
          if (topicIndex !== -1) {
            topics[topicIndex].messages = messages;
            localStorage.setItem('chatTopics', JSON.stringify(topics));
          }
        }
      } catch (error) {
        console.error('保存消息到localStorage失败:', error);
      }
    },
  },
});

// 导出actions
export const {
  setCurrentTopic,
  setTopicLoading,
  setTopicStreaming,
  setError,
  addMessage,
  updateMessage,
  createTopic,
  deleteTopic,
  loadTopics,
  updateTopic,
  setTopicMessages,
  addAlternateVersion,
  switchToVersion
} = messagesSlice.actions;

// 导出reducer
export default messagesSlice.reducer;
