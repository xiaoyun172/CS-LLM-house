import type { Assistant } from '../../types/Assistant';
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
      // 确保返回的助手有正确的图标
      if (assistant) {
        const serializedAssistant = serializeAssistant(assistant);
        return deserializeAssistant(serializedAssistant);
      }
      return null;
    } catch (error) {
      console.error('获取当前助手失败:', error);
      return null;
    }
  }

  /**
   * 设置当前助手
   */
  static async setCurrentAssistant(assistantId: string): Promise<boolean> {
    try {
      console.log(`尝试设置当前助手: ${assistantId}`);

      // 先验证助手是否存在
      try {
        const assistant = await dexieStorage.getAssistant(assistantId);
        if (!assistant) {
          console.error(`无法设置当前助手: ID为 ${assistantId} 的助手不存在`);
          return false;
        }
        console.log(`验证助手 ${assistantId} 存在`);
      } catch (validateError) {
        console.error(`验证助手 ${assistantId} 存在时出错:`, validateError);
        return false;
      }

      // 保存到dexieStorage
      await dexieStorage.saveSetting('currentAssistant', assistantId);

      // DexieStorageService内部会触发相应的事件
      // 我们不需要手动触发

      console.log(`当前助手设置为: ${assistantId}`);
      return true;
    } catch (error) {
      console.error('设置当前助手失败:', error);
      return false;
    }
  }

  /**
   * 添加助手
   */
  static async addAssistant(assistant: Assistant): Promise<boolean> {
    try {
      console.log(`尝试添加助手: ${assistant.id} (${assistant.name})`);

      // 先查询助手是否已存在
      let existingAssistant = null;
      try {
        existingAssistant = await dexieStorage.getAssistant(assistant.id);
      } catch (error) {
        console.log(`助手 ${assistant.id} 不存在，将创建新助手`);
      }

      if (existingAssistant) {
        console.warn(`助手 ${assistant.id} 已存在，将更新现有助手`);
        return await this.updateAssistant(assistant);
      }

      // 创建一个最小化的安全对象
      const safeAssistant = {
        id: assistant.id,
        name: assistant.name,
        description: assistant.description || '',
        icon: null,
        isSystem: !!assistant.isSystem,
        topicIds: Array.isArray(assistant.topicIds) ? [...assistant.topicIds] : [],
        systemPrompt: assistant.systemPrompt || ''
      };

      // 使用dexieStorage保存
      const success = await dexieStorage.saveAssistant(safeAssistant);

      if (success) {
        console.log(`助手 ${assistant.id} 保存成功`);
        return true;
      } else {
        console.error(`保存助手 ${assistant.id} 失败`);
        return false;
      }
    } catch (error) {
      console.error(`添加助手 ${assistant.id} 失败:`, error);
      return false;
    }
  }

  /**
   * 更新助手
   */
  static async updateAssistant(assistant: Assistant): Promise<boolean> {
    try {
      console.log(`更新助手: ${assistant.id} (${assistant.name})`);

      // 创建一个最小化的安全对象
      const safeAssistant = {
        id: assistant.id,
        name: assistant.name,
        description: assistant.description || '',
        icon: null,
        isSystem: !!assistant.isSystem,
        topicIds: Array.isArray(assistant.topicIds) ? [...assistant.topicIds] : [],
        systemPrompt: assistant.systemPrompt || ''
      };

      // 使用dexieStorage保存
      const success = await dexieStorage.saveAssistant(safeAssistant);

      if (success) {
        console.log(`助手 ${assistant.id} 更新成功`);
        return true;
      } else {
        console.error(`更新助手 ${assistant.id} 失败`);
        return false;
      }
    } catch (error) {
      console.error(`更新助手 ${assistant.id} 失败:`, error);
      return false;
    }
  }

  /**
   * 删除助手
   */
  static async deleteAssistant(assistantId: string): Promise<boolean> {
    try {
      console.log(`删除助手: ${assistantId}`);

      // 从dexieStorage删除
      const success = await dexieStorage.deleteAssistant(assistantId);

      if (success) {
        console.log(`助手 ${assistantId} 删除成功`);

        // 如果当前选中的助手被删除，清除当前选中状态
        const currentAssistantId = await dexieStorage.getSetting('currentAssistant');
        if (currentAssistantId === assistantId) {
          await dexieStorage.saveSetting('currentAssistant', null);
        }

        return true;
      } else {
        console.error(`删除助手 ${assistantId} 失败`);
        return false;
      }
    } catch (error) {
      console.error(`删除助手 ${assistantId} 失败:`, error);
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