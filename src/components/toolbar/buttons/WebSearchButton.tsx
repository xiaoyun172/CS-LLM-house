import React from 'react';
import SearchIcon from '@mui/icons-material/Search';
import type { ToolbarButtonProps } from './types';
import ToolbarButton from './ToolbarButton';

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
 * 网络搜索按钮组件 - 使用通用按钮组件
 */
const WebSearchButton: React.FC<WebSearchButtonProps> = ({
  displayStyle,
  isDarkMode,
  webSearchActive = false,
  toggleWebSearch
}) => {
  return (
    <ToolbarButton
      displayStyle={displayStyle}
      isDarkMode={isDarkMode}
      icon={<SearchIcon sx={{ fontSize: '18px' }} />}
      label={webSearchActive ? '关闭搜索' : '网络搜索'}
      onClick={toggleWebSearch}
      isActive={webSearchActive}
      color={isDarkMode ? '#FFFFFF' : '#3b82f6'}
      iconColor={isDarkMode ? '#9E9E9E' : '#3b82f6'}
      activeBgColor={isDarkMode ? '#424242' : '#3b82f6'}
    />
  );
};

export default WebSearchButton;