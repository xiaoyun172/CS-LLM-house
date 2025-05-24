/**
 * 通用网络请求工具
 * 在移动端使用 Capacitor HTTP 绕过 CORS，在 Web 端使用标准 fetch
 */

import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';

export interface UniversalFetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
}

/**
 * 通用 fetch 函数，自动选择最佳的网络请求方式
 */
export async function universalFetch(
  url: string | URL, 
  options: UniversalFetchOptions = {}
): Promise<Response> {
  const urlString = url.toString();
  const {
    timeout = 30000,
    retries = 3,
    ...fetchOptions
  } = options;

  console.log(`[Universal Fetch] 请求: ${urlString}`);

  if (Capacitor.isNativePlatform()) {
    // 移动端：使用 Capacitor HTTP 原生请求，完全绕过 CORS
    return await nativeFetch(urlString, fetchOptions, timeout, retries);
  } else {
    // Web 端：使用标准 fetch
    return await webFetch(urlString, fetchOptions, timeout);
  }
}

/**
 * 移动端原生请求
 */
async function nativeFetch(
  url: string,
  options: RequestInit,
  timeout: number,
  retries: number,
  retryCount = 0
): Promise<Response> {
  try {
    console.log(`[Universal Fetch] 使用原生 HTTP 请求 (尝试 ${retryCount + 1}/${retries + 1})`);

    const response = await CapacitorHttp.request({
      url,
      method: (options.method as any) || 'GET',
      headers: {
        'User-Agent': 'AetherLink-Mobile/1.0',
        ...(options.headers as Record<string, string>)
      },
      data: options.body,
      readTimeout: timeout,
      connectTimeout: timeout
    });

    // 包装成标准 Response 对象
    return new Response(
      typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
      {
        status: response.status,
        statusText: response.status.toString(),
        headers: new Headers(response.headers)
      }
    );
  } catch (error) {
    console.error(`[Universal Fetch] 原生请求失败 (尝试 ${retryCount + 1}/${retries + 1}):`, error);
    
    // 如果还有重试次数，则重试
    if (retryCount < retries) {
      const delay = Math.pow(2, retryCount) * 1000; // 指数退避
      console.log(`[Universal Fetch] ${delay}ms 后重试...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return nativeFetch(url, options, timeout, retries, retryCount + 1);
    }
    
    throw error;
  }
}

/**
 * Web 端标准请求
 */
async function webFetch(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  console.log(`[Universal Fetch] 使用标准 fetch 请求`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * 专门用于 MCP 服务器的请求函数
 * 自动处理 CORS 代理逻辑
 */
export async function mcpFetch(
  originalUrl: string,
  options: UniversalFetchOptions = {}
): Promise<Response> {
  if (Capacitor.isNativePlatform()) {
    // 移动端：直接请求原始 URL，绕过代理
    console.log(`[MCP Fetch] 移动端直接请求: ${originalUrl}`);
    return await universalFetch(originalUrl, options);
  } else {
    // Web 端：使用代理
    const proxyUrl = `/api/cors-proxy?url=${encodeURIComponent(originalUrl)}`;
    console.log(`[MCP Fetch] Web 端代理请求: ${originalUrl} -> ${proxyUrl}`);
    return await universalFetch(proxyUrl, options);
  }
}

/**
 * 创建支持 CORS 绕过的 fetch 函数
 * 可以用来替换全局的 fetch
 */
export function createCORSFreeFetch() {
  return async (url: string | URL, init?: RequestInit): Promise<Response> => {
    return await universalFetch(url, init);
  };
}

/**
 * 检查是否需要使用代理
 */
export function needsCORSProxy(url: string): boolean {
  if (Capacitor.isNativePlatform()) {
    return false; // 移动端不需要代理
  }

  try {
    const urlObj = new URL(url);
    const currentOrigin = window.location.origin;
    return urlObj.origin !== currentOrigin;
  } catch {
    return false;
  }
}

/**
 * 获取适合当前平台的 URL
 */
export function getPlatformUrl(originalUrl: string): string {
  if (Capacitor.isNativePlatform()) {
    // 移动端：直接返回原始 URL
    return originalUrl;
  } else if (needsCORSProxy(originalUrl)) {
    // Web 端且需要代理：返回代理 URL
    return `/api/cors-proxy?url=${encodeURIComponent(originalUrl)}`;
  } else {
    // Web 端且不需要代理：返回原始 URL
    return originalUrl;
  }
}

/**
 * 日志记录函数
 */
export function logFetchUsage(originalUrl: string, finalUrl: string, method: string = 'GET') {
  console.log(`[Universal Fetch] ${method} ${originalUrl} -> ${finalUrl}`);
}
