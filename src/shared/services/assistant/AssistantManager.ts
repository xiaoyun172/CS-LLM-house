import type { Assistant, ChatTopic } from '../../types/Assistant';
import {
  deserializeAssistant,
  serializeAssistant
} from './types';
import { dexieStorage } from '../DexieStorageService';

/**
 * 核心助手管理服务 - 负责助手的基本CRUD操作
 */
export class AssistantManager {
  /**
   * 获取用户助手列表
   */
  static async getUserAssistants(): Promise<Assistant[]> {
    try {
      // 直接从dexieStorage获取数据
      const assistants = await dexieStorage.getAllAssistants();

      // 为每个助手加载话题
      for (const assistant of assistants) {
        const topicIds = assistant.topicIds || [];
        const topics: ChatTopic[] = [];

        // 加载关联的话题
        for (const topicId of topicIds) {
          const topic = await dexieStorage.getTopic(topicId);
          if (topic) {
            topics.push(topic);
          }
        }

        // 按最后消息时间排序
        topics.sort((a, b) => {
          const timeA = new Date(a.lastMessageTime || 0).getTime();
          const timeB = new Date(b.lastMessageTime || 0).getTime();
          return timeB - timeA; // 降序排列，最新的在前面
        });

        // 设置话题数组
        assistant.topics = topics;
      }

      // 确保每个助手都有正确的图标
      return assistants.map(assistant => {
        // 序列化后再反序列化以确保图标正确
        const serializedAssistant = serializeAssistant(assistant);
        return deserializeAssistant(serializedAssistant);
      });
    } catch (error) {
      console.error('获取用户助手失败:', error);
      return [];
    }
  }

  /**
   * 获取当前选中的助手
   */
  static async getCurrentAssistant(): Promise<Assistant | null> {
    try {
      // 从设置中获取当前助手ID
      const currentAssistantId = await dexieStorage.getSetting('currentAssistant');

      if (!currentAssistantId) return null;

      // 获取助手详情
      const assistant = await dexieStorage.getAssistant(currentAssistantId);
      if (!assistant) return null;

      // 加载助手关联的话题
      const topicIds = assistant.topicIds || [];
      const topics: ChatTopic[] = [];

      // 加载每个话题
      for (const topicId of topicIds) {
        const topic = await dexieStorage.getTopic(topicId);
        if (topic) {
          topics.push(topic);
        }
      }

      // 按最后消息时间排序
      topics.sort((a, b) => {
        const timeA = new Date(a.lastMessageTime || 0).getTime();
        const timeB = new Date(b.lastMessageTime || 0).getTime();
        return timeB - timeA; // 降序排列
      });

      // 设置话题数组
      assistant.topics = topics;

      // 确保返回的助手有正确的图标
      const serializedAssistant = serializeAssistant(assistant);
      return deserializeAssistant(serializedAssistant);
    } catch (error) {
      console.error('获取当前助手失败:', error);
      return null;
    }
  }

  /**
   * 设置当前助手 - 简化错误处理，类似最佳实例
   */
  static async setCurrentAssistant(assistantId: string): Promise<boolean> {
    try {
      // 保存到dexieStorage
      await dexieStorage.saveSetting('currentAssistant', assistantId);
      return true;
    } catch (error) {
      console.error('设置当前助手失败:', error);
      return false;
    }
  }

  /**
   * 添加助手 - 简化错误处理，类似最佳实例
   */
  static async addAssistant(assistant: Assistant): Promise<boolean> {
    try {
      // 检查助手是否已存在
      try {
        const existingAssistant = await dexieStorage.getAssistant(assistant.id);
        if (existingAssistant) {
          return await this.updateAssistant(assistant);
        }
      } catch (error) {
        // 助手不存在，继续创建
      }

      // 处理icon字段
      const assistantToSave = { ...assistant };
      if (assistantToSave.icon && typeof assistantToSave.icon === 'object') {
        assistantToSave.icon = null;
      }

      // 保存助手到数据库
      await dexieStorage.saveAssistant(assistantToSave);

      // 保存助手的话题到数据库
      if (assistant.topics && assistant.topics.length > 0) {
        for (const topic of assistant.topics) {
          await dexieStorage.saveTopic(topic);
        }
      }

      // 派发事件
      window.dispatchEvent(new CustomEvent('assistantCreated', {
        detail: { assistant: assistantToSave }
      }));

      return true;
    } catch (error) {
      console.error('添加助手失败:', error);
      return false;
    }
  }

  /**
   * 更新助手 - 简化错误处理，类似最佳实例
   */
  static async updateAssistant(assistant: Assistant): Promise<boolean> {
    try {
      console.log('[AssistantManager.updateAssistant] 开始更新助手:', {
        id: assistant.id,
        name: assistant.name,
        systemPrompt: assistant.systemPrompt ?
          (assistant.systemPrompt.substring(0, 30) + (assistant.systemPrompt.length > 30 ? '...' : '')) :
          '无系统提示词'
      });

      // 处理icon字段
      const assistantToSave = { ...assistant };
      if (assistantToSave.icon && typeof assistantToSave.icon === 'object') {
        assistantToSave.icon = null;
      }

      // 保存助手到数据库
      await dexieStorage.saveAssistant(assistantToSave);
      console.log('[AssistantManager.updateAssistant] 已保存助手到数据库');

      // 派发事件通知其他组件
      window.dispatchEvent(new CustomEvent('assistantUpdated', {
        detail: { assistant: assistantToSave }
      }));
      console.log('[AssistantManager.updateAssistant] 已派发assistantUpdated事件');

      return true;
    } catch (error) {
      console.error('[AssistantManager.updateAssistant] 更新助手失败:', error);
      return false;
    }
  }

  /**
   * 删除助手 - 简化错误处理，类似最佳实例
   */
  static async deleteAssistant(assistantId: string): Promise<boolean> {
    try {
      // 删除助手
      await dexieStorage.deleteAssistant(assistantId);

      // 如果当前选中的助手被删除，清除当前选中状态
      const currentAssistantId = await dexieStorage.getSetting('currentAssistant');
      if (currentAssistantId === assistantId) {
        await dexieStorage.saveSetting('currentAssistant', null);
      }

      return true;
    } catch (error) {
      console.error('删除助手失败:', error);
      return false;
    }
  }

  /**
   * 订阅助手相关事件
   * @param eventType 事件类型
   * @param callback 回调函数
   */
  static subscribeToAssistantEvents(eventType: string, callback: EventListener): () => void {
    // 使用window.addEventListener替代DexieStorageService.subscribe
    window.addEventListener(eventType, callback);

    // 返回取消订阅函数
    return () => {
      window.removeEventListener(eventType, callback);
    };
  }
}