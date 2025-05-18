import Dexie from 'dexie';
import { v4 as uuid } from 'uuid';
import type { Assistant } from '../types/Assistant';
import type { ChatTopic, Message } from '../types';
import { DB_CONFIG } from '../types/DatabaseSchema';

/**
 * 基于Dexie.js的统一存储服务
 * 简化版本
 */
class DexieStorageService extends Dexie {
  assistants!: Dexie.Table<Assistant, string>;
  topics!: Dexie.Table<ChatTopic & { _lastMessageTimeNum?: number }, string>;
  settings!: Dexie.Table<any, string>;
  images!: Dexie.Table<Blob, string>;
  imageMetadata!: Dexie.Table<any, string>;
  metadata!: Dexie.Table<any, string>;

  private static instance: DexieStorageService;

  constructor() {
    super(DB_CONFIG.NAME);

    this.version(DB_CONFIG.VERSION).stores({
      [DB_CONFIG.STORES.ASSISTANTS]: 'id',
      [DB_CONFIG.STORES.TOPICS]: 'id, _lastMessageTimeNum',
      [DB_CONFIG.STORES.SETTINGS]: 'id',
      [DB_CONFIG.STORES.IMAGES]: 'id',
      [DB_CONFIG.STORES.IMAGE_METADATA]: 'id, topicId, created',
      [DB_CONFIG.STORES.METADATA]: 'id',
    });
  }

  public static getInstance(): DexieStorageService {
    if (!DexieStorageService.instance) {
      DexieStorageService.instance = new DexieStorageService();
    }
    return DexieStorageService.instance;
  }

  // ============= 助手相关操作 =============
  async getAllAssistants(): Promise<Assistant[]> {
    return this.assistants.toArray();
  }

  async getSystemAssistants(): Promise<Assistant[]> {
    return this.assistants.where('isSystem').equals(1).toArray();
  }

  async getUserAssistants(): Promise<Assistant[]> {
    return this.assistants.filter(assistant => !assistant.isSystem).toArray();
  }

  async getAssistant(id: string): Promise<Assistant | null> {
    const assistant = await this.assistants.get(id);
    return assistant || null;
  }

  async saveAssistant(assistant: Assistant): Promise<void> {
    try {
      if (!assistant.id) {
        assistant.id = uuid();
      }
      
      // 创建一个可序列化的副本
      const assistantToSave = { ...assistant };
      
      // 处理不可序列化的字段
      if (assistantToSave.icon && typeof assistantToSave.icon === 'object') {
        assistantToSave.icon = null;
      }
      
      // 确保topics数组的序列化是安全的
      if (assistantToSave.topics) {
        assistantToSave.topics = assistantToSave.topics.map(topic => ({
          ...topic,
          // 移除可能导致序列化问题的字段
          icon: null
        }));
      }
      
      await this.assistants.put(assistantToSave);
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? `${error.name}: ${error.message}` 
        : String(error);
      console.error(`保存助手 ${assistant.id} 失败: ${errorMessage}`);
      throw error;
    }
  }

  async deleteAssistant(id: string): Promise<void> {
    const assistant = await this.getAssistant(id);
    if (assistant && assistant.topicIds && assistant.topicIds.length > 0) {
      for (const topicId of assistant.topicIds) {
        await this.deleteTopic(topicId);
      }
    }
    await this.assistants.delete(id);
  }

  // ============= 话题相关操作 =============
  async getAllTopics(): Promise<ChatTopic[]> {
    const topicsFromDb = await this.topics.toArray();
    return topicsFromDb.map(t => { const { _lastMessageTimeNum, ...topic } = t; return topic as ChatTopic; });
  }

  async getTopic(id: string): Promise<ChatTopic | null> {
    const topic = await this.topics.get(id);
    if (!topic) return null;
    const { _lastMessageTimeNum, ...restOfTopic } = topic;
    return restOfTopic as ChatTopic;
  }

  async saveTopic(topic: ChatTopic): Promise<void> {
    if (!topic.id) {
      topic.id = uuid();
    }
    
    // 处理lastMessageTime可能为undefined的情况
    const lastMessageTime = topic.lastMessageTime || topic.updatedAt || new Date().toISOString();
    
    const topicToStore = {
      ...topic,
      _lastMessageTimeNum: new Date(lastMessageTime).getTime()
    };
    await this.topics.put(topicToStore);
  }

