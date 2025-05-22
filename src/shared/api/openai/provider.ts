/**
 * OpenAI Provider
 * 负责与OpenAI API通信
 */
import OpenAI from 'openai';
import { createClient } from './client';
import { streamCompletion } from './stream';

import {
  supportsMultimodal,
  supportsWebSearch,
  getWebSearchParams
} from './client';
import { getMainTextContent, findImageBlocks } from '../../utils/messageUtils';
import { findFileBlocks, FileTypes, getFileTypeByExtension, readFileContent } from '../../utils/fileUtils';
import {
  isReasoningModel,
  isOpenAIReasoningModel,
  isClaudeReasoningModel,
  isGeminiReasoningModel,
  isQwenReasoningModel,
  isGrokReasoningModel
} from '../../config/models';
import {
  EFFORT_RATIO,
  DEFAULT_MAX_TOKENS,
  findTokenLimit
} from '../../config/constants';
import {
  isClaudeModel,
  isGeminiModel,
  isGemmaModel
} from '../../utils/modelUtils';
// 注释掉工具相关导入，保留结构以便将来添加
// import { parseAndCallTools } from '../tools/parseAndCallTools';
import type { BaseProvider } from '../baseProvider';
import type { Message, Model } from '../../types';

/**
 * 基础OpenAI Provider
 */
export abstract class BaseOpenAIProvider implements BaseProvider {
  protected client: OpenAI;
  protected model: Model;

  constructor(model: Model) {
    this.model = model;
    this.client = createClient(model);
  }

  /**
   * 检查模型是否支持多模态
   * @param model 模型对象（可选）
   * @returns 是否支持多模态
   */
  protected supportsMultimodal(model?: Model): boolean {
    const actualModel = model || this.model;
    return supportsMultimodal(actualModel);
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
    // 使用导入的模型检测函数
    return isReasoningModel(this.model);
  }

  /**
   * 获取温度参数
   */
  protected getTemperature(): number {
    return this.model.temperature || 1.0;
  }

  /**
   * 获取top_p参数
   */
  protected getTopP(): number {
    return (this.model as any).top_p || 1.0;
  }

  /**
   * 获取推理优化参数
   * 根据模型类型和助手设置返回不同的推理参数
   * @param assistant 助手对象
   * @param model 模型对象
   * @returns 推理参数
   */
  protected getReasoningEffort(assistant?: any, model?: Model): any {
    const actualModel = model || this.model;

    // 如果模型不支持推理，返回空对象
    if (!isReasoningModel(actualModel)) {
      return {};
    }

    // 获取推理努力程度
    const reasoningEffort = assistant?.settings?.reasoning_effort;

    // 如果未设置推理努力程度，根据模型类型返回禁用推理的参数
    if (!reasoningEffort) {
      // Qwen模型
      if (isQwenReasoningModel(actualModel)) {
        return { enable_thinking: false };
      }

      // Claude模型
      if (isClaudeReasoningModel(actualModel)) {
        return { thinking: { type: 'disabled' } };
      }

      // Gemini模型
      if (isGeminiReasoningModel(actualModel)) {
        return { reasoning_effort: 'none' };
      }

      // 默认情况
      return {};
    }

    // 计算推理token预算
    const effortRatio = EFFORT_RATIO[reasoningEffort as keyof typeof EFFORT_RATIO] || 0.3; // 默认使用medium
    const tokenLimit = findTokenLimit(actualModel.id);

    // 如果找不到token限制，使用默认值
    if (!tokenLimit) {
      return { reasoning_effort: reasoningEffort };
    }

    const budgetTokens = Math.floor(
      (tokenLimit.max - tokenLimit.min) * effortRatio + tokenLimit.min
    );

    // 根据模型类型返回不同的推理参数

    // OpenAI模型
    if (isOpenAIReasoningModel(actualModel)) {
      return {
        reasoning_effort: reasoningEffort
      };
    }

    // Qwen模型
    if (isQwenReasoningModel(actualModel)) {
      return {
        enable_thinking: true,
        thinking_budget: budgetTokens
      };
    }

    // Grok模型
    if (isGrokReasoningModel(actualModel)) {
      return {
        reasoning_effort: reasoningEffort
      };
    }

    // Gemini模型
    if (isGeminiReasoningModel(actualModel)) {
      return {
        reasoning_effort: reasoningEffort
      };
    }

    // Claude模型
    if (isClaudeReasoningModel(actualModel)) {
      const maxTokens = assistant?.settings?.maxTokens;
      return {
        thinking: {
          type: 'enabled',
          budget_tokens: Math.max(1024, Math.min(budgetTokens, (maxTokens || DEFAULT_MAX_TOKENS) * effortRatio))
        }
      };
    }

    // 默认情况
    return {};
  }

