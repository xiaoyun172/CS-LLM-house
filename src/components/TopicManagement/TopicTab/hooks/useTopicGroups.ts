import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../shared/store';
import type { ChatTopic } from '../../../../shared/types';

/**
 * 话题分组钩子
 * 
 * 用于管理话题分组相关的状态和操作
 */
export function useTopicGroups(topics: ChatTopic[]) {
  // 从Redux获取分组数据
  const { groups, topicGroupMap } = useSelector((state: RootState) => state.groups);

  // 获取话题分组
  const topicGroups = useMemo(() => {
    return groups
      .filter(group => group.type === 'topic')
      .sort((a, b) => a.order - b.order);
  }, [groups]);

  // 获取未分组的话题
  const ungroupedTopics = useMemo(() => {
    return topics.filter(topic => !topicGroupMap[topic.id]);
  }, [topics, topicGroupMap]);

  return {
    topicGroups,
    topicGroupMap,
    ungroupedTopics
  };
} 