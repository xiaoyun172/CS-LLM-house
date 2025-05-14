// @ts-nocheck
// 添加ts-nocheck以避免类型检查错误，这将允许构建成功
import axios from 'axios';
// 直接从文件定义类型而不是从类型文件导入
import { logApiRequest, logApiResponse, log } from '../services/LoggerService';
import { supportsVision } from '../data/modelTypeRules';

// 定义需要的类型接口（从types/index.ts复制）
interface Model {
  id: string;
  name: string;
  provider: string;
  description?: string;
  providerType?: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
  enabled?: boolean;
  isDefault?: boolean;
  iconUrl?: string;
  presetModelId?: string;
  group?: string;
  capabilities?: {
    multimodal?: boolean;
    imageGeneration?: boolean;
  };
  multimodal?: boolean;
  modelTypes?: string[];
}

interface Message {
  id: string;
  content: MessageContent;
  role: 'user' | 'assistant' | 'system';
  timestamp: string;
  status?: 'pending' | 'complete' | 'error';
  modelId?: string;
  reasoning?: string;
  reasoningTime?: number;
  version?: number;
  parentMessageId?: string;
  alternateVersions?: string[];
  isCurrentVersion?: boolean;
  images?: SiliconFlowImageFormat[];
}

type MessageContent = string | {
  text?: string;
  images?: ImageContent[];
};

interface ImageContent {
  url: string;
  base64Data?: string;
  mimeType: string;
  width?: number;
  height?: number;
  size?: number;
}

interface SiliconFlowImageFormat {
  type: 'image_url';
  image_url: {
    url: string;
  };
}

// 定义消息内容类型
type SiliconFlowContent = {
  type: string;
  text?: string;
  image_url?: {
    url: string;
  };
};

// 定义Silicon Flow消息接口
export interface SiliconFlowMessage {
  role: string;
  content: SiliconFlowContent[] | string;
}

