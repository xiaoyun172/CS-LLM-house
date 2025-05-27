import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { newMessagesActions } from '../../../shared/store/slices/newMessagesSlice';
import { updateOneBlock } from '../../../shared/store/slices/messageBlocksSlice';
import { multiModelService } from '../../../shared/services/MultiModelService';
import { ApiProviderRegistry } from '../../../shared/services/messages/ApiProvider';
import { dexieStorage } from '../../../shared/services/DexieStorageService';
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
  const handleImagePrompt = (prompt: string, images?: SiliconFlowImageFormat[], files?: any[]) => {
    if (!currentTopic || !prompt.trim() || !selectedModel) return;

    console.log(`[useChatFeatures] 处理图像生成提示词: ${prompt}`);
    console.log(`[useChatFeatures] 使用模型: ${selectedModel.id}`);

    // 直接使用正常的消息发送流程，让messageThunk处理图像生成
    // 不再调用handleSendMessage，避免重复发送
    handleSendMessage(prompt, images, false, files); // 禁用工具，因为图像生成不需要工具
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

      // 使用增强版搜索服务 - 支持最佳实例所有提供商
      const searchResults = await EnhancedWebSearchService.searchWithStatus(
        query,
        currentTopic.id,
        searchingMessage.id
      );

      // 🚀 风格：搜索结果通过搜索结果块显示
      let resultsContent = '';

      if (searchResults.length === 0) {
        resultsContent = "没有找到相关结果。";
      } else {
        // 🚀 消息内容为空，搜索结果完全通过块显示
        resultsContent = '';

        // 🚀 创建搜索结果块
        const searchResultsBlock = {
          id: `search-results-${Date.now()}`,
          type: MessageBlockType.SEARCH_RESULTS,
          messageId: searchingMessage.id,
          content: '',
          status: MessageBlockStatus.SUCCESS,
          searchResults: searchResults,
          query: query,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // 🚀 将搜索结果块插入到消息块列表的开头（在主文本块之前）
        const updatedMessage = await dexieStorage.getMessage(searchingMessage.id);
        if (updatedMessage) {
          // 将搜索结果块ID插入到blocks数组的开头
          const updatedBlocks = [searchResultsBlock.id, ...(updatedMessage.blocks || [])];
          await dexieStorage.updateMessage(searchingMessage.id, { blocks: updatedBlocks });
          await dexieStorage.saveMessageBlock(searchResultsBlock);
        }
      }

      // 更新主文本块内容
      if (mainTextBlock && mainTextBlock.id) {
        TopicService.updateMessageBlockFields(mainTextBlock.id, {
          content: resultsContent,
          status: MessageBlockStatus.SUCCESS
        });
      }

      // 🚀 不再创建引用块，搜索结果通过搜索结果块显示

      // 更新消息状态为成功
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

      // 🚀 新增：基于搜索结果让AI进行回复（在同一个消息块内追加）
      if (mainTextBlock && mainTextBlock.id) {
        await handleAIResponseAfterSearch(
          query,
          searchResults,
          currentTopic,
          selectedModel,
          searchingMessage.id,
          mainTextBlock.id
        );
      }

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

  // 🚀 新增：基于搜索结果让AI进行回复（在同一个消息块内追加内容）
  const handleAIResponseAfterSearch = async (
    originalQuery: string,
    searchResults: any[],
    topic: any,
    model: any,
    existingMessageId: string,
    existingMainTextBlockId: string
  ) => {
    if (!topic || !model || searchResults.length === 0 || !existingMessageId || !existingMainTextBlockId) return;

    try {
      console.log(`[useChatFeatures] 开始基于搜索结果生成AI回复，追加到现有消息`);

      // 构建包含搜索结果的提示词
      let searchContext = `用户问题：${originalQuery}\n\n`;
      searchContext += `网络搜索结果：\n`;

      searchResults.forEach((result, index) => {
        searchContext += `${index + 1}. 标题：${result.title}\n`;
        searchContext += `   链接：${result.url}\n`;
        searchContext += `   内容：${result.snippet}\n\n`;
      });

      searchContext += `请基于以上搜索结果，对用户的问题进行详细、准确的回答。请引用相关的搜索结果，并提供有价值的分析和见解。`;

      // 获取当前搜索结果内容
      const currentBlock = store.getState().messageBlocks.entities[existingMainTextBlockId];
      const currentContent = (currentBlock as any)?.content || '';

      // 在现有内容后添加分隔符和AI分析标题
      const aiAnalysisHeader = '\n\n---\n\n## 🤖 AI 智能分析\n\n';

      // 先更新块内容，添加AI分析标题
      await TopicService.updateMessageBlockFields(existingMainTextBlockId, {
        content: currentContent + aiAnalysisHeader,
        status: MessageBlockStatus.PROCESSING
      });

      // 调用AI API
      const { sendChatRequest } = await import('../../../shared/api');

      // 构建消息历史
      const messages = [{
        role: 'user' as const,
        content: searchContext
      }];

      console.log(`[useChatFeatures] 调用AI API进行搜索结果分析`);

      // 调用AI API
      const response = await sendChatRequest({
        messages,
        modelId: model.id,
        onChunk: async (content: string) => {
          // 实时更新块内容：搜索结果 + AI分析标题 + AI回复内容
          const updatedContent = currentContent + aiAnalysisHeader + content;

          // 同时更新数据库和Redux状态
          await TopicService.updateMessageBlockFields(existingMainTextBlockId, {
            content: updatedContent,
            status: MessageBlockStatus.PROCESSING
          });

          // 强制更新Redux状态以触发UI重新渲染
          dispatch(updateOneBlock({
            id: existingMainTextBlockId,
            changes: {
              content: updatedContent,
              status: MessageBlockStatus.PROCESSING,
              updatedAt: new Date().toISOString()
            }
          }));
        }
      });

      // 处理最终响应
      let finalAIContent = '';
      if (response.success && response.content) {
        finalAIContent = response.content;
      } else if (response.error) {
        finalAIContent = `AI分析失败: ${response.error}`;
      }

      // 更新最终内容和状态
      const finalContent = currentContent + aiAnalysisHeader + finalAIContent;
      await TopicService.updateMessageBlockFields(existingMainTextBlockId, {
        content: finalContent,
        status: MessageBlockStatus.SUCCESS
      });

      // 更新消息状态为成功
      store.dispatch({
        type: 'normalizedMessages/updateMessageStatus',
        payload: {
          topicId: topic.id,
          messageId: existingMessageId,
          status: AssistantMessageStatus.SUCCESS
        }
      });

      console.log(`[useChatFeatures] AI搜索结果分析完成`);

    } catch (error) {
      console.error('[useChatFeatures] AI搜索结果分析失败:', error);
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

    // 更新所有正在处理的消息状态为成功，并添加中断标记
    streamingMessages.forEach(message => {
      console.log(`[handleStopResponseClick] 更新消息状态为成功: ${message.id}`);

      dispatch(newMessagesActions.updateMessage({
        id: message.id,
        changes: {
          status: AssistantMessageStatus.SUCCESS,
          updatedAt: new Date().toISOString()
        }
      }));
    });
  };

  // 处理消息发送
  const handleMessageSend = async (content: string, images?: SiliconFlowImageFormat[], toolsEnabled?: boolean, files?: any[]) => {
    // 如果处于图像生成模式，则调用图像生成处理函数
    if (imageGenerationMode) {
      handleImagePrompt(content, images, files);
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
    mcpMode,
    toggleWebSearch,
    toggleImageGenerationMode,
    toggleToolsEnabled,
    handleMCPModeChange,
    handleWebSearch,
    handleImagePrompt,
    handleStopResponseClick,
    handleMessageSend,
    handleMultiModelSend
  };
};