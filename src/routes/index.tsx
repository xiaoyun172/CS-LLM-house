import React, { useEffect, useState } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import ChatPage from '../pages/ChatPage';
import WelcomePage from '../pages/WelcomePage';
import SettingsPage from '../pages/Settings';
import AppearanceSettings from '../pages/Settings/AppearanceSettings';
import BehaviorSettings from '../pages/Settings/BehaviorSettings';
import DefaultModelSettings from '../pages/Settings/DefaultModelSettings';
import ModelProviderSettings from '../pages/Settings/ModelProviderSettings';
import AddProviderPage from '../pages/Settings/AddProviderPage';
import AboutPage from '../pages/Settings/AboutPage';
import DevToolsPage from '../pages/DevToolsPage';

// 检查是否是首次使用
const isFirstTimeUser = (): boolean => {
  return !localStorage.getItem('chatTopics') && !localStorage.getItem('settings');
};

// 创建路由配置
const createRouter = (firstTime: boolean) => createBrowserRouter([
  {
    path: '/',
    element: firstTime ? <Navigate to="/welcome" replace /> : <Navigate to="/chat" replace />,
  },
  {
    path: '/welcome',
    element: <WelcomePage />,
  },
  {
    path: '/chat',
    element: <ChatPage />,
  },
  {
    path: '/settings',
    element: <SettingsPage />,
  },
  {
    path: '/settings/appearance',
    element: <AppearanceSettings />,
  },
  {
    path: '/settings/behavior',
    element: <BehaviorSettings />,
  },
  {
    path: '/settings/default-model',
    element: <DefaultModelSettings />,
  },
  {
    path: '/settings/model-provider/:providerId',
    element: <ModelProviderSettings />,
  },
  {
    path: '/settings/add-provider',
    element: <AddProviderPage />,
  },
  {
    path: '/settings/about',
    element: <AboutPage />,
  },
  {
    path: '/devtools',
    element: <DevToolsPage />,
  },
]);

// 路由提供者组件
const AppRouter: React.FC = () => {
  const [firstTime, setFirstTime] = useState<boolean | null>(null);

  useEffect(() => {
    setFirstTime(isFirstTimeUser());
  }, []);

  if (firstTime === null) {
    // 显示加载状态
    return <div>加载中...</div>;
  }

  const router = createRouter(firstTime);

  return <RouterProvider router={router} />;
};

export default AppRouter;
