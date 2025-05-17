import type { Assistant } from '../../types/Assistant';
import React from 'react';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { uuid } from '../../utils';
import { getDefaultTopic } from './types';
import { AssistantManager } from './AssistantManager';
import { DEFAULT_SYSTEM_PROMPT, WEB_ANALYSIS_PROMPT } from '../../config/prompts';
import { SystemPromptService } from '../SystemPromptService';
import { dexieStorage } from '../DexieStorageService';

// 移除DataService引用
// import { DataService } from '../DataService';
// const dataService = DataService.getInstance();
const promptService = SystemPromptService.getInstance();

/**
 * 助手工厂服务 - 负责创建默认助手和初始化数据
 */
export class AssistantFactory {
  /**
   * 初始化默认助手
   */
  static async initializeDefaultAssistants(): Promise<Assistant[]> {
    // 获取当前系统提示词，如果没有使用默认值
    const systemPrompt = promptService.getActiveSystemPrompt() || DEFAULT_SYSTEM_PROMPT;

    const defaultAssistants: Assistant[] = [
      {
        id: uuid(),
        name: '默认助手',
        description: '通用型AI助手，可以回答各种问题',
        icon: React.createElement(EmojiEmotionsIcon, { sx: { color: '#FFD700' } }),
        isSystem: true,
        topicIds: [],
        systemPrompt: systemPrompt
      },
      {
        id: uuid(),
        name: '网页分析助手',
        description: '帮助分析各种网页内容',
        icon: React.createElement(AutoAwesomeIcon, { sx: { color: '#1E90FF' } }),
        isSystem: true,
        topicIds: [],
        systemPrompt: WEB_ANALYSIS_PROMPT
      }
    ];

    // 为每个助手创建默认话题
    for (const assistant of defaultAssistants) {
      const defaultTopic = getDefaultTopic(assistant.id);
      assistant.topicIds = [defaultTopic.id];

      // 保存话题到数据库
      try {
        await dexieStorage.saveTopic(defaultTopic);
        console.log(`默认助手的默认话题已保存到数据库: ${defaultTopic.id}`);
      } catch (saveTopicError) {
        console.error(`保存默认助手 ${assistant.id} 的默认话题失败:`, saveTopicError);
      }
    }

    // 保存到数据库，使用AssistantManager以确保更好的兼容性
    for (const assistant of defaultAssistants) {
      try {
        // 使用AssistantManager.addAssistant方法，它有更好的错误处理和兼容性
        const success = await AssistantManager.addAssistant(assistant);
        if (!success) {
          console.error(`通过AssistantManager保存默认助手 ${assistant.id} 失败`);
        }
      } catch (saveAssistantError) {
        console.error(`保存默认助手 ${assistant.id} 时发生异常:`, saveAssistantError);
      }
    }

    // 保存当前助手设置
    await AssistantManager.setCurrentAssistant(defaultAssistants[0].id);

    return defaultAssistants;
  }

  /**
   * 创建新助手
   */
  static createAssistant(name: string, description = '', systemPrompt = ''): Assistant {
    // 如果没有提供系统提示词，使用当前系统提示词或默认值
    const activePrompt = promptService.getActiveSystemPrompt() || DEFAULT_SYSTEM_PROMPT;
    const finalPrompt = systemPrompt || activePrompt;

    return {
      id: uuid(),
      name,
      description: description || `助手 ${name}`,
      icon: React.createElement(EmojiEmotionsIcon, { sx: { color: '#4CAF50' } }),
      isSystem: false,
      topicIds: [],
      systemPrompt: finalPrompt
    };
  }
}