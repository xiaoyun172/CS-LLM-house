import { throttle } from 'lodash';
import store from '../../store';
import { dexieStorage } from '../DexieStorageService';
import { EventEmitter, EVENT_NAMES } from '../EventEmitter';
import { createStreamProcessor } from '../StreamProcessingService';
import { MessageBlockStatus, AssistantMessageStatus, MessageBlockType } from '../../types/newMessage';
import { newMessagesActions } from '../../store/slices/newMessagesSlice';
import type { ErrorInfo } from '../../store/slices/newMessagesSlice';
import { formatErrorMessage, getErrorType } from '../../utils/error';
import { updateOneBlock, addOneBlock } from '../../store/slices/messageBlocksSlice';
import { versionService } from '../VersionService';
import type {
  Chunk,
  TextDeltaChunk,
  TextCompleteChunk,
  ThinkingDeltaChunk,
  ThinkingCompleteChunk
} from '../../types/chunk';

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
 * 创建节流更新函数
 */
const createThrottledUpdateBlock = () => {
  return throttle(async (blockId: string, changes: any) => {
    await dexieStorage.updateMessageBlock(blockId, changes);
  }, 150); // 150ms节流 - 与电脑版保持一致
};

/**
 * 创建响应处理器
 * 处理API流式响应的接收、更新和完成
 */
