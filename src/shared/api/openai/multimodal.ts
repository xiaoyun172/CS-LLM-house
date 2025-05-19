/**
 * OpenAI多模态处理模块
 * 负责处理图像和其他多模态内容
 */
import type { Message, ImageContent } from '../../types';
// 不直接导入OpenAI，避免未使用的导入警告
import { adaptToAPIMessage } from '../../utils/messageAdapterUtils';

// 定义消息参数类型，避免使用OpenAI类型
export interface ChatCompletionMessageParam {
  role: 'system' | 'user' | 'assistant';
  content: string | any[];
}

export interface ChatCompletionUserMessageParam extends ChatCompletionMessageParam {
  role: 'user';
}

export interface ChatCompletionAssistantMessageParam extends ChatCompletionMessageParam {
  role: 'assistant';
}

export interface ChatCompletionSystemMessageParam extends ChatCompletionMessageParam {
  role: 'system';
}

// OpenAI消息内容项类型
export interface MessageContentItem {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

/**
 * 转换消息格式，支持图片
 * @param messages 消息数组
 * @returns OpenAI格式的消息数组
 */
export function convertToOpenAIMessages(messages: Message[]): Array<ChatCompletionMessageParam> {
  return messages.map(msg => {
    // 首先将消息转换为API兼容格式
    const apiMsg = adaptToAPIMessage(msg);

    // 检查消息是否包含图片 - 支持两种图片格式
    const isComplexContent = typeof apiMsg.content === 'object';
    const hasDirectImages = Array.isArray(apiMsg.images) && apiMsg.images.length > 0;

    // 添加调试日志
    console.log(`[OpenAI API] 处理消息类型: ${apiMsg.role}, 复杂内容: ${isComplexContent}, 直接图片: ${hasDirectImages}`);

    if (apiMsg.role === 'user') {
      // 用户消息处理
      // 如果包含任意形式的图片，使用内容数组格式
      if (isComplexContent || hasDirectImages) {
        // 准备内容数组
        const contentArray: MessageContentItem[] = [];

        // 添加文本内容（如果有）
        const textContent = isComplexContent
          ? (apiMsg.content as {text?: string}).text || ''
          : typeof apiMsg.content === 'string' ? apiMsg.content : '';

        if (textContent) {
          contentArray.push({
            type: 'text',
            text: textContent
          });
        }

        // 添加内容里的图片（旧格式）
        if (isComplexContent) {
          const content = apiMsg.content as {text?: string; images?: ImageContent[]};
          if (content.images && content.images.length > 0) {
            console.log(`[OpenAI API] 处理旧格式图片，数量: ${content.images.length}`);
            content.images.forEach((image, index) => {
              if (image.base64Data) {
                contentArray.push({
                  type: 'image_url',
                  image_url: {
                    url: image.base64Data // 已经包含完整的data:image/格式
                  }
                });
                console.log(`[OpenAI API] 添加base64图片 ${index+1}, 开头: ${image.base64Data.substring(0, 30)}...`);
              } else if (image.url) {
                contentArray.push({
                  type: 'image_url',
                  image_url: {
                    url: image.url
                  }
                });
                console.log(`[OpenAI API] 添加URL图片 ${index+1}: ${image.url}`);
              }
            });
          }
        }

        // 添加直接附加的图片（新格式）
        if (hasDirectImages) {
          console.log(`[OpenAI API] 处理新格式图片，数量: ${apiMsg.images!.length}`);
          apiMsg.images!.forEach((imgFormat, index) => {
            if (imgFormat.image_url && imgFormat.image_url.url) {
              contentArray.push({
                type: 'image_url',
                image_url: {
                  url: imgFormat.image_url.url
                }
              });
              console.log(`[OpenAI API] 添加新格式图片 ${index+1}: ${imgFormat.image_url.url.substring(0, 30)}...`);
            }
          });
        }

        console.log(`[OpenAI API] 转换后内容数组长度: ${contentArray.length}, 包含图片数量: ${contentArray.filter(item => item.type === 'image_url').length}`);

        // 处理空内容的极端情况
        if (contentArray.length === 0) {
          console.warn('[OpenAI API] 警告: 生成了空内容数组，添加默认文本');
          contentArray.push({
            type: 'text',
            text: '图片'
          });
        }

        return {
          role: 'user',
          content: contentArray
        } as ChatCompletionUserMessageParam;
      } else {
        // 纯文本消息
        return {
          role: 'user',
          content: typeof apiMsg.content === 'string' ? apiMsg.content : (apiMsg.content as {text?: string}).text || '',
        } as ChatCompletionUserMessageParam;
      }
    } else if (apiMsg.role === 'assistant') {
      return {
        role: 'assistant',
        content: typeof apiMsg.content === 'string' ? apiMsg.content : (apiMsg.content as {text?: string}).text || '',
      } as ChatCompletionAssistantMessageParam;
    } else {
      return {
        role: 'system',
        content: typeof apiMsg.content === 'string' ? apiMsg.content : (apiMsg.content as {text?: string}).text || '',
      } as ChatCompletionSystemMessageParam;
    }
  });
}

/**
 * 检查消息中是否包含图片
 * @param messages 消息数组
 * @returns 是否包含图片
 */
export function hasImages(messages: Message[]): boolean {
  // 检查直接图片
  const hasDirectImages = messages.some(msg => {
    const apiMsg = adaptToAPIMessage(msg);
    return Array.isArray(apiMsg.images) && apiMsg.images.length > 0;
  });

  // 检查内容图片
  const hasContentImages = messages.some(msg => {
    const apiMsg = adaptToAPIMessage(msg);
    if (typeof apiMsg.content !== 'object') return false;
    const content = apiMsg.content as {images?: ImageContent[]};
    return Array.isArray(content.images) && content.images.length > 0;
  });

  return hasDirectImages || hasContentImages;
}

/**
 * 检查OpenAI格式消息中是否包含图片
 * @param messages OpenAI格式的消息数组
 * @returns 是否包含图片
 */
export function hasOpenAIFormatImages(messages: ChatCompletionMessageParam[]): boolean {
  return messages.some(msg =>
    Array.isArray(msg.content) &&
    msg.content.some((item: any) => item.type === 'image_url')
  );
}
