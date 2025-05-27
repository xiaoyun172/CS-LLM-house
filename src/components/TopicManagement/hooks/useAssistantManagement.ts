import { useCallback, useTransition } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { newMessagesActions } from '../../../shared/store/slices/newMessagesSlice';
import { addAssistant, setCurrentAssistant as setReduxCurrentAssistant, updateAssistant, removeAssistant } from '../../../shared/store/slices/assistantsSlice';
import { AssistantService } from '../../../shared/services';
import { dexieStorage } from '../../../shared/services/DexieStorageService';
import { TopicService } from '../../../shared/services/TopicService';
import { setStorageItem } from '../../../shared/utils/storage';
import type { Assistant, ChatTopic } from '../../../shared/types/Assistant';
import type { RootState } from '../../../shared/store';

// 常量
const CURRENT_ASSISTANT_ID_KEY = 'currentAssistantId';

/**
 * 助手管理钩子
 */
export function useAssistantManagement({
  currentAssistant,
  setCurrentAssistant,
  // setUserAssistants, // 暂时注释掉未使用的变量
  currentTopic
}: {
  currentAssistant: Assistant | null;
  setCurrentAssistant: (assistant: Assistant | null) => void;
  setUserAssistants?: (assistants: Assistant[]) => void; // 改为可选参数
  currentTopic: ChatTopic | null;
}) {
  const dispatch = useDispatch();
  // 使用useTransition钩子，获取isPending状态和startTransition函数
  const [isPending, startTransition] = useTransition();

  // 获取当前Redux中的助手列表
  const allAssistants = useSelector((state: RootState) => state.assistants.assistants);

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

  // 选择助手 - 直接使用Redux dispatch，类似最佳实例，添加useCallback缓存
  const handleSelectAssistant = useCallback(async (assistant: Assistant) => {
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

      // 使用startTransition包装状态更新，减少渲染阻塞
      startTransition(() => {
        // 使用Redux dispatch设置当前助手
        dispatch(setReduxCurrentAssistant(assistant));

        // 更新本地状态
        setCurrentAssistant(assistant);
      });

      // 检查当前话题是否属于选中的助手，避免调用refreshTopics导致重新加载
      const topicBelongsToAssistant = currentTopic &&
                                     (currentTopic.assistantId === assistant.id ||
                                      assistant.topicIds?.includes(currentTopic.id) ||
                                      assistant.topics?.some(topic => topic.id === currentTopic.id));

      // 如果当前话题不属于选中的助手，或者没有当前话题，自动选择该助手的第一个话题
      if (!topicBelongsToAssistant && assistant.topics && assistant.topics.length > 0) {
        console.log(`[useAssistantManagement] 当前话题不属于选中的助手或没有当前话题，自动选择第一个话题: ${assistant.topics[0].name}`);

        // 使用startTransition包装话题ID更新
        startTransition(() => {
          dispatch(newMessagesActions.setCurrentTopicId(assistant.topics[0].id));
        });
      }

      console.log('[useAssistantManagement] 助手选择完成:', assistant.id);
    } catch (error) {
      console.error('选择助手失败:', error);
    }
  }, [dispatch, setCurrentAssistant, currentTopic]);

  // 添加助手 - 直接使用Redux dispatch，类似最佳实例，添加useCallback缓存
  const handleAddAssistant = useCallback(async (assistant: Assistant) => {
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

      // 使用startTransition包装状态更新，减少渲染阻塞
      startTransition(() => {
        // 直接使用Redux dispatch更新状态
        dispatch(addAssistant(assistant));
        dispatch(setReduxCurrentAssistant(assistant));

        // 更新本地状态
        setCurrentAssistant(assistant);
      });

      console.log('[useAssistantManagement] 助手添加完成:', assistant.id);
    } catch (error) {
      console.error('添加助手失败:', error);
    }
  }, [dispatch, setCurrentAssistant]);

  // 更新助手 - 直接使用Redux dispatch，类似最佳实例，添加useCallback缓存
  const handleUpdateAssistant = useCallback(async (assistant: Assistant) => {
    try {
      console.log('[useAssistantManagement] 开始更新助手:', assistant.name);

      // 保存助手到数据库（仍然需要保存到数据库以便持久化）
      await dexieStorage.saveAssistant(assistant);

      // 使用startTransition包装状态更新，减少渲染阻塞
      startTransition(() => {
        // 直接使用Redux dispatch更新状态
        dispatch(updateAssistant(assistant));

        // 如果更新的是当前助手，更新本地状态
        if (currentAssistant && currentAssistant.id === assistant.id) {
          setCurrentAssistant(assistant);
        }
      });

      console.log('[useAssistantManagement] 助手更新完成:', assistant.id);
    } catch (error) {
      console.error('更新助手失败:', error);
    }
  }, [dispatch, currentAssistant, setCurrentAssistant]);

  // 删除助手 - 直接使用Redux dispatch，类似最佳实例，添加useCallback缓存
  const handleDeleteAssistant = useCallback(async (assistantId: string) => {
    try {
      console.log('[useAssistantManagement] 开始删除助手:', assistantId);

      // 从数据库删除助手（仍然需要从数据库删除以便持久化）
      await dexieStorage.deleteAssistant(assistantId);

      // 使用startTransition包装状态更新，减少渲染阻塞
      startTransition(() => {
        // 直接使用Redux dispatch更新状态
        dispatch(removeAssistant(assistantId));
      });

      // 如果删除的是当前助手，从Redux状态中选择新的当前助手
      if (currentAssistant && currentAssistant.id === assistantId) {
        // 使用startTransition包装状态更新，减少渲染阻塞
        startTransition(() => {
          // 从当前Redux状态中获取剩余的助手
          const remainingAssistants = allAssistants.filter((a: Assistant) => a.id !== assistantId);

          if (remainingAssistants.length > 0) {
            setCurrentAssistant(remainingAssistants[0]);
            dispatch(setReduxCurrentAssistant(remainingAssistants[0]));
          } else {
            setCurrentAssistant(null);
            dispatch(setReduxCurrentAssistant(null));
          }
        });
      }

      console.log('[useAssistantManagement] 助手删除完成:', assistantId);
    } catch (error) {
      console.error('删除助手失败:', error);
    }
  }, [dispatch, currentAssistant, setCurrentAssistant]);

  return {
    handleSelectAssistant,
    handleAddAssistant,
    handleUpdateAssistant,
    handleDeleteAssistant,
    isPending // 导出isPending状态，可用于UI显示加载状态
  };
}
