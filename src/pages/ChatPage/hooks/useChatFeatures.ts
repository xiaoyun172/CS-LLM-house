import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { newMessagesActions } from '../../../shared/store/slices/newMessagesSlice';
import { multiModelService } from '../../../shared/services/MultiModelService';
import { ApiProviderRegistry } from '../../../shared/services/messages/ApiProvider';
import { dexieStorage } from '../../../shared/services/DexieStorageService';
import {
  createUserMessage,
  createAssistantMessage
} from '../../../shared/utils/messageUtils';
import {
  AssistantMessageStatus
} from '../../../shared/types/newMessage.ts';


import WebSearchBackendService, { type SearchProgressStatus } from '../../../shared/services/WebSearchBackendService';
import { abortCompletion } from '../../../shared/utils/abortController';
import store from '../../../shared/store';
import type { SiliconFlowImageFormat } from '../../../shared/types';
import { shouldPerformSearch } from '../../../shared/utils/SmartSearchUtils';

// 智能搜索敏感度级别
export const SmartSearchSensitivity = {
  LOW: 'low',        // 低敏感度 - 只有非常明确的查询才触发搜索
  MEDIUM: 'medium',  // 中敏感度 - 默认级别，平衡精度和召回率
  HIGH: 'high'       // 高敏感度 - 倾向于更多触发搜索，可能有误触发
} as const;

// 定义智能搜索敏感度类型
export type SmartSearchSensitivityType = typeof SmartSearchSensitivity[keyof typeof SmartSearchSensitivity];

/**
 * 处理聊天特殊功能相关的钩子
 * 包括图像生成、网络搜索、URL抓取等功能
 */
