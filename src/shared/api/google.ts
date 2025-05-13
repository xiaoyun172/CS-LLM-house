import type { Message, Model } from '../types';
import { logApiRequest, logApiResponse } from '../services/LoggerService';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// 安全设置默认值 - 设置为最低限制
const DEFAULT_SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// 发送聊天请求
export const sendChatRequest = async (
  messages: Message[],
  model: Model,
  onUpdate?: (content: string) => void
): Promise<string> => {
  try {
    const apiKey = model.apiKey;
    const baseUrl = model.baseUrl || 'https://generativelanguage.googleapis.com/v1';

    // 直接使用模型名称或ID
    const modelName = model.id || model.name;
    const isGemini2_5 = modelName.includes('gemini-2.5') || modelName.includes('gemini-2-5') || modelName.includes('2.5');

    console.log(`[API请求] 使用Google API SDK，模型名称: ${modelName}，ID: ${model.id}, 基础URL: ${baseUrl}`);

    // 记录模型信息，用于调试
    console.log('[API请求] 模型详情:', {
      id: model.id,
      name: model.name,
      provider: model.provider,
      temperature: model.temperature,
      maxTokens: model.maxTokens
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

    // 提取系统消息，如果有的话
    const systemMessage = filteredMessages.find(msg => msg.role === 'system');

    // 过滤掉系统消息，因为它会在单独的字段中发送
    const nonSystemMessages = filteredMessages.filter(msg => msg.role !== 'system');

    // 创建SDK实例 - GoogleGenerativeAI只接受一个apiKey参数
    const genAI = new GoogleGenerativeAI(apiKey);

    // 配置生成参数
    const generationConfig = {
        temperature: model.temperature,
        maxOutputTokens: model.maxTokens,
      // 如果是Gemini 2.5，添加思考配置
      ...(isGemini2_5 ? {
        thinkingConfig: {
          thinkingBudget: 8192  // 默认思考预算
        }
      } : {})
    };

    // 获取生成模型实例
    const genModel = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemMessage ? systemMessage.content : undefined,
      safetySettings: DEFAULT_SAFETY_SETTINGS,
      generationConfig: generationConfig
    });

    // 记录API请求
    logApiRequest('Google AI API', 'INFO', {
      method: 'POST',
      model: modelName,
      temperature: model.temperature,
      maxOutputTokens: model.maxTokens,
      hasSystemInstruction: !!systemMessage,
      requestDetails: {
        safetySettings: 'configured',
        thinkingEnabled: isGemini2_5,
        messageCount: nonSystemMessages.length,
        systemInstructionFormat: 'SDK标准格式'
      }
    });

    // 转换消息格式为SDK格式
    const chatHistory = nonSystemMessages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    console.log('[API请求] 使用SDK生成内容，消息数量:', chatHistory.length);

    // 如果有onUpdate回调，使用流式API
    if (onUpdate) {
      // 创建聊天会话并发送最新消息
      const chat = genModel.startChat({
        history: chatHistory.slice(0, -1) // 历史消息
      });

      // 获取最后一条消息单独发送
      const lastMessage = chatHistory[chatHistory.length - 1];
      
      // 如果没有消息，直接返回空字符串
      if (!lastMessage) {
        return '';
      }

      const lastContent = lastMessage.parts[0].text;
      console.log('[API请求] 发送流式请求，内容:', lastContent.substring(0, 50) + (lastContent.length > 50 ? '...' : ''));
      
      // 发送消息并获取流式响应
      const streamResult = await chat.sendMessageStream(lastContent);
      let fullResponse = '';

      // 处理流式响应
      for await (const chunk of streamResult.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;
        onUpdate(fullResponse);
      }

    // 记录API响应
      logApiResponse('Google AI API', 200, {
      model: modelName,
        content: fullResponse.substring(0, 100) + (fullResponse.length > 100 ? '...' : ''),
    });

      return fullResponse;
    } else {
      // 非流式API - 直接生成内容
      let result;
      
      if (chatHistory.length > 1) {
        // 如果有多条消息，使用聊天模式
        const chat = genModel.startChat({
          history: chatHistory.slice(0, -1) // 历史消息
        });

        // 获取最后一条消息
        const lastMessage = chatHistory[chatHistory.length - 1];
        if (!lastMessage) {
          return '';
        }
        
        // 发送最后一条消息并获取响应
        result = await chat.sendMessage(lastMessage.parts[0].text);
      } else {
        // 如果只有一条消息，直接生成内容
        const content = chatHistory.length > 0 ? chatHistory[0].parts[0].text : '';
        result = await genModel.generateContent(content);
      }

      const text = result.response.text();
      
      // 记录API响应
      logApiResponse('Google AI API', 200, {
        model: modelName,
        content: text.substring(0, 100) + (text.length > 100 ? '...' : '')
      });

      return text;
    }
  } catch (error) {
    console.error('Google API SDK请求失败:', error);
    throw error;
  }
};
