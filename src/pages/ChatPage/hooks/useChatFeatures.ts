import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { newMessagesActions } from '../../../shared/store/slices/newMessagesSlice';
import { generateId } from '../../../shared/utils';
import {
  createUserMessage,
  createAssistantMessage
} from '../../../shared/utils/messageUtils';
import {
  MessageBlockType,
  MessageBlockStatus,
  AssistantMessageStatus
} from '../../../shared/types/newMessage.ts';
import type { MessageBlock } from '../../../shared/types/newMessage.ts';
import { dexieStorage } from '../../../shared/services/DexieStorageService';
import WebSearchService from '../../../shared/services/WebSearchService';
import FirecrawlService from '../../../shared/services/FirecrawlService';
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
  handleSendMessage: (content: string, images?: SiliconFlowImageFormat[], toolsEnabled?: boolean) => void
) => {
  const dispatch = useDispatch();
  const [webSearchActive, setWebSearchActive] = useState(false); // 控制是否处于网络搜索模式
  const [imageGenerationMode, setImageGenerationMode] = useState(false); // 控制是否处于图像生成模式
  const [toolsEnabled, setToolsEnabled] = useState(true); // 控制是否启用工具调用

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
    if (!currentTopic || !prompt.trim()) return;

    // 使用新的块系统创建用户消息
    const { message: userMessage, blocks: userBlocks } = createUserMessage({
      content: prompt,
      assistantId: currentTopic.assistantId,
      topicId: currentTopic.id,
      modelId: selectedModel?.id,
      model: selectedModel || undefined
    });

    // 保存用户消息和块
    TopicService.saveMessageAndBlocks(userMessage, userBlocks)
      .catch(error => console.error('保存消息和块失败:', error));

    // 进行图像生成处理
    generateImageWithPrompt();
  };

  // 生成图像
  const generateImageWithPrompt = async () => {
    try {
      if (!currentTopic || !selectedModel) return;

      // 获取用户最后一条消息作为提示词
      const lastUserMessage = currentMessages.filter(m => m.role === 'user').pop();
      if (!lastUserMessage) return;

      // 获取提示词
      const userBlocks = lastUserMessage.blocks || [];
      const textBlocks = [];
      for (const blockId of userBlocks) {
        if (blockId.startsWith('mb_') && !blockId.includes('image')) {
          const block = await dexieStorage.getMessageBlock(blockId);
          if (block && block.type === MessageBlockType.MAIN_TEXT && 'content' in block) {
            textBlocks.push(block);
          }
        }
      }
      const prompt = textBlocks.length > 0 ? textBlocks[0].content : '';

      // 获取选中的模型
      const modelId = selectedModel.id;
      if (!modelId) {
        throw new Error("未选择模型");
      }

      // 调用图像生成服务
      const imageGenerationService = await import('../../../shared/services/APIService');
      const result = await imageGenerationService.generateImage(selectedModel, {
        prompt: prompt,
        negativePrompt: "",
        imageSize: "1024x1024",
        steps: 20,
        guidanceScale: 7.5
      });

      // 处理生成的图像
      if (result && result.url) {
        const imageUrl = result.url;

        try {
          // 获取图片数据并转换为Base64
          const response = await fetch(imageUrl);
          const blob = await response.blob();

          // 将Blob转换为Base64
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = async () => {
            const base64data = reader.result as string;

            // 创建助手消息和块
            const { message: assistantMessage, blocks: assistantBlocks } = createAssistantMessage({
              assistantId: currentTopic.assistantId,
              topicId: currentTopic.id,
              askId: lastUserMessage.id,
              modelId: selectedModel.id,
              model: selectedModel
            });

            // 创建图像块
            const imageBlock = {
              id: generateId(),
              messageId: assistantMessage.id,
              type: MessageBlockType.IMAGE,
              createdAt: new Date().toISOString(),
              status: MessageBlockStatus.SUCCESS,
              url: base64data,
              base64Data: base64data,
              mimeType: 'image/jpeg',
              width: 0,
              height: 0
            };

            // 添加图像块到消息
            assistantBlocks.push(imageBlock as MessageBlock);
            assistantMessage.blocks.push(imageBlock.id);

            // 保存助手消息和块
            await TopicService.saveMessageAndBlocks(assistantMessage, assistantBlocks);
          };
        } catch (error) {
          console.error("图像转换失败:", error);
          // 如果转换失败，创建错误消息
          const { message: errorMessage, blocks: errorBlocks } = createAssistantMessage({
            assistantId: currentTopic.assistantId,
            topicId: currentTopic.id,
            askId: lastUserMessage.id,
            modelId: selectedModel.id,
            model: selectedModel
          });

          // 更新主文本块内容
          const mainTextBlock = errorBlocks.find((block: any) => block.type === MessageBlockType.MAIN_TEXT);
          if (mainTextBlock && 'content' in mainTextBlock) {
            mainTextBlock.content = `图像转换失败: ${error instanceof Error ? error.message : String(error)}`;
            mainTextBlock.status = MessageBlockStatus.ERROR;
          }

          // 保存错误消息和块
          await TopicService.saveMessageAndBlocks(errorMessage, errorBlocks);
        }
      }
    } catch (error) {
      console.error("图像生成失败:", error);

      if (!currentTopic || !selectedModel) return;

      // 获取用户最后一条消息
      const lastUserMessage = currentMessages.filter(m => m.role === 'user').pop();
      if (!lastUserMessage) return;

      // 创建错误消息
      const { message: errorMessage, blocks: errorBlocks } = createAssistantMessage({
        assistantId: currentTopic.assistantId,
        topicId: currentTopic.id,
        askId: lastUserMessage.id,
        modelId: selectedModel.id,
        model: selectedModel
      });

      // 更新主文本块内容
      const mainTextBlock = errorBlocks.find((block: any) => block.type === MessageBlockType.MAIN_TEXT);
      if (mainTextBlock && 'content' in mainTextBlock) {
        mainTextBlock.content = `图像生成失败: ${error instanceof Error ? error.message : String(error)}`;
        mainTextBlock.status = MessageBlockStatus.ERROR;
      }

      // 保存错误消息和块
      await TopicService.saveMessageAndBlocks(errorMessage, errorBlocks);
    } finally {
      // 关闭图像生成模式
      setImageGenerationMode(false);
    }
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

      // 使用带状态管理的搜索方法 - 已适配新的状态管理方式
      const searchResults = await WebSearchService.searchWithStatus(
        query,
        currentTopic.id,
        searchingMessage.id
      );

      // 准备搜索结果内容
      let resultsContent = `### 网络搜索结果\n\n`;

      if (searchResults.length === 0) {
        resultsContent += "没有找到相关结果。";
      } else {
        searchResults.forEach((result, index) => {
          resultsContent += `**${index + 1}. [${result.title}](${result.url})**\n`;
          resultsContent += `${result.snippet}\n\n`;
        });
      }

      // 更新主文本块内容
      if (mainTextBlock && mainTextBlock.id) {
        TopicService.updateMessageBlockFields(mainTextBlock.id, {
          content: resultsContent,
          status: MessageBlockStatus.SUCCESS
        });
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

  // 处理URL解析，使用FirecrawlService来抓取内容
  const handleUrlScraping = async (url: string): Promise<string> => {
    try {
      // 使用新的scrapeUrlWithOptions方法，请求多种格式
      const result = await FirecrawlService.scrapeUrlWithOptions(url, {
        formats: ['markdown', 'html'],
        onlyMainContent: true
      });

      // 检查抓取是否成功
      if (!result.success) {
        throw new Error(result.error || '网页解析失败');
      }

      // 优先使用markdown格式，如果没有则使用html或文本
      let content = '';
      if (result.markdown) {
        content = result.markdown;
      } else if (result.html) {
        content = `<div class="web-content">${result.html}</div>`;
      } else if (result.rawText) {
        content = result.rawText;
      } else {
        throw new Error('无法获取网页内容');
      }

      // 格式化返回的内容，添加来源信息
      const formattedContent = `### 网页内容: ${url}\n\n${content}`;

      return formattedContent;
    } catch (error) {
      console.error('URL解析失败:', error);
      throw error;
    }
  };

  // 处理停止响应点击事件
  const handleStopResponseClick = () => {
    if (!currentTopic) return;

    // 停止流式响应
    store.dispatch({
      type: 'messages/setTopicStreaming',
      payload: { topicId: currentTopic.id, streaming: false }
    });

    // 找到最后一条待处理的助手消息
    const lastAssistantMessage = currentMessages.filter(m => m.role === 'assistant').slice(-1)[0];
    if (!lastAssistantMessage) return;

    // 更新消息状态为成功
    dispatch(newMessagesActions.updateMessage({
      id: lastAssistantMessage.id,
      changes: {
        status: AssistantMessageStatus.SUCCESS
      }
    }));
  };

  // 处理消息发送
  const handleMessageSend = async (content: string, images?: SiliconFlowImageFormat[]) => {
    // 如果处于图像生成模式，则调用图像生成处理函数
    if (imageGenerationMode) {
      handleImagePrompt(content);
      return;
    }

    // 如果处于网络搜索模式，则调用网络搜索处理函数
    if (webSearchActive) {
      handleWebSearch(content);
      return;
    }

    // 正常的消息发送处理，传递工具开关状态
    handleSendMessage(content, images, toolsEnabled);
  };

  // 切换工具调用开关
  const toggleToolsEnabled = () => {
    setToolsEnabled(!toolsEnabled);
  };

  return {
    webSearchActive,
    imageGenerationMode,
    toolsEnabled,
    toggleWebSearch,
    toggleImageGenerationMode,
    toggleToolsEnabled,
    handleWebSearch,
    handleImagePrompt,
    handleUrlScraping,
    handleStopResponseClick,
    handleMessageSend
  };
};