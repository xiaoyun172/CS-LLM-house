import { createEntityAdapter, createSlice, createSelector, createAsyncThunk } from '@reduxjs/toolkit';
import type { EntityState, PayloadAction } from '@reduxjs/toolkit';
import type { Message, AssistantMessageStatus } from '../../types/newMessage.ts';
import type { RootState } from '../index';
import { dexieStorage } from '../../services/DexieStorageService';
import { upsertManyBlocks } from './messageBlocksSlice';

// 1. 创建实体适配器
const messagesAdapter = createEntityAdapter<Message>();

// 错误信息接口
export interface ErrorInfo {
  message: string;
  code?: string | number;
  type?: string;
  timestamp: string;
  details?: string;
  context?: Record<string, any>;
}

// 2. 定义状态接口
export interface NormalizedMessagesState extends EntityState<Message, string> {
  messageIdsByTopic: Record<string, string[]>; // 主题ID -> 消息ID数组的映射
  currentTopicId: string | null;
  loadingByTopic: Record<string, boolean>;
  streamingByTopic: Record<string, boolean>;
  displayCount: number;
  errors: ErrorInfo[]; // 错误信息数组，记录多个错误
  errorsByTopic: Record<string, ErrorInfo[]>; // 按主题分组的错误信息
}

// 3. 定义初始状态
const initialState: NormalizedMessagesState = messagesAdapter.getInitialState({
  messageIdsByTopic: {},
  currentTopicId: null,
  loadingByTopic: {},
  streamingByTopic: {},
  displayCount: 20,
  errors: [],
  errorsByTopic: {}
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

// 移除了额外的状态跟踪

interface AddMessagePayload {
  topicId: string;
  message: Message;
}

interface UpdateMessagePayload {
  id: string;
  changes: Partial<Message>;
}

interface UpdateMessageStatusPayload {
  topicId: string;
  messageId: string;
  status: AssistantMessageStatus;
}

interface RemoveMessagePayload {
  topicId: string;
  messageId: string;
}

interface SetErrorPayload {
  error: ErrorInfo;
  topicId?: string; // 可选的主题ID，用于按主题分组错误
}

// 添加块引用的Payload类型
interface UpsertBlockReferencePayload {
  messageId: string;
  blockId: string;
  status?: string;
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

    // 移除了额外的状态跟踪

    // 设置错误信息
    setError(state, action: PayloadAction<SetErrorPayload>) {
      const { error, topicId } = action.payload;

      // 添加到全局错误列表
      state.errors.push(error);

      // 如果超过10个错误，移除最旧的
      if (state.errors.length > 10) {
        state.errors.shift();
      }

      // 如果提供了主题ID，添加到主题错误列表
      if (topicId) {
        if (!state.errorsByTopic[topicId]) {
          state.errorsByTopic[topicId] = [];
        }

        state.errorsByTopic[topicId].push(error);

        // 如果超过5个错误，移除最旧的
        if (state.errorsByTopic[topicId].length > 5) {
          state.errorsByTopic[topicId].shift();
        }
      }
    },

    // 更新消息状态
    updateMessageStatus(state, action: PayloadAction<UpdateMessageStatusPayload>) {
      const { messageId, status } = action.payload;
      const message = state.entities[messageId];
      if (message) {
        message.status = status;
      }
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
    },

    // 添加或更新块引用
    upsertBlockReference(state, action: PayloadAction<UpsertBlockReferencePayload>) {
      const { messageId, blockId } = action.payload;

      const messageToUpdate = state.entities[messageId];
      if (!messageToUpdate) {
        console.error(`[upsertBlockReference] 消息 ${messageId} 不存在.`);
        return;
      }

      // 获取当前块列表
      const currentBlocks = [...(messageToUpdate.blocks || [])];

      // 如果块ID不在列表中，添加它
      if (!currentBlocks.includes(blockId)) {
        // 更新消息的blocks数组
        messagesAdapter.updateOne(state as any, {
          id: messageId,
          changes: {
            blocks: [...currentBlocks, blockId]
          }
        });
      }
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
  if (!state.messages) {
    // 如果状态中还没有messages，返回一个空状态
    return messagesAdapter.getInitialState();
  }
  return state.messages;
});

// 自定义选择器
export const selectMessagesByTopicId = (state: RootState, topicId: string) => {
  if (!state.messages) {
    return [];
  }
  const messageIds = state.messages.messageIdsByTopic[topicId] || [];
  return messageIds.map((id: string) => selectMessageById(state as any, id)).filter(Boolean);
};

export const selectCurrentTopicId = (state: RootState) =>
  state.messages ? state.messages.currentTopicId : null;

export const selectTopicLoading = (state: RootState, topicId: string) =>
  state.messages ? state.messages.loadingByTopic[topicId] || false : false;

export const selectTopicStreaming = (state: RootState, topicId: string) =>
  state.messages ? state.messages.streamingByTopic[topicId] || false : false;

// 错误相关选择器
export const selectErrors = (state: RootState) =>
  state.messages ? state.messages.errors : [];

export const selectLastError = (state: RootState) => {
  const errors = selectErrors(state);
  return errors.length > 0 ? errors[errors.length - 1] : null;
};

export const selectErrorsByTopic = (state: RootState, topicId: string) =>
  state.messages && state.messages.errorsByTopic[topicId]
    ? state.messages.errorsByTopic[topicId]
    : [];

// 使用createSelector创建记忆化选择器
export const selectOrderedMessagesByTopicId = createSelector(
  [selectMessagesByTopicId],
  (messages) => {
    return [...messages].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return aTime - bTime;
    });
  }
);