  /**
   * 获取消息参数
   * 支持多种类型的消息内容，包括文本、图像、文件等
   * 支持不同模型特定的消息格式
   * @param message 消息对象
   * @param model 模型对象（可选）
   * @returns 消息参数
   */
  protected async getMessageParam(message: Message, model?: Model): Promise<any> {
    const actualModel = model || this.model;
    const isVision = this.supportsMultimodal(actualModel);

    // 获取消息内容，使用更健壮的方法
    let content = '';

    try {
      // 首先尝试使用getMainTextContent函数
      content = getMainTextContent(message);

      // 如果内容为空，尝试从其他属性获取
      if (!content || !content.trim()) {
        // 尝试从_content属性获取
        if (typeof (message as any)._content === 'string' && (message as any)._content.trim()) {
          content = (message as any)._content;
        }
        // 尝试从content属性获取
        else if (typeof (message as any).content === 'string' && (message as any).content.trim()) {
          content = (message as any).content;
        }
        // 尝试从content对象获取
        else if (typeof (message as any).content === 'object' && (message as any).content) {
          if ('text' in (message as any).content && (message as any).content.text) {
            content = (message as any).content.text;
          }
        }
      }
    } catch (error) {
      console.error(`[OpenAIProvider.getMessageParam] 获取消息内容失败:`, error);
      // 如果出错，尝试使用备用方法
      if (typeof (message as any).content === 'string') {
        content = (message as any).content;
      }
    }

    // 获取图片和文件块
    const imageBlocks = findImageBlocks(message);
    const fileBlocks = findFileBlocks(message);

    // 处理系统消息的特殊情况
    if (message.role === 'system') {
      // Claude模型的系统消息需要特殊处理
      if (isClaudeModel(actualModel)) {
        return {
          role: 'system',
          content
        };
      }

      // Gemini模型不支持系统消息，需要转换为用户消息
      if (isGeminiModel(actualModel)) {
        return {
          role: 'user',
          content: `<system>\n${content}\n</system>`
        };
      }

      // Gemma模型的系统消息需要特殊处理
      if (isGemmaModel(actualModel)) {
        return {
          role: 'user',
          content: `<start_of_turn>system\n${content}\n<end_of_turn>`
        };
      }

      // 默认处理系统消息
      return {
        role: 'system',
        content
      };
    }

    // 如果没有特殊内容，返回简单的文本消息
    if (imageBlocks.length === 0 && fileBlocks.length === 0) {
      // 根据不同模型处理消息
      if (isClaudeModel(actualModel)) {
        return {
          role: message.role,
          content
        };
      }

      if (isGeminiModel(actualModel)) {
        return {
          role: message.role === 'assistant' ? 'model' : 'user',
          content
        };
      }

      // 默认处理
      return {
        role: message.role,
        content
      };
    }

    // 处理多模态内容
    if (isVision && (imageBlocks.length > 0 || fileBlocks.length > 0)) {
      // 根据不同模型处理多模态内容
      if (isClaudeModel(actualModel)) {
        // Claude模型的多模态格式
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
          if (block.url) {
            parts.push({
              type: 'image',
              source: {
                type: 'url',
                url: block.url
              }
            });
          } else if (block.base64Data) {
            parts.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: block.mimeType || 'image/jpeg',
                data: block.base64Data
              }
            });
          }
        }

        return {
          role: message.role,
          content: parts
        };
      }

      if (isGeminiModel(actualModel)) {
        // Gemini模型的多模态格式
        const parts: any[] = [];

        // 添加文本内容
        if (content) {
          parts.push({
            text: content
          });
        }

        // 添加图片内容
        for (const block of imageBlocks) {
          if (block.url) {
            parts.push({
              inline_data: {
                mime_type: block.mimeType || 'image/jpeg',
                data: block.url.startsWith('data:') ? block.url.split(',')[1] : '[URL_IMAGE]'
              }
            });
          } else if (block.base64Data) {
            parts.push({
              inline_data: {
                mime_type: block.mimeType || 'image/jpeg',
                data: block.base64Data
              }
            });
          }
        }

        return {
          role: message.role === 'assistant' ? 'model' : 'user',
          parts
        };
      }

      // OpenAI模型的多模态格式（默认）
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
        if (block.url) {
          parts.push({
            type: 'image_url',
            image_url: {
              url: block.url,
              detail: 'auto'
            }
          });
        } else if (block.base64Data) {
          parts.push({
            type: 'image_url',
            image_url: {
              url: `data:${block.mimeType || 'image/jpeg'};base64,${block.base64Data}`,
              detail: 'auto'
            }
          });
        }
      }

      // 添加文件内容（如果支持）
      for (const block of fileBlocks) {
        if (block.file) {
          const fileType = getFileTypeByExtension(block.file.name || block.file.origin_name || '');

          // 只处理文本和文档类型的文件
          if (fileType === FileTypes.TEXT || fileType === FileTypes.DOCUMENT) {
            try {
              const fileContent = await readFileContent(block.file);
              if (fileContent) {
                parts.push({
                  type: 'text',
                  text: `文件: ${block.file.name || block.file.origin_name || '未知文件'}\n\n${fileContent}`
                });
              }
            } catch (error) {
              console.error(`[OpenAIProvider.getMessageParam] 读取文件内容失败:`, error);
            }
          }
        }
      }

      return {
        role: message.role,
        content: parts
      };
    }

    // 处理包含文件但不支持多模态的情况
    if (fileBlocks.length > 0) {
      let combinedContent = content ? content + '\n\n' : '';

      // 添加文件内容
      for (const block of fileBlocks) {
        if (block.file) {
          const fileType = getFileTypeByExtension(block.file.name || block.file.origin_name || '');

          // 只处理文本和文档类型的文件
          if (fileType === FileTypes.TEXT || fileType === FileTypes.DOCUMENT) {
            try {
              const fileContent = await readFileContent(block.file);
              if (fileContent) {
                combinedContent += `文件: ${block.file.name || block.file.origin_name || '未知文件'}\n\n${fileContent}\n\n`;
              }
            } catch (error) {
              console.error(`[OpenAIProvider.getMessageParam] 读取文件内容失败:`, error);
            }
          }
        }
      }

      // 根据不同模型处理
      if (isGeminiModel(actualModel)) {
        return {
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: combinedContent.trim() }]
        };
      }

      // 默认处理
      return {
        role: message.role,
        content: combinedContent.trim()
      };
    }

    // 默认返回文本内容
    // 根据不同模型处理
    if (isGeminiModel(actualModel)) {
      return {
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: content }]
      };
    }

    // 默认处理
    return {
      role: message.role,
      content
    };
  }

  /**
   * 构建系统提示
   * 简化版本：只返回基本提示
   * @param prompt 系统提示词
   * @returns 构建后的系统提示
   */
  protected buildSystemPrompt(prompt: string): string {
    // 直接返回提示词，如果为空则返回空字符串
    return prompt || '';

    // 注释掉工具相关代码，保留结构以便将来添加
    /*
    // 如果有工具，添加工具说明
    if (tools && tools.length > 0) {
      if (systemPrompt) systemPrompt += '\n\n';
      systemPrompt += '你有以下工具可用:\n';
      tools.forEach((tool, index) => {
        systemPrompt += `${index + 1}. ${tool.function.name}: ${tool.function.description}\n`;
      });
      systemPrompt += '\n请在适当的时候使用这些工具。';
    }
    */
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
      systemPrompt?: string;
      enableTools?: boolean; // 添加工具开关参数
    }
  ): Promise<string>;
}

