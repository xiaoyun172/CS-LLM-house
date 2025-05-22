import { dexieStorage } from './DexieStorageService';
import { v4 as uuid } from 'uuid';
import store from '../store';
import { newMessagesActions } from '../store/slices/newMessagesSlice';
import { addManyBlocks, removeManyBlocks } from '../store/slices/messageBlocksSlice';
import type { Message, MessageBlock } from '../types/newMessage';

/**
 * 版本管理服务
 * 提供独立的版本存储和加载功能
 */
class VersionService {
  /**
   * 创建消息的初始版本
   * @param messageId 消息ID
   * @param blockId 主块ID
   * @param content 消息内容
   * @param model 模型信息
   */
  async createInitialVersion(
    messageId: string,
    blockId: string,
    content: string,
    model: any
  ): Promise<string> {
    try {
      console.log(`[VersionService] 创建初始版本 - 消息ID: ${messageId}`);

      // 获取消息
      const message = await dexieStorage.getMessage(messageId);
      if (!message) {
        throw new Error(`消息 ${messageId} 不存在`);
      }

      // 创建版本ID
      const versionId = uuid();

      // 创建版本记录
      const version = {
        id: versionId,
        messageId: messageId,
        blocks: [blockId], // 使用当前块ID
        createdAt: message.createdAt,
        updatedAt: new Date().toISOString(),
        modelId: message.modelId,
        model: model,
        isActive: true, // 初始版本是活跃的
        metadata: {
          content: content, // 保存内容到metadata
          isInitialVersion: true,
          blockIds: [blockId] // 额外保存块ID，确保版本与块的关联
        }
      };

      // 更新消息，添加版本历史
      await dexieStorage.updateMessage(messageId, {
        versions: [version]
      });

      console.log(`[VersionService] 初始版本创建成功 - 版本ID: ${versionId}`);
      return versionId;
    } catch (error) {
      console.error(`[VersionService] 创建初始版本失败:`, error);
      throw error;
    }
  }

  /**
   * 创建消息的新版本
   * @param messageId 消息ID
   * @param blocks 当前块列表
   * @param model 模型信息
   */
  async createNewVersion(
    messageId: string,
    blocks: MessageBlock[],
    model: any
  ): Promise<string> {
    try {
      console.log(`[VersionService] 创建新版本 - 消息ID: ${messageId}, 块数量: ${blocks.length}`);

      // 获取消息
      const message = await dexieStorage.getMessage(messageId);
      if (!message) {
        throw new Error(`消息 ${messageId} 不存在`);
      }

      // 获取当前版本列表
      const versions = message.versions || [];

      // 创建新版本ID
      const versionId = uuid();

      // 深拷贝块数据，确保版本历史中保存完整的块数据
      const blocksForVersion = [];
      for (const block of blocks) {
        // 创建块的深拷贝
        const blockCopy = { ...block };
        // 生成新的ID，避免ID冲突
        blockCopy.id = uuid();
        // 在metadata中存储版本信息
        if (!blockCopy.metadata) blockCopy.metadata = {};
        blockCopy.metadata.versionId = versionId;
        // 保存到数据库
        await dexieStorage.saveMessageBlock(blockCopy);
        // 添加到版本块列表
        blocksForVersion.push(blockCopy.id);
      }

      // 获取主文本内容
      let messageContent = '';
      const mainTextBlock = blocks.find(block => block.type === 'main_text');
      if (mainTextBlock && 'content' in mainTextBlock) {
        messageContent = mainTextBlock.content;
      }

      // 创建新版本记录
      const newVersion = {
        id: versionId,
        messageId: messageId,
        blocks: blocksForVersion, // 使用新创建的块ID列表
        createdAt: message.createdAt,
        updatedAt: new Date().toISOString(),
        modelId: model.id,
        model: model,
        isActive: true, // 新版本是活跃的
        metadata: {
          content: messageContent, // 保存内容到metadata
          blockIds: blocksForVersion // 额外保存块ID，确保版本与块的关联
        }
      };

      // 将所有现有版本设置为非活跃
      const updatedVersions = versions.map(v => ({
        ...v,
        isActive: false
      }));

      // 添加新版本
      updatedVersions.push(newVersion);

      // 更新消息
      await dexieStorage.updateMessage(messageId, {
        versions: updatedVersions
      });

      console.log(`[VersionService] 新版本创建成功 - 版本ID: ${versionId}`);
      return versionId;
    } catch (error) {
      console.error(`[VersionService] 创建新版本失败:`, error);
      throw error;
    }
  }

