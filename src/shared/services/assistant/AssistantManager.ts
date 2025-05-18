import type { Assistant, ChatTopic } from '../../types/Assistant';
import {
  deserializeAssistant,
  serializeAssistant
} from './types';
import { dexieStorage } from '../DexieStorageService';

/**
 * 核心助手管理服务 - 负责助手的基本CRUD操作
 */
export class AssistantManager {
  /**
   * 获取用户助手列表
   */
  static async getUserAssistants(): Promise<Assistant[]> {
    try {
      // 直接从dexieStorage获取数据
      const assistants = await dexieStorage.getAllAssistants();

      // 为每个助手加载话题
      for (const assistant of assistants) {
        const topicIds = assistant.topicIds || [];
        const topics: ChatTopic[] = [];

        // 加载关联的话题
        for (const topicId of topicIds) {
          const topic = await dexieStorage.getTopic(topicId);
          if (topic) {
            topics.push(topic);
          }
        }

        // 按最后消息时间排序
        topics.sort((a, b) => {
          const timeA = new Date(a.lastMessageTime || 0).getTime();
          const timeB = new Date(b.lastMessageTime || 0).getTime();
          return timeB - timeA; // 降序排列，最新的在前面
        });

        // 设置话题数组
        assistant.topics = topics;
      }

      // 确保每个助手都有正确的图标
      return assistants.map(assistant => {
        // 序列化后再反序列化以确保图标正确
        const serializedAssistant = serializeAssistant(assistant);
        return deserializeAssistant(serializedAssistant);
      });
    } catch (error) {
      console.error('获取用户助手失败:', error);
      return [];
    }
  }

  /**
   * 获取当前选中的助手
   */
  static async getCurrentAssistant(): Promise<Assistant | null> {
    try {
      // 从设置中获取当前助手ID
      const currentAssistantId = await dexieStorage.getSetting('currentAssistant');

      if (!currentAssistantId) return null;

      // 获取助手详情
      const assistant = await dexieStorage.getAssistant(currentAssistantId);
      if (!assistant) return null;
      
      // 加载助手关联的话题
      const topicIds = assistant.topicIds || [];
      const topics: ChatTopic[] = [];
      
      // 加载每个话题
      for (const topicId of topicIds) {
        const topic = await dexieStorage.getTopic(topicId);
        if (topic) {
          topics.push(topic);
        }
      }
      
      // 按最后消息时间排序
      topics.sort((a, b) => {
        const timeA = new Date(a.lastMessageTime || 0).getTime();
        const timeB = new Date(b.lastMessageTime || 0).getTime();
        return timeB - timeA; // 降序排列
      });
      
      // 设置话题数组
      assistant.topics = topics;
      
      // 确保返回的助手有正确的图标
      const serializedAssistant = serializeAssistant(assistant);
      return deserializeAssistant(serializedAssistant);
    } catch (error) {
      console.error('获取当前助手失败:', error);
      return null;
    }
  }

  /**
   * 设置当前助手
   */
  static async setCurrentAssistant(assistantId: string): Promise<boolean> {
    try {
      console.log(`尝试设置当前助手: ${assistantId}`);

      // 先验证助手是否存在
      try {
        const assistant = await dexieStorage.getAssistant(assistantId);
        if (!assistant) {
          console.error(`无法设置当前助手: ID为 ${assistantId} 的助手不存在`);
          return false;
        }
        console.log(`验证助手 ${assistantId} 存在`);
      } catch (validateError) {
        console.error(`验证助手 ${assistantId} 存在时出错:`, validateError);
        return false;
      }

      // 保存到dexieStorage
      await dexieStorage.saveSetting('currentAssistant', assistantId);

      // DexieStorageService内部会触发相应的事件
      // 我们不需要手动触发

      console.log(`当前助手设置为: ${assistantId}`);
      return true;
    } catch (error) {
      console.error('设置当前助手失败:', error);
      return false;
    }
  }

