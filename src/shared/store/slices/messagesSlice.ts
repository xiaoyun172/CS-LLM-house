import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Message, ChatTopic } from '../../types';
import { loadTopics as loadTopicsFromService } from '../../services/messages/messageService';
import { saveTopicToDB } from '../../services/storageService';
import { dexieStorage } from '../../services/DexieStorageService';

// 消息状态接口
export interface MessagesState {
  messagesByTopic: Record<string, Message[]>;
  topics: ChatTopic[];
  currentTopic: ChatTopic | null;
  loadingByTopic: Record<string, boolean>;
  streamingByTopic: Record<string, boolean>;
  error: string | null;
  forceUpdateCounter: number; // 添加一个计数器来触发强制更新
}

// 初始状态
const initialState: MessagesState = {
  messagesByTopic: {},
  topics: [],
  currentTopic: null,
  loadingByTopic: {},
  streamingByTopic: {},
  error: null,
  forceUpdateCounter: 0, // 初始化计数器
};

// 话题加载处理函数
const loadTopicsFromStorage = async (dispatch: any) => {
  try {
    const topics = await loadTopicsFromService();
    dispatch(loadTopicsSuccess(topics));
  } catch (error) {
    console.error('加载话题失败:', error);
    dispatch(setError('加载话题失败'));
  }
};

