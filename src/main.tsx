import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initStorageService } from './shared/services/storageService';
import { initializeServices } from './shared/services';
import store from './shared/store';
import { loadSystemPrompts } from './shared/store/slices/systemPromptsSlice';

// 初始化系统服务
async function initializeApp() {
  try {
    // 初始化IndexedDB存储
    await initStorageService();
    console.log('IndexedDB存储服务初始化成功');

    // 初始化其他服务
    await initializeServices();
    console.log('所有服务初始化完成');

    // 加载系统提示词数据
    store.dispatch(loadSystemPrompts());
    console.log('系统提示词加载已启动');

    // 渲染应用
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } catch (error) {
    console.error('应用初始化失败', error);
  }
}

// 启动应用
initializeApp();
