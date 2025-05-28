// 为Capacitor扩展Window接口类型声明
declare global {
  interface Window {
    Capacitor?: {
      platform: string;
      isNative?: boolean;
      isPluginAvailable?: (name: string) => boolean;
    };
  }
}

export {}; 