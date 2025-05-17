import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Tabs, Tab } from '@mui/material';
import { CircularProgress } from '@mui/material';

// 导入工具
import { AssistantService } from '../../shared/services';
import {
  setCurrentTopic,
  deleteTopic as deleteTopicAction,
  updateTopic,
  initializeTopics,
  loadTopicsSuccess
} from '../../shared/store/slices/messagesSlice';
import type { Assistant } from '../../shared/types/Assistant';
import type { ChatTopic } from '../../shared/types';
import type { RootState } from '../../shared/store';
import store from '../../shared/store';
import { TopicService } from '../../shared/services/TopicService';
import { getStorageItem, setStorageItem, removeStorageItem } from '../../shared/utils/storage';
import { dexieStorage } from '../../shared/services/DexieStorageService';

// 导入子组件
import AssistantTab from './AssistantTab';
import TopicTab from './TopicTab';
import SettingsTab from './SettingsTab';

// 常量
const CURRENT_ASSISTANT_TOPICS_KEY = 'currentAssistantTopicsCache';

// 话题创建事件类型
interface TopicCreatedEvent extends CustomEvent {
  detail: {
    topic: ChatTopic;
    assistantId: string;
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`sidebar-tabpanel-${index}`}
      aria-labelledby={`sidebar-tab-${index}`}
      style={{ height: 'calc(100% - 48px)', overflow: 'auto' }}
      {...other}
    >
      {value === index && <Box sx={{ p: 1 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `sidebar-tab-${index}`,
    'aria-controls': `sidebar-tabpanel-${index}`,
  };
}

export default function SidebarTabs() {
  const dispatch = useDispatch();
  const [value, setValue] = useState(0);
  const [loading, setLoading] = useState(true);
  // 添加一个ref标志，用于标记初始化状态
  const initialized = useRef(false);

  // 助手状态
  const [userAssistants, setUserAssistants] = useState<Assistant[]>([]);
  const [currentAssistant, setCurrentAssistant] = useState<Assistant | null>(null);

  // 话题状态
  const { topics, currentTopic, forceUpdateCounter } = useSelector((state: RootState) => ({
    topics: state.messages.topics,
    currentTopic: state.messages.currentTopic,
    forceUpdateCounter: state.messages.forceUpdateCounter
  }));
  const [currentAssistantTopics, setCurrentAssistantTopics] = useState<ChatTopic[]>([]);
  
  // 添加更新标志，用于强制刷新话题列表
  const [topicListUpdateFlag, setTopicListUpdateFlag] = useState(0);

  // 应用设置
  const [settings, setSettings] = useState({
    streamOutput: true,
    showMessageDivider: true,
    copyableCodeBlocks: true,
    contextLength: 2000,
    contextCount: 10,
    mathRenderer: 'KaTeX' as const
  });

  // 添加一个函数用于持久化当前助手的话题
  const persistCurrentAssistantTopics = useCallback(async (topicList: ChatTopic[]) => {
    try {
      await setStorageItem(CURRENT_ASSISTANT_TOPICS_KEY, {
        assistantId: currentAssistant?.id || 'unknown',
        topics: topicList
      });
      console.log(`已缓存 ${topicList.length} 个话题到数据库存储`);
    } catch (error) {
      console.warn('缓存话题到存储失败:', error);
    }
  }, [currentAssistant]);

  // 初始化加载
  useEffect(() => {
    async function initializeData() {
      try {
        setLoading(true);

        // 加载话题 - 改用initializeTopics函数
        // initializeTopics返回的是一个函数，需要传入dispatch
        const initTopics = initializeTopics();
        await initTopics(dispatch);

        // 加载助手数据
        await loadAssistants();

        initialized.current = true;
        setLoading(false);
      } catch (error) {
        console.error('初始化数据失败:', error);
        setLoading(false);
      }
    }

    if (!initialized.current) {
      initializeData();
    }
  }, [dispatch]);

  // 更新当前助手的话题列表
  const refreshCurrentAssistantTopics = useCallback(async () => {
    if (!currentAssistant) {
      console.log('没有选中的助手，不刷新话题列表');
      setCurrentAssistantTopics([]);
      return;
    }

    try {
      console.log(`[话题列表刷新] 刷新助手 ${currentAssistant.id} 的话题列表`, new Date().toISOString());
      
      // 确保topicIds是数组
      const assistantTopicIds = Array.isArray(currentAssistant.topicIds) ? currentAssistant.topicIds : [];
      console.log(`[话题列表刷新] 助手 ${currentAssistant.id} 有 ${assistantTopicIds.length} 个关联话题ID`);

      if (assistantTopicIds.length === 0) {
        console.log('[话题列表刷新] 当前助手没有关联话题，显示空话题列表');
        setCurrentAssistantTopics([]);
        return;
      }

      // 首先通过Store获取最新的话题数据
      const storeTopics = store.getState().messages.topics;
      console.log(`[话题列表刷新] Redux store 中有 ${storeTopics.length} 个话题`);
      
      // 从Redux中获取关联的话题列表
      const assistantTopics = storeTopics.filter(topic => 
        assistantTopicIds.includes(topic.id)
      );

      console.log(`[话题列表刷新] 找到 ${assistantTopics.length} 个有效话题，话题IDs: ${assistantTopics.map((t: ChatTopic) => t.id).join(', ')}`);

      // 如果没有找到话题，尝试直接从数据库获取
      if (assistantTopics.length === 0 && assistantTopicIds.length > 0) {
        console.log('[话题列表刷新] Redux中没有找到话题，尝试从数据库获取');
        
        // 使用Promise.all并行获取所有话题
        const dbTopicsPromises = assistantTopicIds.map(id => dexieStorage.getTopic(id));
        const dbTopicsResults = await Promise.all(dbTopicsPromises);
        
        // 过滤掉null结果
        const validDbTopics = dbTopicsResults.filter(Boolean) as ChatTopic[];
        console.log(`[话题列表刷新] 从数据库找到 ${validDbTopics.length} 个话题`);
        
        if (validDbTopics.length > 0) {
          // 正确更新Redux状态：合并从DB加载的话题与Redux中已存在的话题
          const allStoreTopics = store.getState().messages.topics;
          const topicMap = new Map<string, ChatTopic>();

          // 先加入Redux中已有的
          allStoreTopics.forEach(t => topicMap.set(t.id, t));
          // 再加入从DB新加载的 (如果ID已存在，新的会覆盖旧的，这通常是期望行为)
          validDbTopics.forEach(t => topicMap.set(t.id, t));
          
          const mergedUniqueTopics = Array.from(topicMap.values());
          
          // dispatch(initializeTopics()); // <-- REMOVE THIS LINE. We have the merged topics already.
                                        // Or more directly:
                                        // import { loadTopicsSuccess } from '../../shared/store/slices/messagesSlice';
                                        // dispatch(loadTopicsSuccess(mergedUniqueTopics));
                                        // For now, let's assume initializeTopics() is the correct way if it loads and dispatches loadTopicsSuccess.
                                        // However, the original code used createTopic. A more direct replacement for adding missing topics
                                        // without re-evaluating ALL topics might be better.
                                        // Let's use loadTopicsSuccess for now, as it's an existing mechanism to set topics.
                                        // We need to ensure loadTopicsSuccess is imported.
                                        // import { loadTopicsSuccess, initializeTopics, createTopic } from '../../shared/store/slices/messagesSlice';

          // 确保 loadTopicsSuccess 已经被导入
          // (检查文件顶部 imports, 如果没有，需要添加: import { loadTopicsSuccess } from '../../shared/store/slices/messagesSlice';)
          dispatch(loadTopicsSuccess(mergedUniqueTopics));
          console.log(`[话题列表刷新] 使用 loadTopicsSuccess 更新Redux，包含 ${mergedUniqueTopics.length} 个合并后的话题`);
          
          // 更新本地状态
          setCurrentAssistantTopics(validDbTopics); // 应该用 mergedUniqueTopics 过滤后的当前助手的话题
          const refreshedAssistantTopics = mergedUniqueTopics.filter(t => assistantTopicIds.includes(t.id));
          setCurrentAssistantTopics(refreshedAssistantTopics);
          
          // 缓存话题列表
          await persistCurrentAssistantTopics(refreshedAssistantTopics); // 使用刷新后的列表
          
          // 如果当前没有选中话题，选择第一个
          if (!currentTopic && refreshedAssistantTopics.length > 0) {
            dispatch(setCurrentTopic(refreshedAssistantTopics[0]));
          }
          
          return;
        }
      }

      // 验证话题有效性并更新本地状态
      setCurrentAssistantTopics(assistantTopics);
      
      // 缓存话题列表
      await persistCurrentAssistantTopics(assistantTopics);

      // 如果当前话题不属于当前助手，则选择第一个话题
      if (!currentTopic || !assistantTopicIds.includes(currentTopic.id)) {
        if (assistantTopics.length > 0) {
          console.log('[话题列表刷新] 当前话题不属于当前助手，切换到第一个话题');
          dispatch(setCurrentTopic(assistantTopics[0]));
        }
      }
    } catch (error) {
      console.error('[话题列表刷新] 刷新助手话题列表时出错:', error);
      setCurrentAssistantTopics([]);
    }
  }, [currentAssistant, topics, currentTopic, dispatch, persistCurrentAssistantTopics]);

  // 对于话题列表的更新，增强监听能力
  useEffect(() => {
    const handleForceTopicListUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('接收到强制更新话题列表事件:', customEvent.detail);
      
      // 标记为需要强制刷新
      setTopicListUpdateFlag(prev => prev + 1);
      
      // 确保当前的话题列表与Redux同步
      const reduxTopics = topics.filter(topic => {
        return currentAssistant && 
               currentAssistant.topicIds && 
               currentAssistant.topicIds.includes(topic.id);
      });
      
      if (reduxTopics.length !== currentAssistantTopics.length) {
        console.log('话题数量不一致，强制更新本地状态');
        console.log('Redux话题数:', reduxTopics.length, '本地话题数:', currentAssistantTopics.length);
        setCurrentAssistantTopics(reduxTopics);
      }
      
      // 直接触发刷新函数
      refreshCurrentAssistantTopics();
    };

    // 注册自定义事件
    window.addEventListener('forceTopicListUpdate', handleForceTopicListUpdate);

    return () => {
      window.removeEventListener('forceTopicListUpdate', handleForceTopicListUpdate);
    };
  }, [topics, currentAssistant, currentAssistantTopics.length, refreshCurrentAssistantTopics]);

  // 专门监听forceUpdateCounter的变化，与其他依赖项分开
  useEffect(() => {
    console.log('检测到forceUpdateCounter变化:', forceUpdateCounter);
    if (forceUpdateCounter > 0) {
      console.log('由于forceUpdateCounter变化触发刷新');
      refreshCurrentAssistantTopics();
    }
  }, [forceUpdateCounter, refreshCurrentAssistantTopics]);

  // 当前助手变更或强制更新时刷新话题列表
  useEffect(() => {
    console.log('触发话题列表普通刷新: topicListUpdateFlag =', topicListUpdateFlag);
    refreshCurrentAssistantTopics();
  }, [currentAssistant, topics, topicListUpdateFlag, refreshCurrentAssistantTopics]);

  // 监听新建话题事件
  useEffect(() => {
    const handleTopicCreated = (event: Event) => {
      const customEvent = event as TopicCreatedEvent;
      const { topic, assistantId } = customEvent.detail;
      
      console.log(`接收到新话题创建事件: ${topic.id}, 所属助手: ${assistantId}`);
      
      // 如果创建的话题属于当前助手，则更新话题列表
      if (currentAssistant && currentAssistant.id === assistantId) {
        // 触发话题列表更新
        setTopicListUpdateFlag(prev => prev + 1);
      }
    };

    window.addEventListener('topicCreated', handleTopicCreated);

    return () => {
      window.removeEventListener('topicCreated', handleTopicCreated);
    };
  }, [currentAssistant]);

  // 加载助手数据和设置当前助手
  const loadAssistants = async () => {
    try {
      // 从API获取助手列表
      const assistants = await AssistantService.getUserAssistants();
      setUserAssistants(assistants);

      // 获取缓存的助手ID
      const cachedDataStr = await getStorageItem<{ assistantId: string, topics: ChatTopic[] }>(CURRENT_ASSISTANT_TOPICS_KEY);
      const cachedAssistantId = cachedDataStr?.assistantId;
      
      // 如果有缓存的助手ID，则使用该助手作为当前助手
      if (cachedAssistantId && assistants.length > 0) {
        const cachedAssistant = assistants.find(assistant => assistant.id === cachedAssistantId);
        if (cachedAssistant) {
          setCurrentAssistant(cachedAssistant);
        } else {
          // 如果缓存的助手ID不存在，则使用第一个助手
          setCurrentAssistant(assistants[0]);
        }
      } else if (assistants.length > 0) {
        // 如果没有缓存的助手ID，则使用第一个助手
        setCurrentAssistant(assistants[0]);
      }
    } catch (error) {
      console.error('加载助手数据失败:', error);
      setLoading(false);
    }
  };

  // 标签页切换
  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  // 选择助手
  const handleSelectAssistant = async (assistant: Assistant) => {
    console.log('选择助手:', assistant);
    console.log('助手ID:', assistant.id);
    console.log('助手关联的话题IDs:', assistant.topicIds);

    // 确保使用正确的助手实例
    setCurrentAssistant(assistant);

    // 保存当前助手ID到存储
    await AssistantService.setCurrentAssistant(assistant.id);

    // 自动将标签切换到话题面板
    setValue(1);

    // 清除本地缓存，防止显示上一个助手的缓存话题
    await removeStorageItem(CURRENT_ASSISTANT_TOPICS_KEY);

    // 清除当前话题列表，防止显示上一个助手的话题
    setCurrentAssistantTopics([]);

    try {
      // 直接获取该助手的话题列表，而不是使用默认话题
      const assistantTopicIds = Array.isArray(assistant.topicIds) ? assistant.topicIds : [];
      console.log(`助手 ${assistant.id} (${assistant.name}) 有 ${assistantTopicIds.length} 个话题ID`);

      // 移除自动创建话题的逻辑
      if (assistantTopicIds.length === 0) {
        console.log('当前助手没有关联话题，显示空话题列表');
        setCurrentAssistantTopics([]);
        return;
      }

      if (assistantTopicIds.length > 0) {
        // 获取助手关联的话题
        const assistantTopics = topics.filter(topic => assistantTopicIds.includes(topic.id));
        console.log(`找到 ${assistantTopics.length} 个话题`);

        if (assistantTopics.length > 0) {
          // 设置当前助手的话题列表
          setCurrentAssistantTopics(assistantTopics);
          // 缓存话题列表
          persistCurrentAssistantTopics(assistantTopics);

          // 选择第一个话题作为当前话题
          const firstTopic = assistantTopics[0];
          console.log(`选择第一个话题: ${firstTopic.id} (${firstTopic.title})`);
          dispatch(setCurrentTopic(firstTopic));
          return;
        }
      }

      // 如果没有找到有效话题，显示空话题列表
      console.log('没有找到有效话题，显示空话题列表');
      setCurrentAssistantTopics([]);
    } catch (error) {
      console.error(`选择助手时出错:`, error);
      console.log('出错恢复中，显示空话题列表');
      setCurrentAssistantTopics([]);
    }
  };

  // 添加助手
  const handleAddAssistant = async (assistant: Assistant) => {
    console.log('添加新助手:', assistant.name, '助手数据:', assistant);

    // 确保助手有正确的名称属性
    if (!assistant.name) {
      console.error('无法添加助手: 缺少必要属性');
      return;
    }

    // 使用统一的AssistantService创建助手
    const newAssistant = await AssistantService.createNewAssistant({
      name: assistant.name,
      description: assistant.description || '',
      systemPrompt: assistant.systemPrompt || '',
    }, true); // 第二个参数为true表示创建默认话题

    if (newAssistant) {
      console.log('助手添加成功，获取更新后的助手数据');

      // 更新本地状态，使用更新后的助手对象
      setUserAssistants([...userAssistants, newAssistant]);

      // 设置为当前助手
      setCurrentAssistant(newAssistant);
      await AssistantService.setCurrentAssistant(newAssistant.id);

      // 添加助手之后立即切换到话题页面
      setValue(1);

      // 获取并选择新助手的默认话题
      const defaultTopic = await AssistantService.getDefaultTopic(newAssistant.id);
      if (defaultTopic) {
        // 更新当前助手话题列表
        setCurrentAssistantTopics([defaultTopic]);
        dispatch(setCurrentTopic(defaultTopic));
      }
    } else {
      console.error('助手添加失败');
    }
  };

  // 更新助手
  const handleUpdateAssistant = async (assistant: Assistant) => {
    if (await AssistantService.updateAssistant(assistant)) {
      // 更新本地状态
      const updatedAssistants = userAssistants.map(a =>
        a.id === assistant.id ? assistant : a
      );

      setUserAssistants(updatedAssistants);

      // 如果是当前助手，也更新当前助手状态
      if (currentAssistant?.id === assistant.id) {
        setCurrentAssistant(assistant);
      }
    }
  };

  // 删除助手
  const handleDeleteAssistant = async (assistantId: string) => {
    if (await AssistantService.deleteAssistant(assistantId)) {
      // 更新本地状态
      const updatedAssistants = userAssistants.filter(a => a.id !== assistantId);
      setUserAssistants(updatedAssistants);

      // 如果删除的是当前助手，设置第一个助手为当前助手
      if (currentAssistant?.id === assistantId && updatedAssistants.length > 0) {
        const newCurrentAssistant = updatedAssistants[0];
        setCurrentAssistant(newCurrentAssistant);

        // 获取并选择新当前助手的默认话题
        const defaultTopic = await AssistantService.getDefaultTopic(newCurrentAssistant.id);
        if (defaultTopic) {
          dispatch(setCurrentTopic(defaultTopic));
        }
      } else if (updatedAssistants.length === 0) {
        setCurrentAssistant(null);
      }
    }
  };

  // 选择话题
  const handleSelectTopic = (topic: ChatTopic) => {
    console.log('准备切换到话题:', topic);
    try {
      // 确保话题完整性
      if (!topic || !topic.id) {
        console.error('话题对象无效:', topic);
        return;
      }

      // 使用传入的话题
      dispatch(setCurrentTopic(topic));
      console.log('话题切换成功:', topic.id);
    } catch (error) {
      console.error('切换话题时出错:', error);
    }
  };

  // 创建新话题 (使用useCallback优化)
  const handleCreateTopic = useCallback(async () => {
    if (!currentAssistant) {
      console.error('无法创建话题: 当前没有选中的助手');
      return null;
    }

    try {
      // 使用统一的TopicService创建话题
      const newTopic = await TopicService.createNewTopic();
      
      if (newTopic) {
        console.log(`新话题创建成功: ${newTopic.id}, 直接更新本地话题列表`);
        
        // 直接更新本地话题列表，不等待Redux更新和useEffect触发
        setCurrentAssistantTopics(prevTopics => [newTopic, ...prevTopics]);
        
        // 更新当前助手的topicIds
        const updatedAssistant = {
          ...currentAssistant,
          topicIds: [...(currentAssistant.topicIds || []), newTopic.id]
        };
        setCurrentAssistant(updatedAssistant);
        
        // 更新助手列表
        setUserAssistants(prevAssistants => 
          prevAssistants.map(assistant => 
            assistant.id === currentAssistant.id ? updatedAssistant : assistant
          )
        );
        
        // 还是触发标志更新，保持一致性
        setTopicListUpdateFlag(prev => prev + 1);
      }
      
      return newTopic;
    } catch (error) {
      console.error('创建新话题时出错:', error);
      return null;
    }
  }, [currentAssistant, setCurrentAssistantTopics, setCurrentAssistant, setUserAssistants]);

  // 删除话题
  const handleDeleteTopic = async (topicId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // 阻止事件冒泡

    if (!currentAssistant) return;

    // 检查是否正在删除当前话题
    const isDeletingCurrentTopic = currentTopic && currentTopic.id === topicId;

    try {
      console.log(`开始删除话题: ${topicId}`);

      // 从助手中移除话题
      await AssistantService.removeTopicFromAssistant(currentAssistant.id, topicId);
      console.log(`已从助手 ${currentAssistant.id} 中移除话题 ${topicId}`);

      // 从数据库中删除话题
      const deleteResult = await TopicService.deleteTopic(topicId);
      if (deleteResult) {
        console.log(`话题 ${topicId} 已从数据库中删除`);
      } else {
        console.error(`无法从数据库中删除话题 ${topicId}`);
      }

      // 更新当前助手
      const updatedAssistant = {
        ...currentAssistant,
        topicIds: (currentAssistant.topicIds || []).filter(id => id !== topicId)
      };

      setCurrentAssistant(updatedAssistant);

      // 更新助手列表
      const updatedAssistants = userAssistants.map(assistant =>
        assistant.id === currentAssistant.id ? updatedAssistant : assistant
      );
      setUserAssistants(updatedAssistants);

      // 从Redux中删除话题
      dispatch(deleteTopicAction(topicId));
      
      // 触发话题列表刷新
      setTopicListUpdateFlag(prev => prev + 1);
      
      // 强制从Redux获取最新话题列表
      const latestTopics = topics.filter(topic => 
        topic.id !== topicId && 
        updatedAssistant.topicIds.includes(topic.id)
      );
      setCurrentAssistantTopics(latestTopics);

      // 如果删除的是当前话题，需要自动切换到其他话题
      if (isDeletingCurrentTopic) {
        console.log('删除的是当前话题，需要切换到其他话题');

        // 查找当前助手的其他话题
        if (latestTopics.length > 0) {
          // 有其他话题，选择第一个话题
          console.log('切换到该助手的第一个话题:', latestTopics[0].title);
          dispatch(setCurrentTopic(latestTopics[0]));
        } else {
          // 没有其他话题，创建一个新话题
          console.log('当前助手没有其他话题，创建一个新话题');
          handleCreateTopic();
        }
      }
    } catch (error) {
      console.error('删除话题失败:', error);
    }
  };

  // 更新设置状态处理回调函数
  const handleSettingChange = (settingId: string, value: boolean) => {
    const updatedSettings = {
      ...settings,
      [settingId]: value
    };

    setSettings(updatedSettings);
  };

  // 上下文长度处理
  const handleContextLengthChange = (value: number) => {
    const updatedSettings = {
      ...settings,
      contextLength: value
    };

    setSettings(updatedSettings);
  };

  // 上下文数量处理
  const handleContextCountChange = (value: number) => {
    const updatedSettings = {
      ...settings,
      contextCount: value
    };

    setSettings(updatedSettings);
  };

  // 数学公式渲染器处理
  const handleMathRendererChange = (value: any) => {
    const updatedSettings = {
      ...settings,
      mathRenderer: value
    };

    setSettings(updatedSettings);
  };

  // 更新话题
  const handleUpdateTopic = (topic: ChatTopic) => {
    console.log('SidebarTabs 接收到话题更新请求:', topic);

    try {
      // 确保dispatch被正确调用
      dispatch(updateTopic(topic));

      console.log('话题更新action已分发', { topic });

      // 触发话题列表刷新
      setTopicListUpdateFlag(prev => prev + 1);

      // 更新本地状态中的话题
      const updatedTopics = currentAssistantTopics.map(t =>
        t.id === topic.id ? topic : t
      );
      setCurrentAssistantTopics(updatedTopics);

      // 更新本地缓存
      persistCurrentAssistantTopics(updatedTopics);
    } catch (error) {
      console.error('更新话题时出错:', error);
    }
  };

  // 监听assistantNeedsTopic事件，在助手清空话题后自动创建新话题
  useEffect(() => {
    // 处理话题清空事件，强制更新UI
    const handleTopicsCleared = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const { assistantId, clearedTopicIds } = customEvent.detail;

      console.log('接收到话题清空事件:', assistantId, '已清空话题:', clearedTopicIds);

      // 强制更新本地话题状态
      const updatedTopics = topics.filter(topic => !clearedTopicIds.includes(topic.id));
      setCurrentAssistantTopics(updatedTopics);
      console.log('已更新本地话题状态，移除已清空话题');

      // 如果当前助手是被清空的助手，额外处理
      if (currentAssistant && currentAssistant.id === assistantId) {
        // 更新当前助手状态
        const updatedAssistant = {
          ...currentAssistant,
          topicIds: []
        };
        setCurrentAssistant(updatedAssistant);
        console.log('已更新当前助手状态，清空topicIds');

        // 移除自动创建话题的逻辑
        // 清除可能存在的标记
        const tempMarker = await getStorageItem<string>('_justClearedTopics');
        if (tempMarker === assistantId) {
          console.log('清除临时标记');
          await removeStorageItem('_justClearedTopics');
        }
      }
    };

    // 注册事件监听器
    window.addEventListener('topicsCleared', handleTopicsCleared);

    // 清理函数
    return () => {
      window.removeEventListener('topicsCleared', handleTopicsCleared);
    };
  }, [currentAssistant, handleCreateTopic, topics]);

