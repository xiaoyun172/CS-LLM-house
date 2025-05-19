/**
 * 思考过程处理服务
 * 集中处理不同AI模型的思考过程数据
 */

import type { Message } from '../types';

// 思考过程源类型 - 使用常量对象而不是enum（解决编译错误）
export const ThinkingSourceType = {
  GROK: 'grok',           // Grok模型的思考过程
  CLAUDE: 'claude',       // Claude的思考过程
  OPENAI: 'openai',       // OpenAI的思考过程
  DEEPSEEK: 'deepseek',   // DeepSeek模型的思考过程
  CUSTOM: 'custom'        // 自定义思考过程
} as const;

export type ThinkingSourceTypeValue = typeof ThinkingSourceType[keyof typeof ThinkingSourceType];

// 思考过程配置接口
export interface ThinkingConfig {
  enabled: boolean;        // 是否启用思考过程
  effort?: 'low' | 'medium' | 'high';  // 思考过程的深度
  format?: 'plain' | 'markdown' | 'json'; // 思考过程的格式
}

// 思考过程结果接口
export interface ThinkingResult {
  content: string;         // 思考过程内容
  sourceType: ThinkingSourceTypeValue; // 思考过程来源
  timeMs?: number;         // 思考过程耗时（毫秒）
  tokens?: number;         // 思考过程消耗的token数量
}

// Grok思考过程配置
export function getGrokThinkingConfig(effort: 'low' | 'high' = 'high'): any {
  return {
    reasoning_effort: effort
  };
}

// 从API响应中提取思考过程
export function extractThinkingFromResponse(
  response: any,
  sourceType: ThinkingSourceTypeValue
): ThinkingResult | null {
  if (!response) return null;

  switch (sourceType) {
    case ThinkingSourceType.GROK:
      // 从Grok API响应中提取思考过程
      if (response.reasoning) {
        return {
          content: response.reasoning,
          sourceType: ThinkingSourceType.GROK,
          timeMs: response.reasoningTime
        };
      } else if (response.choices?.[0]?.message?.reasoning_content) {
        // 备选字段名
        return {
          content: response.choices[0].message.reasoning_content,
          sourceType: ThinkingSourceType.GROK,
          timeMs: response.reasoningTime || 0
        };
      }
      break;

    case ThinkingSourceType.DEEPSEEK:
      // DeepSeek Reasoner模型的思考过程提取
      if (response.choices?.[0]?.message?.reasoning_content) {
        return {
          content: response.choices[0].message.reasoning_content,
          sourceType: ThinkingSourceType.DEEPSEEK,
          timeMs: response.reasoningTime || 0
        };
      } else if (response.usage?.completion_tokens_details?.reasoning_tokens) {
        // 如果有reasoning_tokens但没有直接的reasoning_content，尝试从其他字段提取
        const reasoningContent = response.reasoning || '';
        return {
          content: reasoningContent,
          sourceType: ThinkingSourceType.DEEPSEEK,
          timeMs: response.reasoningTime || 0,
          tokens: response.usage.completion_tokens_details.reasoning_tokens
        };
      }
      break;

    case ThinkingSourceType.CLAUDE:
      // Claude思考过程提取逻辑
      if (response.thinking) {
        return {
          content: response.thinking,
          sourceType: ThinkingSourceType.CLAUDE,
          timeMs: response.thinkingTime
        };
      }
      break;

    case ThinkingSourceType.OPENAI:
      // OpenAI思考过程提取逻辑 (当他们实现此功能时)
      if (response.thinking || response.tool_calls?.find((tool: any) => tool.name === 'thinking')) {
        const thinking = response.thinking ||
          response.tool_calls?.find((tool: any) => tool.name === 'thinking')?.arguments;

        return {
          content: typeof thinking === 'string' ? thinking : JSON.stringify(thinking),
          sourceType: ThinkingSourceType.OPENAI,
          timeMs: response.thinking_time
        };
      }
      break;

    case ThinkingSourceType.CUSTOM:
      // 处理自定义格式
      if (response.thinking || response.reasoning) {
        return {
          content: response.thinking || response.reasoning,
          sourceType: ThinkingSourceType.CUSTOM,
          timeMs: response.thinkingTime || response.reasoningTime
        };
      }
      break;
  }

  return null;
}

// 从模型提供商类型获取思考源类型
export function getThinkingSourceTypeFromProvider(provider: string): ThinkingSourceTypeValue {
  const providerLower = provider.toLowerCase();

  if (providerLower.includes('grok') || providerLower.includes('xai')) {
    return ThinkingSourceType.GROK;
  } else if (providerLower.includes('claude') || providerLower.includes('anthropic')) {
    return ThinkingSourceType.CLAUDE;
  } else if (providerLower.includes('openai') || providerLower.includes('gpt')) {
    return ThinkingSourceType.OPENAI;
  } else if (providerLower.includes('deepseek') || providerLower.includes('deepseek-reasoner')) {
    return ThinkingSourceType.DEEPSEEK;
  }

  return ThinkingSourceType.CUSTOM;
}

// 为指定模型和提供商获取适当的思考过程配置
export function getThinkingConfig(provider: string, effort: 'low' | 'medium' | 'high' = 'high'): any {
  const sourceType = getThinkingSourceTypeFromProvider(provider);

  switch (sourceType) {
    case ThinkingSourceType.GROK:
      // Grok只支持"low"和"high"
      const grokEffort = effort === 'medium' ? 'high' : effort;
      return getGrokThinkingConfig(grokEffort as 'low' | 'high');

    case ThinkingSourceType.CLAUDE:
      // Claude的思考过程配置 (当支持时)
      return { thinking: true, thinking_depth: effort };

    case ThinkingSourceType.OPENAI:
      // OpenAI的思考过程配置 (当支持时)
      return { thinking: true, thinking_depth: effort };

    case ThinkingSourceType.DEEPSEEK:
      // DeepSeek Reasoner模型的思考过程配置
      return {}; // DeepSeek Reasoner模型默认启用思考过程，不需要额外配置

    default:
      // 默认配置
      return { thinking: true };
  }
}

// 获取指定模型是否支持思考过程
export function isThinkingSupported(model: string): boolean {
  // 目前支持思考过程的模型
  const supportedModels = [
    'grok-3-mini-beta',
    'grok-3-mini-fast-beta',
    'deepseek-reasoner'  // 添加DeepSeek Reasoner模型
  ];

  return supportedModels.some(supported =>
    model.toLowerCase().includes(supported.toLowerCase())
  );
}

// 将思考过程添加到消息中
export function addThinkingToMessage(message: Message, thinking: ThinkingResult): Message {
  // 创建新对象并使用类型断言
  const result = { ...message } as any;

  // 添加思考过程属性
  if (thinking.content) {
    result.reasoning = thinking.content;
  }

  if (thinking.timeMs) {
    result.reasoningTime = thinking.timeMs;
  }

  // 返回类型转换后的消息
  return result as Message;
}

// 格式化思考时间为易读格式
export function formatThinkingTime(timeMs?: number): string {
  if (!timeMs) return '未知时间';

  if (timeMs < 1000) {
    return `${timeMs}毫秒`;
  }

  const seconds = Math.round(timeMs / 100) / 10;
  return `${seconds}秒`;
}

export default {
  ThinkingSourceType,
  getGrokThinkingConfig,
  extractThinkingFromResponse,
  getThinkingSourceTypeFromProvider,
  getThinkingConfig,
  isThinkingSupported,
  addThinkingToMessage,
  formatThinkingTime
};