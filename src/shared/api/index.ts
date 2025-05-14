import type { Message, Model, MessageContent } from '../types';
import * as openaiApi from './openai';
import * as anthropicApi from './anthropic';
import * as googleApi from './google';
import * as grokApi from './grok';
import * as siliconflowApi from './siliconflow';
import * as volcengineApi from './volcengine';
import * as deepseekApi from './deepseek';
import { logApiRequest, logApiResponse } from '../services/LoggerService';

// 获取实际的提供商类型
function getActualProviderType(model: Model): string {
  // 优先使用providerType字段(如果存在)，否则回退到provider字段
  return (model as any).providerType || model.provider;
}

// 根据提供商选择API
const getApiByProvider = (model: Model) => {
  const providerType = getActualProviderType(model);
  
  switch (providerType) {
    case 'openai':
      return openaiApi;
    case 'anthropic':
      return anthropicApi;
    case 'gemini':
    case 'google':
      return googleApi;
    case 'grok':
      return grokApi;
    case 'siliconflow':
      return siliconflowApi;
    case 'volcengine':
      return volcengineApi;
    case 'deepseek':
      return deepseekApi;
    default:
      throw new Error(`不支持的提供商: ${providerType}`);
  }
};

// 定义请求接口
export interface ChatRequest {
  messages: { role: string; content: MessageContent; images?: any[] }[]; // 更新消息格式支持images字段
  modelId: string;
  systemPrompt?: string;
  onChunk?: (chunk: string) => void;
}

// 发送聊天请求
export const sendChatRequestLegacy = async (
  messages: Message[],
  model: Model,
  onUpdate?: (content: string) => void
): Promise<string> => {
  try {
    // 直接使用模型名称
    const modelName = model.name;
    const providerType = getActualProviderType(model);
    
    // 使用实际的提供商类型，而不是根据ID
    console.log(`使用提供商: ${providerType}，模型名称: ${modelName}，ID: ${model.id}`);

    // 记录API请求信息
    logApiRequest('API选择', 'INFO', {
      provider: providerType, 
      modelId: model.id, // 内部ID记录用于调试
      modelName: modelName, // 实际使用的模型名称
      messagesCount: messages.length
    });

    // 检查提供商是否有效
    if (!providerType) {
      throw new Error('未指定API提供商类型');
    }

    // 获取对应的API实现
    let api;
    try {
      api = getApiByProvider(model);
    } catch (error) {
      console.error(`获取API实现失败: ${error instanceof Error ? error.message : '未知错误'}`);
      logApiResponse('API选择', 500, { 
        error: '不支持的提供商', 
        provider: providerType 
      });
      throw error;
    }

    // 调用API
    const response = await api.sendChatRequest(messages, model, onUpdate);
    // 如果返回值是对象（带有reasoning等属性），只取content字段
    return typeof response === 'string' ? response : response.content;
  } catch (error) {
    console.error('API请求失败:', error);
    logApiResponse('API请求', 500, {
      error: error instanceof Error ? error.message : '未知错误',
      provider: getActualProviderType(model),
      modelId: model.id,
      modelName: model.name // 使用实际的模型名称
    });
    throw error;
  }
};

// 测试API连接
export const testApiConnection = async (model: Model): Promise<boolean> => {
  try {
    const testMessage: Message = {
      id: 'test',
      role: 'user',
      content: '你好，这是一条测试消息。请回复"连接成功"。',
      timestamp: new Date().toISOString(),
    };

    // 使用新接口调用
    const response = await sendChatRequest({
      messages: [{ 
        role: testMessage.role, 
        content: testMessage.content as string // 这里我们知道内容是字符串
      }],
      modelId: model.id
    });
    
    return response.success && (response.content?.includes('连接成功') || (response.content?.length || 0) > 0);
  } catch (error) {
    console.error('API连接测试失败:', error);
    return false;
  }
};

