import React, { useRef, useEffect, useMemo, useCallback, useState, useReducer } from 'react';
import { Box, useTheme } from '@mui/material';
import type { Message } from '../../shared/types/newMessage.ts';
import MessageGroup from './MessageGroup';
import SystemPromptBubble from '../SystemPromptBubble';
import SystemPromptDialog from '../SystemPromptDialog';
import VirtualScroller from '../common/VirtualScroller';
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
}

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const dispatch = useDispatch();
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);

  // 添加强制更新机制
  const forceUpdate = useReducer(state => !state, false)[1];

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

  // 使用优化的滚动位置钩子
  const {
    containerRef,
    handleScroll,
    scrollToBottom,
  } = useScrollPosition('messageList', {
    throttleTime: 100,
    autoRestore: true,
    onScroll: (_scrollPos) => {
      // 可以在这里添加滚动位置相关的逻辑
    }
  });

  // 节流的滚动到底部函数
  const throttledScrollToBottom = useMemo(
    () => throttle(scrollToBottom, 100, { leading: true, trailing: true }),
    [scrollToBottom]
  );

  // 监听消息块状态变化，实现流式输出过程中的自动滚动
  useEffect(() => {
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

      // 强制更新UI以确保最新状态显示
      forceUpdate();
    }
  }, [messageBlocks, messages, forceUpdate, throttledScrollToBottom]);

  // 添加流式输出事件监听
  useEffect(() => {
    // 监听流式输出事件
    const textDeltaHandler = () => {
      forceUpdate();

      // 使用 setTimeout 确保在DOM更新后滚动
      setTimeout(() => {
        throttledScrollToBottom();
      }, 10);
    };

    // 监听滚动到底部事件
    const scrollToBottomHandler = () => {
      // 尝试使用 messagesEndRef 滚动到底部
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
      } else {
        // 如果 messagesEndRef 不可用，使用 throttledScrollToBottom
        throttledScrollToBottom();
      }
    };

    // 订阅事件
    const unsubscribeTextDelta = EventEmitter.on(EVENT_NAMES.STREAM_TEXT_DELTA, textDeltaHandler);
    const unsubscribeTextComplete = EventEmitter.on(EVENT_NAMES.STREAM_TEXT_COMPLETE, textDeltaHandler);
    const unsubscribeThinkingDelta = EventEmitter.on(EVENT_NAMES.STREAM_THINKING_DELTA, textDeltaHandler);
    const unsubscribeScrollToBottom = EventEmitter.on(EVENT_NAMES.UI_SCROLL_TO_BOTTOM, scrollToBottomHandler);

    // 定期强制更新UI，确保流式输出显示
    const updateInterval = setInterval(() => {
      const hasStreamingMessage = messages.some(message => message.status === 'streaming');
      if (hasStreamingMessage) {
        forceUpdate();

        // 定期滚动到底部，确保在长时间流式输出时保持滚动
        throttledScrollToBottom();
      }
    }, 100); // 每100ms更新一次

    return () => {
      unsubscribeTextDelta();
      unsubscribeTextComplete();
      unsubscribeThinkingDelta();
      unsubscribeScrollToBottom();
      clearInterval(updateInterval);
    };
  }, [forceUpdate, messages, throttledScrollToBottom]);

  // 当消息列表更新时滚动到底部
  useEffect(() => {
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
  }, [messages.length, throttledScrollToBottom]);

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
    console.log('[MessageList] 系统提示词已保存，更新当前话题:', updatedTopic);
    // 直接更新当前话题状态，强制重新渲染
    setCurrentTopic(updatedTopic);
  }, []);

  // 确保所有消息的块都已加载到Redux中
  useEffect(() => {
    const loadAllBlocks = async () => {
      console.log(`[MessageList] 开始加载所有消息块，消息数量: ${messages.length}`);

      // 创建一个集合来跟踪已加载的块ID，避免重复加载
      const loadedBlockIds = new Set();
      const blocksToLoad = [];

      for (const message of messages) {
        console.log(`[MessageList] 处理消息: ID=${message.id}, 角色=${message.role}, 状态=${message.status}, 块数量=${message.blocks?.length || 0}`);

        if (message.blocks && message.blocks.length > 0) {
          for (const blockId of message.blocks) {
            // 如果这个块已经在Redux中，跳过
            if (messageBlocks[blockId]) {
              console.log(`[MessageList] 块已在Redux中: ${blockId}`);
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
                // 安全地获取内容长度
                let contentLength = 0;
                if (block.type === 'main_text' ||
                    block.type === 'code' ||
                    block.type === 'thinking' ||
                    block.type === 'citation' ||
                    block.type === 'translation') {
                  contentLength = (block as any).content?.length || 0;
                }
                console.log(`[MessageList] 从数据库加载块: ID=${blockId}, 类型=${block.type}, 内容长度=${contentLength}`);
                blocksToLoad.push(block);
                loadedBlockIds.add(blockId);
              } else {
                console.warn(`[MessageList] 数据库中找不到块: ${blockId}`);

                // 如果找不到块，创建一个临时块
                if (message.role === 'assistant' && message.status === 'success') {
                  console.log(`[MessageList] 为消息 ${message.id} 创建临时块`);
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
            console.log(`[MessageList] 为没有块的助手消息 ${message.id} 创建新块`);
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
            console.log(`[MessageList] 更新消息 ${message.id} 的块引用为 ${newBlockId}`);
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
        console.log(`[MessageList] 更新Redux状态: 加载了${blocksToLoad.length}个块`);
        // 使用类型断言解决类型不匹配问题
        dispatch(upsertManyBlocks(blocksToLoad as any));

        // 强制更新UI
        forceUpdate();
      }
    };

    loadAllBlocks();
  }, [messages, messageBlocks, dispatch, forceUpdate]);

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

  // 这个函数在当前实现中未使用，但保留以便将来可能需要
  // 计算消息项的高度（用于虚拟滚动）

  // 渲染消息组
  const renderMessageGroup = useCallback((item: any, _index: number) => {
    const [date, messages] = item as [string, Message[]];
    return (
      <MessageGroup
        key={date}
        date={date}
        messages={messages}
        expanded={true}
        // 传递forceUpdate函数给MessageGroup
        forceUpdate={forceUpdate}
      />
    );
  }, [forceUpdate]);

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
        // 使用虚拟滚动优化大量消息的渲染
        <VirtualScroller
          items={groupedMessages}
          itemHeight={200} // 估算的每个消息组的平均高度
          renderItem={renderMessageGroup}
          overscanCount={2}
          itemKey={(item: any, _index: number) => (item as [string, Message[]])[0]} // 使用日期作为key
        />
      )}
      <div ref={messagesEndRef} />
    </Box>
  );
};

export default MessageList;