// 创建消息slice
const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    // 设置当前主题
    setCurrentTopic: (state, action: PayloadAction<ChatTopic | null>) => {
      state.currentTopic = action.payload;
    },

    // 触发话题加载的action
    loadTopics: () => {
      // 这个reducer不修改状态，只用于触发异步操作
      // 实际的数据加载在loadTopicsFromStorage函数中处理
    },

    // 设置话题加载状态
    setTopicLoading: (state, action: PayloadAction<{ topicId: string; loading: boolean }>) => {
      const { topicId, loading } = action.payload;
      state.loadingByTopic[topicId] = loading;
    },

    // 设置话题流式响应状态
    setTopicStreaming: (state, action: PayloadAction<{ topicId: string; streaming: boolean }>) => {
      const { topicId, streaming } = action.payload;
      state.streamingByTopic[topicId] = streaming;
    },

    // 添加消息
    addMessage: (state, action: PayloadAction<{ topicId: string; message: Message }>) => {
      const { topicId, message } = action.payload;
      
      // 如果主题消息数组不存在，创建一个空数组
      if (!state.messagesByTopic[topicId]) {
        state.messagesByTopic[topicId] = [];
      }
      
      // 检查消息是否已存在
      const existingMessageIndex = state.messagesByTopic[topicId].findIndex(m => m.id === message.id);
      
      if (existingMessageIndex === -1) {
        // 添加新消息
        state.messagesByTopic[topicId].push(message);
      } else {
        // 更新现有消息
        state.messagesByTopic[topicId][existingMessageIndex] = message;
      }
      
      // 如果是当前主题，更新主题的最后消息时间
      if (state.currentTopic && state.currentTopic.id === topicId) {
        state.currentTopic.lastMessageTime = message.timestamp;
        state.currentTopic.messages = state.messagesByTopic[topicId];
      }
      
      // 使用Dexie存储保存消息到话题
      dexieStorage.addMessageToTopic(topicId, message)
        .catch(error => console.error(`保存消息到话题 ${topicId} 失败:`, error));
    },

    // 更新消息
    updateMessage: (state, action: PayloadAction<{ topicId: string; messageId: string; updates: Partial<Message> }>) => {
      const { topicId, messageId, updates } = action.payload;
      
      const messageArray = state.messagesByTopic[topicId];
      if (messageArray) {
        const messageIndex = messageArray.findIndex(m => m.id === messageId);
        if (messageIndex !== -1) {
          // 合并更新
          const updatedMessage = {
            ...state.messagesByTopic[topicId][messageIndex],
            ...updates
          };
          
          // 更新Redux状态
          state.messagesByTopic[topicId][messageIndex] = updatedMessage;
          
          // 使用Dexie存储更新消息
          dexieStorage.updateMessageInTopic(topicId, messageId, updatedMessage)
            .catch(error => console.error(`更新消息 ${messageId} 在话题 ${topicId} 中失败:`, error));
        }
      }
    },

    // 删除消息
    deleteMessage: (state, action: PayloadAction<{ topicId: string; messageId: string }>) => {
      const { topicId, messageId } = action.payload;
      
      if (state.messagesByTopic[topicId]) {
        // 从Redux状态移除消息
        state.messagesByTopic[topicId] = state.messagesByTopic[topicId].filter(m => m.id !== messageId);
        
        // 使用Dexie存储删除消息
        dexieStorage.deleteMessageFromTopic(topicId, messageId)
          .catch(error => console.error(`删除消息 ${messageId} 从话题 ${topicId} 中失败:`, error));
      }
    },

    // 清除话题消息
    clearTopicMessages: (state, action: PayloadAction<string>) => {
      const topicId = action.payload;
      state.messagesByTopic[topicId] = [];
    },

    // 删除话题
    deleteTopic: (state, action: PayloadAction<string>) => {
      const topicId = action.payload;
      
      // 删除主题
      state.topics = state.topics.filter(t => t.id !== topicId);
      
      // 删除主题消息
      delete state.messagesByTopic[topicId];
      
      // 如果删除的是当前主题，清除当前主题
      if (state.currentTopic && state.currentTopic.id === topicId) {
        state.currentTopic = null;
      }
    },

    // 设置错误
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    // 创建主题
    createTopic: (state, action: PayloadAction<ChatTopic>) => {
      const newTopic = action.payload;
      console.log(`创建话题action: ${newTopic.id} (${newTopic.title})`);
      
      // 检查主题是否已存在
      const exists = state.topics.some(topic => topic.id === newTopic.id);
      if (exists) {
        console.warn(`主题ID ${newTopic.id} 已存在, 不会重复创建`);
        return;
      }
      
      // 添加到topics数组
      state.topics.unshift(newTopic);
      
      // 初始化消息数组
      state.messagesByTopic[newTopic.id] = newTopic.messages || [];
      
      // 设置为当前主题
      state.currentTopic = newTopic;
      
      // 递增强制更新计数器
      state.forceUpdateCounter += 1;
      console.log(`话题创建后增加forceUpdateCounter: ${state.forceUpdateCounter}`);
      
      // 保存到数据库
      saveTopicToDB(newTopic).catch(error => {
        console.error('保存新主题到数据库失败:', error);
      });
    },
    
    // 更新主题
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
      
      // 保存到数据库
      saveTopicToDB(updatedTopic).catch(error => {
        console.error(`保存更新的主题 ${updatedTopic.id} 到数据库失败:`, error);
      });
    },
    
    // 设置主题的消息列表
    setTopicMessages: (state, action: PayloadAction<{ topicId: string; messages: Message[] }>) => {
      const { topicId, messages } = action.payload;
      
      // 更新消息列表
      state.messagesByTopic[topicId] = messages.slice(); // 使用slice()创建一个新数组，避免引用问题
      
      // 如果是当前主题，也更新当前主题的消息
      if (state.currentTopic && state.currentTopic.id === topicId) {
        state.currentTopic.messages = messages.slice();
      }
    },

    // 强制更新话题列表
    forceTopicsUpdate: (state) => {
      // 增加计数器触发关联组件的重新渲染
      state.forceUpdateCounter += 1;
      console.log('强制更新话题列表，计数器:', state.forceUpdateCounter);
      
      // 记录更新时间
      const timestamp = new Date().toISOString();
      console.log(`强制更新触发时间: ${timestamp}`);
    },
    
    // 接收成功加载的话题数据
    loadTopicsSuccess: (state, action: PayloadAction<ChatTopic[]>) => {
      const uniqueTopics = action.payload;
      
      // 更新到Redux状态
      state.topics = uniqueTopics;
      
      // 初始化消息记录（需要对消息也进行去重）
      uniqueTopics.forEach((topic: ChatTopic) => {
        if (topic.messages && topic.messages.length > 0) {
          // 使用Map对消息按照ID去重
          const uniqueMessagesMap = new Map();
          (topic.messages || []).forEach((msg: Message) => {
            if (!uniqueMessagesMap.has(msg.id)) {
              // 清理错误状态和待处理状态的消息
              if (msg.status === 'error' || msg.status === 'pending') {
                msg.status = 'complete' as const;
                
                // 如果是error状态且没有内容，提供默认内容
                if (msg.status === 'complete' && (!msg.content || msg.content === '很抱歉，请求处理失败，请稍后再试。')) {
                  msg.content = '您好！有什么我可以帮助您的吗？ (Hello! Is there anything I can assist you with?)';
                }
              }
              uniqueMessagesMap.set(msg.id, msg);
            }
          });
          
          // 更新到消息记录
          state.messagesByTopic[topic.id] = Array.from(uniqueMessagesMap.values());
        } else {
          // 确保每个主题都有一个消息数组
          state.messagesByTopic[topic.id] = [];
        }
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
  },
});

// 导出actions
export const {
  setCurrentTopic,
  loadTopics,
  setTopicLoading,
  setTopicStreaming, 
  addMessage,
  updateMessage,
  deleteMessage,
  clearTopicMessages,
  deleteTopic,
  setError,
  createTopic,
  updateTopic,
  setTopicMessages,
  loadTopicsSuccess,
  forceTopicsUpdate
} = messagesSlice.actions;

// 异步action creator
export const initializeTopics = () => async (dispatch: any) => {
  await loadTopicsFromStorage(dispatch);
};

// 导出reducer
export default messagesSlice.reducer; 