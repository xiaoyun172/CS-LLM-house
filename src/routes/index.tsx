import React, { useEffect, useState, lazy, Suspense } from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
// 使用懒加载导入组件
const ChatPage = lazy(() => import('../pages/ChatPage'));
const WelcomePage = lazy(() => import('../pages/WelcomePage'));
const SettingsPage = lazy(() => import('../pages/Settings'));
const AppearanceSettings = lazy(() => import('../pages/Settings/AppearanceSettings'));
const BehaviorSettings = lazy(() => import('../pages/Settings/BehaviorSettings'));
const DefaultModelSettings = lazy(() => import('../pages/Settings/DefaultModelSettings'));
const ModelProviderSettings = lazy(() => import('../pages/Settings/ModelProviderSettings'));
const AddProviderPage = lazy(() => import('../pages/Settings/AddProviderPage'));
const AboutPage = lazy(() => import('../pages/Settings/AboutPage'));
const DevToolsPage = lazy(() => import('../pages/DevToolsPage'));

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

// 检查是否是首次使用
const isFirstTimeUser = (): boolean => {
  return !localStorage.getItem('chatTopics') && !localStorage.getItem('settings');
};

// 路由提供者组件
const AppRouter: React.FC = () => {
  const [firstTime, setFirstTime] = useState<boolean | null>(null);

  useEffect(() => {
    setFirstTime(isFirstTimeUser());
  }, []);

  if (firstTime === null) {
    // 显示加载状态
    return <LoadingFallback />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={firstTime ? <Navigate to="/welcome" replace /> : <Navigate to="/chat" replace />} />
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/appearance" element={<AppearanceSettings />} />
        <Route path="/settings/behavior" element={<BehaviorSettings />} />
        <Route path="/settings/default-model" element={<DefaultModelSettings />} />
        <Route path="/settings/model-provider/:providerId" element={<ModelProviderSettings />} />
        <Route path="/settings/add-provider" element={<AddProviderPage />} />
        <Route path="/settings/about" element={<AboutPage />} />
        <Route path="/devtools" element={<DevToolsPage />} />
      </Routes>
    </Suspense>
  );
};

export default AppRouter;
