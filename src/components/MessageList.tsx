import React, { useRef, useEffect } from 'react';
import { Box } from '@mui/material';
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

  // 滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 当消息列表更新时滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 过滤消息，只显示当前版本或没有版本标记的消息
  const filteredMessages = messages.filter(message => {
    // 对于用户消息，始终显示
    if (message.role === 'user') {
      return true;
    }
    
    // 查找是否有其他消息引用了当前消息作为替代版本
    const referencedByOtherMessages = messages.some(
      otherMsg => 
        otherMsg.id !== message.id && 
        otherMsg.alternateVersions && 
        otherMsg.alternateVersions.includes(message.id)
    );
    
    // 如果这个消息被其他消息引用为替代版本，则只有它被标记为当前版本时才显示
    if (referencedByOtherMessages) {
      return message.isCurrentVersion === true;
    }
    
    // 如果消息有alternateVersions但没有isCurrentVersion标记，则默认显示
    // 或者如果消息被明确标记为当前版本，则显示
    if (message.alternateVersions) {
      return message.isCurrentVersion !== false;
    }
    
    // 对于其他消息，只要没有明确标记为非当前版本，就显示它们
    return message.isCurrentVersion !== false;
  });

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        overflowY: 'auto',
        px: 0, // 移除水平内边距
        py: 2,
        bgcolor: '#f5f5f5', // 微信风格的背景色
        scrollbarWidth: 'thin',
        scrollbarColor: '#e1e1e1 transparent',
        '&::-webkit-scrollbar': {
          width: '4px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: '#e1e1e1',
          borderRadius: '10px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          backgroundColor: '#cccccc',
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
            color: '#999999',
            fontStyle: 'normal',
            fontSize: '14px',
          }}
        >
          新的对话开始了，请输入您的问题
        </Box>
      ) : (
        filteredMessages.map((message, index) => (
          <React.Fragment key={message.id}>
            {/* 如果是新的一天，显示日期分隔线 */}
            {index > 0 && 
              new Date(message.timestamp).toLocaleDateString() !== 
              new Date(filteredMessages[index - 1].timestamp).toLocaleDateString() && (
                <Box 
                  sx={{ 
                    textAlign: 'center', 
                    my: 2, 
                    color: '#999999',
                    fontSize: '13px',
                    position: 'relative',
                    '&::before, &::after': {
                      content: '""',
                      position: 'absolute',
                      top: '50%',
                      width: '20%',
                      height: '1px',
                      backgroundColor: '#e1e1e1',
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
            
            {/* 显示时间戳 */}
            {(index === 0 || 
              new Date(message.timestamp).getTime() - new Date(filteredMessages[index - 1].timestamp).getTime() > 5 * 60000) && (
              <Box 
                sx={{ 
                  textAlign: 'center',
                  fontSize: '12px',
                  color: '#999999',
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
              onRegenerate={onRegenerate}
              onDelete={onDelete}
              onSwitchVersion={onSwitchVersion}
            />
          </React.Fragment>
        ))
      )}
      <div ref={messagesEndRef} />
    </Box>
  );
};

export default MessageList;
