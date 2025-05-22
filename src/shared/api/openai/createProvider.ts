/**
 * 创建Provider函数
 * 根据模型类型创建对应的Provider
 */
import type { Model } from '../../types';
import { OpenAIProvider } from './provider';

/**
 * 创建Provider
 * @param model 模型对象
 * @returns Provider实例
 */
export function createProvider(model: Model) {
  // 根据模型类型创建对应的Provider
  return new OpenAIProvider(model);
}
