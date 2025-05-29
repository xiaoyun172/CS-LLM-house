import { dexieStorage } from '../../../services/DexieStorageService';
import { throttle } from 'lodash';
import type { Message, MessageBlock } from '../../../types/newMessage';

export const saveMessageAndBlocksToDB = async (message: Message, blocks: MessageBlock[]) => {
  try {
    // 使用事务保证原子性
    await dexieStorage.transaction('rw', [
      dexieStorage.topics,
      dexieStorage.messages,
      dexieStorage.message_blocks
    ], async () => {
      // 保存消息块
      if (blocks.length > 0) {
        await dexieStorage.bulkSaveMessageBlocks(blocks);
      }

      // 保存消息到messages表（保持兼容性）
      await dexieStorage.messages.put(message);

      // 更新topics表中的messages数组（电脑端方式）
      const topic = await dexieStorage.topics.get(message.topicId);
      if (topic) {
        // 确保messages数组存在
        if (!topic.messages) {
          topic.messages = [];
        }

        // 查找消息在数组中的位置
        const messageIndex = topic.messages.findIndex((m: Message) => m.id === message.id);

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

        // 更新话题的lastMessageTime
        topic.lastMessageTime = message.createdAt || message.updatedAt || new Date().toISOString();

        // 保存更新后的话题
        await dexieStorage.topics.put(topic);
      }
    });
  } catch (error) {
    console.error('保存消息和块到数据库失败:', error);
    throw error;
  }
};

export const throttledBlockUpdate = throttle(async (id: string, blockUpdate: Partial<MessageBlock>) => {
  // 只更新数据库，Redux状态由ResponseHandler处理
  await dexieStorage.updateMessageBlock(id, blockUpdate);
}, 150);