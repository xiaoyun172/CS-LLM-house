import { AssistantMessageStatus } from '../types/newMessage';
import { EventEmitter, EVENT_NAMES } from './EventEmitter';
import type {
  Chunk,
  TextDeltaChunk,
  TextCompleteChunk,
  ThinkingDeltaChunk,
  ThinkingCompleteChunk,
  ImageCompleteChunk,
  WebSearchCompleteChunk,
  ExternalToolCompleteChunk,
  LLMResponseCompleteChunk,
  BlockCompleteChunk,
  ErrorChunk
} from '../types/chunk';

// 临时类型定义，用于解决类型错误
interface ExternalToolResult {
  id: string;
  name: string;
  result: any;
}

interface WebSearchResponse {
  results: any[];
}

// 扩展的流处理器回调接口
export interface StreamProcessorCallbacks {
  // LLM响应创建
  onLLMResponseCreated?: () => void;
  // 文本内容块接收
  onTextChunk?: (text: string) => void;
  // 完整文本内容接收
  onTextComplete?: (text: string) => void;
  // 思考/推理内容块接收
  onThinkingChunk?: (text: string, thinking_millsec?: number) => void;
  onThinkingComplete?: (text: string, thinking_millsec?: number) => void;
  // 外部工具调用进行中
  onExternalToolInProgress?: () => void;
  // 引用数据接收
  onExternalToolComplete?: (externalToolResult: ExternalToolResult) => void;
  // 网络搜索进行中
  onWebSearchInProgress?: () => void;
  // 网络搜索完成
  onWebSearchComplete?: (webSearchResult: WebSearchResponse) => void;
  // 图片生成块接收
  onImageCreated?: () => void;
  onImageGenerated?: (imageData: any) => void;
  // 处理块过程中发生错误时调用
  onError?: (error: any) => void;
  // 整个流处理完成时调用（成功或失败）
  onComplete?: (status: AssistantMessageStatus, response?: any) => void;
}

