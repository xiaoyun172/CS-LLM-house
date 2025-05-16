import { dataService } from '../DataService';
import type { DataSourceAdapter } from './DataSourceAdapter';
import { DataValidator } from './DataValidator';
import { CompatibilityLayer } from './CompatibilityLayer';

/**
 * 迁移状态接口
 */
export interface MigrationStatus {
  started: boolean;
  completed: boolean;
  inProgress: boolean;
  lastRun?: number;
  error?: string;
  sources?: string[];
  stats?: {
    assistants: number;
    topics: number;
    messages: number;
    images: number;
    settings: number;
  };
}

/**
 * 数据迁移服务 - 负责从多个数据源迁移数据到统一存储
 */
export class MigrationService {
  private static instance: MigrationService;
  private status: MigrationStatus = {
    started: false,
    completed: false,
    inProgress: false
  };
  private sourceAdapters: DataSourceAdapter[] = [];
  private validator: DataValidator;
  private compatLayer: CompatibilityLayer;
  
  // 私有构造函数
  private constructor() {
    this.validator = new DataValidator();
    this.compatLayer = new CompatibilityLayer();
  }
  
  // 获取单例实例
  public static getInstance(): MigrationService {
    if (!MigrationService.instance) {
      MigrationService.instance = new MigrationService();
    }
    return MigrationService.instance;
  }
  
  /**
   * 注册数据源适配器
   */
  public registerSource(adapter: DataSourceAdapter): void {
    this.sourceAdapters.push(adapter);
  }
  
  /**
   * 检测可用的数据源
   */
  public async detectSources(): Promise<string[]> {
    const availableSources: string[] = [];
    
    for (const adapter of this.sourceAdapters) {
      try {
        const isAvailable = await adapter.checkAvailability();
        if (isAvailable) {
          availableSources.push(adapter.getSourceId());
        }
      } catch (error) {
        console.error(`检测数据源 ${adapter.getSourceId()} 时出错:`, error);
      }
    }
    
    this.status.sources = availableSources;
    return availableSources;
  }
  
  /**
   * 获取迁移状态
   */
  public async getMigrationStatus(): Promise<MigrationStatus> {
    try {
      // 从数据库读取迁移状态
      const dbStatus = await dataService.getSetting('migration_status');
      if (dbStatus) {
        this.status = { ...this.status, ...dbStatus };
      }
    } catch (error) {
      console.error('获取迁移状态失败:', error);
    }
    
    return this.status;
  }
  
  /**
   * 保存迁移状态
   */
  private async saveMigrationStatus(): Promise<void> {
    try {
      this.status.lastRun = Date.now();
      await dataService.saveSetting('migration_status', this.status);
    } catch (error) {
      console.error('保存迁移状态失败:', error);
    }
  }
  
  /**
   * 开始迁移过程
   */
  public async startMigration(sourceIds?: string[]): Promise<MigrationStatus> {
    // 如果已经在进行中，返回当前状态
    if (this.status.inProgress) {
      return this.status;
    }
    
    // 更新状态
    this.status.inProgress = true;
    this.status.started = true;
    this.status.error = undefined;
    this.status.stats = {
      assistants: 0,
      topics: 0,
      messages: 0,
      images: 0,
      settings: 0
    };
    
    await this.saveMigrationStatus();
    
    try {
      // 如果未指定数据源，检测所有可用数据源
      if (!sourceIds || sourceIds.length === 0) {
        sourceIds = await this.detectSources();
      }
      
      // 过滤出有效的数据源适配器
      const adaptersToUse = this.sourceAdapters.filter(adapter => 
        sourceIds?.includes(adapter.getSourceId())
      );
      
      if (adaptersToUse.length === 0) {
        throw new Error('没有可用的数据源');
      }
      
      // 迁移每个数据源
      for (const adapter of adaptersToUse) {
        await this.migrateFromSource(adapter);
      }
      
      // 迁移完成，更新状态
      this.status.completed = true;
      this.status.inProgress = false;
      await this.saveMigrationStatus();
      
      // 启用兼容层
      this.compatLayer.enable();
      
      return this.status;
    } catch (error) {
      // 迁移失败，更新状态
      this.status.inProgress = false;
      this.status.error = error instanceof Error ? error.message : String(error);
      await this.saveMigrationStatus();
      
      console.error('数据迁移失败:', error);
      throw error;
    }
  }
  
  /**
   * 从特定数据源迁移数据
   */
  private async migrateFromSource(adapter: DataSourceAdapter): Promise<void> {
    console.log(`开始从 ${adapter.getSourceId()} 迁移数据`);
    
    // 迁移助手
    const assistants = await adapter.getAssistants();
    for (const assistant of assistants) {
      if (this.validator.validateAssistant(assistant)) {
        await dataService.saveAssistant(assistant);
        if (this.status.stats) this.status.stats.assistants++;
      }
    }
    
    // 迁移话题和消息
    const topics = await adapter.getTopics();
    for (const topic of topics) {
      if (this.validator.validateTopic(topic)) {
        await dataService.saveTopic(topic);
        if (this.status.stats) this.status.stats.topics++;
        if (this.status.stats) this.status.stats.messages += topic.messages.length;
      }
    }
    
    // 迁移图片
    const images = await adapter.getImages();
    for (const imageData of Object.values(images)) {
      await dataService.saveImage(imageData.blob, imageData.metadata);
      if (this.status.stats) this.status.stats.images++;
    }
    
    // 迁移设置
    const settings = await adapter.getSettings();
    for (const [key, value] of Object.entries(settings)) {
      await dataService.saveSetting(key, value);
      if (this.status.stats) this.status.stats.settings++;
    }
    
    console.log(`从 ${adapter.getSourceId()} 迁移数据完成`);
  }
  
  /**
   * 验证迁移后的数据
   */
  public async validateMigratedData(): Promise<boolean> {
    // 获取所有助手
    const assistants = await dataService.getAllAssistants();
    
    // 获取所有话题
    const topics = await dataService.getAllTopics();
    
    // 验证数据完整性
    const isValid = this.validator.validateDataIntegrity(assistants, topics);
    
    return isValid;
  }
  
  /**
   * 紧急回退到旧版数据
   */
  public async emergencyRollback(): Promise<boolean> {
    try {
      // 启用兼容层的回退模式
      this.compatLayer.enableRollbackMode();
      
      // 更新状态
      this.status.completed = false;
      await this.saveMigrationStatus();
      
      return true;
    } catch (error) {
      console.error('紧急回退失败:', error);
      return false;
    }
  }
}

// 导出单例实例
export const migrationService = MigrationService.getInstance(); 