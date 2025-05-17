import React from 'react';
import { Box, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { TopicService } from '../../../shared/services/TopicService';
import type { ToolbarButtonProps } from '../buttons/types';

/**
 * 新建话题按钮组件
 */
const NewTopicButton: React.FC<ToolbarButtonProps> = ({ 
  displayStyle, 
  isDarkMode 
}) => {
  // 创建新话题 - 使用统一的TopicService
  const handleCreateTopic = async () => {
    await TopicService.createNewTopic();
  };
  
  return (
    <Box
      onClick={handleCreateTopic}
      sx={{
        display: 'flex',
        alignItems: 'center',
        background: isDarkMode ? '#1E1E1E' : '#FFFFFF',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        color: isDarkMode ? '#FFFFFF' : '#4CAF50',
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
        <AddIcon 
          sx={{ 
            fontSize: '18px', 
            color: isDarkMode ? '#9E9E9E' : '#4CAF50'
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
          新建话题
        </Typography>
      )}
    </Box>
  );
};

export default NewTopicButton; 