import { v4 as uuid } from 'uuid';
import type { ChatTopic } from '../types';
import { DataService } from './DataService';
import { AssistantService } from './index';
import store from '../store';
import { createTopic, setCurrentTopic } from '../store/messagesSlice';

// 获取DataService实例
const dataService = DataService.getInstance();

/**
 * 话题创建服务 - 专门负责各种场景下的话题创建逻辑
 * 所有需要创建话题的地方都应该使用这个服务
 */
export class TopicCreationService {
  /**
   * 话题创建源枚举 - 用于标识话题的创建来源
   */
  static TopicCreationSource = {
    ASSISTANT_CREATION: 'assistant_creation', // 创建助手时自动创建
    TOPICS_CLEARED: 'topics_cleared', // 清空话题后自动创建
    TOPIC_DELETED: 'topic_deleted', // 删除最后一个话题后自动创建
    SIDEBAR_BUTTON: 'sidebar_button', // 侧边栏按钮手动创建
    TOOLBAR_BUTTON: 'toolbar_button', // 工具栏按钮手动创建
  };

  /**
   * 创建新话题
   * @param source 创建来源
   * @param assistantId 可选的助手ID，如果不提供会自动获取当前助手
   */
  static async createNewTopic(source: string, assistantId?: string): Promise<ChatTopic | null> {
    try {
      console.log(`[TopicCreationService] 开始创建话题，来源: ${source}`);
      
      // 1. 获取助手ID
      const currentAssistantId = assistantId || await this.getCurrentAssistantId();
      if (!currentAssistantId) {
        console.error('[TopicCreationService] 无法创建话题，未找到有效的助手ID');
        return null;
      }
      
      console.log(`[TopicCreationService] 为助手 ${currentAssistantId} 创建新话题`);

      // 2. 创建话题对象
      const topicId = uuid();
      const newTopic: ChatTopic = {
        id: topicId,
        title: '新的对话',
        lastMessageTime: new Date().toISOString(),
        // 添加系统提示词确保话题有效性
        prompt: '我是您的AI助手，可以回答问题、提供信息和帮助完成各种任务。请告诉我您需要什么帮助？',
        messages: []
      };

      console.log(`[TopicCreationService] 创建话题对象: ID=${topicId}, 标题="${newTopic.title}", 来源=${source}`);

      // 3. 保存话题到数据库
      console.log(`[TopicCreationService] 正在保存话题 ${topicId} 到数据库`);
      await dataService.saveTopic(newTopic);

      // 4. 验证话题是否被成功保存
      const verifyTopic = await dataService.getTopic(topicId);
      if (!verifyTopic) {
        console.error(`[TopicCreationService] 话题 ${topicId} 保存后验证失败，尝试重新保存`);
        // 再次尝试保存
        await dataService.saveTopic(newTopic);

        // 再次验证
        const secondVerify = await dataService.getTopic(topicId);
        if (!secondVerify) {
          console.error(`[TopicCreationService] 话题 ${topicId} 第二次保存仍然失败`);
          throw new Error(`话题创建失败: 无法保存到数据库`);
        }
        console.log(`[TopicCreationService] 话题 ${topicId} 第二次保存成功`);
      } else {
        console.log(`[TopicCreationService] 话题 ${topicId} 成功保存并验证`);
      }

      // 5. 添加到Redux
      console.log(`[TopicCreationService] 添加话题 ${topicId} 到Redux`);
      store.dispatch(createTopic(newTopic));
      
      // 6. 强制更新话题列表
      store.dispatch({ type: 'FORCE_TOPICS_UPDATE' });

      // 7. 关联话题到助手
      console.log(`[TopicCreationService] 关联话题 ${topicId} 到助手 ${currentAssistantId}`);
      await AssistantService.addTopicToAssistant(currentAssistantId, topicId);

      // 8. 设置为当前话题
      console.log(`[TopicCreationService] 设置话题 ${topicId} 为当前话题`);
      store.dispatch(setCurrentTopic(newTopic));

      // 9. 只通过notifyTopicCreated派发一次事件
      console.log(`[TopicCreationService] 派发topicCreated事件, 话题ID=${topicId}`);
      this.notifyTopicCreated(newTopic, currentAssistantId);

      console.log(`[TopicCreationService] 话题创建完成: ID=${topicId}, 标题="${newTopic.title}", 来源=${source}`);
      return newTopic;
    } catch (error) {
      console.error('[TopicCreationService] 创建话题失败', error);
      return null;
    }
  }

