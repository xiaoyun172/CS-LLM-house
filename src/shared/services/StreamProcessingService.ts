/**
 * 流处理服务 - 参考电脑版架构，简化流处理逻辑
 */
import { AssistantMessageStatus } from '../types/newMessage';
import type {
  Chunk,
  TextDeltaChunk,
  TextCompleteChunk,
  ThinkingDeltaChunk,
  ThinkingCompleteChunk,
  BlockCompleteChunk
} from '../types/chunk';

// 流处理器回调接口 - 简化版本，参考电脑版
export interface StreamProcessorCallbacks {
  // 文本内容块接收
  onTextChunk?: (text: string) => void;
  // 完整文本内容接收
  onTextComplete?: (text: string) => void;
  // 思考/推理内容块接收
  onThinkingChunk?: (text: string, thinking_millsec?: number) => void;
  onThinkingComplete?: (text: string, thinking_millsec?: number) => void;
  // 处理块过程中发生错误时调用
  onError?: (error: any) => void;
  // 整个流处理完成时调用
  onComplete?: (status: AssistantMessageStatus, response?: any) => void;
}

// 创建流处理器实例的函数 - 简化版本，参考电脑版
export function createStreamProcessor(callbacks: StreamProcessorCallbacks = {}) {
  // 返回的函数处理单个数据块或最终信号
  return (chunk: Chunk) => {
    try {
      // 1. 处理完成信号
      if (chunk.type === 'block_complete') {
        callbacks.onComplete?.(AssistantMessageStatus.SUCCESS, (chunk as BlockCompleteChunk).response);
        return;
      }

      // 2. 处理数据块 - 简化逻辑，参考电脑版
      if (chunk.type === 'text.delta' && callbacks.onTextChunk) {
        callbacks.onTextChunk((chunk as TextDeltaChunk).text);
      }
      if (chunk.type === 'text.complete' && callbacks.onTextComplete) {
        callbacks.onTextComplete((chunk as TextCompleteChunk).text);
      }
      if (chunk.type === 'thinking.delta' && callbacks.onThinkingChunk) {
        const thinkingChunk = chunk as ThinkingDeltaChunk;
        callbacks.onThinkingChunk(thinkingChunk.text, thinkingChunk.thinking_millsec);
      }
      if (chunk.type === 'thinking.complete' && callbacks.onThinkingComplete) {
        const thinkingChunk = chunk as ThinkingCompleteChunk;
        callbacks.onThinkingComplete(thinkingChunk.text, thinkingChunk.thinking_millsec);
      }

    } catch (error) {
      console.error('处理流数据块时出错:', error);
      callbacks.onError?.(error);
    }
  };
}
