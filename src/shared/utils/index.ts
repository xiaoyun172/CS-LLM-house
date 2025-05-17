import { v4 as uuidv4 } from 'uuid';
import { approximateTokenSize } from 'tokenx';
import type { Message, MessageContent, SiliconFlowImageFormat } from '../types';

/**
 * 生成UUID
 * @returns {string} UUID
 */
export const uuid = (): string => uuidv4();

/**
 * 生成唯一ID
 * @returns {string} 唯一ID
 */
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

/**
 * 生成短唯一ID，与generateId类似但更短
 * @returns {string} 短唯一ID
 */
export const nanoid = (): string => {
  return Math.random().toString(36).substring(2, 10);
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

/**
 * 格式化日期时间为对话标题格式
 * @param date 日期对象
 * @returns 格式化后的日期时间字符串，如"05-20 15:30"
 */
export function formatDateForTopicTitle(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${month}-${day} ${hours}:${minutes}`;
}

/**
 * 创建一个新的消息对象
 * @param options 消息选项
 * @returns 新的消息对象
 */
export function createMessage(options: {
  content: MessageContent;
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
  images?: SiliconFlowImageFormat[];
}): Message {
  const {
    content,
    role,
    status = 'complete',
    modelId,
    id = uuid(),
    parentMessageId,
    version = 1,
    alternateVersions = [],
    isCurrentVersion = true,
    reasoning,
    reasoningTime,
    images
  } = options;

  return {
    id,
    content,
    role,
    timestamp: new Date().toISOString(),
    status,
    modelId,
    parentMessageId,
    version,
    alternateVersions,
    isCurrentVersion,
    reasoning,
    reasoningTime,
    images
  };
}

// 创建新主题
export function createTopic(title: string): any {
  const now = new Date();
  // 如果没有提供标题，使用带时间的默认标题
  const topicTitle = title || `新的对话 ${formatDateForTopicTitle(now)}`;
  return {
    id: uuid(),
    title: topicTitle,
    lastMessageTime: formatDate(now),
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
