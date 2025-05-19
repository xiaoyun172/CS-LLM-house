import React from 'react';
import { Box, Typography } from '@mui/material';
import { DraggableGroup, DraggableItem } from '../GroupComponents';
import type { ChatTopic } from '../../../shared/types';
import type { Group } from '../../../shared/types';
import TopicItem from './TopicItem';

interface TopicGroupsProps {
  topicGroups: Group[];
  topics: ChatTopic[];
  topicGroupMap: Record<string, string>;
  currentTopic: ChatTopic | null;
  onSelectTopic: (topic: ChatTopic) => void;
  onOpenMenu: (event: React.MouseEvent, topic: ChatTopic) => void;
  onDeleteTopic: (topicId: string, event: React.MouseEvent) => void;
  onAddItem: () => void;
}

/**
 * 话题分组组件
 */
export default function TopicGroups({
  topicGroups,
  topics,
  topicGroupMap,
  currentTopic,
  onSelectTopic,
  onOpenMenu,
  onDeleteTopic,
  onAddItem
}: TopicGroupsProps) {
  // 渲染单个话题项
  const renderTopicItem = (topic: ChatTopic, index: number) => (
    <DraggableItem
      key={topic.id}
      id={topic.id}
      index={index}
    >
      <TopicItem
        topic={topic}
        isSelected={currentTopic?.id === topic.id}
        onSelectTopic={onSelectTopic}
        onOpenMenu={onOpenMenu}
        onDeleteTopic={onDeleteTopic}
      />
    </DraggableItem>
  );

  // 渲染话题组
  return (
    <Box sx={{ mb: 2 }}>
      {topicGroups.length > 0 ? (
        topicGroups.map((group) => {
          // 获取该分组中的所有话题
          const groupTopics = topics.filter(
            topic => topicGroupMap[topic.id] === group.id
          );

          // 如果分组内没有话题，不显示该分组
          if (groupTopics.length === 0) return null;

          return (
            <DraggableGroup
              key={group.id}
              group={group}
              onAddItem={onAddItem}
            >
              {groupTopics.map((topic, index) => renderTopicItem(topic, index))}
            </DraggableGroup>
          );
        })
      ) : (
        <Typography variant="body2" color="textSecondary" sx={{ py: 2, textAlign: 'center' }}>
          没有话题分组
        </Typography>
      )}
    </Box>
  );
} 