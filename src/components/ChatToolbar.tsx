import React, { useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { AssistantService } from '../shared/services/AssistantService';
import { createTopic } from '../shared/utils';
import { useDispatch } from 'react-redux';
import { createTopic as createTopicAction, setCurrentTopic } from '../shared/store/messagesSlice';

interface ChatToolbarProps {
  onNewTopic?: () => void;
  onClearTopic?: () => void;
}

/**
 * 聊天工具栏组件
 * 提供新建话题和清空话题内容功能
 * 使用独立气泡式设计，支持横向滑动
 */
const ChatToolbar: React.FC<ChatToolbarProps> = ({
  onNewTopic,
  onClearTopic
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
    }
    // 未来可以在这里添加更多按钮
  ];

  return (
    <Box
      sx={{
        padding: '8px 0',
        backgroundColor: '#f5f7fa',
        borderBottom: '1px solid #eaecef',
        width: '100%',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <Box
        ref={scrollRef}
        sx={{
          display: 'flex',
          overflowX: 'auto',
          padding: '0 16px',
          scrollbarWidth: 'none', // Firefox
          '&::-webkit-scrollbar': {
            display: 'none' // Chrome, Safari, Edge
          },
          whiteSpace: 'nowrap'
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
              backgroundColor: button.bgColor,
              color: button.color,
              border: '1px solid #e0e0e0',
              borderRadius: '50px',
              padding: '8px 16px',
              margin: '0 6px',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.2s ease',
              minWidth: 'max-content',
              userSelect: 'none',
              '&:hover': {
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                backgroundColor: '#f9f9f9'
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