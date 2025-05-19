import React, { useRef, useEffect, useMemo, useCallback, useState, useReducer } from 'react';
import { Box, useTheme } from '@mui/material';
import type { Message } from '../../shared/types/newMessage.ts';
import MessageItem from './MessageItem';
import SystemPromptBubble from '../SystemPromptBubble';
import SystemPromptDialog from '../SystemPromptDialog';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../shared/store';

import { dexieStorage } from '../../shared/services/DexieStorageService';
import { upsertManyBlocks } from '../../shared/store/slices/messageBlocksSlice';

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

  // 从 Redux 获取当前话题和当前助手
  const currentTopic = useSelector((state: RootState) => state.messages.currentTopic);
  const currentAssistant = useSelector((state: RootState) => {
    const assistants = state.assistants.assistants;
    if (!currentTopic || !assistants) return null;
    return assistants.find(a => a.id === currentTopic.assistantId) || null;
  });

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

    // 如果有正在流式输出的块，滚动到底部
    if (hasStreamingBlock) {
      scrollToBottom();
    }
  }, [messageBlocks]);

  // 当消息列表更新时滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      for (const message of messages) {
        if (message.blocks && message.blocks.length > 0) {
          const blocksToLoad = [];
          for (const blockId of message.blocks) {
            const block = await dexieStorage.getMessageBlock(blockId);
            if (block) {
              blocksToLoad.push(block);
            }
          }
          if (blocksToLoad.length > 0) {
            dispatch(upsertManyBlocks(blocksToLoad));
          }
        }
      }
    };

    loadAllBlocks();
  }, [messages, dispatch]);

  // 过滤消息，只显示当前版本或没有版本标记的消息
  const filteredMessages = useMemo(() => {
    return messages;
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
              <MessageItem
                message={message}
                onRegenerate={handleRegenerate}
                onDelete={handleDelete}
                // 强制每次渲染使用最新状态
                forceUpdate={forceUpdate}
              />
            </Box>
          </React.Fragment>
        ))
      )}
      <div ref={messagesEndRef} />
    </Box>
  );
};

export default MessageList;
