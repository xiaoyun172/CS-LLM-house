import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../../shared/store';
import store from '../../../shared/store';
import {
  addMessage,
  setTopicLoading,
  setError,
  updateMessage,
  setTopicStreaming,
  setTopicMessages,
  addAlternateVersion,
  switchToVersion,
} from '../../../shared/store/messagesSlice';
import { createMessage } from '../../../shared/utils';
import { sendChatRequest } from '../../../shared/api';
import type { ChatTopic, Message, Model, SiliconFlowImageFormat, WebSearchResult } from '../../../shared/types';
import { isThinkingSupported } from '../../../shared/services/ThinkingService';
import { TopicNamingService } from '../../../shared/services/TopicNamingService';

export function useMessageHandling(selectedModel: Model | null, currentTopic: ChatTopic | null) {
  const dispatch = useDispatch();
  const messagesByTopic = useSelector((state: RootState) => state.messages.messagesByTopic);
  const settings = useSelector((state: RootState) => state.settings);
  const currentModelId = useSelector((state: RootState) => state.settings.currentModelId);

  // 处理发送消息
  const handleSendMessage = async (content: string, images?: SiliconFlowImageFormat[]) => {
    // 检查当前主题是否存在
    if (!currentTopic) {
      console.error('[ChatPage] 没有当前主题，无法发送消息');
      return;
    }

    // 生成唯一请求ID
    const requestId = generateId();

    // 检查是否有图片
    const hasImages = Array.isArray(images) && images.length > 0;
    console.log(`[ChatPage] 收到消息，内容类型: ${typeof content}, 是否包含图片: ${hasImages}, 图片数量: ${hasImages ? images.length : 0}`);

    // 详细记录图片信息
    if (hasImages) {
      console.log(`[ChatPage] 图片详情:`, images.map((img, idx) => ({
        index: idx,
        type: img.type,
        urlPreview: img.image_url?.url ? img.image_url.url.substring(0, 30) + '...' : 'undefined'
      })));
    }

    // 创建用户消息
    const userMessage = createMessage({
      content: content,
      role: 'user',
      id: `user-${requestId}`,
      images: images // 直接将处理好的Silicon Flow格式图片数组传入
    });

    console.log(`[ChatPage] 创建用户消息:`, {
      id: userMessage.id,
      hasImages,
      imagesCount: hasImages ? images.length : 0
    });

    // 将消息添加到Redux
    dispatch(addMessage({ topicId: currentTopic.id, message: userMessage }));

    // 创建AI助手的回复消息（占位）
    const assistantMessage = createMessage({
      content: '',
      role: 'assistant',
      status: 'pending',
      id: `assistant-${requestId}`, // 使用requestId确保ID唯一性
      modelId: selectedModel?.id || currentModelId // 添加模型ID，确保消息显示正确的模型名称
    });

    // 将占位消息添加到Redux
    dispatch(addMessage({ topicId: currentTopic.id, message: assistantMessage }));

    // 检查是否需要自动命名主题
    const shouldAutoName = store.getState().settings.autoNameTopic;
    if (shouldAutoName) {
      // 获取最新的主题信息
      const updatedTopic = store.getState().messages.topics.find(t => t.id === currentTopic.id);
      
      console.log('自动命名触发检查:', {
        topicId: currentTopic.id,
        shouldAutoName,
        hasUpdatedTopic: !!updatedTopic,
        messageCount: updatedTopic?.messages?.length || 0
      });
      
      if (updatedTopic && TopicNamingService.shouldNameTopic(updatedTopic)) {
        console.log('已达到自动命名条件，将生成主题名称');
        // 获取指定的话题命名模型ID
        const topicNamingModelId = store.getState().settings.topicNamingModelId || store.getState().settings.defaultModelId;
        // 延迟生成主题名称，不阻塞主流程
        setTimeout(() => {
          TopicNamingService.generateTopicName(updatedTopic, topicNamingModelId);
        }, 1000);
      }
    }

    // 用于单独的加载状态追踪器，而不是使用全局的主题加载状态
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

      // 检查模型是否支持多模态（图像）
      const supportsMultimodal = selectedModel?.capabilities?.multimodal ||
        modelId.includes('gpt-4') || modelId.includes('gpt-4o') ||
        modelId.includes('vision') || modelId.includes('gemini');

      if (images && images.length > 0 && !supportsMultimodal) {
        throw new Error('当前模型不支持图片分析，请选择支持多模态的模型，如GPT-4V、Gemini等');
      }

      // 获取到目前为止的所有历史消息 - 不包括刚刚添加的待处理消息和其他正在处理的消息
      const allMessages = messagesByTopic[currentTopic.id] || [];
      
      // 过滤消息，只保留每组版本中的当前版本和用户消息
      // 避免API请求中包含所有历史版本
      const filteredMessages = allMessages.filter(msg => {
        // 排除待处理消息和当前助手消息
        if (msg.status === 'pending' || msg.id === assistantMessage.id) {
          return false;
        }
        
        // 始终包含用户消息
        if (msg.role === 'user') {
          return true;
        }
        
        // 对于助手消息，只包含当前版本
        // 如果消息没有明确标记为非当前版本，则包含它
        if (msg.alternateVersions === undefined) {
          return msg.isCurrentVersion !== false;
        }
        
        // 如果消息有alternateVersions并且被明确标记为当前版本，则包含它
        if (msg.alternateVersions && msg.isCurrentVersion === true) {
          return true;
        }
        
        // 如果消息被其他消息引用（作为替代版本），且不是当前版本，则排除
        const isReferencedByOthers = allMessages.some(
          otherMsg => otherMsg.id !== msg.id && 
                     otherMsg.alternateVersions && 
                     otherMsg.alternateVersions.includes(msg.id)
        );
        
        if (isReferencedByOthers && msg.isCurrentVersion !== true) {
          return false;
        }
        
        // 默认包含其他所有消息
        return true;
      });
      
      // 记录过滤后的消息情况，以便调试
      console.log(`API请求消息过滤: 原始消息数=${allMessages.length}, 过滤后消息数=${filteredMessages.length}`);
      
      const messages = [...filteredMessages, userMessage];
      
      // 检查是否有网络搜索结果需要纳入上下文
      const webSearchSettings = store.getState().webSearch;
      const shouldIncludeWebSearchResults = webSearchSettings?.includeInContext || false;
      
      let processedMessages = [...messages];
      
      if (shouldIncludeWebSearchResults) {
        // 寻找最近的网络搜索结果
        const searchResults: WebSearchResult[] = [];
        
        // 从近到远遍历消息，寻找带有搜索结果的消息
        for (let i = filteredMessages.length - 1; i >= 0; i--) {
          const msg = filteredMessages[i];
          if (msg.role === 'assistant' && msg.webSearchResults && msg.webSearchResults.length > 0) {
            searchResults.push(...msg.webSearchResults);
            break; // 只使用最近一次的搜索结果
          }
        }
        
        // 如果找到搜索结果，将其添加到上下文
        if (searchResults.length > 0) {
          console.log(`找到${searchResults.length}条网络搜索结果，纳入上下文`);
          
          // 创建一个系统消息，包含搜索结果的摘要
          const searchResultsInfo = {
            role: 'system' as const,
            content: `以下是用户最近搜索的相关信息，请在回复中考虑这些内容:\n\n${
              searchResults.map((result, index) => 
                `[${index + 1}] 标题: ${result.title}\n来源: ${result.url}\n摘要: ${result.snippet}\n`
              ).join('\n')
            }`
          };
          
          // 将搜索结果系统消息添加到消息列表中
          processedMessages = [searchResultsInfo as any, ...processedMessages];
        }
      }

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
            console.log('成功从localStorage获取userAssistants数据');
            const assistants = JSON.parse(assistantsJson);
            console.log('助手数量:', assistants.length);

            // 查找关联到当前话题的助手
            const currentAssistant = assistants.find((a: any) =>
              a.topicIds && Array.isArray(a.topicIds) && a.topicIds.includes(currentTopic.id)
            );

            if (currentAssistant) {
              console.log('找到关联到当前话题的助手:', {
                id: currentAssistant.id,
                name: currentAssistant.name,
                hasSystemPrompt: !!currentAssistant.systemPrompt,
                systemPromptLength: currentAssistant.systemPrompt?.length || 0
              });
            } else {
              console.log('未找到关联到当前话题的助手');
            }

            if (currentAssistant?.systemPrompt) {
              systemPrompt = currentAssistant.systemPrompt;
              console.log('使用助手系统提示词，长度:', systemPrompt?.length || 0, '前30个字符:', systemPrompt?.substring(0, 30) || '');
            } else {
              // 尝试直接使用默认助手的系统提示词
              const defaultAssistant = assistants.find((a: any) => a.isSystem === true || a.name === '默认助手');
              if (defaultAssistant?.systemPrompt) {
                systemPrompt = defaultAssistant.systemPrompt;
                console.log('使用默认助手的系统提示词，长度:', systemPrompt?.length || 0);
              } else {
                console.log('未找到任何系统提示词，将使用默认系统提示词');
              }
            }
          } else {
            console.log('localStorage中不存在userAssistants数据');
          }
        } catch (error) {
          console.error('获取助手信息失败:', error);
        }
      }

      // 3. 确保始终有一个系统提示词，即使是默认的
      if (!systemPrompt) {
        systemPrompt = '你是一个友好、专业、乐于助人的AI助手。你会以客观、准确的态度回答用户的问题，并在不确定的情况下坦诚表明。你可以协助用户完成各种任务，提供信息，或进行有意义的对话。';
        console.log('未找到任何系统提示词，使用默认提示词');
      }

      // 如果找到系统提示词，将其作为系统消息添加到请求中
      const requestMessages = [...processedMessages];

      // 添加系统消息到请求的开始，始终添加，确保API请求中包含系统提示词
      requestMessages.unshift({
        role: 'system',
        content: systemPrompt
      } as any); // 使用类型断言，因为这里我们只关心API请求格式

      console.log('发送API请求的消息列表:', requestMessages.map(m => ({
        role: m.role,
        content: typeof m.content === 'string'
          ? (m.content.substring(0, 20) + (m.content.length > 20 ? '...' : ''))
          : '[复杂内容，包含图片]',
        hasImages: Boolean(m.images && m.images.length > 0),
        imagesCount: m.images?.length || 0
      })));

      // 发送请求 - 使用所选模型
      const response = await sendChatRequest({
        messages: requestMessages.map(msg => ({
          role: msg.role,
          content: msg.content,
          images: msg.images // 确保传递图片数据
        })),
        modelId,
        onChunk: (chunk) => {
          if (chunk) {
            try {
              // 尝试解析JSON格式的数据
              let chunkData;
              try {
                chunkData = JSON.parse(chunk);
              } catch (e) {
                // 如果解析失败，则假定是纯文本内容
                chunkData = { content: chunk };
              }

              // 从解析后的数据中提取内容和思考过程
              const content = chunkData.content;
              const reasoning = chunkData.reasoning;
              const reasoningTime = chunkData.reasoningTime;
              
                  // 构建更新对象，包含内容和思考过程
              const updates: any = {};
              
              // 更新内容（如果有）
              if (content) {
                updates.content = content;
                updates.status = 'complete';
                updates.modelId = selectedModel?.id || currentModelId;
              }
                  
              // 更新思考过程（如果有）- 始终更新思考过程，无论长度变化
                  if (reasoning) {
                    console.log('收到思考过程，长度:', reasoning.length, '思考时间:', reasoningTime);
                    updates.reasoning = reasoning;
                    if (reasoningTime) {
                      updates.reasoningTime = reasoningTime;
                    }
                  }
                  
              // 只有当有更新内容时才分发更新
              if (Object.keys(updates).length > 0) {
                  // 更新消息
                  dispatch(updateMessage({
                    topicId: currentTopic.id,
                    messageId: assistantMessage.id,
                    updates: updates
                  }));
              }
            } catch (error) {
              console.error('解析响应数据失败:', error);
              // 如果解析失败，尝试以纯文本方式处理
              const currentContent = typeof assistantMessage.content === 'string'
                ? assistantMessage.content
                : (assistantMessage.content as any)?.text || '';
              const currentLength = currentContent.length;
              const newLength = chunk.length;
              
              if (newLength - currentLength >= 5 || newLength < currentLength) {
                dispatch(updateMessage({
                  topicId: currentTopic.id,
                  messageId: assistantMessage.id,
                  updates: {
                    content: chunk,
                    status: 'complete',
                    modelId: selectedModel?.id || currentModelId
                  }
                }));
              }
            }
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

        // 确保最终内容与API返回一致，并添加思考过程（如果尚未添加）
        // 检查当前消息是否已经有思考过程，如果没有才添加
        const currentMessages = messagesByTopic[currentTopic.id] || [];
        const currentMessage = currentMessages.find(msg => msg.id === assistantMessage.id);
        
        const updates: any = {
          content: response.content,
          status: 'complete',
          modelId: selectedModel?.id || currentModelId // 确保更新后保留模型ID
        };
        
        // 如果还没有思考过程，且API返回了思考过程，则添加
        if (reasoning && (!currentMessage?.reasoning || currentMessage.reasoning.length === 0)) {
          console.log('收到最最终思考过程，长度:', reasoning.length);
          updates.reasoning = reasoning;
          updates.reasoningTime = reasoningTime;
        }
        
        dispatch(updateMessage({
          topicId: currentTopic.id,
          messageId: assistantMessage.id,
          updates: updates
        }));

        // 保存消息到本地缓存
        updateTopicInLocalStorage(currentTopic.id, assistantMessage.id, response.content);
      }
    } catch (error) {
      console.error('发送消息失败:', error);

      // 获取更详细的错误信息
      let errorMessage = '请求处理失败';
      if (error instanceof Error) {
        // 提取具体错误原因
        if (error.message.includes('network') || error.message.includes('timeout') || error.message.includes('connect')) {
          errorMessage = '网络连接问题，请检查网络并重试';
        } else if (error.message.includes('api key') || error.message.includes('apiKey') || error.message.includes('authentication')) {
          errorMessage = 'API密钥无效或已过期，请更新API密钥';
        } else if (error.message.includes('timeout')) {
          errorMessage = '请求超时，服务器响应时间过长';
        } else if (error.message.length < 100) {
          // 如果错误消息不太长，直接使用
          errorMessage = error.message;
        }
      }

      // 设置错误状态 - 修复：直接传入字符串而不是对象
      dispatch(setError(
        `发送消息失败: ${error instanceof Error ? error.message : String(error)}`
      ));

      // 更新消息状态为错误
      dispatch(updateMessage({
        topicId: currentTopic.id,
        messageId: assistantMessage.id,
        updates: {
          content: errorMessage,
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
      parentMessageId: messages[previousUserMessageIndex].id, // 关联到用户消息
      modelId: selectedModel.id // 添加模型ID，确保消息显示正确的模型名称
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
            console.log('成功从localStorage获取userAssistants数据');
            const assistants = JSON.parse(assistantsJson);
            console.log('助手数量:', assistants.length);

            // 查找关联到当前话题的助手
            const currentAssistant = assistants.find((a: any) =>
              a.topicIds && Array.isArray(a.topicIds) && a.topicIds.includes(currentTopic.id)
            );

            if (currentAssistant) {
              console.log('找到关联到当前话题的助手:', {
                id: currentAssistant.id,
                name: currentAssistant.name,
                hasSystemPrompt: !!currentAssistant.systemPrompt,
                systemPromptLength: currentAssistant.systemPrompt?.length || 0
              });
            } else {
              console.log('未找到关联到当前话题的助手');
            }

            if (currentAssistant?.systemPrompt) {
              systemPrompt = currentAssistant.systemPrompt;
              console.log('使用助手系统提示词，长度:', systemPrompt?.length || 0, '前30个字符:', systemPrompt?.substring(0, 30) || '');
            } else {
              // 尝试直接使用默认助手的系统提示词
              const defaultAssistant = assistants.find((a: any) => a.isSystem === true || a.name === '默认助手');
              if (defaultAssistant?.systemPrompt) {
                systemPrompt = defaultAssistant.systemPrompt;
                console.log('使用默认助手的系统提示词，长度:', systemPrompt?.length || 0);
              } else {
                console.log('未找到任何系统提示词，将使用默认系统提示词');
              }
            }
          } else {
            console.log('localStorage中不存在userAssistants数据');
          }
        } catch (error) {
          console.error('获取助手信息失败:', error);
        }
      }

      // 3. 确保始终有一个系统提示词，即使是默认的
      if (!systemPrompt) {
        systemPrompt = '你是一个友好、专业、乐于助人的AI助手。你会以客观、准确的态度回答用户的问题，并在不确定的情况下坦诚表明。你可以协助用户完成各种任务，提供信息，或进行有意义的对话。';
        console.log('重新生成消息：未找到任何系统提示词，使用默认提示词');
      }

      // 获取到该用户消息之前的所有历史消息 - 不包括被重新生成的消息
      // 只取用户消息和直到重新生成消息之前的助手消息
      const allMessages = messages.filter((msg, idx) => {
        // 包含所有用户消息
        if (msg.role === 'user') return true;
        
        // 只包含在当前要重生成的消息之前的助手消息
        return msg.role === 'assistant' && idx < messageIndex;
      });
      
      // 过滤消息，只保留每组版本中的当前版本和用户消息
      const filteredMessages = allMessages.filter(msg => {
        // 始终包含用户消息
        if (msg.role === 'user') {
          return true;
        }
        
        // 对于助手消息，只包含当前版本
        // 如果消息没有明确标记为非当前版本，则包含它
        if (msg.alternateVersions === undefined) {
          return msg.isCurrentVersion !== false;
        }
        
        // 如果消息有alternateVersions并且被明确标记为当前版本，则包含它
        if (msg.alternateVersions && msg.isCurrentVersion === true) {
          return true;
        }
        
        // 如果消息被其他消息引用（作为替代版本），且不是当前版本，则排除
        const isReferencedByOthers = allMessages.some(
          otherMsg => otherMsg.id !== msg.id && 
                     otherMsg.alternateVersions && 
                     otherMsg.alternateVersions.includes(msg.id)
        );
        
        if (isReferencedByOthers && msg.isCurrentVersion !== true) {
          return false;
        }
        
        // 默认包含其他所有消息
        return true;
      });
      
      // 检查是否有网络搜索结果需要纳入上下文
      const webSearchSettings = store.getState().webSearch;
      const shouldIncludeWebSearchResults = webSearchSettings?.includeInContext || false;
      
      let processedMessages = [...filteredMessages];
      
      if (shouldIncludeWebSearchResults) {
        // 寻找最近的网络搜索结果
        const searchResults: WebSearchResult[] = [];
        
        // 从近到远遍历消息，寻找带有搜索结果的消息
        for (let i = filteredMessages.length - 1; i >= 0; i--) {
          const msg = filteredMessages[i];
          if (msg.role === 'assistant' && msg.webSearchResults && msg.webSearchResults.length > 0) {
            searchResults.push(...msg.webSearchResults);
            break; // 只使用最近一次的搜索结果
          }
        }
        
        // 如果找到搜索结果，将其添加到上下文
        if (searchResults.length > 0) {
          console.log(`重生成消息：找到${searchResults.length}条网络搜索结果，纳入上下文`);
          
          // 创建一个系统消息，包含搜索结果的摘要
          const searchResultsInfo = {
            role: 'system' as const,
            content: `以下是用户最近搜索的相关信息，请在回复中考虑这些内容:\n\n${
              searchResults.map((result, index) => 
                `[${index + 1}] 标题: ${result.title}\n来源: ${result.url}\n摘要: ${result.snippet}\n`
              ).join('\n')
            }`
          };
          
          // 创建可用于提交的请求消息数组
          processedMessages = [searchResultsInfo as any, ...processedMessages];
        }
      }
      
      // 记录过滤后的消息情况，以便调试
      console.log(`重新生成消息的API请求消息过滤: 原始消息数=${allMessages.length}, 过滤后消息数=${processedMessages.length}`);

      const requestMessages = [...processedMessages];

      // 添加系统消息到请求的开始，始终添加，确保API请求中包含系统提示词
      requestMessages.unshift({
        role: 'system',
        content: systemPrompt
      } as any); // 使用类型断言，因为这里我们只关心API请求格式

      console.log('重新生成消息的请求列表:', requestMessages.map(m => ({
        role: m.role,
        content: typeof m.content === 'string'
          ? (m.content.substring(0, 20) + (m.content.length > 20 ? '...' : ''))
          : '[复杂内容，包含图片]'
      })));

      // 使用addAlternateVersion action添加新的消息版本占位符
      dispatch(addAlternateVersion({
        topicId: currentTopic.id,
        originalMessageId: messageId,
        newMessage: newAssistantMessage
      }));

      // 发送请求
      const response = await sendChatRequest({
        messages: requestMessages,
        modelId,
        onChunk: (chunk) => {
          if (chunk) {
            // 优化流式输出性能 - 减少更新频率
            // 只有当内容至少增加了5个字符或是最后一个chunk时才更新UI
            const currentContent = typeof newAssistantMessage.content === 'string' 
              ? newAssistantMessage.content 
              : (newAssistantMessage.content as any)?.text || '';
            const currentLength = currentContent.length;
            const newLength = chunk.length;
            
            // 增加防抖动机制，避免频繁更新导致卡顿
            if (newLength - currentLength >= 5 || newLength < currentLength) {
              dispatch(updateMessage({
                topicId: currentTopic.id,
                messageId: newAssistantMessage.id,
                updates: {
                  content: chunk,  // 直接使用chunk作为完整内容
                  status: 'complete'
                }
              }));
            }
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
            reasoningTime: reasoningTime,
            modelId: selectedModel?.id || currentModelId // 确保更新后保留模型ID
          }
        }));

        // 保存消息到本地缓存
        updateTopicInLocalStorage(currentTopic.id, newAssistantMessage.id, response.content);
      }
    } catch (error) {
      console.error('重新生成消息失败:', error);

      // 获取更详细的错误信息
      let errorMessage = '请求处理失败';
      if (error instanceof Error) {
        // 提取具体错误原因
        if (error.message.includes('network') || error.message.includes('timeout') || error.message.includes('connect')) {
          errorMessage = '网络连接问题，请检查网络并重试';
        } else if (error.message.includes('api key') || error.message.includes('apiKey') || error.message.includes('authentication')) {
          errorMessage = 'API密钥无效或已过期，请更新API密钥';
        } else if (error.message.includes('timeout')) {
          errorMessage = '请求超时，服务器响应时间过长';
        } else if (error.message.length < 100) {
          // 如果错误消息不太长，直接使用
          errorMessage = error.message;
        }
      }

      // 设置错误状态
      dispatch(setError(
        `重新生成消息失败: ${error instanceof Error ? error.message : String(error)}`
      ));

      // 更新消息状态为错误
      dispatch(updateMessage({
        topicId: currentTopic.id,
        messageId: newAssistantMessage.id,
        updates: {
          content: errorMessage,
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

  // 切换消息版本
  const handleSwitchMessageVersion = (topicId: string, messageId: string) => {
    // 这个函数确保我们可以切换到任何版本，包括版本1
    console.log(`切换到消息版本: ${messageId}`);
    
    // 直接调用Redux action来切换版本
    dispatch(switchToVersion({
      topicId,
      messageId
    }));
    
    // 确保版本切换成功后的本地存储更新
    try {
      const savedTopicsJson = localStorage.getItem('chatTopics');
      if (savedTopicsJson) {
        const savedTopics = JSON.parse(savedTopicsJson);
        const topicIndex = savedTopics.findIndex((topic: ChatTopic) => topic.id === topicId);
        
        if (topicIndex !== -1) {
          // 获取Redux中最新的消息列表
          const state = (store.getState() as any).messages;
          const updatedMessages = state.messagesByTopic[topicId] || [];
          
          // 更新本地存储
          savedTopics[topicIndex].messages = updatedMessages;
          localStorage.setItem('chatTopics', JSON.stringify(savedTopics));
        }
      }
    } catch (error) {
      console.error('版本切换后更新本地存储失败:', error);
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

  // 生成唯一ID
  const generateId = (): string => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  return {
    handleSendMessage,
    handleDeleteMessage,
    handleRegenerateMessage,
    handleSwitchMessageVersion
  };
} 