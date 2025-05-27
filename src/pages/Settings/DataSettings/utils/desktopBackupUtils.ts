// 处理电脑版备份数据的工具函数
import { v4 as uuidv4 } from 'uuid';
import type { ChatTopic } from '../../../../shared/types';
import type { Assistant } from '../../../../shared/types/Assistant';
import type { Message, MessageBlock } from '../../../../shared/types/newMessage';

/**
 * 电脑版备份数据结构
 */
interface DesktopBackupData {
  time: number;
  version: number;
  localStorage: Record<string, any>;
  indexedDB: {
    topics?: Array<{
      id: string;
      messages: Message[];
    }>;
    assistants?: Array<{
      id: string;
      name: string;
      description?: string;
      systemPrompt?: string;
      [key: string]: any;
    }>;
    message_blocks?: MessageBlock[];
    settings?: Array<{
      id: string;
      value: any;
    }>;
    files?: any[];
    knowledge_notes?: any[];
    translate_history?: any[];
    quick_phrases?: any[];
  };
}

/**
 * 转换电脑版备份数据为移动端格式
 */
export async function convertDesktopBackup(backupData: DesktopBackupData): Promise<{
  topics: ChatTopic[];
  assistants: Assistant[];
  settings?: any;
  messageBlocks?: MessageBlock[];
}> {
  try {
    const result = {
      topics: [] as ChatTopic[],
      assistants: [] as Assistant[],
      settings: undefined as any,
      messageBlocks: [] as MessageBlock[]
    };

    // 获取消息块数据，用于后续内容提取
    const messageBlocks = backupData.indexedDB.message_blocks || [];
    result.messageBlocks = messageBlocks;

    // 创建助手ID映射表
    const assistantMap = new Map<string, Assistant>();

    // 0. 首先处理电脑版的助手数据
    if (backupData.indexedDB.assistants) {
      console.log(`发现 ${backupData.indexedDB.assistants.length} 个电脑版助手`);
      for (const desktopAssistant of backupData.indexedDB.assistants) {
        if (desktopAssistant.id) {
          const mobileAssistant: Assistant = {
            id: desktopAssistant.id,
            name: desktopAssistant.name || `助手 ${desktopAssistant.id}`,
            description: desktopAssistant.description || '从电脑版导入的助手',
            systemPrompt: desktopAssistant.systemPrompt || '你是一个有用的AI助手。',
            icon: null,
            isSystem: false,
            topicIds: [],
            topics: []
          };
          assistantMap.set(desktopAssistant.id, mobileAssistant);
          console.log(`添加电脑版助手: ${mobileAssistant.name} (${mobileAssistant.id})`);
        }
      }
    }

    // 1. 转换话题数据
    if (backupData.indexedDB.topics) {
      for (const desktopTopic of backupData.indexedDB.topics) {
        const mobileTopicId = desktopTopic.id || uuidv4();

        // 从第一条消息中提取助手ID和话题名称
        let assistantId = 'imported_assistant';
        let topicName = '导入的对话';

        if (desktopTopic.messages && desktopTopic.messages.length > 0) {
          const firstMessage = desktopTopic.messages[0];
          if (firstMessage.assistantId) {
            assistantId = firstMessage.assistantId;
          }

          // 尝试从第一条用户消息提取话题名称
          const firstUserMessage = desktopTopic.messages.find(m => m.role === 'user');
          if (firstUserMessage) {
            topicName = extractTopicNameFromMessages([firstUserMessage], messageBlocks);
          }
        }

        // 创建移动端话题格式
        const mobileTopic: ChatTopic = {
          id: mobileTopicId,
          name: topicName,
          createdAt: desktopTopic.messages?.[0]?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastMessageTime: new Date().toISOString(),
          assistantId: assistantId,
          messageIds: [],
          messages: [],
          isNameManuallyEdited: false
        };

        // 转换消息数据
        if (desktopTopic.messages && Array.isArray(desktopTopic.messages)) {
          for (const desktopMessage of desktopTopic.messages) {
            // 确保消息有必要的字段
            const msgAssistantId = desktopMessage.assistantId || assistantId;

            // 处理消息块ID数组
            let messageBlockIds: string[] = [];
            if (desktopMessage.blocks && Array.isArray(desktopMessage.blocks)) {
              messageBlockIds = desktopMessage.blocks.map((block: any) => {
                // 如果是字符串，直接使用；如果是对象，使用其ID
                return typeof block === 'string' ? block : (block.id || uuidv4());
              });
            }

            const mobileMessage: Message = {
              id: desktopMessage.id || uuidv4(),
              role: desktopMessage.role || 'user',
              assistantId: msgAssistantId,
              topicId: mobileTopicId,
              createdAt: desktopMessage.createdAt || new Date().toISOString(),
              updatedAt: desktopMessage.updatedAt,
              status: desktopMessage.status || 'success',
              modelId: desktopMessage.modelId,
              model: desktopMessage.model,
              type: desktopMessage.type,
              isPreset: desktopMessage.isPreset,
              useful: desktopMessage.useful,
              askId: desktopMessage.askId,
              mentions: desktopMessage.mentions,
              usage: desktopMessage.usage,
              metrics: desktopMessage.metrics,
              blocks: messageBlockIds
            };

            // 添加到话题的消息ID数组和消息数组
            mobileTopic.messageIds.push(mobileMessage.id);
            mobileTopic.messages!.push(mobileMessage);

            // 收集助手信息（只有在助手映射表中不存在时才创建）
            if (msgAssistantId && msgAssistantId !== 'imported_assistant' && !assistantMap.has(msgAssistantId)) {
              // 如果电脑版没有提供助手数据，则根据模型信息创建助手
              let assistantName = `助手 ${msgAssistantId}`;
              if (desktopMessage.model?.name) {
                assistantName = desktopMessage.model.name;
              } else if (desktopMessage.modelId) {
                assistantName = desktopMessage.modelId;
              }

              console.log(`创建缺失的助手: ${assistantName} (${msgAssistantId})`);
              assistantMap.set(msgAssistantId, {
                id: msgAssistantId,
                name: assistantName,
                description: '从电脑版导入的助手（基于模型信息）',
                icon: null,
                isSystem: false,
                topicIds: [],
                topics: [],
                systemPrompt: '你是一个有用的AI助手。'
              });
            }
          }

          // 更新话题的时间信息
          if (desktopTopic.messages.length > 0) {
            const lastMessage = desktopTopic.messages[desktopTopic.messages.length - 1];
            mobileTopic.lastMessageTime = lastMessage.createdAt || new Date().toISOString();
            mobileTopic.updatedAt = lastMessage.createdAt || new Date().toISOString();
          }
        }

        result.topics.push(mobileTopic);
      }
    }

    // 2. 转换助手数据
    assistantMap.forEach(assistant => {
      // 为每个助手分配相关的话题
      assistant.topicIds = result.topics
        .filter(topic => topic.assistantId === assistant.id)
        .map(topic => topic.id);
      result.assistants.push(assistant);
    });

    // 3. 创建默认助手（用于没有明确助手ID的对话）
    const defaultTopics = result.topics.filter(t => t.assistantId === 'imported_assistant');
    if (defaultTopics.length > 0) {
      const importedAssistant: Assistant = {
        id: 'imported_assistant',
        name: '导入的助手',
        description: '从电脑版导入的对话助手',
        icon: null,
        isSystem: false,
        topicIds: defaultTopics.map(t => t.id),
        topics: [],
        systemPrompt: '你是一个有用的AI助手。'
      };
      result.assistants.push(importedAssistant);
    }

    // 4. 转换消息块数据
    if (backupData.indexedDB.message_blocks) {
      result.messageBlocks = backupData.indexedDB.message_blocks;
    }

    // 5. 转换设置数据
    if (backupData.indexedDB.settings) {
      const settingsMap: Record<string, any> = {};
      for (const setting of backupData.indexedDB.settings) {
        settingsMap[setting.id] = setting.value;
      }
      result.settings = settingsMap;
    }

    return result;
  } catch (error) {
    console.error('转换电脑版备份数据失败:', error);
    throw new Error('转换电脑版备份数据失败: ' + (error instanceof Error ? error.message : '未知错误'));
  }
}

