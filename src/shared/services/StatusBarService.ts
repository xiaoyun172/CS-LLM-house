import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

/**
 * 状态栏管理服务
 * 提供统一的状态栏样式管理
 */
export class StatusBarService {
  private static instance: StatusBarService;
  private currentTheme: 'light' | 'dark' = 'light';
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): StatusBarService {
    if (!StatusBarService.instance) {
      StatusBarService.instance = new StatusBarService();
    }
    return StatusBarService.instance;
  }

  /**
   * 初始化状态栏
   * @param theme 当前主题
   */
  public async initialize(theme: 'light' | 'dark'): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('[StatusBarService] Web平台，跳过状态栏初始化');
      return;
    }

    try {
      this.currentTheme = theme;
      
      // 设置状态栏不覆盖WebView
      await StatusBar.setOverlaysWebView({ overlay: false });
      
      // 根据主题设置样式
      await this.updateTheme(theme);
      
      this.isInitialized = true;
      console.log(`[StatusBarService] 状态栏初始化完成 - 主题: ${theme}`);
    } catch (error) {
      console.error('[StatusBarService] 状态栏初始化失败:', error);
      throw error;
    }
  }

  /**
   * 更新主题
   * @param theme 新主题
   */
  public async updateTheme(theme: 'light' | 'dark'): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      this.currentTheme = theme;

      if (theme === 'dark') {
        // 深色模式：深色背景 + 浅色文字
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#1a1a1a' });
      } else {
        // 浅色模式：浅色背景 + 深色文字  
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#475569' });
      }

      console.log(`[StatusBarService] 主题已更新: ${theme}`);
    } catch (error) {
      console.error('[StatusBarService] 主题更新失败:', error);
      throw error;
    }
  }

  /**
   * 显示状态栏
   */
  public async show(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      await StatusBar.show();
      console.log('[StatusBarService] 状态栏已显示');
    } catch (error) {
      console.error('[StatusBarService] 显示状态栏失败:', error);
      throw error;
    }
  }

  /**
   * 隐藏状态栏
   */
  public async hide(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      await StatusBar.hide();
      console.log('[StatusBarService] 状态栏已隐藏');
    } catch (error) {
      console.error('[StatusBarService] 隐藏状态栏失败:', error);
      throw error;
    }
  }

  /**
   * 获取状态栏信息
   */
  public async getInfo() {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    try {
      const info = await StatusBar.getInfo();
      console.log('[StatusBarService] 状态栏信息:', info);
      return info;
    } catch (error) {
      console.error('[StatusBarService] 获取状态栏信息失败:', error);
      throw error;
    }
  }

  /**
   * 设置状态栏是否覆盖WebView
   * @param overlay 是否覆盖
   */
  public async setOverlaysWebView(overlay: boolean): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      await StatusBar.setOverlaysWebView({ overlay });
      console.log(`[StatusBarService] 状态栏覆盖设置: ${overlay}`);
    } catch (error) {
      console.error('[StatusBarService] 设置状态栏覆盖失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前主题
   */
  public getCurrentTheme(): 'light' | 'dark' {
    return this.currentTheme;
  }

  /**
   * 检查是否已初始化
   */
  public isReady(): boolean {
    return this.isInitialized;
  }
}

// 导出单例实例
export const statusBarService = StatusBarService.getInstance();
