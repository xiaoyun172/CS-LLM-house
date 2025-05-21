/**
 * Anthropic Provider模块
 * 提供类似电脑版的Provider类实现
 */
import Anthropic from '@anthropic-ai/sdk';
import type { Message, Model } from '../../types';
import { logApiRequest, logApiResponse } from '../../services/LoggerService';
import { createClient } from './client';
import { getMainTextContent } from '../../utils/messageUtils';

/**
 * 基础Provider抽象类
 */
export abstract class BaseProvider {
  protected model: Model;
  protected client: Anthropic;

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
 * Anthropic Provider实现
 */
export class AnthropicProvider extends BaseProvider {
  constructor(model: Model) {
    super(model);
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
    return this.model.maxTokens || 4096;
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
      console.error('[AnthropicProvider.getMessageContent] 获取消息内容失败:', error);
      return '';
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
      console.log(`[AnthropicProvider.sendChatMessage] 开始处理聊天请求, 模型: ${this.model.id}, 消息数量: ${messages.length}`);

      // 准备消息数组 - 电脑版风格的消息处理
      const anthropicMessages = [];
      let systemMessage = null;

      // 处理所有消息
      for (const message of messages) {
        // 获取消息内容
        const content = this.getMessageContent(message);

        // 只处理有内容的消息
        if (content.trim()) {
          // 系统消息单独处理
          if (message.role === 'system') {
            systemMessage = { content };
            console.log(`[AnthropicProvider.sendChatMessage] 提取系统消息: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
          } else {
            // 用户和助手消息添加到消息数组
            // Anthropic只支持user和assistant角色
            const role = message.role === 'user' ? 'user' : 'assistant';

            anthropicMessages.push({
              role,
              content
            });

            console.log(`[AnthropicProvider.sendChatMessage] 添加消息: role=${role}, content=${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
          }
        }
      }

      // 确保至少有一条用户消息 - 电脑版风格的安全检查
      if (anthropicMessages.length === 0 || !anthropicMessages.some(msg => msg.role === 'user')) {
        console.warn('[AnthropicProvider.sendChatMessage] 警告: 消息列表中没有用户消息，添加默认用户消息');

        // 添加一个默认的用户消息
        anthropicMessages.push({
          role: 'user',
          content: '你好'
        });

        console.log('[AnthropicProvider.sendChatMessage] 添加默认用户消息: 你好');
      }

      // 强制检查：确保anthropicMessages数组不为空
      if (anthropicMessages.length === 0) {
        console.error('[AnthropicProvider.sendChatMessage] 严重错误: 消息数组为空，添加默认消息');

        // 添加一个默认的用户消息
        anthropicMessages.push({
          role: 'user',
          content: '你好'
        });

        console.log('[AnthropicProvider.sendChatMessage] 添加默认用户消息: 你好');
      }

      // 记录最终消息数组
      console.log(`[AnthropicProvider.sendChatMessage] 最终消息数组:`, JSON.stringify(anthropicMessages));

      // 记录API请求
      logApiRequest('Anthropic API', 'INFO', {
        method: 'POST',
        model: this.model.id,
        messageCount: anthropicMessages.length,
        hasSystemPrompt: !!systemMessage
      });

      // 准备请求参数
      const requestParams: any = {
        model: this.model.id,
        messages: anthropicMessages,
        max_tokens: this.getMaxTokens(),
        temperature: this.getTemperature()
      };

      // 如果有系统消息，添加到请求中
      if (systemMessage) {
        if (typeof systemMessage.content === 'string') {
          requestParams.system = systemMessage.content;
        } else if (systemMessage.content && typeof systemMessage.content === 'object') {
          // 安全地访问text属性
          const content = systemMessage.content as any;
          requestParams.system = content.text || '';
        }
      }

      // 如果有onUpdate回调，使用流式响应
      if (options?.onUpdate) {
        requestParams.stream = true;

        // 创建流式响应
        const stream = await this.client.messages.create({
          ...requestParams
        });

        let fullResponse = '';

        // 处理流式响应
        for await (const chunk of stream as any) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            const chunkText = chunk.delta.text;
            fullResponse += chunkText;
            options.onUpdate(fullResponse);
          }
        }

        // 记录API响应
        logApiResponse('Anthropic API Stream', 200, {
          model: this.model.id,
          content: fullResponse.substring(0, 100) + (fullResponse.length > 100 ? '...' : '')
        });

        return fullResponse;
      } else {
        // 非流式响应
        const response = await this.client.messages.create({
          ...requestParams
        });

        // 提取响应文本
        let responseText = '';
        if (response.content && response.content.length > 0) {
          for (const block of response.content) {
            if (block.type === 'text') {
              responseText += block.text;
            }
          }
        }

        // 记录API响应
        logApiResponse('Anthropic API', 200, {
          model: this.model.id,
          content: responseText.substring(0, 100) + (responseText.length > 100 ? '...' : '')
        });

        return responseText;
      }
    } catch (error) {
      console.error('Anthropic API请求失败:', error);
      throw error;
    }
  }

  /**
   * 测试API连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.messages.create({
        model: this.model.id,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5,
      });

      return Boolean(response.content && response.content.length > 0);
    } catch (error) {
      console.error('Anthropic API连接测试失败:', error);
      return false;
    }
  }

  /**
   * 获取模型列表
   */
  async getModels(): Promise<any[]> {
    try {
      // 尝试获取模型列表
      const response = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': this.model.apiKey || '',
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        } as HeadersInit
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const data = await response.json();

      if (data.data && Array.isArray(data.data)) {
        // 转换为标准格式
        return data.data.map((model: any) => ({
          id: model.id,
          name: model.name || model.id,
          description: model.description || '',
          object: 'model',
          created: Date.now(),
          owned_by: 'anthropic'
        }));
      }

      throw new Error('未找到模型数据');
    } catch (error) {
      console.error('获取Anthropic模型列表失败:', error);

      // 返回预设模型列表
      return [
        { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet', description: 'Claude 3.5 Sonnet - 最新的Claude模型', owned_by: 'anthropic' },
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Claude 3 Opus - 最强大的Claude模型', owned_by: 'anthropic' },
        { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Claude 3 Sonnet - 平衡性能和速度', owned_by: 'anthropic' },
        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Claude 3 Haiku - 最快的Claude模型', owned_by: 'anthropic' },
        { id: 'claude-2.1', name: 'Claude 2.1', description: 'Claude 2.1 - 旧版Claude模型', owned_by: 'anthropic' }
      ];
    }
  }
}

/**
 * 创建Provider实例
 */
export function createProvider(model: Model): AnthropicProvider {
  return new AnthropicProvider(model);
}