  async deleteTopic(id: string): Promise<void> {
    await this.topics.delete(id);
  }

  async getRecentTopics(limit: number = 10): Promise<ChatTopic[]> {
    const topicsFromDb = await this.topics
      .orderBy('_lastMessageTimeNum')
      .reverse()
      .limit(limit)
      .toArray();
    return topicsFromDb.map(t => { const { _lastMessageTimeNum, ...topic } = t; return topic as ChatTopic; });
  }

  async getTopicsByAssistantId(assistantId: string): Promise<ChatTopic[]> {
    const topicsFromDb = await this.topics
      .filter(topic => topic.assistantId === assistantId)
      .toArray();
    return topicsFromDb.map(t => { const { _lastMessageTimeNum, ...topic } = t; return topic as ChatTopic; });
  }

  async updateMessageInTopic(topicId: string, messageId: string, updatedMessage: Message): Promise<void> {
    const topic = await this.getTopic(topicId);
    if (!topic) return;
    const messageIndex = topic.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;
    topic.messages[messageIndex] = updatedMessage;
    await this.saveTopic(topic);
  }

  async deleteMessageFromTopic(topicId: string, messageId: string): Promise<void> {
    const topic = await this.getTopic(topicId);
    if (!topic) return;
    topic.messages = topic.messages.filter(m => m.id !== messageId);
    if (topic.messages.length > 0) {
      topic.lastMessageTime = topic.messages[topic.messages.length - 1].timestamp;
    } else {
      topic.lastMessageTime = new Date().toISOString();
    }
    await this.saveTopic(topic);
  }

  async addMessageToTopic(topicId: string, message: Message): Promise<void> {
    const topic = await this.getTopic(topicId);
    if (!topic) return;
    topic.messages.push(message);
    topic.lastMessageTime = message.timestamp;
    await this.saveTopic(topic);
  }

  // ============= 设置相关操作 =============
  async saveSetting(key: string, value: any): Promise<void> {
    await this.settings.put({ id: key, value });
  }

  async getSetting(key: string): Promise<any> {
    const setting = await this.settings.get(key);
    return setting ? setting.value : undefined;
  }

  async deleteSetting(key: string): Promise<void> {
    await this.settings.delete(key);
  }

  // ============= 图片相关操作 (简化) =============
  async saveImage(blob: Blob, metadata: any): Promise<string> {
    const id = metadata.id || uuid();
    await this.images.put(blob, id);
    await this.imageMetadata.put({ ...metadata, id });
    return id;
  }

  async getImageBlob(id: string): Promise<Blob | undefined> {
    return this.images.get(id);
  }

  async getImageMetadata(id: string): Promise<any> {
    return this.imageMetadata.get(id);
  }
  
  async getImageMetadataByTopicId(topicId: string): Promise<any[]> {
    return this.imageMetadata.where('topicId').equals(topicId).sortBy('created');
  }

  async getRecentImageMetadata(limit: number = 20): Promise<any[]> {
    return this.imageMetadata.orderBy('created').reverse().limit(limit).toArray();
  }

  async deleteImage(id: string): Promise<void> {
    await this.images.delete(id);
    await this.imageMetadata.delete(id);
  }
  
  async saveBase64Image(_base64Data: string, _metadata: any = {}): Promise<string> {
    console.warn("DexieStorageService.saveBase64Image is simplified and effectively deprecated for direct base64 string input. Please use saveImage with a Blob directly.");
    throw new Error("saveBase64Image no longer processes base64 strings. Convert to Blob and use saveImage, or update a new/different method for base64 handling if still required.");
  }

  // ============= 通用元数据操作 (简化) =============
  async saveMetadata(key: string, value: any): Promise<void> {
    await this.metadata.put({ id: key, value });
  }

  async getMetadata(key: string): Promise<any> {
    const meta = await this.metadata.get(key);
    return meta ? meta.value : undefined;
  }

  async deleteMetadata(key: string): Promise<void> {
    await this.metadata.delete(key);
  }
  
  // ============= 数据库级别操作 (简化/移除) =============
  async clearDatabase(): Promise<void> {
    await Promise.all([
      this.assistants.clear(),
      this.topics.clear(),
      this.settings.clear(),
      this.images.clear(),
      this.imageMetadata.clear(),
      this.metadata.clear(),
    ]);
  }
}

export const dexieStorage = DexieStorageService.getInstance();
export default DexieStorageService;