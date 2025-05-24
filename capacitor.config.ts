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
      enabled: true
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
      style: 'light',
      overlaysWebView: false,
      translucent: false
    },
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;
