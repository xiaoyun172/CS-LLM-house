import React, { useRef, useEffect, useMemo, useCallback, useState, useReducer } from 'react';
import { Box, useTheme } from '@mui/material';
import type { Message } from '../../shared/types/newMessage.ts';
import MessageItem from './MessageItem';
import MessageErrorBoundary from './MessageErrorBoundary';
import SystemPromptBubble from '../SystemPromptBubble';
import SystemPromptDialog from '../SystemPromptDialog';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../shared/store';

import { dexieStorage } from '../../shared/services/DexieStorageService';
import { upsertManyBlocks } from '../../shared/store/slices/messageBlocksSlice';
import { newMessagesActions } from '../../shared/store/slices/newMessagesSlice';

interface MessageListProps {
  messages: Message[];
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({ messages, onRegenerate, onDelete }) => {
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

  // 滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
      console.log('[MessageList] 检测到流式输出，滚动到底部');
      scrollToBottom();

      // 强制更新UI以确保最新状态显示
      forceUpdate();
    }
  }, [messageBlocks, messages, forceUpdate]);

  // 当消息列表更新时滚动到底部
  useEffect(() => {
    console.log('[MessageList] 消息列表更新，滚动到底部');
    scrollToBottom();
  }, [messages.length]);

  // 处理系统提示词气泡点击
  const handlePromptBubbleClick = useCallback(() => {
    setPromptDialogOpen(true);
  }, []);

  // 处理系统提示词对话框关闭
  const handlePromptDialogClose = useCallback(() => {
    setPromptDialogOpen(false);
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
                    content: (message as any).content || '(无内容)',
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
            const newBlockId = `block-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            const newBlock = {
              id: newBlockId,
              messageId: message.id,
              type: 'main_text',
              content: (message as any).content || '(无内容)',
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

  // 过滤消息，去除重复消息
  const filteredMessages = useMemo(() => {
    // 创建一个Map来存储已处理的消息，按照askId分组
    const messageGroups = new Map<string, Message[]>();

    // 按照askId分组消息
    messages.forEach(message => {
      // 用户消息使用自己的ID作为key
      const key = message.role === 'user' ? message.id : (message.askId || message.id);

      if (!messageGroups.has(key)) {
        messageGroups.set(key, []);
      }

      messageGroups.get(key)?.push(message);
    });

    // 从每个组中选择最新的消息
    const deduplicated: Message[] = [];

    messageGroups.forEach(group => {
      // 按创建时间排序
      const sorted = [...group].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // 用户消息只保留最新的一条
      if (sorted[0].role === 'user') {
        deduplicated.push(sorted[0]);
      } else {
        // 助手消息可能有多条（如重新生成的情况），全部保留
        deduplicated.push(...sorted);
      }
    });

    // 按创建时间排序
    return deduplicated.sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [messages]);

  // Memoize callback props for MessageItem
  const handleRegenerate = useCallback((messageId: string) => {
    if (onRegenerate) {
      onRegenerate(messageId);
    }
  }, [onRegenerate]);

  const handleDelete = useCallback((messageId: string) => {
    if (onDelete) {
      onDelete(messageId);
    }
  }, [onDelete]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        overflowY: 'auto',
        px: 0,
        py: 2,
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
    >
      {/* 系统提示词气泡 - 根据设置显示或隐藏 */}
      {showSystemPromptBubble && (
        <SystemPromptBubble
          topic={currentTopic}
          assistant={currentAssistant}
          onClick={handlePromptBubbleClick}
        />
      )}

      {/* 系统提示词编辑对话框 */}
      <SystemPromptDialog
        open={promptDialogOpen}
        onClose={handlePromptDialogClose}
        topic={currentTopic}
        assistant={currentAssistant}
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
        filteredMessages.map((message, index) => (
          <React.Fragment key={message.id}>
            {index > 0 &&
              new Date(message.createdAt).toLocaleDateString() !==
              new Date(filteredMessages[index - 1].createdAt).toLocaleDateString() && (
                <Box
                  sx={{
                    textAlign: 'center',
                    my: 2,
                    color: theme.palette.text.secondary,
                    fontSize: '13px',
                    position: 'relative',
                    '&::before, &::after': {
                      content: '""',
                      position: 'absolute',
                      top: '50%',
                      width: '20%',
                      height: '1px',
                      backgroundColor: theme.palette.mode === 'dark'
                        ? 'rgba(255,255,255,0.1)'
                        : '#e1e1e1',
                    },
                    '&::before': {
                      left: '20%',
                    },
                    '&::after': {
                      right: '20%',
                    }
                  }}
                >
                  {new Date(message.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Box>
            )}
            {(index === 0 ||
              new Date(message.createdAt).getTime() - new Date(filteredMessages[index - 1].createdAt).getTime() > 5 * 60000) && (
              <Box
                sx={{
                  textAlign: 'center',
                  fontSize: '12px',
                  color: theme.palette.text.secondary,
                  my: 1.5,
                }}
              >
                {new Date(message.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Box>
            )}
            <Box sx={{ position: 'relative' }}>
              <MessageErrorBoundary>
                <MessageItem
                  message={message}
                  onRegenerate={handleRegenerate}
                  onDelete={handleDelete}
                  // 强制每次渲染使用最新状态
                  forceUpdate={forceUpdate}
                />
              </MessageErrorBoundary>
            </Box>
          </React.Fragment>
        ))
      )}
      <div ref={messagesEndRef} />
    </Box>
  );
};

export default MessageList;
