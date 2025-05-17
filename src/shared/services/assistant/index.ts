export * from './AssistantManager';
export * from './TopicManager';
export * from './Factory';
export * from './types';

// 导出统一的助手服务
import { AssistantManager } from './AssistantManager';
import { TopicManager } from './TopicManager';
import { AssistantFactory } from './Factory';
import type { Assistant } from '../../types/Assistant';
import { DataService } from '../DataService';

// 获取DataService实例
const dataService = DataService.getInstance();

/**
 * 统一的助手服务类 - 提供所有助手相关的功能
 * 这是应用程序中应该使用的主要接口
 */
export class AssistantService {
  // 核心助手管理
  static getUserAssistants = AssistantManager.getUserAssistants;
  static getCurrentAssistant = AssistantManager.getCurrentAssistant;
  static setCurrentAssistant = AssistantManager.setCurrentAssistant;
  static addAssistant = AssistantManager.addAssistant;
  static updateAssistant = AssistantManager.updateAssistant;
  static deleteAssistant = AssistantManager.deleteAssistant;

  // 话题关联管理
  static addTopicToAssistant = TopicManager.addTopicToAssistant;
  static removeTopicFromAssistant = TopicManager.removeTopicFromAssistant;
  static getAssistantTopics = TopicManager.getAssistantTopics;
  static clearAssistantTopics = TopicManager.clearAssistantTopics;
  static ensureAssistantHasTopic = TopicManager.ensureAssistantHasTopic;
  static createDefaultTopicForAssistant = TopicManager.createDefaultTopicForAssistant;
  static getDefaultTopic = TopicManager.getDefaultTopic;
  static validateAndFixAssistantTopicReferences = TopicManager.validateAndFixAssistantTopicReferences;
  static validateAndFixAllAssistantsTopicReferences = TopicManager.validateAndFixAllAssistantsTopicReferences;

  // 助手工厂
  static initializeDefaultAssistants = AssistantFactory.initializeDefaultAssistants;
  static createAssistant = AssistantFactory.createAssistant;

  /**
   * 创建新助手并完成所有相关设置
   * 该方法是创建助手的统一入口点，所有组件应该使用此方法
   * @param assistantData 助手基本数据
   * @param createDefaultTopic 是否自动创建默认话题
   * @returns 创建的助手对象，如果创建失败则返回null
   */
  static async createNewAssistant(
    assistantData: Partial<Assistant>,
    createDefaultTopic: boolean = true
  ): Promise<Assistant | null> {
    try {
      console.log('AssistantService: 开始创建新助手', assistantData.name);

      // 1. 创建助手对象 - 使用正确的参数顺序
      const newAssistant = AssistantFactory.createAssistant(
        assistantData.name || '新助手',
        assistantData.description || '',
        assistantData.systemPrompt || ''
      );

      // 2. 保存助手到数据库
      const success = await AssistantManager.addAssistant(newAssistant);
      if (!success) {
        console.error('AssistantService: 保存助手失败');
        return null;
      }

      // 3. 如果需要，创建默认话题
      if (createDefaultTopic) {
        await TopicManager.createDefaultTopicForAssistant(newAssistant.id);

        // 获取更新后的助手（包含话题ID）
        const updatedAssistant = await dataService.getAssistant(newAssistant.id);
        if (updatedAssistant) {
          return updatedAssistant;
        }
      }

      // 派发助手创建事件
      const event = new CustomEvent('assistantCreated', {
        detail: { assistant: newAssistant }
      });
      window.dispatchEvent(event);

      return newAssistant;
    } catch (error) {
      console.error('AssistantService: 创建助手时出错', error);
      return null;
    }
  }
}