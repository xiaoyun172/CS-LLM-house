import type { Assistant } from '../../types/Assistant';
import { DataService } from '../DataService';
import {
  deserializeAssistant,
  serializeAssistant
} from './types';
import Dexie from 'dexie';
import { DB_CONFIG } from '../../types/DatabaseSchema';

// 获取DataService实例
const dataService = DataService.getInstance();

// 创建 Dexie 数据库实例
const dexieDb = new Dexie(DB_CONFIG.NAME);
dexieDb.version(DB_CONFIG.VERSION).stores({
  [DB_CONFIG.STORES.ASSISTANTS]: 'id',
  [DB_CONFIG.STORES.TOPICS]: 'id, assistantId, lastUpdateTime',
  [DB_CONFIG.STORES.SETTINGS]: '',
  [DB_CONFIG.STORES.IMAGES]: 'id',
  [DB_CONFIG.STORES.IMAGE_METADATA]: 'id, topicId, created',
  [DB_CONFIG.STORES.METADATA]: ''
});

/**
 * 核心助手管理服务 - 负责助手的基本CRUD操作
 */
export class AssistantManager {
  /**
   * 获取用户助手列表
   */
  static async getUserAssistants(): Promise<Assistant[]> {
    try {
      // 从DataService获取数据
      const assistants = await dataService.getAllAssistants();

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
      const currentAssistantId = await dataService.getSetting('currentAssistant');

      if (!currentAssistantId) return null;

      // 获取助手详情
      const assistant = await dataService.getAssistant(currentAssistantId);
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
        const assistant = await dataService.getAssistant(assistantId);
        if (!assistant) {
          console.error(`无法设置当前助手: ID为 ${assistantId} 的助手不存在`);
          return false;
        }
        console.log(`验证助手 ${assistantId} 存在`);
      } catch (validateError) {
        console.error(`验证助手 ${assistantId} 存在时出错:`, validateError);
        return false;
      }

      // 保存到DataService
      await dataService.saveSetting('currentAssistant', assistantId);

      console.log(`当前助手设置为: ${assistantId}`);
      return true;
    } catch (error) {
      console.error('设置当前助手失败:', error);
      return false;
    }
  }

  /**
   * 直接使用Dexie.js保存助手，绕过DataService
   * 这是一个更可靠的备选方案，替代原有的直接IndexedDB操作
   */
  private static async saveAssistantDirectly(assistant: any): Promise<boolean> {
    try {
      console.log(`[Dexie直接保存] 尝试直接保存助手 ${assistant.id} 到数据库`);

      // 确保对象是纯JSON，移除所有函数和复杂对象
      const jsonString = JSON.stringify(assistant);
      const cleanAssistant = JSON.parse(jsonString);

      // 使用Dexie.js直接保存
      await dexieDb.table(DB_CONFIG.STORES.ASSISTANTS).put(cleanAssistant);

      console.log(`[Dexie直接保存] 助手 ${assistant.id} 直接保存成功`);
      return true;
    } catch (error) {
      console.error(`[Dexie直接保存] 直接保存助手 ${assistant.id} 失败:`, error);
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
        existingAssistant = await dataService.getAssistant(assistant.id);
      } catch (error) {
        console.log(`助手 ${assistant.id} 不存在，将创建新助手`);
      }

      if (existingAssistant) {
        console.warn(`助手 ${assistant.id} 已存在，将更新现有助手`);
        return await this.updateAssistant(assistant);
      }

      // 不再需要序列化助手，直接创建安全对象

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

      // 尝试使用DataService保存
      try {
        await dataService.saveAssistant(safeAssistant);
        console.log(`助手 ${assistant.id} 通过DataService保存成功`);
        return true;
      } catch (dataServiceError) {
        console.error(`通过DataService保存助手 ${assistant.id} 失败:`, dataServiceError);

        // 如果DataService失败，尝试直接使用Dexie.js
        console.log(`尝试使用Dexie.js方法保存助手 ${assistant.id}`);
        const success = await this.saveAssistantDirectly(safeAssistant);

        if (success) {
          console.log(`助手 ${assistant.id} 通过Dexie.js方法保存成功`);
          return true;
        } else {
          console.error(`所有保存方法都失败，无法保存助手 ${assistant.id}`);
          return false;
        }
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

      // 尝试使用DataService保存
      try {
        await dataService.saveAssistant(safeAssistant);
        console.log(`助手 ${assistant.id} 通过DataService更新成功`);
        return true;
      } catch (dataServiceError) {
        console.error(`通过DataService更新助手 ${assistant.id} 失败:`, dataServiceError);

        // 如果DataService失败，尝试直接使用Dexie.js
        console.log(`尝试使用Dexie.js方法更新助手 ${assistant.id}`);
        const success = await this.saveAssistantDirectly(safeAssistant);

        if (success) {
          console.log(`助手 ${assistant.id} 通过Dexie.js方法更新成功`);
          return true;
        } else {
          console.error(`所有更新方法都失败，无法更新助手 ${assistant.id}`);
          return false;
        }
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

      // 从DataService删除
      await dataService.deleteAssistant(assistantId);

      console.log(`助手 ${assistantId} 删除成功`);
      return true;
    } catch (error) {
      console.error(`删除助手 ${assistantId} 失败:`, error);
      return false;
    }
  }
}