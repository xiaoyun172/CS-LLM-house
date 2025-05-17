import React from 'react';
import { Box, Typography } from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import type { ToolbarButtonProps } from './types';

interface GenerateImageButtonProps extends ToolbarButtonProps {
  /**
   * 是否处于图像生成模式
   */
  imageGenerationMode?: boolean;
  
  /**
   * 切换图像生成模式的回调函数
   */
  toggleImageGenerationMode?: () => void;
}

/**
 * 生成图片按钮组件
 */
const GenerateImageButton: React.FC<GenerateImageButtonProps> = ({ 
  displayStyle, 
  isDarkMode,
  imageGenerationMode = false,
  toggleImageGenerationMode
}) => {
  return (
    <Box
      onClick={toggleImageGenerationMode}
      sx={{
        display: 'flex',
        alignItems: 'center',
        background: imageGenerationMode 
          ? (isDarkMode ? '#424242' : '#9C27B0') 
          : (isDarkMode ? '#1E1E1E' : '#FFFFFF'),
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        color: imageGenerationMode 
          ? '#FFFFFF'
          : (isDarkMode ? '#FFFFFF' : '#9C27B0'),
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
          background: imageGenerationMode
            ? (isDarkMode ? '#424242' : '#9C27B0') // 保持图片生成模式的背景色
            : (isDarkMode ? 'rgba(40, 40, 40, 0.95)' : 'rgba(255, 255, 255, 0.95)')
        },
        '&:active': {
          transform: 'scale(0.98)'
        }
      }}
    >
      {displayStyle !== 'text' && (
        <ImageIcon 
          sx={{ 
            fontSize: '18px', 
            color: imageGenerationMode ? '#FFFFFF' : isDarkMode ? '#9E9E9E' : '#9C27B0'
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
            color: imageGenerationMode ? '#FFFFFF' : 'inherit'
          }}
        >
          {imageGenerationMode ? '取消生成' : '生成图片'}
        </Typography>
      )}
    </Box>
  );
};

export default GenerateImageButton; 