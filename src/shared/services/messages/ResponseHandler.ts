import { throttle } from 'lodash';
import store from '../../store';
import { dexieStorage } from '../DexieStorageService';
// 注意：移除了事件系统导入，完全依赖Redux状态更新
import { MessageBlockStatus, AssistantMessageStatus } from '../../types/newMessage';
import { newMessagesActions } from '../../store/slices/newMessagesSlice';
import type { ErrorInfo } from '../../store/slices/newMessagesSlice';
import { formatErrorMessage, getErrorType } from '../../utils/error';
import { updateOneBlock } from '../../store/slices/messageBlocksSlice';

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

  return {
    /**
     * 处理流式响应片段
     * @param chunk 响应片段
     */
    handleChunk(chunk: string) {
      // 附加新内容
      accumulatedContent += chunk;

      console.log(`[ResponseHandler] 接收块数据 - 长度: ${chunk.length}, 总长度: ${accumulatedContent.length}`);

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

      // 保存到数据库(使用节流防止过多写操作)
      throttledUpdateBlock(blockId, {
        content: accumulatedContent,
        status: MessageBlockStatus.STREAMING
      });

      // 注意：移除了事件系统通知，完全依赖Redux状态更新触发UI更新

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

      const now = new Date().toISOString();

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
          content: accumulatedContent,
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

      // 保存最终状态到数据库
      await Promise.all([
        dexieStorage.updateMessageBlock(blockId, {
          content: accumulatedContent,
          status: MessageBlockStatus.SUCCESS,
          updatedAt: now
        }),
        dexieStorage.updateMessage(messageId, {
          status: AssistantMessageStatus.SUCCESS,
          updatedAt: now
        })
      ]);

      // 注意：移除了事件系统通知，完全依赖Redux状态更新触发UI更新

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

      // 注意：移除了事件系统通知，完全依赖Redux状态更新触发UI更新

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

  // 注意：移除了事件系统通知，完全依赖Redux状态更新触发UI更新
};