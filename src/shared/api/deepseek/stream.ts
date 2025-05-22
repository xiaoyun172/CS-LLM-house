/**
 * DeepSeek流式响应处理
 * 专门处理DeepSeek模型的流式响应
 */
import OpenAI from 'openai';
import { EventEmitter, EVENT_NAMES } from '../../services/EventEmitter';
import { OpenAIStreamProcessor } from '../openai/streamProcessor';
import type { Model } from '../../types';
import { isDeepSeekReasoningModel } from '../../utils/modelDetection';

/**
 * 处理DeepSeek流式完成
 * @param client OpenAI客户端
 * @param modelId 模型ID
 * @param messages 消息列表
 * @param temperature 温度
 * @param maxTokens 最大令牌数
 * @param onUpdate 更新回调
 * @param options 选项
 * @returns 响应内容
 */
export async function streamDeepSeekCompletion(
  client: OpenAI,
  modelId: string,
  messages: any[],
  temperature: number = 0.7,
  maxTokens: number = 4096,
  onUpdate: (content: string, reasoning?: string) => void,
  options: any = {}
): Promise<string> {
  console.log(`[streamDeepSeekCompletion] 开始处理DeepSeek流式响应，模型: ${modelId}`);

  // 创建请求参数
  const params: any = {
    model: modelId,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: true,
    ...options
  };

  // 创建模型对象
  const model: Model = {
    id: modelId,
    name: modelId,
    provider: 'deepseek'
  };

  // 是否启用思考过程
  const enableReasoning = isDeepSeekReasoningModel(model) && options.enableReasoning !== false;

  // 创建流式处理器
  const streamProcessor = new OpenAIStreamProcessor({
    model,
    enableReasoning,
    onUpdate
  });

  // 创建流式响应
  const stream = await client.chat.completions.create(params);

  // 创建一个包装器，将流转换为异步迭代器
  // 这是因为OpenAI的流不是标准的AsyncIterable
  const asyncIterable = {
    [Symbol.asyncIterator]: async function* () {
      try {
        // @ts-ignore - 我们知道stream是可迭代的
        for await (const chunk of stream) {
          // 检查是否为完整响应（非增量）
          const isCompleteResponse = chunk.choices[0].message && !chunk.choices[0].delta;

          // 记录每个块的内容，便于调试
          if (isCompleteResponse) {
            console.log(`[streamDeepSeekCompletion] 收到完整响应:`,
              chunk.choices[0].message?.content ?
              `文本: ${chunk.choices[0].message.content.substring(0, 30)}...` :
              chunk.choices[0].message?.reasoning_content ?
              `思考: ${chunk.choices[0].message.reasoning_content.substring(0, 30)}...` :
              '其他类型');
          } else {
            console.log(`[streamDeepSeekCompletion] 收到增量块:`,
              chunk.choices?.[0]?.delta?.content ?
              `文本: ${chunk.choices[0].delta.content.substring(0, 30)}...` :
              chunk.choices?.[0]?.delta?.reasoning_content ?
              `思考: ${chunk.choices[0].delta.reasoning_content.substring(0, 30)}...` :
              '其他类型');
          }

          yield chunk;
        }
      } catch (error) {
        console.error('[streamDeepSeekCompletion] 迭代流时出错:', error);
      }
    }
  };

  // 处理流式响应
  const result = await streamProcessor.processStream(asyncIterable);

  // 发送完成事件
  EventEmitter.emit(EVENT_NAMES.STREAM_COMPLETE, {
    status: 'success',
    response: {
      content: result.content,
      reasoning: result.reasoning,
      reasoningTime: result.reasoningTime
    }
  });

  return result.content;
}

// 注意：处理DeepSeek流式响应中的reasoning_content字段的功能
// 已经集成到openAIChunkToTextDelta函数中，不再需要单独的处理函数
