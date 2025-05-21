import { v4 as uuidv4 } from 'uuid';
import type { WebSearchResult } from '../types';
import store from '../store';
import FirecrawlApp from '@mendable/firecrawl-js';
import { newMessagesActions } from '../store/slices/newMessagesSlice';
import { AssistantMessageStatus } from '../types/newMessage';

/**
 * 网络搜索服务
 * 提供网络搜索功能，支持多个搜索提供商API
 */
class WebSearchService {
  private apiKey: string = '';
  private provider: string = 'firecrawl';
  private maxResults: number = 5;
  private filterSafeSearch: boolean = true;
  private baseUrl: string = '';
  private firecrawlApp: FirecrawlApp | null = null;
  private abortController: AbortController | null = null;
  private isPaused: boolean = false;

  /**
   * 从Redux store更新配置
   */
  private updateConfig() {
    const state = store.getState();
    const settings = state.webSearch;

    if (!settings || !settings.enabled) {
      throw new Error('网络搜索未启用');
    }

    this.provider = settings.provider;
    this.apiKey = settings.apiKey || '';
    this.baseUrl = settings.baseUrl || '';
    this.maxResults = settings.maxResults || 5;
    this.filterSafeSearch = settings.filterSafeSearch;

    // 如果是Firecrawl提供商，初始化SDK实例
    if (this.provider === 'firecrawl' && this.apiKey) {
      this.firecrawlApp = new FirecrawlApp({ apiKey: this.apiKey });
    }
  }

  /**
   * 执行搜索查询
   * @param query 搜索查询内容
   * @returns 搜索结果数组
   */
  public async search(query: string): Promise<WebSearchResult[]> {
    try {
      this.updateConfig();

      switch (this.provider) {
        case 'firecrawl':
          return await this.firecrawlSearch(query);
        case 'tavily':
          return await this.tavilySearch(query);
        case 'serpapi':
          return await this.serpApiSearch(query);
        case 'custom':
          return await this.customSearch(query);
        default:
          throw new Error(`不支持的搜索提供商: ${this.provider}`);
      }
    } catch (error) {
      console.error('网络搜索失败:', error);
      throw error;
    }
  }

  /**
   * 使用Firecrawl API执行搜索
   * @param query 搜索查询内容
   * @returns 搜索结果数组
   */
  private async firecrawlSearch(query: string): Promise<WebSearchResult[]> {
    try {
      // 确保Firecrawl实例已初始化
      if (!this.firecrawlApp) {
        this.firecrawlApp = new FirecrawlApp({ apiKey: this.apiKey });
      }

      // 使用SDK执行搜索
      // 使用any类型暂时解决类型问题
      const searchResponse: any = await this.firecrawlApp.search(query);

      if (!searchResponse) {
        throw new Error('Firecrawl搜索未返回有效结果');
      }

      // 处理返回结果
      // SDK可能会返回不同的格式，尝试适配
      let results = [];

      if (Array.isArray(searchResponse)) {
        // 如果直接返回结果数组
        results = searchResponse;
      } else if (searchResponse.results && Array.isArray(searchResponse.results)) {
        // 如果返回包含results数组的对象
        results = searchResponse.results;
      } else if (searchResponse.data && Array.isArray(searchResponse.data)) {
        // 如果返回包含data数组的对象
        results = searchResponse.data;
      } else {
        // 如果是其他格式，尝试作为单个结果处理
        results = [searchResponse];
      }

      // 将Firecrawl格式转换为通用WebSearchResult格式
      return results.map((result: any) => ({
        id: uuidv4(),
        title: result.title || '无标题',
        url: result.url,
        snippet: result.snippet || result.text || result.content || '无描述',
        timestamp: new Date().toISOString(),
        provider: 'firecrawl'
      }));
    } catch (error) {
      console.error('Firecrawl 搜索失败:', error);
      throw error;
    }
  }

