import type { PresetModel } from '../types';

// 预设模型列表
export const presetModels: PresetModel[] = [
  // OpenAI 模型
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    description: '快速、经济实惠的AI助手，适合大多数日常任务。',
    capabilities: ['聊天对话', '内容生成', '简单问答', '代码辅助'],
    requiresApiKey: true,
    defaultBaseUrl: 'https://api.openai.com/v1',
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    description: '强大的大型语言模型，具有更强的推理能力和更广泛的知识。',
    capabilities: ['复杂推理', '高级内容创作', '代码生成', '多步骤问题解决'],
    requiresApiKey: true,
    defaultBaseUrl: 'https://api.openai.com/v1',
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    description: 'GPT-4的优化版本，提供更快的响应速度和更新的知识。',
    capabilities: ['复杂推理', '高级内容创作', '代码生成', '多步骤问题解决', '更新的知识库'],
    requiresApiKey: true,
    defaultBaseUrl: 'https://api.openai.com/v1',
  },
  
  // Anthropic 模型
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    description: 'Anthropic最强大的模型，具有卓越的推理能力和创造力。',
    capabilities: ['复杂推理', '高级内容创作', '代码生成', '多步骤问题解决', '更准确的回答'],
    requiresApiKey: true,
    defaultBaseUrl: 'https://api.anthropic.com/v1',
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    description: '平衡性能和速度的中端模型，适合大多数任务。',
    capabilities: ['聊天对话', '内容生成', '代码辅助', '问题解决'],
    requiresApiKey: true,
    defaultBaseUrl: 'https://api.anthropic.com/v1',
  },
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    description: '快速、轻量级的模型，适合简单任务和实时应用。',
    capabilities: ['快速回复', '简单问答', '基础内容生成'],
    requiresApiKey: true,
    defaultBaseUrl: 'https://api.anthropic.com/v1',
  },
  
  // Google 模型
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'google',
    description: 'Google的高性能大语言模型，具有强大的推理和生成能力。',
    capabilities: ['复杂推理', '内容生成', '代码辅助', '多语言支持'],
    requiresApiKey: true,
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1',
  },
  {
    id: 'gemini-ultra',
    name: 'Gemini Ultra',
    provider: 'google',
    description: 'Google最先进的大语言模型，具有卓越的多模态能力。',
    capabilities: ['复杂推理', '高级内容创作', '代码生成', '多模态理解'],
    requiresApiKey: true,
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1',
  },
  
  // Grok 模型
  {
    id: 'grok-1',
    name: 'Grok-1',
    provider: 'grok',
    description: 'xAI的Grok模型，擅长幽默风格回复和实时信息。',
    capabilities: ['实时知识', '网络搜索', '幽默回复', '代码生成'],
    requiresApiKey: true,
    defaultBaseUrl: 'https://api.x.ai/v1',
  },
  {
    id: 'grok-2',
    name: 'Grok-2',
    provider: 'grok',
    description: 'xAI的最新Grok模型，具有增强的推理能力和更新的知识库。',
    capabilities: ['复杂推理', '实时知识', '代码生成', '问题解决', '多模态理解'],
    requiresApiKey: true,
    defaultBaseUrl: 'https://api.x.ai/v1',
  },
];

// 获取模型图标
export const getModelIcon = (provider: string): string => {
  switch (provider) {
    case 'openai':
      return '/icons/openai.png';
    case 'anthropic':
      return '/icons/anthropic.png';
    case 'google':
      return '/icons/google.png';
    case 'grok':
      return '/icons/grok.png';
    case 'custom':
      return '/icons/custom.png';
    default:
      return '/icons/ai.png';
  }
};

// 获取模型提供商名称
export const getProviderName = (provider: string): string => {
  switch (provider) {
    case 'openai':
      return 'OpenAI';
    case 'anthropic':
      return 'Anthropic';
    case 'google':
      return 'Google';
    case 'grok':
      return 'xAI (Grok)';
    case 'custom':
      return '自定义';
    default:
      return provider;
  }
};
