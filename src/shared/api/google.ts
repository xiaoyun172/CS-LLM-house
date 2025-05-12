import type { Message, Model } from '../types';
import { logApiRequest, logApiResponse } from '../services/LoggerService';

// Google API接口
interface GoogleMessage {
  role: 'user' | 'model';
  parts: {
    text: string;
  }[];
}

interface GoogleCompletionRequest {
  contents: GoogleMessage[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
  };
}

interface GoogleCompletionResponse {
  candidates: {
    content: {
      role: string;
      parts: {
        text: string;
      }[];
    };
  }[];
}

// 转换消息格式
const convertToGoogleMessages = (messages: Message[]): GoogleMessage[] => {
  return messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
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
    const baseUrl = model.baseUrl || 'https://generativelanguage.googleapis.com/v1';

    // 直接使用模型名称
    const modelName = model.name;

    console.log(`[API请求] 使用Google API，模型名称: ${modelName}，ID: ${model.id}`);

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
    console.log('[API请求] Google API 原始消息列表:', filteredMessages.map(m => ({
      role: m.role,
      content: m.content.substring(0, 20) + (m.content.length > 20 ? '...' : ''),
      timestamp: m.timestamp
    })));

    const googleMessages = convertToGoogleMessages(filteredMessages);

    // 添加系统消息
    if (googleMessages.length > 0 && googleMessages[0].role !== 'model') {
      googleMessages.unshift({
        role: 'model',
        parts: [{ text: '你是Cherry Studio的AI助手，一个有用、友好的助手。' }],
      });
    }

    console.log('[API请求] Google API 消息数量:', googleMessages.length);

    const requestBody: GoogleCompletionRequest = {
      contents: googleMessages,
      generationConfig: {
        temperature: model.temperature,
        maxOutputTokens: model.maxTokens,
      },
    };

    // 记录API请求
    logApiRequest('Google AI API', 'INFO', {
      method: 'POST',
      model: modelName,
      temperature: model.temperature,
      maxOutputTokens: model.maxTokens,
      messages: googleMessages.map(m => ({
        role: m.role,
        text: m.parts[0].text.substring(0, 50) + (m.parts[0].text.length > 50 ? '...' : '')
      }))
    });

    // Google API目前不支持流式响应，使用普通响应
    const response = await fetch(`${baseUrl}/models/${modelName}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || '请求失败';

      // 记录API错误
      console.error('[API错误] Google API请求失败:', errorData);
      logApiResponse('Google AI API', response.status, {
        error: errorMessage,
        details: errorData
      });

      throw new Error(errorMessage);
    }

    const data: GoogleCompletionResponse = await response.json();

    // 记录API响应
    logApiResponse('Google AI API', response.status, {
      model: modelName,
      content: data.candidates[0].content.parts[0].text.substring(0, 100) +
        (data.candidates[0].content.parts[0].text.length > 100 ? '...' : '')
    });

    // 如果提供了onUpdate回调，模拟流式响应
    if (onUpdate) {
      const content = data.candidates[0].content.parts[0].text;

      // 模拟流式响应，每20ms发送一个字符
      let currentContent = '';
      for (let i = 0; i < content.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 20));
        currentContent += content[i];
        onUpdate(currentContent);
      }

      return content;
    } else {
      return data.candidates[0].content.parts[0].text;
    }
  } catch (error) {
    console.error('Google API请求失败:', error);
    throw error;
  }
};
