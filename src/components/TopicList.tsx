import React, { useState, useEffect, useRef } from 'react';
import {
  List,
  ListItemButton,
  ListItemText,
  Button,
  Box,
  Divider,
  Typography,
  alpha,
  ListItemIcon,
  IconButton,
  Tooltip
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import type { ChatTopic } from '../shared/types';

interface TopicListProps {
  topics: ChatTopic[];
  currentTopicId: string | null;
  onSelectTopic: (topic: ChatTopic) => void;
  onNewTopic: () => void;
  onDeleteTopic?: (topicId: string) => void;
}

const TopicList: React.FC<TopicListProps> = ({
  topics,
  currentTopicId,
  onSelectTopic,
  onNewTopic,
  onDeleteTopic,
}) => {
  // 用于跟踪当前准备删除的话题ID
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  // 用于追踪删除确认的定时器
  const deleteTimerRef = useRef<number | null>(null);

  // 格式化日期函数
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    
    // 如果是今天的消息，只显示时间
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // 如果是昨天的消息
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return '昨天';
    }
    
    // 如果是今年的消息，显示月和日
    if (date.getFullYear() === today.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    
    // 其他情况显示年月日
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // 点击删除按钮的处理函数
  const handleDeleteClick = (e: React.MouseEvent, topicId: string) => {
    e.stopPropagation(); // 阻止事件冒泡，避免触发选择话题
    
    if (pendingDeleteId === topicId) {
      // 如果是第二次点击同一个话题的删除按钮，执行删除
      if (onDeleteTopic) {
        onDeleteTopic(topicId);
      }
      // 重置状态
      setPendingDeleteId(null);
      if (deleteTimerRef.current) {
        window.clearTimeout(deleteTimerRef.current);
        deleteTimerRef.current = null;
      }
    } else {
      // 如果已经有一个待删除的话题，先清除它
      if (pendingDeleteId && deleteTimerRef.current) {
        window.clearTimeout(deleteTimerRef.current);
      }
      
      // 设置当前话题为待删除状态
      setPendingDeleteId(topicId);
      
      // 设置定时器，3秒后自动取消删除状态
      deleteTimerRef.current = window.setTimeout(() => {
        setPendingDeleteId(null);
        deleteTimerRef.current = null;
      }, 3000);
    }
  };

  // 组件卸载时清除定时器
  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) {
        window.clearTimeout(deleteTimerRef.current);
      }
    };
  }, []);

  // 当点击列表项外的区域时，取消删除状态
  useEffect(() => {
    const handleClickOutside = () => {
      if (pendingDeleteId) {
        setPendingDeleteId(null);
        if (deleteTimerRef.current) {
          window.clearTimeout(deleteTimerRef.current);
          deleteTimerRef.current = null;
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [pendingDeleteId]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: (theme) => alpha(theme.palette.background.paper, 0.7) }}>
      <Box sx={{ p: 2, pb: 1 }}>
        <Button
          variant="contained"
          fullWidth
          startIcon={<AddCircleIcon />}
          onClick={onNewTopic}
          sx={{
            borderRadius: '12px',
            py: 1.2,
            textTransform: 'none',
            fontWeight: 600,
            boxShadow: (theme) => `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
            '&:hover': {
              boxShadow: (theme) => `0 6px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
            },
            transition: 'all 0.2s ease',
          }}
        >
          新建聊天
        </Button>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 3, mb: 1, px: 1, fontSize: '0.85rem', fontWeight: 500 }}>
          历史记录
        </Typography>
      </Box>

      <Divider />
      
      <List
        sx={{
          flex: 1,
          overflow: 'auto',
          py: 0,
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: (theme) => theme.palette.divider,
            borderRadius: '10px',
          },
        }}
      >
        {topics.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary', fontSize: '0.9rem' }}>
            没有聊天记录
          </Box>
        ) : (
          topics.map((topic) => (
            <ListItemButton
              key={topic.id}
              selected={topic.id === currentTopicId}
              onClick={() => onSelectTopic(topic)}
              sx={{
                py: 1.5,
                px: 2,
                position: 'relative',
                '&.Mui-selected': {
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                  '&:hover': {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                  },
                },
                '&:hover': {
                  bgcolor: (theme) => alpha(theme.palette.action.hover, 0.7),
                  '& .delete-button': {
                    opacity: 1,
                  },
                },
                '&::after': topic.id === currentTopicId ? {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: '20%',
                  height: '60%',
                  width: '3px',
                  bgcolor: 'primary.main',
                  borderRadius: '0 4px 4px 0',
                } : {},
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: topic.id === currentTopicId ? 'primary.main' : 'text.secondary' }}>
                <ChatBubbleOutlineIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: topic.id === currentTopicId ? 600 : 400,
                      color: topic.id === currentTopicId ? 'primary.main' : 'text.primary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {topic.title}
                  </Typography>
                }
                secondary={
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      fontSize: '0.75rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'block',
                    }}
                  >
                    {topic.messages && topic.messages.length > 0
                      ? topic.messages[topic.messages.length - 1]?.content?.substring(0, 30) + (topic.messages[topic.messages.length - 1]?.content?.length > 30 ? '...' : '')
                      : '没有消息'}
                  </Typography>
                }
                secondaryTypographyProps={{ component: 'div' }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                  {formatDate(topic.lastMessageTime)}
                </Typography>
                {onDeleteTopic && (
                  <Tooltip title={pendingDeleteId === topic.id ? "再次点击确认删除" : "删除话题"} placement="top">
                    <IconButton
                      className="delete-button"
                      size="small"
                      onClick={(e) => handleDeleteClick(e, topic.id)}
                      sx={{
                        ml: 1,
                        color: pendingDeleteId === topic.id ? 'error.main' : 'text.disabled',
                        opacity: pendingDeleteId === topic.id ? 1 : 0,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          color: 'error.main',
                        },
                      }}
                    >
                      {pendingDeleteId === topic.id ? (
                        <CheckCircleOutlineIcon fontSize="small" />
                      ) : (
                        <DeleteOutlineIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </ListItemButton>
          ))
        )}
      </List>
    </Box>
  );
};

export default TopicList;