  /**
   * 添加助手
   */
  static async addAssistant(assistant: Assistant): Promise<boolean> {
    try {
      console.log(`尝试添加助手: ${assistant.id} (${assistant.name})`);

      // 先查询助手是否已存在
      let existingAssistant = null;
      try {
        existingAssistant = await dexieStorage.getAssistant(assistant.id);
      } catch (error) {
        console.log(`助手 ${assistant.id} 不存在，将创建新助手`);
      }

      if (existingAssistant) {
        console.warn(`助手 ${assistant.id} 已存在，将更新现有助手`);
        return await this.updateAssistant(assistant);
      }

      // 序列化助手对象，确保可以保存到数据库
      const assistantToSave = { ...assistant };
      
      // 处理icon字段，确保它可以被序列化
      if (assistantToSave.icon && typeof assistantToSave.icon === 'object') {
        assistantToSave.icon = null;
      }

      // 保存助手到数据库
      await dexieStorage.saveAssistant(assistantToSave);
      
      // 保存助手的话题到数据库
      if (assistant.topics && assistant.topics.length > 0) {
        for (const topic of assistant.topics) {
          if (!topic.assistantId) {
            topic.assistantId = assistant.id;
          }
          await dexieStorage.saveTopic(topic);
        }
      }
      
      // 更新Redux store
      const event = new CustomEvent('assistantCreated', {
        detail: { assistant: assistantToSave }
      });
      window.dispatchEvent(event);
      
      console.log(`助手 ${assistant.id} 保存成功`);
      return true;
    } catch (error) {
      // 改进错误处理，显示详细信息
      const errorMessage = error instanceof Error 
        ? `${error.name}: ${error.message}` 
        : String(error);
      const errorDetails = error instanceof Error && error.stack 
        ? `\n错误堆栈: ${error.stack}` 
        : '';
      console.error(`添加助手 ${assistant.id} 失败: ${errorMessage}${errorDetails}`);
      return false;
    }
  }

  /**
   * 更新助手
   */
  static async updateAssistant(assistant: Assistant): Promise<boolean> {
    try {
      console.log(`更新助手: ${assistant.id} (${assistant.name})`);

      // 创建一个符合 Assistant 接口的对象进行保存
      // 确保所有 Assistant 接口中定义的字段都存在，可选字段可以来自 assistant 对象或者默认值
      const assistantToSave: Assistant = {
        id: assistant.id,
        name: assistant.name,
        description: assistant.description,
        avatar: assistant.avatar,
        icon: assistant.icon === undefined ? null : assistant.icon,
        tags: assistant.tags,
        engine: assistant.engine,
        model: assistant.model,
        temperature: assistant.temperature,
        maxTokens: assistant.maxTokens,
        topP: assistant.topP,
        frequencyPenalty: assistant.frequencyPenalty,
        presencePenalty: assistant.presencePenalty,
        systemPrompt: assistant.systemPrompt,
        prompt: assistant.prompt,
        maxMessagesInContext: assistant.maxMessagesInContext,
        isDefault: assistant.isDefault,
        isSystem: !!assistant.isSystem,
        archived: assistant.archived,
        createdAt: assistant.createdAt,
        updatedAt: assistant.updatedAt,
        lastUsedAt: assistant.lastUsedAt,
        topicIds: Array.isArray(assistant.topicIds) ? [...assistant.topicIds] : [],
        topics: assistant.topics || [], // 添加 topics 字段
        selectedSystemPromptId: assistant.selectedSystemPromptId,
        mcpConfigId: assistant.mcpConfigId,
        tools: assistant.tools,
        tool_choice: assistant.tool_choice,
        speechModel: assistant.speechModel,
        speechVoice: assistant.speechVoice,
        speechSpeed: assistant.speechSpeed,
        responseFormat: assistant.responseFormat,
        isLocal: assistant.isLocal,
        localModelName: assistant.localModelName,
        localModelPath: assistant.localModelPath,
        localModelType: assistant.localModelType,
        file_ids: assistant.file_ids,
      };

      // 使用dexieStorage保存
      await dexieStorage.saveAssistant(assistantToSave);

      console.log(`助手 ${assistant.id} 更新成功`);
      return true;
    } catch (error) {
      console.error(`更新助手 ${assistant.id} 失败:`, error);
      return false;
    }
  }

  /**
   * 删除助手
   */
  static async deleteAssistant(assistantId: string): Promise<boolean> {
    try {
      console.log(`删除助手: ${assistantId}`);

      // 从dexieStorage删除
      await dexieStorage.deleteAssistant(assistantId);

      console.log(`助手 ${assistantId} 删除成功`);

      // 如果当前选中的助手被删除，清除当前选中状态
      const currentAssistantId = await dexieStorage.getSetting('currentAssistant');
      if (currentAssistantId === assistantId) {
        await dexieStorage.saveSetting('currentAssistant', null);
      }

      return true;
    } catch (error) {
      console.error(`删除助手 ${assistantId} 失败:`, error);
      return false;
    }
  }

  /**
   * 订阅助手相关事件
   * @param eventType 事件类型
   * @param callback 回调函数
   */
  static subscribeToAssistantEvents(eventType: string, callback: EventListener): () => void {
    // 使用window.addEventListener替代DexieStorageService.subscribe
    window.addEventListener(eventType, callback);

    // 返回取消订阅函数
    return () => {
      window.removeEventListener(eventType, callback);
    };
  }
}