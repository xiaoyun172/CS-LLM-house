import { DataService } from '../DataService';
import { TopicService } from '../TopicService';
import type { ChatTopic } from '../../types';
import { getDefaultTopic } from './types';
import { AssistantManager } from './AssistantManager';

// 获取DataService实例
const dataService = DataService.getInstance();

/**
 * 话题关联管理服务 - 负责助手与话题之间的关联关系管理
 */
export class TopicManager {
  /**
   * 添加话题到助手
   */
  static async addTopicToAssistant(assistantId: string, topicId: string): Promise<boolean> {
    try {
      console.log(`尝试将话题 ${topicId} 添加到助手 ${assistantId}`);

      // 获取助手
      const assistant = await dataService.getAssistant(assistantId);
      if (!assistant) {
        console.error(`助手 ${assistantId} 不存在`);
        return false;
      }

      // 获取话题
      const topic = await TopicService.getTopicById(topicId);
      if (!topic) {
        console.error(`话题 ${topicId} 不存在`);
        return false;
      }

      // 确保topicIds是数组
      const topicIds = Array.isArray(assistant.topicIds) ? assistant.topicIds : [];

      // 检查是否已包含该话题
      if (topicIds.includes(topicId)) {
        console.log(`助手 ${assistantId} 已包含话题 ${topicId}`);
        return true;
      }

      // 更新助手
      const updatedAssistant = {
        ...assistant,
        topicIds: [...topicIds, topicId]
      };

      // 保存更新后的助手
      const success = await AssistantManager.updateAssistant(updatedAssistant);
      
      if (success) {
        console.log(`成功将话题 ${topicId} 添加到助手 ${assistantId}`);
      } else {
        console.error(`无法将话题 ${topicId} 添加到助手 ${assistantId}`);
      }

      return success;
    } catch (error) {
      console.error(`添加话题到助手失败: ${error}`);
      return false;
    }
  }

  /**
   * 从助手移除话题
   */
  static async removeTopicFromAssistant(assistantId: string, topicId: string): Promise<boolean> {
    try {
      console.log(`尝试从助手 ${assistantId} 移除话题 ${topicId}`);

      // 获取助手
      const assistant = await dataService.getAssistant(assistantId);
      if (!assistant) {
        console.error(`助手 ${assistantId} 不存在`);
        return false;
      }

      // 确保topicIds是数组
      const topicIds = Array.isArray(assistant.topicIds) ? assistant.topicIds : [];

      // 检查是否包含该话题
      if (!topicIds.includes(topicId)) {
        console.log(`助手 ${assistantId} 不包含话题 ${topicId}`);
        return true;
      }

      // 更新助手
      const updatedAssistant = {
        ...assistant,
        topicIds: topicIds.filter(id => id !== topicId)
      };

      // 保存更新后的助手
      const success = await AssistantManager.updateAssistant(updatedAssistant);
      
      if (success) {
        console.log(`成功从助手 ${assistantId} 移除话题 ${topicId}`);
      } else {
        console.error(`无法从助手 ${assistantId} 移除话题 ${topicId}`);
      }

      return success;
    } catch (error) {
      console.error(`从助手移除话题失败: ${error}`);
      return false;
    }
  }

  /**
   * 获取助手的话题ID列表
   */
  static async getAssistantTopics(assistantId: string): Promise<string[]> {
    try {
      // 获取助手
      const assistant = await dataService.getAssistant(assistantId);
      if (!assistant) {
        console.error(`助手 ${assistantId} 不存在`);
        return [];
      }

      // 确保topicIds是数组
      return Array.isArray(assistant.topicIds) ? assistant.topicIds : [];
    } catch (error) {
      console.error(`获取助手话题列表失败: ${error}`);
      return [];
    }
  }

  /**
   * 清空助手的所有话题
   */
  static async clearAssistantTopics(assistantId: string): Promise<boolean> {
    try {
      console.log(`尝试清空助手 ${assistantId} 的话题`);

      // 获取助手
      const assistant = await dataService.getAssistant(assistantId);
      if (!assistant) {
        console.error(`助手 ${assistantId} 不存在`);
        return false;
      }

      // 获取原有话题ID列表以备通知
      const originalTopicIds = Array.isArray(assistant.topicIds) ? assistant.topicIds : [];

      // 更新助手
      const updatedAssistant = {
        ...assistant,
        topicIds: []
      };

      // 保存更新后的助手
      const success = await AssistantManager.updateAssistant(updatedAssistant);
      
      if (success) {
        console.log(`成功清空助手 ${assistantId} 的话题`);
        
        // 发送事件通知其他组件更新
        if (originalTopicIds.length > 0) {
          const event = new CustomEvent('topicsCleared', {
            detail: { 
              assistantId,
              clearedTopicIds: originalTopicIds
            }
          });
          window.dispatchEvent(event);
          console.log('已派发topicsCleared事件', { assistantId, originalTopicIds });
        }
      } else {
        console.error(`无法清空助手 ${assistantId} 的话题`);
      }

      return success;
    } catch (error) {
      console.error(`清空助手话题失败: ${error}`);
      return false;
    }
  }

  /**
   * 确保助手有话题（如果没有则创建默认话题）
   */
  static async ensureAssistantHasTopic(assistantId: string): Promise<ChatTopic> {
    try {
      console.log(`确保助手 ${assistantId} 有话题`);

      // 获取助手
      const assistant = await dataService.getAssistant(assistantId);
      if (!assistant) {
        throw new Error(`助手 ${assistantId} 不存在`);
      }

      // 检查是否有话题
      const topicIds = Array.isArray(assistant.topicIds) ? assistant.topicIds : [];
      if (topicIds.length > 0) {
        // 获取第一个话题
        const firstTopicId = topicIds[0];
        const topic = await TopicService.getTopicById(firstTopicId);
        
        if (topic) {
          console.log(`助手 ${assistantId} 已有话题 ${firstTopicId}`);
          return topic;
        }
      }

      // 创建默认话题
      return await this.createDefaultTopicForAssistant(assistantId);
    } catch (error) {
      console.error(`确保助手有话题失败: ${error}`);
      throw error;
    }
  }

  /**
   * 为助手创建默认话题
   */
  static async createDefaultTopicForAssistant(assistantId: string): Promise<ChatTopic> {
    try {
      console.log(`为助手 ${assistantId} 创建默认话题`);

      // 创建话题
      const defaultTopic = getDefaultTopic(assistantId);
      console.log(`创建默认话题: ${defaultTopic.id}`);

      // 保存话题
      await dataService.saveTopic(defaultTopic);

      // 关联话题到助手
      await this.addTopicToAssistant(assistantId, defaultTopic.id);

      console.log(`成功为助手 ${assistantId} 创建并关联默认话题 ${defaultTopic.id}`);
      return defaultTopic;
    } catch (error) {
      console.error(`为助手创建默认话题失败: ${error}`);
      throw error;
    }
  }

  /**
   * 获取助手的默认话题（如果存在）
   */
  static async getDefaultTopic(assistantId: string): Promise<ChatTopic | null> {
    try {
      // 获取助手的话题列表
      const topicIds = await this.getAssistantTopics(assistantId);
      
      // 如果没有话题，返回null
      if (topicIds.length === 0) {
        return null;
      }
      
      // 获取第一个话题
      return await TopicService.getTopicById(topicIds[0]);
    } catch (error) {
      console.error(`获取助手默认话题失败: ${error}`);
      return null;
    }
  }
} 