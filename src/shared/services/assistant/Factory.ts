import type { Assistant } from '../../types/Assistant';
import React from 'react';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { uuid } from '../../utils';
import { DataService } from '../DataService';
import { getDefaultTopic } from './types';
import { AssistantManager } from './AssistantManager';

// 获取DataService实例
const dataService = DataService.getInstance();

/**
 * 助手工厂服务 - 负责创建默认助手和初始化数据
 */
export class AssistantFactory {
  /**
   * 初始化默认助手
   */
  static async initializeDefaultAssistants(): Promise<Assistant[]> {
    const defaultAssistants: Assistant[] = [
      {
        id: uuid(),
        name: '默认助手',
        description: '通用型AI助手，可以回答各种问题',
        icon: React.createElement(EmojiEmotionsIcon, { sx: { color: '#FFD700' } }),
        isSystem: true,
        topicIds: [],
        systemPrompt: '你是一个友好、专业、乐于助人的AI助手。你会以客观、准确的态度回答用户的问题，并在不确定的情况下坦诚表明。你可以协助用户完成各种任务，提供信息，或进行有意义的对话。'
      },
      {
        id: uuid(),
        name: '消息器顽天助手',
        description: '帮助分析各种网页内容',
        icon: React.createElement(AutoAwesomeIcon, { sx: { color: '#1E90FF' } }),
        isSystem: true,
        topicIds: [],
        systemPrompt: '你是一个专注于网页内容分析的AI助手。你能帮助用户理解、总结和提取网页中的关键信息。无论是新闻、文章、论坛还是社交媒体内容，你都能提供有价值的见解和分析。'
      }
    ];

    // 为每个助手创建默认话题
    for (const assistant of defaultAssistants) {
      const defaultTopic = getDefaultTopic(assistant.id);
      assistant.topicIds = [defaultTopic.id];

      // 保存话题到数据库
      try {
        await dataService.saveTopic(defaultTopic);
        console.log(`默认助手的默认话题已保存到数据库: ${defaultTopic.id}`);
      } catch (saveTopicError) {
        console.error(`保存默认助手 ${assistant.id} 的默认话题失败:`, saveTopicError);
      }
    }

    // 保存到DataService
    for (const assistant of defaultAssistants) {
      await dataService.saveAssistant(assistant);
    }

    // 保存当前助手设置
    await AssistantManager.setCurrentAssistant(defaultAssistants[0].id);

    return defaultAssistants;
  }
  
  /**
   * 创建新助手
   */
  static createAssistant(name: string, description = '', systemPrompt = ''): Assistant {
    return {
      id: uuid(),
      name,
      description: description || `助手 ${name}`,
      icon: React.createElement(EmojiEmotionsIcon, { sx: { color: '#4CAF50' } }),
      isSystem: false,
      topicIds: [],
      systemPrompt: systemPrompt || '你是一个友好、专业的AI助手。请用简洁、准确的方式回答用户的问题。'
    };
  }
} 