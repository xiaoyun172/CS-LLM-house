import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { TopicService } from '../../../shared/services/TopicService';
import store from '../../../shared/store';
import { selectMessagesForTopic } from '../../../shared/store/selectors/messageSelectors';
import { sendMessage, deleteMessage, regenerateMessage } from '../../../shared/store/thunks/messageThunk';
import type { SiliconFlowImageFormat } from '../../../shared/types';
import type { AppDispatch } from '../../../shared/store';

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
  const handleSendMessage = useCallback(async (content: string, images?: SiliconFlowImageFormat[]) => {
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
        formattedImages
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