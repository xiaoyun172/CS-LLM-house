/**
 * 快捷短语管理服务
 */

import type {
  ShortcutPhrase,
  PhraseCategory,
  PhraseManager,
  PhraseFilter,
  PhraseExportData,
  PhraseUsageStats,
  PhraseInsertOptions
} from '../types/shortcutLanguage';
import { getStorageItem, setStorageItem } from '../utils/storage';

/**
 * 默认分类
 */
const DEFAULT_CATEGORIES: PhraseCategory[] = [
  {
    id: 'greetings',
    name: '问候语',
    description: '常用的问候和打招呼短语',
    icon: '👋',
    color: '#4CAF50',
    order: 1,
    isDefault: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'responses',
    name: '常用回复',
    description: '日常对话中的常用回复',
    icon: '💬',
    color: '#2196F3',
    order: 2,
    isDefault: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'questions',
    name: '常用问题',
    description: '经常询问的问题模板',
    icon: '❓',
    color: '#FF9800',
    order: 3,
    isDefault: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'instructions',
    name: '指令模板',
    description: 'AI助手的常用指令模板',
    icon: '📝',
    color: '#9C27B0',
    order: 4,
    isDefault: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'professional',
    name: '专业用语',
    description: '工作和专业场合使用的短语',
    icon: '💼',
    color: '#607D8B',
    order: 5,
    isDefault: true,
    createdAt: new Date().toISOString()
  }
];

/**
 * 默认短语
 */