// 发送聊天请求（新版本接口，使用请求对象）
export const sendChatRequest = async (options: ChatRequest): Promise<{ success: boolean; content?: string; reasoning?: string; reasoningTime?: number; error?: string }> => {
  try {
    // 根据modelId查找对应模型
    const model = await findModelById(options.modelId);
    if (!model) {
      throw new Error(`未找到ID为${options.modelId}的模型`);
    }

    console.log(`使用模型ID: ${options.modelId}, 名称: ${model.name}, 提供商: ${model.provider}`);

    // 将简单消息格式转换为完整Message格式以兼容现有API实现
    const messages: Message[] = options.messages.map((msg, index) => ({
      id: `msg-${index}`,
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
      timestamp: new Date().toISOString(),
      images: msg.images // 传递图片数组
    }));

    // 如果提供了系统提示词，添加到消息数组最前面
    if (options.systemPrompt) {
      const systemMessage: Message = {
        id: 'system-0',
        role: 'system',
        content: options.systemPrompt,
        timestamp: new Date().toISOString(),
      };
      
      // 确保系统消息位于消息列表最前面
      messages.unshift(systemMessage);
      
      console.log(`使用自定义系统提示词: ${
        typeof options.systemPrompt === 'string' 
          ? options.systemPrompt.substring(0, 50) + (options.systemPrompt.length > 50 ? '...' : '')
          : '[复杂内容]'
      }`);
    }

    // 获取对应的API实现
    const providerType = getActualProviderType(model);
    console.log(`使用提供商类型: ${providerType}`);

    try {
      const api = getApiByProvider(model);
      
      // 创建一个响应包装器，将旧API的流式回调转换为新格式
      let contentAccumulator = '';
      const onUpdate = options.onChunk 
        ? (content: string) => {
            // 计算新增的部分
            const newContent = content.substring(contentAccumulator.length);
            contentAccumulator = content;
            // 只发送新增部分
            if (newContent) {
              options.onChunk!(newContent);
            }
          }
        : undefined;
      
      // 调用实际的API
      const response = await api.sendChatRequest(messages, model, onUpdate);
      
      // 如果返回值是对象（带有reasoning等属性），正确处理response
      const content = typeof response === 'string' ? response : response.content;
      const reasoning = typeof response === 'string' ? undefined : response.reasoning;
      const reasoningTime = typeof response === 'string' ? undefined : response.reasoningTime;

      return {
        success: true,
        content: content,
        reasoning: reasoning,
        reasoningTime: reasoningTime
      };
    } catch (error) {
      console.error(`API调用失败: ${error instanceof Error ? error.message : '未知错误'}`);
      logApiResponse('API请求', 500, { 
        error: '提供商API调用失败', 
        provider: providerType,
        details: error instanceof Error ? error.message : '未知错误'
      });
      throw error;
    }
  } catch (error) {
    console.error('API请求失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
};

// 根据ID查找模型
async function findModelById(modelId: string): Promise<Model | null> {
  // 从LocalStorage获取设置
  try {
    const settingsJson = localStorage.getItem('settings');
    if (!settingsJson) {
      return null;
    }
    
    const settings = JSON.parse(settingsJson);
    
    // 从providers中查找模型
    if (settings.providers) {
      for (const provider of settings.providers) {
        if (provider.isEnabled && provider.models) {
          for (const model of provider.models) {
            if (model.id === modelId && model.enabled) {
              // 合并provider的一些属性到model
              return {
                ...model,
                apiKey: model.apiKey || provider.apiKey,
                baseUrl: model.baseUrl || provider.baseUrl,
                providerType: model.providerType || provider.providerType || provider.id,
              };
            }
          }
        }
      }
    }
    
    // 从models中查找模型（兼容旧格式）
    if (settings.models) {
      const model = settings.models.find((m: Model) => m.id === modelId);
      if (model) return model;
    }
  } catch (error) {
    console.error('读取模型设置失败:', error);
  }
  
  return null;
}