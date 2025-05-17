import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Message, ChatTopic } from '../../types';
import { loadTopicsFromLocalStorage } from '../../services/messages/messageService';

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

// 创建消息slice
const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    // 设置当前主题
    setCurrentTopic: (state, action: PayloadAction<ChatTopic>) => {
      const topic = action.payload;
      
      console.log('设置当前主题:', topic.id);
      
      // 通过ID查找已有主题，确保使用最新版本
      const existingTopicIndex = state.topics.findIndex(t => t.id === topic.id);
      
      if (existingTopicIndex !== -1) {
        // 使用已有主题的最新状态
        state.currentTopic = state.topics[existingTopicIndex];
        console.log('使用Redux中存在的主题:', state.topics[existingTopicIndex].id);
      } else {
        // 如果不存在，则添加到主题列表并设置为当前主题
        state.topics.push(topic);
        state.currentTopic = topic;
        
        // 初始化消息数组（如果不存在）
        if (!state.messagesByTopic[topic.id]) {
          state.messagesByTopic[topic.id] = topic.messages || [];
        }
        
        console.log('主题不存在，已添加到Redux:', topic.id);
      }
    },

    // 加载所有话题
    loadTopics: (state) => {
      const uniqueTopics = loadTopicsFromLocalStorage();
      
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
    },

    // 更新消息
    updateMessage: (state, action: PayloadAction<{ topicId: string; messageId: string; updates: Partial<Message> }>) => {
      const { topicId, messageId, updates } = action.payload;
      
      const messageArray = state.messagesByTopic[topicId];
      if (messageArray) {
        const messageIndex = messageArray.findIndex(m => m.id === messageId);
        if (messageIndex !== -1) {
          // 合并更新
          state.messagesByTopic[topicId][messageIndex] = {
            ...state.messagesByTopic[topicId][messageIndex],
            ...updates
          };
        }
      }
    },

    // 删除消息
    deleteMessage: (state, action: PayloadAction<{ topicId: string; messageId: string }>) => {
      const { topicId, messageId } = action.payload;
      
      if (state.messagesByTopic[topicId]) {
        state.messagesByTopic[topicId] = state.messagesByTopic[topicId].filter(m => m.id !== messageId);
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
        console.error(`找不到指定ID的消息: ${messageId}`);
        return;
      }
      
      const targetMessage = state.messagesByTopic[topicId][targetMsgIndex];
      
      // 步骤1: 标记目标消息为当前版本
      state.messagesByTopic[topicId][targetMsgIndex] = {
        ...targetMessage,
        isCurrentVersion: true
      };
      
      // 步骤2: 查找所有相关版本（即属于同一组版本的所有消息）
      let relatedIds = new Set<string>([messageId]);
      
      // 添加当前消息的alternateVersions
      if (targetMessage.alternateVersions && targetMessage.alternateVersions.length > 0) {
        targetMessage.alternateVersions.forEach(id => relatedIds.add(id));
      }
      
      // 查找引用当前消息的其他消息
      const referencingMsgs = state.messagesByTopic[topicId].filter(msg => 
        msg.id !== messageId && msg.alternateVersions && msg.alternateVersions.includes(messageId)
      );
      
      // 将这些消息和它们的alternateVersions加入关联ID集合
      referencingMsgs.forEach(msg => {
        relatedIds.add(msg.id);
        if (msg.alternateVersions) {
          msg.alternateVersions.forEach(id => relatedIds.add(id));
        }
      });
      
      // 确保当前ID也包含在内
      relatedIds.add(messageId);
      
      // 将ID集合转换为数组
      const allVersionIds = Array.from(relatedIds);
      
      // 步骤3: 标记所有其他相关消息为非当前版本
      state.messagesByTopic[topicId] = state.messagesByTopic[topicId].map(msg => {
        if (msg.id !== messageId && allVersionIds.includes(msg.id)) {
          return {
            ...msg,
            isCurrentVersion: false
          };
        }
        return msg;
      });
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
  addAlternateVersion,
  switchToVersion
} = messagesSlice.actions;

// 导出reducer
export default messagesSlice.reducer; 