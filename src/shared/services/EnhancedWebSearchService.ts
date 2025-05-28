import { v4 as uuidv4 } from 'uuid';
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
   * 获取格式化的当前时间
   * @returns {string} 格式化的当前时间，如"2023年11月30日 14:30"
   */
  private getFormattedCurrentTime(): string {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    return new Intl.DateTimeFormat('zh-CN', options).format(now);
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
      case 'local-duckduckgo':
        return await this.localDuckDuckGoSearch(provider, formattedQuery, websearch);
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
   * DuckDuckGo直接搜索实现 - 不使用API，直接向DuckDuckGo发送请求
   */
  private async localDuckDuckGoSearch(
    _provider: WebSearchProviderConfig,
    query: string,
    websearch: any
  ): Promise<WebSearchProviderResponse> {
    try {
      // 生成一个唯一的搜索标识符
      const searchId = `duckduckgo-${Date.now()}`;
      
      // 添加当前日期参数以获取最新结果
      const today = new Date().toISOString().split('T')[0];
      let enhancedQuery = query;
      
      // 检查是否是新闻类查询
      const isNewsQuery = query.includes('新闻') || 
                          query.includes('最新') || 
                          query.includes('今日') || 
                          query.includes('要闻') || 
                          query.includes('动态') ||
                          query.includes('news');
                          
      // 对于新闻类查询，添加时间限定和排序参数
      if (isNewsQuery) {
        enhancedQuery = `${query} ${today}`;
      }
      
      // 针对中国大陆新闻的优化
      if ((query.includes('中国') || query.includes('国内') || query.includes('大陆')) && isNewsQuery) {
        // 对中国相关查询添加地区限定和时间限定
        enhancedQuery = `${query} site:cn ${today}`;
      }
      
      // 添加时间戳参数防止缓存
      const timestamp = Date.now();
      
      // 构建DuckDuckGo的搜索URL，添加参数确保实时结果
      // kl=cn-zh 指定中文区域，kp=-2禁用安全搜索，kaf=1强制刷新，df为日期过滤
      const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(enhancedQuery)}&t=h_&ia=web&kl=cn-zh&kp=-2&kaf=1&df=${today}&_=${timestamp}`;
      
      // 创建一个后台请求以获取内容，避免CORS
      const eventSource = new EventSource(`/api/fetch?url=${encodeURIComponent(searchUrl)}&id=${searchId}&_t=${timestamp}`);
      
      return new Promise((resolve, reject) => {
        const results: WebSearchResult[] = [];
        let htmlContent = '';
        
        // 监听数据事件
        eventSource.onmessage = (event) => {
          try {
            htmlContent += event.data;
          } catch (error) {
            console.error('处理DuckDuckGo数据时出错:', error);
          }
        };
        
        // 监听结束事件
        eventSource.addEventListener('end', () => {
          try {
            eventSource.close();
            
            // 从HTML内容中解析结果
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            
            // 查找搜索结果元素 - 扩展选择器以适应不同的结果格式
            const resultElements = doc.querySelectorAll('.result, .web-result, .result__body, .nrn-react-div');
            
            if (resultElements.length === 0) {
              console.warn('未能从DuckDuckGo找到搜索结果元素');
              // 尝试备用选择器
              const alternativeResults = doc.querySelectorAll('article, .result-link, [data-testid="result"]');
              if (alternativeResults.length > 0) {
                extractResults(alternativeResults);
              } else {
                // 最后的备用方法：尝试查找所有可能的内容块
                const fallbackResults = doc.querySelectorAll('div > h2, .link-text');
                if (fallbackResults.length > 0) {
                  extractFallbackResults(fallbackResults);
                }
              }
            } else {
              extractResults(resultElements);
            }
            
            // 提取结果辅助函数
            function extractResults(elements: NodeListOf<Element>) {
              Array.from(elements).slice(0, websearch.maxResults || 5).forEach((element, index) => {
                const titleElement = element.querySelector('.result__title, .web-result__title, h2, h3, .title');
                const linkElement = element.querySelector('.result__url, .web-result__url, a[href], .link');
                const snippetElement = element.querySelector('.result__snippet, .web-result__snippet, .snippet, .description');
                
                if (titleElement && linkElement) {
                  // 优先使用href属性，如果没有则尝试文本内容
                  const url = (linkElement as HTMLAnchorElement).href || 
                              linkElement.getAttribute('href') || 
                              linkElement.textContent?.trim() || 
                              'https://duckduckgo.com';
                              
                  // 提取和解析日期信息
                  const dateMatch = element.textContent?.match(/(\d{4}[.-]\d{1,2}[.-]\d{1,2})|(\d{1,2}[.-]\d{1,2}[.-]\d{4})/);
                  const dateStr = dateMatch ? dateMatch[0] : '';
                  const pubDate = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();
                  
                  // 检查URL是否来自中国网站
                  const isChinaSource = url.includes('.cn/') || 
                                       url.includes('.com.cn') || 
                                       url.includes('sina.com') || 
                                       url.includes('sohu.com') || 
                                       url.includes('163.com') ||
                                       url.includes('qq.com') ||
                                       url.includes('peopledaily') ||
                                       url.includes('xinhuanet') ||
                                       url.includes('chinanews');
                  
                  results.push({
                    id: `duckduckgo-${index}-${Date.now()}`,
                    title: titleElement.textContent?.trim() || 'DuckDuckGo Result',
                    url: url,
                    snippet: snippetElement?.textContent?.trim() || '',
                    timestamp: pubDate, // 使用提取的日期或当前时间
                    provider: 'duckduckgo',
                    weight: isChinaSource && isNewsQuery ? 100 : 1 // 给中国新闻来源更高的权重
                  } as WebSearchResult);
                }
              });
            }
            
            // 提取备用结果
            function extractFallbackResults(elements: NodeListOf<Element>) {
              let count = 0;
              elements.forEach((element) => {
                if (count >= (websearch.maxResults || 5)) return;
                
                if (element.textContent && element.textContent.length > 10) {
                  const parentLink = findParentLink(element);
                  if (parentLink) {
                    // 检查URL是否来自中国网站
                    const isChinaSource = parentLink.includes('.cn/') || 
                                         parentLink.includes('.com.cn') || 
                                         parentLink.includes('sina.com') || 
                                         parentLink.includes('sohu.com') || 
                                         parentLink.includes('163.com') ||
                                         parentLink.includes('qq.com') ||
                                         parentLink.includes('peopledaily') ||
                                         parentLink.includes('xinhuanet') ||
                                         parentLink.includes('chinanews');
                                         
                    results.push({
                      id: `duckduckgo-fallback-${count}-${Date.now()}`,
                      title: element.textContent.trim(),
                      url: parentLink,
                      snippet: element.nextElementSibling?.textContent?.trim() || '',
                      timestamp: new Date().toISOString(),
                      provider: 'duckduckgo',
                      weight: isChinaSource && isNewsQuery ? 100 : 1 // 给中国新闻来源更高的权重
                    } as WebSearchResult);
                    count++;
                  }
                }
              });
            }
            
            // 查找父元素中的链接
            function findParentLink(element: Element, depth = 0): string {
              if (depth > 5) return ''; // 防止无限递归
              
              const parent = element.parentElement;
              if (!parent) return '';
              
              if (parent.tagName === 'A' && parent.hasAttribute('href')) {
                return parent.getAttribute('href') || '';
              }
              
              const link = parent.querySelector('a[href]');
              if (link) {
                return link.getAttribute('href') || '';
              }
              
              return findParentLink(parent, depth + 1);
            }
            
            // 如果没有找到结果，尝试备用解析方法
            if (results.length === 0) {
              const links = doc.querySelectorAll('a[href^="https://"]');
              let count = 0;
              
              links.forEach((link) => {
                if (count >= (websearch.maxResults || 5)) return;
                
                const url = link.getAttribute('href');
                if (url && !url.includes('duckduckgo.com') && 
                    !url.includes('duck.com') && 
                    link.textContent && 
                    link.textContent.length > 10) {
                  
                  // 优先选择中国域名网站的结果
                  const isChinaSource = url.includes('.cn/') || 
                                      url.includes('.com.cn') || 
                                      url.includes('sina.com') || 
                                      url.includes('sohu.com') || 
                                      url.includes('163.com') ||
                                      url.includes('qq.com') ||
                                      url.includes('peopledaily') ||
                                      url.includes('xinhuanet') ||
                                      url.includes('chinanews') ||
                                      url.includes('cctv.com');
                                      
                  results.push({
                    id: `duckduckgo-fallback-${count}-${Date.now()}`,
                    title: link.textContent.trim(),
                    url: url,
                    snippet: link.getAttribute('title') || '',
                    timestamp: new Date().toISOString(),
                    provider: 'duckduckgo',
                    // 给中国来源更高的权重
                    weight: isChinaSource && isNewsQuery ? 100 : 1
                  } as WebSearchResult);
                  
                  count++;
                }
              });
              
              // 按权重排序结果
              results.sort((a, b) => (b as any).weight - (a as any).weight);
            }
            
            console.log(`[EnhancedWebSearchService] DuckDuckGo搜索返回 ${results.length} 条结果`);
            resolve({ results });
          } catch (error) {
            console.error('解析DuckDuckGo结果时出错:', error);
            reject(new Error(`解析DuckDuckGo结果时出错: ${error instanceof Error ? error.message : String(error)}`));
          }
        });
        
        // 监听错误
        eventSource.onerror = (error) => {
          eventSource.close();
          console.error('DuckDuckGo搜索请求失败:', error);
          reject(new Error('DuckDuckGo搜索请求失败'));
        };
        
        // 设置超时
        setTimeout(() => {
          if (eventSource.readyState !== EventSource.CLOSED) {
            eventSource.close();
            if (results.length > 0) {
              console.warn('[EnhancedWebSearchService] DuckDuckGo搜索超时，但已获取部分结果');
              resolve({ results });
            } else {
              reject(new Error('DuckDuckGo搜索请求超时'));
            }
          }
        }, 15000); // 15秒超时
      });
    } catch (error) {
      console.error('DuckDuckGo搜索失败:', error);
      throw new Error(`DuckDuckGo搜索失败: ${error instanceof Error ? error.message : String(error)}`);
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
      
      // 获取当前格式化时间
      const currentTime = this.getFormattedCurrentTime();
      
      // 将当前时间添加到每个搜索结果的时间戳中
      const resultsWithTime = response.results.map(result => ({
        ...result,
        timestamp: currentTime, // 使用格式化的时间替换ISO时间戳
        formattedTime: currentTime // 添加格式化的时间字段
      }));

      return resultsWithTime;

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