/**
 * 检测是否为电脑版备份格式
 */
export function isDesktopBackupFormat(data: any): boolean {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.time === 'number' &&
    typeof data.version === 'number' &&
    data.indexedDB &&
    typeof data.indexedDB === 'object'
  );
}

/**
 * 从消息块中提取消息内容
 */
export function extractMessageContent(
  message: any,
  messageBlocks: any[]
): string {
  try {
    if (!message.blocks || !Array.isArray(message.blocks) || message.blocks.length === 0) {
      return message.content || '';
    }

    let content = '';
    for (const blockId of message.blocks) {
      const block = messageBlocks.find(b => b.id === blockId);
      if (block) {
        // 根据不同的块类型提取内容
        let blockContent = '';

        if (block.type === 'main_text' || block.type === 'thinking' || block.type === 'code' || block.type === 'error' || block.type === 'citation') {
          blockContent = block.content || '';
        } else if (block.type === 'image') {
          blockContent = `[图片: ${block.url || block.file?.name || '未知图片'}]`;
        } else if (block.type === 'file') {
          blockContent = `[文件: ${block.name || block.file?.name || '未知文件'}]`;
        } else if (block.type === 'tool') {
          blockContent = `[工具调用: ${block.toolName || block.toolId || '未知工具'}]`;
        } else if (block.content) {
          // 其他类型的块，如果有content属性就使用
          blockContent = typeof block.content === 'string'
            ? block.content
            : JSON.stringify(block.content);
        }

        if (blockContent) {
          content += blockContent + '\n';
        }
      }
    }

    return content.trim() || message.content || '';
  } catch (error) {
    console.error('提取消息内容失败:', error);
    return message.content || '';
  }
}

