import { migrationService } from './MigrationService.js';
import { LocalStorageAdapter } from './LocalStorageAdapter.js';
import { IndexedDBAdapter } from './IndexedDBAdapter.js';
import type { MigrationStatus } from './MigrationService.js';

/**
 * 迁移管理器 - 提供统一的接口管理数据迁移
 */
export class MigrationManager {
  private static instance: MigrationManager;
  private initialized: boolean = false;
  
  // 私有构造函数
  private constructor() {}
  
  // 获取单例实例
  public static getInstance(): MigrationManager {
    if (!MigrationManager.instance) {
      MigrationManager.instance = new MigrationManager();
    }
    return MigrationManager.instance;
  }
  
  /**
   * 初始化迁移管理器
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    // 首先清理旧数据库
    try {
      const { dataService } = await import('../DataService.js');
      const { DataAdapter } = await import('../DataAdapter.js');
      
      // 调用两个清理方法
      // 虽然DataService.initDB会调用清理，但这里我们确保在任何迁移之前显式调用
      await dataService.cleanupOldDatabases();
      
      const dataAdapter = DataAdapter.getInstance();
      await dataAdapter.cleanupOldDatabases();
      
      console.log('MigrationManager: 数据库清理完成');
    } catch (error) {
      console.warn('MigrationManager: 数据库清理失败，但将继续迁移', error);
    }
    
    // 注册数据源适配器
    migrationService.registerSource(new LocalStorageAdapter());
    
    try {
      // 尝试注册IndexedDB适配器，如果该模块存在
      const indexedDBAdapter = new IndexedDBAdapter();
      migrationService.registerSource(indexedDBAdapter);
    } catch (error) {
      console.warn('IndexedDB适配器不可用', error);
    }
    
    this.initialized = true;
  }
  
  /**
   * 检测可用的数据源
   */
  public async detectSources(): Promise<string[]> {
    await this.ensureInitialized();
    return migrationService.detectSources();
  }
  
  /**
   * 获取迁移状态
   */
  public async getMigrationStatus(): Promise<MigrationStatus> {
    await this.ensureInitialized();
    return migrationService.getMigrationStatus();
  }
  
  /**
   * 开始迁移过程
   */
  public async startMigration(sourceIds?: string[]): Promise<MigrationStatus> {
    await this.ensureInitialized();
    return migrationService.startMigration(sourceIds);
  }
  
  /**
   * 验证迁移后的数据
   */
  public async validateMigratedData(): Promise<boolean> {
    await this.ensureInitialized();
    return migrationService.validateMigratedData();
  }
  
  /**
   * 紧急回退到旧版数据
   */
  public async emergencyRollback(): Promise<boolean> {
    await this.ensureInitialized();
    return migrationService.emergencyRollback();
  }
  
  /**
   * 确保已初始化
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

// 导出单例实例
export const migrationManager = MigrationManager.getInstance(); 