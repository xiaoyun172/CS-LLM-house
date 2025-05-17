import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import type { ChatTopic } from '../types';
import type { Assistant } from '../types/Assistant';
import { Preferences } from '@capacitor/preferences';
import type { AetherLinkDB } from '../types/DatabaseSchema';
import { DB_CONFIG } from '../types/DatabaseSchema';

// 使用统一的数据库配置
const { NAME: DB_NAME, VERSION: DB_VERSION, STORES } = DB_CONFIG;

/**
 * 初始化数据库
 * 创建统一的数据库结构
 */
async function initDB(): Promise<IDBPDatabase<AetherLinkDB>> {
  return openDB<AetherLinkDB>(DB_NAME, DB_VERSION, {
    upgrade(db: IDBPDatabase<AetherLinkDB>) {
      // 创建话题存储
      if (!db.objectStoreNames.contains(STORES.TOPICS)) {
        const topicsStore = db.createObjectStore(STORES.TOPICS, { keyPath: 'id' });
        // 添加索引以提高查询性能
        topicsStore.createIndex('by-assistant', 'assistantId', { unique: false });
        topicsStore.createIndex('by-last-time', 'lastMessageTime', { unique: false });
        console.log('创建topics存储');
      }

      // 创建助手存储
      if (!db.objectStoreNames.contains(STORES.ASSISTANTS)) {
        const assistantsStore = db.createObjectStore(STORES.ASSISTANTS, { keyPath: 'id' });
        assistantsStore.createIndex('by-system', 'isSystem', { unique: false });
        console.log('创建assistants存储');
      }

      // 创建设置存储
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
        console.log('创建settings存储');
      }

      // 创建图片存储
      if (!db.objectStoreNames.contains(STORES.IMAGES)) {
        db.createObjectStore(STORES.IMAGES, { keyPath: 'id' });
        console.log('创建images存储');
      }

      // 创建图片元数据存储
      if (!db.objectStoreNames.contains(STORES.IMAGE_METADATA)) {
        const imageMetadataStore = db.createObjectStore(STORES.IMAGE_METADATA, { keyPath: 'id' });
        imageMetadataStore.createIndex('by-topic', 'topicId', { unique: false });
        imageMetadataStore.createIndex('by-time', 'created', { unique: false });
        console.log('创建imageMetadata存储');
      }

      // 创建元数据存储
      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA, { keyPath: 'id' });
        console.log('创建metadata存储');
      }
    },
    blocked() {
      console.warn('数据库升级被阻塞，请关闭其他标签页或应用');
    },
    blocking() {
      console.warn('此连接正在阻塞数据库升级，将关闭连接');
    },
    terminated() {
      console.error('数据库连接意外终止');
    }
  });
}

/**
 * 保存话题到数据库
 * @param topic 话题对象
 */
export async function saveTopicToDB(topic: ChatTopic): Promise<void> {
  const db = await initDB();
  await db.put(STORES.TOPICS, topic);
}

/**
 * 从数据库获取所有话题
 * @returns 话题数组
 */
export async function getAllTopicsFromDB(): Promise<ChatTopic[]> {
  const db = await initDB();
  return db.getAll(STORES.TOPICS);
}

/**
 * 按助手ID获取话题
 * @param assistantId 助手ID
 * @returns 话题数组
 */
export async function getTopicsByAssistantId(assistantId: string): Promise<ChatTopic[]> {
  const db = await initDB();
  const index = db.transaction(STORES.TOPICS).store.index('by-assistant');
  return index.getAll(assistantId);
}

/**
 * 获取最近的话题
 * @param limit 限制数量
 * @returns 话题数组
 */
export async function getRecentTopics(limit: number = 10): Promise<ChatTopic[]> {
  const db = await initDB();
  const index = db.transaction(STORES.TOPICS).store.index('by-last-time');
  const topics = await index.getAll(IDBKeyRange.lowerBound(0));

  // 按时间倒序排序
  topics.sort((a, b) => {
    const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
    const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
    return timeB - timeA;
  });

  return topics.slice(0, limit);
}

/**
 * 从数据库获取单个话题
 * @param id 话题ID
 * @returns 话题对象或undefined
 */
export async function getTopicFromDB(id: string): Promise<ChatTopic | undefined> {
  const db = await initDB();
  return db.get(STORES.TOPICS, id);
}

/**
 * 保存助手到数据库
 * @param assistant 助手对象
 */
export async function saveAssistantToDB(assistant: Assistant): Promise<void> {
  const db = await initDB();
  await db.put(STORES.ASSISTANTS, assistant);
}

/**
 * 从数据库获取所有助手
 * @returns 助手数组
 */
export async function getAllAssistantsFromDB(): Promise<Assistant[]> {
  const db = await initDB();
  return db.getAll(STORES.ASSISTANTS);
}

