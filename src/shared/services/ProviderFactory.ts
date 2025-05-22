/**
 * 供应商工厂模块
 * 负责根据供应商类型返回适当的API处理模块
 */
import type { Model } from '../types';
import * as openaiApi from '../api/openai';
import * as anthropicApi from '../api/anthropic';
import * as geminiApi from '../api/gemini';

/**
 * 获取实际的提供商类型
 * @param model 模型配置
 * @returns 提供商类型
 */
export function getActualProviderType(model: Model): string {
  // 优先使用providerType字段(如果存在)，否则回退到provider字段
  const providerType = (model as any).providerType || model.provider;
  console.log(`[ProviderFactory] 获取提供商类型: ${providerType}, 模型ID: ${model.id}`);
  return providerType;
}

/**
 * 获取供应商API
 * @param model 模型配置
 * @returns 供应商API模块
 */
export function getProviderApi(model: Model): any {
  const providerType = getActualProviderType(model);
  console.log(`[ProviderFactory] 查找API实现，提供商类型: ${providerType}, 模型ID: ${model.id}`);

  // 处理四种主要供应商类型，其他都使用OpenAI兼容API
  switch (providerType) {
    case 'anthropic':
      console.log(`[ProviderFactory] 返回Anthropic API实现`);
      return anthropicApi;
    case 'gemini':
      console.log(`[ProviderFactory] 返回新的模块化Gemini API实现`);
      return geminiApi;
    case 'google':
      console.log(`[ProviderFactory] 返回OpenAI兼容API实现 (Google API已移除)`);
      return openaiApi;
    case 'openai':
      console.log(`[ProviderFactory] 返回OpenAI API实现`);
      return openaiApi;
    default:
      // 默认使用OpenAI兼容API
      console.log(`[ProviderFactory] 未识别的提供商类型: ${providerType}，使用OpenAI兼容API`);
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
    console.log(`[ProviderFactory.sendChatRequest] 开始处理请求 - 模型ID: ${model.id}, 提供商: ${model.provider}`);

    // 检查模型是否有API密钥
    if (!model.apiKey && model.provider !== 'auto') {
      console.warn(`[ProviderFactory.sendChatRequest] 警告: 模型 ${model.id} 没有API密钥`);
    }

    // 强制检查：确保消息数组不为空
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('[ProviderFactory.sendChatRequest] 严重错误: 消息数组为空或无效，添加默认消息');

      // 添加一个默认的用户消息
      messages = [{
        id: 'default-' + Date.now(),
        role: 'user',
        content: '您好，请问有什么可以帮助您的？', // 使用更友好的默认消息
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        blocks: []
      }];

      console.log('[ProviderFactory.sendChatRequest] 添加默认用户消息: 您好，请问有什么可以帮助您的？');
    }

    // 记录消息数组
    console.log(`[ProviderFactory.sendChatRequest] 消息数组:`, JSON.stringify(messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: typeof msg.content === 'string' ?
        (msg.content.length > 50 ? msg.content.substring(0, 50) + '...' : msg.content) :
        '[复杂内容]'
    }))));

    // 获取合适的API实现
    const api = getProviderApi(model);
    console.log(`[ProviderFactory.sendChatRequest] 获取API实现 - 提供商: ${model.provider}`);

    // 确保API有sendChatRequest方法
    if (!api.sendChatRequest) {
      console.error(`[ProviderFactory.sendChatRequest] 错误: API没有sendChatRequest方法`);
      throw new Error(`提供商 ${model.provider} 的API没有sendChatRequest方法`);
    }

    console.log(`[ProviderFactory.sendChatRequest] 调用API的sendChatRequest方法`);
    return await api.sendChatRequest(messages, model, onUpdate);
  } catch (error) {
    console.error('[ProviderFactory.sendChatRequest] 发送聊天请求失败:', error);
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

    // 处理主要供应商类型
    switch (providerType.toLowerCase()) {
      case 'anthropic':
        console.log(`[fetchModels] 使用新的模块化Anthropic API获取模型`);
        // 创建一个临时模型配置
        const anthropicModel = {
          id: provider.id,
          name: provider.name || 'Claude',
          apiKey: provider.apiKey,
          baseUrl: provider.baseUrl || 'https://api.anthropic.com',
          provider: 'anthropic'
        };
        // 使用 sendChatRequest 方法，这个方法在所有API模块中都应该存在
        return await anthropicApi.sendChatRequest([], anthropicModel)
          .then(() => {
            // 返回预设模型列表
            return [
              { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet', description: 'Claude 3.5 Sonnet - 最新的Claude模型', owned_by: 'anthropic' },
              { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Claude 3 Opus - 最强大的Claude模型', owned_by: 'anthropic' },
              { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Claude 3 Sonnet - 平衡性能和速度', owned_by: 'anthropic' },
              { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Claude 3 Haiku - 最快的Claude模型', owned_by: 'anthropic' },
              { id: 'claude-2.1', name: 'Claude 2.1', description: 'Claude 2.1 - 旧版Claude模型', owned_by: 'anthropic' }
            ];
          })
          .catch(error => {
            console.error('获取Anthropic模型列表失败:', error);
            // 返回预设模型列表
            return [
              { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet', description: 'Claude 3.5 Sonnet - 最新的Claude模型', owned_by: 'anthropic' },
              { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Claude 3 Opus - 最强大的Claude模型', owned_by: 'anthropic' },
              { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Claude 3 Sonnet - 平衡性能和速度', owned_by: 'anthropic' },
              { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Claude 3 Haiku - 最快的Claude模型', owned_by: 'anthropic' },
              { id: 'claude-2.1', name: 'Claude 2.1', description: 'Claude 2.1 - 旧版Claude模型', owned_by: 'anthropic' }
            ];
          });
      case 'gemini':
        console.log(`[fetchModels] 使用新的模块化Gemini API获取模型`);
        return await geminiApi.fetchModels(provider);
      case 'google':
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
