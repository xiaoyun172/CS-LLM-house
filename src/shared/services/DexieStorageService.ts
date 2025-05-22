import Dexie from 'dexie';
import { v4 as uuid } from 'uuid';
import type { Assistant } from '../types/Assistant';
import type { ChatTopic } from '../types';
import type { MessageBlock } from '../types';
import type { Message } from '../types/newMessage.ts';
import { DB_CONFIG } from '../types/DatabaseSchema';
import { throttle } from 'lodash';
import { makeSerializable, diagnoseSerializationIssues } from '../utils/serialization';

/**
 * 基于Dexie.js的统一存储服务
 * 升级版本
 */
class DexieStorageService extends Dexie {
  assistants!: Dexie.Table<Assistant, string>;
  topics!: Dexie.Table<ChatTopic & { _lastMessageTimeNum?: number }, string>;
  settings!: Dexie.Table<any, string>;
  images!: Dexie.Table<Blob, string>;
  imageMetadata!: Dexie.Table<any, string>;
  metadata!: Dexie.Table<any, string>;
  message_blocks!: Dexie.Table<MessageBlock, string>;
  messages!: Dexie.Table<Message, string>;

  private static instance: DexieStorageService;

  constructor() {
    super(DB_CONFIG.NAME);

    this.version(4).stores({
      [DB_CONFIG.STORES.ASSISTANTS]: 'id',
      [DB_CONFIG.STORES.TOPICS]: 'id, _lastMessageTimeNum',
      [DB_CONFIG.STORES.SETTINGS]: 'id',
      [DB_CONFIG.STORES.IMAGES]: 'id',
      [DB_CONFIG.STORES.IMAGE_METADATA]: 'id, topicId, created',
      [DB_CONFIG.STORES.METADATA]: 'id',
      [DB_CONFIG.STORES.MESSAGE_BLOCKS]: 'id, messageId',
      [DB_CONFIG.STORES.MESSAGES]: 'id, topicId, assistantId',
    }).upgrade(() => this.upgradeToV4());

    // 添加版本5，将消息直接存储在topics表中
    this.version(5).stores({
      [DB_CONFIG.STORES.ASSISTANTS]: 'id',
      [DB_CONFIG.STORES.TOPICS]: 'id, _lastMessageTimeNum, messages',
      [DB_CONFIG.STORES.SETTINGS]: 'id',
      [DB_CONFIG.STORES.IMAGES]: 'id',
      [DB_CONFIG.STORES.IMAGE_METADATA]: 'id, topicId, created',
      [DB_CONFIG.STORES.METADATA]: 'id',
      [DB_CONFIG.STORES.MESSAGE_BLOCKS]: 'id, messageId',
      [DB_CONFIG.STORES.MESSAGES]: 'id, topicId, assistantId',
    }).upgrade(() => this.upgradeToV5());
  }

  /**
   * 升级到数据库版本5：将消息直接存储在topics表中
   * 实现电脑版原版的存储方式
   */
  private async upgradeToV5(): Promise<void> {
    console.log('开始升级到数据库版本5: 将消息直接存储在topics表中...');

    try {
      // 获取所有话题
      const topics = await this.topics.toArray();
      console.log(`找到 ${topics.length} 个话题需要迁移`);

      // 逐个处理话题
      for (const topic of topics) {
        // 初始化messages数组（如果不存在）
        if (!topic.messages) {
          topic.messages = [];
        }

        // 从messageIds加载消息
        if (topic.messageIds && Array.isArray(topic.messageIds)) {
          console.log(`处理话题 ${topic.id} 的 ${topic.messageIds.length} 条消息`);

          // 加载所有消息
          for (const messageId of topic.messageIds) {
            const message = await this.messages.get(messageId);
            if (message) {
              // 将消息添加到topic.messages数组
              topic.messages.push(message);
            }
          }

          // 保存更新后的话题
          await this.topics.put(topic);
          console.log(`话题 ${topic.id} 处理完成，共迁移 ${topic.messages.length} 条消息`);
        } else {
          console.log(`话题 ${topic.id} 没有messageIds数组，跳过`);
        }
      }

      console.log('数据库迁移完成: 所有消息已存储在topics表中');
    } catch (error) {
      console.error('数据库升级失败:', error);
      throw error;
    }
  }

