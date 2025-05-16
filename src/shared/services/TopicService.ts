import { Preferences } from '@capacitor/preferences';
import { v4 as uuid } from 'uuid';
import type { ChatTopic, Message } from '../types';
import { DataService } from './DataService';
import { AssistantService } from './index';
import store from '../store';
import { createTopic, setCurrentTopic } from '../store/messagesSlice';

// 获取DataService实例
const dataService = DataService.getInstance();

// 存储键名 - 用于兼容旧版数据
const TOPICS_STORAGE_KEY = 'chatTopics';

/**
 * 话题服务 - 集中处理话题的创建、关联和管理
 */
export class TopicService {
  /**
   * 获取所有话题
   */
  static async getAllTopics(): Promise<ChatTopic[]> {
    try {
      // 优先从DataService获取数据
      try {
        const topics = await dataService.getAllTopics();
        if (topics && topics.length > 0) {
          return topics;
        }
      } catch (error) {
        console.warn('从DataService获取话题失败，尝试使用兼容模式', error);
      }
      
      // 兼容模式：从Preferences获取
      const { value } = await Preferences.get({ key: TOPICS_STORAGE_KEY });
      if (!value) return [];
      
      const topics = JSON.parse(value);
      
      // 迁移到DataService
      this.migrateTopicsToDataService(topics);
      
      return topics;
    } catch (error) {
      console.error('获取话题失败:', error);
      return [];
    }
  }
  
  /**
   * 将话题数据迁移到DataService
   */
  private static async migrateTopicsToDataService(topics: ChatTopic[]): Promise<void> {
    try {
      for (const topic of topics) {
        await dataService.saveTopic(topic);
      }
      console.log(`成功迁移 ${topics.length} 个话题到DataService`);
    } catch (error) {
      console.error('话题数据迁移失败:', error);
    }
  }
  
  /**
   * 通过ID获取话题
   */
  static async getTopicById(id: string): Promise<ChatTopic | null> {
    try {
      // 优先从DataService获取
      try {
        const topic = await dataService.getTopic(id);
        if (topic) {
          return topic;
        }
      } catch (error) {
        console.warn(`从DataService获取话题 ${id} 失败，尝试使用兼容模式`, error);
      }
      
      // 兼容模式：从所有话题中查找
      const topics = await this.getAllTopics();
      return topics.find(topic => topic.id === id) || null;
    } catch (error) {
      console.error(`获取话题 ${id} 失败:`, error);
      return null;
    }
  }
  
  /**
   * 创建新话题并关联到当前助手
   * 所有组件应该使用这个统一方法创建话题
   */
  static async createNewTopic(): Promise<ChatTopic | null> {
    try {
      // 1. 获取当前助手ID
      const currentAssistantId = await this.getCurrentAssistantId();
      if (!currentAssistantId) {
        console.error('TopicService: 无法创建话题，未找到当前助手ID');
        return null;
      }

      // 2. 创建话题对象
      const topicId = uuid();
      const newTopic: ChatTopic = {
        id: topicId,
        title: '新话题 ' + new Date().toLocaleTimeString(),
        lastMessageTime: new Date().toISOString(),
        messages: []
      };

      console.log('TopicService: 创建新话题', newTopic.title);

      // 3. 添加到Redux (先创建再关联是关键)
      store.dispatch(createTopic(newTopic));
      store.dispatch({ type: 'FORCE_TOPICS_UPDATE' });

      // 4. 关联话题到助手
      await AssistantService.addTopicToAssistant(currentAssistantId, topicId);

      // 5. 设置为当前话题
      store.dispatch(setCurrentTopic(newTopic));

      // 6. 通知组件更新 (派发事件)
      this.notifyTopicCreated(newTopic, currentAssistantId);

      // 7. 延时确保UI更新
      setTimeout(() => {
        store.dispatch(setCurrentTopic(newTopic));
        this.notifyTopicCreated(newTopic, currentAssistantId);
      }, 200);

      return newTopic;
    } catch (error) {
      console.error('TopicService: 创建话题失败', error);
      return null;
    }
  }