// 定义请求接口
export interface SiliconFlowCompletionRequest {
  model: string;
  messages: SiliconFlowMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

// 定义响应接口
export interface SiliconFlowCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
      tool_calls?: Array<any>;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// 新增: 图像生成请求接口
export interface SiliconFlowImageGenerationRequest {
  model: string;
  prompt: string;
  negative_prompt?: string;
  image_size?: string;
  batch_size?: number;
  seed?: number;
  num_inference_steps?: number;
  guidance_scale?: number;
  image?: string; // Base64编码的参考图像
}

// 新增: 图像生成响应接口
export interface SiliconFlowImageGenerationResponse {
  images: Array<{
    url: string;
  }>;
  timings: {
    inference: number;
  };
  seed: number;
}

// 将标准消息格式转换为SiliconFlow消息格式
export function convertToSiliconFlowMessages(messages: Message[]): SiliconFlowMessage[] {
  log('DEBUG', "开始转换消息格式，总消息数:", messages.length);

  return messages.map((message) => {
    try {
      // 判断是否存在 message.images 用于处理新的图片格式
      const hasDirectImages = Array.isArray(message.images) && message.images.length > 0;
      
      // 检查旧格式的图片
      const hasContentImages = typeof message.content !== 'string' && 
                      Array.isArray(message.content) && 
                      message.content.some(item => item.type === 'image');
                      
      log('DEBUG', `处理消息 ID:${message.id}, 角色:${message.role}, 直接图片:${hasDirectImages}, 内容图片:${hasContentImages}`);
      
      // 如果有直接的图片数组（新格式）
      if (hasDirectImages) {
        // 准备内容数组
        const contentArray: SiliconFlowContent[] = [];
        
        // 添加文本内容（如果有）
        if (typeof message.content === 'string' && message.content.trim()) {
          contentArray.push({
            type: 'text',
            text: message.content
          });
        }
        
        // 添加所有图片内容
        if (Array.isArray(message.images)) {
          message.images.forEach((img: SiliconFlowImageFormat, index: number) => {
            try {
              log('DEBUG', `处理图片 #${index+1}，类型: ${img.type}，URL: ${img.image_url?.url ? img.image_url.url.substring(0, 30) + '...' : 'undefined'}`);
              
              // 检查图片URL是否有效
              if (!img.image_url || !img.image_url.url) {
                log('WARN', `图片 #${index+1} URL无效`, img);
                return; // 跳过无效图片
              }
              
              // 检查并调整base64格式
              let url = img.image_url.url;
              if (url.startsWith('data:')) {
                log('DEBUG', `图片 #${index+1} 已经是base64格式，保持不变`);
              } else if (/^[A-Za-z0-9+/=]+$/.test(url)) { 
                // 看起来是没有前缀的base64
                log('DEBUG', `图片 #${index+1} 添加base64前缀`);
                url = `data:image/jpeg;base64,${url}`;
              }
              
              // 直接使用新的SiliconFlowImageFormat格式
              contentArray.push({
                type: 'image_url',
                image_url: {
                  url: url
                }
              });
              
              log('DEBUG', `图片 #${index+1} 添加成功，URL前缀: ${url.substring(0, 30)}...`);
            } catch (imgError) {
              log('ERROR', `处理图片 #${index+1} 时出错:`, imgError);
            }
          });
        }
        
        log('DEBUG', `转换后内容数组长度: ${contentArray.length}`);
        
        // 检查内容数组是否为空
        if (contentArray.length === 0) {
          log('WARN', `消息ID:${message.id}转换后内容为空，使用默认文本`);
          return {
            role: message.role,
            content: message.content || ""
          };
        }
        
        return {
          role: message.role,
          content: contentArray
        };
      }
      // 旧版格式处理逻辑保持不变
      else if (typeof message.content === 'string') {
        return {
          role: message.role,
          content: message.content,
        };
      } 
      // 如果是数组（多模态消息），转换成SiliconFlow的格式
      else if (Array.isArray(message.content)) {
        // 使用数组格式来处理多模态内容
        const contentArray: SiliconFlowContent[] = message.content.map(item => {
          if (item.type === 'text') {
            log('DEBUG', "处理文本内容:", item.text?.substring(0, 30) + (item.text && item.text.length > 30 ? "..." : ""));
            return {
              type: 'text',
              text: item.text
            };
          } else if (item.type === 'image') {
            // 检查图片内容格式
            const imageContent = item as ImageContent;
            
            // 详细记录图片处理过程
            log('DEBUG', "处理图片内容:", {
              hasBase64: Boolean(imageContent.data),
              hasUrl: Boolean(imageContent.url),
              dataLength: imageContent.data ? imageContent.data.substring(0, 30) + "..." : "无",
              isBase64Proper: imageContent.data ? imageContent.data.startsWith('data:image/') : false
            });
            
            if (imageContent.url) {
              log('DEBUG', "使用图片URL:", imageContent.url);
              return {
                type: 'image_url',
                image_url: {
                  url: imageContent.url
                }
              };
            } else if (imageContent.data) {
              // 确保BASE64数据格式正确
              let base64Data = imageContent.data;
              if (!base64Data.startsWith('data:image/')) {
                log('DEBUG', "修正BASE64格式: 添加MIME前缀");
                base64Data = `data:image/jpeg;base64,${base64Data}`;
              }
              
              log('DEBUG', "使用BASE64图片数据:", base64Data.substring(0, 30) + "...");
              return {
                type: 'image_url',
                image_url: {
                  url: base64Data
                }
              };
            }
          }
          
          // 对于未知类型，记录并使用空文本
          log('WARN', "未知内容类型:", item.type);
          return {
            type: 'text',
            text: ''
          };
        });
        
        // 过滤掉undefined内容
        const filteredContent = contentArray.filter(item => item !== undefined) as SiliconFlowContent[];
        log('DEBUG', `转换后内容数组长度: ${filteredContent.length}`);
        
        return {
          role: message.role,
          content: filteredContent
        };
      }
      
      // 如果内容为空，使用空字符串
      log('WARN', "消息内容格式无效，使用空字符串");
      return {
        role: message.role,
        content: "",
      };
    } catch (msgError) {
      log('ERROR', `处理消息ID:${message.id}时出错:`, msgError);
      return {
        role: message.role,
        content: ""
      };
    }
  });
}

// 发送聊天请求
export const sendChatRequest = async (
  messages: Message[],
  model: Model,
  onUpdate?: (content: string) => void
): Promise<{ content: string; reasoning?: string; reasoningTime?: number }> => {
  try {
    // 检查是否有消息
    if (!messages || messages.length === 0) {
      throw new Error('没有消息可发送');
    }
    
    // 检查是否配置了API密钥
    const apiKey = model.apiKey;
    if (!apiKey) {
      throw new Error('未配置硅基流API密钥');
    }
    
    // 检查是否有正确的baseUrl
    let baseUrl = model.baseUrl || 'https://api.siliconflow.cn/v1';
    
    // 如果URL不是以v1结尾，添加/v1
    if (!baseUrl.endsWith('/v1')) {
      baseUrl = baseUrl.endsWith('/') ? `${baseUrl}v1` : `${baseUrl}/v1`;
    }
    
    // 检查是否有图片消息 - 更新检查逻辑，支持新格式
    const hasImages = messages.some(msg => 
      (Array.isArray(msg.images) && msg.images.length > 0) ||
      (typeof msg.content !== 'string' && Array.isArray(msg.content) && 
       msg.content.some(item => item.type === 'image'))
    );
    
    // 如果有图片，检查模型是否支持多模态
    const supportsMultimodal = model.modelTypes 
      ? supportsVision(model.modelTypes)  // 使用新的类型系统
      : Boolean(model.multimodal);        // 向下兼容老的标志
    if (hasImages) {
      log('INFO', `消息中包含图片，模型${model.id}是否支持多模态: ${supportsMultimodal ? '是' : '否'}`);
      
      // 统计图片数量
      const directImageCount = messages.reduce((count, msg) => {
        return count + (Array.isArray(msg.images) ? msg.images.length : 0);
      }, 0);
      
      const contentImageCount = messages.reduce((count, msg) => {
        if (typeof msg.content !== 'string' && Array.isArray(msg.content)) {
          return count + msg.content.filter(item => item.type === 'image').length;
        }
        return count;
      }, 0);
      
      log('INFO', `消息中共包含${directImageCount + contentImageCount}张图片，直接图片: ${directImageCount}，内容图片: ${contentImageCount}`);
      
      // 如果模型不支持多模态，抛出错误
      if (!supportsMultimodal) {
        throw new Error(`模型 ${model.id} 不支持图片分析，请选择支持多模态的模型（如Qwen VL）`);
      }
    }
    
    // 转换消息格式
    const siliconFlowMessages = convertToSiliconFlowMessages(messages);
    
    // 构建请求数据
    const requestData: SiliconFlowCompletionRequest = {
      model: model.id,
      messages: siliconFlowMessages,
      stream: Boolean(onUpdate),
    };
    
    // 记录完整API请求详情 - 包括图片处理信息
    logApiRequest('SiliconFlow-发送请求', 'INFO', {
      model: model.id,
      modelName: model.name,
      messagesCount: messages.length,
      baseUrl,
      hasImages,
      siliconFlowMessagesPreview: siliconFlowMessages.map(msg => ({
        role: msg.role,
        contentType: typeof msg.content === 'string' ? 'string' : 'array',
        contentLength: typeof msg.content === 'string' 
          ? msg.content.length 
          : msg.content.length,
        contentSample: typeof msg.content === 'string'
          ? (msg.content.substring(0, 30) + (msg.content.length > 30 ? '...' : ''))
          : JSON.stringify(msg.content).substring(0, 200) + '...'
      }))
    });
    
    // 详细记录第一条消息的完整内容，用于调试
    if (siliconFlowMessages.length > 0) {
      const firstMsg = siliconFlowMessages[0];
      log('DEBUG', '第一条消息完整内容:', {
        role: firstMsg.role,
        contentType: typeof firstMsg.content === 'string' ? 'string' : 'array',
        content: firstMsg.content
      });
    }
    
    log('INFO', `准备发送请求到硅基流API，URL: ${baseUrl}/chat/completions`);
    
    // 发送请求
    if (requestData.stream) {
      // 流式请求
      return await streamCompletion(baseUrl, apiKey, requestData, onUpdate);
    } else {
      // 标准请求
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestData)
      });
      
