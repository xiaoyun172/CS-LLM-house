import type { ChatTopic, Message } from '../types';
import type { Assistant } from '../types/Assistant';
import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import type { AetherLinkDB } from '../types/DatabaseSchema';
import { DB_CONFIG } from '../types/DatabaseSchema';

// 使用统一的数据库配置
const { NAME: DB_NAME, VERSION: DB_VERSION, STORES } = DB_CONFIG;

// 获取数据库实例
let dbPromise: Promise<IDBPDatabase<AetherLinkDB>> | null = null;
let connectionInProgress = false;
let lastConnectionAttempt = 0;

// 安全关闭所有连接
async function forceCloseAllConnections(): Promise<void> {
  console.log('DataAdapter: 强制关闭所有数据库连接');

  // 如果存在活动连接，尝试关闭它
  if (dbPromise) {
    try {
      const db = await dbPromise;
      db.close();
      console.log('DataAdapter: 成功关闭活动连接');
    } catch (e) {
      console.warn('DataAdapter: 关闭连接时出错', e);
    }

    // 无论成功与否，都重置Promise
    dbPromise = null;
  }

  // 重置连接状态
  connectionInProgress = false;
}

// 初始化数据库
async function getDB(): Promise<IDBPDatabase<AetherLinkDB>> {
  // 防止频繁重试 - 至少间隔1秒
  const now = Date.now();
  if (now - lastConnectionAttempt < 1000) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  lastConnectionAttempt = Date.now();

  try {
    // 检查是否已有连接
    if (dbPromise) {
      try {
        // 测试连接是否仍然有效
        const db = await dbPromise;
        if (db && typeof db.objectStoreNames === 'object') {
          return db; // 连接有效，直接返回
        }
      } catch (testError) {
        console.warn('DataAdapter: 现有连接已失效，将重新连接', testError);
        dbPromise = null;
      }
    }

    // 防止并发初始化
    if (connectionInProgress) {
      console.log('DataAdapter: 另一个连接正在进行中，等待...');
      await new Promise(resolve => setTimeout(resolve, 500));
      return getDB(); // 递归调用，但有延迟
    }

    connectionInProgress = true;
    console.log('DataAdapter: 开始新的数据库连接');

    // 首先尝试关闭任何现有连接
    await forceCloseAllConnections();

    // 创建新连接
    dbPromise = openDB<AetherLinkDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        console.log('DataAdapter: 执行数据库升级');

        // 创建话题存储
        if (!db.objectStoreNames.contains(STORES.TOPICS)) {
          const topicsStore = db.createObjectStore(STORES.TOPICS, { keyPath: 'id' });
          topicsStore.createIndex('by-assistant', 'assistantId', { unique: false });
          topicsStore.createIndex('by-last-time', 'lastMessageTime', { unique: false });
          console.log('DataAdapter: 创建topics存储');
        }

        // 创建助手存储
        if (!db.objectStoreNames.contains(STORES.ASSISTANTS)) {
          const assistantsStore = db.createObjectStore(STORES.ASSISTANTS, { keyPath: 'id' });
          assistantsStore.createIndex('by-system', 'isSystem', { unique: false });
          console.log('DataAdapter: 创建assistants存储');
        }

        // 创建设置存储
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
          console.log('DataAdapter: 创建settings存储');
        }

        // 创建图片存储
        if (!db.objectStoreNames.contains(STORES.IMAGES)) {
          db.createObjectStore(STORES.IMAGES, { keyPath: 'id' });
          console.log('DataAdapter: 创建images存储');
        }

        // 创建图片元数据存储
        if (!db.objectStoreNames.contains(STORES.IMAGE_METADATA)) {
          const imageMetadataStore = db.createObjectStore(STORES.IMAGE_METADATA, { keyPath: 'id' });
          imageMetadataStore.createIndex('by-topic', 'topicId', { unique: false });
          imageMetadataStore.createIndex('by-time', 'created', { unique: false });
          console.log('DataAdapter: 创建imageMetadata存储');
        }

        // 创建元数据存储
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: 'id' });
          console.log('DataAdapter: 创建metadata存储');
        }
      },
      blocked: function() {
        console.warn('DataAdapter: 数据库升级被阻塞');
        // 通知用户并建议刷新应用
        alert('数据库更新被阻塞，请关闭其他标签页或应用后重试。如果问题持续，请重启应用。');
      },
      blocking: function() {
        console.warn('DataAdapter: 此连接正在阻塞数据库升级，将关闭连接');
        // 立即主动关闭连接以允许升级继续
        forceCloseAllConnections().catch(function(err) {
          console.error('关闭阻塞连接失败', err);
        });
      },
      terminated: function() {
        console.error('DataAdapter: 数据库连接意外终止');
        dbPromise = null;
        connectionInProgress = false;
      }
    });

    // 设置超时，避免无限等待
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('数据库连接超时')), 5000);
    });

    // 使用race确保不会永久等待
    const db = await Promise.race([dbPromise, timeout]);
    console.log('DataAdapter: 数据库连接成功');
    connectionInProgress = false;
    return db;
  } catch (error) {
    console.error('DataAdapter: 数据库连接失败:', error);

    // 重置状态
    connectionInProgress = false;
    dbPromise = null;

    // 尝试恢复：删除可能损坏的数据库并重新创建
    try {
      // 删除数据库
      console.log('DataAdapter: 尝试删除并重建数据库');
      const deleteRequest = indexedDB.deleteDatabase(DB_NAME);

      // 等待删除操作完成
      await new Promise<void>((resolve, reject) => {
        deleteRequest.onsuccess = () => {
          console.log('DataAdapter: 已删除旧数据库，即将重新初始化');
          resolve();
        };
        deleteRequest.onerror = (event) => {
          console.error('DataAdapter: 删除数据库失败:', event);
          reject(new Error('删除数据库失败'));
        };
      });

      // 等待300ms确保删除操作完成
      await new Promise(resolve => setTimeout(resolve, 300));

      // 重新尝试连接（最多重试一次，避免无限循环）
      return await getDB();
    } catch (recoveryError) {
      console.error('DataAdapter: 数据库恢复失败', recoveryError);
      throw new Error(`数据库恢复失败: ${recoveryError}`);
    }
  }
}

