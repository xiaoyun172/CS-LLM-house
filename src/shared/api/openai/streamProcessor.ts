/**
 * OpenAI流式响应处理器
 * 负责处理OpenAI的流式响应
 */
import {
  asyncGeneratorToReadableStream,
  readableStreamAsyncIterable,
  openAIChunkToTextDelta
} from '../../utils/streamUtils';
import { getAppropriateTag } from '../../config/reasoningTags';
import { extractReasoningMiddleware } from '../../middlewares/extractReasoningMiddleware';
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

  /**
   * 构造函数
   * @param options 选项
   */
  constructor(options: OpenAIStreamProcessorOptions) {
    this.model = options.model;
    this.enableReasoning = options.enableReasoning ?? true;
    this.onUpdate = options.onUpdate;
    this.startTime = Date.now();
  }

  /**
   * 处理流式响应
   * @param stream 流式响应
   * @returns 处理结果
   */
  async processStream(stream: AsyncIterable<any>): Promise<{ content: string; reasoning?: string; reasoningTime?: number }> {
    try {
      console.log(`[OpenAIStreamProcessor] 开始处理流式响应，模型: ${this.model.id}`);

      // 获取适合模型的推理标签
      const reasoningTag = getAppropriateTag(this.model);

      // 记录开始时间
      this.reasoningStartTime = 0;

      // 使用中间件处理流式响应
      const { stream: processedStream } = await extractReasoningMiddleware<CompleteOpenAIStreamChunk>({
        openingTag: reasoningTag.openingTag,
        closingTag: reasoningTag.closingTag,
        separator: reasoningTag.separator,
        enableReasoning: this.enableReasoning
      }).wrapStream({
        doStream: async () => ({
          stream: asyncGeneratorToReadableStream(openAIChunkToTextDelta(stream))
        })
      });

      // 处理处理后的流式响应
      for await (const chunk of readableStreamAsyncIterable(processedStream)) {
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
      console.error('[OpenAIStreamProcessor] 处理流式响应失败:', error);
      throw error;
    }
  }



  /**
   * 处理处理后的流式响应块
   * @param chunk 流式响应块
   */
  private async handleProcessedChunk(chunk: CompleteOpenAIStreamChunk): Promise<void> {
    if (chunk.type === 'text-delta') {
      // 处理文本增量
      this.content += chunk.textDelta;

      // 通知内容更新
      if (this.onUpdate) {
        this.onUpdate(this.content, this.reasoning);
      }
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
    }
  }
}
