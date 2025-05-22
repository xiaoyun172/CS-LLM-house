/**
 * OpenAI工具调用模块
 * 负责处理函数调用和工具使用
 */
import type OpenAI from 'openai';
import {
  ToolType as ToolTypeEnum,
  type ToolTypeValue,
  THINKING_TOOL,
  WEB_SEARCH_TOOL,
  CODE_TOOL
} from '../../types/tools';
import { isReasoningModel } from '../../config/models';

// 重新导出工具类型和工具定义，保持向后兼容
export const ToolType = ToolTypeEnum;
export type ToolType = ToolTypeValue;
export { THINKING_TOOL, WEB_SEARCH_TOOL, CODE_TOOL };

/**
 * 创建思考工具参数
 * @param modelId 模型ID
 * @returns 包含思考工具的参数对象
 */
export function createThinkingToolParams(modelId: string): any {
  // 使用导入的模型检测函数判断是否支持推理
  if (isReasoningModel({ id: modelId, name: modelId, provider: 'openai' } as any)) {
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

/**
 * 将OpenAI工具转换为通用工具
 * @param tools 工具列表
 * @param toolCall 工具调用
 * @returns 通用工具
 */
export function openAIToolToTool(tools: any[], toolCall: any): any {
  // 如果没有工具或工具调用，返回undefined
  if (!tools || !toolCall) {
    return undefined;
  }

  // 查找匹配的工具
  const tool = tools.find((t) => {
    if ('name' in toolCall) {
      return t.function?.name === toolCall.name;
    } else if (toolCall.function) {
      return t.function?.name === toolCall.function.name;
    }
    return false;
  });

  // 如果找不到工具，返回undefined
  if (!tool) {
    console.warn('未找到匹配的工具:', toolCall);
    return undefined;
  }

  // 转换为通用工具
  return {
    id: tool.function.name,
    name: tool.function.name,
    description: tool.function.description,
    inputSchema: tool.function.parameters
  };
}