// 异步Thunk
export const loadTopicMessagesThunk = createAsyncThunk(
  'normalizedMessages/loadTopicMessages',
  async (topicId: string, { dispatch }) => {
    try {
      dispatch(newMessagesActions.setTopicLoading({ topicId, loading: true }));

      // 从数据库加载消息
      const topic = await dexieStorage.getTopic(topicId);
      if (!topic) {
        throw new Error(`Topic ${topicId} not found`);
      }

      // 获取消息
      const messages = await dexieStorage.getMessagesByTopicId(topicId);

      // 去重处理 - 使用统一的去重逻辑
      const { deduplicateMessages } = await import('../../services/MessageFilters');
      const sortedMessages = deduplicateMessages(messages);

      // 加载消息块
      const messageIds = sortedMessages.map(msg => msg.id);
      console.log(`[loadTopicMessagesThunk] 加载话题 ${topicId} 的消息，消息数量: ${sortedMessages.length}，消息ID: [${messageIds.join(', ')}]`);

      const blocks = [];
      const processedBlockIds = new Set<string>(); // 用于跟踪已处理的块ID

      for (const messageId of messageIds) {
        const messageBlocks = await dexieStorage.getMessageBlocksByMessageId(messageId);
        console.log(`[loadTopicMessagesThunk] 消息 ${messageId} 有 ${messageBlocks.length} 个块: [${messageBlocks.map(b => `${b.id}(${b.type})`).join(', ')}]`);

        // 过滤掉已处理的块
        const uniqueBlocks = messageBlocks.filter(block => {
          if (processedBlockIds.has(block.id)) {
            return false;
          }
          processedBlockIds.add(block.id);
          return true;
        });

        blocks.push(...uniqueBlocks);
      }

      console.log(`[loadTopicMessagesThunk] 总共加载到 ${blocks.length} 个消息块`);

      // 详细记录每个消息的块信息
      for (const message of sortedMessages) {
        const messageBlocks = blocks.filter(block => block.messageId === message.id);
        console.log(`[loadTopicMessagesThunk] 消息 ${message.id} 的 blocks 数组: [${message.blocks?.join(', ') || '空'}]，实际加载的块: [${messageBlocks.map(b => `${b.id}(${b.type})`).join(', ')}]`);
      }

      // 更新Redux状态 - 使用去重后的消息
      dispatch(newMessagesActions.messagesReceived({ topicId, messages: sortedMessages }));

      if (blocks.length > 0) {
        console.log(`[loadTopicMessagesThunk] 将 ${blocks.length} 个块添加到 Redux`);
        dispatch(upsertManyBlocks(blocks));
      } else {
        console.log(`[loadTopicMessagesThunk] 没有块需要添加到 Redux`);
      }

      return messages;
    } catch (error) {
      // 创建错误信息对象
      const errorInfo: ErrorInfo = {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: error instanceof Error && 'code' in error ? (error as any).code : 'UNKNOWN',
        type: 'LOAD_MESSAGES_ERROR',
        timestamp: new Date().toISOString(),
        details: error instanceof Error ? error.stack : undefined,
        context: { topicId }
      };

      // 分发错误
      dispatch(newMessagesActions.setError({
        error: errorInfo,
        topicId
      }));

      throw error;
    } finally {
      dispatch(newMessagesActions.setTopicLoading({ topicId, loading: false }));
    }
  }
);

// 7. 导出 Reducer
export default newMessagesSlice.reducer;