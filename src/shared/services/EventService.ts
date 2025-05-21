import Emittery from 'emittery';

// 创建全局事件发射器
export const EventEmitter = new Emittery();

// 定义事件名称常量
export const EVENT_NAMES = {
  SEND_MESSAGE: 'SEND_MESSAGE',
  MESSAGE_COMPLETE: 'MESSAGE_COMPLETE',
  CLEAR_MESSAGES: 'CLEAR_MESSAGES',
  ADD_NEW_TOPIC: 'ADD_NEW_TOPIC',
  TOPIC_CREATED: 'TOPIC_CREATED',
  TOPIC_DELETED: 'TOPIC_DELETED',
  SHOW_TOPIC_SIDEBAR: 'SHOW_TOPIC_SIDEBAR',
  SWITCH_TOPIC_SIDEBAR: 'SWITCH_TOPIC_SIDEBAR',
  FORCE_MESSAGES_UPDATE: 'FORCE_MESSAGES_UPDATE',
  SERVICE_ERROR: 'SERVICE_ERROR',
  IMAGE_PROCESSING_DEPRECATED: 'IMAGE_PROCESSING_DEPRECATED',
  TOPICS_CLEARED: 'TOPICS_CLEARED',
  MESSAGE_CREATED: 'message:created',
  MESSAGE_UPDATED: 'message:updated',
  MESSAGE_DELETED: 'MESSAGE_DELETED',
  MESSAGE_ERROR: 'message:error',
  BLOCK_UPDATED: 'block:updated',
  STREAMING_STARTED: 'streaming:started',
  STREAMING_ENDED: 'streaming:ended',
  CONTENT_UPDATED: 'content:updated',
  RESPONSE_COMPLETED: 'response:completed',
  RESPONSE_ERROR: 'response:error'
};

// 提供一个更简洁的事件服务使用方式
export class EventService {
  private static instance: EventService;

  // 单例模式
  static getInstance(): EventService {
    if (!EventService.instance) {
      EventService.instance = new EventService();
    }
    return EventService.instance;
  }

  // 发送事件
  static emit(eventName: string, data: any) {
    EventEmitter.emit(eventName, data);
    if (process.env.NODE_ENV === 'development') {
      // 仅在开发环境记录日志
      console.debug(`[EventService] 事件: ${eventName}`, data);
    }
  }

  // 监听事件
  static on(eventName: string, callback: (data: any) => void) {
    const unsubscribe = EventEmitter.on(eventName, callback);
    return () => {
      unsubscribe();
    };
  }

  // 一次性监听事件
  static once(eventName: string, callback: (data: any) => void) {
    // 使用Promise.resolve处理Emittery.once返回的Promise
    const promise = EventEmitter.once(eventName);

    // 添加回调并返回取消函数
    promise.then(callback);

    return () => {
      // 无法取消once，但可以忽略回调
      promise.then(() => {
        // 空操作，仅用于覆盖原回调
      });
    };
  }

  // 移除所有监听器
  static clear() {
    EventEmitter.clearListeners();
  }
}