import React, { useState } from 'react';
import { Paper, Typography, Box, Collapse } from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

interface ThinkingProcessProps {
  reasoning?: string;
  reasoningTime?: number;
}

const ThinkingProcess: React.FC<ThinkingProcessProps> = ({ reasoning, reasoningTime }) => {
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

export default ThinkingProcess; 