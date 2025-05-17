import { configureStore } from '@reduxjs/toolkit';
import messagesReducer, { forceTopicsUpdate } from './slices/messagesSlice';
import settingsReducer, { settingsMiddleware, loadSettings } from './settingsSlice';
import groupsReducer from './slices/groupsSlice';
import webSearchReducer from './slices/webSearchSlice';
import systemPromptsReducer from './slices/systemPromptsSlice';

// 自定义中间件：处理特殊的非标准 action
const customMiddleware = (store: any) => (next: any) => (action: any) => {
  // 检查特定的action类型
  if (action.type === 'FORCE_TOPICS_UPDATE') {
    console.log('拦截到强制更新话题列表的action', new Date().toISOString());
    
    // 调度标准的 Redux Toolkit action
    store.dispatch(forceTopicsUpdate());
    
    // 触发DOM事件，确保组件能感知到更新
    try {
      const event = new CustomEvent('forceTopicListUpdate', {
        detail: { timestamp: Date.now(), source: 'middleware' }
      });
      console.log('中间件触发forceTopicListUpdate自定义事件');
      window.dispatchEvent(event);
    } catch (e) {
      console.warn('中间件派发自定义事件失败', e);
    }
    
    return;
  } else if (action.type === 'messages/createTopic') {
    console.log('拦截到创建话题action:', action.payload?.id);
    // 先让原始action执行
    const result = next(action);
    
    // 然后强制触发话题列表更新
    setTimeout(() => {
      console.log('话题创建后延时触发FORCE_TOPICS_UPDATE');
      store.dispatch({ type: 'FORCE_TOPICS_UPDATE' });
    }, 200);
    
    return result;
  }
  
  return next(action);
};

// 创建Redux store
const store = configureStore({
  reducer: {
    messages: messagesReducer,
    settings: settingsReducer,
    groups: groupsReducer,
    webSearch: webSearchReducer,
    systemPrompts: systemPromptsReducer,
  },
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware({
      serializableCheck: {
        // 忽略这些action类型的可序列化检查
        ignoredActions: ['settings/save/pending', 'settings/save/fulfilled', 'settings/save/rejected', 'FORCE_TOPICS_UPDATE'],
      },
    }).concat(settingsMiddleware, customMiddleware),
});

// 应用启动时加载设置
store.dispatch(loadSettings());

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
