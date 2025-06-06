/**
 * 快捷键管理服务
 */

import type {
  ShortcutConfig,
  ShortcutManager,
  ShortcutHandler,
  KeyCombination,
  ShortcutConflict,
  ShortcutValidation,
  ShortcutAction,
  ShortcutCategory
} from '../types/shortcuts';
import { getStorageItem, setStorageItem } from '../utils/storage';

/**
 * 默认快捷键配置
 */
const DEFAULT_SHORTCUTS: ShortcutConfig[] = [
  {
    id: 'send_message',
    name: '发送消息',
    description: '发送当前输入的消息',
    combination: { key: 'Enter', ctrl: false },
    action: 'send_message',
    enabled: true,
    isDefault: true,
    category: 'chat',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'send_message_ctrl',
    name: '强制发送消息',
    description: '使用Ctrl+Enter强制发送消息',
    combination: { key: 'Enter', ctrl: true },
    action: 'send_message',
    enabled: true,
    isDefault: true,
    category: 'chat',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'new_topic',
    name: '新建话题',
    description: '创建新的聊天话题',
    combination: { key: 'n', alt: true },
    action: 'new_topic',
    enabled: true,
    isDefault: true,
    category: 'navigation',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'clear_input',
    name: '清空输入',
    description: '清空当前输入框内容',
    combination: { key: 'Escape' },
    action: 'clear_input',
    enabled: true,
    isDefault: true,
    category: 'editing',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'toggle_sidebar',
    name: '切换侧边栏',
    description: '显示或隐藏侧边栏',
    combination: { key: 's', alt: true },
    action: 'toggle_sidebar',
    enabled: true,
    isDefault: true,
    category: 'navigation',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'open_settings',
    name: '打开设置',
    description: '打开应用设置页面',
    combination: { key: ',', alt: true },
    action: 'open_settings',
    enabled: true,
    isDefault: true,
    category: 'navigation',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'regenerate_response',
    name: '重新生成',
    description: '重新生成最后一条AI回复',
    combination: { key: 'r', alt: true },
    action: 'regenerate_response',
    enabled: true,
    isDefault: true,
    category: 'chat',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'stop_generation',
    name: '停止生成',
    description: '停止当前AI回复生成',
    combination: { key: 'Escape', ctrl: true },
    action: 'stop_generation',
    enabled: true,
    isDefault: true,
    category: 'chat',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

/**
 * 常见浏览器快捷键黑名单
 */
const BROWSER_SHORTCUT_BLACKLIST: KeyCombination[] = [
  // Chrome/Edge 常见快捷键
  { key: 'n', ctrl: true },      // 新建窗口
  { key: 't', ctrl: true },      // 新建标签页
  { key: 'w', ctrl: true },      // 关闭标签页
  { key: 'r', ctrl: true },      // 刷新页面
  { key: 'f', ctrl: true },      // 查找
  { key: 'h', ctrl: true },      // 历史记录
  { key: 'j', ctrl: true },      // 下载页面
  { key: 'k', ctrl: true },      // 地址栏搜索
  { key: 'l', ctrl: true },      // 地址栏焦点
  { key: 'o', ctrl: true },      // 打开文件
  { key: 'p', ctrl: true },      // 打印
  { key: 's', ctrl: true },      // 保存页面
  { key: 'u', ctrl: true },      // 查看源代码
  { key: 'b', ctrl: true },      // 书签栏
  { key: 'd', ctrl: true },      // 书签当前页
  { key: 'e', ctrl: true },      // 搜索栏
  { key: 'g', ctrl: true },      // 查找下一个
  { key: 'i', ctrl: true },      // 开发者工具
  { key: 'z', ctrl: true },      // 撤销
  { key: 'y', ctrl: true },      // 重做
  { key: 'a', ctrl: true },      // 全选
  { key: 'c', ctrl: true },      // 复制
  { key: 'v', ctrl: true },      // 粘贴
  { key: 'x', ctrl: true },      // 剪切
  { key: '+', ctrl: true },      // 放大
  { key: '-', ctrl: true },      // 缩小
  { key: '0', ctrl: true },      // 重置缩放
  { key: 'F5' },                 // 刷新
  { key: 'F12' },                // 开发者工具
  // Alt组合键（较少冲突但仍需注意）
  { key: 'F4', alt: true },      // 关闭窗口
  { key: 'Tab', alt: true },     // 切换窗口
  { key: 'Left', alt: true },    // 后退
  { key: 'Right', alt: true },   // 前进
];

/**
 * 快捷键服务类
 */
class ShortcutsService implements ShortcutManager {
  private shortcuts: ShortcutConfig[] = [];
  private handlers: Map<string, ShortcutHandler> = new Map();
  private isListening = false;
  private storageKey = 'shortcuts_config';

  constructor() {
    this.loadShortcuts();
    this.startListening();
  }

  /**
   * 加载快捷键配置
   */
  private async loadShortcuts(): Promise<void> {
    try {
      const stored = await getStorageItem(this.storageKey);
      if (stored && typeof stored === 'string') {
        this.shortcuts = JSON.parse(stored);
      } else {
        // 首次使用，加载默认配置
        this.shortcuts = [...DEFAULT_SHORTCUTS];
        await this.saveShortcuts();
      }
    } catch (error) {
      console.error('[ShortcutsService] 加载快捷键配置失败:', error);
      this.shortcuts = [...DEFAULT_SHORTCUTS];
    }
  }

  /**
   * 保存快捷键配置
   */
  private async saveShortcuts(): Promise<void> {
    try {
      await setStorageItem(this.storageKey, JSON.stringify(this.shortcuts));
    } catch (error) {
      console.error('[ShortcutsService] 保存快捷键配置失败:', error);
    }
  }

  /**
   * 开始监听键盘事件
   */
  private startListening(): void {
    if (this.isListening) return;

    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.isListening = true;
  }

  /**
   * 停止监听键盘事件
   */
  private stopListening(): void {
    if (!this.isListening) return;

    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    this.isListening = false;
  }

  /**
   * 处理键盘事件
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // 检查是否在输入框中，某些快捷键需要特殊处理
    const target = event.target as HTMLElement;
    const isInputElement = target.tagName === 'INPUT' ||
                          target.tagName === 'TEXTAREA' ||
                          target.contentEditable === 'true';

    // 查找匹配的快捷键
    const matchedShortcut = this.shortcuts.find(shortcut => {
      if (!shortcut.enabled) return false;

      const combo = shortcut.combination;
      return combo.key.toLowerCase() === event.key.toLowerCase() &&
             !!combo.ctrl === event.ctrlKey &&
             !!combo.alt === event.altKey &&
             !!combo.shift === event.shiftKey &&
             !!combo.meta === event.metaKey;
    });

    if (matchedShortcut) {
      // 某些快捷键在输入框中不应该触发
      if (isInputElement && this.shouldPreventInInput(matchedShortcut.action)) {
        return;
      }

      const handler = this.handlers.get(matchedShortcut.id);
      if (handler) {
        event.preventDefault();
        event.stopPropagation();
        handler(event);
      }
    }
  }

  /**
   * 判断快捷键是否应该在输入框中被阻止
   */
  private shouldPreventInInput(action: ShortcutAction): boolean {
    const preventInInput: ShortcutAction[] = [
      'new_topic',
      'toggle_sidebar',
      'open_settings',
      'regenerate_response',
      'switch_model',
      'toggle_web_search',
      'toggle_image_mode',
      'open_devtools',
      'export_chat',
      'import_file'
    ];

    return preventInInput.includes(action);
  }

  /**
   * 注册快捷键
   */
  register(config: ShortcutConfig, handler: ShortcutHandler): void {
    this.handlers.set(config.id, handler);

    // 如果快捷键不存在，添加到配置中
    const existingIndex = this.shortcuts.findIndex(s => s.id === config.id);
    if (existingIndex === -1) {
      this.shortcuts.push(config);
      this.saveShortcuts();
    }
  }

  /**
   * 注销快捷键
   */
  unregister(id: string): void {
    this.handlers.delete(id);
  }

  /**
   * 启用/禁用快捷键
   */
  toggle(id: string, enabled: boolean): void {
    const shortcut = this.shortcuts.find(s => s.id === id);
    if (shortcut) {
      shortcut.enabled = enabled;
      shortcut.updatedAt = new Date().toISOString();
      this.saveShortcuts();
    }
  }

  /**
   * 检查快捷键冲突
   */
  checkConflicts(combination: KeyCombination, excludeId?: string): ShortcutConflict[] {
    const conflicts: ShortcutConflict[] = [];

    for (const shortcut of this.shortcuts) {
      if (excludeId && shortcut.id === excludeId) continue;
      if (!shortcut.enabled) continue;

      const combo = shortcut.combination;
      if (combo.key.toLowerCase() === combination.key.toLowerCase() &&
          !!combo.ctrl === !!combination.ctrl &&
          !!combo.alt === !!combination.alt &&
          !!combo.shift === !!combination.shift &&
          !!combo.meta === !!combination.meta) {
        conflicts.push({
          conflictingId: shortcut.id,
          conflictingName: shortcut.name,
          combination: combo
        });
      }
    }

    return conflicts;
  }

  /**
   * 检查是否与浏览器快捷键冲突
   */
  checkBrowserConflicts(combination: KeyCombination): { hasConflict: boolean; description?: string } {
    for (const browserShortcut of BROWSER_SHORTCUT_BLACKLIST) {
      if (browserShortcut.key.toLowerCase() === combination.key.toLowerCase() &&
          !!browserShortcut.ctrl === !!combination.ctrl &&
          !!browserShortcut.alt === !!combination.alt &&
          !!browserShortcut.shift === !!combination.shift &&
          !!browserShortcut.meta === !!combination.meta) {
        
        // 生成冲突描述
        let description = '与浏览器快捷键冲突: ';
        const parts: string[] = [];
        if (combination.ctrl) parts.push('Ctrl');
        if (combination.alt) parts.push('Alt');
        if (combination.shift) parts.push('Shift');
        if (combination.meta) parts.push('Cmd');
        parts.push(combination.key);
        description += parts.join(' + ');
        
        return { hasConflict: true, description };
      }
    }
    
    return { hasConflict: false };
  }

  /**
   * 验证快捷键
   */
  validate(config: Partial<ShortcutConfig>): ShortcutValidation {
    if (!config.combination) {
      return { isValid: false, error: '快捷键组合不能为空' };
    }

    if (!config.combination.key) {
      return { isValid: false, error: '必须指定按键' };
    }

    // 检查与其他快捷键的冲突
    const conflicts = this.checkConflicts(config.combination, config.id);
    if (conflicts.length > 0) {
      return {
        isValid: false,
        error: '快捷键冲突',
        conflicts
      };
    }

    // 检查与浏览器快捷键的冲突
    const browserConflict = this.checkBrowserConflicts(config.combination);
    if (browserConflict.hasConflict) {
      return {
        isValid: false,
        error: browserConflict.description || '与浏览器快捷键冲突',
        isBrowserConflict: true
      } as ShortcutValidation;
    }

    return { isValid: true };
  }

  /**
   * 重置为默认设置
   */
  resetToDefaults(): void {
    this.shortcuts = [...DEFAULT_SHORTCUTS];
    this.saveShortcuts();
  }

  /**
   * 导出配置
   */
  exportConfig(): string {
    return JSON.stringify({
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      shortcuts: this.shortcuts
    }, null, 2);
  }

  /**
   * 导入配置
   */
  async importConfig(config: string): Promise<void> {
    try {
      const data = JSON.parse(config);
      if (data.shortcuts && Array.isArray(data.shortcuts)) {
        this.shortcuts = data.shortcuts;
        await this.saveShortcuts();
      } else {
        throw new Error('无效的配置格式');
      }
    } catch (error) {
      throw new Error(`导入配置失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取所有快捷键
   */
  getShortcuts(): ShortcutConfig[] {
    return [...this.shortcuts];
  }

  /**
   * 根据分类获取快捷键
   */
  getShortcutsByCategory(category: ShortcutCategory): ShortcutConfig[] {
    return this.shortcuts.filter(s => s.category === category);
  }

  /**
   * 更新快捷键
   */
  async updateShortcut(id: string, updates: Partial<ShortcutConfig>): Promise<void> {
    const index = this.shortcuts.findIndex(s => s.id === id);
    if (index !== -1) {
      this.shortcuts[index] = {
        ...this.shortcuts[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      await this.saveShortcuts();
    }
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    this.stopListening();
    this.handlers.clear();
  }
}

// 创建单例实例
export const shortcutsService = new ShortcutsService();
export default shortcutsService;
