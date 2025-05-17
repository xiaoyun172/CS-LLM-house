/**
 * IndexedDB 存储工具类
 * 提供对 IndexedDB 的统一封装，完全替代 localStorage
 */
import { openDB } from 'idb';
import { DB_CONFIG } from '../types/DatabaseSchema';

// 获取数据库配置
const { NAME: DB_NAME, VERSION: DB_VERSION, STORES } = DB_CONFIG;

// 统一使用SETTINGS存储所有键值对数据
const SETTINGS_STORE = STORES.SETTINGS;

/**
 * 从 IndexedDB 获取数据
 * @param key 键名
 * @returns 解析后的数据，如果键不存在则返回 null
 */
export async function getStorageItem<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB(DB_NAME, DB_VERSION);
    const result = await db.get(SETTINGS_STORE, key);
    return result ? result.value : null;
  } catch (error) {
    console.error(`Error getting item "${key}" from IndexedDB:`, error);
    return null;
  }
}

/**
 * 向 IndexedDB 保存数据
 * @param key 键名
 * @param value 要保存的值
 */
export async function setStorageItem<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDB(DB_NAME, DB_VERSION);
    await db.put(SETTINGS_STORE, { id: key, value });
  } catch (error) {
    console.error(`Error setting item "${key}" to IndexedDB:`, error);
  }
}

/**
 * 从 IndexedDB 移除数据
 * @param key 键名
 */
export async function removeStorageItem(key: string): Promise<void> {
  try {
    const db = await openDB(DB_NAME, DB_VERSION);
    await db.delete(SETTINGS_STORE, key);
  } catch (error) {
    console.error(`Error removing item "${key}" from IndexedDB:`, error);
  }
}

/**
 * 清空 IndexedDB 中的所有设置数据
 * 注意：此操作会移除设置存储中的所有数据，请谨慎使用
 */
export async function clearStorage(): Promise<void> {
  try {
    const db = await openDB(DB_NAME, DB_VERSION);
    const tx = db.transaction(SETTINGS_STORE, 'readwrite');
    await tx.objectStore(SETTINGS_STORE).clear();
    await tx.done;
    console.log('Settings store has been cleared.');
  } catch (error) {
    console.error('Error clearing settings store:', error);
  }
}

/**
 * 获取 IndexedDB 中所有键名
 * @returns 键名数组
 */
export async function getAllStorageKeys(): Promise<string[]> {
  try {
    const db = await openDB(DB_NAME, DB_VERSION);
    const allKeys = await db.getAllKeys(SETTINGS_STORE);
    return allKeys.map(key => String(key));
  } catch (error) {
    console.error('Error getting all keys from IndexedDB:', error);
    return [];
  }
}

/**
 * 批量设置多个键值对
 * @param items 键值对对象
 */
export async function setStorageItems(items: Record<string, any>): Promise<void> {
  try {
    const db = await openDB(DB_NAME, DB_VERSION);
    const tx = db.transaction(SETTINGS_STORE, 'readwrite');
    const store = tx.objectStore(SETTINGS_STORE);
    
    for (const [key, value] of Object.entries(items)) {
      await store.put({ id: key, value });
    }
    
    await tx.done;
  } catch (error) {
    console.error('Error setting multiple items to IndexedDB:', error);
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