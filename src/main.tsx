import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initStorageService, dexieStorage } from './shared/services/storageService';
import { initializeServices } from './shared/services';
import store from './shared/store';
import { loadSystemPrompts } from './shared/store/slices/systemPromptsSlice';

// 初始化系统服务
async function initializeApp() {
  try {
    console.log('[INFO] 应用初始化');
    
    // 首先，确保Dexie数据库已经打开并准备就绪
    try {
      const isOpen = await dexieStorage.isOpen();
      if (!isOpen) {
        await dexieStorage.open();
      }
      console.log('数据库连接已就绪');
    } catch (dbError) {
      console.error('数据库连接初始化失败:', 
        dbError instanceof Error ? dbError.message : String(dbError));
      throw new Error('数据库连接失败，无法初始化应用');
    }
    
    // 初始化存储服务，包括数据迁移
    await initStorageService();
    console.log('Dexie存储服务初始化成功');

    // 初始化其他服务
    await initializeServices();
    console.log('所有服务初始化完成');

    // 加载系统提示词数据
    store.dispatch(loadSystemPrompts());
    console.log('系统提示词加载已启动');

    // 记录应用启动信息
    console.log('[App] 应用已启动');
    
    // 渲染应用
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } catch (error) {
    console.error('应用初始化失败:', 
      error instanceof Error ? `${error.name}: ${error.message}` : String(error));
    
    // 显示用户友好的错误信息
    const errorContainer = document.createElement('div');
    errorContainer.style.padding = '20px';
    errorContainer.style.maxWidth = '600px';
    errorContainer.style.margin = '50px auto';
    errorContainer.style.textAlign = 'center';
    errorContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    errorContainer.innerHTML = `
      <h2 style="color: #d32f2f;">应用启动失败</h2>
      <p>应用初始化过程中遇到问题，请尝试刷新页面或清除浏览器缓存后重试。</p>
      <button id="retry-btn" style="padding: 8px 16px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 16px;">重试</button>
    `;
    document.body.appendChild(errorContainer);
    
    // 添加重试按钮功能
    document.getElementById('retry-btn')?.addEventListener('click', () => {
      window.location.reload();
    });
  }
}

// 启动应用
initializeApp();
