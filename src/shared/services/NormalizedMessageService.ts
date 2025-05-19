import { dexieStorage } from './DexieStorageService';
import store from '../store';
import { newMessagesActions } from '../store/slices/newMessagesSlice';
import { upsertManyBlocks } from '../store/slices/messageBlocksSlice';
import type { Message, MessageBlock } from '../types/newMessage.ts';

export class NormalizedMessageService {
  /**
   * 创建并保存新消息
   */
  static async createMessage(message: Message, blocks: MessageBlock[]): Promise<void> {
    try {
      // 保存消息到数据库
      await dexieStorage.saveMessage(message);

      // 保存消息块到数据库
      if (blocks.length > 0) {
        await dexieStorage.bulkSaveMessageBlocks(blocks);
      }

      // 更新 Redux 状态
      store.dispatch(newMessagesActions.addMessage({
        topicId: message.topicId,
        message
      }));

      if (blocks.length > 0) {
        store.dispatch(upsertManyBlocks(blocks));
      }
    } catch (error) {
      console.error('[NormalizedMessageService] 创建消息失败:', error);
      throw error;
    }
  }

  /**
   * 加载主题的所有消息
   */
  static async loadTopicMessages(topicId: string): Promise<void> {
    try {
      // 从数据库加载消息
      const messages = await dexieStorage.getMessagesByTopicId(topicId);

      if (messages.length === 0) {
        // 没有消息，直接返回空数组
        store.dispatch(newMessagesActions.messagesReceived({
          topicId,
          messages: []
        }));
        return;
      }

      // 加载所有消息块
      const messageIds = messages.map(msg => msg.id);
      const blocks: MessageBlock[] = [];

      for (const messageId of messageIds) {
        const messageBlocks = await dexieStorage.getMessageBlocksByMessageId(messageId);
        blocks.push(...messageBlocks);
      }

      // 更新 Redux 状态
      store.dispatch(newMessagesActions.messagesReceived({
        topicId,
        messages
      }));

      if (blocks.length > 0) {
        store.dispatch(upsertManyBlocks(blocks));
      }
    } catch (error) {
      console.error(`[NormalizedMessageService] 加载主题 ${topicId} 的消息失败:`, error);
    }
  }

  /**
   * 更新消息
   */
  static async updateMessage(messageId: string, updates: Partial<Message>): Promise<void> {
    try {
      // 更新数据库中的消息
      await dexieStorage.updateMessage(messageId, updates);

      // 更新 Redux 状态
      store.dispatch(newMessagesActions.updateMessage({
        id: messageId,
        changes: updates
      }));
    } catch (error) {
      console.error(`[NormalizedMessageService] 更新消息 ${messageId} 失败:`, error);
      throw error;
    }
  }

  /**
   * 删除消息
   */
  static async deleteMessage(messageId: string, topicId: string): Promise<void> {
    try {
      // 从数据库中删除消息
      await dexieStorage.deleteMessage(messageId);

      // 更新 Redux 状态
      store.dispatch(newMessagesActions.removeMessage({
        topicId,
        messageId
      }));
    } catch (error) {
      console.error(`[NormalizedMessageService] 删除消息 ${messageId} 失败:`, error);
      throw error;
    }
  }

  /**
   * 清空主题的所有消息
   */
  static async clearTopicMessages(topicId: string): Promise<void> {
    try {
      // 从数据库中删除主题的所有消息
      await dexieStorage.deleteMessagesByTopicId(topicId);

      // 更新 Redux 状态
      store.dispatch(newMessagesActions.clearTopicMessages(topicId));
    } catch (error) {
      console.error(`[NormalizedMessageService] 清空主题 ${topicId} 的消息失败:`, error);
      throw error;
    }
  }
}