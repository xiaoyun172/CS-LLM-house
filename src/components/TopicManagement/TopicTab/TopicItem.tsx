import React from 'react';
import {
  ListItemButton,
  ListItemText,
  IconButton,
  Typography
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import { getMainTextContent } from '../../../shared/utils/blockUtils';
import type { ChatTopic } from '../../../shared/types';

interface TopicItemProps {
  topic: ChatTopic;
  isSelected: boolean;
  onSelectTopic: (topic: ChatTopic) => void;
  onOpenMenu: (event: React.MouseEvent, topic: ChatTopic) => void;
  onDeleteTopic: (topicId: string, event: React.MouseEvent) => void;
}

/**
 * 单个话题项组件
 */
export default function TopicItem({
  topic,
  isSelected,
  onSelectTopic,
  onOpenMenu,
  onDeleteTopic
}: TopicItemProps) {
  const handleTopicClick = () => {
    onSelectTopic(topic);
  };

  const handleOpenMenu = (event: React.MouseEvent) => {
    event.stopPropagation();
    onOpenMenu(event, topic);
  };

  const handleDeleteClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onDeleteTopic(topic.id, event);
  };

  // 获取话题的显示名称
  const displayName = topic.name || topic.title || '无标题话题';

  // 获取话题的最后一条消息内容
  const getLastMessageContent = () => {
    if (!topic.messages || topic.messages.length === 0) {
      return '无消息';
    }

    const lastMessage = topic.messages[topic.messages.length - 1];
    const content = getMainTextContent(lastMessage);
    
    if (!content) {
      return '无文本内容';
    }

    return content.length > 30 ? `${content.substring(0, 30)}...` : content;
  };

  return (
    <ListItemButton
      onClick={handleTopicClick}
      selected={isSelected}
      sx={{
        borderRadius: '8px',
        mb: 1,
        '&.Mui-selected': {
          backgroundColor: 'rgba(25, 118, 210, 0.08)',
        },
        '&.Mui-selected:hover': {
          backgroundColor: 'rgba(25, 118, 210, 0.12)',
        }
      }}
    >
      <ListItemText
        primary={
          <Typography
            variant="body2"
            sx={{
              fontWeight: isSelected ? 600 : 400,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {displayName}
          </Typography>
        }
        secondary={
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block'
            }}
          >
            {getLastMessageContent()}
          </Typography>
        }
      />
      <IconButton
        size="small"
        onClick={handleOpenMenu}
        sx={{ opacity: 0.6 }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        onClick={handleDeleteClick}
        sx={{ opacity: 0.6, '&:hover': { color: 'error.main' } }}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    </ListItemButton>
  );
} 