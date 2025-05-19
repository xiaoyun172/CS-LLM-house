import type { Assistant, SerializableAssistant, ChatTopic } from '../../types/Assistant';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import React from 'react';
import { uuid } from '../../utils';
import { DEFAULT_TOPIC_PROMPT } from '../../config/prompts';

// 定义常量
export const ASSISTANTS_STORAGE_KEY = 'userAssistants';
export const CURRENT_ASSISTANT_KEY = 'currentAssistant';

/**
 * 反序列化助手（添加图标）
 */
export function deserializeAssistant(serializableAsst: SerializableAssistant): Assistant {
  let icon;
  try {
    if (serializableAsst.name.includes('默认助手')) {
      icon = React.createElement(EmojiEmotionsIcon, { sx: { color: '#FFD700' } });
    } else if (serializableAsst.name.includes('消息器') || serializableAsst.name.includes('顽天助手')) {
      icon = React.createElement(AutoAwesomeIcon, { sx: { color: '#1E90FF' } });
    } else {
      icon = React.createElement(EmojiEmotionsIcon, { sx: { color: '#4CAF50' } });
    }
  } catch (error) {
    console.error('创建助手图标失败，使用默认图标:', error);
    icon = null;
  }

  const assistant: Assistant = {
    id: serializableAsst.id,
    name: serializableAsst.name,
    description: serializableAsst.description,
    icon,
    avatar: undefined, 
    tags: [], 
    engine: undefined,
    model: undefined,
    temperature: undefined,
    maxTokens: undefined,
    topP: undefined,
    frequencyPenalty: undefined,
    presencePenalty: undefined,
    systemPrompt: serializableAsst.systemPrompt,
    prompt: undefined,
    maxMessagesInContext: undefined,
    isDefault: undefined,
    isSystem: serializableAsst.isSystem,
    archived: undefined,
    createdAt: undefined, 
    updatedAt: undefined,
    lastUsedAt: undefined,
    topicIds: serializableAsst.topicIds || [],
    topics: [], 
    selectedSystemPromptId: undefined,
    mcpConfigId: undefined,
    tools: [],
    tool_choice: undefined,
    speechModel: undefined,
    speechVoice: undefined,
    speechSpeed: undefined,
    responseFormat: undefined,
    isLocal: undefined,
    localModelName: undefined,
    localModelPath: undefined,
    localModelType: undefined,
    file_ids: [],
  };
  return assistant;
}

/**
 * 创建默认话题
 * @param assistantId 助手ID
 * @returns 默认话题对象
 */
export function getDefaultTopic(assistantId: string): ChatTopic {
  const now = new Date();
  const currentTime = now.toISOString();
  
  return {
    id: uuid(),
    name: '新的对话',
    title: '新的对话',
    createdAt: currentTime,
    updatedAt: currentTime,
    lastMessageTime: currentTime,
    messages: [],
    messageIds: [],
    prompt: DEFAULT_TOPIC_PROMPT,
    assistantId: assistantId,
    isNameManuallyEdited: false,
  };
}

/**
 * 生成默认话题模板
 * 用于创建新话题的模板对象
 * @param assistantId 助手ID
 */
export function defaultTopicTemplate(assistantId: string): Omit<ChatTopic, 'id'> {
  const now = new Date();
  const currentTime = now.toISOString();
  
  return {
    name: '新的对话',
    title: '新的对话',
    createdAt: currentTime,
    updatedAt: currentTime,
    lastMessageTime: currentTime,
    messages: [],
    messageIds: [],
    prompt: DEFAULT_TOPIC_PROMPT,
    assistantId: assistantId,
    isNameManuallyEdited: false,
  };
}

/**
 * 序列化助手（移除图标）用于存储
 */
export function serializeAssistant(assistant: Assistant): SerializableAssistant {
  const { icon, topics, ...rest } = assistant; 
  const serializableAssistant: SerializableAssistant = {
    id: rest.id,
    name: rest.name,
    description: rest.description,
    icon: null, 
    isSystem: rest.isSystem,
    topicIds: rest.topicIds || [],
    systemPrompt: rest.systemPrompt,
  };
  return serializableAssistant;
}