  private async upgradeToV4(): Promise<void> {
    console.log('开始升级到数据库版本4: 规范化消息存储...');

    try {
      // 获取所有话题
      const topics = await this.topics.toArray();
      console.log(`找到 ${topics.length} 个话题需要迁移`);

      // 逐个处理话题中的消息
      for (const topic of topics) {
        // 跳过没有messages数组的话题
        if (!topic.messages || !Array.isArray(topic.messages) || topic.messages.length === 0) {
          console.log(`话题 ${topic.id} 没有消息，跳过`);
          // 初始化空的messageIds数组
          topic.messageIds = [];
          await this.topics.put(topic);
          continue;
        }

        console.log(`开始处理话题 ${topic.id} 的 ${topic.messages.length} 条消息`);

        // 初始化messageIds数组
        topic.messageIds = [];

        // 逐个处理消息
        for (const message of topic.messages) {
          if (!message.id) {
            console.log('跳过无效消息（没有ID）');
            continue;
          }

          // 将消息ID添加到messageIds数组
          topic.messageIds.push(message.id);

          // 保存消息到messages表
          try {
            await this.messages.put(message);
            console.log(`保存消息 ${message.id} 到messages表成功`);

            // 处理消息块
            if (message.blocks && Array.isArray(message.blocks)) {
              try {
                // 检查blocks数组的第一个元素类型
                const firstBlock = message.blocks[0];
                if (firstBlock && typeof firstBlock === 'object' && 'type' in firstBlock) {
                  // blocks是对象数组（旧格式）
                  for (const block of message.blocks) {
                    if (block && typeof block === 'object' && 'id' in block) {
                      await this.message_blocks.put(block as any);
                      console.log(`保存消息块 ${(block as any).id} 到message_blocks表成功`);
                    }
                  }
                } else {
                  // blocks是ID字符串数组（新格式），块已经在message_blocks表中
                  console.log(`消息 ${message.id} 使用新格式，blocks是ID数组`);
                }
              } catch (blockError) {
                console.error(`处理消息 ${message.id} 的块时出错:`, blockError);
              }
            }
          } catch (error) {
            console.error(`保存消息 ${message.id} 失败:`, error);
          }
        }

        // 保存更新后的话题
        await this.topics.put(topic);
        console.log(`话题 ${topic.id} 处理完成`);
      }

      console.log('数据库迁移完成: 所有消息已规范化存储');
    } catch (error) {
      console.error('数据库升级失败:', error);
      throw error;
    }

    console.log('数据库升级到版本4完成');
  }

  public static getInstance(): DexieStorageService {
    if (!DexieStorageService.instance) {
      DexieStorageService.instance = new DexieStorageService();
    }
    return DexieStorageService.instance;
  }

  async getAllAssistants(): Promise<Assistant[]> {
    return this.assistants.toArray();
  }

  async getSystemAssistants(): Promise<Assistant[]> {
    return this.assistants.where('isSystem').equals(1).toArray();
  }

  async getUserAssistants(): Promise<Assistant[]> {
    return this.assistants.filter(assistant => !assistant.isSystem).toArray();
  }

  async getAssistant(id: string): Promise<Assistant | null> {
    const assistant = await this.assistants.get(id);
    return assistant || null;
  }