/**
 * 获取系统助手
 * @returns 系统助手数组
 */
export async function getSystemAssistants(): Promise<Assistant[]> {
  const db = await initDB();
  const index = db.transaction(STORES.ASSISTANTS).store.index('by-system');
  return index.getAll(IDBKeyRange.only(1)); // 使用1代表true
}

/**
 * 从数据库获取单个助手
 * @param id 助手ID
 * @returns 助手对象或undefined
 */
export async function getAssistantFromDB(id: string): Promise<Assistant | undefined> {
  const db = await initDB();
  return db.get(STORES.ASSISTANTS, id);
}

/**
 * 删除助手
 * @param id 助手ID
 */
export async function deleteAssistantFromDB(id: string): Promise<void> {
  const db = await initDB();
  await db.delete(STORES.ASSISTANTS, id);
}

/**
 * 删除话题
 * @param id 话题ID
 */
export async function deleteTopicFromDB(id: string): Promise<void> {
  const db = await initDB();
  await db.delete(STORES.TOPICS, id);
}

/**
 * 保存设置到数据库
 * @param id 设置ID
 * @param value 设置值
 */
export async function saveSettingToDB(id: string, value: any): Promise<void> {
  const db = await initDB();
  await db.put(STORES.SETTINGS, { id, value });
}

/**
 * 从数据库获取设置
 * @param id 设置ID
 * @returns 设置值或undefined
 */
export async function getSettingFromDB(id: string): Promise<any> {
  const db = await initDB();
  const setting = await db.get(STORES.SETTINGS, id);
  return setting?.value;
}

/**
 * 数据库初始化
 * 简化版本，不再包含迁移逻辑
 */
export async function initStorageService(): Promise<void> {
  try {
    // 清理旧数据库
    await cleanupOldDatabases();

    // 初始化数据库
    await initDB();
    console.log('存储服务初始化成功');
  } catch (error) {
    console.error('存储服务初始化失败:', error);
  }
}

/**
 * 清理旧数据库
 * 删除所有旧版本的数据库，避免冲突
 */
export async function cleanupOldDatabases(): Promise<{
  found: number;
  cleaned: number;
  current: string;
}> {
  try {
    // 获取所有数据库
    const databases = await indexedDB.databases();

    // 当前使用的数据库名称
    const currentDB = DB_NAME;

    // 需要清理的旧数据库
    const oldDBs = databases
      .filter(db => db.name && db.name !== currentDB)
      .map(db => db.name as string);

    console.log(`发现 ${oldDBs.length} 个旧数据库需要清理`);

    // 清理旧数据库
    let cleanedCount = 0;
    for (const dbName of oldDBs) {
      try {
        const deleteRequest = indexedDB.deleteDatabase(dbName);
        deleteRequest.onsuccess = () => {
          cleanedCount++;
          console.log(`成功删除旧数据库: ${dbName}`);
        };
        deleteRequest.onerror = (event) => {
          console.error(`删除数据库 ${dbName} 失败:`, event);
        };
      } catch (error) {
        console.error(`删除数据库 ${dbName} 失败:`, error);
      }
    }

    return {
      found: oldDBs.length,
      cleaned: cleanedCount,
      current: currentDB
    };
  } catch (error) {
    console.error('清理旧数据库失败:', error);
    return { found: 0, cleaned: 0, current: DB_NAME };
  }
}

/**
 * 诊断数据库状态
 * 获取数据库的健康状况信息
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
    const databases = await indexedDB.databases();
    const dbNames = databases.map(db => db.name || 'unknown').filter(Boolean);

    // 获取当前数据库信息
    const db = await initDB();
    const objectStores = Array.from(db.objectStoreNames);

    // 获取数据统计
    const topicsCount = (await getAllTopicsFromDB()).length;
    const assistantsCount = (await getAllAssistantsFromDB()).length;

    // 检查是否缺少必要的对象存储
    const requiredStores = [
      DB_CONFIG.STORES.TOPICS,
      DB_CONFIG.STORES.ASSISTANTS,
      DB_CONFIG.STORES.SETTINGS,
      DB_CONFIG.STORES.IMAGES,
      DB_CONFIG.STORES.IMAGE_METADATA,
      DB_CONFIG.STORES.METADATA
    ];
    const missingStores = requiredStores.filter(store => !objectStores.includes(store as any));

    return {
      databases: dbNames,
      currentDB: DB_NAME,
      objectStores,
      topicsCount,
      assistantsCount,
      missingStores,
      dbVersion: DB_VERSION
    };
  } catch (error) {
    console.error('获取数据库状态失败:', error);
    throw error;
  }
}

/**
 * 统一数据服务接口
 * 提供对数据库的统一访问
 */
