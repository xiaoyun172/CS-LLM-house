import Dexie from 'dexie';
import { v4 as uuid } from 'uuid';
import type { Assistant } from '../types/Assistant';
import type { ChatTopic, Message } from '../types';
import { DB_CONFIG } from '../types/DatabaseSchema';

/**
 * 基于Dexie.js的统一存储服务
 * 用于替代现有的IndexedDB直接操作，提高存储可靠性
 */
class DexieStorageService extends Dexie {
  // 定义表格
  assistants!: Dexie.Table<Assistant, string>;
  topics!: Dexie.Table<ChatTopic, string>;
  settings!: Dexie.Table<any, string>;
  images!: Dexie.Table<Blob, string>;
  imageMetadata!: Dexie.Table<any, string>;
  metadata!: Dexie.Table<any, string>;

  // 单例实例
  private static instance: DexieStorageService;

  // 创建事件目标，用于数据变更通知
  private static eventTarget = new EventTarget();

  // 数据变更事件类型
  public static readonly EVENT_TYPES = {
    ASSISTANT_ADDED: 'assistantAdded',
    ASSISTANT_UPDATED: 'assistantUpdated',
    ASSISTANT_DELETED: 'assistantDeleted',
    TOPIC_ADDED: 'topicAdded',
    TOPIC_UPDATED: 'topicUpdated',
    TOPIC_DELETED: 'topicDeleted',
    MESSAGE_ADDED: 'messageAdded',
    MESSAGE_UPDATED: 'messageUpdated',
    MESSAGE_DELETED: 'messageDeleted',
    SETTING_CHANGED: 'settingChanged',
    IMAGE_ADDED: 'imageAdded',
    IMAGE_DELETED: 'imageDeleted',
    METADATA_CHANGED: 'metadataChanged'
  };

  constructor() {
    // 初始化数据库
    super(DB_CONFIG.NAME);
    
    // 定义数据库架构
    this.version(DB_CONFIG.VERSION).stores({
      [DB_CONFIG.STORES.ASSISTANTS]: 'id',
      [DB_CONFIG.STORES.TOPICS]: 'id, lastMessageTime', // 添加lastMessageTime索引以便排序
      [DB_CONFIG.STORES.SETTINGS]: '',
      [DB_CONFIG.STORES.IMAGES]: 'id',
      [DB_CONFIG.STORES.IMAGE_METADATA]: 'id, topicId, created',
      [DB_CONFIG.STORES.METADATA]: ''
    });
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): DexieStorageService {
    if (!DexieStorageService.instance) {
      DexieStorageService.instance = new DexieStorageService();
      console.log('DexieStorageService: 实例已创建');
    }
    return DexieStorageService.instance;
  }

  /**
   * 订阅数据变更事件
   * @param eventType 事件类型
   * @param callback 回调函数
   */
  public static subscribe(eventType: string, callback: EventListener): () => void {
    DexieStorageService.eventTarget.addEventListener(eventType, callback);
    return () => {
      DexieStorageService.eventTarget.removeEventListener(eventType, callback);
    };
  }

  /**
   * 发布事件
   * @param eventType 事件类型
   * @param detail 事件详情
   */
  private static publish(eventType: string, detail?: any): void {
    const event = new CustomEvent(eventType, { detail });
    DexieStorageService.eventTarget.dispatchEvent(event);
    console.log(`DexieStorageService: 事件 ${eventType} 已发布`, detail);
  }

  /**
   * 清理对象，移除函数和复杂对象，确保可存储性
   * @param obj 原始对象
   * @returns 清理后的对象
   */
  private cleanObject<T>(obj: T): T {
    const jsonString = JSON.stringify(obj);
    return JSON.parse(jsonString);
  }

  // ============= 助手相关操作 =============

  /**
   * 获取所有助手
   */
  async getAllAssistants(): Promise<Assistant[]> {
    try {
      const assistants = await this.assistants.toArray();
      return assistants;
    } catch (error) {
      console.error('DexieStorageService: 获取所有助手失败', error);
      return [];
    }
  }

  /**
   * 获取系统助手
   */
  async getSystemAssistants(): Promise<Assistant[]> {
    try {
      const assistants = await this.assistants
        .where('isSystem')
        .equals(1)
        .toArray();
      return assistants;
    } catch (error) {
      console.error('DexieStorageService: 获取系统助手失败', error);
      return [];
    }
  }

