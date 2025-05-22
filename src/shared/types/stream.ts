/**
 * 流式响应类型定义
 * 包含流式响应相关的类型定义
 */

/**
 * 流式响应块类型
 */
export const ChunkType = {
  // 基本类型
  TEXT_DELTA: 'text-delta',
  TEXT_COMPLETE: 'text-complete',
  THINKING_DELTA: 'thinking-delta',
  THINKING_COMPLETE: 'thinking-complete',

  // 工具调用类型
  TOOL_CALL: 'tool-call',
  TOOL_CALL_COMPLETE: 'tool-call-complete',

  // 状态类型
  LLM_RESPONSE_CREATED: 'llm-response-created',
  LLM_RESPONSE_COMPLETE: 'llm-response-complete',
  LLM_RESPONSE_ERROR: 'llm-response-error',

  // 网页搜索类型
  LLM_WEB_SEARCH_COMPLETE: 'llm-web-search-complete',

  // 自定义类型
  CUSTOM: 'custom'
} as const;

export type ChunkTypeValue = typeof ChunkType[keyof typeof ChunkType];

// 注意：OpenAIStreamChunkType和OpenAIStreamChunk已移至 '../api/openai/streamProcessor'

/**
 * 流式响应块
 */
export interface StreamChunk {
  type: ChunkTypeValue;
  text?: string;
  thinking_millsec?: number;
  llm_web_search?: {
    source: string;
    results: any[];
  };
  error?: Error;
  response?: any;
}

// 注意：ReasoningTag接口、getAppropriateTag函数和流处理函数已移至专门的文件
// 请使用以下导入：
// - ReasoningTag和getAppropriateTag: 从 '../config/reasoningTags' 导入
// - 流处理函数: 从 '../utils/streamUtils' 导入
