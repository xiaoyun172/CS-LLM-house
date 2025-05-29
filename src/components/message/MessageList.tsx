import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { Box, useTheme } from '@mui/material';
import type { Message } from '../../shared/types/newMessage.ts';
import MessageGroup from './MessageGroup';
import SystemPromptBubble from '../SystemPromptBubble';
import SystemPromptDialog from '../SystemPromptDialog';
// 移除 VirtualScroller 导入，使用简单的DOM渲染
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../shared/store';
import { throttle } from 'lodash';

import { dexieStorage } from '../../shared/services/DexieStorageService';
import { upsertManyBlocks } from '../../shared/store/slices/messageBlocksSlice';
import { newMessagesActions } from '../../shared/store/slices/newMessagesSlice';
import useScrollPosition from '../../hooks/useScrollPosition';
import { getGroupedMessages, MessageGroupingType } from '../../shared/utils/messageGrouping';
import { EventEmitter, EVENT_NAMES } from '../../shared/services/EventEmitter';
import { deduplicateMessages } from '../../shared/services/MessageFilters';
import { generateBlockId } from '../../shared/utils';

interface MessageListProps {
  messages: Message[];
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onSwitchVersion?: (versionId: string) => void;
  onResend?: (messageId: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({ messages, onRegenerate, onDelete, onSwitchVersion, onResend }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const dispatch = useDispatch();
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);

  // 添加强制更新机制 - 使用更稳定的实现
  const [, setUpdateCounter] = useState(0);
  const forceUpdate = useCallback(() => {
    setUpdateCounter(prev => prev + 1);
  }, []);

  // 使用 ref 存储 forceUpdate，避免依赖项变化
  const forceUpdateRef = useRef(forceUpdate);
  useEffect(() => {
    forceUpdateRef.current = forceUpdate;
  }, [forceUpdate]);

  // 获取所有消息块的状态
  const messageBlocks = useSelector((state: RootState) => state.messageBlocks.entities);

  // 从 Redux 获取当前话题ID
  const currentTopicId = useSelector((state: RootState) => state.messages.currentTopicId);

  // 从数据库获取当前话题和助手信息
  const [currentTopic, setCurrentTopic] = useState<any>(null);
  const [currentAssistant, setCurrentAssistant] = useState<any>(null);

  // 当话题ID变化时，从数据库获取话题和助手信息
  useEffect(() => {
    const loadTopicAndAssistant = async () => {
      if (!currentTopicId) return;

      try {
        // 获取话题
        const topic = await dexieStorage.getTopic(currentTopicId);
        if (topic) {
          setCurrentTopic(topic);

          // 获取助手
          if (topic.assistantId) {
            const assistant = await dexieStorage.getAssistant(topic.assistantId);
            if (assistant) {
              setCurrentAssistant(assistant);
            }
          }
        }
      } catch (error) {
        console.error('加载话题和助手信息失败:', error);
      }
    };

    loadTopicAndAssistant();
  }, [currentTopicId]);

  // 获取系统提示词气泡显示设置
  const showSystemPromptBubble = useSelector((state: RootState) =>
    state.settings.showSystemPromptBubble !== false
  );

  // 获取自动滚动设置
  const autoScrollToBottom = useSelector((state: RootState) =>
    state.settings.autoScrollToBottom !== false
  );

  // 使用简化的滚动位置钩子
  const {
    containerRef,
    handleScroll,
    scrollToBottom,
  } = useScrollPosition('messageList', {
    throttleTime: 100,
    autoRestore: false, // 禁用自动恢复，避免滚动冲突
    onScroll: (_scrollPos) => {
      // 可以在这里添加滚动位置相关的逻辑
    }
  });

  // 节流的滚动到底部函数
  const throttledScrollToBottom = useMemo(
    () => throttle(scrollToBottom, 100, { leading: true, trailing: true }),
    [scrollToBottom]
  );

  // 使用 ref 存储 throttledScrollToBottom，避免闭包问题
  const throttledScrollToBottomRef = useRef(throttledScrollToBottom);
  useEffect(() => {
    throttledScrollToBottomRef.current = throttledScrollToBottom;
  }, [throttledScrollToBottom]);

  // 使用节流的状态检查，避免过度渲染
  const throttledStreamingCheck = useMemo(
    () => throttle(() => {
      // 检查是否启用自动滚动
      if (!autoScrollToBottom) return;

      // 检查是否有正在流式输出的块
      const hasStreamingBlock = Object.values(messageBlocks || {}).some(
        block => block?.status === 'streaming'
      );

      // 检查是否有正在流式输出的消息
      const hasStreamingMessage = messages.some(
        message => message.status === 'streaming'
      );

      // 如果有正在流式输出的块或消息，滚动到底部
      if (hasStreamingBlock || hasStreamingMessage) {
        // 使用 setTimeout 确保在DOM更新后滚动
        setTimeout(() => {
          throttledScrollToBottom();
        }, 10);
      }
    }, 100), // 100ms节流
    [messageBlocks, messages, throttledScrollToBottom, autoScrollToBottom]
  );

  // 监听消息块状态变化，但使用节流避免过度更新
  useEffect(() => {
    throttledStreamingCheck();
  }, [throttledStreamingCheck]);

  // 添加流式输出事件监听 - 使用节流优化性能
  useEffect(() => {
    // 检查是否启用高性能模式，动态调整节流时间
    const getScrollThrottleTime = () => {
      // 检查是否有正在流式输出的块
      const hasStreamingBlock = Object.values(messageBlocks || {}).some(
        block => block?.status === 'streaming'
      );

      if (hasStreamingBlock) {
        // 使用同步方式获取性能设置，避免async问题
        try {
          // 直接从localStorage读取高性能设置
          const highPerformanceStreaming = localStorage.getItem('highPerformanceStreaming') === 'true';
          if (highPerformanceStreaming) {
            return 300; // 高性能模式：300ms
          }
        } catch (error) {
          console.warn('无法加载性能设置，使用默认值');
        }
      }

      return 50; // 默认：50ms节流，约20fps
    };

    // 使用动态节流时间的事件处理器
    const throttledTextDeltaHandler = throttle(() => {
      // 检查是否启用自动滚动
      if (!autoScrollToBottom) return;

      // 使用 setTimeout 确保在DOM更新后滚动
      setTimeout(() => {
        if (throttledScrollToBottomRef.current) {
          throttledScrollToBottomRef.current();
        }
      }, 10);
    }, getScrollThrottleTime());

    // 监听滚动到底部事件
    const scrollToBottomHandler = () => {
      // 尝试使用 messagesEndRef 滚动到底部
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
      } else {
        // 如果 messagesEndRef 不可用，使用 throttledScrollToBottom
        if (throttledScrollToBottomRef.current) {
          throttledScrollToBottomRef.current();
        }
      }
    };

    // 订阅事件
    const unsubscribeTextDelta = EventEmitter.on(EVENT_NAMES.STREAM_TEXT_DELTA, throttledTextDeltaHandler);
    const unsubscribeTextComplete = EventEmitter.on(EVENT_NAMES.STREAM_TEXT_COMPLETE, throttledTextDeltaHandler);
    const unsubscribeThinkingDelta = EventEmitter.on(EVENT_NAMES.STREAM_THINKING_DELTA, throttledTextDeltaHandler);
    const unsubscribeScrollToBottom = EventEmitter.on(EVENT_NAMES.UI_SCROLL_TO_BOTTOM, scrollToBottomHandler);

    return () => {
      unsubscribeTextDelta();
      unsubscribeTextComplete();
      unsubscribeThinkingDelta();
      unsubscribeScrollToBottom();
      // 取消节流函数
      throttledTextDeltaHandler.cancel();
    };
  }, []); // 移除所有依赖，避免无限循环

