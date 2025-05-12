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
  role: 'user' | 'assistant';
  status?: 'pending' | 'complete' | 'error';
  modelId?: string;
}): any {
  return {
    id: generateId(),
    content: options.content,
    role: options.role,
    timestamp: formatDate(new Date()),
    status: options.status || (options.role === 'assistant' ? 'pending' : undefined),
    modelId: options.modelId
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
