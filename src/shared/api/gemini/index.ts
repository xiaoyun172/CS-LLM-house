/**
 * Gemini API模块
 * 导出统一的API接口
 */

// 导入必要的类型
import type { Model, Message } from '../../types';
import { createProvider } from './provider.ts';

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
      }
    ) => {
      console.log(`[gemini/index.ts] 通过API适配器发送消息 - 模型ID: ${model.id}, 消息数量: ${messages.length}`);
      return provider.sendChatMessage(messages, options);
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
  return provider.sendChatMessage(messages, { onUpdate });
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