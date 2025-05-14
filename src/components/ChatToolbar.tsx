import React, { useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import ImageIcon from '@mui/icons-material/Image';
import { AssistantService } from '../shared/services/AssistantService';
import { createTopic } from '../shared/utils';
import { useDispatch } from 'react-redux';
import { createTopic as createTopicAction, setCurrentTopic } from '../shared/store/messagesSlice';

interface ChatToolbarProps {
  onNewTopic?: () => void;
  onClearTopic?: () => void;
  imageGenerationMode?: boolean; // 是否处于图像生成模式
  toggleImageGenerationMode?: () => void; // 切换图像生成模式
}

/**
 * 聊天工具栏组件
 * 提供新建话题和清空话题内容功能
 * 使用独立气泡式设计，支持横向滑动
 */
const ChatToolbar: React.FC<ChatToolbarProps> = ({
  onNewTopic,
  onClearTopic,
  imageGenerationMode = false,
  toggleImageGenerationMode
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const dispatch = useDispatch();

  // 创建新话题的安全实现
  const safeCreateTopic = () => {
    // 先检查是否有传入的回调
    if (onNewTopic) {
      onNewTopic();
      return;
    }

    // 如果没有回调，则自己实现创建话题逻辑
    try {
      // 获取当前助手
      const currentAssistantId = localStorage.getItem('currentAssistant');
      if (!currentAssistantId) {
        console.error('无法创建话题: 未找到当前助手');
        alert('请先选择一个助手');
        return;
      }

      // 创建新话题
      const newTopic = createTopic('新聊天');
      
      // 添加到Redux
      dispatch(createTopicAction(newTopic));
      dispatch(setCurrentTopic(newTopic));
      
      // 获取助手列表
      const assistants = AssistantService.getUserAssistants();
      const currentAssistant = assistants.find(a => a.id === currentAssistantId);
      
      if (!currentAssistant) {
        console.error('无法找到当前助手');
        return;
      }
      
      console.log(`将新话题"${newTopic.title}"关联到助手"${currentAssistant.name}"`);
      
      // 关联话题到助手
      AssistantService.addTopicToAssistant(currentAssistantId, newTopic.id);
      
      // 验证关联是否成功
      const updatedAssistants = AssistantService.getUserAssistants();
      const updatedAssistant = updatedAssistants.find(a => a.id === currentAssistantId);
      
      if (updatedAssistant && updatedAssistant.topicIds?.includes(newTopic.id)) {
        console.log('验证成功: 新话题已关联到助手');
      } else {
        console.error('验证失败: 新话题未显示在助手的话题列表中');
      }
      
      // 派发一个自定义事件，通知应用新话题已创建
      const topicCreatedEvent = new CustomEvent('topicCreated', { 
        detail: { topic: newTopic, assistantId: currentAssistantId } 
      });
      window.dispatchEvent(topicCreatedEvent);
      
      // 手动触发Redux store的变化，确保所有相关组件都能感知到更新
      dispatch({ type: 'FORCE_TOPICS_UPDATE' });
      
      console.log('已派发话题创建事件，通知应用刷新话题列表');
    } catch (error) {
      console.error('创建新话题时出错:', error);
    }
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
      icon: <AddIcon sx={{ fontSize: '18px', color: '#4CAF50' }} />,
      label: '新建话题',
      onClick: safeCreateTopic,
      color: '#4CAF50', // 绿色
      bgColor: '#FFFFFF'
    },
    {
      id: 'clear-topic',
      icon: <DeleteSweepIcon sx={{ fontSize: '18px', color: '#2196F3' }} />,
      label: '清空内容',
      onClick: onClearTopic,
      color: '#2196F3', // 蓝色
      bgColor: '#FFFFFF'
    },
    {
      id: 'generate-image',
      icon: <ImageIcon sx={{ fontSize: '18px', color: imageGenerationMode ? '#FFFFFF' : '#9C27B0' }} />,
      label: imageGenerationMode ? '取消生成' : '生成图片',
      onClick: toggleImageGenerationMode,
      color: imageGenerationMode ? '#FFFFFF' : '#9C27B0', // 紫色
      bgColor: imageGenerationMode ? '#9C27B0' : '#FFFFFF' // 激活时背景色变成紫色
    }
    // 未来可以在这里添加更多按钮
  ];

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
              background: 'rgba(255, 255, 255, 0.85)', // 半透明背景
              backdropFilter: 'blur(5px)', // 毛玻璃效果
              WebkitBackdropFilter: 'blur(5px)', // Safari支持
              color: button.color,
              border: '1px solid rgba(230, 230, 230, 0.8)',
              borderRadius: '50px',
              padding: '6px 12px', // 减小padding
              margin: '0 4px',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
              transition: 'all 0.2s ease',
              minWidth: 'max-content',
              userSelect: 'none',
              '&:hover': {
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                background: 'rgba(255, 255, 255, 0.95)'
              },
              '&:active': {
                transform: 'scale(0.98)'
              }
            }}
          >
            {button.icon}
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                fontSize: '13px',
                ml: 0.5
              }}
            >
              {button.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default ChatToolbar; 