import React, { useRef, useState } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import ImageIcon from '@mui/icons-material/Image';
import SearchIcon from '@mui/icons-material/Search';
import { useSelector } from 'react-redux';
import type { RootState } from '../shared/store';
import { TopicService } from '../shared/services/TopicService';

interface ChatToolbarProps {
  onClearTopic?: () => void;
  imageGenerationMode?: boolean; // 是否处于图像生成模式
  toggleImageGenerationMode?: () => void; // 切换图像生成模式
  webSearchActive?: boolean; // 是否处于网络搜索模式
  toggleWebSearch?: () => void; // 切换网络搜索模式
}

/**
 * 聊天工具栏组件
 * 提供新建话题和清空话题内容功能
 * 使用独立气泡式设计，支持横向滑动
 */
const ChatToolbar: React.FC<ChatToolbarProps> = ({
  onClearTopic,
  imageGenerationMode = false,
  toggleImageGenerationMode,
  webSearchActive = false,
  toggleWebSearch
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  // 从Redux获取网络搜索设置
  const webSearchEnabled = useSelector((state: RootState) => state.webSearch?.enabled || false);
  
  // 获取工具栏显示样式设置
  const toolbarDisplayStyle = useSelector((state: RootState) => 
    (state.settings as any).toolbarDisplayStyle || 'both'
  );

  // 创建新话题 - 使用统一的TopicService
  const handleCreateTopic = async () => {
    await TopicService.createNewTopic();
  };

  // 处理拖动滑动
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current!.offsetLeft);
    setScrollLeft(scrollRef.current!.scrollLeft);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current!.offsetLeft;
    const walk = (x - startX) * 2; // 滚动速度
    scrollRef.current!.scrollLeft = scrollLeft - walk;
  };

  // 触摸设备的处理
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setStartX(e.touches[0].pageX - scrollRef.current!.offsetLeft);
    setScrollLeft(scrollRef.current!.scrollLeft);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const x = e.touches[0].pageX - scrollRef.current!.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current!.scrollLeft = scrollLeft - walk;
  };

  // 气泡按钮数据
  const buttons = [
    {
      id: 'new-topic',
      icon: <AddIcon sx={{ fontSize: '18px', color: isDarkMode ? '#9E9E9E' : '#4CAF50' }} />,
      label: '新建话题',
      onClick: handleCreateTopic,
      color: '#FFFFFF', // 白色文字
      bgColor: isDarkMode ? '#1E1E1E' : '#FFFFFF'
    },
    {
      id: 'clear-topic',
      icon: <DeleteSweepIcon sx={{ fontSize: '18px', color: isDarkMode ? '#9E9E9E' : '#2196F3' }} />,
      label: '清空内容',
      onClick: onClearTopic,
      color: '#FFFFFF', // 白色文字
      bgColor: isDarkMode ? '#1E1E1E' : '#FFFFFF'
    },
    {
      id: 'generate-image',
      icon: <ImageIcon sx={{ fontSize: '18px', color: imageGenerationMode ? '#FFFFFF' : isDarkMode ? '#9E9E9E' : '#9C27B0' }} />,
      label: imageGenerationMode ? '取消生成' : '生成图片',
      onClick: toggleImageGenerationMode,
      color: '#FFFFFF', // 白色文字
      bgColor: imageGenerationMode ? (isDarkMode ? '#424242' : '#9C27B0') : isDarkMode ? '#1E1E1E' : '#FFFFFF' // 激活时背景色变深
    }
  ];
  
  // 如果网络搜索已启用，添加网络搜索按钮
  if (webSearchEnabled && toggleWebSearch) {
    buttons.push({
      id: 'web-search',
      icon: <SearchIcon sx={{ fontSize: '18px', color: webSearchActive ? '#FFFFFF' : isDarkMode ? '#9E9E9E' : '#3b82f6' }} />,
      label: webSearchActive ? '关闭搜索' : '网络搜索',
      onClick: toggleWebSearch,
      color: '#FFFFFF', // 白色文字
      bgColor: webSearchActive ? (isDarkMode ? '#424242' : '#3b82f6') : isDarkMode ? '#1E1E1E' : '#FFFFFF' // 激活时背景色变深
    });
  }

  return (
    <Box
      sx={{
        padding: '0 0 2px 0', // 减小底部padding
        backgroundColor: 'transparent',
        borderBottom: 'none',
        width: '100%',
        position: 'relative',
        overflow: 'visible',
        zIndex: 1,
        marginBottom: '0',
        boxShadow: 'none',
        backdropFilter: 'none'
      }}
    >
      <Box
        ref={scrollRef}
        sx={{
          display: 'flex',
          overflowX: 'auto',
          padding: '0 8px',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': {
            display: 'none'
          },
          whiteSpace: 'nowrap',
          minHeight: '38px', // 稍微减小高度
          alignItems: 'center',
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      >
        {buttons.map((button) => (
          <Box
            key={button.id}
            onClick={button.onClick}
            sx={{
              display: 'flex',
              alignItems: 'center',
              background: button.bgColor || (isDarkMode ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)'), // 根据主题使用不同背景色
              backdropFilter: 'blur(5px)', // 毛玻璃效果
              WebkitBackdropFilter: 'blur(5px)', // Safari支持
              color: isDarkMode ? '#FFFFFF' : button.id === 'new-topic' ? '#4CAF50' : button.id === 'clear-topic' ? '#2196F3' : button.id === 'generate-image' ? (imageGenerationMode ? '#FFFFFF' : '#9C27B0') : button.id === 'web-search' ? (webSearchActive ? '#FFFFFF' : '#3b82f6') : button.color,
              border: `1px solid ${isDarkMode ? 'rgba(60, 60, 60, 0.8)' : 'rgba(230, 230, 230, 0.8)'}`,
              borderRadius: '50px',
              padding: '6px 12px', // 减小padding
              margin: '0 4px',
              cursor: 'pointer',
              boxShadow: `0 1px 3px ${isDarkMode ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.07)'}`,
              transition: 'all 0.2s ease',
              minWidth: 'max-content',
              userSelect: 'none',
              '&:hover': {
                boxShadow: `0 2px 4px ${isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.1)'}`,
                background: button.id === 'web-search' && webSearchActive
                  ? button.bgColor // 保持激活状态的背景色
                  : button.id === 'generate-image' && imageGenerationMode
                    ? button.bgColor // 保持图片生成模式的背景色
                    : isDarkMode ? 'rgba(40, 40, 40, 0.95)' : 'rgba(255, 255, 255, 0.95)' // 根据主题设置悬停背景色
              },
              '&:active': {
                transform: 'scale(0.98)'
              }
            }}
          >
            {toolbarDisplayStyle !== 'text' && button.icon}
            {toolbarDisplayStyle !== 'icon' && (
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  fontSize: '13px',
                  ml: toolbarDisplayStyle === 'both' ? 0.5 : 0
                }}
              >
                {button.label}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default ChatToolbar; 