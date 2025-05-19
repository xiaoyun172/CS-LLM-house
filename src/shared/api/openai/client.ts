/**
 * OpenAI客户端模块
 * 负责创建和配置OpenAI客户端实例
 */
import OpenAI from 'openai';
import type { Model } from '../../types';
import { logApiRequest } from '../../services/LoggerService';

/**
 * 创建OpenAI客户端实例
 * @param model 模型配置
 * @returns OpenAI客户端实例
 */
export function createClient(model: Model): OpenAI {
  // 获取API密钥和基础URL
  const apiKey = model.apiKey;
  const baseUrl = model.baseUrl || 'https://api.openai.com/v1';
  
  // 检查API密钥是否设置
  if (!apiKey) {
    console.error('API密钥未设置:', { model });
    throw new Error('API密钥未设置');
  }
  
  // 记录客户端创建信息
  console.log(`[OpenAI API] 创建客户端:`, { 
    baseUrl, 
    modelId: model.id, 
    hasApiKey: !!apiKey, 
    providerType: (model as any).providerType
  });
  
  // 创建OpenAI客户端实例
  return new OpenAI({
    apiKey: apiKey,
    baseURL: baseUrl,
    dangerouslyAllowBrowser: true, // 允许在浏览器环境中使用
  });
}

/**
 * 检查模型是否支持多模态
 * @param model 模型配置
 * @returns 是否支持多模态
 */
export function supportsMultimodal(model: Model): boolean {
  const modelId = model.id;
  
  return Boolean(
    model.capabilities?.multimodal || 
    modelId.includes('gpt-4') || 
    modelId.includes('gpt-4o') || 
    modelId.includes('vision') || 
    modelId.includes('gemini') || 
    modelId.includes('claude-3')
  );
}

/**
 * 测试API连接
 * @param model 模型配置
 * @returns 连接是否成功
 */
export async function testConnection(model: Model): Promise<boolean> {
  try {
    const apiKey = model.apiKey;
    const baseUrl = model.baseUrl || 'https://api.openai.com/v1';
    const modelId = model.id;

    if (!apiKey) {
      throw new Error('API密钥未设置');
    }

    // 创建OpenAI客户端实例
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: baseUrl,
      dangerouslyAllowBrowser: true,
    });

    // 记录API请求
    logApiRequest('OpenAI Connection Test', 'INFO', {
      method: 'POST',
      model: modelId,
      baseUrl
    });

    // 发送简单的测试请求
    const response = await openai.chat.completions.create({
      model: modelId,
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 5,
    });

    return Boolean(response.choices[0].message);
  } catch (error) {
    console.error('OpenAI API连接测试失败:', error);
    return false;
  }
}
