import { createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import type { EntityState, PayloadAction } from '@reduxjs/toolkit';
import type { Message } from '../../types/newMessage.ts';
import type { RootState } from '../index';

// 1. 创建实体适配器
const messagesAdapter = createEntityAdapter<Message>();

// 2. 定义状态接口
export interface NormalizedMessagesState extends EntityState<Message, string> {
  messageIdsByTopic: Record<string, string[]>; // 主题ID -> 消息ID数组的映射
  currentTopicId: string | null;
  loadingByTopic: Record<string, boolean>;
  streamingByTopic: Record<string, boolean>;
  displayCount: number;
}

// 3. 定义初始状态
const initialState: NormalizedMessagesState = messagesAdapter.getInitialState({
  messageIdsByTopic: {},
  currentTopicId: null,
  loadingByTopic: {},
  streamingByTopic: {},
  displayCount: 20
});

// 定义 Payload 类型
interface MessagesReceivedPayload {
  topicId: string;
  messages: Message[];
}

interface SetTopicLoadingPayload {
  topicId: string;
  loading: boolean;
}

interface SetTopicStreamingPayload {
  topicId: string;
  streaming: boolean;
}

interface AddMessagePayload {
  topicId: string;
  message: Message;
}

interface UpdateMessagePayload {
  id: string;
  changes: Partial<Message>;
}

interface RemoveMessagePayload {
  topicId: string;
  messageId: string;
}

// 4. 创建 Slice
const newMessagesSlice = createSlice({
  name: 'normalizedMessages',
  initialState,
  reducers: {
    // 设置当前主题
    setCurrentTopicId(state, action: PayloadAction<string | null>) {
      state.currentTopicId = action.payload;
      if (action.payload && !(action.payload in state.messageIdsByTopic)) {
        state.messageIdsByTopic[action.payload] = [];
        state.loadingByTopic[action.payload] = false;
        state.streamingByTopic[action.payload] = false;
      }
    },

    // 设置主题加载状态
    setTopicLoading(state, action: PayloadAction<SetTopicLoadingPayload>) {
      const { topicId, loading } = action.payload;
      state.loadingByTopic[topicId] = loading;
    },

    // 设置主题流式响应状态
    setTopicStreaming(state, action: PayloadAction<SetTopicStreamingPayload>) {
      const { topicId, streaming } = action.payload;
      state.streamingByTopic[topicId] = streaming;
    },

    // 设置显示消息数量
    setDisplayCount(state, action: PayloadAction<number>) {
      state.displayCount = action.payload;
    },

    // 接收消息
    messagesReceived(state, action: PayloadAction<MessagesReceivedPayload>) {
      const { topicId, messages } = action.payload;

      // 添加或更新消息
      messagesAdapter.upsertMany(state as any, messages);

      // 更新主题的消息ID数组
      const messageIds = messages.map(msg => msg.id);

      // 确保不会覆盖现有消息
      if (!state.messageIdsByTopic[topicId]) {
        state.messageIdsByTopic[topicId] = messageIds;
      } else {
        // 合并现有消息ID和新消息ID，确保不重复
        const existingIds = state.messageIdsByTopic[topicId];
        const newIds = messageIds.filter(id => !existingIds.includes(id));
        state.messageIdsByTopic[topicId] = [...existingIds, ...newIds];
      }

      // 调试日志
      console.log(`[newMessagesSlice] 接收消息: 主题ID=${topicId}, 消息数量=${messages.length}, 总消息ID数量=${state.messageIdsByTopic[topicId].length}`);
    },

    // 添加消息
    addMessage(state, action: PayloadAction<AddMessagePayload>) {
      const { topicId, message } = action.payload;

      // 添加消息
      messagesAdapter.addOne(state as any, message);

      // 更新主题的消息ID数组
      if (!state.messageIdsByTopic[topicId]) {
        state.messageIdsByTopic[topicId] = [];
      }
      state.messageIdsByTopic[topicId].push(message.id);
    },

    // 更新消息
    updateMessage(state, action: PayloadAction<UpdateMessagePayload>) {
      messagesAdapter.updateOne(state as any, {
        id: action.payload.id,
        changes: action.payload.changes
      });
    },

    // 删除消息
    removeMessage(state, action: PayloadAction<RemoveMessagePayload>) {
      const { topicId, messageId } = action.payload;

      // 从实体中删除消息
      messagesAdapter.removeOne(state as any, messageId);

      // 从主题的消息ID数组中删除
      if (state.messageIdsByTopic[topicId]) {
        state.messageIdsByTopic[topicId] = state.messageIdsByTopic[topicId].filter(id => id !== messageId);
      }
    },

    // 清空主题的所有消息
    clearTopicMessages(state, action: PayloadAction<string>) {
      const topicId = action.payload;

      // 获取要删除的消息ID
      const messageIds = state.messageIdsByTopic[topicId] || [];

      // 删除消息
      messagesAdapter.removeMany(state as any, messageIds);

      // 清空主题的消息ID数组
      state.messageIdsByTopic[topicId] = [];
    }
  }
});

// 5. 导出 Actions
export const newMessagesActions = newMessagesSlice.actions;

// 6. 导出 Selectors
// 由于TypeScript类型问题，我们需要使用any类型绕过类型检查
// 在实际使用中，这些选择器会正常工作
export const {
  selectAll: selectAllMessages,
  selectById: selectMessageById,
  selectIds: selectMessageIds
} = messagesAdapter.getSelectors<RootState>((state: any) => {
  if (!state.normalizedMessages) {
    // 如果状态中还没有normalizedMessages，返回一个空状态
    return messagesAdapter.getInitialState();
  }
  return state.normalizedMessages;
});

// 自定义选择器
export const selectMessagesByTopicId = (state: RootState, topicId: string) => {
  if (!state.normalizedMessages) {
    return [];
  }
  const messageIds = state.normalizedMessages.messageIdsByTopic[topicId] || [];
  return messageIds.map((id: string) => selectMessageById(state as any, id)).filter(Boolean);
};

export const selectCurrentTopicId = (state: RootState) =>
  state.normalizedMessages ? state.normalizedMessages.currentTopicId : null;

export const selectTopicLoading = (state: RootState, topicId: string) =>
  state.normalizedMessages ? state.normalizedMessages.loadingByTopic[topicId] || false : false;

export const selectTopicStreaming = (state: RootState, topicId: string) =>
  state.normalizedMessages ? state.normalizedMessages.streamingByTopic[topicId] || false : false;

// 7. 导出 Reducer
export default newMessagesSlice.reducer;