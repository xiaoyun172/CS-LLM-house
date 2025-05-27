import type { Middleware } from '@reduxjs/toolkit';
import { EventEmitter, EVENT_NAMES } from '../../services/EventEmitter';

/**
 * Redux中间件，用于在特定操作发生时触发事件
 * 这使得组件可以通过事件系统而不是直接依赖Redux状态来响应状态变化
 */
export const eventMiddleware: Middleware = _store => next => action => {
  // 先执行原始action
  const result = next(action);

  // 根据action类型触发相应事件
  const actionObj = action as any;
  const type = actionObj.type;
  const payload = actionObj.payload;

  // 消息相关事件
  if (type === 'messages/addMessage') {
    EventEmitter.emit(EVENT_NAMES.MESSAGE_CREATED, payload);
  } else if (type === 'messages/updateMessage') {
    EventEmitter.emit(EVENT_NAMES.MESSAGE_UPDATED, payload);
  } else if (type === 'messages/removeMessage') {
    EventEmitter.emit(EVENT_NAMES.MESSAGE_DELETED, payload);
  } else if (type === 'messages/setTopicStreaming') {
    // 移除重复的事件发送，避免与流式处理器的事件冲突
    // 流式事件应该只由实际的流式处理器发送
    const { topicId, streaming } = payload;
    console.log(`[EventMiddleware] 话题流式状态变化: ${topicId}, streaming: ${streaming}`);
  }

  // 块相关事件
  if (type === 'messageBlocks/addOneBlock') {
    EventEmitter.emit(EVENT_NAMES.BLOCK_CREATED, payload);
  } else if (type === 'messageBlocks/updateOneBlock') {
    EventEmitter.emit(EVENT_NAMES.BLOCK_UPDATED, payload);
  } else if (type === 'messageBlocks/removeOneBlock') {
    EventEmitter.emit(EVENT_NAMES.BLOCK_DELETED, payload);
  }

  // 主题相关事件
  if (type === 'messages/addTopic') {
    EventEmitter.emit(EVENT_NAMES.TOPIC_CREATED, payload);
  } else if (type === 'messages/updateTopic') {
    EventEmitter.emit(EVENT_NAMES.TOPIC_UPDATED, payload);
  } else if (type === 'messages/removeTopic') {
    EventEmitter.emit(EVENT_NAMES.TOPIC_DELETED, payload);
  }

  // UI相关事件
  if (type === 'ui/scrollToBottom') {
    EventEmitter.emit(EVENT_NAMES.UI_SCROLL_TO_BOTTOM);
  } else if (type === 'ui/forceUpdate') {
    EventEmitter.emit(EVENT_NAMES.UI_FORCE_UPDATE);
  }

  return result;
};