  /**
   * 切换到指定版本
   * @param versionId 版本ID
   */
  async switchToVersion(versionId: string): Promise<boolean> {
    try {
      console.log(`[VersionService] 切换到版本 - 版本ID: ${versionId}`);

      // 1. 查找包含该版本的消息
      const allMessages = await dexieStorage.getAllMessages();

      let targetMessage: Message | undefined;
      let targetVersion: any | undefined;

      for (const message of allMessages) {
        if (message.versions) {
          const version = message.versions.find(v => v.id === versionId);
          if (version) {
            targetMessage = message;
            targetVersion = version;
            break;
          }
        }
      }

      if (!targetMessage || !targetVersion) {
        throw new Error(`找不到版本 ${versionId}`);
      }

      const messageId = targetMessage.id;
      console.log(`[VersionService] 找到目标消息 - 消息ID: ${messageId}`);

      // 2. 获取当前版本的所有块
      const currentBlocks = await dexieStorage.getMessageBlocksByMessageId(messageId);
      const currentBlockIds = currentBlocks.map(block => block.id);

      // 3. 获取目标版本的所有块
      const versionBlockIds = targetVersion.blocks || [];
      console.log(`[VersionService] 版本块IDs: ${versionBlockIds.join(', ')}`);

      // 首先尝试通过版本ID获取块
      let versionBlocks = await dexieStorage.getMessageBlocksByVersionId(versionId);

      // 如果通过版本ID找不到块，再尝试通过块ID获取
      if (!versionBlocks || versionBlocks.length === 0) {
        console.log(`[VersionService] 通过版本ID找不到块，尝试通过块ID获取`);

        const blocksFromIds = await Promise.all(
          versionBlockIds.map((id: string) => dexieStorage.getMessageBlock(id))
        );

        versionBlocks = blocksFromIds.filter(Boolean) as MessageBlock[];
      }

      // 如果仍然找不到块，则尝试从版本的metadata中创建新块
      if (!versionBlocks || versionBlocks.length === 0) {
        console.log(`[VersionService] 找不到块，尝试从版本metadata创建`);

        // 从版本的metadata中获取内容
        const content = targetVersion.metadata?.content || '';

        if (content) {
          // 创建一个新块
          const newBlock: MessageBlock = {
            id: uuid(),
            messageId,
            type: 'main_text',
            content: content,
            metadata: {
              versionId: versionId,
              isFromVersion: true
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'success'
          };

          // 保存到数据库
          await dexieStorage.saveMessageBlock(newBlock);

          versionBlocks = [newBlock];
        }
      }

      // 过滤掉undefined
      const validVersionBlocks = versionBlocks.filter(Boolean) as MessageBlock[];
      const validBlockIds = validVersionBlocks.map(block => block.id);

      console.log(`[VersionService] 有效版本块数量: ${validVersionBlocks.length}`);

      // 4. 更新消息的版本状态
      const updatedVersions = (targetMessage.versions || []).map(v => ({
        ...v,
        isActive: v.id === versionId
      }));

      // 5. 更新消息
      const updatedMessage: Partial<Message> = {
        blocks: validBlockIds,
        versions: updatedVersions,
        status: 'success'
      };

      // 6. 更新数据库
      await dexieStorage.updateMessage(messageId, updatedMessage);

      // 7. 更新Redux状态
      // 移除旧块
      if (currentBlockIds.length > 0) {
        store.dispatch(removeManyBlocks(currentBlockIds));
      }

      // 添加新块
      if (validVersionBlocks.length > 0) {
        store.dispatch(addManyBlocks(validVersionBlocks));
      }

      // 更新消息
      store.dispatch(newMessagesActions.updateMessage({
        id: messageId,
        changes: updatedMessage
      }));

      console.log(`[VersionService] 版本切换成功 - 版本ID: ${versionId}`);
      return true;
    } catch (error) {
      console.error(`[VersionService] 切换版本失败:`, error);
      return false;
    }
  }
}

export const versionService = new VersionService();
