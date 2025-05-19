import React from 'react';
import { Box, Typography, Paper, useTheme } from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';
import PsychologyIcon from '@mui/icons-material/Psychology';
import type { ChatTopic, Assistant } from '../shared/types/Assistant';

interface SystemPromptBubbleProps {
  topic: ChatTopic | null;
  assistant: Assistant | null;
  onClick: () => void;
}

/**
 * 系统提示词气泡组件
 * 显示在消息列表顶部，点击可以编辑系统提示词
 */
const SystemPromptBubble: React.FC<SystemPromptBubbleProps> = ({ topic, assistant, onClick }) => {
  const theme = useTheme();

  // 获取系统提示词 - 优先使用话题的提示词
  // 如果没有话题或助手，或者没有提示词，使用默认文本
  const systemPrompt = 
    (topic?.prompt || assistant?.systemPrompt || '点击此处编辑系统提示词');

  // 检测组件是否会被渲染
  console.log('[SystemPromptBubble] 渲染系统提示词气泡:', { 
    hasTopic: !!topic, 
    hasAssistant: !!assistant,
    promptText: systemPrompt.substring(0, 30) + (systemPrompt.length > 30 ? '...' : '')
  });

  return (
    <Paper
      elevation={1}
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        margin: '4px 8px 16px 8px',
        borderRadius: '8px',
        cursor: 'pointer',
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(25, 118, 210, 0.08)' 
          : 'rgba(25, 118, 210, 0.04)',
        border: `1px solid ${theme.palette.primary.main}`,
        borderColor: theme.palette.mode === 'dark' 
          ? 'rgba(25, 118, 210, 0.5)' 
          : 'rgba(25, 118, 210, 0.25)',
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(25, 118, 210, 0.15)' 
            : 'rgba(25, 118, 210, 0.08)',
          borderColor: theme.palette.primary.main,
        },
        position: 'relative',
        zIndex: 10
      }}
    >
      <PsychologyIcon 
        fontSize="small" 
        sx={{ 
          mr: 1.5, 
          color: theme.palette.primary.main,
          fontSize: '20px'
        }} 
      />
      
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <Typography 
          variant="caption" 
          component="div"
          sx={{
            color: theme.palette.mode === 'dark' 
              ? theme.palette.primary.light 
              : theme.palette.primary.main,
            fontSize: '12px',
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {systemPrompt}
        </Typography>
      </Box>
      
      <EditNoteIcon 
        fontSize="small" 
        sx={{ 
          ml: 1, 
          color: theme.palette.primary.main,
          fontSize: '18px'
        }} 
      />
    </Paper>
  );
};

export default SystemPromptBubble; 