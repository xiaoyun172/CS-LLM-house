/**
 * OpenAI聊天完成模块
 * 负责处理聊天完成请求
 */
import type { Message, Model } from '../../types';
// 不直接导入OpenAI，而是在需要的地方使用类型断言
import { logApiRequest, logApiResponse } from '../../services/LoggerService';
import { adaptToAPIMessage } from '../../utils/messageAdapterUtils';
import { createClient, supportsMultimodal } from './client';
import { convertToOpenAIMessages, hasImages, hasOpenAIFormatImages } from './multimodal';
import { streamCompletion } from './stream';

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
  onUpdate?: (content: string) => void
): Promise<string> {
  try {
    // 创建OpenAI客户端
    const openai = createClient(model);
    const modelId = model.id;

    // 检查多模态支持
    const modelSupportsMultimodal = supportsMultimodal(model);

    // 过滤掉空消息
    const filteredMessages = messages.filter(msg => {
      // 转换为API兼容格式
      const apiMsg = adaptToAPIMessage(msg);

      if (typeof apiMsg.content === 'string') {
        return apiMsg.content.trim() !== '';
      } else {
        // 对于复杂消息，检查是否有文本或图片
        const content = apiMsg.content as {text?: string; images?: any[]};
        return content.text?.trim() !== '' || (content.images && content.images.length > 0);
      }
    });

    // 检查是否包含图片
    const messagesHaveImages = hasImages(filteredMessages);
    console.log(`[OpenAI API] 消息中图片检测: ${messagesHaveImages ? '包含图片' : '不包含图片'}`);

    // 转换消息格式
    const openaiMessages = convertToOpenAIMessages(filteredMessages);

    // 如果消息列表为空，返回友好的提示消息而不是抛出错误
    if (openaiMessages.length === 0) {
      console.log('[API请求] 警告: 消息列表为空，返回提示消息');
      return '请输入您想要提问的内容';
    }

    // 检查是否包含图片但模型不支持
    const openaiMessagesHaveImages = hasOpenAIFormatImages(openaiMessages);

    if (openaiMessagesHaveImages) {
      // 详细记录所有图片信息，帮助调试
      console.log('[OpenAI API] 发现图片内容，详细信息:');
      openaiMessages.forEach((msg, i) => {
        if (Array.isArray(msg.content)) {
          const imageItems = msg.content.filter((item: any) => item.type === 'image_url');
          if (imageItems.length > 0) {
            console.log(`[OpenAI API] 消息 #${i+1} 包含 ${imageItems.length} 张图片`);
          }
        }
      });

      if (!modelSupportsMultimodal) {
        console.warn('[API请求] 警告: 消息包含图片，但模型不支持多模态');
        throw new Error('当前模型不支持图片分析，请选择支持多模态的模型，如GPT-4V或Gemini');
      }
    }

    // 确保至少有一条用户消息
    if (!openaiMessages.some(msg => msg.role === 'user')) {
      console.warn('[API请求] 警告: 没有用户消息，API可能返回错误');
    }

    console.log(`[API请求] 使用OpenAI API发送请求，模型ID: ${modelId}，提供商: ${model.provider}`);
    console.log('[API请求] 消息数量:', openaiMessages.length);

    // 记录API请求
    logApiRequest('OpenAI Chat Completions', 'INFO', {
      method: 'POST',
      model: modelId,
      temperature: model.temperature,
      max_tokens: model.maxTokens,
      messages: openaiMessages.map(m => ({
        role: m.role,
        content: typeof m.content === 'string'
          ? (m.content.substring(0, 50) + (m.content.length > 50 ? '...' : ''))
          : '[复杂内容]'
      }))
    });

    // 如果提供了onUpdate回调，使用流式响应
    if (onUpdate) {
      return await streamCompletion(openai, modelId, openaiMessages, model.temperature, model.maxTokens, onUpdate);
    } else {
      // 否则使用普通响应
      try {
        const completion = await openai.chat.completions.create({
          model: modelId,
          messages: openaiMessages,
          temperature: model.temperature,
          max_tokens: model.maxTokens,
        });

        const responseContent = completion.choices[0].message.content || '';
        console.log('[API响应] 成功接收响应:', {
          model: modelId,
          content: responseContent.substring(0, 100) + (responseContent.length > 100 ? '...' : ''),
          usage: completion.usage
        });

        // 记录API响应
        logApiResponse('OpenAI Chat Completions', 200, {
          model: modelId,
          content: responseContent.substring(0, 100) + (responseContent.length > 100 ? '...' : ''),
          usage: completion.usage
        });

        return responseContent;
      } catch (error: any) {
        console.error('[API错误] OpenAI API请求失败:', error);
        console.error('[API错误] 详细信息:', {
          message: error.message,
          code: error.code,
          status: error.status,
          type: error.type,
          param: error.param,
          modelId,
          provider: model.provider
        });

        throw error;
      }
    }
  } catch (error) {
    console.error('[API错误] OpenAI API请求失败:', error);
    console.error('[API错误] 详细信息:', {
      message: error instanceof Error ? error.message : '未知错误',
      model: model.id,
      provider: model.provider
    });

    throw error;
  }
}
