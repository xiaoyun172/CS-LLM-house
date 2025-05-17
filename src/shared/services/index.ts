import { storageService } from './storageService';
import { DataAdapter } from './DataAdapter';
import { AssistantService } from './assistant';
import { DB_CONFIG } from '../types/DatabaseSchema';

// 使用浏览器全局的indexedDB对象
const indexedDB = window.indexedDB;

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
   * 检查并修复数据库版本
   * 确保数据库版本与应用版本一致
   */
  async ensureDatabaseVersion(): Promise<{
    success: boolean;
    message: string;
    oldVersion?: number;
    newVersion?: number;
  }> {
    try {
      console.log('DataManager: 检查数据库版本');

      // 获取所有数据库
      const databases = await indexedDB.databases();

      // 查找目标数据库
      const targetDB = databases.find((db: { name?: string, version?: number }) => db.name === DB_CONFIG.NAME);

      // 如果数据库不存在，不需要修复
      if (!targetDB) {
        console.log('DataManager: 数据库不存在，将在首次访问时创建');
        return {
          success: true,
          message: '数据库不存在，将在首次访问时创建'
        };
      }

      // 检查版本是否匹配
      if (targetDB.version === DB_CONFIG.VERSION) {
        console.log(`DataManager: 数据库版本匹配 (v${targetDB.version})`);
        return {
          success: true,
          message: `数据库版本匹配 (v${targetDB.version})`
        };
      }

      // 版本不匹配，需要修复
      console.warn(`DataManager: 数据库版本不匹配，当前: v${targetDB.version}，期望: v${DB_CONFIG.VERSION}`);

      // 删除旧数据库
      await new Promise<void>((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase(DB_CONFIG.NAME);

        deleteRequest.onsuccess = () => {
          console.log('DataManager: 成功删除旧版本数据库');
          resolve();
        };

        deleteRequest.onerror = (event: Event) => {
          console.error('DataManager: 删除旧版本数据库失败:', event);
          reject(new Error('删除数据库失败'));
        };
      });

      // 等待300ms确保删除操作完成
      await new Promise(resolve => setTimeout(resolve, 300));

      console.log('DataManager: 数据库版本已修复，将在下次访问时创建新版本');

      return {
        success: true,
        message: '数据库版本已修复',
        oldVersion: targetDB.version,
        newVersion: DB_CONFIG.VERSION
      };
    } catch (error) {
      console.error('DataManager: 检查数据库版本失败:', error);
      return {
        success: false,
        message: `检查数据库版本失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  },

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

// 导出所有服务模块
export * from './messages';