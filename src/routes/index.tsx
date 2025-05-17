import React, { useEffect, useState, lazy, Suspense } from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import { getStorageItem } from '../shared/utils/storage';
// 使用懒加载导入组件
const ChatPage = lazy(() => import('../pages/ChatPage'));
const WelcomePage = lazy(() => import('../pages/WelcomePage'));
const SettingsPage = lazy(() => import('../pages/Settings'));
const AppearanceSettings = lazy(() => import('../pages/Settings/AppearanceSettings'));
const BehaviorSettings = lazy(() => import('../pages/Settings/BehaviorSettings'));
const ChatInterfaceSettings = lazy(() => import('../pages/Settings/ChatInterfaceSettings'));
const DefaultModelSettings = lazy(() => import('../pages/Settings/DefaultModelSettings'));
const DefaultModelSettingsPage = lazy(() => import('../pages/Settings/DefaultModelSettings/index'));
const ModelProviderSettings = lazy(() => import('../pages/Settings/ModelProviderSettings'));
const AddProviderPage = lazy(() => import('../pages/Settings/AddProviderPage'));
const AboutPage = lazy(() => import('../pages/Settings/AboutPage'));
const VoiceSettings = lazy(() => import('../pages/Settings/VoiceSettings'));
const WebSearchSettings = lazy(() => import('../pages/Settings/WebSearchSettings'));
const SystemPromptSettings = lazy(() => import('../pages/Settings/SystemPrompt'));
const DevToolsPage = lazy(() => import('../pages/DevToolsPage'));
const VueDemoPage = lazy(() => import('../pages/VueDemo'));
import DataSettingsPage from '../pages/Settings/DataSettings';
// 导入高级备份页面
const AdvancedBackupPage = lazy(() => import('../pages/Settings/DataSettings/AdvancedBackupPage'));

// 加载中组件
const LoadingFallback = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    background: '#f5f5f5'
  }}>
    <div>加载中...</div>
  </div>
);

// 路由提供者组件
const AppRouter: React.FC = () => {
  const [isFirstTimeUser, setIsFirstTimeUser] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkFirstTimeUser() {
      try {
        const firstTimeUserValue = await getStorageItem<string>('first-time-user');
        setIsFirstTimeUser(firstTimeUserValue === null);
      } catch (error) {
        console.error('检查首次用户状态出错:', error);
        setIsFirstTimeUser(false); // 出错时默认为非首次用户
      }
    }
    
    checkFirstTimeUser();
  }, []);

  if (isFirstTimeUser === null) {
    // 显示加载状态
    return <LoadingFallback />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={isFirstTimeUser ? <Navigate to="/welcome" replace /> : <Navigate to="/chat" replace />} />
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/appearance" element={<AppearanceSettings />} />
        <Route path="/settings/appearance/chat-interface" element={<ChatInterfaceSettings />} />
        <Route path="/settings/behavior" element={<BehaviorSettings />} />
        <Route path="/settings/default-model" element={<DefaultModelSettings />} />
        <Route path="/settings/default-model-settings" element={<DefaultModelSettingsPage />} />
        <Route path="/settings/system-prompts" element={<SystemPromptSettings />} />
        <Route path="/settings/model-provider/:providerId" element={<ModelProviderSettings />} />
        <Route path="/settings/add-provider" element={<AddProviderPage />} />
        <Route path="/settings/about" element={<AboutPage />} />
        <Route path="/settings/voice" element={<VoiceSettings />} />
        <Route path="/settings/data" element={<DataSettingsPage />} />
        <Route path="/settings/data/advanced-backup" element={<AdvancedBackupPage />} />
        <Route path="/settings/web-search" element={<WebSearchSettings />} />
        <Route path="/devtools" element={<DevToolsPage />} />
        <Route path="/vue-demo" element={<VueDemoPage />} />
      </Routes>
    </Suspense>
  );
};

export default AppRouter;
