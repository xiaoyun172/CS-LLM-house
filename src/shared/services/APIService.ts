import type { Model } from '../types';
import { logApiRequest, logApiResponse } from './LoggerService';

// 获取模型的基本URL
function getBaseUrl(provider: any): string {
  if (!provider.baseUrl) return '';

  let baseUrl = provider.baseUrl;

  // 处理URL格式
  // 如果URL已经包含/v1，确保它不以/结尾
  if (baseUrl.includes('/v1')) {
    // 移除末尾的斜杠，因为我们会在构建端点时添加
    return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }

  // 如果URL不包含/v1，确保它以/结尾
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

// 获取API密钥
function getApiKey(provider: any): string {
  return provider.apiKey || '';
}

// 从OpenAI API获取模型列表
async function fetchOpenAIModels(provider: any): Promise<any[]> {
  try {
    const baseUrl = getBaseUrl(provider);
    const apiKey = getApiKey(provider);

    if (!apiKey) {
      throw new Error('未提供OpenAI API密钥');
    }

    // 构建正确的端点URL
    let endpoint = '';
    if (baseUrl.includes('/v1')) {
      // 如果baseUrl已经包含/v1，直接添加/models
      endpoint = `${baseUrl}/models`;
    } else {
      // 否则添加完整路径
      endpoint = `${baseUrl}v1/models`;
    }

    console.log(`[fetchOpenAIModels] 正在从 ${endpoint} 获取模型列表`);

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    // 添加自定义中转站可能需要的额外头部
    if (provider.extraHeaders) {
      Object.assign(headers, provider.extraHeaders);
    }

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[fetchOpenAIModels] API请求失败: 状态码 ${response.status}, 响应:`, errorText);
      console.error(`[fetchOpenAIModels] 请求URL: ${endpoint}`);
      console.error(`[fetchOpenAIModels] 请求头:`, JSON.stringify(headers, null, 2));

      // 尝试解析错误响应
      let errorMessage = `OpenAI API请求失败: 状态码 ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          errorMessage += `, 错误: ${JSON.stringify(errorJson.error)}`;
        } else {
          errorMessage += `, ${errorText}`;
        }
      } catch (e) {
        errorMessage += `, ${errorText}`;
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log(`[fetchOpenAIModels] 成功获取模型列表, 找到 ${(data.data || []).length} 个模型`);

    // 确保返回的数据格式正确
    if (!data.data && Array.isArray(data)) {
      // 某些中转站可能直接返回模型数组而不是 {data: [...]} 格式
      return data;
    }

    return data.data || [];
  } catch (error) {
    console.error('[fetchOpenAIModels] 获取模型失败:', error);
    throw error;
  }
}

