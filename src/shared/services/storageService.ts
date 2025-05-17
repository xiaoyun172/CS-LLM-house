import { Preferences } from '@capacitor/preferences';
import type { Assistant } from '../types/Assistant';
import type { ChatTopic, Message } from '../types';
import { dexieStorage } from './DexieStorageService';
import DexieStorageService from './DexieStorageService';
import { DB_CONFIG } from '../types/DatabaseSchema';

// 导出Dexie实例，方便直接使用
export { dexieStorage };

/**
 * 数据库初始化
 * 简化版本，不再包含迁移逻辑
 */
export async function initStorageService(): Promise<void> {
  try {
    // 清理旧数据库
    await cleanupOldDatabases();

    // 初始化DexieStorageService, 这会确保数据库被打开并执行_ensureDatabaseInitialized
    await dexieStorage.initialize();

    // The call to dexieStorage.initialize() handles the necessary initialization checks and setup.
    // Legacy migration and explicit isDatabaseInitialized checks are removed.
    // console.log('存储服务: 数据库初始化检查完成，或已通过initialize()处理。');

    // 初始化StorageService单例实例
    if (storageService) {
      // 启用Dexie优先
      storageService.setUseDexiePriority(true);

      // 初始化话题同步 - Removed as event system was removed from DexieStorageService
      // storageService.initTopicSync(); 

      // console.log('启用Dexie优先存储'); // Log adjusted
    }

    console.log('存储服务初始化成功');
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? `${error.name}: ${error.message}` 
      : String(error);
    const errorDetails = error instanceof Error && error.stack 
      ? `\n错误堆栈: ${error.stack}` 
      : '';
    console.error(`存储服务初始化失败: ${errorMessage}${errorDetails}`);
    
    try {
      const isOpen = dexieStorage.isOpen(); // Use Dexie's native isOpen()
      console.error(`数据库状态: ${isOpen ? '已打开' : '未打开'}`);
      
      if (!isOpen) {
        console.log('尝试重新打开数据库...');
        await dexieStorage.open(); // Use Dexie's native open()
        console.log('数据库已重新打开');
      }
    } catch (dbError) {
      console.error('获取数据库状态失败:', 
        dbError instanceof Error ? dbError.message : String(dbError));
    }
    throw error;
  }
}

/**
 * 清理旧数据库
 */
export async function cleanupOldDatabases(): Promise<{
  found: number;
  cleaned: number;
  current: string;
}> {
  try {
    // 获取所有数据库
    const databases = await DexieStorageService.getAllDatabases();

    // 筛选出旧版本的数据库名称
    const oldDatabases = databases.filter(name =>
      name.startsWith('aetherlink-db') &&
      name !== DB_CONFIG.NAME
    );

    console.log(`清理旧数据库: 找到 ${oldDatabases.length} 个旧数据库`);

    // 删除旧数据库
    let cleanedCount = 0;
    for (const dbName of oldDatabases) {
      try {
        await DexieStorageService.deleteDatabase(dbName);
        cleanedCount++;
      } catch (e) {
        console.error(`删除数据库 ${dbName} 失败:`, e);
      }
    }

    return {
      found: oldDatabases.length,
      cleaned: cleanedCount,
      current: DB_CONFIG.NAME
    };
  } catch (error) {
    console.error('清理旧数据库失败:', error);
    return {
      found: 0,
      cleaned: 0,
      current: DB_CONFIG.NAME
    };
  }
}

/**
 * 获取数据库状态
 */
export async function getDatabaseStatus(): Promise<{
  databases: string[];
  currentDB: string;
  objectStores: string[];
  topicsCount: number;
  assistantsCount: number;
  missingStores: string[];
  dbVersion: number;
}> {
  try {
    // 获取所有数据库
    const databases = await DexieStorageService.getAllDatabases();

    // 获取数据库状态
    const status = await dexieStorage.getDatabaseStatus();

    // 检查缺失的存储
    const expectedStores = Object.values(DB_CONFIG.STORES);
    const missingStores = expectedStores.filter(store => !status.tables.includes(store));

    return {
      databases,
      currentDB: DB_CONFIG.NAME,
      objectStores: status.tables,
      topicsCount: status.topicsCount,
      assistantsCount: status.assistantsCount,
      missingStores,
      dbVersion: status.version
    };
  } catch (error) {
    console.error('获取数据库状态失败:', error);
    return {
      databases: [],
      currentDB: DB_CONFIG.NAME,
      objectStores: [],
      topicsCount: 0,
      assistantsCount: 0,
      missingStores: [],
      dbVersion: 0
    };
  }
}

