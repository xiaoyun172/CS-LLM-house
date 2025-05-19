// 定义应用中使用的类型

// 模型类型常量
export const ModelType = {
  Chat: 'chat',            // 聊天对话模型
  Vision: 'vision',        // 视觉模型
  Audio: 'audio',          // 音频模型
  Embedding: 'embedding',  // 嵌入模型
  Tool: 'tool',            // 工具使用模型
  Reasoning: 'reasoning',  // 推理模型
  ImageGen: 'image_gen'    // 图像生成模型
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
}

// 硅基流动API的图片格式
export interface SiliconFlowImageFormat {
  type: 'image_url';
  image_url: {
    url: string;
  };
}

// 图像生成参数
export interface ImageGenerationParams {
  prompt: string;
  negativePrompt?: string;
  imageSize?: string;
  batchSize?: number;
  seed?: number;
  steps?: number;
  guidanceScale?: number;
  referenceImage?: string;
}

// 生成的图像结果
export interface GeneratedImage {
  url: string;
  prompt: string;
  timestamp: string;
  modelId: string;
}

// 网络搜索提供商类型
export type WebSearchProvider = 'firecrawl' | 'tavily' | 'serpapi' | 'custom';

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
  }; // 模型能力
  multimodal?: boolean; // 直接的多模态支持标志，用于兼容预设模型配置
  imageGeneration?: boolean; // 直接的图像生成支持标志
  modelTypes?: ModelType[]; // 模型类型
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
export type ModelProvider = 'openai' | 'anthropic' | 'google' | 'grok' | 'deepseek' | 'siliconflow' | 'volcengine' | 'custom';

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
