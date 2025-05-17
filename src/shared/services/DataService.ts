import { openDB } from 'idb';
import type { IDBPDatabase, DBSchema } from 'idb';
import type { Assistant } from '../types/Assistant';
import type { ChatTopic } from '../types';
import { nanoid } from '../utils';
import { DB_CONFIG } from '../types/DatabaseSchema';

// 图片元数据接口
export interface ImageMetadata {
  id: string;
  topicId?: string;
  messageId?: string;
  mimeType: string;
  width?: number;
  height?: number;
  size?: number;
  created: number;
  url?: string; // 可选的远程URL
}

// 图片数据接口
export interface ImageData {
  id: string;
  data: Blob;
}

// 图片引用接口
export interface ImageReference {
  id: string;
  mimeType: string;
  width?: number;
  height?: number;
}

// 定义数据库架构
interface AetherLinkDB extends DBSchema {
  assistants: {
    key: string;
    value: Assistant;
    indexes: {
      'by-system': string;
    };
  };

  topics: {
    key: string;
    value: ChatTopic;
    indexes: {
      'by-assistant': string;
      'by-last-time': number;
    };
  };

  images: {
    key: string;
    value: ImageData;
  };

  imageMetadata: {
    key: string;
    value: ImageMetadata;
    indexes: {
      'by-topic': string;
      'by-time': number;
    };
  };

  settings: {
    key: string;
    value: any;
  };

  metadata: {
    key: string;
    value: any;
  };
}

// 使用统一的数据库配置
const DB_NAME = DB_CONFIG.NAME;
const DB_VERSION = DB_CONFIG.VERSION;

/**
 * 数据服务类
 * 提供对数据库的统一访问和管理
 */
export class DataService {
  private static instance: DataService;
  private db: IDBPDatabase<AetherLinkDB> | null = null;
  private dbInitPromise: Promise<void> | null = null;
  private isInitializing = false;

  // 私有构造函数
  private constructor() {}

  // 获取单例实例
  public static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  /**
   * 初始化数据库连接
   */
  public async initDB(): Promise<void> {
    // 确保不会同时有多个初始化请求
    if (this.isInitializing) {
      console.log('DataService: 已有一个数据库初始化操作在进行中...');
      if (this.dbInitPromise) {
        try {
          await this.dbInitPromise;
          return;
        } catch (error) {
          console.error('DataService: 等待现有初始化操作失败', error);
          // 继续尝试新的初始化
        }
      }
    }

    this.isInitializing = true;

    // 创建初始化Promise
    this.dbInitPromise = new Promise<void>(async (resolve, reject) => {
      try {
        // 先尝试清理旧数据库
        await this.cleanupOldDatabases();

        // 如果已经有连接，先关闭
        await this.closeDatabase();

        // 使用超时机制防止无限等待
        const timeoutId = setTimeout(() => {
          reject(new Error('数据库连接超时，可能是由于阻塞'));
        }, 10000); // 10秒超时

        console.log(`DataService: 正在初始化数据库 ${DB_NAME} v${DB_VERSION}...`);

        // 打开数据库连接
        this.db = await openDB<AetherLinkDB>(DB_NAME, DB_VERSION, {
          upgrade: this.upgradeDatabase.bind(this),
          blocked: () => {
            console.warn('DataService: 数据库升级被阻塞，将尝试清理连接');
            this.closeDatabase().catch(() => null);
          },
          blocking: () => {
            console.warn('DataService: 此连接正在阻塞数据库升级，将关闭连接');
            this.closeDatabase().catch(() => null);
          },
          terminated: () => {
            console.error('DataService: 数据库连接意外终止，将尝试重新连接');
            this.db = null;
            this.isInitializing = false;
          }
        });

        // 清除超时
        clearTimeout(timeoutId);

        console.log('DataService: 数据库初始化成功!');

        // 验证并修复数据库
        await this.verifyAndRepairDatabase();

        resolve();
      } catch (error) {
        console.error('DataService: 数据库初始化失败', error);
        this.db = null;
        reject(error);
      } finally {
        this.isInitializing = false;
      }
    });

    try {
      await this.dbInitPromise;
    } catch (error) {
      this.dbInitPromise = null;
      throw error;
    }
  }

