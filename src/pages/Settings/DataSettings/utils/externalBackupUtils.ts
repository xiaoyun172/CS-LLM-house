// 处理外部AI软件备份的工具函数
import { v4 as uuidv4 } from 'uuid';
import type { ChatTopic } from '../../../../shared/types';
import type { Assistant } from '../../../../shared/types/Assistant';
import type { MessageBlock } from '../../../../shared/types/newMessage';
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
    starred?: boolean;
    assistantAvatarKey?: string;
    picUrl?: string;
  }>;
  __exported_items?: string[];
  __exported_at?: string;
  settings?: {
    aiProvider?: string;
    model?: string;
    temperature?: number;
    [key: string]: any;
  };
  [key: string]: any; // 会有动态属性，格式为 session:${id}
}

/**
 * ChatboxAI 消息内容部分
 */
interface ChatboxaiMessageContentPart {
  type: 'text' | 'image' | 'tool-call';
  text?: string;
  storageKey?: string;
  url?: string;
  toolCallId?: string;
  toolName?: string;
  args?: any;
  result?: any;
}

/**
 * ChatboxAI 消息结构
 */
interface ChatboxaiMessage {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  contentParts: ChatboxaiMessageContentPart[];
  content?: string; // 兼容老版本
  timestamp?: number;
  wordCount?: number;
  tokenCount?: number;
  tokensUsed?: number;
  firstTokenLatency?: number;
  generating?: boolean;
  aiProvider?: string;
  model?: string;
  files?: Array<{
    id: string;
    name: string;
    fileType: string;
    url?: string;
    storageKey?: string;
  }>;
  links?: Array<{
    id: string;
    url: string;
    title: string;
    storageKey?: string;
  }>;
  reasoningContent?: string;
  error?: string;
  errorCode?: number;
}

/**
 * ChatboxAI 会话结构
 */
interface ChatboxaiSession {
  id: string;
  type?: 'chat' | 'picture';
  name: string;
  picUrl?: string;
  messages: ChatboxaiMessage[];
  starred?: boolean;
  copilotId?: string;
  assistantAvatarKey?: string;
  settings?: any;
  threads?: Array<{
    id: string;
    name: string;
    messages: ChatboxaiMessage[];
    createdAt: number;
  }>;
  threadName?: string;
}

/**
 * 提取消息文本内容
 */
function extractMessageText(chatboxMsg: ChatboxaiMessage): string {
  // 优先使用 contentParts
  if (chatboxMsg.contentParts && Array.isArray(chatboxMsg.contentParts)) {
    const textParts = chatboxMsg.contentParts
      .filter(part => part.type === 'text' && part.text)
      .map(part => part.text)
      .filter(Boolean);

    if (textParts.length > 0) {
      return textParts.join('\n');
    }
  }

  // 兼容老版本的 content 字段
  if (chatboxMsg.content && typeof chatboxMsg.content === 'string') {
    return chatboxMsg.content;
  }

  return '';
}

/**
 * 检测是否为 ChatboxAI 备份格式
 */
