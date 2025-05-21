/**
 * OpenAI Provider模块
 * 提供与电脑版一致的Provider类实现
 */
import OpenAI from 'openai';
import type { Message, Model } from '../../types';
import { logApiRequest } from '../../services/LoggerService';
import {
  createClient,
  supportsMultimodal,
  supportsWebSearch,
  supportsReasoning,
  getWebSearchParams
} from './client';
import { streamCompletion } from './stream';
import { ToolType, createToolsParams } from './tools';
import { getMainTextContent, findImageBlocks } from '../../utils/messageUtils';

/**
 * 基础Provider抽象类
 */
export abstract class BaseProvider {
  protected model: Model;
  protected client: OpenAI;
  protected useSystemPromptForTools: boolean = true;

  constructor(model: Model) {
    this.model = model;
    this.client = createClient(model);
  }

  /**
   * 检查模型是否支持多模态
   */
  protected supportsMultimodal(): boolean {
    return supportsMultimodal(this.model);
  }

  /**
   * 检查模型是否支持网页搜索
   */
  protected supportsWebSearch(): boolean {
    return supportsWebSearch(this.model);
  }

  /**
   * 检查模型是否支持推理优化
   */
  protected supportsReasoning(): boolean {
    return supportsReasoning(this.model);
  }

  /**
   * 获取温度参数
   */
  protected getTemperature(assistant?: any, model?: Model): number | undefined {
    const actualModel = model || this.model;

    if (this.supportsReasoning()) {
      return undefined;
    }

    // 优先使用助手设置的温度
    if (assistant?.settings?.temperature !== undefined) {
      return assistant.settings.temperature;
    }

    return actualModel.temperature;
  }

  /**
   * 获取top_p参数
   */
  protected getTopP(assistant?: any, model?: Model): number | undefined {
    const actualModel = model || this.model;

    if (this.supportsReasoning()) {
      return undefined;
    }

    // 优先使用助手设置的top_p
    if (assistant?.settings?.top_p !== undefined) {
      return assistant.settings.top_p;
    }

    return (actualModel as any).topP;
  }

  /**
   * 获取推理优化参数
   */
  protected getReasoningEffort(assistant?: any, model?: Model): any {
    const actualModel = model || this.model;

    if (!this.supportsReasoning()) {
      return {};
    }

    // 根据模型类型返回不同的推理参数
    if (actualModel.id.includes('gpt-4') || actualModel.id.includes('gpt-4o')) {
      return {
        reasoning_effort: assistant?.settings?.reasoning_effort || 'auto'
      };
    }

    return {};
  }

  /**
   * 获取消息参数
   */
  protected async getMessageParam(message: Message): Promise<any> {
    const isVision = this.supportsMultimodal();
    const content = getMainTextContent(message);
    const imageBlocks = findImageBlocks(message);

    if (imageBlocks.length === 0) {
      return {
        role: message.role,
        content
      };
    }

    // 处理多模态内容
    if (isVision && imageBlocks.length > 0) {
      const parts: any[] = [];

      // 添加文本内容
      if (content) {
        parts.push({
          type: 'text',
          text: content
        });
      }

      // 添加图片内容
      for (const block of imageBlocks) {
        parts.push({
          type: 'image_url',
          image_url: {
            url: block.url,
            detail: 'auto'
          }
        });
      }

      return {
        role: message.role,
        content: parts
      };
    }

    // 默认返回文本内容
    return {
      role: message.role,
      content
    };
  }

  /**
   * 构建系统提示
   */
  protected buildSystemPrompt(prompt: string, tools?: any[]): string {
    // 基本系统提示
    let systemPrompt = prompt || '';

    // 如果有工具，添加工具说明
    if (tools && tools.length > 0) {
      systemPrompt += '\n\n你有以下工具可用:\n';
      tools.forEach((tool, index) => {
        systemPrompt += `${index + 1}. ${tool.function.name}: ${tool.function.description}\n`;
      });
      systemPrompt += '\n请在适当的时候使用这些工具。';
    }

    return systemPrompt;
  }

  /**
   * 测试API连接
   */
  public async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model.id,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5,
      });
      return Boolean(response.choices[0].message);
    } catch (error) {
      console.error('API连接测试失败:', error);
      return false;
    }
  }

  /**
   * 抽象方法：发送聊天消息
   */
  public abstract sendChatMessage(
    messages: Message[],
    options?: {
      onUpdate?: (content: string, reasoning?: string) => void;
      enableWebSearch?: boolean;
      enableThinking?: boolean;
      tools?: ToolType[];
      systemPrompt?: string;
    }
  ): Promise<string>;
}

