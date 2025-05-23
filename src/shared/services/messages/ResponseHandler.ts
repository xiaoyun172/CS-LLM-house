import { throttle } from 'lodash';
import store from '../../store';
import { dexieStorage } from '../DexieStorageService';
import { EventEmitter, EVENT_NAMES } from '../EventEmitter';
import { createStreamProcessor } from '../StreamProcessingService';
import { MessageBlockStatus, AssistantMessageStatus, MessageBlockType } from '../../types/newMessage';
import type { MessageBlock } from '../../types/newMessage';
import { newMessagesActions } from '../../store/slices/newMessagesSlice';
import type { ErrorInfo } from '../../store/slices/newMessagesSlice';
import { formatErrorMessage, getErrorType } from '../../utils/error';
import { updateOneBlock, addOneBlock } from '../../store/slices/messageBlocksSlice';
import { versionService } from '../VersionService';
import type { Chunk } from '../../types/chunk';
import { v4 as uuid } from 'uuid';

/**
 * 响应处理器配置类型
 */
type ResponseHandlerConfig = {
  messageId: string;
  blockId: string;
  topicId: string;
};

// 在文件开头添加错误记录类型定义
type ErrorRecord = Record<string, any>;

/**
 * 响应处理错误
 */
export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}



/**
 * 创建响应处理器
 * 处理API流式响应的接收、更新和完成
 */
