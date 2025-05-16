import type { Assistant } from '../../types/Assistant';
import type { ChatTopic } from '../../types';
import type { ImageMetadata } from '../../types/DatabaseSchema';

/**
 * 图片数据接口
 */
export interface ImageData {
  blob: Blob;
  metadata: Omit<ImageMetadata, 'id' | 'created'>;
}

/**
 * 数据源适配器接口
 * 用于从不同的数据源读取数据
 */
export interface DataSourceAdapter {
  /**
   * 获取数据源ID
   */
  getSourceId(): string;
  
  /**
   * 检查数据源是否可用
   */
  checkAvailability(): Promise<boolean>;
  
  /**
   * 获取助手数据
   */
  getAssistants(): Promise<Assistant[]>;
  
  /**
   * 获取话题数据
   */
  getTopics(): Promise<ChatTopic[]>;
  
  /**
   * 获取图片数据
   */
  getImages(): Promise<Record<string, ImageData>>;
  
  /**
   * 获取设置数据
   */
  getSettings(): Promise<Record<string, any>>;
}

/**
 * 抽象数据源适配器基类
 */
export abstract class BaseDataSourceAdapter implements DataSourceAdapter {
  protected sourceId: string;
  
  constructor(sourceId: string) {
    this.sourceId = sourceId;
  }
  
  getSourceId(): string {
    return this.sourceId;
  }
  
  abstract checkAvailability(): Promise<boolean>;
  abstract getAssistants(): Promise<Assistant[]>;
  abstract getTopics(): Promise<ChatTopic[]>;
  abstract getImages(): Promise<Record<string, ImageData>>;
  abstract getSettings(): Promise<Record<string, any>>;
} 