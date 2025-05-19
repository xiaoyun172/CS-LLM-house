/**
 * 供应商工厂模块
 * 负责根据供应商类型返回适当的API处理模块
 */
import type { Model } from '../types';
import * as openaiApi from '../api/openai';
import * as anthropicApi from '../api/anthropic';
import * as googleApi from '../api/google';

/**
 * 获取实际的提供商类型
 * @param model 模型配置
 * @returns 提供商类型
 */
export function getActualProviderType(model: Model): string {
  // 优先使用providerType字段(如果存在)，否则回退到provider字段
  return (model as any).providerType || model.provider;
}

/**
 * 获取供应商API
 * @param model 模型配置
 * @returns 供应商API模块
 */
export function getProviderApi(model: Model): any {
  const providerType = getActualProviderType(model);

  // 只处理三种主要供应商类型，其他都使用OpenAI兼容API
  switch (providerType) {
    case 'anthropic':
      return anthropicApi;
    case 'gemini':
    case 'google':
      return googleApi;
    case 'openai':
    default:
      // 默认使用OpenAI兼容API
      return openaiApi;
  }
}

/**
 * 测试API连接
 * @param model 模型配置
 * @returns 连接是否成功
 */
export async function testConnection(model: Model): Promise<boolean> {
  try {
    const api = getProviderApi(model);
    return await api.testConnection(model);
  } catch (error) {
    console.error('API连接测试失败:', error);
    return false;
  }
}

/**
 * 发送聊天请求
 * @param messages 消息数组
 * @param model 模型配置
 * @param onUpdate 更新回调函数
 * @returns 响应内容
 */
export async function sendChatRequest(
  messages: any[],
  model: Model,
  onUpdate?: (content: string, reasoning?: string) => void
): Promise<string | { content: string; reasoning?: string; reasoningTime?: number }> {
  try {
    const api = getProviderApi(model);
    return await api.sendChatRequest(messages, model, onUpdate);
  } catch (error) {
    console.error('发送聊天请求失败:', error);
    throw error;
  }
}

/**
 * 获取模型列表
 * @param provider 提供商配置
 * @returns 模型列表
 */
export async function fetchModels(provider: any): Promise<any[]> {
  try {
    // 确定提供商类型
    let providerType = provider.providerType || provider.id;

    // 对于自定义中转站，如果没有指定providerType，默认尝试使用OpenAI兼容API
    if (provider.baseUrl && !provider.providerType && provider.id !== 'openai') {
      console.log(`[fetchModels] 检测到自定义中转站 ${provider.baseUrl}，将尝试使用OpenAI兼容API`);
      providerType = 'openai';
    }

    // 只处理三种主要供应商类型，其他都使用OpenAI兼容API
    switch (providerType.toLowerCase()) {
      case 'anthropic':
        // 暂时使用OpenAI兼容API获取模型，后续可以实现专门的Anthropic模型获取
        console.log(`[fetchModels] Anthropic模型获取暂未实现，使用OpenAI兼容API`);
        return await openaiApi.fetchModels(provider);
      case 'gemini':
      case 'google':
        // 暂时使用OpenAI兼容API获取模型，后续可以实现专门的Google模型获取
        console.log(`[fetchModels] Google模型获取暂未实现，使用OpenAI兼容API`);
        return await openaiApi.fetchModels(provider);
      case 'openai':
      default:
        // 默认使用OpenAI兼容API
        return await openaiApi.fetchModels(provider);
    }
  } catch (error) {
    console.error('获取模型列表失败:', error);
    throw error;
  }
}