/**
 * 统一数据访问适配器
 * 提供对所有本地数据的访问和操作方法
 */
export class DataAdapter {
  // 当前实例
  private static instance: DataAdapter | null = null;

  // 调试模式标志
  private debug: boolean = false;

  // 构造函数
  constructor() {
    // 可以选择实现单例模式
    if (DataAdapter.instance) {
      return DataAdapter.instance;
    }
    DataAdapter.instance = this;
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): DataAdapter {
    if (!DataAdapter.instance) {
      DataAdapter.instance = new DataAdapter();
    }
    return DataAdapter.instance;
  }

  // 设置调试模式
  setDebug(debug: boolean): void {
    this.debug = debug;
    this.logDebug('调试模式已' + (debug ? '启用' : '禁用'));
  }

  // 调试日志
  private logDebug(message: string, ...args: any[]): void {
    if (this.debug) {
      console.log(`[DataAdapter] ${message}`, ...args);
    }
  }

  /**
   * 话题相关方法
   */

  // 获取所有话题
  async getAllTopics(): Promise<ChatTopic[]> {
    try {
      this.logDebug('获取所有话题');
      const db = await getDB();
      const topics = await db.getAll(STORES.TOPICS);
      this.logDebug(`获取到 ${topics.length} 个话题`);
      return topics;
    } catch (error) {
      console.error('获取话题失败:', error);
      throw new Error('获取话题失败: ' + (error as Error).message);
    }
  }

  // 获取单个话题
  async getTopic(topicId: string): Promise<ChatTopic | undefined> {
    try {
      this.logDebug(`获取话题 ${topicId}`);
      const db = await getDB();
      const topic = await db.get(STORES.TOPICS, topicId);
      return topic;
    } catch (error) {
      console.error(`获取话题 ${topicId} 失败:`, error);
      throw new Error(`获取话题失败: ${(error as Error).message}`);
    }
  }

  // 保存话题
  async saveTopic(topic: ChatTopic): Promise<string> {
    try {
      this.logDebug(`保存话题 ${topic.id}`);
      const db = await getDB();
      await db.put(STORES.TOPICS, topic);
      return topic.id;
    } catch (error) {
      console.error('保存话题失败:', error);
      throw new Error('保存话题失败: ' + (error as Error).message);
    }
  }

  // 删除话题
  async deleteTopic(topicId: string): Promise<void> {
    try {
      this.logDebug(`删除话题 ${topicId}`);
      const db = await getDB();
      await db.delete(STORES.TOPICS, topicId);
    } catch (error) {
      console.error(`删除话题 ${topicId} 失败:`, error);
      throw new Error(`删除话题失败: ${(error as Error).message}`);
    }
  }

  /**
   * 消息相关方法
   */

