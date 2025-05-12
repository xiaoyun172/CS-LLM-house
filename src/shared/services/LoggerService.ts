// 日志项接口
export interface LogItem {
  id: string;
  timestamp: string;
  type: 'log' | 'error' | 'warn' | 'info' | 'api-request' | 'api-response';
  content: string;
  details?: any;
}

// 全局日志存储
export const globalLogs: LogItem[] = [];

// 原始控制台方法
let originalConsoleLog: typeof console.log;
let originalConsoleError: typeof console.error;
let originalConsoleWarn: typeof console.warn;
let originalConsoleInfo: typeof console.info;

// 是否已初始化
let isInitialized = false;

// 处理参数，将对象转换为字符串
const processArgs = (args: any[]) => {
  return args.map(arg => {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return '[无法序列化的对象]';
      }
    }
    return String(arg);
  }).join(' ');
};

// 添加日志到全局存储
export const addToGlobalLogs = (log: LogItem) => {
  globalLogs.push(log);
  // 限制日志数量，防止内存泄漏
  if (globalLogs.length > 1000) {
    globalLogs.shift();
  }
};

// 创建日志项
export const createLogItem = (type: 'log' | 'error' | 'warn' | 'info' | 'api-request' | 'api-response', args: any[]) => {
  const content = processArgs(args);
  const logItem: LogItem = {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    type,
    content,
    details: args.length > 0 ? args[0] : undefined,
  };

  // 添加到全局日志
  addToGlobalLogs(logItem);

  return logItem;
};

// 初始化日志拦截器
export const initializeLogger = () => {
  if (isInitialized) return;

  // 保存原始控制台方法
  originalConsoleLog = console.log;
  originalConsoleError = console.error;
  originalConsoleWarn = console.warn;
  originalConsoleInfo = console.info;

  // 替换控制台方法
  console.log = (...args) => {
    originalConsoleLog(...args);
    createLogItem('log', args);
  };

  console.error = (...args) => {
    originalConsoleError(...args);
    createLogItem('error', args);
  };

  console.warn = (...args) => {
    originalConsoleWarn(...args);
    createLogItem('warn', args);
  };

  console.info = (...args) => {
    originalConsoleInfo(...args);
    createLogItem('info', args);
  };

  isInitialized = true;

  // 记录初始化日志
  console.info('[LoggerService] 日志拦截器已初始化');
};

// 恢复原始控制台方法
export const restoreConsole = () => {
  if (!isInitialized) return;

  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.info = originalConsoleInfo;

  isInitialized = false;
};

// 记录API请求
export const logApiRequest = (url: string, method: string, data?: any) => {
  createLogItem('api-request', [
    `[API请求] ${method} ${url}`,
    data || {}
  ]);
};

// 记录API响应
export const logApiResponse = (url: string, status: number, data?: any) => {
  createLogItem('api-response', [
    `[API响应] ${status} ${url}`,
    data || {}
  ]);
};

// 清空所有日志
export const clearAllLogs = () => {
  // 清空全局日志数组
  globalLogs.length = 0;

  // 添加一条清空日志的记录
  createLogItem('info', ['[LoggerService] 所有日志已清空']);

  return true;
};

// 默认导出
export default {
  initializeLogger,
  restoreConsole,
  logApiRequest,
  logApiResponse,
  clearAllLogs,
  globalLogs
};
