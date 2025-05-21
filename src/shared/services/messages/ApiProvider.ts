import type { Model } from '../../types';
import { getProviderApi } from '../ProviderFactory';

/**
 * API提供商注册表
 * 负责管理和获取API服务提供商
 */
export const ApiProviderRegistry = {
  /**
   * 获取API提供商
   * @param model 模型配置
   * @returns API提供商实例
   */
  get(model: Model) {
    try {
      console.log(`[ApiProviderRegistry] 获取API提供商 - 模型ID: ${model.id}, 提供商: ${model.provider}`);
      return getProviderApi(model);
    } catch (error) {
      console.error(`[ApiProviderRegistry] 获取API提供商失败: ${(error as Error).message}`);
      return null;
    }
  },
  
  /**
   * 测试API连接
   * @param model 模型配置
   * @returns 连接是否成功
   */
  async testConnection(model: Model): Promise<boolean> {
    try {
      const api = this.get(model);
      if (!api || !api.testConnection) {
        console.error(`[ApiProviderRegistry] 测试连接失败 - 找不到API或测试方法, 模型ID: ${model.id}`);
        return false;
      }
      
      const result = await api.testConnection(model);
      console.log(`[ApiProviderRegistry] 测试连接结果 - 模型ID: ${model.id}, 结果: ${result ? '成功' : '失败'}`);
      return result;
    } catch (error) {
      console.error(`[ApiProviderRegistry] 测试连接出错: ${(error as Error).message}`);
      return false;
    }
  }
};

export default ApiProviderRegistry; 