  /**
   * 使用Tavily API执行搜索
   * @param query 搜索查询内容
   * @returns 搜索结果数组
   */
  private async tavilySearch(query: string): Promise<WebSearchResult[]> {
    try {
      const apiUrl = this.baseUrl || 'https://api.tavily.com/search';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        },
        body: JSON.stringify({
          query: query,
          max_results: this.maxResults,
          filter_results: this.filterSafeSearch
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Tavily API 错误 (${response.status}): ${errorData.error || response.statusText}`);
      }

      const data = await response.json();

      // 转换为通用格式
      return data.results.map((result: any) => ({
        id: uuidv4(),
        title: result.title || '无标题',
        url: result.url,
        snippet: result.content || '无描述',
        timestamp: new Date().toISOString(),
        provider: 'tavily'
      }));
    } catch (error) {
      console.error('Tavily 搜索失败:', error);
      throw error;
    }
  }

  /**
   * 使用SerpApi执行搜索
   * @param query 搜索查询内容
   * @returns 搜索结果数组
   */
  private async serpApiSearch(query: string): Promise<WebSearchResult[]> {
    try {
      const apiUrl = `${this.baseUrl || 'https://serpapi.com'}/search.json?q=${encodeURIComponent(query)}&api_key=${this.apiKey}&num=${this.maxResults}`;

      const response = await fetch(apiUrl);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`SerpAPI 错误 (${response.status}): ${errorData.error || response.statusText}`);
      }

      const data = await response.json();

      // 从SerpAPI提取有机搜索结果
      const results = data.organic_results || [];

      // 转换为通用格式
      return results.map((result: any) => ({
        id: uuidv4(),
        title: result.title || '无标题',
        url: result.link,
        snippet: result.snippet || '无描述',
        timestamp: new Date().toISOString(),
        provider: 'serpapi'
      }));
    } catch (error) {
      console.error('SerpAPI 搜索失败:', error);
      throw error;
    }
  }

  /**
   * 使用自定义API执行搜索
   * @param query 搜索查询内容
   * @returns 搜索结果数组
   */
  private async customSearch(query: string): Promise<WebSearchResult[]> {
    // 获取自定义提供商
    const state = store.getState();
    const settings = state.webSearch;

    if (!settings || !settings.customProviders || settings.customProviders.length === 0) {
      throw new Error('未配置自定义搜索提供商');
    }

    // 筛选出启用的提供商
    const enabledProviders = settings.customProviders.filter(p => p.enabled);
    if (enabledProviders.length === 0) {
      throw new Error('没有启用的自定义搜索提供商');
    }

    // 使用第一个启用的提供商
    const provider = enabledProviders[0];

    try {
      const apiUrl = provider.baseUrl;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`
        },
        body: JSON.stringify({
          query: query,
          limit: this.maxResults
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`自定义搜索提供商错误 (${response.status}): ${errorData.error || response.statusText}`);
      }

      const data = await response.json();

      // 尝试适配数据格式
      let results = [];
      if (Array.isArray(data)) {
        results = data;
      } else if (data.results && Array.isArray(data.results)) {
        results = data.results;
      } else if (data.data && Array.isArray(data.data)) {
        results = data.data;
      } else {
        throw new Error('无法识别自定义搜索提供商的响应格式');
      }

      // 转换为通用格式，尝试适配不同的字段名
      return results.map((result: any) => ({
        id: uuidv4(),
        title: result.title || result.name || '无标题',
        url: result.url || result.link || '',
        snippet: result.snippet || result.description || result.content || result.text || '无描述',
        timestamp: new Date().toISOString(),
        provider: provider.name
      }));
    } catch (error) {
      console.error('自定义搜索提供商搜索失败:', error);
      throw error;
    }
  }

  /**
   * 检查网络搜索是否已启用
   * @returns 是否启用
   */
  public isEnabled(): boolean {
    const state = store.getState();
    return state.webSearch?.enabled || false;
  }

  /**
   * 获取当前搜索模式
   * @returns 搜索模式 ('auto' | 'manual')
   */
  public getSearchMode(): 'auto' | 'manual' {
    const state = store.getState();
    return state.webSearch?.searchMode || 'manual';
  }

  /**
   * 是否需要将结果包含在上下文中
   */
  public shouldIncludeInContext(): boolean {
    const state = store.getState();
    return state.webSearch?.includeInContext || false;
  }

  /**
   * 创建中止控制器
   * @param key 控制器标识
   * @returns 中止控制器
   */
  public createAbortSignal(key: string): AbortController {
    // 如果已存在控制器，先中止它
    if (this.abortController) {
      this.abortController.abort();
    }

    // 创建新的控制器
    const controller = new AbortController();
    this.abortController = controller;
    this.isPaused = false;

    // 添加到全局控制器映射
    this.addAbortController(key, () => {
      this.isPaused = true;
      this.abortController = null;
      controller.abort();
    });

    return controller;
  }

  /**
   * 添加中止控制器到映射
   * @param key 控制器标识
   * @param abortFn 中止函数
   */
  private abortControllers: Map<string, () => void> = new Map();

  private addAbortController(key: string, abortFn: () => void): void {
    // 如果已存在同名控制器，先中止它
    if (this.abortControllers.has(key)) {
      const existingAbortFn = this.abortControllers.get(key);
      if (existingAbortFn) {
        existingAbortFn();
      }
    }

    // 添加新的控制器
    this.abortControllers.set(key, abortFn);
  }

  /**
   * 中止搜索
   * @param key 控制器标识
   */
  public abortSearch(key: string): void {
    const abortFn = this.abortControllers.get(key);
    if (abortFn) {
      abortFn();
      this.abortControllers.delete(key);
    }
  }

  /**
   * 使用SEARCHING状态执行搜索
   * @param query 搜索查询
   * @param topicId 话题ID
   * @param messageId 消息ID
   * @returns 搜索结果
   */
  public async searchWithStatus(query: string, topicId: string, messageId: string): Promise<WebSearchResult[]> {
    try {
      // 设置消息状态为SEARCHING
      store.dispatch(newMessagesActions.updateMessageStatus({
        topicId,
        messageId,
        status: AssistantMessageStatus.SEARCHING
      }));

      // 创建中止控制器
      this.createAbortSignal(messageId);

      // 执行搜索
      const results = await this.search(query);

      return results;
    } finally {
      // 如果没有被中止，更新消息状态为SUCCESS
      if (!this.isPaused) {
        store.dispatch(newMessagesActions.updateMessageStatus({
          topicId,
          messageId,
          status: AssistantMessageStatus.SUCCESS
        }));
      }
    }
  }
}

// 导出单例实例
export default new WebSearchService();