  // 当消息数量变化时滚动到底部 - 使用节流避免过度滚动
  const throttledMessageLengthScroll = useMemo(
    () => throttle(() => {
      // 检查是否启用自动滚动
      if (!autoScrollToBottom) return;

      // 使用 setTimeout 确保在DOM更新后滚动
      setTimeout(() => {
        // 尝试使用 messagesEndRef 滚动到底部
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
        } else {
          // 如果 messagesEndRef 不可用，使用 throttledScrollToBottom
          throttledScrollToBottom();
        }
      }, 10);
    }, 200), // 200ms节流，避免频繁滚动
    [throttledScrollToBottom, autoScrollToBottom]
  );

  useEffect(() => {
    throttledMessageLengthScroll();
  }, [messages.length, throttledMessageLengthScroll]);

  // 处理系统提示词气泡点击
  const handlePromptBubbleClick = useCallback(() => {
    setPromptDialogOpen(true);
  }, []);

  // 处理系统提示词对话框关闭
  const handlePromptDialogClose = useCallback(() => {
    setPromptDialogOpen(false);
  }, []);

  // 处理系统提示词保存
  const handlePromptSave = useCallback((updatedTopic: any) => {
    // 直接更新当前话题状态，强制重新渲染
    setCurrentTopic(updatedTopic);
  }, []);

  // 确保所有消息的块都已加载到Redux中 - 使用节流避免频繁加载
  const throttledLoadBlocks = useMemo(
    () => throttle(async () => {
      // 创建一个集合来跟踪已加载的块ID，避免重复加载
      const loadedBlockIds = new Set();
      const blocksToLoad = [];

      for (const message of messages) {
        if (message.blocks && message.blocks.length > 0) {
          for (const blockId of message.blocks) {
            // 如果这个块已经在Redux中，跳过
            if (messageBlocks[blockId]) {
              loadedBlockIds.add(blockId);
              continue;
            }

            // 如果这个块已经在待加载列表中，跳过
            if (loadedBlockIds.has(blockId)) {
              continue;
            }

            try {
              const block = await dexieStorage.getMessageBlock(blockId);
              if (block) {
                blocksToLoad.push(block);
                loadedBlockIds.add(blockId);
              } else {
                console.warn(`[MessageList] 数据库中找不到块: ${blockId}`);

                // 如果找不到块，创建一个临时块
                if (message.role === 'assistant' && message.status === 'success') {
                  const tempBlock = {
                    id: blockId,
                    messageId: message.id,
                    type: 'main_text',
                    content: (message as any).content || '',
                    createdAt: message.createdAt,
                    status: 'success'
                  };
                  blocksToLoad.push(tempBlock);
                  loadedBlockIds.add(blockId);
                }
              }
            } catch (error) {
              console.error(`[MessageList] 加载块 ${blockId} 失败:`, error);
            }
          }
        } else if (message.role === 'assistant' && message.status === 'success' && (!message.blocks || message.blocks.length === 0)) {
          try {
            // 如果助手消息没有块但有内容，创建一个新块
            const newBlockId = generateBlockId('block');
            const newBlock = {
              id: newBlockId,
              messageId: message.id,
              type: 'main_text',
              content: (message as any).content || '',
              createdAt: message.createdAt,
              status: 'success'
            };

            blocksToLoad.push(newBlock);
            loadedBlockIds.add(newBlockId);

            // 不直接修改消息对象，而是通过Redux action更新
            dispatch(newMessagesActions.updateMessage({
              id: message.id,
              changes: {
                blocks: [newBlockId]
              }
            }));

            // 同时更新数据库
            await dexieStorage.updateMessage(message.id, {
              blocks: [newBlockId]
            });
          } catch (error) {
            console.error(`[MessageList] 更新消息块引用失败:`, error);
          }
        }
      }

      if (blocksToLoad.length > 0) {
        // 使用类型断言解决类型不匹配问题
        dispatch(upsertManyBlocks(blocksToLoad as any));
      }
    }, 300), // 300ms节流，避免频繁加载
    [messages, messageBlocks, dispatch]
  );

  useEffect(() => {
    throttledLoadBlocks();
  }, [throttledLoadBlocks]);

  // 过滤消息，去除重复消息 - 使用统一的去重逻辑
  const filteredMessages = useMemo(() => {
    return deduplicateMessages(messages);
  }, [messages]);

  // 这些回调在使用虚拟滚动和消息分组后不再直接使用
  // 但保留它们以便将来可能需要

  // 获取消息分组设置
  const messageGroupingType = useSelector((state: RootState) =>
    (state.settings as any).messageGrouping || 'byDate'
  );

  // 对消息进行分组
  const groupedMessages = useMemo(() => {
    return Object.entries(getGroupedMessages(filteredMessages, messageGroupingType as MessageGroupingType));
  }, [filteredMessages, messageGroupingType]);

  // 移除虚拟滚动相关的函数，使用简单的DOM渲染

  return (
    <Box
      ref={containerRef}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        overflowY: 'auto',
        px: 0,
        py: 2,
        width: '100%', // 确保容器占满可用宽度
        maxWidth: '100%', // 确保不超出父容器
        bgcolor: theme.palette.mode === 'dark'
          ? theme.palette.background.default
          : '#f5f5f5',
        scrollbarWidth: 'thin',
        scrollbarColor: `${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#e1e1e1'} transparent`,
        '&::-webkit-scrollbar': {
          width: '4px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#e1e1e1',
          borderRadius: '10px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.3)' : '#cccccc',
        },
      }}
      onScroll={handleScroll}
    >
      {/* 系统提示词气泡 - 根据设置显示或隐藏 */}
      {showSystemPromptBubble && (
        <SystemPromptBubble
          topic={currentTopic}
          assistant={currentAssistant}
          onClick={handlePromptBubbleClick}
          key={`prompt-bubble-${currentTopic?.id}-${currentTopic?.prompt?.substring(0, 10) || 'default'}`}
        />
      )}

      {/* 系统提示词编辑对话框 */}
      <SystemPromptDialog
        open={promptDialogOpen}
        onClose={handlePromptDialogClose}
        topic={currentTopic}
        assistant={currentAssistant}
        onSave={handlePromptSave}
      />

      {filteredMessages.length === 0 ? (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.palette.text.secondary,
            fontStyle: 'normal',
            fontSize: '14px',
          }}
        >
          新的对话开始了，请输入您的问题
        </Box>
      ) : (
        // 使用简单的DOM渲染，避免虚拟滚动的高度计算问题
        <Box sx={{ width: '100%' }}>
          {groupedMessages.map(([date, messages], groupIndex) => {
            // 计算当前组之前的所有消息数量，用于计算全局索引
            const previousMessagesCount = groupedMessages
              .slice(0, groupIndex)
              .reduce((total, [, msgs]) => total + msgs.length, 0);

            return (
              <MessageGroup
                key={date}
                date={date}
                messages={messages}
                expanded={true}
                forceUpdate={forceUpdateRef.current}
                startIndex={previousMessagesCount} // 传递起始索引
                onRegenerate={onRegenerate}
                onDelete={onDelete}
                onSwitchVersion={onSwitchVersion}
                onResend={onResend}
              />
            );
          })}
        </Box>
      )}
      <div ref={messagesEndRef} />
    </Box>
  );
};

export default MessageList;
