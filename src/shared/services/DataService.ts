import { openDB } from 'idb';
import type { IDBPDatabase, DBSchema } from 'idb';
import type { Assistant } from '../types/Assistant';
import type { ChatTopic } from '../types';
import { nanoid } from '../utils';
import { DB_CONFIG } from '../types/DatabaseSchema';
// 导入 localStorage 工具函数
import {
  getLocalStorageItem,
  setLocalStorageItem,
  removeLocalStorageItem,
  getAllLocalStorageKeys,
  clearLocalStorage
} from '../utils/storage.ts';

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

// 定义事件类型
export type DataChangeEvent =
  | { type: 'assistantAdded'; detail: { assistantId: string } }
  | { type: 'assistantUpdated'; detail: { assistantId: string } }
  | { type: 'assistantDeleted'; detail: { assistantId: string } }
  | { type: 'topicAdded'; detail: { topicId: string } }
  | { type: 'topicUpdated'; detail: { topicId: string } }
  | { type: 'topicDeleted'; detail: { topicId: string } }
  | { type: 'settingChanged'; detail: { settingKey: string } }
  | { type: 'imageAdded'; detail: { imageId: string; topicId?: string } }
  | { type: 'imageDeleted'; detail: { imageId: string } }
  | { type: 'metadataChanged'; detail: { metadataKey: string } }
  | { type: 'allDataCleared' }
  | { type: 'localStorageCleared' };

// Event target for data changes
const dataChangeNotifier = new EventTarget();

/**
 * Helper function to dispatch data change events.
 * @param eventData The event data to dispatch.
 */
function dispatchDataChangeEvent(eventData: DataChangeEvent) {
  const detailExists = 'detail' in eventData && eventData.detail !== undefined;
  console.log(
    'DataService: dispatching event:',
    eventData.type,
    detailExists ? eventData.detail : ''
  );
  dataChangeNotifier.dispatchEvent(new CustomEvent<DataChangeEvent>('dataChange', { detail: eventData }));
}

/**
 * Subscribe to data change events.
 * @param callback Callback function to handle the event.
 * @returns Function to unsubscribe.
 */