/**
 * OpenAI Provider实现类
 */
export class OpenAIProvider extends BaseOpenAIProvider {
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
      systemPrompt?: string;
      enableTools?: boolean; // 添加工具开关参数
    }
  ): Promise<string> {
    console.log(`[OpenAIProvider.sendChatMessage] 开始处理聊天请求, 模型: ${this.model.id}`);

    const {
      onUpdate,
      enableWebSearch = false,
      systemPrompt = '',
      enableTools = true // 默认启用工具
    } = options || {};

    // 记录原始消息数量和内容
    console.log(`[OpenAIProvider.sendChatMessage] 原始消息数量: ${messages.length}`);

    // 记录每条原始消息的基本信息，便于调试
    messages.forEach((msg, idx) => {
      console.log(`[OpenAIProvider.sendChatMessage] 原始消息 #${idx+1}: id=${msg.id}, role=${msg.role}, blocks=${msg.blocks?.length || 0}`);

      // 尝试获取消息内容
      try {
        const content = this.getMessageContent(msg);
        console.log(`[OpenAIProvider.sendChatMessage] 原始消息 #${idx+1} 内容: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
      } catch (error) {
        console.error(`[OpenAIProvider.sendChatMessage] 获取原始消息 #${idx+1} 内容失败:`, error);
      }
    });

    // 极简版消息处理逻辑
    // 1. 准备消息数组
    let apiMessages = [];

    // 2. 获取系统提示
    const finalSystemPrompt = this.buildSystemPrompt(systemPrompt);

    // 注释掉工具相关代码，保留结构以便将来添加
    /*
    // 如果启用工具功能，构建工具参数
    let toolsParams;
    if (enableTools && tools && tools.length > 0) {
      toolsParams = createToolsParams(tools).tools;
      finalSystemPrompt = this.buildSystemPrompt(systemPrompt, toolsParams);
    }
    */

    // 3. 如果系统提示不为空，添加系统消息
    if (finalSystemPrompt.trim()) {
      apiMessages.push({
        role: 'system',
        content: finalSystemPrompt
      });
      console.log(`[OpenAIProvider.sendChatMessage] 添加系统提示: ${finalSystemPrompt.substring(0, 50)}${finalSystemPrompt.length > 50 ? '...' : ''}`);
    } else {
      console.log(`[OpenAIProvider.sendChatMessage] 系统提示为空，不添加系统消息`);
    }

    // 4. 处理用户和助手消息 - 直接使用原始消息的role和content属性
    for (const message of messages) {
      // 获取消息内容 - 使用as any绕过类型检查
      const content = (message as any).content;

      // 只添加有内容的消息
      if (content && typeof content === 'string' && content.trim()) {
        apiMessages.push({
          role: message.role,
          content: content
        });

        console.log(`[OpenAIProvider.sendChatMessage] 添加消息: role=${message.role}, content=${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
      }
    }

    // 记录处理后的系统消息状态
    const finalSystemMessage = apiMessages.find(msg => msg.role === 'system');
    if (finalSystemMessage) {
      console.log(`[OpenAIProvider.sendChatMessage] 最终系统消息内容: ${
        typeof finalSystemMessage.content === 'string'
          ? (finalSystemMessage.content.substring(0, 50) + (finalSystemMessage.content.length > 50 ? '...' : ''))
          : '[复杂内容]'
      }`);
    } else {
      console.log(`[OpenAIProvider.sendChatMessage] 最终消息数组中没有系统消息`);
    }

    console.log(`[OpenAIProvider.sendChatMessage] 最终API消息数量: ${apiMessages.length}`);

    // 确保至少有一条用户消息 - 电脑版风格的安全检查
    // 只有在apiMessages中只有系统消息且没有用户消息时才添加默认消息
    if (apiMessages.length <= 1 && !apiMessages.some(msg => msg.role === 'user')) {
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
        ? (m.content.substring(0, 100) + (m.content.length > 100 ? '...' : ''))
        : '[复杂内容]'
    }))));

    // 详细记录系统消息和用户消息的内容
    const systemMsg = apiMessages.find(m => m.role === 'system');
    const userMsgs = apiMessages.filter(m => m.role === 'user');

    if (systemMsg) {
      console.log(`[OpenAIProvider.sendChatMessage] 系统消息内容: ${
        typeof systemMsg.content === 'string'
          ? (systemMsg.content.substring(0, 200) + (systemMsg.content.length > 200 ? '...' : ''))
          : '[复杂内容]'
      }`);
    }

    if (userMsgs.length > 0) {
      userMsgs.forEach((msg, idx) => {
        console.log(`[OpenAIProvider.sendChatMessage] 用户消息 #${idx+1} 内容: ${
          typeof msg.content === 'string'
            ? (msg.content.substring(0, 200) + (msg.content.length > 200 ? '...' : ''))
            : '[复杂内容]'
        }`);
      });
    }

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

    // 不使用工具功能
    console.log(`[OpenAIProvider.sendChatMessage] 工具功能已简化，不添加工具参数`);

    // 不添加推理参数
    console.log(`[OpenAIProvider.sendChatMessage] 跳过推理参数配置`);

    try {
      // 使用流式响应处理
      if (onUpdate) {
        console.log(`[OpenAIProvider.sendChatMessage] 使用流式响应模式（有回调）`);
        return await this.handleStreamResponse(requestParams, onUpdate, enableTools);
      } else {
        // 即使没有回调，也使用流式响应，但结果会在完成后一次性返回
        // 这与电脑版的行为一致，电脑版总是使用流式响应
        console.log(`[OpenAIProvider.sendChatMessage] 使用流式响应模式（无回调）`);
        return await this.handleStreamResponseWithoutCallback(requestParams, enableTools);
      }
    } catch (error) {
      console.error('[OpenAIProvider.sendChatMessage] API请求失败:', error);
      throw error;
    }
  }

  /**
   * 获取消息内容
   * 极简版本：直接从消息对象中获取content属性
   * @param message 消息对象
   * @returns 消息内容
   */
  protected getMessageContent(message: Message): string {
    // 直接从消息对象中获取content属性
    const content = (message as any).content;

    // 如果content是字符串，直接返回
    if (content && typeof content === 'string') {
      return content;
    }

    // 否则返回空字符串
    return '';
  }

  /**
   * 处理流式响应
   * @param params 请求参数
   * @param onUpdate 更新回调
   * @returns 响应内容
   */
  private async handleStreamResponse(
    params: any,
    onUpdate: (content: string, reasoning?: string) => void,
    enableTools: boolean = true
  ): Promise<string> {
    // 简化的回调函数，直接调用原始回调
    const enhancedCallback = (content: string, reasoning?: string) => {
      // 调用原始回调函数
      onUpdate(content, reasoning);

      // 注释掉工具相关代码，保留结构以便将来添加
      /*
      // 创建工具响应数组，用于存储工具调用响应
      const toolResponses: any[] = [];

      // 如果有通用工具列表，尝试解析工具调用
      if (params.genericTools && params.genericTools.length > 0) {
        try {
          // 解析并调用工具
          await parseAndCallTools(
            content,
            toolResponses,
            onUpdate,
            undefined,
            this.model,
            params.genericTools
          );
        } catch (error) {
          console.error('[OpenAIProvider.handleStreamResponse] 处理工具调用失败:', error);
        }
      }
      */
    };

    // 调用流式完成函数
    return await streamCompletion(
      this.client,
      this.model.id,
      params.messages,
      params.temperature,
      params.max_tokens || params.max_completion_tokens,
      enhancedCallback,
      {
        ...params,
        enableReasoning: this.supportsReasoning() && enableTools,
        enableTools: enableTools
      }
    );
  }

  /**
   * 处理流式响应（无回调）
   * 使用流式响应但不使用回调，结果会在完成后一次性返回
   * 这与电脑版的行为一致
   * @param params 请求参数
   * @returns 响应内容
   */
  private async handleStreamResponseWithoutCallback(params: any, enableTools: boolean = true): Promise<string> {
    try {
      console.log('[OpenAIProvider.handleStreamResponseWithoutCallback] 开始处理流式响应（无回调）');

      // 创建一个虚拟回调函数，用于处理流式响应
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

          // 注释掉工具相关代码，保留结构以便将来添加
          /*
          // 创建工具响应数组，用于存储工具调用响应
          const toolResponses: any[] = [];

          // 如果有通用工具列表，尝试解析工具调用
          if (params.genericTools && params.genericTools.length > 0) {
            try {
              // 解析并调用工具
              await parseAndCallTools(
                content,
                toolResponses,
                undefined,
                undefined,
                this.model,
                params.genericTools
              );
            } catch (error) {
              console.error('[OpenAIProvider.virtualCallback] 处理工具调用失败:', error);
            }
          }
          */
        }
      };

      // 使用streamCompletion函数处理流式响应
      return await streamCompletion(
        this.client,
        this.model.id,
        params.messages,
        params.temperature,
        params.max_tokens || params.max_completion_tokens,
        virtualCallback,
        {
          ...params,
          enableReasoning: this.supportsReasoning() && enableTools,
          enableTools: enableTools
        }
      );
    } catch (error) {
      console.error('OpenAI API流式请求失败:', error);
      // 不使用logApiError，直接记录错误
      console.error('错误详情:', error);
      throw error;
    }
  }
}
