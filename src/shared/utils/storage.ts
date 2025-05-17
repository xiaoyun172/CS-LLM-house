/**
 * Dexie.js 存储工具类
 * 提供对应用存储的统一封装，完全替代 localStorage 和直接的 IndexedDB 操作
 */
import { dexieStorage } from '../services/DexieStorageService';

/**
 * 从数据库获取数据
 * @param key 键名
 * @returns 解析后的数据，如果键不存在则返回 null
 */
export async function getStorageItem<T>(key: string): Promise<T | null> {
  try {
    const value = await dexieStorage.getSetting(key);
    return value ?? null;
  } catch (error) {
    console.error(`Error getting item "${key}" from database:`, error);
    return null;
  }
}

/**
 * 向数据库保存数据
 * @param key 键名
 * @param value 要保存的值
 */
export async function setStorageItem<T>(key: string, value: T): Promise<void> {
  try {
    await dexieStorage.saveSetting(key, value);
  } catch (error) {
    console.error(`Error setting item "${key}" to database:`, error);
  }
}

/**
 * 从数据库移除数据
 * @param key 键名
 */
export async function removeStorageItem(key: string): Promise<void> {
  try {
    await dexieStorage.deleteSetting(key);
  } catch (error) {
    console.error(`Error removing item "${key}" from database:`, error);
  }
}

/**
 * 清空数据库中的所有设置数据
 * 注意：此操作会移除设置表中的所有数据，请谨慎使用
 */
export async function clearStorage(): Promise<void> {
  try {
    // 使用Dexie提供的clear方法清空设置表
    await dexieStorage.settings.clear();
    console.log('Settings store has been cleared.');
  } catch (error) {
    console.error('Error clearing settings store:', error);
  }
}

/**
 * 获取数据库中所有键名
 * @returns 键名数组
 */
export async function getAllStorageKeys(): Promise<string[]> {
  try {
    // 获取所有设置对象
    const settings = await dexieStorage.settings.toArray();
    // 返回所有id作为键名
    return settings.map(setting => String(setting.id));
  } catch (error) {
    console.error('Error getting all keys from database:', error);
    return [];
  }
}

/**
 * 批量设置多个键值对
 * @param items 键值对对象
 */
export async function setStorageItems(items: Record<string, any>): Promise<void> {
  try {
    // 使用Dexie事务批量保存设置
    await dexieStorage.transaction('rw', dexieStorage.settings, async () => {
      for (const [key, value] of Object.entries(items)) {
        await dexieStorage.saveSetting(key, value);
      }
    });
  } catch (error) {
    console.error('Error setting multiple items to database:', error);
  }
}

// 提供与旧版localStorage接口兼容的方法，以便平稳迁移
export const getLocalStorageItem = getStorageItem;
export const setLocalStorageItem = setStorageItem;
export const removeLocalStorageItem = removeStorageItem;
export const clearLocalStorage = clearStorage;
export const getAllLocalStorageKeys = getAllStorageKeys;

// 获取所有localStorage的键
// v1.0.1 - Minor change to force re-evaluation
/*
export function getAllKeys(): string[] {
  try {
    return Object.keys(localStorage);
  } catch (error) {
    console.error('从localStorage获取所有键失败:', error);
    return [];
  }
} 
*/ 