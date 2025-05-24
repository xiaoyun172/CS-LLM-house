/**
 * Gemini Provider模块
 * 提供类似最佳实例的Provider类实现
 * 支持推理模型、图像生成、文件处理等完整功能
 */
import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory
} from '@google/generative-ai';
import type {
  SafetySetting as GeminiSafetySetting,
  Part
} from '@google/generative-ai';
import type { Message, Model, MCPTool, FileType } from '../../types';
import { logApiRequest, logApiResponse } from '../../services/LoggerService';
import { createClient } from './client';
import { getMainTextContent } from '../../utils/messageUtils';
import { AbstractBaseProvider } from '../baseProvider';
import store from '../../store';
import { isGeminiReasoningModel, isGenerateImageModel, findTokenLimit } from '../../config/models';
import { createGeminiFileService, GeminiFileService } from './fileService';

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



/**
 * 基础Provider抽象类
 */
export abstract class BaseProvider extends AbstractBaseProvider {
  protected client: GoogleGenerativeAI;

  constructor(model: Model) {
    super(model);
    this.client = createClient(model);
  }

  /**
   * 将 MCP 工具转换为 Gemini 工具格式
   */
  public convertMcpTools<T>(mcpTools: MCPTool[]): T[] {
    // 临时同步实现，避免 require 错误
    return mcpTools.map((tool) => {
      // 清理工具名称，确保符合 Gemini 的要求
      let toolName = tool.id || tool.name;

      // 如果名称以数字开头，添加前缀
      if (/^\d/.test(toolName)) {
        toolName = `mcp_${toolName}`;
      }

      // 移除不允许的字符，只保留字母、数字、下划线、点和短横线
      toolName = toolName.replace(/[^a-zA-Z0-9_.-]/g, '_');

      // 确保名称不超过64个字符
      if (toolName.length > 64) {
        toolName = toolName.substring(0, 64);
      }

      // 确保名称以字母或下划线开头
      if (!/^[a-zA-Z_]/.test(toolName)) {
        toolName = `tool_${toolName}`;
      }

      console.log(`[Gemini] 转换工具名称: ${tool.id || tool.name} -> ${toolName}`);

      return {
        functionDeclarations: [{
          name: toolName,
          description: tool.description,
          parameters: tool.inputSchema
        }]
      };
    }) as T[];
  }

  /**
   * 发送聊天消息
   */
  abstract sendChatMessage(
    messages: Message[],
    options?: {
      onUpdate?: (content: string, reasoning?: string) => void;
      enableWebSearch?: boolean;
      enableThinking?: boolean;
      enableTools?: boolean;
      mcpTools?: import('../../types').MCPTool[];
      mcpMode?: 'prompt' | 'function'; // 添加 MCP 模式参数
      systemPrompt?: string;
      abortSignal?: AbortSignal;
    }
  ): Promise<string | { content: string; reasoning?: string; reasoningTime?: number }>;

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
  private fileService: GeminiFileService;

  constructor(model: Model) {
    super(model);
    this.fileService = createGeminiFileService(model);
  }



