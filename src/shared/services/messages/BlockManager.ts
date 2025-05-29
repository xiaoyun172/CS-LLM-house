import { generateBlockId } from '../../utils';
import store from '../../store';
import { DataRepository } from '../DataRepository';
import { upsertOneBlock } from '../../store/slices/messageBlocksSlice';
import { MessageBlockType, MessageBlockStatus } from '../../types/newMessage';
import type { MessageBlock } from '../../types/newMessage';
import { createKnowledgeReferenceBlock } from '../../utils/messageUtils';
import type { KnowledgeDocument } from '../../types/KnowledgeBase';

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
  },

  /**
   * 创建知识库引用块
   * @param messageId 消息ID
   * @param content 文本内容
   * @param knowledgeBaseId 知识库ID
   * @param options 选项
   * @returns 创建的块
   */
  async createKnowledgeReferenceBlock(
    messageId: string,
    content: string,
    knowledgeBaseId: string,
    options?: {
      source?: string;
      similarity?: number;
      fileName?: string;
      fileId?: string;
      knowledgeDocumentId?: string;
      searchQuery?: string;
    }
  ): Promise<MessageBlock> {
    const block = createKnowledgeReferenceBlock(
      messageId,
      content,
      knowledgeBaseId,
      options
    );

    console.log(`[BlockManager] 创建知识库引用块 - ID: ${block.id}, 消息ID: ${messageId}`);

    // 添加块到Redux
    store.dispatch(upsertOneBlock(block));

    // 保存块到数据库
    await DataRepository.blocks.save(block);

    return block;
  },

  /**
   * 从搜索结果创建知识库引用块
   * @param messageId 消息ID
   * @param searchResult 搜索结果
   * @param knowledgeBaseId 知识库ID
   * @param searchQuery 搜索查询
   * @returns 创建的块
   */
  async createKnowledgeReferenceBlockFromSearchResult(
    messageId: string,
    searchResult: {
      documentId: string;
      content: string;
      similarity: number;
      metadata: KnowledgeDocument['metadata'];
    },
    knowledgeBaseId: string,
    searchQuery: string
  ): Promise<MessageBlock> {
    return this.createKnowledgeReferenceBlock(
      messageId,
      searchResult.content,
      knowledgeBaseId,
      {
        source: searchResult.metadata.source,
        similarity: searchResult.similarity,
        fileName: searchResult.metadata.fileName,
        fileId: searchResult.metadata.fileId,
        knowledgeDocumentId: searchResult.documentId,
        searchQuery
      }
    );
  }
};

export default BlockManager;