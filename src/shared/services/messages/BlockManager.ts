import { generateBlockId } from '../../utils';
import store from '../../store';
import { DataRepository } from '../DataRepository';
import { upsertOneBlock } from '../../store/slices/messageBlocksSlice';
import { MessageBlockType, MessageBlockStatus } from '../../types/newMessage';
import type { MessageBlock } from '../../types/newMessage';

/**
 * 块管理器模块
 * 负责创建和管理消息块
 */
export const BlockManager = {
  /**
   * 创建主文本块
   * @param messageId 消息ID
   * @returns 创建的主文本块
   */
  async createMainTextBlock(messageId: string): Promise<MessageBlock> {
    // 生成唯一的块ID - 使用统一的ID生成工具
    const blockId = generateBlockId('block');

    // 创建块对象
    const block: MessageBlock = {
      id: blockId,
      messageId,
      type: MessageBlockType.MAIN_TEXT,
      content: '',
      createdAt: new Date().toISOString(),
      status: MessageBlockStatus.PENDING
    } as MessageBlock;

    console.log(`[BlockManager] 创建主文本块 - ID: ${blockId}, 消息ID: ${messageId}`);

    // 添加到Redux
    store.dispatch(upsertOneBlock(block));

    // 保存到数据库
    await DataRepository.blocks.save(block);

    return block;
  },

  /**
   * 创建思考过程块
   * @param messageId 消息ID
   * @returns 创建的思考过程块
   */
  async createThinkingBlock(messageId: string): Promise<MessageBlock> {
    // 生成唯一的块ID - 使用统一的ID生成工具
    const blockId = generateBlockId('thinking');

    // 创建块对象
    const block: MessageBlock = {
      id: blockId,
      messageId,
      type: MessageBlockType.THINKING,
      content: '',
      createdAt: new Date().toISOString(),
      status: MessageBlockStatus.PENDING
    } as MessageBlock;

    console.log(`[BlockManager] 创建思考过程块 - ID: ${blockId}, 消息ID: ${messageId}`);

    // 添加到Redux
    store.dispatch(upsertOneBlock(block));

    // 保存到数据库
    await DataRepository.blocks.save(block);

    return block;
  },

  /**
   * 创建错误块
   * @param messageId 消息ID
   * @param errorMessage 错误信息
   * @returns 创建的错误块
   */
  async createErrorBlock(messageId: string, errorMessage: string): Promise<MessageBlock> {
    // 生成唯一的块ID - 使用统一的ID生成工具
    const blockId = generateBlockId('error');

    // 创建块对象
    const block: MessageBlock = {
      id: blockId,
      messageId,
      type: MessageBlockType.ERROR,
      content: errorMessage,
      createdAt: new Date().toISOString(),
      status: MessageBlockStatus.ERROR
    } as MessageBlock;

    console.log(`[BlockManager] 创建错误块 - ID: ${blockId}, 消息ID: ${messageId}, 错误: ${errorMessage}`);

    // 添加到Redux
    store.dispatch(upsertOneBlock(block));

    // 保存到数据库
    await DataRepository.blocks.save(block);

    return block;
  }
};

export default BlockManager;