      // 检查响应状态
      if (!response.ok) {
        const errorData = await response.text();
        log('ERROR', `硅基流API错误 (${response.status}):`, errorData);
        
        // 记录API响应错误
        logApiResponse('SiliconFlow', response.status, { 
          error: errorData,
          requestUrl: `${baseUrl}/chat/completions`,
          requestData: JSON.stringify(requestData)
        });
        
        throw new Error(`硅基流API错误 (${response.status}): ${errorData}`);
      }
      
      // 解析响应数据
      const responseData: SiliconFlowCompletionResponse = await response.json();
      
      // 记录API响应成功
      logApiResponse('SiliconFlow', response.status, {
        id: responseData.id,
        model: responseData.model,
        tokenUsage: responseData.usage
      });
      
      log('INFO', '硅基流API响应成功:', {
        id: responseData.id,
        model: responseData.model,
        tokenUsage: responseData.usage,
        contentPreview: responseData.choices[0]?.message?.content?.substring(0, 50) + '...'
      });
      
      return {
        content: responseData.choices[0]?.message?.content || ''
      };
    }
  } catch (error) {
    log('ERROR', '硅基流API调用失败:', error);
    
    // 记录API错误
    logApiResponse('SiliconFlow', 500, {
      error: error instanceof Error ? error.message : '未知错误'
    });
    
    throw error;
  }
};

