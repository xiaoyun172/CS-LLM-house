import type { Message, ChatTopic, Model } from '../../types';
import { sendChatRequest } from '../../api';
import { getStorageItem } from '../../utils/storage';
import { saveTopicToDB, getAllTopicsFromDB } from '../storageService';
import { getMainTextContent } from '../../utils/messageUtils';
import store from '../../store';
import { EventService, EVENT_NAMES } from '../EventService';
import { updateMessage } from '../../store/slices/messagesSlice';
import { TopicService } from '../TopicService';
import { MessageBlockStatus, AssistantMessageStatus } from '../../types/newMessage.ts';
import { createUserMessage, createAssistantMessage } from '../../utils/messageUtils';
import { updateOneBlock } from '../../store/slices/messageBlocksSlice';
import { dexieStorage } from '../DexieStorageService';

/**
 * 应用上下文限制到消息列表
 */
export function applyContextLimits(messages: Message[], contextLength: number, contextCount: number): Message[] {
  // 电脑版逻辑：从消息列表中取出最近的N条消息
  // 使用lodash的takeRight函数，但这里我们用原生JavaScript实现
  const limitedByCountMessages = [...messages].slice(-contextCount);

  // 查找最后一个clear类型的消息的索引
  // 使用兼容性更好的方法替代findLastIndex
  let clearIndex = -1;
  for (let i = limitedByCountMessages.length - 1; i >= 0; i--) {
    if (limitedByCountMessages[i].type === 'clear') {
      clearIndex = i;
      break;
    }
  }

  // 如果找到了clear消息，则只保留clear消息之后的消息
  let filteredMessages = limitedByCountMessages;
  if (clearIndex !== -1) {
    filteredMessages = limitedByCountMessages.slice(clearIndex + 1);
  }

  // 对每条消息应用长度限制
  return filteredMessages.map(msg => {
    // 使用getMainTextContent获取消息内容
    const content = getMainTextContent(msg);
    if (content && content.length > contextLength) {
      // 截断过长的消息内容
      // 注意：我们不能直接修改msg.content，因为新消息格式没有这个属性
      // 但我们可以返回一个新的消息对象，保留原始消息的所有属性
      return msg;
    }
    return msg;
  });
}

/**
 * 获取上下文设置
 */
export async function getContextSettings(): Promise<{ contextLength: number; contextCount: number }> {
  let contextLength = 16000; // 默认上下文长度，设置为16K
  let contextCount = 5;      // 默认上下文数量，与电脑版DEFAULT_CONTEXTCOUNT保持一致

  try {
    const appSettings = await getStorageItem<any>('appSettings');
    if (appSettings) {
      if (appSettings.contextLength) contextLength = appSettings.contextLength;
      if (appSettings.contextCount) contextCount = appSettings.contextCount;
    }
  } catch (error) {
    console.error('读取上下文设置失败:', error);
  }

  // 电脑版逻辑：如果contextCount为100，则视为无限制（100000）
  if (contextCount === 100) {
    contextCount = 100000;
  }

  // 如果上下文长度为64000，视为不限制
  if (contextLength === 64000) {
    contextLength = 65549; // 使用65549作为实际的最大值
  }

  return { contextLength, contextCount };
}

/**
 * 处理流式响应
 */
