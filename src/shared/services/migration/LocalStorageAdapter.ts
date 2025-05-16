import { BaseDataSourceAdapter } from './DataSourceAdapter';
import type { ImageData } from './DataSourceAdapter';
import type { Assistant } from '../../types/Assistant';
import type { ChatTopic } from '../../types';

/**
 * localStorage数据源适配器
 * 用于从旧版localStorage中迁移数据
 */
export class LocalStorageAdapter extends BaseDataSourceAdapter {
  constructor() {
    super('localStorage');
  }
  
  /**
   * 检查localStorage数据源是否可用
   */
  async checkAvailability(): Promise<boolean> {
    try {
      // 检查是否支持localStorage
      if (typeof localStorage === 'undefined') {
        return false;
      }
      
      // 检查是否有旧数据
      const hasAssistants = !!localStorage.getItem('assistants');
      const hasTopics = !!localStorage.getItem('topics');
      
      return hasAssistants || hasTopics;
    } catch (error) {
      console.error('检查localStorage可用性失败:', error);
      return false;
    }
  }
  
  /**
   * 从localStorage获取助手数据
   */
  async getAssistants(): Promise<Assistant[]> {
    try {
      const assistantsJson = localStorage.getItem('assistants');
      if (!assistantsJson) {
        return [];
      }
      
      const assistants = JSON.parse(assistantsJson);
      
      // 确保是数组
      if (!Array.isArray(assistants)) {
        if (typeof assistants === 'object' && assistants !== null) {
          // 处理对象格式的助手数据
          return Object.values(assistants);
        }
        return [];
      }
      
      return assistants;
    } catch (error) {
      console.error('从localStorage获取助手数据失败:', error);
      return [];
    }
  }
  
  /**
   * 从localStorage获取话题数据
   */
  async getTopics(): Promise<ChatTopic[]> {
    try {
      const topicsJson = localStorage.getItem('topics');
      const messagesJson = localStorage.getItem('messages');
      
      if (!topicsJson) {
        return [];
      }
      
      const topics = JSON.parse(topicsJson);
      
      // 确保是数组
      const topicsArray = Array.isArray(topics) 
        ? topics 
        : (typeof topics === 'object' && topics !== null ? Object.values(topics) : []);
      
      // 如果有消息数据，合并到话题中
      if (messagesJson) {
        const messages = JSON.parse(messagesJson);
        
        // 根据话题ID组织消息
        const messagesByTopic: Record<string, any[]> = {};
        
        // 如果消息是数组
        if (Array.isArray(messages)) {
          for (const message of messages) {
            if (message.topicId) {
              if (!messagesByTopic[message.topicId]) {
                messagesByTopic[message.topicId] = [];
              }
              messagesByTopic[message.topicId].push(message);
            }
          }
        } 
        // 如果消息是按话题ID组织的对象
        else if (typeof messages === 'object' && messages !== null) {
          for (const [topicId, topicMessages] of Object.entries(messages)) {
            if (Array.isArray(topicMessages)) {
              messagesByTopic[topicId] = topicMessages;
            }
          }
        }
        
        // 合并消息到话题
        for (const topic of topicsArray) {
          const topicMessages = messagesByTopic[topic.id] || [];
          
          // 按时间戳排序
          topicMessages.sort((a, b) => {
            const timestampA = a.timestamp || 0;
            const timestampB = b.timestamp || 0;
            return timestampA - timestampB;
          });
          
          topic.messages = topicMessages;
        }
      }
      
      // 确保每个话题都有messages数组
      for (const topic of topicsArray) {
        if (!topic.messages) {
          topic.messages = [];
        }
      }
      
      return topicsArray;
    } catch (error) {
      console.error('从localStorage获取话题数据失败:', error);
      return [];
    }
  }
  
  /**
   * 从localStorage获取图片数据
   * 注意：localStorage通常不存储二进制数据，所以这里可能只能获取Base64格式的图片
   */
  async getImages(): Promise<Record<string, ImageData>> {
    try {
      const imagesJson = localStorage.getItem('images');
      
      if (!imagesJson) {
        return {};
      }
      
      const images = JSON.parse(imagesJson);
      const result: Record<string, ImageData> = {};
      
      // 处理图片数据
      for (const [id, imageData] of Object.entries(images)) {
        if (typeof imageData === 'string' && imageData.startsWith('data:')) {
          // 处理Base64图片
          const mimeType = this.getMimeTypeFromBase64(imageData) || 'image/png';
          
          // 转换为Blob
          const blob = this.base64ToBlob(imageData, mimeType);
          
          // 添加到结果
          result[id] = {
            blob,
            metadata: {
              mimeType,
              topicId: '', // 旧数据可能没有关联话题
              messageId: '' // 旧数据可能没有关联消息
            }
          };
        }
      }
      
      return result;
    } catch (error) {
      console.error('从localStorage获取图片数据失败:', error);
      return {};
    }
  }
  
  /**
   * 从localStorage获取设置数据
   */
  async getSettings(): Promise<Record<string, any>> {
    try {
      const settingsJson = localStorage.getItem('settings');
      
      if (!settingsJson) {
        return {};
      }
      
      const settings = JSON.parse(settingsJson);
      
      // 确保是对象
      if (typeof settings !== 'object' || settings === null) {
        return {};
      }
      
      return settings;
    } catch (error) {
      console.error('从localStorage获取设置数据失败:', error);
      return {};
    }
  }
  
  /**
   * 从Base64字符串中获取MIME类型
   */
  private getMimeTypeFromBase64(base64: string): string | null {
    const matches = base64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
    return matches ? matches[1] : null;
  }
  
  /**
   * 将Base64转换为Blob
   */
  private base64ToBlob(base64: string, mimeType: string): Blob {
    // 提取Base64内容
    const base64Content = base64.includes(',') 
      ? base64.split(',')[1] 
      : base64;
    
    // 转换为Blob
    const byteCharacters = atob(base64Content);
    const byteArrays = [];
    
    for (let i = 0; i < byteCharacters.length; i += 512) {
      const slice = byteCharacters.slice(i, i + 512);
      const byteNumbers = new Array(slice.length);
      
      for (let j = 0; j < slice.length; j++) {
        byteNumbers[j] = slice.charCodeAt(j);
      }
      
      byteArrays.push(new Uint8Array(byteNumbers));
    }
    
    return new Blob(byteArrays, { type: mimeType });
  }
} 