  /**
   * 关闭数据库连接
   */
  private async closeDatabase(): Promise<void> {
    if (this.db) {
      try {
        this.db.close();
        console.log('DataService: 已关闭数据库连接');
      } catch (error) {
        console.error('DataService: 关闭数据库连接时出错', error);
      }
      this.db = null;
    }
  }

  /**
   * 清理旧数据库
   */
  public async cleanupOldDatabases(): Promise<void> {
    try {
      // 获取所有数据库
      const databases = await indexedDB.databases();

      // 当前使用的数据库名称
      const currentDB = DB_NAME;

      // 需要清理的旧数据库
      const oldDBs = databases
        .filter((db: { name?: string }) => db.name && db.name !== currentDB)
        .map((db: { name?: string }) => db.name as string);

      console.log(`DataService: 发现 ${oldDBs.length} 个旧数据库需要清理`);

      // 清理旧数据库
      for (const dbName of oldDBs) {
        try {
          console.log(`DataService: 尝试删除旧数据库 ${dbName}...`);
          const deleteRequest = indexedDB.deleteDatabase(dbName);
          deleteRequest.onsuccess = () => {
            console.log(`DataService: 成功删除旧数据库: ${dbName}`);
          };
          deleteRequest.onerror = (event: Event) => {
            console.error(`DataService: 删除数据库 ${dbName} 失败:`, event);
          };
        } catch (error) {
          console.error(`DataService: 删除旧数据库 ${dbName} 失败`, error);
        }
      }
    } catch (error) {
      console.error('DataService: 清理旧数据库失败:', error);
    }
  }

  /**
   * 升级数据库
   */
  private upgradeDatabase(db: IDBPDatabase<AetherLinkDB>, oldVersion: number, newVersion: number): void {
    console.log(`DataService: 数据库升级 v${oldVersion} -> v${newVersion}`);

    // 创建所需的对象存储
    if (!db.objectStoreNames.contains(DB_CONFIG.STORES.ASSISTANTS)) {
      const assistantStore = db.createObjectStore(DB_CONFIG.STORES.ASSISTANTS, { keyPath: 'id' });
      assistantStore.createIndex('by-system', 'isSystem');
      console.log(`DataService: 创建${DB_CONFIG.STORES.ASSISTANTS}存储`);
    }

    if (!db.objectStoreNames.contains(DB_CONFIG.STORES.TOPICS)) {
      const topicStore = db.createObjectStore(DB_CONFIG.STORES.TOPICS, { keyPath: 'id' });
      topicStore.createIndex('by-assistant', 'assistantId');
      topicStore.createIndex('by-last-time', 'lastMessageTime');
      console.log(`DataService: 创建${DB_CONFIG.STORES.TOPICS}存储`);
    }

    if (!db.objectStoreNames.contains(DB_CONFIG.STORES.SETTINGS)) {
      db.createObjectStore(DB_CONFIG.STORES.SETTINGS, { keyPath: 'id' });
      console.log(`DataService: 创建${DB_CONFIG.STORES.SETTINGS}存储`);
    }

    if (!db.objectStoreNames.contains(DB_CONFIG.STORES.METADATA)) {
      db.createObjectStore(DB_CONFIG.STORES.METADATA, { keyPath: 'id' });
      console.log(`DataService: 创建${DB_CONFIG.STORES.METADATA}存储`);
    }

    if (!db.objectStoreNames.contains(DB_CONFIG.STORES.IMAGES)) {
      db.createObjectStore(DB_CONFIG.STORES.IMAGES, { keyPath: 'id' });
      console.log(`DataService: 创建${DB_CONFIG.STORES.IMAGES}存储`);
    }

    if (!db.objectStoreNames.contains(DB_CONFIG.STORES.IMAGE_METADATA)) {
      const imageMetaStore = db.createObjectStore(DB_CONFIG.STORES.IMAGE_METADATA, { keyPath: 'id' });
      imageMetaStore.createIndex('by-topic', 'topicId');
      imageMetaStore.createIndex('by-time', 'created');
      console.log(`DataService: 创建${DB_CONFIG.STORES.IMAGE_METADATA}存储`);
    }
  }

