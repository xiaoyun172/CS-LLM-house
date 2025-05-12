// React组件导入
import { Provider } from 'react-redux';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { useEffect } from 'react';
import AppRouter from './routes';
import store from './shared/store';
import { initializeLogger } from './shared/services/LoggerService';

// 创建主题
const theme = createTheme({
  palette: {
    primary: {
      main: '#9333EA', // 紫色主题
    },
    background: {
      default: '#f5f5f5',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          margin: 0,
          padding: 0,
          boxSizing: 'border-box',
        },
      },
    },
  },
});

// 初始化日志拦截器
initializeLogger();

function App() {
  // 记录应用启动日志
  useEffect(() => {
    console.info('[App] 应用已启动');
    console.log('[App] 主题:', theme);
    console.log('[App] Redux Store已初始化');
  }, []);

  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppRouter />
      </ThemeProvider>
    </Provider>
  );
}

export default App;
