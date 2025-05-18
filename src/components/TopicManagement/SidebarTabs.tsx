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
} from '../../shared/store/slices/messagesSlice';
import type { Assistant } from '../../shared/types/Assistant';
import type { ChatTopic } from '../../shared/types';
import type { RootState } from '../../shared/store';
import { TopicService } from '../../shared/services/TopicService';
import { getStorageItem, setStorageItem } from '../../shared/utils/storage';
import { useAssistant } from '../../shared/hooks'; // 导入新的钩子

// 导入子组件
import AssistantTab from './AssistantTab';
import TopicTab from './TopicTab';
import SettingsTab from './SettingsTab';

// 常量
const CURRENT_ASSISTANT_ID_KEY = 'currentAssistantId';

// // 话题创建事件类型 - REMOVED as it is no longer used after migrating to EventEmitter
// interface TopicCreatedEvent extends CustomEvent {
//   detail: {
//     topic: ChatTopic;
//     assistantId: string;
//   };
// }

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
  const initialized = useRef(false);

  const [userAssistants, setUserAssistants] = useState<Assistant[]>([]);
  const [currentAssistant, setCurrentAssistant] = useState<Assistant | null>(null);

  // 使用useAssistant钩子加载当前助手的话题
  const {
    assistant: assistantWithTopics,
    updateTopic: updateAssistantTopic,
  } = useAssistant(currentAssistant?.id || null);

  // 添加调试日志以便追踪问题
  useEffect(() => {
    console.log('[SidebarTabs] currentAssistant:', currentAssistant);
    console.log('[SidebarTabs] assistantWithTopics:', assistantWithTopics);
  }, [currentAssistant, assistantWithTopics]);

  const { currentTopic } = useSelector((state: RootState) => ({
    currentTopic: state.messages.currentTopic
  }));

  // 应用设置
  const [settings, setSettings] = useState({
    streamOutput: true,
    showMessageDivider: true,
    copyableCodeBlocks: true,
    contextLength: 2000,
    contextCount: 10,
    mathRenderer: 'KaTeX' as const
  });

  // 转换设置对象为SettingsTab组件需要的格式
  const settingsArray = [
    { id: 'streamOutput', name: '流式输出', defaultValue: settings.streamOutput, description: '实时显示AI回答，打字机效果' },
    { id: 'showMessageDivider', name: '消息分割线', defaultValue: settings.showMessageDivider, description: '在消息之间显示分割线' },
    { id: 'copyableCodeBlocks', name: '代码块可复制', defaultValue: settings.copyableCodeBlocks, description: '允许复制代码块的内容' },
  ];

  // 加载助手列表
  const loadAssistants = async () => {
    try {
      const assistants = await AssistantService.getUserAssistants();
      setUserAssistants(assistants);

      const cachedAssistantId = await getStorageItem<string>(CURRENT_ASSISTANT_ID_KEY);

      if (cachedAssistantId && assistants.length > 0) {
        const cachedAssistant = assistants.find(assistant => assistant.id === cachedAssistantId);
        if (cachedAssistant) {
          setCurrentAssistant(cachedAssistant);
        } else {
          setCurrentAssistant(assistants[0]);
        }
      } else if (assistants.length > 0) {
        setCurrentAssistant(assistants[0]);
      }

      // setLoading(false); // setLoading 将在 initializeData 中处理
    } catch (error) {
      console.error('[SidebarTabs] 加载助手数据失败:', error);
      // setLoading(false); // setLoading 将在 initializeData 中处理
      throw error; // 抛出错误以便 initializeData 捕获
    }
  };

  // 保存当前选择的助手ID到本地存储
  const persistCurrentAssistantId = useCallback(async (assistantId: string) => {
    try {
      await setStorageItem(CURRENT_ASSISTANT_ID_KEY, assistantId);
    } catch (error) {
      console.warn('[SidebarTabs] 缓存助手ID到存储失败:', error);
    }
  }, []);

  // 创建新话题
  const handleCreateTopic = useCallback(async () => {
    if (!currentAssistant) {
      console.error('[SidebarTabs] 无法创建话题: 当前没有选中的助手');
      return null;
    }

    try {
      const newTopic = await TopicService.createNewTopic();

      if (newTopic) {
        dispatch(setCurrentTopic(newTopic));
      }

      return newTopic;
    } catch (error) {
      console.error('[SidebarTabs] 创建新话题时出错:', error);
      return null;
    }
  }, [currentAssistant, dispatch]);

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

  // 当选择新助手时，保存助手ID到本地存储
  useEffect(() => {
    if (currentAssistant?.id) {
      persistCurrentAssistantId(currentAssistant.id);
    }
  }, [currentAssistant?.id, persistCurrentAssistantId]);

  // 标签页切换
  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  // 选择助手
  const handleSelectAssistant = async (assistant: Assistant) => {
    setCurrentAssistant(assistant);
    if (currentTopic && currentTopic.assistantId !== assistant.id) {
      dispatch(setCurrentTopic(null));
    }
    // 添加自动切换到话题标签页的逻辑
    setValue(1); // 切换到话题标签页（索引1）
  };

  // 添加助手
  const handleAddAssistant = async (assistant: Assistant) => {
    try {
      // 使用createNewAssistant方法创建助手，而不是直接调用addAssistant
      const newAssistant = await AssistantService.createNewAssistant(assistant);
      if (newAssistant) {
        const updatedAssistants = await AssistantService.getUserAssistants();
        setUserAssistants(updatedAssistants);
        setCurrentAssistant(newAssistant);
      } else {
        console.error('[SidebarTabs] 创建助手失败: createNewAssistant返回null');
      }
    } catch (error) {
      console.error('[SidebarTabs] 添加助手失败:', error);
    }
  };

  // 更新助手
  const handleUpdateAssistant = async (assistant: Assistant) => {
    try {
      await AssistantService.updateAssistant(assistant);
      const updatedAssistants = await AssistantService.getUserAssistants();
      setUserAssistants(updatedAssistants);
      if (currentAssistant && currentAssistant.id === assistant.id) {
        setCurrentAssistant(assistant);
      }
    } catch (error) {
      console.error('[SidebarTabs] 更新助手失败:', error);
    }
  };

  // 删除助手
  const handleDeleteAssistant = async (assistantId: string) => {
    try {
      await AssistantService.deleteAssistant(assistantId);
      const updatedAssistants = await AssistantService.getUserAssistants();
      setUserAssistants(updatedAssistants);
      if (currentAssistant && currentAssistant.id === assistantId) {
        if (updatedAssistants.length > 0) {
          setCurrentAssistant(updatedAssistants[0]);
        } else {
          setCurrentAssistant(null);
        }
      }
    } catch (error) {
      console.error('[SidebarTabs] 删除助手失败:', error);
    }
  };

  // 选择话题
  const handleSelectTopic = (topic: ChatTopic) => {
    dispatch(setCurrentTopic(topic));
  };

  // 删除话题
  const handleDeleteTopic = async (topicId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      if (currentAssistant) {
        await AssistantService.removeTopicFromAssistant(currentAssistant.id, topicId);
      }
      await TopicService.deleteTopic(topicId);
      dispatch(deleteTopicAction(topicId));
      if (currentTopic && currentTopic.id === topicId) {
        const assistantTopics = assistantWithTopics?.topics || [];
        if (assistantTopics.length > 0 && assistantTopics[0].id !== topicId) {
          dispatch(setCurrentTopic(assistantTopics[0]));
        } else {
          dispatch(setCurrentTopic(null));
        }
      }
    } catch (error) {
      console.error('[SidebarTabs] 删除话题失败:', error);
    }
  };

  // 设置相关函数
  const handleSettingChange = (settingId: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [settingId]: value }));
  };

  const handleContextLengthChange = (value: number) => {
    setSettings(prev => ({ ...prev, contextLength: value }));
  };

  const handleContextCountChange = (value: number) => {
    setSettings(prev => ({ ...prev, contextCount: value }));
  };

  const handleMathRendererChange = (value: any) => {
    setSettings(prev => ({ ...prev, mathRenderer: value }));
  };

  // 更新话题
  const handleUpdateTopic = (topic: ChatTopic) => {
    dispatch(updateTopic(topic));
    updateAssistantTopic(topic); // 来自 useAssistant
  };

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
          currentAssistant={assistantWithTopics}
          currentTopic={currentTopic}
          onSelectTopic={handleSelectTopic}
          onCreateTopic={handleCreateTopic}
          onDeleteTopic={handleDeleteTopic}
          onUpdateTopic={handleUpdateTopic}
        />
      </TabPanel>

      <TabPanel value={value} index={2}>
        <SettingsTab
          settings={settingsArray}
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