  /**
   * 深度清理对象，移除所有不可序列化的内容
   */
  private deepCleanForStorage<T>(obj: T): T {
    const removeReactElements = (target: any): any => {
      if (!target || typeof target !== 'object') {
        return target;
      }

      // 处理数组
      if (Array.isArray(target)) {
        return target.map(item => removeReactElements(item));
      }

      // 处理普通对象
      const result = { ...target };

      // 遍历所有属性
      for (const key of Object.keys(result)) {
        const value = result[key];

        // 移除函数和Symbol
        if (typeof value === 'function' || typeof value === 'symbol') {
          delete result[key];
          continue;
        }

        // 检查是否是React元素
        if (
          value &&
          typeof value === 'object' &&
          (
            // 检查常见的React元素属性
            ('$$typeof' in value) ||
            ('_owner' in value && '_store' in value) ||
            ('type' in value && 'props' in value && 'key' in value)
          )
        ) {
          // 移除React元素
          delete result[key];
          continue;
        }

        // 递归处理嵌套对象
        if (value && typeof value === 'object') {
          result[key] = removeReactElements(value);
        }
      }

      return result;
    };

    return removeReactElements(obj);
  }

  /**
   * 初始化默认助手
   */
  private async initializeDefaultAssistants(): Promise<void> {
    try {
      // 获取所有助手
      const assistants = await this.getAllAssistants();

      if (assistants.length === 0) {
        console.log('DataService: 未发现助手，创建默认助手');

        // 创建默认系统助手
        const defaultAssistant: Assistant = {
          id: 'default-system-assistant',
          name: '默认助手',
          description: '默认AI助手，可以帮助你回答各种问题。',
          icon: null, // 存储时会被清理
          isSystem: true,
          topicIds: [],
          systemPrompt: '你是一个有用的AI助手，提供准确、有帮助的回答。'
        };

        // 保存默认助手
        await this.saveAssistant(defaultAssistant);
      } else {
        console.log(`DataService: 系统中已有 ${assistants.length} 个助手`);

        // 验证并修复所有助手的话题引用
        await this.validateAndCleanAssistantTopicReferences();
      }
    } catch (error) {
      console.error('DataService: 初始化默认助手失败', error);
    }
  }

  /**
   * 验证并清理助手中的无效话题引用（简化版）
   */
  private async validateAndCleanAssistantTopicReferences(): Promise<void> {
    try {
      // 获取所有助手
      const assistants = await this.getAllAssistants();
      if (!assistants || assistants.length === 0) {
        return;
      }

      // 对每个助手进行简单检查
      for (const assistant of assistants) {
        // 只确保topicIds是数组，不做复杂的无效ID检查
        if (!assistant.topicIds) {
          console.log(`DataService: 助手 ${assistant.name} (${assistant.id}) 没有topicIds字段，初始化为空数组`);
          assistant.topicIds = [];
          await this.saveAssistant(assistant);
        } else if (!Array.isArray(assistant.topicIds)) {
          console.log(`DataService: 助手 ${assistant.name} (${assistant.id}) 的topicIds不是数组，已修正`);
          assistant.topicIds = [];
          await this.saveAssistant(assistant);
        }
      }
    } catch (error) {
      console.error('DataService: 简化话题引用验证失败', error);
    }
  }

  /**
   * 验证并修复数据库
   */
  private async verifyAndRepairDatabase(): Promise<void> {
    try {
      // 获取数据库连接
      const db = await this.getDB();

      // 检查所有必需的对象存储是否存在
      const expectedStores = [
        DB_CONFIG.STORES.ASSISTANTS,
        DB_CONFIG.STORES.TOPICS,
        DB_CONFIG.STORES.SETTINGS,
        DB_CONFIG.STORES.IMAGES,
        DB_CONFIG.STORES.IMAGE_METADATA,
        DB_CONFIG.STORES.METADATA
      ] as const;
      const missingStores = expectedStores.filter(store => !db.objectStoreNames.contains(store));

      if (missingStores.length > 0) {
        console.warn(`DataService: 数据库缺少以下对象存储: ${missingStores.join(',')}`);
      }

      // 检查并初始化默认助手
      await this.initializeDefaultAssistants();

      // 验证并清理无效的话题引用
      await this.validateAndCleanAssistantTopicReferences();

    } catch (error) {
      console.error('DataService: 验证数据库时出错', error);
    }
  }

