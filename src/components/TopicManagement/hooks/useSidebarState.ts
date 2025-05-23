import { useState, useRef, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import { useAssistant } from '../../../shared/hooks';
import { AssistantService } from '../../../shared/services';
import { getStorageItem } from '../../../shared/utils/storage';
import { EventEmitter, EVENT_NAMES } from '../../../shared/services/EventService';
import type { Assistant } from '../../../shared/types/Assistant';
import type { RootState } from '../../../shared/store';
import { setAssistants, setCurrentAssistant as setReduxCurrentAssistant } from '../../../shared/store/slices/assistantsSlice';
import { dexieStorage } from '../../../shared/services/DexieStorageService';

// 常量
const CURRENT_ASSISTANT_ID_KEY = 'currentAssistantId';

/**
 * 侧边栏状态管理钩子
 */
export function useSidebarState() {
  const [value, setValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  // 使用本地状态作为备份，但主要从Redux获取数据
  const [userAssistants, setLocalUserAssistants] = useState<Assistant[]>([]);
  const [currentAssistant, setLocalCurrentAssistant] = useState<Assistant | null>(null);
  const dispatch = useDispatch();

  // 创建记忆化的 selector 来避免不必要的重新渲染
  const selectSidebarState = useMemo(
    () => createSelector(
      [
        (state: RootState) => state.assistants.assistants,
        (state: RootState) => state.assistants.currentAssistant,
        (state: RootState) => state.messages.currentTopicId
      ],
      (reduxAssistants, reduxCurrentAssistant, currentTopicId) => ({
        reduxAssistants,
        reduxCurrentAssistant,
        currentTopicId
      })
    ),
    []
  );

  // 从Redux获取助手列表和当前助手
  const { reduxAssistants, reduxCurrentAssistant, currentTopicId } = useSelector(selectSidebarState);

  // 从数据库获取当前话题
  const [currentTopic, setCurrentTopic] = useState<any>(null);

  // 当话题ID变化时，从数据库获取话题信息
  useEffect(() => {
    const loadTopic = async () => {
      if (!currentTopicId) {
        setCurrentTopic(null);
        return;
      }

      try {
        const topic = await dexieStorage.getTopic(currentTopicId);
        if (topic) {
          setCurrentTopic(topic);
        }
      } catch (error) {
        console.error('加载话题信息失败:', error);
      }
    };

    loadTopic();
  }, [currentTopicId]);

  // 使用useAssistant钩子加载当前助手的话题
  const {
    assistant: assistantWithTopics,
    // isLoading: topicsLoading, // 注释掉未使用的变量
    updateTopic: updateAssistantTopic,
    refreshTopics,
  } = useAssistant(currentAssistant?.id || null);

  // 设置用户助手的函数，同时更新本地状态和Redux
  const setUserAssistants = (assistants: Assistant[]) => {
    setLocalUserAssistants(assistants);
    dispatch(setAssistants(assistants));
  };

  // 设置当前助手的函数，同时更新本地状态和Redux
  const setCurrentAssistant = (assistant: Assistant | null) => {
    setLocalCurrentAssistant(assistant);
    dispatch(setReduxCurrentAssistant(assistant));
  };

  // 加载助手列表
  const loadAssistants = async () => {
    try {
      console.log('[SidebarTabs] 开始加载助手列表');
      const assistants = await AssistantService.getUserAssistants();
      console.log('[SidebarTabs] 获取到助手列表:', assistants.length);

      // 同时更新本地状态和Redux状态
      setUserAssistants(assistants);

      // 获取当前助手ID
      const currentAssistant = await AssistantService.getCurrentAssistant();
      console.log('[SidebarTabs] 获取到当前助手:', currentAssistant?.name);

      if (currentAssistant) {
        // 如果有当前助手，直接使用
        setCurrentAssistant(currentAssistant);
      } else {
        // 否则，尝试从缓存中获取
        const cachedAssistantId = await getStorageItem<string>(CURRENT_ASSISTANT_ID_KEY);
        console.log('[SidebarTabs] 从缓存获取到助手ID:', cachedAssistantId);

        if (cachedAssistantId && assistants.length > 0) {
          const cachedAssistant = assistants.find(assistant => assistant.id === cachedAssistantId);
          if (cachedAssistant) {
            console.log('[SidebarTabs] 从缓存找到助手:', cachedAssistant.name);
            setCurrentAssistant(cachedAssistant);
            // 设置当前助手到数据库
            await AssistantService.setCurrentAssistant(cachedAssistant.id);
          } else if (assistants.length > 0) {
            console.log('[SidebarTabs] 缓存助手不存在，使用第一个助手:', assistants[0].name);
            setCurrentAssistant(assistants[0]);
            // 设置当前助手到数据库
            await AssistantService.setCurrentAssistant(assistants[0].id);
          }
        } else if (assistants.length > 0) {
          console.log('[SidebarTabs] 没有缓存助手，使用第一个助手:', assistants[0].name);
          setCurrentAssistant(assistants[0]);
          // 设置当前助手到数据库
          await AssistantService.setCurrentAssistant(assistants[0].id);
        }
      }


    } catch (error) {
      console.error('[SidebarTabs] 加载助手数据失败:', error);
      throw error;
    }
  };

  // 初始化数据
  useEffect(() => {
    async function initializeData() {
      try {
        setLoading(true);
        await loadAssistants(); // 加载助手列表
        initialized.current = true;
      } catch (error) {
        console.error('[SidebarTabs] 初始化数据失败:', error);
      } finally {
        setLoading(false); // 确保loading状态在成功或失败后都设置
      }
    }

    if (!initialized.current) {
      initializeData();
    }
  }, []);

  // 监听SHOW_TOPIC_SIDEBAR事件，切换到话题标签页
  useEffect(() => {
    const unsubscribe = EventEmitter.on(EVENT_NAMES.SHOW_TOPIC_SIDEBAR, () => {
      setValue(1); // 切换到话题标签页（索引为1）
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 同步Redux状态到本地状态
  useEffect(() => {
    if (reduxAssistants.length > 0 && reduxAssistants !== userAssistants) {
      console.log('[SidebarTabs] 从Redux同步助手列表:', reduxAssistants.length);
      setLocalUserAssistants(reduxAssistants);
    }
  }, [reduxAssistants, userAssistants]);

  // 同步Redux当前助手到本地状态
  useEffect(() => {
    if (reduxCurrentAssistant && reduxCurrentAssistant !== currentAssistant) {
      console.log('[SidebarTabs] 从Redux同步当前助手:', reduxCurrentAssistant.name);
      setLocalCurrentAssistant(reduxCurrentAssistant);
    }
  }, [reduxCurrentAssistant, currentAssistant]);

  // 优先使用Redux状态，如果Redux状态为空则使用本地状态
  const effectiveUserAssistants = reduxAssistants.length > 0 ? reduxAssistants : userAssistants;
  const effectiveCurrentAssistant = reduxCurrentAssistant || currentAssistant;

  return {
    value,
    setValue,
    loading,
    userAssistants: effectiveUserAssistants,
    setUserAssistants,
    currentAssistant: effectiveCurrentAssistant,
    setCurrentAssistant,
    assistantWithTopics,
    currentTopic,
    updateAssistantTopic,
    refreshTopics,
    loadAssistants
  };
}