export const useChatFeatures = (
  currentTopic: any,
  currentMessages: any[],
  selectedModel: any,
  handleSendMessage: (content: string, images?: SiliconFlowImageFormat[], toolsEnabled?: boolean, files?: any[]) => void
) => {
  const dispatch = useDispatch();
  const [webSearchActive, setWebSearchActive] = useState(false); // 控制是否处于网络搜索模式
  const [imageGenerationMode, setImageGenerationMode] = useState(false); // 控制是否处于图像生成模式
  // MCP 工具开关状态 - 从 localStorage 读取并持久化
  const [toolsEnabled, setToolsEnabled] = useState(() => {
    const saved = localStorage.getItem('mcp-tools-enabled');
    return saved !== null ? JSON.parse(saved) : true; // 默认启用
  });
  // 添加智能搜索模式开关状态 - 从 localStorage 读取并持久化
  const [smartSearchEnabled, setSmartSearchEnabled] = useState(() => {
    const saved = localStorage.getItem('smart-search-enabled');
    return saved !== null ? JSON.parse(saved) : false; // 默认禁用
  });
  // 添加搜索结果自动发送给AI的开关状态 - 从 localStorage 读取并持久化
  const [sendSearchToAI, setSendSearchToAI] = useState(() => {
    const saved = localStorage.getItem('send-search-to-ai');
    return saved !== null ? JSON.parse(saved) : true; // 默认启用
  });
  // 添加智能搜索敏感度设置 - 从 localStorage 读取
  const [smartSearchSensitivity, setSmartSearchSensitivity] = useState<SmartSearchSensitivityType>(() => {
    const saved = localStorage.getItem('smart-search-sensitivity');
    return (saved as SmartSearchSensitivityType) || SmartSearchSensitivity.MEDIUM; // 默认中等敏感度
  });
  // 添加正在进行自动搜索的状态
  const [autoSearching, setAutoSearching] = useState(false);
  // 添加同时显示搜索结果和AI分析的状态
  const [showBothResults, setShowBothResults] = useState(() => {
    const saved = localStorage.getItem('show-both-results');
    return saved !== null ? JSON.parse(saved) : false; // 默认不启用
  });
  
  // 添加搜索进度状态跟踪
  const [searchProgress, setSearchProgress] = useState<{
    visible: boolean;
    status: SearchProgressStatus;
    query?: string;
    error?: string;
  }>({
    visible: false,
    status: 'preparing'
  });

  // 切换图像生成模式
  const toggleImageGenerationMode = () => {
    setImageGenerationMode(!imageGenerationMode);
    // 如果启用图像生成模式，关闭网络搜索模式
    if (!imageGenerationMode && webSearchActive) {
      setWebSearchActive(false);
    }
  };

  // 切换网络搜索模式
  const toggleWebSearch = () => {
    setWebSearchActive(!webSearchActive);
    // 如果启用网络搜索模式，关闭图像生成模式
    if (!webSearchActive && imageGenerationMode) {
      setImageGenerationMode(false);
    }
  };

  // 处理图像生成提示词
  const handleImagePrompt = (prompt: string) => {
    if (!currentTopic || !prompt.trim() || !selectedModel) return;

    console.log(`[useChatFeatures] 处理图像生成提示词: ${prompt}`);
    console.log(`[useChatFeatures] 使用模型: ${selectedModel.id}`);

    // 使用正常的消息发送流程，让messageThunk处理图像生成
    handleSendMessage(prompt, undefined, false); // 禁用工具，因为图像生成不需要工具
  };

  // 处理网络搜索请求
  const handleWebSearch = async (query: string) => {
    if (!currentTopic || !query.trim()) return;

    try {
      console.log(`[useChatFeatures] 处理网络搜索: ${query}`);
      
      // 设置搜索进度状态为可见，初始化查询和状态
      setSearchProgress({
        visible: true,
        status: 'preparing',
        query: query
      });
      
      // 搜索进度回调函数
      const progressCallback = (status: SearchProgressStatus, message?: string) => {
        console.log(`[SearchProgress] ${status}: ${message || ''}`);
        setSearchProgress(prev => ({
          ...prev,
          status,
          error: status === 'error' ? message : undefined
        }));
      };
      
      // 使用后台服务处理搜索和AI调用集成，传入进度回调
      const { userMessageId, assistantMessageId } = await WebSearchBackendService.processSearchAndSendToAI(
        query,
        currentTopic.id,
        selectedModel?.id,
        selectedModel,
        progressCallback
      );
      
      console.log(`[useChatFeatures] 搜索和AI处理完成，用户消息ID: ${userMessageId}，助手消息ID: ${assistantMessageId}`);
      
      // 标记自动搜索已完成
      if (autoSearching) {
        setAutoSearching(false);
      }
      
      // 关闭网络搜索模式
      setWebSearchActive(false);
      
      // 3秒后自动隐藏搜索进度指示器（通过组件内的useEffect完成）
    } catch (error) {
      console.error("[useChatFeatures] 网络搜索处理失败:", error);
      
      // 更新搜索进度状态为错误
      setSearchProgress(prev => ({
        ...prev,
        status: 'error',
        error: `搜索失败: ${error instanceof Error ? error.message : String(error)}`
      }));
      
      // 关闭网络搜索模式和自动搜索状态
      setWebSearchActive(false);
      setAutoSearching(false);
      
      // 显示错误消息
      store.dispatch({
        type: 'normalizedMessages/setError',
        payload: {
          error: `网络搜索处理失败: ${error instanceof Error ? error.message : String(error)}`
        }
      });
    }
  };

  // 处理停止响应点击事件
  const handleStopResponseClick = () => {
    if (!currentTopic) return;

    // 找到所有正在处理的助手消息
    const streamingMessages = currentMessages.filter(
      m => m.role === 'assistant' &&
      (m.status === AssistantMessageStatus.PROCESSING ||
       m.status === AssistantMessageStatus.PENDING ||
       m.status === AssistantMessageStatus.SEARCHING)
    );

    // 中断所有正在进行的请求
    const askIds = [...new Set(streamingMessages?.map((m) => m.askId).filter((id) => !!id) as string[])];

    for (const askId of askIds) {
      abortCompletion(askId);
    }

    // 停止流式响应
    store.dispatch({
      type: 'messages/setTopicStreaming',
      payload: { topicId: currentTopic.id, streaming: false }
    });

    // 更新所有正在处理的消息状态为成功
    streamingMessages.forEach(message => {
      dispatch(newMessagesActions.updateMessage({
        id: message.id,
        changes: {
          status: AssistantMessageStatus.SUCCESS
        }
      }));
    });
    
    // 如果正在自动搜索，也取消
    if (autoSearching) {
      setAutoSearching(false);
      
      // 隐藏搜索进度指示器
      setSearchProgress(prev => ({
        ...prev,
        visible: false
      }));
    }
  };

  // 处理搜索进度指示器关闭事件
  const handleSearchProgressClose = () => {
    setSearchProgress(prev => ({
      ...prev,
      visible: false
    }));
  };

  // 处理智能搜索敏感度改变
  const handleSmartSearchSensitivityChange = (sensitivity: SmartSearchSensitivityType) => {
    setSmartSearchSensitivity(sensitivity);
    localStorage.setItem('smart-search-sensitivity', sensitivity);
    console.log(`[useChatFeatures] 智能搜索敏感度设置为: ${sensitivity}`);
  };

  // 处理消息发送
  const handleMessageSend = async (content: string, images?: SiliconFlowImageFormat[], toolsEnabled?: boolean, files?: any[]) => {
    // 如果处于图像生成模式，则调用图像生成处理函数
    if (imageGenerationMode) {
      handleImagePrompt(content);
      // 关闭图像生成模式
      setImageGenerationMode(false);
      return;
    }

    // 如果处于网络搜索模式，则调用网络搜索处理函数
    if (webSearchActive) {
      handleWebSearch(content);
      return;
    }
    
    // 如果启用了智能搜索，则检查是否需要自动搜索
    if (smartSearchEnabled && !autoSearching) {
      // 根据敏感度调整智能搜索触发条件
      let triggerThreshold = 0;
      switch (smartSearchSensitivity) {
        case SmartSearchSensitivity.LOW:
          triggerThreshold = 3; // 需要更多触发条件
          break;
        case SmartSearchSensitivity.MEDIUM:
          triggerThreshold = 2; // 默认触发条件
          break;
        case SmartSearchSensitivity.HIGH:
          triggerThreshold = 1; // 更容易触发
          break;
        default:
          triggerThreshold = 2;
      }
      
      // 使用智能搜索工具判断是否需要搜索，传入敏感度参数
      const needsSearch = shouldPerformSearch(content, triggerThreshold);
      
      if (needsSearch) {
        console.log(`[useChatFeatures] 智能搜索触发（敏感度:${smartSearchSensitivity}），自动进行网络搜索`);
        // 标记正在进行自动搜索
        setAutoSearching(true);
        // 执行网络搜索
        handleWebSearch(content);
        return;
      }
    }

    // 正常的消息发送处理，传递工具开关状态和文件
    handleSendMessage(content, images, toolsEnabled, files);
  };

  // 切换工具调用开关
  const toggleToolsEnabled = () => {
    const newValue = !toolsEnabled;
    setToolsEnabled(newValue);
    localStorage.setItem('mcp-tools-enabled', JSON.stringify(newValue));
  };
  
  // 切换智能搜索开关
  const toggleSmartSearch = () => {
    const newValue = !smartSearchEnabled;
    setSmartSearchEnabled(newValue);
    localStorage.setItem('smart-search-enabled', JSON.stringify(newValue));
    console.log(`[useChatFeatures] 智能搜索模式 ${newValue ? '启用' : '禁用'}`);
    
    // 如果启用智能搜索，显示简短提示
    if (newValue) {
      // 这里可以添加一个事件或回调来提示用户，如果需要的话
    }
  };
  
  // 切换搜索结果自动发送给AI的开关
  const toggleSendSearchToAI = () => {
    const newValue = !sendSearchToAI;
    setSendSearchToAI(newValue);
    localStorage.setItem('send-search-to-ai', JSON.stringify(newValue));
    console.log(`[useChatFeatures] 搜索结果自动发送给AI ${newValue ? '启用' : '禁用'}`);
  };
  
  // 切换同时显示搜索结果和AI分析的开关
  const toggleShowBothResults = () => {
    const newValue = !showBothResults;
    setShowBothResults(newValue);
    localStorage.setItem('show-both-results', JSON.stringify(newValue));
    console.log(`[useChatFeatures] 同时显示搜索结果和AI分析 ${newValue ? '启用' : '禁用'}`);
    
    // 如果启用同时显示功能，必须启用发送搜索结果给AI
    if (newValue && !sendSearchToAI) {
      setSendSearchToAI(true);
      localStorage.setItem('send-search-to-ai', JSON.stringify(true));
      console.log('[useChatFeatures] 自动启用发送搜索结果给AI（同时显示功能需要）');
    }
  };

  // 处理多模型发送
  const handleMultiModelSend = async (content: string, models: any[], images?: any[], _toolsEnabled?: boolean, files?: any[]) => {
    if (!currentTopic || !selectedModel) return;

    try {
      console.log(`[useChatFeatures] 开始多模型发送，模型数量: ${models.length}`);
      console.log(`[useChatFeatures] 选中的模型:`, models.map(m => `${m.provider || m.providerType}:${m.id}`));

      // 使用静态导入的服务

      // 创建用户消息
      const { message: userMessage, blocks: userBlocks } = createUserMessage({
        content,
        assistantId: currentTopic.assistantId,
        topicId: currentTopic.id,
        modelId: selectedModel.id,
        model: selectedModel,
        images: images?.map(img => ({ url: img.image_url?.url || '' })),
        files: files?.map(file => file.fileRecord).filter(Boolean)
      });

      // 创建助手消息
      const { message: assistantMessage, blocks: assistantBlocks } = createAssistantMessage({
        assistantId: currentTopic.assistantId,
        topicId: currentTopic.id,
        askId: userMessage.id,
        modelId: selectedModel.id,
        model: selectedModel
      });

      // 保存消息到数据库
      await dexieStorage.saveMessage(userMessage);
      await dexieStorage.saveMessage(assistantMessage);

      // 保存消息块
      for (const block of [...userBlocks, ...assistantBlocks]) {
        await dexieStorage.saveMessageBlock(block);
      }

      // 更新Redux状态
      dispatch(newMessagesActions.addMessage({ topicId: currentTopic.id, message: userMessage }));
      dispatch(newMessagesActions.addMessage({ topicId: currentTopic.id, message: assistantMessage }));

      // 创建多模型响应块
      const blockId = await multiModelService.createMultiModelBlock(
        assistantMessage.id,
        models,
        'vertical' // 默认垂直布局
      );

      console.log(`[useChatFeatures] 创建多模型块: ${blockId}`);

      // 并行调用所有模型
      models.map(async (model) => {
        try {
          const modelKey = `${model.provider || model.providerType}:${model.id}`;
          console.log(`[useChatFeatures] 调用模型: ${modelKey}`);

          // 实际调用模型API
          await callSingleModelForMultiModel(model, content, blockId);

        } catch (error) {
          console.error(`[useChatFeatures] 模型 ${model.id} 调用失败:`, error);
          await multiModelService.updateModelResponse(blockId, model.id, `模型调用失败: ${error}`, 'error');
        }
      });

    } catch (error) {
      console.error('[useChatFeatures] 多模型发送失败:', error);
    }
  };

  // 为多模型调用单个模型
  const callSingleModelForMultiModel = async (
    model: any,
    content: string,
    blockId: string
  ) => {
    try {
      console.log(`[useChatFeatures] 开始调用单个模型: ${model.id}`);

      // 使用静态导入的API和服务

      // 获取当前话题的消息历史
      const topicMessages = await dexieStorage.getTopicMessages(currentTopic.id);

      // 按创建时间排序消息
      const sortedMessages = [...topicMessages].sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return timeA - timeB;
      });

      // 构建API消息数组
      const chatMessages: any[] = [];

      // 添加历史消息
      for (const message of sortedMessages) {
        if (message.role === 'system') continue; // 跳过系统消息

        // 获取消息的主要文本内容
        const messageBlocks = await dexieStorage.getMessageBlocksByMessageId(message.id);
        const mainTextBlock = messageBlocks.find((block: any) => block.type === 'main_text');
        const messageContent = (mainTextBlock as any)?.content || '';

        if (messageContent.trim()) {
          // 创建符合Message接口的对象
          chatMessages.push({
            id: message.id,
            role: message.role,
            content: messageContent,
            assistantId: message.assistantId,
            topicId: message.topicId,
            createdAt: message.createdAt,
            status: message.status,
            blocks: message.blocks
          });
        }
      }

      // 添加用户的新消息
      chatMessages.push({
        id: `temp-${Date.now()}`,
        role: 'user' as const,
        content: content,
        assistantId: currentTopic.assistantId,
        topicId: currentTopic.id,
        createdAt: new Date().toISOString(),
        status: 'success',
        blocks: []
      });

      console.log(`[useChatFeatures] 为模型 ${model.id} 准备消息历史，消息数量: ${chatMessages.length}`);

      // 获取API提供商
      const provider = ApiProviderRegistry.get(model);
      if (!provider) {
        throw new Error(`无法获取模型 ${model.id} 的API提供商`);
      }

      // 初始化响应状态
      await multiModelService.updateModelResponse(blockId, model.id, '', 'streaming');

      // 调用模型API，使用流式更新
      const response = await provider.sendChatMessage(chatMessages, {
        onUpdate: async (content: string) => {
          // 实时更新响应内容
          await multiModelService.updateModelResponse(blockId, model.id, content, 'streaming');
        },
        enableTools: true,
        // 其他选项...
      });

      // 处理最终响应
      let finalContent = '';
      if (typeof response === 'string') {
        finalContent = response;
      } else if (response && typeof response === 'object' && 'content' in response) {
        finalContent = response.content;
      }

      // 完成响应
      await multiModelService.completeModelResponse(blockId, model.id, finalContent);

      console.log(`[useChatFeatures] 模型 ${model.id} 调用完成`);

    } catch (error) {
      console.error(`[useChatFeatures] 模型 ${model.id} 调用失败:`, error);

      // 使用静态导入的服务
      await multiModelService.updateModelResponse(
        blockId,
        model.id,
        `调用失败: ${error instanceof Error ? error.message : String(error)}`,
        'error'
      );
    }
  };

  return {
    webSearchActive,
    imageGenerationMode,
    toolsEnabled,
    smartSearchEnabled,
    sendSearchToAI,
    autoSearching,
    smartSearchSensitivity,
    showBothResults,
    searchProgress,
    toggleWebSearch,
    toggleImageGenerationMode,
    toggleToolsEnabled,
    toggleSmartSearch,
    toggleSendSearchToAI,
    toggleShowBothResults,
    handleSmartSearchSensitivityChange,
    handleWebSearch,
    handleImagePrompt,
    handleStopResponseClick,
    handleSearchProgressClose,
    handleMessageSend,
    handleMultiModelSend
  };
};