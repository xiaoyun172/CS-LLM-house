import type { Message, Model } from '../types';
import { logApiRequest, logApiResponse } from '../services/LoggerService';

// SiliconFlow API接口
interface SiliconFlowMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface SiliconFlowCompletionRequest {
  model: string;
  messages: SiliconFlowMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  frequency_penalty?: number;
  top_p?: number;
  top_k?: number;
}

interface SiliconFlowCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
      reasoning_content?: string;
    };
    delta?: {
      content?: string;
      reasoning_content?: string;
    };
    finish_reason: string | null;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// 转换消息格式 - SiliconFlow支持system消息在消息数组中
const convertToSiliconFlowMessages = (messages: Message[]): SiliconFlowMessage[] => {
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
): Promise<{content: string; reasoning?: string; reasoningTime?: number}> => {
  try {
    const apiKey = model.apiKey;
    const baseUrl = model.baseUrl || 'https://api.siliconflow.cn/v1';

    // 使用模型ID或名称，SiliconFlow使用的是特定格式的模型ID
    // 例如: "deepseek-ai/DeepSeek-V3"、"Qwen/Qwen2.5-Math-72B-Instruct"等
    const modelName = model.id; 

    console.log(`[API请求] 使用SiliconFlow API，模型: ${modelName}`);

    if (!apiKey) {
      throw new Error('API密钥未设置');
    }

    // 过滤掉空消息
    const filteredMessages = messages.filter(msg => msg.content.trim() !== '');

    // 打印消息历史，用于调试
    console.log('[API请求] SiliconFlow API 原始消息列表:', filteredMessages.map(m => ({
      role: m.role,
      content: m.content.substring(0, 20) + (m.content.length > 20 ? '...' : ''),
      timestamp: m.timestamp
    })));

    const siliconFlowMessages = convertToSiliconFlowMessages(filteredMessages);
    
    // 构建请求参数
    const requestParams: SiliconFlowCompletionRequest = {
      model: modelName,
      messages: siliconFlowMessages,
      max_tokens: model.maxTokens || 4096,
      temperature: model.temperature || 0.7,
      stream: !!onUpdate,
      frequency_penalty: 0,
      top_p: 0.7,
      top_k: 50
    };

    // 记录API请求
    logApiRequest('SiliconFlow API', 'INFO', {
      method: 'POST',
      model: modelName,
      temperature: model.temperature,
      max_tokens: model.maxTokens,
      messages: siliconFlowMessages.map(m => ({
        role: m.role,
        content: m.content.substring(0, 50) + (m.content.length > 50 ? '...' : '')
      }))
    });

    // 如果提供了onUpdate回调，使用流式响应
    if (onUpdate) {
      return await streamCompletion(baseUrl, apiKey, requestParams, onUpdate);
    } else {
      // 否则使用普通响应
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestParams),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || '请求失败';

        // 记录API错误
        console.error('[API错误] SiliconFlow API请求失败:', errorData);
        logApiResponse('SiliconFlow API', response.status, {
          error: errorMessage,
          details: errorData
        });

        throw new Error(errorMessage);
      }

      const data: SiliconFlowCompletionResponse = await response.json();

      // 记录API响应
      logApiResponse('SiliconFlow API', 200, {
        model: modelName,
        content: data.choices[0].message.content.substring(0, 100) +
          (data.choices[0].message.content.length > 100 ? '...' : '')
      });

      return {
        content: data.choices[0].message.content,
        reasoning: data.choices[0].message.reasoning_content,
        reasoningTime: undefined
      };
    }
  } catch (error) {
    console.error('SiliconFlow API请求失败:', error);
    throw error;
  }
};

// 流式响应处理
const streamCompletion = async (
  baseUrl: string,
  apiKey: string,
  requestParams: SiliconFlowCompletionRequest,
  onUpdate: (content: string) => void
): Promise<{content: string; reasoning?: string; reasoningTime?: number}> => {
  // 启用流式响应
  requestParams.stream = true;

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestParams),
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
    let reasoning = '';

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

          // 获取内容
          if (json.choices && json.choices[0]) {
            const delta = json.choices[0].delta;
            if (delta?.content) {
              content += delta.content;
              onUpdate(content);
            }
            if (delta?.reasoning_content) {
              reasoning += delta.reasoning_content;
            }
          }
        } catch (e) {
          console.warn('解析SSE响应失败:', e);
        }
      }
    }

    // 记录API响应
    logApiResponse('SiliconFlow API Stream', 200, {
      model: requestParams.model,
      content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
      totalLength: content.length
    });

    return {
      content,
      reasoning: reasoning || undefined,
      reasoningTime: undefined
    };
  } catch (error) {
    console.error('流式响应处理失败:', error);

    // 记录API错误
    logApiResponse('SiliconFlow API Stream', 500, {
      error: error instanceof Error ? error.message : '未知错误',
      model: requestParams.model
    });

    throw error;
  }
}; 