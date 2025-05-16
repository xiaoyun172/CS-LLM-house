import { getAllTopicsFromDB, getAllAssistantsFromDB } from '../../../../shared/services/storageService';
import { getBackupLocation, getBackupStorageType, createAndShareBackupFile } from './backupUtils';
import type { ChatTopic } from '../../../../shared/types';
import type { Assistant } from '../../../../shared/types/Assistant';

export interface CustomBackupOptions {
  topics: boolean;
  assistants: boolean;
  settings: boolean;
  modelSettings: boolean;
  uiSettings: boolean;
  backupSettings: boolean;
  otherData: boolean;
}

/**
 * 准备自定义备份数据
 */
export async function prepareCustomBackupData(options: CustomBackupOptions): Promise<any> {
  // 获取数据
  let allTopics: ChatTopic[] = [];
  let allAssistants: Assistant[] = [];
  
  if (options.topics) {
    allTopics = await getAllTopicsFromDB();
  }
  
  if (options.assistants) {
    allAssistants = await getAllAssistantsFromDB();
  }
  
  // 获取设置数据
  let settings = {};
  let localStorageItems: Record<string, any> = {};
  
  if (options.settings || options.modelSettings || options.uiSettings) {
    const settingsJson = localStorage.getItem('settings');
    const fullSettings = settingsJson ? JSON.parse(settingsJson) : {};
    
    if (options.settings) {
      // 包含所有设置
      settings = fullSettings;
    } else {
      // 选择性包含设置
      if (options.modelSettings) {
        settings = {
          ...settings,
          providers: fullSettings.providers || [],
          models: fullSettings.models || [],
          defaultModelId: fullSettings.defaultModelId,
          currentModelId: fullSettings.currentModelId,
        };
      }
      
      if (options.uiSettings) {
        settings = {
          ...settings,
          theme: fullSettings.theme,
          fontSize: fullSettings.fontSize,
          language: fullSettings.language,
          sendWithEnter: fullSettings.sendWithEnter,
          enableNotifications: fullSettings.enableNotifications
        };
      }
    }
  }
  
  // 获取备份设置
  let backupSettings = {};
  if (options.backupSettings) {
    backupSettings = {
      location: getBackupLocation(),
      storageType: getBackupStorageType()
    };
  }
  
  // 获取其他localStorage数据
  if (options.otherData) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && 
          key !== 'settings' && 
          !key.startsWith('aetherlink-migration') && 
          key !== 'idb-migration-done' &&
          key !== 'backup-location' && 
          key !== 'backup-storage-type') {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            try {
              localStorageItems[key] = JSON.parse(value);
            } catch {
              localStorageItems[key] = value;
            }
          }
        } catch (e) {
          console.error(`读取localStorage项 "${key}" 失败:`, e);
        }
      }
    }
  }
  
  // 构建备份数据
  const backupData: any = {
    timestamp: Date.now(),
    appInfo: {
      version: '1.0.0',
      name: 'AetherLink',
      backupVersion: 3,
      backupType: 'custom'
    }
  };
  
  // 根据选项添加数据
  if (options.topics) {
    backupData.topics = allTopics;
  }
  
  if (options.assistants) {
    backupData.assistants = allAssistants;
  }
  
  if (options.settings || options.modelSettings || options.uiSettings) {
    backupData.settings = settings;
  }
  
  if (options.backupSettings) {
    backupData.backupSettings = backupSettings;
  }
  
  if (options.otherData) {
    backupData.localStorage = localStorageItems;
  }
  
  return backupData;
}

/**
 * 执行自定义备份
 */
