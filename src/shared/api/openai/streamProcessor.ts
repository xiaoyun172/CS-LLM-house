/**
 * OpenAI流式响应处理器
 * 负责处理OpenAI的流式响应
 */
import {
  asyncGeneratorToReadableStream,
  readableStreamAsyncIterable,
  openAIChunkToTextDelta
} from '../../utils/streamUtils';
import { EventEmitter, EVENT_NAMES } from '../../services/EventEmitter';
import { getAppropriateTag } from '../../config/reasoningTags';
import { extractReasoningMiddleware } from '../../middlewares/extractReasoningMiddleware';
import { createAbortController, isAbortError } from '../../utils/abortController';
import type { Model } from '../../types';

/**
 * OpenAI流式响应块类型
 */
export type OpenAIStreamChunkType =
  | 'reasoning'
  | 'text-delta'
  | 'tool-calls'
  | 'finish';

/**
 * 完整的OpenAI流式响应块
 */
export type CompleteOpenAIStreamChunk =
  | { type: 'text-delta'; textDelta: string }
  | { type: 'reasoning'; textDelta: string }
  | { type: 'tool-calls'; delta: any }
  | { type: 'finish'; finishReason?: string; usage?: any; delta?: any; chunk?: any };

/**
 * OpenAI流式响应处理器选项
 */
export interface OpenAIStreamProcessorOptions {
  model: Model;
  enableReasoning?: boolean;
  onUpdate?: (content: string, reasoning?: string) => void;
  messageId?: string;
  blockId?: string;
  thinkingBlockId?: string;
  topicId?: string;
  abortSignal?: AbortSignal;
}

/**
 * OpenAI流式响应处理器
 * 负责处理OpenAI的流式响应
 */
export class OpenAIStreamProcessor {
  private model: Model;
  private enableReasoning: boolean;
  private onUpdate?: (content: string, reasoning?: string) => void;
  private content: string = '';
  private reasoning: string = '';
  private startTime: number;
  private reasoningStartTime: number = 0;

  // 用于检测和处理DeepSeek流式输出重复问题
  private isDeepSeekProvider: boolean = false;
  private previousCompleteResponse: string = '';

  // 消息和块相关属性
  private messageId?: string;
  private blockId?: string;
  private thinkingBlockId?: string;
  private topicId?: string;

  // AbortController相关属性
  private abortSignal?: AbortSignal;
  private abortController?: AbortController;
  private cleanup?: () => void;

  /**
   * 构造函数
   * @param options 选项
   */
  constructor(options: OpenAIStreamProcessorOptions) {
    this.model = options.model;
    this.enableReasoning = options.enableReasoning ?? true;
    this.onUpdate = options.onUpdate;
    this.messageId = options.messageId;
    this.blockId = options.blockId;
    this.thinkingBlockId = options.thinkingBlockId;
    this.topicId = options.topicId;
    this.abortSignal = options.abortSignal;
    this.startTime = Date.now();

    // 检查是否为DeepSeek提供商
    this.isDeepSeekProvider = this.model.provider === 'deepseek' ||
                           (typeof this.model.id === 'string' && this.model.id.includes('deepseek'));

    // 设置AbortController
    if (this.messageId) {
      const { abortController, cleanup } = createAbortController(this.messageId, true);
      this.abortController = abortController;
      this.cleanup = cleanup;
    }
  }

