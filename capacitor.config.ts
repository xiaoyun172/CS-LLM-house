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
      backgroundColor: '#475569',
      style: 'DARK', // 使用正确的枚举值
      overlaysWebView: false,
      translucent: false
    },
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;