/**
 * 从电脑版备份中提取话题名称
 * 通过分析消息块内容来生成合适的话题名称
 */
export function extractTopicNameFromMessages(
  messages: any[],
  messageBlocks: MessageBlock[]
): string {
  try {
    // 查找第一条用户消息
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (!firstUserMessage) {
      return '导入的对话';
    }

    const content = extractMessageContent(firstUserMessage, messageBlocks);
    if (content) {
      // 截取前30个字符作为话题名称
      return content.length > 30
        ? content.substring(0, 30) + '...'
        : content;
    }

    return '导入的对话';
  } catch (error) {
    console.error('提取话题名称失败:', error);
    return '导入的对话';
  }
}

/**
 * 验证电脑版备份数据的完整性
 */
export function validateDesktopBackupData(data: DesktopBackupData): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 检查基本结构
  if (!data.indexedDB) {
    errors.push('缺少 indexedDB 数据');
  }

  // 检查话题数据
  if (data.indexedDB.topics) {
    if (!Array.isArray(data.indexedDB.topics)) {
      errors.push('topics 数据格式错误');
    } else {
      for (let i = 0; i < data.indexedDB.topics.length; i++) {
        const topic = data.indexedDB.topics[i];
        if (!topic.id) {
          warnings.push(`话题 ${i} 缺少 ID`);
        }
        if (!topic.messages || !Array.isArray(topic.messages)) {
          warnings.push(`话题 ${i} 缺少消息数据`);
        }
      }
    }
  } else {
    warnings.push('没有找到话题数据');
  }

  // 检查消息块数据
  if (data.indexedDB.message_blocks && !Array.isArray(data.indexedDB.message_blocks)) {
    warnings.push('message_blocks 数据格式错误');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
