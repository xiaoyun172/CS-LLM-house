/**
 * OpenAI流式响应模块
 * 负责处理流式响应
 * 使用与电脑版一致的for await循环处理流式响应
 */
import { logApiRequest } from '../../services/LoggerService';
import { EventEmitter, EVENT_NAMES } from '../../services/EventEmitter';

/**
 * 流式完成请求
 * @param openai OpenAI客户端实例
 * @param modelId 模型ID
 * @param messages 消息数组
 * @param temperature 温度参数
 * @param maxTokens 最大token数
 * @param onUpdate 更新回调函数
 * @param additionalParams 额外请求参数
 * @returns 响应内容
 */
export async function streamCompletion(
  openai: any, // 使用any类型代替OpenAI类型
  modelId: string,
  messages: any[], // 使用any[]类型代替OpenAI.Chat.ChatCompletionMessageParam[]
  temperature?: number,
  maxTokens?: number,
  onUpdate?: (content: string, reasoning?: string) => void,
  additionalParams?: Record<string, any>
): Promise<string> {
  try {
    // 检查是否包含思考提示
    const hasThinkingPrompt = messages.some(msg =>
      msg.role === 'system' &&
      typeof msg.content === 'string' &&
      (msg.content.includes('thinking') ||
       msg.content.includes('reasoning') ||
       msg.content.includes('思考过程'))
    );

    console.log(`[streamCompletion] 开始流式请求，模型ID: ${modelId}, 是否包含思考提示: ${hasThinkingPrompt}`);

    // 创建流式请求参数
    const streamParams: any = {
      model: modelId,
      messages: messages,
      temperature: temperature,
      max_tokens: maxTokens,
      stream: true,
    };

    // 合并额外参数，但确保必要的参数不被覆盖
    if (additionalParams) {
      // 先删除基本参数以确保它们不会被覆盖
      const { model, messages, stream, ...otherParams } = additionalParams;
      Object.assign(streamParams, otherParams);
    }

    // 不添加任何工具
    console.log('[streamCompletion] 跳过添加思考工具');

    // 记录API请求
    logApiRequest('OpenAI Chat Completions Stream', 'INFO', {
      model: modelId,
      messages: messages.map(m => ({ role: m.role, content: typeof m.content === 'string' ? m.content.substring(0, 50) + '...' : '[complex content]' })),
      temperature,
      max_tokens: maxTokens,
      stream: true,
      ...streamParams
    });

    // 创建流式响应
    const stream = await openai.chat.completions.create(streamParams) as unknown as AsyncIterable<any>;

    // 初始化变量
    let fullContent = '';
    let isFirstChunk = true;

    try {
      // 直接使用for await循环处理流式响应
      for await (const chunk of stream) {
        // 提取delta内容
        const delta = chunk.choices[0]?.delta;
        const content = delta?.content || '';

        // 只处理有内容的delta
        if (content) {
          // 累加内容 - 这是关键步骤
          fullContent += content;

          // 调用回调函数 - 使用完整内容
          if (onUpdate) {
            onUpdate(fullContent);
          }

          // 发送事件通知 - 只包含当前文本块，这样UI层可以自行累加
          EventEmitter.emit(EVENT_NAMES.STREAM_TEXT_DELTA, {
            text: content, // 只发送当前文本块
            isFirstChunk: isFirstChunk,
            chunkLength: content.length,
            fullContentLength: fullContent.length,
            timestamp: Date.now()
          });

          // 处理首个文本块
          if (isFirstChunk && content.trim()) {
            // 发送特殊事件，通知UI立即替换占位符
            EventEmitter.emit(EVENT_NAMES.STREAM_TEXT_FIRST_CHUNK, {
              text: content,
              fullContent: content,
              timestamp: Date.now()
            });

            // 标记为非首次，避免重复触发
            isFirstChunk = false;
          }
        }

        // 处理完成原因
        const finishReason = chunk.choices[0]?.finish_reason;
        if (finishReason) {
          // 发送完成事件
          EventEmitter.emit(EVENT_NAMES.STREAM_TEXT_COMPLETE, {
            text: fullContent,
            timestamp: Date.now()
          });

          break;
        }
      }
    } catch (error) {
      // 发送错误事件
      EventEmitter.emit(EVENT_NAMES.STREAM_ERROR, {
        error,
        timestamp: Date.now()
      });

      throw error;
    }

    return fullContent;
  } catch (error: any) {
    console.error('[streamCompletion] 流式响应处理失败:', error);
    console.error('[streamCompletion] 错误详情:', error.message);

    // 如果是网络错误或API错误，尝试使用非流式响应
    if (error.message.includes('network') || error.message.includes('API')) {
      console.log('[streamCompletion] 流式响应失败，尝试使用非流式响应...');
      try {
        const completion = await openai.chat.completions.create({
          model: modelId,
          messages: messages,
          temperature: temperature,
          max_tokens: maxTokens,
          stream: false,
        });

        const content = completion.choices[0].message.content || '';
        if (onUpdate) {
          onUpdate(content);
        }

        return content;
      } catch (fallbackError) {
        console.error('[streamCompletion] 非流式响应也失败:', fallbackError);
        throw fallbackError;
      }
    }

    throw error;
  }
}
