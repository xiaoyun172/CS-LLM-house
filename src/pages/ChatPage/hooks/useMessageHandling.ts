import { useCallback } from 'react';
import { TopicService } from '../../../shared/services/TopicService';
import store from '../../../shared/store';
import { selectMessagesForTopic } from '../../../shared/store/selectors/messageSelectors';
import { createUserMessage } from '../../../shared/utils/messageUtils';
import { sendMessage } from '../../../shared/services/messages/messageThunks';
import type { SiliconFlowImageFormat } from '../../../shared/types';

/**
 * 处理消息相关逻辑的钩子
 * 负责发送、删除、重新生成消息等功能
 */
export const useMessageHandling = (
  selectedModel: any,
  currentTopic: any
) => {
  // 处理发送消息
  const handleSendMessage = useCallback(async (content: string, images?: SiliconFlowImageFormat[]) => {
    if (!currentTopic || !content.trim()) return null;

    try {
      // 转换图片格式以匹配createUserMessage的期望
      const formattedImages = images?.map(img => ({
        url: img.image_url?.url || ''
      }));

      // 创建用户消息和块
      const { message: userMessage, blocks: userBlocks } = createUserMessage({
        content: content.trim(),
        assistantId: currentTopic.assistantId,
        topicId: currentTopic.id,
        modelId: selectedModel?.id,
        model: selectedModel || undefined,
        images: formattedImages
      });

      // 保存用户消息和块到数据库和Redux状态
      await TopicService.saveMessageAndBlocks(userMessage, userBlocks);
      
      // 使用消息thunk发送API请求
      if (selectedModel) {
        store.dispatch(sendMessage({
          topicId: currentTopic.id,
          content: content.trim(),
          model: selectedModel
        }));
      }

      return userMessage.id;
    } catch (error) {
      console.error('发送消息失败:', error);
      return null;
    }
  }, [currentTopic, selectedModel]);

  // 处理删除消息
  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (!currentTopic) return;

    try {
      // 调用消息删除逻辑
      await TopicService.deleteMessageWithBlocks(messageId, currentTopic.id);
    } catch (error) {
      console.error('删除消息失败:', error);
    }
  }, [currentTopic]);

  // 处理重新生成消息
  const handleRegenerateMessage = useCallback(async (messageId: string) => {
    if (!currentTopic) return null;

    try {
      // 调用消息重新生成逻辑
      console.log(`重新生成主题 ${currentTopic.id} 中的消息 ${messageId}`);
      // 实际项目中会使用类似 await TopicService.regenerateMessage(...) 的调用
      return null;
    } catch (error) {
      console.error('重新生成消息失败:', error);
      return null;
    }
  }, [currentTopic, selectedModel]);

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
  const handleSwitchMessageVersion = useCallback(async (topicId: string, messageId: string) => {
    // 此功能暂未实现
    console.log('切换消息版本:', topicId, messageId);
    return null;
  }, []);

  return {
    handleSendMessage,
    handleDeleteMessage,
    handleRegenerateMessage,
    handleSwitchMessageVersion,
    loadTopicMessages
  };
};