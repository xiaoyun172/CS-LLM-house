import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { Box, useTheme } from '@mui/material';
import type { Message } from '../shared/types';
import MessageItem from './MessageItem';

interface MessageListProps {
  messages: Message[];
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onSwitchVersion?: (messageId: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({ messages, onRegenerate, onDelete, onSwitchVersion }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  // 滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 当消息列表更新时滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 过滤消息，只显示当前版本或没有版本标记的消息
  const filteredMessages = useMemo(() => {
    return messages.filter(message => {
      if (message.role === 'user') {
        return true;
      }
      const referencedByOtherMessages = messages.some(
        otherMsg => 
          otherMsg.id !== message.id && 
          otherMsg.alternateVersions && 
          otherMsg.alternateVersions.includes(message.id)
      );
      if (referencedByOtherMessages) {
        return message.isCurrentVersion === true;
      }
      if (message.alternateVersions) {
        return message.isCurrentVersion !== false;
      }
      return message.isCurrentVersion !== false;
    });
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

  const handleSwitchVersion = useCallback((messageId: string) => {
    if (onSwitchVersion) {
      onSwitchVersion(messageId);
    }
  }, [onSwitchVersion]);

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
              new Date(message.timestamp).toLocaleDateString() !== 
              new Date(filteredMessages[index - 1].timestamp).toLocaleDateString() && (
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
                  {new Date(message.timestamp).toLocaleDateString(undefined, { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Box>
            )}
            {(index === 0 || 
              new Date(message.timestamp).getTime() - new Date(filteredMessages[index - 1].timestamp).getTime() > 5 * 60000) && (
              <Box 
                sx={{ 
                  textAlign: 'center',
                  fontSize: '12px',
                  color: theme.palette.text.secondary,
                  my: 1.5,
                }}
              >
                {new Date(message.timestamp).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Box>
            )}
            <MessageItem 
              message={message} 
              onRegenerate={handleRegenerate}
              onDelete={handleDelete}
              onSwitchVersion={handleSwitchVersion}
            />
          </React.Fragment>
        ))
      )}
      <div ref={messagesEndRef} />
    </Box>
  );
};

export default MessageList;