  /**
   * 获取安全设置
   */
  private getSafetySettings(): GeminiSafetySetting[] {
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
   * 获取推理配置 - 支持Gemini推理模型
   * @param assistant 助手配置
   * @param model 模型配置
   * @returns 推理配置
   */
  private getReasoningConfig(assistant: any, model: Model): any {
    if (!isGeminiReasoningModel(model)) {
      return {};
    }

    const reasoningEffort = assistant?.settings?.reasoning_effort;

    // 如果thinking_budget是undefined，不思考
    if (reasoningEffort === undefined) {
      return {
        thinkingConfig: {
          includeThoughts: false,
          thinkingBudget: 0
        }
      };
    }

    const effortMap: Record<string, number> = {
      low: 0.2,
      medium: 0.5,
      high: 0.8,
      auto: 2
    };
    const effortRatio = effortMap[reasoningEffort] || 0.5;

    if (effortRatio > 1) {
      return {};
    }

    const tokenLimit = findTokenLimit(model.id);
    const maxTokens = tokenLimit?.max || 8192;

    // 如果thinking_budget是明确设置的值（包括0），使用该值
    return {
      thinkingConfig: {
        thinkingBudget: Math.floor(maxTokens * effortRatio),
        includeThoughts: true
      }
    };
  }

  /**
   * 获取消息内容 - 最佳实例风格的消息内容提取
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
   * 获取消息中的图片 - 最佳实例风格的图片提取
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
   * 上传文件到 Gemini - 最佳实例风格的文件上传
   * @param file 文件对象
   * @returns Gemini 文件对象
   */
  async uploadFile(file: FileType): Promise<any> {
    try {
      console.log(`[GeminiProvider.uploadFile] 开始上传文件: ${file.origin_name}`);
      return await this.fileService.uploadFile(file);
    } catch (error) {
      console.error('[GeminiProvider.uploadFile] 文件上传失败:', error);
      throw error;
    }
  }

  /**
   * 获取文件的 base64 编码 - 最佳实例风格的文件处理
   * @param file 文件对象
   * @returns base64 数据和 MIME 类型
   */
  async getBase64File(file: FileType): Promise<{ data: string; mimeType: string }> {
    try {
      console.log(`[GeminiProvider.getBase64File] 获取文件 base64: ${file.origin_name}`);
      return await this.fileService.getBase64File(file);
    } catch (error) {
      console.error('[GeminiProvider.getBase64File] 获取文件 base64 失败:', error);
      throw error;
    }
  }

  /**
   * 列出已上传的文件 - 最佳实例风格的文件管理
   * @returns 文件列表
   */
  async listFiles(): Promise<any[]> {
    try {
      console.log(`[GeminiProvider.listFiles] 获取文件列表`);
      return await this.fileService.listFiles();
    } catch (error) {
      console.error('[GeminiProvider.listFiles] 获取文件列表失败:', error);
      throw error;
    }
  }

  /**
   * 删除已上传的文件 - 最佳实例风格的文件管理
   * @param fileId Gemini 文件 ID
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      console.log(`[GeminiProvider.deleteFile] 删除文件: ${fileId}`);
      await this.fileService.deleteFile(fileId);
    } catch (error) {
      console.error('[GeminiProvider.deleteFile] 删除文件失败:', error);
      throw error;
    }
  }

  /**
   * 图像生成功能 - 支持Gemini图像生成
   */
  async generateImageByChat(
    messages: Message[],
    options?: {
      onUpdate?: (content: string) => void;
      assistant?: any;
    }
  ): Promise<string[]> {
    try {
      console.log(`[GeminiProvider.generateImageByChat] 开始图像生成, 模型: ${this.model.id}`);

      // 检查模型是否支持图像生成
      if (!isGenerateImageModel(this.model)) {
        throw new Error(`模型 ${this.model.id} 不支持图像生成功能`);
      }

      const { onUpdate } = options || {};

      // 获取最后一条用户消息作为提示词
      const lastUserMessage = messages.slice().reverse().find(msg => msg.role === 'user');
      if (!lastUserMessage) {
        throw new Error('没有找到用户消息作为图像生成提示');
      }

      // 获取消息内容
      const prompt = this.getMessageContent(lastUserMessage);
      if (!prompt.trim()) {
        throw new Error('没有找到有效的图像生成提示词');
      }

      // 通知开始生成
      if (onUpdate) {
        onUpdate('正在使用 Gemini 生成图像...');
      }

      // 创建生成模型配置
      const modelConfig: any = {
        model: this.model.id,
        generationConfig: {
          temperature: this.getTemperature(),
          maxOutputTokens: this.getMaxTokens()
        },
        safetySettings: this.getSafetySettings()
      };

      // 创建生成模型
      const genModel = this.client.getGenerativeModel(modelConfig);

      // 构建图像生成提示词
      const imagePrompt = `Generate an image based on this description: ${prompt}`;

      // 发送请求
      const result = await genModel.generateContent(imagePrompt);
      const response = result.response;

      // 处理图像响应
      const candidates = response.candidates;
      if (!candidates || !candidates[0] || !candidates[0].content) {
        throw new Error('Gemini图像生成失败: 未收到有效响应');
      }

      const parts = candidates[0].content.parts;
      if (!parts) {
        throw new Error('Gemini图像生成失败: 响应中没有内容部分');
      }

      // 提取图像数据
      const images = parts
        .filter((part: Part) => part.inlineData)
        .map((part: Part) => {
          if (!part.inlineData) {
            return null;
          }
          const dataPrefix = `data:${part.inlineData.mimeType || 'image/png'};base64,`;
          return part.inlineData.data?.startsWith('data:') ? part.inlineData.data : dataPrefix + part.inlineData.data;
        })
        .filter((image: string | null) => image !== null);

      if (images.length === 0) {
        // 如果没有图像，尝试从文本响应中获取信息
        const text = response.text();
        throw new Error(`Gemini图像生成失败: ${text || '未生成图像内容'}`);
      }

      // 通知生成完成
      if (onUpdate) {
        onUpdate(`Gemini 图像生成完成！生成了 ${images.length} 张图像。`);
      }

      console.log(`[GeminiProvider.generateImageByChat] 图像生成成功, 生成了 ${images.length} 张图像`);
      return images;
    } catch (error) {
      console.error('Gemini图像生成失败:', error);
      throw error;
    }
  }

  /**
   * 发送聊天消息 - 最佳实例风格的消息处理
   */
  async sendChatMessage(
    messages: Message[],
    options?: {
      onUpdate?: (content: string, reasoning?: string) => void;
      enableWebSearch?: boolean;
      enableThinking?: boolean;
      enableTools?: boolean;
      mcpTools?: import('../../types').MCPTool[];
      mcpMode?: 'prompt' | 'function'; // 添加 MCP 模式参数
      systemPrompt?: string;
      abortSignal?: AbortSignal;
      assistant?: any; // 添加助手配置
    }
  ): Promise<string | { content: string; reasoning?: string; reasoningTime?: number }> {
    try {
      console.log(`[GeminiProvider.sendChatMessage] 开始处理聊天请求, 模型: ${this.model.id}, 消息数量: ${messages.length}`);

      const {
        onUpdate,
        enableWebSearch = false,
        enableThinking = false,
        enableTools = true,
        mcpTools = [],
        mcpMode = 'function', // 默认使用函数调用模式
        systemPrompt = '',
        abortSignal,
        assistant
      } = options || {};

      // 使用变量避免未使用警告
      void enableWebSearch;
      void enableThinking;
      void abortSignal;

      // 检查是否为图像生成请求
      if (assistant?.enableGenerateImage && isGenerateImageModel(this.model)) {
        console.log(`[GeminiProvider.sendChatMessage] 检测到图像生成请求，切换到图像生成模式`);
        const images = await this.generateImageByChat(messages, { onUpdate, assistant });
        return `已生成 ${images.length} 张图像。`;
      }

      // 智能工具配置设置
      const { tools } = this.setupToolsConfig({
        mcpTools,
        model: this.model,
        enableToolUse: enableTools,
        mcpMode: mcpMode // 传递 MCP 模式
      });

      // 准备消息数组 - 最佳实例风格的消息处理
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

      // 构建系统指令（包含智能工具注入）
      let finalSystemInstruction = systemPrompt;
      if (systemMessage) {
        if (typeof systemMessage.content === 'string') {
          finalSystemInstruction = systemMessage.content;
        } else if (systemMessage.content && typeof systemMessage.content === 'object') {
          finalSystemInstruction = (systemMessage.content as any)?.text || '';
        }
      }

      // 使用智能工具注入机制
      const systemInstructionWithTools = this.buildSystemPromptWithTools(finalSystemInstruction, mcpTools);

      // 创建生成模型配置
      const modelConfig: any = {
        model: this.model.id,
        systemInstruction: systemInstructionWithTools || undefined,
        generationConfig: {
          temperature: this.getTemperature(),
          maxOutputTokens: this.getMaxTokens(),
          topP: 0.95
        },
        safetySettings: this.getSafetySettings(),
        // 添加推理配置支持
        ...this.getReasoningConfig(assistant, this.model)
      };

      // 添加 MCP 工具支持（仅在函数调用模式下）
      if (enableTools && !this.getUseSystemPromptForTools() && tools.length > 0) {
        modelConfig.tools = tools;
        console.log(`[GeminiProvider] 函数调用模式：添加 ${tools.length} 个 MCP 工具`);
      } else if (enableTools && this.getUseSystemPromptForTools() && mcpTools && mcpTools.length > 0) {
        console.log(`[GeminiProvider] 系统提示词模式：${mcpTools.length} 个工具已注入到系统提示词中`);
      }

      // 创建生成模型
      const genModel = this.client.getGenerativeModel(modelConfig);

      // 如果有onUpdate回调，使用流式响应
      if (onUpdate) {
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
          onUpdate(fullResponse);
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
   * 获取模型列表 - 移动端版本，参考旧版本实现
   * 直接返回预设模型列表，避免 CORS 问题
   */
  async getModels(): Promise<any[]> {
    console.log(`[GeminiProvider.getModels] 返回预设 Gemini 模型列表`);

    // 移动端直接返回预设模型列表，就像旧版本一样
    return [
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        description: '强大的多模态模型，支持长上下文和复杂推理',
        owned_by: 'gemini',
        object: 'model',
        created: Date.now()
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        description: '快速高效的多模态模型，适合日常对话',
        owned_by: 'gemini',
        object: 'model',
        created: Date.now()
      },
      {
        id: 'gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash (Experimental)',
        description: 'Gemini 2.0 Flash 实验版本，具有最新功能',
        owned_by: 'gemini',
        object: 'model',
        created: Date.now()
      },
      {
        id: 'gemini-2.0-flash-thinking-exp',
        name: 'Gemini 2.0 Flash Thinking (Experimental)',
        description: 'Gemini 2.0 Flash 思维版本，支持推理过程展示',
        owned_by: 'gemini',
        object: 'model',
        created: Date.now()
      },
      {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        description: '通用文本模型，适合文本生成和分析',
        owned_by: 'gemini',
        object: 'model',
        created: Date.now()
      },
      {
        id: 'gemini-pro-vision',
        name: 'Gemini Pro Vision',
        description: '支持图像的多模态模型，可以理解和分析图片',
        owned_by: 'gemini',
        object: 'model',
        created: Date.now()
      }
    ];
  }
}

/**
 * 创建Provider实例
 */
export function createProvider(model: Model): GeminiProvider {
  return new GeminiProvider(model);
}