  // 向话题添加消息
  async addMessageToTopic(topicId: string, message: Message): Promise<string> {
    try {
      const topic = await this.getTopic(topicId);
      if (!topic) {
        throw new Error(`话题 ${topicId} 不存在`);
      }

      if (!Array.isArray(topic.messages)) {
        topic.messages = [];
      }

      topic.messages.push(message);
      this.logDebug(`向话题 ${topicId} 添加消息 ${message.id}`);
      return await this.saveTopic(topic);
    } catch (error) {
      console.error(`向话题 ${topicId} 添加消息失败:`, error);
      throw new Error(`添加消息失败: ${(error as Error).message}`);
    }
  }

  // 更新话题中的消息
  async updateMessage(topicId: string, messageId: string, updatedMessage: Partial<Message>): Promise<void> {
    try {
      const topic = await this.getTopic(topicId);
      if (!topic || !Array.isArray(topic.messages)) {
        throw new Error(`话题 ${topicId} 不存在或消息数组为空`);
      }

      const messageIndex = topic.messages.findIndex(m => m.id === messageId);
      if (messageIndex === -1) {
        throw new Error(`消息 ${messageId} 不存在于话题 ${topicId} 中`);
      }

      topic.messages[messageIndex] = { ...topic.messages[messageIndex], ...updatedMessage };
      this.logDebug(`更新话题 ${topicId} 中的消息 ${messageId}`);
      await this.saveTopic(topic);
    } catch (error) {
      console.error(`更新消息 ${messageId} 失败:`, error);
      throw new Error(`更新消息失败: ${(error as Error).message}`);
    }
  }

  // 从话题删除消息
  async deleteMessage(topicId: string, messageId: string): Promise<void> {
    try {
      const topic = await this.getTopic(topicId);
      if (!topic || !Array.isArray(topic.messages)) {
        throw new Error(`话题 ${topicId} 不存在或消息数组为空`);
      }

      topic.messages = topic.messages.filter(m => m.id !== messageId);
      this.logDebug(`从话题 ${topicId} 删除消息 ${messageId}`);
      await this.saveTopic(topic);
    } catch (error) {
      console.error(`删除消息 ${messageId} 失败:`, error);
      throw new Error(`删除消息失败: ${(error as Error).message}`);
    }
  }

  /**
   * 助手相关方法
   */

  // 获取所有助手
  async getAllAssistants(): Promise<Assistant[]> {
    try {
      this.logDebug('获取所有助手');
      const db = await getDB();
      const assistants = await db.getAll(STORES.ASSISTANTS);
      this.logDebug(`获取到 ${assistants.length} 个助手`);
      return assistants;
    } catch (error) {
      console.error('获取助手失败:', error);
      throw new Error('获取助手失败: ' + (error as Error).message);
    }
  }

  // 获取单个助手
  async getAssistant(assistantId: string): Promise<Assistant | undefined> {
    try {
      this.logDebug(`获取助手 ${assistantId}`);
      const db = await getDB();
      const assistant = await db.get(STORES.ASSISTANTS, assistantId);
      return assistant;
    } catch (error) {
      console.error(`获取助手 ${assistantId} 失败:`, error);
      throw new Error(`获取助手失败: ${(error as Error).message}`);
    }
  }

  // 保存助手
  async saveAssistant(assistant: Assistant): Promise<string> {
    try {
      this.logDebug(`保存助手 ${assistant.id}`);

      // 克隆并清理助手对象，移除React元素和不可序列化的内容
      const cleanAssistant = this.sanitizeForStorage(assistant);

      const db = await getDB();
      await db.put(STORES.ASSISTANTS, cleanAssistant);
      return assistant.id;
    } catch (error) {
      console.error('保存助手失败:', error);
      throw new Error('保存助手失败: ' + (error as Error).message);
    }
  }

  // 清理对象，移除不可序列化的内容
  private sanitizeForStorage<T>(obj: T): T {
    try {
      // 转换为JSON并回来，移除不可序列化的内容
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      console.warn('对象清理过程中发现不可序列化内容:', e);
      // 如果失败，尝试使用更复杂的方式处理
      const safeObj = { ...obj } as any;

      // 递归遍历并清理对象
      Object.keys(safeObj).forEach(key => {
        const value = safeObj[key];

        // 检查是否为React元素或其他复杂对象
        const valueType = typeof value;

        // 移除函数和Symbol
        if (valueType === 'function' || valueType === 'symbol') {
          delete safeObj[key];
        }
        // 处理嵌套对象
        else if (value && valueType === 'object' && !Array.isArray(value)) {
          // 如果是Date对象，转换为ISO字符串
          if (value instanceof Date) {
            safeObj[key] = value.toISOString();
          }
          // 递归处理普通对象
          else {
            safeObj[key] = this.sanitizeForStorage(value);
          }
        }
        // 处理数组
        else if (Array.isArray(value)) {
          safeObj[key] = value.map(item =>
            typeof item === 'object' && item !== null
              ? this.sanitizeForStorage(item)
              : item
          );
        }
      });

      return safeObj as T;
    }
  }