  async saveAssistant(assistant: Assistant): Promise<void> {
    try {
      if (!assistant.id) {
        assistant.id = uuid();
      }

      const assistantToSave = { ...assistant };

      if (assistantToSave.icon && typeof assistantToSave.icon === 'object') {
        assistantToSave.icon = null;
      }

      if (assistantToSave.topics) {
        assistantToSave.topics = assistantToSave.topics.map(topic => ({
          ...topic,
          icon: null
        }));
      }

      await this.assistants.put(assistantToSave);
    } catch (error) {
      const errorMessage = error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error);
      console.error(`保存助手 ${assistant.id} 失败: ${errorMessage}`);
      throw error;
    }
  }

  async deleteAssistant(id: string): Promise<void> {
    const assistant = await this.getAssistant(id);
    if (assistant && assistant.topicIds && assistant.topicIds.length > 0) {
      for (const topicId of assistant.topicIds) {
        await this.deleteTopic(topicId);
      }
    }
    await this.assistants.delete(id);
  }

  async getAllTopics(): Promise<ChatTopic[]> {
    const topicsFromDb = await this.topics.toArray();
    return topicsFromDb.map(t => { const { _lastMessageTimeNum, ...topic } = t; return topic as ChatTopic; });
  }

  async getTopic(id: string): Promise<ChatTopic | null> {
    const topic = await this.topics.get(id);
    if (!topic) return null;
    const { _lastMessageTimeNum, ...restOfTopic } = topic;
    return restOfTopic as ChatTopic;
  }

  async saveTopic(topic: ChatTopic): Promise<void> {
    try {
      if (!topic.id) {
        topic.id = uuid();
      }

      // 确保topic有messageIds字段
      if (!topic.messageIds) {
        topic.messageIds = [];

        // 兼容性处理：如果有旧的messages字段，转换为messageIds
        if (topic.messages && Array.isArray(topic.messages)) {
          // 保存消息到messages表
          for (const message of topic.messages) {
            if (message.id) {
              await this.saveMessage(message);
              if (!topic.messageIds.includes(message.id)) {
                topic.messageIds.push(message.id);
              }
            }
          }
        }
      }

      // 设置lastMessageTime字段
      const lastMessageTime = topic.lastMessageTime || topic.updatedAt || new Date().toISOString();

      // 创建一个克隆用于存储，避免修改原始对象
      const topicToStore = {
        ...topic,
        _lastMessageTimeNum: new Date(lastMessageTime).getTime()
      };

      // 删除旧的messages字段，避免数据冗余存储
      delete (topicToStore as any).messages;

      await this.topics.put(topicToStore);
    } catch (error) {
      console.error(`[DexieStorageService] 保存话题失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async deleteTopic(id: string): Promise<void> {
    try {
      // 删除关联的消息和消息块
      await this.deleteMessagesByTopicId(id);

      // 删除主题
      await this.topics.delete(id);
    } catch (error) {
      console.error(`[DexieStorageService] 删除话题失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async getRecentTopics(limit: number = 10): Promise<ChatTopic[]> {
    const topicsFromDb = await this.topics
      .orderBy('_lastMessageTimeNum')
      .reverse()
      .limit(limit)
      .toArray();
    return topicsFromDb.map(t => { const { _lastMessageTimeNum, ...topic } = t; return topic as ChatTopic; });
  }

  async getTopicsByAssistantId(assistantId: string): Promise<ChatTopic[]> {
    const topicsFromDb = await this.topics
      .filter(topic => topic.assistantId === assistantId)
      .toArray();
    return topicsFromDb.map(t => { const { _lastMessageTimeNum, ...topic } = t; return topic as ChatTopic; });
  }

  async updateMessageInTopic(topicId: string, messageId: string, updatedMessage: Message): Promise<void> {
    try {
      // 直接更新消息表中的消息
      await this.updateMessage(messageId, updatedMessage);

      // 获取话题并更新兼容字段
      const topic = await this.getTopic(topicId);
      if (!topic) return;

      // 更新消息数组（如果存在）
      if (topic.messages) {
        const messageIndex = topic.messages.findIndex(m => m.id === messageId);
        if (messageIndex !== -1) {
          topic.messages[messageIndex] = updatedMessage;
        }
      }

      await this.saveTopic(topic);
    } catch (error) {
      console.error(`[DexieStorageService] 更新话题消息失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async deleteMessageFromTopic(topicId: string, messageId: string): Promise<void> {
    try {
      // 删除消息及其关联的块
      await this.deleteMessage(messageId);

      // 更新主题的messageIds数组
      const topic = await this.getTopic(topicId);
      if (!topic) return;

      // 更新messageIds数组
      if (topic.messageIds) {
        topic.messageIds = topic.messageIds.filter(id => id !== messageId);
      }

      // 为了兼容性，同时更新messages数组
      if (topic.messages) {
        topic.messages = topic.messages.filter(m => m.id !== messageId);
      }

      // 更新lastMessageTime
      if (topic.messageIds && topic.messageIds.length > 0) {
        const lastMessageId = topic.messageIds[topic.messageIds.length - 1];
        const lastMessage = await this.getMessage(lastMessageId);
        if (lastMessage) {
          topic.lastMessageTime = lastMessage.createdAt || lastMessage.updatedAt || new Date().toISOString();
        }
      } else {
        topic.lastMessageTime = new Date().toISOString();
      }

      await this.saveTopic(topic);
    } catch (error) {
      console.error(`[DexieStorageService] 从话题中删除消息失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async addMessageToTopic(topicId: string, message: Message): Promise<void> {
    try {
      // 保存消息到messages表
      await this.saveMessage(message);

      // 更新主题的messageIds数组
      const topic = await this.getTopic(topicId);
      if (!topic) return;

      if (!topic.messageIds) {
        topic.messageIds = [];
      }

      if (!topic.messageIds.includes(message.id)) {
        topic.messageIds.push(message.id);
      }

      // 为了兼容性，同时更新messages数组
      const messages = topic.messages || [];

      const messageIndex = messages.findIndex(m => m.id === message.id);
      if (messageIndex >= 0) {
        messages[messageIndex] = message;
      } else {
        messages.push(message);
      }

      // 更新topic.messages
      topic.messages = messages;

      topic.lastMessageTime = message.createdAt || message.updatedAt || new Date().toISOString();
      await this.saveTopic(topic);
    } catch (error) {
      console.error(`[DexieStorageService] 添加消息到话题失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async saveMessageBlock(block: MessageBlock): Promise<void> {
    if (!block.id) {
      block.id = uuid();
    }
    await this.message_blocks.put(block);
  }

  async getMessageBlock(id: string): Promise<MessageBlock | null> {
    return await this.message_blocks.get(id) || null;
  }

  async getMessageBlocksByMessageId(messageId: string): Promise<MessageBlock[]> {
    return await this.message_blocks.where('messageId').equals(messageId).toArray();
  }

  async deleteMessageBlock(id: string): Promise<void> {
    await this.message_blocks.delete(id);
  }

  async deleteMessageBlocksByMessageId(messageId: string): Promise<void> {
    const blocks = await this.getMessageBlocksByMessageId(messageId);
    await Promise.all(blocks.map(block => this.deleteMessageBlock(block.id)));
  }

  async bulkSaveMessageBlocks(blocks: MessageBlock[]): Promise<void> {
    for (const block of blocks) {
      if (!block.id) {
        block.id = uuid();
      }
    }
    await this.message_blocks.bulkPut(blocks);
  }

  async updateMessageBlock(blockId: string, updates: Partial<MessageBlock>): Promise<void> {
    const existingBlock = await this.getMessageBlock(blockId);
    if (!existingBlock) return;

    const updatedBlock = {
      ...existingBlock,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await this.message_blocks.update(blockId, updatedBlock);
  }

  /**
   * 保存设置到数据库
   * 自动处理序列化问题，确保数据可以安全地存储
   * @param key 设置键名
   * @param value 设置值
   */
  async saveSetting(key: string, value: any): Promise<void> {
    try {
      console.log(`[DexieStorageService] 开始保存设置: ${key}`);

      // 检查数据是否存在序列化问题
      const { hasCircularRefs, nonSerializableProps } = diagnoseSerializationIssues(value);

      if (hasCircularRefs || nonSerializableProps.length > 0) {
        console.warn(`[DexieStorageService] 设置 ${key} 存在序列化问题，将尝试修复:`, {
          hasCircularRefs,
          nonSerializableProps: nonSerializableProps.slice(0, 10) // 只显示前10个问题，避免日志过长
        });

        // 使用makeSerializable处理数据，确保可序列化
        const serializableValue = makeSerializable(value);
        await this.settings.put({ id: key, value: serializableValue });
        console.log(`[DexieStorageService] 设置 ${key} 已修复并保存成功`);
      } else {
        // 数据没有序列化问题，直接保存
        await this.settings.put({ id: key, value });
        console.log(`[DexieStorageService] 设置 ${key} 保存成功`);
      }
    } catch (error) {
      console.error(`[DexieStorageService] 保存设置 ${key} 失败:`, error);

      // 记录更详细的错误信息
      if (error instanceof Error) {
        console.error('错误类型:', error.name);
        console.error('错误消息:', error.message);
        console.error('错误堆栈:', error.stack);
      }

      // 尝试使用JSON序列化再保存
      try {
        console.log(`[DexieStorageService] 尝试使用JSON序列化再保存设置 ${key}`);
        const jsonString = JSON.stringify(value);
        await this.settings.put({ id: key, value: { _isJsonString: true, data: jsonString } });
        console.log(`[DexieStorageService] 设置 ${key} 使用JSON序列化保存成功`);
      } catch (jsonError) {
        console.error(`[DexieStorageService] JSON序列化保存设置 ${key} 也失败:`, jsonError);
        throw error; // 抛出原始错误
      }
    }
  }

  /**
   * 从数据库获取设置
   * 自动处理反序列化
   * @param key 设置键名
   * @returns 设置值
   */
  async getSetting(key: string): Promise<any> {
    try {
      const setting = await this.settings.get(key);

      if (!setting) {
        return null;
      }

      // 检查是否是JSON序列化的数据
      if (setting.value && typeof setting.value === 'object' && setting.value._isJsonString) {
        try {
          return JSON.parse(setting.value.data);
        } catch (e) {
          console.error(`[DexieStorageService] 解析JSON序列化的设置 ${key} 失败:`, e);
          return null;
        }
      }

      return setting.value;
    } catch (error) {
      console.error(`[DexieStorageService] 获取设置 ${key} 失败:`, error);
      return null;
    }
  }

  async deleteSetting(key: string): Promise<void> {
    await this.settings.delete(key);
  }

  async saveImage(blob: Blob, metadata: any): Promise<string> {
    const id = metadata.id || uuid();
    await this.images.put(blob, id);
    await this.imageMetadata.put({ ...metadata, id });
    return id;
  }

  async getImageBlob(id: string): Promise<Blob | undefined> {
    return this.images.get(id);
  }

  async getImageMetadata(id: string): Promise<any> {
    return this.imageMetadata.get(id);
  }

  async getImageMetadataByTopicId(topicId: string): Promise<any[]> {
    return this.imageMetadata.where('topicId').equals(topicId).toArray();
  }

  async getRecentImageMetadata(limit: number = 20): Promise<any[]> {
    return this.imageMetadata.orderBy('created').reverse().limit(limit).toArray();
  }

  async deleteImage(id: string): Promise<void> {
    await this.images.delete(id);
    await this.imageMetadata.delete(id);
  }

  async saveBase64Image(_base64Data: string, _metadata: any = {}): Promise<string> {
    throw new Error('未实现的方法 saveBase64Image');
  }

  async saveMetadata(key: string, value: any): Promise<void> {
    await this.metadata.put({ id: key, value });
  }

  async getMetadata(key: string): Promise<any> {
    const metadata = await this.metadata.get(key);
    return metadata ? metadata.value : null;
  }

  async deleteMetadata(key: string): Promise<void> {
    await this.metadata.delete(key);
  }

  /**
   * 获取模型配置
   * @param modelId 模型ID
   * @returns 模型配置对象，如果不存在则返回null
   */
  async getModel(modelId: string): Promise<any | null> {
    try {
      // 从元数据中获取模型配置
      const modelKey = `model_${modelId}`;
      return await this.getMetadata(modelKey);
    } catch (error) {
      console.error(`[DexieStorageService] 获取模型配置失败: ${modelId}`, error);
      return null;
    }
  }

  /**
   * 保存模型配置
   * @param modelId 模型ID
   * @param modelConfig 模型配置对象
   */
  async saveModel(modelId: string, modelConfig: any): Promise<void> {
    try {
      // 保存模型配置到元数据
      const modelKey = `model_${modelId}`;
      await this.saveMetadata(modelKey, modelConfig);
    } catch (error) {
      console.error(`[DexieStorageService] 保存模型配置失败: ${modelId}`, error);
      throw error;
    }
  }

  async deleteAllMessages(): Promise<void> {
    await this.message_blocks.clear();

    const topics = await this.getAllTopics();

    for (const topic of topics) {
      topic.messages = [];
      await this.saveTopic(topic);
    }
  }

  async deleteAllTopics(): Promise<void> {
    await this.message_blocks.clear();

    await this.topics.clear();

    const assistants = await this.getAllAssistants();
    for (const assistant of assistants) {
      assistant.topicIds = [];
      await this.saveAssistant(assistant);
    }
  }

  async createMessageBlocksTable(): Promise<void> {
    if (!this.message_blocks) {
      console.log('创建消息块表...');
      this.version(DB_CONFIG.VERSION).stores({
        [DB_CONFIG.STORES.MESSAGE_BLOCKS]: 'id, messageId'
      });
      console.log('消息块表创建完成');
    } else {
      console.log('消息块表已存在');
    }
  }

  async clearDatabase(): Promise<void> {
    await this.message_blocks.clear();
    await this.topics.clear();
    await this.assistants.clear();
    await this.settings.clear();
    await this.images.clear();
    await this.imageMetadata.clear();
    await this.metadata.clear();
  }

  /**
   * 获取话题的所有消息
   * 电脑版原版方式：直接从topics表中获取消息
   */
  async getTopicMessages(topicId: string): Promise<Message[]> {
    try {
      // 获取话题
      const topic = await this.topics.get(topicId);
      if (!topic) return [];

      // 始终优先使用messages数组（电脑端方式）
      if (topic.messages && Array.isArray(topic.messages)) {
        console.log(`[DexieStorageService] 从话题对象直接获取 ${topic.messages.length} 条消息`);

        // 如果messages数组为空但有messageIds，则从messages表加载
        if (topic.messages.length === 0 && topic.messageIds && Array.isArray(topic.messageIds) && topic.messageIds.length > 0) {
          console.log(`[DexieStorageService] messages数组为空，从messageIds加载 ${topic.messageIds.length} 条消息`);

          // 使用事务加载所有消息
          const messages: Message[] = [];

          // 从messages表加载消息
          for (const messageId of topic.messageIds) {
            const message = await this.messages.get(messageId);
            if (message) messages.push(message);
          }

          // 更新topic.messages数组
          topic.messages = messages;
          await this.topics.put(topic);

          return messages;
        }

        return topic.messages;
      }

      // 如果没有messages数组，但有messageIds，则从messages表加载并创建messages数组
      if (topic.messageIds && Array.isArray(topic.messageIds) && topic.messageIds.length > 0) {
        console.log(`[DexieStorageService] 创建messages数组，从messageIds加载 ${topic.messageIds.length} 条消息`);

        // 使用事务加载所有消息
        const messages: Message[] = [];

        // 从messages表加载消息
        for (const messageId of topic.messageIds) {
          const message = await this.messages.get(messageId);
          if (message) messages.push(message);
        }

        // 创建并更新topic.messages数组
        topic.messages = messages;
        await this.topics.put(topic);

        return messages;
      }

      // 如果都没有，创建空的messages数组并返回空数组
      console.log(`[DexieStorageService] 话题 ${topicId} 没有消息，创建空的messages数组`);
      topic.messages = [];
      await this.topics.put(topic);
      return [];
    } catch (error) {
      console.error(`[DexieStorageService] 获取话题消息失败: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * 保存消息
   * 电脑版原版方式：将消息直接存储在topics表中
   */
  async saveMessage(message: Message): Promise<void> {
    if (!message.id) {
      message.id = uuid();
    }

    try {
      // 使用事务保证原子性
      await this.transaction('rw', [this.topics, this.messages, this.message_blocks], async () => {
        // 1. 保存消息到messages表（保持兼容性）
        await this.messages.put(message);

        // 2. 更新topics表中的messages数组
        const topic = await this.topics.get(message.topicId);
        if (topic) {
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

          // 保存更新后的话题
          await this.topics.put(topic);
        }
      });
    } catch (error) {
      console.error(`[DexieStorageService] 保存消息失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async bulkSaveMessages(messages: Message[]): Promise<void> {
    for (const message of messages) {
      if (!message.id) {
        message.id = uuid();
      }
    }
    await this.messages.bulkPut(messages);
  }

  async getMessage(id: string): Promise<Message | null> {
    return await this.messages.get(id) || null;
  }

  async getMessagesByTopicId(topicId: string): Promise<Message[]> {
    return await this.messages.where('topicId').equals(topicId).toArray();
  }

  /**
   * 获取所有消息
   * @returns 所有消息的数组
   */
  async getAllMessages(): Promise<Message[]> {
    try {
      console.log('[DexieStorageService] 获取所有消息');
      return await this.messages.toArray();
    } catch (error) {
      console.error(`[DexieStorageService] 获取所有消息失败: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  async deleteMessage(id: string): Promise<void> {
    const message = await this.getMessage(id);
    if (!message) return;

    if (message.blocks && message.blocks.length > 0) {
      await this.deleteMessageBlocksByIds(message.blocks);
    }

    await this.messages.delete(id);
  }

  async deleteMessagesByTopicId(topicId: string): Promise<void> {
    const messages = await this.getMessagesByTopicId(topicId);

    for (const message of messages) {
      if (message.blocks && message.blocks.length > 0) {
        await this.deleteMessageBlocksByIds(message.blocks);
      }
    }

    await this.messages.where('topicId').equals(topicId).delete();
  }

  async updateMessage(id: string, updates: Partial<Message>): Promise<void> {
    const message = await this.getMessage(id);
    if (!message) return;

    const updatedMessage = {
      ...message,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await this.messages.update(id, updatedMessage);
  }

  async deleteMessageBlocksByIds(blockIds: string[]): Promise<void> {
    await Promise.all(blockIds.map((id: string) => this.deleteMessageBlock(id)));
  }

  /**
   * 获取消息版本的块
   * @param versionId 版本ID
   * @returns 版本对应的块列表
   */
  async getMessageBlocksByVersionId(versionId: string): Promise<MessageBlock[]> {
    try {
      // 查找所有metadata.versionId等于指定versionId的块
      const blocks = await this.message_blocks.toArray();
      return blocks.filter(block =>
        block.metadata &&
        block.metadata.versionId === versionId
      );
    } catch (error) {
      console.error(`[DexieStorageService] 获取版本块失败: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  // 迁移主题消息数据
  async migrateTopicMessages(topicId: string): Promise<void> {
    try {
      const topic = await this.topics.get(topicId);
      if (!topic) return;

      // 如果存在旧的messages数组，迁移到独立的messages表
      if ((topic as any).messages && Array.isArray((topic as any).messages)) {
        const messages = (topic as any).messages;
        const messageIds: string[] = [];

        // 保存消息到messages表
        for (const message of messages) {
          if (message.id) {
            await this.saveMessage(message);
            messageIds.push(message.id);
          }
        }

        // 更新topic，使用messageIds替代messages
        topic.messageIds = messageIds;
        delete (topic as any).messages;

        // 保存更新后的topic
        await this.topics.put(topic);
      }
    } catch (error) {
      console.error(`[DexieStorageService] 迁移话题消息数据失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  // 批量迁移所有主题消息数据
  async migrateAllTopicMessages(): Promise<{ migrated: number, total: number }> {
    try {
      const topics = await this.topics.toArray();
      let migratedCount = 0;

      for (const topic of topics) {
        // 检查是否需要迁移
        if ((topic as any).messages && Array.isArray((topic as any).messages)) {
          await this.migrateTopicMessages(topic.id);
          migratedCount++;
        }
      }

      return { migrated: migratedCount, total: topics.length };
    } catch (error) {
      console.error(`[DexieStorageService] 批量迁移话题消息数据失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 修复消息数据，确保所有消息都正确保存到 messages 表
   * @deprecated 请使用 DataRepairService.repairMessagesData() 方法
   */
  async repairMessagesData(): Promise<void> {
    console.log('[DexieStorageService] repairMessagesData 已废弃，请使用 DataRepairService.repairMessagesData()');

    try {
      const { DataRepairService } = await import('./DataRepairService');
      await DataRepairService.repairMessagesData();
    } catch (error) {
      console.error('[DexieStorageService] 委托修复消息数据失败:', error);
      throw error;
    }
  }

  // 添加节流更新方法
  throttledUpdateBlock = throttle(
    async (blockId: string, changes: any) => {
      return this.updateMessageBlock(blockId, changes);
    },
    150 // 150ms节流时间 - 与电脑版保持一致
  );
}

export const dexieStorage = DexieStorageService.getInstance();