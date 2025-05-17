import { getBackupLocation, getBackupStorageType, createAndShareBackupFile, getLocalStorageItems } from './backupUtils';
import type { ChatTopic } from '../../../../shared/types';
import type { Assistant } from '../../../../shared/types/Assistant';
import { dexieStorage } from '../../../../shared/services/DexieStorageService';
import { getStorageItem } from '../../../../shared/utils/storage';

export interface CustomBackupOptions {
  topics: boolean;
  assistants: boolean;
  settings: boolean;
  modelSettings: boolean;
  uiSettings: boolean;
  backupSettings: boolean;
  otherData: boolean;
}

// 定义设置对象类型
interface AppSettings {
  providers?: any[];
  models?: any[];
  defaultModelId?: string;
  currentModelId?: string;
  theme?: string;
  fontSize?: number;
  language?: string;
  sendWithEnter?: boolean;
  enableNotifications?: boolean;
  [key: string]: any; // 允许其他任意属性
}

/**
 * 准备自定义备份数据
 */
export async function prepareCustomBackupData(options: CustomBackupOptions): Promise<any> {
  // 获取数据
  let allTopics: ChatTopic[] = [];
  let allAssistants: Assistant[] = [];
  
  if (options.topics) {
    allTopics = await dexieStorage.getAllTopics();
  }
  
  if (options.assistants) {
    allAssistants = await dexieStorage.getAllAssistants();
  }
  
  // 获取设置数据
  let settings: AppSettings = {};
  let localStorageItems: Record<string, any> = {};
  
  if (options.settings || options.modelSettings || options.uiSettings) {
    const fullSettings = await getStorageItem<AppSettings>('settings') || {};
    
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
      location: await getBackupLocation(),
      storageType: await getBackupStorageType()
    };
  }
  
  // 获取其他数据
  if (options.otherData) {
    // 排除一些特定键
    const excludeKeys = [
      'settings', 
      'backup-location', 
      'backup-storage-type', 
      'apiKey', 'openaiKey', 'anthropicKey', 'googleAiKey',
      'currentChatId', '_lastSaved', '_sessionData'
    ];
    
    localStorageItems = await getLocalStorageItems(excludeKeys);
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
      const allTopics = await dexieStorage.getAllTopics();
      backupData.topics = allTopics;
      console.log(`已添加 ${allTopics.length} 个对话话题`);
    }
    
    // 获取助手数据
    if (options.assistants) {
      const allAssistants = await dexieStorage.getAllAssistants();
      backupData.assistants = allAssistants;
      console.log(`已添加 ${allAssistants.length} 个助手`);
    }
    
    // 获取所有设置数据
    if (options.settings) {
      const settings = await getStorageItem<AppSettings>('settings') || {};
      backupData.settings = settings;
      console.log('已添加所有设置数据');
    } else {
      // 获取特定设置类别
      const allSettings = await getStorageItem<AppSettings>('settings') || {};
      const settings: AppSettings = {};
      
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
        location: await getStorageItem('backup-location'),
        storageType: await getStorageItem('backup-storage-type')
      };
      console.log('已添加备份设置');
    }
    
    // 获取其他数据
    if (options.otherData) {
      // 排除这些键
      const excludeKeys = [
        'settings', 
        'backup-location', 
        'backup-storage-type',
        'apiKey', 'openaiKey', 'anthropicKey', 'googleAiKey',
        'currentChatId', '_lastSaved', '_sessionData', 'temp_', 'debug_'
      ];
      
      const otherData = await getLocalStorageItems(excludeKeys);
      backupData.localStorage = otherData;
      console.log(`已添加 ${Object.keys(otherData).length} 个其他数据项`);
    }
    
    // 创建文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `AetherLink_CustomBackup_${timestamp}.json`;
    
    // 创建并共享备份文件
    await createAndShareBackupFile(
      fileName,
      backupData,
      onSuccess,
      onError,
      onBackupComplete
    );
  } catch (error) {
    console.error('执行自定义备份时出错:', error);
    onError(error instanceof Error ? error : new Error(String(error)));
  }
} 