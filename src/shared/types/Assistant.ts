import type { ReactNode } from 'react';

export interface Assistant {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
  isSystem?: boolean;
  topicIds?: string[];
  systemPrompt?: string; // 助手系统提示词
}

// 用于持久化存储的助手类型，不包含无法序列化的React元素
export interface SerializableAssistant {
  id: string;
  name: string;
  description: string;
  icon: null; // 存储时将图标设为null
  isSystem?: boolean;
  topicIds?: string[];
  systemPrompt?: string; // 助手系统提示词
} 