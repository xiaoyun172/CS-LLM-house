import type { DBSchema } from 'idb';
import type { Assistant } from './Assistant';
import type { ChatTopic } from '../types';

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