  /**
   * 获取用户创建的助手
   */
  async getUserAssistants(): Promise<Assistant[]> {
    try {
      const assistants = await this.assistants
        .filter(assistant => !assistant.isSystem)
        .toArray();
      return assistants;
    } catch (error) {
      console.error('DexieStorageService: 获取用户助手失败', error);
      return [];
    }
  }

  /**
   * 获取助手
   * @param id 助手ID
   */
  async getAssistant(id: string): Promise<Assistant | null> {
    try {
      const assistant = await this.assistants.get(id);
      return assistant || null;
    } catch (error) {
      console.error(`DexieStorageService: 获取助手 ${id} 失败`, error);
      return null;
    }
  }

  /**
   * 保存助手
   * @param assistant 助手数据
   */
  async saveAssistant(assistant: Assistant): Promise<boolean> {
    try {
      // 确保有ID
      if (!assistant.id) {
        assistant.id = uuid();
      }

      // 清理对象
      const cleanAssistant = this.cleanObject(assistant);
      
      // 检查是更新还是创建
      const isUpdate = await this.assistants.get(cleanAssistant.id) !== undefined;

      // 保存到数据库
      await this.assistants.put(cleanAssistant);
      
      // 发布事件
      if (isUpdate) {
        DexieStorageService.publish(DexieStorageService.EVENT_TYPES.ASSISTANT_UPDATED, { assistantId: cleanAssistant.id });
      } else {
        DexieStorageService.publish(DexieStorageService.EVENT_TYPES.ASSISTANT_ADDED, { assistantId: cleanAssistant.id });
      }
      
      return true;
    } catch (error) {
      console.error('DexieStorageService: 保存助手失败', error);
      return false;
    }
  }

  /**
   * 删除助手
   * @param id 助手ID
   */
  async deleteAssistant(id: string): Promise<boolean> {
    try {
      // 获取助手关联的话题
      const assistant = await this.getAssistant(id);
      if (assistant && assistant.topicIds && assistant.topicIds.length > 0) {
        // 删除关联的话题
        for (const topicId of assistant.topicIds) {
          await this.deleteTopic(topicId);
        }
      }

      // 删除助手
      await this.assistants.delete(id);
      
      // 发布事件
      DexieStorageService.publish(DexieStorageService.EVENT_TYPES.ASSISTANT_DELETED, { assistantId: id });
      
      return true;
    } catch (error) {
      console.error(`DexieStorageService: 删除助手 ${id} 失败`, error);
      return false;
    }
  }

  // ============= 话题相关操作 =============

  /**
   * 获取所有话题
   */
  async getAllTopics(): Promise<ChatTopic[]> {
    try {
      const topics = await this.topics.toArray();
      return topics;
    } catch (error) {
      console.error('DexieStorageService: 获取所有话题失败', error);
      return [];
    }
  }

  /**
   * 获取单个话题
   * @param id 话题ID
   */
  async getTopic(id: string): Promise<ChatTopic | null> {
    try {
      const topic = await this.topics.get(id);
      return topic || null;
    } catch (error) {
      console.error(`DexieStorageService: 获取话题 ${id} 失败`, error);
      return null;
    }
  }

  /**
   * 保存话题
   * @param topic 话题数据
   */
  async saveTopic(topic: ChatTopic): Promise<boolean> {
    try {
      // 确保有ID
      if (!topic.id) {
        topic.id = uuid();
      }

      // 清理对象
      const cleanTopic = this.cleanObject(topic);
      
      // 检查是更新还是创建
      const isUpdate = await this.topics.get(cleanTopic.id) !== undefined;

      // 保存到数据库
      await this.topics.put(cleanTopic);
      
      // 发布事件
      if (isUpdate) {
        DexieStorageService.publish(DexieStorageService.EVENT_TYPES.TOPIC_UPDATED, { topicId: cleanTopic.id });
      } else {
        DexieStorageService.publish(DexieStorageService.EVENT_TYPES.TOPIC_ADDED, { topicId: cleanTopic.id });
      }
      
      return true;
    } catch (error) {
      console.error('DexieStorageService: 保存话题失败', error);
      return false;
    }
  }

