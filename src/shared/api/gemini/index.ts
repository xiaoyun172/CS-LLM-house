/**
 * Gemini API模块
 * 导出统一的API接口
 */

// 导入必要的类型
import type { Model, Message, ImageGenerationParams } from '../../types';
import { createProvider, GeminiProvider } from './provider.ts';
import { generateImage, generateImageByChat } from './image.ts';

// 导出客户端模块
export {
  createClient,
  testConnection
} from './client.ts';

// 导出提供商模块
export {
  BaseProvider,
  GeminiProvider,
  createProvider
} from './provider.ts';

// 导出图像生成模块
export {
  generateImage,
  generateImageByChat
} from './image.ts';

// 导出文件服务模块
export {
  GeminiFileService,
  createGeminiFileService
} from './fileService.ts';

/**
 * 创建Gemini API适配器
 * @param model 模型配置
 * @returns Gemini API适配器对象
 *
 * 使用方法:
 * ```
 * const api = createGeminiAPI(model);
 * const response = await api.sendMessage(messages, {
 *   onUpdate: (content) => console.log(content)
 * });
 * ```
 */
export function createGeminiAPI(model: Model) {
  console.log(`[gemini/index.ts] 创建Gemini API适配器 - 模型ID: ${model.id}`);
  const provider = createProvider(model);

  return {
    /**
     * 发送消息并获取响应
     */
    sendMessage: (
      messages: Message[],
      options?: {
        onUpdate?: (content: string) => void;
        enableWebSearch?: boolean;
        enableThinking?: boolean;
        enableTools?: boolean;
        mcpTools?: import('../../types').MCPTool[];
        mcpMode?: 'prompt' | 'function';
        systemPrompt?: string;
        abortSignal?: AbortSignal;
        assistant?: any;
      }
    ) => {
      console.log(`[gemini/index.ts] 通过API适配器发送消息 - 模型ID: ${model.id}, 消息数量: ${messages.length}`);
      return provider.sendChatMessage(messages, options);
    },

    /**
     * 生成图像
     */
    generateImage: (
      params: ImageGenerationParams
    ) => {
      console.log(`[gemini/index.ts] 通过API适配器生成图像 - 模型ID: ${model.id}`);
      return generateImage(model, params);
    },

    /**
     * 在聊天中生成图像
     */
    generateImageByChat: (
      messages: Message[],
      options?: {
        onUpdate?: (content: string) => void;
        assistant?: any;
      }
    ) => {
      console.log(`[gemini/index.ts] 通过API适配器在聊天中生成图像 - 模型ID: ${model.id}`);
      // 使用导入的函数而不是 provider 方法
      return generateImageByChat(model, messages, options?.onUpdate);
    },

    /**
     * 上传文件到 Gemini
     */
    uploadFile: (file: import('../../types').FileType) => {
      console.log(`[gemini/index.ts] 通过API适配器上传文件 - 模型ID: ${model.id}, 文件: ${file.origin_name}`);
      return (provider as GeminiProvider).uploadFile(file);
    },

    /**
     * 获取文件的 base64 编码
     */
    getBase64File: (file: import('../../types').FileType) => {
      console.log(`[gemini/index.ts] 通过API适配器获取文件 base64 - 模型ID: ${model.id}, 文件: ${file.origin_name}`);
      return (provider as GeminiProvider).getBase64File(file);
    },

    /**
     * 列出已上传的文件
     */
    listFiles: () => {
      console.log(`[gemini/index.ts] 通过API适配器获取文件列表 - 模型ID: ${model.id}`);
      return (provider as GeminiProvider).listFiles();
    },

    /**
     * 删除已上传的文件
     */
    deleteFile: (fileId: string) => {
      console.log(`[gemini/index.ts] 通过API适配器删除文件 - 模型ID: ${model.id}, 文件ID: ${fileId}`);
      return (provider as GeminiProvider).deleteFile(fileId);
    },

    /**
     * 测试API连接
     */
    testConnection: () => provider.testConnection()
  };
}

/**
 * 发送聊天请求
 * 兼容旧版API
 */
export const sendChatRequest = async (
  messages: Message[],
  model: Model,
  onUpdate?: (content: string) => void
): Promise<string> => {
  console.log(`[gemini/index.ts] 发送聊天请求 - 模型ID: ${model.id}, 消息数量: ${messages.length}`);
  const provider = createProvider(model);
  const result = await provider.sendChatMessage(messages, { onUpdate });
  return typeof result === 'string' ? result : result.content;
};

/**
 * 获取模型列表
 */
export const fetchModels = async (provider: any): Promise<any[]> => {
  console.log(`[gemini/index.ts] 获取Gemini模型列表`);
  const geminiProvider = createProvider({
    id: provider.id,
    name: provider.name || 'Gemini',
    apiKey: provider.apiKey,
    baseUrl: provider.baseUrl || 'https://generativelanguage.googleapis.com',
    provider: 'gemini'
  });

  return geminiProvider.getModels();
};