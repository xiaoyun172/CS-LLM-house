import { v4 as uuidv4 } from 'uuid';
import type { WebSearchResult } from '../types';
import store from '../store';

/**
 * Firecrawl 服务
 * 基于 Firecrawl API 提供的高级网络数据获取和搜索功能
 */
class FirecrawlService {
  private apiKey: string = '';
  private baseUrl: string = 'https://api.firecrawl.dev';
  
  /**
   * 从Redux store更新配置
   */
  private updateConfig() {
    const state = store.getState();
    const settings = state.webSearch;
    
    if (!settings || !settings.enabled) {
      throw new Error('网络搜索未启用');
    }
    
    if (settings.provider !== 'firecrawl') {
      throw new Error('当前搜索提供商不是Firecrawl');
    }
    
    this.apiKey = settings.apiKey;
    this.baseUrl = settings.baseUrl || 'https://api.firecrawl.dev';
  }
  
  /**
   * 搜索网页内容
   * @param query 搜索查询
   * @param limit 最大结果数
   * @returns 搜索结果
   */
  public async search(query: string, limit: number = 5): Promise<WebSearchResult[]> {
    try {
      this.updateConfig();
      
      const response = await fetch(`${this.baseUrl}/v1/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          query,
          limit
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Firecrawl API 错误 (${response.status}): ${errorData.error || response.statusText}`);
      }
      
      const data = await response.json();
      
      return data.results.map((result: any) => ({
        id: uuidv4(),
        title: result.title || '无标题',
        url: result.url,
        snippet: result.snippet || result.text || '无描述',
        timestamp: new Date().toISOString(),
        provider: 'firecrawl'
      }));
    } catch (error) {
      console.error('Firecrawl 搜索失败:', error);
      throw error;
    }
  }
  
  /**
   * 抓取单个网页内容
   * @param url 要抓取的URL
   * @param format 返回格式 ('markdown' | 'html' | 'text')
   * @returns 网页内容
   */
  public async scrapeUrl(url: string, format: 'markdown' | 'html' | 'text' = 'markdown'): Promise<string> {
    try {
      this.updateConfig();
      
      const response = await fetch(`${this.baseUrl}/v1/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          url,
          formats: [format],
          onlyMainContent: true
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Firecrawl API 错误 (${response.status}): ${errorData.error || response.statusText}`);
      }
      
      const data = await response.json();
      
      if (format === 'markdown' && data.markdown) {
        return data.markdown;
      } else if (format === 'html' && data.html) {
        return data.html;
      } else if (format === 'text' && data.rawText) {
        return data.rawText;
      } else {
        throw new Error('无法获取指定格式的内容');
      }
    } catch (error) {
      console.error('Firecrawl 网页抓取失败:', error);
      throw error;
    }
  }
  
  /**
   * 爬取网站内容
   * @param url 起始URL
   * @param options 爬取选项
   * @returns 爬取结果
   */
  public async crawlWebsite(url: string, options: {
    limit?: number;
    maxDepth?: number;
    format?: 'markdown' | 'html' | 'text';
  } = {}): Promise<Array<{url: string, content: string}>> {
    try {
      this.updateConfig();
      
      const { limit = 10, maxDepth = 2, format = 'markdown' } = options;
      
      const response = await fetch(`${this.baseUrl}/v1/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          url,
          limit,
          maxDepth,
          scrapeOptions: {
            formats: [format],
            onlyMainContent: true
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Firecrawl API 错误 (${response.status}): ${errorData.error || response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.pages || !Array.isArray(data.pages)) {
        throw new Error('无效的爬取结果格式');
      }
      
      return data.pages.map((page: any) => ({
        url: page.url,
        content: format === 'markdown' 
          ? page.markdown 
          : format === 'html' 
            ? page.html 
            : page.rawText || ''
      }));
    } catch (error) {
      console.error('Firecrawl 网站爬取失败:', error);
      throw error;
    }
  }
  
  /**
   * 生成网站地图
   * @param url 网站URL
   * @param limit 最大URL数量
   * @returns 网站URL列表
   */
  public async mapWebsite(url: string, limit: number = 100): Promise<string[]> {
    try {
      this.updateConfig();
      
      const response = await fetch(`${this.baseUrl}/v1/map`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          url,
          limit
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Firecrawl API 错误 (${response.status}): ${errorData.error || response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.urls || !Array.isArray(data.urls)) {
        throw new Error('无效的网站地图格式');
      }
      
      return data.urls;
    } catch (error) {
      console.error('Firecrawl 网站地图生成失败:', error);
      throw error;
    }
  }
  
  /**
   * 深度研究一个主题
   * @param query 研究主题
   * @param options 研究选项
   * @returns 研究结果
   */
  public async deepResearch(query: string, options: {
    maxUrls?: number;
    maxDepth?: number;
    timeLimit?: number;
  } = {}): Promise<string> {
    try {
      this.updateConfig();
      
      const { maxUrls = 20, maxDepth = 3, timeLimit = 120 } = options;
      
      const response = await fetch(`${this.baseUrl}/v1/deep-research`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          query,
          maxUrls,
          maxDepth,
          timeLimit
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Firecrawl API 错误 (${response.status}): ${errorData.error || response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.research) {
        throw new Error('无效的研究结果格式');
      }
      
      return data.research;
    } catch (error) {
      console.error('Firecrawl 深度研究失败:', error);
      throw error;
    }
  }
  
  /**
   * 检查服务是否可用
   */
  public async isAvailable(): Promise<boolean> {
    try {
      this.updateConfig();
      
      // 简单的API调用来检查服务可用性
      const response = await fetch(`${this.baseUrl}/v1/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Firecrawl 服务检查失败:', error);
      return false;
    }
  }
}

// 导出单例实例
export default new FirecrawlService(); 