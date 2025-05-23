import { v4 as uuidv4 } from 'uuid';
import type { WebSearchResult, WebSearchProviderConfig, WebSearchProviderResponse } from '../types';
import store from '../store';
import { newMessagesActions } from '../store/slices/newMessagesSlice';
import { AssistantMessageStatus } from '../types/newMessage';

/**
 * 增强版网络搜索服务
 * 支持电脑版的所有搜索提供商，包括API提供商和本地搜索引擎
 */
class EnhancedWebSearchService {
  private isPaused: boolean = false;

  /**
   * 创建中止信号
   */
  createAbortSignal(_key: string) {
    const controller = new AbortController();
    return controller;
  }

  /**
   * 获取当前网络搜索状态
   */
  private getWebSearchState() {
    return store.getState().webSearch;
  }

  /**
   * 检查网络搜索功能是否启用
   */
  public isWebSearchEnabled(providerId?: string): boolean {
    const { providers } = this.getWebSearchState();
    const provider = providers.find((provider) => provider.id === providerId);

    if (!provider) {
      return false;
    }

    // 本地搜索提供商（Google、Bing）不需要API密钥
    if (provider.id === 'local-google' || provider.id === 'local-bing') {
      return true;
    }

    // 检查API密钥
    if (provider.apiKey) {
      return provider.apiKey !== '';
    }

    // 检查API主机（用于Searxng等自托管服务）
    if (provider.apiHost) {
      return provider.apiHost !== '';
    }

    // 检查基础认证（用于Searxng）
    if ('basicAuthUsername' in provider && 'basicAuthPassword' in provider) {
      return provider.basicAuthUsername !== '' && provider.basicAuthPassword !== '';
    }

    return false;
  }

  /**
   * 获取网络搜索提供商
   */
  public getWebSearchProvider(providerId?: string): WebSearchProviderConfig | undefined {
    const { providers } = this.getWebSearchState();
    const provider = providers.find((provider) => provider.id === providerId);
    return provider;
  }

  /**
   * 使用指定的提供商执行网络搜索
   */
  public async search(
    provider: WebSearchProviderConfig,
    query: string,
    _httpOptions?: RequestInit
  ): Promise<WebSearchProviderResponse> {
    const websearch = this.getWebSearchState();

    let formattedQuery = query;
    if (websearch.searchWithTime) {
      const today = new Date().toISOString().split('T')[0];
      formattedQuery = `today is ${today} \r\n ${query}`;
    }

    switch (provider.id) {
      case 'tavily':
        return await this.tavilySearch(provider, formattedQuery, websearch);
      case 'searxng':
        return await this.searxngSearch(provider, formattedQuery, websearch);
      case 'exa':
        return await this.exaSearch(provider, formattedQuery, websearch);
      case 'bocha':
        return await this.bochaSearch(provider, formattedQuery, websearch);
      case 'firecrawl':
        return await this.firecrawlSearch(provider, formattedQuery, websearch);
      case 'local-google':
        return await this.localGoogleSearch(provider, formattedQuery, websearch);
      case 'local-bing':
        return await this.localBingSearch(provider, formattedQuery, websearch);
      default:
        throw new Error(`不支持的搜索提供商: ${provider.id}`);
    }
  }

  /**
   * Tavily搜索实现 - 使用代理API调用
   */
  private async tavilySearch(
    provider: WebSearchProviderConfig,
    query: string,
    websearch: any
  ): Promise<WebSearchProviderResponse> {
    try {
      if (!provider.apiKey) {
        throw new Error('Tavily API密钥未配置');
      }

      // 使用代理路径调用Tavily API
      const response = await fetch('/api/tavily/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          api_key: provider.apiKey,
          query,
          search_depth: 'basic',
          include_answer: false,
          include_images: false,
          include_raw_content: false,
          max_results: websearch.maxResults || 5
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Tavily API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const results: WebSearchResult[] = data.results?.map((result: any) => ({
        id: uuidv4(),
        title: result.title || '',
        url: result.url || '',
        snippet: result.content || '',
        timestamp: new Date().toISOString(),
        provider: 'tavily'
      })) || [];

      return { results };
    } catch (error: any) {
      throw new Error(`Tavily搜索失败: ${error.message}`);
    }
  }

  /**
   * Searxng搜索实现
   */
  private async searxngSearch(
    provider: WebSearchProviderConfig,
    query: string,
    websearch: any
  ): Promise<WebSearchProviderResponse> {
    const url = new URL(`${provider.apiHost}/search`);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('engines', provider.engines?.join(',') || 'google,bing');

    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };

    if (provider.basicAuthUsername && provider.basicAuthPassword) {
      const auth = btoa(`${provider.basicAuthUsername}:${provider.basicAuthPassword}`);
      headers['Authorization'] = `Basic ${auth}`;
    }

    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
      throw new Error(`Searxng API error: ${response.status}`);
    }

    const data = await response.json();
    const results: WebSearchResult[] = data.results?.slice(0, websearch.maxResults).map((result: any) => ({
      id: uuidv4(),
      title: result.title || '',
      url: result.url || '',
      snippet: result.content || '',
      timestamp: new Date().toISOString(),
      provider: 'searxng'
    })) || [];

