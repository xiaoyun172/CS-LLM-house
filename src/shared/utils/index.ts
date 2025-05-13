import { approximateTokenSize } from 'tokenx';

/**
 * 生成唯一ID
 * @returns {string} 唯一ID
 */
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

/**
 * 检查是否是合法的URL
 * @param {string} url - 要检查的URL字符串
 * @returns {boolean} 是否是合法的URL
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

// 格式化日期
export function formatDate(date: Date): string {
  return date.toISOString();
}

// 创建新消息
export function createMessage(options: {
  content: string;
  role: 'user' | 'assistant' | 'system';
  status?: 'pending' | 'complete' | 'error';
  modelId?: string;
  id?: string;
  parentMessageId?: string;
  version?: number;
  alternateVersions?: string[];
  isCurrentVersion?: boolean;
  reasoning?: string;
  reasoningTime?: number;
}): any {
  return {
    id: options.id || generateId(),
    content: options.content,
    role: options.role,
    timestamp: formatDate(new Date()),
    status: options.status || (options.role === 'assistant' ? 'pending' : undefined),
    modelId: options.modelId,
    parentMessageId: options.parentMessageId,
    version: options.version,
    alternateVersions: options.alternateVersions,
    isCurrentVersion: options.isCurrentVersion !== undefined ? options.isCurrentVersion : true,
    reasoning: options.reasoning,
    reasoningTime: options.reasoningTime
  };
}

// 创建新主题
export function createTopic(title: string): any {
  return {
    id: generateId(),
    title,
    lastMessageTime: formatDate(new Date()),
    messages: [],
  };
}

/**
 * 获取模型的API ID
 * @param model 模型对象
 * @returns 用于API调用的正确模型ID
 */
export function getApiModelId(model: any): string {
  if (!model) return '';
  
  // 首先尝试使用预设模型ID
  if (model.presetModelId) {
    return model.presetModelId;
  }
  
  // 然后尝试使用name
  if (model.name && model.name.includes('gpt-') || 
      model.name.includes('claude-') || 
      model.name.includes('gemini-')) {
    return model.name;
  }
  
  // 最后尝试使用id，但仅当它看起来像有效的API模型名称
  if (model.id && (
      model.id.includes('gpt-') || 
      model.id.includes('claude-') || 
      model.id.includes('gemini-'))) {
    return model.id;
  }
  
  // 默认回退
  return model.name || model.id || '';
}

/**
 * 计算文本的token数量
 * @param text 文本内容
 * @returns token数量
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  try {
    return approximateTokenSize(text);
  } catch (error) {
    console.error('计算token失败:', error);
    // 简单估算：英文大概每4个字符一个token，中文每个字符约是一个token
    const chineseCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const otherCount = text.length - chineseCount;
    return chineseCount + Math.ceil(otherCount / 4);
  }
}
