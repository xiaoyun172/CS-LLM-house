/**
 * 消息过滤服务 - 参考电脑版架构
 * 统一导出所有消息过滤和处理函数
 */

// 导出所有过滤函数
export {
  deduplicateMessages,
  deduplicateTopics,
  filterContextMessages,
  filterEmptyMessages,
  filterUsefulMessages,
  getGroupedMessages
} from '../utils/messageUtils/filters';

// 为了向后兼容，提供一些别名
export { deduplicateMessages as filterDuplicateMessages } from '../utils/messageUtils/filters';
export { deduplicateTopics as processTopics } from '../utils/messageUtils/filters';
