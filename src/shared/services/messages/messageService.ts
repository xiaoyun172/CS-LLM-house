import type { Message, ChatTopic, Model } from '../../types';
import { sendChatRequest } from '../../api';
import { getStorageItem } from '../../utils/storage';
import { saveTopicToDB, getAllTopicsFromDB } from '../storageService';

/**
 * 应用上下文限制到消息列表
 */
export function applyContextLimits(messages: Message[], contextLength: number, contextCount: number): Message[] {
  // 1. 按数量限制，选择最近的N条消息
  const limitedByCountMessages = [...messages].slice(-contextCount - 1);
  
  // 2. 对每条消息应用长度限制
  return limitedByCountMessages.map(msg => {
    if (typeof msg.content === 'string' && msg.content.length > contextLength) {
      // 截断过长的消息内容
      return {
        ...msg,
        content: msg.content.substring(0, contextLength) + "..."
      };
    }
    return msg;
  });
}

/**
 * 获取上下文设置
 */
export async function getContextSettings(): Promise<{ contextLength: number; contextCount: number }> {
  let contextLength = 2000; // 默认上下文长度
  let contextCount = 10;    // 默认上下文数量
  
  try {
    const appSettings = await getStorageItem<any>('appSettings');
    if (appSettings) {
      if (appSettings.contextLength) contextLength = appSettings.contextLength;
      if (appSettings.contextCount) contextCount = appSettings.contextCount;
    }
  } catch (error) {
    console.error('读取上下文设置失败:', error);
  }
  
  return { contextLength, contextCount };
}

/**
 * 处理流式响应
 */
export async function handleChatRequest({
  messages,
  model,
  onChunk,
}: {
  messages: Message[];
  model: Model;
  onChunk: (chunk: string) => void;
}) {
  const { contextLength, contextCount } = await getContextSettings();
  
  // 应用上下文限制
  const limitedMessages = applyContextLimits(messages, contextLength, contextCount);
  
  console.log(`[handleChatRequest] 应用上下文限制 - 原始消息数: ${messages.length}, 限制后: ${limitedMessages.length}, 长度限制: ${contextLength}`);
  
  // 发送API请求
  return await sendChatRequest({
    messages: limitedMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    modelId: model.id,
    onChunk
  });
}

/**
 * 保存话题到数据库
 */
export async function saveTopics(topics: ChatTopic[]): Promise<ChatTopic[]> {
  try {
    // 使用Map按照ID去重
    const uniqueTopicsMap = new Map();
    topics.forEach((topic: ChatTopic) => {
      if (!uniqueTopicsMap.has(topic.id)) {
        uniqueTopicsMap.set(topic.id, topic);
      }
    });
    
    // 转换回数组
    const uniqueTopics = Array.from(uniqueTopicsMap.values());
    
    // 将每个话题保存到IndexedDB
    for (const topic of uniqueTopics) {
      await saveTopicToDB(topic);
    }
    
    return uniqueTopics;
  } catch (error) {
    console.error('保存话题到数据库失败:', error);
    return topics;
  }
}

/**
 * 从数据库加载话题
 */
export async function loadTopics(): Promise<ChatTopic[]> {
  try {
    // 直接从数据库获取所有话题
    const topics = await getAllTopicsFromDB();
    return topics;
  } catch (error) {
    console.error('从数据库加载话题失败:', error);
    return [];
  }
}

// 为向后兼容保留，但功能已迁移到IndexedDB
export const saveTopicsToLocalStorage = saveTopics;
export const loadTopicsFromLocalStorage = loadTopics; 