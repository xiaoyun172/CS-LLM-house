/**
 * DeepSeek API Provider
 * 专门处理DeepSeek模型的API调用和响应
 */
import { BaseOpenAIProvider } from '../openai/provider';
import type { Message, Model } from '../../types';
import { convertToOpenAIMessages } from '../openai/multimodal';
import { streamDeepSeekCompletion } from './stream';
import { isDeepSeekReasoningModel } from '../../utils/modelDetection';
import { getThinkingConfig } from '../../services/ThinkingService';
import { createClient } from './createProvider';

/**
 * DeepSeek Provider实现类
 * 继承自BaseOpenAIProvider，但针对DeepSeek模型进行了优化
 */
export class DeepSeekProvider extends BaseOpenAIProvider {
  // 公开client属性，使其可以在外部访问
  public client: any;

  constructor(model: Model) {
    super(model);

    // 创建DeepSeek专用客户端
    this.client = createClient(model);
  }

  /**
   * 判断是否支持思考过程
   * @returns 是否支持思考过程
   */
  public supportsReasoning(): boolean {
    return isDeepSeekReasoningModel(this.model);
  }

  /**
   * 发送聊天消息
   * @param messages 消息列表
   * @param options 选项
   * @returns 响应内容
   */
  public async sendChatMessage(
    messages: Message[],
    options?: {
      onUpdate?: (content: string, reasoning?: string) => void;
      enableWebSearch?: boolean;
      systemPrompt?: string;
      enableTools?: boolean;
      reasoningEffort?: 'off' | 'low' | 'medium' | 'high' | 'auto';
    }
  ): Promise<string> {
    try {
      console.log(`[DeepSeekProvider] 发送聊天消息，模型: ${this.model.id}`);

      // 转换消息格式
      const openaiMessages = convertToOpenAIMessages(messages);

      // 准备请求参数
      const params: any = {
        model: this.model.id,
        messages: openaiMessages,
        temperature: 0.7,
        max_tokens: 4096,
        stream: Boolean(options?.onUpdate)
      };

      // 添加思考过程配置
      if (this.supportsReasoning() && options?.reasoningEffort !== 'off') {
        // 获取思考过程配置
        const thinkingConfig = getThinkingConfig(this.model, options?.reasoningEffort);

        // 合并配置
        Object.assign(params, thinkingConfig);
      }

      // 如果有回调函数，使用流式响应
      if (options?.onUpdate) {
        return await this.handleStreamResponse(params, options.onUpdate, options?.enableTools ?? true);
      } else {
        // 非流式响应
        return await this.handleNonStreamResponse(params);
      }
    } catch (error) {
      console.error('[DeepSeekProvider] 发送聊天消息失败:', error);
      throw error;
    }
  }

  /**
   * 处理流式响应
   * @param params 请求参数
   * @param onUpdate 更新回调
   * @param enableTools 是否启用工具
   * @returns 响应内容
   */
  private async handleStreamResponse(
    params: any,
    onUpdate: (content: string, reasoning?: string) => void,
    enableTools: boolean = true
  ): Promise<string> {
    console.log('[DeepSeekProvider] 处理流式响应');

    // 调用流式完成函数
    return await streamDeepSeekCompletion(
      this.client,
      this.model.id,
      params.messages,
      params.temperature,
      params.max_tokens,
      onUpdate,
      {
        ...params,
        enableReasoning: this.supportsReasoning() && enableTools,
        enableTools: enableTools
      }
    );
  }

  /**
   * 处理非流式响应
   * @param params 请求参数
   * @returns 响应内容
   */
  private async handleNonStreamResponse(params: any): Promise<string> {
    console.log('[DeepSeekProvider] 处理非流式响应');

    // 发送请求
    const response = await this.client.chat.completions.create(params);

    // 提取响应内容
    const content = response.choices[0].message.content || '';

    // 记录API响应
    console.log(`[DeepSeekProvider] 成功收到API响应，模型: ${this.model.id}，内容长度: ${content.length}`);

    return content;
  }
}
