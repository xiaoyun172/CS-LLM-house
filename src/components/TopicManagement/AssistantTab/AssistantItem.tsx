import React from 'react';
import {
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Typography,
  Box,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Assistant } from '../../../shared/types/Assistant';
import { EventEmitter, EVENT_NAMES } from '../../../shared/services/EventService';

interface AssistantItemProps {
  assistant: Assistant;
  isSelected: boolean;
  onSelectAssistant: (assistant: Assistant) => void;
  onOpenMenu: (event: React.MouseEvent, assistant: Assistant) => void;
  onDeleteAssistant: (assistantId: string, event: React.MouseEvent) => void;
}

/**
 * 单个助手项组件
 */
export default function AssistantItem({
  assistant,
  isSelected,
  onSelectAssistant,
  onOpenMenu,
  onDeleteAssistant
}: AssistantItemProps) {
  const handleAssistantClick = () => {
    // 先触发切换到话题标签页事件，确保UI已经切换到话题标签页
    EventEmitter.emit(EVENT_NAMES.SHOW_TOPIC_SIDEBAR);

    // 然后选择助手，这会触发话题加载
    setTimeout(() => {
      onSelectAssistant(assistant);
    }, 50);
  };

  const handleOpenMenu = (event: React.MouseEvent) => {
    event.stopPropagation();
    onOpenMenu(event, assistant);
  };

  const handleDeleteClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onDeleteAssistant(assistant.id, event);
  };

  // 计算话题数量
  const topicCount = assistant.topics?.length || assistant.topicIds?.length || 0;

  return (
    <ListItemButton
      onClick={handleAssistantClick}
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
      <ListItemAvatar>
        <Avatar
          sx={{
            width: 32,
            height: 32,
            fontSize: '1.2rem',
            bgcolor: isSelected ? 'primary.main' : 'grey.300',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {assistant.emoji || assistant.name.charAt(0)}
        </Avatar>
      </ListItemAvatar>
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
            {assistant.name}
          </Typography>
        }
        secondary={
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block' }}
          >
            {topicCount} 个话题
          </Typography>
        }
      />
      <Box sx={{ display: 'flex' }}>
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
      </Box>
    </ListItemButton>
  );
}
