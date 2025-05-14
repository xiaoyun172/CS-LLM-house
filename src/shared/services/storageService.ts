import { openDB } from 'idb';
import type { IDBPDatabase, DBSchema } from 'idb';
import type { ChatTopic } from '../types';
import type { Assistant } from '../types/Assistant';

// 定义数据库schema
interface AetherLinkDB extends DBSchema {
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
const OLD_DB_NAME_1 = 'cherry-studio-db'; // 保留第一个旧名称用于数据迁移
const OLD_DB_NAME_2 = 'llm-house-db'; // 保留第二个旧名称用于数据迁移
const DB_NAME = 'aetherlink-db'; // 新的数据库名称
const DB_VERSION = 1;

// 对象仓库名称
const STORES = {
  TOPICS: 'topics' as const,
  ASSISTANTS: 'assistants' as const,
  SETTINGS: 'settings' as const
};

// 初始化数据库
async function initDB(): Promise<IDBPDatabase<AetherLinkDB>> {
  return openDB<AetherLinkDB>(DB_NAME, DB_VERSION, {
    upgrade(db: IDBPDatabase<AetherLinkDB>) {
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
    
    // 确保移除迁移提示框
    const migrationNotice = document.querySelector('div[style*="position: fixed"][style*="zIndex: 9999"]');
    if (migrationNotice && migrationNotice.parentNode) {
      migrationNotice.parentNode.removeChild(migrationNotice);
    }
  } catch (error) {
    console.error('数据迁移失败:', error);
    // 确保移除迁移提示框
    const migrationNotice = document.querySelector('div[style*="position: fixed"][style*="zIndex: 9999"]');
    if (migrationNotice && migrationNotice.parentNode) {
      migrationNotice.parentNode.removeChild(migrationNotice);
    }
  }
}

// 从旧数据库迁移数据到新数据库
async function migrateFromOldDB(): Promise<boolean> {
  let migrationNotice: HTMLDivElement | null = null;
  
  try {
    // 检查第一个旧数据库(cherry-studio-db)是否存在
    const oldDB1Exists = await new Promise<boolean>((resolve) => {
      const request = indexedDB.open(OLD_DB_NAME_1);
      
      request.onsuccess = () => {
        const db = request.result;
        db.close();
        resolve(true);
      };
      
      request.onerror = () => {
        resolve(false);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        db.close();
        // 如果是新创建的，那就没有旧数据
        resolve(false);
      };
    });
    
    // 检查第二个旧数据库(llm-house-db)是否存在
    const oldDB2Exists = await new Promise<boolean>((resolve) => {
      const request = indexedDB.open(OLD_DB_NAME_2);
      
      request.onsuccess = () => {
        const db = request.result;
        db.close();
        resolve(true);
      };
      
      request.onerror = () => {
        resolve(false);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        db.close();
        // 如果是新创建的，那就没有旧数据
        resolve(false);
      };
    });
    
    if (!oldDB1Exists && !oldDB2Exists) {
      console.log('没有找到旧数据库，不需要迁移');
      // 确保移除可能存在的迁移提示框
      const existingNotice = document.querySelector('div[style*="position: fixed"][style*="zIndex: 9999"]');
      if (existingNotice && existingNotice.parentNode) {
        existingNotice.parentNode.removeChild(existingNotice);
      }
      
      // 设置迁移完成标记，避免反复尝试迁移
      localStorage.setItem('aetherlink-migration-completed', 'true');
      return false;
    }
    
    console.log('发现旧数据库，开始迁移数据...');
    
    // 显示迁移提示
    if (typeof window !== 'undefined') {
      // 移除任何可能已存在的提示框
      const existingNotice = document.querySelector('div[style*="position: fixed"][style*="zIndex: 9999"]');
      if (existingNotice && existingNotice.parentNode) {
        existingNotice.parentNode.removeChild(existingNotice);
      }
      
      // 创建一个临时div元素作为提示框
      migrationNotice = document.createElement('div');
      migrationNotice.id = 'aetherlink-migration-notice';
      migrationNotice.style.position = 'fixed';
      migrationNotice.style.top = '20%';
      migrationNotice.style.left = '50%';
      migrationNotice.style.transform = 'translateX(-50%)';
      migrationNotice.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      migrationNotice.style.color = 'white';
      migrationNotice.style.padding = '20px';
      migrationNotice.style.borderRadius = '8px';
      migrationNotice.style.zIndex = '9999';
      migrationNotice.style.maxWidth = '80%';
      migrationNotice.style.textAlign = 'center';
      migrationNotice.innerHTML = `
        <h3 style="margin: 0 0 10px 0;">数据迁移</h3>
        <p style="margin: 0;">正在进行应用数据迁移到 AetherLink，请勿关闭应用...<br>您的所有对话记录和助手将会自动保留</p>
        <div id="migration-progress" style="margin-top: 10px; height: 4px; background-color: #333; border-radius: 2px;">
          <div id="migration-bar" style="width: 10%; height: 100%; background-color: #1E88E5; border-radius: 2px;"></div>
        </div>
      `;
      document.body.appendChild(migrationNotice);
      
      // 更新进度条函数
      const updateProgress = (percent: number) => {
        const progressBar = document.getElementById('migration-bar');
        if (progressBar) {
          progressBar.style.width = `${percent}%`;
        }
      };
      
      updateProgress(10);
    }
    
    let migratedTopics = false;
    let migratedAssistants = false;
    let migratedSettings = false;
    
    // 优先从第二个数据库(llm-house-db)迁移，因为它可能是最新的
    if (oldDB2Exists) {
      // 打开第二个旧数据库
      const oldDB = await openDB(OLD_DB_NAME_2, DB_VERSION);
      
      // 获取所有话题
      const oldTopics = await oldDB.getAll(STORES.TOPICS);
      if (oldTopics.length > 0) {
        console.log(`从AetherLink旧数据库找到 ${oldTopics.length} 个话题需要迁移`);
        
        // 更新进度到30%
        const progressBar = document.getElementById('migration-bar');
        if (progressBar) progressBar.style.width = '30%';
        
        // 保存到新数据库
        for (const topic of oldTopics) {
          await saveTopicToDB(topic);
        }
        console.log('AetherLink旧数据库话题迁移完成');
        migratedTopics = true;
        
        // 更新进度到40%
        if (progressBar) progressBar.style.width = '40%';
      }
      
      // 获取所有助手
      const oldAssistants = await oldDB.getAll(STORES.ASSISTANTS);
      if (oldAssistants.length > 0) {
        console.log(`从AetherLink旧数据库找到 ${oldAssistants.length} 个助手需要迁移`);
        
        // 保存到新数据库
        for (const assistant of oldAssistants) {
          await saveAssistantToDB(assistant);
        }
        console.log('AetherLink旧数据库助手迁移完成');
        migratedAssistants = true;
        
        // 更新进度到50%
        const progressBar = document.getElementById('migration-bar');
        if (progressBar) progressBar.style.width = '50%';
      }
      
      // 获取所有设置
      const oldSettings = await oldDB.getAll(STORES.SETTINGS);
      if (oldSettings.length > 0) {
        console.log(`从AetherLink旧数据库找到 ${oldSettings.length} 个设置项需要迁移`);
        
        // 保存到新数据库
        const db = await initDB();
        for (const setting of oldSettings) {
          await db.put(STORES.SETTINGS, setting);
        }
        console.log('AetherLink旧数据库设置迁移完成');
        migratedSettings = true;
      }
      
      // 关闭第二个旧数据库
      oldDB.close();
    }
    
    // 如果有数据没有迁移成功，尝试从第一个数据库(cherry-studio-db)迁移
    if (oldDB1Exists && (!migratedTopics || !migratedAssistants || !migratedSettings)) {
      // 打开第一个旧数据库
      const oldDB = await openDB(OLD_DB_NAME_1, DB_VERSION);
      
      // 只迁移还没迁移过的数据
      if (!migratedTopics) {
        // 获取所有话题
        const oldTopics = await oldDB.getAll(STORES.TOPICS);
        if (oldTopics.length > 0) {
          console.log(`从Cherry Studio数据库找到 ${oldTopics.length} 个话题需要迁移`);
          
          // 更新进度到60%
          const progressBar = document.getElementById('migration-bar');
          if (progressBar) progressBar.style.width = '60%';
          
          // 保存到新数据库
          for (const topic of oldTopics) {
            await saveTopicToDB(topic);
          }
          console.log('Cherry Studio话题迁移完成');
        }
      }
      
      if (!migratedAssistants) {
        // 获取所有助手
        const oldAssistants = await oldDB.getAll(STORES.ASSISTANTS);
        if (oldAssistants.length > 0) {
          console.log(`从Cherry Studio数据库找到 ${oldAssistants.length} 个助手需要迁移`);
          
          // 保存到新数据库
          for (const assistant of oldAssistants) {
            await saveAssistantToDB(assistant);
          }
          console.log('Cherry Studio助手迁移完成');
          
          // 更新进度到70%
          const progressBar = document.getElementById('migration-bar');
          if (progressBar) progressBar.style.width = '70%';
        }
      }
      
      if (!migratedSettings) {
        // 获取所有设置
        const oldSettings = await oldDB.getAll(STORES.SETTINGS);
        if (oldSettings.length > 0) {
          console.log(`从Cherry Studio数据库找到 ${oldSettings.length} 个设置项需要迁移`);
          
          // 保存到新数据库
          const db = await initDB();
          for (const setting of oldSettings) {
            await db.put(STORES.SETTINGS, setting);
          }
          console.log('Cherry Studio设置迁移完成');
          
          // 更新进度到80%
          const progressBar = document.getElementById('migration-bar');
          if (progressBar) progressBar.style.width = '80%';
        }
      }
      
      // 关闭第一个旧数据库
      oldDB.close();
    }
    
    console.log('数据迁移完成');
    
    // 完成进度条
    const progressBar = document.getElementById('migration-bar');
    if (progressBar) progressBar.style.width = '100%';
    
    // 标记迁移已完成
    localStorage.setItem('aetherlink-migration-completed', 'true');
    
    // 移除提示框
    if (migrationNotice && migrationNotice.parentNode) {
      setTimeout(() => {
        if (migrationNotice && migrationNotice.parentNode) {
          migrationNotice.parentNode.removeChild(migrationNotice);
        }
      }, 2000);
    } else {
      // 查找并移除可能存在的其他迁移提示框
      const existingNotice = document.getElementById('aetherlink-migration-notice') || 
                            document.querySelector('div[style*="position: fixed"][style*="zIndex: 9999"]');
      if (existingNotice && existingNotice.parentNode) {
        setTimeout(() => {
          if (existingNotice && existingNotice.parentNode) {
            existingNotice.parentNode.removeChild(existingNotice);
          }
        }, 2000);
      }
    }
    
    return true;
  } catch (error) {
    console.error('数据库迁移失败:', error);
    
    // 迁移失败也要移除提示框
    if (migrationNotice && migrationNotice.parentNode) {
      migrationNotice.parentNode.removeChild(migrationNotice);
    } else {
      // 查找并移除可能存在的其他迁移提示框
      const existingNotice = document.getElementById('aetherlink-migration-notice') || 
                           document.querySelector('div[style*="position: fixed"][style*="zIndex: 9999"]');
      if (existingNotice && existingNotice.parentNode) {
        existingNotice.parentNode.removeChild(existingNotice);
      }
    }
    
    // 设置迁移完成标记，避免反复尝试迁移
    localStorage.setItem('aetherlink-migration-completed', 'true');
    
    // 显示错误提示
    alert('AetherLink数据迁移失败，部分数据可能无法恢复。请尝试重启应用。');
    
    return false;
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
  try {
    // 初始化新数据库
    await initDB();
    
    // 检查是否已经从旧数据库迁移过
    const dbMigrationCompleted = localStorage.getItem('aetherlink-migration-completed');
    if (!dbMigrationCompleted) {
      // 从旧数据库迁移数据
      await migrateFromOldDB();
    } else {
      // 已经迁移过，确保任何遗留的迁移对话框被移除
      const existingNotice = document.getElementById('aetherlink-migration-notice') || 
                           document.querySelector('div[style*="position: fixed"][style*="zIndex: 9999"]');
      if (existingNotice && existingNotice.parentNode) {
        existingNotice.parentNode.removeChild(existingNotice);
      }
    }
    
    // 检查是否已经从localStorage迁移过数据
    const lsMigrationFlag = localStorage.getItem('idb-migration-done');
    if (!lsMigrationFlag) {
      await migrateFromLocalStorage();
      localStorage.setItem('idb-migration-done', 'true');
    }
  } catch (error) {
    console.error('存储服务初始化失败:', error);
    
    // 确保任何遗留的迁移对话框被移除
    const existingNotice = document.getElementById('aetherlink-migration-notice') || 
                         document.querySelector('div[style*="position: fixed"][style*="zIndex: 9999"]');
    if (existingNotice && existingNotice.parentNode) {
      existingNotice.parentNode.removeChild(existingNotice);
    }
    
    // 设置迁移完成标记，避免反复尝试迁移
    localStorage.setItem('aetherlink-migration-completed', 'true');
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
  },
  
  async getTopic(topicId: string): Promise<ChatTopic | undefined> {
    try {
      return await getTopicFromDB(topicId);
    } catch (error) {
      console.error('IndexedDB获取失败，回退到localStorage:', error);
      
      try {
        const topicsJson = localStorage.getItem('chatTopics');
        if (!topicsJson) return undefined;
        
        const topics = JSON.parse(topicsJson);
        return topics.find((t: any) => t.id === topicId);
      } catch (e) {
        console.error('localStorage回退也失败:', e);
        throw e;
      }
    }
  },
  
  async deleteTopic(topicId: string): Promise<void> {
    try {
      // 尝试从IndexedDB删除
      await deleteTopicFromDB(topicId);
    } catch (error) {
      console.error('IndexedDB删除失败，回退到localStorage:', error);
      
      try {
        // 从localStorage删除
        const topicsJson = localStorage.getItem('chatTopics');
        if (topicsJson) {
          const topics = JSON.parse(topicsJson);
          const filteredTopics = topics.filter((t: any) => t.id !== topicId);
          localStorage.setItem('chatTopics', JSON.stringify(filteredTopics));
        }
      } catch (e) {
        console.error('localStorage回退也失败:', e);
        throw e;
      }
    }
  }
};

// 初始化存储服务
initStorageService().catch(console.error); 