// 从Google Gemini API获取模型列表
async function fetchGeminiModels(provider: any): Promise<any[]> {
  try {
    const baseUrl = getBaseUrl(provider);
    const apiKey = getApiKey(provider);

    if (!apiKey) {
      throw new Error('未提供Gemini API密钥');
    }

    // 尝试从API获取模型列表
    try {
      console.log(`[fetchGeminiModels] 尝试从API获取Gemini模型列表`);

      // 构建API端点
      let endpoint = '';
      if (baseUrl.includes('/v1')) {
        // 如果baseUrl已经包含/v1，直接添加beta/models
        endpoint = baseUrl.includes('/v1beta')
          ? `${baseUrl}/models`
          : `${baseUrl.replace('/v1', '/v1beta')}/models`;
      } else {
        // 否则添加完整路径
        endpoint = `${baseUrl}v1beta/models`;
      }

      console.log(`[fetchGeminiModels] 请求端点: ${endpoint}`);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // 添加自定义中转站可能需要的额外头部
      if (provider.extraHeaders) {
        Object.assign(headers, provider.extraHeaders);
      }

      // 构建URL，添加API密钥作为查询参数
      const url = new URL(endpoint);
      url.searchParams.append('key', apiKey);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[fetchGeminiModels] API请求失败: ${response.status}, ${errorText}`);
        throw new Error('API请求失败');
      }

      const data = await response.json();

      // 处理不同的响应格式
      if (data.models && Array.isArray(data.models) && data.models.length > 0) {
        console.log(`[fetchGeminiModels] 成功从API获取到 ${data.models.length} 个模型`);

        // 转换为标准格式
        return data.models.map((m: any) => {
          // 处理不同的命名约定
          const modelId = m.name ? m.name.replace('models/', '') : m.id;
          const modelName = m.displayName || m.name || modelId;

          return {
            id: modelId,
            name: modelName,
            description: m.description || '',
            object: 'model',
            created: Date.now(),
            owned_by: 'Google'
          };
        });
      } else if (Array.isArray(data) && data.length > 0) {
        // 某些API可能直接返回模型数组
        console.log(`[fetchGeminiModels] 成功从API获取到 ${data.length} 个模型`);

        return data.map((m: any) => {
          const modelId = m.name ? m.name.replace('models/', '') : m.id;
          const modelName = m.displayName || m.name || modelId;

          return {
            id: modelId,
            name: modelName,
            description: m.description || '',
            object: 'model',
            created: Date.now(),
            owned_by: 'Google'
          };
        });
      }

      throw new Error('未找到模型数据');
    } catch (apiError) {
      console.warn(`[fetchGeminiModels] 从API获取失败，使用预设模型列表: ${apiError}`);

      // 如果API获取失败，回退到预设列表
      return [
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', owned_by: 'Google' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', owned_by: 'Google' },
        { id: 'gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash Latest', owned_by: 'Google' },
        { id: 'gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro Latest', owned_by: 'Google' },
        { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B', owned_by: 'Google' },
        { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro', owned_by: 'Google' },
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', owned_by: 'Google' },
        { id: 'gemini-2.0-pro', name: 'Gemini 2.0 Pro', owned_by: 'Google' },
        { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Experimental', owned_by: 'Google' }
      ];
    }
  } catch (error) {
    console.error('[fetchGeminiModels] 获取Gemini模型失败:', error);
    throw error;
  }
}

// 从Anthropic API获取模型列表
async function fetchAnthropicModels(provider: any): Promise<any[]> {
  try {
    const baseUrl = getBaseUrl(provider);
    const apiKey = getApiKey(provider);

    if (!apiKey) {
      throw new Error('未提供Anthropic API密钥');
    }

    // 尝试从API获取模型列表
    try {
      console.log(`[fetchAnthropicModels] 尝试从API获取Claude模型列表`);

      // 构建API端点
      let endpoint = '';
      if (baseUrl.includes('/v1')) {
        // 如果baseUrl已经包含/v1，直接添加/models
        endpoint = `${baseUrl}/models`;
      } else {
        // 否则添加完整路径
        endpoint = `${baseUrl}v1/models`;
      }

      console.log(`[fetchAnthropicModels] 请求端点: ${endpoint}`);

      const headers: Record<string, string> = {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01', // 使用最新的API版本
        'Content-Type': 'application/json'
      };

      // 添加自定义中转站可能需要的额外头部
      if (provider.extraHeaders) {
        Object.assign(headers, provider.extraHeaders);
      }

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[fetchAnthropicModels] API请求失败: ${response.status}, ${errorText}`);
        throw new Error('API请求失败');
      }

      const data = await response.json();

      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        console.log(`[fetchAnthropicModels] 成功从API获取到 ${data.data.length} 个模型`);

        // 转换为标准格式
        return data.data.map((model: any) => ({
          id: model.id,
          name: model.display_name || model.id,
          description: '',
          object: 'model',
          created: Date.now(),
          owned_by: 'Anthropic'
        }));
      }

      throw new Error('未找到模型数据');
    } catch (apiError) {
      console.warn(`[fetchAnthropicModels] 从API获取失败，使用预设模型列表: ${apiError}`);

      // 如果API获取失败，回退到预设列表
      return [
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', owned_by: 'Anthropic' },
        { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', owned_by: 'Anthropic' },
        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', owned_by: 'Anthropic' },
        { id: 'claude-3.5-sonnet-20240620', name: 'Claude 3.5 Sonnet', owned_by: 'Anthropic' },
        { id: 'claude-2.1', name: 'Claude 2.1', owned_by: 'Anthropic' },
        { id: 'claude-2.0', name: 'Claude 2.0', owned_by: 'Anthropic' },
        { id: 'claude-instant-1.2', name: 'Claude Instant 1.2', owned_by: 'Anthropic' }
      ];
    }
  } catch (error) {
    console.error('[fetchAnthropicModels] 获取Anthropic模型失败:', error);
    throw error;
  }
}

