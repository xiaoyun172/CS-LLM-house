import React, { useMemo } from 'react';
import {
  ListItemButton,
  ListItemText,
  IconButton,
  Typography
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSelector } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import { getMainTextContent } from '../../../shared/utils/blockUtils';
import type { ChatTopic } from '../../../shared/types';
import type { RootState } from '../../../shared/store';
import { selectMessagesForTopic } from '../../../shared/store/selectors/messageSelectors';

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

  // 创建记忆化的 selector 来避免不必要的重新渲染
  const selectTopicMessages = useMemo(
    () => createSelector(
      [
        (state: RootState) => state,
        () => topic.id
      ],
      (state, topicId) => selectMessagesForTopic(state, topicId) || []
    ),
    [topic.id] // 只有当 topic.id 改变时才重新创建 selector
  );

  // 从Redux状态获取该话题的最新消息
  const messages = useSelector(selectTopicMessages);

  // 获取话题的显示名称
  const displayName = topic.name || topic.title || '无标题话题';

  // 获取话题的最后一条消息内容 - 从Redux状态实时获取
  const getLastMessageContent = () => {
    if (!messages || messages.length === 0) {
      return '无消息';
    }

    const lastMessage = messages[messages.length - 1];
    const content = getMainTextContent(lastMessage);

    if (!content) {
      return '无文本内容';
    }

    return content.length > 30 ? `${content.substring(0, 30)}...` : content;
  };

  // 格式化创建时间
  const formatCreatedTime = () => {
    if (!topic.createdAt) return '';

    const createdDate = new Date(topic.createdAt);
    const now = new Date();
    const diffMs = now.getTime() - createdDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // 获取日期部分
    const dateStr = createdDate.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit'
    });

    // 获取时间部分
    const timeStr = createdDate.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    if (diffDays === 0) {
      // 今天 - 显示日期和时间
      return `${dateStr} ${timeStr}`;
    } else if (diffDays === 1) {
      // 昨天 - 显示日期和"昨天"
      return `${dateStr} 昨天`;
    } else if (diffDays < 7) {
      // 一周内 - 显示日期和天数
      return `${dateStr} ${diffDays}天前`;
    } else {
      // 超过一周 - 显示日期和时间
      return `${dateStr} ${timeStr}`;
    }
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

      {/* 右侧按钮区域 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
        {/* 创建时间 */}
        <Typography
          variant="caption"
          sx={{
            fontSize: '11px',
            color: 'text.secondary',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            opacity: 0.9
          }}
        >
          {formatCreatedTime()}
        </Typography>

        {/* 按钮组 */}
        <div style={{ display: 'flex', gap: '2px' }}>
          <IconButton
            size="small"
            onClick={handleOpenMenu}
            sx={{ opacity: 0.6, padding: '2px' }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={handleDeleteClick}
            sx={{ opacity: 0.6, padding: '2px', '&:hover': { color: 'error.main' } }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </div>
      </div>
    </ListItemButton>
  );
}