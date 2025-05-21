/**
 * OpenAI工具调用模块
 * 负责处理函数调用和工具使用
 */
import type OpenAI from 'openai';

/**
 * 工具类型定义
 */
export const ToolType = {
  THINKING: 'thinking',
  WEB_SEARCH: 'web_search',
  CODE: 'code',
  IMAGE_ANALYSIS: 'image_analysis',
  CALCULATOR: 'calculator'
} as const;

export type ToolType = typeof ToolType[keyof typeof ToolType];

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
 * 网页搜索工具定义
 */
export const WEB_SEARCH_TOOL = {
  type: "function",
  function: {
    name: "web_search",
    description: "Search the web for current information",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query"
        }
      },
      required: ["query"]
    }
  }
};

/**
 * 代码工具定义
 */
export const CODE_TOOL = {
  type: "function",
  function: {
    name: "write_code",
    description: "Write code in a specified programming language",
    parameters: {
      type: "object",
      properties: {
        language: {
          type: "string",
          description: "Programming language (e.g. python, javascript, java)"
        },
        code: {
          type: "string",
          description: "The code implementation"
        },
        explanation: {
          type: "string",
          description: "Brief explanation of how the code works"
        }
      },
      required: ["language", "code"]
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
      tools: [THINKING_TOOL],
      tool_choice: "auto"
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

/**
 * 解析通用工具调用
 * @param toolCall 工具调用对象
 * @returns 解析结果 {toolName, args}
 */
export function parseToolCall(toolCall: any): { toolName: string; args: any } | null {
  if (!toolCall || !toolCall.function || !toolCall.function.name) {
    return null;
  }
  
  try {
    const toolName = toolCall.function.name;
    let args = {};
    
    if (toolCall.function?.arguments) {
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error(`解析工具参数失败: ${toolName}`, e);
        args = { raw: toolCall.function.arguments };
      }
    }
    
    return { toolName, args };
  } catch (e) {
    console.error('解析工具调用失败', e);
    return null;
  }
}

/**
 * 创建工具参数
 * @param toolTypes 工具类型列表
 * @returns 包含工具的参数对象
 */
export function createToolsParams(toolTypes: ToolType[]): any {
  const tools = [];
  
  if (toolTypes.includes(ToolType.THINKING)) {
    tools.push(THINKING_TOOL);
  }
  
  if (toolTypes.includes(ToolType.WEB_SEARCH)) {
    tools.push(WEB_SEARCH_TOOL);
  }
  
  if (toolTypes.includes(ToolType.CODE)) {
    tools.push(CODE_TOOL);
  }
  
  if (tools.length === 0) {
    return {};
  }
  
  return {
    tools,
    tool_choice: "auto"
  };
}