    return { results };
  }

  /**
   * Exa搜索实现
   */
  private async exaSearch(
    provider: WebSearchProviderConfig,
    query: string,
    websearch: any
  ): Promise<WebSearchProviderResponse> {
    try {
      // 使用代理路径避免CORS问题
      const response = await fetch('/api/exa/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': provider.apiKey || ''
        },
        body: JSON.stringify({
          query,
          numResults: websearch.maxResults,
          type: 'neural',
          useAutoprompt: true,
          contents: {
            text: true
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Exa API error: ${response.status}`);
      }

      const data = await response.json();
      const results: WebSearchResult[] = data.results?.map((result: any) => ({
        id: uuidv4(),
        title: result.title || '',
        url: result.url || '',
        snippet: result.text || '',
        timestamp: new Date().toISOString(),
        provider: 'exa'
      })) || [];

      return { results };
    } catch (error: any) {
      throw new Error(`Exa搜索失败: ${error.message}`);
    }
  }

  /**
   * Bocha搜索实现
   */
  private async bochaSearch(
    provider: WebSearchProviderConfig,
    query: string,
    websearch: any
  ): Promise<WebSearchProviderResponse> {
    try {
      // 使用代理路径避免CORS问题
      const response = await fetch('/api/bocha/v1/web-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`
        },
        body: JSON.stringify({
          query,
          count: websearch.maxResults,
          exclude: websearch.excludeDomains.join(','),
          freshness: websearch.searchWithTime ? 'oneDay' : 'noLimit',
          summary: false
        })
      });

      if (!response.ok) {
        throw new Error(`Bocha API error: ${response.status}`);
      }

      const data = await response.json();
      const results: WebSearchResult[] = data.results?.map((result: any) => ({
        id: uuidv4(),
        title: result.title || '',
        url: result.url || '',
        snippet: result.snippet || '',
        timestamp: new Date().toISOString(),
        provider: 'bocha'
      })) || [];

      return { results };
    } catch (error: any) {
      throw new Error(`Bocha搜索失败: ${error.message}`);
    }
  }

  /**
   * Firecrawl搜索实现
   */
  private async firecrawlSearch(
    provider: WebSearchProviderConfig,
    query: string,
    websearch: any
  ): Promise<WebSearchProviderResponse> {
    try {
      // 使用代理路径避免CORS问题
      const response = await fetch('/api/firecrawl/v1/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`
        },
        body: JSON.stringify({
          query,
          limit: websearch.maxResults
        })
      });

      if (!response.ok) {
        throw new Error(`Firecrawl API error: ${response.status}`);
      }

      const data = await response.json();
      const results: WebSearchResult[] = data.data?.map((result: any) => ({
        id: uuidv4(),
        title: result.metadata?.title || result.url || '',
        url: result.url || '',
        snippet: result.markdown?.substring(0, 200) || '',
        timestamp: new Date().toISOString(),
        provider: 'firecrawl',
        content: result.markdown
      })) || [];

      return { results };
    } catch (error: any) {
      throw new Error(`Firecrawl搜索失败: ${error.message}`);
    }
  }

  /**
   * 本地Google搜索实现 - 移动端版本
   * 使用代理服务器抓取Google搜索结果
   */
  private async localGoogleSearch(
    _provider: WebSearchProviderConfig,
    query: string,
    websearch: any
  ): Promise<WebSearchProviderResponse> {
    try {
      console.log(`[EnhancedWebSearchService] 开始本地Google搜索: ${query}`);

      // 使用代理路径避免CORS问题
      const response = await fetch('/api/google/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          maxResults: websearch.maxResults || 5,
          language: 'zh-CN',
          region: 'CN'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google搜索API错误: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // 解析搜索结果
      const results: WebSearchResult[] = data.results?.map((result: any) => ({
        id: uuidv4(),
        title: result.title || '',
        url: result.url || '',
        snippet: result.snippet || '',
        timestamp: new Date().toISOString(),
        provider: 'local-google'
      })) || [];

      console.log(`[EnhancedWebSearchService] Google搜索完成，找到 ${results.length} 个结果`);
      return { results };
    } catch (error: any) {
      console.error('[EnhancedWebSearchService] Google搜索失败:', error);
      throw new Error(`Google搜索失败: ${error.message}`);
    }
  }

  /**
   * 本地Bing搜索实现 - 移动端版本
   * 使用代理服务器抓取Bing搜索结果
   */
  private async localBingSearch(
    _provider: WebSearchProviderConfig,
    query: string,
    websearch: any
  ): Promise<WebSearchProviderResponse> {
    try {
      console.log(`[EnhancedWebSearchService] 开始本地Bing搜索: ${query}`);

      // 使用代理路径避免CORS问题
      const response = await fetch('/api/bing/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          maxResults: websearch.maxResults || 5,
          language: 'zh-CN',
          region: 'CN'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bing搜索API错误: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // 解析搜索结果
      const results: WebSearchResult[] = data.results?.map((result: any) => ({
        id: uuidv4(),
        title: result.title || '',
        url: result.url || '',
        snippet: result.snippet || '',
        timestamp: new Date().toISOString(),
        provider: 'local-bing'
      })) || [];

      console.log(`[EnhancedWebSearchService] Bing搜索完成，找到 ${results.length} 个结果`);
      return { results };
    } catch (error: any) {
      console.error('[EnhancedWebSearchService] Bing搜索失败:', error);
      throw new Error(`Bing搜索失败: ${error.message}`);
    }
  }



  /**
   * 使用SEARCHING状态执行搜索
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

      // 获取当前选择的提供商
      const websearch = this.getWebSearchState();
      const provider = this.getWebSearchProvider(websearch.provider);

      if (!provider) {
        throw new Error('未找到搜索提供商');
      }

      // 执行搜索
      const response = await this.search(provider, query);
      return response.results;

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

  /**
   * 检查搜索提供商是否正常工作
   */
  public async checkSearch(provider: WebSearchProviderConfig): Promise<{ valid: boolean; error?: any }> {
    try {
      const response = await this.search(provider, 'test query');
      return { valid: response.results !== undefined, error: undefined };
    } catch (error) {
      return { valid: false, error };
    }
  }
}

// 导出单例实例
export default new EnhancedWebSearchService();
