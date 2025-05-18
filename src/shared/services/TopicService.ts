import { v4 as uuid } from 'uuid';
import type { ChatTopic, Message } from '../types';
import { AssistantService } from './index';
import store from '../store';
import { addTopic, removeTopic, updateTopic } from '../store/slices/assistantsSlice';
import { formatDateForTopicTitle } from '../utils';
import { DEFAULT_TOPIC_PROMPT } from '../config/prompts';
import { dexieStorage } from './DexieStorageService';
import { EventEmitter, EVENT_NAMES } from './EventService';

/**
 * 话题服务 - 集中处理话题的创建、关联和管理
 */
export class TopicService {
  /**
   * 获取所有话题
   */
  static async getAllTopics(): Promise<ChatTopic[]> {
    try {
      const topics = await dexieStorage.getAllTopics();
      return topics;
    } catch (error) {
      console.error('[TopicService] 获取话题失败:', error);
      return [];
    }
  }

  /**
   * 通过ID获取话题
   */
  static async getTopicById(id: string): Promise<ChatTopic | null> {
    try {
      const topic = await dexieStorage.getTopic(id);
      return topic || null;
    } catch (error) {
      console.error(`[TopicService] 获取话题 ${id} 失败:`, error);
      return null;
    }
  }

  /**
   * 创建新话题并关联到当前助手
   * 优化版本：使用EventService进行通知
   */
  static async createNewTopic(): Promise<ChatTopic | null> {
    try {
      const currentAssistantId = await this.getCurrentAssistantId();
      if (!currentAssistantId) {
        console.error('[TopicService] 无法创建话题，未找到当前助手ID');
        return null;
      }
      
      // 获取当前助手
      const assistant = await AssistantService.getCurrentAssistant();
      if (!assistant) {
        console.error('[TopicService] 无法创建话题，未找到当前助手');
        return null;
      }
      
      // 创建默认话题
      const topic = await import('./assistant/types').then(module => module.getDefaultTopic(currentAssistantId));
      
      // 保存话题到数据库
      await dexieStorage.saveTopic(topic);
      
      // 添加助手消息到话题
      await AssistantService.addAssistantMessagesToTopic({ assistant, topic });
      
      // 添加话题到Redux store
      store.dispatch(addTopic({ assistantId: currentAssistantId, topic }));
      
      // 发送事件通知其他组件
      EventEmitter.emit(EVENT_NAMES.TOPIC_CREATED, {
        topic,
        assistantId: currentAssistantId
      });
      
      return topic;
    } catch (error) {
      console.error('[TopicService] 创建新话题失败:', error);
      return null;
    }
  }

  /**
   * 获取当前助手ID (尝试多种方式)
   */
  private static async getCurrentAssistantId(): Promise<string | null> {
    try {
      const currentAssistant = await AssistantService.getCurrentAssistant();
      if (currentAssistant && currentAssistant.id) return currentAssistant.id;
    } catch (error) {
      // console.warn('[TopicService] 从AssistantService获取当前助手失败');
    }
    try {
      const storedId = await dexieStorage.getSetting('currentAssistant');
      if (storedId) return storedId;
    } catch (error) {
      // console.warn('[TopicService] 从IndexedDB获取当前助手ID失败', error);
    }
    try {
      const assistants = await AssistantService.getUserAssistants();
      if (assistants && assistants.length > 0) {
        const firstAssistant = assistants[0];
        await AssistantService.setCurrentAssistant(firstAssistant.id);
        await dexieStorage.saveSetting('currentAssistant', firstAssistant.id);
        return firstAssistant.id;
      }
    } catch (error) {
      console.error('[TopicService] 获取助手列表失败，无法确定当前助手ID');
    }
    return null;
  }

  /**
   * 清空当前话题内容
   */
  static async clearTopicContent(topicId: string): Promise<boolean> {
    if (!topicId) return false;
    try {
      store.dispatch({ type: 'messages/setTopicMessages', payload: { topicId, messages: [] } });
      EventEmitter.emit(EVENT_NAMES.CLEAR_MESSAGES, { topicId });
      return true;
    } catch (error) {
      console.error('[TopicService] 清空话题内容失败:', error);
      EventEmitter.emit(EVENT_NAMES.SERVICE_ERROR, { serviceName: 'TopicService', error, message: `Failed to clear content for topic ${topicId}` });
      return false;
    }
  }

  /**
   * 创建话题
   */
  static async createTopic(title: string, initialMessage?: string): Promise<ChatTopic> {
    try {
      const currentTime = new Date().toISOString();
      const messages: Message[] = [];
      if (initialMessage) {
        messages.push({ id: uuid(), content: initialMessage, role: 'user', timestamp: currentTime, status: 'complete' });
      }
      const topicId = uuid();
      const now = new Date();
      const formattedDate = formatDateForTopicTitle(now);

      // 尝试获取当前助手ID
      let currentAssistantId = await this.getCurrentAssistantId();
      if (!currentAssistantId) {
        console.warn('[TopicService.createTopic] 未找到当前助手ID，将使用占位符。此话题可能未正确关联助手。');
        currentAssistantId = 'unassociated_topic_assistant'; // 占位符
      }

      const newTopic: ChatTopic = {
        id: topicId,
        name: title || `新的对话 ${formattedDate}`,
        title: title || `新的对话 ${formattedDate}`,
        createdAt: currentTime,
        updatedAt: currentTime,
        lastMessageTime: currentTime,
        prompt: DEFAULT_TOPIC_PROMPT,
        messages,
        assistantId: currentAssistantId,
        isNameManuallyEdited: false
      };
      await dexieStorage.saveTopic(newTopic);
      const verifyTopic = await dexieStorage.getTopic(topicId);
      if (!verifyTopic) {
        // console.warn(`[TopicService] 话题 ${topicId} 保存后验证失败，尝试重新保存`);
        await dexieStorage.saveTopic(newTopic);
        const secondVerify = await dexieStorage.getTopic(topicId);
        if (!secondVerify) {
          console.error(`[TopicService] 话题 ${topicId} 第二次保存仍然失败`);
          throw new Error(`话题创建失败: 无法保存到数据库`);
        }
        // console.log(`[TopicService] 话题 ${topicId} 第二次保存成功`);
      } else {
        // console.log(`[TopicService] 话题 ${topicId} 成功保存并验证`);
      }
      return newTopic;
    } catch (error) {
      console.error('[TopicService] 创建独立话题失败:', error);
      throw error;
    }
  }

