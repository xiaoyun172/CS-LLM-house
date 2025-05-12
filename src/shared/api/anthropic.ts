import type { Message, Model } from '../types';
import { logApiRequest, logApiResponse } from '../services/LoggerService';

// Anthropic API接口
interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicCompletionRequest {
  model: string;
  messages: AnthropicMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  system?: string;
}

interface AnthropicCompletionResponse {
  id: string;
  type: string;
  model: string;
  content: {
    type: string;
    text: string;
  }[];
}

// 转换消息格式
const convertToAnthropicMessages = (messages: Message[]): AnthropicMessage[] => {
  return messages.map(msg => ({
    role: msg.role,
    content: msg.content,
  }));
};

// 发送聊天请求
export const sendChatRequest = async (
  messages: Message[],
  model: Model,
  onUpdate?: (content: string) => void
): Promise<string> => {
  try {
    const apiKey = model.apiKey;
    const baseUrl = model.baseUrl || 'https://api.anthropic.com/v1';

    // 直接使用模型名称
    const modelName = model.name;

    console.log(`[API请求] 使用Anthropic API，模型名称: ${modelName}，ID: ${model.id}`);

    // 记录模型信息，用于调试
    console.log('[API请求] 模型详情:', {
      id: model.id,
      name: model.name,
      provider: model.provider
    });

    if (!apiKey) {
      throw new Error('API密钥未设置');
    }

    // 过滤掉空消息
    const filteredMessages = messages.filter(msg => msg.content.trim() !== '');

    // 打印消息历史，用于调试
    console.log('[API请求] Anthropic API 原始消息列表:', filteredMessages.map(m => ({
      role: m.role,
      content: m.content.substring(0, 20) + (m.content.length > 20 ? '...' : ''),
      timestamp: m.timestamp
    })));

    const anthropicMessages = convertToAnthropicMessages(filteredMessages);

    // 提取系统消息
    let systemMessage = '你是Cherry Studio的AI助手，一个有用、友好的助手。';

    const requestBody: AnthropicCompletionRequest = {
      model: modelName,
      messages: anthropicMessages,
      temperature: model.temperature,
      max_tokens: model.maxTokens,
      system: systemMessage,
    };

    // 记录API请求
    logApiRequest('Anthropic API', 'POST', {
      model: modelName,
      temperature: model.temperature,
      max_tokens: model.maxTokens,
      messages: anthropicMessages.map(m => ({
        role: m.role,
        content: m.content.substring(0, 50) + (m.content.length > 50 ? '...' : '')
      }))
    });

    // 如果提供了onUpdate回调，使用流式响应
    if (onUpdate) {
      return await streamCompletion(baseUrl, apiKey, requestBody, onUpdate);
    } else {
      // 否则使用普通响应
      const response = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || '请求失败';

        // 记录API错误
        console.error('[API错误] Anthropic API请求失败:', errorData);
        logApiResponse('Anthropic API', response.status, {
          error: errorMessage,
          details: errorData
        });

        throw new Error(errorMessage);
      }

      const data: AnthropicCompletionResponse = await response.json();

      // 记录API响应
      logApiResponse('Anthropic API', 200, {
        model: modelName,
        content: data.content[0].text.substring(0, 100) +
          (data.content[0].text.length > 100 ? '...' : '')
      });

      return data.content[0].text;
    }
  } catch (error) {
    console.error('Anthropic API请求失败:', error);
    throw error;
  }
};

// 流式响应处理
const streamCompletion = async (
  baseUrl: string,
  apiKey: string,
  requestBody: AnthropicCompletionRequest,
  onUpdate: (content: string) => void
): Promise<string> => {
  // 启用流式响应
  requestBody.stream = true;

  try {
    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || '请求失败');
    }

    // 确保响应是可读流
    if (!response.body) {
      throw new Error('响应体为空');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let content = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // 解码响应块
      const chunk = decoder.decode(value);

      // 处理SSE格式
      const lines = chunk
        .split('\n')
        .filter(line => line.startsWith('data: ') && line !== 'data: [DONE]');

      for (const line of lines) {
        try {
          const jsonStr = line.replace('data: ', '');
          if (jsonStr === '') continue;

          const json = JSON.parse(jsonStr);

          // 提取内容增量
          if (json.type === 'content_block_delta' && json.delta?.text) {
            content += json.delta.text;
            onUpdate(content);
          }
        } catch (e) {
          console.warn('解析SSE响应失败:', e);
        }
      }
    }

    // 记录API响应
    logApiResponse('Anthropic API Stream', 200, {
      model: requestBody.model,
      content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
      totalLength: content.length
    });

    return content;
  } catch (error) {
    console.error('流式响应处理失败:', error);

    // 记录API错误
    logApiResponse('Anthropic API Stream', 500, {
      error: error instanceof Error ? error.message : '未知错误',
      model: requestBody.model
    });

    throw error;
  }
};