  /**
   * 删除话题
   * @param id 话题ID
   */
  async deleteTopic(id: string): Promise<boolean> {
    try {
      // 删除话题
      await this.topics.delete(id);
      
      // 发布事件
      DexieStorageService.publish(DexieStorageService.EVENT_TYPES.TOPIC_DELETED, { topicId: id });
      
      return true;
    } catch (error) {
      console.error(`DexieStorageService: 删除话题 ${id} 失败`, error);
      return false;
    }
  }

  /**
   * 获取最近的话题
   * @param limit 限制数量
   */
  async getRecentTopics(limit: number = 10): Promise<ChatTopic[]> {
    try {
      const topics = await this.topics
        .orderBy('lastMessageTime')
        .reverse()
        .limit(limit)
        .toArray();
      return topics;
    } catch (error) {
      console.error('DexieStorageService: 获取最近话题失败', error);
      return [];
    }
  }

  /**
   * 按助手ID获取话题
   * @param assistantId 助手ID
   */
  async getTopicsByAssistantId(assistantId: string): Promise<ChatTopic[]> {
    try {
      const topics = await this.topics
        .filter(topic => topic.assistantId === assistantId)
        .toArray();
      return topics;
    } catch (error) {
      console.error(`DexieStorageService: 获取助手 ${assistantId} 的话题失败`, error);
      return [];
    }
  }

  /**
   * 更新话题中的消息
   * @param topicId 话题ID
   * @param messageId 消息ID
   * @param updatedMessage 更新后的消息
   */
  async updateMessageInTopic(topicId: string, messageId: string, updatedMessage: Message): Promise<boolean> {
    try {
      // 获取话题
      const topic = await this.getTopic(topicId);
      if (!topic) return false;

      // 找到消息
      const messageIndex = topic.messages.findIndex(m => m.id === messageId);
      if (messageIndex === -1) return false;

      // 更新消息
      topic.messages[messageIndex] = updatedMessage;

      // 保存话题
      await this.saveTopic(topic);

      // 发布事件
      DexieStorageService.publish(DexieStorageService.EVENT_TYPES.MESSAGE_UPDATED, { 
        topicId,
        messageId 
      });

      return true;
    } catch (error) {
      console.error(`DexieStorageService: 更新话题 ${topicId} 中的消息 ${messageId} 失败`, error);
      return false;
    }
  }

  /**
   * 从话题中删除消息
   * @param topicId 话题ID
   * @param messageId 消息ID
   */
  async deleteMessageFromTopic(topicId: string, messageId: string): Promise<boolean> {
    try {
      // 获取话题
      const topic = await this.getTopic(topicId);
      if (!topic) return false;

      // 过滤掉要删除的消息
      topic.messages = topic.messages.filter(m => m.id !== messageId);

      // 更新最后消息时间
      if (topic.messages.length > 0) {
        const lastMessage = topic.messages[topic.messages.length - 1];
        topic.lastMessageTime = lastMessage.timestamp;
      }

      // 保存话题
      await this.saveTopic(topic);

      // 发布事件
      DexieStorageService.publish(DexieStorageService.EVENT_TYPES.MESSAGE_DELETED, { 
        topicId,
        messageId 
      });

      return true;
    } catch (error) {
      console.error(`DexieStorageService: 从话题 ${topicId} 中删除消息 ${messageId} 失败`, error);
      return false;
    }
  }

  // ============= 设置相关操作 =============

  /**
   * 保存设置
   * @param key 设置键
   * @param value 设置值
   */
  async saveSetting(key: string, value: any): Promise<boolean> {
    try {
      // 清理对象
      const cleanValue = this.cleanObject(value);
      
      // 保存设置
      await this.settings.put(cleanValue, key);
      
      // 发布事件
      DexieStorageService.publish(DexieStorageService.EVENT_TYPES.SETTING_CHANGED, { settingKey: key });
      
      return true;
    } catch (error) {
      console.error(`DexieStorageService: 保存设置 ${key} 失败`, error);
      return false;
    }
  }

  /**
   * 获取设置
   * @param key 设置键
   */
  async getSetting(key: string): Promise<any> {
    try {
      const value = await this.settings.get(key);
      return value;
    } catch (error) {
      console.error(`DexieStorageService: 获取设置 ${key} 失败`, error);
      return null;
    }
  }

