import type { Message, Model, ImageContent } from '../types';
import OpenAI from 'openai';
import { logApiRequest, logApiResponse } from '../services/LoggerService';

// OpenAI消息内容项类型
interface MessageContentItem {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

// 转换消息格式，支持图片
const convertToOpenAIMessages = (messages: Message[]): Array<OpenAI.Chat.ChatCompletionMessageParam> => {
  return messages.map(msg => {
    // 检查消息是否包含图片 - 支持两种图片格式
    const isComplexContent = typeof msg.content === 'object';
    const hasDirectImages = Array.isArray(msg.images) && msg.images.length > 0;
    
    // 添加调试日志
    console.log(`[OpenAI API] 处理消息类型: ${msg.role}, 复杂内容: ${isComplexContent}, 直接图片: ${hasDirectImages}`);
    
    if (msg.role === 'user') {
      // 用户消息处理
      // 如果包含任意形式的图片，使用内容数组格式
      if (isComplexContent || hasDirectImages) {
        // 准备内容数组
        const contentArray: MessageContentItem[] = [];
        
        // 添加文本内容（如果有）
        const textContent = isComplexContent 
          ? (msg.content as {text?: string}).text || ''
          : typeof msg.content === 'string' ? msg.content : '';
          
        if (textContent) {
          contentArray.push({
            type: 'text',
            text: textContent
          });
        }
        
        // 添加内容里的图片（旧格式）
        if (isComplexContent) {
          const content = msg.content as {text?: string; images?: ImageContent[]};
          if (content.images && content.images.length > 0) {
            console.log(`[OpenAI API] 处理旧格式图片，数量: ${content.images.length}`);
            content.images.forEach((image, index) => {
              if (image.base64Data) {
                contentArray.push({
                  type: 'image_url',
                  image_url: {
                    url: image.base64Data // 已经包含完整的data:image/格式
                  }
                });
                console.log(`[OpenAI API] 添加base64图片 ${index+1}, 开头: ${image.base64Data.substring(0, 30)}...`);
              } else if (image.url) {
                contentArray.push({
                  type: 'image_url',
                  image_url: {
                    url: image.url
                  }
                });
                console.log(`[OpenAI API] 添加URL图片 ${index+1}: ${image.url}`);
              }
            });
          }
        }
        
        // 添加直接附加的图片（新格式）
        if (hasDirectImages) {
          console.log(`[OpenAI API] 处理新格式图片，数量: ${msg.images!.length}`);
          msg.images!.forEach((imgFormat, index) => {
            if (imgFormat.image_url && imgFormat.image_url.url) {
              contentArray.push({
                type: 'image_url',
                image_url: {
                  url: imgFormat.image_url.url
                }
              });
              console.log(`[OpenAI API] 添加新格式图片 ${index+1}: ${imgFormat.image_url.url.substring(0, 30)}...`);
            }
          });
        }
        
        console.log(`[OpenAI API] 转换后内容数组长度: ${contentArray.length}, 包含图片数量: ${contentArray.filter(item => item.type === 'image_url').length}`);
        
        // 处理空内容的极端情况
        if (contentArray.length === 0) {
          console.warn('[OpenAI API] 警告: 生成了空内容数组，添加默认文本');
          contentArray.push({
            type: 'text',
            text: '图片'
          });
        }
        
        return {
          role: 'user',
          content: contentArray
        } as OpenAI.Chat.ChatCompletionUserMessageParam;
      } else {
        // 纯文本消息
        return {
          role: 'user',
          content: typeof msg.content === 'string' ? msg.content : (msg.content as {text?: string}).text || '',
        } as OpenAI.Chat.ChatCompletionUserMessageParam;
      }
    } else if (msg.role === 'assistant') {
      return {
        role: 'assistant',
        content: typeof msg.content === 'string' ? msg.content : (msg.content as {text?: string}).text || '',
      } as OpenAI.Chat.ChatCompletionAssistantMessageParam;
    } else {
      return {
        role: 'system',
        content: typeof msg.content === 'string' ? msg.content : (msg.content as {text?: string}).text || '',
      } as OpenAI.Chat.ChatCompletionSystemMessageParam;
    }
  });
};

// 发送聊天请求
export const sendChatRequest = async (
  messages: Message[],
  model: Model,
  onUpdate?: (content: string) => void
): Promise<string> => {
  try {
    // 直接从模型对象获取apiKey和baseUrl
    const apiKey = model.apiKey;
    const baseUrl = model.baseUrl || 'https://api.openai.com/v1';
    const modelId = model.id; // 使用模型ID而不是名称
    
    // 检查是否支持多模态
    const supportsMultimodal = model.capabilities?.multimodal || 
      modelId.includes('gpt-4') || modelId.includes('gpt-4o') || 
      modelId.includes('vision') || 
      modelId.includes('gemini') || // 添加Gemini支持
      modelId.includes('claude-3'); // 添加Claude支持

    // 检查API密钥是否设置
    if (!apiKey) {
      console.error('API密钥未设置:', { model });
      throw new Error('API密钥未设置');
    }

    console.log(`[OpenAI API] 使用配置:`, { 
      baseUrl, 
      modelId, 
      hasApiKey: !!apiKey, 
      providerType: (model as any).providerType,
      supportsMultimodal
    });

    // 创建OpenAI客户端实例
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: baseUrl,
      dangerouslyAllowBrowser: true, // 允许在浏览器环境中使用
    });

