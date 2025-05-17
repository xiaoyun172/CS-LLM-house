import type { Assistant } from '../../types/Assistant';
import { DataService } from '../DataService';
import {
  deserializeAssistant,
  serializeAssistant
} from './types';

// 获取DataService实例
const dataService = DataService.getInstance();

/**
 * 核心助手管理服务 - 负责助手的基本CRUD操作
 */
export class AssistantManager {
  /**
   * 获取用户助手列表
   */
  static async getUserAssistants(): Promise<Assistant[]> {
    try {
      // 从DataService获取数据
      const assistants = await dataService.getAllAssistants();

      // 确保每个助手都有正确的图标
      return assistants.map(assistant => {
        // 序列化后再反序列化以确保图标正确
        const serializedAssistant = serializeAssistant(assistant);
        return deserializeAssistant(serializedAssistant);
      });
    } catch (error) {
      console.error('获取用户助手失败:', error);
      return [];
    }
  }

  /**
   * 获取当前选中的助手
   */
  static async getCurrentAssistant(): Promise<Assistant | null> {
    try {
      // 从设置中获取当前助手ID
      const currentAssistantId = await dataService.getSetting('currentAssistant');

      if (!currentAssistantId) return null;

      // 获取助手详情
      const assistant = await dataService.getAssistant(currentAssistantId);
      // 确保返回的助手有正确的图标
      if (assistant) {
        const serializedAssistant = serializeAssistant(assistant);
        return deserializeAssistant(serializedAssistant);
      }
      return null;
    } catch (error) {
      console.error('获取当前助手失败:', error);
      return null;
    }
  }

  /**
   * 设置当前助手
   */
  static async setCurrentAssistant(assistantId: string): Promise<boolean> {
    try {
      console.log(`尝试设置当前助手: ${assistantId}`);

      // 先验证助手是否存在
      try {
        const assistant = await dataService.getAssistant(assistantId);
        if (!assistant) {
          console.error(`无法设置当前助手: ID为 ${assistantId} 的助手不存在`);
          return false;
        }
        console.log(`验证助手 ${assistantId} 存在`);
      } catch (validateError) {
        console.error(`验证助手 ${assistantId} 存在时出错:`, validateError);
        return false;
      }

      // 保存到DataService
      await dataService.saveSetting('currentAssistant', assistantId);

      console.log(`当前助手设置为: ${assistantId}`);
      return true;
    } catch (error) {
      console.error('设置当前助手失败:', error);
      return false;
    }
  }

  /**
   * 添加助手
   */
  static async addAssistant(assistant: Assistant): Promise<boolean> {
    try {
      console.log(`尝试添加助手: ${assistant.id} (${assistant.name})`);

      // 先查询助手是否已存在
      let existingAssistant = null;
      try {
        existingAssistant = await dataService.getAssistant(assistant.id);
      } catch (error) {
        console.log(`助手 ${assistant.id} 不存在，将创建新助手`);
      }

      if (existingAssistant) {
        console.warn(`助手 ${assistant.id} 已存在，将更新现有助手`);
        return await this.updateAssistant(assistant);
      }

      // 序列化助手以去除图标等非可序列化属性
      const serializableAssistant = serializeAssistant(assistant);

      // 保存到DataService
      await dataService.saveAssistant(serializableAssistant);

      console.log(`助手 ${assistant.id} 添加成功`);
      return true;
    } catch (error) {
      console.error(`添加助手 ${assistant.id} 失败:`, error);
      return false;
    }
  }

  /**
   * 更新助手
   */
  static async updateAssistant(assistant: Assistant): Promise<boolean> {
    try {
      console.log(`更新助手: ${assistant.id} (${assistant.name})`);

      // 序列化助手以去除图标等非可序列化属性
      const serializableAssistant = serializeAssistant(assistant);

      // 保存到DataService
      await dataService.saveAssistant(serializableAssistant);

      console.log(`助手 ${assistant.id} 更新成功`);
      return true;
    } catch (error) {
      console.error(`更新助手 ${assistant.id} 失败:`, error);
      return false;
    }
  }

  /**
   * 删除助手
   */
  static async deleteAssistant(assistantId: string): Promise<boolean> {
    try {
      console.log(`删除助手: ${assistantId}`);

      // 从DataService删除
      await dataService.deleteAssistant(assistantId);

      console.log(`助手 ${assistantId} 删除成功`);
      return true;
    } catch (error) {
      console.error(`删除助手 ${assistantId} 失败:`, error);
      return false;
    }
  }
}