const DEFAULT_PHRASES: ShortcutPhrase[] = [
  {
    id: 'hello',
    name: '你好',
    content: '你好！很高兴与你交流。',
    description: '基本问候语',
    categoryId: 'greetings',
    tags: ['问候', '礼貌'],
    usageCount: 0,
    isFavorite: false,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'thanks',
    name: '感谢',
    content: '谢谢你的帮助！',
    description: '表达感谢',
    categoryId: 'responses',
    tags: ['感谢', '礼貌'],
    usageCount: 0,
    isFavorite: false,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'explain',
    name: '请解释',
    content: '请详细解释一下这个概念，包括它的定义、特点和应用场景。',
    description: '请求详细解释',
    categoryId: 'questions',
    tags: ['解释', '学习'],
    usageCount: 0,
    isFavorite: false,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'summarize',
    name: '总结要点',
    content: '请帮我总结以下内容的主要要点：',
    description: '请求总结内容',
    categoryId: 'instructions',
    tags: ['总结', '分析'],
    usageCount: 0,
    isFavorite: false,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'translate',
    name: '翻译请求',
    content: '请将以下内容翻译成中文：',
    description: '翻译请求模板',
    categoryId: 'instructions',
    tags: ['翻译', '语言'],
    usageCount: 0,
    isFavorite: false,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'code_review',
    name: '代码审查',
    content: '请帮我审查以下代码，指出可能的问题和改进建议：',
    description: '代码审查请求',
    categoryId: 'professional',
    tags: ['编程', '代码审查'],
    usageCount: 0,
    isFavorite: false,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

/**
 * 快捷短语服务类
 */
class ShortcutLanguageService implements PhraseManager {
  private phrases: ShortcutPhrase[] = [];
  private categories: PhraseCategory[] = [];
  private phrasesStorageKey = 'shortcut_phrases';
  private categoriesStorageKey = 'phrase_categories';

  constructor() {
    this.loadData();
  }

  /**
   * 加载数据
   */
  private async loadData(): Promise<void> {
    try {
      // 加载分类
      const storedCategories = await getStorageItem(this.categoriesStorageKey);
      if (storedCategories && typeof storedCategories === 'string') {
        this.categories = JSON.parse(storedCategories);
      } else {
        this.categories = [...DEFAULT_CATEGORIES];
        await this.saveCategories();
      }

      // 加载短语
      const storedPhrases = await getStorageItem(this.phrasesStorageKey);
      if (storedPhrases && typeof storedPhrases === 'string') {
        this.phrases = JSON.parse(storedPhrases);
      } else {
        this.phrases = [...DEFAULT_PHRASES];
        await this.savePhrases();
      }
    } catch (error) {
      console.error('[ShortcutLanguageService] 加载数据失败:', error);
      this.categories = [...DEFAULT_CATEGORIES];
      this.phrases = [...DEFAULT_PHRASES];
    }
  }

  /**
   * 保存短语数据
   */
  private async savePhrases(): Promise<void> {
    try {
      await setStorageItem(this.phrasesStorageKey, JSON.stringify(this.phrases));
    } catch (error) {
      console.error('[ShortcutLanguageService] 保存短语失败:', error);
    }
  }

  /**
   * 保存分类数据
   */
  private async saveCategories(): Promise<void> {
    try {
      await setStorageItem(this.categoriesStorageKey, JSON.stringify(this.categories));
    } catch (error) {
      console.error('[ShortcutLanguageService] 保存分类失败:', error);
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `phrase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取所有短语
   */
  getAllPhrases(): ShortcutPhrase[] {
    return [...this.phrases];
  }

  /**
   * 获取所有分类
   */
  getAllCategories(): PhraseCategory[] {
    return [...this.categories];
  }

  /**
   * 根据过滤器获取短语
   */
  getFilteredPhrases(filter: PhraseFilter): ShortcutPhrase[] {
    let filtered = [...this.phrases];

    // 按关键词过滤
    if (filter.keyword) {
      const keyword = filter.keyword.toLowerCase();
      filtered = filtered.filter(phrase =>
        phrase.name.toLowerCase().includes(keyword) ||
        phrase.content.toLowerCase().includes(keyword) ||
        phrase.tags.some(tag => tag.toLowerCase().includes(keyword))
      );
    }

    // 按分类过滤
    if (filter.categoryId) {
      filtered = filtered.filter(phrase => phrase.categoryId === filter.categoryId);
    }

    // 按标签过滤
    if (filter.tags && filter.tags.length > 0) {
      filtered = filtered.filter(phrase =>
        filter.tags!.some(tag => phrase.tags.includes(tag))
      );
    }

    // 只显示收藏
    if (filter.favoritesOnly) {
      filtered = filtered.filter(phrase => phrase.isFavorite);
    }

    // 排序
    const sortBy = filter.sortBy || 'name';
    const sortOrder = filter.sortOrder || 'asc';

    filtered.sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];

      if (sortBy === 'lastUsedAt') {
        aValue = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
        bValue = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
      } else if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    return filtered;
  }

  /**
   * 搜索短语
   */
  searchPhrases(keyword: string): ShortcutPhrase[] {
    return this.getFilteredPhrases({ keyword });
  }

  /**
   * 创建短语
   */
  async createPhrase(phrase: Omit<ShortcutPhrase, 'id' | 'createdAt' | 'updatedAt'>): Promise<ShortcutPhrase> {
    const newPhrase: ShortcutPhrase = {
      ...phrase,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.phrases.push(newPhrase);
    await this.savePhrases();

    return newPhrase;
  }

  /**
   * 更新短语
   */
  async updatePhrase(id: string, updates: Partial<ShortcutPhrase>): Promise<ShortcutPhrase> {
    const index = this.phrases.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error('短语不存在');
    }

    this.phrases[index] = {
      ...this.phrases[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await this.savePhrases();
    return this.phrases[index];
  }

  /**
   * 删除短语
   */
  async deletePhrase(id: string): Promise<void> {
    const index = this.phrases.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error('短语不存在');
    }

    this.phrases.splice(index, 1);
    await this.savePhrases();
  }

  /**
   * 使用短语
   */
  async usePhrase(id: string, options?: PhraseInsertOptions): Promise<void> {
    console.log('[ShortcutLanguageService] 开始使用短语:', id);
    const phrase = this.phrases.find(p => p.id === id);
    if (!phrase) {
      throw new Error('短语不存在');
    }

    console.log('[ShortcutLanguageService] 找到短语:', phrase.name, phrase.content);

    // 更新使用统计
    phrase.usageCount++;
    phrase.lastUsedAt = new Date().toISOString();
    phrase.updatedAt = new Date().toISOString();

    await this.savePhrases();

    console.log('[ShortcutLanguageService] 触发phrase-insert事件');
    // 这里可以触发插入事件，由UI组件监听
    window.dispatchEvent(new CustomEvent('phrase-insert', {
      detail: { phrase, options }
    }));
    console.log('[ShortcutLanguageService] phrase-insert事件已触发');
  }

  /**
   * 导出短语
   */
  async exportPhrases(): Promise<PhraseExportData> {
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      categories: this.categories,
      phrases: this.phrases,
      metadata: {
        totalPhrases: this.phrases.length,
        totalCategories: this.categories.length,
        appVersion: '1.0.0'
      }
    };
  }

  /**
   * 导入短语
   */
  async importPhrases(data: PhraseExportData): Promise<void> {
    try {
      // 验证数据格式
      if (!data.categories || !data.phrases) {
        throw new Error('无效的数据格式');
      }

      // 合并分类（避免重复）
      for (const category of data.categories) {
        const existing = this.categories.find(c => c.id === category.id);
        if (!existing) {
          this.categories.push(category);
        }
      }

      // 合并短语（避免重复）
      for (const phrase of data.phrases) {
        const existing = this.phrases.find(p => p.id === phrase.id);
        if (!existing) {
          this.phrases.push(phrase);
        }
      }

      await this.saveCategories();
      await this.savePhrases();
    } catch (error) {
      throw new Error(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取使用统计
   */
  getUsageStats(): PhraseUsageStats {
    const totalUsage = this.phrases.reduce((sum, phrase) => sum + phrase.usageCount, 0);

    const mostUsedPhrases = [...this.phrases]
      .filter(p => p.usageCount > 0)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10)
      .map(phrase => ({ phrase, usageCount: phrase.usageCount }));

    const recentlyUsedPhrases = [...this.phrases]
      .filter(p => p.lastUsedAt)
      .sort((a, b) => new Date(b.lastUsedAt!).getTime() - new Date(a.lastUsedAt!).getTime())
      .slice(0, 10)
      .map(phrase => ({ phrase, lastUsedAt: phrase.lastUsedAt! }));

    const categoryStats = this.categories.map(category => {
      const categoryPhrases = this.phrases.filter(p => p.categoryId === category.id);
      const totalUsage = categoryPhrases.reduce((sum, phrase) => sum + phrase.usageCount, 0);

      return {
        category,
        phraseCount: categoryPhrases.length,
        totalUsage
      };
    });

    return {
      totalUsage,
      mostUsedPhrases,
      recentlyUsedPhrases,
      categoryStats
    };
  }

  /**
   * 创建分类
   */
  async createCategory(category: Omit<PhraseCategory, 'id' | 'createdAt'>): Promise<PhraseCategory> {
    const newCategory: PhraseCategory = {
      ...category,
      id: this.generateId(),
      createdAt: new Date().toISOString()
    };

    this.categories.push(newCategory);
    await this.saveCategories();

    return newCategory;
  }

  /**
   * 更新分类
   */
  async updateCategory(id: string, updates: Partial<PhraseCategory>): Promise<PhraseCategory> {
    const index = this.categories.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error('分类不存在');
    }

    this.categories[index] = {
      ...this.categories[index],
      ...updates
    };

    await this.saveCategories();
    return this.categories[index];
  }

  /**
   * 删除分类
   */
  async deleteCategory(id: string): Promise<void> {
    const index = this.categories.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error('分类不存在');
    }

    // 检查是否有短语使用此分类
    const phrasesInCategory = this.phrases.filter(p => p.categoryId === id);
    if (phrasesInCategory.length > 0) {
      throw new Error('无法删除包含短语的分类');
    }

    this.categories.splice(index, 1);
    await this.saveCategories();
  }

  /**
   * 验证数据完整性
   */
  async validateData(): Promise<{
    isValid: boolean;
    issues: string[];
    fixedIssues: string[];
  }> {
    const issues: string[] = [];
    const fixedIssues: string[] = [];

    // 检查分类数据
    if (this.categories.length === 0) {
      issues.push('缺少默认分类');
      this.categories = [...DEFAULT_CATEGORIES];
      await this.saveCategories();
      fixedIssues.push('已恢复默认分类');
    }

    // 检查短语的分类引用
    const validCategoryIds = new Set(this.categories.map(c => c.id));
    const orphanedPhrases = this.phrases.filter(p => !validCategoryIds.has(p.categoryId));

    if (orphanedPhrases.length > 0) {
      issues.push(`发现 ${orphanedPhrases.length} 个短语的分类引用无效`);
      const defaultCategory = this.categories[0];
      orphanedPhrases.forEach(phrase => {
        phrase.categoryId = defaultCategory.id;
      });
      await this.savePhrases();
      fixedIssues.push(`已将 ${orphanedPhrases.length} 个短语移动到默认分类`);
    }

    // 检查数据格式
    const invalidPhrases = this.phrases.filter(p => !p.id || !p.name || !p.content);
    if (invalidPhrases.length > 0) {
      issues.push(`发现 ${invalidPhrases.length} 个格式无效的短语`);
      // 移除无效短语
      this.phrases = this.phrases.filter(p => p.id && p.name && p.content);
      await this.savePhrases();
      fixedIssues.push(`已移除 ${invalidPhrases.length} 个无效短语`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      fixedIssues
    };
  }

  /**
   * 强制重新加载数据
   */
  async forceReload(): Promise<void> {
    await this.loadData();
  }
}

// 创建单例实例
export const shortcutLanguageService = new ShortcutLanguageService();
export default shortcutLanguageService;
