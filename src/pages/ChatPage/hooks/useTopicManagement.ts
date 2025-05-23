import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { newMessagesActions } from '../../../shared/store/slices/newMessagesSlice';
import type { ChatTopic } from '../../../shared/types';
import { AssistantService } from '../../../shared/services';
import type { Assistant } from '../../../shared/types/Assistant';
import { TopicService } from '../../../shared/services/TopicService';
import { getStorageItem } from '../../../shared/utils/storage';
import { formatDateForTopicTitle } from '../../../shared/utils';
import { dexieStorage } from '../../../shared/services/DexieStorageService';
import { v4 as uuid } from 'uuid';

export function useTopicManagement(currentTopic: ChatTopic | null) {
  const dispatch = useDispatch();
  // 本地状态
  const [topics, setTopics] = useState<ChatTopic[]>([]);

  // 初始化加载主题
  useEffect(() => {
    loadTopics().then(loadedTopics => {
      setTopics(loadedTopics);
    });
  }, []);

  // 当主题变化时保存到本地存储
  useEffect(() => {
    if (topics.length > 0) {
      // 保存前对话题进行去重 - 现在由dexieStorage内部处理
      // 此处保留空实现，确保不破坏现有的状态管理行为

    }
  }, [topics]);

  // 从本地存储加载主题
  const loadTopics = async (): Promise<ChatTopic[]> => {
    try {
      // 使用dexieStorage获取话题
      const validTopics = await dexieStorage.getAllTopics();

      // 如果有主题，选择第一个
      if (validTopics.length > 0 && !currentTopic) {

        // 设置当前主题
        dispatch(newMessagesActions.setCurrentTopicId(validTopics[0].id));

        // 加载每个话题的消息到Redux
        for (const topic of validTopics) {
          // 判断消息格式：
          // 新格式：使用 messageIds 数组，messages 为空或不存在
          // 旧格式：使用 messages 数组存储完整消息对象
          if (topic.messageIds && topic.messageIds.length > 0) {
            // 新格式：已经在 App.tsx 中使用 loadTopicMessagesThunk 加载了所有话题的消息
            // 无需额外处理
          } else if (topic.messages && topic.messages.length > 0) {
            // 旧格式：需要迁移
            try {
              await dexieStorage.migrateTopicMessages(topic.id);
            } catch (error) {
              console.error(`话题 ${topic.id} 迁移失败:`, error);
            }
          }
          // 空话题无需处理
        }
      }

      return validTopics;
    } catch (error) {
      console.error('通过dexieStorage加载话题失败:', error);

      // 检查是否是首次使用应用
      const isFirstTimeUser = await getStorageItem<string>('first-time-user') === null;

      // 只有在首次使用应用时才创建默认话题
      if (isFirstTimeUser) {
        return createDefaultTopic();
      } else {
        return [];
      }
    }
  };

  // 创建默认话题
  const createDefaultTopic = async (): Promise<ChatTopic[]> => {
    // 尝试获取当前助手ID，以便在创建时使用
    let assistantIdForTopic = await getStorageItem<string>('currentAssistant');
    if (!assistantIdForTopic) {
      // 如果没有当前助手，可以考虑不创建默认话题，或者使用一个预定义的ID
      // 为了通过类型检查，这里我们用一个占位符，但实际应用中应有更好处理
      console.warn('创建默认话题时未找到当前助手ID，将使用占位符');
      assistantIdForTopic = 'default_assistant_placeholder';
    }

    const now = new Date();
    const formattedDate = formatDateForTopicTitle(now);

    const defaultTopic: ChatTopic = {
      id: uuid(),
      name: `新的对话 ${formattedDate}`,
      title: `新的对话 ${formattedDate}`,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      lastMessageTime: now.toISOString(),
      messages: [],
      messageIds: [],
      assistantId: assistantIdForTopic,
      isNameManuallyEdited: false
    };

    // 使用dexieStorage保存话题到数据库
    try {
      await dexieStorage.saveTopic(defaultTopic);
    } catch (error) {
      console.error('通过dexieStorage创建默认话题失败:', error);
    }

    // 仍然使用Redux操作，保持状态一致性
    // 注意：newMessagesSlice 中没有 addTopic action，我们只需要设置当前话题ID
    dispatch(newMessagesActions.setCurrentTopicId(defaultTopic.id));

    // 获取当前助手ID
    const currentAssistantId = await getStorageItem<string>('currentAssistant');

    // 如果存在助手ID，尝试关联话题
    if (currentAssistantId) {
      try {
        // 获取助手列表
        const assistantsData = await AssistantService.getUserAssistants();
        const currentAssistant = assistantsData.find((a: Assistant) => a.id === currentAssistantId);

        if (currentAssistant) {
          // 将话题与当前助手关联
          const updatedAssistant = {
            ...currentAssistant,
            topicIds: [...(currentAssistant.topicIds || []), defaultTopic.id]
          };

          // 保存更新的助手
          await AssistantService.updateAssistant(updatedAssistant);
        }
      } catch (error) {
        console.error('关联默认话题到助手时出错:', error);
      }
    }

    return [defaultTopic];
  };

  // 处理新建话题
  const handleNewTopic = async () => {
    try {
      // 使用统一的TopicService创建话题
      const newTopic = await TopicService.createNewTopic();

      if (newTopic) {
        return newTopic;
      } else {
        console.error('useTopicManagement: 话题创建失败');
        return null;
      }
    } catch (error) {
      console.error('useTopicManagement: 创建新话题时出错:', error);
      return null;
    }
  };

  // 清空当前话题内容
  const handleClearTopic = () => {
    if (!currentTopic) return;

    // 使用统一的TopicService清空话题内容
    TopicService.clearTopicContent(currentTopic.id)
      .then(success => {
        if (!success) {
          console.error('useTopicManagement: 清空话题内容失败');
        }
      })
      .catch(error => {
        console.error('useTopicManagement: 清空话题内容出错:', error);
      });
  };

  // 不再需要处理话题数据的函数，因为我们直接从数据库加载消息

  return {
    topics,
    handleNewTopic,
    handleClearTopic
  };
}