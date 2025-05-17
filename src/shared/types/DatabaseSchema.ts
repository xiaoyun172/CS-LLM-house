import type { DBSchema } from 'idb';
import type { Assistant } from './Assistant';
import type { ChatTopic } from '../types';

// 统一的数据库配置
export const DB_CONFIG = {
  NAME: 'aetherlink-db-new',
  VERSION: 2,
  STORES: {
    TOPICS: 'topics' as const,
    ASSISTANTS: 'assistants' as const,
    SETTINGS: 'settings' as const,
    IMAGES: 'images' as const,
    IMAGE_METADATA: 'imageMetadata' as const,
    METADATA: 'metadata' as const
  }
};

// 图片元数据接口
export interface ImageMetadata {
  id: string;
  topicId?: string;
  messageId?: string;
  mimeType: string;
  width?: number;
  height?: number;
  size?: number;
  created: number;
  url?: string; // 可选的远程URL
}

// 图片引用接口
export interface ImageReference {
  id: string;
  mimeType: string;
  width?: number;
  height?: number;
}

// 定义数据库架构
export interface AetherLinkDB extends DBSchema {
  assistants: {
    key: string;
    value: Assistant;
    indexes: {
      'by-system': string;
    };
  };

  topics: {
    key: string;
    value: ChatTopic;
    indexes: {
      'by-assistant': string;
      'by-last-time': number;
    };
  };

  images: {
    key: string;
    value: Blob;
  };

  imageMetadata: {
    key: string;
    value: ImageMetadata;
    indexes: {
      'by-topic': string;
      'by-time': number;
    };
  };

  settings: {
    key: string;
    value: any;
  };

  metadata: {
    key: string;
    value: any;
  };
}