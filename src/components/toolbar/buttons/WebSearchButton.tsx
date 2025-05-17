import React from 'react';
import { Box, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import type { ToolbarButtonProps } from './types';

interface WebSearchButtonProps extends ToolbarButtonProps {
  /**
   * 是否处于网络搜索模式
   */
  webSearchActive?: boolean;
  
  /**
   * 切换网络搜索模式的回调函数
   */
  toggleWebSearch?: () => void;
}

/**
 * 网络搜索按钮组件
 */
const WebSearchButton: React.FC<WebSearchButtonProps> = ({ 
  displayStyle, 
  isDarkMode,
  webSearchActive = false,
  toggleWebSearch
}) => {
  return (
    <Box
      onClick={toggleWebSearch}
      sx={{
        display: 'flex',
        alignItems: 'center',
        background: webSearchActive 
          ? (isDarkMode ? '#424242' : '#3b82f6') 
          : (isDarkMode ? '#1E1E1E' : '#FFFFFF'),
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        color: webSearchActive 
          ? '#FFFFFF'
          : (isDarkMode ? '#FFFFFF' : '#3b82f6'),
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
          background: webSearchActive
            ? (isDarkMode ? '#424242' : '#3b82f6') // 保持激活状态的背景色
            : (isDarkMode ? 'rgba(40, 40, 40, 0.95)' : 'rgba(255, 255, 255, 0.95)')
        },
        '&:active': {
          transform: 'scale(0.98)'
        }
      }}
    >
      {displayStyle !== 'text' && (
        <SearchIcon 
          sx={{ 
            fontSize: '18px', 
            color: webSearchActive ? '#FFFFFF' : isDarkMode ? '#9E9E9E' : '#3b82f6'
          }} 
        />
      )}
      {displayStyle !== 'icon' && (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            fontSize: '13px',
            ml: displayStyle === 'both' ? 0.5 : 0,
            color: webSearchActive ? '#FFFFFF' : 'inherit'
          }}
        >
          {webSearchActive ? '关闭搜索' : '网络搜索'}
        </Typography>
      )}
    </Box>
  );
};

export default WebSearchButton; 