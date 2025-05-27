// 处理外部AI软件备份的工具函数
import { v4 as uuidv4 } from 'uuid';
import type { ChatTopic } from '../../../../shared/types';
import type { Assistant } from '../../../../shared/types/Assistant';
import {
  convertDesktopBackup,
  isDesktopBackupFormat,
  validateDesktopBackupData
} from './desktopBackupUtils';

/**
 * Chatboxai备份数据结构
 */
interface ChatboxaiBackup {
  'chat-sessions'?: any[];
  configVersion?: number;
  remoteConfig?: any;
  'chat-sessions-list'?: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  __exported_items?: string[];
  __exported_at?: string;
  [key: string]: any; // 会有动态属性，格式为 session:${id}
}

/**
 * 转换Chatboxai备份为AetherLink格式
 */
export async function convertChatboxaiBackup(backupData: ChatboxaiBackup): Promise<{
  topics: ChatTopic[];
  assistants: Assistant[];
}> {
  try {
    const sessionsList = backupData['chat-sessions-list'] || [];
    console.log(`找到 ${sessionsList.length} 个Chatboxai会话`);

    const convertedTopics: ChatTopic[] = [];
    const assistantIdForImportedTopics = uuidv4(); // 生成将要创建的助手的 ID

    for (const session of sessionsList) {
      const sessionId = session.id;
      const sessionKey = `session:${sessionId}`;
      const sessionData = backupData[sessionKey];
      if (!sessionData) {
        console.warn(`未找到会话 ${sessionId} 的详情数据`);
        continue;
      }

      const newTopic: ChatTopic = {
        id: uuidv4(),
        name: session.name || '导入的对话',
        title: session.name || '导入的对话',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastMessageTime: new Date().toISOString(),
        messages: [],
        messageIds: [],
        prompt: '',
        assistantId: assistantIdForImportedTopics, // 使用预先生成的助手 ID
        isNameManuallyEdited: false
      };

      // 提取消息
      if (Array.isArray(sessionData.messages)) {
        for (const chatboxMsg of sessionData.messages) {
          if (chatboxMsg.role === 'system' && chatboxMsg.contentParts?.[0]?.text) {
            newTopic.prompt = chatboxMsg.contentParts[0].text;
            continue;
          }

          const newMsg = {
            id: chatboxMsg.id || uuidv4(),
            role: chatboxMsg.role === 'user' ? 'user' : 'assistant',
            assistantId: assistantIdForImportedTopics,
            topicId: newTopic.id,
            createdAt: new Date(chatboxMsg.datetime || Date.now()).toISOString(),
            status: chatboxMsg.generating ? 'pending' : 'success',
            blocks: [{
              id: uuidv4(),
              messageId: chatboxMsg.id || uuidv4(),
              type: 'main_text',
              content: chatboxMsg.contentParts?.[0]?.text || '',
              createdAt: new Date(chatboxMsg.datetime || Date.now()).toISOString(),
              status: 'success'
            }]
          } as any; // 使用类型断言避免类型检查错误

          if (chatboxMsg.model) {
            newMsg.modelId = chatboxMsg.model;
          }

          // 确保messages是数组
          if (!newTopic.messages) {
            newTopic.messages = [];
          }
          newTopic.messages.push(newMsg);
        }
      }

      // 添加安全检查，确保messages是数组
      if (newTopic.messages && newTopic.messages.length > 0) {
        const lastMsg = newTopic.messages[newTopic.messages.length - 1];
        if (lastMsg) {
          newTopic.lastMessageTime = lastMsg.createdAt;
        }
        convertedTopics.push(newTopic);
      }
    }

    const importedAssistant: Assistant = {
      id: assistantIdForImportedTopics,
      name: 'ChatboxAI 导入助手',
      description: '从ChatboxAI导入的对话助手',
      systemPrompt: '你是一个从ChatboxAI导入的助手，我已经将你的所有聊天记录都导入到AetherLink中了',
      icon: null,
      isSystem: false,
      topicIds: convertedTopics.map(topic => topic.id),
      topics: convertedTopics,
      avatar: undefined,
      tags: [],
      engine: undefined,
      model: undefined,
      temperature: undefined,
      maxTokens: undefined,
      topP: undefined,
      frequencyPenalty: undefined,
      presencePenalty: undefined,
      prompt: undefined,
      maxMessagesInContext: undefined,
      isDefault: undefined,
      archived: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
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

    return {
      topics: convertedTopics,
      assistants: [importedAssistant]
    };
  } catch (error) {
    console.error('转换ChatboxAI备份失败:', error);
    throw new Error('转换外部备份失败: ' + (error instanceof Error ? error.message : '未知错误'));
  }
}

/**
 * 从JSON文件解析外部备份格式并转换
 */
export async function importExternalBackup(jsonData: any): Promise<{
  topics: ChatTopic[];
  assistants: Assistant[];
  source: string;
  messageBlocks?: MessageBlock[];
}> {
  try {
    // 检测电脑版备份格式
    if (isDesktopBackupFormat(jsonData)) {
      console.log('检测到电脑版备份格式');

      // 验证数据完整性
      const validation = validateDesktopBackupData(jsonData);
      if (!validation.isValid) {
        throw new Error(`电脑版备份数据验证失败: ${validation.errors.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        console.warn('电脑版备份数据警告:', validation.warnings);
      }

      // 转换电脑版备份数据
      const converted = await convertDesktopBackup(jsonData);
      return {
        topics: converted.topics,
        assistants: converted.assistants,
        messageBlocks: converted.messageBlocks,
        source: 'desktop'
      };
    }

    // 检测 ChatboxAI 格式
    if (jsonData['chat-sessions-list'] || jsonData['__exported_items']?.includes('conversations')) {
      // ChatboxAI 格式
      const converted = await convertChatboxaiBackup(jsonData);
      return {
        ...converted,
        source: 'chatboxai'
      };
    }

    // 如果需要支持其他格式，可以在这里添加

    // 未识别的格式
    throw new Error('无法识别的外部备份格式');
  } catch (error) {
    console.error('导入外部备份失败:', error);
    throw new Error('导入外部备份失败: ' + (error instanceof Error ? error.message : '未知错误'));
  }
}