  /**
   * 获取数据库连接
   */
  private async getDB(): Promise<IDBPDatabase<AetherLinkDB>> {
    if (!this.db) {
      await this.initDB();
      if (!this.db) {
        throw new Error('数据库初始化失败');
      }
    }
    return this.db;
  }

  /**
   * 助手相关方法
   */

  // 获取所有助手
  public async getAllAssistants(): Promise<Assistant[]> {
    try {
      const db = await this.getDB();
      return await db.getAll(DB_CONFIG.STORES.ASSISTANTS);
    } catch (error) {
      console.error('DataService: 获取所有助手失败', error);
      throw new Error(`获取助手失败: ${error}`);
    }
  }

  /**
   * 获取助手
   */
  public async getAssistant(id: string): Promise<Assistant | null> {
    try {
      const db = await this.getDB();
      const assistant = await db.get(DB_CONFIG.STORES.ASSISTANTS, id);

      if (assistant) {
        // 验证助手数据完整性
        if (!assistant.topicIds) {
          console.warn(`DataService: 助手 ${assistant.name} (${assistant.id}) 没有topicIds字段，已添加`);
          assistant.topicIds = [];
        } else if (!Array.isArray(assistant.topicIds)) {
          console.warn(`DataService: 助手 ${assistant.name} (${assistant.id}) 的topicIds不是数组，已修正`);
          assistant.topicIds = [];
        }
      }

      return assistant || null;
    } catch (error) {
      console.error(`获取助手 ${id} 失败:`, error);
      return null;
    }
  }

  /**
   * 保存助手
   */
  public async saveAssistant(assistant: Assistant): Promise<void> {
    try {
      console.log(`DataService: 保存助手 ${assistant.name} (${assistant.id})`);

      // 确保topicIds是有效数组
      if (assistant.topicIds && !Array.isArray(assistant.topicIds)) {
        console.error(`DataService: 助手 ${assistant.name} (${assistant.id}) 的topicIds不是数组，已修正`);
        assistant.topicIds = [];
      }

      // 记录保存前的话题ID列表，用于比较
      const beforeTopicIds = Array.isArray(assistant.topicIds) ? [...assistant.topicIds] : [];
      console.log(`DataService: 助手 ${assistant.name} (${assistant.id}) 保存前话题数: ${beforeTopicIds.length}`);

      // 清理对象确保可序列化
      const storageAssistant = this.deepCleanForStorage(assistant);

      const db = await this.getDB();

      // 保存助手数据
      await db.put(DB_CONFIG.STORES.ASSISTANTS, storageAssistant);

      // 验证保存结果
      const savedAssistant = await db.get(DB_CONFIG.STORES.ASSISTANTS, assistant.id);
      if (!savedAssistant) {
        console.error(`DataService: 保存助手 ${assistant.name} (${assistant.id}) 后验证失败，无法读取`);
        return;
      }

      // 比较话题ID
      const savedTopicIds = Array.isArray(savedAssistant.topicIds) ? savedAssistant.topicIds : [];
      console.log(`DataService: 助手 ${assistant.name} (${assistant.id}) 保存后话题数: ${savedTopicIds.length}`);

      if (beforeTopicIds.length > 0 && savedTopicIds.length === 0) {
        console.error(`DataService: 助手 ${assistant.name} (${assistant.id}) 话题ID在保存过程中丢失`);

        // 尝试修复
        if (beforeTopicIds.length > 0) {
          console.log(`DataService: 尝试修复助手 ${assistant.name} (${assistant.id}) 的话题关联`);
          const fixAssistant = {
            ...savedAssistant,
            topicIds: beforeTopicIds
          };

          const cleanFixAssistant = this.deepCleanForStorage(fixAssistant);
          await db.put(DB_CONFIG.STORES.ASSISTANTS, cleanFixAssistant);
          console.log(`DataService: 已修复助手 ${assistant.name} (${assistant.id}) 的话题关联`);
        }
      } else {
        console.log(`DataService: 助手 ${assistant.name} (${assistant.id}) 保存成功，话题数: ${savedTopicIds.length}`);
      }
    } catch (error) {
      console.error('保存助手失败:', error);
      throw error;
    }
  }