  /**
   * 处理流式响应
   * @param stream 流式响应
   * @returns 处理结果
   */
  async processStream(stream: AsyncIterable<any>): Promise<{ content: string; reasoning?: string; reasoningTime?: number }> {
    try {
      console.log(`[OpenAIStreamProcessor] 开始处理流式响应，模型: ${this.model.id}`);

      // 检查是否已被中断
      if (this.abortSignal?.aborted || this.abortController?.signal.aborted) {
        throw new DOMException('Operation aborted', 'AbortError');
      }

      // 获取适合模型的推理标签
      const reasoningTag = getAppropriateTag(this.model);

      // 记录开始时间
      this.reasoningStartTime = 0;

      // 检查是否为DeepSeek Reasoner模型
      const isDeepSeekReasoner = this.model.id.includes('deepseek-reasoner') ||
                                (this.model.provider === 'deepseek' && this.model.id.includes('reasoner'));

      // 使用中间件处理流式响应
      const { stream: processedStream } = await extractReasoningMiddleware<CompleteOpenAIStreamChunk>({
        openingTag: reasoningTag.openingTag,
        closingTag: reasoningTag.closingTag,
        separator: reasoningTag.separator,
        enableReasoning: this.enableReasoning,
        // 为DeepSeek Reasoner模型启用特殊处理
        isDeepSeekReasoner: isDeepSeekReasoner
      }).wrapStream({
        doStream: async () => ({
          stream: asyncGeneratorToReadableStream(openAIChunkToTextDelta(stream))
        })
      });

      // 处理处理后的流式响应
      for await (const chunk of readableStreamAsyncIterable(processedStream)) {
        // 检查是否已被中断
        if (this.abortSignal?.aborted || this.abortController?.signal.aborted) {
          console.log('[OpenAIStreamProcessor] 流式响应被中断');
          break;
        }

        await this.handleProcessedChunk(chunk);
      }

      // 记录完成时间
      const completionTime = Date.now() - this.startTime;
      const reasoningTime = this.reasoningStartTime ? (Date.now() - this.reasoningStartTime) : 0;

      // 记录日志
      if (this.reasoning) {
        console.log(`[OpenAIStreamProcessor] 完成响应时间: ${completionTime}ms, 思考过程长度: ${this.reasoning.length}, 思考过程时间: ${reasoningTime}ms`);
      }

      console.log(`[OpenAIStreamProcessor] 完整内容: ${this.content.substring(0, 100) + (this.content.length > 100 ? '...' : '')}`);

      // 返回处理结果
      return {
        content: this.content,
        reasoning: this.reasoning || undefined,
        reasoningTime: this.reasoningStartTime > 0 ? reasoningTime : undefined
      };
    } catch (error) {
      if (isAbortError(error)) {
        console.log('[OpenAIStreamProcessor] 流式响应被用户中断');
        // 返回当前已处理的内容
        return {
          content: this.content,
          reasoning: this.reasoning || undefined,
          reasoningTime: this.reasoningStartTime > 0 ? (Date.now() - this.reasoningStartTime) : undefined
        };
      }
      console.error('[OpenAIStreamProcessor] 处理流式响应失败:', error);
      throw error;
    } finally {
      // 清理AbortController
      if (this.cleanup) {
        this.cleanup();
      }
    }
  }

