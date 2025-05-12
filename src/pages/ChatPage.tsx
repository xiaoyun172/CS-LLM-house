import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Drawer,
  useMediaQuery,
  useTheme,
  IconButton,
  AppBar,
  Toolbar,
  Typography,
  Menu,
  MenuItem,
  Button
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsIcon from '@mui/icons-material/Settings';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../shared/store';
import {
  setCurrentTopic,
  createTopic as createTopicAction,
  addMessage,
  setTopicLoading,
  setError,
  updateMessage,
  setTopicStreaming
} from '../shared/store/messagesSlice';
import { createTopic, createMessage } from '../shared/utils';
import { sendChatRequest } from '../shared/api';
import type { ChatTopic, Message, Model } from '../shared/types';
import { isThinkingSupported } from '../shared/services/ThinkingService';
import MessageList from '../components/MessageList';
import ChatInput from '../components/ChatInput';
import TopicList from '../components/TopicList';

const DRAWER_WIDTH = 280;

const ChatPage: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);

  // 模型选择菜单相关状态
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  
  // 菜单打开状态
  const menuOpen = Boolean(anchorEl);
  
  // 打开模型选择菜单
  const handleModelMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  // 关闭模型选择菜单
  const handleModelMenuClose = () => {
    setAnchorEl(null);
  };
  
  // 选择模型
  const handleModelSelect = (model: Model) => {
    setSelectedModel(model);
    handleModelMenuClose();
  };

  // 从Redux获取状态
  const currentTopic = useSelector((state: RootState) => state.messages.currentTopic);
  const messagesByTopic = useSelector((state: RootState) => state.messages.messagesByTopic);
  const loadingByTopic = useSelector((state: RootState) => state.messages.loadingByTopic);
  const settings = useSelector((state: RootState) => state.settings);

  // 本地状态
  const [topics, setTopics] = useState<ChatTopic[]>([]);

  // 当屏幕尺寸变化时更新抽屉状态
  useEffect(() => {
    setDrawerOpen(!isMobile);
  }, [isMobile]);

  // 初始化加载主题和可用模型
  useEffect(() => {
    const loadData = async () => {
      try {
        // 加载主题列表
        const topicsData = await loadTopics();
        setTopics(topicsData);
        
        // 从用户设置中加载可用模型列表
        const availableModels: Model[] = [];
        
        // 只收集启用的提供商中的启用模型
        if (settings.providers) {
          settings.providers.forEach(provider => {
            if (provider.isEnabled) {
              // 从每个启用的提供商中收集启用的模型
              provider.models.forEach(model => {
                if (model.enabled) {
                  // 确保模型包含提供商的信息
                  const modelWithProviderInfo = {
                    ...model,
                    apiKey: model.apiKey || provider.apiKey,
                    baseUrl: model.baseUrl || provider.baseUrl,
                    providerType: model.providerType || provider.providerType || provider.id,
                    description: model.description || `${provider.name}的${model.name}模型`
                  };
                  availableModels.push(modelWithProviderInfo);
                }
              });
            }
          });
        }
        
        // 如果没有找到模型，使用一些默认模型（仅用于测试/演示）
        if (availableModels.length === 0) {
          console.warn('未找到用户配置的模型，使用默认测试模型');
          const defaultModels: Model[] = [
            { id: 'gpt-4', name: 'GPT-4', description: '最强大的大语言模型', provider: 'OpenAI', enabled: true },
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5', description: '平衡性能和速度', provider: 'OpenAI', enabled: true },
            { id: 'claude-3', name: 'Claude 3', description: '优秀的文本理解能力', provider: 'Anthropic', enabled: true },
            { id: 'deepseek', name: 'DeepSeek', description: '国内领先大模型', provider: 'DeepSeek', enabled: true }
          ];
          setAvailableModels(defaultModels);
          setSelectedModel(defaultModels[0]);
        } else {
          setAvailableModels(availableModels);
          
          // 选择默认模型：优先选择用户标记为默认的模型，否则选择第一个
          const defaultModel = availableModels.find(model => model.isDefault) || availableModels[0];
          setSelectedModel(defaultModel);
        }
      } catch (error) {
        console.error('加载数据失败', error);
      }
    };

    loadData();
  }, [dispatch, settings]);

  // 当主题变化时保存到本地存储
  useEffect(() => {
    if (topics.length > 0) {
      localStorage.setItem('chatTopics', JSON.stringify(topics));
    }
  }, [topics]);

  // 处理选择主题
  const handleSelectTopic = (topic: ChatTopic) => {
    dispatch(setCurrentTopic(topic));
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  // 处理创建新主题
  const handleNewTopic = () => {
    const newTopic = createTopic('新聊天');
    dispatch(createTopicAction(newTopic));
    setTopics([newTopic, ...topics]);
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  // 从本地存储加载主题
  const loadTopics = async (): Promise<ChatTopic[]> => {
    // 从本地存储加载主题
    const savedTopics = localStorage.getItem('chatTopics');
    if (savedTopics) {
      try {
        const parsedTopics = JSON.parse(savedTopics);

        // 确保每个主题都有messages数组
        const validTopics = parsedTopics.map((topic: ChatTopic) => ({
          ...topic,
          messages: topic.messages || []
        }));

        // 如果有主题，选择第一个
        if (validTopics.length > 0 && !currentTopic) {
          // 设置当前主题
          dispatch(setCurrentTopic(validTopics[0]));

          // 加载该主题的所有消息到Redux
          validTopics.forEach((topic: ChatTopic) => {
            if (topic.messages && topic.messages.length > 0) {
              topic.messages.forEach((message: Message) => {
                dispatch(addMessage({ topicId: topic.id, message }));
              });
            }
          });
        }

        return validTopics;
      } catch (error) {
        console.error('解析本地存储的主题失败:', error);
        return [];
      }
    }
    return [];
  };

  // 处理发送消息
  const handleSendMessage = async (content: string) => {
    console.log('发送消息:', content);

    if (!currentTopic) {
      console.error('没有当前主题');
      return;
    }

    // 创建用户消息
    const userMessage = createMessage({
      content,
      role: 'user'
    });

    // 添加到Redux
    dispatch(addMessage({ topicId: currentTopic.id, message: userMessage }));

    // 创建AI助手的回复消息（占位）
    const assistantMessage = createMessage({
      content: '',
      role: 'assistant',
      status: 'pending'
    });

    // 将占位消息添加到Redux
    dispatch(addMessage({ topicId: currentTopic.id, message: assistantMessage }));
    
    // 设置正在加载状态
    dispatch(setTopicLoading({ topicId: currentTopic.id, loading: true }));
    
    try {
      // 开始流式响应
      dispatch(setTopicStreaming({ topicId: currentTopic.id, streaming: true }));
      
      // 使用当前选择的模型ID
      const modelId = selectedModel?.id || settings.defaultModelId || 'gpt-3.5-turbo';
      
      // 检查模型是否支持思考过程
      const supportsThinking = isThinkingSupported(modelId);
      console.log(`当前模型 ${modelId} ${supportsThinking ? '支持' : '不支持'}思考过程`);
      
      // 获取该主题的所有消息 - 不包括刚刚添加的待处理消息
      const allMessages = messagesByTopic[currentTopic.id] || [];
      const messages = allMessages.filter(msg => msg.status !== 'pending');
      
      // 确保用户消息被包含在请求中
      const requestMessages = [...messages];
      
      // 如果消息历史为空，添加新的用户消息
      if (requestMessages.length === 0 || !requestMessages.some(msg => msg.role === 'user' && msg.content === content)) {
        if (!requestMessages.includes(userMessage)) {
          requestMessages.push(userMessage);
        }
      }
      
      console.log('发送API请求的消息列表:', requestMessages.map(m => ({
        role: m.role,
        content: m.content.substring(0, 20) + (m.content.length > 20 ? '...' : '')
      })));
      
      // 发送请求 - 使用所选模型
      const response = await sendChatRequest({
        messages: requestMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        modelId,
        onChunk: (chunk) => {
          if (chunk) {
            // 更新消息内容 - 直接使用字符串拼接
            dispatch(updateMessage({
              topicId: currentTopic.id,
              messageId: assistantMessage.id,
              updates: {
                content: assistantMessage.content + chunk,
                status: 'complete'
              }
            }));
          }
        }
      });
      
      // 完成流式响应
      dispatch(setTopicStreaming({ topicId: currentTopic.id, streaming: false }));
      
      if (!response.success) {
        throw new Error(response.error || '请求失败');
      } else if (response.content) {
        // 检查响应是否包含思考过程
        const responseObj = response as any;
        const reasoning = responseObj.reasoning;
        const reasoningTime = responseObj.reasoningTime;
        
        // 确保最终内容与API返回一致，并添加思考过程
        dispatch(updateMessage({
          topicId: currentTopic.id,
          messageId: assistantMessage.id,
          updates: {
            content: response.content,
            status: 'complete',
            reasoning: reasoning,
            reasoningTime: reasoningTime
          }
        }));
        
        // 保存消息到本地缓存
        updateTopicInLocalStorage(currentTopic.id, assistantMessage.id, response.content);
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      
      // 设置错误状态 - 修复：直接传入字符串而不是对象
      dispatch(setError(
        `发送消息失败: ${error instanceof Error ? error.message : String(error)}`
      ));
      
      // 更新消息状态为错误
      dispatch(updateMessage({
        topicId: currentTopic.id,
        messageId: assistantMessage.id,
        updates: {
          content: '很抱歉，请求处理失败，请稍后再试。',
          status: 'error'
        }
      }));
    } finally {
      // 设置加载状态为false
      dispatch(setTopicLoading({ topicId: currentTopic.id, loading: false }));
    }
  };
  
  // 辅助函数：更新本地存储中的主题
  const updateTopicInLocalStorage = (topicId: string, messageId: string, content: string) => {
    try {
      const savedTopicsJson = localStorage.getItem('chatTopics');
      if (!savedTopicsJson) return;
      
      const savedTopics = JSON.parse(savedTopicsJson);
      const updatedTopics = savedTopics.map((topic: ChatTopic) => {
        if (topic.id === topicId) {
          // 查找并更新消息
          const updatedMessages = (topic.messages || []).map((msg: Message) => {
            if (msg.id === messageId) {
              return { ...msg, content, status: 'complete' as const };
            }
            return msg;
          });
          
          // 如果没有找到消息，添加到最后
          const hasMessage = updatedMessages.some((msg: Message) => msg.id === messageId);
          if (!hasMessage) {
            const newMessage: Message = {
              id: messageId,
              content,
              role: 'assistant',
              status: 'complete',
              timestamp: new Date().toISOString()
            };
            updatedMessages.push(newMessage);
          }
          
          return { ...topic, messages: updatedMessages };
        }
        return topic;
      });
      
      localStorage.setItem('chatTopics', JSON.stringify(updatedTopics));
    } catch (error) {
      console.error('更新本地存储中的主题失败:', error);
    }
  };

  // 获取当前主题的消息
  const currentMessages: Message[] = currentTopic
    ? messagesByTopic[currentTopic.id] || []
    : [];

  // 获取当前主题的加载状态
  const isLoading = currentTopic
    ? loadingByTopic[currentTopic.id] || false
    : false;

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100vh',
        bgcolor: '#ffffff', // 纯白色背景
        flexDirection: 'column',
      }}
    >
      {/* 顶部应用栏 */}
      <AppBar 
        position="static" 
        elevation={0}
        sx={{ 
          bgcolor: 'white', 
          color: 'black',
          borderBottom: '1px solid #eeeeee',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => setDrawerOpen(!drawerOpen)}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="subtitle1" component="div" sx={{ fontWeight: 500 }}>
              对话
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* 模型选择按钮 */}
            <Button
              onClick={handleModelMenuClick}
              endIcon={<KeyboardArrowDownIcon />}
              sx={{
                textTransform: 'none',
                color: 'black',
                mr: 1,
                fontWeight: 'normal',
                fontSize: '0.9rem',
                border: '1px solid #eeeeee',
                borderRadius: '16px',
                px: 2,
                py: 0.5,
                '&:hover': {
                  bgcolor: '#f5f5f5',
                  border: '1px solid #e0e0e0',
                }
              }}
            >
              {selectedModel?.name || '选择模型'}
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={menuOpen}
              onClose={handleModelMenuClose}
              sx={{ mt: 1 }}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              {availableModels.map((model) => (
                <MenuItem 
                  key={model.id} 
                  onClick={() => handleModelSelect(model)}
                  selected={selectedModel?.id === model.id}
                  sx={{ 
                    minWidth: '180px',
                    py: 1,
                    '&.Mui-selected': {
                      bgcolor: 'rgba(25, 118, 210, 0.08)',
                    },
                    '&.Mui-selected:hover': {
                      bgcolor: 'rgba(25, 118, 210, 0.12)',
                    }
                  }}
                >
                  <Box>
                    <Typography variant="body2" component="div">
                      {model.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {model.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Menu>
          
            <IconButton color="inherit" onClick={() => navigate('/settings')}>
              <SettingsIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* 侧边栏 - 浮动样式 */}
      <Drawer
        variant={isMobile ? 'temporary' : 'temporary'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
          },
        }}
      >
        <TopicList
          topics={topics}
          currentTopicId={currentTopic?.id || null}
          onSelectTopic={handleSelectTopic}
          onNewTopic={handleNewTopic}
        />
      </Drawer>

      {/* 主内容区 - 固定布局 */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: '56px', // 为顶部应用栏留出空间
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 56px)',
          width: '100%',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {currentTopic ? (
          <>
            <MessageList messages={currentMessages} />
            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
          </>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              p: 3,
              textAlign: 'center',
              bgcolor: '#ffffff',
            }}
          >
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                fontWeight: 400,
                color: '#000000',
                mb: 1,
              }}
            >
              新的对话开始了，请输入您的问题
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ChatPage;
