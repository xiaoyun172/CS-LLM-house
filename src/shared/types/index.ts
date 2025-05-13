// 定义应用中使用的类型

// 消息类型
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: string;
  status?: 'pending' | 'complete' | 'error';
  modelId?: string; // 使用的模型ID
  reasoning?: string; // 存储模型的思考过程
  reasoningTime?: number; // 思考过程耗时（单位：毫秒）
  version?: number; // 消息版本号，用于标识重新生成的回复
  parentMessageId?: string; // 关联的用户消息ID
  alternateVersions?: string[]; // 存储同一回复的其他版本ID数组
  isCurrentVersion?: boolean; // 是否是当前显示的版本
}

// 聊天主题类型
export interface ChatTopic {
  id: string;
  title: string;
  lastMessageTime: string;
  messages: Message[];
  modelId?: string; // 默认使用的模型ID
  prompt?: string; // 话题特定提示词，会覆盖助手的系统提示词
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
}

// 预设模型提供商
export type ModelProvider = 'openai' | 'anthropic' | 'google' | 'grok' | 'siliconflow' | 'volcengine' | 'custom';

// 预设模型信息
export interface PresetModel {
  id: string;
  name: string;
  provider: ModelProvider;
  description: string;
  capabilities: string[];
  requiresApiKey: boolean;
  defaultBaseUrl?: string;
}