export function subscribeToDataChanges(callback: (event: CustomEvent<DataChangeEvent>) => void): () => void {
  dataChangeNotifier.addEventListener('dataChange', callback as EventListener);
  return () => {
    dataChangeNotifier.removeEventListener('dataChange', callback as EventListener);
  };
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
      console.log('DataService: Instance created.'); // 新增日志
    }
    return DataService.instance;
  }

  /**
   * 初始化数据库连接
   */
  public async initDB(): Promise<void> {
    console.log('DataService: initDB called.'); // 新增日志
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
        console.log('DataService: initDB finished.'); // 新增日志
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

        try {
          // 导入AssistantManager以使用其更可靠的方法
          const { AssistantManager } = await import('./assistant/AssistantManager');

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

          // 使用AssistantManager的方法保存，它有更好的错误处理
          const success = await AssistantManager.addAssistant(defaultAssistant);
          if (success) {
            console.log('DataService: 默认助手创建成功');
          } else {
            console.error('DataService: 默认助手创建失败');

            // 尝试直接使用IndexedDB API作为最后的尝试
            try {
              const db = await this.getDB();
              const jsonString = JSON.stringify(defaultAssistant);
              const cleanAssistant = JSON.parse(jsonString);

              const tx = db.transaction(DB_CONFIG.STORES.ASSISTANTS, 'readwrite');
              await tx.store.put(cleanAssistant);
              await tx.done;

              console.log('DataService: 默认助手通过直接IndexedDB API创建成功');
            } catch (directDbError) {
              console.error('DataService: 通过直接IndexedDB API创建默认助手失败', directDbError);
            }
          }
        } catch (importError) {
          console.error('DataService: 导入AssistantManager失败，尝试直接保存', importError);

          // 如果导入失败，尝试直接保存
          try {
            // 创建默认系统助手
            const defaultAssistant: Assistant = {
              id: 'default-system-assistant',
              name: '默认助手',
              description: '默认AI助手，可以帮助你回答各种问题。',
              icon: null,
              isSystem: true,
              topicIds: [],
              systemPrompt: '你是一个有用的AI助手，提供准确、有帮助的回答。'
            };

            await this.saveAssistant(defaultAssistant);
            console.log('DataService: 默认助手通过saveAssistant创建成功');
          } catch (saveError) {
            console.error('DataService: 通过saveAssistant创建默认助手失败', saveError);
          }
        }
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
      console.log('DataService: DB not initialized, calling initDB.'); // 新增日志
      await this.initDB();
    }
    if (!this.db) {
      console.error('DataService: DB is null after initDB, this should not happen.'); // 新增日志
      throw new Error('数据库未初始化或初始化失败。');
    }
    return this.db;
  }

  /**
   * 助手相关方法
   */

  // 获取所有助手
  public async getAllAssistants(): Promise<Assistant[]> {
    console.log('DataService: getAllAssistants called.'); // 新增日志
    const db = await this.getDB();
    const result = await db.getAll(DB_CONFIG.STORES.ASSISTANTS);
    console.log(`DataService: getAllAssistants returned ${result.length} assistants.`); // 新增日志
    return result;
  }

  /**
   * 获取助手
   */
  public async getAssistant(id: string): Promise<Assistant | null> {
    console.log(`DataService: getAssistant called with id: ${id}`); // 新增日志
    const db = await this.getDB();
    const result = await db.get(DB_CONFIG.STORES.ASSISTANTS, id);
    console.log(`DataService: getAssistant for id ${id} returned:`, result ? 'found' : 'not found'); // 新增日志
    return result ?? null;
  }

  /**
   * 保存助手
   */
  public async saveAssistant(assistant: Assistant): Promise<void> {
    console.log('DataService: saveAssistant called with assistant:', assistant.id); // 新增日志

    try {
      // 确保ID存在
      if (!assistant.id) {
        console.error('DataService: 助手ID不存在，无法保存');
        throw new Error('助手ID不存在，无法保存');
      }

      // 确保topicIds是有效数组
      if (assistant.topicIds && !Array.isArray(assistant.topicIds)) {
        console.error(`DataService: 助手 ${assistant.name} (${assistant.id}) 的topicIds不是数组，已修正`);
        assistant.topicIds = [];
      }

      // 记录保存前的话题ID列表，用于比较
      const beforeTopicIds = Array.isArray(assistant.topicIds) ? [...assistant.topicIds] : [];
      console.log(`DataService: 助手 ${assistant.name} (${assistant.id}) 保存前话题数: ${beforeTopicIds.length}`);

      // 创建一个最小化的安全对象，避免任何可能的序列化问题
      const safeAssistant = {
        id: assistant.id,
        name: assistant.name || '未命名助手',
        description: assistant.description || '',
        icon: null, // 确保图标为null
        isSystem: !!assistant.isSystem,
        topicIds: beforeTopicIds,
        systemPrompt: assistant.systemPrompt || ''
      };

      try {
        // 尝试使用标准方法保存
        const db = await this.getDB();
        const isNew = !(await db.get(DB_CONFIG.STORES.ASSISTANTS, assistant.id));

        // 使用事务存储助手数据
        const tx = db.transaction(DB_CONFIG.STORES.ASSISTANTS, 'readwrite');
        await tx.store.put(safeAssistant);
        await tx.done;

        console.log(`DataService: 助手 ${assistant.name} (${assistant.id}) 保存成功，话题数: ${beforeTopicIds.length}`);
        dispatchDataChangeEvent({
          type: isNew ? 'assistantAdded' : 'assistantUpdated',
          detail: { assistantId: assistant.id }
        });
      } catch (primaryError) {
        console.error(`DataService: 使用标准方法保存助手 ${assistant.id} 失败:`, primaryError);

        // 尝试使用更直接的方法作为备选
        try {
          console.log(`DataService: 尝试使用直接方法保存助手 ${assistant.id}`);

          // 确保对象是纯JSON，移除所有函数和复杂对象
          const jsonString = JSON.stringify(safeAssistant);
          const cleanAssistant = JSON.parse(jsonString);

          // 打开新的数据库连接
          const db = await openDB(DB_CONFIG.NAME, DB_CONFIG.VERSION);

          // 使用事务直接保存到IndexedDB
          const tx = db.transaction(DB_CONFIG.STORES.ASSISTANTS, 'readwrite');
          await tx.store.put(cleanAssistant);
          await tx.done;

          console.log(`DataService: 助手 ${assistant.id} 通过直接方法保存成功`);

          // 关闭这个临时连接
          db.close();

          // 仍然分发事件
          const isNew = false; // 假设不是新的，因为我们无法确定
          dispatchDataChangeEvent({
            type: isNew ? 'assistantAdded' : 'assistantUpdated',
            detail: { assistantId: assistant.id }
          });
        } catch (fallbackError: any) {
          console.error(`DataService: 所有保存方法都失败，无法保存助手 ${assistant.id}:`, fallbackError);
          throw new Error(`无法保存助手: ${fallbackError?.message || String(fallbackError)}`);
        }
      }
    } catch (error) {
      console.error(`DataService: 保存助手 ${assistant?.id || 'unknown'} 时发生错误:`, error);
      throw error;
    }
  }

  // 删除助手
  public async deleteAssistant(id: string): Promise<void> {
    console.log(`DataService: deleteAssistant called with id: ${id}`); // 新增日志
    const db = await this.getDB();
    await db.delete(DB_CONFIG.STORES.ASSISTANTS, id);
    console.log(`DataService: Assistant ${id} deleted successfully.`); // 新增日志
    dispatchDataChangeEvent({ type: 'assistantDeleted', detail: { assistantId: id } });
    // TODO: Consider deleting related topics or handling them as per requirements
  }

  /**
   * 话题相关方法
   */

  // 获取所有话题
  public async getAllTopics(): Promise<ChatTopic[]> {
    console.log('DataService: getAllTopics called.'); // 新增日志
    const db = await this.getDB();
    const result = await db.getAll(DB_CONFIG.STORES.TOPICS);
    console.log(`DataService: getAllTopics returned ${result.length} topics.`); // 新增日志
    return result;
  }

  // 获取单个话题
  public async getTopic(id: string): Promise<ChatTopic | undefined> {
    console.log(`DataService: getTopic called with id: ${id}`); // 新增日志
    const db = await this.getDB();
    const result = await db.get(DB_CONFIG.STORES.TOPICS, id);
    console.log(`DataService: getTopic for id ${id} returned:`, result ? 'found' : 'not found'); // 新增日志
    return result;
  }

  // 保存话题
  public async saveTopic(topic: ChatTopic): Promise<void> {
    console.log(`DataService: saveTopic called with topic: ${topic.id}`);
    const db = await this.getDB();
    const isNew = !(await db.get(DB_CONFIG.STORES.TOPICS, topic.id));
    await db.put(DB_CONFIG.STORES.TOPICS, this.deepCleanForStorage(topic));
    console.log(`DataService: Topic ${topic.id} saved successfully.`);
    dispatchDataChangeEvent({ type: isNew ? 'topicAdded' : 'topicUpdated', detail: { topicId: topic.id } });
  }

  // 删除话题
  public async deleteTopic(id: string): Promise<void> {
    console.log(`DataService: deleteTopic called with id: ${id}`); // 新增日志
    const db = await this.getDB();
    await db.delete(DB_CONFIG.STORES.TOPICS, id);
    console.log(`DataService: Topic ${id} deleted successfully.`); // 新增日志
    // Also delete associated images
    await this.deleteImagesForTopic(id);
    dispatchDataChangeEvent({ type: 'topicDeleted', detail: { topicId: id } });
  }

  /**
   * 设置相关方法
   */

  // 保存设置
  public async saveSetting(id: string, value: any): Promise<void> {
    console.log(`DataService: saveSetting called with id: ${id}, value:`, value); // 新增日志
    const db = await this.getDB();
    await db.put(DB_CONFIG.STORES.SETTINGS, { id, value: this.deepCleanForStorage(value) });
    console.log(`DataService: Setting ${id} saved successfully.`); // 新增日志
    dispatchDataChangeEvent({ type: 'settingChanged', detail: { settingKey: id } });
  }

  // 获取设置
  public async getSetting(id: string): Promise<any> {
    console.log(`DataService: getSetting called with id: ${id}`); // 新增日志
    const db = await this.getDB();
    const result = await db.get(DB_CONFIG.STORES.SETTINGS, id);
    console.log(`DataService: getSetting for id ${id} returned:`, result ? result.value : 'not found'); // 新增日志
    return result ? result.value : undefined;
  }

  // 删除设置
  public async deleteSetting(id: string): Promise<void> {
    console.log(`DataService: deleteSetting called with id: ${id}`); // 新增日志
    const db = await this.getDB();
    await db.delete(DB_CONFIG.STORES.SETTINGS, id);
    console.log(`DataService: Setting ${id} deleted successfully.`); // 新增日志
    dispatchDataChangeEvent({ type: 'settingChanged', detail: { settingKey: id } }); // Or a more specific 'settingDeleted'
  }

  /**
   * 图片相关方法
   */

  // 保存图片
  public async saveImage(blob: Blob, metadata: Omit<ImageMetadata, 'id' | 'created'>): Promise<string> {
    console.log('DataService: saveImage called.'); // 新增日志
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

    console.log(`DataService: Image ${id} and its metadata saved successfully.`); // 新增日志
    dispatchDataChangeEvent({ type: 'imageAdded', detail: { imageId: id, topicId: metadata.topicId } });
    return id;
  }

  // 获取图片Blob数据
  public async getImageBlob(id: string): Promise<Blob | undefined> {
    console.log(`DataService: getImageBlob called for id: ${id}`); // 新增日志
    const db = await this.getDB();
    const imageRecord = await db.get('images', id);
    // 从ImageData中提取Blob数据
    const blob = imageRecord ? imageRecord.data : undefined;
    console.log(`DataService: getImageBlob for id ${id} returned:`, blob ? 'Blob found' : 'not found'); // 新增日志
    return blob;
  }

  // 获取图片元数据
  public async getImageMetadata(id: string): Promise<ImageMetadata | undefined> {
    console.log(`DataService: getImageMetadata called for id: ${id}`); // 新增日志
    const db = await this.getDB();
    const metadata = await db.get('imageMetadata', id);
    console.log(`DataService: getImageMetadata for id ${id} returned:`, metadata ? 'found' : 'not found'); // 新增日志
    return metadata;
  }

  // 获取话题的所有图片元数据
  public async getTopicImageMetadata(topicId: string): Promise<ImageMetadata[]> {
    console.log(`DataService: getTopicImageMetadata called for topicId: ${topicId}`); // 新增日志
    const db = await this.getDB();
    const result = await db.getAllFromIndex('imageMetadata', 'by-topic', topicId);
    console.log(`DataService: getTopicImageMetadata for topicId ${topicId} returned ${result.length} items.`); // 新增日志
    return result;
  }

  // 删除图片
  public async deleteImage(id: string): Promise<void> {
    console.log(`DataService: deleteImage called for id: ${id}`); // 新增日志
    const db = await this.getDB();

    // 为每个存储分别创建事务
    const imagesTx = db.transaction('images', 'readwrite');
    await imagesTx.store.delete(id);
    await imagesTx.done;

    const metadataTx = db.transaction('imageMetadata', 'readwrite');
    await metadataTx.store.delete(id);
    await metadataTx.done;

    console.log(`DataService: Image ${id} and its metadata deleted successfully.`); // 新增日志
    dispatchDataChangeEvent({ type: 'imageDeleted', detail: { imageId: id } });
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

  private async deleteImagesForTopic(topicId: string): Promise<void> {
    console.log(`DataService: deleteImagesForTopic called for topicId: ${topicId}`); // 新增日志
    const db = await this.getDB();
    const metadatas = await db.getAllFromIndex(DB_CONFIG.STORES.IMAGE_METADATA, 'by-topic', topicId);
    if (metadatas.length > 0) {
      const tx = db.transaction([DB_CONFIG.STORES.IMAGES, DB_CONFIG.STORES.IMAGE_METADATA], 'readwrite');
      const imageStore = tx.objectStore(DB_CONFIG.STORES.IMAGES);
      const metadataStore = tx.objectStore(DB_CONFIG.STORES.IMAGE_METADATA);
      const deletePromises: Promise<void>[] = [];
      for (const metadata of metadatas) {
        deletePromises.push(imageStore.delete(metadata.id));
        deletePromises.push(metadataStore.delete(metadata.id));
        // Dispatch event for each deleted image inside the loop for more granular updates
        dispatchDataChangeEvent({ type: 'imageDeleted', detail: { imageId: metadata.id } });
      }
      await Promise.all(deletePromises);
      await tx.done;
      console.log(`DataService: Deleted ${metadatas.length} images for topic ${topicId}.`);
    } else {
      console.log(`DataService: No images found for topic ${topicId} to delete.`);
    }
  }

  // --- Metadata Store Operations --- //
  public async saveMetadata(id: string, value: any): Promise<void> {
    console.log(`DataService: saveMetadata called with id: ${id}, value:`, value); // 新增日志
    const db = await this.getDB();
    await db.put(DB_CONFIG.STORES.METADATA, { id, value: this.deepCleanForStorage(value) });
    console.log(`DataService: Metadata ${id} saved successfully.`); // 新增日志
    dispatchDataChangeEvent({ type: 'metadataChanged', detail: { metadataKey: id } });
  }

  public async getMetadata(id: string): Promise<any> {
    console.log(`DataService: getMetadata called with id: ${id}`); // 新增日志
    const db = await this.getDB();
    const result = await db.get(DB_CONFIG.STORES.METADATA, id);
    console.log(`DataService: getMetadata for id ${id} returned:`, result ? result.value : 'not found'); // 新增日志
    return result ? result.value : undefined;
  }

  public async deleteMetadata(id: string): Promise<void> {
    console.log(`DataService: deleteMetadata called with id: ${id}`); // 新增日志
    const db = await this.getDB();
    await db.delete(DB_CONFIG.STORES.METADATA, id);
    console.log(`DataService: Metadata ${id} deleted successfully.`); // 新增日志
    dispatchDataChangeEvent({ type: 'metadataChanged', detail: { metadataKey: id } }); // Or a more specific 'metadataDeleted'
  }

  // --- LocalStorage Access Methods (for migration and specific use cases) --- //
  public async getLocalStorageData<T>(key: string): Promise<T | null> {
    console.log(`DataService: getLocalStorageData called for key: ${key}`); // 新增日志
    try {
      const data = await getLocalStorageItem<T>(key);
      console.log(`DataService: getLocalStorageData for key ${key} returned:`, data ? 'data found' : 'null'); // 新增日志
      return data;
    } catch (error) {
      console.error(`DataService: Error getting localStorage data for key "${key}":`, error);
      return null;
    }
  }

  public async setLocalStorageData<T>(key: string, value: T): Promise<void> {
    console.log(`DataService: setLocalStorageData called for key: ${key}, value:`, value); // 新增日志
    try {
      await setLocalStorageItem<T>(key, value);
      console.log(`DataService: setLocalStorageData for key ${key} successful.`); // 新增日志
    } catch (error) {
      console.error(`DataService: Error setting localStorage data for key "${key}":`, error);
      throw error;
    }
  }

  public async removeLocalStorageData(key: string): Promise<void> {
    console.log(`DataService: removeLocalStorageData called for key: ${key}`); // 新增日志
    try {
      await removeLocalStorageItem(key);
      console.log(`DataService: removeLocalStorageData for key ${key} successful.`); // 新增日志
    } catch (error) {
      console.error(`DataService: Error removing localStorage data for key "${key}":`, error);
      throw error;
    }
  }

  public async getAllLocalStorageKeys(): Promise<string[]> {
    console.log('DataService: getAllLocalStorageKeys called.'); // 新增日志
    try {
      const keys = await getAllLocalStorageKeys();
      console.log(`DataService: getAllLocalStorageKeys returned ${keys.length} keys.`); // 新增日志
      return keys;
    } catch (error) {
      console.error('DataService: Error getting all localStorage keys:', error);
      return [];
    }
  }

  public async clearAllLocalStorage(): Promise<void> {
    console.log('DataService: clearAllLocalStorage called.'); // 新增日志
    try {
      await clearLocalStorage();
      console.log('DataService: clearAllLocalStorage successful.'); // 新增日志
      dispatchDataChangeEvent({ type: 'localStorageCleared' });
    } catch (error) {
      console.error('DataService: Error clearing all localStorage:', error);
      throw error;
    }
  }

  // --- End of LocalStorage Access Methods --- //

  /**
   * 清理整个数据库，包括所有对象存储
   */
  public async clearAllData(): Promise<void> {
    console.warn('DataService: clearAllData called. This will wipe all application data from IndexedDB.'); // 新增日志
    const db = await this.getDB();
    const storeNames = db.objectStoreNames;
    const tx = db.transaction(storeNames, 'readwrite');
    const promises: Promise<any>[] = [];
    for (const storeName of storeNames) {
      console.log(`DataService: Clearing store: ${storeName}`); // 新增日志
      promises.push(tx.objectStore(storeName).clear());
    }
    await Promise.all(promises);
    await tx.done;
    console.log('DataService: All data cleared from IndexedDB.'); // 新增日志

    // 额外：也清空localStorage作为彻底清理的一部分
    // 在后续阶段，当localStorage不再用于核心数据存储时，此步骤可能调整或移除
    await this.clearAllLocalStorage();
    console.log('DataService: All data cleared from localStorage as part of clearAllData.'); // 新增日志
    dispatchDataChangeEvent({ type: 'allDataCleared' });
  }
}

// 导出单例实例
export const dataService = DataService.getInstance();