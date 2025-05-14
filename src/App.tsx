// React组件导入
import { Provider } from 'react-redux';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { useEffect, useState, memo, useMemo } from 'react';
import { HashRouter } from 'react-router-dom';
import AppRouter from './routes';
import store from './shared/store';
import LoggerService from './shared/services/LoggerService';
import ExitConfirmDialog from './components/ExitConfirmDialog';
import BackButtonHandler from './components/BackButtonHandler';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { loadTopics } from './shared/store/messagesSlice';
import { useSelector } from 'react-redux';

// 初始化日志拦截器
LoggerService.log('INFO', '应用初始化');

// 使用memo优化ExitConfirmDialog
const MemoizedExitConfirmDialog = memo(ExitConfirmDialog);

function App() {
  // 删除未使用的isReady状态
  const [appInitialized, setAppInitialized] = useState(false);
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  
  // 从Redux状态获取主题设置
  const themePreference = useSelector((state: any) => state.settings.theme);
  
  // 监听主题变化
  useEffect(() => {
    // 如果是system，检测系统主题
    if (themePreference === 'system') {
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setMode(isDarkMode ? 'dark' : 'light');
      
      // 监听系统主题变化
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => setMode(e.matches ? 'dark' : 'light');
      mediaQuery.addEventListener('change', handler);
      
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      // 直接使用用户设置的主题
      setMode(themePreference as 'light' | 'dark');
    }
  }, [themePreference]);
  
  // 根据当前模式创建主题
  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: {
        main: '#64748B', // 柔和的灰蓝色
        light: '#94A3B8',
        dark: '#475569',
      },
      secondary: {
        main: '#10B981', // 保留绿色作为辅助色
        light: '#6EE7B7',
        dark: '#047857',
      },
      background: {
        default: mode === 'light' ? '#F8FAFC' : '#1a1a1a', // 深色更新为更暗的背景色
        paper: mode === 'light' ? '#FFFFFF' : '#232323', // 深色卡片背景更新
      },
      text: {
        primary: mode === 'light' ? '#1E293B' : '#e8e8e8', // 深色模式文字更亮一些
        secondary: mode === 'light' ? '#64748B' : '#a0a0a0', // 次要文字颜色
      },
      divider: mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)', // 分割线颜色
      error: {
        main: '#EF4444',
      },
      warning: {
        main: '#F59E0B',
      },
      info: {
        main: '#38BDF8',
      },
      success: {
        main: '#10B981',
      },
      action: {
        // 深色模式交互颜色
        active: mode === 'light' ? 'rgba(0, 0, 0, 0.54)' : 'rgba(255, 255, 255, 0.8)',
        hover: mode === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.08)',
        selected: mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.16)',
        disabled: mode === 'light' ? 'rgba(0, 0, 0, 0.26)' : 'rgba(255, 255, 255, 0.3)',
        disabledBackground: mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)',
      }
    },
    typography: {
      fontFamily: '"Inter", "Noto Sans SC", system-ui, -apple-system, sans-serif',
      h1: {
        fontWeight: 700,
      },
      h2: {
        fontWeight: 700,
      },
      h3: {
        fontWeight: 600,
      },
      button: {
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            margin: 0,
            padding: 0,
            boxSizing: 'border-box',
            // 减少滚动时的重绘次数
            overscrollBehavior: 'none',
            // 启用硬件加速
            WebkitOverflowScrolling: 'touch',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.05), 0px 1px 2px rgba(0, 0, 0, 0.03)',
            borderRadius: 12,
          },
        },
      },
    },
  }), [mode]);

  // 记录应用启动日志
  useEffect(() => {
    console.info('[App] 应用已启动');

    // 初始化状态栏
    const setupStatusBar = async () => {
      try {
        // 设置状态栏不覆盖WebView
        await StatusBar.setOverlaysWebView({ overlay: false });
        
        // 根据当前主题设置状态栏样式
        if (mode === 'dark') {
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: '#232323' }); // 更新深色模式状态栏颜色
        } else {
          await StatusBar.setStyle({ style: Style.Dark }); // 仍然使用浅色图标，但背景色为浅色
          await StatusBar.setBackgroundColor({ color: '#475569' }); // 浅色模式状态栏
        }
        
        console.log('[App] 状态栏已初始化');
      } catch (error) {
        console.error('[App] 状态栏初始化失败:', error);
      }
    };

    // 调用状态栏初始化
    setupStatusBar();

    // 加载话题数据
    store.dispatch(loadTopics());
    console.log('[App] 初始化时加载话题数据');

    // 延迟非关键初始化逻辑
    const timer = setTimeout(() => {
      console.log('[App] 主题:', theme);
      console.log('[App] Redux Store已初始化');
      setAppInitialized(true);

      // 设置性能监控定时器
      const performanceTimer = setInterval(monitorPerformance, 30000); // 每30秒监控一次

      return () => {
        clearInterval(performanceTimer);
      };
    }, 100);

    // 禁用Capacitor的默认返回键行为
    const setupListener = async () => {
      try {
        await CapApp.addListener('backButton', () => {
          // 这里不做任何处理，让我们的BackButtonHandler组件来处理
          console.log('[App] 返回键被按下，由BackButtonHandler处理');
        });
      } catch (error) {
        console.error('[App] 设置返回键监听器失败:', error);
      }
    };

    setupListener();

    return () => {
      // 清理监听器
      const cleanup = async () => {
        try {
          await CapApp.removeAllListeners();
          clearTimeout(timer);
        } catch (error) {
          console.error('[App] 移除监听器失败:', error);
        }
      };

      cleanup();
    };
  }, [theme]);

  // 性能监控函数
  const monitorPerformance = () => {
    if ('performance' in window && 'memory' in window.performance) {
      const memory = (window.performance as any).memory;
      LoggerService.log('INFO', `内存使用: ${Math.round(memory.usedJSHeapSize / 1048576)}MB / ${Math.round(memory.jsHeapSizeLimit / 1048576)}MB`);
    }
  };

  // 基于初始化状态决定是否展示全部内容
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HashRouter>
        {appInitialized ? (
          <>
            <AppRouter />
            <BackButtonHandler />
            <MemoizedExitConfirmDialog />
          </>
        ) : (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: mode === 'light' ? '#F8FAFC' : '#1a1a1a'
          }}>
            <div style={{ 
              color: mode === 'light' ? '#64748B' : '#a0a0a0', 
              fontWeight: 600,
              fontSize: '18px' 
            }}>AetherLink 正在启动...</div>
          </div>
        )}
      </HashRouter>
    </ThemeProvider>
  );
}

// 包装App组件以提供Redux存储
function AppWithRedux() {
  return (
    <Provider store={store}>
      <App />
    </Provider>
  );
}

export default AppWithRedux;
