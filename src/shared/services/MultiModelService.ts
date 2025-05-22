import { v4 as uuid } from 'uuid';
import store from '../store';
import { dexieStorage } from './DexieStorageService';
import { MessageBlockStatus, MessageBlockType } from '../types/newMessage';
import { addOneBlock, updateOneBlock } from '../store/slices/messageBlocksSlice';
import { newMessagesActions } from '../store/slices/newMessagesSlice';
import { EventEmitter, EVENT_NAMES } from './EventEmitter';
import type { Model } from '../types';

/**
 * 多模型响应服务
 * 用于处理多模型并行响应
 */
export class MultiModelService {
  /**
   * 创建多模型响应块
   * @param messageId 消息ID
   * @param models 要使用的模型列表
   * @param displayStyle 显示样式
   * @returns 创建的块ID
   */
  async createMultiModelBlock(
    messageId: string,
    models: Model[],
    displayStyle: 'horizontal' | 'vertical' | 'grid' = 'horizontal'
  ): Promise<string> {
    // 创建块ID
    const blockId = `multi-model-${uuid()}`;

    // 创建响应数组
    const responses = models.map(model => ({
      modelId: model.id,
      modelName: model.name || model.id,
      content: '',
      status: MessageBlockStatus.PENDING
    }));

    // 创建多模型块
    const multiModelBlock = {
      id: blockId,
      messageId,
      type: MessageBlockType.MULTI_MODEL,
      responses,
      displayStyle,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: MessageBlockStatus.PENDING
    };

    // 保存到数据库
    await dexieStorage.saveMessageBlock(multiModelBlock);

    // 添加到Redux状态
    store.dispatch(addOneBlock(multiModelBlock));

    // 获取消息
    const message = await dexieStorage.getMessage(messageId);

    if (message) {
      // 更新消息的块列表
      const updatedBlocks = [...(message.blocks || []), blockId];

      // 更新消息
      await dexieStorage.updateMessage(messageId, {
        blocks: updatedBlocks
      });

      // 更新Redux状态
      store.dispatch(newMessagesActions.updateMessage({
        id: messageId,
        changes: {
          blocks: updatedBlocks
        }
      }));
    }

    // 发送事件
    EventEmitter.emit(EVENT_NAMES.BLOCK_CREATED, { blockId, type: MessageBlockType.MULTI_MODEL });

    return blockId;
  }

  /**
   * 更新多模型响应块中的单个模型响应
   * @param blockId 块ID
   * @param modelId 模型ID
   * @param content 内容
   * @param status 状态
   */
  async updateModelResponse(
    blockId: string,
    modelId: string,
    content: string,
    status: MessageBlockStatus = MessageBlockStatus.STREAMING
  ): Promise<void> {
    // 获取块
    const block = await dexieStorage.getMessageBlock(blockId);

    if (!block || block.type !== MessageBlockType.MULTI_MODEL) {
      throw new Error(`块 ${blockId} 不是多模型响应块`);
    }

    // 更新响应
    const updatedResponses = block.responses.map(response => {
      if (response.modelId === modelId) {
        return {
          ...response,
          content,
          status
        };
      }
      return response;
    });

    // 计算块的整体状态
    let blockStatus: MessageBlockStatus = MessageBlockStatus.SUCCESS;

    // 如果有任何一个响应正在流式传输，则块状态为流式传输
    if (updatedResponses.some(r => r.status === MessageBlockStatus.STREAMING)) {
      blockStatus = MessageBlockStatus.STREAMING;
    }

    // 如果有任何一个响应处于待处理状态，则块状态为待处理
    if (updatedResponses.some(r => r.status === MessageBlockStatus.PENDING)) {
      blockStatus = MessageBlockStatus.PENDING;
    }

    // 如果有任何一个响应出错，则块状态为错误
    if (updatedResponses.some(r => r.status === MessageBlockStatus.ERROR)) {
      blockStatus = MessageBlockStatus.ERROR;
    }

    // 更新块
    const updatedBlock = {
      ...block,
      responses: updatedResponses,
      status: blockStatus,
      updatedAt: new Date().toISOString()
    };

    // 保存到数据库
    await dexieStorage.updateMessageBlock(blockId, updatedBlock);

    // 更新Redux状态
    store.dispatch(updateOneBlock({
      id: blockId,
      changes: {
        responses: updatedResponses,
        status: blockStatus,
        updatedAt: new Date().toISOString()
      }
    }));

    // 发送事件
    EventEmitter.emit(EVENT_NAMES.BLOCK_UPDATED, {
      blockId,
      modelId,
      status: blockStatus
    });
  }

  /**
   * 完成多模型响应块中的单个模型响应
   * @param blockId 块ID
   * @param modelId 模型ID
   * @param content 最终内容
   */
  async completeModelResponse(
    blockId: string,
    modelId: string,
    content: string
  ): Promise<void> {
    await this.updateModelResponse(blockId, modelId, content, MessageBlockStatus.SUCCESS);
  }
}

// 导出单例
export const multiModelService = new MultiModelService();
