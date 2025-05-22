import { uuid } from '../utils';
import { getStorageItem, setStorageItem } from '../utils/storage';
import { ASSISTANT_PROMPT_TEMPLATES, DEFAULT_SYSTEM_PROMPT } from '../config/prompts';

/**
 * 系统提示词模板类型
 */
export interface SystemPromptTemplate {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
  createdAt?: number;
  updatedAt?: number;
}

// 存储键名
const TEMPLATES_KEY = 'systemPromptTemplates';
const DEFAULT_PROMPT_KEY = 'defaultSystemPrompt';
const USE_DEFAULT_PROMPT_KEY = 'useDefaultSystemPrompt';

/**
 * 系统提示词服务
 * 统一管理系统提示词的存储、获取和应用
 */
export class SystemPromptService {
  private static instance: SystemPromptService;
  private templates: SystemPromptTemplate[] = [];
  private defaultPrompt: string = DEFAULT_SYSTEM_PROMPT;
  private useDefaultPrompt: boolean = true;
  private isInitialized: boolean = false;

  /**
   * 获取系统提示词服务实例
   */
  public static getInstance(): SystemPromptService {
    if (!SystemPromptService.instance) {
      SystemPromptService.instance = new SystemPromptService();
    }
    return SystemPromptService.instance;
  }

  /**
   * 初始化系统提示词服务
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // 加载模板
      const savedTemplates = await getStorageItem<SystemPromptTemplate[]>(TEMPLATES_KEY);
      if (savedTemplates && savedTemplates.length > 0) {
        this.templates = savedTemplates;
      } else {
        this.templates = this.migrateAndGetTemplates();
        await this.saveTemplates();
      }

      // 加载默认提示词
      const defaultPrompt = await getStorageItem<string>(DEFAULT_PROMPT_KEY);
      if (defaultPrompt) {
        this.defaultPrompt = defaultPrompt;
      }

      // 加载是否使用默认提示词设置
      const useDefaultPrompt = await getStorageItem<boolean>(USE_DEFAULT_PROMPT_KEY);
      if (useDefaultPrompt !== null && useDefaultPrompt !== undefined) {
        this.useDefaultPrompt = useDefaultPrompt;
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('初始化系统提示词服务失败:', error);
    }
  }

  /**
   * 迁移并获取模板
   * 兼容旧版本数据
   */
  private migrateAndGetTemplates(): SystemPromptTemplate[] {
    try {
      // 尝试从localStorage迁移数据 (旧版本兼容)
      const localStorageKey = 'aetherlink-system-prompt-templates';
      const localStorageTemplates = localStorage.getItem(localStorageKey);

      if (localStorageTemplates) {
        const parsedTemplates = JSON.parse(localStorageTemplates);
        if (Array.isArray(parsedTemplates) && parsedTemplates.length > 0) {
          // 清除旧数据
          localStorage.removeItem(localStorageKey);
          return [...parsedTemplates]; // 返回一个新数组的副本
        }
      }
    } catch (error) {
      console.error('迁移本地存储提示词模板失败:', error);
    }

    // 返回默认模板的深拷贝，避免修改原始对象
    return ASSISTANT_PROMPT_TEMPLATES.map(template => ({
      id: template.id,
      name: template.name,
      content: template.content,
      isDefault: template.isDefault,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }));
  }

  /**
   * 保存模板到存储
   */
  private async saveTemplates(): Promise<void> {
    try {
      await setStorageItem(TEMPLATES_KEY, this.templates);
    } catch (error) {
      console.error('保存系统提示词模板失败:', error);
    }
  }

  /**
   * 保存默认提示词到存储
   */
  private async saveDefaultPrompt(): Promise<void> {
    try {
      await setStorageItem(DEFAULT_PROMPT_KEY, this.defaultPrompt);
    } catch (error) {
      console.error('保存默认系统提示词失败:', error);
    }
  }

  /**
   * 保存是否使用默认提示词设置到存储
   */
  private async saveUseDefaultPrompt(): Promise<void> {
    try {
      await setStorageItem(USE_DEFAULT_PROMPT_KEY, this.useDefaultPrompt);
    } catch (error) {
      console.error('保存使用默认提示词设置失败:', error);
    }
  }

  /**
   * 获取所有模板
   */
  public getTemplates(): SystemPromptTemplate[] {
    return [...this.templates];
  }

  /**
   * 获取默认提示词
   */
  public getDefaultPrompt(): string {
    return this.defaultPrompt;
  }

  /**
   * 是否使用默认提示词
   */
  public getUseDefaultPrompt(): boolean {
    return this.useDefaultPrompt;
  }

  /**
   * 设置默认提示词
   */
  public async setDefaultPrompt(prompt: string): Promise<void> {
    this.defaultPrompt = prompt;
    await this.saveDefaultPrompt();

    // 同时更新默认模板的内容
    const defaultTemplateIndex = this.templates.findIndex(t => t.isDefault);
    if (defaultTemplateIndex !== -1) {
      // 创建一个新的模板对象而不是直接修改现有对象
      const updatedTemplate = {
        ...this.templates[defaultTemplateIndex],
        content: prompt,
        updatedAt: Date.now()
      };

      // 使用新数组替换原数组
      this.templates = [
        ...this.templates.slice(0, defaultTemplateIndex),
        updatedTemplate,
        ...this.templates.slice(defaultTemplateIndex + 1)
      ];

      await this.saveTemplates();
    }
  }

