import type { Assistant, SerializableAssistant } from '../../types/Assistant';
import type { ChatTopic } from '../../types';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import React from 'react';
import { uuid } from '../../utils';

// 定义常量
export const ASSISTANTS_STORAGE_KEY = 'userAssistants';
export const CURRENT_ASSISTANT_KEY = 'currentAssistant';

/**
 * 反序列化助手（添加图标）
 */
export function deserializeAssistant(assistant: SerializableAssistant): Assistant {
  // 根据助手名称设置相应的图标
  let icon;

  try {
    if (assistant.name.includes('默认助手')) {
      icon = React.createElement(EmojiEmotionsIcon, { sx: { color: '#FFD700' } });
    } else if (assistant.name.includes('消息器') || assistant.name.includes('顽天助手')) {
      icon = React.createElement(AutoAwesomeIcon, { sx: { color: '#1E90FF' } });
    } else {
      // 默认使用一个快乐表情图标
      icon = React.createElement(EmojiEmotionsIcon, { sx: { color: '#4CAF50' } });
    }
  } catch (error) {
    console.error('创建助手图标失败，使用默认图标:', error);
    icon = null;
  }

  return {
    ...assistant,
    icon
  };
}

/**
 * 创建默认话题对象
 * 确保创建的话题符合有效话题的标准
 */
export function getDefaultTopic(_assistantId: string): ChatTopic {
  const currentTime = new Date().toISOString();
  return {
    id: uuid(),
    title: '新的对话',
    lastMessageTime: currentTime,
    // 添加系统提示词而不是系统消息
    prompt: '我是您的AI助手，可以回答问题、提供信息和帮助完成各种任务。请告诉我您需要什么帮助？',
    messages: []
  };
}

/**
 * 序列化助手（移除图标）用于存储
 */
export function serializeAssistant(assistant: Assistant): SerializableAssistant {
  const { icon, ...serializableAssistant } = assistant;
  return {
    ...serializableAssistant,
    icon: null
  };
}