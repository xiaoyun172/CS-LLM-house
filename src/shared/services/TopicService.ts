import { v4 as uuid } from 'uuid';
import type { ChatTopic, Message as OldMessage } from '../types';
import type { Message, MessageBlock } from '../types/newMessage.ts';
import { throttle } from 'lodash';
import { AssistantService } from './index';
import store from '../store';
import { addTopic, removeTopic, updateTopic } from '../store/slices/assistantsSlice';
import { updateOneBlock, upsertManyBlocks } from '../store/slices/messageBlocksSlice';
import { formatDateForTopicTitle } from '../utils';
import { DEFAULT_TOPIC_PROMPT } from '../config/prompts';
import { dexieStorage } from './DexieStorageService';
import { EventEmitter, EVENT_NAMES } from './EventService';
import { createUserMessage } from '../utils/messageUtils';
import { newMessagesActions } from '../store/slices/newMessagesSlice';
// 导入助手类型模块，避免动态导入
import { getDefaultTopic } from './assistant/types';

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
      console.log('[TopicService] 开始创建新话题');

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

      // 创建话题对象
      const topic = getDefaultTopic(currentAssistantId);

      // 保存到数据库
      await dexieStorage.saveTopic(topic);
      console.log('[TopicService] 已保存话题到数据库');

      // 添加助手消息到话题
      await AssistantService.addAssistantMessagesToTopic({ assistant, topic });
      console.log('[TopicService] 已添加助手消息到话题');

      // 添加话题到Redux store
      store.dispatch(addTopic({ assistantId: currentAssistantId, topic }));
      console.log('[TopicService] 已添加话题到Redux store');

      // 发送事件通知其他组件，添加type字段标识这是创建事件
      EventEmitter.emit(EVENT_NAMES.TOPIC_CREATED, {
        topic,
        assistantId: currentAssistantId,
        type: 'create' // 添加类型标识，用于在TopicTab中识别
      });
      console.log('[TopicService] 已发送话题创建事件，类型: create');

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
      // 从数据库中删除主题的所有消息
      await dexieStorage.deleteMessagesByTopicId(topicId);

      // 更新 Redux 状态
      store.dispatch({ type: 'messages/setTopicMessages', payload: { topicId, messages: [] } });
      store.dispatch(newMessagesActions.clearTopicMessages(topicId));
      
      // 发送事件通知
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
      const messages: OldMessage[] = [];
      if (initialMessage) {
        // 创建符合新格式的Message对象
        const messageId = uuid();
        messages.push({
          id: messageId,
          role: 'user',
          status: 'success',
          timestamp: currentTime,
          topicId: uuid(), // 临时ID，后面会被正确设置
          assistantId: '',
          blocks: [{
            id: uuid(),
            messageId: messageId,
            type: 'main_text',
            content: initialMessage,
            createdAt: currentTime,
            status: 'success'
          }]
        } as any);
      }
      const topicId = uuid();
      const now = new Date().toISOString();
      // 修复Date类型错误，传入Date对象而非字符串
      const formattedDate = formatDateForTopicTitle(new Date(now));

      // 尝试获取当前助手ID
      let currentAssistantId = await this.getCurrentAssistantId();
      if (!currentAssistantId) {
        console.warn('[TopicService.createTopic] 未找到当前助手ID，将使用占位符。此话题可能未正确关联助手。');
        currentAssistantId = 'unassociated_topic_assistant'; // 占位符
      }

      // 创建新的主题对象
      const newTopic: ChatTopic = {
        id: topicId,
        assistantId: currentAssistantId,
        name: title || `新的对话 ${formattedDate}`,
        title: title || `新的对话 ${formattedDate}`,
        createdAt: now,
        updatedAt: now,
        lastMessageTime: now,
        prompt: DEFAULT_TOPIC_PROMPT,
        isNameManuallyEdited: false,
        messageIds: [], // 初始化为空数组
        messages: [] // 兼容字段
      };
      await dexieStorage.saveTopic(newTopic);
      const verifyTopic = await dexieStorage.getTopic(topicId);
      if (!verifyTopic) {
        await dexieStorage.saveTopic(newTopic);
        const secondVerify = await dexieStorage.getTopic(topicId);
        if (!secondVerify) {
          console.error(`[TopicService] 话题 ${topicId} 第二次保存仍然失败`);
          throw new Error(`话题创建失败: 无法保存到数据库`);
        }
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
   * 将消息添加到话题
   */
  static async addMessageToTopic(topicId: string, message: OldMessage): Promise<void> {
    try {
      // 获取话题
      const topic = await this.getTopicById(topicId);
      if (!topic) throw new Error(`找不到话题: ${topicId}`);

      // 更新话题的最后消息时间
      topic.lastMessageTime = (message as any).timestamp || new Date().toISOString();
      topic.updatedAt = new Date().toISOString();

      // 如果消息没有assistantId, 添加话题所属助手ID
      if (!message.assistantId && topic.assistantId) {
        message.assistantId = topic.assistantId;
      }

      // 如果消息没有topicId, 添加话题ID
      if (!message.topicId) {
        message.topicId = topicId;
      }

      // 将消息添加到话题
      if (!topic.messages) {
        topic.messages = [];
      }

      // 必须使用as any来处理类型不匹配问题
      // 这里旧消息类型(OldMessage)和新消息类型(Message)之间存在不兼容
      topic.messages.push(message as any);

      // 保存话题到数据库
      await this.saveTopic(topic);

      // 如果支持新消息格式，也转换并保存为新格式
      if (this.isBlockSystemEnabled()) {
        // 获取消息文本内容 (从OldMessage类型)
        let content = '';
        if (typeof (message as any).content === 'string') {
          content = (message as any).content;
        } else if ((message as any).content && typeof (message as any).content.text === 'string') {
          content = (message as any).content.text;
        }

        // 使用createUserMessage创建新格式消息
        const { message: newMessage, blocks } = createUserMessage({
          content,
          assistantId: topic.assistantId || '',
          topicId: topic.id,
          modelId: (message as any).modelId
        });

        // 保存新格式的消息和块
        await this.saveMessageAndBlocks(newMessage, blocks);
      }

      // 通知消息添加
      EventEmitter.emit(EVENT_NAMES.SEND_MESSAGE, {
        message,
        topicId
      });
    } catch (error) {
      console.error('[TopicService] 添加消息失败:', error);
      EventEmitter.emit(EVENT_NAMES.SERVICE_ERROR, { serviceName: 'TopicService', error, message: `Failed to add message to topic ${topicId}` });
      throw error;
    }
  }

  /**
   * 保存新消息和关联的块
   * 使用完全规范化的存储方式
   */
  static async saveMessageAndBlocks(message: Message, blocks: MessageBlock[]): Promise<void> {
    try {
      // 使用事务保证原子性
      await dexieStorage.transaction('rw', [
        dexieStorage.topics,
        dexieStorage.messages,
        dexieStorage.message_blocks
      ], async () => {
        // 保存消息到messages表
        await dexieStorage.saveMessage(message);

        // 批量保存消息块
        if (blocks.length > 0) {
          await dexieStorage.bulkSaveMessageBlocks(blocks);
        }

        // 获取话题
        const topic = await dexieStorage.getTopic(message.topicId);
        if (!topic) {
          throw new Error(`Topic ${message.topicId} not found`);
        }

        // 确保messageIds数组存在
        if (!topic.messageIds) {
          topic.messageIds = [];
        }

        // 更新话题的messageIds数组
        if (!topic.messageIds.includes(message.id)) {
          topic.messageIds.push(message.id);
        }

        // 更新话题的lastMessageTime和updatedAt
        topic.updatedAt = new Date().toISOString();
        topic.lastMessageTime = topic.updatedAt;

        // 保存话题
        await dexieStorage.saveTopic(topic);
      });

      // 更新Redux状态
      store.dispatch(newMessagesActions.addMessage({
        topicId: message.topicId,
        message
      }));

      if (blocks.length > 0) {
        store.dispatch(upsertManyBlocks(blocks));
      }
    } catch (error) {
      console.error(`[TopicService] 保存消息和块失败:`, error);
      throw error;
    }
  }

  /**
   * 加载主题的所有消息
   */
  static async loadTopicMessages(topicId: string): Promise<Message[]> {
    try {
      // 从独立的messages表加载消息
      const messages = await dexieStorage.getMessagesByTopicId(topicId);

      console.log(`[TopicService] 从数据库加载了 ${messages.length} 条消息，话题ID: ${topicId}`);

      // 检查消息是否有效
      if (messages.length === 0) {
        console.warn(`[TopicService] 话题 ${topicId} 没有消息`);
        return [];
      }

      // 检查每条消息的状态
      messages.forEach(msg => {
        console.log(`[TopicService] 消息ID: ${msg.id}, 角色: ${msg.role}, 状态: ${msg.status}, 块数量: ${msg.blocks?.length || 0}`);

        // 确保消息状态正确
        if (msg.role === 'assistant' && msg.status !== 'success') {
          console.log(`[TopicService] 修正助手消息状态: ${msg.id}`);
          msg.status = 'success';
        }

        // 确保消息有块
        if (!msg.blocks || msg.blocks.length === 0) {
          console.log(`[TopicService] 消息没有块，创建默认块: ${msg.id}`);
          
          // 尝试从原始消息中获取内容，或使用空字符串
          let content = '';
          if (typeof (msg as any).content === 'string') {
            content = (msg as any).content;
          } else if (typeof (msg as any).text === 'string') {
            content = (msg as any).text;
          }
          
          const defaultBlock: MessageBlock = {
            id: uuid(),
            messageId: msg.id,
            type: 'main_text',
            content: content,  // 使用原始内容或空字符串
            createdAt: new Date().toISOString(),
            status: 'success'
          };

          msg.blocks = [defaultBlock.id];
          dexieStorage.saveMessageBlock(defaultBlock);
          dexieStorage.saveMessage(msg);
        }
      });

      // 加载所有消息块
      const messageIds = messages.map(msg => msg.id);
      const blocks: MessageBlock[] = [];

      for (const messageId of messageIds) {
        const messageBlocks = await dexieStorage.getMessageBlocksByMessageId(messageId);

        // 检查块状态
        messageBlocks.forEach(block => {
          // 确保块状态正确
          if (block.status !== 'success') {
            console.log(`[TopicService] 修正块状态: ${block.id}, 类型: ${block.type}`);
            block.status = 'success';
          }

          // 主文本块内容为空时不再设置默认内容
          // 保持为空字符串，让应用层处理空内容情况
          if (block.type === 'main_text' && (!block.content || block.content.trim() === '')) {
            console.log(`[TopicService] 发现空主文本块: ${block.id}`);
            // 不设置默认内容，保持为空或原值
          }
        });

        blocks.push(...messageBlocks);
      }

      console.log(`[TopicService] 从数据库加载了 ${blocks.length} 个块`);

      // 更新Redux状态 - 使用newMessagesActions
      store.dispatch(newMessagesActions.messagesReceived({
        topicId,
        messages
      }));

      // 同时也更新旧的messages状态，确保兼容性
      store.dispatch({
        type: 'messages/setTopicMessages',
        payload: { topicId, messages }
      });

      if (blocks.length > 0) {
        store.dispatch(upsertManyBlocks(blocks));
      }

      console.log(`[TopicService] 已加载话题 ${topicId} 的 ${messages.length} 条消息和 ${blocks.length} 个块`);

      return messages;
    } catch (error) {
      console.error(`[TopicService] 加载主题消息失败:`, error);
      return [];
    }
  }

  // 节流更新块内容
  private static throttledBlockUpdate = throttle(async (id: string, blockUpdate: Partial<MessageBlock>) => {
    store.dispatch(updateOneBlock({ id, changes: blockUpdate }));
    await dexieStorage.message_blocks.update(id, blockUpdate);
  }, 150);

  /**
   * 更新消息块内容（优化版本）
   */
  static async updateMessageBlock(block: MessageBlock): Promise<void> {
    try {
      const { id, ...blockUpdate } = block;
      // 使用节流函数更新块内容
      await this.throttledBlockUpdate(id, blockUpdate);
    } catch (error) {
      console.error(`[TopicService] 更新消息块失败:`, error);
      throw error;
    }
  }

  /**
   * 更新消息块字段
   * 统一封装块部分字段更新逻辑，替代直接调用 dexieStorage.updateMessageBlock
   */
  static async updateMessageBlockFields(blockId: string, updates: Partial<MessageBlock>): Promise<void> {
    try {
      // 确保有更新时间戳
      if (!updates.updatedAt) {
        updates.updatedAt = new Date().toISOString();
      }

      // 更新数据库
      await dexieStorage.updateMessageBlock(blockId, updates);

      // 更新Redux状态
      store.dispatch(updateOneBlock({
        id: blockId,
        changes: updates
      }));
    } catch (error) {
      console.error(`[TopicService] 更新消息块字段失败:`, error);
      throw error;
    }
  }

  /**
   * 获取消息的所有块
   */
  static async getMessageBlocks(messageId: string): Promise<MessageBlock[]> {
    try {
      return await dexieStorage.getMessageBlocksByMessageId(messageId);
    } catch (error) {
      console.error(`[TopicService] 获取消息的块失败:`, error);
      return [];
    }
  }

  /**
   * 删除消息及其所有块
   */
  static async deleteMessageWithBlocks(messageId: string, topicId: string): Promise<void> {
    try {
      // 获取话题
      const topic = await this.getTopicById(topicId);
      if (!topic) {
        throw new Error(`Topic ${topicId} not found`);
      }

      // 删除消息块
      await dexieStorage.deleteMessageBlocksByMessageId(messageId);

      // 删除旧格式消息
      const messages = topic.messages || [];
      topic.messages = messages.filter(m => m.id !== messageId);

      // 删除消息ID
      if (topic.messageIds) {
        topic.messageIds = topic.messageIds.filter(id => id !== messageId);
      }

      // 更新话题
      await dexieStorage.saveTopic(topic);

      // 更新Redux状态
      if (topic.assistantId) {
        store.dispatch(updateTopic({
          assistantId: topic.assistantId,
          topic
        }));
      }
    } catch (error) {
      console.error(`[TopicService] 删除消息及块失败:`, error);
      throw error;
    }
  }

  /**
   * 获取所有消息
   */
  static async getAllMessages(): Promise<{[topicId: string]: OldMessage[]}> {
    const result: {[topicId: string]: OldMessage[]} = {};
    try {
      const topics = await this.getAllTopics();
      topics.forEach(topic => {
        // 确保不会出现undefined
        result[topic.id] = topic.messages || [];
      });
      return result;
    } catch (error) {
      console.error('[TopicService] 获取所有消息失败:', error);
      return result;
    }
  }

  /**
   * 处理消息中的图片数据
   */
  static async processMessageImageData(message: Message): Promise<Message> {
    // 此方法保持不变，处理旧消息格式中的图片数据
    return message;
  }

  // 检查是否启用块系统
  private static isBlockSystemEnabled(): boolean {
    // 可以从配置或设置中读取是否启用块系统
    return true; // 默认启用
  }
}