  // 删除助手
  public async deleteAssistant(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      await db.delete(DB_CONFIG.STORES.ASSISTANTS, id);
      console.log(`DataService: 助手 ${id} 删除成功`);
    } catch (error) {
      console.error(`DataService: 删除助手 ${id} 失败`, error);
      throw new Error(`删除助手失败: ${error}`);
    }
  }

  /**
   * 话题相关方法
   */

  // 获取所有话题
  public async getAllTopics(): Promise<ChatTopic[]> {
    try {
      const db = await this.getDB();
      return await db.getAll(DB_CONFIG.STORES.TOPICS);
    } catch (error) {
      console.error('DataService: 获取所有话题失败', error);
      throw new Error(`获取话题失败: ${error}`);
    }
  }

  // 获取单个话题
  public async getTopic(id: string): Promise<ChatTopic | undefined> {
    try {
      const db = await this.getDB();
      return await db.get(DB_CONFIG.STORES.TOPICS, id);
    } catch (error) {
      console.error(`DataService: 获取话题 ${id} 失败`, error);
      throw new Error(`获取话题失败: ${error}`);
    }
  }

  // 保存话题
  public async saveTopic(topic: ChatTopic): Promise<void> {
    try {
      const db = await this.getDB();
      await db.put(DB_CONFIG.STORES.TOPICS, topic);
      console.log(`DataService: 话题 ${topic.id} 保存成功`);
    } catch (error) {
      console.error('DataService: 保存话题失败', error);
      throw new Error(`保存话题失败: ${error}`);
    }
  }

  // 删除话题
  public async deleteTopic(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      await db.delete(DB_CONFIG.STORES.TOPICS, id);
      console.log(`DataService: 话题 ${id} 删除成功`);
    } catch (error) {
      console.error(`DataService: 删除话题 ${id} 失败`, error);
      throw new Error(`删除话题失败: ${error}`);
    }
  }

  /**
   * 设置相关方法
   */

  // 保存设置
  public async saveSetting(id: string, value: any): Promise<void> {
    try {
      const db = await this.getDB();
      await db.put(DB_CONFIG.STORES.SETTINGS, { id, value });
      console.log(`DataService: 设置 ${id} 保存成功`);
    } catch (error) {
      console.error(`DataService: 保存设置 ${id} 失败`, error);
      throw new Error(`保存设置失败: ${error}`);
    }
  }

  // 获取设置
  public async getSetting(id: string): Promise<any> {
    try {
      const db = await this.getDB();
      const setting = await db.get(DB_CONFIG.STORES.SETTINGS, id);
      return setting?.value;
    } catch (error) {
      console.error(`DataService: 获取设置 ${id} 失败`, error);
      throw new Error(`获取设置失败: ${error}`);
    }
  }

  // 删除设置
  public async deleteSetting(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      await db.delete(DB_CONFIG.STORES.SETTINGS, id);
      console.log(`DataService: 设置 ${id} 删除成功`);
    } catch (error) {
      console.error(`DataService: 删除设置 ${id} 失败`, error);
      throw new Error(`删除设置失败: ${error}`);
    }
  }

  /**
   * 图片相关方法
   */

  // 保存图片
  public async saveImage(blob: Blob, metadata: Omit<ImageMetadata, 'id' | 'created'>): Promise<string> {
    try {
      const db = await this.getDB();

      // 生成唯一ID
      const id = nanoid();

      // 构建完整元数据
      const fullMetadata: ImageMetadata = {
        ...metadata,
        id,
        created: Date.now()
      };

      // 使用事务存储图片数据和元数据
      const imagesTx = db.transaction(DB_CONFIG.STORES.IMAGES, 'readwrite');

      // 使用ImageData类型包装Blob数据
      const imageData: ImageData = {
        id,
        data: blob
      };
      await imagesTx.store.put(imageData);
      await imagesTx.done;

      const metadataTx = db.transaction(DB_CONFIG.STORES.IMAGE_METADATA, 'readwrite');
      await metadataTx.store.put(fullMetadata);
      await metadataTx.done;

      console.log(`DataService: 图片 ${id} 保存成功`);
      return id;
    } catch (error) {
      console.error('DataService: 保存图片失败', error);
      throw new Error('保存图片失败: ' + error);
    }
  }

  // 获取图片Blob数据
  public async getImageBlob(id: string): Promise<Blob | undefined> {
    try {
      const db = await this.getDB();
      const imageRecord = await db.get('images', id);
      // 从ImageData中提取Blob数据
      return imageRecord ? imageRecord.data : undefined;
    } catch (error) {
      console.error(`DataService: 获取图片 ${id} 数据失败`, error);
      throw new Error(`获取图片数据失败: ${error}`);
    }
  }

  // 获取图片元数据
  public async getImageMetadata(id: string): Promise<ImageMetadata | undefined> {
    try {
      const db = await this.getDB();
      return db.get('imageMetadata', id);
    } catch (error) {
      console.error(`DataService: 获取图片 ${id} 元数据失败`, error);
      throw new Error(`获取图片元数据失败: ${error}`);
    }
  }

  // 获取话题的所有图片元数据
  public async getTopicImageMetadata(topicId: string): Promise<ImageMetadata[]> {
    try {
      const db = await this.getDB();
      return db.getAllFromIndex('imageMetadata', 'by-topic', topicId);
    } catch (error) {
      console.error(`DataService: 获取话题 ${topicId} 的图片元数据失败`, error);
      throw new Error(`获取话题图片元数据失败: ${error}`);
    }
  }

  // 删除图片
  public async deleteImage(id: string): Promise<void> {
    try {
      const db = await this.getDB();

      // 为每个存储分别创建事务
      const imagesTx = db.transaction('images', 'readwrite');
      await imagesTx.store.delete(id);
      await imagesTx.done;

      const metadataTx = db.transaction('imageMetadata', 'readwrite');
      await metadataTx.store.delete(id);
      await metadataTx.done;

      console.log(`DataService: 图片 ${id} 删除成功`);
    } catch (error) {
      console.error(`DataService: 删除图片 ${id} 失败`, error);
      throw new Error(`删除图片失败: ${error}`);
    }
  }

  // 将Base64转换为Blob并保存
  public async saveBase64Image(
    base64Data: string,
    metadata: Omit<ImageMetadata, 'id' | 'created'>
  ): Promise<ImageReference> {
    try {
      // 处理base64格式，移除前缀
      const base64Content = base64Data.includes(',')
        ? base64Data.split(',')[1]
        : base64Data;

      // 转换为Blob
      const byteCharacters = atob(base64Content);
      const byteArrays = [];

      for (let i = 0; i < byteCharacters.length; i += 512) {
        const slice = byteCharacters.slice(i, i + 512);
        const byteNumbers = new Array(slice.length);

        for (let j = 0; j < slice.length; j++) {
          byteNumbers[j] = slice.charCodeAt(j);
        }

        byteArrays.push(new Uint8Array(byteNumbers));
      }

      const blob = new Blob(byteArrays, { type: metadata.mimeType });

      // 保存图片
      const id = await this.saveImage(blob, metadata);

      // 返回图片引用
      return {
        id,
        mimeType: metadata.mimeType,
        width: metadata.width,
        height: metadata.height
      };
    } catch (error) {
      console.error('DataService: 保存Base64图片失败', error);
      throw new Error('保存Base64图片失败: ' + error);
    }
  }
}

// 导出单例实例
export const dataService = DataService.getInstance();