// 创建流处理器实例的函数
export function createStreamProcessor(callbacks: StreamProcessorCallbacks = {}) {
  // 返回的函数处理单个数据块或最终信号
  return (chunk: Chunk) => {
    try {
      console.log(`[StreamProcessor] 处理数据块: ${chunk.type}`);

      // 1. 首先处理手动最终信号
      if (chunk.type === 'block_complete') {
        const blockCompleteChunk = chunk as BlockCompleteChunk;
        callbacks.onComplete?.(AssistantMessageStatus.SUCCESS, blockCompleteChunk.response);
        EventEmitter.emit(EVENT_NAMES.STREAM_COMPLETE, {
          status: AssistantMessageStatus.SUCCESS,
          response: blockCompleteChunk.response
        });
        return;
      }

      // 2. 处理实际的数据块
      switch (chunk.type) {
        case 'llm_response_created':
          if (callbacks.onLLMResponseCreated) {
            callbacks.onLLMResponseCreated();
            EventEmitter.emit('stream:llm_response_created');
          }
          break;

        case 'text.delta':
          if (callbacks.onTextChunk) {
            const textDeltaChunk = chunk as TextDeltaChunk;

            // 检查是否是DeepSeek模型的特殊情况
            const isDeepSeekModel = (textDeltaChunk as any).modelProvider === 'deepseek' ||
                                   ((textDeltaChunk as any).modelId && (textDeltaChunk as any).modelId.includes('deepseek'));

            // 检查是否是完整响应
            const isCompleteResponse = (textDeltaChunk as any).isCompleteResponse === true;

            // 检查是否是第一个文本块
            const isFirstChunk = textDeltaChunk.isFirstChunk === true;

            // 记录详细日志
            console.log(`[StreamProcessingService] 收到文本块: 长度=${textDeltaChunk.text.length}, 首块=${isFirstChunk}, 完整响应=${isCompleteResponse}, DeepSeek=${isDeepSeekModel}, 内容=${textDeltaChunk.text.substring(0, 20)}${textDeltaChunk.text.length > 20 ? '...' : ''}`);

            // 直接调用回调函数，与电脑版保持一致
            callbacks.onTextChunk(textDeltaChunk.text);

            // 发送事件，只包含当前文本块，而不是累积内容
            // 这样可以实现累加效果
            EventEmitter.emit(EVENT_NAMES.STREAM_TEXT_DELTA, {
              text: textDeltaChunk.text, // 只发送当前文本块
              isFirstChunk: isFirstChunk,
              isCompleteResponse: isCompleteResponse, // 传递完整响应标记
              isDeepSeekModel: isDeepSeekModel, // 传递模型信息
              messageId: textDeltaChunk.messageId,
              blockId: textDeltaChunk.blockId,
              topicId: textDeltaChunk.topicId,
              // 添加调试信息
              chunkLength: textDeltaChunk.text.length,
              modelProvider: textDeltaChunk.modelProvider,
              modelId: textDeltaChunk.modelId,
              timestamp: Date.now() // 添加时间戳，便于调试
            });

            // 记录首个文本块或完整响应
            if (isFirstChunk || isCompleteResponse) {
              console.log(`[StreamProcessingService] 收到${isFirstChunk ? '第一个文本块' : '完整响应'}，长度:`, textDeltaChunk.text.length);

              // 发送特殊事件，通知UI立即替换占位符
              EventEmitter.emit(EVENT_NAMES.STREAM_TEXT_FIRST_CHUNK, {
                text: textDeltaChunk.text,
                fullContent: textDeltaChunk.text,
                isCompleteResponse: isCompleteResponse,
                isDeepSeekModel: isDeepSeekModel,
                messageId: textDeltaChunk.messageId,
                blockId: textDeltaChunk.blockId,
                topicId: textDeltaChunk.topicId,
                timestamp: Date.now()
              });
            }
          }
          break;

        case 'text.complete':
          if (callbacks.onTextComplete) {
            const textCompleteChunk = chunk as TextCompleteChunk;
            callbacks.onTextComplete(textCompleteChunk.text);
            EventEmitter.emit(EVENT_NAMES.STREAM_TEXT_COMPLETE, { text: textCompleteChunk.text });
          }
          break;

        case 'thinking.delta':
          if (callbacks.onThinkingChunk) {
            const thinkingDeltaChunk = chunk as ThinkingDeltaChunk;
            callbacks.onThinkingChunk(thinkingDeltaChunk.text, thinkingDeltaChunk.thinking_millsec);
            EventEmitter.emit(EVENT_NAMES.STREAM_THINKING_DELTA, {
              text: thinkingDeltaChunk.text,
              thinking_millsec: thinkingDeltaChunk.thinking_millsec
            });
          }
          break;

        case 'thinking.complete':
          if (callbacks.onThinkingComplete) {
            const thinkingCompleteChunk = chunk as ThinkingCompleteChunk;
            callbacks.onThinkingComplete(thinkingCompleteChunk.text, thinkingCompleteChunk.thinking_millsec);
            EventEmitter.emit(EVENT_NAMES.STREAM_THINKING_COMPLETE, {
              text: thinkingCompleteChunk.text,
              thinking_millsec: thinkingCompleteChunk.thinking_millsec
            });
          }
          break;

        case 'externel_tool_in_progress':
          if (callbacks.onExternalToolInProgress) {
            callbacks.onExternalToolInProgress();
            EventEmitter.emit('stream:external_tool_in_progress');
          }
          break;

        case 'externel_tool_complete':
          if (callbacks.onExternalToolComplete) {
            const externalToolCompleteChunk = chunk as ExternalToolCompleteChunk;
            callbacks.onExternalToolComplete(externalToolCompleteChunk.external_tool);
            EventEmitter.emit('stream:external_tool_complete', {
              external_tool: externalToolCompleteChunk.external_tool
            });
          }
          break;

        case 'web_search_in_progress':
          if (callbacks.onWebSearchInProgress) {
            callbacks.onWebSearchInProgress();
            EventEmitter.emit('stream:web_search_in_progress');
          }
          break;

        case 'web_search_complete':
          if (callbacks.onWebSearchComplete) {
            const webSearchCompleteChunk = chunk as WebSearchCompleteChunk;
            callbacks.onWebSearchComplete(webSearchCompleteChunk.web_search);
            EventEmitter.emit('stream:web_search_complete', {
              web_search: webSearchCompleteChunk.web_search
            });
          }
          break;

        case 'image.created':
          if (callbacks.onImageCreated) {
            callbacks.onImageCreated();
            EventEmitter.emit('stream:image_created');
          }
          break;

        case 'image.complete':
          if (callbacks.onImageGenerated) {
            const imageCompleteChunk = chunk as ImageCompleteChunk;
            callbacks.onImageGenerated(imageCompleteChunk.image);
            EventEmitter.emit('stream:image_complete', { image: imageCompleteChunk.image });
          }
          break;

        case 'error':
          if (callbacks.onError) {
            const errorChunk = chunk as ErrorChunk;
            callbacks.onError(errorChunk.error);
            EventEmitter.emit(EVENT_NAMES.STREAM_ERROR, { error: errorChunk.error });
          }
          break;

        case 'llm_response_complete':
          if (callbacks.onComplete) {
            const llmResponseCompleteChunk = chunk as LLMResponseCompleteChunk;
            callbacks.onComplete(AssistantMessageStatus.SUCCESS, llmResponseCompleteChunk.response);
            EventEmitter.emit(EVENT_NAMES.STREAM_COMPLETE, {
              status: AssistantMessageStatus.SUCCESS,
              response: llmResponseCompleteChunk.response
            });
          }
          break;

        default:
          console.log(`[StreamProcessor] 未处理的数据块类型: ${chunk.type}`);
          break;
      }

    } catch (error) {
      console.error('处理流数据块时出错:', error);
      callbacks.onError?.(error);
      EventEmitter.emit(EVENT_NAMES.STREAM_ERROR, { error });
    }
  };
}