// 从Grok API获取模型列表
async function fetchGrokModels(provider: any): Promise<any[]> {
  try {
    const baseUrl = getBaseUrl(provider);
    const apiKey = getApiKey(provider);

    if (!apiKey) {
      console.warn('[fetchGrokModels] 未提供Grok API密钥，使用预设模型列表');
      return getDefaultGrokModels();
    }

    // 尝试从API获取模型列表
    try {
      console.log(`[fetchGrokModels] 尝试从API获取Grok模型列表`);

      // 构建API端点 - 尝试使用OpenAI兼容格式
      let endpoint = '';
      if (baseUrl.includes('/v1')) {
        // 如果baseUrl已经包含/v1，直接添加/models
        endpoint = `${baseUrl}/models`;
      } else {
        // 否则添加完整路径
        endpoint = `${baseUrl}v1/models`;
      }

      console.log(`[fetchGrokModels] 请求端点: ${endpoint}`);

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      };

      // 添加自定义中转站可能需要的额外头部
      if (provider.extraHeaders) {
        Object.assign(headers, provider.extraHeaders);
      }

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[fetchGrokModels] API请求失败: ${response.status}, ${errorText}`);
        throw new Error('API请求失败');
      }

      const data = await response.json();

      // 处理不同的响应格式
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        console.log(`[fetchGrokModels] 成功从API获取到 ${data.data.length} 个模型`);

        // 转换为标准格式
        return data.data.map((model: any) => ({
          id: model.id,
          name: model.name || model.id,
          description: model.description || '',
          object: 'model',
          created: Date.now(),
          owned_by: 'xAI'
        }));
      } else if (Array.isArray(data) && data.length > 0) {
        console.log(`[fetchGrokModels] 成功从API获取到 ${data.length} 个模型`);

        return data.map((model: any) => ({
          id: model.id,
          name: model.name || model.id,
          description: model.description || '',
          object: 'model',
          created: Date.now(),
          owned_by: 'xAI'
        }));
      }

      throw new Error('未找到模型数据');
    } catch (apiError) {
      console.warn(`[fetchGrokModels] 从API获取失败，使用预设模型列表: ${apiError}`);
      return getDefaultGrokModels();
    }
  } catch (error) {
    console.error('[fetchGrokModels] 获取Grok模型失败:', error);
    return getDefaultGrokModels();
  }
}

// 获取默认的Grok模型列表
function getDefaultGrokModels(): any[] {
  return [
    { id: 'grok-3-mini-beta', name: 'Grok 3 Mini Beta', owned_by: 'xAI' },
    { id: 'grok-3-beta', name: 'Grok 3 Beta', owned_by: 'xAI' },
    { id: 'grok-3-mini-fast-beta', name: 'Grok 3 Mini Fast Beta', owned_by: 'xAI' },
    { id: 'grok-1', name: 'Grok 1', owned_by: 'xAI' }
  ];
}

// 获取默认分组名称
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
 * 从API提供商获取模型列表
 * @param provider 模型提供商配置
 * @returns 模型列表
 */
export async function fetchModels(provider: any): Promise<Model[]> {
  try {
    // 记录详细的请求信息
    const requestInfo = {
      provider: provider.id,
      providerName: provider.name,
      providerType: provider.providerType || provider.id,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey ? '已设置' : '未设置'
    };

    logApiRequest('获取模型列表', 'INFO', requestInfo);
    console.log(`[fetchModels] 开始获取模型列表，请求信息:`, JSON.stringify(requestInfo, null, 2));

    // 确定提供商类型
    let providerType = provider.providerType || provider.id;

    // 对于自定义中转站，如果没有指定providerType，默认尝试使用OpenAI兼容API
    if (provider.baseUrl && !provider.providerType && provider.id !== 'openai') {
      console.log(`[fetchModels] 检测到自定义中转站 ${provider.baseUrl}，将尝试使用OpenAI兼容API`);
      providerType = 'openai';
    }

    // 验证必要的参数
    if (!provider.apiKey && providerType !== 'local') {
      console.warn(`[fetchModels] 警告: 未提供API密钥，可能导致请求失败`);
    }

    let models: any[] = [];

    // 根据提供商类型获取模型
    switch (providerType.toLowerCase()) {
      case 'openai':
        models = await fetchOpenAIModels(provider);
        break;
      case 'anthropic':
        models = await fetchAnthropicModels(provider);
        break;
      case 'gemini':
      case 'google':
        models = await fetchGeminiModels(provider);
        break;
      case 'grok':
        models = await fetchGrokModels(provider);
        break;
      default:
        // 对于未知类型，尝试使用OpenAI兼容API
        console.log(`[fetchModels] 未知提供商类型 "${providerType}"，尝试使用OpenAI兼容API`);
        try {
          models = await fetchOpenAIModels(provider);
        } catch (e) {
          console.warn(`[fetchModels] OpenAI兼容API尝试失败:`, e);
          throw new Error(`不支持的提供商类型: ${providerType}`);
        }
    }

    // 转换为应用模型格式
    const formattedModels = models.map(model => ({
      id: model.id,
      name: model.name || model.id,
      provider: provider.id,
      providerType: provider.providerType || provider.id,
      description: model.description,
      group: getDefaultGroupName(model.id),
      enabled: true
    }));

    console.log(`[fetchModels] 成功获取 ${formattedModels.length} 个模型`);

    logApiResponse('获取模型列表', 200, {
      provider: provider.id,
      modelsCount: formattedModels.length
    });

    return formattedModels;
  } catch (error) {
    console.error('[fetchModels] 获取模型列表失败:', error);
    logApiResponse('获取模型列表', 500, {
      provider: provider.id,
      error: error instanceof Error ? error.message : '未知错误'
    });
    return [];
  }
}