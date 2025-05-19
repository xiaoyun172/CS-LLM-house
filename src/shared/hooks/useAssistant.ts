import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { dexieStorage } from '../services/DexieStorageService';
import { EventEmitter, EVENT_NAMES } from '../services/EventService';
import { addTopic, removeTopic, updateTopic, updateAssistantTopics } from '../store/slices/assistantsSlice';
import type { RootState } from '../store';
import type { Assistant, ChatTopic } from '../types/Assistant';
// 导入getDefaultTopic函数，避免动态导入
import { getDefaultTopic } from '../services/assistant/types';

/**
 * 助手钩子 - 加载助手及其关联的话题
 * 参考电脑版实现，但适配移动端的数据结构
 */
export function useAssistant(assistantId: string | null) {
  const dispatch = useDispatch();
  const assistants = useSelector((state: RootState) => state.assistants.assistants);
  const assistant = assistantId
    ? assistants.find((a: Assistant) => a.id === assistantId) || null
    : null;

  // 添加加载状态
  const [isLoading, setIsLoading] = useState(false);

  console.log(`[useAssistant] Hook初始化，assistantId: ${assistantId}`, {
    found: !!assistant,
    topicIdsFromStore: assistant?.topicIds?.length || 0,
    topicsFromStore: assistant?.topics?.length || 0,
    isLoading
  });

  const loadAssistantTopics = useCallback(async () => {
    if (!assistantId || !assistant) {
      console.log(`[useAssistant] 无法加载话题，assistantId或assistant为空`, {
        assistantId,
        assistant: !!assistant
      });
      return;
    }

    // 检查助手是否已经有话题数据，如果有则不需要设置加载状态
    const hasTopics = assistant.topics && assistant.topics.length > 0;

    if (hasTopics) {
      console.log(`[useAssistant] 助手 ${assistantId} 已有话题数据，跳过加载`);
      return;
    }

    // 只有在需要从数据库加载时才设置加载状态
    setIsLoading(true);
    console.log('[useAssistant] 开始加载助手话题，assistantId:', assistantId, '加载状态:', true);
    console.log('[useAssistant] 助手对象:', assistant.name, assistant.id);

    try {
      // 直接从数据库获取所有话题
      const allTopics = await dexieStorage.getAllTopics();

      // 通过assistantId筛选出属于当前助手的话题
      const assistantTopics = allTopics.filter(topic => topic.assistantId === assistantId);

      console.log(`[useAssistant] 已加载助手 ${assistantId} 的话题，数量: ${assistantTopics.length}`);

      // 如果没有找到话题，可能需要创建默认话题
      if (assistantTopics.length === 0) {
        console.log('[useAssistant] 未找到该助手的话题，尝试创建默认话题');
        try {
          // 设置当前助手ID
          await dexieStorage.saveSetting('currentAssistant', assistantId);

          // 创建默认话题
          // 使用已导入的getDefaultTopic函数
          const newTopic = getDefaultTopic(assistantId);

          // 保存话题到数据库
          await dexieStorage.saveTopic(newTopic);
          console.log('[useAssistant] 已创建并保存默认话题:', newTopic.id);

          // 将新创建的话题添加到结果中
          assistantTopics.push(newTopic);
        } catch (error) {
          console.error('[useAssistant] 创建默认话题失败:', error);
        }
      }

      // 排序话题
      const sortedTopics = assistantTopics.sort((a: ChatTopic, b: ChatTopic) => {
        const timeA = new Date(a.lastMessageTime || a.updatedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.lastMessageTime || b.updatedAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      console.log('[useAssistant] 成功加载助手话题，总数:', sortedTopics.length);

      // 更新Redux状态
      if (sortedTopics.length > 0) {
        dispatch(updateAssistantTopics({ assistantId, topics: sortedTopics }));
      }
    } catch (error) {
      console.error('[useAssistant] 加载话题失败:', error);
    } finally {
      // 无论成功失败都重置加载状态
      setIsLoading(false);
      console.log('[useAssistant] 话题加载完成，加载状态:', false);
    }
  }, [assistantId, assistant, dispatch]);

  useEffect(() => {
    loadAssistantTopics();
  }, [assistantId, assistant, loadAssistantTopics]);

  useEffect(() => {
    if (!assistantId) return;

    const handleTopicChange = (eventData: any) => {
      if (eventData && (eventData.assistantId === assistantId || !eventData.assistantId)) {
        console.log('[useAssistant] 收到话题变更事件，准备刷新话题:', eventData);
        loadAssistantTopics();
      }
    };

    const unsubCreate = EventEmitter.on(EVENT_NAMES.TOPIC_CREATED, handleTopicChange);
    const unsubDelete = EventEmitter.on(EVENT_NAMES.TOPIC_DELETED, handleTopicChange);
    const unsubClear = EventEmitter.on(EVENT_NAMES.TOPICS_CLEARED, handleTopicChange);

    return () => {
      unsubCreate();
      unsubDelete();
      unsubClear();
    };
  }, [assistantId, loadAssistantTopics]);

  const addTopicToAssistant = useCallback(async (topic: ChatTopic) => {
    if (!assistantId) return false;

    if (topic.assistantId !== assistantId) {
        console.warn(`addTopicToAssistant: Topic ${topic.id} had assistantId ${topic.assistantId}. Forcing to current assistant ${assistantId}.`);
        topic.assistantId = assistantId;
    }

    try {
      // 保存话题到数据库
      await dexieStorage.saveTopic(topic);

      // 更新Redux状态
      dispatch(addTopic({ assistantId, topic }));
      console.log('[useAssistant] 成功添加话题到助手:', { topicId: topic.id, assistantId });
      return true;
    } catch (err) {
      console.error('添加话题失败:', err);
      return false;
    }
  }, [assistantId, dispatch]);

  const removeTopicFromAssistant = useCallback(async (topicId: string) => {
    if (!assistantId) return false;

    try {
      await dexieStorage.deleteTopic(topicId);

      dispatch(removeTopic({ assistantId, topicId }));
      console.log('[useAssistant] 成功从助手中删除话题:', { topicId, assistantId });
      return true;
    } catch (err) {
      console.error('删除话题失败:', err);
      return false;
    }
  }, [assistantId, dispatch]);

  const updateAssistantTopic = useCallback(async (topic: ChatTopic) => {
    if (!assistantId) return false;

    if (topic.assistantId !== assistantId) {
        console.warn(`updateAssistantTopic: Topic ${topic.id} had assistantId ${topic.assistantId}. Forcing to current assistant ${assistantId}.`);
        topic.assistantId = assistantId;
    }

    try {
      await dexieStorage.saveTopic(topic);
      dispatch(updateTopic({ assistantId, topic }));
      console.log('[useAssistant] 成功更新话题:', { topicId: topic.id, assistantId });
      return true;
    } catch (err) {
      console.error('更新话题失败:', err);
      return false;
    }
  }, [assistantId, dispatch]);

  return {
    assistant,
    isLoading, // 导出加载状态
    addTopic: addTopicToAssistant,
    removeTopic: removeTopicFromAssistant,
    updateTopic: updateAssistantTopic,
    refreshTopics: loadAssistantTopics
  };
}