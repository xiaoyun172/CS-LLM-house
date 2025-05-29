// React组件导入
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { useEffect, useState, memo, useMemo } from 'react';
import { HashRouter } from 'react-router-dom';
import AppRouter from './routes';
import store, { persistor } from './shared/store';
import LoggerService from './shared/services/LoggerService';
import ExitConfirmDialog from './components/ExitConfirmDialog';
import BackButtonHandler from './components/BackButtonHandler';
import UpdateNoticeDialog from './components/UpdateNoticeDialog';
import AppInitializer from './components/AppInitializer';
import { App as CapApp } from '@capacitor/app';
import { statusBarService } from './shared/services/StatusBarService';
import { safeAreaService } from './shared/services/SafeAreaService';
import { loadTopicMessagesThunk } from './shared/store/slices/newMessagesSlice';
import { initGroups } from './shared/store/slices/groupsSlice';
import { useSelector } from 'react-redux';
import { useAppSelector } from './shared/store';
import { DataManager } from './shared/services';
import { DataRepairService } from './shared/services/DataRepairService';
import { DatabaseCleanupService } from './shared/services/DatabaseCleanupService';
import { dexieStorage } from './shared/services/DexieStorageService';
import { SnackbarProvider } from 'notistack';
import KnowledgeProvider from './components/KnowledgeManagement/KnowledgeProvider';

import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';

// 初始化日志拦截器
LoggerService.log('INFO', '应用初始化');

// 使用memo优化ExitConfirmDialog
const MemoizedExitConfirmDialog = memo(ExitConfirmDialog);