export function createResponseHandler({ messageId, blockId, topicId }: ResponseHandlerConfig) {
  // 创建简单的节流数据库更新函数
  const throttledUpdateBlock = throttle((blockId: string, changes: any) => {
    dexieStorage.updateMessageBlock(blockId, changes);
  }, 200); // 200ms节流，减少数据库写入频率

  // 流式处理状态变量
  let accumulatedContent = '';
  let accumulatedThinking = '';
  let thinkingBlockId: string | null = null;
  let mainTextBlockId: string | null = null;

  // 占位符块转换状态跟踪
  let lastBlockId: string | null = blockId;
  let lastBlockType: MessageBlockType | null = MessageBlockType.UNKNOWN;

  // 创建节流的Redux更新函数，避免无限循环
  const throttledReduxUpdate = throttle((blockId: string, changes: any) => {
    store.dispatch(updateOneBlock({ id: blockId, changes }));
  }, 100); // 100ms节流，与电脑版保持一致

  // 实现电脑版的回调系统
  const callbacks = {
    onTextChunk: (text: string) => {
      accumulatedContent += text;

      if (lastBlockType === MessageBlockType.UNKNOWN) {
        // 第一次收到文本，转换占位符块为主文本块
        lastBlockType = MessageBlockType.MAIN_TEXT;
        mainTextBlockId = lastBlockId;

        const initialChanges = {
          type: MessageBlockType.MAIN_TEXT,
          content: accumulatedContent,
          status: MessageBlockStatus.STREAMING,
          updatedAt: new Date().toISOString()
        };

        // 立即更新Redux状态（转换操作）
        store.dispatch(updateOneBlock({ id: lastBlockId!, changes: initialChanges }));
        // 同时保存到数据库（使用节流）
        throttledUpdateBlock(lastBlockId!, initialChanges);
      } else if (lastBlockType === MessageBlockType.THINKING) {
        // 如果占位符块已经被转换为思考块，需要为普通文本创建新的块
        if (!mainTextBlockId) {
          // 创建新的主文本块
          const newMainTextBlock: MessageBlock = {
            id: uuid(),
            messageId,
            type: MessageBlockType.MAIN_TEXT,
            content: accumulatedContent,
            createdAt: new Date().toISOString(),
            status: MessageBlockStatus.STREAMING
          };

          mainTextBlockId = newMainTextBlock.id;

          // 添加到Redux状态
          store.dispatch(addOneBlock(newMainTextBlock));
          // 保存到数据库
          dexieStorage.saveMessageBlock(newMainTextBlock);

          // 将新块添加到消息的blocks数组
          store.dispatch(newMessagesActions.upsertBlockReference({
            messageId,
            blockId: mainTextBlockId!,
            status: MessageBlockStatus.STREAMING
          }));
        } else {
          // 更新现有的主文本块
          const blockChanges = {
            content: accumulatedContent,
            status: MessageBlockStatus.STREAMING,
            updatedAt: new Date().toISOString()
          };

          throttledReduxUpdate(mainTextBlockId, blockChanges);
          throttledUpdateBlock(mainTextBlockId, blockChanges);
        }
      } else if (lastBlockType === MessageBlockType.MAIN_TEXT && mainTextBlockId) {
        // 更新现有的主文本块
        const blockChanges = {
          content: accumulatedContent,
          status: MessageBlockStatus.STREAMING,
          updatedAt: new Date().toISOString()
        };

        throttledReduxUpdate(mainTextBlockId, blockChanges);
        throttledUpdateBlock(mainTextBlockId, blockChanges);
      }
    },

    onThinkingChunk: (text: string, thinking_millsec?: number) => {
      accumulatedThinking += text;
      if (lastBlockId) {
        if (lastBlockType === MessageBlockType.UNKNOWN) {
          // 第一次收到思考内容，转换占位符块为思考块（立即执行，不节流）
          lastBlockType = MessageBlockType.THINKING;

          const initialChanges = {
            type: MessageBlockType.THINKING,
            content: accumulatedThinking,
            status: MessageBlockStatus.STREAMING,
            thinking_millsec: thinking_millsec || 0,
            updatedAt: new Date().toISOString()
          };

          // 立即更新Redux状态（转换操作）
          store.dispatch(updateOneBlock({ id: lastBlockId, changes: initialChanges }));
          // 同时保存到数据库（使用节流）
          throttledUpdateBlock(lastBlockId, initialChanges);
        } else if (lastBlockType === MessageBlockType.THINKING) {
          // 后续思考内容更新，使用节流更新Redux和数据库
          const blockChanges = {
            content: accumulatedThinking,
            status: MessageBlockStatus.STREAMING,
            thinking_millsec: thinking_millsec || 0,
            updatedAt: new Date().toISOString()
          };

          // 使用节流更新Redux状态，避免过度渲染
          throttledReduxUpdate(lastBlockId, blockChanges);
          // 使用节流更新数据库
          throttledUpdateBlock(lastBlockId, blockChanges);
        }
      }
    }
  };

  return {
    /**
     * 处理基于电脑版架构的 Chunk 事件
     * @param chunk Chunk 事件对象
     */
    handleChunkEvent(chunk: Chunk) {
      try {
        switch (chunk.type) {
          case 'thinking.delta':
            const thinkingDelta = chunk as import('../../types/chunk').ThinkingDeltaChunk;
            console.log(`[ResponseHandler] 处理思考增量，长度: ${thinkingDelta.text.length}`);
            callbacks.onThinkingChunk?.(thinkingDelta.text, thinkingDelta.thinking_millsec);
            break;

          case 'thinking.complete':
            const thinkingComplete = chunk as import('../../types/chunk').ThinkingCompleteChunk;
            console.log(`[ResponseHandler] 处理思考完成，总长度: ${thinkingComplete.text.length}`);
            // 对于完成事件，直接设置完整的思考内容，不调用增量回调
            accumulatedThinking = thinkingComplete.text;

            // 直接处理思考块转换，不使用增量回调
            if (lastBlockId && lastBlockType === MessageBlockType.UNKNOWN) {
              // 第一次收到思考内容，转换占位符块为思考块
              lastBlockType = MessageBlockType.THINKING;
              thinkingBlockId = lastBlockId;

              const initialChanges = {
                type: MessageBlockType.THINKING,
                content: accumulatedThinking,
                status: MessageBlockStatus.STREAMING,
                thinking_millsec: thinkingComplete.thinking_millsec || 0,
                updatedAt: new Date().toISOString()
              };

              console.log(`[ResponseHandler] 将占位符块 ${blockId} 转换为思考块（完成事件）`);

              // 立即更新Redux状态
              store.dispatch(updateOneBlock({ id: lastBlockId, changes: initialChanges }));
              // 同时保存到数据库
              throttledUpdateBlock(lastBlockId, initialChanges);
            }
            break;

          case 'text.delta':
            const textDelta = chunk as import('../../types/chunk').TextDeltaChunk;
            console.log(`[ResponseHandler] 处理文本增量，长度: ${textDelta.text.length}`);
            callbacks.onTextChunk?.(textDelta.text);
            break;

          case 'text.complete':
            const textComplete = chunk as import('../../types/chunk').TextCompleteChunk;
            console.log(`[ResponseHandler] 处理文本完成，总长度: ${textComplete.text.length}`);
            // 对于完成事件，直接设置完整的文本内容，不调用增量回调
            accumulatedContent = textComplete.text;

            // 直接处理文本块转换，不使用增量回调
            if (lastBlockType === MessageBlockType.UNKNOWN) {
              // 第一次收到文本，转换占位符块为主文本块
              lastBlockType = MessageBlockType.MAIN_TEXT;
              mainTextBlockId = lastBlockId;

              const initialChanges = {
                type: MessageBlockType.MAIN_TEXT,
                content: accumulatedContent,
                status: MessageBlockStatus.STREAMING,
                updatedAt: new Date().toISOString()
              };

              console.log(`[ResponseHandler] 将占位符块 ${blockId} 转换为主文本块（完成事件）`);

              // 立即更新Redux状态
              store.dispatch(updateOneBlock({ id: lastBlockId!, changes: initialChanges }));
              // 同时保存到数据库
              throttledUpdateBlock(lastBlockId!, initialChanges);
            } else if (lastBlockType === MessageBlockType.THINKING) {
              // 如果占位符块已经被转换为思考块，需要为普通文本创建新的块
              if (!mainTextBlockId) {
                // 创建新的主文本块
                const newMainTextBlock: MessageBlock = {
                  id: uuid(),
                  messageId,
                  type: MessageBlockType.MAIN_TEXT,
                  content: accumulatedContent,
                  createdAt: new Date().toISOString(),
                  status: MessageBlockStatus.STREAMING
                };

                mainTextBlockId = newMainTextBlock.id;

                console.log(`[ResponseHandler] 创建新的主文本块 ${mainTextBlockId}（完成事件）`);

                // 添加到Redux状态
                store.dispatch(addOneBlock(newMainTextBlock));
                // 保存到数据库
                dexieStorage.saveMessageBlock(newMainTextBlock);

                // 将新块添加到消息的blocks数组
                store.dispatch(newMessagesActions.upsertBlockReference({
                  messageId,
                  blockId: mainTextBlockId,
                  status: MessageBlockStatus.STREAMING
                }));
              }
            }
            break;

          default:
            console.log(`[ResponseHandler] 忽略未处理的 chunk 类型: ${chunk.type}`);
            break;
        }
      } catch (error) {
        console.error(`[ResponseHandler] 处理 chunk 事件失败:`, error);
      }
    },

    /**
     * 处理流式响应片段（兼容旧接口）
     * @param chunk 响应片段
     * @param reasoning 推理内容（可选）
     */
    handleChunk(chunk: string, reasoning?: string) {
      // 检查是否有推理内容
      let isThinking = false;
      let thinkingContent = '';
      let thinkingTime = 0;

      // 优先使用传入的推理内容
      if (reasoning !== undefined && reasoning.trim()) {
        isThinking = true;
        thinkingContent = reasoning;
        thinkingTime = 0;
        console.log(`[ResponseHandler] 接收到推理内容: "${reasoning}"`);
      } else {
        // 尝试解析JSON，检查是否包含思考内容
        try {
          const parsedChunk = JSON.parse(chunk);
          if (parsedChunk && parsedChunk.reasoning) {
            isThinking = true;
            thinkingContent = parsedChunk.reasoning;
            thinkingTime = parsedChunk.reasoningTime || 0;
          }
        } catch (e) {
          // 不是JSON，按普通文本处理
        }
      }

      // 完全模仿电脑版的回调架构
      if (isThinking) {
        // 调用onThinkingChunk回调
        console.log(`[ResponseHandler] 处理思考内容，长度: ${thinkingContent.length}`);
        callbacks.onThinkingChunk?.(thinkingContent, thinkingTime);
      } else {
        // 调用onTextChunk回调
        console.log(`[ResponseHandler] 处理普通文本，长度: ${chunk.length}`);
        callbacks.onTextChunk?.(chunk);
      }

      // 返回当前累积的内容
      return accumulatedContent;
    },

    /**
     * 响应完成处理
     * @param finalContent 最终内容
     * @returns 累计的响应内容
     */
    async complete(finalContent?: string) {
      // 确保最终内容是最新的
      if (finalContent && finalContent !== accumulatedContent) {
        accumulatedContent = finalContent;
      }

      const now = new Date().toISOString();

      // 简化完成处理 - 直接更新状态，不使用流处理器
      // 更新消息状态
      store.dispatch(newMessagesActions.updateMessage({
        id: messageId,
        changes: {
          status: AssistantMessageStatus.SUCCESS,
          updatedAt: now
        }
      }));

      // 更新消息块状态（确保所有相关块都被更新）
      console.log(`[ResponseHandler] 完成时更新块状态 - lastBlockType: ${lastBlockType}, blockId: ${blockId}, mainTextBlockId: ${mainTextBlockId}`);

      if (lastBlockType === MessageBlockType.MAIN_TEXT) {
        // 只有主文本块，更新原始块
        console.log(`[ResponseHandler] 更新主文本块 ${blockId} 状态为 SUCCESS`);
        store.dispatch(updateOneBlock({
          id: blockId,
          changes: {
            content: accumulatedContent,
            status: MessageBlockStatus.SUCCESS,
            updatedAt: now
          }
        }));
      } else if (lastBlockType === MessageBlockType.THINKING) {
        // 有思考块，更新思考块状态
        console.log(`[ResponseHandler] 更新思考块 ${blockId} 状态为 SUCCESS`);
        store.dispatch(updateOneBlock({
          id: blockId,
          changes: {
            content: accumulatedThinking,
            status: MessageBlockStatus.SUCCESS,
            updatedAt: now
          }
        }));

        // 如果还有主文本块，也要更新主文本块状态
        if (mainTextBlockId && mainTextBlockId !== blockId) {
          console.log(`[ResponseHandler] 更新主文本块 ${mainTextBlockId} 状态为 SUCCESS`);
          store.dispatch(updateOneBlock({
            id: mainTextBlockId,
            changes: {
              content: accumulatedContent,
              status: MessageBlockStatus.SUCCESS,
              updatedAt: now
            }
          }));
        }
      } else {
        // 默认情况，更新为主文本块
        console.log(`[ResponseHandler] 默认更新块 ${blockId} 状态为 SUCCESS`);
        store.dispatch(updateOneBlock({
          id: blockId,
          changes: {
            content: accumulatedContent,
            status: MessageBlockStatus.SUCCESS,
            updatedAt: now
          }
        }));
      }

      // 设置主题为非流式响应状态
      store.dispatch(newMessagesActions.setTopicStreaming({
        topicId,
        streaming: false
      }));

      // 设置主题为非加载状态
      store.dispatch(newMessagesActions.setTopicLoading({
        topicId,
        loading: false
      }));

      // 处理思考块完成
      if (thinkingBlockId) {
        // 获取思考块
        const thinkingBlock = store.getState().messageBlocks.entities[thinkingBlockId];

        if (thinkingBlock && thinkingBlock.type === MessageBlockType.THINKING) {
          // 更新思考块状态为完成
          store.dispatch(updateOneBlock({
            id: thinkingBlockId,
            changes: {
              status: MessageBlockStatus.SUCCESS,
              updatedAt: now
            }
          }));

          // 保存到数据库
          dexieStorage.updateMessageBlock(thinkingBlockId, {
            status: MessageBlockStatus.SUCCESS,
            updatedAt: now
          });
        }
      }

      // 发送完成事件
      EventEmitter.emit(EVENT_NAMES.STREAM_TEXT_COMPLETE, {
        text: accumulatedContent,
        messageId,
        blockId,
        topicId
      });

      // 保存最终状态到数据库（根据转换后的块类型）
      const blockUpdatePromises = [];

      // 保存原始块（思考块或主文本块）
      if (lastBlockType === MessageBlockType.THINKING) {
        console.log(`[ResponseHandler] 保存思考块 ${blockId} 到数据库，内容长度: ${accumulatedThinking.length}`);
        blockUpdatePromises.push(dexieStorage.updateMessageBlock(blockId, {
          type: MessageBlockType.THINKING, // 确保类型被正确保存
          content: accumulatedThinking,
          status: MessageBlockStatus.SUCCESS,
          updatedAt: now
        }));
      } else {
        console.log(`[ResponseHandler] 保存主文本块 ${blockId} 到数据库，内容长度: ${accumulatedContent.length}`);
        blockUpdatePromises.push(dexieStorage.updateMessageBlock(blockId, {
          type: MessageBlockType.MAIN_TEXT, // 确保类型被正确保存
          content: accumulatedContent,
          status: MessageBlockStatus.SUCCESS,
          updatedAt: now
        }));
      }

      // 如果有新创建的主文本块，也要保存它
      if (mainTextBlockId && mainTextBlockId !== blockId) {
        console.log(`[ResponseHandler] 保存新创建的主文本块 ${mainTextBlockId} 到数据库，内容长度: ${accumulatedContent.length}`);
        blockUpdatePromises.push(dexieStorage.updateMessageBlock(mainTextBlockId, {
          type: MessageBlockType.MAIN_TEXT, // 确保类型被正确保存
          content: accumulatedContent,
          status: MessageBlockStatus.SUCCESS,
          updatedAt: now
        }));
      }

      // 确保消息的 blocks 数组包含所有相关的块ID
      const allBlockIds = [];
      if (lastBlockType === MessageBlockType.THINKING) {
        allBlockIds.push(blockId); // 思考块
        if (mainTextBlockId && mainTextBlockId !== blockId) {
          allBlockIds.push(mainTextBlockId); // 主文本块
        }
      } else {
        allBlockIds.push(blockId); // 主文本块
      }

      console.log(`[ResponseHandler] 完成时的所有块ID: [${allBlockIds.join(', ')}]`);

      // 更新消息的 blocks 数组
      store.dispatch(newMessagesActions.updateMessage({
        id: messageId,
        changes: {
          blocks: allBlockIds,
          status: AssistantMessageStatus.SUCCESS,
          updatedAt: now
        }
      }));

      await Promise.all([
        ...blockUpdatePromises,
        (async () => {
          // 获取当前消息的最新状态（包含所有块引用）
          const currentMessage = store.getState().messages.entities[messageId];
          if (currentMessage) {
            // 如果消息没有版本历史，创建一个初始版本
            if (!currentMessage.versions || currentMessage.versions.length === 0) {
              // 使用VersionService创建初始版本
              try {
                await versionService.createInitialVersion(
                  messageId,
                  blockId,
                  accumulatedContent,
                  currentMessage.model
                );
              } catch (versionError) {
                console.error(`[ResponseHandler] 创建初始版本失败:`, versionError);
              }
            }

            // 获取最新的消息状态（包含所有块引用）
            const updatedMessage = {
              ...currentMessage,
              blocks: allBlockIds, // 使用我们计算的完整块ID数组
              status: AssistantMessageStatus.SUCCESS,
              updatedAt: now
            };

            console.log(`[ResponseHandler] 保存消息状态，更新后的blocks: [${updatedMessage.blocks?.join(', ')}]`);

            // 关键修复：同时更新messages表和topic.messages数组
            await Promise.all([
              // 1. 更新messages表中的消息（包含最新的blocks数组）
              dexieStorage.updateMessage(messageId, {
                status: AssistantMessageStatus.SUCCESS,
                updatedAt: now,
                blocks: allBlockIds // 确保完整的blocks数组被保存
              }),

              // 2. 更新topic.messages数组中的消息
              (async () => {
                const topic = await dexieStorage.topics.get(topicId);
                if (topic) {
                  // 确保messages数组存在
                  if (!topic.messages) {
                    topic.messages = [];
                  }

                  // 查找消息在数组中的位置
                  const messageIndex = topic.messages.findIndex(m => m.id === messageId);

                  // 更新或添加消息到话题的messages数组
                  if (messageIndex >= 0) {
                    topic.messages[messageIndex] = updatedMessage;
                  } else {
                    topic.messages.push(updatedMessage);
                  }

                  console.log(`[ResponseHandler] 保存到topic.messages，blocks: [${updatedMessage.blocks?.join(', ')}]`);

                  // 保存更新后的话题
                  await dexieStorage.topics.put(topic);
                }
              })()
            ]);
          }
        })()
      ]);

      // 发送完成事件
      EventEmitter.emit(EVENT_NAMES.MESSAGE_COMPLETE, {
        id: messageId,
        topicId,
        status: 'success'
      });

      // 触发话题自动命名 - 与电脑版保持一致
      try {
        // 异步执行话题命名，不阻塞主流程
        setTimeout(async () => {
          const { TopicNamingService } = await import('../TopicNamingService');

          // 获取最新的话题数据
          const topic = await dexieStorage.topics.get(topicId);
          if (topic && TopicNamingService.shouldNameTopic(topic)) {
            console.log(`[ResponseHandler] 触发话题自动命名: ${topicId}`);
            const newName = await TopicNamingService.generateTopicName(topic);
            if (newName) {
              console.log(`[ResponseHandler] 话题自动命名成功: ${newName}`);
            }
          }
        }, 1000); // 延迟1秒执行，确保消息已完全保存
      } catch (error) {
        console.error('[ResponseHandler] 话题自动命名失败:', error);
      }

      return accumulatedContent;
    },

    /**
     * 响应失败处理
     * @param error 错误对象
     */
    async fail(error: Error) {
      console.error(`[ResponseHandler] 响应失败 - 消息ID: ${messageId}, 错误: ${error.message}`);

      // 获取错误消息
      const errorMessage = error.message || '响应处理失败';

      // 获取错误类型
      const errorType = getErrorType(error);

      // 获取错误详情
      const errorDetails = formatErrorMessage(error);

      // 创建错误记录对象
      const errorRecord: ErrorRecord = {
        message: errorMessage,
        timestamp: new Date().toISOString(),
        code: error.name || 'ERROR',
        type: errorType
      };

      // 创建更详细的错误信息对象用于Redux状态
      const errorInfo: ErrorInfo = {
        message: errorMessage,
        code: error.name || 'ERROR',
        type: errorType,
        timestamp: new Date().toISOString(),
        details: errorDetails,
        context: {
          messageId,
          blockId,
          topicId
        }
      };

      // 创建错误数据块
      const errorChunk: Chunk = {
        type: 'error',
        error: {
          message: errorMessage,
          details: errorDetails,
          type: errorType
        }
      };

      // 使用流处理器处理错误数据块
      const streamProcessor = createStreamProcessor({
        onError: (_err) => {
          // 使用新的 action 更新消息状态
          store.dispatch(newMessagesActions.updateMessage({
            id: messageId,
            changes: {
              status: AssistantMessageStatus.ERROR
            }
          }));

          // 设置主题为非流式响应状态
          store.dispatch(newMessagesActions.setTopicStreaming({
            topicId,
            streaming: false
          }));

          // 设置主题为非加载状态
          store.dispatch(newMessagesActions.setTopicLoading({
            topicId,
            loading: false
          }));

          // 记录错误到Redux状态
          store.dispatch(newMessagesActions.setError({
            error: errorInfo,
            topicId
          }));

          // 更新Redux状态中的消息块
          store.dispatch(updateOneBlock({
            id: blockId,
            changes: {
              status: MessageBlockStatus.ERROR,
              error: errorRecord
            }
          }));
        }
      });

      // 处理错误数据块
      streamProcessor(errorChunk);

      // 发送错误事件通知
      EventEmitter.emit(EVENT_NAMES.STREAM_ERROR, {
        error: errorInfo,
        messageId,
        blockId,
        topicId
      });

      // 保存错误状态到数据库
      await Promise.all([
        dexieStorage.updateMessageBlock(blockId, {
          status: MessageBlockStatus.ERROR,
          error: errorRecord
        }),
        dexieStorage.updateMessage(messageId, {
          status: AssistantMessageStatus.ERROR
        })
      ]);

      // 发送消息完成事件（错误状态）
      EventEmitter.emit(EVENT_NAMES.MESSAGE_COMPLETE, {
        id: messageId,
        topicId,
        status: 'error',
        error: errorMessage
      });

      throw error;
    }
  };
}

export default createResponseHandler;

/**
 * 创建响应状态action creator - 向后兼容
 */
export const setResponseState = ({ topicId, status, loading }: { topicId: string; status: string; loading: boolean }) => {
  // 设置流式响应状态
  const streaming = status === 'streaming';

  // 使用新的action creator
  store.dispatch(newMessagesActions.setTopicStreaming({
    topicId,
    streaming
  }));

  store.dispatch(newMessagesActions.setTopicLoading({
    topicId,
    loading
  }));

  // 发送事件通知
  if (streaming) {
    EventEmitter.emit(EVENT_NAMES.STREAM_TEXT_DELTA, {
      topicId,
      status,
      streaming
    });
  } else {
    EventEmitter.emit(EVENT_NAMES.STREAM_TEXT_COMPLETE, {
      topicId,
      status,
      streaming
    });
  }
};