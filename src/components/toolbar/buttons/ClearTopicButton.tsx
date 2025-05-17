import React from 'react';
import { Box, Typography } from '@mui/material';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import type { ToolbarButtonProps } from './types';

interface ClearTopicButtonProps extends ToolbarButtonProps {
  /**
   * 清除话题的回调函数
   */
  onClearTopic?: () => void;
}

/**
 * 清除话题按钮组件
 */
const ClearTopicButton: React.FC<ClearTopicButtonProps> = ({ 
  displayStyle, 
  isDarkMode,
  onClearTopic 
}) => {
  return (
    <Box
      onClick={onClearTopic}
      sx={{
        display: 'flex',
        alignItems: 'center',
        background: isDarkMode ? '#1E1E1E' : '#FFFFFF',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        color: isDarkMode ? '#FFFFFF' : '#2196F3', 
        border: `1px solid ${isDarkMode ? 'rgba(60, 60, 60, 0.8)' : 'rgba(230, 230, 230, 0.8)'}`,
        borderRadius: '50px',
        padding: '6px 12px',
        margin: '0 4px',
        cursor: 'pointer',
        boxShadow: `0 1px 3px ${isDarkMode ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.07)'}`,
        transition: 'all 0.2s ease',
        minWidth: 'max-content',
        userSelect: 'none',
        '&:hover': {
          boxShadow: `0 2px 4px ${isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.1)'}`,
          background: isDarkMode ? 'rgba(40, 40, 40, 0.95)' : 'rgba(255, 255, 255, 0.95)'
        },
        '&:active': {
          transform: 'scale(0.98)'
        }
      }}
    >
      {displayStyle !== 'text' && (
        <DeleteSweepIcon 
          sx={{ 
            fontSize: '18px', 
            color: isDarkMode ? '#9E9E9E' : '#2196F3'
          }} 
        />
      )}
      {displayStyle !== 'icon' && (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            fontSize: '13px',
            ml: displayStyle === 'both' ? 0.5 : 0
          }}
        >
          清空内容
        </Typography>
      )}
    </Box>
  );
};

export default ClearTopicButton; 