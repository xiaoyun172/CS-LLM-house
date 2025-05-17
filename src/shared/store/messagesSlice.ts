// 这个文件是为了向后兼容，实际功能已拆分到更小的模块中
// 导出 Slice
export { default as messagesSlice } from './slices/messagesSlice';

// 导出 Actions
export {
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
  initializeTopics
} from './slices/messagesSlice';

// 导出 Types
export type { MessagesState } from './slices/messagesSlice';

// 注释掉导致循环依赖的导出
// export {
//   sendMessage,
//   setCurrentTopicThunk,
//   loadTopicsThunk,
//   deleteTopicThunk,
// } from '../services/messages';

// 导出默认的 Reducer
export { default } from './slices/messagesSlice';
