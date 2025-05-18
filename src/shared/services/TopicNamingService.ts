import { sendChatRequest } from '../api';
import { updateTopic } from '../store/messagesSlice';
import store from '../store';
import type { ChatTopic } from '../types';
import { getStorageItem, setStorageItem } from '../utils/storage';
import { saveTopicToDB } from './storageService';

/**
 * 话题命名服务
 * 用于自动命名话题，根据对话内容生成合适的标题
 */
export class TopicNamingService {
  /**
   * 检查话题是否需要自动命名
   * @param topic 当前话题
   * @returns 如果需要命名返回true，否则返回false
   */
  static shouldNameTopic(topic: ChatTopic): boolean {
    // 获取用户和助手消息的数量
    const userMessages = topic.messages?.filter(m => m.role === 'user') || [];
    const assistantMessages = topic.messages?.filter(m => m.role === 'assistant' && m.status === 'complete') || [];
    
    // 获取话题名称（优先使用name字段，兼容旧版本使用title字段）
    const topicName = topic.name || topic.title || '';
    
    // 添加调试日志
    console.log('自动命名检查:', {
      topicId: topic.id,
      topicName,
      titleMatches: 
        topicName.includes('新话题') || 
        topicName.includes('New Topic') || 
        topicName.includes('新的对话') ||
        topicName.includes('新对话'),
      userMsgCount: userMessages.length,
      assistantMsgCount: assistantMessages.length,
      matchesCondition: 
        (topicName.includes('新话题') || 
         topicName.includes('New Topic') || 
         topicName.includes('新的对话') ||
         topicName.includes('新对话')) && 
        userMessages.length >= 2 && 
        assistantMessages.length >= 2
    });
    
    // 检查是否满足自动命名条件：
    // 1. 标题符合默认格式（包含"新话题"、"New Topic"、"新的对话"或"新对话"）
    // 2. 用户消息和助手消息的数量都大于等于2（与电脑版保持一致）
    return (
      (topicName.includes('新话题') || 
       topicName.includes('New Topic') || 
       topicName.includes('新的对话') ||
       topicName.includes('新对话')) && 
      userMessages.length >= 2 && 
      assistantMessages.length >= 2
    );
  }

  /**
   * 为话题生成一个有意义的标题
   * @param topic 需要命名的对话
   * @param modelId 可选的模型ID，默认使用默认模型ID
   */
  static async generateTopicName(topic: ChatTopic, modelId?: string): Promise<void> {
    try {
      // 使用IndexedDB避免重复命名
      const namingKey = `topic_naming_${topic.id}`;
      const alreadyNamed = await getStorageItem<boolean>(namingKey);
      if (alreadyNamed) {
        console.log('该话题已经完成自动命名，跳过');
        return;
      }

      // 获取对话内容作为命名依据
      const messages = topic.messages || [];
      if (messages.length < 6) {
        console.log('消息数量不足，无法生成有意义的标题');
        return;
      }

      // 提取前6条消息的内容作为命名依据
      const contentSummary = messages.slice(0, 6).map(msg => {
        return `${msg.role === 'user' ? '用户' : 'AI'}: ${typeof msg.content === 'string' ? msg.content.slice(0, 100) : ''}`;
      }).join('\n');

      // 准备系统提示
      const systemPrompt = '你是一个话题生成专家。根据对话内容生成一个简洁、精确、具有描述性的标题。标题应简洁、简洁、简洁，不超过10个字或...。你需要包含标题文本，不需要解释或扩展。';

      // 使用默认模型或提供的模型ID
      const namingModelId = modelId || store.getState().settings.defaultModelId || 'gpt-3.5-turbo';

      console.log(`正在使用模型 ${namingModelId} 为话题生成标题...`);

      // 发送请求生成标题
      const response = await sendChatRequest({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `以下是一些对话内容，请为这个话题生成一个标题：\n\n${contentSummary}` }
        ],
        modelId: namingModelId
      });

      if (response.success && response.content) {
        // 清理可能存在的引号和换行符
        let newTitle = response.content.trim();
        if (newTitle.startsWith('"') && newTitle.endsWith('"')) {
          newTitle = newTitle.slice(1, -1).trim();
        }

        // 获取当前话题名称
        const currentName = topic.name || topic.title || '';

        // 新标题与旧标题不同且有意义
        if (newTitle && newTitle !== currentName && newTitle.length > 0) {
          // 更新话题标题
          console.log(`生成新标题: "${newTitle}"`);
          const updatedTopic = {
            ...topic,
            name: newTitle,
            title: newTitle,
            isNameManuallyEdited: true
          };

          // 在Redux中更新话题
          store.dispatch(updateTopic(updatedTopic));

          // 同时更新数据库中的话题
          try {
            // 直接保存到数据库
            await saveTopicToDB(updatedTopic);
            
            // 记录已命名状态，防止重复命名
            await setStorageItem(namingKey, true);
          } catch (error) {
            console.error('更新数据库中的话题失败:', error);
          }
        } else {
          console.log('生成的话题标题无效或与旧标题相同，保持旧标题');
        }
      } else {
        console.error('生成话题标题失败:', response.error);
      }
    } catch (error) {
      console.error('在生成话题标题时发生错误:', error);
    }
  }
} 