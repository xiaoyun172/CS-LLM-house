import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../store';

// 基础选择器
export const selectMessagesState = (state: RootState) => state.messages;
export const selectMessageBlocksState = (state: RootState) => state.messageBlocks;

// 选择特定主题的消息
export const selectMessagesForTopic = createSelector(
  [
    selectMessagesState,
    (_: RootState, topicId: string) => topicId
  ],
  (messagesState, topicId) => {
    return messagesState.messagesByTopic[topicId] || [];
  }
);

// 选择消息块实体
export const selectMessageBlockEntities = createSelector(
  [selectMessageBlocksState],
  (messageBlocksState) => messageBlocksState.entities
);

// 选择特定消息的块
export const selectBlocksForMessage = createSelector(
  [
    selectMessageBlockEntities,
    (state: RootState, messageId: string) => {
      const message = Object.values(state.messages.messagesByTopic)
        .flat()
        .find(msg => msg.id === messageId);
      return message?.blocks || [];
    }
  ],
  (blockEntities, blockIds) => {
    return blockIds.map(id => blockEntities[id]).filter(Boolean);
  }
);

// 选择主题的加载状态
export const selectTopicLoading = createSelector(
  [
    selectMessagesState,
    (_: RootState, topicId: string) => topicId
  ],
  (messagesState, topicId) => {
    return messagesState.loadingByTopic[topicId] || false;
  }
);

// 选择主题的流式响应状态
export const selectTopicStreaming = createSelector(
  [
    selectMessagesState,
    (_: RootState, topicId: string) => topicId
  ],
  (messagesState, topicId) => {
    return messagesState.streamingByTopic[topicId] || false;
  }
); 