  // 组件挂载后初始化
  useEffect(() => {
    console.log('[SidebarTabs] 组件挂载');
    
    // 初始加载助手和话题
    const loadInitialData = async () => {
      await loadAssistants();
    };
    loadInitialData();
    
    // 监听自定义事件: 话题创建
    const handleTopicCreated = (e: CustomEvent) => {
      console.log('[SidebarTabs] 捕获到topicCreated事件:', e.detail);
      
      // 确保事件数据包含有效的话题和助手ID
      if (e.detail?.topic && e.detail?.assistantId) {
        const { topic, assistantId } = e.detail;
        
        // 检查这个话题是否应该属于当前选中的助手
        if (currentAssistant && currentAssistant.id === assistantId) {
          console.log(`[SidebarTabs] 新创建的话题(${topic.id})属于当前选中的助手(${assistantId})，刷新话题列表`);
          // 延时执行以确保其他状态更新完成
          setTimeout(() => {
            refreshCurrentAssistantTopics();
          }, 100);
        }
      }
    };
    
    // 监听强制更新话题列表事件
    const handleForceTopicListUpdate = (e: CustomEvent) => {
      console.log('[SidebarTabs] 捕获到forceTopicListUpdate事件', e.detail);
      // 延时执行以确保其他状态更新完成
      setTimeout(() => {
        refreshCurrentAssistantTopics();
      }, 200);
    };
    
    // 注册事件监听
    window.addEventListener('topicCreated', handleTopicCreated as EventListener);
    window.addEventListener('forceTopicListUpdate', handleForceTopicListUpdate as EventListener);
    
    // 清理函数
    return () => {
      console.log('[SidebarTabs] 组件卸载，移除事件监听');
      window.removeEventListener('topicCreated', handleTopicCreated as EventListener);
      window.removeEventListener('forceTopicListUpdate', handleForceTopicListUpdate as EventListener);
    };
  }, [currentAssistant, refreshCurrentAssistantTopics, loadAssistants]);

