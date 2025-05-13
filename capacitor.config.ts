import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.llmhouse.app',
  appName: 'LLM小屋',
  webDir: 'dist',
  android: {
    initialFocus: true,
    captureInput: false,
    webContentsDebuggingEnabled: true
  },
  server: {
    androidScheme: 'https',
    allowNavigation: [],
    cleartext: false
  },
  plugins: {
    WebView: {
      scrollEnabled: true,
      allowFileAccess: true
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    }
  }
};

export default config;
