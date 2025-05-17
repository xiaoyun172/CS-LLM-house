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
      [DB_CONFIG.STORES.TOPICS]: 'id, _lastMessageTimeNum', // lastMessageTime can be derived or stored directly if preferred
      [DB_CONFIG.STORES.SETTINGS]: 'id',
      [DB_CONFIG.STORES.IMAGES]: 'id',
      [DB_CONFIG.STORES.IMAGE_METADATA]: 'id, topicId, created',
      [DB_CONFIG.STORES.METADATA]: 'id',
    });

    this.version(DB_CONFIG.VERSION).upgrade(tx => {
      console.log(`DexieStorageService: Upgrading database to version ${DB_CONFIG.VERSION}`);
      // Clear settings and metadata if schema changed in a way that requires it.
      // This was originally for adding primary keys, adjust if other breaking changes occur.
      tx.table(DB_CONFIG.STORES.SETTINGS).clear();
      tx.table(DB_CONFIG.STORES.METADATA).clear();
      console.log('DexieStorageService: Settings and metadata tables potentially cleared during upgrade.');
    });

    this.on('ready', async () => {
      console.log('DexieStorageService: Database ready.');
      try {
        await this._ensureDatabaseInitialized();
      } catch (err) {
        console.error('DexieStorageService: Database initialization failed.', err);
      }
    });
    this.on('blocked', () => console.warn('DexieStorageService: Database operation blocked.'));
    this.on('versionchange', () => this.onVersionChange());

    // Global error handling for unhandled Dexie rejections (simplified)
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && typeof event.reason === 'object' && 'name' in event.reason) {
        const error = event.reason as import('dexie').DexieError;
        if (error.name && error.name.startsWith('Dexie')) {
          console.error('DexieStorageService: Unhandled Dexie error:', error);
        }
      }
    });
  }

  private onVersionChange() {
    console.warn('DexieStorageService: Database version change detected. Closing current connection and recommending app reload.');
    this.close();
    DexieStorageService.instance = null as any;
  }

  public static getInstance(): DexieStorageService {
    if (!DexieStorageService.instance) {
      DexieStorageService.instance = new DexieStorageService();
    }
    return DexieStorageService.instance;
  }

  // ============= 助手相关操作 =============
  async getAllAssistants(): Promise<Assistant[]> {
    try {
      return await this.assistants.toArray();
    } catch (error) {
      console.error('DexieStorageService: Failed to get all assistants.', error);
      return [];
    }
  }

  async getSystemAssistants(): Promise<Assistant[]> {
    try {
      return await this.assistants.where('isSystem').equals(1).toArray();
    } catch (error) {
      console.error('DexieStorageService: Failed to get system assistants.', error);
      return [];
    }
  }

  async getUserAssistants(): Promise<Assistant[]> {
    try {
      return await this.assistants.filter(assistant => !assistant.isSystem).toArray();
    } catch (error) {
      console.error('DexieStorageService: Failed to get user assistants.', error);
      return [];
    }
  }

  async getAssistant(id: string): Promise<Assistant | null> {
    try {
      const assistant = await this.assistants.get(id);
      return assistant || null;
    } catch (error) {
      console.error(`DexieStorageService: Failed to get assistant ${id}.`, error);
      return null;
    }
  }

  async saveAssistant(assistant: Assistant): Promise<boolean> {
    try {
      if (!assistant.id) {
        assistant.id = uuid();
      }
      await this.assistants.put(assistant);
      return true;
    } catch (error) {
      console.error('DexieStorageService: Failed to save assistant.', error);
      return false;
    }
  }

  async deleteAssistant(id: string): Promise<boolean> {
    try {
      const assistant = await this.getAssistant(id);
      if (assistant && assistant.topicIds && assistant.topicIds.length > 0) {
        for (const topicId of assistant.topicIds) {
          await this.deleteTopic(topicId); // This will also remove associated messages if handled by deleteTopic
        }
      }
      await this.assistants.delete(id);
      return true;
    } catch (error) {
      console.error(`DexieStorageService: Failed to delete assistant ${id}.`, error);
      return false;
    }
  }

  // ============= 话题相关操作 =============
  async getAllTopics(): Promise<ChatTopic[]> {
    try {
      const topicsFromDb = await this.topics.toArray();
      return topicsFromDb.map(t => { const { _lastMessageTimeNum, ...topic } = t; return topic as ChatTopic; });
    } catch (error) {
      console.error('DexieStorageService: Failed to get all topics.', error);
      return [];
    }
  }

  async getTopic(id: string): Promise<ChatTopic | null> {
    try {
      const topic = await this.topics.get(id);
      if (!topic) return null;
      const { _lastMessageTimeNum, ...restOfTopic } = topic;
      return restOfTopic as ChatTopic;
    } catch (error) {
      console.error(`DexieStorageService: Failed to get topic ${id}.`, error);
      return null;
    }
  }

  async saveTopic(topic: ChatTopic): Promise<boolean> {
    try {
      if (!topic.id) {
        topic.id = uuid();
      }
      const topicToStore = {
        ...topic,
        _lastMessageTimeNum: new Date(topic.lastMessageTime).getTime()
      };
      await this.topics.put(topicToStore);
      return true;
    } catch (error) {
      console.error(`DexieStorageService: Failed to save topic ${topic.id}.`, error);
      return false;
    }
  }

  async deleteTopic(id: string): Promise<boolean> {
    try {
      await this.topics.delete(id);
      return true;
    } catch (error) {
      console.error(`DexieStorageService: Failed to delete topic ${id}.`, error);
      return false;
    }
  }

  async getRecentTopics(limit: number = 10): Promise<ChatTopic[]> {
    try {
      const topicsFromDb = await this.topics
        .orderBy('_lastMessageTimeNum')
        .reverse()
        .limit(limit)
        .toArray();
      return topicsFromDb.map(t => { const { _lastMessageTimeNum, ...topic } = t; return topic as ChatTopic; });
    } catch (error) {
      console.error(`DexieStorageService: Failed to get recent topics.`, error);
      return [];
    }
  }

  async getTopicsByAssistantId(assistantId: string): Promise<ChatTopic[]> {
    try {
      const topicsFromDb = await this.topics
        .filter(topic => topic.assistantId === assistantId)
        .toArray();
      return topicsFromDb.map(t => { const { _lastMessageTimeNum, ...topic } = t; return topic as ChatTopic; });
    } catch (error) {
      console.error(`DexieStorageService: Failed to get topics for assistant ${assistantId}.`, error);
      return [];
    }
  }

  async updateMessageInTopic(topicId: string, messageId: string, updatedMessage: Message): Promise<boolean> {
    try {
      const topic = await this.getTopic(topicId); // Gets the cleaned topic
      if (!topic) return false;
      const messageIndex = topic.messages.findIndex(m => m.id === messageId);
      if (messageIndex === -1) return false;
      topic.messages[messageIndex] = updatedMessage;
      return await this.saveTopic(topic); // saveTopic handles _lastMessageTimeNum
    } catch (error) {
      console.error(`DexieStorageService: Failed to update message ${messageId} in topic ${topicId}.`, error);
      return false;
    }
  }

  async deleteMessageFromTopic(topicId: string, messageId: string): Promise<boolean> {
    try {
      const topic = await this.getTopic(topicId);
      if (!topic) return false;
      topic.messages = topic.messages.filter(m => m.id !== messageId);
      if (topic.messages.length > 0) {
        topic.lastMessageTime = topic.messages[topic.messages.length - 1].timestamp;
      } else {
        // Handle case where all messages are deleted, perhaps set to now or creation time
        topic.lastMessageTime = new Date().toISOString();
      }
      return await this.saveTopic(topic);
    } catch (error) {
      console.error(`DexieStorageService: Failed to delete message ${messageId} from topic ${topicId}.`, error);
      return false;
    }
  }
  
  async addMessageToTopic(topicId: string, message: Message): Promise<boolean> {
    try {
      const topic = await this.getTopic(topicId);
      if (!topic) {
        console.error(`DexieStorageService: Topic ${topicId} not found, cannot add message.`);
        return false;
      }
      if (!topic.messages) {
        topic.messages = [];
      }
      const messageIndex = topic.messages.findIndex(m => m.id === message.id);
      if (messageIndex !== -1) {
        topic.messages[messageIndex] = message; // Update existing
      } else {
        topic.messages.push(message); // Add new
      }
      topic.lastMessageTime = message.timestamp;
      return await this.saveTopic(topic);
    } catch (error) {
      console.error(`DexieStorageService: Failed to add message to topic ${topicId}.`, error);
      return false;
    }
  }

  // ============= 设置相关操作 =============
  async saveSetting(key: string, value: any): Promise<boolean> {
    try {
      const settingObject = typeof value === 'object' && value !== null && !Array.isArray(value)
        ? { ...value, id: key } 
        : { id: key, value: value };
      await this.settings.put(settingObject);
      return true;
    } catch (error) {
      console.error(`DexieStorageService: Failed to save setting ${key}.`, error);
      return false;
    }
  }

  async getSetting(key: string): Promise<any> {
    try {
      const setting = await this.settings.get(key);
      if (setting && setting.hasOwnProperty('value') && Object.keys(setting).length === 2 && setting.id === key) {
        return setting.value;
      }
      return setting; // Returns the whole object if it's not a simple key/value or null/undefined
    } catch (error) {
      console.error(`DexieStorageService: Failed to get setting ${key}.`, error);
      return null;
    }
  }

  async deleteSetting(key: string): Promise<boolean> {
    try {
      await this.settings.delete(key);
      return true;
    } catch (error) {
      console.error(`DexieStorageService: Failed to delete setting ${key}.`, error);
      return false;
    }
  }

  // ============= 图片相关操作 (If kept) =============
  async saveImage(blob: Blob, metadata: any): Promise<string> {
    try {
      const imageId = uuid();
      await this.images.put(blob, imageId);
      const imageMetadata = { id: imageId, ...metadata, created: Date.now() };
      await this.imageMetadata.put(imageMetadata);
      return imageId;
    } catch (error) {
      console.error('DexieStorageService: Failed to save image.', error);
      throw error;
    }
  }

  async getImageBlob(id: string): Promise<Blob | undefined> {
    try {
      return await this.images.get(id);
    } catch (error) {
      console.error(`DexieStorageService: Failed to get image blob ${id}.`, error);
      return undefined;
    }
  }

  async getImageMetadata(id: string): Promise<any> {
    try {
      return await this.imageMetadata.get(id);
    } catch (error) {
      console.error(`DexieStorageService: Failed to get image metadata ${id}.`, error);
      return undefined;
    }
  }

  async getImageMetadataByTopicId(topicId: string): Promise<any[]> {
    try {
      return await this.imageMetadata.where('topicId').equals(topicId).toArray();
    } catch (error) {
      console.error(`DexieStorageService: Failed to get image metadata for topic ${topicId}.`, error);
      return [];
    }
  }
  
  async getRecentImageMetadata(limit: number = 20): Promise<any[]> {
    try {
      return await this.imageMetadata.orderBy('created').reverse().limit(limit).toArray();
    } catch (error) {
      console.error('DexieStorageService: Failed to get recent image metadata.', error);
      return [];
    }
  }

  async deleteImage(id: string): Promise<boolean> {
    try {
      await this.imageMetadata.delete(id);
      await this.images.delete(id);
      return true;
    } catch (error) {
      console.error(`DexieStorageService: Failed to delete image ${id}.`, error);
      return false;
    }
  }

  async saveBase64Image(base64Data: string, metadata: any = {}): Promise<string> {
    try {
      const parts = base64Data.split(';base64,');
      const mimeType = parts.length > 1 ? parts[0].split('data:')[1] : (metadata.mimeType || 'image/png');
      const base64Content = parts.length > 1 ? parts[1] : parts[0];
      
      const byteCharacters = atob(base64Content);
      const byteArrays = [];
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      const blob = new Blob(byteArrays, { type: mimeType });
      
      return await this.saveImage(blob, { ...metadata, mimeType, type: 'base64', size: blob.size });
    } catch (error) {
      console.error('DexieStorageService: Failed to save Base64 image.', error);
      throw error;
    }
  }

  // ============= 数据库管理操作 (Simplified) =============
  async clearDatabase(): Promise<boolean> {
    try {
      await Promise.all([
        this.assistants.clear(),
        this.topics.clear(),
        this.settings.clear(),
        this.images.clear(),
        this.imageMetadata.clear(),
        this.metadata.clear(),
      ]);
      console.log('DexieStorageService: Database cleared.');
      return true;
    } catch (error) {
      console.error('DexieStorageService: Failed to clear database.', error);
      return false;
    }
  }

  async saveMetadata(key: string, value: any): Promise<boolean> {
    try {
      const metadataObject = typeof value === 'object' && value !== null && !Array.isArray(value)
        ? { ...value, id: key }
        : { id: key, value: value };
      await this.metadata.put(metadataObject);
      return true;
    } catch (error) {
      console.error(`DexieStorageService: Failed to save metadata ${key}.`, error);
      return false;
    }
  }

  async getMetadata(key: string): Promise<any> {
    try {
      const meta = await this.metadata.get(key);
      if (meta && meta.hasOwnProperty('value') && Object.keys(meta).length === 2 && meta.id === key) {
        return meta.value;
      }
      return meta;
    } catch (error) {
      console.error(`DexieStorageService: Failed to get metadata ${key}.`, error);
      return null;
    }
  }

  async deleteMetadata(key: string): Promise<boolean> {
    try {
      await this.metadata.delete(key);
      return true;
    } catch (error) {
      console.error(`DexieStorageService: Failed to delete metadata ${key}.`, error);
      return false;
    }
  }
  
  async getDatabaseStatus(): Promise<any> {
    try {
      const [assistantsCount, topicsCount, imagesCount, settingsCount, metadataCount] = await Promise.all([
        this.assistants.count(),
        this.topics.count(),
        this.images.count(),
        this.settings.count(),
        this.metadata.count(),
      ]);
      return {
        version: this.verno,
        tables: this.tables.map(t => t.name),
        assistantsCount, topicsCount, imagesCount, settingsCount, metadataCount,
        isOpen: this.isOpen()
      };
    } catch (error) {
      console.error('DexieStorageService: Failed to get database status.', error);
      throw error;
    }
  }

  async exportData(): Promise<any> {
    try {
      const [assistants, topicsData, settingsData, metadataData, imageMetadata] = await Promise.all([
        this.assistants.toArray(),
        this.topics.toArray(), // _lastMessageTimeNum will be included, can be stripped by consumer if needed
        this.settings.toArray(),
        this.metadata.toArray(),
        this.imageMetadata.toArray()
      ]);

      const settings: Record<string, any> = {};
      settingsData.forEach(item => {
        settings[item.id] = item.hasOwnProperty('value') && Object.keys(item).length === 2 ? item.value : item;
      });
      const metadata: Record<string, any> = {};
      metadataData.forEach(item => {
        metadata[item.id] = item.hasOwnProperty('value') && Object.keys(item).length === 2 ? item.value : item;
      });
      
      // Strip _lastMessageTimeNum from topics for export
      const topics = topicsData.map(t => { const { _lastMessageTimeNum, ...topic } = t; return topic as ChatTopic; });


      return {
        version: this.verno,
        exportDate: new Date().toISOString(),
        assistants, topics, settings, metadata, imageMetadata
      };
    } catch (error) {
      console.error('DexieStorageService: Failed to export data.', error);
      throw error;
    }
  }

  async importData(data: any): Promise<boolean> {
    try {
      await this.transaction('rw',
        [this.assistants, this.topics, this.settings, this.metadata, this.imageMetadata],
        async () => {
          if (data.assistants) await this.assistants.clear().then(() => this.assistants.bulkPut(data.assistants));
          if (data.topics) {
            await this.topics.clear();
            const topicsToImport = data.topics.map((t: ChatTopic) => ({
              ...t,
              _lastMessageTimeNum: new Date(t.lastMessageTime).getTime()
            }));
            await this.topics.bulkPut(topicsToImport);
          }
          if (data.settings) {
            await this.settings.clear();
            const settingsArray = Object.entries(data.settings).map(
              ([key, value]) => (typeof value === 'object' && value !== null && !Array.isArray(value) && !value.hasOwnProperty('id') ? {...value, id: key} : { id: key, value })
            );
            await this.settings.bulkPut(settingsArray);
          }
          if (data.metadata) {
             await this.metadata.clear();
            const metadataArray = Object.entries(data.metadata).map(
              ([key, value]) => (typeof value === 'object' && value !== null && !Array.isArray(value) && !value.hasOwnProperty('id') ? {...value, id: key} : { id: key, value })
            );
            await this.metadata.bulkPut(metadataArray);
          }
          if (data.imageMetadata) await this.imageMetadata.clear().then(() => this.imageMetadata.bulkPut(data.imageMetadata));
        }
      );
      console.log('DexieStorageService: Data imported successfully.');
      return true;
    } catch (error) {
      console.error('DexieStorageService: Failed to import data.', error);
      return false;
    }
  }

  static async getAllDatabases(): Promise<string[]> {
    return await Dexie.getDatabaseNames();
  }

  static async deleteDatabase(dbName: string): Promise<void> {
    await Dexie.delete(dbName);
    console.log(`DexieStorageService: Deleted database ${dbName}`);
  }

  public async initialize(): Promise<void> {
    try {
      if (!this.isOpen()) {
        await this.open(); // This will trigger 'ready' and thus _ensureDatabaseInitialized
      } else {
        // If already open, ensure initialization logic has run (or re-run if idempotent)
        await this._ensureDatabaseInitialized();
      }
      console.log('DexieStorageService: Explicitly initialized (or initialization confirmed).');
    } catch (error) {
      console.error(`DexieStorageService: Database explicit initialization/confirmation failed.`, error);
      throw error;
    }
  }

  private async _ensureDatabaseInitialized(): Promise<void> {
    try {
      if (!this.isOpen()) {
        // This should ideally not happen if called from 'ready', but as a safeguard:
        await this.open(); 
      }
      
      const initSetting = await this.settings.get('db-initialized');
      if (initSetting && initSetting.value === true) {
        return; // Already initialized
      }
      
      console.log('DexieStorageService: Marking database as initialized and setting version.');
      
      await this.transaction('rw', this.settings, this.metadata, async () => {
        await this.settings.put({ id: 'db-initialized', value: true });
        await this.metadata.put({
          id: 'db-version',
          version: this.verno,
          created: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        });
      });
      console.log('DexieStorageService: Database marked as initialized.');
    } catch (error) {
      console.error('DexieStorageService: Failed to ensure database initialization.', error);
      throw error; 
    }
  }
}

export const dexieStorage = DexieStorageService.getInstance();
export default DexieStorageService;