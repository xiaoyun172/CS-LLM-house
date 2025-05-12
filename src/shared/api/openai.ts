import type { Message, Model } from '../types';
import OpenAI from 'openai';
import { logApiRequest, logApiResponse } from '../services/LoggerService';

// 转换消息格式
const convertToOpenAIMessages = (messages: Message[]): Array<OpenAI.Chat.ChatCompletionUserMessageParam | OpenAI.Chat.ChatCompletionAssistantMessageParam | OpenAI.Chat.ChatCompletionSystemMessageParam> => {
  return messages.map(msg => {
    if (msg.role === 'user') {
      return {
        role: 'user',
        content: msg.content,
      } as OpenAI.Chat.ChatCompletionUserMessageParam;
    } else if (msg.role === 'assistant') {
      return {
        role: 'assistant',
        content: msg.content,
      } as OpenAI.Chat.ChatCompletionAssistantMessageParam;
    } else {
      return {
        role: 'system',
        content: msg.content,
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

    // 检查API密钥是否设置
    if (!apiKey) {
      console.error('API密钥未设置:', { model });
      throw new Error('API密钥未设置');
    }

    console.log(`[OpenAI API] 使用配置:`, { 
      baseUrl, 
      modelId, 
      hasApiKey: !!apiKey, 
      providerType: (model as any).providerType 
    });

    // 创建OpenAI客户端实例
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: baseUrl,
      dangerouslyAllowBrowser: true, // 允许在浏览器环境中使用
    });

    // 过滤掉空消息
    const filteredMessages = messages.filter(msg => msg.content.trim() !== '');

    // 打印消息历史，用于调试
    console.log('[API请求] 原始消息列表:', filteredMessages.map(m => ({
      role: m.role,
      content: m.content.substring(0, 20) + (m.content.length > 20 ? '...' : ''),
      timestamp: m.timestamp
    })));

    // 转换消息格式
    const openaiMessages = convertToOpenAIMessages(filteredMessages);

    // 添加系统消息 - 仅当没有用户消息时才添加
    if (openaiMessages.length === 0) {
      openaiMessages.push({
        role: 'system',
        content: '你是Cherry Studio的AI助手，一个有用、友好的助手。',
      });
    } else if (!openaiMessages.some(msg => msg.role === 'system')) {
      // 如果有消息但没有系统消息，添加系统消息到最前面
      openaiMessages.unshift({
        role: 'system',
        content: '你是Cherry Studio的AI助手，一个有用、友好的助手。',
      });
    }

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
  onUpdate?: (content: string) => void
): Promise<string> => {
  try {
    const startTime = new Date().getTime();
    let firstTokenTime = 0;

    console.log(`开始流式请求，模型ID: ${modelId}`);

    const stream = await openai.chat.completions.create({
      model: modelId,
      messages: messages,
      temperature: temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    let content = '';

    for await (const chunk of stream) {
      // 记录首个token的时间
      if (content === '' && firstTokenTime === 0) {
        firstTokenTime = new Date().getTime() - startTime;
        console.log(`首个token响应时间: ${firstTokenTime}ms`);
      }

      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        content += delta;
        if (onUpdate) {
          onUpdate(content);
        }
      }
    }

    const completionTime = new Date().getTime() - startTime;
    console.log(`[API流式响应] 完成响应时间: ${completionTime}ms`);
    console.log('[API流式响应] 完整内容:', {
      model: modelId,
      content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
      totalLength: content.length,
      completionTimeMs: completionTime
    });

    // 记录API响应
    logApiResponse('OpenAI Chat Completions Stream', 200, {
      model: modelId,
      content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
      totalLength: content.length,
      completionTimeMs: completionTime
    });

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
