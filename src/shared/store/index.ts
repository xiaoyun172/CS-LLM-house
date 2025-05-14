import { configureStore } from '@reduxjs/toolkit';
import messagesReducer from './messagesSlice';
import settingsReducer from './settingsSlice';
import groupsReducer from './slices/groupsSlice';
import webSearchReducer from './slices/webSearchSlice';

// 创建Redux store
const store = configureStore({
  reducer: {
    messages: messagesReducer,
    settings: settingsReducer,
    groups: groupsReducer,
    webSearch: webSearchReducer,
  },
});

// 导出类型
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// 创建自定义hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// 导入React-Redux hooks
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';

export default store;