  /**
   * 检查并初始化默认助手
   * 确保系统中至少存在一个默认助手
   */
  public async initializeDefaultAssistants(): Promise<void> {
    try {
      this.logDebug('检查默认助手');

      // 获取所有助手
      const assistants = await this.getAllAssistants();

      if (assistants.length === 0) {
        this.logDebug('未找到任何助手，创建默认助手');

        // 创建默认系统助手
        const defaultAssistant: Assistant = {
          id: 'default-system-assistant',
          name: '默认助手',
          description: '默认AI助手，可以帮助你回答各种问题。',
          icon: null, // React元素将在UI层处理
          isSystem: true,
          topicIds: [],
          systemPrompt: '你是一个有用的AI助手。'
        };

        // 保存默认助手
        await this.saveAssistant(defaultAssistant);
        this.logDebug('已创建默认助手');
      } else {
        this.logDebug(`系统中已有 ${assistants.length} 个助手`);
      }
    } catch (error) {
      console.error('初始化默认助手失败:', error);
      // 不抛出异常，让应用继续运行
    }
  }

  // 删除助手
  async deleteAssistant(assistantId: string): Promise<void> {
    try {
      this.logDebug(`删除助手 ${assistantId}`);
      const db = await getDB();
      await db.delete(STORES.ASSISTANTS, assistantId);
    } catch (error) {
      console.error(`删除助手 ${assistantId} 失败:`, error);
      throw new Error(`删除助手失败: ${(error as Error).message}`);
    }
  }

