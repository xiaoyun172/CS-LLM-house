import type { Assistant, SerializableAssistant } from '../types/Assistant';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import React from 'react';

// 存储键名
const ASSISTANTS_STORAGE_KEY = 'userAssistants';
const CURRENT_ASSISTANT_KEY = 'currentAssistant';

/**
 * 助手管理服务
 */
export class AssistantService {
  /**
   * 获取用户助手列表
   */
  static getUserAssistants(): Assistant[] {
    try {
      const assistantsJson = localStorage.getItem(ASSISTANTS_STORAGE_KEY);
      if (!assistantsJson) return [];
      
      const savedAssistants: SerializableAssistant[] = JSON.parse(assistantsJson);
      
      // 将序列化助手转换为完整助手（添加图标）
      return savedAssistants.map(assistant => this.deserializeAssistant(assistant));
    } catch (error) {
      console.error('获取用户助手失败:', error);
      return [];
    }
  }
  
  /**
   * 初始化默认助手
   */
  static initializeDefaultAssistants(): Assistant[] {
    const defaultAssistants: Assistant[] = [
      { 
        id: 'default', 
        name: '默认助手', 
        description: '通用型AI助手，可以回答各种问题', 
        icon: React.createElement(EmojiEmotionsIcon, { sx: { color: '#FFD700' } }),
        isSystem: true,
        topicIds: []
      },
      { 
        id: 'browser', 
        name: '消息器顽天助手', 
        description: '帮助分析各种网页内容', 
        icon: React.createElement(AutoAwesomeIcon, { sx: { color: '#1E90FF' } }),
        isSystem: true,
        topicIds: []
      }
    ];
    
    // 保存到localStorage
    this.saveAssistants(defaultAssistants);
    
    // 设置默认助手为当前助手
    this.setCurrentAssistant('default');
    
    return defaultAssistants;
  }
  
  /**
   * 获取当前选中的助手
   */
  static getCurrentAssistant(): Assistant | null {
    try {
      const assistantId = localStorage.getItem(CURRENT_ASSISTANT_KEY);
      if (!assistantId) return null;
      
      const assistants = this.getUserAssistants();
      return assistants.find(assistant => assistant.id === assistantId) || null;
    } catch (error) {
      console.error('获取当前助手失败:', error);
      return null;
    }
  }
  
  /**
   * 设置当前助手
   */
  static setCurrentAssistant(assistantId: string): boolean {
    try {
      localStorage.setItem(CURRENT_ASSISTANT_KEY, assistantId);
      return true;
    } catch (error) {
      console.error('设置当前助手失败:', error);
      return false;
    }
  }
  
  /**
   * 添加助手
   */
  static addAssistant(assistant: Assistant): boolean {
    try {
      const assistants = this.getUserAssistants();
      
      // 检查是否已存在相同ID的助手
      const exists = assistants.some(a => a.id === assistant.id);
      if (exists) return false;
      
      // 添加到列表
      const updatedAssistants = [...assistants, assistant];
      
      // 保存到localStorage
      this.saveAssistants(updatedAssistants);
      
      return true;
    } catch (error) {
      console.error('添加助手失败:', error);
      return false;
    }
  }
  
  /**
   * 更新助手
   */
  static updateAssistant(assistant: Assistant): boolean {
    try {
      console.log('AssistantService.updateAssistant 被调用:', assistant);
      
      // 从localStorage获取所有助手
      const assistantsJson = localStorage.getItem('userAssistants');
      if (!assistantsJson) {
        console.error('无法更新助手: 本地存储中未找到助手数据');
        return false;
      }
      
      // 解析助手列表
      const assistants = JSON.parse(assistantsJson);
      
      // 查找要更新的助手索引
      const index = assistants.findIndex((a: Assistant) => a.id === assistant.id);
      if (index === -1) {
        console.error('无法更新助手: 未找到ID为', assistant.id, '的助手');
        return false;
      }
      
      // 更新助手
      assistants[index] = assistant;
      
      // 保存回localStorage
      localStorage.setItem('userAssistants', JSON.stringify(assistants));
      console.log('助手更新成功，保存到localStorage:', assistant);
      
      return true;
    } catch (error) {
      console.error('更新助手失败:', error);
      return false;
    }
  }
  
