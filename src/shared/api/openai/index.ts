/**
 * OpenAI API模块
 * 导出统一的API接口
 */

// 导入必要的类型
import type { Model, Message } from '../../types';
import { OpenAIProvider } from './provider';

// 导出客户端模块
export {
  createClient,
  supportsMultimodal,
  supportsWebSearch,
  supportsReasoning,
  getWebSearchParams,
  testConnection
} from './client';

// 导入聊天完成函数以便包装和增强
import { sendChatRequest as originalSendChatRequest } from './chat';

// 导出模型管理模块
export {
  fetchModels,
  fetchModelsWithSDK
} from './models';

// 导出多模态处理模块
export {
  convertToOpenAIMessages,
  hasImages,
  hasOpenAIFormatImages,
  type MessageContentItem
} from './multimodal';

// 导出工具调用模块
export {
  WEB_SEARCH_TOOL
} from './tools';

// 导出流式响应模块
export {
  streamCompletion
} from './stream';

// 导出图像生成模块
export {
  generateImage
} from './image';

// 导出Provider类
export {
  BaseOpenAIProvider,
  OpenAIProvider
} from './provider';

// 包装聊天请求函数以添加调试信息
export async function sendChatRequest(
  messages: any[],
  model: Model,
  options?: {
    onUpdate?: (content: string, reasoning?: string) => void;
    systemPrompt?: string;
  }
): Promise<string> {
  const onUpdate = options?.onUpdate;
  const systemPrompt = options?.systemPrompt || '';

  console.log(`[openai/index.ts] 调用sendChatRequest - 模型ID: ${model.id}, 消息数量: ${messages.length}, 系统提示: ${systemPrompt ? '有' : '无'}`);
  try {
    const response = await originalSendChatRequest(messages, model, {
      onUpdate,
      enableWebSearch: model.capabilities?.webSearch,
      systemPrompt
    });
    console.log(`[openai/index.ts] sendChatRequest成功返回`);
    return response;
  } catch (error) {
    console.error(`[openai/index.ts] sendChatRequest执行失败:`, error);
    throw error;
  }
}

/**
 * 创建OpenAI API适配器
 * @param model 模型配置
 * @returns OpenAI API适配器对象
 *
 * 使用方法:
 * ```
 * const api = createOpenAIAPI(model);
 * const response = await api.sendMessage(messages, {
 *   enableWebSearch: true,
 *   systemPrompt: "你是一个有用的助手"
 * });
 * ```
 */
export function createOpenAIAPI(model: Model) {
  console.log(`[openai/index.ts] 创建OpenAI API适配器 - 模型ID: ${model.id}`);
  const provider = new OpenAIProvider(model);

  return {
    /**
     * 发送消息并获取响应
     */
    sendMessage: (
      messages: Message[],
      options?: {
        onUpdate?: (content: string, reasoning?: string) => void;
        enableWebSearch?: boolean;
        systemPrompt?: string;
        enableTools?: boolean;
      }
    ) => {
      const systemPrompt = options?.systemPrompt || '';
      console.log(`[openai/index.ts] 通过API适配器发送消息 - 模型ID: ${model.id}, 消息数量: ${messages.length}, 系统提示: ${systemPrompt ? '有' : '无'}`);
      return provider.sendChatMessage(messages, options);
    },

    /**
     * 测试API连接
     */
    testConnection: () => provider.testConnection()
  };
}