export const storageService = {
  /**
   * 保存助手
   * @param assistant 助手对象
   */
  async saveAssistant(assistant: Assistant): Promise<void> {
    await saveAssistantToDB(assistant);
  },

  /**
   * 获取所有助手
   * @returns 助手数组
   */
  async getAllAssistants(): Promise<Assistant[]> {
    return getAllAssistantsFromDB();
  },

  /**
   * 获取单个助手
   * @param id 助手ID
   * @returns 助手对象或undefined
   */
  async getAssistant(id: string): Promise<Assistant | undefined> {
    return getAssistantFromDB(id);
  },

  /**
   * 删除助手
   * @param id 助手ID
   */
  async deleteAssistant(id: string): Promise<void> {
    await deleteAssistantFromDB(id);
  },

  /**
   * 保存话题
   * @param topic 话题对象
   */
  async saveTopic(topic: ChatTopic): Promise<void> {
    await saveTopicToDB(topic);
  },

  /**
   * 获取所有话题
   * @returns 话题数组
   */
  async getAllTopics(): Promise<ChatTopic[]> {
    return getAllTopicsFromDB();
  },

  /**
   * 获取单个话题
   * @param id 话题ID
   * @returns 话题对象或undefined
   */
  async getTopic(id: string): Promise<ChatTopic | undefined> {
    return getTopicFromDB(id);
  },

  /**
   * 删除话题
   * @param id 话题ID
   */
  async deleteTopic(id: string): Promise<void> {
    await deleteTopicFromDB(id);
  },

  /**
   * 按助手ID获取话题
   * @param assistantId 助手ID
   * @returns 话题数组
   */
  async getTopicsByAssistant(assistantId: string): Promise<ChatTopic[]> {
    return getTopicsByAssistantId(assistantId);
  },

  /**
   * 获取最近的话题
   * @param limit 限制数量
   * @returns 话题数组
   */
  async getRecentTopics(limit: number = 10): Promise<ChatTopic[]> {
    return getRecentTopics(limit);
  },

  /**
   * 保存设置
   * @param id 设置ID
   * @param value 设置值
   */
  async saveSetting(id: string, value: any): Promise<void> {
    await saveSettingToDB(id, value);
  },

  /**
   * 获取设置
   * @param id 设置ID
   * @returns 设置值或undefined
   */
  async getSetting(id: string): Promise<any> {
    return getSettingFromDB(id);
  },

  /**
   * 保存图片数据
   * @param id 图片ID
   * @param blob 图片Blob数据
   * @param metadata 图片元数据
   */
  async saveImage(id: string, blob: Blob, metadata: any): Promise<void> {
    const db = await initDB();
    await db.put(STORES.IMAGES, blob, id);
    await db.put(STORES.IMAGE_METADATA, { id, ...metadata });
  },

  /**
   * 获取图片数据
   * @param id 图片ID
   * @returns 图片Blob数据
   */
  async getImage(id: string): Promise<Blob | undefined> {
    const db = await initDB();
    return db.get(STORES.IMAGES, id);
  },

  /**
   * 获取图片元数据
   * @param id 图片ID
   * @returns 图片元数据
   */
  async getImageMetadata(id: string): Promise<any> {
    const db = await initDB();
    return db.get(STORES.IMAGE_METADATA, id);
  },

  /**
   * 保存Base64图片
   * @param base64Data Base64编码的图片数据
   * @param metadata 图片元数据
   * @returns 图片引用
   */
  async saveBase64Image(base64Data: string, metadata: any): Promise<{ id: string }> {
    try {
      // 生成唯一ID
      const id = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // 转换Base64为Blob
      const response = await fetch(base64Data);
      const blob = await response.blob();

      // 保存图片和元数据
      const db = await initDB();
      await db.put(STORES.IMAGES, blob, id);

      // 准备元数据
      const imageMetadata = {
        id,
        mimeType: metadata.mimeType || 'image/png',
        created: Date.now(),
        ...metadata
      };

      await db.put(STORES.IMAGE_METADATA, imageMetadata);

      return { id };
    } catch (error) {
      console.error('保存Base64图片失败:', error);
      throw error;
    }
  }
};

// 初始化存储服务
initStorageService().catch(console.error);

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
   * 清除所有存储
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
   * 获取所有键
   * @returns 所有存储键的数组
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
   * 批量设置多个键值对
   * @param items 键值对对象
   */
  static async setItems(items: Record<string, any>): Promise<void> {
    try {
      const operations = Object.entries(items).map(([key, value]) => {
        return this.setItem(key, value);
      });

      await Promise.all(operations);
    } catch (error) {
      console.error('CapacitorStorageService.setItems 失败:', error);
      throw error;
    }
  }
}