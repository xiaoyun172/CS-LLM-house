/**
 * OpenAI聊天完成模块
 * 负责处理聊天完成请求
 * 使用与电脑版一致的Provider实现
 */
import type { Message, Model } from '../../types';
import { logApiRequest } from '../../services/LoggerService';
import { OpenAIProvider } from './provider';




/**
 * 发送聊天请求
 * @param messages 消息数组
 * @param model 模型配置
 * @param options 额外选项
 * @returns 响应内容
 */
export async function sendChatRequest(
  messages: Message[],
  model: Model,
  options?: {
    onUpdate?: (content: string, reasoning?: string) => void;
    enableWebSearch?: boolean;
    systemPrompt?: string;
    enableTools?: boolean; // 添加工具开关参数
  }
): Promise<string> {
  try {
    const opts = options || {};
    // 确保onUpdate回调类型正确
    const onUpdate = typeof opts.onUpdate === 'function' ? opts.onUpdate : undefined;
    const enableWebSearch = opts.enableWebSearch === true;
    // 默认启用工具，除非明确设置为false
    const enableTools = opts.enableTools !== false;

    // 获取系统提示词 - 即使没有提供也使用空字符串，确保始终添加system角色消息
    // 这样与电脑版保持一致，电脑版总是添加system角色消息
    const systemPrompt = opts.systemPrompt || '';

    console.log(`[API请求] 使用OpenAI API发送请求，模型ID: ${model.id}，提供商: ${model.provider}`);
    console.log(`[API请求] 消息数量: ${messages.length}, 系统提示: ${systemPrompt ? '有' : '无'}`);

    // 强制检查：确保消息数组不为空
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('[API请求] 严重错误: 消息数组为空或无效，添加默认消息');

      // 创建一个默认的主文本块
      const blockId = 'block-default-' + Date.now();

      // 添加一个默认的用户消息
      const defaultMessage: any = {
        id: 'default-' + Date.now(),
        role: 'user',
        assistantId: '',
        topicId: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'success' as any,
        blocks: [blockId]
      };

      // 创建一个默认的消息块
      const defaultBlock = {
        id: blockId,
        messageId: defaultMessage.id,
        type: 'main_text',
        content: '您好，请问有什么可以帮助您的？',
        createdAt: new Date().toISOString(),
        status: 'success' as any
      };

      // 将默认块内容添加到消息中
      defaultMessage._content = defaultBlock.content;

      messages = [defaultMessage];

      console.log('[API请求] 添加默认用户消息: 您好，请问有什么可以帮助您的？');
    }

    // 记录消息数组
    console.log(`[API请求] 消息数组:`, JSON.stringify(messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      blocks: msg.blocks
    }))));

    // 记录API请求
    logApiRequest('OpenAI Chat', 'INFO', {
      method: 'POST',
      model: model.id,
      messagesCount: messages.length,
      enableWebSearch,
      enableTools,
      hasSystemPrompt: Boolean(systemPrompt),
      stream: true, // 添加流式输出信息，与电脑版保持一致
      messages: messages.map(msg => ({
        role: msg.role,
        blocks: msg.blocks
      }))
    });

    // 创建Provider实例
    const provider = new OpenAIProvider(model);

    // 记录工具状态
    if (enableTools) {
      if (enableWebSearch && model.capabilities?.webSearch) {
        console.log(`[API请求] 启用网页搜索功能`);
      }
    } else {
      console.log(`[API请求] 工具功能已禁用`);
    }

    // 使用Provider发送消息
    return await provider.sendChatMessage(messages, {
      onUpdate,
      enableWebSearch,
      systemPrompt,
      enableTools
    });
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