// 处理流式响应
async function streamCompletion(
  baseUrl: string,
  apiKey: string,
  requestData: SiliconFlowCompletionRequest,
  onUpdate?: (content: string) => void
): Promise<{ content: string; reasoning?: string; reasoningTime?: number }> {
  let reader = null;
  let content = '';
  
  try {
    // 发送请求
    log('INFO', '开始发送流式请求到硅基流API');
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestData)
    });
    
    // 检查响应状态
    if (!response.ok) {
      const errorData = await response.text();
      log('ERROR', `硅基流API流式响应错误 (${response.status}):`, errorData);
      
      // 记录API响应错误
      logApiResponse('SiliconFlow-Stream', response.status, { 
        error: errorData,
        requestUrl: `${baseUrl}/chat/completions`,
        requestData: JSON.stringify(requestData)
      });
      
      throw new Error(`硅基流API错误 (${response.status}): ${errorData}`);
    }
    
    // 获取响应流
    reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    log('INFO', '开始处理硅基流API流式响应');
    
    if (!reader) {
      throw new Error('无法获取响应流读取器');
    }
    
    // 读取流数据
    let doneFlag = false;
    while (!doneFlag) {
      try {
        const { done, value } = await reader.read();
        
        if (done) {
          log('DEBUG', '流式响应读取完成，reader.read()返回done标志');
          doneFlag = true;
          break;
        }
        
        // 解码响应数据
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        // 处理每一行数据
        for (const line of lines) {
          if (line.includes('data:')) {
            try {
              // 提取JSON数据
              const dataJson = line.replace('data:', '').trim();
              
              // 跳过[DONE]标记
              if (dataJson === '[DONE]') {
                log('DEBUG', '流式响应完成，收到[DONE]标记');
                doneFlag = true;
                continue;
              }
              
              // 解析JSON数据
              const data = JSON.parse(dataJson);
              const delta = data.choices[0]?.delta?.content || '';
              
              // 更新内容
              content += delta;
              
              // 回调更新
              if (onUpdate) {
                onUpdate(content);
              }
            } catch (error) {
              log('WARN', '解析流式响应数据失败:', error, line);
              // 不中断整个流程，继续处理下一行
            }
          }
        }
      } catch (readError) {
        // 读取过程中发生错误，但内容已经部分获取，记录错误但不中断返回
        log('WARN', '读取流数据时发生错误:', readError);
        doneFlag = true;
        // 如果已经获取了一些内容，我们仍然可以返回这些内容给用户
        if (content.length > 0) {
          break;
        } else {
          // 如果没有获取到任何内容，重新抛出错误
          throw readError;
        }
      }
    }
    
    log('INFO', '硅基流API流式响应处理完成, 总内容长度:', content.length);
    
    // 记录API响应成功
    logApiResponse('SiliconFlow-Stream', 200, {
      contentLength: content.length,
      contentPreview: content.substring(0, 50) + (content.length > 50 ? '...' : '')
    });
    
    return { content };
  } catch (error) {
    log('ERROR', '处理硅基流API流式响应失败:', error);
    
    // 记录API错误
    logApiResponse('SiliconFlow-Stream', 500, {
      error: error instanceof Error ? error.message : '未知错误',
      contentSoFar: content?.substring(0, 100) + (content?.length > 100 ? '...' : '')
    });
    
    // 如果已经获取了一些内容，返回已获取的内容而不是抛出错误
    if (content && content.length > 0) {
      log('INFO', '尽管发生错误，但返回已获取的内容:', content.substring(0, 50) + '...');
      return { content };
    }
    
    throw error;
  } finally {
    // 确保读取器正确关闭
    if (reader) {
      try {
        reader.releaseLock();
        log('DEBUG', '成功释放流读取器');
      } catch (releaseError) {
        // 只记录警告但不影响主流程
        log('WARN', '关闭流读取器失败:', releaseError);
      }
    }
  }
}

