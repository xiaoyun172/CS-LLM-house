/**
 * 供应商工厂模块 - 参考电脑版架构
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
 * 获取供应商API - 简化版本，参考电脑版架构
 * @param model 模型配置
 * @returns 供应商API模块
 */
export function getProviderApi(model: Model): any {
  const providerType = getActualProviderType(model);

  // 简化的Provider选择逻辑，参考电脑版
  switch (providerType) {
    case 'anthropic':
      return anthropicApi;
    case 'gemini':
      return geminiApi;
    case 'openai':
    case 'deepseek': // DeepSeek使用OpenAI兼容API
    case 'google':   // Google使用OpenAI兼容API
    default:
      // 默认使用OpenAI兼容API，与电脑版保持一致
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

// 获取默认分组名称 - 从APIService移过来，统一管理
function getDefaultGroupName(modelId: string): string {
  const modelIdLower = modelId.toLowerCase();

  if (modelIdLower.includes('gpt-4')) return 'GPT-4';
  if (modelIdLower.includes('gpt-3.5')) return 'GPT-3.5';
  if (modelIdLower.includes('claude-3')) return 'Claude 3';
  if (modelIdLower.includes('claude-2')) return 'Claude 2';
  if (modelIdLower.includes('claude')) return 'Claude';
  if (modelIdLower.includes('gemini-1.5')) return 'Gemini 1.5';
  if (modelIdLower.includes('gemini-2')) return 'Gemini 2.0';
  if (modelIdLower.includes('gemini')) return 'Gemini';
  if (modelIdLower.includes('grok-3')) return 'Grok 3';
  if (modelIdLower.includes('grok')) return 'Grok';

  return '其他模型';
}

/**
 * 获取模型列表 - 简化版本，参考电脑版架构
 * @param provider 提供商配置
 * @returns 格式化的模型列表
 */
export async function fetchModels(provider: any): Promise<any[]> {
  try {
    // 确定提供商类型
    let providerType = provider.providerType || provider.id;

    // 对于自定义中转站，默认使用OpenAI兼容API
    if (provider.baseUrl && !provider.providerType && provider.id !== 'openai') {
      providerType = 'openai';
    }

    let rawModels: any[] = [];

    // 简化的Provider选择逻辑，与电脑版保持一致
    switch (providerType.toLowerCase()) {
      case 'anthropic':
        rawModels = await anthropicApi.fetchModels(provider);
        break;
      case 'gemini':
        rawModels = await geminiApi.fetchModels(provider);
        break;
      case 'deepseek':
        // DeepSeek使用OpenAI兼容API，失败时返回预设列表
        try {
          rawModels = await openaiApi.fetchModels(provider);
        } catch (error) {
          console.warn(`[fetchModels] DeepSeek模型获取失败，返回预设列表:`, error);
          rawModels = [
            { id: 'deepseek-chat', name: 'DeepSeek-V3', description: 'DeepSeek最新的大型语言模型，具有优秀的中文和代码能力。', owned_by: 'deepseek' },
            { id: 'deepseek-reasoner', name: 'DeepSeek-R1', description: 'DeepSeek的推理模型，擅长解决复杂推理问题。', owned_by: 'deepseek' }
          ];
        }
        break;
      case 'openai':
      case 'google':
      default:
        // 默认使用OpenAI兼容API
        rawModels = await openaiApi.fetchModels(provider);
        break;
    }

    // 统一格式化模型数据 - 整合APIService中的逻辑
    const formattedModels = rawModels.map(model => ({
      id: model.id,
      name: model.name || model.id,
      provider: provider.id,
      providerType: provider.providerType || provider.id,
      description: model.description,
      group: getDefaultGroupName(model.id),
      enabled: true,
      // 保留原始数据
      ...model
    }));

    return formattedModels;
  } catch (error) {
    console.error('获取模型列表失败:', error);
    throw error;
  }
}
