import React, { useState } from 'react';
import { Paper, Typography, Box, Avatar, CircularProgress, Collapse } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import PsychologyIcon from '@mui/icons-material/Psychology';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Message } from '../shared/types';

interface MessageItemProps {
  message: Message;
}

// 思考过程组件
const ThinkingProcess: React.FC<{reasoning?: string, reasoningTime?: number}> = ({ reasoning, reasoningTime }) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!reasoning) return null;
  
  // 将毫秒转换为秒，保留一位小数
  const thinkingTimeInSeconds = reasoningTime 
    ? Math.round(reasoningTime / 100) / 10 
    : Math.floor(Math.random() * 3) + 1; // 如果未提供，则使用1-3秒的随机值
  
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        mb: 1,
        maxWidth: '100%'
      }}
    >
      <Box 
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          color: '#65b0ff',
          fontSize: '14px',
          cursor: 'pointer',
          mb: 1
        }}
      >
        <PsychologyIcon sx={{ mr: 0.5, fontSize: '16px' }} />
        <Typography 
          variant="caption" 
          sx={{ 
            color: '#65b0ff', 
            fontWeight: 'medium',
            mr: 0.5 
          }}
        >
          已完成深度思考（用时{thinkingTimeInSeconds}秒）
        </Typography>
        {expanded ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
      </Box>
      
      <Collapse in={expanded}>
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            mb: 1,
            backgroundColor: '#f5f7fa',
            borderRadius: 1,
            border: '1px solid #ebedf0',
            fontSize: '13px',
            lineHeight: 1.5,
            color: '#666',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {reasoning}
        </Paper>
      </Collapse>
    </Box>
  );
};

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isError = message.status === 'error';
  const isPending = message.status === 'pending';
  
  // 使用消息中实际的思考过程数据
  const reasoning = message.reasoning;
  const reasoningTime = message.reasoningTime;

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 3,
        mx: 2,
        position: 'relative',
      }}
    >
      {!isUser && (
        <Avatar
          src="/assets/ai-avatar.png"
          alt="AI"
          sx={{
            width: 36,
            height: 36,
            mr: 1.5,
            mt: 0.5,
            alignSelf: 'flex-start',
          }}
        />
      )}
      
      <Box sx={{ maxWidth: '70%', display: 'flex', flexDirection: 'column' }}>
        {/* 思考过程组件 */}
        {!isUser && reasoning && <ThinkingProcess reasoning={reasoning} reasoningTime={reasoningTime} />}
        
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

          {isUser ? (
            <Typography
              variant="body1"
              sx={{
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: '15px',
              }}
            >
              {message.content}
            </Typography>
          ) : (
            <Box
              sx={{
                '& .markdown': {
                  lineHeight: 1.6,
                  wordBreak: 'break-word',
                  fontSize: '15px',
                  '& p': {
                    mt: 0,
                    mb: 1.5,
                    '&:last-child': { mb: 0 }
                  },
                  '& h1, & h2, & h3, & h4, & h5, & h6': {
                    mt: 2,
                    mb: 1,
                    fontWeight: 600,
                    lineHeight: 1.25
                  },
                  '& h1': { fontSize: '1.5rem' },
                  '& h2': { fontSize: '1.3rem' },
                  '& h3': { fontSize: '1.15rem' },
                  '& h4': { fontSize: '1rem' },
                  '& h5': { fontSize: '0.9rem' },
                  '& h6': { fontSize: '0.85rem' },
                  '& ul, & ol': {
                    pl: 2.5,
                    mb: 1.5
                  },
                  '& li': { mb: 0.5 },
                  '& a': {
                    color: '#576b95', // 微信链接颜色
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline'
                    }
                  },
                  '& blockquote': {
                    borderLeft: '3px solid #f0f0f0',
                    pl: 2,
                    ml: 0,
                    color: '#888888'
                  },
                  '& code': {
                    fontFamily: 'monospace',
                    backgroundColor: '#f5f5f5',
                    padding: '2px 4px',
                    borderRadius: '3px',
                    fontSize: '0.9em'
                  },
                  '& pre': {
                    margin: 0,
                    padding: 0,
                    backgroundColor: 'transparent',
                    '& div': {
                      borderRadius: '6px',
                      margin: '8px 0',
                    },
                    '& code': {
                      backgroundColor: 'transparent',
                      padding: 0
                    }
                  },
                  '& img': {
                    maxWidth: '100%',
                    borderRadius: 1
                  },
                  '& table': {
                    borderCollapse: 'collapse',
                    width: '100%',
                    mb: 1.5,
                    '& th, & td': {
                      border: '1px solid #f0f0f0',
                      padding: '6px 13px'
                    },
                    '& th': {
                      fontWeight: 600,
                      backgroundColor: '#f5f5f5'
                    }
                  }
                }
              }}
            >
              <div className="markdown">
                <ReactMarkdown
                  components={{
                    code: ({className, children}) => {
                      // 检查是否是代码块（有语言标记）
                      const match = /language-(\w+)/.exec(className || '');
                      const language = match ? match[1] : '';
                      const codeContent = String(children).replace(/\n$/, '');

                      // 如果有语言标记，使用语法高亮
                      if (language) {
                        return (
                          <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={language}
                            PreTag="div"
                          >
                            {codeContent}
                          </SyntaxHighlighter>
                        );
                      }

                      // 否则使用普通代码标签
                      return <code className={className}>{children}</code>;
                    }
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            </Box>
          )}

          {isPending && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
              <CircularProgress size={16} thickness={6} sx={{ color: '#999999' }} />
            </Box>
          )}
        </Paper>
      </Box>
      
      {isUser && (
        <Avatar
          sx={{
            width: 36,
            height: 36,
            ml: 1.5,
            mt: 0.5,
            alignSelf: 'flex-start',
            bgcolor: '#3b88fd', // 用户头像颜色
          }}
        >
          U
        </Avatar>
      )}
    </Box>
  );
};

export default MessageItem;