    // 过滤掉空消息
    const filteredMessages = messages.filter(msg => {
      if (typeof msg.content === 'string') {
        return msg.content.trim() !== '';
      } else {
        // 对于复杂消息，检查是否有文本或图片
        const content = msg.content as {text?: string; images?: ImageContent[]};
        return content.text?.trim() !== '' || (content.images && content.images.length > 0);
      }
    });

    // 检查图片类型
    const hasDirectImages = filteredMessages.some(msg => 
      Array.isArray(msg.images) && msg.images.length > 0
    );
    
    const hasContentImages = filteredMessages.some(msg => {
      if (typeof msg.content !== 'object') return false;
      const content = msg.content as {images?: ImageContent[]};
      return Array.isArray(content.images) && content.images.length > 0;
    });
    
    console.log(`[OpenAI API] 消息中图片检测: 直接图片: ${hasDirectImages}, 内容图片: ${hasContentImages}`);
    
    // 转换消息格式
    const openaiMessages = convertToOpenAIMessages(filteredMessages);

    // 如果消息列表为空，确保有一个默认用户消息
    if (openaiMessages.length === 0) {
      openaiMessages.push({
        role: 'user',
        content: '你好'
      });
    }

    // 检查是否包含图片但模型不支持
    const hasImages = openaiMessages.some(msg => 
      Array.isArray(msg.content) && 
      msg.content.some((item: any) => item.type === 'image_url')
    );
    
    if (hasImages) {
      // 详细记录所有图片信息，帮助调试
      console.log('[OpenAI API] 发现图片内容，详细信息:');
      openaiMessages.forEach((msg, i) => {
        if (Array.isArray(msg.content)) {
          const imageItems = msg.content.filter((item: any) => item.type === 'image_url');
          if (imageItems.length > 0) {
            console.log(`[OpenAI API] 消息 #${i+1} 包含 ${imageItems.length} 张图片:`);
            imageItems.forEach((item: any, idx: number) => {
              if (item.image_url && item.image_url.url) {
                console.log(`[OpenAI API]   图片 #${idx+1} URL: ${item.image_url.url.substring(0, 50)}...`);
              } else {
                console.log(`[OpenAI API]   图片 #${idx+1} 格式异常，缺少URL`);
              }
            });
          }
        }
      });
      
      if (!supportsMultimodal) {
        console.warn('[API请求] 警告: 消息包含图片，但模型不支持多模态');
        throw new Error('当前模型不支持图片分析，请选择支持多模态的模型，如GPT-4V或Gemini');
      }
    }

