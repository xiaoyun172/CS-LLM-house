// 定义应用中使用的类型

// 模型类型常量
export const ModelType = {
  Chat: 'chat',                  // 聊天对话模型
  Vision: 'vision',              // 视觉模型
  Audio: 'audio',                // 音频模型
  Embedding: 'embedding',        // 嵌入模型
  Tool: 'tool',                  // 工具使用模型
  Reasoning: 'reasoning',        // 推理模型
  ImageGen: 'image_gen',         // 图像生成模型
  FunctionCalling: 'function_calling', // 函数调用模型
  WebSearch: 'web_search',       // 网络搜索模型
  Rerank: 'rerank',              // 重排序模型
  CodeGen: 'code_gen',           // 代码生成模型
  Translation: 'translation',    // 翻译模型
  Transcription: 'transcription' // 转录模型
} as const;

export type ModelType = typeof ModelType[keyof typeof ModelType];

// 数学公式渲染器类型
export type MathRendererType = 'KaTeX' | 'MathJax' | 'none';

// 分组类型
export interface Group {
  id: string;
  name: string;
  type: 'assistant' | 'topic';
  items: string[]; // 存储item IDs
  order: number;   // 显示顺序
  expanded: boolean; // 是否展开
}

// 模型类型匹配规则
export interface ModelTypeRule {
  pattern: string;          // 匹配模式（支持正则表达式或简单字符串）
  types: ModelType[];       // 适用的模型类型
  provider?: string;        // 可选的提供商限制
}

// 图片内容类型
export interface ImageContent {
  url: string;
  base64Data?: string; // 可选的base64数据，用于本地预览
  mimeType: string;
  width?: number;
  height?: number;
  size?: number; // 文件大小（字节）
}

// 文件内容类型
export interface FileContent {
  name: string; // 文件名
  mimeType: string; // MIME类型
  extension: string; // 文件扩展名
  size: number; // 文件大小（字节）
  base64Data?: string; // 可选的base64数据
  url: string; // 文件URL，用于本地或远程访问
  width?: number; // 可选，图片宽度
  height?: number; // 可选，图片高度
  fileId?: string; // 文件ID，用于引用存储的文件
  fileRecord?: FileType; // 文件记录，包含完整的文件信息
}

// 文件类型定义（兼容电脑版）
export interface FileType {
  id: string; // 文件唯一标识
  name: string; // 存储的文件名（通常是UUID + 扩展名）
  origin_name: string; // 原始文件名
  path: string; // 文件路径（移动端可能为空）
  size: number; // 文件大小（字节）
  ext: string; // 文件扩展名
  type: string; // 文件类型（image、text、document等）
  created_at: string; // 创建时间
  count: number; // 引用计数
  hash?: string; // 文件哈希值，用于重复检测
  // 移动端特有字段
  base64Data?: string; // base64编码的文件内容
  mimeType?: string; // MIME类型
}

// 硅基流动API的图片格式
export interface SiliconFlowImageFormat {
  type: 'image_url';
  image_url: {
    url: string;
  };
}

// 图像生成参数 - 完整支持版本
export interface ImageGenerationParams {
  prompt: string;
  negativePrompt?: string;
  imageSize?: string;
  batchSize?: number;
  seed?: number;
  steps?: number;
  guidanceScale?: number;
  referenceImage?: string;
  quality?: 'standard' | 'hd';
  style?: 'natural' | 'vivid';
  promptEnhancement?: boolean;
}

// 生成的图像结果
export interface GeneratedImage {
  url: string;
  prompt: string;
  timestamp: string;
  modelId: string;
}

// 网络搜索提供商类型 - 包含付费API服务和本地搜索引擎
export type WebSearchProvider = 'tavily' | 'searxng' | 'exa' | 'bocha' | 'firecrawl' | 'serpapi' | 'local-google' | 'local-bing' | 'custom';

// 网络搜索提供商配置
export interface WebSearchProviderConfig {
  id: string;
  name: string;
  apiKey?: string;
  apiHost?: string;
  engines?: string[];
  url?: string;
  basicAuthUsername?: string;
  basicAuthPassword?: string;
  contentLimit?: number;
  usingBrowser?: boolean;
}

// 网络搜索设置
export interface WebSearchSettings {
  enabled: boolean;
  provider: WebSearchProvider;
  apiKey: string;
  baseUrl?: string;
  includeInContext: boolean;  // 是否将搜索结果包含在上下文中
  maxResults: number;         // 最大结果数量
  showTimestamp: boolean;     // 是否显示结果时间戳
  filterSafeSearch: boolean;  // 是否过滤不安全内容
  searchMode: 'auto' | 'manual'; // 自动或手动搜索
  searchWithTime: boolean;    // 是否在搜索查询中添加当前日期
  excludeDomains: string[];   // 要排除的域名列表
  contentLimit?: number;      // 内容限制
  providers: WebSearchProviderConfig[]; // 所有可用的搜索提供商列表
  customProviders?: WebSearchCustomProvider[]; // 自定义搜索提供商
}

// 自定义搜索提供商
export interface WebSearchCustomProvider {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  enabled: boolean;
}

// 网络搜索结果
export interface WebSearchResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
  timestamp: string;
  provider: string;
  content?: string;
}

// 网络搜索提供商响应
export interface WebSearchProviderResponse {
  query?: string;
  results: WebSearchResult[];
}

// 引用类型
export interface Citation {
  number: number;
  url: string;
  title?: string;
  hostname?: string;
  content?: string;
  showFavicon?: boolean;
  type?: string;
  metadata?: Record<string, any>;
}

