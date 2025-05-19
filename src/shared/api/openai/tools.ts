/**
 * OpenAI工具调用模块
 * 负责处理函数调用和工具使用
 */
import type OpenAI from 'openai';

/**
 * 思考工具定义
 */
export const THINKING_TOOL = {
  type: "function",
  function: {
    name: "thinking",
    description: "Display the step-by-step thinking process before answering a question",
    parameters: {
      type: "object",
      properties: {
        thinking: {
          type: "string",
          description: "The step-by-step reasoning process"
        }
      },
      required: ["thinking"]
    }
  }
};

/**
 * 创建思考工具参数
 * @param modelId 模型ID
 * @returns 包含思考工具的参数对象
 */
export function createThinkingToolParams(modelId: string): any {
  // 只有特定模型支持思考工具
  if (modelId.includes('gpt-4') || modelId.includes('gpt-4o')) {
    return {
      tools: [THINKING_TOOL]
    };
  }
  
  return {};
}

/**
 * 解析思考工具调用
 * @param toolCall 工具调用对象
 * @returns 思考内容
 */
export function parseThinkingToolCall(toolCall: any): string | null {
  if (!toolCall || !toolCall.function || toolCall.function.name !== 'thinking') {
    return null;
  }
  
  try {
    if (toolCall.function?.arguments) {
      const argumentsPart = toolCall.function.arguments;
      try {
        const parsedArgs = JSON.parse(argumentsPart);
        if (parsedArgs.thinking) {
          return parsedArgs.thinking;
        }
      } catch (e) {
        // 如果JSON解析失败，直接返回参数
        return argumentsPart;
      }
    }
  } catch (e) {
    console.error('解析思考工具调用失败', e);
  }
  
  return null;
}

/**
 * 检查消息中是否包含思考提示
 * @param messages 消息数组
 * @returns 是否包含思考提示
 */
export function hasThinkingPrompt(messages: OpenAI.Chat.ChatCompletionMessageParam[]): boolean {
  return messages.some(msg => 
    msg.role === 'system' && 
    typeof msg.content === 'string' && 
    (msg.content.includes('thinking') || 
     msg.content.includes('reasoning') ||
     msg.content.includes('思考过程'))
  );
}
