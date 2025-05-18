import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { dexieStorage } from '../services/DexieStorageService';
import { EventEmitter, EVENT_NAMES } from '../services/EventService';
import { addTopic, removeTopic, updateTopic, updateAssistantTopics } from '../store/slices/assistantsSlice';
import type { RootState } from '../store';
import store from '../store'; // Import store for getState
import type { Assistant, ChatTopic } from '../types/Assistant';

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

  console.log(`[useAssistant] Hook初始化，assistantId: ${assistantId}`, {
    found: !!assistant,
    topicIdsFromStore: assistant?.topicIds?.length || 0,
    topicsFromStore: assistant?.topics?.length || 0
  });

  const loadAssistantTopics = useCallback(async () => {
    if (!assistantId || !assistant) {
      console.log(`[useAssistant] 无法加载话题，assistantId或assistant为空`, {
        assistantId,
        assistant: !!assistant
      });
      return;
    }

    console.log('[useAssistant] 开始加载助手话题，assistantId:', assistantId);
    console.log('[useAssistant] 助手对象:', assistant.name, assistant.id);
    console.log('[useAssistant] 助手的topicIds:', assistant.topicIds);

    const topicIds = assistant.topicIds || [];
    let topics: ChatTopic[] = [];

    // 尝试两种方式获取话题
    // 方法1: 从topicIds加载话题
    if (topicIds.length > 0) {
      console.log('[useAssistant] 从topicIds加载话题，数量:', topicIds.length);
      for (const topicId of topicIds) {
        const topic = await dexieStorage.getTopic(topicId);
        if (topic) {
          if (topic.assistantId !== assistantId) {
            console.warn(`[useAssistant] 话题 ${topic.id} 的assistantId (${topic.assistantId}) 与助手ID (${assistantId}) 不匹配，正在修正`);
            topic.assistantId = assistantId;
            await dexieStorage.saveTopic(topic); // 保存修正后的话题
          }
          topics.push(topic);
        } else {
          console.warn(`[useAssistant] 话题 ${topicId} 在数据库中不存在`);
        }
      }
    }

    // 方法2: 如果从topicIds没有找到话题，尝试直接从数据库加载该助手的所有话题
    if (topics.length === 0) {
      console.log('[useAssistant] 从topicIds没有找到话题，尝试直接从数据库加载所有话题');
      const allTopics = await dexieStorage.getAllTopics();
      const assistantTopics = allTopics.filter(t => t.assistantId === assistantId);

      if (assistantTopics.length > 0) {
        console.log('[useAssistant] 从数据库找到助手相关话题:', assistantTopics.length);
        topics = assistantTopics;

        // 更新助手的topicIds
        const updatedTopicIds = assistantTopics.map(t => t.id);
        const updatedAssistant = {
          ...assistant,
          topicIds: updatedTopicIds
        };
        await dexieStorage.saveAssistant(updatedAssistant);
        console.log('[useAssistant] 已更新助手的topicIds:', updatedTopicIds);
      } else {
        console.log('[useAssistant] 数据库中没有找到该助手的话题');

        // 方法3: 如果仍然没有找到话题，尝试创建一个默认话题
        console.log('[useAssistant] 尝试创建默认话题');
        try {
          // 设置当前助手ID
          await dexieStorage.saveSetting('currentAssistant', assistantId);

          // 创建默认话题
          const { getDefaultTopic } = await import('../services/assistant/types');
          const newTopic = getDefaultTopic(assistantId);

          // 保存话题到数据库
          await dexieStorage.saveTopic(newTopic);
          console.log('[useAssistant] 已创建并保存默认话题:', newTopic.id);

          // 添加话题到助手
          const updatedAssistant = {
            ...assistant,
            topicIds: [newTopic.id]
          };
          await dexieStorage.saveAssistant(updatedAssistant);
          console.log('[useAssistant] 已更新助手的topicIds:', [newTopic.id]);

          // 添加话题到结果
          topics = [newTopic];
        } catch (error) {
          console.error('[useAssistant] 创建默认话题失败:', error);
        }
      }
    }

    // 排序话题
    topics.sort((a: ChatTopic, b: ChatTopic) => {
      const timeA = new Date(a.lastMessageTime || 0).getTime();
      const timeB = new Date(b.lastMessageTime || 0).getTime();
      return timeB - timeA;
    });

    console.log('[useAssistant] 成功加载助手话题，总数:', topics.length, 'topics:', topics);

    // 确保Redux状态更新
    if (topics.length > 0) {
      dispatch(updateAssistantTopics({ assistantId, topics }));
    } else {
      console.warn('[useAssistant] 没有找到话题，不更新Redux状态');
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
      await dexieStorage.saveTopic(topic);

      const currentAssistantFromStore = store.getState().assistants.assistants.find((a: Assistant) => a.id === assistantId);
      if (!currentAssistantFromStore) {
        console.error(`Assistant ${assistantId} not found in store for addTopicToAssistant.`);
        return false;
      }

      const updatedTopicIds = currentAssistantFromStore.topicIds.includes(topic.id)
        ? currentAssistantFromStore.topicIds
        : [...currentAssistantFromStore.topicIds, topic.id];

      const assistantToSave: Assistant = {
        ...currentAssistantFromStore,
        topicIds: updatedTopicIds,
        topics: currentAssistantFromStore.topics || [],
      };
      await dexieStorage.saveAssistant(assistantToSave);

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

      const currentAssistantFromStore = store.getState().assistants.assistants.find((a: Assistant) => a.id === assistantId);
      if (!currentAssistantFromStore) {
         console.error(`Assistant ${assistantId} not found in store for removeTopicFromAssistant.`);
        return false;
      }

      const updatedTopicIds = currentAssistantFromStore.topicIds.filter((id: string) => id !== topicId);
      const updatedTopicsForDexie = currentAssistantFromStore.topics?.filter((t: ChatTopic) => t.id !== topicId) || [];

      const assistantToSave: Assistant = {
        ...currentAssistantFromStore,
        topicIds: updatedTopicIds,
        topics: updatedTopicsForDexie,
      };
      await dexieStorage.saveAssistant(assistantToSave);

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
    addTopic: addTopicToAssistant,
    removeTopic: removeTopicFromAssistant,
    updateTopic: updateAssistantTopic,
    refreshTopics: loadAssistantTopics
  };
}