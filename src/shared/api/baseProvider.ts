/**
 * 基础提供者接口
 * 定义了所有AI提供者必须实现的方法
 */
import type { Message } from '../types';

/**
 * 基础提供者接口
 */
export interface BaseProvider {
  /**
   * 发送聊天消息
   * @param messages 消息数组
   * @param options 选项
   * @returns 响应内容
   */
  sendChatMessage(
    messages: Message[],
    options?: {
      onUpdate?: (content: string, reasoning?: string) => void;
      enableWebSearch?: boolean;
      enableThinking?: boolean;
      tools?: string[];
      systemPrompt?: string;
    }
  ): Promise<string>;

  /**
   * 测试API连接
   * @returns 是否连接成功
   */
  testConnection(): Promise<boolean>;
}
