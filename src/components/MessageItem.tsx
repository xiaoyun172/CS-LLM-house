import React from 'react';
import { Paper, Typography, Box, Avatar, CircularProgress } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useSelector } from 'react-redux';
import type { Message } from '../shared/types';
import type { RootState } from '../shared/store';
import ThinkingProcess from '../components/message/ThinkingProcess';
import MessageActions from '../components/message/MessageActions';
import { estimateTokens } from '../shared/utils';

interface MessageItemProps {
  message: Message;
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, onRegenerate, onDelete }) => {
  const currentTopic = useSelector((state: RootState) => state.messages.currentTopic);
  
  const isUser = message.role === 'user';
  const isError = message.status === 'error';
  const isPending = message.status === 'pending';
  
  // 获取思考过程
  const reasoning = message.reasoning;
  const reasoningTime = message.reasoningTime;
  
  // Token计数
  const tokenCount = estimateTokens(message.content);
  const tokenStr = `~${tokenCount} tokens`;

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: isUser ? 'row-reverse' : 'row',
        mb: 2,
        mx: 2,
        alignItems: 'flex-start',
        position: 'relative',
      }}
    >
      <Avatar 
        alt={isUser ? "用户" : "AI"}
        src={isUser ? "" : "/assets/ai-avatar.png"}
        sx={{ 
          width: 36, 
          height: 36, 
          bgcolor: isUser ? '#87d068' : '#1677ff',
          mr: isUser ? 0 : 1.5,
          ml: isUser ? 1.5 : 0,
          mt: '4px'
        }}
      >
        {isUser ? "我" : "AI"}
      </Avatar>
      
      <Box sx={{ maxWidth: { xs: '85%', sm: '75%', md: '70%' }, display: 'flex', flexDirection: 'column' }}>
        {/* 思考过程组件 */}
        {!isUser && reasoning && <ThinkingProcess reasoning={reasoning} reasoningTime={reasoningTime} />}
        
        <Box sx={{ position: 'relative' }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              backgroundColor: isUser ? '#95ec69' : '#ffffff', // 微信风格的绿色用户气泡和白色AI气泡
              color: '#000000', // 黑色文字
              boxShadow: isError ? '0 1px 2px rgba(255, 0, 0, 0.1)' : '0 1px 2px rgba(0, 0, 0, 0.1)',
              border: isUser ? 'none' : '1px solid #f0f0f0',
              position: 'relative',
              pr: 4, // 为操作按钮留出空间
              mt: message.alternateVersions?.length ? 2.5 : 0, // 调整空间大小，确保版本标签显示完整
              minWidth: '120px', // 确保最小宽度足够显示版本标签
            }}
          >
            {isError && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ErrorOutlineIcon color="error" fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="caption" color="error" fontWeight="medium">
                  发生错误
                </Typography>
              </Box>
            )}
            
            {isPending ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <ReactMarkdown
                components={{
                  code({className, children, ...props}) {
                    const match = /language-(\w+)/.exec(className || '')
                    const isInline = !match && !className;
                    return !isInline && match ? (
                      <SyntaxHighlighter
                        // @ts-ignore
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    )
                  }
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
            
            {/* 显示Token计数 */}
            {!isPending && message.content && (
              <Box 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'flex-end', 
                  mt: 1,
                  opacity: 0.5,
                  fontSize: '0.7rem'
                }}
              >
                <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                  {tokenStr}
                </Typography>
              </Box>
            )}
            
            {/* 添加消息操作组件 */}
            <MessageActions 
              message={message} 
              topicId={currentTopic?.id}
              onRegenerate={onRegenerate}
              onDelete={onDelete}
            />
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default MessageItem;