  /**
   * 获取当前助手ID (尝试多种方式)
   */
  private static async getCurrentAssistantId(): Promise<string | null> {
    // 首先尝试从AssistantService获取
    try {
      const currentAssistant = await AssistantService.getCurrentAssistant();
      if (currentAssistant && currentAssistant.id) {
        return currentAssistant.id;
      }
    } catch (error) {
      console.warn('TopicService: 从AssistantService获取当前助手失败');
    }

    // 尝试从localStorage获取
    const storedId = localStorage.getItem('currentAssistant');
    if (storedId) {
      return storedId;
    }

    // 最后尝试获取第一个可用助手
    try {
      const assistants = await AssistantService.getUserAssistants();
      if (assistants && assistants.length > 0) {
        const firstAssistant = assistants[0];
        // 更新当前助手
        await AssistantService.setCurrentAssistant(firstAssistant.id);
        localStorage.setItem('currentAssistant', firstAssistant.id);
        return firstAssistant.id;
      }
    } catch (error) {
      console.error('TopicService: 获取助手列表失败');
    }

    return null;
  }

  /**
   * 派发话题创建事件
   */
  private static notifyTopicCreated(topic: ChatTopic, assistantId: string): void {
    const event = new CustomEvent('topicCreated', {
      detail: {
        topic,
        assistantId
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * 清空当前话题内容
   */
  static async clearTopicContent(topicId: string): Promise<boolean> {
    if (!topicId) return false;

    try {
      // 派发清空消息的action
      store.dispatch({
        type: 'messages/setTopicMessages',
        payload: {
          topicId,
          messages: []
        }
      });

      // 强制更新
      store.dispatch({ type: 'FORCE_MESSAGES_UPDATE' });

      // 通知组件
      const event = new CustomEvent('topicCleared', {
        detail: { topicId }
      });
      window.dispatchEvent(event);

      return true;
    } catch (error) {
      console.error('TopicService: 清空话题内容失败', error);
      return false;
    }
  }
  
  /**
   * 创建新话题
   */
  static async createTopic(title: string, initialMessage?: string): Promise<ChatTopic> {
    try {
      console.log(`TopicService: 开始创建话题 "${title}"`);
    const currentTime = new Date().toISOString();
    
    // 创建初始消息
    const messages: Message[] = [];
    if (initialMessage) {
      messages.push({
        id: uuid(),
        content: initialMessage,
        role: 'user',
        timestamp: currentTime,
        status: 'complete'
      });
    }
      
      // 使用确定性强的ID生成，避免时间差异导致的问题
      const topicId = uuid();
      console.log(`TopicService: 生成话题ID: ${topicId}`);
    
    // 创建新话题
    const newTopic: ChatTopic = {
        id: topicId,
      title: title || '新话题',
      lastMessageTime: currentTime,
      messages
    };
    
      // 保存到DataService
      console.log(`TopicService: 正在保存话题 ${topicId} 到数据库`);
      await dataService.saveTopic(newTopic);
      
      // 验证话题是否被成功保存
      const verifyTopic = await dataService.getTopic(topicId);
      if (!verifyTopic) {
        console.error(`TopicService: 话题 ${topicId} 保存后验证失败，尝试重新保存`);
        // 再次尝试保存
        await dataService.saveTopic(newTopic);
        
        // 再次验证
        const secondVerify = await dataService.getTopic(topicId);
        if (!secondVerify) {
          console.error(`TopicService: 话题 ${topicId} 第二次保存仍然失败`);
          throw new Error(`话题创建失败: 无法保存到数据库`);
        }
        console.log(`TopicService: 话题 ${topicId} 第二次保存成功`);
      } else {
        console.log(`TopicService: 话题 ${topicId} 成功保存并验证`);
      }
    
    return newTopic;
    } catch (error) {
      console.error('创建话题失败:', error);
      throw error;
    }
  }
  
  /**
   * 保存话题
   */
  static async saveTopic(topic: ChatTopic): Promise<boolean> {
    try {
      // 保存到DataService
      await dataService.saveTopic(topic);
      
      // 兼容模式：同时更新Preferences中的话题列表
    try {
      const topics = await this.getAllTopics();
      
      // 检查是否已存在
      const index = topics.findIndex(t => t.id === topic.id);
      
      if (index >= 0) {
        // 更新现有话题
        topics[index] = topic;
      } else {
        // 添加新话题
        topics.push(topic);
      }
      
        // 保存回Preferences
      await Preferences.set({
        key: TOPICS_STORAGE_KEY,
        value: JSON.stringify(topics)
      });
      } catch (error) {
        console.warn('兼容模式保存话题失败', error);
      }
      
      return true;
    } catch (error) {
      console.error('保存话题失败:', error);
      return false;
    }
  }
  
  /**
   * 删除话题
   */
  static async deleteTopic(id: string): Promise<boolean> {
    try {
      // 从DataService删除
      await dataService.deleteTopic(id);
      
      // 兼容模式：同时更新Preferences中的话题列表
    try {
      const topics = await this.getAllTopics();
      const updatedTopics = topics.filter(topic => topic.id !== id);
      
        // 保存回Preferences
      await Preferences.set({
        key: TOPICS_STORAGE_KEY,
        value: JSON.stringify(updatedTopics)
      });
      } catch (error) {
        console.warn('兼容模式删除话题失败', error);
      }
      
      return true;
    } catch (error) {
      console.error(`删除话题 ${id} 失败:`, error);
      return false;
    }
  }
  
  /**
   * 添加消息到话题
   */
  static async addMessageToTopic(topicId: string, message: Message): Promise<boolean> {
    try {
      // 获取话题
      const topic = await this.getTopicById(topicId);
      if (!topic) return false;
      
      // 添加消息
      topic.messages.push(message);
      topic.lastMessageTime = message.timestamp;
      
      // 保存话题
      return await this.saveTopic(topic);
    } catch (error) {
      console.error(`向话题 ${topicId} 添加消息失败:`, error);
      return false;
    }
  }
  
  /**
   * 获取所有话题消息
   */
  static async getAllMessages(): Promise<{[topicId: string]: Message[]}> {
    try {
      const topics = await this.getAllTopics();
      const result: {[topicId: string]: Message[]} = {};
      
      topics.forEach(topic => {
        result[topic.id] = topic.messages;
      });
      
      return result;
    } catch (error) {
      console.error('获取所有消息失败:', error);
      return {};
    }
  }
  
  /**
   * 处理消息中的图片引用
   * 将base64图片数据保存到DataService，并替换为图片引用
   */
  static async processMessageImageData(message: Message): Promise<Message> {
    try {
      // 根据消息内容类型不同进行处理
      if (typeof message.content === 'string') {
        if (!message.content.includes('data:image')) {
          return message;
        }
        
        const processedContent = await this.replaceBase64WithImageRefs(message.content, message.id);
        
        return {
          ...message,
          content: processedContent
        };
      } else if (typeof message.content === 'object' && message.content.text) {
        // 处理对象类型的内容
        if (!message.content.text.includes('data:image')) {
          return message;
        }
        
        const processedText = await this.replaceBase64WithImageRefs(message.content.text, message.id);
        
        return {
          ...message,
          content: {
            ...message.content,
            text: processedText
          }
        };
      }
      
      return message;
    } catch (error) {
      console.error('处理消息图片数据失败:', error);
      return message;
    }
  }
  
  /**
   * 替换内容中的base64图片为图片引用
   */
  private static async replaceBase64WithImageRefs(content: string, messageId?: string): Promise<string> {
    try {
      // 匹配所有base64图片
      const imgRegex = /data:image\/(jpeg|png|gif|webp);base64,[^"')}\s]+/g;
      const matches = content.match(imgRegex);
      
      if (!matches || matches.length === 0) {
        return content;
      }
      
      let processedContent = content;
      
      for (const base64Data of matches) {
        try {
          // 提取MIME类型
          const mimeMatch = base64Data.match(/data:image\/([^;]+);base64/);
          const mimeType = mimeMatch ? `image/${mimeMatch[1]}` : 'image/png';
          
          // 保存图片数据到DataService
          const imageRef = await dataService.saveBase64Image(base64Data, {
            mimeType,
            messageId
          });
          
          // 替换base64为图片引用
          processedContent = processedContent.replace(
            base64Data, 
            `[图片:${imageRef.id}]`
          );
        } catch (error) {
          console.error('保存图片数据失败:', error);
        }
      }
      
      return processedContent;
    } catch (error) {
      console.error('替换base64图片失败:', error);
      return content;
    }
  }
} 