import { Preferences } from '@capacitor/preferences';
import { DataService } from '../DataService';
import type { Assistant } from '../../types/Assistant';
import type { DesktopAssistant } from '../../types/DesktopAssistant';
import { MIGRATION_COMPLETED_KEY, DESKTOP_ASSISTANTS_KEY } from './types';

// 获取DataService实例
const dataService = DataService.getInstance();

/**
 * 迁移管理服务 - 负责旧数据结构到新数据结构的迁移
 */
export class MigrationManager {
  /**
   * 启动时检查并迁移数据结构
   */
  static async checkAndMigrateOnStartup(): Promise<boolean> {
    try {
      console.log('检查数据结构迁移状态...');

      // 检查是否已完成迁移
      const { value } = await Preferences.get({ key: MIGRATION_COMPLETED_KEY });
      if (value === 'true') {
        console.log('数据结构迁移已完成');
        return true;
      }

      console.log('数据结构尚未迁移，开始执行迁移...');
      return await this.migrateToDesktopStructure();
    } catch (error) {
      console.error('检查和迁移数据结构失败:', error);
      return false;
    }
  }

  /**
   * 迁移到桌面结构
   */
  static async migrateToDesktopStructure(): Promise<boolean> {
    try {
      console.log('开始迁移到桌面结构...');

      // 获取所有助手
      const assistants = await dataService.getAllAssistants();
      if (!assistants || assistants.length === 0) {
        console.log('没有助手数据需要迁移');
        await this.markMigrationCompleted();
        return true;
      }

      // 创建桌面结构的助手数组
      const desktopAssistants: DesktopAssistant[] = [];

      // 为每个助手处理话题
      for (const assistant of assistants) {
        const desktopAssistant = await this.convertToDesktopAssistant(assistant);
        desktopAssistants.push(desktopAssistant);
      }

      // 保存桌面结构的助手
      await Preferences.set({
        key: DESKTOP_ASSISTANTS_KEY,
        value: JSON.stringify(desktopAssistants)
      });

      // 标记迁移完成
      await this.markMigrationCompleted();

      console.log('数据结构迁移成功完成');
      return true;
    } catch (error) {
      console.error('迁移到桌面结构失败:', error);
      return false;
    }
  }

  /**
   * 将助手转换为桌面结构
   */
  private static async convertToDesktopAssistant(assistant: Assistant): Promise<DesktopAssistant> {
    // 获取助手的话题
    const topicIds = Array.isArray(assistant.topicIds) ? assistant.topicIds : [];
    const topics = [];

    // 加载每个话题的数据
    for (const topicId of topicIds) {
      const topic = await dataService.getTopic(topicId);
      if (topic) {
        topics.push({
          id: topic.id,
          assistantId: assistant.id,
          name: topic.title || '新话题',
          createdAt: topic.lastMessageTime || new Date().toISOString(),
          updatedAt: topic.lastMessageTime || new Date().toISOString(),
          messages: topic.messages || [],
          prompt: topic.prompt || '',
          isNameManuallyEdited: false
        });
      }
    }

    // 创建桌面结构的助手
    return {
      id: assistant.id,
      name: assistant.name,
      description: assistant.description || '',
      prompt: assistant.systemPrompt || '',
      type: 'default',
      topics
    };
  }

  /**
   * 标记迁移已完成
   */
  private static async markMigrationCompleted(): Promise<void> {
    await Preferences.set({
      key: MIGRATION_COMPLETED_KEY,
      value: 'true'
    });
    console.log('数据结构迁移已标记为完成');
  }

  /**
   * 获取桌面结构的助手列表
   */
  static async getDesktopStructureAssistants(): Promise<DesktopAssistant[]> {
    try {
      // 从Preferences获取
      const { value } = await Preferences.get({ key: DESKTOP_ASSISTANTS_KEY });
      if (!value) return [];
      
      return JSON.parse(value);
    } catch (error) {
      console.error('获取桌面结构助手失败:', error);
      return [];
    }
  }

  /**
   * 保存桌面结构的助手
   */
  static async saveDesktopAssistant(assistant: DesktopAssistant): Promise<boolean> {
    try {
      // 获取当前所有助手
      const assistants = await this.getDesktopStructureAssistants();
      
      // 更新或添加助手
      const assistantIndex = assistants.findIndex(a => a.id === assistant.id);
      if (assistantIndex !== -1) {
        assistants[assistantIndex] = assistant;
      } else {
        assistants.push(assistant);
      }
      
      // 保存回Preferences
      await Preferences.set({
        key: DESKTOP_ASSISTANTS_KEY,
        value: JSON.stringify(assistants)
      });
      
      return true;
    } catch (error) {
      console.error('保存桌面结构助手失败:', error);
      return false;
    }
  }
} 