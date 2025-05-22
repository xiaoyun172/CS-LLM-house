/**
 * DeepSeek Provider工厂函数
 * 创建DeepSeek API Provider实例
 */
import OpenAI from 'openai';
import { DeepSeekProvider } from './provider';
import type { Model } from '../../types';

/**
 * 创建DeepSeek Provider
 * @param model 模型对象
 * @returns DeepSeek Provider实例
 */
export function createProvider(model: Model): DeepSeekProvider {
  // 创建DeepSeek Provider
  return new DeepSeekProvider(model);
}

/**
 * 创建OpenAI客户端
 * @param model 模型对象
 * @returns OpenAI客户端
 */
export function createClient(model: Model): OpenAI {
  // 获取API密钥
  const apiKey = model.apiKey || '';

  // 获取基础URL
  const baseURL = model.baseUrl || 'https://api.deepseek.com/v1';

  // 创建配置对象
  const config: any = {
    apiKey,
    baseURL,
    dangerouslyAllowBrowser: true // 允许在浏览器环境中使用
  };

  // 添加额外的头部
  if (model.extraHeaders) {
    config.defaultHeaders = model.extraHeaders;
  }

  // 添加代理配置
  if ('proxy' in model && model.proxy) {
    config.httpAgent = model.proxy;
    config.httpsAgent = model.proxy;
  }

  // 创建OpenAI客户端
  return new OpenAI(config);
}
