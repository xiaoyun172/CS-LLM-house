import type { DesktopAssistant, DesktopTopic } from '../types/DesktopAssistant';
import { AssistantService } from '../services';
import { TopicService } from '../services/TopicService';

/**
 * 检查是否已经完成数据结构迁移
 */
export async function isDataStructureMigrated(): Promise<boolean> {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key: 'dataStructureMigrationCompleted' });
    return value === 'true';
  } catch (error) {
    console.error('检查数据结构迁移状态失败:', error);
    return false;
  }
}

/**
 * 获取助手数据，根据迁移状态自动选择数据源
 */
export async function getAssistantData(): Promise<{
  useDesktopStructure: boolean;
  assistants: any[];
}> {
  const migrated = await isDataStructureMigrated();
  
  if (migrated) {
    const desktopAssistants = await AssistantService.getDesktopStructureAssistants();
    return {
      useDesktopStructure: true,
      assistants: desktopAssistants
    };
  } else {
    const mobileAssistants = await AssistantService.getUserAssistants();
    return {
      useDesktopStructure: false,
      assistants: mobileAssistants
    };
  }
}

/**
 * 获取指定助手的所有话题
 */
export async function getAssistantTopics(
  assistantId: string,
  useDesktopStructure: boolean
): Promise<any[]> {
  if (useDesktopStructure) {
    const desktopAssistants = await AssistantService.getDesktopStructureAssistants();
    const assistant = desktopAssistants.find((a: DesktopAssistant) => a.id === assistantId);
    return assistant?.topics || [];
  } else {
    const allTopics = await TopicService.getAllTopics();
    const assistantTopicIds = await AssistantService.getAssistantTopics(assistantId);
    return allTopics.filter(topic => assistantTopicIds.includes(topic.id));
  }
}

/**
 * 保存助手数据，根据数据结构类型自动选择存储方式
 */
export async function saveAssistantData(
  assistant: any,
  useDesktopStructure: boolean
): Promise<boolean> {
  if (useDesktopStructure) {
    return await AssistantService.saveDesktopAssistant(assistant as DesktopAssistant);
  } else {
    return await AssistantService.updateAssistant(assistant);
  }
}

/**
 * 将话题添加到助手
 */
export async function addTopicToAssistant(
  assistantId: string,
  topicId: string,
  useDesktopStructure: boolean,
  topicData?: any
): Promise<boolean> {
  if (useDesktopStructure) {
    // 获取当前助手
    const desktopAssistants = await AssistantService.getDesktopStructureAssistants();
    const assistant = desktopAssistants.find((a: DesktopAssistant) => a.id === assistantId);
    if (!assistant) return false;
    
    // 添加话题
    if (topicData) {
      // 转换为电脑版话题结构
      const desktopTopic: DesktopTopic = {
        id: topicData.id,
        assistantId,
        name: topicData.title || '新话题',
        createdAt: topicData.lastMessageTime || new Date().toISOString(),
        updatedAt: topicData.lastMessageTime || new Date().toISOString(),
        messages: topicData.messages || [],
        prompt: topicData.prompt || '',
        isNameManuallyEdited: false
      };
      
      // 添加到助手
      assistant.topics.push(desktopTopic);
    } else {
      // 检查话题是否已存在
      const existingTopic = assistant.topics.find((t: DesktopTopic) => t.id === topicId);
      if (existingTopic) return true;
      
      // 获取话题数据
      const allTopics = await TopicService.getAllTopics();
      const topic = allTopics.find(t => t.id === topicId);
      if (!topic) return false;
      
      // 转换为电脑版话题结构
      const desktopTopic: DesktopTopic = {
        id: topic.id,
        assistantId,
        name: topic.title || '新话题',
        createdAt: topic.lastMessageTime || new Date().toISOString(),
        updatedAt: topic.lastMessageTime || new Date().toISOString(),
        messages: topic.messages || [],
        prompt: topic.prompt || '',
        isNameManuallyEdited: false
      };
      
      // 添加到助手
      assistant.topics.push(desktopTopic);
    }
    
    // 保存助手
    return await AssistantService.saveDesktopAssistant(assistant);
  } else {
    return await AssistantService.addTopicToAssistant(assistantId, topicId);
  }
}

/**
 * 从助手中移除话题
 */
export async function removeTopicFromAssistant(
  assistantId: string,
  topicId: string,
  useDesktopStructure: boolean
): Promise<boolean> {
  if (useDesktopStructure) {
    // 获取当前助手
    const desktopAssistants = await AssistantService.getDesktopStructureAssistants();
    const assistant = desktopAssistants.find((a: DesktopAssistant) => a.id === assistantId);
    if (!assistant) return false;
    
    // 移除话题
    assistant.topics = assistant.topics.filter((t: DesktopTopic) => t.id !== topicId);
    
    // 保存助手
    return await AssistantService.saveDesktopAssistant(assistant);
  } else {
    return await AssistantService.removeTopicFromAssistant(assistantId, topicId);
  }
}

/**
 * 强制执行数据结构迁移
 */
export async function forceDataStructureMigration(): Promise<boolean> {
  return await AssistantService.migrateToDesktopStructure();
} 