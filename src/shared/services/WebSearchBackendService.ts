import EnhancedWebSearchService from './EnhancedWebSearchService';
import { ApiProviderRegistry } from './messages/ApiProvider';
import { TopicService } from './TopicService';
import { createUserMessage, createAssistantMessage } from '../utils/messageUtils';
import { MessageBlockType as MessageBlockTypeEnum, MessageBlockStatus as MessageBlockStatusEnum, AssistantMessageStatus } from '../types/newMessage';
import type { MessageBlock, MainTextMessageBlock, MessageBlockStatus } from '../types/newMessage';
import { categorizeSearchResults, getNonEmptyCategories } from '../utils/SearchResultCategoryUtils';
import { dexieStorage } from './DexieStorageService';
import SearchCacheService from './SearchCacheService';
import type { WebSearchResult, WebSearchProviderConfig } from '../types';
import store from '../store';
import { newMessagesActions } from '../store/slices/newMessagesSlice';
import { generateNewsSummary, generateDetailedNewsSummary } from '../utils/NewsSummaryGenerator';
import { updateOneBlock as updateMessageBlockAction, upsertManyBlocks as upsertManyMessageBlocksAction } from '../store/slices/messageBlocksSlice';

// 搜索进度状态类型
export type SearchProgressStatus =
  | 'preparing'   // 准备搜索
  | 'searching'   // 搜索中
  | 'cached'      // 使用缓存结果
  | 'processing'  // 处理结果中
  | 'generating'  // 生成回答中
  | 'completed'   // 完成
  | 'error';      // 错误

// 搜索进度回调函数类型
export type SearchProgressCallback = (status: SearchProgressStatus, message?: string) => void;

/**
 * 后台搜索服务
 * 用于处理搜索结果和AI调用的集成，添加实时时间信息
 */
class WebSearchBackendService {
  // 状态更新节流计时器
  private updateThrottleTimer: ReturnType<typeof setTimeout> | null = null;
  // 节流延迟时间（毫秒）
  private readonly THROTTLE_DELAY = 500;
  // 存储中止信号的映射
  private abortSignals: Map<string, AbortController> = new Map();
  // 是否暂停
  private isPaused: boolean = false;

  /**
   * 创建中止控制器并存储
   * @param key 键名，通常是消息ID
   * @returns AbortSignal对象
   */
  createAbortSignal(key: string): AbortSignal {
    // 如果已存在，先中止旧的
    if (this.abortSignals.has(key)) {
      this.abortSignals.get(key)?.abort();
    }
    
    // 创建新的中止控制器
    const controller = new AbortController();
    this.abortSignals.set(key, controller);
    return controller.signal;
  }

  /**
   * 获取当前的WebSearch状态
   * @returns WebSearch状态对象
   */
  private getWebSearchState() {
    return store.getState().webSearch;
  }

  /**
   * 获取格式化的当前时间
   * @returns 格式化的时间字符串
   */
  private getFormattedCurrentTime(): string {
    const now = new Date();
    return now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  /**
   * 获取搜索提供商配置
   * @param providerId 提供商ID 
   * @returns 提供商配置对象或undefined
   */
  private getWebSearchProvider(providerId?: string): WebSearchProviderConfig | undefined {
    const state = this.getWebSearchState();
    if (!providerId || !state.providers) return undefined;
    return state.providers.find((p: WebSearchProviderConfig) => p.id === providerId);
  }

  /**
   * 执行搜索
   * @param provider 提供商配置
   * @param query 搜索查询
   * @param httpOptions HTTP选项
   * @returns 搜索结果
   */
  private async search(
    provider: WebSearchProviderConfig,
    query: string,
    httpOptions?: RequestInit
  ): Promise<{ results: WebSearchResult[] }> {
    // 委托给EnhancedWebSearchService处理实际的搜索
    return EnhancedWebSearchService.search(provider, query, httpOptions);
  }

  /**
   * 获取格式化的当前时间文本描述
   * @returns {string} 格式化的当前时间描述，例如"现在的时间是2023年11月30日 14:30"
   */
  private getTimeDescription(): string {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'long',
      hour12: false
    };
    const formattedDate = new Intl.DateTimeFormat('zh-CN', options).format(now);
    return `现在的时间是${formattedDate}。`;
  }

