/**
 * 安全区域管理服务
 * 处理 Android 15 底部导航栏重叠问题和各平台的安全区域
 */
import { SafeArea } from '@capacitor-community/safe-area';
import { Capacitor } from '@capacitor/core';

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * 安全区域管理服务类
 */
export class SafeAreaService {
  private static instance: SafeAreaService;
  private currentInsets: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  private isInitialized = false;
  private listeners: Array<(insets: SafeAreaInsets) => void> = [];

  private constructor() {}

  public static getInstance(): SafeAreaService {
    if (!SafeAreaService.instance) {
      SafeAreaService.instance = new SafeAreaService();
    }
    return SafeAreaService.instance;
  }

  /**
   * 初始化安全区域服务
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      if (Capacitor.isNativePlatform()) {
        // 原生平台：使用 Safe Area 插件
        await this.initializeNativeSafeArea();
      } else {
        // Web 平台：使用 CSS env() 变量
        this.initializeWebSafeArea();
      }

      // 应用安全区域到 CSS 变量
      this.applySafeAreaToCSS();
      
      this.isInitialized = true;
      console.log('[SafeAreaService] 安全区域服务初始化完成', this.currentInsets);
    } catch (error) {
      console.error('[SafeAreaService] 安全区域服务初始化失败:', error);
      // 使用默认值
      this.setFallbackInsets();
      this.applySafeAreaToCSS();
    }
  }

  /**
   * 初始化原生平台安全区域
   */
  private async initializeNativeSafeArea(): Promise<void> {
    try {
      // 获取安全区域信息
      const safeAreaData = await SafeArea.getSafeAreaInsets();
      
      this.currentInsets = {
        top: safeAreaData.insets.top,
        right: safeAreaData.insets.right,
        bottom: safeAreaData.insets.bottom,
        left: safeAreaData.insets.left
      };

      console.log('[SafeAreaService] 原生安全区域获取成功:', this.currentInsets);

      // 监听安全区域变化（如屏幕旋转）
      SafeArea.addListener('safeAreaChanged', (data) => {
        this.currentInsets = {
          top: data.insets.top,
          right: data.insets.right,
          bottom: data.insets.bottom,
          left: data.insets.left
        };
        
        console.log('[SafeAreaService] 安全区域已更新:', this.currentInsets);
        this.applySafeAreaToCSS();
        this.notifyListeners();
      });

    } catch (error) {
      console.error('[SafeAreaService] 原生安全区域获取失败:', error);
      throw error;
    }
  }

  /**
   * 初始化 Web 平台安全区域
   */
  private initializeWebSafeArea(): void {
    // 在 Web 平台，尝试从 CSS env() 变量获取安全区域
    const testElement = document.createElement('div');
    testElement.style.position = 'fixed';
    testElement.style.top = 'env(safe-area-inset-top, 0px)';
    testElement.style.right = 'env(safe-area-inset-right, 0px)';
    testElement.style.bottom = 'env(safe-area-inset-bottom, 0px)';
    testElement.style.left = 'env(safe-area-inset-left, 0px)';
    testElement.style.visibility = 'hidden';
    testElement.style.pointerEvents = 'none';
    
    document.body.appendChild(testElement);
    
    const computedStyle = window.getComputedStyle(testElement);
    
    this.currentInsets = {
      top: this.parsePxValue(computedStyle.top),
      right: this.parsePxValue(computedStyle.right),
      bottom: this.parsePxValue(computedStyle.bottom),
      left: this.parsePxValue(computedStyle.left)
    };
    
    document.body.removeChild(testElement);
    
    console.log('[SafeAreaService] Web 安全区域获取成功:', this.currentInsets);
  }

  /**
   * 设置回退安全区域值
   */
  private setFallbackInsets(): void {
    // 根据平台设置默认值
    if (Capacitor.getPlatform() === 'android') {
      // Android 默认值，特别考虑 Android 15
      this.currentInsets = { top: 24, right: 0, bottom: 48, left: 0 };
    } else if (Capacitor.getPlatform() === 'ios') {
      // iOS 默认值，考虑刘海屏
      this.currentInsets = { top: 44, right: 0, bottom: 34, left: 0 };
    } else {
      // Web 默认值
      this.currentInsets = { top: 0, right: 0, bottom: 0, left: 0 };
    }
    
    console.log('[SafeAreaService] 使用回退安全区域值:', this.currentInsets);
  }

  /**
   * 应用安全区域到 CSS 变量
   */
  private applySafeAreaToCSS(): void {
    const root = document.documentElement;
    
    // 设置基础安全区域变量
    root.style.setProperty('--safe-area-inset-top', `${this.currentInsets.top}px`);
    root.style.setProperty('--safe-area-inset-right', `${this.currentInsets.right}px`);
    root.style.setProperty('--safe-area-inset-bottom', `${this.currentInsets.bottom}px`);
    root.style.setProperty('--safe-area-inset-left', `${this.currentInsets.left}px`);
    
    // 设置常用的组合变量
    root.style.setProperty('--safe-area-top', `${this.currentInsets.top}px`);
    root.style.setProperty('--safe-area-bottom', `${this.currentInsets.bottom}px`);
    
    // 特别为 Android 15 底部导航栏设置变量
    if (Capacitor.getPlatform() === 'android' && this.currentInsets.bottom > 0) {
      root.style.setProperty('--android-nav-bar-height', `${this.currentInsets.bottom}px`);
      root.style.setProperty('--chat-input-bottom-padding', `${this.currentInsets.bottom + 8}px`);
    } else {
      root.style.setProperty('--android-nav-bar-height', '0px');
      root.style.setProperty('--chat-input-bottom-padding', '8px');
    }
    
    // 为聊天界面设置专用变量
    root.style.setProperty('--chat-container-padding-top', `${this.currentInsets.top}px`);
    root.style.setProperty('--chat-container-padding-bottom', `${this.currentInsets.bottom}px`);
    
    console.log('[SafeAreaService] CSS 变量已更新');
  }

  /**
   * 解析像素值
   */
  private parsePxValue(value: string): number {
    const match = value.match(/^(\d+(?:\.\d+)?)px$/);
    return match ? parseFloat(match[1]) : 0;
  }

  /**
   * 获取当前安全区域
   */
  public getCurrentInsets(): SafeAreaInsets {
    return { ...this.currentInsets };
  }

  /**
   * 添加安全区域变化监听器
   */
  public addListener(callback: (insets: SafeAreaInsets) => void): () => void {
    this.listeners.push(callback);
    
    // 返回移除监听器的函数
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.currentInsets);
      } catch (error) {
        console.error('[SafeAreaService] 监听器回调失败:', error);
      }
    });
  }

  /**
   * 检查是否已初始化
   */
  public isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * 获取特定区域的安全距离
   */
  public getInset(side: 'top' | 'right' | 'bottom' | 'left'): number {
    return this.currentInsets[side];
  }

  /**
   * 检查是否有底部安全区域（用于判断是否有底部导航栏）
   */
  public hasBottomInset(): boolean {
    return this.currentInsets.bottom > 0;
  }

  /**
   * 获取聊天输入框应该使用的底部边距
   */
  public getChatInputBottomPadding(): number {
    return this.currentInsets.bottom > 0 ? this.currentInsets.bottom + 8 : 8;
  }
}

// 导出单例实例
export const safeAreaService = SafeAreaService.getInstance();
