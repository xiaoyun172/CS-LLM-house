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
import { handleError } from '../utils/error';

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
      handleError(error, 'TopicService.getAllTopics', {
        logLevel: 'ERROR'
      });
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
      handleError(error, 'TopicService.getTopicById', {
        logLevel: 'ERROR',
        additionalData: { topicId: id }
      });
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
      handleError(error, 'TopicService.createNewTopic', {
        logLevel: 'ERROR'
      });
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
      // 获取话题
      const topic = await dexieStorage.getTopic(topicId);
      if (!topic) {
        console.warn(`[TopicService] 清空话题内容失败: 话题 ${topicId} 不存在`);
        return false;
      }

      // 使用事务保证原子性
      await dexieStorage.transaction('rw', [
        dexieStorage.topics,
        dexieStorage.messages,
        dexieStorage.message_blocks
      ], async () => {
        // 1. 从数据库中删除主题的所有消息块
        const messages = await dexieStorage.getMessagesByTopicId(topicId);
        for (const message of messages) {
          if (message.blocks && message.blocks.length > 0) {
            await dexieStorage.deleteMessageBlocksByIds(message.blocks);
          }
        }

        // 2. 从数据库中删除主题的所有消息
        await dexieStorage.messages.where('topicId').equals(topicId).delete();

        // 3. 清空话题的messages数组和messageIds数组
        topic.messages = [];
        topic.messageIds = [];
        await dexieStorage.topics.put(topic);
      });

      console.log(`[TopicService] 已清空话题 ${topicId} 的所有消息`);

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
  /**
   * 保存新消息和关联的块
   * 使用最佳实例原版的存储方式：将消息直接存储在topics表中，并使用事务确保数据一致性
   */
  static async saveMessageAndBlocks(message: Message, blocks: MessageBlock[]): Promise<void> {
    try {
      // 使用事务保证原子性
      await dexieStorage.transaction('rw', [
        dexieStorage.topics,
        dexieStorage.messages,
        dexieStorage.message_blocks
      ], async () => {
        // 批量保存消息块
        if (blocks.length > 0) {
          await dexieStorage.bulkSaveMessageBlocks(blocks);
        }

        // 获取话题
        const topic = await dexieStorage.topics.get(message.topicId);
        if (!topic) {
          throw new Error(`Topic ${message.topicId} not found`);
        }

        // 确保messages数组存在
        if (!topic.messages) {
          topic.messages = [];
        }

        // 查找消息在数组中的位置
        const messageIndex = topic.messages.findIndex(m => m.id === message.id);

        // 更新或添加消息
        if (messageIndex >= 0) {
          topic.messages[messageIndex] = message;
        } else {
          topic.messages.push(message);
        }

        // 同时更新messageIds数组（保持兼容性）
        if (!topic.messageIds) {
          topic.messageIds = [];
        }

        if (!topic.messageIds.includes(message.id)) {
          topic.messageIds.push(message.id);
        }

        // 更新话题的lastMessageTime和updatedAt
        topic.updatedAt = new Date().toISOString();
        topic.lastMessageTime = topic.updatedAt;

        // 保存话题
        await dexieStorage.topics.put(topic);

        // 保存消息到messages表（保持兼容性）
        await dexieStorage.messages.put(message);
      });

      // 更新Redux状态
      store.dispatch(newMessagesActions.addMessage({
        topicId: message.topicId,
        message
      }));

      if (blocks.length > 0) {
        store.dispatch(upsertManyBlocks(blocks));
      }

      console.log(`[TopicService] 已保存消息 ${message.id} 和 ${blocks.length} 个块到话题 ${message.topicId}`);
    } catch (error) {
      console.error(`[TopicService] 保存消息和块失败:`, error);
      throw error;
    }
  }

  /**
   * 加载主题的所有消息
   */
  /**
   * 加载主题的所有消息
   * 使用最佳实例原版的方式：直接从topics表中获取消息
   */
  static async loadTopicMessages(topicId: string): Promise<Message[]> {
    try {

      // 获取话题
      const topic = await dexieStorage.topics.get(topicId);
      if (!topic) {
        console.warn(`[TopicService] 话题 ${topicId} 不存在`);
        return [];
      }

      // 使用最佳实例原版方式：直接从topics表中获取消息
      let messages: Message[] = [];

      // 优先使用messages数组
      if (topic.messages && Array.isArray(topic.messages) && topic.messages.length > 0) {
        messages = topic.messages;
      }
      // 如果没有messages数组，但有messageIds，则从messages表加载
      else if (topic.messageIds && Array.isArray(topic.messageIds) && topic.messageIds.length > 0) {
        console.log(`[TopicService] 从messageIds加载 ${topic.messageIds.length} 条消息`);

        // 使用事务加载所有消息和块
        await dexieStorage.transaction('rw', [
          dexieStorage.topics,
          dexieStorage.messages,
          dexieStorage.message_blocks
        ], async () => {
          // 从messages表加载消息
          for (const messageId of topic.messageIds) {
            const message = await dexieStorage.messages.get(messageId);
            if (message) messages.push(message);
          }

          // 更新topic.messages数组
          topic.messages = messages;
          await dexieStorage.topics.put(topic);
        });
      } else {
        console.warn(`[TopicService] 话题 ${topicId} 没有消息`);
        return [];
      }

      // 检查消息是否有效
      if (messages.length === 0) {
        console.warn(`[TopicService] 话题 ${topicId} 没有有效消息`);
        return [];
      }

      console.log(`[TopicService] 从数据库加载了 ${messages.length} 条消息`);

      // 检查每条消息的状态并修复
      for (const msg of messages) {
        // 确保消息状态正确
        if (msg.role === 'assistant' && msg.status !== 'success' && msg.status !== 'error') {
          console.log(`[TopicService] 修正助手消息状态: ${msg.id}`);
          msg.status = 'success';
        }

        // 调试：打印每条消息的详细信息
        console.log(`[TopicService] 消息详情:`, {
          id: msg.id,
          role: msg.role,
          hasBlocks: !!(msg.blocks && msg.blocks.length > 0),
          blocksCount: msg.blocks ? msg.blocks.length : 0,
          blocks: msg.blocks
        });
      }

      // 收集所有块ID
      const blocksToLoad: string[] = [];
      for (const msg of messages) {
        if (msg.blocks && msg.blocks.length > 0) {
          blocksToLoad.push(...msg.blocks);
        }
      }

      console.log(`[TopicService] 需要加载 ${blocksToLoad.length} 个块:`, blocksToLoad);

      // 加载所有消息块
      const blocks: MessageBlock[] = [];

      for (const blockId of blocksToLoad) {
        const block = await dexieStorage.getMessageBlock(blockId);
        if (block) {
          console.log(`[TopicService] 加载块:`, {
            id: block.id,
            messageId: block.messageId,
            type: block.type,
            hasContent: !!(block as any).content,
            contentLength: (block as any).content ? (block as any).content.length : 0,
            status: block.status
          });

          // 🔥 修复：处理工具块状态恢复，考虑多个工具的情况
          if (!block.status || (typeof block.status !== 'string')) {
            // 状态无效，修复为 success
            console.log(`[TopicService] 修复无效块状态: ${block.id} - 从 ${block.status} 改为 success`);
            block.status = 'success';
            await dexieStorage.updateMessageBlock(block.id, { status: 'success' });
          } else if (block.type === 'tool' && (block.status === 'processing' || block.status === 'streaming' || block.status === 'pending')) {
            // 🔥 关键修复：工具块在重启后如果还是未完成状态，应该设为已完成
            // 因为重启意味着之前的工具执行已经中断，应该被视为已完成
            console.log(`[TopicService] 修复工具块未完成状态: ${block.id} - 从 ${block.status} 改为 success`);
            block.status = 'success';
            await dexieStorage.updateMessageBlock(block.id, { status: 'success' });
          } else {
            // 保持原有状态（success、error 等已完成状态）
            console.log(`[TopicService] 保持块状态: ${block.id} - ${block.status} (类型: ${block.type})`);
          }

          blocks.push(block);
        } else {
          console.warn(`[TopicService] 找不到块: ${blockId}`);
        }
      }

      console.log(`[TopicService] 从数据库加载了 ${blocks.length} 个块`);

      // 更新Redux状态
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
  /**
   * 更新消息块字段
   * 使用事务确保数据一致性
   */
  static async updateMessageBlockFields(blockId: string, updates: Partial<MessageBlock>): Promise<void> {
    try {
      // 确保有更新时间戳
      if (!updates.updatedAt) {
        updates.updatedAt = new Date().toISOString();
      }

      // 获取块信息
      const block = await dexieStorage.getMessageBlock(blockId);
      if (!block) {
        throw new Error(`Block ${blockId} not found`);
      }

      // 使用事务保证原子性
      await dexieStorage.transaction('rw', [
        dexieStorage.topics,
        dexieStorage.messages,
        dexieStorage.message_blocks
      ], async () => {
        // 更新数据库中的块
        await dexieStorage.updateMessageBlock(blockId, updates);

        // 如果块状态发生变化，可能需要更新消息状态
        if (updates.status && block.status !== updates.status) {
          const message = await dexieStorage.getMessage(block.messageId);
          if (message && message.role === 'assistant') {
            // 如果块状态为ERROR，则消息状态也设为ERROR
            if (updates.status === 'error') {
              await dexieStorage.updateMessage(message.id, {
                status: 'error',
                updatedAt: new Date().toISOString()
              });

              // 更新Redux状态
              store.dispatch({
                type: 'normalizedMessages/updateMessageStatus',
                payload: {
                  topicId: message.topicId,
                  messageId: message.id,
                  status: 'error'
                }
              });
            }
          }
        }
      });

      // 更新Redux状态
      store.dispatch(updateOneBlock({
        id: blockId,
        changes: updates
      }));

      console.log(`[TopicService] 已更新消息块 ${blockId} 字段:`, updates);
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

  /**
   * 创建主题分支
   * 从当前主题的指定消息创建一个新的分支主题
   * @param sourceTopicId 源主题ID
   * @param branchPointMessageId 分支点消息ID
   * @returns 创建的新主题，如果失败则返回null
   */
  static async createTopicBranch(sourceTopicId: string, branchPointMessageId: string): Promise<ChatTopic | null> {
    try {
      console.log(`[TopicService] 开始创建主题分支，源主题: ${sourceTopicId}, 分支点消息: ${branchPointMessageId}`);

      // 获取源主题信息
      const sourceTopic = await this.getTopicById(sourceTopicId);
      if (!sourceTopic) {
        console.error(`[TopicService] 找不到源主题: ${sourceTopicId}`);
        return null;
      }

      // 创建新主题
      const newTopic = await this.createTopic(`${sourceTopic.name} (分支)`);
      if (!newTopic) {
        console.error('[TopicService] 创建分支主题失败');
        return null;
      }

      // 获取源主题的所有消息
      const sourceMessages = await dexieStorage.getMessagesByTopicId(sourceTopicId);
      if (!sourceMessages || sourceMessages.length === 0) {
        console.warn(`[TopicService] 源主题 ${sourceTopicId} 没有消息可克隆`);
        return newTopic; // 返回空主题
      }

      // 找到分支点消息的索引
      const branchPointIndex = sourceMessages.findIndex(msg => msg.id === branchPointMessageId);
      if (branchPointIndex === -1) {
        console.error(`[TopicService] 找不到分支点消息 ${branchPointMessageId}`);
        return newTopic; // 返回空主题
      }

      // 获取需要克隆的消息（包括分支点消息）
      const messagesToClone = sourceMessages.slice(0, branchPointIndex + 1);
      console.log(`[TopicService] 将克隆 ${messagesToClone.length} 条消息`);

      // 克隆每条消息及其块
      const clonedMessages: Message[] = [];
      const allClonedBlocks: MessageBlock[] = [];

      for (const originalMessage of messagesToClone) {
        // 获取原始消息的块
        const originalBlocks = await dexieStorage.getMessageBlocksByMessageId(originalMessage.id);

        // 创建新消息ID
        const newMessageId = uuid();

        // 克隆消息
        const clonedMessage: Message = {
          ...originalMessage,
          id: newMessageId,
          topicId: newTopic.id,
          blocks: [], // 先清空块列表，后面会重新添加
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // 克隆块并关联到新消息
        const clonedBlocks: MessageBlock[] = [];

        for (const originalBlock of originalBlocks) {
          const newBlockId = uuid();

          const clonedBlock: MessageBlock = {
            ...originalBlock,
            id: newBlockId,
            messageId: newMessageId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          clonedBlocks.push(clonedBlock);
          clonedMessage.blocks.push(newBlockId);
        }

        // 添加到集合中
        clonedMessages.push(clonedMessage);
        allClonedBlocks.push(...clonedBlocks);
      }

      // 保存克隆的消息和块到数据库
      await dexieStorage.transaction('rw', [
        dexieStorage.topics,
        dexieStorage.messages,
        dexieStorage.message_blocks
      ], async () => {
        // 保存消息块
        if (allClonedBlocks.length > 0) {
          await dexieStorage.bulkSaveMessageBlocks(allClonedBlocks);
        }

        // 保存消息
        for (const message of clonedMessages) {
          await dexieStorage.messages.put(message);
        }

        // 更新主题
        newTopic.messageIds = clonedMessages.map(m => m.id);
        newTopic.messages = clonedMessages;

        // 更新lastMessageTime
        if (clonedMessages.length > 0) {
          const lastMessage = clonedMessages[clonedMessages.length - 1];
          newTopic.lastMessageTime = lastMessage.createdAt || lastMessage.updatedAt || new Date().toISOString();
        }

        // 保存更新后的主题
        await dexieStorage.saveTopic(newTopic);
      });

      // 更新Redux状态
      // 添加消息到Redux
      for (const message of clonedMessages) {
        store.dispatch(newMessagesActions.addMessage({
          topicId: newTopic.id,
          message
        }));
      }

      // 添加块到Redux
      if (allClonedBlocks.length > 0) {
        store.dispatch(upsertManyBlocks(allClonedBlocks));
      }

      console.log(`[TopicService] 成功克隆 ${clonedMessages.length} 条消息和 ${allClonedBlocks.length} 个块到新主题 ${newTopic.id}`);

      // 设置当前主题为新创建的分支主题
      store.dispatch(newMessagesActions.setCurrentTopicId(newTopic.id));

      return newTopic;
    } catch (error) {
      console.error('[TopicService] 创建主题分支失败:', error);
      return null;
    }
  }
}