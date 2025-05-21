// 定义新的消息块系统类型

import type { Model } from './index';

// 消息块类型枚举
export const MessageBlockType = {
  UNKNOWN: 'unknown',
  MAIN_TEXT: 'main_text',
  THINKING: 'thinking',
  IMAGE: 'image',
  CODE: 'code',
  TOOL: 'tool',
  FILE: 'file',
  ERROR: 'error',
  CITATION: 'citation',
  TRANSLATION: 'translation',
  TABLE: 'table',
  MULTI_MODEL: 'multi_model',
  CHART: 'chart',
  MATH: 'math'
} as const;

export type MessageBlockType = typeof MessageBlockType[keyof typeof MessageBlockType];

// 消息块状态枚举
export const MessageBlockStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  STREAMING: 'streaming',
  SUCCESS: 'success',
  ERROR: 'error',
  PAUSED: 'paused'
} as const;

export type MessageBlockStatus = typeof MessageBlockStatus[keyof typeof MessageBlockStatus];

// 基础消息块接口
export interface BaseMessageBlock {
  id: string
  messageId: string
  type: MessageBlockType
  createdAt: string
  updatedAt?: string
  status: MessageBlockStatus
  model?: Model
  metadata?: Record<string, any>
  error?: Record<string, any>
}

// 主文本消息块
export interface MainTextMessageBlock extends BaseMessageBlock {
  type: typeof MessageBlockType.MAIN_TEXT
  content: string
}

// 思考过程消息块
export interface ThinkingMessageBlock extends BaseMessageBlock {
  type: typeof MessageBlockType.THINKING
  content: string
  thinking_millsec?: number
}

// 图片消息块
export interface ImageMessageBlock extends BaseMessageBlock {
  type: typeof MessageBlockType.IMAGE
  url: string
  base64Data?: string
  mimeType: string
  width?: number
  height?: number
  size?: number
}

// 代码消息块
export interface CodeMessageBlock extends BaseMessageBlock {
  type: typeof MessageBlockType.CODE
  content: string
  language?: string
}

// 工具消息块
export interface ToolMessageBlock extends BaseMessageBlock {
  type: typeof MessageBlockType.TOOL
  name: string
  input: Record<string, any>
  output?: Record<string, any>
}

// 文件消息块
export interface FileMessageBlock extends BaseMessageBlock {
  type: typeof MessageBlockType.FILE
  name: string
  url: string
  mimeType: string
  size?: number
}

// 错误消息块
export interface ErrorMessageBlock extends BaseMessageBlock {
  type: typeof MessageBlockType.ERROR
  content: string
  message?: string
  details?: string
  code?: string
}

// 引用消息块
export interface CitationMessageBlock extends BaseMessageBlock {
  type: typeof MessageBlockType.CITATION
  content: string
  source?: string
  url?: string
  sources?: Array<{
    title?: string
    url?: string
    content?: string
  }>
  response?: any
  knowledge?: any[]
}

// 翻译块
export interface TranslationMessageBlock extends BaseMessageBlock {
  type: typeof MessageBlockType.TRANSLATION;
  content: string;
  sourceContent: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceBlockId?: string;
}

// 表格块
export interface TableMessageBlock extends BaseMessageBlock {
  type: typeof MessageBlockType.TABLE;
  headers: string[];
  rows: string[][];
  caption?: string;
}

// 多模型响应块
export interface MultiModelMessageBlock extends BaseMessageBlock {
  type: typeof MessageBlockType.MULTI_MODEL;
  responses: {
    modelId: string;
    modelName: string;
    content: string;
    status: MessageBlockStatus;
  }[];
  displayStyle?: 'horizontal' | 'vertical' | 'fold' | 'grid';
}

// 图表块
export interface ChartMessageBlock extends BaseMessageBlock {
  type: typeof MessageBlockType.CHART;
  chartType: 'bar' | 'line' | 'pie' | 'scatter';
  data: any;
  options?: any;
}

// 数学公式块
export interface MathMessageBlock extends BaseMessageBlock {
  type: typeof MessageBlockType.MATH;
  content: string;
  displayMode: boolean;
}

// 消息块联合类型
export type MessageBlock =
  | MainTextMessageBlock
  | ThinkingMessageBlock
  | ImageMessageBlock
  | CodeMessageBlock
  | ToolMessageBlock
  | FileMessageBlock
  | ErrorMessageBlock
  | CitationMessageBlock
  | TranslationMessageBlock
  | TableMessageBlock
  | MultiModelMessageBlock
  | ChartMessageBlock
  | MathMessageBlock;

// 助手消息状态枚举
export const AssistantMessageStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing', // 添加处理中状态
  SEARCHING: 'searching',   // 添加搜索中状态
  STREAMING: 'streaming',
  SUCCESS: 'success',
  ERROR: 'error',
  PAUSED: 'paused'
} as const;

export type AssistantMessageStatus = typeof AssistantMessageStatus[keyof typeof AssistantMessageStatus];

// 用户消息状态枚举
export const UserMessageStatus = {
  SENDING: 'sending',
  SUCCESS: 'success',
  ERROR: 'error'
} as const;

export type UserMessageStatus = typeof UserMessageStatus[keyof typeof UserMessageStatus];

// 使用量
export interface Usage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// 指标
export interface Metrics {
  latency: number;
  firstTokenLatency?: number;
}

// 消息版本类型
export interface MessageVersion {
  id: string;
  messageId: string;
  blocks: MessageBlock['id'][];
  createdAt: string;
  modelId?: string;
  model?: Model;
  isActive?: boolean;
}

// 新消息类型
export type Message = {
  id: string
  role: 'user' | 'assistant' | 'system'
  assistantId: string
  topicId: string
  createdAt: string
  updatedAt?: string
  status: UserMessageStatus | AssistantMessageStatus
  modelId?: string
  model?: Model
  type?: 'clear'
  isPreset?: boolean
  useful?: boolean
  askId?: string
  mentions?: Model[]
  usage?: Usage
  metrics?: Metrics
  blocks: MessageBlock['id'][]
  versions?: MessageVersion[]
}