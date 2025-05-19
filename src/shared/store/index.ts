import { configureStore } from '@reduxjs/toolkit';
import messagesReducer from './slices/messagesSlice';
import normalizedMessagesReducer from './slices/newMessagesSlice';
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
    messages: messagesReducer,
    normalizedMessages: normalizedMessagesReducer,
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
