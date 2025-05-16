import type { Message } from "./index";

/**
 * 电脑版结构的话题类型
 */
export interface DesktopTopic {
  id: string;
  assistantId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  pinned?: boolean;
  prompt?: string;
  isNameManuallyEdited?: boolean;
}

/**
 * 电脑版结构的助手消息类型
 */
export interface DesktopAssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * 电脑版结构的助手设置类型
 */
export interface DesktopAssistantSettings {
  contextCount: number;
  temperature: number;
  topP: number;
  maxTokens?: number;
  enableMaxTokens: boolean;
  streamOutput: boolean;
  hideMessages: boolean;
  defaultModel?: any;
  customParameters?: Array<{
    name: string;
    value: string | number | boolean | object;
    type: 'string' | 'number' | 'boolean' | 'json';
  }>;
}

/**
 * 电脑版结构的助手类型
 */
export interface DesktopAssistant {
  id: string;
  name: string;
  prompt: string;
  topics: DesktopTopic[];
  type: string;
  emoji?: string;
  description?: string;
  model?: any;
  defaultModel?: any;
  settings?: Partial<DesktopAssistantSettings>;
  messages?: DesktopAssistantMessage[];
  enableWebSearch?: boolean;
  enableGenerateImage?: boolean;
} 