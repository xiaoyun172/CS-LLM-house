import type { ChatTopic } from '../types';
import { DataAdapter } from './DataAdapter';
import { TopicService } from './TopicService';

/**
 * 话题统计服务
 * 提供统一的话题统计和有效性验证功能
 */
export class TopicStatsService {
  /**
   * 验证话题是否有效
   * @param topic 话题对象
   * @returns 是否为有效话题
   */
  static isValidTopic(topic: ChatTopic): boolean {
    // 检查话题是否有基本必要字段
    const hasBasicFields = topic && topic.id && topic.title;
    
    // 检查是否包含消息或最后消息时间（表示曾经使用过）
    const hasMessages = Array.isArray(topic.messages) && topic.messages.length > 0;
    const hasActivity = Boolean(topic.lastMessageTime);
    
    // 有效话题必须有基本字段，且拥有消息或有活动记录
    return Boolean(hasBasicFields && (hasMessages || hasActivity));
  }

  /**
   * 获取有效话题列表
   * @param topics 话题列表
   * @returns 有效话题列表
   */
  static getValidTopics(topics: ChatTopic[]): ChatTopic[] {
    return topics.filter(topic => this.isValidTopic(topic));
  }

  /**
   * 获取所有话题，包括有效和无效话题的数量统计
   * @returns 返回话题统计信息
   */
  static async getTopicsStats(): Promise<{
    totalCount: number;
    validCount: number;
    invalidCount: number;
    validTopics: ChatTopic[];
    invalidTopics: ChatTopic[];
    byAssistantId: Record<string, number>;
  }> {
    let topics: ChatTopic[] = [];
    
    try {
      // 优先使用TopicService获取话题
      topics = await TopicService.getAllTopics();
    } catch (error) {
      console.error('通过TopicService获取话题失败，尝试通过DataAdapter获取', error);
      
      try {
        // 备选方案：使用DataAdapter
        const adapter = DataAdapter.getInstance();
        topics = await adapter.getAllTopics();
      } catch (adapterError) {
        console.error('通过DataAdapter获取话题失败', adapterError);
        // 如果两种方式都失败，返回空结果
        return {
          totalCount: 0,
          validCount: 0,
          invalidCount: 0,
          validTopics: [],
          invalidTopics: [],
          byAssistantId: {}
        };
      }
    }
    
    // 区分有效和无效话题
    const validTopics = topics.filter(t => this.isValidTopic(t));
    const invalidTopics = topics.filter(t => !this.isValidTopic(t));
    
    // 按助手ID统计话题数量
    const byAssistantId: Record<string, number> = {};
    
    validTopics.forEach(topic => {
      // 使用可选链和类型断言处理可能不存在的assistantId
      const assistantId = (topic as any).assistantId || '';
      if (assistantId) {
        byAssistantId[assistantId] = (byAssistantId[assistantId] || 0) + 1;
      }
    });
    
    return {
      totalCount: topics.length,
      validCount: validTopics.length,
      invalidCount: invalidTopics.length,
      validTopics,
      invalidTopics,
      byAssistantId
    };
  }
  
  /**
   * 获取特定助手的话题统计
   * @param assistantId 助手ID
   * @returns 该助手的话题统计
   */
  static async getAssistantTopicsStats(assistantId: string): Promise<{
    totalCount: number;
    validCount: number;
    topics: ChatTopic[];
  }> {
    const stats = await this.getTopicsStats();
    
    // 过滤指定助手的话题
    const assistantTopics = stats.validTopics.filter(
      topic => (topic as any).assistantId === assistantId
    );
    
    return {
      totalCount: assistantTopics.length,
      validCount: assistantTopics.length,
      topics: assistantTopics
    };
  }
  
  /**
   * 清理无效话题
   * @returns 清理结果，包含删除的话题数量
   */
  static async cleanupInvalidTopics(): Promise<{
    removed: number;
    total: number;
  }> {
    const stats = await this.getTopicsStats();
    
    if (stats.invalidCount === 0) {
      return { removed: 0, total: stats.totalCount };
    }
    
    const adapter = DataAdapter.getInstance();
    let removedCount = 0;
    
    // 删除无效话题
    for (const topic of stats.invalidTopics) {
      try {
        if (topic.id) {
          await adapter.deleteTopic(topic.id);
          removedCount++;
        }
      } catch (error) {
        console.error(`删除无效话题 ${topic.id} 失败:`, error);
      }
    }
    
    return {
      removed: removedCount,
      total: stats.totalCount - removedCount
    };
  }
} 