  /**
   * 过滤并优化搜索结果，确保优先展示最新内容
   * @param results 原始搜索结果
   * @param isNewsQuery 是否是新闻类查询
   * @returns 优化后的搜索结果
   */
  private optimizeSearchResults(results: WebSearchResult[], isNewsQuery: boolean = false): WebSearchResult[] {
    if (!results || results.length === 0) {
      return [];
    }

    // 如果是新闻类查询，尝试从URL和内容中识别日期，优先返回最新内容
    if (isNewsQuery) {
      // 为结果添加推断的日期
      const resultsWithDates = results.map(result => {
        // 尝试从URL和文本中识别日期
        const dateFromUrl = this.extractDateFromUrl(result.url);
        const dateFromText = this.extractDateFromText(result.snippet);
        
        // 使用找到的最新日期
        const inferredDate = dateFromUrl && dateFromText 
          ? (dateFromUrl > dateFromText ? dateFromUrl : dateFromText)
          : (dateFromUrl || dateFromText || new Date(0));
        
        return {
          ...result,
          inferredDate
        };
      });
      
      // 按照推断日期排序，最新的优先
      return resultsWithDates
        .sort((a, b) => b.inferredDate.getTime() - a.inferredDate.getTime())
        .map(({ inferredDate, ...result }) => result);
    }
    
    // 不是新闻类查询，返回原始结果
    return results;
  }
  
