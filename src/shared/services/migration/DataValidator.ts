import type { Assistant } from '../../types/Assistant';
import type { ChatTopic, Message } from '../../types';

/**
 * 验证结果接口
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * 扩展的话题类型，包含可选的assistantId字段
 */
interface TopicWithAssistant extends ChatTopic {
  assistantId?: string;
}

/**
 * 数据验证器 - 用于验证迁移的数据有效性
 */
export class DataValidator {
  /**
   * 验证助手数据
   */
  public validateAssistant(assistant: Assistant): boolean {
    // 检查必需字段
    if (!assistant.id || !assistant.name) {
      console.warn('助手数据缺少必需字段', assistant);
      return false;
    }
    
    // 检查数据类型
    if (typeof assistant.name !== 'string') {
      console.warn('助手数据类型错误', assistant);
      return false;
    }
    
    return true;
  }
  
  /**
   * 验证话题数据
   */
  public validateTopic(topic: ChatTopic): boolean {
    // 检查必需字段
    if (!topic.id || !topic.title || !Array.isArray(topic.messages)) {
      console.warn('话题数据缺少必需字段', topic);
      return false;
    }
    
    // 检查数据类型
    if (typeof topic.title !== 'string') {
      console.warn('话题数据类型错误', topic);
      return false;
    }
    
    // 验证消息
    for (const message of topic.messages) {
      if (!this.validateMessage(message)) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * 验证消息数据
   */
  private validateMessage(message: Message): boolean {
    // 检查必需字段
    if (!message.id || !message.role || message.content === undefined) {
      console.warn('消息数据缺少必需字段', message);
      return false;
    }
    
    // 检查角色是否有效
    if (!['user', 'assistant', 'system'].includes(message.role)) {
      console.warn('消息角色无效', message);
      return false;
    }
    
    return true;
  }
  
  /**
   * 验证数据完整性
   */
  public validateDataIntegrity(
    assistants: Assistant[],
    topics: ChatTopic[]
  ): boolean {
    // 检查助手引用完整性
    const assistantIds = new Set(assistants.map(a => a.id));
    
    // 检查话题中的助手引用
    for (const topic of topics) {
      const topicWithAssistant = topic as TopicWithAssistant;
      if (topicWithAssistant.assistantId && !assistantIds.has(topicWithAssistant.assistantId)) {
        console.warn(`话题 ${topic.id} 引用了不存在的助手 ${topicWithAssistant.assistantId}`);
        // 不返回 false，因为这不是致命错误
      }
    }
    
    // 检查消息顺序
    for (const topic of topics) {
      // 验证消息时间戳是否单调增加
      let prevTimestamp = 0;
      for (const message of topic.messages) {
        const timestamp = typeof message.timestamp === 'number' ? message.timestamp : 0;
        if (timestamp < prevTimestamp && timestamp !== 0) {
          console.warn(`话题 ${topic.id} 中的消息时间戳不是单调增加的`);
          // 不返回 false，因为这不是致命错误
        }
        prevTimestamp = timestamp;
      }
    }
    
    return true;
  }
  
  /**
   * 详细验证助手数据
   */
  public validateAssistantDetailed(assistant: Assistant): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [] };
    
    // 检查必需字段
    if (!assistant.id) {
      result.errors.push('缺少ID');
      result.isValid = false;
    }
    
    if (!assistant.name) {
      result.errors.push('缺少名称');
      result.isValid = false;
    }
    
    // 检查数据类型
    if (assistant.name && typeof assistant.name !== 'string') {
      result.errors.push('名称必须是字符串');
      result.isValid = false;
    }
    
    return result;
  }
  
  /**
   * 详细验证话题数据
   */
  public validateTopicDetailed(topic: ChatTopic): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [] };
    
    // 检查必需字段
    if (!topic.id) {
      result.errors.push('缺少ID');
      result.isValid = false;
    }
    
    if (!topic.title) {
      result.errors.push('缺少标题');
      result.isValid = false;
    }
    
    if (!Array.isArray(topic.messages)) {
      result.errors.push('消息列表不是数组');
      result.isValid = false;
    } else {
      // 验证消息
      topic.messages.forEach((message, index) => {
        const messageResult = this.validateMessageDetailed(message);
        if (!messageResult.isValid) {
          result.errors.push(`消息#${index+1}无效: ${messageResult.errors.join(', ')}`);
          result.isValid = false;
        }
      });
    }
    
    return result;
  }
  
  /**
   * 详细验证消息数据
   */
  private validateMessageDetailed(message: Message): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [] };
    
    // 检查必需字段
    if (!message.id) {
      result.errors.push('缺少ID');
      result.isValid = false;
    }
    
    if (!message.role) {
      result.errors.push('缺少角色');
      result.isValid = false;
    }
    
    if (message.content === undefined) {
      result.errors.push('缺少内容');
      result.isValid = false;
    }
    
    // 检查角色是否有效
    if (message.role && !['user', 'assistant', 'system'].includes(message.role)) {
      result.errors.push(`角色 ${message.role} 无效`);
      result.isValid = false;
    }
    
    return result;
  }
} 