/**
 * OpenAI Provider实现类
 */
export class OpenAIProvider extends BaseProvider {
  constructor(model: Model) {
    super(model);
  }

  /**
   * 发送聊天消息
   * @param messages 消息数组
   * @param options 选项
   * @returns 响应内容
   */
  public async sendChatMessage(
    messages: Message[],
    options?: {
      onUpdate?: (content: string, reasoning?: string) => void;
      enableWebSearch?: boolean;
      enableThinking?: boolean;
      tools?: ToolType[];
      systemPrompt?: string;
    }
  ): Promise<string> {
    console.log(`[OpenAIProvider.sendChatMessage] 开始处理聊天请求, 模型: ${this.model.id}`);

    const {
      onUpdate,
      enableWebSearch = false,
      enableThinking = false,
      tools = [],
      systemPrompt = ''
    } = options || {};

    // 记录原始消息数量
    console.log(`[OpenAIProvider.sendChatMessage] 原始消息数量: ${messages.length}`);

    // 准备消息数组 - 使用电脑版风格的消息处理
    const apiMessages = [];

    // 添加系统消息 - 与电脑版保持一致，始终添加系统消息，即使提示词为空
    // 构建系统提示，包含工具说明
    const finalSystemPrompt = this.buildSystemPrompt(
      systemPrompt,
      tools.length > 0 ? createToolsParams(tools).tools : undefined
    );

    // 系统消息始终作为第一条消息
    apiMessages.push({
      role: 'system',
      content: finalSystemPrompt
    });

    console.log(`[OpenAIProvider.sendChatMessage] 添加系统提示: ${finalSystemPrompt.substring(0, 50)}${finalSystemPrompt.length > 50 ? '...' : ''}`);


    // 按创建时间排序消息，确保顺序正确
    const sortedMessages = [...messages].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeA - timeB; // 升序排列，最早的在前面
    });

    console.log(`[OpenAIProvider.sendChatMessage] 消息已按时间排序，总数: ${sortedMessages.length}`);

    // 添加用户和助手消息 - 保持原始角色
    for (const message of sortedMessages) {
      // 获取消息内容
      const content = this.getMessageContent(message);

      // 只添加有内容的消息
      if (content.trim()) {
        // 检查是否已经有相同角色的连续消息
        const lastMessage = apiMessages[apiMessages.length - 1];
        if (lastMessage && lastMessage.role === message.role && message.role !== 'system') {
          console.log(`[OpenAIProvider.sendChatMessage] 跳过连续的${message.role}消息，避免角色重复`);
          continue;
        }

        apiMessages.push({
          role: message.role, // 保持原始角色
          content: content
        });

        console.log(`[OpenAIProvider.sendChatMessage] 添加消息: role=${message.role}, content=${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
      }
    }

    // 确保系统消息始终在第一位
    const systemMessageIndex = apiMessages.findIndex(msg => msg.role === 'system');
    if (systemMessageIndex > 0) {
      const systemMessage = apiMessages.splice(systemMessageIndex, 1)[0];
      apiMessages.unshift(systemMessage);
      console.log(`[OpenAIProvider.sendChatMessage] 将系统消息移到第一位`);
    }

    console.log(`[OpenAIProvider.sendChatMessage] 最终API消息数量: ${apiMessages.length}`);

    // 确保至少有一条用户消息 - 电脑版风格的安全检查
    if (apiMessages.length === 0 || !apiMessages.some(msg => msg.role === 'user')) {
      console.warn('[OpenAIProvider.sendChatMessage] 警告: 消息列表中没有用户消息，添加默认用户消息');

      // 添加一个默认的用户消息
      apiMessages.push({
        role: 'user',
        content: '你好'
      });

      console.log('[OpenAIProvider.sendChatMessage] 添加默认用户消息: 你好');
    }

    // 强制检查：确保messages数组不为空
    if (apiMessages.length === 0) {
      console.error('[OpenAIProvider.sendChatMessage] 严重错误: 消息数组为空，添加默认消息');

      // 添加一个默认的用户消息
      apiMessages.push({
        role: 'user',
        content: '你好'
      });

      console.log('[OpenAIProvider.sendChatMessage] 添加默认用户消息: 你好');
    }

    // 记录最终消息数组
    console.log(`[OpenAIProvider.sendChatMessage] 最终消息数组:`, JSON.stringify(apiMessages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string'
        ? (m.content.substring(0, 30) + (m.content.length > 30 ? '...' : ''))
        : '[复杂内容]'
    }))));

    // 详细记录每条消息的角色和内容前30个字符，便于调试
    console.log(`[OpenAIProvider.sendChatMessage] 消息详情:`);
    apiMessages.forEach((msg, index) => {
      console.log(`  [${index}] ${msg.role}: ${
        typeof msg.content === 'string'
          ? (msg.content.substring(0, 30) + (msg.content.length > 30 ? '...' : ''))
          : '[复杂内容]'
      }`);
    });

    // 构建请求参数 - 与电脑版保持一致，始终启用流式输出
    const requestParams: any = {
      model: this.model.id,
      messages: apiMessages,
      temperature: this.getTemperature(),
      top_p: this.getTopP(),
      max_tokens: this.model.maxTokens,
      stream: true // 始终启用流式输出，与电脑版保持一致
    };

    console.log(`[OpenAIProvider.sendChatMessage] 请求参数:`, {
      model: this.model.id,
      messagesCount: apiMessages.length,
      temperature: requestParams.temperature,
      top_p: requestParams.top_p,
      max_tokens: requestParams.max_tokens,
      stream: requestParams.stream // 添加流式输出信息
    });

    // 检查API密钥和基础URL是否设置
    if (!this.model.apiKey) {
      console.error('[OpenAIProvider.sendChatMessage] 错误: API密钥未设置');
      throw new Error('API密钥未设置，请在设置中配置OpenAI API密钥');
    }

    if (!this.model.baseUrl) {
      console.warn('[OpenAIProvider.sendChatMessage] 警告: 基础URL未设置，使用默认值');
    }

    // 添加网页搜索参数
    if (enableWebSearch && this.supportsWebSearch()) {
      Object.assign(requestParams, getWebSearchParams(this.model, enableWebSearch));
      console.log(`[OpenAIProvider.sendChatMessage] 启用网页搜索功能`);
    }

    // 处理工具参数
    const allTools = [...tools];
    if (enableThinking) {
      allTools.push(ToolType.THINKING);
      console.log(`[OpenAIProvider.sendChatMessage] 启用思考工具`);
    }

    if (allTools.length > 0) {
      const toolParams = createToolsParams(allTools);
      requestParams.tools = toolParams.tools;
      requestParams.tool_choice = toolParams.tool_choice;
      console.log(`[OpenAIProvider.sendChatMessage] 配置工具参数: ${allTools.join(', ')}`);
    }

    // 处理推理模型的特定参数
    if (this.supportsReasoning()) {
      Object.assign(requestParams, this.getReasoningEffort());
      console.log(`[OpenAIProvider.sendChatMessage] 配置推理模型参数`);
    }

    // 记录API请求
    logApiRequest('OpenAI Chat', 'INFO', {
      method: 'POST',
      model: this.model.id,
      stream: true, // 添加流式输出信息
      messages: apiMessages.map(m => ({
        role: m.role,
        content: typeof m.content === 'string'
          ? (m.content.substring(0, 50) + (m.content.length > 50 ? '...' : ''))
          : '[复杂内容]'
      }))
    });

    // 默认使用流式响应，与电脑版保持一致
    try {
      if (onUpdate) {
        console.log(`[OpenAIProvider.sendChatMessage] 使用流式响应模式（有回调）`);
        return await this.handleStreamResponse(requestParams, onUpdate);
      } else {
        // 即使没有回调，也使用流式响应，但结果会在完成后一次性返回
        // 这与电脑版的行为一致，电脑版总是使用流式响应
        console.log(`[OpenAIProvider.sendChatMessage] 使用流式响应模式（无回调）`);
        return await this.handleStreamResponseWithoutCallback(requestParams);
      }
    } catch (error) {
      console.error('[OpenAIProvider.sendChatMessage] API请求失败:', error);

      // 获取错误详情
      let errorMessage = '请求失败';
      if (error instanceof Error) {
        errorMessage = error.message;

        // 检查特定类型的错误
        if (errorMessage.includes('api key')) {
          errorMessage = 'API密钥无效或未正确设置';
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          errorMessage = '网络请求失败，请检查网络连接和API地址设置';
        }
      }

      throw new Error(`OpenAI API请求失败: ${errorMessage}`);
    }
  }

  /**
   * 处理流式响应
   * @param params 请求参数
   * @param onUpdate 更新回调
   * @returns 响应内容
   */
  private async handleStreamResponse(
    params: any,
    onUpdate: (content: string, reasoning?: string) => void
  ): Promise<string> {
    return await streamCompletion(
      this.client,
      this.model.id,
      params.messages,
      params.temperature,
      params.max_tokens || params.max_completion_tokens,
      onUpdate,
      params
    );
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
      console.error('[OpenAIProvider.getMessageContent] 获取消息内容失败:', error);
      return '';
    }
  }

  /**
   * 处理普通响应
   * @param params 请求参数
   * @returns 响应内容
   * @deprecated 使用handleStreamResponseWithoutCallback代替
   */
  /*
  // 此方法已弃用，但保留以供参考
  private async handleNormalResponse(params: any): Promise<string> {
    try {
      const completion = await this.client.chat.completions.create({
        ...params,
        stream: false
      });

      const responseContent = completion.choices[0].message.content || '';

      // 处理工具调用内容
      const toolCalls = completion.choices[0].message.tool_calls;
      let toolResults = '';

      if (toolCalls && toolCalls.length > 0) {
        for (const toolCall of toolCalls) {
          const parsedTool = parseToolCall(toolCall);
          if (parsedTool && parsedTool.toolName === 'thinking') {
            const thinkingContent = parsedTool.args.thinking || '';
            toolResults += `\n思考过程: ${thinkingContent}`;
          }
        }
      }

      // 记录API响应
      logApiResponse('OpenAI Chat Completions', 200, {
        model: this.model.id,
        content: responseContent.substring(0, 100) + (responseContent.length > 100 ? '...' : ''),
        usage: completion.usage
      });

      return responseContent;
    } catch (error: any) {
      console.error('OpenAI API请求失败:', error);
      throw error;
    }
  }
  */

  /**
   * 处理流式响应（无回调）
   * 使用流式响应但不使用回调，结果会在完成后一次性返回
   * 这与电脑版的行为一致
   * @param params 请求参数
   * @returns 响应内容
   */
  private async handleStreamResponseWithoutCallback(params: any): Promise<string> {
    try {
      console.log('[OpenAIProvider.handleStreamResponseWithoutCallback] 开始处理流式响应（无回调）');

      // 创建一个虚拟回调函数，用于处理流式响应
      // 这是关键修改：我们需要一个回调函数来处理流式响应
      let fullResponse = '';
      let lastUpdateTime = Date.now();
      const updateInterval = 50; // 50毫秒更新一次，避免过于频繁的更新

      // 创建一个虚拟回调函数
      const virtualCallback = (content: string) => {
        // 只在内容有变化且距离上次更新超过指定时间间隔时才触发回调
        if (content !== fullResponse && (Date.now() - lastUpdateTime) > updateInterval) {
          // 更新完整响应
          fullResponse = content;

          // 更新最后更新时间
          lastUpdateTime = Date.now();

          // 这里我们可以添加其他处理逻辑，例如更新UI
          console.log(`[OpenAIProvider.virtualCallback] 更新内容，当前长度: ${content.length}`);
        }
      };

      // 使用streamCompletion函数处理流式响应
      // 这样我们可以利用现有的流式处理逻辑
      return await streamCompletion(
        this.client,
        this.model.id,
        params.messages,
        params.temperature,
        params.max_tokens || params.max_completion_tokens,
        virtualCallback,
        params
      );
    } catch (error) {
      console.error('OpenAI API流式请求失败:', error);
      // 不使用logApiError，直接记录错误
      console.error('错误详情:', error);
      throw error;
    }
  }
}

/**
 * 创建适合模型的Provider
 * @param model 模型配置
 * @returns Provider实例
 */
export function createProvider(model: Model): BaseProvider {
  // 根据模型类型创建不同的Provider
  if (model.provider === 'azure' || model.providerType === 'azure-openai') {
    // 这里可以实现AzureOpenAIProvider
    console.log('[createProvider] 使用Azure OpenAI Provider');
    // 暂时使用标准OpenAI Provider
    return new OpenAIProvider(model);
  }

  return new OpenAIProvider(model);
}