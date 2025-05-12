import React from 'react';
import {
  List,
  ListItemButton,
  ListItemText,
  Button,
  Box,
  Divider,
  Typography,
  alpha,
  ListItemIcon
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import type { ChatTopic } from '../shared/types';

interface TopicListProps {
  topics: ChatTopic[];
  currentTopicId: string | null;
  onSelectTopic: (topic: ChatTopic) => void;
  onNewTopic: () => void;
}

const TopicList: React.FC<TopicListProps> = ({
  topics,
  currentTopicId,
  onSelectTopic,
  onNewTopic,
}) => {
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
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem', ml: 1 }}>
                {formatDate(topic.lastMessageTime)}
              </Typography>
            </ListItemButton>
          ))
        )}
      </List>
    </Box>
  );
};

export default TopicList;
