/**
 * OpenAI流式响应模块
 * 负责处理流式响应
 * 使用与最佳实例一致的for await循环处理流式响应
 */
import { logApiRequest } from '../../services/LoggerService';
import { EventEmitter, EVENT_NAMES } from '../../services/EventEmitter';
import { hasToolUseTags } from '../../utils/mcpToolParser';

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
): Promise<string | { content: string; reasoning?: string; reasoningTime?: number }> {
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
      // 先删除基本参数和内部参数以确保它们不会被覆盖
      const {
        model,
        messages,
        stream,
        enableTools,
        mcpTools,
        enableReasoning,
        signal,
        ...otherParams
      } = additionalParams;
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

    // 获取中断信号
    const signal = additionalParams?.signal;

    // 创建流式响应，支持中断
    const stream = await openai.chat.completions.create({
      ...streamParams,
      signal // 添加中断信号支持
    }) as unknown as AsyncIterable<any>;

    // 初始化变量
    let fullContent = '';
    let fullReasoning = '';
    let previousReasoningLength = 0; // 记录上次推理内容的长度，用于计算增量
    let hasReasoningContent = false;
    let reasoningStartTime = 0;
    let reasoningEndTime = 0;
    let isFirstChunk = true;

    // 检查是否启用推理
    const enableReasoning = additionalParams?.enableReasoning !== false;

    try {
      // 直接使用for await循环处理流式响应
      for await (const chunk of stream) {
        // 检查是否已被中断
        if (signal?.aborted) {
          console.log('[streamCompletion] 检测到中断信号，停止处理流式响应');
          break;
        }

        // 提取delta内容
        const delta = chunk.choices[0]?.delta;
        const content = delta?.content || '';
        // 支持多种推理内容字段：reasoning（OpenAI）、reasoning_content（Grok、DeepSeek）
        const reasoning = delta?.reasoning || delta?.reasoning_content || '';

        // 处理推理内容
        if (reasoning && reasoning.trim() && enableReasoning) {
          if (!hasReasoningContent) {
            hasReasoningContent = true;
            reasoningStartTime = Date.now();
            console.log('[streamCompletion] 开始接收推理内容');
          }
          fullReasoning += reasoning;

          // 计算推理内容的增量
          const reasoningDelta = fullReasoning.slice(previousReasoningLength);
          previousReasoningLength = fullReasoning.length;

          console.log(`[streamCompletion] 推理增量: "${reasoningDelta}", 总长度: ${fullReasoning.length}`);

          // 如果有推理增量，单独调用回调传递推理内容
          if (reasoningDelta && onUpdate) {
            onUpdate('', reasoningDelta); // 只传递推理增量，内容为空
          }
        }

        // 处理普通内容
        if (content && content.trim()) {
          // 如果有推理内容且刚结束，记录结束时间
          if (hasReasoningContent && !reasoning && reasoningEndTime === 0) {
            reasoningEndTime = Date.now();
          }

          // 累加内容 - 这是关键步骤
          fullContent += content;
          console.log(`[streamCompletion] 累积内容，当前增量: ${content.length}, 总长度: ${fullContent.length}`);

          // 调用回调函数 - 只传递内容增量，不传递推理内容（推理内容已经单独处理）
          if (onUpdate) {
            onUpdate(content); // 只传递当前内容增量
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
          // 如果有推理内容但还没记录结束时间，现在记录
          if (hasReasoningContent && reasoningEndTime === 0) {
            reasoningEndTime = Date.now();
          }

          // 发送完成事件
          EventEmitter.emit(EVENT_NAMES.STREAM_TEXT_COMPLETE, {
            text: fullContent,
            reasoning: fullReasoning || undefined,
            reasoningTime: hasReasoningContent ? reasoningEndTime - reasoningStartTime : undefined,
            timestamp: Date.now()
          });

          break;
        }
      }
    } catch (error: any) {
      // 检查是否为中断错误
      if (signal?.aborted || error?.name === 'AbortError' || error?.message?.includes('aborted')) {
        console.log('[streamCompletion] 流式响应被中断，返回当前内容');

        // 在内容末尾添加中断警告（这里只是标记，实际警告在 ResponseHandler 中添加）
        // 这样可以让上层知道这是被中断的响应

        // 发送完成事件而不是错误事件
        EventEmitter.emit(EVENT_NAMES.STREAM_TEXT_COMPLETE, {
          text: fullContent,
          reasoning: fullReasoning || undefined,
          reasoningTime: hasReasoningContent ? reasoningEndTime - reasoningStartTime : undefined,
          timestamp: Date.now(),
          interrupted: true // 标记为被中断
        });

        // 返回当前已处理的内容，并标记为被中断
        if (hasReasoningContent && fullReasoning) {
          const reasoningTime = reasoningEndTime > reasoningStartTime ? reasoningEndTime - reasoningStartTime : 0;
          return {
            content: fullContent,
            reasoning: fullReasoning,
            reasoningTime,
            interrupted: true
          };
        }
        return {
          content: fullContent,
          interrupted: true
        };
      }

      // 发送错误事件
      EventEmitter.emit(EVENT_NAMES.STREAM_ERROR, {
        error,
        timestamp: Date.now()
      });

      throw error;
    }

    // 检查是否需要处理工具调用
    const enableTools = additionalParams?.enableTools;
    const mcpTools = additionalParams?.mcpTools;

    if (enableTools && mcpTools && mcpTools.length > 0 && fullContent) {
      console.log(`[streamCompletion] 检查工具调用 - 内容长度: ${fullContent.length}, 工具数量: ${mcpTools.length}`);
      console.log(`[streamCompletion] 内容预览: ${fullContent.substring(0, 200)}...`);

      // 使用静态导入的工具解析函数

      // 检查是否包含工具调用
      const hasTools = hasToolUseTags(fullContent, mcpTools);
      console.log(`[streamCompletion] 工具调用检测结果: ${hasTools}`);

      if (hasTools) {
        console.log(`[streamCompletion] 检测到工具调用，需要重新发起请求`);

        // 这里我们需要触发工具调用处理
        // 但由于 streamCompletion 是底层函数，我们只能返回特殊标记
        // 让上层的 Provider 处理工具调用
        return {
          content: fullContent,
          reasoning: fullReasoning,
          reasoningTime: hasReasoningContent && fullReasoning ? (reasoningEndTime > reasoningStartTime ? reasoningEndTime - reasoningStartTime : 0) : undefined,
          hasToolCalls: true
        } as any;
      } else {
        console.log(`[streamCompletion] 未检测到工具调用`);
      }
    }

    // 返回结果 - 如果有推理内容，返回对象；否则返回字符串
    if (hasReasoningContent && fullReasoning) {
      const reasoningTime = reasoningEndTime > reasoningStartTime ? reasoningEndTime - reasoningStartTime : 0;
      return {
        content: fullContent,
        reasoning: fullReasoning,
        reasoningTime
      };
    }

    return fullContent;
  } catch (error: any) {
    console.error('[streamCompletion] 流式响应处理失败:', error);
    console.error('[streamCompletion] 错误详情:', error.message);

    // 直接抛出错误，不进行重试 - 与最佳实例保持一致
    throw error;
  }
}
