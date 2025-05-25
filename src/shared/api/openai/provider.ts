/**
 * OpenAI Provider
 * 负责与OpenAI API通信
 */
import OpenAI from 'openai';
import { createClient } from './client';
import { streamCompletion } from './stream';
// import { createResponseHandler } from './responseHandler'; // 暂时注释，将来使用

import {
  supportsMultimodal,
  supportsWebSearch,
  getWebSearchParams
} from './client';

import {
  isReasoningModel,
  isOpenAIReasoningModel,
  isClaudeReasoningModel,
  isGeminiReasoningModel,
  isQwenReasoningModel,
  isGrokReasoningModel,
  isDeepSeekReasoningModel
} from '../../utils/modelDetection';
import {
  EFFORT_RATIO,
  DEFAULT_MAX_TOKENS,
  findTokenLimit
} from '../../config/constants';
import { getDefaultThinkingEffort } from '../../utils/settingsUtils';

// 注释掉工具相关导入，保留结构以便将来添加
// import { parseAndCallTools } from '../tools/parseAndCallTools';
import { getStreamOutputSetting } from '../../utils/settingsUtils';
import { AbstractBaseProvider } from '../baseProvider';
import type { Message, Model, MCPTool, MCPToolResponse, MCPCallToolResponse } from '../../types';
import { parseAndCallTools, parseToolUse, removeToolUseTags } from '../../utils/mcpToolParser';

/**
 * 基础OpenAI Provider
 */
export abstract class BaseOpenAIProvider extends AbstractBaseProvider {
  protected client: OpenAI;

  constructor(model: Model) {
    super(model);
    this.client = createClient(model);
  }

