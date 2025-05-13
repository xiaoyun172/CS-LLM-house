// React组件导入
import { Provider } from 'react-redux';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { useEffect, useState, memo } from 'react';
import { HashRouter } from 'react-router-dom';
import AppRouter from './routes';
import store from './shared/store';
import LoggerService from './shared/services/LoggerService';
import ExitConfirmDialog from './components/ExitConfirmDialog';
import BackButtonHandler from './components/BackButtonHandler';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';

// 创建主题 - 使用memo包装以减少重新计算
const theme = createTheme({
  palette: {
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
      default: '#F8FAFC',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1E293B',
      secondary: '#64748B',
    },
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
});

// 初始化日志拦截器
LoggerService.log('INFO', '应用初始化');

// 性能监控函数
const monitorPerformance = () => {
  if ('performance' in window && 'memory' in window.performance) {
    const memory = (window.performance as any).memory;
    LoggerService.log('INFO', `内存使用: ${Math.round(memory.usedJSHeapSize / 1048576)}MB / ${Math.round(memory.jsHeapSizeLimit / 1048576)}MB`);
  }
};

// 使用memo优化ExitConfirmDialog
const MemoizedExitConfirmDialog = memo(ExitConfirmDialog);

function App() {
  // 删除未使用的isReady状态
  const [appInitialized, setAppInitialized] = useState(false);

  // 记录应用启动日志
  useEffect(() => {
    console.info('[App] 应用已启动');

    // 初始化状态栏
    const setupStatusBar = async () => {
      try {
        // 设置状态栏不覆盖WebView，使用浅色图标（深色背景）
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#475569' }); // 深灰蓝色状态栏
        console.log('[App] 状态栏已初始化');
      } catch (error) {
        console.error('[App] 状态栏初始化失败:', error);
      }
    };

    // 调用状态栏初始化
    setupStatusBar();

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
  }, []);

  // 基于初始化状态决定是否展示全部内容
  return (
    <Provider store={store}>
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
              background: '#F8FAFC'
            }}>
              <div style={{ 
                color: '#64748B', 
                fontWeight: 600,
                fontSize: '18px' 
              }}>LLM小屋 正在启动...</div>
            </div>
          )}
        </HashRouter>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