  /**
   * 设置是否使用默认提示词
   */
  public async setUseDefaultPrompt(useDefault: boolean): Promise<void> {
    this.useDefaultPrompt = useDefault;
    await this.saveUseDefaultPrompt();
  }

  /**
   * 添加提示词模板
   */
  public async addTemplate(name: string, content: string, isDefault: boolean = false): Promise<SystemPromptTemplate> {
    const now = Date.now();
    const newTemplate: SystemPromptTemplate = {
      id: uuid(),
      name,
      content,
      isDefault,
      createdAt: now,
      updatedAt: now
    };

    // 如果是默认模板，更新其他模板的默认状态
    if (isDefault) {
      this.templates = this.templates.map(t => ({
        ...t,
        isDefault: false,
        updatedAt: now
      }));
    }

    // 使用不可变方式添加新模板
    this.templates = [...this.templates, newTemplate];
    await this.saveTemplates();

    // 如果是默认模板，更新默认提示词
    if (isDefault) {
      await this.setDefaultPrompt(content);
    }

    return newTemplate;
  }

  /**
   * 更新提示词模板
   */
  public async updateTemplate(template: SystemPromptTemplate): Promise<SystemPromptTemplate> {
    const now = Date.now();
    const updatedTemplate = {
      ...template,
      updatedAt: now
    };

    const index = this.templates.findIndex(t => t.id === template.id);

    if (index !== -1) {
      const wasDefault = this.templates[index].isDefault;

      // 如果设置为默认，更新其他模板
      if (template.isDefault && !wasDefault) {
        this.templates = this.templates.map(t => ({
          ...t,
          isDefault: false,
          updatedAt: t.id === template.id ? now : t.updatedAt
        }));
      }

      // 使用不可变更新替换特定索引的元素
      this.templates = [
        ...this.templates.slice(0, index),
        updatedTemplate,
        ...this.templates.slice(index + 1)
      ];

      await this.saveTemplates();

      // 如果是默认模板，更新默认提示词
      if (template.isDefault) {
        await this.setDefaultPrompt(template.content);
      }

      return updatedTemplate;
    } else {
      throw new Error(`找不到ID为${template.id}的模板`);
    }
  }

  /**
   * 删除提示词模板
   */
  public async deleteTemplate(id: string): Promise<void> {
    const templateIndex = this.templates.findIndex(t => t.id === id);
    if (templateIndex === -1) {
      return;
    }

    const template = this.templates[templateIndex];

    // 不允许删除最后一个模板
    if (this.templates.length <= 1) {
      console.error('不能删除最后一个提示词模板');
      return;
    }

    // 如果删除的是默认模板，选择另一个模板作为默认
    if (template.isDefault) {
      const anotherTemplateIndex = this.templates.findIndex(t => t.id !== id);
      if (anotherTemplateIndex !== -1) {
        // 使用不可变更新模式
        const updatedTemplates = [...this.templates];

        // 创建更新后的模板对象
        const updatedTemplate = {
          ...updatedTemplates[anotherTemplateIndex],
          isDefault: true
        };

        // 替换模板数组中的对象
        updatedTemplates[anotherTemplateIndex] = updatedTemplate;
        this.templates = updatedTemplates;

        // 更新默认提示词
        await this.setDefaultPrompt(updatedTemplate.content);
      }
    }

    // 使用不可变方式过滤掉要删除的模板
    this.templates = this.templates.filter(t => t.id !== id);
    await this.saveTemplates();
  }

  /**
   * 设置默认模板
   */
  public async setDefaultTemplate(id: string): Promise<void> {
    const template = this.templates.find(t => t.id === id);
    if (!template) {
      return;
    }

    const now = Date.now();
    this.templates = this.templates.map(t => ({
      ...t,
      isDefault: t.id === id,
      updatedAt: t.id === id ? now : t.updatedAt
    }));

    await this.saveTemplates();
    await this.setDefaultPrompt(template.content);
  }

  /**
   * 复制模板
   */
  public async duplicateTemplate(id: string): Promise<SystemPromptTemplate | null> {
    const template = this.templates.find(t => t.id === id);
    if (!template) {
      return null;
    }

    const now = Date.now();
    const duplicate: SystemPromptTemplate = {
      id: uuid(),
      name: `${template.name} (复制)`,
      content: template.content,
      isDefault: false,
      createdAt: now,
      updatedAt: now
    };

    // 使用不可变方式添加新模板
    this.templates = [...this.templates, duplicate];
    await this.saveTemplates();

    return duplicate;
  }

  /**
   * 获取当前生效的系统提示词
   * 如果设置为不使用默认提示词，则返回空字符串
   */
  public getActiveSystemPrompt(): string {
    return this.useDefaultPrompt ? this.defaultPrompt : '';
  }
}