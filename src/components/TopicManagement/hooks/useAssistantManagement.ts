import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { newMessagesActions } from '../../../shared/store/slices/newMessagesSlice';
import { addAssistant, setCurrentAssistant as setReduxCurrentAssistant, updateAssistant, removeAssistant } from '../../../shared/store/slices/assistantsSlice';
import { AssistantService } from '../../../shared/services';
import { dexieStorage } from '../../../shared/services/DexieStorageService';
import { TopicService } from '../../../shared/services/TopicService';
import { setStorageItem } from '../../../shared/utils/storage';
import type { Assistant, ChatTopic } from '../../../shared/types/Assistant';

// 常量
const CURRENT_ASSISTANT_ID_KEY = 'currentAssistantId';

/**
 * 助手管理钩子
 */
export function useAssistantManagement({
  currentAssistant,
  setCurrentAssistant,
  // setUserAssistants, // 暂时注释掉未使用的变量
  currentTopic,
  refreshTopics
}: {
  currentAssistant: Assistant | null;
  setCurrentAssistant: (assistant: Assistant | null) => void;
  setUserAssistants?: (assistants: Assistant[]) => void; // 改为可选参数
  currentTopic: ChatTopic | null;
  refreshTopics: () => Promise<void>;
}) {
  const dispatch = useDispatch();

  // 保存当前选择的助手ID到本地存储
  const persistCurrentAssistantId = useCallback(async (assistantId: string) => {
    try {
      await setStorageItem(CURRENT_ASSISTANT_ID_KEY, assistantId);
    } catch (error) {
      console.warn('[SidebarTabs] 缓存助手ID到存储失败:', error);
    }
  }, []);

  // 当选择新助手时，保存助手ID到本地存储
  useCallback(() => {
    if (currentAssistant?.id) {
      persistCurrentAssistantId(currentAssistant.id);
    }
  }, [currentAssistant?.id, persistCurrentAssistantId]);

  // 选择助手 - 直接使用Redux dispatch，类似电脑版
  const handleSelectAssistant = async (assistant: Assistant) => {
    try {
      console.log('[useAssistantManagement] 开始选择助手:', assistant.name);

      // 设置当前助手到数据库（仍然需要保存到数据库以便持久化）
      await dexieStorage.saveSetting('currentAssistant', assistant.id);

      // 检查助手是否有话题
      const topicIds = await AssistantService.getAssistantTopics(assistant.id);

      // 如果没有话题，创建默认话题
      if (topicIds.length === 0) {
        const newTopic = await TopicService.createNewTopic();
        if (newTopic) {
          // 保存话题到数据库
          await dexieStorage.saveTopic(newTopic);

          // 更新助手对象
          assistant = {
            ...assistant,
            topicIds: [newTopic.id],
            topics: [newTopic]
          };

          // 保存更新后的助手到数据库
          await dexieStorage.saveAssistant(assistant);

          // 使用Redux dispatch更新助手
          dispatch(updateAssistant(assistant));
        }
      } else {
        // 加载话题数据
        const allTopics = await dexieStorage.getAllTopics();
        const assistantTopics = allTopics.filter((topic: ChatTopic) => topic.assistantId === assistant.id);

        // 按最后消息时间排序
        assistantTopics.sort((a: ChatTopic, b: ChatTopic) => {
          const timeA = new Date(a.lastMessageTime || 0).getTime();
          const timeB = new Date(b.lastMessageTime || 0).getTime();
          return timeB - timeA;
        });

        // 更新助手对象
        assistant = {
          ...assistant,
          topics: assistantTopics
        };
      }

      // 如果当前话题不属于选中的助手，清除当前话题
      if (currentTopic && currentTopic.assistantId !== assistant.id) {
        dispatch(newMessagesActions.setCurrentTopicId(null));
      }

      // 使用Redux dispatch设置当前助手
      dispatch(setReduxCurrentAssistant(assistant));

      // 更新本地状态
      setCurrentAssistant(assistant);

      // 刷新话题列表
      setTimeout(async () => {
        await refreshTopics();

        // 自动选择第一个话题
        if (assistant.topics && assistant.topics.length > 0 && !currentTopic) {
          dispatch(newMessagesActions.setCurrentTopicId(assistant.topics[0].id));
        }
      }, 200);

      console.log('[useAssistantManagement] 助手选择完成:', assistant.id);
    } catch (error) {
      console.error('选择助手失败:', error);
    }
  };

  // 添加助手 - 直接使用Redux dispatch，类似电脑版
  const handleAddAssistant = async (assistant: Assistant) => {
    try {
      console.log('[useAssistantManagement] 开始添加助手:', assistant.name);

      // 保存话题到数据库（仍然需要保存到数据库以便持久化）
      if (assistant.topics && assistant.topics.length > 0) {
        for (const topic of assistant.topics) {
          await dexieStorage.saveTopic(topic);
        }
      }

      // 保存助手到数据库（仍然需要保存到数据库以便持久化）
      await dexieStorage.saveAssistant(assistant);

      // 设置为当前助手到数据库（仍然需要保存到数据库以便持久化）
      await dexieStorage.saveSetting('currentAssistant', assistant.id);

      // 直接使用Redux dispatch更新状态
      dispatch(addAssistant(assistant));
      dispatch(setReduxCurrentAssistant(assistant));

      // 更新本地状态
      setCurrentAssistant(assistant);

      console.log('[useAssistantManagement] 助手添加完成:', assistant.id);
    } catch (error) {
      console.error('添加助手失败:', error);
    }
  };

  // 更新助手 - 直接使用Redux dispatch，类似电脑版
  const handleUpdateAssistant = async (assistant: Assistant) => {
    try {
      console.log('[useAssistantManagement] 开始更新助手:', assistant.name);

      // 保存助手到数据库（仍然需要保存到数据库以便持久化）
      await dexieStorage.saveAssistant(assistant);

      // 直接使用Redux dispatch更新状态
      dispatch(updateAssistant(assistant));

      // 如果更新的是当前助手，更新本地状态
      if (currentAssistant && currentAssistant.id === assistant.id) {
        setCurrentAssistant(assistant);
      }

      console.log('[useAssistantManagement] 助手更新完成:', assistant.id);
    } catch (error) {
      console.error('更新助手失败:', error);
    }
  };

  // 删除助手 - 直接使用Redux dispatch，类似电脑版
  const handleDeleteAssistant = async (assistantId: string) => {
    try {
      console.log('[useAssistantManagement] 开始删除助手:', assistantId);

      // 从数据库删除助手（仍然需要从数据库删除以便持久化）
      await dexieStorage.deleteAssistant(assistantId);

      // 直接使用Redux dispatch更新状态
      dispatch(removeAssistant(assistantId));

      // 如果删除的是当前助手，更新本地状态
      if (currentAssistant && currentAssistant.id === assistantId) {
        const updatedAssistants = await AssistantService.getUserAssistants();
        if (updatedAssistants.length > 0) {
          setCurrentAssistant(updatedAssistants[0]);
          dispatch(setReduxCurrentAssistant(updatedAssistants[0]));
        } else {
          setCurrentAssistant(null);
          dispatch(setReduxCurrentAssistant(null));
        }
      }

      console.log('[useAssistantManagement] 助手删除完成:', assistantId);
    } catch (error) {
      console.error('删除助手失败:', error);
    }
  };

  return {
    handleSelectAssistant,
    handleAddAssistant,
    handleUpdateAssistant,
    handleDeleteAssistant
  };
}