  /**
   * 删除设置
   * @param key 设置键
   */
  async deleteSetting(key: string): Promise<boolean> {
    try {
      await this.settings.delete(key);
      
      // 发布事件
      DexieStorageService.publish(DexieStorageService.EVENT_TYPES.SETTING_CHANGED, { settingKey: key });
      
      return true;
    } catch (error) {
      console.error(`DexieStorageService: 删除设置 ${key} 失败`, error);
      return false;
    }
  }

  // ============= 图片相关操作 =============

  /**
   * 保存图片
   * @param blob 图片数据
   * @param metadata 元数据
   */
  async saveImage(blob: Blob, metadata: any): Promise<string> {
    try {
      // 生成ID
      const imageId = uuid();
      
      // 保存图片数据
      await this.images.put(blob, imageId);
      
      // 保存元数据
      const imageMetadata = {
        id: imageId,
        ...metadata,
        created: Date.now()
      };
      await this.imageMetadata.put(imageMetadata);
      
      // 发布事件
      DexieStorageService.publish(DexieStorageService.EVENT_TYPES.IMAGE_ADDED, { 
        imageId,
        topicId: metadata.topicId 
      });
      
      return imageId;
    } catch (error) {
      console.error('DexieStorageService: 保存图片失败', error);
      throw error;
    }
  }

  /**
   * 获取图片数据
   * @param id 图片ID
   */
  async getImageBlob(id: string): Promise<Blob | undefined> {
    try {
      const blob = await this.images.get(id);
      return blob;
    } catch (error) {
      console.error(`DexieStorageService: 获取图片 ${id} 数据失败`, error);
      return undefined;
    }
  }

  /**
   * 获取图片元数据
   * @param id 图片ID
   */
  async getImageMetadata(id: string): Promise<any> {
    try {
      const metadata = await this.imageMetadata.get(id);
      return metadata;
    } catch (error) {
      console.error(`DexieStorageService: 获取图片 ${id} 元数据失败`, error);
      return undefined;
    }
  }

  /**
   * 获取话题相关的图片元数据
   * @param topicId 话题ID
   */
  async getImageMetadataByTopicId(topicId: string): Promise<any[]> {
    try {
      // 使用索引查询
      const metadata = await this.imageMetadata
        .where('topicId')
        .equals(topicId)
        .toArray();
      return metadata;
    } catch (error) {
      console.error(`DexieStorageService: 获取话题 ${topicId} 的图片元数据失败`, error);
      return [];
    }
  }

  /**
   * 获取最近添加的图片元数据
   * @param limit 限制数量
   */
  async getRecentImageMetadata(limit: number = 20): Promise<any[]> {
    try {
      // 使用索引查询并限制数量
      const metadata = await this.imageMetadata
        .orderBy('created')
        .reverse()
        .limit(limit)
        .toArray();
      return metadata;
    } catch (error) {
      console.error(`DexieStorageService: 获取最近图片元数据失败`, error);
      return [];
    }
  }

  /**
   * 添加消息到话题
   * @param topicId 话题ID
   * @param message 消息
   */
  async addMessageToTopic(topicId: string, message: Message): Promise<boolean> {
    try {
      // 获取话题
      const topic = await this.getTopic(topicId);
      if (!topic) {
        console.error(`DexieStorageService: 话题 ${topicId} 不存在，无法添加消息`);
        return false;
      }

      // 确保消息数组存在
      if (!topic.messages) {
        topic.messages = [];
      }
      
      // 检查是否已存在该消息
      const messageIndex = topic.messages.findIndex(m => m.id === message.id);
      if (messageIndex !== -1) {
        // 更新已有消息
        topic.messages[messageIndex] = message;
        DexieStorageService.publish(DexieStorageService.EVENT_TYPES.MESSAGE_UPDATED, { 
          topicId, 
          messageId: message.id 
        });
      } else {
        // 添加新消息
        topic.messages.push(message);
        DexieStorageService.publish(DexieStorageService.EVENT_TYPES.MESSAGE_ADDED, { 
          topicId, 
          messageId: message.id 
        });
      }

      // 更新最后消息时间
      topic.lastMessageTime = message.timestamp;

      // 保存话题
      return await this.saveTopic(topic);
    } catch (error) {
      console.error(`DexieStorageService: 添加消息到话题 ${topicId} 失败`, error);
      return false;
    }
  }

