// 处理外部AI软件备份的工具函数
import { v4 as uuidv4 } from 'uuid';
import type { ChatTopic } from '../../../../shared/types';
import type { Assistant } from '../../../../shared/types/Assistant';
import type { Message } from '../../../../shared/types';

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
    // 提取会话列表
    const sessionsList = backupData['chat-sessions-list'] || [];
    console.log(`找到 ${sessionsList.length} 个Chatboxai会话`);
    
    const convertedTopics: ChatTopic[] = [];
    
    // 遍历会话列表
    for (const session of sessionsList) {
      const sessionId = session.id;
      const sessionKey = `session:${sessionId}`;
      
      // 获取会话详情
      const sessionData = backupData[sessionKey];
      if (!sessionData) {
        console.warn(`未找到会话 ${sessionId} 的详情数据`);
        continue;
      }
      
      // 创建新的AetherLink话题
      const newTopic: ChatTopic = {
        id: uuidv4(), // 生成新ID避免冲突
        title: session.name || '导入的对话',
        messages: [],
        lastMessageTime: new Date().toISOString(),
        modelId: '', // 将根据消息自动设置
        prompt: '' // 将从系统消息提取
      };
      
      // 提取消息
      if (Array.isArray(sessionData.messages)) {
        for (const chatboxMsg of sessionData.messages) {
          // 处理系统消息，提取为系统提示
          if (chatboxMsg.role === 'system' && chatboxMsg.contentParts?.[0]?.text) {
            newTopic.prompt = chatboxMsg.contentParts[0].text;
            continue; // 系统消息不添加到常规消息列表
          }
          
          // 转换为AetherLink消息格式
          const newMessage: Message = {
            id: chatboxMsg.id || uuidv4(),
            role: chatboxMsg.role === 'user' ? 'user' : 'assistant',
            content: chatboxMsg.contentParts?.[0]?.text || '',
            status: chatboxMsg.generating ? 'pending' : 'complete',
            timestamp: new Date(chatboxMsg.timestamp).toISOString(),
            modelId: '',
            version: 1,
            isCurrentVersion: true,
            alternateVersions: []
          };
          
          // 尝试提取模型信息
          if (chatboxMsg.model) {
            newMessage.modelId = chatboxMsg.model;
            if (!newTopic.modelId && chatboxMsg.role === 'assistant') {
              newTopic.modelId = chatboxMsg.model;
            }
          }
          
          // 添加消息到话题
          newTopic.messages.push(newMessage);
        }
      }
      
      // 只有消息不为空的话题才添加
      if (newTopic.messages.length > 0) {
        // 更新最后消息时间
        if (newTopic.messages.length > 0) {
          const lastMsg = newTopic.messages[newTopic.messages.length - 1];
          newTopic.lastMessageTime = lastMsg.timestamp;
        }
        
        convertedTopics.push(newTopic);
      }
    }
    
    // 创建导入的助手
    const importedAssistant: Assistant = {
      id: uuidv4(),
      name: 'ChatboxAI 导入助手',
      description: '从ChatboxAI导入的对话助手',
      systemPrompt: '你是一个从ChatboxAI导入的助手，我已经将你的所有聊天记录都导入到AetherLink中了',
      icon: null,
      isSystem: false,
      topicIds: convertedTopics.map(topic => topic.id)
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
}> {
  try {
    // 检测备份类型
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