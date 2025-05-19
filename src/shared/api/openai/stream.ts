/**
 * OpenAI流式响应模块
 * 负责处理流式响应
 */
// 使用any类型代替OpenAI类型，避免未使用的导入警告
// import OpenAI from 'openai';
import { logApiResponse } from '../../services/LoggerService';

/**
 * 流式完成请求
 * @param openai OpenAI客户端实例
 * @param modelId 模型ID
 * @param messages 消息数组
 * @param temperature 温度参数
 * @param maxTokens 最大token数
 * @param onUpdate 更新回调函数
 * @returns 响应内容
 */
export async function streamCompletion(
  openai: any, // 使用any类型代替OpenAI类型
  modelId: string,
  messages: any[], // 使用any[]类型代替OpenAI.Chat.ChatCompletionMessageParam[]
  temperature?: number,
  maxTokens?: number,
  onUpdate?: (content: string, reasoning?: string) => void
): Promise<string> {
  try {
    const startTime = new Date().getTime();
    let firstTokenTime = 0;
    let reasoningStartTime = 0;

    // 检查是否包含思考提示
    const hasThinkingPrompt = messages.some(msg =>
      msg.role === 'system' &&
      typeof msg.content === 'string' &&
      (msg.content.includes('thinking') ||
       msg.content.includes('reasoning') ||
       msg.content.includes('思考过程'))
    );

    console.log(`开始流式请求，模型ID: ${modelId}, 是否包含思考提示: ${hasThinkingPrompt}`);

    // 创建流式请求参数
    const streamParams: any = {
      model: modelId,
      messages: messages,
      temperature: temperature,
      max_tokens: maxTokens,
      stream: true,
    };

    // 如果模型支持思考提示，添加思考工具
    if (modelId.includes('gpt-4') || modelId.includes('gpt-4o')) {
      // 尝试添加思考工具
      try {
        streamParams.tools = [
          {
            "type": "function",
            "function": {
              "name": "thinking",
              "description": "Display the step-by-step thinking process before answering a question",
              "parameters": {
                "type": "object",
                "properties": {
                  "thinking": {
                    "type": "string",
                    "description": "The step-by-step reasoning process"
                  }
                },
                "required": ["thinking"]
              }
            }
          }
        ];
      } catch (e) {
        console.log('思考工具添加失败，继续处理');
      }
    }

    // 使用any类型代替OpenAI.Chat.ChatCompletionChunk
    const stream = await openai.chat.completions.create(streamParams) as unknown as AsyncIterable<any>;

    let content = '';
    let reasoning = '';
    let isCollectingReasoning = false;

    for await (const chunk of stream) {
      // 记录首个token的时间
      if (content === '' && firstTokenTime === 0) {
        firstTokenTime = new Date().getTime() - startTime;
        console.log(`首个token响应时间: ${firstTokenTime}ms`);
      }

      // 检查是否有reasoning_content字段（DeepSeek Reasoner模型）
      const reasoningContent = chunk.choices[0]?.delta?.reasoning_content;
      if (reasoningContent !== undefined) {
        // 记录思考开始时间
        if (!reasoningStartTime) {
          reasoningStartTime = new Date().getTime();
          console.log('[思考过程] 开始接收reasoning_content思考过程');
        }

        // 收集思考过程
        reasoning += reasoningContent;

        // 通知思考过程更新
        if (onUpdate) {
          try {
            // 使用类似电脑版的方法，创建一个类型化的对象
            const reasoningChunk = {
              type: 'reasoning',
              content: content,
              reasoning: reasoning
            };
            onUpdate(reasoningChunk.content, reasoningChunk.reasoning);
          } catch (e) {
            console.error('更新思考过程时出错:', e);
            // 降级处理：只发送内容
            onUpdate(content, '');
          }
        }

        continue; // 跳过后续处理
      }

      // 检查工具调用
      const toolCalls = chunk.choices[0]?.delta?.tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        // 检查是否是思考工具调用
        const toolCall = toolCalls[0];
        if (toolCall.function?.name === 'thinking') {
          try {
            // 记录思考开始时间
            if (!reasoningStartTime) {
              reasoningStartTime = new Date().getTime();
              console.log('[思考过程] 开始接收思考过程');
            }

            // 提取思考过程
            if (toolCall.function?.arguments) {
              const argumentsPart = toolCall.function.arguments;
              try {
                const parsedArgs = JSON.parse(argumentsPart);
                if (parsedArgs.thinking) {
                  reasoning += parsedArgs.thinking;

                  // 通知思考过程更新
                  if (onUpdate) {
                    try {
                      // 使用类似电脑版的方法，创建一个类型化的对象
                      const reasoningChunk = {
                        type: 'reasoning',
                        content: content,
                        reasoning: reasoning
                      };
                      onUpdate(reasoningChunk.content, reasoningChunk.reasoning);
                    } catch (e) {
                      console.error('更新思考过程时出错:', e);
                      // 降级处理：只发送内容
                      onUpdate(content, '');
                    }
                  }
                }
              } catch (e) {
                // 如果JSON解析失败，直接添加到思考过程
                reasoning += argumentsPart;
                if (onUpdate) {
                  try {
                    // 使用类似电脑版的方法，创建一个类型化的对象
                    const reasoningChunk = {
                      type: 'reasoning',
                      content: content,
                      reasoning: reasoning
                    };
                    onUpdate(reasoningChunk.content, reasoningChunk.reasoning);
                  } catch (e) {
                    console.error('更新思考过程时出错:', e);
                    // 降级处理：只发送内容
                    onUpdate(content, '');
                  }
                }
              }
            }
          } catch (e) {
            console.error('解析思考工具调用失败', e);
          }
          continue;
        }
      }

      // 提取内容
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        // 检查是否是思考过程
        if (delta.includes('<thinking>') || delta.includes('<reasoning>')) {
          isCollectingReasoning = true;
          if (!reasoningStartTime) {
            reasoningStartTime = new Date().getTime();
            console.log('[思考过程] 收到思考过程开始标记');
          }

          // 立即触发UI更新以显示思考过程开始
          if (onUpdate) {
            try {
              // 使用类似电脑版的方法，创建一个类型化的对象
              const reasoningChunk = {
                type: 'reasoning',
                content: content,
                reasoning: reasoning + delta
              };
              onUpdate(reasoningChunk.content, reasoningChunk.reasoning);
            } catch (e) {
              console.error('更新思考过程时出错:', e);
              // 降级处理：只发送内容
              onUpdate(content, '');
            }
          }
        }

        // 检查是否是思考过程结束
        if (delta.includes('</thinking>') || delta.includes('</reasoning>')) {
          isCollectingReasoning = false;

          // 思考过程结束时也立即触发更新
          if (onUpdate) {
            try {
              // 使用类似电脑版的方法，创建一个类型化的对象
              const reasoningChunk = {
                type: 'reasoning',
                content: content,
                reasoning: reasoning + delta
              };
              onUpdate(reasoningChunk.content, reasoningChunk.reasoning);
            } catch (e) {
              console.error('更新思考过程时出错:', e);
              // 降级处理：只发送内容
              onUpdate(content, '');
            }
          }
        }

        // 根据当前状态收集内容
        if (isCollectingReasoning) {
          // 收集思考过程
          reasoning += delta;

          // 每次收到思考过程内容都立即触发更新
          if (onUpdate) {
            try {
              // 使用类似电脑版的方法，创建一个类型化的对象
              const reasoningChunk = {
                type: 'reasoning',
                content: content,
                reasoning: reasoning
              };
              onUpdate(reasoningChunk.content, reasoningChunk.reasoning);
            } catch (e) {
              console.error('更新思考过程时出错:', e);
              // 降级处理：只发送内容
              onUpdate(content, '');
            }
          }
        } else {
          // 普通内容收集
          content += delta;

          // 普通内容更新
          if (onUpdate) {
            try {
              // 使用类似电脑版的方法，创建一个类型化的对象
              const textChunk = {
                type: 'text-delta',
                content: content,
                reasoning: reasoning
              };
              onUpdate(textChunk.content, textChunk.reasoning);
            } catch (e) {
              console.error('更新思考过程时出错:', e);
              // 降级处理：只发送内容
              onUpdate(content, '');
            }
          }
        }
      }
    }

    const completionTime = new Date().getTime() - startTime;
    const reasoningTime = reasoningStartTime ? (new Date().getTime() - reasoningStartTime) : 0;

    if (reasoning) {
      console.log(`[API流式响应] 完成响应时间: ${completionTime}ms, 思考过程长度: ${reasoning.length}, 思考过程时间: ${reasoningTime}ms`);
    }

    console.log(`[API流式响应] 完整内容: ${content.substring(0, 100) + (content.length > 100 ? '...' : '')}`);

    // 记录API响应
    logApiResponse('OpenAI Chat Completions Stream', 200, {
      model: modelId,
      content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
      totalLength: content.length,
      reasoning: reasoning ? `${reasoning.substring(0, 100)}... (${reasoning.length} chars)` : 'none',
      reasoningTime,
      completionTimeMs: completionTime
    });

    // 如果包含思考过程，在完成时再次调用
    if (reasoning && onUpdate) {
      try {
        // 使用类似电脑版的方法，创建一个类型化的对象
        const completeChunk = {
          type: 'finish',
          content: content,
          reasoning: reasoning,
          reasoningTime: reasoningTime
        };
        onUpdate(completeChunk.content, completeChunk.reasoning);
      } catch (e) {
        console.error('最终更新思考过程时出错:', e);
        // 降级处理：只发送内容
        onUpdate(content, '');
      }
    }

    // 返回包含思考过程的内容
    return content;
  } catch (error: any) {
    console.error('流式响应处理失败:', error);
    console.error('错误详情:', error.message);

    // 如果是网络错误或API错误，尝试使用非流式响应
    if (error.message.includes('network') || error.message.includes('API')) {
      console.log('流式响应失败，尝试使用非流式响应...');
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
        console.error('非流式响应也失败:', fallbackError);
        throw fallbackError;
      }
    }

    throw error;
  }
}