  // 渲染加载状态
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', bgcolor: 'background.paper' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="sidebar tabs"
          variant="fullWidth"
          sx={{ minHeight: '48px' }}
        >
          <Tab label="助手" {...a11yProps(0)} sx={{ minHeight: '48px' }} />
          <Tab label="话题" {...a11yProps(1)} sx={{ minHeight: '48px' }} />
          <Tab label="设置" {...a11yProps(2)} sx={{ minHeight: '48px', color: value === 2 ? 'primary.main' : 'inherit' }} />
        </Tabs>
      </Box>

      <TabPanel value={value} index={0}>
        <AssistantTab
          userAssistants={userAssistants}
          currentAssistant={currentAssistant}
          onSelectAssistant={handleSelectAssistant}
          onAddAssistant={handleAddAssistant}
          onUpdateAssistant={handleUpdateAssistant}
          onDeleteAssistant={handleDeleteAssistant}
        />
      </TabPanel>

      <TabPanel value={value} index={1}>
        <TopicTab
          currentAssistant={currentAssistant}
          topics={currentAssistantTopics}
          currentTopic={currentTopic}
          onSelectTopic={handleSelectTopic}
          onCreateTopic={handleCreateTopic}
          onDeleteTopic={handleDeleteTopic}
          onUpdateTopic={handleUpdateTopic}
        />
      </TabPanel>

      <TabPanel value={value} index={2}>
        <SettingsTab
          settings={[
            { id: 'streamOutput', name: '流式输出', defaultValue: settings.streamOutput, description: '实时显示AI回答，打字机效果' },
            { id: 'showMessageDivider', name: '消息分割线', defaultValue: settings.showMessageDivider, description: '在消息之间显示分割线' },
            { id: 'copyableCodeBlocks', name: '代码块可复制', defaultValue: settings.copyableCodeBlocks, description: '允许复制代码块的内容' },
          ]}
          onSettingChange={handleSettingChange}
          onContextLengthChange={handleContextLengthChange}
          onContextCountChange={handleContextCountChange}
          onMathRendererChange={handleMathRendererChange}
          initialContextLength={settings.contextLength}
          initialContextCount={settings.contextCount}
          initialMathRenderer={settings.mathRenderer}
        />
      </TabPanel>
    </Box>
  );
}