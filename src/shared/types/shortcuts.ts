/**
 * 快捷键相关类型定义
 */

/**
 * 快捷键组合
 */
export interface KeyCombination {
  /** 主键 */
  key: string;
  /** 是否需要Ctrl键 */
  ctrl?: boolean;
  /** 是否需要Alt键 */
  alt?: boolean;
  /** 是否需要Shift键 */
  shift?: boolean;
  /** 是否需要Meta键(Cmd/Win) */
  meta?: boolean;
}

/**
 * 快捷键动作类型
 */
export type ShortcutAction = 
  | 'send_message'           // 发送消息
  | 'new_topic'             // 新建话题
  | 'clear_input'           // 清空输入
  | 'focus_input'           // 聚焦输入框
  | 'toggle_sidebar'        // 切换侧边栏
  | 'open_settings'         // 打开设置
  | 'copy_last_response'    // 复制最后回复
  | 'regenerate_response'   // 重新生成回复
  | 'switch_model'          // 切换模型
  | 'toggle_web_search'     // 切换网络搜索
  | 'toggle_image_mode'     // 切换图像模式
  | 'open_devtools'         // 打开开发者工具
  | 'export_chat'           // 导出聊天记录
  | 'import_file'           // 导入文件
  | 'voice_input'           // 语音输入
  | 'stop_generation';      // 停止生成

/**
 * 快捷键配置项
 */
export interface ShortcutConfig {
  /** 唯一标识符 */
  id: string;
  /** 快捷键名称 */
  name: string;
  /** 快捷键描述 */
  description: string;
  /** 快捷键组合 */
  combination: KeyCombination;
  /** 对应的动作 */
  action: ShortcutAction;
  /** 是否启用 */
  enabled: boolean;
  /** 是否为系统默认 */
  isDefault: boolean;
  /** 分类 */
  category: ShortcutCategory;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 快捷键分类
 */
export type ShortcutCategory = 
  | 'chat'        // 聊天相关
  | 'navigation'  // 导航相关
  | 'editing'     // 编辑相关
  | 'tools'       // 工具相关
  | 'system';     // 系统相关

/**
 * 快捷键设置状态
 */
export interface ShortcutsState {
  /** 快捷键配置列表 */
  shortcuts: ShortcutConfig[];
  /** 是否启用快捷键功能 */
  enabled: boolean;
  /** 是否显示快捷键提示 */
  showHints: boolean;
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
}

/**
 * 快捷键冲突检测结果
 */
export interface ShortcutConflict {
  /** 冲突的快捷键ID */
  conflictingId: string;
  /** 冲突的快捷键名称 */
  conflictingName: string;
  /** 冲突的组合键 */
  combination: KeyCombination;
}

/**
 * 快捷键验证结果
 */
export interface ShortcutValidation {
  /** 是否有效 */
  isValid: boolean;
  /** 错误信息 */
  error?: string;
  /** 冲突信息 */
  conflicts?: ShortcutConflict[];
}

/**
 * 快捷键事件处理器
 */
export type ShortcutHandler = (event: KeyboardEvent) => void | Promise<void>;

/**
 * 快捷键管理器接口
 */
export interface ShortcutManager {
  /** 注册快捷键 */
  register(config: ShortcutConfig, handler: ShortcutHandler): void;
  /** 注销快捷键 */
  unregister(id: string): void;
  /** 启用/禁用快捷键 */
  toggle(id: string, enabled: boolean): void;
  /** 检查快捷键冲突 */
  checkConflicts(combination: KeyCombination, excludeId?: string): ShortcutConflict[];
  /** 验证快捷键 */
  validate(config: Partial<ShortcutConfig>): ShortcutValidation;
  /** 重置为默认设置 */
  resetToDefaults(): void;
  /** 导出配置 */
  exportConfig(): string;
  /** 导入配置 */
  importConfig(config: string): Promise<void>;
}