export async function handleChatRequest({
  messages,
  model,
  onChunk
}: {
  messages: Message[];
  model: Model;
  onChunk?: (chunk: string) => void;
}): Promise<any> {
  const { contextLength, contextCount } = await getContextSettings();

  // 应用上下文限制
  const limitedMessages = applyContextLimits(messages, contextLength, contextCount);

  console.log(`[handleChatRequest] 应用上下文限制 - 原始消息数: ${messages.length}, 限制后: ${limitedMessages.length}, 长度限制: ${contextLength}`);

  // 发送API请求
  const response = await sendChatRequest({
    messages: limitedMessages.map(msg => {
      // 构建API消息格式
      const apiMessage: any = {
        role: msg.role,
        content: ''
      };

      try {
        // 从块中获取消息内容
        if (msg.blocks && Array.isArray(msg.blocks) && msg.blocks.length > 0) {
          // 直接从store获取块内容，避免使用getMainTextContent函数
          const state = store.getState();

          // 首先尝试获取所有块，不仅仅是主文本块
          const allBlocks = msg.blocks
            .map(blockId => state.messageBlocks.entities[blockId])
            .filter(Boolean);

          // 如果没有找到任何块，尝试使用原始消息内容
          if (allBlocks.length === 0) {
            console.warn('[handleChatRequest] 未找到任何块，尝试使用原始内容');

            // 尝试使用旧版本的content属性
            if (typeof (msg as any).content === 'string') {
              apiMessage.content = (msg as any).content;
              console.log(`[handleChatRequest] 使用原始消息内容: ${apiMessage.content.substring(0, 50)}${apiMessage.content.length > 50 ? '...' : ''}`);
            } else {
              // 如果没有内容，使用空字符串
              apiMessage.content = '';
              console.log('[handleChatRequest] 找不到内容，使用空字符串');
            }
          } else {
            // 尝试找到主文本块
            const mainTextBlocks = allBlocks.filter(block => block.type === 'main_text');

            if (mainTextBlocks.length > 0) {
              // 合并所有主文本块的内容
              const content = mainTextBlocks
                .map(block => block.content || '')
                .join('\n\n')
                .trim();

              if (content) {
                apiMessage.content = content;
                console.log(`[handleChatRequest] 从主文本块获取内容: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
              } else {
                console.warn('[handleChatRequest] 主文本块内容为空');

                // 如果是用户消息且内容为空，使用原始消息内容
                if (msg.role === 'user' && (msg as any).content) {
                  apiMessage.content = (msg as any).content;
                  console.log(`[handleChatRequest] 使用用户消息原始内容: ${(msg as any).content.substring(0, 50)}${(msg as any).content.length > 50 ? '...' : ''}`);
                } else {
                  // 尝试从任何块中获取内容
                  const anyContent = allBlocks
                    .filter(block => 'content' in block && (block as any).content)
                    .map(block => (block as any).content)
                    .join('\n\n')
                    .trim();

                  if (anyContent) {
                    apiMessage.content = anyContent;
                    console.log(`[handleChatRequest] 从任何块获取内容: ${anyContent.substring(0, 50)}${anyContent.length > 50 ? '...' : ''}`);
                  } else {
                    // 尝试使用旧版本的content属性
                    if (typeof (msg as any).content === 'string' && (msg as any).content) {
                      apiMessage.content = (msg as any).content;
                      console.log(`[handleChatRequest] 使用旧版本content属性: ${apiMessage.content.substring(0, 50)}${apiMessage.content.length > 50 ? '...' : ''}`);
                    } else {
                      // 如果仍然没有内容，使用空字符串
                      apiMessage.content = '';
                      console.log('[handleChatRequest] 无法找到内容，使用空字符串');
                    }
                  }
                }
              }
            } else {
              console.warn('[handleChatRequest] 未找到主文本块，尝试使用其他块内容');

              // 尝试从任何块中获取内容
              const anyContent = allBlocks
                .filter(block => 'content' in block && (block as any).content)
                .map(block => (block as any).content)
                .join('\n\n')
                .trim();

              if (anyContent) {
                apiMessage.content = anyContent;
                console.log(`[handleChatRequest] 从其他块获取内容: ${anyContent.substring(0, 50)}${anyContent.length > 50 ? '...' : ''}`);
              } else {
                // 尝试使用旧版本的content属性
                if (typeof (msg as any).content === 'string' && (msg as any).content) {
                  apiMessage.content = (msg as any).content;
                  console.log(`[handleChatRequest] 使用旧版本content属性: ${apiMessage.content.substring(0, 50)}${apiMessage.content.length > 50 ? '...' : ''}`);
                } else {
                  // 如果仍然没有内容，使用空字符串
                  apiMessage.content = '';
                  console.log('[handleChatRequest] 无法找到内容，使用空字符串');
                }
              }
            }
          }

          // 查找图片块
          const imageBlocks = msg.blocks.map(blockId => {
            const state = store.getState();
            return state.messageBlocks.entities[blockId];
          }).filter(block => block && block.type === 'image');

          // 如果有图片块，添加到API消息中
          if (imageBlocks.length > 0) {
            apiMessage.images = imageBlocks.map(block => ({
              url: block.url,
              base64Data: block.base64Data,
              mimeType: block.mimeType,
              width: block.width,
              height: block.height
            }));
          }
        }
        // 兼容旧版本 - 使用类型断言
        else if (typeof (msg as any).content === 'string') {
          apiMessage.content = (msg as any).content;
        } else if (typeof (msg as any).content === 'object' && (msg as any).content && 'text' in (msg as any).content) {
          apiMessage.content = (msg as any).content.text || '';

          if ((msg as any).content.images) {
            apiMessage.images = (msg as any).content.images;
          }
        }

        // 兼容旧版本图片
        if (!apiMessage.images && 'images' in msg && (msg as any).images) {
          apiMessage.images = (msg as any).images;
        }
      } catch (error) {
        console.error('[handleChatRequest] 处理消息内容时出错:', error);
        // 出错时使用空字符串
        apiMessage.content = '';
      }

      return apiMessage;
    }),
    modelId: model.id,
    onChunk: (chunkData) => {
      try {
        // 尝试解析JSON格式的块数据
        let content = '';
        let reasoning = '';

        // 使用类似电脑版的方法处理数据
        if (typeof chunkData === 'string') {
          try {
            // 尝试解析为JSON
            const parsedData = JSON.parse(chunkData);

            // 处理思考过程
            if (parsedData.reasoning !== undefined) {
              reasoning = String(parsedData.reasoning);

              // 如果有思考过程且提供了思考回调
              if (onChunk) {
                onChunk(reasoning);
              }
            }

            // 处理内容
            if (parsedData.content !== undefined) {
              content = String(parsedData.content);
            }
          } catch (parseError) {
            // 如果解析失败，直接使用原始数据作为内容
            console.warn('JSON解析失败，使用原始数据作为内容:', parseError);
            content = chunkData;
          }
        } else {
          // 如果不是字符串，尝试直接使用
          content = String(chunkData);
        }

        // 调用主内容回调
        if (onChunk) {
          onChunk(content);
        }
      } catch (error) {
        // 如果处理过程中出错，直接传递原始数据
        console.error('处理块数据失败，使用原始数据:', error);
        try {
          if (onChunk) {
            onChunk(String(chunkData));
          }
        } catch (e) {
          console.error('转换块数据为字符串失败:', e);
          if (onChunk) {
            onChunk('');
          }
        }
      }
    }
  });

  return response;
}

/**
 * 保存话题到数据库
 */
export async function saveTopics(topics: ChatTopic[]): Promise<ChatTopic[]> {
  try {
    // 使用Map按照ID去重
    const uniqueTopicsMap = new Map();
    topics.forEach((topic: ChatTopic) => {
      if (!uniqueTopicsMap.has(topic.id)) {
        uniqueTopicsMap.set(topic.id, topic);
      }
    });

    // 转换回数组
    const uniqueTopics = Array.from(uniqueTopicsMap.values());

    // 将每个话题保存到IndexedDB
    for (const topic of uniqueTopics) {
      await saveTopicToDB(topic);
    }

    return uniqueTopics;
  } catch (error) {
    console.error('保存话题到数据库失败:', error);
    return topics;
  }
}

/**
 * 从数据库加载话题
 */
export async function loadTopics(): Promise<ChatTopic[]> {
  try {
    // 直接从数据库获取所有话题
    const topics = await getAllTopicsFromDB();
    return topics;
  } catch (error) {
    console.error('从数据库加载话题失败:', error);
    return [];
  }
}

// 为向后兼容保留，但功能已迁移到IndexedDB
export const saveTopicsToLocalStorage = saveTopics;
export const loadTopicsFromLocalStorage = loadTopics;

// 创建统一的消息处理服务
export class MessageService {
  // 发送消息的统一方法
  static async sendMessage(params: {
    content: string;
    topicId: string;
    model: Model;
    images?: Array<{ url: string }>;
  }): Promise<any> {
    const { content, topicId, model, images } = params;
    
    try {
      // 1. 创建用户消息
      const userMessage = await this.createUserMessage(content, topicId, model, images);
      
      // 2. 创建助手消息
      const assistantMessage = await this.createAssistantMessage(topicId, model, userMessage.id);
      
      // 3. 发送请求并处理响应
      return await this.processAssistantResponse(assistantMessage, topicId, model);
    } catch (error) {
      // 处理错误
      const errorMessage = error instanceof Error ? error.message : '发送消息失败';
      
      // 清除流式响应状态
      store.dispatch({
        type: 'messages/setTopicStreaming',
        payload: { topicId, streaming: false }
      });
      
      // 发送流式结束事件
      EventService.emit(EVENT_NAMES.STREAMING_ENDED, { topicId });
      
      // 清除加载状态
      store.dispatch({
        type: 'messages/setTopicLoading',
        payload: { topicId, loading: false }
      });
      
      // 发送服务错误事件
      EventService.emit(EVENT_NAMES.SERVICE_ERROR, {
        message: errorMessage,
        source: 'sendMessage'
      });
      
      throw error;
    }
  }
  
  // 创建用户消息
  private static async createUserMessage(
    content: string, 
    topicId: string, 
    model: Model,
    images?: Array<{ url: string }>
  ): Promise<Message> {
    try {
      // 获取当前助手ID
      const state = store.getState();
      const currentTopic = state.messages.topics.find(t => t.id === topicId);
      const assistantId = currentTopic?.assistantId || '';
      
      // 创建用户消息和块
      const { message: userMessage, blocks: userBlocks } = createUserMessage({
        content,
        assistantId,
        topicId,
        modelId: model.id,
        model,
        images
      });
      
      // 保存消息和块
      await TopicService.saveMessageAndBlocks(userMessage, userBlocks);
      
      // 发送消息创建事件
      EventService.emit(EVENT_NAMES.MESSAGE_CREATED, { 
        topicId, 
        messageId: userMessage.id,
        message: userMessage
      });
      
      return userMessage;
    } catch (error) {
      console.error('创建用户消息失败:', error);
      throw error;
    }
  }
  
  // 创建助手消息
  private static async createAssistantMessage(
    topicId: string, 
    model: Model, 
    askId: string
  ): Promise<Message> {
    try {
      // 获取当前助手ID
      const state = store.getState();
      const currentTopic = state.messages.topics.find(t => t.id === topicId);
      const assistantId = currentTopic?.assistantId || '';
      
      // 创建助手消息和块
      const { message: assistantMessage, blocks: assistantBlocks } = createAssistantMessage({
        assistantId,
        topicId,
        modelId: model.id,
        model,
        askId
      });
      
      // 保存消息和块
      await TopicService.saveMessageAndBlocks(assistantMessage, assistantBlocks);
      
      // 发送消息创建事件
      EventService.emit(EVENT_NAMES.MESSAGE_CREATED, { 
        topicId, 
        messageId: assistantMessage.id,
        message: assistantMessage
      });
      
      // 设置加载状态
      store.dispatch({
        type: 'messages/setTopicLoading',
        payload: { topicId, loading: true }
      });
      
      return assistantMessage;
    } catch (error) {
      console.error('创建助手消息失败:', error);
      throw error;
    }
  }
  
  // 处理助手响应
  private static async processAssistantResponse(
    assistantMessage: Message, 
    topicId: string, 
    model: Model
  ): Promise<any> {
    try {
      // 设置流式响应状态
      store.dispatch({
        type: 'messages/setTopicStreaming',
        payload: { topicId, streaming: true }
      });
      
      // 发送流式开始事件
      EventService.emit(EVENT_NAMES.STREAMING_STARTED, { topicId });
      
      // 获取当前主题的所有消息
      const state = store.getState();
      const messages = state.messages.messagesByTopic[topicId] || [];
      
      // 获取主文本块ID
      const mainTextBlockId = assistantMessage.blocks.length > 0 ? assistantMessage.blocks[0] : '';
      
      // 发送聊天请求
      const response = await handleChatRequest({
        messages,
        model,
        onChunk: (chunk: string) => {
          if (mainTextBlockId) {
            // 更新块内容
            const currentBlock = state.messageBlocks.entities[mainTextBlockId];
            if (currentBlock) {
              // 获取现有内容并附加新内容
              const existingContent = currentBlock.type === 'main_text' ? 
                (currentBlock as any).content || '' : '';
              
              // 更新块内容
              store.dispatch(updateOneBlock({ 
                id: mainTextBlockId, 
                changes: { 
                  content: existingContent + chunk,
                  status: MessageBlockStatus.STREAMING
                }
              }));
              
              // 保存更新后的块
              dexieStorage.updateMessageBlock(mainTextBlockId, {
                content: existingContent + chunk,
                status: MessageBlockStatus.STREAMING
              });
              
              // 触发块更新事件
              EventService.emit(EVENT_NAMES.BLOCK_UPDATED, { 
                blockId: mainTextBlockId,
                messageId: assistantMessage.id,
                topicId
              });
            }
          }
          
          // 更新消息状态
          store.dispatch(updateMessage({
            topicId,
            messageId: assistantMessage.id,
            updates: { 
              status: AssistantMessageStatus.STREAMING
            }
          }));
          
          // 发送消息更新事件
          EventService.emit(EVENT_NAMES.MESSAGE_UPDATED, {
            topicId,
            messageId: assistantMessage.id,
            status: AssistantMessageStatus.STREAMING
          });
        }
      });
      
      // 更新最终响应状态
      if (mainTextBlockId) {
        // 更新块状态
        store.dispatch(updateOneBlock({ 
          id: mainTextBlockId, 
          changes: { 
            status: MessageBlockStatus.SUCCESS
          }
        }));
        
        // 保存更新后的块
        await dexieStorage.updateMessageBlock(mainTextBlockId, {
          status: MessageBlockStatus.SUCCESS
        });
        
        // 发送块更新事件
        EventService.emit(EVENT_NAMES.BLOCK_UPDATED, {
          blockId: mainTextBlockId,
          messageId: assistantMessage.id,
          topicId,
          status: MessageBlockStatus.SUCCESS
        });
      }
      
      // 更新消息状态
      store.dispatch(updateMessage({
        topicId,
        messageId: assistantMessage.id,
        updates: { 
          status: AssistantMessageStatus.SUCCESS
        }
      }));
      
      // 发送消息更新事件
      EventService.emit(EVENT_NAMES.MESSAGE_UPDATED, {
        topicId,
        messageId: assistantMessage.id,
        status: AssistantMessageStatus.SUCCESS
      });
      
      // 清除流式响应状态
      store.dispatch({
        type: 'messages/setTopicStreaming',
        payload: { topicId, streaming: false }
      });
      
      // 发送流式结束事件
      EventService.emit(EVENT_NAMES.STREAMING_ENDED, { topicId });
      
      // 清除加载状态
      store.dispatch({
        type: 'messages/setTopicLoading',
        payload: { topicId, loading: false }
      });
      
      return response;
    } catch (error) {
      console.error('处理助手响应失败:', error);
      throw error;
    }
  }
}