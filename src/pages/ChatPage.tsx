import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
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
  addMessage,
  setTopicLoading,
  setError,
  updateMessage,
  setTopicStreaming,
  setTopicMessages,
  createTopic,
  addAlternateVersion,
} from '../shared/store/messagesSlice';
import { setCurrentModel } from '../shared/store/settingsSlice';
import { createMessage } from '../shared/utils';
import { sendChatRequest } from '../shared/api';
import type { ChatTopic, Message, Model } from '../shared/types';
import { isThinkingSupported } from '../shared/services/ThinkingService';
import MessageList from '../components/MessageList';
import ChatInput from '../components/ChatInput';
import { Sidebar } from '../components/TopicManagement';
import ChatToolbar from '../components/ChatToolbar';
import { AssistantService } from '../shared/services/AssistantService';

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
    // 保存选择的模型ID到Redux和localStorage
    dispatch(setCurrentModel(model.id));
    handleModelMenuClose();
  };

  // 从Redux获取状态
  const currentTopic = useSelector((state: RootState) => state.messages.currentTopic);
  const messagesByTopic = useSelector((state: RootState) => state.messages.messagesByTopic);
  const loadingByTopic = useSelector((state: RootState) => state.messages.loadingByTopic);
  const settings = useSelector((state: RootState) => state.settings);
  const currentModelId = useSelector((state: RootState) => state.settings.currentModelId);

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
          
          // 如果存储了当前模型ID，查找匹配的模型
          if (currentModelId) {
            const model = defaultModels.find(m => m.id === currentModelId);
            if (model) {
              setSelectedModel(model);
            } else {
              setSelectedModel(defaultModels[0]);
            }
          } else {
            setSelectedModel(defaultModels[0]);
          }
        } else {
          setAvailableModels(availableModels);
          
          // 使用Redux中存储的当前模型ID，如果没有则使用默认模型
          if (currentModelId) {
            const model = availableModels.find(m => m.id === currentModelId);
            if (model) {
              setSelectedModel(model);
            } else {
              // 如果找不到匹配的模型（可能是模型被删除了），选择默认或第一个
              const defaultModel = availableModels.find(model => model.isDefault) || availableModels[0];
              setSelectedModel(defaultModel);
              // 更新Redux中的当前模型ID
              if (defaultModel) {
                dispatch(setCurrentModel(defaultModel.id));
              }
            }
          } else {
            // 没有当前模型ID，选择默认或第一个
            const defaultModel = availableModels.find(model => model.isDefault) || availableModels[0];
            setSelectedModel(defaultModel);
            // 更新Redux中的当前模型ID
            if (defaultModel) {
              dispatch(setCurrentModel(defaultModel.id));
            }
          }
        }
      } catch (error) {
        console.error('加载数据失败', error);
      }
    };

    loadData();
  }, [dispatch, settings, currentModelId]);

  // 当主题变化时保存到本地存储
  useEffect(() => {
    if (topics.length > 0) {
      localStorage.setItem('chatTopics', JSON.stringify(topics));
    }
  }, [topics]);

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

    // 生成唯一ID，用于关联这次请求相关的消息
    const requestId = Date.now().toString();
    
    // 创建用户消息
    const userMessage = createMessage({
      content,
      role: 'user',
      id: `user-${requestId}` // 使用requestId确保ID唯一性
    });

    // 添加到Redux
    dispatch(addMessage({ topicId: currentTopic.id, message: userMessage }));

    // 创建AI助手的回复消息（占位）
    const assistantMessage = createMessage({
      content: '',
      role: 'assistant',
      status: 'pending',
      id: `assistant-${requestId}` // 使用requestId确保ID唯一性
    });

    // 将占位消息添加到Redux
    dispatch(addMessage({ topicId: currentTopic.id, message: assistantMessage }));
    
    // 启动单独的加载状态追踪器，而不是使用全局的主题加载状态
    // 这样即使有多个请求同时发送，输入框也不会被禁用
    let isRequestPending = true;
    
    // 设置加载状态，但不会影响用户发送新消息的能力
    dispatch(setTopicLoading({ topicId: currentTopic.id, loading: true }));
    
    try {
      // 开始流式响应
      dispatch(setTopicStreaming({ topicId: currentTopic.id, streaming: true }));
      
      // 使用当前选择的模型ID
      const modelId = selectedModel?.id || currentModelId || settings.defaultModelId || 'gpt-3.5-turbo';
      
      // 检查模型是否支持思考过程
      const supportsThinking = isThinkingSupported(modelId);
      console.log(`当前模型 ${modelId} ${supportsThinking ? '支持' : '不支持'}思考过程`);
      
      // 获取到目前为止的所有历史消息 - 不包括刚刚添加的待处理消息和其他正在处理的消息
      const allMessages = messagesByTopic[currentTopic.id] || [];
      const messages = allMessages.filter(msg => msg.status !== 'pending' && msg.id !== assistantMessage.id);
      
      // 获取系统提示词 - 优先使用话题的提示词，其次使用当前助手的系统提示词
      let systemPrompt: string | undefined;
      
      // 1. 直接从当前话题对象中获取提示词
      if (currentTopic.prompt) {
        systemPrompt = currentTopic.prompt;
        console.log('使用话题提示词:', systemPrompt.substring(0, 30) + (systemPrompt.length > 30 ? '...' : ''));
      } 
      // 2. 从localStorage中获取助手信息
      else {
        try {
          console.log('当前话题ID:', currentTopic.id);
          
          // 尝试从localStorage获取userAssistants数据
          const assistantsJson = localStorage.getItem('userAssistants');
          if (assistantsJson) {
            const assistants = JSON.parse(assistantsJson);
            
            // 查找关联到当前话题的助手
            const currentAssistant = assistants.find((a: any) => 
              a.topicIds && Array.isArray(a.topicIds) && a.topicIds.includes(currentTopic.id)
            );
            
            if (currentAssistant?.systemPrompt) {
              systemPrompt = currentAssistant.systemPrompt;
              console.log('使用助手提示词:', systemPrompt);
            } else {
              console.log('未找到助手提示词');
            }
          } else {
            console.log('localStorage中不存在userAssistants数据');
          }
        } catch (error) {
          console.error('获取助手信息失败:', error);
        }
      }
      
      // 如果找到系统提示词，将其作为系统消息添加到请求中
      const requestMessages = [...messages, userMessage];
      
      // 添加系统消息到请求的开始，如果有的话
      if (systemPrompt) {
        // 为API请求创建一个简化的系统消息对象
        requestMessages.unshift({
          role: 'system',
          content: systemPrompt
        } as any); // 使用类型断言，因为这里我们只关心API请求格式
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
      
      // 当前的流式响应已完成
      isRequestPending = false;
      
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
      // 如果消息的处理已经完成，检查是否有其他待处理的消息
      if (!isRequestPending) {
        const pendingMessages = (messagesByTopic[currentTopic.id] || []).filter(msg => msg.status === 'pending');
        
        // 如果没有其他待处理的消息，才完全关闭加载状态
        if (pendingMessages.length === 0) {
          dispatch(setTopicLoading({ topicId: currentTopic.id, loading: false }));
          dispatch(setTopicStreaming({ topicId: currentTopic.id, streaming: false }));
        }
      }
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

  // 处理消息删除
  const handleDeleteMessage = (messageId: string) => {
    if (!currentTopic) return;
    
    // 找到要删除的消息在数组中的索引
    const messages = messagesByTopic[currentTopic.id] || [];
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex === -1) return;
    
    // 创建一个删除了特定消息的新数组
    const updatedMessages = messages.filter(msg => msg.id !== messageId);
    
    // 更新Redux状态
    dispatch(setTopicMessages({
      topicId: currentTopic.id,
      messages: updatedMessages
    }));
    
    // 不需要手动更新本地存储，setTopicMessages action会自动处理
  };

  // 处理消息重新生成
  const handleRegenerateMessage = async (messageId: string) => {
    if (!currentTopic || !selectedModel) return;
    
    const messages = messagesByTopic[currentTopic.id] || [];
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex === -1 || messages[messageIndex].role !== 'assistant') return;
    
    // 找到这条AI回复之前的用户消息
    let previousUserMessageIndex = -1;
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        previousUserMessageIndex = i;
        break;
      }
    }
    
    if (previousUserMessageIndex === -1) return;
    
    // 生成唯一ID，用于关联这次请求相关的消息
    const requestId = Date.now().toString();
    
    // 创建AI助手的新回复消息（占位）
    const newAssistantMessage = createMessage({
      content: '',
      role: 'assistant',
      status: 'pending',
      id: `assistant-regen-${requestId}`,
      parentMessageId: messages[previousUserMessageIndex].id // 关联到用户消息
    });
    
    // 设置加载状态，但不会影响用户发送新消息的能力
    dispatch(setTopicLoading({ topicId: currentTopic.id, loading: true }));
    
    // 启动单独的加载状态追踪器
    let isRequestPending = true;
    
    try {
      // 开始流式响应
      dispatch(setTopicStreaming({ topicId: currentTopic.id, streaming: true }));
      
      // 使用当前选择的模型ID
      const modelId = selectedModel?.id || currentModelId || settings.defaultModelId || 'gpt-3.5-turbo';
      
      // 获取系统提示词 - 优先使用话题的提示词，其次使用当前助手的系统提示词
      let systemPrompt: string | undefined;
      
      // 1. 直接从当前话题对象中获取提示词
      if (currentTopic.prompt) {
        systemPrompt = currentTopic.prompt;
        console.log('使用话题提示词:', systemPrompt.substring(0, 30) + (systemPrompt.length > 30 ? '...' : ''));
      } 
      // 2. 从localStorage中获取助手信息
      else {
        try {
          console.log('当前话题ID:', currentTopic.id);
          
          // 尝试从localStorage获取userAssistants数据
          const assistantsJson = localStorage.getItem('userAssistants');
          if (assistantsJson) {
            const assistants = JSON.parse(assistantsJson);
            
            // 查找关联到当前话题的助手
            const currentAssistant = assistants.find((a: any) => 
              a.topicIds && Array.isArray(a.topicIds) && a.topicIds.includes(currentTopic.id)
            );
            
            if (currentAssistant?.systemPrompt) {
              systemPrompt = currentAssistant.systemPrompt;
              console.log('使用助手提示词:', systemPrompt);
            } else {
              console.log('未找到助手提示词');
            }
          } else {
            console.log('localStorage中不存在userAssistants数据');
          }
        } catch (error) {
          console.error('获取助手信息失败:', error);
        }
      }
      
      // 获取到目前为止的所有历史消息 - 不包括被重新生成的消息
      // 只取用户消息和直到重新生成消息之前的助手消息
      const filteredMessages = messages.filter((msg, idx) => {
        // 包含所有用户消息
        if (msg.role === 'user') return true;
        
        // 只包含在当前要重生成的消息之前的助手消息
        return msg.role === 'assistant' && idx < messageIndex;
      });
      
      // 添加用户消息
      const requestMessages = [...filteredMessages];
      
      // 添加系统消息到请求的开始，如果有的话
      if (systemPrompt) {
        // 为API请求创建一个简化的系统消息对象
        requestMessages.unshift({
          role: 'system',
          content: systemPrompt
        } as any); // 使用类型断言，因为这里我们只关心API请求格式
      }
      
      console.log('重新生成消息的请求列表:', requestMessages.map(m => ({
        role: m.role,
        content: m.content.substring(0, 20) + (m.content.length > 20 ? '...' : '')
      })));
      
      // 使用addAlternateVersion action添加新的消息版本占位符
      dispatch(addAlternateVersion({
        topicId: currentTopic.id,
        originalMessageId: messageId,
        newMessage: newAssistantMessage
      }));
      
      // 发送请求
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
              messageId: newAssistantMessage.id,
              updates: {
                content: newAssistantMessage.content + chunk,
                status: 'complete'
              }
            }));
          }
        }
      });
      
      // 当前的流式响应已完成
      isRequestPending = false;
      
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
          messageId: newAssistantMessage.id,
          updates: {
            content: response.content,
            status: 'complete',
            reasoning: reasoning,
            reasoningTime: reasoningTime
          }
        }));
        
        // 保存消息到本地缓存
        updateTopicInLocalStorage(currentTopic.id, newAssistantMessage.id, response.content);
      }
    } catch (error) {
      console.error('重新生成消息失败:', error);
      
      // 设置错误状态
      dispatch(setError(
        `重新生成消息失败: ${error instanceof Error ? error.message : String(error)}`
      ));
      
      // 更新消息状态为错误
      dispatch(updateMessage({
        topicId: currentTopic.id,
        messageId: newAssistantMessage.id,
        updates: {
          content: '很抱歉，请求处理失败，请稍后再试。',
          status: 'error'
        }
      }));
    } finally {
      // 如果消息的处理已经完成，检查是否有其他待处理的消息
      if (!isRequestPending) {
        const pendingMessages = (messagesByTopic[currentTopic.id] || []).filter(msg => msg.status === 'pending');
        
        // 如果没有其他待处理的消息，才完全关闭加载状态
        if (pendingMessages.length === 0) {
          dispatch(setTopicLoading({ topicId: currentTopic.id, loading: false }));
          dispatch(setTopicStreaming({ topicId: currentTopic.id, streaming: false }));
        }
      }
    }
  };

  // 处理新建话题
  const handleNewTopic = () => {
    try {
      // 创建一个新的话题
      const newTopic = {
        id: generateId(),
        title: '新话题 ' + new Date().toLocaleTimeString(),
        lastMessageTime: new Date().toISOString(),
        messages: []
      };
      
      // 添加到Redux
      dispatch(createTopic(newTopic));
      
      // 刷新话题列表
      setTopics([newTopic, ...topics]);

      // 获取当前助手ID
      const currentAssistantId = localStorage.getItem('currentAssistant');
      console.log('当前助手ID:', currentAssistantId);

      if (!currentAssistantId) {
        console.error('未找到当前助手ID，无法关联话题');
        return;
      }

      // 获取助手列表
      const assistants = AssistantService.getUserAssistants();
      const currentAssistant = assistants.find(a => a.id === currentAssistantId);
      
      if (!currentAssistant) {
        console.error(`未找到ID为${currentAssistantId}的助手`);
        return;
      }

      console.log(`正在将话题"${newTopic.title}"(${newTopic.id})关联到助手"${currentAssistant.name}"(${currentAssistant.id})`);
      
      // 将话题与当前助手关联 - 更新助手对象
      const updatedAssistant = {
        ...currentAssistant,
        topicIds: [...(currentAssistant.topicIds || []), newTopic.id]
      };
      
      // 保存更新的助手到localStorage
      const success = AssistantService.updateAssistant(updatedAssistant);
      
      if (success) {
        console.log(`成功将话题"${newTopic.title}"关联到助手"${currentAssistant.name}"`);
        
        // 再次验证关联是否成功
        const updatedAssistants = AssistantService.getUserAssistants();
        const updatedCurrentAssistant = updatedAssistants.find(a => a.id === currentAssistantId);
        
        if (updatedCurrentAssistant && updatedCurrentAssistant.topicIds?.includes(newTopic.id)) {
          console.log('验证成功：话题已成功关联到助手的话题列表');
          console.log('助手的话题ID列表:', updatedCurrentAssistant.topicIds);
        } else {
          console.error('验证失败：话题未显示在助手的话题列表中');
          // 使用另一种方法尝试关联
          AssistantService.addTopicToAssistant(currentAssistantId, newTopic.id);
        }
      } else {
        console.error(`无法更新助手"${currentAssistant.name}"的话题列表`);
        // 使用另一种方法尝试关联
        AssistantService.addTopicToAssistant(currentAssistantId, newTopic.id);
      }
      
      // 设置为当前话题
      dispatch(setCurrentTopic(newTopic));
      
      // 派发一个自定义事件，通知应用新话题已创建
      const topicCreatedEvent = new CustomEvent('topicCreated', { 
        detail: { topic: newTopic, assistantId: currentAssistantId } 
      });
      window.dispatchEvent(topicCreatedEvent);
      
      // 手动触发Redux store的变化，确保所有相关组件都能感知到更新
      dispatch({ type: 'FORCE_TOPICS_UPDATE' });
      
      console.log('已派发话题创建事件，通知应用刷新话题列表');
    } catch (error) {
      console.error('创建新话题时出错:', error);
    }
  };
  
  // 生成唯一ID
  const generateId = (): string => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  // 清空当前话题内容
  const handleClearTopic = () => {
    if (!currentTopic) return;
    
    // 创建一个空的消息数组
    dispatch(setTopicMessages({
      topicId: currentTopic.id,
      messages: []
    }));
    
    // 更新本地存储
    try {
      const topicsJson = localStorage.getItem('chatTopics');
      if (topicsJson) {
        const savedTopics = JSON.parse(topicsJson);
        const updatedTopics = savedTopics.map((topic: ChatTopic) => {
          if (topic.id === currentTopic.id) {
            return { ...topic, messages: [] };
          }
          return topic;
        });
        localStorage.setItem('chatTopics', JSON.stringify(updatedTopics));
      }
    } catch (error) {
      console.error('更新本地存储失败:', error);
    }
  };

  return (
    <Box sx={{ 
        display: 'flex',
      flexDirection: { xs: 'column', sm: 'row' }, 
        height: '100vh',
      bgcolor: '#ffffff'
    }}>
      {/* 桌面端固定显示侧边栏，移动端可隐藏 */}
      {!isMobile && <Sidebar />}
      
      {/* 主内容区域 */}
      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex', 
        flexDirection: 'column',
        height: '100vh', 
        overflow: 'hidden'
      }}>
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
              {isMobile && (
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => setDrawerOpen(!drawerOpen)}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
              )}
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

        {/* 移动端侧边栏 */}
        {isMobile && (
          <Sidebar 
            mobileOpen={drawerOpen} 
            onMobileToggle={() => setDrawerOpen(!drawerOpen)} 
          />
        )}

        {/* 聊天内容区域 */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
            height: 'calc(100vh - 64px)', // 减去顶部导航栏高度
          width: '100%',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {currentTopic ? (
          <>
            <MessageList 
              messages={currentMessages} 
              onRegenerate={handleRegenerateMessage}
              onDelete={handleDeleteMessage}
            />
            
            {/* 添加工具栏 */}
            <ChatToolbar 
              onNewTopic={handleNewTopic}
              onClearTopic={handleClearTopic}
            />
            
            <ChatInput 
              onSendMessage={handleSendMessage} 
              isLoading={isLoading} 
              allowConsecutiveMessages={true} // 允许连续发送消息，即使AI尚未回复
            />
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
    </Box>
  );
};

export default ChatPage;
