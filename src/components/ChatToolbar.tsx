import React, { useRef, useState, useEffect } from 'react';
import { Box, Typography, useTheme, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import WarningIcon from '@mui/icons-material/Warning';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SearchIcon from '@mui/icons-material/Search';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../shared/store';
import { TopicService } from '../shared/services/TopicService';
import { EventEmitter, EVENT_NAMES } from '../shared/services/EventService';
import { newMessagesActions } from '../shared/store/slices/newMessagesSlice';
import { updateSettings } from '../shared/store/settingsSlice';
import WebSearchProviderSelector from './WebSearchProviderSelector';
import MCPToolsButton from './chat/MCPToolsButton';

interface ChatToolbarProps {
  onClearTopic?: () => void;
  imageGenerationMode?: boolean; // 是否处于图像生成模式
  toggleImageGenerationMode?: () => void; // 切换图像生成模式
  webSearchActive?: boolean; // 是否处于网络搜索模式
  toggleWebSearch?: () => void; // 切换网络搜索模式
  toolsEnabled?: boolean; // 是否启用工具调用
  onToolsEnabledChange?: (enabled: boolean) => void; // 切换工具调用
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
  toggleWebSearch,
  onToolsEnabledChange
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [showProviderSelector, setShowProviderSelector] = useState(false);
  const [clearConfirmMode, setClearConfirmMode] = useState(false);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const dispatch = useDispatch();

  // 从Redux获取网络搜索设置
  const webSearchSettings = useSelector((state: RootState) => state.webSearch);
  const webSearchEnabled = webSearchSettings?.enabled || false;
  const currentProvider = webSearchSettings?.provider;

  // 获取工具栏显示样式设置
  const toolbarDisplayStyle = useSelector((state: RootState) =>
    (state.settings as any).toolbarDisplayStyle || 'both'
  );

  // 获取输入框风格设置
  const inputBoxStyle = useSelector((state: RootState) =>
    (state.settings as any).inputBoxStyle || 'default'
  );

  // 获取工具栏折叠状态
  const toolbarCollapsedFromStore = useSelector((state: RootState) =>
    (state.settings as any).toolbarCollapsed || false
  );

  // 使用本地状态来立即响应UI变化，避免等待异步保存
  const [localToolbarCollapsed, setLocalToolbarCollapsed] = useState(toolbarCollapsedFromStore);

  // 防抖保存的引用
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 根据风格获取工具栏样式
  const getToolbarStyles = () => {
    const baseStyles = {
      buttonBg: isDarkMode ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)',
      buttonBorder: isDarkMode ? 'rgba(60, 60, 60, 0.8)' : 'rgba(230, 230, 230, 0.8)',
      buttonShadow: isDarkMode ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.07)',
      hoverBg: isDarkMode ? 'rgba(40, 40, 40, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      hoverShadow: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.1)',
      borderRadius: '50px',
      backdropFilter: 'blur(5px)'
    };

    switch (inputBoxStyle) {
      case 'modern':
        return {
          ...baseStyles,
          buttonBg: isDarkMode
            ? 'linear-gradient(135deg, rgba(45, 45, 45, 0.9) 0%, rgba(35, 35, 35, 0.9) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
          buttonBorder: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          buttonShadow: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
          hoverBg: isDarkMode
            ? 'linear-gradient(135deg, rgba(55, 55, 55, 0.95) 0%, rgba(45, 45, 45, 0.95) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%)',
          hoverShadow: isDarkMode ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.15)',
          borderRadius: '16px',
          backdropFilter: 'blur(10px)'
        };
      case 'minimal':
        return {
          ...baseStyles,
          buttonBg: isDarkMode ? 'rgba(40, 40, 40, 0.6)' : 'rgba(255, 255, 255, 0.7)',
          buttonBorder: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
          buttonShadow: 'none',
          hoverBg: isDarkMode ? 'rgba(50, 50, 50, 0.8)' : 'rgba(255, 255, 255, 0.9)',
          hoverShadow: 'none',
          borderRadius: '12px',
          backdropFilter: 'none'
        };
      default:
        return baseStyles;
    }
  };

  const toolbarStyles = getToolbarStyles();

  // 处理清空内容的二次确认
  const handleClearTopic = () => {
    if (clearConfirmMode) {
      // 第二次点击，执行清空
      onClearTopic?.();
      setClearConfirmMode(false);
    } else {
      // 第一次点击，进入确认模式
      setClearConfirmMode(true);
    }
  };

  // 自动重置确认模式（3秒后）
  useEffect(() => {
    if (clearConfirmMode) {
      const timer = setTimeout(() => {
        setClearConfirmMode(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [clearConfirmMode]);

  // 统一图标样式
  const getIconStyle = (isActive: boolean, defaultColor: string, activeColor?: string) => ({
    fontSize: '18px',
    color: isActive && activeColor ? activeColor : isDarkMode ? '#9E9E9E' : defaultColor
  });

  // 同步本地状态与store状态
  useEffect(() => {
    setLocalToolbarCollapsed(toolbarCollapsedFromStore);
  }, [toolbarCollapsedFromStore]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // 切换工具栏折叠状态
  const toggleToolbarCollapse = () => {
    const newCollapsedState = !localToolbarCollapsed;
    // 立即更新本地状态，提供即时反馈
    setLocalToolbarCollapsed(newCollapsedState);

    // 清除之前的保存定时器
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // 防抖保存：500ms后才保存到store，避免频繁点击时的性能问题
    saveTimeoutRef.current = setTimeout(() => {
      dispatch(updateSettings({
        toolbarCollapsed: newCollapsedState
      }));
    }, 500);
  };

  // 创建新话题 - 使用统一的TopicService
  const handleCreateTopic = async () => {
    // 触发新建话题事件
    EventEmitter.emit(EVENT_NAMES.ADD_NEW_TOPIC);
    console.log('[ChatToolbar] Emitted ADD_NEW_TOPIC event.');

    // 创建新话题
    const newTopic = await TopicService.createNewTopic();

    // 如果成功创建话题，自动跳转到新话题
    if (newTopic) {
      console.log('[ChatToolbar] 成功创建新话题，自动跳转:', newTopic.id);

      // 设置当前话题 - 立即选择新创建的话题
      dispatch(newMessagesActions.setCurrentTopicId(newTopic.id));

      // 确保话题侧边栏显示并选中新话题
      setTimeout(() => {
        EventEmitter.emit(EVENT_NAMES.SHOW_TOPIC_SIDEBAR);

        // 再次确保新话题被选中，防止其他逻辑覆盖
        setTimeout(() => {
          dispatch(newMessagesActions.setCurrentTopicId(newTopic.id));
        }, 50);
      }, 100);
    }
  };

  // 优化的拖动滑动处理 - 增加齿轮感和流畅度
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // 移除折叠状态检查，因为折叠时工具栏已经隐藏
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current!.offsetLeft);
    setScrollLeft(scrollRef.current!.scrollLeft);
    // 添加抓取光标
    if (scrollRef.current) {
      scrollRef.current.style.cursor = 'grabbing';
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // 恢复光标
    if (scrollRef.current) {
      scrollRef.current.style.cursor = 'grab';
    }
    // 添加惯性滚动效果
    addInertiaScrolling();
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    if (scrollRef.current) {
      scrollRef.current.style.cursor = 'grab';
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current!.offsetLeft;
    const walk = (x - startX) * 1.5; // 调整滚动速度，更流畅
    const newScrollLeft = scrollLeft - walk;

    // 添加边界检查和回弹效果
    if (scrollRef.current) {
      const maxScroll = scrollRef.current.scrollWidth - scrollRef.current.clientWidth;
      if (newScrollLeft < 0) {
        scrollRef.current.scrollLeft = newScrollLeft * 0.3; // 回弹效果
      } else if (newScrollLeft > maxScroll) {
        scrollRef.current.scrollLeft = maxScroll + (newScrollLeft - maxScroll) * 0.3;
      } else {
        scrollRef.current.scrollLeft = newScrollLeft;
      }
    }
  };

  // 添加惯性滚动效果
  const addInertiaScrolling = () => {
    // 这里可以添加惯性滚动的实现
    // 暂时简化处理
  };

  // 触摸设备的处理 - 优化触摸体验
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    // 移除折叠状态检查，因为折叠时工具栏已经隐藏
    setIsDragging(true);
    setStartX(e.touches[0].pageX - scrollRef.current!.offsetLeft);
    setScrollLeft(scrollRef.current!.scrollLeft);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    addInertiaScrolling();
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const x = e.touches[0].pageX - scrollRef.current!.offsetLeft;
    const walk = (x - startX) * 1.5;
    const newScrollLeft = scrollLeft - walk;

    if (scrollRef.current) {
      const maxScroll = scrollRef.current.scrollWidth - scrollRef.current.clientWidth;
      if (newScrollLeft < 0) {
        scrollRef.current.scrollLeft = newScrollLeft * 0.3;
      } else if (newScrollLeft > maxScroll) {
        scrollRef.current.scrollLeft = maxScroll + (newScrollLeft - maxScroll) * 0.3;
      } else {
        scrollRef.current.scrollLeft = newScrollLeft;
      }
    }
  };

  // 气泡按钮数据
  const buttons = [
    {
      id: 'new-topic',
      icon: <AddIcon sx={getIconStyle(false, '#4CAF50')} />,
      label: '新建话题',
      onClick: handleCreateTopic,
      color: '#FFFFFF',
      bgColor: isDarkMode ? '#1E1E1E' : '#FFFFFF'
    },
    {
      id: 'clear-topic',
      icon: clearConfirmMode
        ? <WarningIcon sx={getIconStyle(true, '#f44336', '#FFFFFF')} />
        : <ClearAllIcon sx={getIconStyle(false, '#2196F3')} />,
      label: clearConfirmMode ? '确认清空' : '清空内容',
      onClick: handleClearTopic,
      color: '#FFFFFF',
      bgColor: clearConfirmMode
        ? (isDarkMode ? '#d32f2f' : '#f44336')
        : (isDarkMode ? '#1E1E1E' : '#FFFFFF')
    },
    {
      id: 'generate-image',
      icon: <PhotoCameraIcon sx={getIconStyle(imageGenerationMode, '#9C27B0', '#FFFFFF')} />,
      label: imageGenerationMode ? '取消生成' : '生成图片',
      onClick: toggleImageGenerationMode,
      color: '#FFFFFF',
      bgColor: imageGenerationMode ? (isDarkMode ? '#424242' : '#9C27B0') : isDarkMode ? '#1E1E1E' : '#FFFFFF'
    }
  ];

  // 处理网络搜索按钮点击
  const handleWebSearchClick = () => {
    if (webSearchActive) {
      // 如果当前处于搜索模式，则关闭搜索
      toggleWebSearch?.();
    } else {
      // 如果当前不在搜索模式，显示提供商选择器
      setShowProviderSelector(true);
    }
  };

  // 处理提供商选择
  const handleProviderSelect = (providerId: string) => {
    if (providerId && toggleWebSearch) {
      // 选择了提供商，激活搜索模式
      toggleWebSearch();
    }
  };

  // 如果网络搜索已启用，添加网络搜索按钮
  if (webSearchEnabled && toggleWebSearch) {
    const providerName = webSearchSettings?.providers?.find(p => p.id === currentProvider)?.name || '搜索';

    buttons.push({
      id: 'web-search',
      icon: <SearchIcon sx={getIconStyle(webSearchActive, '#3b82f6', '#FFFFFF')} />,
      label: webSearchActive ? '关闭搜索' : providerName,
      onClick: handleWebSearchClick,
      color: '#FFFFFF',
      bgColor: webSearchActive ? (isDarkMode ? '#424242' : '#3b82f6') : isDarkMode ? '#1E1E1E' : '#FFFFFF'
    });
  }

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
        backdropFilter: 'none',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          maxWidth: '800px',
          position: 'relative'
        }}
      >
        {/* 折叠按钮 - 左侧 */}
        <IconButton
          onClick={toggleToolbarCollapse}
          size="small"
          sx={{
            background: 'transparent', // 透明背景
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            border: 'none', // 无边框
            borderRadius: '50%',
            width: 32,
            height: 32,
            color: isDarkMode ? '#9E9E9E' : '#666',
            boxShadow: 'none', // 无阴影
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', // 优化过渡动画
            marginRight: 0.5, // 固定较小的间距
            flexShrink: 0, // 防止按钮被压缩
            willChange: 'transform, background-color, box-shadow', // 性能优化
            transform: 'translateZ(0)', // 启用硬件加速
            '&:hover': {
              background: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)', // 悬停时轻微背景
              boxShadow: 'none',
              transform: 'translateZ(0)'
            },
            '&:active': {
              transform: 'scale(0.95) translateZ(0)',
              transition: 'all 0.1s cubic-bezier(0.4, 0, 0.2, 1)' // 更快的点击反馈
            }
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: localToolbarCollapsed ? 'rotate(0deg)' : 'rotate(0deg)', // 可以添加旋转动画
              willChange: 'transform'
            }}
          >
            {localToolbarCollapsed ? (
              <ChevronRightIcon sx={{ fontSize: 18 }} />
            ) : (
              <ChevronLeftIcon sx={{ fontSize: 18 }} />
            )}
          </Box>
        </IconButton>

        {/* 工具栏内容 */}
        <Box
          sx={{
            display: localToolbarCollapsed ? 'none' : 'flex', // 简单的显示/隐藏
            alignItems: 'center',
            flex: 1, // 占据剩余空间
            overflow: 'hidden' // 防止溢出
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
              justifyContent: { xs: 'flex-start', md: 'center' },
              cursor: 'grab',
              willChange: 'transform', // 优化性能
              transform: 'translateZ(0)', // 启用硬件加速
              width: '100%', // 占满容器
              '&:active': {
                cursor: 'grabbing'
              }
            }}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
          >
          {/* MCP 按钮 - 合并工具开关和MCP工具功能 */}
          {onToolsEnabledChange && (
            <MCPToolsButton />
          )}
          {buttons.map((button) => (
            <Box
              key={button.id}
              onClick={button.onClick}
              sx={{
                display: 'flex',
                alignItems: 'center',
                background: button.bgColor || toolbarStyles.buttonBg,
                backdropFilter: toolbarStyles.backdropFilter,
                WebkitBackdropFilter: toolbarStyles.backdropFilter,
                color: isDarkMode ? '#FFFFFF' : button.id === 'new-topic' ? '#4CAF50' : button.id === 'clear-topic' ? (clearConfirmMode ? '#FFFFFF' : '#2196F3') : button.id === 'generate-image' ? (imageGenerationMode ? '#FFFFFF' : '#9C27B0') : button.id === 'web-search' ? (webSearchActive ? '#FFFFFF' : '#3b82f6') : button.color,
                border: `1px solid ${toolbarStyles.buttonBorder}`,
                borderRadius: toolbarStyles.borderRadius,
                padding: '6px 12px',
                margin: '0 4px',
                cursor: 'pointer',
                boxShadow: toolbarStyles.buttonShadow ? `0 1px 3px ${toolbarStyles.buttonShadow}` : 'none',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', // 更流畅的过渡
                minWidth: 'max-content',
                userSelect: 'none',
                transform: 'translateZ(0)', // 启用硬件加速
                willChange: 'transform, background-color, box-shadow', // 性能优化
                '&:hover': {
                  boxShadow: toolbarStyles.hoverShadow ? `0 2px 4px ${toolbarStyles.hoverShadow}` : 'none',
                  background: button.id === 'web-search' && webSearchActive
                    ? button.bgColor
                    : button.id === 'generate-image' && imageGenerationMode
                      ? button.bgColor
                      : button.id === 'clear-topic' && clearConfirmMode
                        ? (isDarkMode ? '#b71c1c' : '#d32f2f')
                        : toolbarStyles.hoverBg,
                  transform: inputBoxStyle === 'modern' ? 'translateY(-1px) translateZ(0)' : 'translateZ(0)'
                },
                '&:active': {
                  transform: 'scale(0.98) translateZ(0)'
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
      </Box>

      {/* 网络搜索提供商选择器 */}
      <WebSearchProviderSelector
        open={showProviderSelector}
        onClose={() => setShowProviderSelector(false)}
        onProviderSelect={handleProviderSelect}
      />
    </Box>
  );
};

export default ChatToolbar;