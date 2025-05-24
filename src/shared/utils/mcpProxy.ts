/**
 * MCP 代理工具
 * 解决移动端 CORS 跨域问题的通用解决方案
 */

/**
 * 检查是否为开发环境
 */
function isDevelopment(): boolean {
  return import.meta.env.DEV;
}

/**
 * 检查 URL 是否需要代理
 */
function needsProxy(url: string): boolean {
  if (!isDevelopment()) {
    return false;
  }

  // 检查是否为外部 URL（非本地）
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // 本地地址不需要代理
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
      return false;
    }

    // 外部地址需要代理
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 将外部 URL 转换为代理 URL
 */
export function getProxyUrl(originalUrl: string): string {
  if (!needsProxy(originalUrl)) {
    return originalUrl;
  }

  try {
    // 对于所有外部 URL，统一使用通用 CORS 代理
    return `/api/cors-proxy?url=${encodeURIComponent(originalUrl)}`;
  } catch (error) {
    console.error('[MCP Proxy] URL 转换失败:', error);
    return originalUrl;
  }
}

/**
 * 创建支持代理的 fetch 函数
 */
export function createProxyFetch() {
  return async (url: string | URL, init?: RequestInit): Promise<Response> => {
    const urlString = url.toString();

    // 使用通用 fetch 自动处理 CORS
    const { universalFetch } = await import('./universalFetch');
    return await universalFetch(urlString, init);
  };
}

/**
 * 为 SSE 连接创建代理 URL
 */
export function createSSEProxyUrl(originalUrl: string): string {
  // 直接实现平台检测逻辑，避免循环导入
  const isNative = typeof window !== 'undefined' &&
                   (window as any).Capacitor &&
                   typeof (window as any).Capacitor.isNativePlatform === 'function' &&
                   (window as any).Capacitor.isNativePlatform();

  if (isNative) {
    // 移动端：直接返回原始 URL
    console.log(`[MCP SSE Proxy] 移动端直接连接: ${originalUrl}`);
    return originalUrl;
  }

  // Web 端：使用代理
  let proxyUrl = getProxyUrl(originalUrl);

  // 添加强制 SSE 参数
  const separator = proxyUrl.includes('?') ? '&' : '?';
  proxyUrl += `${separator}force_sse=true`;

  // 转换为完整 URL
  let finalUrl = proxyUrl;
  if (proxyUrl.startsWith('/')) {
    const currentOrigin = window.location.origin;
    finalUrl = `${currentOrigin}${proxyUrl}`;
  }

  console.log(`[MCP SSE Proxy] ${originalUrl} -> ${finalUrl}`);
  return finalUrl;
}

/**
 * 为 HTTP 连接创建代理 URL
 */
export function createHTTPProxyUrl(originalUrl: string): string {
  // 更准确的平台检测
  const isNative = typeof window !== 'undefined' &&
                   (window as any).Capacitor &&
                   typeof (window as any).Capacitor.isNativePlatform === 'function' &&
                   (window as any).Capacitor.isNativePlatform();

  console.log(`[MCP HTTP Proxy] 平台检测: isNative=${isNative}, Capacitor=${!!(window as any).Capacitor}`);

  if (isNative) {
    // 移动端：直接返回原始 URL
    console.log(`[MCP HTTP Proxy] 移动端直接连接: ${originalUrl}`);
    return originalUrl;
  }

  // Web 端：使用代理
  let proxyUrl = getProxyUrl(originalUrl);

  // 如果是相对路径，转换为完整的 URL
  if (proxyUrl.startsWith('/')) {
    const currentOrigin = window.location.origin;
    proxyUrl = `${currentOrigin}${proxyUrl}`;
  }

  console.log(`[MCP HTTP Proxy] Web 端代理连接: ${originalUrl} -> ${proxyUrl}`);
  return proxyUrl;
}

/**
 * 为 WebSocket 连接创建代理 URL
 */
export function createWebSocketProxyUrl(originalUrl: string): string {
  if (!needsProxy(originalUrl)) {
    return originalUrl;
  }

  // 将 HTTP(S) 协议转换为 WS(S)
  let proxyUrl = getProxyUrl(originalUrl);

  // 如果是相对路径，转换为完整的 URL
  if (proxyUrl.startsWith('/')) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    proxyUrl = `${protocol}//${window.location.host}${proxyUrl}`;
  } else {
    if (proxyUrl.startsWith('http://')) {
      proxyUrl = proxyUrl.replace('http://', 'ws://');
    } else if (proxyUrl.startsWith('https://')) {
      proxyUrl = proxyUrl.replace('https://', 'wss://');
    }
  }

  console.log(`[MCP WebSocket Proxy] ${originalUrl} -> ${proxyUrl}`);

  return proxyUrl;
}

/**
 * 检查代理是否可用
 */
export async function checkProxyHealth(): Promise<boolean> {
  if (!isDevelopment()) {
    return true; // 生产环境不需要代理
  }

  try {
    const response = await fetch('/api/cors-proxy?url=https://httpbin.org/get', {
      method: 'GET'
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * 获取代理状态信息
 */
export function getProxyStatus() {
  return {
    isDevelopment: isDevelopment(),
    proxyEnabled: isDevelopment(),
    proxyEndpoints: {
      universal: '/api/cors-proxy',
      modelscope: '/api/mcp',
      fetch: '/api/fetch-proxy'
    }
  };
}

/**
 * 日志记录函数
 */
export function logProxyUsage(originalUrl: string, proxyUrl: string, method: string = 'GET') {
  if (isDevelopment()) {
    console.log(`[MCP Proxy] ${method} ${originalUrl} -> ${proxyUrl}`);
  }
}
