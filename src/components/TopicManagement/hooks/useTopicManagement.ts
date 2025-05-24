import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { newMessagesActions } from '../../../shared/store/slices/newMessagesSlice';
import { AssistantService } from '../../../shared/services';
import { TopicService } from '../../../shared/services/TopicService';
import { EventEmitter, EVENT_NAMES } from '../../../shared/services/EventService';
import type { Assistant, ChatTopic } from '../../../shared/types/Assistant';

/**
 * 话题管理钩子
 */
export function useTopicManagement({
  currentAssistant,
  setCurrentAssistant,
  assistantWithTopics,
  currentTopic,
  refreshTopics,
  updateAssistantTopic
}: {
  currentAssistant: Assistant | null;
  setCurrentAssistant: (assistant: Assistant | null) => void;
  assistantWithTopics: Assistant | null;
  currentTopic: ChatTopic | null;
  refreshTopics: () => Promise<void>;
  updateAssistantTopic: (topic: ChatTopic) => void;
}) {
  const dispatch = useDispatch();

  // 创建新话题
  const handleCreateTopic = useCallback(async () => {
    if (!currentAssistant) {
      console.error('[SidebarTabs] 无法创建话题: 当前没有选中的助手');
      return null;
    }

    try {
      console.log('[SidebarTabs] 开始创建新话题，当前助手:', currentAssistant.name, currentAssistant.id);
      const newTopic = await TopicService.createNewTopic();

      if (newTopic) {
        console.log('[SidebarTabs] 成功创建新话题:', newTopic.id);

        // 更新当前助手对象，添加新话题
        const updatedAssistant = {
          ...currentAssistant,
          topicIds: [...(currentAssistant.topicIds || []), newTopic.id],
          topics: [...(currentAssistant.topics || []), newTopic]
        };

        // 更新当前助手状态
        setCurrentAssistant(updatedAssistant);

        // 设置当前话题 - 立即选择新创建的话题
        dispatch(newMessagesActions.setCurrentTopicId(newTopic.id));

        // 刷新话题列表
        setTimeout(() => {
          refreshTopics();

          // 确保话题侧边栏显示并选中新话题 - 模拟最佳实例行为
          EventEmitter.emit(EVENT_NAMES.SHOW_TOPIC_SIDEBAR);

          // 再次确保新话题被选中，防止其他逻辑覆盖
          setTimeout(() => {
            dispatch(newMessagesActions.setCurrentTopicId(newTopic.id));
          }, 50);
        }, 100);
      }

      return newTopic;
    } catch (error) {
      console.error('[SidebarTabs] 创建新话题时出错:', error);
      return null;
    }
  }, [currentAssistant, dispatch, refreshTopics, setCurrentAssistant]);

  // 选择话题
  const handleSelectTopic = (topic: ChatTopic) => {
    console.log('[SidebarTabs] 选择话题:', topic);

    // 获取助手信息
    const assistant = currentAssistant || assistantWithTopics;

    if (assistant && topic) {
      console.log('[SidebarTabs] 找到助手:', assistant.name);

      // 创建一个新的话题对象，包含原始话题的所有属性
      const topicWithAssistantInfo = {
        ...topic,
        // 不修改原始话题名称，在ChatPage中显示时会组合
      };

      // 分发 action，将话题设置为当前话题
      dispatch(newMessagesActions.setCurrentTopicId(topicWithAssistantInfo.id));
    } else {
      console.warn('[SidebarTabs] 选择话题时找不到对应的助手');
      dispatch(newMessagesActions.setCurrentTopicId(topic.id));
    }
  };

  // 删除话题
  const handleDeleteTopic = async (topicId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      if (currentAssistant) {
        await AssistantService.removeTopicFromAssistant(currentAssistant.id, topicId);
      }
      await TopicService.deleteTopic(topicId);
      // 从数据库中删除话题后，清除该话题的消息
      dispatch(newMessagesActions.clearTopicMessages(topicId));
      if (currentTopic && currentTopic.id === topicId) {
        const assistantTopics = assistantWithTopics?.topics || [];
        if (assistantTopics.length > 0 && assistantTopics[0].id !== topicId) {
          dispatch(newMessagesActions.setCurrentTopicId(assistantTopics[0].id));
        } else {
          dispatch(newMessagesActions.setCurrentTopicId(null));
        }
      }
    } catch (error) {
      console.error('[SidebarTabs] 删除话题失败:', error);
    }
  };

  // 更新话题
  const handleUpdateTopic = (topic: ChatTopic) => {
    // 使用新的格式更新话题
    // 注意：这里不再需要通过Redux更新话题，直接更新数据库即可
    // 数据库更新会通过 updateAssistantTopic 处理
    updateAssistantTopic(topic); // 来自 useAssistant
  };

  return {
    handleCreateTopic,
    handleSelectTopic,
    handleDeleteTopic,
    handleUpdateTopic
  };
}
