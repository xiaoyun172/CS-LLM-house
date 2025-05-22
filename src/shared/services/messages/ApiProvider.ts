import type { Model } from '../../types';
import { getProviderApi, testConnection } from '../ProviderFactory';

/**
 * API提供商注册表 - 简化版本，参考电脑版架构
 * 负责管理和获取API服务提供商
 */
export const ApiProviderRegistry = {
  /**
   * 获取API提供商 - 直接委托给ProviderFactory
   * @param model 模型配置
   * @returns API提供商实例
   */
  get(model: Model) {
    return getProviderApi(model);
  },

  /**
   * 测试API连接 - 直接委托给ProviderFactory
   * @param model 模型配置
   * @returns 连接是否成功
   */
  async testConnection(model: Model): Promise<boolean> {
    return await testConnection(model);
  }
};

export default ApiProviderRegistry;