export async function performCustomBackup(
  options: CustomBackupOptions,
  onSuccess: (message: string) => void,
  onError: (error: Error) => void,
  onBackupComplete?: () => void
): Promise<void> {
  try {
    // 准备备份数据
    const backupData: any = {
      timestamp: Date.now(),
      appInfo: {
        version: '1.0.0',
        name: 'AetherLink',
        backupVersion: 4,
        backupType: 'custom',
        customOptions: { ...options },
        backupDate: new Date().toISOString()
      }
    };
    
    // 获取话题数据
    if (options.topics) {
      const allTopics = await getAllTopicsFromDB();
      backupData.topics = allTopics;
      console.log(`已添加 ${allTopics.length} 个对话话题`);
    }
    
    // 获取助手数据
    if (options.assistants) {
      const allAssistants = await getAllAssistantsFromDB();
      backupData.assistants = allAssistants;
      console.log(`已添加 ${allAssistants.length} 个助手`);
    }
    
    // 获取所有设置数据
    if (options.settings) {
      const settingsJson = localStorage.getItem('settings');
      const settings = settingsJson ? JSON.parse(settingsJson) : {};
      backupData.settings = settings;
      console.log('已添加所有设置数据');
    } else {
      // 获取特定设置类别
      const settingsJson = localStorage.getItem('settings');
      const allSettings = settingsJson ? JSON.parse(settingsJson) : {};
      const settings: any = {};
      
      // 获取模型设置
      if (options.modelSettings) {
        settings.providers = allSettings.providers || [];
        settings.models = allSettings.models || [];
        settings.defaultModelId = allSettings.defaultModelId;
        settings.currentModelId = allSettings.currentModelId;
        console.log('已添加模型相关设置');
      }
      
      // 获取UI设置
      if (options.uiSettings) {
        settings.theme = allSettings.theme || 'system';
        settings.fontSize = allSettings.fontSize || 16;
        settings.language = allSettings.language || 'zh-CN';
        settings.sendWithEnter = allSettings.sendWithEnter !== undefined ? allSettings.sendWithEnter : true;
        settings.enableNotifications = allSettings.enableNotifications !== undefined ? allSettings.enableNotifications : true;
        console.log('已添加UI相关设置');
      }
      
      // 如果有任何设置，将其添加到备份数据
      if (Object.keys(settings).length > 0) {
        backupData.settings = settings;
      }
    }
    
    // 获取备份设置
    if (options.backupSettings) {
      backupData.backupSettings = {
        location: localStorage.getItem('backup-location'),
        storageType: localStorage.getItem('backup-storage-type')
      };
      console.log('已添加备份设置');
    }
    
    // 获取其他localStorage数据
    if (options.otherData) {
      // 排除这些键
      const excludeKeys = [
        'settings', 
        'backup-location', 
        'backup-storage-type', 
        'aetherlink-migration', 
        'idb-migration-done',
        'chatTopics', // 现在使用IndexedDB存储，避免重复恢复
        'userAssistants' // 现在使用IndexedDB存储，避免重复恢复
      ];
      
      const localStorage_items: Record<string, any> = {};
      let itemCount = 0;
      
      // 遍历localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        // 跳过排除的键
        if (!key || excludeKeys.includes(key) || excludeKeys.some(excludeKey => key.startsWith(excludeKey))) {
          continue;
        }
        
        try {
          const value = localStorage.getItem(key);
          if (value) {
            // 尝试解析JSON，如果失败则存储原始字符串
            try {
              localStorage_items[key] = JSON.parse(value);
            } catch {
              localStorage_items[key] = value;
            }
            itemCount++;
          }
        } catch (e) {
          console.error(`读取localStorage项 "${key}" 失败:`, e);
        }
      }
      
      if (itemCount > 0) {
        backupData.localStorage = localStorage_items;
        console.log(`已添加 ${itemCount} 个其他localStorage项目`);
      }
    }
    
    // 创建文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `AetherLink_Backup_Custom_${timestamp}.json`;
    
    // 创建并共享备份文件
    await createAndShareBackupFile(
      fileName,
      backupData,
      onSuccess,
      onError,
      onBackupComplete
    );
  } catch (error) {
    console.error('创建自定义备份失败:', error);
    onError(error instanceof Error ? error : new Error(String(error)));
  }
} 