  /**
   * 保存话题
   */
  static async saveTopic(topic: ChatTopic): Promise<void> {
    try {
      // 保存到数据库
      await dexieStorage.saveTopic(topic);
      
      // 如果话题有关联的助手ID，更新 Redux store 中的话题
      if (topic.assistantId) {
        store.dispatch(updateTopic({
          assistantId: topic.assistantId,
          topic
        }));
      }
    } catch (error) {
      console.error(`[TopicService] 保存话题 ${topic.id} 失败:`, error);
      EventEmitter.emit(EVENT_NAMES.SERVICE_ERROR, { serviceName: 'TopicService', error, message: `Failed to save topic ${topic.id}` });
      throw error;
    }
  }

  /**
   * 删除话题
   */
  static async deleteTopic(id: string): Promise<void> {
    try {
      // 在删除话题之前，获取话题信息以确定其关联的助手
      const topic = await this.getTopicById(id);
      const assistantId = topic?.assistantId;
      
      // 删除话题
      await dexieStorage.deleteTopic(id);
      
      // 如果找到关联的助手ID，更新 Redux store 中的助手状态
      if (assistantId) {
        // 更新助手的 topicIds 数组（通过 AssistantService）
        await AssistantService.removeTopicFromAssistant(assistantId, id);
        
        // 更新 Redux store 中的助手话题数组
        store.dispatch(removeTopic({ assistantId, topicId: id }));
      }
      
      // 发送删除话题事件
      EventEmitter.emit(EVENT_NAMES.TOPIC_DELETED, { topicId: id, assistantId });
    } catch (error) {
      console.error(`[TopicService] 删除话题 ${id} 失败:`, error);
      EventEmitter.emit(EVENT_NAMES.SERVICE_ERROR, { serviceName: 'TopicService', error, message: `Failed to delete topic ${id}` });
      throw error;
    }
  }

  /**
   * 添加消息到话题
   */
  static async addMessageToTopic(topicId: string, message: Message): Promise<void> {
    try {
      const topic = await this.getTopicById(topicId);
      if (!topic) {
        const errorMessage = `[TopicService] Add message failed: Topic with ID ${topicId} not found.`;
        console.error(errorMessage);
        EventEmitter.emit(EVENT_NAMES.SERVICE_ERROR, { serviceName: 'TopicService', error: new Error(errorMessage), message: errorMessage });
        throw new Error(errorMessage);
      }
      
      // 将消息添加到话题
      topic.messages.push(message);
      topic.lastMessageTime = message.timestamp;
      
      // 保存话题到数据库
      await dexieStorage.saveTopic(topic);
      
      // 如果话题有关联的助手ID，更新 Redux store 中的话题
      if (topic.assistantId) {
        store.dispatch(updateTopic({
          assistantId: topic.assistantId,
          topic
        }));
      }
    } catch (error) {
      console.error(`[TopicService] Error in addMessageToTopic for topic ${topicId}:`, error);
      throw error;
    }
  }

  /**
   * 获取所有话题消息
   */
  static async getAllMessages(): Promise<{[topicId: string]: Message[]}> {
    try {
      const topics = await this.getAllTopics();
      const result: {[topicId: string]: Message[]} = {};
      topics.forEach(topic => { result[topic.id] = topic.messages; });
      return result;
    } catch (error) {
      console.error('[TopicService] 获取所有消息失败:', error);
      return {};
    }
  }

  /**
   * 处理消息中的图片引用 - 已废弃
   * @deprecated 此方法已废弃，将在未来版本中移除。请使用新的图片处理机制。
   */
  static async processMessageImageData(message: Message): Promise<Message> {
    EventEmitter.emit(EVENT_NAMES.IMAGE_PROCESSING_DEPRECATED, { method: 'processMessageImageData', messageId: message.id });
    console.warn('[TopicService] processMessageImageData 已废弃，返回原始消息');
    return message;
  }

  // The following private static method is deprecated and no longer called internally.
  // It can be safely removed to resolve the "declared but its value is never read" error.
  /*
  private static async replaceBase64WithImageRefs(content: string, messageId?: string): Promise<string> {
    EventEmitter.emit(EVENT_NAMES.IMAGE_PROCESSING_DEPRECATED, { method: 'replaceBase64WithImageRefs', messageId: messageId || 'unknown' });
    console.warn('[TopicService] replaceBase64WithImageRefs 已废弃，返回原始内容');
    return content;
  }
  */
}