  /**
   * 创建新话题
   * @param topic 话题对象
   * @returns 返回创建操作的Promise
   */
  public async createTopic(topic: ChatTopic): Promise<ChatTopic> {
    try {
      this.logDebug('创建新话题', { topicId: topic.id, title: topic.title });

      // 检查数据库连接
      let db;
      try {
        db = await getDB();

        // 验证topics对象存储是否存在
        if (!db.objectStoreNames.contains(STORES.TOPICS)) {
          const error = new Error('数据库中没有找到topics对象存储');
          this.logDebug('创建话题失败: topics对象存储不存在', { error });
          throw error;
        }
      } catch (dbError) {
        this.logDebug('数据库连接或验证失败', { error: dbError });
        throw new Error(`数据库访问错误: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
      }

      // 保存话题
      await this.saveTopic(topic);
      this.logDebug('新话题已创建', { topicId: topic.id });

      return topic;
    } catch (error) {
      console.error('创建话题失败', error);
      // 添加更详细的错误信息
      const errorMessage = error instanceof Error
        ? `创建话题失败: ${error.message}`
        : `创建话题失败: ${String(error)}`;

      this.logDebug('创建话题详细错误信息', {
        error: errorMessage,
        topicId: topic.id,
        stack: error instanceof Error ? error.stack : undefined
      });

      throw new Error(errorMessage);
    }
  }

  /**
   * 清空话题中的所有消息
   * @param topicId 话题ID
   * @returns 返回清空操作的Promise
   */
  public async clearTopicMessages(topicId: string): Promise<void> {
    try {
      this.logDebug('清空话题消息', { topicId });

      // 先获取话题
      const topic = await this.getTopic(topicId);

      if (!topic) {
        this.logDebug('未找到指定话题，无法清空消息', { topicId });
        throw new Error(`话题不存在: ${topicId}`);
      }

      // 清空消息
      const updatedTopic = {
        ...topic,
        messages: []
      };

      // 保存更新后的话题
      await this.saveTopic(updatedTopic);
      this.logDebug('话题消息已清空', { topicId });
    } catch (error) {
      console.error('清空话题消息失败', error);
      throw new Error('清空话题消息失败: ' + (error as Error).message);
    }
  }

  /**
   * 查找重复的话题
   * 用于检测和修复数据问题
   */
  public async findDuplicateTopics(): Promise<{id: string, count: number, topics: ChatTopic[]}[]> {
    try {
      this.logDebug('检测重复话题');

      // 获取所有话题
      const allTopics = await this.getAllTopics();

      // 按ID分组统计
      const groupedByID = new Map<string, ChatTopic[]>();

      allTopics.forEach(topic => {
        if (!groupedByID.has(topic.id)) {
          groupedByID.set(topic.id, []);
        }
        groupedByID.get(topic.id)?.push(topic);
      });

      // 找出有重复的组
      const duplicates = Array.from(groupedByID.entries())
        .filter(([_, topics]) => topics.length > 1)
        .map(([id, topics]) => ({
          id,
          count: topics.length,
          topics
        }));

      this.logDebug('重复话题检测结果', {
        总话题数: allTopics.length,
        重复ID数: duplicates.length
      });

      return duplicates;
    } catch (error) {
      console.error('检测重复话题失败', error);
      return [];
    }
  }

  /**
   * 修复所有重复话题
   */
  public async fixDuplicateTopics(): Promise<{fixed: number, total: number}> {
    try {
      this.logDebug('开始修复重复话题');

      // 获取所有话题
      const allTopics = await this.getAllTopics();

      // 使用Map去重
      const uniqueTopicsMap = new Map<string, ChatTopic>();

      // 对于每个话题ID，保留消息最多的那个版本
      allTopics.forEach(topic => {
        if (!uniqueTopicsMap.has(topic.id)) {
          uniqueTopicsMap.set(topic.id, topic);
        } else {
          const existingTopic = uniqueTopicsMap.get(topic.id)!;
          const existingMsgCount = existingTopic.messages?.length || 0;
          const newMsgCount = topic.messages?.length || 0;

          // 如果新话题包含更多消息，则替换
          if (newMsgCount > existingMsgCount) {
            uniqueTopicsMap.set(topic.id, topic);
          }
          // 如果消息数相同但最后消息时间更新，也替换
          else if (newMsgCount === existingMsgCount &&
            topic.lastMessageTime && existingTopic.lastMessageTime &&
            new Date(topic.lastMessageTime) > new Date(existingTopic.lastMessageTime)) {
            uniqueTopicsMap.set(topic.id, topic);
          }
        }
      });

      const uniqueTopics = Array.from(uniqueTopicsMap.values());

      // 计算修复的数量
      const fixedCount = allTopics.length - uniqueTopics.length;

      // 再次保存所有唯一话题
      for (const topic of uniqueTopics) {
        await this.saveTopic(topic);
      }

      this.logDebug('重复话题修复完成', {
        原始数量: allTopics.length,
        修复后数量: uniqueTopics.length,
        修复数量: fixedCount
      });

      return {
        fixed: fixedCount,
        total: allTopics.length
      };
    } catch (error) {
      console.error('修复重复话题失败', error);
      return { fixed: 0, total: 0 };
    }
  }

  /**
   * 设置日志记录状态
   */
  public setLogging(enabled: boolean): void {
    this.setDebug(enabled);
  }

  /**
   * 删除旧版本的数据库
   * 用于手动清理可能存在的旧版本数据库
   */
  public async cleanupOldDatabases(): Promise<void> {
    try {
      this.logDebug('开始清理旧数据库');

      // 首先关闭当前所有连接
      await forceCloseAllConnections();

      // 获取所有数据库
      const databases = await indexedDB.databases();

      // 当前使用的数据库名称
      const currentDB = 'aetherlink-db-new';

      // 需要清理的旧数据库
      const oldDBs = databases
        .filter(db => db.name && db.name !== currentDB)
        .map(db => db.name as string);

      this.logDebug(`发现 ${oldDBs.length} 个旧数据库需要清理`);

      // 清理旧数据库
      for (const dbName of oldDBs) {
        try {
          this.logDebug(`正在删除旧数据库: ${dbName}`);
          const deleteRequest = indexedDB.deleteDatabase(dbName);
          deleteRequest.onsuccess = () => {
            this.logDebug(`成功删除旧数据库: ${dbName}`);
          };
          deleteRequest.onerror = (event) => {
            this.logDebug(`删除数据库 ${dbName} 失败:`, event);
          };
        } catch (error) {
          this.logDebug(`删除旧数据库 ${dbName} 失败`, error);
          // 继续处理下一个数据库
        }
      }

      // 重置当前数据库连接，确保使用新的配置
      dbPromise = null;

      this.logDebug('旧数据库清理完成');
    } catch (error) {
      console.error('清理旧数据库失败', error);
    }
  }

  /**
   * 重置当前数据库连接
   * 关闭并删除当前数据库连接，强制下次访问时重新初始化
   */
  public async resetCurrentDatabase(): Promise<void> {
    this.logDebug('正在重置数据库连接');

    try {
      // 关闭并删除现有连接
      await forceCloseAllConnections();

      // 重新获取数据库以验证连接
      await getDB();

      // 初始化默认助手
      await this.initializeDefaultAssistants();

      this.logDebug('数据库连接已重置并验证');
    } catch (error) {
      console.error('重置数据库连接失败', error);
      throw new Error('重置数据库连接失败: ' + error);
    }
  }
}