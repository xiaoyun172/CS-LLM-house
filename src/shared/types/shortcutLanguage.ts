/**
 * 快捷短语相关类型定义
 */

/**
 * 快捷短语模板
 */
export interface ShortcutPhrase {
  /** 唯一标识符 */
  id: string;
  /** 短语名称 */
  name: string;
  /** 短语内容 */
  content: string;
  /** 短语描述 */
  description?: string;
  /** 快捷键触发 */
  trigger?: string;
  /** 分类ID */
  categoryId: string;
  /** 标签 */
  tags: string[];
  /** 使用次数 */
  usageCount: number;
  /** 是否为收藏 */
  isFavorite: boolean;
  /** 是否为系统预设 */
  isDefault: boolean;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
  /** 最后使用时间 */
  lastUsedAt?: string;
}

/**
 * 短语分类
 */
export interface PhraseCategory {
  /** 分类ID */
  id: string;
  /** 分类名称 */
  name: string;
  /** 分类描述 */
  description?: string;
  /** 分类图标 */
  icon?: string;
  /** 分类颜色 */
  color?: string;
  /** 排序权重 */
  order: number;
  /** 是否为系统预设 */
  isDefault: boolean;
  /** 创建时间 */
  createdAt: string;
}

/**
 * 快捷短语状态
 */
export interface ShortcutLanguageState {
  /** 短语列表 */
  phrases: ShortcutPhrase[];
  /** 分类列表 */
  categories: PhraseCategory[];
  /** 当前选中的分类ID */
  selectedCategoryId: string | null;
  /** 搜索关键词 */
  searchKeyword: string;
  /** 排序方式 */
  sortBy: PhraseSortBy;
  /** 排序方向 */
  sortOrder: 'asc' | 'desc';
  /** 是否显示收藏 */
  showFavorites: boolean;
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
}

/**
 * 短语排序方式
 */
export type PhraseSortBy = 
  | 'name'        // 按名称排序
  | 'createdAt'   // 按创建时间排序
  | 'updatedAt'   // 按更新时间排序
  | 'usageCount'  // 按使用次数排序
  | 'lastUsedAt'; // 按最后使用时间排序

/**
 * 短语搜索过滤器
 */
export interface PhraseFilter {
  /** 关键词 */
  keyword?: string;
  /** 分类ID */
  categoryId?: string;
  /** 标签 */
  tags?: string[];
  /** 是否只显示收藏 */
  favoritesOnly?: boolean;
  /** 排序方式 */
  sortBy?: PhraseSortBy;
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 短语导入/导出格式
 */
export interface PhraseExportData {
  /** 版本号 */
  version: string;
  /** 导出时间 */
  exportedAt: string;
  /** 分类数据 */
  categories: PhraseCategory[];
  /** 短语数据 */
  phrases: ShortcutPhrase[];
  /** 元数据 */
  metadata: {
    totalPhrases: number;
    totalCategories: number;
    appVersion: string;
  };
}

/**
 * 短语使用统计
 */
export interface PhraseUsageStats {
  /** 总使用次数 */
  totalUsage: number;
  /** 最常用的短语 */
  mostUsedPhrases: Array<{
    phrase: ShortcutPhrase;
    usageCount: number;
  }>;
  /** 最近使用的短语 */
  recentlyUsedPhrases: Array<{
    phrase: ShortcutPhrase;
    lastUsedAt: string;
  }>;
  /** 按分类统计 */
  categoryStats: Array<{
    category: PhraseCategory;
    phraseCount: number;
    totalUsage: number;
  }>;
}

/**
 * 短语插入选项
 */
export interface PhraseInsertOptions {
  /** 插入位置 */
  position?: 'cursor' | 'start' | 'end' | 'replace';
  /** 是否添加换行 */
  addNewline?: boolean;
  /** 是否自动发送 */
  autoSend?: boolean;
  /** 插入后是否聚焦输入框 */
  focusAfterInsert?: boolean;
}

/**
 * 短语变量替换
 */
export interface PhraseVariable {
  /** 变量名 */
  name: string;
  /** 变量描述 */
  description: string;
  /** 默认值 */
  defaultValue?: string;
  /** 变量类型 */
  type: 'text' | 'date' | 'time' | 'datetime' | 'user' | 'model';
}

/**
 * 带变量的短语模板
 */
export interface VariablePhrase extends ShortcutPhrase {
  /** 包含的变量 */
  variables: PhraseVariable[];
  /** 是否需要用户输入 */
  requiresInput: boolean;
}

/**
 * 短语管理器接口
 */
export interface PhraseManager {
  /** 获取所有短语 */
  getAllPhrases(): ShortcutPhrase[];
  /** 根据过滤器获取短语 */
  getFilteredPhrases(filter: PhraseFilter): ShortcutPhrase[];
  /** 搜索短语 */
  searchPhrases(keyword: string): ShortcutPhrase[];
  /** 创建短语 */
  createPhrase(phrase: Omit<ShortcutPhrase, 'id' | 'createdAt' | 'updatedAt'>): Promise<ShortcutPhrase>;
  /** 更新短语 */
  updatePhrase(id: string, updates: Partial<ShortcutPhrase>): Promise<ShortcutPhrase>;
  /** 删除短语 */
  deletePhrase(id: string): Promise<void>;
  /** 使用短语 */
  usePhrase(id: string, options?: PhraseInsertOptions): Promise<void>;
  /** 导出短语 */
  exportPhrases(): Promise<PhraseExportData>;
  /** 导入短语 */
  importPhrases(data: PhraseExportData): Promise<void>;
  /** 获取使用统计 */
  getUsageStats(): PhraseUsageStats;
}
