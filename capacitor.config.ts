import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.llmhouse.app',
  appName: 'AetherLink',
  webDir: 'dist',
  android: {
    initialFocus: true,
    captureInput: false,
    webContentsDebuggingEnabled: true
  },
  ios: {
    scheme: 'AetherLink',
    webContentsDebuggingEnabled: true,
    allowsLinkPreview: false,
    handleApplicationNotifications: false
  },
  server: {
    androidScheme: 'https',
    allowNavigation: [],
    cleartext: false
  },
  plugins: {
    CapacitorHttp: {
      enabled: false
    },
    WebView: {
      scrollEnabled: true,
      allowFileAccess: true
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    },
    StatusBar: {
      backgroundColor: '#475569', // 浅色模式默认颜色
      style: 'DARK', // 深色文字适合浅色背景
      overlaysWebView: false, // 确保背景色生效，避免内容被覆盖
      translucent: false // 不透明状态栏
    },
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;
