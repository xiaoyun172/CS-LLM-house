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

  // 应用设置
  const [settings, setSettings] = useState({
    streamOutput: true,
    showMessageDivider: true,
    copyableCodeBlocks: true
  });
  
  // 初始化加载
  useEffect(() => {
    // 加载话题
    dispatch(loadTopics());
    
    // 加载助手数据
    loadAssistantsData();
  }, [dispatch]);

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
  };

  // 设置变更处理
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
          topics={getCurrentAssistantTopics()}
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
        />
      </TabPanel>
    </Box>
  );
} 