  /**
   * 从URL中提取日期
   * @param url 网页URL
   * @returns 提取的日期对象，如果没找到则返回null
   */
  private extractDateFromUrl(url: string): Date | null {
    try {
      // 常见的日期模式:
      // yyyy/mm/dd, yyyy-mm-dd, yyyy_mm_dd
      const datePatterns = [
        /\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//, // 年/月/日
        /\/(\d{4})-(\d{1,2})-(\d{1,2})\//, // 年-月-日
        /\/(\d{4})_(\d{1,2})_(\d{1,2})\//, // 年_月_日
        /[/-_](\d{4})[-/_](\d{1,2})[-/_](\d{1,2})/ // 年 月 日 (分隔符为 / - 或 _)
      ];
      
      for (const pattern of datePatterns) {
        const match = url.match(pattern);
        if (match) {
          const [_, year, month, day] = match;
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          
          // 验证日期有效性
          if (!isNaN(date.getTime()) && date.getFullYear() >= 2000) {
            return date;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('从URL提取日期时出错:', error);
      return null;
    }
  }
  
  /**
   * 从文本中提取日期
   * @param text 文本内容
   * @returns 提取的日期对象，如果没找到则返回null
   */
  private extractDateFromText(text: string): Date | null {
    try {
      if (!text) return null;
      
      // 尝试匹配各种日期格式
      const patterns = [
        // 中文日期: 2023年10月1日
        /(\d{4})年(\d{1,2})月(\d{1,2})日/,
        // ISO格式: 2023-10-01
        /(\d{4})-(\d{1,2})-(\d{1,2})/,
        // 美式: 10/01/2023 或欧式: 01/10/2023 (需要上下文判断)
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
        // 长格式带时间: 2023年10月1日 14:30
        /(\d{4})年(\d{1,2})月(\d{1,2})日\s+\d{1,2}:\d{1,2}/
      ];
      
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          // 根据不同格式处理提取到的日期
          if (pattern.toString().includes('年')) {
            // 中文格式
            const [_, year, month, day] = match;
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } else if (pattern.toString().includes('-')) {
            // ISO格式
            const [_, year, month, day] = match;
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } else if (pattern.toString().includes('/')) {
            // 美式或欧式 - 假设是美式 MM/DD/YYYY
            const [_, first, second, year] = match;
            // 简单验证月份
            if (parseInt(first) <= 12) {
              return new Date(parseInt(year), parseInt(first) - 1, parseInt(second));
            }
          }
        }
      }
      
      // 尝试识别"今天"、"昨天"等相对日期
      const today = new Date();
      if (text.includes('今天') || text.includes('today')) {
        return today;
      } else if (text.includes('昨天') || text.includes('yesterday')) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday;
      } else if (text.includes('前天')) {
        const dayBeforeYesterday = new Date(today);
        dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
        return dayBeforeYesterday;
      } else if (text.includes('本周') || text.includes('this week')) {
        const thisWeek = new Date(today);
        thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay());
        return thisWeek;
      }
      
      return null;
    } catch (error) {
      console.error('从文本提取日期时出错:', error);
      return null;
    }
  }

  /**
   * 判断是否为新闻类查询
   * @param query 用户查询文本
   * @returns 是否为新闻查询
   */
  private isNewsQuery(query: string): boolean {
    const newsKeywords = [
      '新闻', '消息', '报道', '最新', '最近', '今日', '头条', '时事',
      '要闻', '国内', '国际', '社会', '财经', '科技', '体育', '娱乐',
      '时讯', '简讯', '简报', '快讯', '动态', '热点', '热搜', '热门',
      '新鲜事', '大事件', '重要', '公告', '通知', '播报',
      'news', 'latest', 'today', 'headlines', 'breaking', 'recent', 'update'
    ];
    
    const lowerQuery = query.toLowerCase();
    return newsKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  /**
   * 更新助手消息状态和内容（带节流控制）
   * @param _messageId 消息ID
   * @param blockId 块ID
   * @param content 内容
   * @param status 状态
   * @param immediate 是否立即更新，默认为false（使用节流）
   */
  private async updateMessageState(
    _messageId: string,
    blockId: string,
    content: string,
    status: MessageBlockStatus = MessageBlockStatusEnum.PROCESSING,
    immediate: boolean = false
  ): Promise<void> {
    try {
      // 如果设置为立即更新或是最终状态，则立即执行更新
      if (immediate || status === MessageBlockStatusEnum.SUCCESS || status === MessageBlockStatusEnum.ERROR) {
        await dexieStorage.updateMessageBlock(blockId, {
          content,
          status
        });
        
        console.log(`[WebSearchBackendService] 消息状态更新: ${content.substring(0, 50)}...`);
        return;
      }
      
      // 否则使用节流控制，防止频繁更新
      if (this.updateThrottleTimer) {
        clearTimeout(this.updateThrottleTimer);
      }
      
      this.updateThrottleTimer = setTimeout(async () => {
        await dexieStorage.updateMessageBlock(blockId, {
          content,
          status
        });
        
        console.log(`[WebSearchBackendService] 消息状态更新(节流): ${content.substring(0, 50)}...`);
        this.updateThrottleTimer = null;
      }, this.THROTTLE_DELAY);
    } catch (error) {
      console.error('[WebSearchBackendService] 更新消息状态失败:', error);
    }
  }

  /**
   * 处理搜索请求并直接发送给AI处理
   * 在后台完成整个流程，无需前端中转
   * @param query 用户查询内容
   * @param topicId 当前话题ID
   * @param modelId 使用的模型ID
   * @param model 模型信息
   * @param progressCallback 搜索进度回调函数，用于通知前端当前搜索状态
   */
  public async processSearchAndSendToAI(
    query: string, 
    topicId: string, 
    modelId?: string,
    model?: any,
    progressCallback?: SearchProgressCallback
  ): Promise<{ userMessageId: string, assistantMessageId: string }> {
    if (progressCallback) progressCallback('preparing', `准备搜索: ${query}`);
    
    const topic = await dexieStorage.getTopic(topicId);
    if (!topic) throw new Error(`Topic with ID ${topicId} not found`);

    const { message: userMessage, blocks: userBlocks } = createUserMessage({
      content: query, assistantId: topic.assistantId, topicId: topicId, modelId: modelId, model: model
    });
    await TopicService.saveMessageAndBlocks(userMessage, userBlocks);

    const { message: assistantMessage, blocks: initialAssistantBlocks } = createAssistantMessage({
      assistantId: topic.assistantId, topicId: topicId, askId: userMessage.id, modelId: modelId, model: model,
      status: AssistantMessageStatus.SEARCHING 
    });

    let mainTextBlockInitial = initialAssistantBlocks.find(
      (block): block is MainTextMessageBlock => 
        block.type === MessageBlockTypeEnum.MAIN_TEXT
    );

    if (mainTextBlockInitial) {
      mainTextBlockInitial.content = "🔍 正在搜索..."; 
      mainTextBlockInitial.status = MessageBlockStatusEnum.PROCESSING;
    }
    await TopicService.saveMessageAndBlocks(assistantMessage, JSON.parse(JSON.stringify(initialAssistantBlocks)));

    store.dispatch(newMessagesActions.updateMessage({
      id: assistantMessage.id,
      changes: { blocks: initialAssistantBlocks.map(b => b.id), status: AssistantMessageStatus.SEARCHING }
    }));
    store.dispatch(upsertManyMessageBlocksAction(JSON.parse(JSON.stringify(initialAssistantBlocks))));
    
    const mainTextBlockIdToUpdate = mainTextBlockInitial?.id;

    const updateMainBlockAndMessageStatus = (
      blockContent: string, 
      blockStatus: MessageBlockStatus,
      assistantStatus?: AssistantMessageStatus
    ) => {
      if (mainTextBlockIdToUpdate) {
        store.dispatch(updateMessageBlockAction({
          id: mainTextBlockIdToUpdate,
          changes: { content: blockContent, status: blockStatus }
        }));
      }
      if (assistantStatus) {
        store.dispatch(newMessagesActions.updateMessage({
          id: assistantMessage.id,
          changes: { status: assistantStatus }
        }));
      }
    };

    try {
      const cachedResults = SearchCacheService.getCache(query);
      let searchResults;
      
      if (cachedResults) {
        console.log(`[WebSearchBackendService] 使用缓存的搜索结果: ${query}`);
        searchResults = cachedResults;
        if (progressCallback) progressCallback('cached', '从缓存获取搜索结果');
        updateMainBlockAndMessageStatus("⚡ 从缓存中获取到搜索结果，正在处理...", MessageBlockStatusEnum.PROCESSING);
      } else {
        console.log(`[WebSearchBackendService] 执行新的网络搜索: ${query}`);
        if (progressCallback) progressCallback('searching', '正在网络搜索中...');
        updateMainBlockAndMessageStatus("🔍 正在搜索网络，这可能需要几秒钟...", MessageBlockStatusEnum.PROCESSING);
        
        searchResults = await EnhancedWebSearchService.searchWithStatus(
          query, topicId, assistantMessage.id
        );
        if (searchResults && searchResults.length > 0) {
          SearchCacheService.setCache(query, searchResults);
        }
      }

      const isNewsType = this.isNewsQuery(query);
      const optimizedResults = this.optimizeSearchResults(searchResults, isNewsType);
      const timeDescription = this.getTimeDescription();

      if (!optimizedResults || optimizedResults.length === 0) {
        if (progressCallback) progressCallback('completed', '未找到相关搜索结果');
        const noResultsMessage = `${timeDescription}\n\n⚠️ 无法找到相关的搜索结果。我将尝试根据我已有的知识回答您的问题。`;
        updateMainBlockAndMessageStatus(noResultsMessage, MessageBlockStatusEnum.SUCCESS, AssistantMessageStatus.SUCCESS);
        return { userMessageId: userMessage.id, assistantMessageId: assistantMessage.id };
      }

      if (isNewsType && query.includes('新闻') && optimizedResults.length >= 3) {
        if (progressCallback) progressCallback('processing', '正在生成新闻摘要...');
        
        // 新增：明确提示正在生成
        updateMainBlockAndMessageStatus("📝 正在为您整理新闻摘要...", MessageBlockStatusEnum.PROCESSING);

        let newsContent = query.includes('详细') 
            ? generateDetailedNewsSummary(optimizedResults)
            : generateNewsSummary(optimizedResults, query);
        
        // 移除之前尝试的多次调用，只保留这一次更新，确保是最终状态和内容
        updateMainBlockAndMessageStatus(newsContent, MessageBlockStatusEnum.SUCCESS, AssistantMessageStatus.SUCCESS);
        if (progressCallback) progressCallback('completed', '新闻摘要已生成');
        
        return { userMessageId: userMessage.id, assistantMessageId: assistantMessage.id };
      }

      if (progressCallback) progressCallback('processing', '正在处理搜索结果...');
      const categorizedResults = categorizeSearchResults(optimizedResults);
      const nonEmptyCategories = getNonEmptyCategories(categorizedResults);
      const summaryText = nonEmptyCategories.map(category => {
        const catResults = categorizedResults[category].slice(0, 3);
        return `**${category}**\n${catResults.map((result, idx) => 
          `${idx + 1}. ${result.title}: ${result.snippet}`).join('\n')}`;
      }).join('\n\n');
      
      if (progressCallback) progressCallback('generating', '正在生成AI回答...');
      updateMainBlockAndMessageStatus("🧠 搜索完成，正在生成回答...", MessageBlockStatusEnum.PROCESSING);
      
      const provider = ApiProviderRegistry.get(model);
      if (!provider) throw new Error(`无法获取模型 ${modelId} 的API提供商`);
      
      const topicMessages = await dexieStorage.getTopicMessages(topicId);
      const chatMessages = [];
      for (const msg of topicMessages) {
        if (msg.id === assistantMessage.id) continue;
        chatMessages.push({ 
          id: msg.id, role: msg.role, 
          content: msg.role === 'user' && msg.id === userMessage.id ? query : '', 
          assistantId: msg.assistantId, topicId: msg.topicId, createdAt: msg.createdAt, 
          status: msg.status, blocks: msg.blocks || [] 
        });
      }
      chatMessages.push({
        id: userMessage.id, role: userMessage.role, content: query, 
        assistantId: userMessage.assistantId, topicId: topicId, 
        createdAt: userMessage.createdAt, status: userMessage.status, blocks: userMessage.blocks || []
      });

      let promptForAI = `${timeDescription}\n\n请根据以下网络搜索结果为用户提供准确、全面的回答。\n\n用户问题: ${query}\n\n搜索结果:\n${summaryText}\n\n注意事项:\n1. 请直接回答问题，不需要引用"搜索结果显示"之类的表述\n2. 如果搜索结果不足以回答问题，请结合你已有的知识\n3. 回答应简洁明了，重点突出\n4. 如有必要，请组织信息使其更有条理性`;

      const response = await provider.sendChatMessage(chatMessages, {
        systemPrompt: promptForAI, enableTools: false,
      });

      let finalContent = '';
      if (typeof response === 'string') finalContent = response;
      else if (response && typeof response === 'object' && 'content' in response) finalContent = response.content;

      if (progressCallback) progressCallback('completed', '搜索完成，已生成回答');
      updateMainBlockAndMessageStatus(finalContent, MessageBlockStatusEnum.SUCCESS, AssistantMessageStatus.SUCCESS);

      return { userMessageId: userMessage.id, assistantMessageId: assistantMessage.id };
    } catch (error) {
      console.error('[WebSearchBackendService] 处理搜索失败:', error);
      if (progressCallback) progressCallback('error', `搜索出错: ${error instanceof Error ? error.message : String(error)}`);
      const errorContent = `搜索处理过程中出现错误: ${error instanceof Error ? error.message : String(error)}`;
      updateMainBlockAndMessageStatus(errorContent, MessageBlockStatusEnum.ERROR, AssistantMessageStatus.ERROR);
      return { userMessageId: userMessage.id, assistantMessageId: assistantMessage.id };
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
      
      // 对于中国大陆新闻查询，添加特定的处理
      let enhancedQuery = query;
      if ((query.includes('中国') || query.includes('国内') || query.includes('大陆')) &&
          (query.includes('新闻') || query.includes('最新'))) {
        // 如果是中国大陆新闻相关查询，添加额外关键词
        const timestamp = Date.now();
        enhancedQuery = `${query} 最新报道 ${timestamp}`;
        console.log(`[WebSearchBackendService] 中国大陆新闻查询增强: "${enhancedQuery}"`);
      }
      
      // 添加防缓存参数
      const cacheBreaker = `_nocache=${Date.now()}`;
      
      // 执行搜索，添加防缓存参数
      const response = await this.search(provider, enhancedQuery, { 
        headers: { 
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Cache-Breaker': cacheBreaker
        }
      });
      
      // 获取当前格式化时间
      const currentTime = this.getFormattedCurrentTime();
      
      // 将当前时间添加到每个搜索结果的时间戳中
      const resultsWithTime = response.results.map(result => ({
        ...result,
        timestamp: currentTime, // 使用格式化的时间替换ISO时间戳
        formattedTime: currentTime // 添加格式化的时间字段
      }));
      
      // 立即更新到UI，不等待下一次状态更新
      if (resultsWithTime.length > 0) {
        // 查找主文本块来更新
        const blocks = await dexieStorage.getMessageBlocks(messageId);
        const mainTextBlock = blocks.find((block: MessageBlock) => block.type === MessageBlockTypeEnum.MAIN_TEXT);
        
        if (mainTextBlock && 'content' in mainTextBlock) {
          // 更新为"已找到最新结果"
          await this.updateMessageState(
            messageId,
            mainTextBlock.id,
            `✅ 已找到 ${resultsWithTime.length} 条最新搜索结果，正在处理...`,
            MessageBlockStatusEnum.PROCESSING,
            true // 立即更新
          );
        }
      }

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
}

// 导出单例实例
export default new WebSearchBackendService(); 