  /**
   * 将 MCP 工具转换为 OpenAI 工具格式
   */
  public convertMcpTools<T>(mcpTools: MCPTool[]): T[] {
    // 临时同步实现，避免 require 错误
    return mcpTools.map((tool) => {
      // 清理工具名称，确保符合各种模型的要求
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

      console.log(`[OpenAI] 转换工具名称: ${tool.id || tool.name} -> ${toolName}`);

      return {
        type: 'function',
        function: {
          name: toolName,
          description: tool.description,
          parameters: tool.inputSchema
        }
      };
    }) as T[];
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
   * 获取推理优化参数 - 完整支持版本
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

    // 获取推理努力程度 - 优先使用助手设置，否则使用全局默认设置
    const reasoningEffort = assistant?.settings?.reasoning_effort || getDefaultThinkingEffort();

    console.log(`[OpenAI] 模型 ${actualModel.id} 推理努力程度: ${reasoningEffort}`);

    // 如果明确禁用推理或设置为 'off'
    if (reasoningEffort === 'disabled' || reasoningEffort === 'none' || reasoningEffort === 'off') {
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

      // DeepSeek模型：不支持 reasoning_effort: "off"，返回空对象
      if (isDeepSeekReasoningModel(actualModel)) {
        console.log(`[OpenAI] DeepSeek模型不支持禁用推理，跳过推理参数`);
        return {};
      }

      // OpenAI模型：不支持 reasoning_effort: "off"，返回空对象
      if (isOpenAIReasoningModel(actualModel)) {
        console.log(`[OpenAI] OpenAI推理模型不支持禁用推理，跳过推理参数`);
        return {};
      }

      // Grok模型：不支持 reasoning_effort: "off"，返回空对象
      if (isGrokReasoningModel(actualModel)) {
        console.log(`[OpenAI] Grok模型不支持禁用推理，跳过推理参数`);
        return {};
      }

      // 默认情况
      return {};
    }

    // 计算推理token预算
    const effortRatio = EFFORT_RATIO[reasoningEffort as keyof typeof EFFORT_RATIO] || 0.3; // 默认使用medium
    const tokenLimit = findTokenLimit(actualModel.id);

    // 如果找不到token限制，使用默认值
    if (!tokenLimit) {
      // 对于DeepSeek模型，检查是否支持该推理努力程度
      if (isDeepSeekReasoningModel(actualModel)) {
        // DeepSeek只支持 'low' 和 'high'
        const supportedEffort = reasoningEffort === 'medium' ? 'high' : reasoningEffort;
        if (supportedEffort === 'low' || supportedEffort === 'high') {
          return { reasoning_effort: supportedEffort };
        } else {
          console.log(`[OpenAI] DeepSeek模型不支持推理努力程度 ${reasoningEffort}，跳过推理参数`);
          return {};
        }
      }
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

    // DeepSeek推理模型
    if (isDeepSeekReasoningModel(actualModel)) {
      // DeepSeek只支持 'low' 和 'high'
      const supportedEffort = reasoningEffort === 'medium' ? 'high' : reasoningEffort;
      if (supportedEffort === 'low' || supportedEffort === 'high') {
        return { reasoning_effort: supportedEffort };
      } else {
        console.log(`[OpenAI] DeepSeek模型不支持推理努力程度 ${reasoningEffort}，跳过推理参数`);
        return {};
      }
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
      // Grok只支持 'low' 和 'high'
      const supportedEffort = reasoningEffort === 'medium' ? 'high' : reasoningEffort;
      if (supportedEffort === 'low' || supportedEffort === 'high') {
        return { reasoning_effort: supportedEffort };
      } else {
        console.log(`[OpenAI] Grok模型不支持推理努力程度 ${reasoningEffort}，跳过推理参数`);
        return {};
      }
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
   * 构建系统提示
   * 智能版本：根据模式自动注入 MCP 工具信息
   * @param prompt 系统提示词
   * @param mcpTools MCP 工具列表
   * @returns 构建后的系统提示
   */
  protected buildSystemPrompt(prompt: string, mcpTools?: MCPTool[]): string {
    return this.buildSystemPromptWithTools(prompt, mcpTools);
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
   * 将 MCP 工具调用响应转换为消息格式
   */
  public mcpToolCallResponseToMessage(
    mcpToolResponse: MCPToolResponse,
    resp: MCPCallToolResponse,
    _model: Model
  ): any {
    if ('toolCallId' in mcpToolResponse && mcpToolResponse.toolCallId) {
      return {
        role: 'tool',
        tool_call_id: mcpToolResponse.toolCallId,
        content: `Here is the result of mcp tool use \`${mcpToolResponse.tool.name}\`:\n\n${JSON.stringify(resp.content)}`
      };
    }

    return {
      role: 'user',
      content: `Here is the result of mcp tool use \`${mcpToolResponse.tool.name}\`:\n\n${JSON.stringify(resp.content)}`
    };
  }

  /**
   * 将工具调用转换为 MCP 工具响应
   */
  protected convertToolCallsToMcpResponses(
    toolCalls: any[],
    mcpTools: MCPTool[]
  ): MCPToolResponse[] {
    return toolCalls
      .map((toolCall) => {
        const mcpTool = this.findMcpToolByName(mcpTools, toolCall.function.name);
        if (!mcpTool) return undefined;

        const parsedArgs = (() => {
          try {
            return JSON.parse(toolCall.function.arguments);
          } catch {
            return toolCall.function.arguments;
          }
        })();

        return {
          id: toolCall.id,
          toolCallId: toolCall.id,
          tool: mcpTool,
          arguments: parsedArgs,
          status: 'pending' as const
        } as MCPToolResponse;
      })
      .filter((t): t is MCPToolResponse => typeof t !== 'undefined');
  }

  /**
   * 根据名称查找 MCP 工具
   */
  private findMcpToolByName(mcpTools: MCPTool[], toolName: string): MCPTool | undefined {
    return mcpTools.find(tool => {
      // 检查原始名称
      if (tool.id === toolName || tool.name === toolName) {
        return true;
      }

      // 检查转换后的名称
      let convertedName = tool.id || tool.name;
      if (/^\d/.test(convertedName)) {
        convertedName = `mcp_${convertedName}`;
      }
      convertedName = convertedName.replace(/[^a-zA-Z0-9_.-]/g, '_');
      if (convertedName.length > 64) {
        convertedName = convertedName.substring(0, 64);
      }
      if (!/^[a-zA-Z_]/.test(convertedName)) {
        convertedName = `tool_${convertedName}`;
      }

      return convertedName === toolName;
    });
  }

  /**
   * 处理工具调用
   */
  protected async processToolCalls(
    toolCalls: any[],
    mcpTools: MCPTool[]
  ): Promise<any[]> {
    if (!toolCalls || toolCalls.length === 0) {
      return [];
    }

    console.log(`[OpenAI] 处理 ${toolCalls.length} 个工具调用`);

    const mcpToolResponses = this.convertToolCallsToMcpResponses(toolCalls, mcpTools);

    const results = await parseAndCallTools(
      mcpToolResponses,
      mcpTools
    );

    return results.map((result, index) =>
      this.mcpToolCallResponseToMessage(mcpToolResponses[index], result, this.model)
    ).filter(Boolean);
  }

  /**
   * 处理工具使用（XML 格式）
   */
  protected async processToolUses(
    content: string,
    mcpTools: MCPTool[],
    onChunk?: (chunk: import('../../types/chunk').Chunk) => void
  ): Promise<any[]> {
    if (!content || !mcpTools || mcpTools.length === 0) {
      console.log(`[OpenAI] processToolUses 跳过 - 内容: ${!!content}, 工具数量: ${mcpTools?.length || 0}`);
      return [];
    }

    console.log(`[OpenAI] 检查 XML 格式的工具使用 - 工具数量: ${mcpTools.length}`);
    console.log(`[OpenAI] 可用工具列表:`, mcpTools.map(t => ({ id: t.id, name: t.name })));

    // 从内容中解析工具响应
    const toolResponses = parseToolUse(content, mcpTools);
    console.log(`[OpenAI] 解析到的工具响应数量: ${toolResponses.length}`);

    if (toolResponses.length === 0) {
      console.log(`[OpenAI] 未检测到工具调用`);
      return [];
    }

    const results = await parseAndCallTools(
      content,
      mcpTools,
      undefined, // onUpdate 回调
      onChunk    // onChunk 回调 - 传递给工具调用处理
    );

    console.log(`[OpenAI] 工具调用结果数量: ${results.length}`);

    return results.map((result, index) => {
      if (index < toolResponses.length) {
        return this.mcpToolCallResponseToMessage(toolResponses[index], result, this.model);
      }
      return null;
    }).filter(Boolean);
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
      mcpTools?: import('../../types').MCPTool[]; // 添加 MCP 工具参数
      mcpMode?: 'prompt' | 'function'; // 添加 MCP 模式参数
      abortSignal?: AbortSignal;
    }
  ): Promise<string | { content: string; reasoning?: string; reasoningTime?: number }>;
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
      onChunk?: (chunk: import('../../types/chunk').Chunk) => void;
      enableWebSearch?: boolean;
      systemPrompt?: string;
      enableTools?: boolean; // 添加工具开关参数
      mcpTools?: import('../../types').MCPTool[]; // 添加 MCP 工具参数
      mcpMode?: 'prompt' | 'function'; // 添加 MCP 模式参数
      abortSignal?: AbortSignal; // 添加中断信号参数
    }
  ): Promise<string | { content: string; reasoning?: string; reasoningTime?: number }> {
    console.log(`[OpenAIProvider.sendChatMessage] 开始处理聊天请求, 模型: ${this.model.id}`);

    const {
      onUpdate,
      onChunk,
      enableWebSearch = false,
      systemPrompt = '',
      enableTools = true, // 默认启用工具
      mcpTools = [], // MCP 工具列表
      mcpMode = 'function', // 默认使用函数调用模式
      abortSignal
    } = options || {};

    // 调试日志：显示当前的 MCP 配置
    console.log(`[OpenAIProvider] MCP 配置 - 模式: ${mcpMode}, 工具数量: ${mcpTools.length}, 启用: ${enableTools}`);

    // 记录原始消息数量
    console.log(`[OpenAIProvider.sendChatMessage] 处理 ${messages.length} 条消息`);

    // 极简版消息处理逻辑
    // 1. 准备消息数组
    let apiMessages = [];

    // 2. 智能工具配置设置
    const { tools } = this.setupToolsConfig({
      mcpTools,
      model: this.model,
      enableToolUse: enableTools,
      mcpMode: mcpMode // 传递 MCP 模式
    });

    // 3. 获取系统提示（包含智能工具注入）
    const finalSystemPrompt = this.buildSystemPrompt(systemPrompt, mcpTools);

    // 4. 如果系统提示不为空，添加系统消息
    if (finalSystemPrompt.trim()) {
      apiMessages.push({
        role: 'system',
        content: finalSystemPrompt
      });
    }

    // 4. 处理用户和助手消息 - 直接使用传入的消息格式
    for (const message of messages) {
      try {
        // 检查消息是否已经是API格式（来自prepareMessagesForApi）
        const content = (message as any).content;

        if (content !== undefined) {
          // 直接使用传入的消息格式，不再进行额外处理
          apiMessages.push({
            role: message.role,
            content: content // 保持原始格式（字符串或数组）
          });
        }
      } catch (error) {
        console.error(`[OpenAIProvider.sendChatMessage] 处理消息失败:`, error);

        // 降级处理：使用原始内容
        const content = (message as any).content;
        if (content && typeof content === 'string' && content.trim()) {
          apiMessages.push({
            role: message.role,
            content: content
          });
        }
      }
    }

    // 确保至少有一条用户消息
    if (apiMessages.length <= 1 && !apiMessages.some(msg => msg.role === 'user')) {
      apiMessages.push({
        role: 'user',
        content: '你好'
      });
    }

    // 强制检查：确保messages数组不为空
    if (apiMessages.length === 0) {
      apiMessages.push({
        role: 'user',
        content: '你好'
      });
    }

    // 构建请求参数 - 从设置中读取流式输出配置
    const streamEnabled = getStreamOutputSetting();
    const requestParams: any = {
      model: this.model.id,
      messages: apiMessages,
      temperature: this.getTemperature(),
      top_p: this.getTopP(),
      max_tokens: this.model.maxTokens,
      stream: streamEnabled // 从设置中读取流式输出配置
    };

    // 添加 MCP 工具支持（参考最佳实例逻辑）
    // 只有在函数调用模式且有工具时才添加 tools 参数
    if (enableTools && !this.getUseSystemPromptForTools() && tools.length > 0) {
      requestParams.tools = tools;
      requestParams.tool_choice = 'auto';
      console.log(`[OpenAIProvider] 函数调用模式：添加 ${tools.length} 个 MCP 工具到 API 请求`);
    } else {
      // 参考最佳实例：tools 为空或提示词模式时，不设置 tools 参数
      // 这样 API 请求中就不会包含 tools 字段
      console.log(`[OpenAIProvider] 不添加 tools 参数到 API 请求 - 模式: ${this.getUseSystemPromptForTools() ? '提示词' : '函数调用'}, 工具数量: ${tools.length}, 启用: ${enableTools}`);
    }

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
    }

    // 添加推理参数（支持DeepSeek等推理模型）
    if (this.supportsReasoning()) {
      const reasoningParams = this.getReasoningEffort();
      Object.assign(requestParams, reasoningParams);
    }

    try {
      // 根据流式输出设置选择响应处理方式
      if (streamEnabled) {
        // 使用流式响应处理
        if (onUpdate) {
          return await this.handleStreamResponse(requestParams, onUpdate, enableTools, mcpTools, abortSignal, onChunk);
        } else {
          return await this.handleStreamResponseWithoutCallback(requestParams, enableTools, mcpTools, abortSignal, onChunk);
        }
      } else {
        // 使用非流式响应处理
        return await this.handleNonStreamResponse(requestParams, onUpdate, onChunk, enableTools, mcpTools, abortSignal);
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
   * @param enableTools 是否启用工具
   * @param mcpTools MCP 工具列表
   * @param abortSignal 中断信号
   * @returns 响应内容
   */
  private async handleStreamResponse(
    params: any,
    onUpdate: (content: string, reasoning?: string) => void,
    enableTools: boolean = true,
    mcpTools: import('../../types').MCPTool[] = [],
    abortSignal?: AbortSignal,
    onChunk?: (chunk: import('../../types/chunk').Chunk) => void
  ): Promise<string | { content: string; reasoning?: string; reasoningTime?: number }> {

    // 工具调用循环处理（类似非流式响应）
    let currentMessages = [...params.messages];
    let maxIterations = 5; // 防止无限循环
    let iteration = 0;
    let accumulatedContent = ''; // 累积的内容

    while (iteration < maxIterations) {
      iteration++;
      console.log(`[OpenAIProvider] 流式工具调用迭代 ${iteration}`);

      // 创建当前迭代的回调函数
      const enhancedCallback = (content: string, reasoning?: string) => {
        if (iteration === 1) {
          // 第一次迭代，直接使用内容
          accumulatedContent = content;
          onUpdate(content, reasoning);
        } else {
          // 后续迭代，只传递新增的内容（增量）
          const separator = accumulatedContent.trim() ? '\n\n' : '';
          const deltaContent = separator + content;
          accumulatedContent = accumulatedContent + deltaContent;
          onUpdate(deltaContent, reasoning); // 只传递增量内容
        }
      };

      // 准备请求参数，确保工具配置正确
      const iterationParams = {
        ...params,
        messages: currentMessages, // 使用当前消息
        enableReasoning: this.supportsReasoning(),
        enableTools: enableTools,
        mcpTools: mcpTools, // 传递 MCP 工具
        signal: abortSignal
      };

      // 在提示词模式下，移除 tools 参数避免冲突
      if (this.getUseSystemPromptForTools()) {
        delete iterationParams.tools;
        delete iterationParams.tool_choice;
        console.log(`[OpenAIProvider] 提示词模式：移除 API 中的 tools 参数`);
      }

      // 调用流式完成函数
      const result = await streamCompletion(
        this.client,
        this.model.id,
        currentMessages,
        params.temperature,
        params.max_tokens || params.max_completion_tokens,
        enhancedCallback,
        iterationParams
      );

      console.log(`[OpenAIProvider] 流式响应结果类型: ${typeof result}, hasToolCalls: ${typeof result === 'object' && (result as any)?.hasToolCalls}`);

      // 检查是否有工具调用标记
      if (typeof result === 'object' && (result as any).hasToolCalls) {
        console.log(`[OpenAIProvider] 流式响应检测到工具调用`);

        const content = result.content;

        // 处理工具调用
        const xmlToolResults = await this.processToolUses(content, mcpTools, onChunk);

        if (xmlToolResults.length > 0) {
          // 🔥 修复：保留 XML 标签，让 MainTextBlock 在原位置渲染工具块
          // 但是对话历史中需要清理后的内容，避免重复处理
          const cleanContent = removeToolUseTags(content);
          console.log(`[OpenAIProvider] 流式：对话历史使用清理后的内容，长度: ${cleanContent.length}`);

          // 添加助手消息到对话历史（使用清理后的内容）
          currentMessages.push({
            role: 'assistant',
            content: cleanContent
          });

          // 添加工具结果到对话历史
          currentMessages.push(...xmlToolResults);

          console.log(`[OpenAIProvider] 流式工具调用完成，继续下一轮对话`);
          continue; // 继续下一轮对话
        }
      }

      // 没有工具调用或工具调用处理完成，返回结果
      return result;
    }

    // 如果达到最大迭代次数，返回最后的结果
    throw new Error('工具调用迭代次数超过限制');
  }

  /**
   * 处理流式响应（无回调）
   * 使用流式响应但不使用回调，结果会在完成后一次性返回
   * 这与最佳实例的行为一致
   * @param params 请求参数
   * @param enableTools 是否启用工具
   * @param mcpTools MCP 工具列表
   * @param abortSignal 中断信号
   * @returns 响应内容
   */
  private async handleStreamResponseWithoutCallback(
    params: any,
    enableTools: boolean = true,
    mcpTools: import('../../types').MCPTool[] = [],
    abortSignal?: AbortSignal,
    onChunk?: (chunk: import('../../types/chunk').Chunk) => void
  ): Promise<string | { content: string; reasoning?: string; reasoningTime?: number }> {
    try {
      console.log('[OpenAIProvider.handleStreamResponseWithoutCallback] 开始处理流式响应（无回调）');

      // 工具调用循环处理
      let currentMessages = [...params.messages];
      let maxIterations = 5; // 防止无限循环
      let iteration = 0;
      let accumulatedContent = ''; // 累积的内容

      while (iteration < maxIterations) {
        iteration++;
        console.log(`[OpenAIProvider] 无回调流式工具调用迭代 ${iteration}`);

        // 创建一个虚拟回调函数，用于处理流式响应
        let fullResponse = '';
        let lastUpdateTime = Date.now();
        const updateInterval = 50; // 50毫秒更新一次，避免过于频繁的更新

        // 创建一个虚拟回调函数
        const virtualCallback = (content: string) => {
          // 只在内容有变化且距离上次更新超过指定时间间隔时才触发回调
          if (content !== fullResponse && (Date.now() - lastUpdateTime) > updateInterval) {
            // 处理内容累积
            if (iteration === 1) {
              // 第一次迭代，直接使用内容
              accumulatedContent = content;
              fullResponse = content;
            } else {
              // 后续迭代，追加内容
              const separator = accumulatedContent.trim() ? '\n\n' : '';
              accumulatedContent = accumulatedContent + separator + content;
              fullResponse = accumulatedContent;
            }

            // 更新最后更新时间
            lastUpdateTime = Date.now();

            // 这里我们可以添加其他处理逻辑，例如更新UI
            console.log(`[OpenAIProvider.virtualCallback] 更新内容，当前长度: ${fullResponse.length}`);
          }
        };

        // 准备请求参数，确保工具配置正确
        const iterationParams = {
          ...params,
          messages: currentMessages, // 使用当前消息
          enableReasoning: this.supportsReasoning(),
          enableTools: enableTools,
          mcpTools: mcpTools, // 传递 MCP 工具
          signal: abortSignal
        };

        // 在提示词模式下，移除 tools 参数避免冲突
        if (this.getUseSystemPromptForTools()) {
          delete iterationParams.tools;
          delete iterationParams.tool_choice;
          console.log(`[OpenAIProvider] 无回调提示词模式：移除 API 中的 tools 参数`);
        }

        // 使用streamCompletion函数处理流式响应
        const result = await streamCompletion(
          this.client,
          this.model.id,
          currentMessages,
          params.temperature,
          params.max_tokens || params.max_completion_tokens,
          virtualCallback,
          iterationParams
        );

        // 检查是否有工具调用标记
        if (typeof result === 'object' && (result as any).hasToolCalls) {
          console.log(`[OpenAIProvider] 无回调流式响应检测到工具调用`);

          const content = result.content;

          // 处理工具调用
          const xmlToolResults = await this.processToolUses(content, mcpTools, onChunk);

          if (xmlToolResults.length > 0) {
            // 🔥 关键修复：从内容中移除 XML 标签，与非流式响应保持一致
            const cleanContent = removeToolUseTags(content);
            console.log(`[OpenAIProvider] 无回调流式：移除工具使用标签后的内容长度: ${cleanContent.length}`);

            // 添加助手消息到对话历史（使用清理后的内容）
            currentMessages.push({
              role: 'assistant',
              content: cleanContent
            });

            // 添加工具结果到对话历史
            currentMessages.push(...xmlToolResults);

            console.log(`[OpenAIProvider] 无回调流式工具调用完成，继续下一轮对话`);
            continue; // 继续下一轮对话
          }
        }

        // 没有工具调用或工具调用处理完成，返回结果
        return result;
      }

      // 如果达到最大迭代次数，抛出错误
      throw new Error('工具调用迭代次数超过限制');
    } catch (error) {
      console.error('OpenAI API流式请求失败:', error);
      // 不使用logApiError，直接记录错误
      console.error('错误详情:', error);
      throw error;
    }
  }

  /**
   * 处理非流式响应
   * @param params 请求参数
   * @param onUpdate 更新回调（可选）
   * @param onChunk Chunk事件回调（可选）
   * @param enableTools 是否启用工具
   * @param mcpTools MCP 工具列表
   * @param abortSignal 中断信号
   * @returns 响应内容
   */
  private async handleNonStreamResponse(
    params: any,
    onUpdate?: (content: string, reasoning?: string) => void,
    onChunk?: (chunk: import('../../types/chunk').Chunk) => void,
    enableTools: boolean = true,
    mcpTools: import('../../types').MCPTool[] = [],
    abortSignal?: AbortSignal
  ): Promise<string | { content: string; reasoning?: string; reasoningTime?: number }> {
    try {
      console.log('[OpenAIProvider.handleNonStreamResponse] 开始处理非流式响应');

      // 工具调用循环处理
      let currentMessages = [...params.messages];
      let finalContent = '';
      let finalReasoning: string | undefined;
      let maxIterations = 5; // 防止无限循环
      let iteration = 0;

      while (iteration < maxIterations) {
        iteration++;
        console.log(`[OpenAIProvider] 非流式工具调用迭代 ${iteration}`);

        const currentRequestParams = {
          ...params,
          messages: currentMessages,
          stream: false, // 确保是非流式
          enableReasoning: this.supportsReasoning(), // 添加思考过程支持
          signal: abortSignal // 传递中断信号
        };

        // 调用非流式API
        const response = await this.client.chat.completions.create(currentRequestParams);

        console.log('[OpenAIProvider.handleNonStreamResponse] 收到非流式响应');

        // 提取响应内容
        const choice = response.choices?.[0];
        if (!choice) {
          throw new Error('API响应中没有选择项');
        }

        const content = choice.message?.content || '';
        // 对于推理模型，尝试从多个可能的字段中获取推理内容
        const reasoning = (choice.message as any)?.reasoning ||
                         (choice.message as any)?.reasoning_content ||
                         undefined;

        finalContent = content;
        finalReasoning = reasoning;

        // 检查是否有工具调用（函数调用模式）
        const toolCalls = choice.message?.tool_calls;
        let toolResults: any[] = [];

        if (toolCalls && toolCalls.length > 0 && enableTools && mcpTools.length > 0) {
          console.log(`[OpenAIProvider] 检测到 ${toolCalls.length} 个函数调用`);

          // 添加助手消息到对话历史
          currentMessages.push({
            role: 'assistant',
            content: content || '',
            tool_calls: toolCalls
          });

          // 处理工具调用
          toolResults = await this.processToolCalls(toolCalls, mcpTools);
        }

        // 检查是否有工具使用（提示词模式）
        if (content && content.length > 0 && enableTools && mcpTools.length > 0) {
          console.log(`[OpenAI] 检查工具使用 - 内容长度: ${content.length}, 工具数量: ${mcpTools.length}`);
          console.log(`[OpenAI] 内容预览: ${content.substring(0, 200)}...`);

          const xmlToolResults = await this.processToolUses(content, mcpTools, onChunk);
          console.log(`[OpenAI] XML 工具调用结果数量: ${xmlToolResults.length}`);

          toolResults = toolResults.concat(xmlToolResults);

          // 如果检测到工具调用，从内容中移除 XML 标签
          if (xmlToolResults.length > 0) {
            finalContent = removeToolUseTags(content);
            console.log(`[OpenAI] 移除工具使用标签后的内容长度: ${finalContent.length}`);
          }
        }

        // 如果有工具结果，添加到对话历史并继续
        if (toolResults.length > 0) {
          // 添加工具结果到对话历史
          currentMessages.push(...toolResults);

          console.log(`[OpenAIProvider] 工具调用完成，继续下一轮对话`);
          continue; // 继续下一轮对话
        } else {
          // 没有工具调用，结束循环
          break;
        }
      }

      // 参考最佳实例实现：优先使用 onChunk 回调，避免重复处理
      if (onChunk) {
        console.log(`[OpenAIProvider] 非流式：使用 onChunk 回调处理响应`);
        // 先发送完整的思考过程（如果有）
        if (finalReasoning && finalReasoning.trim()) {
          console.log(`[OpenAIProvider] 非流式：发送思考内容，长度: ${finalReasoning.length}`);
          // 发送思考完成事件（非流式时直接发送完整内容）
          onChunk({
            type: 'thinking.complete',
            text: finalReasoning,
            thinking_millsec: 0
          });
        }
        // 再发送完整的普通文本（如果有）
        if (finalContent && finalContent.trim()) {
          console.log(`[OpenAIProvider] 非流式：发送普通文本，长度: ${finalContent.length}`);
          // 发送文本完成事件（非流式时直接发送完整内容）
          onChunk({
            type: 'text.complete',
            text: finalContent
          });
        }
      } else if (onUpdate) {
        console.log(`[OpenAIProvider] 非流式：使用 onUpdate 回调处理响应（兼容模式）`);
        // 兼容旧的 onUpdate 回调
        if (finalReasoning && finalReasoning.trim()) {
          console.log(`[OpenAIProvider] 非流式：发送思考内容（兼容模式），长度: ${finalReasoning.length}`);
          onUpdate('', finalReasoning);
        }
        if (finalContent && finalContent.trim()) {
          console.log(`[OpenAIProvider] 非流式：发送普通文本（兼容模式），长度: ${finalContent.length}`);
          onUpdate(finalContent);
        }
      }

      // 返回结果
      if (finalReasoning) {
        return {
          content: finalContent,
          reasoning: finalReasoning,
          reasoningTime: 0 // 非流式响应没有推理时间
        };
      } else {
        return finalContent;
      }
    } catch (error) {
      console.error('[OpenAIProvider.handleNonStreamResponse] 非流式API请求失败:', error);
      throw error;
    }
  }
}
