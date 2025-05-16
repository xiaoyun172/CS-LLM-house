import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Tabs, Tab, CircularProgress } from '@mui/material';
import {
  setCurrentTopic,
  deleteTopic as deleteTopicAction,
  loadTopics,
  updateTopic
} from '../../shared/store/messagesSlice';
import type { RootState } from '../../shared/store';
import type { ChatTopic } from '../../shared/types';
import type { Assistant } from '../../shared/types/Assistant';
import { AssistantService } from '../../shared/services';
import { TopicService } from '../../shared/services/TopicService';

// 导入子组件
import AssistantTab from './AssistantTab';
import TopicTab from './TopicTab';
import SettingsTab from './SettingsTab';

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

  // 助手状态
  const [userAssistants, setUserAssistants] = useState<Assistant[]>([]);
  const [currentAssistant, setCurrentAssistant] = useState<Assistant | null>(null);

  // 话题状态
  const topics = useSelector((state: RootState) => state.messages.topics);
  const currentTopic = useSelector((state: RootState) => state.messages.currentTopic);
  const [currentAssistantTopics, setCurrentAssistantTopics] = useState<ChatTopic[]>([]);

  // 应用设置
  const [settings, setSettings] = useState({
    streamOutput: true,
    showMessageDivider: true,
    copyableCodeBlocks: true,
    contextLength: 2000,
    contextCount: 10,
    mathRenderer: 'KaTeX' as const
  });

  // 初始化加载
  useEffect(() => {
    async function initializeData() {
      try {
        setLoading(true);

        // 加载话题
        dispatch(loadTopics());

        // 加载助手数据
        await loadAssistantsData();

        setLoading(false);
      } catch (error) {
        console.error('初始化数据失败:', error);
        setLoading(false);
      }
    }

    initializeData();
  }, [dispatch]);

  // 当前助手变更时更新话题列表
  useEffect(() => {
    if (currentAssistant) {
      console.log('当前助手变更，加载其关联的话题列表:', currentAssistant.id);

      async function updateAssistantTopics() {
        try {
          if (!currentAssistant) return; // 再次检查助手，避免null异常

          // 确保topicIds是数组
          const assistantTopicIds = Array.isArray(currentAssistant.topicIds) ? currentAssistant.topicIds : [];
          console.log(`助手 ${currentAssistant.id} (${currentAssistant.name}) 有 ${assistantTopicIds.length} 个关联话题ID`);

          // 移除自动创建话题的逻辑，允许查看无话题的助手
          if (assistantTopicIds.length === 0) {
            console.log('当前助手没有关联话题，显示空话题列表');
            setCurrentAssistantTopics([]);
            return;
          }

          // 获取当前助手的话题
          const assistantTopics = topics.filter(topic => 
            assistantTopicIds.includes(topic.id)
          );

          console.log(`找到 ${assistantTopics.length} 个有效话题，总话题数: ${topics.length}`);

          // 移除无效话题ID的检测和警告日志
          // 直接使用找到的话题

          if (assistantTopics.length > 0) {
            setCurrentAssistantTopics(assistantTopics);

            // 如果当前话题不属于当前助手，则选择第一个话题
            if (!currentTopic || !assistantTopicIds.includes(currentTopic.id)) {
              dispatch(setCurrentTopic(assistantTopics[0]));
            }
          } else {
            console.log('没有找到有效话题，显示空话题列表');
            setCurrentAssistantTopics([]);
          }
        } catch (error) {
          console.error('更新助手话题列表时出错:', error);
          console.log('出错恢复中，显示空话题列表');
          setCurrentAssistantTopics([]);
        }
      }

      updateAssistantTopics();
    } else {
      console.log('没有选中的助手，不更新话题列表');
      setCurrentAssistantTopics([]);
    }
  }, [topics, currentAssistant, dispatch, currentTopic]);

  // 监听topicCreated事件，实时更新话题列表
  useEffect(() => {
    const handleTopicCreated = (event: Event) => {
      const customEvent = event as TopicCreatedEvent;
      console.log('接收到话题创建事件:', customEvent.detail);

      // 如果当前没有选中的助手，或者不是当前助手的话题，则不处理
      if (!currentAssistant) {
        console.log('没有当前助手，不处理话题创建事件');
        return;
      }

      if (currentAssistant.id !== customEvent.detail.assistantId) {
        console.log('创建的话题属于其他助手，不处理');
        return;
      }

      const { topic } = customEvent.detail;

      // 检查话题是否已存在于当前列表中
      const exists = currentAssistantTopics.some(t => t.id === topic.id);
      if (exists) {
        console.log('话题已存在于当前列表中，不重复添加');
        return;
      }

      console.log('添加新话题到助手话题列表');

      // 直接更新助手的话题列表 - 核心操作1
      setCurrentAssistantTopics(prev => [topic, ...prev]);

      // 更新当前助手的topicIds - 核心操作2
      const updatedAssistant = {
        ...currentAssistant,
        topicIds: [...(currentAssistant.topicIds || []), topic.id]
      };
      setCurrentAssistant(updatedAssistant);
      
      // 添加回：更新全局助手列表 - 确保UI一致性
      setUserAssistants(prev => 
        prev.map(a => a.id === currentAssistant.id ? updatedAssistant : a)
      );

      // 自动切换到话题标签页
      setValue(1);

      // 异步更新助手
      AssistantService.updateAssistant(updatedAssistant).catch(console.error);
      
      // 添加回：强制刷新机制 - 确保界面更新
      setTimeout(() => {
        console.log('强制刷新话题列表状态');
        setCurrentAssistantTopics(prev => [...prev]);
        
        // 派发一个自定义事件通知其他组件刷新
        const refreshEvent = new CustomEvent('topicsRefreshed', {
          detail: { assistantId: currentAssistant.id }
        });
        window.dispatchEvent(refreshEvent);
      }, 200);
    };

    // 注册事件监听器
    window.addEventListener('topicCreated', handleTopicCreated);

    // 清理函数
    return () => {
      window.removeEventListener('topicCreated', handleTopicCreated);
    };
  }, [currentAssistant, currentAssistantTopics, setValue, setUserAssistants]);

  // 加载助手数据
  const loadAssistantsData = async () => {
    try {
      // 获取用户助手列表
      const assistants = await AssistantService.getUserAssistants();

      // 如果没有助手，初始化默认助手
      if (assistants.length === 0) {
        const defaultAssistants = await AssistantService.initializeDefaultAssistants();
        setUserAssistants(defaultAssistants);

        if (defaultAssistants.length > 0) {
          setCurrentAssistant(defaultAssistants[0]);
        }
      } else {
        setUserAssistants(assistants);

        // 获取当前选中的助手
        const current = await AssistantService.getCurrentAssistant();
        if (current) {
          setCurrentAssistant(current);
        } else if (assistants.length > 0) {
          setCurrentAssistant(assistants[0]);
          await AssistantService.setCurrentAssistant(assistants[0].id);
        }
      }
    } catch (error) {
      console.error('加载助手数据失败:', error);
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

    // 清除当前话题列表，防止显示上一个助手的话题
    setCurrentAssistantTopics([]);

    try {
      // 直接获取该助手的话题列表，而不是使用默认话题
      const assistantTopicIds = Array.isArray(assistant.topicIds) ? assistant.topicIds : [];
      console.log(`助手 ${assistant.id} (${assistant.name}) 有 ${assistantTopicIds.length} 个话题ID`);

      // 允许无话题的助手显示空话题列表
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
    console.log('添加新助手:', assistant.name, '助手ID:', assistant.id);

    // 确保助手有正确的属性
    if (!assistant.id || !assistant.name) {
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
      return;
    }

    try {
      // 使用统一的TopicService创建话题
      await TopicService.createNewTopic();
    } catch (error) {
      console.error('创建新话题时出错:', error);
    }
  }, [currentAssistant]);

  // 删除话题
  const handleDeleteTopic = async (topicId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // 阻止事件冒泡

    if (!currentAssistant) return;

    // 检查是否正在删除当前话题
    const isDeletingCurrentTopic = currentTopic && currentTopic.id === topicId;

    try {
      // 从助手中移除话题
      await AssistantService.removeTopicFromAssistant(currentAssistant.id, topicId);

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

      // 直接更新当前助手话题列表
      const updatedTopics = currentAssistantTopics.filter(topic => topic.id !== topicId);
      setCurrentAssistantTopics(updatedTopics);

      // 从Redux中删除话题
      dispatch(deleteTopicAction(topicId));

      // 如果删除的是当前话题，需要自动切换到其他话题
      if (isDeletingCurrentTopic) {
        console.log('删除的是当前话题，需要切换到其他话题');

        // 查找当前助手的其他话题
        if (updatedTopics.length > 0) {
          // 有其他话题，选择第一个话题
          console.log('切换到该助手的第一个话题:', updatedTopics[0].title);
          dispatch(setCurrentTopic(updatedTopics[0]));
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

      // 更新本地状态中的话题
      const updatedTopics = currentAssistantTopics.map(t =>
        t.id === topic.id ? topic : t
      );
      setCurrentAssistantTopics(updatedTopics);
    } catch (error) {
      console.error('更新话题时出错:', error);
    }
  };

  // 监听assistantNeedsTopic事件，在助手清空话题后自动创建新话题
  useEffect(() => {
    const handleAssistantNeedsTopic = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { assistantId } = customEvent.detail;

      console.log('接收到助手需要话题事件:', assistantId);
      
      // 确保当前助手与事件中的助手一致
      if (currentAssistant && currentAssistant.id === assistantId) {
        console.log('准备为当前助手创建新话题');
        // 延迟创建话题，确保其他状态已更新
        setTimeout(() => {
          handleCreateTopic();
        }, 100);
      }
    };

    // 处理话题清空事件，强制更新UI
    const handleTopicsCleared = (event: Event) => {
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
      }
    };
    // 注册事件监听器
    window.addEventListener('assistantNeedsTopic', handleAssistantNeedsTopic);
    window.addEventListener('topicsCleared', handleTopicsCleared);

    // 清理函数
    return () => {
      window.removeEventListener('assistantNeedsTopic', handleAssistantNeedsTopic);
      window.removeEventListener('topicsCleared', handleTopicsCleared);
    };
  }, [currentAssistant, handleCreateTopic, topics]);

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