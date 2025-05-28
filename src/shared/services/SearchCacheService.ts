import type { WebSearchResult } from '../types';

/**
 * 搜索缓存服务
 * 用于缓存网络搜索结果，提高搜索响应速度
 */
class SearchCacheService {
  // 缓存键前缀，用于在localStorage中区分搜索缓存
  private readonly CACHE_KEY_PREFIX = 'search_cache_';
  
  // 缓存过期时间设置（毫秒）
  private readonly EXPIRATION_TIMES = {
    DEFAULT: 24 * 60 * 60 * 1000, // 一般查询：24小时
    NEWS: 15 * 60 * 1000,         // 新闻查询：15分钟
    WEATHER: 30 * 60 * 1000,      // 天气查询：30分钟
    PRICE: 60 * 60 * 1000,        // 价格查询：1小时
  };

  /**
   * 判断查询是否与时效性内容相关
   * @param query 搜索查询
   * @returns 查询的内容类型
   */
  private getQueryType(query: string): 'NEWS' | 'WEATHER' | 'PRICE' | 'DEFAULT' {
    const lowerQuery = query.toLowerCase();
    
    // 检测是否为新闻查询
    if (
      lowerQuery.includes('新闻') || 
      lowerQuery.includes('最新') || 
      lowerQuery.includes('今天') ||
      lowerQuery.includes('最近') ||
      lowerQuery.includes('news') ||
      lowerQuery.includes('latest')
    ) {
      return 'NEWS';
    }
    
    // 检测是否为天气查询
    if (
      lowerQuery.includes('天气') || 
      lowerQuery.includes('气温') ||
      lowerQuery.includes('weather') ||
      lowerQuery.includes('temperature')
    ) {
      return 'WEATHER';
    }
    
    // 检测是否为价格查询
    if (
      lowerQuery.includes('价格') || 
      lowerQuery.includes('多少钱') ||
      lowerQuery.includes('报价') ||
      lowerQuery.includes('price') ||
      lowerQuery.includes('cost')
    ) {
      return 'PRICE';
    }
    
    return 'DEFAULT';
  }

  /**
   * 生成缓存键
   * @param query 搜索查询
   * @returns 缓存键
   */
  private generateCacheKey(query: string): string {
    // 使用查询字符串的简单哈希作为缓存键
    const queryHash = this.simpleHash(query);
    return `${this.CACHE_KEY_PREFIX}${queryHash}`;
  }

  /**
   * 简单的字符串哈希函数
   * @param str 输入字符串
   * @returns 哈希值
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString(16); // 转换为16进制
  }

  /**
   * 从缓存中获取搜索结果
   * @param query 搜索查询
   * @returns 缓存的搜索结果，如果没有缓存或缓存已过期则返回null
   */
  public getCache(query: string): WebSearchResult[] | null {
    try {
      const cacheKey = this.generateCacheKey(query);
      const cachedData = localStorage.getItem(cacheKey);
      
      if (!cachedData) {
        return null;
      }
      
      const { results, timestamp } = JSON.parse(cachedData);
      const queryType = this.getQueryType(query);
      const expirationTime = this.EXPIRATION_TIMES[queryType];
      
      // 检查缓存是否过期
      if (Date.now() - timestamp > expirationTime) {
        // 缓存已过期，删除并返回null
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      console.log(`[SearchCacheService] 命中缓存: ${query}`);
      return results;
    } catch (error) {
      console.error('[SearchCacheService] 获取缓存失败:', error);
      return null;
    }
  }

  /**
   * 将搜索结果存入缓存
   * @param query 搜索查询
   * @param results 搜索结果
   */
  public setCache(query: string, results: WebSearchResult[]): void {
    try {
      const cacheKey = this.generateCacheKey(query);
      const cacheData = {
        results,
        timestamp: Date.now()
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log(`[SearchCacheService] 已缓存搜索结果: ${query}`);
    } catch (error) {
      console.error('[SearchCacheService] 缓存搜索结果失败:', error);
    }
  }

  /**
   * 清除特定查询的缓存
   * @param query 搜索查询
   */
  public clearCache(query: string): void {
    try {
      const cacheKey = this.generateCacheKey(query);
      localStorage.removeItem(cacheKey);
    } catch (error) {
      console.error('[SearchCacheService] 清除缓存失败:', error);
    }
  }

  /**
   * 清除所有搜索缓存
   */
  public clearAllCache(): void {
    try {
      // 获取所有localStorage键
      const keys = Object.keys(localStorage);
      
      // 筛选出搜索缓存键并删除
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_KEY_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
      
      console.log('[SearchCacheService] 已清除所有搜索缓存');
    } catch (error) {
      console.error('[SearchCacheService] 清除所有缓存失败:', error);
    }
  }
}

// 导出单例实例
export default new SearchCacheService(); 