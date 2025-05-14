/**
 * 本地存储工具函数
 * 提供对localStorage的简易封装，支持JSON序列化和反序列化
 */

// 获取存储项
export function getItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error('从localStorage获取数据失败:', error);
    return null;
  }
}

// 设置存储项
export function setItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error('向localStorage写入数据失败:', error);
  }
}

// 移除存储项
export function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('从localStorage移除数据失败:', error);
  }
}

// 获取对象（自动解析JSON）
export function getObject<T>(key: string): T | null {
  const value = getItem(key);
  if (value) {
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('解析JSON数据失败:', error);
      return null;
    }
  }
  return null;
}

// 设置对象（自动序列化为JSON）
export function setObject<T>(key: string, value: T): void {
  try {
    const jsonValue = JSON.stringify(value);
    setItem(key, jsonValue);
  } catch (error) {
    console.error('序列化对象失败:', error);
  }
}

// 清除所有存储
export function clear(): void {
  try {
    localStorage.clear();
  } catch (error) {
    console.error('清除localStorage失败:', error);
  }
} 