// 导入新的消息类型
import type {
  Message,
  MessageBlock,
  MessageBlockType,
  MessageBlockStatus,
  MainTextMessageBlock,
  ThinkingMessageBlock,
  CodeMessageBlock,
  ImageMessageBlock,
  CitationMessageBlock,
  FileMessageBlock,
  ErrorMessageBlock,
  ToolMessageBlock,
  AssistantMessageStatus,
  UserMessageStatus
} from './newMessage.ts';

// 导出新的消息类型
export type {
  Message,
  MessageBlock,
  MessageBlockType,
  MessageBlockStatus,
  MainTextMessageBlock,
  ThinkingMessageBlock,
  CodeMessageBlock,
  ImageMessageBlock,
  CitationMessageBlock,
  FileMessageBlock,
  ErrorMessageBlock,
  ToolMessageBlock,
  AssistantMessageStatus,
  UserMessageStatus
};

// 聊天主题类型
export interface ChatTopic {
  id: string;
  assistantId: string;     // 关联的助手ID，必需
  name: string;            // 主要字段，与电脑版一致
  createdAt: string;
  updatedAt: string;
  isNameManuallyEdited: boolean;
  messageIds: string[];    // 消息ID数组，存储消息ID引用

  // 可选字段
  lastMessageTime?: string;// 最后消息时间
  inputTemplate?: string;  // 输入模板
  messageCount?: number;   // 消息计数
  tokenCount?: number;     // token计数
  isDefault?: boolean;     // 是否默认
  pinned?: boolean;        // 是否置顶

  // 旧版字段，标记为已弃用
  /** @deprecated 使用messageIds代替 */
  messages?: Message[];    // 已弃用，保留用于兼容
  /** @deprecated 使用name代替 */
  title?: string;          // 已弃用，保留用于兼容
  /** @deprecated 不再使用 */
  prompt?: string;         // 已弃用，保留用于兼容
}

// 模型类型
export interface Model {
  id: string;
  name: string;
  provider: string;
  description?: string; // 模型描述
  providerType?: string; // 提供商的实际类型（如openai、anthropic等），与provider字段可能不同
  apiKey?: string; // API密钥
  baseUrl?: string; // 基础URL
  maxTokens?: number; // 最大token数
  temperature?: number; // 温度参数
  enabled?: boolean; // 是否启用
  isDefault?: boolean; // 是否为默认模型
  iconUrl?: string; // 模型图标URL
  presetModelId?: string; // 预设模型ID（仅用于参考，不用于API调用）
  group?: string; // 模型分组
  capabilities?: {
    multimodal?: boolean; // 是否支持多模态（图像）
    imageGeneration?: boolean; // 是否支持图像生成
    webSearch?: boolean; // 是否支持网页搜索
    reasoning?: boolean; // 是否支持推理优化
    functionCalling?: boolean; // 是否支持函数调用
  }; // 模型能力
  multimodal?: boolean; // 直接的多模态支持标志，用于兼容预设模型配置
  imageGeneration?: boolean; // 直接的图像生成支持标志
  modelTypes?: ModelType[]; // 模型类型
  apiVersion?: string; // API版本，主要用于Azure OpenAI
  extraHeaders?: Record<string, string>; // 额外的请求头
}

// 设置类型
export interface Settings {
  theme: 'light' | 'dark' | 'system'; // 主题设置
  fontSize: number; // 字体大小
  language: string; // 语言设置
  sendWithEnter: boolean; // 是否使用Enter发送消息
  enableNotifications: boolean; // 是否启用通知
  models: Model[]; // 配置的模型列表
  defaultModelId?: string; // 默认模型ID
  modelTypeRules?: ModelTypeRule[]; // 模型类型匹配规则
  generatedImages?: GeneratedImage[]; // 用户生成的图像历史
  contextLength?: number; // 上下文长度控制
  contextCount?: number; // 上下文数量控制
  mathRenderer?: MathRendererType; // 数学公式渲染器
  webSearch?: WebSearchSettings; // 网络搜索设置
}

// 预设模型提供商
export type ModelProvider = 'openai' | 'anthropic' | 'google' | 'grok' | 'deepseek' | 'siliconflow' | 'volcengine' | 'azure-openai' | 'custom';

// 预设模型信息
export interface PresetModel {
  id: string;
  name: string;
  provider: ModelProvider;
  description: string;
  capabilities: string[];
  requiresApiKey: boolean;
  defaultBaseUrl?: string;
  multimodal?: boolean; // 是否支持多模态（图像）
  imageGeneration?: boolean; // 是否支持图像生成
  modelTypes?: ModelType[]; // 预设的模型类型
}

// 确保从newMessage导出所有类型
export * from './newMessage.ts';

// MCP 相关类型定义
export type MCPServerType = 'sse' | 'streamableHttp' | 'inMemory';

export interface MCPServer {
  id: string;
  name: string;
  type: MCPServerType;
  description?: string;
  baseUrl?: string;
  headers?: Record<string, string>;
  env?: Record<string, string>;
  args?: string[];
  isActive: boolean;
  disabledTools?: string[];
  provider?: string;
  providerUrl?: string;
  logoUrl?: string;
  tags?: string[];
  timeout?: number;
}

export interface MCPTool {
  id?: string;
  name: string;
  description?: string;
  inputSchema?: any;
  serverName: string;
  serverId: string;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: any[];
  serverName: string;
  serverId: string;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  serverName: string;
  serverId: string;
}

export interface MCPCallToolResponse {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export interface MCPToolResponse {
  id: string;
  tool: MCPTool;
  arguments: Record<string, unknown>;
  status: 'pending' | 'invoking' | 'done' | 'error';
  response?: MCPCallToolResponse;
  toolCallId?: string; // OpenAI 兼容
  toolUseId?: string;  // Anthropic 兼容
}
