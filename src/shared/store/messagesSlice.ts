// 这个文件是为了向后兼容，实际功能已拆分到更小的模块中
// 导出必要的 actions
export { 
  addTopic, 
  updateTopic,
  deleteTopic,
  setCurrentTopic,
  addMessage,
  updateMessage,
  setTopicMessages,
  initializeTopics
} from './slices/messagesSlice';

// 导出 MessagesState 类型
export type { MessagesState } from './slices/messagesSlice';

// 导出空的 createTopic 函数（为了兼容性）
export const createTopic = () => async () => {};

// 导出 loadTopics 作为 initializeTopics 的别名
export { initializeTopics as loadTopics } from './slices/messagesSlice';

// 导出默认的 Reducer
export { default } from './slices/messagesSlice'; 