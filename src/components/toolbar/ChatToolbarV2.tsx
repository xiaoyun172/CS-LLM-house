import React, { useRef, useState } from 'react';
import { Box, useTheme } from '@mui/material';
import { useSelector } from 'react-redux';
import type { RootState } from '../../shared/store';
import NewTopicButton from './buttons/NewTopicButton';
import ClearTopicButton from './buttons/ClearTopicButton';
import GenerateImageButton from './buttons/GenerateImageButton';
import WebSearchButton from './buttons/WebSearchButton';
import type { ToolbarDisplayStyle } from './buttons/types';

interface ChatToolbarV2Props {
  onClearTopic?: () => void;
  imageGenerationMode?: boolean;
  toggleImageGenerationMode?: () => void;
  webSearchActive?: boolean;
  toggleWebSearch?: () => void;
}

/**
 * 聊天工具栏V2组件 - 使用模块化按钮设计
 * 提供新建话题和清空话题内容功能
 * 使用独立气泡式设计，支持横向滑动
 */
const ChatToolbarV2: React.FC<ChatToolbarV2Props> = ({
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

  // 从Redux获取网络搜索设置和工具栏显示样式
  const webSearchEnabled = useSelector((state: RootState) => state.webSearch?.enabled || false);
  const toolbarDisplayStyle = useSelector((state: RootState) =>
    (state.settings as any).toolbarDisplayStyle || 'both'
  ) as ToolbarDisplayStyle;

  // 处理拖动滑动相关函数
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

  return (
    <Box
      sx={{
        padding: '0 0 2px 0',
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
          minHeight: '38px',
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
        {/* 新建话题按钮 */}
        <NewTopicButton
          displayStyle={toolbarDisplayStyle}
          isDarkMode={isDarkMode}
        />

        {/* 清空内容按钮 */}
        <ClearTopicButton
          displayStyle={toolbarDisplayStyle}
          isDarkMode={isDarkMode}
          onClearTopic={onClearTopic}
        />

        {/* 生成图片按钮 */}
        <GenerateImageButton
          displayStyle={toolbarDisplayStyle}
          isDarkMode={isDarkMode}
          imageGenerationMode={imageGenerationMode}
          toggleImageGenerationMode={toggleImageGenerationMode}
        />

        {/* 网络搜索按钮 - 只在网络搜索功能启用时显示 */}
        {webSearchEnabled && toggleWebSearch && (
          <WebSearchButton
            displayStyle={toolbarDisplayStyle}
            isDarkMode={isDarkMode}
            webSearchActive={webSearchActive}
            toggleWebSearch={toggleWebSearch}
          />
        )}
      </Box>
    </Box>
  );
};

export default ChatToolbarV2;