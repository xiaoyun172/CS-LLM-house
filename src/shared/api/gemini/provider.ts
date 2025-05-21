/**
 * Gemini Provider模块
 * 提供类似电脑版的Provider类实现
 */
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import type { Part } from '@google/generative-ai';
import type { Message, Model } from '../../types';
import { logApiRequest, logApiResponse } from '../../services/LoggerService';
import { createClient } from './client';
import { getMainTextContent } from '../../utils/messageUtils';
import store from '../../store';

/**
 * 查找消息中的图片块
 * @param message 消息对象
 * @returns 图片块数组
 */
function findImageBlocks(message: Message): any[] {
  try {
    if (!message.blocks || !Array.isArray(message.blocks) || message.blocks.length === 0) {
      return [];
    }

    // 获取状态
    const state = store.getState();

    // 查找图片块
    return message.blocks
      .map(blockId => state.messageBlocks.entities[blockId])
      .filter(block => block && block.type === 'image');
  } catch (error) {
    console.error('[findImageBlocks] 查找图片块失败:', error);
    return [];
  }
}

// 定义安全设置类型
interface SafetySetting {
  category: HarmCategory;
  threshold: HarmBlockThreshold;
}

/**
 * 基础Provider抽象类
 */
export abstract class BaseProvider {
  protected model: Model;
  protected client: GoogleGenerativeAI;

  constructor(model: Model) {
    this.model = model;
    this.client = createClient(model);
  }

  /**
   * 发送聊天消息
   */
  abstract sendChatMessage(
    messages: Message[],
    options?: {
      onUpdate?: (content: string) => void;
    }
  ): Promise<string>;

  /**
   * 测试API连接
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * 获取模型列表
   */
  abstract getModels(): Promise<any[]>;
}

/**
 * Gemini Provider实现
 */
export class GeminiProvider extends BaseProvider {
  constructor(model: Model) {
    super(model);
  }

  /**
   * 获取基础URL
   */
  private getBaseURL(): string {
    return this.model.baseUrl || 'https://generativelanguage.googleapis.com';
  }

