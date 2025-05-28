import type { SearchResult, SearchResponse, SearchOptions, SearchServiceConfig } from '../types/search';

/**
 * 搜索服务类，处理对DuckDuckGo API的请求
 */
class SearchService {
  private config: SearchServiceConfig = {
    endpoint: 'https://duckduckgo-api.vercel.app/search',
    defaultMaxResults: 3,
    timeoutMs: 5000
  };

  /**
   * 设置搜索服务配置
   * @param config 搜索服务配置
   */
  public setConfig(config: Partial<SearchServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前搜索服务配置
   */
  public getConfig(): SearchServiceConfig {
    return { ...this.config };
  }

  /**
   * 执行搜索查询
   * @param query 搜索查询字符串
   * @param options 搜索选项
   * @returns 搜索结果数组
   */
  public async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    try {
      const maxResults = options?.maxResults || this.config.defaultMaxResults;
      const timeout = options?.timeout || this.config.timeoutMs;
      
      // 构建搜索URL
      const endpoint = this.config.endpoint || 'https://duckduckgo-api.vercel.app/search';
      const url = new URL(endpoint);
      url.searchParams.append('q', query);
      url.searchParams.append('max_results', maxResults.toString());

      // 设置请求超时的AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // 执行请求
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`搜索请求失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as SearchResponse;
      return data.results || [];
    } catch (error) {
      console.error('搜索出错:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('搜索请求超时');
      }
      throw error;
    }
  }
}

// 导出单例实例
export const searchService = new SearchService(); 