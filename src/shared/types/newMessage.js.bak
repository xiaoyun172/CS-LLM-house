"use strict";
// 定义新的消息块系统类型
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserMessageStatus = exports.AssistantMessageStatus = exports.MessageBlockStatus = exports.MessageBlockType = void 0;
// 消息块类型枚举
exports.MessageBlockType = {
    UNKNOWN: 'unknown',
    MAIN_TEXT: 'main_text',
    THINKING: 'thinking',
    IMAGE: 'image',
    CODE: 'code',
    TOOL: 'tool',
    FILE: 'file',
    ERROR: 'error',
    CITATION: 'citation',
    TRANSLATION: 'translation',
    TABLE: 'table',
    MULTI_MODEL: 'multi_model',
    CHART: 'chart',
    MATH: 'math'
};
// 消息块状态枚举
exports.MessageBlockStatus = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    STREAMING: 'streaming',
    SUCCESS: 'success',
    ERROR: 'error',
    PAUSED: 'paused'
};
// 助手消息状态枚举
exports.AssistantMessageStatus = {
    PENDING: 'pending',
    PROCESSING: 'processing', // 添加处理中状态
    SEARCHING: 'searching', // 添加搜索中状态
    STREAMING: 'streaming',
    SUCCESS: 'success',
    ERROR: 'error',
    PAUSED: 'paused'
};
// 用户消息状态枚举
exports.UserMessageStatus = {
    SENDING: 'sending',
    SUCCESS: 'success',
    ERROR: 'error'
};
