import { dataService } from '../DataService';
import type { Assistant } from '../../types/Assistant';
import type { ChatTopic, Message } from '../../types';

/**
 * 兼容层模式
 */
export const CompatibilityMode = {
  DISABLED: 0,
  ENABLED: 1,
  ROLLBACK: 2
} as const;

export type CompatibilityModeType = typeof CompatibilityMode[keyof typeof CompatibilityMode];

/**
 * 旧版API调用拦截处理函数类型
 */
type InterceptorFunction = (...args: any[]) => Promise<any>;

/**
 * 兼容层 - 为旧版数据访问提供兼容接口
 * 允许应用平滑过渡到新数据架构
 */
export class CompatibilityLayer {
  private mode: CompatibilityModeType = CompatibilityMode.DISABLED;
  private interceptors: Map<string, InterceptorFunction> = new Map();
  
  constructor() {
    this.setupInterceptors();
  }
  
  /**
   * 设置API拦截器
   */
  private setupInterceptors(): void {
    // 以下是针对旧API的拦截处理函数
    this.interceptors.set('getMessages', this.interceptGetMessages.bind(this));
    this.interceptors.set('saveMessage', this.interceptSaveMessage.bind(this));
    this.interceptors.set('getAssistant', this.interceptGetAssistant.bind(this));
    this.interceptors.set('getTopics', this.interceptGetTopics.bind(this));
  }
  
  /**
   * 启用兼容层
   */
  public enable(): void {
    this.mode = CompatibilityMode.ENABLED;
    console.log('兼容层已启用');
    
    this.setupGlobalInterceptors();
  }
  
  /**
   * 启用回退模式
   */
  public enableRollbackMode(): void {
    this.mode = CompatibilityMode.ROLLBACK;
    console.log('兼容层已切换到回退模式');
    
    this.setupGlobalInterceptors();
  }
  
  /**
   * 禁用兼容层
   */
  public disable(): void {
    this.mode = CompatibilityMode.DISABLED;
    console.log('兼容层已禁用');
    
    // 移除全局拦截器
    // 实际实现取决于如何设置全局拦截
  }
  
  /**
   * 设置全局API拦截器
   */
  private setupGlobalInterceptors(): void {
    // 这个函数应该根据实际环境设置全局拦截
    // 例如，可能需要修补全局对象或特定服务
    
    // 例如：
    // if (window.oldChatApi) {
    //   const originalApi = { ...window.oldChatApi };
    //   
    //   for (const [method, handler] of this.interceptors.entries()) {
    //     if (typeof originalApi[method] === 'function') {
    //       window.oldChatApi[method] = async (...args: any[]) => {
    //         // 根据模式决定是否拦截
    //         if (this.mode === CompatibilityMode.DISABLED) {
    //           return originalApi[method](...args);
    //         }
    //         
    //         return handler(...args);
    //       };
    //     }
    //   }
    // }
  }
  
  /**
   * 拦截获取消息的请求
   */
  private async interceptGetMessages(topicId: string): Promise<Message[]> {
    try {
      // 从新数据存储获取话题
      const topic = await dataService.getTopic(topicId);
      
      if (!topic) {
        return [];
      }
      
      // 在回退模式下，可能需要从旧存储获取数据
      if (this.mode === CompatibilityMode.ROLLBACK) {
        // 这里应该实现从旧存储获取数据的逻辑
        // return oldStorage.getMessages(topicId);
      }
      
      return topic.messages || [];
    } catch (error) {
      console.error('兼容层拦截获取消息失败:', error);
      return [];
    }
  }
  
  /**
   * 拦截保存消息的请求
   */
  private async interceptSaveMessage(
    topicId: string,
    message: Message
  ): Promise<boolean> {
    try {
      // 获取当前话题
      const topic = await dataService.getTopic(topicId);
      
      if (!topic) {
        return false;
      }
      
      // 在回退模式下，保存到旧存储
      if (this.mode === CompatibilityMode.ROLLBACK) {
        // 这里应该实现保存到旧存储的逻辑
        // return oldStorage.saveMessage(topicId, message);
      }
      
      // 添加消息到话题
      topic.messages.push(message);
      
      // 更新最后消息时间
      if (topic.lastMessageTime !== undefined && message.timestamp) {
        topic.lastMessageTime = message.timestamp;
      }
      
      // 保存话题
      await dataService.saveTopic(topic);
      
      return true;
    } catch (error) {
      console.error('兼容层拦截保存消息失败:', error);
      return false;
    }
  }
  
  /**
   * 拦截获取助手的请求
   */
  private async interceptGetAssistant(assistantId: string): Promise<Assistant | null> {
    try {
      // 从新数据存储获取助手
      const assistant = await dataService.getAssistant(assistantId);
      
      // 在回退模式下，可能需要从旧存储获取数据
      if (!assistant && this.mode === CompatibilityMode.ROLLBACK) {
        // 这里应该实现从旧存储获取数据的逻辑
        // return oldStorage.getAssistant(assistantId);
      }
      
      return assistant || null;
    } catch (error) {
      console.error('兼容层拦截获取助手失败:', error);
      return null;
    }
  }
  
  /**
   * 拦截获取话题列表的请求
   */
  private async interceptGetTopics(): Promise<ChatTopic[]> {
    try {
      // 从新数据存储获取话题列表
      const topics = await dataService.getAllTopics();
      
      // 在回退模式下，可能需要从旧存储获取数据
      if (topics.length === 0 && this.mode === CompatibilityMode.ROLLBACK) {
        // 这里应该实现从旧存储获取数据的逻辑
        // return oldStorage.getTopics();
      }
      
      return topics;
    } catch (error) {
      console.error('兼容层拦截获取话题列表失败:', error);
      return [];
    }
  }
} 