  /**
   * 获取安全设置
   */
  private getSafetySettings(): SafetySetting[] {
    const safetyThreshold = 'OFF' as HarmBlockThreshold;

    return [
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: safetyThreshold
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: safetyThreshold
      },
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: safetyThreshold
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: safetyThreshold
      },
      {
        category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY,
        threshold: HarmBlockThreshold.BLOCK_NONE
      }
    ];
  }

  /**
   * 获取温度参数
   */
  private getTemperature(): number {
    return this.model.temperature || 0.7;
  }

  /**
   * 获取最大令牌数
   */
  private getMaxTokens(): number {
    return this.model.maxTokens || 2048;
  }

  /**
   * 获取消息内容 - 电脑版风格的消息内容提取
   * @param message 消息对象
   * @returns 消息内容
   */
  private getMessageContent(message: Message): string {
    try {
      // 尝试从块中获取内容
      if (message.blocks && Array.isArray(message.blocks) && message.blocks.length > 0) {
        // 使用getMainTextContent函数获取文本内容
        return getMainTextContent(message);
      }

      // 兼容旧版本 - 直接使用content属性
      if (typeof (message as any).content === 'string') {
        return (message as any).content;
      } else if (typeof (message as any).content === 'object' && (message as any).content) {
        if ('text' in (message as any).content) {
          return (message as any).content.text || '';
        }
      }

      // 默认返回空字符串
      return '';
    } catch (error) {
      console.error('[GeminiProvider.getMessageContent] 获取消息内容失败:', error);
      return '';
    }
  }

  /**
   * 获取消息中的图片 - 电脑版风格的图片提取
   * @param message 消息对象
   * @returns 图片数组
   */
  private getMessageImages(message: Message): any[] {
    try {
      // 尝试从块中获取图片
      if (message.blocks && Array.isArray(message.blocks) && message.blocks.length > 0) {
        const imageBlocks = findImageBlocks(message);
        if (imageBlocks.length > 0) {
          return imageBlocks.map(block => ({
            base64Data: block.base64Data,
            mimeType: block.mimeType || 'image/jpeg'
          }));
        }
      }

      // 兼容旧版本 - 直接使用images属性
      if (Array.isArray((message as any).images) && (message as any).images.length > 0) {
        return (message as any).images;
      }

      // 默认返回空数组
      return [];
    } catch (error) {
      console.error('[GeminiProvider.getMessageImages] 获取消息图片失败:', error);
      return [];
    }
  }

  /**
   * 发送聊天消息 - 电脑版风格的消息处理
   */
  async sendChatMessage(
    messages: Message[],
    options?: {
      onUpdate?: (content: string) => void;
    }
  ): Promise<string> {
    try {
      console.log(`[GeminiProvider.sendChatMessage] 开始处理聊天请求, 模型: ${this.model.id}, 消息数量: ${messages.length}`);

      // 准备消息数组 - 电脑版风格的消息处理
      let systemMessage = null;
      const userMessages = [];

      // 处理所有消息
      for (const message of messages) {
        // 获取消息内容
        const content = this.getMessageContent(message);

        // 只处理有内容的消息
        if (content.trim()) {
          // 系统消息单独处理
          if (message.role === 'system') {
            systemMessage = { content };
            console.log(`[GeminiProvider.sendChatMessage] 提取系统消息: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
          } else {
            // 用户和助手消息添加到消息数组
            userMessages.push({
              role: message.role,
              content,
              images: this.getMessageImages(message)
            });

            console.log(`[GeminiProvider.sendChatMessage] 添加消息: role=${message.role}, content=${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
          }
        }
      }

      // 确保至少有一条用户消息
      if (userMessages.length === 0 || !userMessages.some(msg => msg.role === 'user')) {
        console.warn('[GeminiProvider.sendChatMessage] 警告: 消息列表中没有用户消息，添加默认用户消息');

        // 添加一个默认的用户消息
        userMessages.push({
          role: 'user',
          content: '你好',
          images: []
        });

        console.log('[GeminiProvider.sendChatMessage] 添加默认用户消息: 你好');
      }

      // 准备消息内容 - Gemini特有的格式
      const history = [];
      const contents = [];

      // 处理消息历史 - 除了最后一条用户消息
      for (let i = 0; i < userMessages.length - 1; i++) {
        const msg = userMessages[i];
        // Gemini使用'user'和'model'角色
        const role = msg.role === 'user' ? 'user' : 'model';

        history.push({
          role,
          parts: [{ text: msg.content }]
        });
      }

      // 处理最后一条用户消息 - 可能包含图片
      const lastMessage = userMessages[userMessages.length - 1];
      if (lastMessage) {
        // 处理图片
        const parts = [];
        parts.push({ text: lastMessage.content });

        // 添加图片部分
        if (lastMessage.images && lastMessage.images.length > 0) {
          for (const img of lastMessage.images) {
            if (img.base64Data) {
              const mimeType = img.mimeType || 'image/jpeg';
              const base64Data = img.base64Data.split(',')[1] || img.base64Data;
              parts.push({
                inlineData: {
                  data: base64Data,
                  mimeType
                }
              });
            }
          }
        }

        contents.push(...parts);
      }

      // 强制检查：确保userMessages数组不为空
      if (userMessages.length === 0) {
        console.error('[GeminiProvider.sendChatMessage] 严重错误: 用户消息数组为空，添加默认消息');

        // 添加一个默认的用户消息
        userMessages.push({
          role: 'user',
          content: '你好',
          images: []
        });

        console.log('[GeminiProvider.sendChatMessage] 添加默认用户消息: 你好');

        // 更新history和contents
        history.length = 0;
        contents.length = 0;
        contents.push({ text: '你好' });
      }

      // 记录最终消息数组
      console.log(`[GeminiProvider.sendChatMessage] 最终用户消息数组:`, JSON.stringify(userMessages));

      // 记录API请求
      logApiRequest('Gemini API', 'INFO', {
        method: 'POST',
        model: this.model.id,
        messageCount: userMessages.length,
        hasSystemPrompt: !!systemMessage
      });

      // 创建生成模型
      const genModel = this.client.getGenerativeModel({
        model: this.model.id,
        systemInstruction: systemMessage ?
          (typeof systemMessage.content === 'string' ?
            systemMessage.content :
            (systemMessage.content as any)?.text || '') :
          undefined,
        generationConfig: {
          temperature: this.getTemperature(),
          maxOutputTokens: this.getMaxTokens(),
          topP: 0.95
        },
        safetySettings: this.getSafetySettings()
      });

      // 如果有onUpdate回调，使用流式响应
      if (options?.onUpdate) {
        // 创建聊天会话
        const chat = genModel.startChat({
          history: history
        });

        // 发送消息并获取流式响应
        const streamResult = await chat.sendMessageStream(contents as Part[]);
        let fullResponse = '';

        // 处理流式响应
        for await (const chunk of streamResult.stream) {
          const chunkText = chunk.text();
          fullResponse += chunkText;
          options.onUpdate(fullResponse);
        }

        // 记录API响应
        logApiResponse('Gemini API Stream', 200, {
          model: this.model.id,
          content: fullResponse.substring(0, 100) + (fullResponse.length > 100 ? '...' : '')
        });

        return fullResponse;
      } else {
        // 非流式响应
        const chat = genModel.startChat({
          history: history
        });

        const result = await chat.sendMessage(contents as Part[]);
        const response = result.response.text();

        // 记录API响应
        logApiResponse('Gemini API', 200, {
          model: this.model.id,
          content: response.substring(0, 100) + (response.length > 100 ? '...' : '')
        });

        return response;
      }
    } catch (error) {
      console.error('Gemini API请求失败:', error);
      throw error;
    }
  }

  /**
   * 测试API连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const genModel = this.client.getGenerativeModel({ model: this.model.id });
      const result = await genModel.generateContent('Hello');
      return result.response !== undefined;
    } catch (error) {
      console.error('Gemini API连接测试失败:', error);
      return false;
    }
  }

  /**
   * 获取模型列表
   */
  async getModels(): Promise<any[]> {
    try {
      const baseUrl = this.getBaseURL();
      const api = `${baseUrl}/v1beta/models`;
      const params = { key: this.model.apiKey };

      // 构建URL
      const url = new URL(api);
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value as string);
      });

      // 发送请求
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const data = await response.json();

      // 转换模型格式
      return data.models.map((m: any) => ({
        id: m.name.replace('models/', ''),
        name: m.displayName || m.name,
        description: m.description || '',
        object: 'model',
        created: Date.now(),
        owned_by: 'gemini'
      }));
    } catch (error) {
      console.error('获取Gemini模型列表失败:', error);

      // 返回预设模型列表
      return [
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: '强大的多模态模型', owned_by: 'gemini' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: '快速的多模态模型', owned_by: 'gemini' },
        { id: 'gemini-pro', name: 'Gemini Pro', description: '通用文本模型', owned_by: 'gemini' },
        { id: 'gemini-pro-vision', name: 'Gemini Pro Vision', description: '支持图像的多模态模型', owned_by: 'gemini' }
      ];
    }
  }
}

/**
 * 创建Provider实例
 */
export function createProvider(model: Model): GeminiProvider {
  return new GeminiProvider(model);
}