function isChatboxaiBackupFormat(data: any): boolean {
  return !!(
    data &&
    (data['chat-sessions-list'] ||
     data['__exported_items']?.includes?.('Conversations') ||
     data['__exported_items']?.includes?.('conversations') ||
     data['__exported_at'])
  );
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
    console.log(`找到 ${sessionsList.length} 个ChatboxAI会话`);

    if (sessionsList.length === 0) {
      console.warn('ChatboxAI备份中没有找到会话列表');
      return { topics: [], assistants: [] };
    }

    const convertedTopics: ChatTopic[] = [];
    const assistantIdForImportedTopics = uuidv4(); // 生成将要创建的助手的 ID

    for (const session of sessionsList) {
      const sessionId = session.id;
      const sessionKey = `session:${sessionId}`;
      const sessionData: ChatboxaiSession = backupData[sessionKey];

      if (!sessionData) {
        console.warn(`未找到会话 ${sessionId} 的详情数据`);
        continue;
      }

      console.log(`处理会话: ${session.name} (${sessionId})`);

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
        assistantId: assistantIdForImportedTopics,
        isNameManuallyEdited: session.name ? true : false
      };

      // 处理所有消息（包括主线程和历史线程）
      const allMessages: ChatboxaiMessage[] = [];

      // 添加主线程消息
      if (Array.isArray(sessionData.messages)) {
        allMessages.push(...sessionData.messages);
      }

      // 添加历史线程消息
      if (Array.isArray(sessionData.threads)) {
        for (const thread of sessionData.threads) {
          if (Array.isArray(thread.messages)) {
            // 为线程消息添加标识
            const threadMessages = thread.messages.map(msg => ({
              ...msg,
              threadName: thread.name,
              threadId: thread.id
            }));
            allMessages.push(...threadMessages);
          }
        }
      }

      console.log(`会话 ${session.name} 包含 ${allMessages.length} 条消息`);

      // 转换消息
      for (const chatboxMsg of allMessages) {
        try {
          // 处理系统消息作为 prompt
          if (chatboxMsg.role === 'system') {
            const systemText = extractMessageText(chatboxMsg);
            if (systemText && !newTopic.prompt) {
              newTopic.prompt = systemText;
            }
            continue;
          }

          // 跳过空消息
          const messageText = extractMessageText(chatboxMsg);
          if (!messageText.trim()) {
            console.warn(`跳过空消息: ${chatboxMsg.id}`);
            continue;
          }

          const newMsg = {
            id: chatboxMsg.id || uuidv4(),
            role: chatboxMsg.role === 'user' ? 'user' : 'assistant',
            assistantId: assistantIdForImportedTopics,
            topicId: newTopic.id,
            createdAt: new Date(chatboxMsg.timestamp || Date.now()).toISOString(),
            status: chatboxMsg.generating ? 'pending' : (chatboxMsg.error ? 'error' : 'success'),
            blocks: [{
              id: uuidv4(),
              messageId: chatboxMsg.id || uuidv4(),
              type: 'main_text',
              content: messageText,
              createdAt: new Date(chatboxMsg.timestamp || Date.now()).toISOString(),
              status: chatboxMsg.error ? 'error' : 'success'
            }]
          } as any;

          // 添加模型信息
          if (chatboxMsg.model) {
            newMsg.modelId = chatboxMsg.model;
          }

          // 添加统计信息
          if (chatboxMsg.wordCount) {
            newMsg.wordCount = chatboxMsg.wordCount;
          }
          if (chatboxMsg.tokenCount) {
            newMsg.tokenCount = chatboxMsg.tokenCount;
          }
          if (chatboxMsg.tokensUsed) {
            newMsg.tokensUsed = chatboxMsg.tokensUsed;
          }

          // 添加错误信息
          if (chatboxMsg.error) {
            newMsg.error = chatboxMsg.error;
            newMsg.errorCode = chatboxMsg.errorCode;
          }

          // 添加推理内容
          if (chatboxMsg.reasoningContent) {
            newMsg.reasoningContent = chatboxMsg.reasoningContent;
          }

          // 处理文件附件
          if (chatboxMsg.files && Array.isArray(chatboxMsg.files)) {
            newMsg.files = chatboxMsg.files.map(file => ({
              id: file.id,
              name: file.name,
              type: file.fileType,
              url: file.url,
              storageKey: file.storageKey
            }));
          }

          // 处理链接
          if (chatboxMsg.links && Array.isArray(chatboxMsg.links)) {
            newMsg.links = chatboxMsg.links.map(link => ({
              id: link.id,
              url: link.url,
              title: link.title,
              storageKey: link.storageKey
            }));
          }

          newTopic.messages.push(newMsg);
          newTopic.messageIds.push(newMsg.id);
        } catch (msgError) {
          console.error(`处理消息 ${chatboxMsg.id} 时出错:`, msgError);
          // 继续处理其他消息
        }
      }

      // 更新最后消息时间
      if (newTopic.messages && newTopic.messages.length > 0) {
        const lastMsg = newTopic.messages[newTopic.messages.length - 1];
        if (lastMsg) {
          newTopic.lastMessageTime = lastMsg.createdAt;
          newTopic.updatedAt = lastMsg.createdAt;
        }
        convertedTopics.push(newTopic);
        console.log(`成功转换会话: ${newTopic.name}, 包含 ${newTopic.messages.length} 条消息`);
      } else {
        console.warn(`会话 ${session.name} 没有有效消息，跳过`);
      }
    }

    // 创建导入的助手
    const importedAssistant: Assistant = {
      id: assistantIdForImportedTopics,
      name: 'ChatboxAI 导入助手',
      description: `从ChatboxAI导入的对话助手，包含 ${convertedTopics.length} 个对话`,
      systemPrompt: '你是一个从ChatboxAI导入的助手，我已经将你的所有聊天记录都导入到AetherLink中了。请继续为用户提供帮助。',
      icon: null,
      isSystem: false,
      topicIds: convertedTopics.map(topic => topic.id),
      topics: convertedTopics,
      avatar: undefined,
      tags: ['导入', 'ChatboxAI'],
      engine: backupData.settings?.aiProvider || undefined,
      model: backupData.settings?.model || undefined,
      temperature: backupData.settings?.temperature || undefined,
      maxTokens: undefined,
      topP: undefined,
      frequencyPenalty: undefined,
      presencePenalty: undefined,
      prompt: undefined,
      maxMessagesInContext: undefined,
      isDefault: false,
      archived: false,
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

    console.log(`ChatboxAI导入完成: ${convertedTopics.length} 个对话, 1 个助手`);

    return {
      topics: convertedTopics,
      assistants: convertedTopics.length > 0 ? [importedAssistant] : []
    };
  } catch (error) {
    console.error('转换ChatboxAI备份失败:', error);
    throw new Error(`转换ChatboxAI备份失败: ${error instanceof Error ? error.message : '未知错误'}`);
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
    console.log('开始检测外部备份格式...');

    // 检测备份格式 (Cherry Studio)
    if (isDesktopBackupFormat(jsonData)) {
      console.log('检测到Cherry Studio备份格式');

      // 验证数据完整性
      const validation = validateDesktopBackupData(jsonData);
      if (!validation.isValid) {
        throw new Error(`Cherry Studio备份数据验证失败: ${validation.errors.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        console.warn('Cherry Studio备份数据警告:', validation.warnings);
      }

      // 转换备份数据
      const converted = await convertDesktopBackup(jsonData);
      return {
        topics: converted.topics,
        assistants: converted.assistants,
        messageBlocks: converted.messageBlocks,
        source: 'desktop'
      };
    }

    // 检测 ChatboxAI 格式
    if (isChatboxaiBackupFormat(jsonData)) {
      console.log('检测到ChatboxAI备份格式');

      // 转换 ChatboxAI 备份数据
      const converted = await convertChatboxaiBackup(jsonData);
      return {
        ...converted,
        source: 'chatboxai'
      };
    }

    // 如果需要支持其他格式，可以在这里添加
    // 例如：OpenAI ChatGPT 导出格式、Claude 导出格式等

    // 未识别的格式
    console.error('无法识别的备份格式，数据结构:', Object.keys(jsonData));
    throw new Error('无法识别的外部备份格式。支持的格式：Cherry Studio 、ChatboxAI');
  } catch (error) {
    console.error('导入外部备份失败:', error);

    // 提供更详细的错误信息
    if (error instanceof Error) {
      if (error.message.includes('无法识别')) {
        throw error; // 直接抛出格式识别错误
      }
      throw new Error(`导入外部备份失败: ${error.message}`);
    }

    throw new Error('导入外部备份失败: 未知错误');
  }
}