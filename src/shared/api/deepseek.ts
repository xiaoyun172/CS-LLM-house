import type { Message, Model, MessageContent } from '../types';
import { logApiRequest, logApiResponse } from '../services/LoggerService';

// 响应格式类型
type ResponseFormat = 'text' | 'json';

// 请求选项类型
interface RequestOptions {
  temperature?: number;
  maxTokens?: number;
  tools?: any[];
  tool_choice?: any;
  functions?: any[];
  function_call?: any;
}

// 聊天完成响应类型
interface ChatCompletionResponse {
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  toolCalls?: any[];
  stream?: boolean;
  fetchOptions?: RequestInit;
  endpoint?: string;
}

/**
 * 向DeepSeek API发送聊天请求
 * @param model 模型配置
 * @param messages 对话消息列表
 * @param responseFormat 响应格式
 * @param stream 是否使用流式响应
 * @param options 请求选项
 * @returns 聊天完成响应
 */
export async function chatCompletion(
  model: Model,
  messages: Message[],
  responseFormat: ResponseFormat = 'text',
  stream = false,
  options: RequestOptions = {}
): Promise<ChatCompletionResponse> {
  // 构建请求URL
  const endpoint = model.baseUrl ? `${model.baseUrl}/chat/completions` : 'https://api.deepseek.com/v1/chat/completions';

  // 将应用消息格式转换为DeepSeek兼容的格式
  const formattedMessages = messages.map((msg) => {
    return {
      role: msg.role,
      content: formatMessageContent(msg.content)
    };
  });

  // 构建请求体
  const requestBody = {
    model: model.id || 'deepseek-chat',
    messages: formattedMessages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens,
    stream,
    response_format: responseFormat === 'json' ? { type: 'json_object' } : undefined,
    tools: options.tools,
    tool_choice: options.tool_choice,
    functions: options.functions,
    function_call: options.function_call
  };

  // 构建请求选项
  const fetchOptions: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${model.apiKey}`
    },
    body: JSON.stringify(requestBody)
  };

  // 记录API请求
  logApiRequest(endpoint, 'INFO', { model: model.id, messages: formattedMessages });

  try {
    // 发送请求
    const response = await fetch(endpoint, fetchOptions);
    
    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || response.statusText;
      logApiResponse(endpoint, response.status, { error: errorMessage });
      throw new Error(`DeepSeek API error: ${errorMessage}`);
    }

    // 处理流式响应
    if (stream) {
      return {
        content: '',
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        stream: true,
        fetchOptions,
        endpoint
      };
    }

    // 处理标准响应
    const data = await response.json();
    
    // 记录API响应
    logApiResponse(endpoint, 200, data);

    // 提取内容和工具调用
    const content = data.choices[0]?.message?.content || '';
    const toolCalls = data.choices[0]?.message?.tool_calls;

    return {
      content,
      toolCalls,
      usage: data.usage
    };
  } catch (error) {
    console.error('Error calling DeepSeek API:', error);
    logApiResponse(endpoint, 500, { error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
}

/**
 * 将消息内容格式化为字符串
 * @param content 消息内容
 * @returns 格式化后的字符串
 */
function formatMessageContent(content: MessageContent): string {
  if (typeof content === 'string') {
    return content;
  }
  
  if (Array.isArray(content)) {
    return content
      .map(part => {
        if (typeof part === 'string') {
          return part;
        }
        if (part.type === 'image') {
          return `[Image: ${part.image_url?.url || 'URL not provided'}]`;
        }
        if (part.type === 'text') {
          return part.text;
        }
        return '';
      })
      .join('');
  }
  
  return '';
}

/**
 * 处理流式响应
 * @param response 流式响应对象
 * @param onChunk 处理数据块的回调
 * @param onDone 处理完成的回调
 */
export async function handleStreamResponse(
  response: Response,
  onChunk: (chunk: string, _done: boolean, reasoning?: string) => void,
  onDone?: () => void
): Promise<void> {
  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  
  // 用于收集推理过程
  let fullContent = '';
  let reasoning = '';
  let isCollectingReasoning = false;
  let reasoningStartTime = 0;

  // 处理流式数据和解析推理过程的逻辑
  const processStreamData = (content: string): { text: string, reasoning?: string } => {
    fullContent += content;
    
    // 检查是否开始收集推理过程
    if ((content.includes('<reasoning>') || content.includes('<thinking>')) && !isCollectingReasoning) {
      isCollectingReasoning = true;
      if (!reasoningStartTime) {
        reasoningStartTime = Date.now();
        console.log('[DeepSeek] 开始收集推理过程');
      }
    }
    
    // 检查是否结束收集推理过程
    if ((content.includes('</reasoning>') || content.includes('</thinking>')) && isCollectingReasoning) {
      isCollectingReasoning = false;
      console.log('[DeepSeek] 收集推理过程完成');
      
      // 提取完整的推理过程
      const reasoningRegex = /<(reasoning|thinking)>([\s\S]*?)<\/(reasoning|thinking)>/;
      const match = fullContent.match(reasoningRegex);
      if (match && match[2]) {
        reasoning = match[2].trim();
        console.log(`[DeepSeek] 提取到推理过程，长度: ${reasoning.length}`);
      }
    }
    
    // 如果正在收集推理过程，返回空字符串，将当前内容添加到推理过程
    if (isCollectingReasoning) {
      return { text: '', reasoning: content };
    }
    
    // 如果正在处理推理过程块，返回空字符串，将当前内容添加到推理过程
    return { text: content };
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        if (buffer.trim()) {
          // 最终处理
          const { text, reasoning: newReasoning } = processStreamData(buffer);
          onChunk(text, true, newReasoning);
        }
        onDone?.();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      
      // 处理数据行
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine === 'data: [DONE]') {
          continue;
        }

        if (trimmedLine.startsWith('data: ')) {
          try {
            const jsonStr = trimmedLine.slice(6);
            const data = JSON.parse(jsonStr);
            const content = data.choices[0]?.delta?.content || '';
            
            if (content) {
              // 解析推理过程
              const { text, reasoning: newReasoning } = processStreamData(content);
              
              // 如果有新的推理过程，添加到推理过程
              if (newReasoning) {
                reasoning += newReasoning;
              }
              
              // 如果有新的文本内容，返回给回调函数
              if (text) {
                onChunk(text, false, reasoning);
              }
            }
          } catch (error) {
            console.error('Error parsing stream data:', error);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error reading stream:', error);
    throw error;
  }
}

/**
 * 发送聊天请求
 * @param messages 消息数组
 * @param model 模型配置
 * @param onUpdate 更新回调函数
 * @returns 响应内容
 */
export async function sendChatRequest(
  messages: Message[],
  model: Model,
  onUpdate?: (content: string, reasoning?: string) => void
): Promise<string | { content: string; reasoning?: string; reasoningTime?: number }> {
  try {
    console.log(`[DeepSeek API] 发送聊天请求，使用模型: ${model.id}`);
    
    // 检查是否是流式请求
    const isStreamRequest = !!onUpdate;
    
    // 检查是否是推理模型
    const isReasoningModel = model.id === 'deepseek-reasoner' || 
                             model.id.includes('reasoning') || 
                             model.id.includes('reasoner');
    
    // 记录开始时间（用于计算推理耗时）
    const startTime = performance.now();
    
    if (isStreamRequest) {
      // 处理流式响应
      const endpoint = model.baseUrl ? `${model.baseUrl}/chat/completions` : 'https://api.deepseek.com/v1/chat/completions';
      
      // 将应用消息格式转换为DeepSeek兼容的格式
      const formattedMessages = messages.map((msg) => {
        return {
          role: msg.role,
          content: formatMessageContent(msg.content)
        };
      });
      
      // 构建请求体
      const requestBody = {
        model: model.id || 'deepseek-chat',
        messages: formattedMessages,
        temperature: model.temperature ?? 0.7,
        max_tokens: model.maxTokens,
        stream: true
      };
      
      // 对于推理模型，添加特殊指令来提取思考过程
      if (isReasoningModel) {
        // 添加系统指令，要求模型展示思考过程
        formattedMessages.unshift({
          role: 'system',
          content: '请在回答问题前，使用<reasoning>标签展示你的思考过程。例如：<reasoning>这是我的思考过程...</reasoning>然后给出你的最终答案。'
        });
      }
      
      // 构建请求选项
      const fetchOptions: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${model.apiKey}`
        },
        body: JSON.stringify(requestBody)
      };
      
      // 记录API请求
      logApiRequest(endpoint, 'INFO', { model: model.id, stream: true, messages: formattedMessages });
      
      const response = await fetch(endpoint, fetchOptions);
      
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || response.statusText;
        logApiResponse(endpoint, response.status, { error: errorMessage });
        throw new Error(`DeepSeek API错误: ${errorMessage}`);
      }
      
      // 创建累积内容的变量
      let accumulatedContent = '';
      let currentReasoning = '';
      
      // 处理流式响应
      await handleStreamResponse(
        response,
        (chunk, _done, reasoning) => {
          accumulatedContent += chunk;
          if (reasoning && reasoning !== currentReasoning) {
            currentReasoning = reasoning;
            console.log(`[DeepSeek] 收集到新的推理过程，长度: ${reasoning.length}`);
          }
          onUpdate?.(accumulatedContent, currentReasoning);
        }
      );
      
      // 计算耗时
      const endTime = performance.now();
      const reasoningTime = endTime - startTime;
      
      // 如果是推理模型，尝试提取思考过程
      if (currentReasoning) {
        return {
          content: accumulatedContent,
          reasoning: currentReasoning,
          reasoningTime
        };
      }
      
      // 提取思考过程
      const { content, reasoning } = extractReasoningFromContent(accumulatedContent);
      if (reasoning) {
        return {
          content,
          reasoning,
          reasoningTime
        };
      }
      
      return accumulatedContent;
    } else {
      // 处理标准非流式响应
      // 为推理模型添加特殊指令
      let requestMessages = [...messages];
      
      if (isReasoningModel) {
        // 添加系统指令，要求模型展示思考过程
        requestMessages.unshift({
          id: 'system-reasoning',
          role: 'system',
          content: '请在回答问题前，使用<reasoning>标签展示你的思考过程。例如：<reasoning>这是我的思考过程...</reasoning>然后给出你的最终答案。',
          timestamp: new Date().toISOString()
        });
      }
      
      const response = await chatCompletion(model, requestMessages);
      
      // 计算耗时
      const endTime = performance.now();
      const reasoningTime = endTime - startTime;
      
      // 如果是推理模型，尝试提取思考过程
      if (isReasoningModel) {
        const { content, reasoning } = extractReasoningFromContent(response.content);
        return {
          content,
          reasoning,
          reasoningTime
        };
      }
      
      return response.content;
    }
  } catch (error) {
    console.error('[DeepSeek API] 请求失败:', error);
    throw error;
  }
}

