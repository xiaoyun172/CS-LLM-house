import { openDB, type IDBPDatabase } from 'idb';
import { BaseDataSourceAdapter } from './DataSourceAdapter';
import type { ImageData } from './DataSourceAdapter';
import type { Assistant } from '../../types/Assistant';
import type { ChatTopic } from '../../types';

/**
 * IndexedDB数据源适配器
 * 用于从旧版IndexedDB中迁移数据
 */
export class IndexedDBAdapter extends BaseDataSourceAdapter {
  private readonly OLD_DB_NAME = 'aetherlink-old-db';
  private readonly OLD_DB_VERSION = 1;
  private db: IDBPDatabase | null = null;
  
  constructor() {
    super('indexedDB');
  }
  
  /**
   * 检查IndexedDB数据源是否可用
   */
  async checkAvailability(): Promise<boolean> {
    try {
      // 检查是否支持IndexedDB
      if (typeof indexedDB === 'undefined') {
        return false;
      }
      
      // 检查是否存在旧数据库
      const databases = await indexedDB.databases();
      const hasOldDB = databases.some(db => db.name === this.OLD_DB_NAME);
      
      return hasOldDB;
    } catch (error) {
      console.error('检查IndexedDB可用性失败:', error);
      return false;
    }
  }
  
  /**
   * 获取数据库连接
   */
  private async getDB(): Promise<IDBPDatabase | null> {
    if (this.db) {
      return this.db;
    }
    
    try {
      // 尝试打开旧数据库，如果不存在则返回null
      this.db = await openDB(this.OLD_DB_NAME, this.OLD_DB_VERSION, {
        // 只读模式，不升级数据库
        upgrade: () => {}
      });
      
      return this.db;
    } catch (error) {
      console.error('打开旧数据库失败:', error);
      return null;
    }
  }
  
  /**
   * 从IndexedDB获取助手数据
   */
  async getAssistants(): Promise<Assistant[]> {
    try {
      const db = await this.getDB();
      
      if (!db || !db.objectStoreNames.contains('assistants')) {
        return [];
      }
      
      // 获取所有助手
      const assistants = await db.getAll('assistants');
      
      return assistants;
    } catch (error) {
      console.error('从IndexedDB获取助手数据失败:', error);
      return [];
    }
  }
  
  /**
   * 从IndexedDB获取话题数据
   */
  async getTopics(): Promise<ChatTopic[]> {
    try {
      const db = await this.getDB();
      
      if (!db || !db.objectStoreNames.contains('topics')) {
        return [];
      }
      
      // 获取所有话题
      const topics = await db.getAll('topics');
      
      // 如果有消息存储，则获取消息并合并到话题中
      if (db.objectStoreNames.contains('messages')) {
        // 获取所有消息
        const messages = await db.getAll('messages');
        
        // 根据话题ID组织消息
        const messagesByTopic: Record<string, any[]> = {};
        
        for (const message of messages) {
          if (message.topicId) {
            if (!messagesByTopic[message.topicId]) {
              messagesByTopic[message.topicId] = [];
            }
            messagesByTopic[message.topicId].push(message);
          }
        }
        
        // 合并消息到话题
        for (const topic of topics) {
          const topicMessages = messagesByTopic[topic.id] || [];
          
          // 按时间戳排序
          topicMessages.sort((a, b) => {
            const timestampA = a.timestamp || 0;
            const timestampB = b.timestamp || 0;
            return timestampA - timestampB;
          });
          
          topic.messages = topicMessages;
        }
      }
      
      // 确保每个话题都有messages数组
      for (const topic of topics) {
        if (!topic.messages) {
          topic.messages = [];
        }
      }
      
      return topics;
    } catch (error) {
      console.error('从IndexedDB获取话题数据失败:', error);
      return [];
    }
  }
  
  /**
   * 从IndexedDB获取图片数据
   */
  async getImages(): Promise<Record<string, ImageData>> {
    try {
      const db = await this.getDB();
      
      if (!db || !db.objectStoreNames.contains('images')) {
        return {};
      }
      
      // 获取所有图片
      const imageKeys = await db.getAllKeys('images');
      const result: Record<string, ImageData> = {};
      
      // 获取图片元数据（如果存在）
      const hasMetadataStore = db.objectStoreNames.contains('imageMetadata');
      const metadata: Record<string, any> = {};
      
      if (hasMetadataStore) {
        const allMetadata = await db.getAll('imageMetadata');
        for (const meta of allMetadata) {
          if (meta.id) {
            metadata[meta.id] = meta;
          }
        }
      }
      
      // 获取每个图片的数据
      for (const key of imageKeys) {
        const id = String(key);
        const blob = await db.get('images', key);
        
        if (blob instanceof Blob) {
          const meta = metadata[id] || {};
          
          result[id] = {
            blob,
            metadata: {
              mimeType: meta.mimeType || blob.type || 'image/png',
              topicId: meta.topicId || '',
              messageId: meta.messageId || '',
              width: meta.width,
              height: meta.height,
              size: blob.size
            }
          };
        }
      }
      
      return result;
    } catch (error) {
      console.error('从IndexedDB获取图片数据失败:', error);
      return {};
    }
  }
  
  /**
   * 从IndexedDB获取设置数据
   */
  async getSettings(): Promise<Record<string, any>> {
    try {
      const db = await this.getDB();
      
      if (!db || !db.objectStoreNames.contains('settings')) {
        return {};
      }
      
      // 获取所有设置
      const settingsKeys = await db.getAllKeys('settings');
      const result: Record<string, any> = {};
      
      for (const key of settingsKeys) {
        const setting = await db.get('settings', key);
        
        if (setting) {
          const id = String(key);
          result[id] = setting.value !== undefined ? setting.value : setting;
        }
      }
      
      return result;
    } catch (error) {
      console.error('从IndexedDB获取设置数据失败:', error);
      return {};
    }
  }
  
  /**
   * 关闭数据库连接
   */
  public async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
} 