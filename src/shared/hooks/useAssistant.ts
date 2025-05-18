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

  const loadAssistantTopics = useCallback(async () => {
    if (!assistantId || !assistant) return;

    console.log('[useAssistant] 开始加载助手话题，assistantId:', assistantId);
    
    const topicIds = assistant.topicIds || [];
    const topics: ChatTopic[] = [];

    for (const topicId of topicIds) {
      const topic = await dexieStorage.getTopic(topicId);
      if (topic) {
        if (topic.assistantId !== assistantId) {
          console.warn(`Topic ${topic.id} from DB has assistantId ${topic.assistantId}, hook expected ${assistantId}. Correcting for dispatch.`);
          topic.assistantId = assistantId;
        }
        topics.push(topic);
      }
    }

    topics.sort((a: ChatTopic, b: ChatTopic) => {
      const timeA = new Date(a.lastMessageTime || 0).getTime();
      const timeB = new Date(b.lastMessageTime || 0).getTime();
      return timeB - timeA;
    });
    
    console.log('[useAssistant] 成功加载助手话题，总数:', topics.length, 'topics:', topics);

    dispatch(updateAssistantTopics({ assistantId, topics }));
  }, [assistantId, assistant, dispatch]);

  useEffect(() => {
    loadAssistantTopics();
  }, [assistantId, assistant, loadAssistantTopics]);

  useEffect(() => {
    if (!assistantId) return;

    const handleTopicChange = (eventData: any) => {
      if (eventData && (eventData.assistantId === assistantId || !eventData.assistantId)) {
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