// 创建一个内部组件，它在Provider内部使用Redux
const AppContent = () => {
  // 应用初始化状态
  const [appInitialized, setAppInitialized] = useState(false);
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [showResetNotice, setShowResetNotice] = useState(false);

  // 从Redux状态获取主题设置 - 现在在Provider内部安全使用
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

  // 获取字体大小设置
  const fontSize = useAppSelector((state) => state.settings.fontSize);

  // 根据当前模式和字体大小创建主题
  const theme = useMemo(() => {
    // 计算字体大小比例
    const fontScale = fontSize / 16; // 16px为基准

    return createTheme({
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
        fontSize: fontSize, // 使用全局字体大小设置
        h1: {
          fontWeight: 700,
          fontSize: `${2.5 * fontScale}rem`, // 动态调整标题字体大小
        },
        h2: {
          fontWeight: 700,
          fontSize: `${2 * fontScale}rem`,
        },
        h3: {
          fontWeight: 600,
          fontSize: `${1.75 * fontScale}rem`,
        },
        h4: {
          fontWeight: 600,
          fontSize: `${1.5 * fontScale}rem`,
        },
        h5: {
          fontWeight: 600,
          fontSize: `${1.25 * fontScale}rem`,
        },
        h6: {
          fontWeight: 600,
          fontSize: `${1.125 * fontScale}rem`,
        },
        body1: {
          fontSize: `${1 * fontScale}rem`,
        },
        body2: {
          fontSize: `${0.875 * fontScale}rem`,
        },
        button: {
          fontWeight: 600,
          fontSize: `${0.875 * fontScale}rem`,
        },
        caption: {
          fontSize: `${0.75 * fontScale}rem`,
        },
        overline: {
          fontSize: `${0.75 * fontScale}rem`,
        },
      },
    shape: {
      borderRadius: 8,
    },
    shadows: [
      'none',
      mode === 'light'
        ? '0 1px 2px rgba(0, 0, 0, 0.05)'
        : '0 1px 2px rgba(255, 255, 255, 0.05)',
      mode === 'light'
        ? '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)'
        : '0 1px 3px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.1)',
      mode === 'light'
        ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        : '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1)',
      mode === 'light'
        ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
        : '0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1)',
      mode === 'light'
        ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        : '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
      '0px 3px 5px -1px rgba(0,0,0,0.2),0px 6px 10px 0px rgba(0,0,0,0.14),0px 1px 18px 0px rgba(0,0,0,0.12)',
      '0px 4px 5px -2px rgba(0,0,0,0.2),0px 7px 10px 1px rgba(0,0,0,0.14),0px 2px 16px 1px rgba(0,0,0,0.12)',
      '0px 5px 5px -3px rgba(0,0,0,0.2),0px 8px 10px 1px rgba(0,0,0,0.14),0px 3px 14px 2px rgba(0,0,0,0.12)',
      '0px 5px 6px -3px rgba(0,0,0,0.2),0px 9px 12px 1px rgba(0,0,0,0.14),0px 3px 16px 2px rgba(0,0,0,0.12)',
      '0px 6px 6px -3px rgba(0,0,0,0.2),0px 10px 14px 1px rgba(0,0,0,0.14),0px 4px 18px 3px rgba(0,0,0,0.12)',
      '0px 6px 7px -4px rgba(0,0,0,0.2),0px 11px 15px 1px rgba(0,0,0,0.14),0px 4px 20px 3px rgba(0,0,0,0.12)',
      '0px 7px 8px -4px rgba(0,0,0,0.2),0px 12px 17px 2px rgba(0,0,0,0.14),0px 5px 22px 4px rgba(0,0,0,0.12)',
      '0px 7px 8px -4px rgba(0,0,0,0.2),0px 13px 19px 2px rgba(0,0,0,0.14),0px 5px 24px 4px rgba(0,0,0,0.12)',
      '0px 7px 9px -4px rgba(0,0,0,0.2),0px 14px 21px 2px rgba(0,0,0,0.14),0px 5px 26px 4px rgba(0,0,0,0.12)',
      '0px 8px 9px -5px rgba(0,0,0,0.2),0px 15px 22px 2px rgba(0,0,0,0.14),0px 6px 28px 5px rgba(0,0,0,0.12)',
      '0px 8px 10px -5px rgba(0,0,0,0.2),0px 16px 24px 2px rgba(0,0,0,0.14),0px 6px 30px 5px rgba(0,0,0,0.12)',
      '0px 8px 11px -5px rgba(0,0,0,0.2),0px 17px 26px 2px rgba(0,0,0,0.14),0px 6px 32px 5px rgba(0,0,0,0.12)',
      '0px 9px 11px -5px rgba(0,0,0,0.2),0px 18px 28px 2px rgba(0,0,0,0.14),0px 7px 34px 6px rgba(0,0,0,0.12)',
      '0px 9px 12px -6px rgba(0,0,0,0.2),0px 19px 29px 2px rgba(0,0,0,0.14),0px 7px 36px 6px rgba(0,0,0,0.12)',
      '0px 10px 13px -6px rgba(0,0,0,0.2),0px 20px 31px 3px rgba(0,0,0,0.14),0px 8px 38px 7px rgba(0,0,0,0.12)',
      '0px 10px 13px -6px rgba(0,0,0,0.2),0px 21px 33px 3px rgba(0,0,0,0.14),0px 8px 40px 7px rgba(0,0,0,0.12)',
      '0px 10px 14px -6px rgba(0,0,0,0.2),0px 22px 35px 3px rgba(0,0,0,0.14),0px 8px 42px 7px rgba(0,0,0,0.12)',
      '0px 11px 14px -7px rgba(0,0,0,0.2),0px 23px 36px 3px rgba(0,0,0,0.14),0px 9px 44px 8px rgba(0,0,0,0.12)',
      '0px 11px 15px -7px rgba(0,0,0,0.2),0px 24px 38px 3px rgba(0,0,0,0.14),0px 9px 46px 8px rgba(0,0,0,0.12)',
    ],
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
    },
  });
  }, [mode, fontSize]);

  // 记录应用启动日志
  useEffect(() => {
    console.info('[App] 应用已启动');

    // 声明清理函数变量
    let cleanup = () => {};

    // 初始化状态栏和安全区域
    const setupStatusBarAndSafeArea = async () => {
      try {
        // 先初始化安全区域服务
        await safeAreaService.initialize();
        console.log('[App] 安全区域服务初始化完成');

        // 然后初始化状态栏
        await statusBarService.initialize(mode);
        console.log('[App] 状态栏服务初始化完成');
      } catch (error) {
        console.error('[App] 状态栏或安全区域初始化失败:', error);
      }
    };

    // 调用初始化
    setupStatusBarAndSafeArea();

    // 清理旧数据并准备新系统
    const prepareDatabase = async () => {
      try {
        if (DatabaseCleanupService.needsCleanup()) {
          console.log('[App] 检测到需要清理旧数据，准备迁移到块系统');
          await DatabaseCleanupService.cleanupDatabase();
          setShowResetNotice(true);
          console.log('[App] 数据清理完成，已准备好使用块系统');
        } else {
          console.log('[App] 已迁移到块系统，无需清理');
        }
      } catch (error) {
        console.error('[App] 数据库准备失败:', error);
      }
    };

    // 执行数据库准备
    prepareDatabase();

    // 检查并修复数据库版本
    DataManager.ensureDatabaseVersion()
      .then(result => {
        if (result.success) {
          console.log(`[App] 数据库版本检查: ${result.message}`);
          if (result.oldVersion && result.newVersion) {
            console.log(`[App] 数据库版本已从 v${result.oldVersion} 更新到 v${result.newVersion}`);
          }
        } else {
          console.error(`[App] 数据库版本检查失败: ${result.message}`);
        }
      })
      .catch(error => {
        console.error('[App] 数据库版本检查出错:', error);
      });

    // 执行统一数据修复
    const repairData = async () => {
      try {
        // 先检查数据一致性
        const hasIssues = await DataRepairService.checkDataConsistency();

        if (hasIssues) {
          console.log('[App] 检测到数据一致性问题，开始统一修复...');
          // 使用新的统一修复方法
          const result = await DataRepairService.repairAllData({
            fixAssistantTopicRelations: true,
            fixDuplicateMessages: true,
            fixOrphanTopics: true,
            migrateMessages: true
          });
          console.log(`[App] 统一数据修复完成:`, result);
        } else {
          console.log('[App] 数据一致性检查通过，无需修复');
        }
      } catch (error) {
        console.error('[App] 数据修复过程发生错误:', error);
      }
    };

    // 执行数据修复
    repairData();

    // 加载话题数据并修复重复话题 - 使用标记避免重复加载
    const hasLoadedTopics = sessionStorage.getItem('_topicsLoaded');

    // 始终加载分组数据，确保每次应用启动时都会加载
    console.log('[App] 加载分组数据');
    store.dispatch(initGroups());

    if (!hasLoadedTopics) {
      // 标记已加载话题，避免重复加载
      sessionStorage.setItem('_topicsLoaded', 'true');

      console.log('[App] 初始化时加载话题数据');
      // 使用新的异步加载方法 - 加载所有话题的消息
      const loadAllTopics = async () => {
        try {
          // 从数据库获取所有话题
          const topics = await dexieStorage.getAllTopics();
          // 为每个话题加载消息
          for (const topic of topics) {
            store.dispatch(loadTopicMessagesThunk(topic.id));
          }
        } catch (error) {
          console.error('[App] 加载话题消息失败:', error);
        }
      };

      loadAllTopics();

      // 工具块状态恢复已通过修复 TopicService.ts 中的状态保持逻辑解决
      console.log('[App] 工具块状态现在会正确保持，无需额外恢复');

      // 重复话题修复已整合到统一数据修复中，这里只是记录
      console.log('[App] 重复话题修复已整合到统一数据修复流程中');
    } else {
      console.log('[App] 话题已在本次会话中加载，跳过重复加载');
    }

    // 延迟非关键初始化逻辑
    const initTimer = setTimeout(() => {
      console.log('[App] 主题:', theme);
      console.log('[App] Redux Store已初始化');
      setAppInitialized(true);

      // 性能监控定时器已禁用

      cleanup = () => {
        clearTimeout(initTimer);
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
      const cleanupListeners = async () => {
        try {
          await CapApp.removeAllListeners();
          cleanup(); // 调用清理函数
        } catch (error) {
          console.error('[App] 清理监听器失败:', error);
        }
      };

      cleanupListeners();
    };
  }, [theme, mode]); // 只依赖主题变化

  // 监听主题变化并更新状态栏
  useEffect(() => {
    const updateStatusBarTheme = async () => {
      try {
        if (statusBarService.isReady()) {
          await statusBarService.updateTheme(mode);
        }
      } catch (error) {
        console.error('[App] 状态栏主题更新失败:', error);
      }
    };

    updateStatusBarTheme();
  }, [mode]); // 只在模式变化时更新状态栏

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* 全局字体大小CSS变量 */}
      <style>
        {`
          :root {
            --global-font-size: ${fontSize}px;
            --global-font-scale: ${fontSize / 16};
          }

          /* 应用全局字体大小到常见元素 */
          body {
            font-size: var(--global-font-size) !important;
          }

          /* 聊天消息字体大小 */
          .message-content {
            font-size: var(--global-font-size) !important;
          }

          /* 代码块字体大小 */
          .code-block {
            font-size: calc(var(--global-font-size) * 0.875) !important;
          }

          /* 输入框字体大小 */
          .chat-input {
            font-size: var(--global-font-size) !important;
          }

          /* 按钮字体大小 */
          .MuiButton-root {
            font-size: calc(var(--global-font-size) * 0.875) !important;
          }

          /* 表单控件字体大小 */
          .MuiFormControl-root .MuiInputBase-input {
            font-size: var(--global-font-size) !important;
          }

          /* 菜单项字体大小 */
          .MuiMenuItem-root {
            font-size: var(--global-font-size) !important;
          }

          /* 工具提示字体大小 */
          .MuiTooltip-tooltip {
            font-size: calc(var(--global-font-size) * 0.75) !important;
          }
        `}
      </style>
      <SnackbarProvider
        maxSnack={3}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <HashRouter>
          {appInitialized ? (
            <>
              <AppInitializer />
              <AppRouter />
              <BackButtonHandler />
              <MemoizedExitConfirmDialog />
              <UpdateNoticeDialog />
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
      </SnackbarProvider>

      {/* 数据重置通知对话框 */}
      <Dialog
        open={showResetNotice}
        onClose={() => setShowResetNotice(false)}
        aria-labelledby="reset-dialog-title"
        aria-describedby="reset-dialog-description"
      >
        <DialogTitle id="reset-dialog-title">
          应用已升级
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="reset-dialog-description">
            应用已升级到全新的消息系统，提供更好的性能和用户体验。为确保兼容性，您之前的聊天记录已重置。现在您可以开始使用全新的系统了！
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResetNotice(false)} color="primary" autoFocus>
            知道了
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
};

// 主App组件 - 不再直接使用Redux，而是通过Provider包裹内部组件
function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <KnowledgeProvider>
          <AppContent />
        </KnowledgeProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;
