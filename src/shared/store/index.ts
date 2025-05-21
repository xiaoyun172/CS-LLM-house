import { configureStore } from '@reduxjs/toolkit';
// 移除旧的 messagesReducer 导入
import messagesReducer from './slices/newMessagesSlice'; // 使用 normalizedMessagesReducer 作为唯一的消息状态管理
import settingsReducer, { settingsMiddleware, loadSettings } from './settingsSlice';
import groupsReducer from './slices/groupsSlice';
import webSearchReducer from './slices/webSearchSlice';
import systemPromptsReducer from './slices/systemPromptsSlice';
import assistantsReducer from './slices/assistantsSlice';
import messageBlocksReducer from './slices/messageBlocksSlice';
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';

// 配置Redux存储
const store = configureStore({
  reducer: {
    messages: messagesReducer, // 只保留一个消息状态管理
    settings: settingsReducer,
    groups: groupsReducer,
    webSearch: webSearchReducer,
    systemPrompts: systemPromptsReducer,
    assistants: assistantsReducer,
    messageBlocks: messageBlocksReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false
    }).concat(settingsMiddleware)
});

// 加载设置
store.dispatch(loadSettings());

// 导出类型
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// 创建类型化的 hooks
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;
