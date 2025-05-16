import { storageService } from './storageService';
import { DataAdapter } from './DataAdapter';
import { AssistantService } from './assistant';

// 获取DataAdapter单例实例
const dataAdapter = DataAdapter.getInstance();

// 导出所有服务
export {
  storageService,
  dataAdapter,
  AssistantService
};

// 导出数据管理工具函数
export const DataManager = {
  /**
   * 检查并修复重复话题
   * @returns 返回修复结果的Promise
   */
  async fixDuplicateTopics() {
    try {
      if (typeof dataAdapter.fixDuplicateTopics === 'function') {
        return dataAdapter.fixDuplicateTopics();
      }
      console.warn('fixDuplicateTopics方法不可用');
      return { fixed: 0, total: 0 };
    } catch (error) {
      console.error('修复重复话题失败:', error);
      return { fixed: 0, total: 0 };
    }
  },

  /**
   * 查找重复话题
   * @returns 返回重复话题列表的Promise
   */
  async findDuplicateTopics() {
    try {
      if (typeof dataAdapter.findDuplicateTopics === 'function') {
        return dataAdapter.findDuplicateTopics();
      }
      console.warn('findDuplicateTopics方法不可用');
      return [];
    } catch (error) {
      console.error('查找重复话题失败:', error);
      return [];
    }
  },

  /**
   * 启用或禁用DataAdapter的日志记录
   * @param enabled 是否启用日志记录
   */
  setLogging(enabled: boolean) {
    try {
      if (typeof dataAdapter.setLogging === 'function') {
        dataAdapter.setLogging(enabled);
      } else if (typeof dataAdapter.setDebug === 'function') {
        dataAdapter.setDebug(enabled);
      } else {
        console.warn('日志设置方法不可用');
      }
    } catch (error) {
      console.error('设置日志状态失败:', error);
    }
  }
}; 