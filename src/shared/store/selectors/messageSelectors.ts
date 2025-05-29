import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../store';
import {
  selectMessagesByTopicId,
  selectCurrentTopicId as selectNormalizedCurrentTopicId,
  selectTopicLoading as selectNormalizedTopicLoading,
  selectTopicStreaming as selectNormalizedTopicStreaming
} from '../slices/newMessagesSlice';

// 基础选择器
export const selectMessagesState = (state: RootState) => state.messages;
export const selectMessageBlocksState = (state: RootState) => state.messageBlocks;

// 选择特定主题的消息 - 使用 newMessagesSlice 中的选择器
export const selectMessagesForTopic = selectMessagesByTopicId;

// 选择消息块实体 - 添加转换逻辑避免直接返回输入
export const selectMessageBlockEntities = createSelector(
  [selectMessageBlocksState],
  (messageBlocksState) => {
    // 确保返回的是一个新的对象引用，避免直接返回输入
    return messageBlocksState?.entities ? { ...messageBlocksState.entities } : {};
  }
);

// 选择特定消息的块
export const selectBlocksForMessage = createSelector(
  [
    selectMessageBlockEntities,
    (state: RootState, messageId: string) => {
      // 从 state.messages 中获取消息
      const message = selectMessageById(state, messageId);
      return message?.blocks || [];
    }
  ],
  (blockEntities, blockIds) => {
    return blockIds.map((id: string) => blockEntities[id]).filter(Boolean);
  }
);

// 从 newMessagesSlice 中获取消息
export const selectMessageById = (state: RootState, messageId: string) => {
  return state.messages.entities[messageId];
};

// 选择主题的加载状态
export const selectTopicLoading = selectNormalizedTopicLoading;

// 选择主题的流式响应状态
export const selectTopicStreaming = selectNormalizedTopicStreaming;

// 选择当前主题ID
export const selectCurrentTopicId = selectNormalizedCurrentTopicId;

// 选择当前主题
export const selectCurrentTopic = (state: RootState) => {
  // 从 messages 状态中获取当前主题ID
  const currentTopicId = selectCurrentTopicId(state);
  if (!currentTopicId) return null;

  // 从数据库获取主题 - 这里只返回ID，实际获取需要在组件中处理
  return { id: currentTopicId };
};

// 选择所有主题 - 这个函数需要在组件中通过数据库获取
export const selectTopics = (_state: RootState) => {
  // 返回空数组，实际获取需要在组件中处理
  return [];
};

// 选择当前主题的消息 - 使用 createSelector 进行记忆化
export const selectMessagesForCurrentTopic = createSelector(
  [
    selectCurrentTopicId,
    (state: RootState) => state
  ],
  (currentTopicId, state) => {
    if (!currentTopicId) return [];
    return selectMessagesForTopic(state, currentTopicId);
  }
);

// 选择主题是否正在加载
export const selectIsTopicLoading = selectTopicLoading;

// 选择当前主题是否正在加载 - 使用 createSelector 进行记忆化
export const selectIsCurrentTopicLoading = createSelector(
  [
    selectCurrentTopicId,
    (state: RootState) => state
  ],
  (currentTopicId, state) => {
    if (!currentTopicId) return false;
    return selectTopicLoading(state, currentTopicId);
  }
);

// 选择主题是否正在流式响应
export const selectIsTopicStreaming = selectTopicStreaming;

// 选择当前主题是否正在流式响应 - 使用 createSelector 进行记忆化
export const selectIsCurrentTopicStreaming = createSelector(
  [
    selectCurrentTopicId,
    (state: RootState) => state
  ],
  (currentTopicId, state) => {
    if (!currentTopicId) return false;
    return selectTopicStreaming(state, currentTopicId);
  }
);

// 选择系统提示词
export const selectSystemPrompt = (_state: RootState) => {
  // 返回空字符串，实际获取需要在组件中处理
  return '';
};

// 选择是否显示系统提示词
export const selectShowSystemPrompt = (_state: RootState) => {
  // 返回默认值，实际获取需要在组件中处理
  return false;
};