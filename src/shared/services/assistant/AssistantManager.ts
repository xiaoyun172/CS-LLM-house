import { Preferences } from '@capacitor/preferences';
import type { Assistant } from '../../types/Assistant';
import { DataService } from '../DataService';
import { 
  ASSISTANTS_STORAGE_KEY, 
  CURRENT_ASSISTANT_KEY, 
  deserializeAssistant, 
  serializeAssistant
} from './types';

// 获取DataService实例
const dataService = DataService.getInstance();

/**
 * 核心助手管理服务 - 负责助手的基本CRUD操作
 */
export class AssistantManager {
  /**
   * 获取用户助手列表
   */
  static async getUserAssistants(): Promise<Assistant[]> {
    try {
      // 优先从DataService获取数据
      try {
        const assistants = await dataService.getAllAssistants();
        if (assistants && assistants.length > 0) {
          // 确保每个助手都有正确的图标
          return assistants.map(assistant => {
            // 序列化后再反序列化以确保图标正确
            const serializedAssistant = serializeAssistant(assistant);
            return deserializeAssistant(serializedAssistant);
          });
        }
      } catch (error) {
        console.warn('从DataService获取助手失败，尝试使用兼容模式', error);
      }

      // 兼容模式：从Preferences获取
      const { value } = await Preferences.get({ key: ASSISTANTS_STORAGE_KEY });
      if (!value) return [];

      const savedAssistants = JSON.parse(value);

      // 将序列化助手转换为完整助手（添加图标）
      const assistants = savedAssistants.map((assistant: any) => 
        deserializeAssistant(assistant)
      );

      // 迁移到DataService
      this.migrateAssistantsToDataService(assistants);

      return assistants;
    } catch (error) {
      console.error('获取用户助手失败:', error);
      return [];
    }
  }

  /**
   * 将助手数据迁移到DataService
   */
  private static async migrateAssistantsToDataService(assistants: Assistant[]): Promise<void> {
    try {
      for (const assistant of assistants) {
        await dataService.saveAssistant(assistant);
      }
      console.log(`成功迁移 ${assistants.length} 个助手到DataService`);
    } catch (error) {
      console.error('助手数据迁移失败:', error);
    }
  }

  /**
   * 获取当前选中的助手
   */
  static async getCurrentAssistant(): Promise<Assistant | null> {
    try {
      // 从设置中获取当前助手ID
      let currentAssistantId: string | null = null;

      try {
        currentAssistantId = await dataService.getSetting('currentAssistant');
      } catch (error) {
        console.warn('从DataService获取当前助手ID失败，尝试使用兼容模式', error);
      }

      // 兼容模式：从Preferences获取
      if (!currentAssistantId) {
        const { value } = await Preferences.get({ key: CURRENT_ASSISTANT_KEY });
        currentAssistantId = value || null;

        // 迁移设置到DataService
        if (currentAssistantId) {
          await dataService.saveSetting('currentAssistant', currentAssistantId);
        }
      }

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

      // 兼容模式：也保存到Preferences
      await Preferences.set({
        key: CURRENT_ASSISTANT_KEY,
        value: assistantId
      });

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
        existingAssistant = await dataService.getAssistant(assistant.id);
      } catch (error) {
        console.log(`助手 ${assistant.id} 不存在，将创建新助手`);
      }

      if (existingAssistant) {
        console.warn(`助手 ${assistant.id} 已存在，将更新现有助手`);
        return await this.updateAssistant(assistant);
      }

      // 序列化助手以去除图标等非可序列化属性
      const serializableAssistant = serializeAssistant(assistant);

      // 保存到DataService
      await dataService.saveAssistant(serializableAssistant);

      // 兼容模式：也保存到Preferences
      try {
        const existingAssistants = await this.getUserAssistants();
        const updatedAssistants = [...existingAssistants, assistant];
        
        // 保存序列化后的助手列表
        const serializableAssistants = updatedAssistants.map(a => serializeAssistant(a));
        
        await Preferences.set({
          key: ASSISTANTS_STORAGE_KEY,
          value: JSON.stringify(serializableAssistants)
        });
      } catch (error) {
        console.warn('兼容模式添加助手失败', error);
      }

      console.log(`助手 ${assistant.id} 添加成功`);
      return true;
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

      // 序列化助手以去除图标等非可序列化属性
      const serializableAssistant = serializeAssistant(assistant);

      // 保存到DataService
      await dataService.saveAssistant(serializableAssistant);

      // 兼容模式：也更新Preferences中的助手列表
      try {
        const existingAssistants = await this.getUserAssistants();
        const updatedAssistants = existingAssistants.map(a => 
          a.id === assistant.id ? assistant : a
        );
        
        // 保存序列化后的助手列表
        const serializableAssistants = updatedAssistants.map(a => serializeAssistant(a));
        
        await Preferences.set({
          key: ASSISTANTS_STORAGE_KEY,
          value: JSON.stringify(serializableAssistants)
        });
      } catch (error) {
        console.warn('兼容模式更新助手失败', error);
      }

      console.log(`助手 ${assistant.id} 更新成功`);
      return true;
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

      // 兼容模式：从Preferences中删除
      try {
        const existingAssistants = await this.getUserAssistants();
        const updatedAssistants = existingAssistants.filter(a => a.id !== assistantId);
        
        // 保存序列化后的助手列表
        const serializableAssistants = updatedAssistants.map(a => serializeAssistant(a));
        
        await Preferences.set({
          key: ASSISTANTS_STORAGE_KEY,
          value: JSON.stringify(serializableAssistants)
        });
      } catch (error) {
        console.warn('兼容模式删除助手失败', error);
      }

      console.log(`助手 ${assistantId} 删除成功`);
      return true;
    } catch (error) {
      console.error(`删除助手 ${assistantId} 失败:`, error);
      return false;
    }
  }
} 