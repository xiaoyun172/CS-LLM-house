import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Tabs, Tab } from '@mui/material';
import { 
  setCurrentTopic, 
  createTopic as createTopicAction, 
  deleteTopic as deleteTopicAction,
  loadTopics,
  updateTopic
} from '../../shared/store/messagesSlice';
import { createTopic } from '../../shared/utils';
import type { RootState } from '../../shared/store';
import type { ChatTopic } from '../../shared/types';
import type { Assistant } from '../../shared/types/Assistant';
import { AssistantService } from '../../shared/services/AssistantService';

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
    // 加载话题
    dispatch(loadTopics());
    
    // 加载助手数据
    loadAssistantsData();
  }, [dispatch]);

  // 监听Redux topics变化，触发更新当前助手的话题列表
  useEffect(() => {
    if (currentAssistant) {
      const assistantTopics = getCurrentAssistantTopics();
      setCurrentAssistantTopics(assistantTopics);
      console.log('已更新当前助手的话题列表:', assistantTopics.map(t => t.title));
    }
  }, [topics, currentAssistant]);
  
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
        console.log('创建的话题不属于当前助手，不处理');
        return;
      }
      
      const { topic } = customEvent.detail;
      
      // 检查话题是否已存在于当前列表中
      const exists = currentAssistantTopics.some(t => t.id === topic.id);
      if (exists) {
        console.log('话题已存在于当前列表中，不重复添加');
        return;
      }
      
      console.log('添加新话题到当前助手话题列表:', topic.title);
      
      // 更新当前助手的话题列表
      setCurrentAssistantTopics(prev => [topic, ...prev]);
      
      // 更新当前助手的topicIds
      const updatedAssistant = {
        ...currentAssistant,
        topicIds: [...(currentAssistant.topicIds || []), topic.id]
      };
      
      setCurrentAssistant(updatedAssistant);
      
      // 自动切换到话题标签页
      setValue(1);
    };
    
    // 注册事件监听器
    window.addEventListener('topicCreated', handleTopicCreated);
    
    // 清理函数
    return () => {
      window.removeEventListener('topicCreated', handleTopicCreated);
    };
  }, [currentAssistant, currentAssistantTopics]);

  // 加载助手数据
  const loadAssistantsData = () => {
    // 获取用户助手列表
    const assistants = AssistantService.getUserAssistants();
    
    // 如果没有助手，初始化默认助手
    if (assistants.length === 0) {
      const defaultAssistants = AssistantService.initializeDefaultAssistants();
      setUserAssistants(defaultAssistants);
      
      if (defaultAssistants.length > 0) {
        setCurrentAssistant(defaultAssistants[0]);
      }
    } else {
      setUserAssistants(assistants);
      
      // 获取当前选中的助手
      const current = AssistantService.getCurrentAssistant();
      if (current) {
        setCurrentAssistant(current);
      } else if (assistants.length > 0) {
        setCurrentAssistant(assistants[0]);
        AssistantService.setCurrentAssistant(assistants[0].id);
      }
    }
  };

  // 标签页切换
  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  // 选择助手
  const handleSelectAssistant = (assistant: Assistant) => {
    setCurrentAssistant(assistant);
    AssistantService.setCurrentAssistant(assistant.id);
    
    // 自动将标签切换到话题面板
    setValue(1);
    
    // 自动选择该助手的第一个话题（如果有的话）
    if (assistant.topicIds && assistant.topicIds.length > 0) {
      const firstTopicId = assistant.topicIds[0];
      
      // 从topics中查找该话题
      const firstTopic = topics.find(topic => topic.id === firstTopicId);
      if (firstTopic) {
        console.log(`自动选择助手"${assistant.name}"的第一个话题: ${firstTopic.title}`);
        dispatch(setCurrentTopic(firstTopic));
      } else {
        console.warn(`未找到助手"${assistant.name}"的第一个话题(${firstTopicId})`);
      }
    } else {
      console.log(`助手"${assistant.name}"没有关联的话题`);
    }
  };

  // 添加助手
  const handleAddAssistant = (assistant: Assistant) => {
    if (AssistantService.addAssistant(assistant)) {
      setUserAssistants([...userAssistants, assistant]);
      setCurrentAssistant(assistant);
    }
  };
  
  // 更新助手
  const handleUpdateAssistant = (assistant: Assistant) => {
    if (AssistantService.updateAssistant(assistant)) {
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
  const handleDeleteAssistant = (assistantId: string) => {
    if (AssistantService.deleteAssistant(assistantId)) {
      // 更新本地状态
      const updatedAssistants = userAssistants.filter(a => a.id !== assistantId);
      setUserAssistants(updatedAssistants);
      
      // 如果删除的是当前助手，设置第一个助手为当前助手
      if (currentAssistant?.id === assistantId && updatedAssistants.length > 0) {
        setCurrentAssistant(updatedAssistants[0]);
      } else if (updatedAssistants.length === 0) {
        setCurrentAssistant(null);
      }
    }
  };

  // 选择话题
  const handleSelectTopic = (topic: ChatTopic) => {
    dispatch(setCurrentTopic(topic));
  };

  // 创建新话题
  const handleCreateTopic = () => {
    if (!currentAssistant) return;
    
    const newTopic = createTopic('新聊天');
    dispatch(createTopicAction(newTopic));
    dispatch(setCurrentTopic(newTopic));
    
    // 将话题与当前助手关联
    AssistantService.addTopicToAssistant(currentAssistant.id, newTopic.id);
    
    // 更新当前助手
    const updatedAssistant = {
      ...currentAssistant,
      topicIds: [...(currentAssistant.topicIds || []), newTopic.id]
    };
    
    setCurrentAssistant(updatedAssistant);
    
    // 更新助手列表
    const updatedAssistants = userAssistants.map(assistant => 
      assistant.id === currentAssistant.id ? updatedAssistant : assistant
    );
    
    setUserAssistants(updatedAssistants);
    
    // 直接更新当前助手话题列表
    const updatedTopics = [...currentAssistantTopics, newTopic];
    setCurrentAssistantTopics(updatedTopics);
  };

  // 删除话题
  const handleDeleteTopic = (topicId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // 阻止事件冒泡
    
    if (!currentAssistant) return;
    
    // 从助手中移除话题
    AssistantService.removeTopicFromAssistant(currentAssistant.id, topicId);
    
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
    
    // 直接更新当前助手话题列表
    const updatedTopics = currentAssistantTopics.filter(topic => topic.id !== topicId);
    setCurrentAssistantTopics(updatedTopics);
  };

  // 更新设置状态处理回调函数
  const handleSettingChange = (settingId: string, value: boolean) => {
    setSettings({
      ...settings,
      [settingId]: value
    });
    
    // 保存设置到本地存储
    try {
      localStorage.setItem('appSettings', JSON.stringify({
        ...settings,
        [settingId]: value
      }));
    } catch (e) {
      console.error('保存设置失败', e);
    }
  };

  // 上下文长度处理
  const handleContextLengthChange = (value: number) => {
    setSettings({
      ...settings,
      contextLength: value
    });
    
    // 保存设置到本地存储
    try {
      localStorage.setItem('appSettings', JSON.stringify({
        ...settings,
        contextLength: value
      }));
    } catch (e) {
      console.error('保存设置失败', e);
    }
  };

  // 上下文数量处理
  const handleContextCountChange = (value: number) => {
    setSettings({
      ...settings,
      contextCount: value
    });
    
    // 保存设置到本地存储
    try {
      localStorage.setItem('appSettings', JSON.stringify({
        ...settings,
        contextCount: value
      }));
    } catch (e) {
      console.error('保存设置失败', e);
    }
  };

  // 数学公式渲染器处理
  const handleMathRendererChange = (value: any) => {
    setSettings({
      ...settings,
      mathRenderer: value
    });
    
    // 保存设置到本地存储
    try {
      localStorage.setItem('appSettings', JSON.stringify({
        ...settings,
        mathRenderer: value
      }));
    } catch (e) {
      console.error('保存设置失败', e);
    }
  };

  // 更新话题
  const handleUpdateTopic = (topic: ChatTopic) => {
    console.log('SidebarTabs 接收到话题更新请求:', topic);
    
    try {
      // 确保dispatch被正确调用
      dispatch(updateTopic(topic));
      
      console.log('话题更新action已分发', { topic });
      
      // 手动保存到localStorage以确保更新成功
      const topicsJson = localStorage.getItem('chatTopics');
      if (topicsJson) {
        const savedTopics = JSON.parse(topicsJson);
        const topicIndex = savedTopics.findIndex((t: ChatTopic) => t.id === topic.id);
        
        if (topicIndex !== -1) {
          savedTopics[topicIndex] = topic;
          localStorage.setItem('chatTopics', JSON.stringify(savedTopics));
          console.log('话题已手动保存到localStorage');
        } else {
          console.error('话题在localStorage中未找到:', topic.id);
        }
      } else {
        console.error('从localStorage读取话题失败');
      }
      
      // 更新本地状态中的话题
      const updatedTopics = currentAssistantTopics.map(t => 
        t.id === topic.id ? topic : t
      );
      setCurrentAssistantTopics(updatedTopics);
    } catch (error) {
      console.error('更新话题时出错:', error);
    }
  };

  // 获取当前助手的话题
  const getCurrentAssistantTopics = () => {
    if (!currentAssistant || !currentAssistant.topicIds) return [];
    
    return topics.filter((topic: ChatTopic) => currentAssistant.topicIds?.includes(topic.id));
  };

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
          topics={currentAssistantTopics.length > 0 ? currentAssistantTopics : getCurrentAssistantTopics()}
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