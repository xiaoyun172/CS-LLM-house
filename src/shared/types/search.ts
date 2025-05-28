/**
 * 搜索结果接口定义
 */

// 单个搜索结果项
export interface SearchResult {
  title: string;      // 搜索结果标题
  body: string;       // 搜索结果内容摘要
  href: string;       // 搜索结果链接
}

// 搜索响应接口
export interface SearchResponse {
  results: SearchResult[];
}

// 搜索请求选项
export interface SearchOptions {
  maxResults?: number;   // 最大结果数量，默认3
  timeout?: number;      // 请求超时时间(ms)，默认5000
}

// 搜索服务配置
export interface SearchServiceConfig {
  endpoint?: string;     // 自定义搜索API端点
  defaultMaxResults: number; // 默认返回结果数
  timeoutMs: number;     // 默认超时时间
} 