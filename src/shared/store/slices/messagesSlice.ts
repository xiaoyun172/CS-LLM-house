import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { ChatTopic } from '../../types';
import type { Message } from '../../types/newMessage.ts';
// 移除未使用的导入
import { loadTopics as loadTopicsFromService } from '../../services/messages/messageService';
import { TopicService } from '../../services/TopicService';

// 清空主题消息
export const clearTopicMessages = (topic: ChatTopic) => {
  // 清空messageIds数组
  topic.messageIds = [];
  // 为了兼容性，也清空messages数组
  if (topic.messages) {
    topic.messages = [];
  }
  return topic;
};

// 初始状态
const initialState = {
  topics: [] as ChatTopic[],
  currentTopic: null as ChatTopic | null,
  messagesByTopic: {} as Record<string, Message[]>,
  loadingByTopic: {} as Record<string, boolean>, // 添加每个话题的加载状态
  streamingByTopic: {} as Record<string, boolean>, // 添加每个话题的流式响应状态
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null as string | null,
  systemPrompt: '',
  showSystemPrompt: false,
};

// 话题加载处理函数
const loadTopicsFromStorage = async (dispatch: any) => {
  try {
    const topics = await loadTopicsFromService();
    
    // 直接加载话题，不进行消息转换
    dispatch(loadTopicsSuccess(topics));
    
    // 对每个话题，加载其消息
    for (const topic of topics) {
      try {
        await TopicService.loadTopicMessages(topic.id);
      } catch (error) {
        console.error(`加载话题 ${topic.id} 的消息失败:`, error);
      }
    }
  } catch (error) {
    console.error('加载话题失败:', error);
    dispatch(setError('加载话题失败'));
  }
};