// 以下是直接转发到Dexie的方法，保留API兼容性

export async function saveTopicToDB(topic: ChatTopic): Promise<void> {
  await dexieStorage.saveTopic(topic);
}

export async function getAllTopicsFromDB(): Promise<ChatTopic[]> {
  return await dexieStorage.getAllTopics();
}

export async function getTopicsByAssistantId(assistantId: string): Promise<ChatTopic[]> {
  return await dexieStorage.getTopicsByAssistantId(assistantId);
}

export async function getRecentTopics(limit: number = 10): Promise<ChatTopic[]> {
  return await dexieStorage.getRecentTopics(limit);
}

export async function getTopicFromDB(id: string): Promise<ChatTopic | undefined> {
  const topic = await dexieStorage.getTopic(id);
  return topic || undefined;
}

export async function saveAssistantToDB(assistant: Assistant): Promise<void> {
  await dexieStorage.saveAssistant(assistant);
}

export async function getAllAssistantsFromDB(): Promise<Assistant[]> {
  return await dexieStorage.getAllAssistants();
}

export async function getSystemAssistants(): Promise<Assistant[]> {
  return await dexieStorage.getSystemAssistants();
}

export async function getAssistantFromDB(id: string): Promise<Assistant | undefined> {
  const assistant = await dexieStorage.getAssistant(id);
  return assistant || undefined;
}

export async function deleteAssistantFromDB(id: string): Promise<void> {
  await dexieStorage.deleteAssistant(id);
}

export async function deleteTopicFromDB(id: string): Promise<void> {
  await dexieStorage.deleteTopic(id);
}

export async function saveSettingToDB(id: string, value: any): Promise<void> {
  await dexieStorage.saveSetting(id, value);
}

export async function getSettingFromDB(id: string): Promise<any> {
  return await dexieStorage.getSetting(id);
}

/**
 * 统一存储服务类
 * 提供本地存储API，全部基于Dexie.js实现
 */
class StorageService {
  /**
   * 设置是否优先使用Dexie
   * @param enable 是否启用
   */
  setUseDexiePriority(enable: boolean): void {
    console.log(`StorageService: ${enable ? '启用' : '禁用'}Dexie存储`);
  }

  /**
   * 保存助手
   * @param assistant 助手对象
   */
  async saveAssistant(assistant: Assistant): Promise<boolean> {
    try {
      const result = await dexieStorage.saveAssistant(assistant);
      return result;
    } catch (error) {
      console.error('StorageService: 保存助手失败', error);
      return false;
    }
  }

  /**
   * 获取助手
   * @param id 助手ID
   */
  async getAssistant(id: string): Promise<Assistant | null> {
    try {
      const assistant = await dexieStorage.getAssistant(id);
      return assistant;
    } catch (error) {
      console.error('StorageService: 获取助手失败', error);
      return null;
    }
  }

  /**
   * 获取所有助手
   */
  async getAllAssistants(): Promise<Assistant[]> {
    try {
      const assistants = await dexieStorage.getAllAssistants();
      return assistants;
    } catch (error) {
      console.error('StorageService: 获取所有助手失败', error);
      return [];
    }
  }

  /**
   * 删除助手
   * @param id 助手ID
   */
  async deleteAssistant(id: string): Promise<boolean> {
    try {
      const result = await dexieStorage.deleteAssistant(id);
      return result;
    } catch (error) {
      console.error('StorageService: 删除助手失败', error);
      return false;
    }
  }

  /**
   * 保存话题
   * @param topic 话题对象
   */
  async saveTopic(topic: ChatTopic): Promise<boolean> {
    try {
      const result = await dexieStorage.saveTopic(topic);
      return result;
    } catch (error) {
      console.error('StorageService: 保存话题失败', error);
      return false;
    }
  }

  /**
   * 获取话题
   * @param id 话题ID
   */
  async getTopic(id: string): Promise<ChatTopic | null> {
    try {
      const topic = await dexieStorage.getTopic(id);
      return topic;
    } catch (error) {
      console.error('StorageService: 获取话题失败', error);
      return null;
    }
  }

  /**
   * 获取所有话题
   */
  async getAllTopics(): Promise<ChatTopic[]> {
    try {
      const topics = await dexieStorage.getAllTopics();
      return topics;
    } catch (error) {
      console.error('StorageService: 获取所有话题失败', error);
      return [];
    }
  }