export function createResponseHandler({ messageId, blockId, topicId }: ResponseHandlerConfig) {
  // 累计的响应内容
  let accumulatedContent = '';

  // 创建节流更新函数
  const throttledUpdateBlock = createThrottledUpdateBlock();

  // 思考块ID
  let thinkingBlockId: string | null = null;

  return {
    /**
     * 处理流式响应片段
     * @param chunk 响应片段
     */
    handleChunk(chunk: string) {
      // 尝试解析JSON，检查是否包含思考内容
      let parsedChunk: any = null;
      let isThinking = false;
      let thinkingContent = '';
      let thinkingTime = 0;

      try {
        parsedChunk = JSON.parse(chunk);
        if (parsedChunk && parsedChunk.reasoning) {
          isThinking = true;
          thinkingContent = parsedChunk.reasoning;
          thinkingTime = parsedChunk.reasoningTime || 0;
        }
      } catch (e) {
        // 不是JSON，按普通文本处理
        parsedChunk = null;
      }

      // 如果是普通文本，附加到累积内容
      if (!isThinking) {
        accumulatedContent += chunk;
      }

      console.log(`[ResponseHandler] 接收块数据 - 长度: ${chunk.length}, 总长度: ${accumulatedContent.length}`);

      // 使用流处理器处理数据块
      const streamProcessor = createStreamProcessor({
        // 文本块处理
        onTextChunk: (_text) => {
          // 检查是否是第一个文本块，如果是，立即替换占位符文本
          const currentBlock = store.getState().messageBlocks.entities[blockId];
          // 安全地检查内容，处理不同类型的块
          const blockContent = currentBlock &&
                              currentBlock.type === MessageBlockType.MAIN_TEXT ?
                              (currentBlock as any).content : '';

          const isFirstChunk = blockContent === '正在生成回复...' &&
                              accumulatedContent !== '正在生成回复...';

          if (isFirstChunk) {
            console.log('[ResponseHandler] 收到第一个文本块，替换占位符文本');
          }

          // 使用新的 action 更新消息状态
          store.dispatch(newMessagesActions.updateMessage({
            id: messageId,
            changes: {
              status: AssistantMessageStatus.STREAMING
            }
          }));

          // 设置主题为流式响应状态
          store.dispatch(newMessagesActions.setTopicStreaming({
            topicId,
            streaming: true
          }));

          // 更新Redux状态中的消息块
          store.dispatch(updateOneBlock({
            id: blockId,
            changes: {
              content: accumulatedContent,
              status: MessageBlockStatus.STREAMING
            }
          }));

          // 如果是第一个文本块，立即保存到数据库，不使用节流
          if (isFirstChunk) {
            dexieStorage.updateMessageBlock(blockId, {
              content: accumulatedContent,
              status: MessageBlockStatus.STREAMING
            }).then(() => {
              console.log('[ResponseHandler] 成功替换占位符文本');
              // 强制触发一个额外的事件，确保UI更新
              EventEmitter.emit(EVENT_NAMES.STREAM_TEXT_DELTA, {
                text: accumulatedContent,
                messageId,
                blockId,
                topicId,
                isFirstChunk: true
              });
            });
          } else {
            // 保存到数据库(使用节流防止过多写操作)
            throttledUpdateBlock(blockId, {
              content: accumulatedContent,
              status: MessageBlockStatus.STREAMING
            });
          }
        },

        // 思考块处理
        onThinkingChunk: (text, thinking_millsec) => {
          // 检查是否已经有思考块
          if (!thinkingBlockId) {
            // 创建新的思考块
            const newThinkingBlock = {
              id: `thinking-${Date.now()}`,
              messageId,
              type: MessageBlockType.THINKING,
              content: text,
              thinking_millsec: thinking_millsec,
              status: MessageBlockStatus.STREAMING,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            // 保存思考块ID
            thinkingBlockId = newThinkingBlock.id;

            // 添加到Redux状态
            store.dispatch(addOneBlock(newThinkingBlock));

            // 保存到数据库
            dexieStorage.saveMessageBlock(newThinkingBlock);
          } else {
            // 更新现有思考块
            store.dispatch(updateOneBlock({
              id: thinkingBlockId,
              changes: {
                content: text,
                thinking_millsec: thinking_millsec,
                status: MessageBlockStatus.STREAMING,
                updatedAt: new Date().toISOString()
              }
            }));

            // 保存到数据库(使用节流防止过多写操作)
            throttledUpdateBlock(thinkingBlockId, {
              content: text,
              thinking_millsec: thinking_millsec,
              status: MessageBlockStatus.STREAMING,
              updatedAt: new Date().toISOString()
            });
          }
        }
      });

      // 根据内容类型创建不同的数据块
      if (isThinking) {
        // 创建思考增量数据块
        const thinkingDeltaChunk: ThinkingDeltaChunk = {
          type: 'thinking.delta',
          text: thinkingContent,
          thinking_millsec: thinkingTime
        };

        // 处理思考数据块
        streamProcessor(thinkingDeltaChunk);

        // 发送事件通知
        EventEmitter.emit(EVENT_NAMES.STREAM_THINKING_DELTA, {
          text: thinkingContent,
          thinking_millsec: thinkingTime,
          messageId,
          blockId: thinkingBlockId,
          topicId
        });
      } else {
        // 检查是否是第一个文本块
        const currentBlock = store.getState().messageBlocks.entities[blockId];
        // 安全地检查内容，处理不同类型的块
        const blockContent = currentBlock &&
                            currentBlock.type === MessageBlockType.MAIN_TEXT ?
                            (currentBlock as any).content : '';

        const isFirstChunk = blockContent === '正在生成回复...' &&
                            accumulatedContent !== '正在生成回复...';

        // 获取当前消息的模型信息
        const message = store.getState().messages.entities[messageId];
        const modelInfo = message?.model || {};

        // 创建文本增量数据块
        const textDeltaChunk: any = {
          type: 'text.delta',
          text: chunk,
          isFirstChunk: isFirstChunk,
          messageId: messageId,
          blockId: blockId,
          topicId: topicId,
          // 添加调试信息
          chunkLength: chunk.length,
          accumulatedLength: accumulatedContent.length,
          timestamp: Date.now()
        };

        // 添加模型信息（如果有）
        if (modelInfo && typeof modelInfo === 'object') {
          if ('provider' in modelInfo) {
            textDeltaChunk.modelProvider = modelInfo.provider;
          }
          if ('id' in modelInfo) {
            textDeltaChunk.modelId = modelInfo.id;
          }
          // 检查是否是DeepSeek模型
          const provider = 'provider' in modelInfo ? String(modelInfo.provider) : '';
          const id = 'id' in modelInfo ? String(modelInfo.id) : '';
          textDeltaChunk.isDeepSeekModel = provider === 'deepseek' || (id && id.indexOf('deepseek') >= 0);
        }

        // 处理文本数据块
        streamProcessor(textDeltaChunk);

        // 如果是第一个文本块，立即更新数据库，不使用节流
        if (isFirstChunk) {
          console.log('[ResponseHandler] 发送第一个文本块事件，替换占位符文本');

          // 立即更新数据库
          dexieStorage.updateMessageBlock(blockId, {
            content: chunk, // 直接使用第一个文本块的内容
            status: MessageBlockStatus.STREAMING
          }).then(() => {

            // 发送特殊事件，通知UI立即替换占位符
            EventEmitter.emit(EVENT_NAMES.STREAM_TEXT_FIRST_CHUNK, {
              text: chunk,
              fullContent: chunk,
              messageId,
              blockId,
              topicId,
              // 添加模型信息
              modelProvider: textDeltaChunk.modelProvider,
              modelId: textDeltaChunk.modelId,
              isDeepSeekModel: textDeltaChunk.isDeepSeekModel,
              timestamp: Date.now()
            });

          });
        }

        // 发送事件通知 - 只发送当前文本块，而不是累积内容
        // 这样可以实现累加效果
        EventEmitter.emit(EVENT_NAMES.STREAM_TEXT_DELTA, {
          text: chunk, // 只发送当前文本块
          isFirstChunk: isFirstChunk,
          messageId,
          blockId,
          topicId,
          // 添加模型信息
          modelProvider: textDeltaChunk.modelProvider,
          modelId: textDeltaChunk.modelId,
          isDeepSeekModel: textDeltaChunk.isDeepSeekModel,
          // 添加调试信息
          chunkLength: chunk.length,
          accumulatedLength: accumulatedContent.length,
          timestamp: Date.now()
        });

      }

      // 返回当前累积的内容，这样流式响应处理函数可以获取到最新内容
      return accumulatedContent;
    },

    /**
     * 响应完成处理
     * @param finalContent 最终内容
     * @returns 累计的响应内容
     */
    async complete(finalContent?: string) {
      console.log(`[ResponseHandler] 完成响应 - 消息ID: ${messageId}, 块ID: ${blockId}`);

      // 确保最终内容是最新的
      if (finalContent && finalContent !== accumulatedContent) {
        console.log(`[ResponseHandler] 更新最终内容 - 当前长度: ${accumulatedContent.length}, 新长度: ${finalContent.length}`);
        accumulatedContent = finalContent;
      }

      // 创建文本完成数据块
      const textCompleteChunk: TextCompleteChunk = {
        type: 'text.complete',
        text: accumulatedContent
      };

      const now = new Date().toISOString();

      // 使用流处理器处理完成数据块
      const streamProcessor = createStreamProcessor({
        onTextComplete: (finalText) => {
          // 使用新的 action 更新消息状态
          store.dispatch(newMessagesActions.updateMessage({
            id: messageId,
            changes: {
              status: AssistantMessageStatus.SUCCESS,
              updatedAt: now
            }
          }));

          // 更新消息块状态 - 同时更新Redux状态和数据库
          store.dispatch(updateOneBlock({
            id: blockId,
            changes: {
              content: finalText,
              status: MessageBlockStatus.SUCCESS,
              updatedAt: now
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
        },

        // 思考块完成处理
        onThinkingComplete: (finalThinkingText, thinking_millsec) => {
          // 如果有思考块，更新其状态为完成
          if (thinkingBlockId) {
            // 更新Redux状态
            store.dispatch(updateOneBlock({
              id: thinkingBlockId,
              changes: {
                content: finalThinkingText,
                thinking_millsec: thinking_millsec,
                status: MessageBlockStatus.SUCCESS,
                updatedAt: now
              }
            }));

            // 保存到数据库
            dexieStorage.updateMessageBlock(thinkingBlockId, {
              content: finalThinkingText,
              thinking_millsec: thinking_millsec,
              status: MessageBlockStatus.SUCCESS,
              updatedAt: now
            });

            // 发送思考完成事件
            EventEmitter.emit(EVENT_NAMES.STREAM_THINKING_COMPLETE, {
              text: finalThinkingText,
              thinking_millsec: thinking_millsec,
              messageId,
              blockId: thinkingBlockId,
              topicId
            });
          }
        }
      });

      // 处理完成数据块
      streamProcessor(textCompleteChunk);

      // 如果有思考块，也发送思考完成数据块
      if (thinkingBlockId) {
        // 获取思考块
        const thinkingBlock = store.getState().messageBlocks.entities[thinkingBlockId];

        if (thinkingBlock && thinkingBlock.type === MessageBlockType.THINKING) {
          // 类型断言为思考块
          const typedThinkingBlock = thinkingBlock as any;

          const thinkingCompleteChunk: ThinkingCompleteChunk = {
            type: 'thinking.complete',
            text: typedThinkingBlock.content || '',
            thinking_millsec: typedThinkingBlock.thinking_millsec || 0
          };

          streamProcessor(thinkingCompleteChunk);
        }
      }

      // 获取当前消息的模型信息
      const message = store.getState().messages.entities[messageId];
      const modelInfo = message?.model || {};

      // 检查是否是DeepSeek模型
      const provider = modelInfo && 'provider' in modelInfo ? String(modelInfo.provider) : '';
      const id = modelInfo && 'id' in modelInfo ? String(modelInfo.id) : '';
      const isDeepSeekModel = provider === 'deepseek' || (id && id.indexOf('deepseek') >= 0);

      // 发送事件通知
      EventEmitter.emit(EVENT_NAMES.STREAM_TEXT_COMPLETE, {
        text: accumulatedContent,
        messageId,
        blockId,
        topicId,
        // 添加模型信息
        modelProvider: provider,
        modelId: id,
        isDeepSeekModel: isDeepSeekModel
      });

      // 保存最终状态到数据库
      await Promise.all([
        dexieStorage.updateMessageBlock(blockId, {
          content: accumulatedContent,
          status: MessageBlockStatus.SUCCESS,
          updatedAt: now
        }),
        (async () => {
          // 获取当前消息
          const message = await dexieStorage.getMessage(messageId);
          if (message) {
            // 如果消息没有版本历史，创建一个初始版本
            if (!message.versions || message.versions.length === 0) {
              console.log(`[ResponseHandler] 创建初始版本历史记录 - 消息ID: ${messageId}`);

              // 使用VersionService创建初始版本
              try {
                await versionService.createInitialVersion(
                  messageId,
                  blockId,
                  accumulatedContent,
                  message.model
                );

                // 更新消息状态
                await dexieStorage.updateMessage(messageId, {
                  status: AssistantMessageStatus.SUCCESS,
                  updatedAt: now
                });

                console.log(`[ResponseHandler] 初始版本创建成功 - 消息ID: ${messageId}`);
              } catch (versionError) {
                console.error(`[ResponseHandler] 创建初始版本失败:`, versionError);

                // 如果版本创建失败，仍然更新消息状态
                await dexieStorage.updateMessage(messageId, {
                  status: AssistantMessageStatus.SUCCESS,
                  updatedAt: now
                });
              }
            } else {
              // 如果已有版本历史，只更新状态
              await dexieStorage.updateMessage(messageId, {
                status: AssistantMessageStatus.SUCCESS,
                updatedAt: now
              });
            }
          }
        })()
      ]);

      // 发送完成事件
      EventEmitter.emit(EVENT_NAMES.MESSAGE_COMPLETE, {
        id: messageId,
        topicId,
        status: 'success'
      });

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