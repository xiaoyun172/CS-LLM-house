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

      // 获取应用设置（上下文限制）
      let contextLength = 2000; // 默认上下文长度
      let contextCount = 10; // 默认上下文数量
      try {
        const appSettingsJSON = localStorage.getItem('appSettings');
        if (appSettingsJSON) {
          const appSettings = JSON.parse(appSettingsJSON);
          if (appSettings.contextLength) contextLength = appSettings.contextLength;
          if (appSettings.contextCount) contextCount = appSettings.contextCount;
        }
      } catch (error) {
        console.error('读取上下文设置失败:', error);
      }

      // 应用上下文限制
      // 1. 按数量限制，选择最近的N条消息
      const limitedByCountMessages = [...messages].slice(-contextCount - 1);
      
      // 2. 对每条消息应用长度限制
      const limitedMessages = limitedByCountMessages.map(msg => {
        if (typeof msg.content === 'string' && msg.content.length > contextLength) {
          // 截断过长的消息内容
          return {
            ...msg,
            content: msg.content.substring(0, contextLength) + "..."
          };
        }
        return msg;
      });

      console.log(`[sendMessage] 应用上下文限制 - 原始消息数: ${messages.length}, 限制后: ${limitedMessages.length}, 长度限制: ${contextLength}`);

      // 发送API请求
      const response = await sendChatRequest({
        messages: limitedMessages.map(msg => ({
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
        
        // 保存到localStorage
        try {
          const topicsJson = localStorage.getItem('chatTopics');
          if (topicsJson) {
            const topics = JSON.parse(topicsJson);
            const topicIndex = topics.findIndex((t: ChatTopic) => t.id === topic.id);
            
            if (topicIndex === -1) {
              // 如果不存在，添加到列表
              topics.push(topic);
              localStorage.setItem('chatTopics', JSON.stringify(topics));
              console.log('主题已添加到localStorage:', topic.id);
            }
          }
        } catch (error) {
          console.error('保存主题到localStorage失败:', error);
        }
      }
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
        console.error(`找不到指定ID的消息: ${messageId}`);
        return;
      }
      
      const targetMessage = state.messagesByTopic[topicId][targetMsgIndex];
      console.log(`切换到消息: ID=${messageId}, 版本=${targetMessage.version || '1'}`);
      
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
      
      // 查找所有被当前消息引用的消息
      if (targetMessage.alternateVersions) {
        const referencedMsgs = state.messagesByTopic[topicId].filter(msg => 
          targetMessage.alternateVersions!.includes(msg.id)
        );
        
        // 将这些消息和它们的alternateVersions加入关联ID集合
        referencedMsgs.forEach(msg => {
          relatedIds.add(msg.id);
          if (msg.alternateVersions) {
            msg.alternateVersions.forEach(id => relatedIds.add(id));
          }
        });
      }
      
      // 确保当前ID也包含在内
      relatedIds.add(messageId);
      
      // 将ID集合转换为数组
      const allVersionIds = Array.from(relatedIds);
      console.log('所有关联版本ID:', allVersionIds);
      
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
      const newTopic = action.payload;
      
      console.log('创建新主题:', newTopic);
      
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

      // 保存到localStorage
      try {
        const topicsJson = localStorage.getItem('chatTopics');
        if (topicsJson) {
          const topics = JSON.parse(topicsJson);
          // 将新主题添加到列表开头
          topics.unshift(newTopic);
        localStorage.setItem('chatTopics', JSON.stringify(topics));
        } else {
          // 如果没有现有主题，创建新数组
          localStorage.setItem('chatTopics', JSON.stringify([newTopic]));
        }
        console.log('主题已保存到localStorage:', newTopic.id);
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

      // 如果是当前主题，尝试选择另一个话题
      if (state.currentTopic && state.currentTopic.id === topicId) {
        // 检查是否还有其他话题
        if (state.topics.length > 0) {
          // 有其他话题，选择第一个作为当前话题
          state.currentTopic = state.topics[0];
          console.log('删除当前话题后，自动切换到话题:', state.currentTopic.title);
        } else {
          // 没有其他话题，设置为null
          state.currentTopic = null;
          console.log('删除最后一个话题，当前话题设置为null');
        }
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
      
      console.log(`[setTopicMessages] 正在设置话题 ${topicId} 的消息列表，消息数量:`, messages.length);
      
      // 更新消息列表
      state.messagesByTopic[topicId] = messages.slice(); // 使用slice()创建一个新数组，避免引用问题
      
      // 如果是当前主题，也更新当前主题的消息
      if (state.currentTopic && state.currentTopic.id === topicId) {
        state.currentTopic.messages = messages.slice();
        console.log(`[setTopicMessages] 已更新当前话题 ${topicId} 的消息列表`);
      }
      
      // 保存到localStorage - 首先读取完整数据，然后只修改相关部分
      try {
        const topicsJson = localStorage.getItem('chatTopics');
        if (topicsJson) {
          const topics = JSON.parse(topicsJson);
          const topicIndex = topics.findIndex((t: ChatTopic) => t.id === topicId);
          
          if (topicIndex !== -1) {
            topics[topicIndex].messages = messages;
            localStorage.setItem('chatTopics', JSON.stringify(topics));
            console.log(`[setTopicMessages] 已更新localStorage中话题 ${topicId} 的消息列表`);
          } else {
            console.warn(`[setTopicMessages] 无法在localStorage中找到话题 ${topicId}`);
          }
        } else {
          console.warn('[setTopicMessages] localStorage中不存在chatTopics');
        }
      } catch (error) {
        console.error('[setTopicMessages] 保存消息到localStorage失败:', error);
      }
      
      // 直接添加自定义事件，通知其他组件更新
      // 这里只是设置标记，真正的事件会在组件中触发
      console.log(`[setTopicMessages] 已完成更新话题 ${topicId} 的消息列表操作`);
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