// 创建slice
const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    // 设置系统提示词
    setSystemPrompt: (state, action: PayloadAction<string>) => {
      state.systemPrompt = action.payload;
    },

    // 设置是否显示系统提示词
    setShowSystemPrompt: (state, action: PayloadAction<boolean>) => {
      state.showSystemPrompt = action.payload;
    },

    // 设置加载状态
    setLoadingStatus: (state, action: PayloadAction<'idle' | 'loading' | 'succeeded' | 'failed'>) => {
      state.status = action.payload;
    },

    // 设置错误
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    // 添加主题
    addTopic: (state, action: PayloadAction<ChatTopic>) => {
      const topic = action.payload;
      // 确保不添加重复主题
      if (!state.topics.some(t => t.id === topic.id)) {
        state.topics.push(topic);
      }
    },

    // 添加多个主题
    addTopics: (state, action: PayloadAction<ChatTopic[]>) => {
      const newTopics = action.payload;
      // 仅添加不存在的主题
      for (const newTopic of newTopics) {
        if (!state.topics.some(t => t.id === newTopic.id)) {
          state.topics.push(newTopic);
        }
      }
    },

    // 设置当前主题
    setCurrentTopic: (state, action: PayloadAction<ChatTopic | null>) => {
      state.currentTopic = action.payload;
    },

    // 更新主题
    updateTopic: (state, action: PayloadAction<{id: string; updates: Partial<ChatTopic>}>) => {
      const {id, updates} = action.payload;
      const topicIndex = state.topics.findIndex(t => t.id === id);

      if (topicIndex >= 0) {
        state.topics[topicIndex] = { ...state.topics[topicIndex], ...updates };

        // 如果更新的是当前主题，同步更新当前主题
        if (state.currentTopic && state.currentTopic.id === id) {
          state.currentTopic = { ...state.currentTopic, ...updates };
        }
      }
    },

    // 删除主题
    deleteTopic: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.topics = state.topics.filter(t => t.id !== id);

      // 如果删除的是当前主题，清空当前主题
      if (state.currentTopic && state.currentTopic.id === id) {
        state.currentTopic = null;
      }

      // 清理相关消息
      delete state.messagesByTopic[id];
    },

    // 添加消息
    addMessage: (state, action: PayloadAction<{ topicId: string; message: Message }>) => {
      const { topicId, message } = action.payload;

      // 更新消息存储
      if (!state.messagesByTopic[topicId]) {
        state.messagesByTopic[topicId] = [];
      }
      
      // 检查消息是否已存在
      const existingMessageIndex = state.messagesByTopic[topicId].findIndex((m: Message) => m.id === message.id);
      
      if (existingMessageIndex === -1) {
        // 添加新消息
        state.messagesByTopic[topicId].push(message);
      } else {
        // 更新现有消息
        state.messagesByTopic[topicId][existingMessageIndex] = message;
      }

      // 更新当前主题的messageIds
      if (state.currentTopic && state.currentTopic.id === topicId) {
        if (!state.currentTopic.messageIds) {
          state.currentTopic.messageIds = [];
        }
        
        if (!state.currentTopic.messageIds.includes(message.id)) {
          state.currentTopic.messageIds.push(message.id);
        }

        // 更新当前主题的最后消息时间
        state.currentTopic.lastMessageTime = message.createdAt;
      }

      // 更新主题列表中的messageIds
      const topicToUpdate = state.topics.find(t => t.id === topicId);
      if (topicToUpdate) {
        if (!topicToUpdate.messageIds) {
          topicToUpdate.messageIds = [];
        }
        
        if (!topicToUpdate.messageIds.includes(message.id)) {
          topicToUpdate.messageIds.push(message.id);
        }

        // 更新主题的最后消息时间
        topicToUpdate.lastMessageTime = message.createdAt;
      }
    },

    // 更新消息
    updateMessage: (state, action: PayloadAction<{ topicId: string; messageId: string; updates: Partial<Message> }>) => {
      const { topicId, messageId, updates } = action.payload;

      // 更新消息存储
      if (state.messagesByTopic[topicId]) {
        const msgIndex = state.messagesByTopic[topicId].findIndex((m: Message) => m.id === messageId);
        if (msgIndex >= 0) {
          state.messagesByTopic[topicId][msgIndex] = {
            ...state.messagesByTopic[topicId][msgIndex],
            ...updates
          };
        }
      }
    },

    // 删除消息
    deleteMessage: (state, action: PayloadAction<{ topicId: string; messageId: string }>) => {
      const { topicId, messageId } = action.payload;

      // 从消息存储中删除
      if (state.messagesByTopic[topicId]) {
        state.messagesByTopic[topicId] = state.messagesByTopic[topicId].filter((m: Message) => m.id !== messageId);
      }

      // 从当前主题的messageIds中删除
      if (state.currentTopic && state.currentTopic.id === topicId && state.currentTopic.messageIds) {
        state.currentTopic.messageIds = state.currentTopic.messageIds.filter(id => id !== messageId);
      }

      // 从主题列表中的messageIds中删除
      const topicIndex = state.topics.findIndex(t => t.id === topicId);
      if (topicIndex >= 0 && state.topics[topicIndex].messageIds) {
        state.topics[topicIndex].messageIds = state.topics[topicIndex].messageIds.filter(id => id !== messageId);
      }
    },

    // 设置主题的消息
    setTopicMessages: (state, action: PayloadAction<{ topicId: string; messages: Message[] }>) => {
      const { topicId, messages } = action.payload;

      // 更新消息存储
      state.messagesByTopic[topicId] = messages;

      // 更新当前主题的消息IDs
      if (state.currentTopic && state.currentTopic.id === topicId) {
        state.currentTopic.messageIds = messages.map(m => m.id);
      }

      // 更新主题列表中的消息IDs
      const topicIndex = state.topics.findIndex(t => t.id === topicId);
      if (topicIndex >= 0) {
        state.topics[topicIndex].messageIds = messages.map(m => m.id);
      }
    },

    // 接收成功加载的话题数据
    loadTopicsSuccess: (state, action: PayloadAction<ChatTopic[]>) => {
      const uniqueTopics = action.payload;

      // 更新到Redux状态
      state.topics = uniqueTopics;

      // 初始化消息记录
      uniqueTopics.forEach((topic: ChatTopic) => {
        // 确保topic.messages存在
        if (!topic.messages) {
          topic.messages = [];
        }

        // 将消息添加到messagesByTopic
        state.messagesByTopic[topic.id] = [...topic.messages];
      });

      // 选择具有最新消息时间的话题作为当前话题，而不是第一个
      if (uniqueTopics.length > 0) {
        // 按lastMessageTime降序排序话题
        const sortedTopics = [...uniqueTopics].sort((a, b) => {
          const timeA = new Date(a.lastMessageTime || 0).getTime();
          const timeB = new Date(b.lastMessageTime || 0).getTime();
          return timeB - timeA; // 降序排序
        });

        // 使用排序后的第一个话题（最新的一个）作为当前话题
        state.currentTopic = sortedTopics[0];
      }
    },

    // 设置话题加载状态
    setTopicLoading: (state, action: PayloadAction<{topicId: string; loading: boolean}>) => {
      const { topicId, loading } = action.payload;
      state.loadingByTopic[topicId] = loading;
    },

    // 设置话题流式响应状态
    setTopicStreaming: (state, action: PayloadAction<{topicId: string; streaming: boolean}>) => {
      const { topicId, streaming } = action.payload;
      state.streamingByTopic[topicId] = streaming;
    },
  },
});

// 导出actions
export const {
  setSystemPrompt,
  setShowSystemPrompt,
  setLoadingStatus,
  setError,
  addTopic,
  addTopics,
  setCurrentTopic,
  updateTopic,
  deleteTopic,
  addMessage,
  updateMessage,
  deleteMessage,
  setTopicMessages,
  loadTopicsSuccess,
  setTopicLoading,
  setTopicStreaming,
} = messagesSlice.actions;

// 异步action creator
export const initializeTopics = () => async (dispatch: any) => {
  await loadTopicsFromStorage(dispatch);
};

// 导出类型
export type MessagesState = typeof initialState;

// 创建话题的空实现，为了满足现有代码的需求
export const createTopic = () => async () => {};

// 导出loadTopics作为initializeTopics的别名
export const loadTopics = initializeTopics;

// 导出reducer
export default messagesSlice.reducer;