  /**
   * 处理处理后的流式响应块
   * @param chunk 流式响应块
   */
  private async handleProcessedChunk(chunk: CompleteOpenAIStreamChunk): Promise<void> {
    if (chunk.type === 'text-delta') {
      // 处理文本增量
      if (this.isDeepSeekProvider) {
        // DeepSeek特殊处理：检查是否是完整响应重新发送
        const potentialCompleteResponse = this.content + chunk.textDelta;

        // 如果新内容是之前内容的子集，可能是重复发送
        if (this.previousCompleteResponse &&
            potentialCompleteResponse.length < this.previousCompleteResponse.length &&
            this.previousCompleteResponse.startsWith(potentialCompleteResponse)) {
          // 跳过这个块，可能是重复发送的起始部分
          console.log('[OpenAIStreamProcessor] 跳过疑似重复内容块');
          return;
        }

        this.previousCompleteResponse = potentialCompleteResponse;
      }

      this.content += chunk.textDelta;

      // 通知内容更新
      if (this.onUpdate) {
        this.onUpdate(this.content, this.reasoning);
      }

      // 发送文本增量事件
      EventEmitter.emit(EVENT_NAMES.STREAM_TEXT_DELTA, {
        text: chunk.textDelta,
        isFirstChunk: this.content === chunk.textDelta, // 如果内容等于当前增量，则是第一个块
        messageId: this.messageId,
        blockId: this.blockId,
        topicId: this.topicId
      });

    } else if (chunk.type === 'reasoning') {
      // 处理思考增量
      if (this.reasoningStartTime === 0) {
        this.reasoningStartTime = Date.now();
      }

      this.reasoning += chunk.textDelta;

      // 通知内容更新
      if (this.onUpdate) {
        this.onUpdate(this.content, this.reasoning);
      }

      // 发送思考增量事件
      EventEmitter.emit(EVENT_NAMES.STREAM_THINKING_DELTA, {
        text: chunk.textDelta,
        thinking_millsec: Date.now() - this.reasoningStartTime,
        messageId: this.messageId,
        blockId: this.thinkingBlockId,
        topicId: this.topicId
      });

      // 添加调试日志
      console.log(`[OpenAIStreamProcessor] 发送思考增量事件，长度: ${chunk.textDelta.length}, 思考块ID: ${this.thinkingBlockId || '未设置'}, 消息ID: ${this.messageId || '未设置'}`);


    } else if (chunk.type === 'tool-calls') {
      // 处理工具调用
      if (chunk.delta?.tool_calls) {
        for (const toolCall of chunk.delta.tool_calls) {
          // 只处理思考工具
          if (toolCall.function?.name === 'thinking' && toolCall.function?.arguments) {
            try {
              // 尝试解析参数
              let args;
              try {
                args = JSON.parse(toolCall.function.arguments);
              } catch (e) {
                // 如果不是有效的JSON，尝试直接使用字符串
                args = { thinking: toolCall.function.arguments };
              }

              // 如果有思考内容，添加到推理中
              if (args && args.thinking) {
                if (this.reasoningStartTime === 0) {
                  this.reasoningStartTime = Date.now();
                }

                this.reasoning += args.thinking;

                // 通知内容更新
                if (this.onUpdate) {
                  this.onUpdate(this.content, this.reasoning);
                }

                // 发送思考增量事件
                EventEmitter.emit(EVENT_NAMES.STREAM_THINKING_DELTA, {
                  text: args.thinking,
                  thinking_millsec: Date.now() - this.reasoningStartTime,
                  messageId: this.messageId,
                  blockId: this.thinkingBlockId,
                  topicId: this.topicId
                });
              }
            } catch (error) {
              console.error('[OpenAIStreamProcessor] 处理思考工具参数失败:', error);
            }
          }
        }
      }
    } else if (chunk.type === 'finish') {
      // 处理完成
      // 如果内容为空，但有推理内容，使用推理内容作为回复
      if (this.content.trim() === '' && this.reasoning && this.reasoning.trim() !== '') {
        this.content = this.reasoning;

        // 通知内容更新
        if (this.onUpdate) {
          this.onUpdate(this.content, this.reasoning);
        }
      }

      // 如果有思考内容，发送思考完成事件
      if (this.reasoning) {
        EventEmitter.emit(EVENT_NAMES.STREAM_THINKING_COMPLETE, {
          text: this.reasoning,
          thinking_millsec: this.reasoningStartTime ? (Date.now() - this.reasoningStartTime) : 0,
          messageId: this.messageId,
          blockId: this.thinkingBlockId,
          topicId: this.topicId
        });

        // 添加调试日志
        console.log(`[OpenAIStreamProcessor] 发送思考完成事件，长度: ${this.reasoning.length}, 思考块ID: ${this.thinkingBlockId || '未设置'}, 消息ID: ${this.messageId || '未设置'}`);
      }

      // 发送文本完成事件
      EventEmitter.emit(EVENT_NAMES.STREAM_TEXT_COMPLETE, {
        text: this.content,
        messageId: this.messageId,
        blockId: this.blockId,
        topicId: this.topicId
      });

      // 发送流完成事件
      EventEmitter.emit(EVENT_NAMES.STREAM_COMPLETE, {
        status: 'success',
        response: {
          content: this.content,
          reasoning: this.reasoning,
          reasoningTime: this.reasoningStartTime ? (Date.now() - this.reasoningStartTime) : 0
        }
      });
    }
  }

  /**
   * 获取当前内容
   * @returns 当前内容
   */
  public getContent(): string {
    return this.content;
  }

  /**
   * 获取当前推理内容
   * @returns 当前推理内容
   */
  public getReasoning(): string {
    return this.reasoning;
  }

  /**
   * 设置思考块ID
   * 允许ResponseHandler在创建思考块后更新流处理器中的thinkingBlockId
   * @param blockId 思考块ID
   */
  public setThinkingBlockId(blockId: string): void {
    if (blockId && blockId !== this.thinkingBlockId) {
      console.log(`[OpenAIStreamProcessor] 更新思考块ID: ${blockId}`);
      this.thinkingBlockId = blockId;
    }
  }
}