/**
 * 从内容中提取思考过程
 * @param content 完整内容
 * @returns 分离后的内容和思考过程
 */
function extractReasoningFromContent(content: string): { content: string; reasoning?: string } {
  // 使用正则表达式匹配<reasoning>标签内的内容
  const reasoningRegex = /<reasoning>([\s\S]*?)<\/reasoning>/;
  const match = content.match(reasoningRegex);
  
  if (match && match[1]) {
    // 提取思考过程
    const reasoning = match[1].trim();
    // 删除内容中的思考过程部分
    const cleanContent = content.replace(reasoningRegex, '').trim();
    
    return {
      content: cleanContent,
      reasoning
    };
  }
  
  // 如果没有找到标准格式的思考过程，尝试其他可能的格式
  if (content.includes('思考过程:') || content.includes('思考过程：')) {
    // 使用中文格式分隔符
    const parts = content.split(/思考过程[:|：]/);
    if (parts.length >= 2) {
      // 假设思考过程后面跟着"回答:"或其他类似分隔符
      const reasoningPart = parts[1];
      const reasoningEndMatch = reasoningPart.match(/回答[:|：]|最终答案[:|：]|结论[:|：]/);
      
      if (reasoningEndMatch) {
        const endIndex = reasoningPart.indexOf(reasoningEndMatch[0]);
        const reasoning = reasoningPart.substring(0, endIndex).trim();
        const remainingContent = parts[0] + reasoningPart.substring(endIndex);
        
        return {
          content: remainingContent.trim(),
          reasoning
        };
      }
      
      // 如果没找到明确的结束标记，假设思考过程是第一段
      const reasoningLines = reasoningPart.split('\n\n');
      if (reasoningLines.length > 1) {
        return {
          content: parts[0] + reasoningPart.substring(reasoningLines[0].length).trim(),
          reasoning: reasoningLines[0].trim()
        };
      }
    }
  }
  
  // 如果没有明确的思考过程格式，返回原始内容
  return { content };
} 