    // 打印消息历史，用于调试
    console.log('[API请求] 原始消息列表:', filteredMessages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' 
        ? m.content.substring(0, 20) + (m.content.length > 20 ? '...' : '')
        : '复杂内容（包含图片）',
      timestamp: m.timestamp,
      hasImages: Array.isArray(m.images) && m.images.length > 0
    })));

    // 打印详细的消息列表用于调试
    console.log('[API请求] 最终发送的消息列表:', openaiMessages.map(m => ({
      role: m.role,
      contentType: typeof m.content === 'string' ? 'string' : 'array',
      content: typeof m.content === 'string' 
        ? (m.content.substring(0, 30) + (m.content.length > 30 ? '...' : ''))
        : '[复杂内容]',
      imagesCount: Array.isArray(m.content) 
        ? m.content.filter((c: any) => c.type === 'image_url').length 
        : 0
    })));

    // 确保至少有一条用户消息
    if (!openaiMessages.some(msg => msg.role === 'user')) {
      console.warn('[API请求] 警告: 没有用户消息，API可能返回错误');
    }

    console.log(`[API请求] 使用OpenAI API发送请求，模型ID: ${modelId}，提供商: ${model.provider}`);
    console.log('[API请求] 消息数量:', openaiMessages.length);

    // 记录API请求
    logApiRequest('OpenAI Chat Completions', 'INFO', {
      method: 'POST',
      model: modelId,
      temperature: model.temperature,
      max_tokens: model.maxTokens,
      messages: openaiMessages.map(m => ({
        role: m.role,
        content: typeof m.content === 'string'
          ? (m.content.substring(0, 50) + (m.content.length > 50 ? '...' : ''))
          : '[复杂内容]'
      }))
    });

    // 如果提供了onUpdate回调，使用流式响应
    if (onUpdate) {
      return await streamCompletion(openai, modelId, openaiMessages, model.temperature, model.maxTokens, onUpdate);
    } else {
      // 否则使用普通响应
      try {
        const completion = await openai.chat.completions.create({
          model: modelId,
          messages: openaiMessages,
          temperature: model.temperature,
          max_tokens: model.maxTokens,
        });

        const responseContent = completion.choices[0].message.content || '';
        console.log('[API响应] 成功接收响应:', {
          model: modelId,
          content: responseContent.substring(0, 100) + (responseContent.length > 100 ? '...' : ''),
          usage: completion.usage
        });

        // 记录API响应
        logApiResponse('OpenAI Chat Completions', 200, {
          model: modelId,
          content: responseContent.substring(0, 100) + (responseContent.length > 100 ? '...' : ''),
          usage: completion.usage
        });

        return responseContent;
      } catch (error: any) {
        console.error('[API错误] OpenAI API请求失败:', error);
        console.error('[API错误] 详细信息:', {
          message: error.message,
          code: error.code,
          status: error.status,
          type: error.type,
          param: error.param,
          modelId,
          provider: model.provider
        });

        throw error;
      }
    }
  } catch (error) {
    console.error('[API错误] OpenAI API请求失败:', error);
    console.error('[API错误] 详细信息:', {
      message: error instanceof Error ? error.message : '未知错误',
      model: model.id,
      provider: model.provider
    });
    throw error;
  }
};

// 流式响应处理
const streamCompletion = async (
  openai: OpenAI,
  modelId: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  temperature?: number,
  maxTokens?: number,
  onUpdate?: (content: string, reasoning?: string) => void
): Promise<string> => {
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

    const stream = await openai.chat.completions.create(streamParams) as unknown as AsyncIterable<OpenAI.Chat.ChatCompletionChunk>;

    let content = '';
    let reasoning = '';
    let isCollectingReasoning = false;

    for await (const chunk of stream) {
      // 记录首个token的时间
      if (content === '' && firstTokenTime === 0) {
        firstTokenTime = new Date().getTime() - startTime;
        console.log(`首个token响应时间: ${firstTokenTime}ms`);
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
                    onUpdate(content, reasoning);
                  }
                }
              } catch (e) {
                // 如果JSON解析失败，直接添加到思考过程
                reasoning += argumentsPart;
                if (onUpdate) {
                  onUpdate(content, reasoning);
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
        }
        
        // 检查是否是思考过程结束
        if (delta.includes('</thinking>') || delta.includes('</reasoning>')) {
          isCollectingReasoning = false;
        }
        
        // 根据当前状态收集内容
        if (isCollectingReasoning) {
          // 收集思考过程
          reasoning += delta;
          // 不添加到最终内容
        } else {
          // 普通内容收集
          content += delta;
        }
        
        // 无条件通知更新
        if (onUpdate) {
          onUpdate(content, reasoning);
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
      onUpdate(content, reasoning);
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
};

// 测试API连接
export const testConnection = async (model: Model): Promise<boolean> => {
  try {
    const apiKey = model.apiKey;
    const baseUrl = model.baseUrl || 'https://api.openai.com/v1';
    const modelId = model.name;

    if (!apiKey) {
      throw new Error('API密钥未设置');
    }

    // 创建OpenAI客户端实例
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: baseUrl,
      dangerouslyAllowBrowser: true, // 允许在浏览器环境中使用
    });

    // 发送简单的测试请求
    const response = await openai.chat.completions.create({
      model: modelId,
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 5,
    });

    return Boolean(response.choices[0].message);
  } catch (error) {
    console.error('OpenAI API连接测试失败:', error);
    return false;
  }
};