  /**
   * 删除助手
   */
  static deleteAssistant(assistantId: string): boolean {
    try {
      const assistants = this.getUserAssistants();
      
      // 从列表中移除
      const updatedAssistants = assistants.filter(a => a.id !== assistantId);
      
      // 保存到localStorage
      this.saveAssistants(updatedAssistants);
      
      // 如果删除的是当前助手，重置当前助手
      const currentAssistantId = localStorage.getItem(CURRENT_ASSISTANT_KEY);
      if (currentAssistantId === assistantId) {
        localStorage.setItem(CURRENT_ASSISTANT_KEY, updatedAssistants[0]?.id || '');
      }
      
      return true;
    } catch (error) {
      console.error('删除助手失败:', error);
      return false;
    }
  }
  
  /**
   * 将话题与助手关联
   */
  static addTopicToAssistant(assistantId: string, topicId: string): boolean {
    try {
      const assistants = this.getUserAssistants();
      
      // 查找助手
      const assistantIndex = assistants.findIndex(a => a.id === assistantId);
      if (assistantIndex === -1) return false;
      
      // 更新助手的话题列表
      const assistant = assistants[assistantIndex];
      const topicIds = assistant.topicIds || [];
      
      // 检查话题是否已关联
      if (topicIds.includes(topicId)) return true;
      
      // 添加话题ID
      const updatedAssistant = {
        ...assistant,
        topicIds: [...topicIds, topicId]
      };
      
      // 更新助手列表
      assistants[assistantIndex] = updatedAssistant;
      
      // 保存到localStorage
      this.saveAssistants(assistants);
      
      return true;
    } catch (error) {
      console.error('添加话题到助手失败:', error);
      return false;
    }
  }
  
  /**
   * 从助手中移除话题
   */
  static removeTopicFromAssistant(assistantId: string, topicId: string): boolean {
    try {
      const assistants = this.getUserAssistants();
      
      // 查找助手
      const assistantIndex = assistants.findIndex(a => a.id === assistantId);
      if (assistantIndex === -1) return false;
      
      // 更新助手的话题列表
      const assistant = assistants[assistantIndex];
      const topicIds = assistant.topicIds || [];
      
      // 移除话题ID
      const updatedAssistant = {
        ...assistant,
        topicIds: topicIds.filter(id => id !== topicId)
      };
      
      // 更新助手列表
      assistants[assistantIndex] = updatedAssistant;
      
      // 保存到localStorage
      this.saveAssistants(assistants);
      
      return true;
    } catch (error) {
      console.error('从助手移除话题失败:', error);
      return false;
    }
  }
  
  /**
   * 保存助手列表到localStorage
   * @private
   */
  private static saveAssistants(assistants: Assistant[]): void {
    // 序列化助手列表（移除不可序列化的属性）
    const serializableAssistants: SerializableAssistant[] = assistants.map(assistant => ({
      ...assistant,
      icon: null // 图标不可序列化，存储时设为null
    }));
    
    localStorage.setItem(ASSISTANTS_STORAGE_KEY, JSON.stringify(serializableAssistants));
  }
  
  /**
   * 反序列化助手（添加图标）
   * @private
   */
  private static deserializeAssistant(assistant: SerializableAssistant): Assistant {
    // 根据助手ID设置相应的图标
    let icon;
    
    switch (assistant.id) {
      case 'default':
        icon = React.createElement(EmojiEmotionsIcon, { sx: { color: '#FFD700' } });
        break;
      case 'browser':
        icon = React.createElement(AutoAwesomeIcon, { sx: { color: '#1E90FF' } });
        break;
      // 可以添加更多助手的图标
      default:
        icon = React.createElement(EmojiEmotionsIcon);
    }
    
    return {
      ...assistant,
      icon
    };
  }
} 