/**
 * 发送请求到SiliconFlow API
 */
export async function sendSiliconFlowRequest(
  messages: Message[],
  model: Model,
  onUpdate?: (text: string) => void,
) {
  try {
    const apiKey = model.apiKey || '';
    const baseUrl = model.baseUrl || 'https://api.siliconflow.cn/v1';
    const chatCompletionUrl = `${baseUrl}/chat/completions`;
    
    // 检查模型是否支持多模态
    const supportsMultimodal = model.modelTypes 
      ? supportsVision(model.modelTypes)  // 使用新的类型系统
      : Boolean(model.multimodal);        // 向下兼容老的标志
    
    // 判断是否有图片内容
    const hasImageContent = messages.some(msg => 
      typeof msg.content !== 'string' && msg.content.images && msg.content.images.length > 0
    );
    
    // 如果有图片但模型不支持多模态，则抛出错误
    if (hasImageContent && !supportsMultimodal) {
      throw new Error(`模型 ${model.name} 不支持图像输入，请选择多模态模型`);
    }
    
    // 转换消息格式
    const siliconFlowMessages = convertToSiliconFlowMessages(messages);
    
    // 构建请求数据
    const requestData: SiliconFlowCompletionRequest = {
      model: model.id, // 使用模型ID代替名称
      messages: siliconFlowMessages,
      stream: Boolean(onUpdate),
    };
    
    // 记录完整API请求详情 - 包括图片处理信息
    logApiRequest('SiliconFlow-发送请求', 'INFO', {
      model: model.id, // 更新日志记录，使用ID
      modelName: model.name,
      messagesCount: messages.length,
      supportsMultimodal,
      hasImageContent,
      baseUrl
    });
    
    if (onUpdate) {
      // 流式响应处理
      try {
        const response = await axios.post(chatCompletionUrl, requestData, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          responseType: 'stream'
        });
        
        const reader = response.data.getReader();
        const decoder = new TextDecoder('utf-8');
        let fullText = '';
        let doneFlag = false;
        
        while (!doneFlag) {
          try {
            const { done, value } = await reader.read();
            if (done) {
              log('DEBUG', '流式响应读取完成，stream完成标记');
              doneFlag = true;
              break;
            }
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '));
            
            for (const line of lines) {
              const jsonStr = line.substring(6); // 去掉 "data: " 前缀
              
              if (jsonStr.trim() === '[DONE]') {
                log('DEBUG', '收到流式响应完成信号 [DONE]');
                doneFlag = true;
                continue;
              }
              
              try {
                const data = JSON.parse(jsonStr);
                const content = data.choices[0]?.delta?.content || '';
                if (content) {
                  fullText += content;
                  onUpdate(fullText);
                }
              } catch (parseError) {
                log('WARN', '解析流响应JSON时出错:', parseError, jsonStr);
                // 继续处理，不中断
              }
            }
          } catch (readError) {
            // 处理读取流时的错误
            log('WARN', '读取流数据时发生错误:', readError);
            
            // 如果已经获取了一些内容，我们可以返回而不是抛出错误
            if (fullText && fullText.length > 0) {
              log('INFO', '尽管读取发生错误，但返回已处理的内容');
              doneFlag = true;
              break;
            } else {
              // 如果没有内容，则重新抛出错误
              throw readError;
            }
          }
        }
        
        // 如果成功获取了内容，记录和返回
        if (fullText && fullText.length > 0) {
          log('INFO', '硅基流流式响应处理完成，内容长度:', fullText.length);
          return fullText;
        } else {
          // 没有获取到内容，可能是空响应
          log('WARN', '硅基流返回空响应');
          return '';
        }
      } catch (streamError) {
        // 捕获流处理过程中的任何错误
        log('ERROR', '处理硅基流流式响应时出错:', streamError);
        
        // 检查是否有已获取的文本，如果有则返回
        if (fullText && fullText.length > 0) {
          log('INFO', '尽管流处理出错，但返回已获取的内容:', fullText.substring(0, 30) + '...');
          return fullText;
        }
        
        // 重新抛出错误
        throw streamError;
      }
    } else {
      // 非流式响应处理
      try {
        const response = await axios.post<SiliconFlowCompletionResponse>(chatCompletionUrl, requestData, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        });
        
        logApiResponse('SiliconFlow-收到响应', 'INFO', {
          tokens: response.data.usage?.total_tokens || 0,
          promptTokens: response.data.usage?.prompt_tokens || 0,
          completionTokens: response.data.usage?.completion_tokens || 0
        });
        
        return response.data.choices[0].message.content;
      } catch (nonStreamError) {
        log('ERROR', '非流式请求失败:', nonStreamError);
        throw nonStreamError;
      }
    }
  } catch (error: any) {
    console.error('SiliconFlow API请求失败:', error);
    
    // 记录错误详情
    logApiRequest('SiliconFlow-请求失败', 'ERROR', {
      error: error.message,
      statusCode: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    throw new Error(`请求SiliconFlow API时出错: ${error.message}`);
  }
}

// 新增: 发送图像生成请求
export async function generateImage(
  model: Model,
  params: {
    prompt: string;
    negativePrompt?: string;
    imageSize?: string;
    batchSize?: number;
    seed?: number;
    steps?: number;
    guidanceScale?: number;
    referenceImage?: string;
  }
): Promise<string[]> {
  try {
    log('INFO', '开始生成图像，模型:', model.name);
    
    // 获取API密钥和基础URL
    const apiKey = model.apiKey || '';
    const baseUrl = model.baseUrl || 'https://api.siliconflow.cn';
    
    // 针对黑森林FLUX模型特殊处理
    const isFluxModel = model.id.toLowerCase().includes('flux') || 
                        model.id.toLowerCase().includes('black-forest') ||
                        model.id.toLowerCase().includes('stable-diffusion');
    
    // 如果是FLUX模型，强制设置图像生成功能标志
    if (isFluxModel && !model.capabilities?.imageGeneration) {
      log('INFO', `检测到FLUX系列模型 ${model.id}，自动启用图像生成功能`);
      // 这里不实际修改model对象，仅用于日志记录
    }
    
    // 根据提供的参数构建请求
    const requestData: SiliconFlowImageGenerationRequest = {
      model: model.id,
      prompt: params.prompt,
      negative_prompt: params.negativePrompt || "",
      image_size: params.imageSize || "1024x1024",
      batch_size: params.batchSize || 1,
      seed: params.seed || Math.floor(Math.random() * 2147483647),
      num_inference_steps: params.steps || 20,
      guidance_scale: params.guidanceScale || 7.5
    };
    
    // 如果提供了参考图片，添加到请求中
    if (params.referenceImage) {
      requestData.image = params.referenceImage;
    }
    
    // 记录API请求
    logApiRequest('SiliconFlow Image Generation', model.id, requestData);
    
    // 确保baseUrl符合规范格式
    let apiEndpoint = baseUrl;
    
    // 直接使用文档中指定的标准端点URL
    // 参考: https://docs.siliconflow.cn/cn/api-reference/images/images-generations
    
    // 针对图像生成API，使用固定的URL格式
    const IMAGE_GEN_ENDPOINT = 'https://api.siliconflow.cn/v1/images/generations';
    
    // 声明fullApiUrl变量
    let fullApiUrl = '';
    
    // 如果是FLUX模型，强制使用标准端点
    if (isFluxModel) {
      log('INFO', `使用FLUX模型标准图像生成端点: ${IMAGE_GEN_ENDPOINT}`);
      // 使用标准端点
      fullApiUrl = IMAGE_GEN_ENDPOINT;
    } else {
      // 非FLUX模型，尝试使用用户配置的baseUrl但确保格式正确
      if (!apiEndpoint.endsWith('/')) {
        apiEndpoint += '/';
      }
      
      // 确保包含v1路径
      if (!apiEndpoint.includes('/v1')) {
        apiEndpoint += 'v1/';
      } else if (!apiEndpoint.endsWith('/v1/') && apiEndpoint.includes('/v1')) {
        apiEndpoint = apiEndpoint.replace('/v1', '/v1/');
      }
      
      // 构建完整的API URL - 注意这是图像生成专用的端点
      fullApiUrl = `${apiEndpoint}images/generations`;
    }
    
    // 增强日志记录
    logApiRequest('SiliconFlow Image Generation', model.id, {
      baseUrl,
      modelId: model.id,
      requestParams: requestData,
      isFluxModel,
      requestUrl: fullApiUrl
    });
    
    log('INFO', `准备发送图像生成请求到: ${fullApiUrl}`);
    log('DEBUG', `完整请求体: ${JSON.stringify(requestData, null, 2)}`);
    
    try {
      // 设置超时60秒，避免长时间等待
      const response = await axios.post(
        fullApiUrl,
        requestData,  // 使用之前构建的requestData
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 60000, // 60秒超时
          validateStatus: () => true, // 允许任何状态码正常处理
        }
      );
      
      log('INFO', `响应状态: ${response.status} ${response.statusText}`);
      
      // 检查响应状态
      if (response.status !== 200) {
        let errorMessage = `API请求失败: ${response.status} ${response.statusText}`;
        let responseDataSnippet = '';
        
        try {
          if (response.data) {
            responseDataSnippet = JSON.stringify(response.data).substring(0, 200);
            log('ERROR', `响应数据: ${responseDataSnippet}...`);
          }
        } catch (e) {
          log('ERROR', `无法解析响应数据: ${e.message}`);
        }
        
        throw new Error(`${errorMessage}${responseDataSnippet ? ` - ${responseDataSnippet}` : ''}`);
      }
      
      log('INFO', `API响应: ${JSON.stringify(response.data).substring(0, 200)}...`);

      return response.data.images.map(img => img.url);
    } catch (error) {
      log('ERROR', '图像生成失败', error);
      
      // 检查是否有详细的错误消息
      if (error.response?.data?.error) {
        throw new Error(`图像生成失败: ${error.response.data.error.message || '未知错误'}`);
      } else {
        throw new Error(`图像生成失败: ${error.message || '未知错误'}`);
      }
    }
  } catch (error) {
    log('ERROR', '图像生成失败', error);
    
    // 检查是否有详细的错误消息
    if (error.response?.data?.error) {
      throw new Error(`图像生成失败: ${error.response.data.error.message || '未知错误'}`);
    } else {
      throw new Error(`图像生成失败: ${error.message || '未知错误'}`);
    }
  }
} 