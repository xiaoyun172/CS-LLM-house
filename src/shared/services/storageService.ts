import { openDB } from 'idb';
import type { IDBPDatabase, DBSchema } from 'idb';
import type { ChatTopic } from '../types';
import type { Assistant } from '../types/Assistant';

// 定义数据库schema
interface CherryStudioDB extends DBSchema {
  topics: {
    key: string;
    value: ChatTopic;
  };
  assistants: {
    key: string;
    value: Assistant;
  };
  settings: {
    key: string;
    value: any;
  };
}

// 数据库名和版本
const DB_NAME = 'cherry-studio-db';
const DB_VERSION = 1;

// 对象仓库名称
const STORES = {
  TOPICS: 'topics' as const,
  ASSISTANTS: 'assistants' as const,
  SETTINGS: 'settings' as const
};

// 初始化数据库
async function initDB(): Promise<IDBPDatabase<CherryStudioDB>> {
  return openDB<CherryStudioDB>(DB_NAME, DB_VERSION, {
    upgrade(db: IDBPDatabase<CherryStudioDB>) {
      // 创建话题存储
      if (!db.objectStoreNames.contains(STORES.TOPICS)) {
        db.createObjectStore(STORES.TOPICS, { keyPath: 'id' });
      }
      
      // 创建助手存储
      if (!db.objectStoreNames.contains(STORES.ASSISTANTS)) {
        db.createObjectStore(STORES.ASSISTANTS, { keyPath: 'id' });
      }
      
      // 创建设置存储
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
      }
    }
  });
}

// 辅助函数：从localStorage迁移数据到IndexedDB
async function migrateFromLocalStorage() {
  try {
    // 迁移话题
    const topicsJson = localStorage.getItem('chatTopics');
    if (topicsJson) {
      const topics = JSON.parse(topicsJson);
      if (Array.isArray(topics)) {
        for (const topic of topics) {
          await saveTopicToDB(topic);
        }
        console.log('话题数据已从localStorage迁移到IndexedDB');
      }
    }
    
    // 迁移助手
    const assistantsJson = localStorage.getItem('userAssistants');
    if (assistantsJson) {
      const assistants = JSON.parse(assistantsJson);
      if (Array.isArray(assistants)) {
        for (const assistant of assistants) {
          // 处理助手icon序列化问题
          const cleanAssistant = {
            ...assistant,
            icon: assistant.icon === null ? null : undefined // 不存储React元素
          };
          await saveAssistantToDB(cleanAssistant);
        }
        console.log('助手数据已从localStorage迁移到IndexedDB');
      }
    }
  } catch (error) {
    console.error('数据迁移失败:', error);
  }
}

// 保存话题到数据库
export async function saveTopicToDB(topic: ChatTopic): Promise<void> {
  const db = await initDB();
  await db.put(STORES.TOPICS, topic);
}

// 从数据库获取所有话题
export async function getAllTopicsFromDB(): Promise<ChatTopic[]> {
  const db = await initDB();
  return db.getAll(STORES.TOPICS);
}

// 从数据库获取单个话题
export async function getTopicFromDB(id: string): Promise<ChatTopic | undefined> {
  const db = await initDB();
  return db.get(STORES.TOPICS, id);
}

// 保存助手到数据库
export async function saveAssistantToDB(assistant: Assistant): Promise<void> {
  const db = await initDB();
  await db.put(STORES.ASSISTANTS, assistant);
}

// 从数据库获取所有助手
export async function getAllAssistantsFromDB(): Promise<Assistant[]> {
  const db = await initDB();
  return db.getAll(STORES.ASSISTANTS);
}

// 从数据库获取单个助手
export async function getAssistantFromDB(id: string): Promise<Assistant | undefined> {
  const db = await initDB();
  return db.get(STORES.ASSISTANTS, id);
}

// 删除助手
export async function deleteAssistantFromDB(id: string): Promise<void> {
  const db = await initDB();
  await db.delete(STORES.ASSISTANTS, id);
}

// 删除话题
export async function deleteTopicFromDB(id: string): Promise<void> {
  const db = await initDB();
  await db.delete(STORES.TOPICS, id);
}

// 数据库初始化和迁移
export async function initStorageService(): Promise<void> {
  await initDB();
  
  // 检查是否已经迁移过数据
  const migrationFlag = localStorage.getItem('idb-migration-done');
  if (!migrationFlag) {
    await migrateFromLocalStorage();
    localStorage.setItem('idb-migration-done', 'true');
  }
}

// 提供兼容层 - 如果IndexedDB失败，回退到localStorage
export const storageService = {
  async saveAssistant(assistant: Assistant): Promise<void> {
    try {
      await saveAssistantToDB(assistant);
    } catch (error) {
      console.error('IndexedDB保存失败，回退到localStorage:', error);
      
      try {
        const assistantsJson = localStorage.getItem('userAssistants');
        const assistants = assistantsJson ? JSON.parse(assistantsJson) : [];
        
        const index = assistants.findIndex((a: any) => a.id === assistant.id);
        if (index !== -1) {
          assistants[index] = {...assistant};
        } else {
          assistants.push(assistant);
        }
        
        localStorage.setItem('userAssistants', JSON.stringify(assistants));
      } catch (e) {
        console.error('localStorage回退也失败:', e);
        throw e;
      }
    }
  },
  
  async saveTopic(topic: ChatTopic): Promise<void> {
    try {
      await saveTopicToDB(topic);
    } catch (error) {
      console.error('IndexedDB保存失败，回退到localStorage:', error);
      
      try {
        const topicsJson = localStorage.getItem('chatTopics');
        const topics = topicsJson ? JSON.parse(topicsJson) : [];
        
        const index = topics.findIndex((t: any) => t.id === topic.id);
        if (index !== -1) {
          topics[index] = {...topic};
        } else {
          topics.push(topic);
        }
        
        localStorage.setItem('chatTopics', JSON.stringify(topics));
      } catch (e) {
        console.error('localStorage回退也失败:', e);
        throw e;
      }
    }
  }
};

// 初始化存储服务
initStorageService().catch(console.error); 