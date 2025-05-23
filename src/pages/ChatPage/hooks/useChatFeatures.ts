import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { newMessagesActions } from '../../../shared/store/slices/newMessagesSlice';

import {
  createUserMessage,
  createAssistantMessage
} from '../../../shared/utils/messageUtils';
import {
  MessageBlockType,
  MessageBlockStatus,
  AssistantMessageStatus
} from '../../../shared/types/newMessage.ts';


import EnhancedWebSearchService from '../../../shared/services/EnhancedWebSearchService';
import { abortCompletion } from '../../../shared/utils/abortController';
import store from '../../../shared/store';
import { TopicService } from '../../../shared/services/TopicService';
import type { SiliconFlowImageFormat } from '../../../shared/types';

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
  // MCP 工具调用模式 - 从 localStorage 读取
  const [mcpMode, setMcpMode] = useState<'prompt' | 'function'>(() => {
    const saved = localStorage.getItem('mcp-mode');
    return (saved as 'prompt' | 'function') || 'function';
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

    // 使用新的块系统创建用户消息
    const { message: userMessage, blocks: userBlocks } = createUserMessage({
      content: query,
      assistantId: currentTopic.assistantId,
      topicId: currentTopic.id,
      modelId: selectedModel?.id,
      model: selectedModel || undefined
    });

    // 保存用户消息和块
    await TopicService.saveMessageAndBlocks(userMessage, userBlocks);

    try {
      // 创建助手消息和块
      const { message: searchingMessage, blocks: searchingBlocks } = createAssistantMessage({
        assistantId: currentTopic.assistantId,
        topicId: currentTopic.id,
        askId: userMessage.id,
        modelId: selectedModel?.id,
        model: selectedModel || undefined,
        status: AssistantMessageStatus.SEARCHING // 设置初始状态为SEARCHING
      });

      // 更新主文本块内容
      const mainTextBlock = searchingBlocks.find((block: any) => block.type === MessageBlockType.MAIN_TEXT);
      if (mainTextBlock && 'content' in mainTextBlock) {
        mainTextBlock.content = "正在搜索网络，请稍候...";
        mainTextBlock.status = MessageBlockStatus.PROCESSING; // 使用PROCESSING状态
      }

      // 保存助手消息和块
      await TopicService.saveMessageAndBlocks(searchingMessage, searchingBlocks);

      // 使用增强版搜索服务 - 支持电脑版所有提供商
      const searchResults = await EnhancedWebSearchService.searchWithStatus(
        query,
        currentTopic.id,
        searchingMessage.id
      );

      // 准备搜索结果内容和引用
      let resultsContent = `### 网络搜索结果\n\n`;
      const citations: any[] = [];

      if (searchResults.length === 0) {
        resultsContent += "没有找到相关结果。";
      } else {
        searchResults.forEach((result, index) => {
          resultsContent += `**${index + 1}. [${result.title}](${result.url})**\n`;
          resultsContent += `${result.snippet}\n\n`;

          // 创建引用
          citations.push({
            number: index + 1,
            url: result.url,
            title: result.title,
            hostname: new URL(result.url).hostname,
            content: result.content || result.snippet,
            showFavicon: true,
            type: 'websearch',
            metadata: {
              provider: result.provider,
              timestamp: result.timestamp
            }
          });
        });
      }

      // 更新主文本块内容
      if (mainTextBlock && mainTextBlock.id) {
        TopicService.updateMessageBlockFields(mainTextBlock.id, {
          content: resultsContent,
          status: MessageBlockStatus.SUCCESS
        });
      }

      // 如果有引用，创建引用块
      if (citations.length > 0) {
        const citationBlock = {
          id: `citation-${Date.now()}`,
          type: MessageBlockType.CITATION,
          messageId: searchingMessage.id,
          content: '',
          status: MessageBlockStatus.SUCCESS,
          citations: citations,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // 保存引用块到消息中
        const { dexieStorage } = await import('../../../shared/services/DexieStorageService');
        const updatedMessage = await dexieStorage.getMessage(searchingMessage.id);
        if (updatedMessage) {
          const updatedBlocks = [...(updatedMessage.blocks || []), citationBlock.id];
          await dexieStorage.updateMessage(searchingMessage.id, { blocks: updatedBlocks });
          await dexieStorage.saveMessageBlock(citationBlock);
        }
      }

      // 更新消息状态 - 使用新的Redux action
      store.dispatch({
        type: 'normalizedMessages/updateMessageStatus',
        payload: {
          topicId: currentTopic.id,
          messageId: searchingMessage.id,
          status: AssistantMessageStatus.SUCCESS
        }
      });

      // 关闭网络搜索模式
      setWebSearchActive(false);

    } catch (error) {
      console.error("网络搜索失败:", error);

      // 创建错误消息
      const { message: errorMessage, blocks: errorBlocks } = createAssistantMessage({
        assistantId: currentTopic.assistantId,
        topicId: currentTopic.id,
        askId: userMessage.id,
        modelId: selectedModel?.id,
        model: selectedModel || undefined,
        status: AssistantMessageStatus.ERROR // 设置状态为ERROR
      });

      // 更新主文本块内容
      const mainTextBlock = errorBlocks.find((block: any) => block.type === MessageBlockType.MAIN_TEXT);
      if (mainTextBlock && 'content' in mainTextBlock) {
        mainTextBlock.content = `网络搜索失败: ${error instanceof Error ? error.message : String(error)}`;
        mainTextBlock.status = MessageBlockStatus.ERROR;
      }

      // 保存错误消息和块
      await TopicService.saveMessageAndBlocks(errorMessage, errorBlocks);

      // 设置错误状态
      store.dispatch({
        type: 'normalizedMessages/setError',
        payload: {
          error: `网络搜索失败: ${error instanceof Error ? error.message : String(error)}`
        }
      });

      // 关闭网络搜索模式
      setWebSearchActive(false);
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

    // 正常的消息发送处理，传递工具开关状态和文件
    handleSendMessage(content, images, toolsEnabled, files);
  };

  // 切换工具调用开关
  const toggleToolsEnabled = () => {
    const newValue = !toolsEnabled;
    setToolsEnabled(newValue);
    localStorage.setItem('mcp-tools-enabled', JSON.stringify(newValue));
  };

  // 切换 MCP 模式
  const handleMCPModeChange = (mode: 'prompt' | 'function') => {
    setMcpMode(mode);
    localStorage.setItem('mcp-mode', mode);
  };

  return {
    webSearchActive,
    imageGenerationMode,
    toolsEnabled,
    mcpMode,
    toggleWebSearch,
    toggleImageGenerationMode,
    toggleToolsEnabled,
    handleMCPModeChange,
    handleWebSearch,
    handleImagePrompt,
    handleStopResponseClick,
    handleMessageSend
  };
};