  /**
   * 获取当前助手ID
   */
  private static async getCurrentAssistantId(): Promise<string | null> {
    // 首先尝试从AssistantService获取
    try {
      const currentAssistant = await AssistantService.getCurrentAssistant();
      if (currentAssistant && currentAssistant.id) {
        return currentAssistant.id;
      }
    } catch (error) {
      console.warn('[TopicCreationService] 从AssistantService获取当前助手失败');
    }

    // 尝试从localStorage获取
    const storedId = localStorage.getItem('currentAssistant');
    if (storedId) {
      return storedId;
    }

    // 尝试获取第一个可用助手
    try {
      const assistants = await AssistantService.getUserAssistants();
      if (assistants && assistants.length > 0) {
        const firstAssistant = assistants[0];
        // 更新当前助手
        await AssistantService.setCurrentAssistant(firstAssistant.id);
        localStorage.setItem('currentAssistant', firstAssistant.id);
        return firstAssistant.id;
      }
    } catch (error) {
      console.error('[TopicCreationService] 获取助手列表失败');
    }

    return null;
  }

  /**
   * 派发话题创建事件
   * 统一管理话题创建事件的派发
   */
  private static notifyTopicCreated(topic: ChatTopic, assistantId: string): void {
    console.log(`[TopicCreationService] 开始派发话题创建事件, 话题ID=${topic.id}, 助手ID=${assistantId}`);
    
    try {
      const event = new CustomEvent('topicCreated', {
        detail: {
          topic,
          assistantId
        }
      });
      window.dispatchEvent(event);
      console.log(`[TopicCreationService] 话题创建事件派发成功, 话题ID=${topic.id}`);
    } catch (error) {
      console.error(`[TopicCreationService] 话题创建事件派发失败`, error);
    }
  }

  /**
   * 处理清空话题后的自动创建
   */
  static async handleTopicsClearedAutoCreation(assistantId: string): Promise<ChatTopic | null> {
    console.log(`[TopicCreationService] 处理清空话题后的自动创建, 助手ID=${assistantId}`);
    // 防止重复标记
    localStorage.setItem('_topicCreationInProgress', 'true');
    
    try {
      // 使用专门的来源标记
      const newTopic = await this.createNewTopic(this.TopicCreationSource.TOPICS_CLEARED, assistantId);
      return newTopic;
    } finally {
      // 移除标记
      setTimeout(() => {
        localStorage.removeItem('_topicCreationInProgress');
      }, 1000);
    }
  }

  /**
   * 处理删除最后一个话题后的自动创建
   */
  static async handleLastTopicDeletedAutoCreation(assistantId: string): Promise<ChatTopic | null> {
    console.log(`[TopicCreationService] 处理删除最后一个话题后的自动创建, 助手ID=${assistantId}`);
    
    // 检查是否已有创建进程
    if (localStorage.getItem('_topicCreationInProgress') === 'true') {
      console.log('[TopicCreationService] 已有话题创建进程正在进行，跳过');
      return null;
    }
    
    // 标记创建进程
    localStorage.setItem('_topicCreationInProgress', 'true');
    
    try {
      // 使用专门的来源标记
      const newTopic = await this.createNewTopic(this.TopicCreationSource.TOPIC_DELETED, assistantId);
      return newTopic;
    } finally {
      // 移除标记
      setTimeout(() => {
        localStorage.removeItem('_topicCreationInProgress');
      }, 1000);
    }
  }

  /**
   * 处理手动创建话题 - 侧边栏按钮
   */
  static async handleSidebarButtonCreation(): Promise<ChatTopic | null> {
    console.log('[TopicCreationService] 处理侧边栏按钮手动创建话题');
    return await this.createNewTopic(this.TopicCreationSource.SIDEBAR_BUTTON);
  }

  /**
   * 处理手动创建话题 - 工具栏按钮
   */
  static async handleToolbarButtonCreation(): Promise<ChatTopic | null> {
    console.log('[TopicCreationService] 处理工具栏按钮手动创建话题');
    return await this.createNewTopic(this.TopicCreationSource.TOOLBAR_BUTTON);
  }

  /**
   * 处理创建助手时的自动创建
   */
  static async handleAssistantCreationAutoCreate(assistantId: string): Promise<ChatTopic | null> {
    console.log(`[TopicCreationService] 处理创建助手时的自动创建话题, 助手ID=${assistantId}`);
    return await this.createNewTopic(this.TopicCreationSource.ASSISTANT_CREATION, assistantId);
  }
} 