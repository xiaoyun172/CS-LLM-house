import { TopicService } from '../TopicService';
import { TopicStatsService } from '../TopicStatsService';
import type { ChatTopic } from '../../types/Assistant';
import type { Assistant } from '../../types/Assistant';
import type { Message } from '../../types';
import { AssistantManager } from './AssistantManager';
import { DEFAULT_TOPIC_PROMPT } from '../../config/prompts';
import { dexieStorage } from '../DexieStorageService';
import { uuid } from '../../utils';
import { EventEmitter, EVENT_NAMES } from '../EventService';

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

      // 参数验证
      if (!assistantId || !topicId) {
        console.error('添加话题到助手失败: 无效的参数', { assistantId, topicId });
        return false;
      }

      // 获取助手 - 使用dexieStorage替代dataService
      const assistant = await dexieStorage.getAssistant(assistantId);
      if (!assistant) {
        console.error(`助手 ${assistantId} 不存在`);
        return false;
      }

      // 获取话题
      const topic = await TopicService.getTopicById(topicId);
      if (!topic) {
        console.error(`话题 ${topicId} 不存在，无法添加到助手`);
        return false;
      }

      // 验证话题有效性
      if (!TopicStatsService.isValidTopic(topic)) {
        console.error(`话题 ${topicId} 无效，尝试修复`);

        // 尝试修复话题 - 添加系统提示词
        if (!topic.prompt) {
          topic.prompt = DEFAULT_TOPIC_PROMPT;
          await dexieStorage.saveTopic(topic);
          console.log(`已为话题 ${topicId} 添加系统提示词`);
        }

        // 再次验证
        if (!TopicStatsService.isValidTopic(topic)) {
          console.error(`修复后话题 ${topicId} 仍然无效，无法添加到助手`);
          return false;
        }
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

        // 派发话题创建事件，确保UI更新
        try {
          const event = new CustomEvent('topicCreated', {
            detail: {
              topic,
              assistantId
            }
          });
          window.dispatchEvent(event);
          console.log(`已派发topicCreated事件，通知UI更新`);
        } catch (eventError) {
          console.warn(`派发话题创建事件失败:`, eventError);
        }
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

      // 获取助手 - 使用dexieStorage替代dataService
      const assistant = await dexieStorage.getAssistant(assistantId);
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
      // 获取助手 - 使用dexieStorage替代dataService
      const assistant = await dexieStorage.getAssistant(assistantId);
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

      // 获取助手 - 使用dexieStorage替代dataService
      const assistant = await dexieStorage.getAssistant(assistantId);
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
   * 确保助手至少有一个话题
   * 如果没有话题，将抛出错误
   */
  static async ensureAssistantHasTopic(assistantId: string): Promise<ChatTopic> {
    try {
      console.log(`[TopicManager] 检查助手 ${assistantId} 的话题`);

      // 获取助手 - 使用dexieStorage替代dataService
      const assistant = await dexieStorage.getAssistant(assistantId);
      if (!assistant) {
        console.error(`[TopicManager] 助手 ${assistantId} 不存在，无法获取话题`);
        throw new Error(`助手 ${assistantId} 不存在`);
      }

      console.log(`[TopicManager] 成功获取助手: ${assistant.name} (${assistant.id})`);

      // 检查是否有话题
      const topicIds = Array.isArray(assistant.topicIds) ? assistant.topicIds : [];
      console.log(`[TopicManager] 助手 ${assistant.name} 有 ${topicIds.length} 个话题ID: ${JSON.stringify(topicIds)}`);

      if (topicIds.length > 0) {
        // 获取第一个话题
        const firstTopicId = topicIds[0];
        console.log(`[TopicManager] 尝试获取第一个话题: ${firstTopicId}`);

        try {
          const topic = await TopicService.getTopicById(firstTopicId);

          if (topic) {
            console.log(`[TopicManager] 助手 ${assistant.name} 已有有效话题: ${topic.title || topic.name} (${topic.id})`);
            return topic;
          } else {
            console.warn(`[TopicManager] 话题ID ${firstTopicId} 存在于助手的topicIds中，但无法获取话题数据`);
          }
        } catch (topicError) {
          console.error(`[TopicManager] 获取话题 ${firstTopicId} 时出错:`, topicError);
        }
      }

      // 助手没有有效话题，抛出错误
      console.error(`[TopicManager] 助手 ${assistant.name} 没有有效话题`);
      throw new Error(`助手 ${assistant.name} 没有有效话题，请使用 AssistantFactory.createAssistant 创建助手时自动创建默认话题`);
    } catch (error) {
      console.error(`[TopicManager] 获取助手话题失败:`, error);
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

  /**
   * 验证并修复助手的话题引用
   * 检查助手引用的话题是否都存在且有效，移除无效引用
   */
  static async validateAndFixAssistantTopicReferences(assistantId: string): Promise<{
    fixed: boolean;
    removedCount: number;
    validCount: number;
  }> {
    try {
      console.log(`[TopicManager] 验证助手 ${assistantId} 的话题引用`);

      // 获取助手 - 使用dexieStorage替代dataService
      const assistant = await dexieStorage.getAssistant(assistantId);
      if (!assistant) {
        console.error(`[TopicManager] 助手 ${assistantId} 不存在，无法验证话题引用`);
        return { fixed: false, removedCount: 0, validCount: 0 };
      }

      // 确保topicIds是数组
      const topicIds = Array.isArray(assistant.topicIds) ? assistant.topicIds : [];
      if (topicIds.length === 0) {
        console.log(`[TopicManager] 助手 ${assistant.name} 没有关联话题，无需修复`);
        return { fixed: false, removedCount: 0, validCount: 0 };
      }

      console.log(`[TopicManager] 助手 ${assistant.name} 有 ${topicIds.length} 个话题引用，开始验证`);

      // 验证每个话题ID
      const validTopicIds: string[] = [];
      const invalidTopicIds: string[] = [];

      for (const topicId of topicIds) {
        try {
          const topic = await TopicService.getTopicById(topicId);

          if (topic && TopicStatsService.isValidTopic(topic)) {
            validTopicIds.push(topicId);
          } else {
            console.log(`[TopicManager] 话题 ${topicId} 无效或不存在，将从助手中移除`);
            invalidTopicIds.push(topicId);
          }
        } catch (error) {
          console.error(`[TopicManager] 验证话题 ${topicId} 时出错:`, error);
          invalidTopicIds.push(topicId);
        }
      }

      // 如果没有无效话题，不需要修复
      if (invalidTopicIds.length === 0) {
        console.log(`[TopicManager] 助手 ${assistant.name} 的所有话题引用都有效，无需修复`);
        return { fixed: false, removedCount: 0, validCount: validTopicIds.length };
      }

      // 更新助手，移除无效话题引用
      const updatedAssistant = {
        ...assistant,
        topicIds: validTopicIds
      };

      // 保存更新后的助手
      const success = await AssistantManager.updateAssistant(updatedAssistant);

      if (success) {
        console.log(`[TopicManager] 成功修复助手 ${assistant.name} 的话题引用，移除了 ${invalidTopicIds.length} 个无效引用`);
        return { fixed: true, removedCount: invalidTopicIds.length, validCount: validTopicIds.length };
      } else {
        console.error(`[TopicManager] 无法更新助手 ${assistant.name} 的话题引用`);
        return { fixed: false, removedCount: 0, validCount: validTopicIds.length };
      }
    } catch (error) {
      console.error(`[TopicManager] 验证并修复助手话题引用时出错:`, error);
      return { fixed: false, removedCount: 0, validCount: 0 };
    }
  }

  /**
   * 验证并修复所有助手的话题引用
   */
  static async validateAndFixAllAssistantsTopicReferences(): Promise<{
    assistantsFixed: number;
    totalAssistants: number;
    totalRemoved: number;
  }> {
    try {
      console.log('[TopicManager] 开始验证所有助手的话题引用');

      // 获取所有助手
      const assistants = await AssistantManager.getUserAssistants();
      if (!assistants || assistants.length === 0) {
        console.log('[TopicManager] 没有找到助手，无需修复');
        return { assistantsFixed: 0, totalAssistants: 0, totalRemoved: 0 };
      }

      console.log(`[TopicManager] 找到 ${assistants.length} 个助手，开始验证话题引用`);

      let assistantsFixed = 0;
      let totalRemoved = 0;

      // 验证每个助手的话题引用
      for (const assistant of assistants) {
        const result = await this.validateAndFixAssistantTopicReferences(assistant.id);

        if (result.fixed) {
          assistantsFixed++;
          totalRemoved += result.removedCount;
        }
      }

      console.log(`[TopicManager] 验证完成，修复了 ${assistantsFixed} 个助手的话题引用，共移除 ${totalRemoved} 个无效引用`);
      return { assistantsFixed, totalAssistants: assistants.length, totalRemoved };
    } catch (error) {
      console.error('[TopicManager] 验证所有助手话题引用时出错:', error);
      return { assistantsFixed: 0, totalAssistants: 0, totalRemoved: 0 };
    }
  }

  /**
   * 向话题添加助手的初始消息
   */
  static async addAssistantMessagesToTopic({ assistant, topic }: { assistant: Assistant; topic: ChatTopic }): Promise<void> {
    try {
      console.log(`[TopicManager] 尝试向话题添加助手初始消息: ${topic.id}`);

      // 如果话题已经有消息，则不添加
      if (topic.messages && topic.messages.length > 0) {
        console.log(`[TopicManager] 话题 ${topic.id} 已有消息，不添加初始消息`);
        return;
      }

      // 获取助手的系统提示词
      const systemPrompt = assistant.systemPrompt || DEFAULT_TOPIC_PROMPT;

      // 创建系统消息
      const systemMessage: Message = {
        id: uuid(),
        role: 'system',
        content: systemPrompt,
        timestamp: new Date().toISOString(),
        status: 'complete'
      };

      // 创建助手欢迎消息
      const assistantMessage: Message = {
        id: uuid(),
        role: 'assistant',
        content: '您好！我是您的AI助手，有什么可以帮您的吗？',
        timestamp: new Date().toISOString(),
        status: 'complete'
      };

      // 更新话题消息
      const messages = [systemMessage, assistantMessage];
      const updatedTopic = {
        ...topic,
        messages,
        lastMessageTime: assistantMessage.timestamp
      };

      // 保存到数据库
      await dexieStorage.saveTopic(updatedTopic);

      // 派发事件通知UI更新
      EventEmitter.emit(EVENT_NAMES.TOPIC_CREATED, {
        topic: updatedTopic,
        assistantId: assistant.id
      });

      console.log(`[TopicManager] 成功向话题 ${topic.id} 添加助手初始消息`);

    } catch (error) {
      console.error(`[TopicManager] 添加助手消息到话题失败:`, error);
    }
  }
}