  /**
   * 删除话题
   * @param id 话题ID
   */
  async deleteTopic(id: string): Promise<boolean> {
    try {
      const result = await dexieStorage.deleteTopic(id);
      return result;
    } catch (error) {
      console.error('StorageService: 删除话题失败', error);
      return false;
    }
  }

  /**
   * 添加消息到话题
   * @param topicId 话题ID
   * @param message 消息
   */
  async addMessageToTopic(topicId: string, message: Message): Promise<boolean> {
    try {
      const result = await dexieStorage.addMessageToTopic(topicId, message);
      return result;
    } catch (error) {
      console.error('StorageService: 添加消息失败', error);
      return false;
    }
  }

  /**
   * 更新话题中的消息
   * @param topicId 话题ID
   * @param messageId 消息ID
   * @param updatedMessage 更新后的消息
   */
  async updateMessageInTopic(topicId: string, messageId: string, updatedMessage: Message): Promise<boolean> {
    return await dexieStorage.updateMessageInTopic(topicId, messageId, updatedMessage);
  }

  /**
   * 删除话题中的消息
   * @param topicId 话题ID
   * @param messageId 消息ID
   */
  async deleteMessageFromTopic(topicId: string, messageId: string): Promise<boolean> {
    return await dexieStorage.deleteMessageFromTopic(topicId, messageId);
  }

  /**
   * 保存话题到数据库 - 兼容API方法
   * @param topic 话题对象
   */
  async saveTopicToDB(topic: ChatTopic): Promise<void> {
    try {
      await dexieStorage.saveTopic(topic);
    } catch (error) {
      console.error('StorageService: 保存话题到数据库失败', error);
      throw error;
    }
  }

  /**
   * 保存设置
   * @param key 设置键
   * @param value 设置值
   */
  async setSetting(key: string, value: any): Promise<boolean> {
    return await dexieStorage.saveSetting(key, value);
  }

  /**
   * 获取设置
   * @param key 设置键
   */
  async getSetting(key: string): Promise<any> {
    return await dexieStorage.getSetting(key);
  }
}

// 创建并导出单例实例
export const storageService = new StorageService();

// 重命名以下函数以避免重名问题
export const saveTopicToDatabase = saveTopicToDB;

export default StorageService;

/**
 * Capacitor存储服务
 * 使用Capacitor Preferences API提供更可靠的移动端存储解决方案
 * 用于存储小型配置数据，不适合存储大型数据
 */
export class CapacitorStorageService {
  /**
   * 设置存储项
   * @param key 键名
   * @param value 值（将被转换为JSON字符串）
   */
  static async setItem(key: string, value: any): Promise<void> {
    try {
      const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);
      await Preferences.set({
        key,
        value: jsonValue
      });
    } catch (error) {
      console.error('CapacitorStorageService.setItem 失败:', error);
      throw error;
    }
  }

  /**
   * 获取存储项
   * @param key 键名
   * @param defaultValue 默认值（如果未找到项）
   * @returns 解析后的值或默认值
   */
  static async getItem<T>(key: string, defaultValue: T | null = null): Promise<T | null> {
    try {
      const { value } = await Preferences.get({ key });

      if (value === null || value === undefined) {
        return defaultValue;
      }

      try {
        return JSON.parse(value) as T;
      } catch {
        // 如果不是有效的JSON，返回原始字符串
        return value as unknown as T;
      }
    } catch (error) {
      console.error('CapacitorStorageService.getItem 失败:', error);
      return defaultValue;
    }
  }

  /**
   * 移除存储项
   * @param key 键名
   */
  static async removeItem(key: string): Promise<void> {
    try {
      await Preferences.remove({ key });
    } catch (error) {
      console.error('CapacitorStorageService.removeItem 失败:', error);
      throw error;
    }
  }

  /**
   * 清除所有存储项
   */
  static async clear(): Promise<void> {
    try {
      await Preferences.clear();
    } catch (error) {
      console.error('CapacitorStorageService.clear 失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有键名
   */
  static async keys(): Promise<string[]> {
    try {
      const { keys } = await Preferences.keys();
      return keys;
    } catch (error) {
      console.error('CapacitorStorageService.keys 失败:', error);
      return [];
    }
  }

  /**
   * 批量设置多个存储项
   * @param items 键值对
   */
  static async setItems(items: Record<string, any>): Promise<void> {
    try {
      for (const [key, value] of Object.entries(items)) {
        await CapacitorStorageService.setItem(key, value);
      }
    } catch (error) {
      console.error('CapacitorStorageService.setItems 失败:', error);
      throw error;
    }
  }
}