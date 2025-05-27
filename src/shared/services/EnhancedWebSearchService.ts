import { v4 as uuidv4 } from 'uuid';
import { tavily } from './TavilyMobileSDK';
import type { WebSearchResult, WebSearchProviderConfig, WebSearchProviderResponse } from '../types';
import store from '../store';
import { newMessagesActions } from '../store/slices/newMessagesSlice';
import { AssistantMessageStatus } from '../types/newMessage';

/**
 * 增强版网络搜索服务
 * 支持最佳实例的所有搜索提供商，包括API提供商和本地搜索引擎
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

    // 本地搜索提供商（Google、Bing）和免费WebSearch不需要API密钥
    if (provider.id === 'local-google' || provider.id === 'local-bing' || provider.id === 'bing') {
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
      case 'exa':
        return await this.exaSearch(provider, formattedQuery, websearch);
      case 'bocha':
        return await this.bochaSearch(provider, formattedQuery, websearch);
      case 'firecrawl':
        return await this.firecrawlSearch(provider, formattedQuery, websearch);
      default:
        throw new Error(`不支持的搜索提供商: ${provider.id}`);
    }
  }

  /**
   * Tavily搜索实现 - 使用移动端兼容的SDK
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

      console.log(`[EnhancedWebSearchService] 开始Tavily移动端SDK搜索: ${query}`);

      // 创建移动端兼容的Tavily客户端
      const tvly = tavily({ apiKey: provider.apiKey });

      // 使用移动端SDK进行搜索 - 根据Tavily最佳实践优化
      const response = await tvly.search(query, {
        searchDepth: 'advanced', // 🚀 使用高级搜索深度获得更高质量内容
        includeAnswer: false,
        includeImages: false,
        includeRawContent: true, // 🚀 启用原始内容提取，避免内容截断
        maxResults: Math.min(websearch.maxResults || 5, 10), // 🚀 限制在10以内，提高相关性
        chunksPerSource: 3, // 🚀 每个源返回3个内容块，提高内容质量
        excludeDomains: websearch.excludeDomains || []
      });

      // 转换结果格式 - 优化内容处理和编码
      const results: WebSearchResult[] = response.results?.map((result: any) => {
        // 🚀 优先使用原始内容，如果没有则使用摘要内容
        let content = result.raw_content || result.content || '';

        // 🚀 清理和规范化内容，移除可能的乱码
        content = content
          // eslint-disable-next-line no-control-regex
          .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // 移除控制字符
          .replace(/\s+/g, ' ') // 规范化空白字符
          .trim();

        // 🚀 如果内容过长，智能截取（保持完整句子）
        if (content.length > 500) {
          const sentences = content.split(/[.!?。！？]/);
          let truncated = '';
          for (const sentence of sentences) {
            if ((truncated + sentence).length > 450) break;
            truncated += sentence + '。';
          }
          content = truncated || content.substring(0, 500) + '...';
        }

        // 🚀 清理标题，移除可能的HTML标签和特殊字符
        const title = (result.title || '')
          .replace(/<[^>]*>/g, '') // 移除HTML标签
          // eslint-disable-next-line no-control-regex
          .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // 移除控制字符
          .trim();

        return {
          id: uuidv4(),
          title: title || '无标题',
          url: result.url || '',
          snippet: content,
          timestamp: new Date().toISOString(),
          provider: 'tavily',
          score: result.score || 0 // 🚀 保留相关性评分
        };
      }) || [];

      console.log(`[EnhancedWebSearchService] Tavily移动端SDK搜索完成，找到 ${results.length} 个结果`);
      return { results };
    } catch (error: any) {
      console.error('[EnhancedWebSearchService] Tavily移动端SDK搜索失败:', error);
      throw new Error(`Tavily搜索失败: ${error.message}`);
    }
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
