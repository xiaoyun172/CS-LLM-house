/**
 * DeepSeek API模块
 * 导出统一的API接口
 */

// 导出Provider
import { DeepSeekProvider } from './provider';
export { DeepSeekProvider };
export { createProvider, createClient } from './createProvider';

// 导出流式处理函数
export { streamDeepSeekCompletion } from './stream';

// 导出工具函数
export function supportsReasoning(model: any): boolean {
  return model.id.includes('deepseek-reasoner') ||
         model.id.includes('deepseek-r1') ||
         (model.name && model.name.includes('DeepSeek-R'));
}

// 导出测试连接函数
export async function testConnection(model: any): Promise<boolean> {
  try {
    // 创建Provider
    const provider = new DeepSeekProvider(model);

    // 测试连接
    const response = await provider.client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 5,
    });
    return Boolean(response.choices[0].message);
  } catch (error) {
    console.error('DeepSeek API连接测试失败:', error);
    return false;
  }
}

// 导出发送聊天请求函数
export async function sendChatRequest(
  messages: any[],
  model: any,
  onUpdate?: (content: string, reasoning?: string) => void
): Promise<string | { content: string; reasoning?: string; reasoningTime?: number }> {
  try {
    // 创建Provider
    const provider = new DeepSeekProvider(model);

    // 发送聊天请求
    return await provider.sendChatMessage(messages, {
      onUpdate,
      reasoningEffort: model.reasoningEffort || 'high'
    });
  } catch (error) {
    console.error('DeepSeek API发送聊天请求失败:', error);
    throw error;
  }
}

// 导出获取模型列表函数
export async function fetchModels(providerConfig: any): Promise<any[]> {
  try {
    // 创建临时模型
    const tempModel = {
      id: 'deepseek-temp',
      name: 'DeepSeek Temp',
      provider: 'deepseek',
      apiKey: providerConfig.apiKey,
      baseUrl: providerConfig.baseUrl || 'https://api.deepseek.com/v1'
    };

    // 创建Provider
    const providerInstance = new DeepSeekProvider(tempModel);

    // 尝试获取模型列表
    try {
      const response = await providerInstance.client.models.list();

      // 处理响应
      if (response.data && Array.isArray(response.data)) {
        return response.data.map((model: any) => ({
          id: model.id,
          name: model.id === 'deepseek-chat' ? 'DeepSeek-V3' :
                model.id === 'deepseek-reasoner' ? 'DeepSeek-R1' : model.id,
          description: model.description || getModelDescription(model.id),
          owned_by: 'DeepSeek'
        }));
      }
    } catch (error) {
      console.error('获取DeepSeek模型列表失败:', error);
    }

    // 返回默认模型列表
    return [
      { id: 'deepseek-chat', name: 'DeepSeek-V3', description: '最新的大型语言模型，具有优秀的中文和代码能力。', owned_by: 'DeepSeek' },
      { id: 'deepseek-reasoner', name: 'DeepSeek-R1', description: '推理模型，擅长解决复杂推理问题。', owned_by: 'DeepSeek' }
    ];
  } catch (error) {
    console.error('获取DeepSeek模型列表失败:', error);

    // 返回默认模型列表
    return [
      { id: 'deepseek-chat', name: 'DeepSeek-V3', description: '最新的大型语言模型，具有优秀的中文和代码能力。', owned_by: 'DeepSeek' },
      { id: 'deepseek-reasoner', name: 'DeepSeek-R1', description: '推理模型，擅长解决复杂推理问题。', owned_by: 'DeepSeek' }
    ];
  }
}

// 获取模型描述
function getModelDescription(modelId: string): string {
  switch (modelId) {
    case 'deepseek-chat':
      return '最新的大型语言模型，具有优秀的中文和代码能力。';
    case 'deepseek-reasoner':
      return '推理模型，擅长解决复杂推理问题。';
    default:
      return 'DeepSeek AI模型';
  }
}