  /**
   * 删除图片
   * @param id 图片ID
   */
  async deleteImage(id: string): Promise<boolean> {
    try {
      // 先删除元数据
      await this.imageMetadata.delete(id);
      
      // 再删除图片内容
      await this.images.delete(id);
      
      // 发布事件
      DexieStorageService.publish(DexieStorageService.EVENT_TYPES.IMAGE_DELETED, { imageId: id });
      
      return true;
    } catch (error) {
      console.error(`DexieStorageService: 删除图片 ${id} 失败`, error);
      return false;
    }
  }

  // ============= 数据库管理操作 =============

  /**
   * 清空数据库
   * 谨慎使用，会删除所有数据
   */
  async clearDatabase(): Promise<boolean> {
    try {
      // 清空所有表
      await this.assistants.clear();
      await this.topics.clear();
      await this.settings.clear();
      await this.images.clear();
      await this.imageMetadata.clear();
      await this.metadata.clear();
      
      console.log('DexieStorageService: 数据库已清空');
      return true;
    } catch (error) {
      console.error('DexieStorageService: 清空数据库失败', error);
      return false;
    }
  }

  /**
   * 获取数据库状态
   */
  async getDatabaseStatus(): Promise<{
    version: number;
    tables: string[];
    assistantsCount: number;
    topicsCount: number;
    imagesCount: number;
    settingsCount: number;
  }> {
    try {
      // 获取各表的数据量
      const assistantsCount = await this.assistants.count();
      const topicsCount = await this.topics.count();
      const imagesCount = await this.images.count();
      const settingsCount = await this.settings.count();

      return {
        version: this.verno,
        tables: this.tables.map(t => t.name),
        assistantsCount,
        topicsCount,
        imagesCount,
        settingsCount
      };
    } catch (error) {
      console.error('DexieStorageService: 获取数据库状态失败', error);
      throw error;
    }
  }

  /**
   * 导出数据库内容
   */
  async exportData(): Promise<{
    assistants: Assistant[];
    topics: ChatTopic[];
    settings: Record<string, any>;
    version: number;
    exportDate: string;
  }> {
    try {
      // 导出所有数据
      const assistants = await this.assistants.toArray();
      const topics = await this.topics.toArray();
      
      // 获取所有设置
      const settingsData = await this.settings.toArray();
      const settings: Record<string, any> = {};
      for (const item of settingsData) {
        settings[item.id] = item.value;
      }

      return {
        assistants,
        topics,
        settings,
        version: this.verno,
        exportDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('DexieStorageService: 导出数据失败', error);
      throw error;
    }
  }

  /**
   * 导入数据
   * @param data 要导入的数据
   */
  async importData(data: {
    assistants: Assistant[];
    topics: ChatTopic[];
    settings: Record<string, any>;
    version?: number;
  }): Promise<boolean> {
    try {
      // 开始事务
      return await this.transaction('rw', 
        [this.assistants, this.topics, this.settings], 
        async () => {
          // 导入助手
          if (data.assistants && Array.isArray(data.assistants)) {
            // 清空现有数据
            await this.assistants.clear();
            // 批量添加新数据
            await this.assistants.bulkPut(data.assistants);
          }

          // 导入话题
          if (data.topics && Array.isArray(data.topics)) {
            // 清空现有数据
            await this.topics.clear();
            // 批量添加新数据
            await this.topics.bulkPut(data.topics);
          }

          // 导入设置
          if (data.settings && typeof data.settings === 'object') {
            // 清空现有数据
            await this.settings.clear();
            
            // 转换设置格式并导入
            const settingsArray = Object.entries(data.settings).map(
              ([key, value]) => ({ id: key, value })
            );
            await this.settings.bulkPut(settingsArray);
          }

          console.log('DexieStorageService: 数据导入成功');
          return true;
        }
      );
    } catch (error) {
      console.error('DexieStorageService: 导入数据失败', error);
      return false;
    }
  }
}

// 创建并导出单例实例
export const dexieStorage = DexieStorageService.getInstance();

// 默认导出类以便可以继承和扩展
export default DexieStorageService; 