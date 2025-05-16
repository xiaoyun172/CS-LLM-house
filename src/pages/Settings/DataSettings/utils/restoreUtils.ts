// import { saveTopicToDB, saveAssistantToDB } from '../../../../shared/services/storageService';
import type { ChatTopic } from '../../../../shared/types';
import type { Message } from '../../../../shared/types';
import type { Assistant } from '../../../../shared/types/Assistant';
import { CURRENT_BACKUP_VERSION } from './backupUtils';
import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import { importExternalBackup } from './externalBackupUtils';

// 数据库名和版本
const DB_NAME = 'aetherlink-db';
const DB_VERSION = 1;

// 对象仓库名称
const STORES = {
  TOPICS: 'topics' as const,
  ASSISTANTS: 'assistants' as const,
  SETTINGS: 'settings' as const
};

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

/**
 * 从文件中读取JSON内容
 */
export function readJSONFromFile(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        resolve(data);
      } catch (error) {
        reject(new Error('无法解析备份文件，JSON格式无效'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('读取文件失败，请检查文件是否损坏'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * 验证备份数据结构
 */
export function validateBackupData(data: any): boolean {
  if (!data) return false;
  
  // 检查基本数据结构
  const hasTopics = Array.isArray(data.topics);
  const hasAssistants = Array.isArray(data.assistants);
  const hasSettings = typeof data.settings === 'object' && data.settings !== null;
  
  // 至少需要包含以下字段之一
  const hasRequiredFields = hasTopics || hasAssistants || hasSettings;
  
  // 检查appInfo信息
  const hasAppInfo = typeof data.appInfo === 'object' && data.appInfo !== null;
  
  // 基本验证通过
  if (hasRequiredFields && hasAppInfo) {
    console.log('备份数据基本验证通过');
    return true;
  }
  
  console.warn('备份数据验证失败，缺少必要字段');
  return false;
}

/**
 * 处理备份版本兼容性
 * 根据备份版本号处理可能的数据格式差异
 */
export function processBackupDataForVersion(data: any): any {
  const processedData = { ...data };
  
  // 获取备份版本
  const backupVersion = 
    data.appInfo && 
    typeof data.appInfo.backupVersion === 'number' ? 
    data.appInfo.backupVersion : 1;
  
  console.log(`处理备份数据，备份版本: ${backupVersion}`);
  
  // 处理旧版本备份数据升级
  if (backupVersion < CURRENT_BACKUP_VERSION) {
    console.log(`将备份数据从版本 ${backupVersion} 升级到 ${CURRENT_BACKUP_VERSION}`);
    
    // 处理话题数据
    if (Array.isArray(processedData.topics)) {
      processedData.topics = processedData.topics.map((topic: ChatTopic) => {
        // 创建话题的深拷贝，避免修改原始数据
        const processedTopic = { ...topic };
        
        // 确保消息数组存在
        if (Array.isArray(processedTopic.messages)) {
          // 处理消息数组 - 修复可能的状态问题
          processedTopic.messages = processedTopic.messages.map((msg: Message) => {
            // 处理消息状态
            if (msg.status === 'error' || msg.status === 'pending') {
              return {
                ...msg,
                status: 'complete',
                // 如果是error状态且没有内容或内容是错误信息，提供友好默认内容
                content: (!msg.content || 
                         typeof msg.content === 'string' && (
                           msg.content === '很抱歉，请求处理失败，请稍后再试。' || 
                           msg.content === '网络连接问题，请检查网络并重试' || 
                           msg.content === 'API密钥无效或已过期，请更新API密钥' ||
                           msg.content === '请求超时，服务器响应时间过长' ||
                           msg.content.includes('请求失败') ||
                           msg.content.includes('错误')
                         )) 
                  ? '您好！有什么我可以帮助您的吗？ (Hello! Is there anything I can assist you with?)'
                  : msg.content
              };
            }
            
            // 确保版本信息一致
            if (msg.alternateVersions && msg.alternateVersions.length > 0) {
              if (!msg.version) {
                msg.version = 1;
              }
              
              // 如果未明确标记版本状态，但有替代版本，默认为非当前版本
              if (msg.isCurrentVersion === undefined && msg.alternateVersions.length > 0) {
                msg.isCurrentVersion = false;
              }
            }
            
            return msg;
          });
        } else {
          // 如果消息数组不存在，初始化为空数组
          processedTopic.messages = [];
        }
        
        // 确保话题有标题
        if (!processedTopic.title) {
          processedTopic.title = '未命名对话';
        }
        
        // 如果没有最后消息时间，使用当前时间
        if (!processedTopic.lastMessageTime) {
          processedTopic.lastMessageTime = new Date().toISOString();
        }
        
        return processedTopic;
      });
    }
    
    // 标准化设置对象（如果存在）
    if (processedData.settings) {
      processedData.settings = {
        ...processedData.settings,
        providers: processedData.settings.providers || [],
        models: processedData.settings.models || [],
        defaultModelId: processedData.settings.defaultModelId,
        currentModelId: processedData.settings.currentModelId,
        theme: processedData.settings.theme || 'system',
        fontSize: processedData.settings.fontSize || 16,
        language: processedData.settings.language || 'zh-CN',
        sendWithEnter: processedData.settings.sendWithEnter !== undefined ? 
          processedData.settings.sendWithEnter : true,
        enableNotifications: processedData.settings.enableNotifications !== undefined ? 
          processedData.settings.enableNotifications : true,
        generatedImages: processedData.settings.generatedImages || [],
      };
    }
    
    // 更新备份版本信息
    if (processedData.appInfo) {
      processedData.appInfo.backupVersion = CURRENT_BACKUP_VERSION;
      processedData.appInfo.migratedFrom = backupVersion;
      processedData.appInfo.migrationDate = new Date().toISOString();
    }
  }
  
  return processedData;
}

/**
 * 清除现有话题数据
 */
export async function clearTopics(): Promise<void> {
  try {
    console.log('清除现有话题数据...');
    const db = await initDB();
    
    // 获取所有话题的ID
    const allTopicIds = await db.getAllKeys(STORES.TOPICS);
    console.log(`准备清除 ${allTopicIds.length} 个现有话题`);
    
    // 创建一个Promise数组，每个Promise负责删除一个话题
    const deletePromises = allTopicIds.map((id: string) => 
      db.delete(STORES.TOPICS, id)
        .catch((err: Error) => console.error(`删除话题 ${id} 失败:`, err))
    );
    
    // 等待所有删除操作完成
    await Promise.all(deletePromises);
    console.log('现有话题数据清除完成');
  } catch (error) {
    console.error('清除话题数据失败:', error);
    throw new Error('清除话题数据失败: ' + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * 清除现有助手数据
 */
export async function clearAssistants(): Promise<void> {
  try {
    console.log('清除现有助手数据...');
    const db = await initDB();
    
    // 获取所有助手的ID
    const allAssistantIds = await db.getAllKeys(STORES.ASSISTANTS);
    console.log(`准备清除 ${allAssistantIds.length} 个现有助手`);
    
    // 创建一个Promise数组，每个Promise负责删除一个助手
    const deletePromises = allAssistantIds.map((id: string) => 
      db.delete(STORES.ASSISTANTS, id)
        .catch((err: Error) => console.error(`删除助手 ${id} 失败:`, err))
    );
    
    // 等待所有删除操作完成
    await Promise.all(deletePromises);
    console.log('现有助手数据清除完成');
  } catch (error) {
    console.error('清除助手数据失败:', error);
    throw new Error('清除助手数据失败: ' + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * 恢复话题数据
 */
export async function restoreTopics(topics: ChatTopic[]): Promise<number> {
  if (!Array.isArray(topics)) {
    console.warn('恢复话题失败：topics不是数组');
    return 0;
  }
  
  console.log(`开始恢复 ${topics.length} 个话题`);
  let successCount = 0;
  
  try {
    // 首先清除现有话题数据
    await clearTopics();
    
    // 验证话题数组有效性
    const validTopics = topics.filter(topic => 
      topic && typeof topic === 'object' && topic.id && 
      (Array.isArray(topic.messages) || typeof topic.title === 'string')
    );
    
    console.log(`过滤后有 ${validTopics.length} 个有效话题，开始保存到数据库`);
    
    const db = await initDB();
    
    // 使用事务批量保存话题，提高效率
    const tx = db.transaction(STORES.TOPICS, 'readwrite');
    const store = tx.objectStore(STORES.TOPICS);
    
    // 创建保存操作的Promise数组
    const savePromises = validTopics.map(topic => {
      const processedTopic = { ...topic };
      
      // 确保话题有消息数组
      if (!Array.isArray(processedTopic.messages)) {
        processedTopic.messages = [];
      }
      
      // 确保话题有标题
      if (!processedTopic.title) {
        processedTopic.title = '未命名对话';
      }
      
      return store.put(processedTopic)
        .then(() => {
          successCount++;
          // 批量记录日志
          if (successCount % 10 === 0 || successCount === validTopics.length) {
            console.log(`已恢复 ${successCount}/${validTopics.length} 个话题`);
          }
          return true;
        })
        .catch(error => {
          console.error(`恢复话题 ${processedTopic.id} 失败:`, error);
          return false;
        });
    });
    
    // 等待所有保存操作完成
    await Promise.all(savePromises);
    await tx.done;
    
    console.log(`话题恢复完成，成功: ${successCount}, 总数: ${validTopics.length}`);
    return successCount;
  } catch (error) {
    console.error('恢复话题过程中发生错误:', error);
    return successCount;
  }
}

/**
 * 恢复助手数据
 */
export async function restoreAssistants(assistants: Assistant[]): Promise<number> {
  if (!Array.isArray(assistants)) {
    console.warn('恢复助手失败：assistants不是数组');
    return 0;
  }
  
  console.log(`开始恢复 ${assistants.length} 个助手`);
  let successCount = 0;
  
  try {
    // 首先清除现有助手数据
    await clearAssistants();
    
    // 验证助手数组有效性
    const validAssistants = assistants.filter(assistant => 
      assistant && typeof assistant === 'object' && assistant.id
    );
    
    console.log(`过滤后有 ${validAssistants.length} 个有效助手，开始保存到数据库`);
    
    const db = await initDB();
    
    // 使用事务批量保存助手，提高效率
    const tx = db.transaction(STORES.ASSISTANTS, 'readwrite');
    const store = tx.objectStore(STORES.ASSISTANTS);
    
    // 创建保存操作的Promise数组
    const savePromises = validAssistants.map(assistant => {
      // 移除可能导致存储失败的icon属性（React元素）
      const cleanAssistant = { ...assistant };
      if (cleanAssistant.icon === null || typeof cleanAssistant.icon === 'object') {
        cleanAssistant.icon = undefined;
      }
      
      return store.put(cleanAssistant)
        .then(() => {
          successCount++;
          return true;
        })
        .catch(error => {
          console.error(`恢复助手 ${cleanAssistant.id} 失败:`, error);
          return false;
        });
    });
    
    // 等待所有保存操作完成
    await Promise.all(savePromises);
    await tx.done;
    
    console.log(`助手恢复完成，成功: ${successCount}, 总数: ${validAssistants.length}`);
    return successCount;
  } catch (error) {
    console.error('恢复助手过程中发生错误:', error);
    return successCount;
  }
}

/**
 * 恢复设置数据
 */
export function restoreSettings(
  backupSettings: any, 
  currentSettings: any = {}, 
  isNewFormat: boolean = false
): void {
  // 如果没有备份设置，直接返回
  if (!backupSettings) {
    console.warn('没有可恢复的设置数据');
    return;
  }
  
  try {
    if (isNewFormat || backupSettings.providers || backupSettings.models) {
      // 新格式或含有关键设置字段 - 恢复完整设置
      console.log('使用完整设置数据进行恢复');
      
      // 确保设置对象的完整性
      const normalizedSettings = {
        // 使用当前设置作为基础
        ...currentSettings,
        // 用备份设置覆盖
        ...backupSettings,
        // 确保关键字段存在
        providers: backupSettings.providers || currentSettings.providers || [],
        models: backupSettings.models || currentSettings.models || [],
        defaultModelId: backupSettings.defaultModelId || currentSettings.defaultModelId,
        currentModelId: backupSettings.currentModelId || currentSettings.currentModelId,
      };
      
      localStorage.setItem('settings', JSON.stringify(normalizedSettings));
      console.log('设置恢复完成');
    } else {
      // 旧格式 - 只恢复模型和供应商相关设置
      console.log('使用传统格式恢复设置，只恢复模型相关设置');
      const mergedSettings = {
        ...currentSettings,
        providers: backupSettings.providers || currentSettings.providers || [],
        models: backupSettings.models || currentSettings.models || [],
        defaultModelId: backupSettings.defaultModelId || currentSettings.defaultModelId,
        currentModelId: backupSettings.currentModelId || currentSettings.currentModelId,
      };
      
      // 保存合并后的设置
      localStorage.setItem('settings', JSON.stringify(mergedSettings));
      console.log('模型设置恢复完成');
    }
  } catch (error) {
    console.error('恢复设置失败:', error);
  }
}

/**
 * 恢复备份设置
 */
export function restoreBackupSettings(backupSettings: { location?: string; storageType?: string }): void {
  if (!backupSettings) {
    console.warn('没有可恢复的备份设置');
    return;
  }
  
  try {
    const { location, storageType } = backupSettings;
    
    if (location) {
      localStorage.setItem('backup-location', location);
      console.log(`已恢复备份位置: ${location}`);
    }
    
    if (storageType) {
      localStorage.setItem('backup-storage-type', storageType);
      console.log(`已恢复备份存储类型: ${storageType}`);
    }
  } catch (error) {
    console.error('恢复备份设置失败:', error);
  }
}

/**
 * 恢复其他localStorage数据
 */
export function restoreLocalStorageItems(items: Record<string, any>): number {
  if (!items || typeof items !== 'object') {
    console.warn('没有可恢复的localStorage项目');
    return 0;
  }
  
  const keys = Object.keys(items);
  console.log(`准备恢复 ${keys.length} 个localStorage项目`);
  let restoredCount = 0;
  
  // 排除这些键，不进行恢复
  const excludeKeys = [
    'settings', 
    'backup-location', 
    'backup-storage-type', 
    'aetherlink-migration', 
    'idb-migration-done',
    'chatTopics', // 现在使用IndexedDB存储，避免重复恢复
    'userAssistants' // 现在使用IndexedDB存储，避免重复恢复
  ];
  
  for (const key of keys) {
    // 跳过排除的键
    if (excludeKeys.includes(key) || excludeKeys.some(excludeKey => key.startsWith(excludeKey))) {
      console.log(`跳过恢复排除项: ${key}`);
      continue;
    }
    
    try {
      const value = items[key];
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      restoredCount++;
      
      // 每10个项目输出一次日志，避免日志过多
      if (restoredCount % 10 === 0 || restoredCount === keys.length) {
        console.log(`已恢复 ${restoredCount} 个localStorage项目`);
      }
    } catch (e) {
      console.error(`恢复localStorage项 "${key}" 失败:`, e);
    }
  }
  
  console.log(`localStorage项目恢复完成，成功: ${restoredCount}, 总数: ${keys.length}`);
  return restoredCount;
}

/**
 * 完整恢复流程
 */
export async function performFullRestore(
  backupData: any, 
  onProgress?: (stage: string, progress: number) => void
): Promise<{
  success: boolean;
  topicsCount: number;
  assistantsCount: number;
  settingsRestored: boolean;
  localStorageCount: number;
  error?: string;
}> {
  try {
    // 步骤1：验证备份数据
    if (!validateBackupData(backupData)) {
      return {
        success: false,
        topicsCount: 0,
        assistantsCount: 0,
        settingsRestored: false,
        localStorageCount: 0,
        error: '无效的备份文件格式：缺少必要的数据字段'
      };
    }
    
    // 步骤2：处理备份数据版本兼容性
    const processedData = processBackupDataForVersion(backupData);
    if (onProgress) onProgress('处理数据', 0.1);
    
    // 步骤3：恢复话题数据
    const topicsCount = await restoreTopics(processedData.topics || []);
    if (onProgress) onProgress('恢复对话', 0.4);
    
    // 步骤4：恢复助手数据
    const assistantsCount = await restoreAssistants(processedData.assistants || []);
    if (onProgress) onProgress('恢复助手', 0.6);
    
    // 步骤5：检查备份版本
    const isNewFormat = processedData.appInfo && processedData.appInfo.backupVersion >= 2;
    
    // 步骤6：恢复设置数据
    let settingsRestored = false;
    if (processedData.settings) {
      // 获取当前设置
      const currentSettingsJson = localStorage.getItem('settings');
      const currentSettings = currentSettingsJson ? JSON.parse(currentSettingsJson) : {};
      
      restoreSettings(processedData.settings, currentSettings, isNewFormat);
      settingsRestored = true;
    }
    if (onProgress) onProgress('恢复设置', 0.8);
    
    // 步骤7：恢复备份设置
    if (isNewFormat && processedData.backupSettings) {
      restoreBackupSettings(processedData.backupSettings);
    }
    
    // 步骤8：恢复其他localStorage项目
    let localStorageCount = 0;
    if (isNewFormat && processedData.localStorage) {
      localStorageCount = restoreLocalStorageItems(processedData.localStorage);
    }
    if (onProgress) onProgress('恢复完成', 1.0);
    
    return {
      success: true,
      topicsCount,
      assistantsCount,
      settingsRestored,
      localStorageCount
    };
  } catch (error) {
    console.error('执行完整恢复过程失败:', error);
    return {
      success: false,
      topicsCount: 0,
      assistantsCount: 0,
      settingsRestored: false,
      localStorageCount: 0,
      error: error instanceof Error ? error.message : '恢复过程中发生未知错误'
    };
  }
}

/**
 * 从文件中读取外部AI软件的JSON内容并导入
 */
export async function importExternalBackupFromFile(file: File): Promise<{
  success: boolean;
  topicsCount: number;
  assistantsCount: number;
  source: string;
  error?: string;
}> {
  try {
    // 读取JSON数据
    const jsonData = await readJSONFromFile(file);
    
    // 尝试识别并导入外部备份
    const { topics, assistants, source } = await importExternalBackup(jsonData);
    
    // 恢复话题
    const topicsCount = await restoreTopics(topics);
    
    // 恢复助手
    const assistantsCount = await restoreAssistants(assistants);
    
    return {
      success: true,
      topicsCount,
      assistantsCount,
      source
    };
  } catch (error) {
    console.error('导入外部备份失败:', error);
    return {
      success: false,
      topicsCount: 0,
      assistantsCount: 0,
      source: 'unknown',
      error: error instanceof Error ? error.message : '导入外部备份失败'
    };
  }
} 