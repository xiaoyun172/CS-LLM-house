import React from 'react';
import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import type { ToolbarButtonProps } from './types';

interface ToolbarButtonComponentProps extends ToolbarButtonProps {
  /**
   * 按钮图标
   */
  icon?: ReactNode;
  
  /**
   * 按钮文字
   */
  label: string;
  
  /**
   * 点击事件处理函数
   */
  onClick?: () => void;
  
  /**
   * 是否激活状态
   */
  isActive?: boolean;
  
  /**
   * 自定义颜色
   */
  color?: string;
  
  /**
   * 激活状态的颜色
   */
  activeColor?: string;
  
  /**
   * 自定义图标颜色
   */
  iconColor?: string;
  
  /**
   * 激活状态的图标颜色
   */
  activeIconColor?: string;
  
  /**
   * 自定义背景色
   */
  bgColor?: string;
  
  /**
   * 激活状态的背景色
   */
  activeBgColor?: string;
}

/**
 * 通用工具栏按钮组件
 */
const ToolbarButton: React.FC<ToolbarButtonComponentProps> = ({
  displayStyle,
  isDarkMode,
  icon,
  label,
  onClick,
  isActive = false,
  color,
  activeColor = '#FFFFFF',
  iconColor,
  activeIconColor = '#FFFFFF',
  bgColor,
  activeBgColor
}) => {
  // 计算实际使用的背景色
  const actualBgColor = isActive
    ? activeBgColor || (isDarkMode ? '#424242' : '#3b82f6')
    : bgColor || (isDarkMode ? '#1E1E1E' : '#FFFFFF');
  
  // 计算实际使用的文字颜色
  const actualColor = isActive
    ? activeColor
    : color || (isDarkMode ? '#FFFFFF' : '#3b82f6');
    
  // 计算实际使用的图标颜色
  const actualIconColor = isActive
    ? activeIconColor
    : iconColor || (isDarkMode ? '#9E9E9E' : '#3b82f6');
    
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        background: actualBgColor,
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        color: actualColor,
        border: `1px solid ${isDarkMode ? 'rgba(60, 60, 60, 0.8)' : 'rgba(230, 230, 230, 0.8)'}`,
        borderRadius: '50px',
        padding: '6px 12px',
        margin: '0 4px',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: `0 1px 3px ${isDarkMode ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.07)'}`,
        transition: 'all 0.2s ease',
        minWidth: 'max-content',
        userSelect: 'none',
        '&:hover': onClick ? {
          boxShadow: `0 2px 4px ${isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.1)'}`,
          background: isActive
            ? actualBgColor // 保持激活状态的背景色
            : (isDarkMode ? 'rgba(40, 40, 40, 0.95)' : 'rgba(255, 255, 255, 0.95)')
        } : {},
        '&:active': onClick ? {
          transform: 'scale(0.98)'
        } : {}
      }}
    >
      {displayStyle !== 'text' && icon && (
        <Box sx={{ color: actualIconColor, mr: displayStyle === 'both' ? 0.5 : 0 }}>
          {icon}
        </Box>
      )}
      {displayStyle !== 'icon' && (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            fontSize: '13px',
            color: isActive ? activeColor : 'inherit'
          }}
        >
          {label}
        </Typography>
      )}
    </Box>
  );
};

export default ToolbarButton; 