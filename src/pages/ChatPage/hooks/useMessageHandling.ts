import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { TopicService } from '../../../shared/services/TopicService';
import store from '../../../shared/store';
import { selectMessagesForTopic } from '../../../shared/store/selectors/messageSelectors';
import { sendMessage, deleteMessage, regenerateMessage } from '../../../shared/store/thunks/messageThunk';
import { newMessagesActions } from '../../../shared/store/slices/newMessagesSlice';
import { addManyBlocks, removeManyBlocks } from '../../../shared/store/slices/messageBlocksSlice';
import { dexieStorage } from '../../../shared/services/DexieStorageService';
import type { SiliconFlowImageFormat } from '../../../shared/types';
import type { AppDispatch } from '../../../shared/store';
import type { Message, MessageBlock } from '../../../shared/types/newMessage';

/**
 * 处理消息相关逻辑的钩子
 * 负责发送、删除、重新生成消息等功能
 */
export const useMessageHandling = (
  selectedModel: any,
  currentTopic: any
) => {
  const dispatch = useDispatch<AppDispatch>();

  // 处理发送消息
  const handleSendMessage = useCallback(async (content: string, images?: SiliconFlowImageFormat[], toolsEnabled?: boolean) => {
    if (!currentTopic || !content.trim() || !selectedModel) return null;

    try {
      // 转换图片格式
      const formattedImages = images?.map(img => ({
        url: img.image_url?.url || ''
      }));

      // 使用Redux Thunk直接处理整个消息发送流程
      dispatch(sendMessage(
        content.trim(),
        currentTopic.id,
        selectedModel,
        formattedImages,
        toolsEnabled // 传递工具开关状态
      ));

      // 返回成功标识
      return true;
    } catch (error) {
      console.error('发送消息失败:', error);
      return null;
    }
  }, [dispatch, currentTopic, selectedModel]);

  // 处理删除消息
  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (!currentTopic) return;

    try {
      // 使用Redux Thunk删除消息
      dispatch(deleteMessage(messageId, currentTopic.id));
    } catch (error) {
      console.error('删除消息失败:', error);
    }
  }, [dispatch, currentTopic]);

  // 处理重新生成消息
  const handleRegenerateMessage = useCallback(async (messageId: string) => {
    if (!currentTopic || !selectedModel) return null;

    try {
      // 使用Redux Thunk重新生成消息
      dispatch(regenerateMessage(messageId, currentTopic.id, selectedModel));
      return true;
    } catch (error) {
      console.error('重新生成消息失败:', error);
      return null;
    }
  }, [dispatch, currentTopic, selectedModel]);

  // 加载主题消息
  const loadTopicMessages = useCallback(async (topicId: string) => {
    try {
      await TopicService.loadTopicMessages(topicId);
      return selectMessagesForTopic(store.getState(), topicId)?.length || 0;
    } catch (error) {
      console.error('加载主题消息失败:', error);
      throw error;
    }
  }, []);

  // 切换消息版本
  const handleSwitchMessageVersion = useCallback(async (versionId: string) => {
    // 不再依赖currentTopic，直接从数据库获取所有消息
    if (!versionId) {
      console.error('[handleSwitchMessageVersion] 没有提供版本ID');
      return null;
    }

    try {
      // 不需要单独获取版本信息，因为版本信息已经包含在消息对象中
      // 1. 获取所有消息
      console.log(`[handleSwitchMessageVersion] 开始查找版本ID: ${versionId}`);

      // 直接从数据库获取所有消息
      const allMessages = await dexieStorage.getAllMessages();
      console.log(`[handleSwitchMessageVersion] 从数据库获取到 ${allMessages.length} 条消息`);

      // 找到包含该版本ID的消息
      let targetMessage: Message | undefined;
      let targetVersion: any | undefined;

      for (const message of allMessages) {
        if (message.versions) {
          const version = message.versions.find(v => v.id === versionId);
          if (version) {
            targetMessage = message;
            targetVersion = version;
            console.log(`[handleSwitchMessageVersion] 找到目标消息: ID=${message.id}, 版本ID=${version.id}`);
            break;
          }
        }
      }

      if (!targetMessage || !targetVersion) {
        throw new Error(`找不到版本 ${versionId}`);
      }

      const messageId = targetMessage.id;

      // 2. 获取当前版本的所有块
      const currentBlocks = await dexieStorage.getMessageBlocksByMessageId(messageId);
      const currentBlockIds = currentBlocks.map(block => block.id);

      // 3. 获取目标版本的所有块
      const versionBlockIds = targetVersion.blocks || [];

      // 首先尝试通过版本ID获取块
      let versionBlocks = await dexieStorage.getMessageBlocksByVersionId(versionId);

      // 如果通过版本ID找不到块，再尝试通过块ID获取
      if (!versionBlocks || versionBlocks.length === 0) {
        console.log(`[handleSwitchMessageVersion] 通过版本ID找不到块，尝试通过块ID获取: ${versionBlockIds.join(',')}`);

        const blocksFromIds = await Promise.all(
          versionBlockIds.map((id: string) => dexieStorage.getMessageBlock(id))
        );

        versionBlocks = blocksFromIds.filter(Boolean) as MessageBlock[];
      }

      // 如果仍然找不到块，则创建一个新块
      if (!versionBlocks || versionBlocks.length === 0) {
        // 尝试从多个来源获取内容
        let messageContent = '';

        // 1. 首先尝试从版本的metadata中获取内容
        if (targetVersion.metadata && targetVersion.metadata.content) {
          messageContent = targetVersion.metadata.content;
          console.log(`[handleSwitchMessageVersion] 从版本metadata中获取内容`);
        }
        // 2. 如果没有，尝试从消息的主文本块中获取内容
        else {
          const mainBlocks = await dexieStorage.getMessageBlocksByMessageId(messageId)
            .then(blocks => blocks.filter(b => b.type === 'main_text'));

          if (mainBlocks.length > 0) {
            messageContent = mainBlocks[0].content || '';
            console.log(`[handleSwitchMessageVersion] 从消息主文本块中获取内容`);
          }
        }

        // 如果内容为空或只有空白字符，不要创建块
        if (!messageContent || !messageContent.trim()) {
          console.log(`[handleSwitchMessageVersion] 内容为空，不创建块`);
          versionBlocks = [];
        } else {
          console.log(`[handleSwitchMessageVersion] 找不到块，创建新块，使用消息内容: ${messageContent.substring(0, 50)}...`);

          // 创建一个新块
          const newBlock: MessageBlock = {
            id: versionBlockIds[0] || `${messageId}-block-${Date.now()}`,
            messageId,
            type: 'main_text', // 使用有效的块类型
            content: messageContent, // 使用从消息中获取的内容
            metadata: {
              versionId: versionId,
              isFromVersion: true
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'success' // 添加状态字段
          };

          // 保存到数据库
          await dexieStorage.saveMessageBlock(newBlock);

          versionBlocks = [newBlock];
        }
      }

      // 过滤掉undefined
      const validVersionBlocks = versionBlocks.filter(Boolean) as MessageBlock[];

      console.log(`[handleSwitchMessageVersion] 找到版本块: ${validVersionBlocks.length}个`);

      // 记录当前块和版本块的详细信息，帮助调试
      console.log(`[handleSwitchMessageVersion] 当前消息块IDs: ${currentBlockIds.join(', ')}`);
      console.log(`[handleSwitchMessageVersion] 版本块IDs: ${versionBlockIds.join(', ')}`);
      console.log(`[handleSwitchMessageVersion] 有效版本块IDs: ${validVersionBlocks.map(block => block.id).join(', ')}`);

      // 确保我们只使用当前版本的块，不包含其他版本的块
      const validBlockIds = validVersionBlocks.map(block => block.id);

      // 4. 更新消息的块列表和状态 - 始终设置为成功状态
      // 只使用当前版本的块ID，不包含其他版本的块
      const updatedMessage: Partial<Message> = {
        ...targetMessage,
        blocks: validBlockIds, // 只使用当前版本的有效块ID
        status: 'success' // 始终设置为成功状态
      };

      // 清除错误信息（如果有）
      if ('error' in targetMessage) {
        (updatedMessage as any).error = undefined;
      }

      // 如果存在versions数组，则更新isActive状态
      if (targetMessage.versions && Array.isArray(targetMessage.versions)) {
        // 更新版本状态
        updatedMessage.versions = targetMessage.versions.map(v => {
          // 如果是目标版本，设置为活跃
          if (v.id === versionId) {
            return {
              ...v,
              isActive: true
            };
          }
          // 其他版本设置为非活跃
          else {
            return {
              ...v,
              isActive: false
            };
          }
        });
      }

      console.log(`[handleSwitchMessageVersion] 切换到版本 ${versionId}，状态设置为: success`);

      // 5. 更新数据库 - 确保在数据库中也只保存当前版本的块
      console.log(`[handleSwitchMessageVersion] 更新数据库: 消息ID=${messageId}, 块数量=${updatedMessage.blocks?.length || 0}`);

      // 使用事务确保原子性
      await dexieStorage.transaction('rw', [
        dexieStorage.messages,
        dexieStorage.message_blocks,
        dexieStorage.topics
      ], async () => {
        // 更新消息
        await dexieStorage.updateMessage(messageId, updatedMessage);

        // 更新topics表中的messages数组
        // 使用targetMessage中的topicId，而不是外部的currentTopic.id
        const topicIdFromMessage = targetMessage.topicId;
        console.log(`[handleSwitchMessageVersion] 使用消息中的topicId: ${topicIdFromMessage}`);

        if (topicIdFromMessage) {
          const topic = await dexieStorage.topics.get(topicIdFromMessage);
          if (topic && topic.messages) {
            // 查找消息在数组中的位置
            const messageIndex = topic.messages.findIndex(m => m.id === messageId);

            // 更新消息
            if (messageIndex >= 0) {
              topic.messages[messageIndex] = {
                ...topic.messages[messageIndex],
                ...updatedMessage,
                blocks: updatedMessage.blocks || [] // 确保使用更新后的块列表，如果为undefined则使用空数组
              };

              // 保存更新后的话题
              await dexieStorage.topics.put(topic);
            }
          }
        } else {
          console.warn(`[handleSwitchMessageVersion] 无法更新topics表，消息中没有topicId`);
        }
      });

      // 6. 更新Redux状态
      // 先移除所有旧块
      if (currentBlockIds.length > 0) {
        console.log(`[handleSwitchMessageVersion] 移除旧块: ${currentBlockIds.join(', ')}`);
        dispatch(removeManyBlocks(currentBlockIds));
      }

      // 添加新版本的块
      if (validVersionBlocks.length > 0) {
        const validBlockIds = validVersionBlocks.map(block => block.id);
        console.log(`[handleSwitchMessageVersion] 添加新块: ${validBlockIds.join(', ')}`);
        dispatch(addManyBlocks(validVersionBlocks));
      }

      // 更新消息，确保只包含当前版本的块
      console.log(`[handleSwitchMessageVersion] 更新消息块列表为: ${updatedMessage.blocks?.join(', ')}`);
      dispatch(newMessagesActions.updateMessage({
        id: messageId,
        changes: updatedMessage
      }));

      return true;
    } catch (error) {
      console.error('切换消息版本失败:', error);
      return null;
    }
  }, [dispatch]); // 移除对currentTopic的依赖

  return {
    handleSendMessage,
    handleDeleteMessage,
    handleRegenerateMessage,
    handleSwitchMessageVersion,
    loadTopicMessages
  };
};