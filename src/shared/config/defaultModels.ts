import type { Model } from '../types';

export interface ModelProvider {
  id: string;
  name: string;
  avatar: string;
  color: string;
  isEnabled: boolean;
  apiKey?: string;
  baseUrl?: string;
  models: Model[];
  providerType?: string;
  isSystem?: boolean; // 标记是否为系统供应商
}

// 默认模型供应商配置
export const getDefaultModelProviders = (): ModelProvider[] => [
  {
    id: 'model-combo',
    name: '模型组合',
    avatar: '🧠',
    color: '#f43f5e',
    isEnabled: true,
    apiKey: '',
    baseUrl: '',
    isSystem: true, // 标记为系统供应商
    models: [] // 动态从模型组合服务加载
  },
  {
    id: 'openai',
    name: 'OpenAI',
    avatar: 'O',
    color: '#10a37f',
    isEnabled: true,
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    providerType: 'openai',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', enabled: true, isDefault: true },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', enabled: true, isDefault: false },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', enabled: true, isDefault: false },
      { id: 'o1', name: 'o1', provider: 'openai', enabled: true, isDefault: false },
      { id: 'o1-mini', name: 'o1-mini', provider: 'openai', enabled: true, isDefault: false },
    ]
  },
  {
    id: 'gemini',
    name: 'Gemini',
    avatar: 'G',
    color: '#4285f4',
    isEnabled: true,
    apiKey: '',
    baseUrl: 'https://generativelanguage.googleapis.com/v1',
    providerType: 'gemini',
    models: [
      { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Experimental', provider: 'gemini', enabled: true, isDefault: false },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'gemini', enabled: true, isDefault: false },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'gemini', enabled: true, isDefault: false },
    ]
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    avatar: 'A',
    color: '#b83280',
    isEnabled: true,
    apiKey: '',
    baseUrl: 'https://api.anthropic.com/v1',
    providerType: 'anthropic',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic', enabled: true, isDefault: false },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'anthropic', enabled: true, isDefault: false },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic', enabled: true, isDefault: false },
    ]
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    avatar: 'D',
    color: '#754AB4',
    isEnabled: true,
    apiKey: '',
    baseUrl: 'https://api.deepseek.com',
    providerType: 'openai',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek-V3', provider: 'deepseek', enabled: true, isDefault: false },
      { id: 'deepseek-reasoner', name: 'DeepSeek-R1', provider: 'deepseek', enabled: true, isDefault: false },
    ]
  },
  {
    id: 'volcengine',
    name: '火山引擎',
    avatar: 'V',
    color: '#ff3d00',
    isEnabled: true,
    apiKey: '',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    providerType: 'volcengine',
    models: [
      { id: 'doubao-1.5-pro', name: '豆包 1.5 Pro', provider: 'volcengine', enabled: true, isDefault: false, description: '豆包大模型专业版' },
      { id: 'doubao-1.5-lite', name: '豆包 1.5 Lite', provider: 'volcengine', enabled: true, isDefault: false, description: '豆包大模型轻量版' },
      { id: 'doubao-1.5-thinking-pro', name: '豆包 1.5 Thinking Pro', provider: 'volcengine', enabled: true, isDefault: false, description: '豆包大模型思考专业版' },
      { id: 'deepseek-r1', name: 'DeepSeek R1', provider: 'volcengine', enabled: true, isDefault: false, description: 'DeepSeek R1大模型' }
    ]
  },
  {
    id: 'zhipu',
    name: '智谱AI',
    avatar: '智',
    color: '#4f46e5',
    isEnabled: true,
    apiKey: '',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4/',
    providerType: 'zhipu',
    models: [
      { id: 'glm-4-0520', name: 'GLM-4-0520', provider: 'zhipu', enabled: true, isDefault: false, description: 'GLM-4最新版本，性能优化' },
      { id: 'glm-4-plus', name: 'GLM-4-Plus', provider: 'zhipu', enabled: true, isDefault: false, description: 'GLM-4增强版，更强推理能力' },
      { id: 'glm-4-long', name: 'GLM-4-Long', provider: 'zhipu', enabled: true, isDefault: false, description: 'GLM-4长文本版，支持超长上下文' },
      { id: 'glm-4-air', name: 'GLM-4-Air', provider: 'zhipu', enabled: true, isDefault: false, description: 'GLM-4轻量版，快速响应' },
      { id: 'glm-4-airx', name: 'GLM-4-AirX', provider: 'zhipu', enabled: true, isDefault: false, description: 'GLM-4轻量增强版' },
      { id: 'glm-4-flash', name: 'GLM-4-Flash', provider: 'zhipu', enabled: true, isDefault: false, description: 'GLM-4极速版，超快响应' },
      { id: 'glm-4-flashx', name: 'GLM-4-FlashX', provider: 'zhipu', enabled: true, isDefault: false, description: 'GLM-4极速增强版' },
      { id: 'glm-4v', name: 'GLM-4V', provider: 'zhipu', enabled: true, isDefault: false, description: 'GLM-4视觉版，支持图像理解' },
      { id: 'glm-4v-flash', name: 'GLM-4V-Flash', provider: 'zhipu', enabled: true, isDefault: false, description: 'GLM-4V极速版' },
      { id: 'glm-4v-plus', name: 'GLM-4V-Plus', provider: 'zhipu', enabled: true, isDefault: false, description: 'GLM-4V增强版' },
      { id: 'glm-4-alltools', name: 'GLM-4-AllTools', provider: 'zhipu', enabled: true, isDefault: false, description: 'GLM-4全工具版，支持网络搜索等工具' }
    ]
  }
];

// 获取默认模型ID
export const getDefaultModelId = (providers: ModelProvider[]): string | undefined => {
  for (const provider of providers) {
    if (provider.isEnabled) {
      const defaultModel = provider.models.find(m => m.isDefault && m.enabled);
      if (defaultModel) return defaultModel.id;

      // 如果没有默认模型，取第一个启用的模型
      const firstEnabledModel = provider.models.find(m => m.enabled);
      if (firstEnabledModel) return firstEnabledModel.id;
    }
  }
  return undefined;
};
