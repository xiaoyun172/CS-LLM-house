import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  Button,
  IconButton,
  Typography,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { useDispatch } from 'react-redux';
import { addItemToGroup } from '../../../shared/store/slices/groupsSlice';
import GroupDialog from '../GroupDialog';
import { dexieStorage } from '../../../shared/services/DexieStorageService';
import { EventEmitter, EVENT_NAMES } from '../../../shared/services/EventService';
import { getMainTextContent } from '../../../shared/utils/blockUtils';
import type { ChatTopic } from '../../../shared/types';
import { useTopicGroups } from './hooks/useTopicGroups';
import TopicGroups from './TopicGroups';
import TopicItem from './TopicItem';

interface TopicTabProps {
  currentAssistant: ({
    id: string;
    name: string;
    systemPrompt?: string;
    topics: ChatTopic[];
    topicIds?: string[];
  }) | null;
  currentTopic: ChatTopic | null;
  onSelectTopic: (topic: ChatTopic) => void;
  onCreateTopic: () => void;
  onDeleteTopic: (topicId: string, event: React.MouseEvent) => void;
  onUpdateTopic?: (topic: ChatTopic) => void;
}

/**
 * 话题选项卡主组件
 */
export default function TopicTab({
  currentAssistant,
  currentTopic,
  onSelectTopic,
  onCreateTopic,
  onDeleteTopic
}: TopicTabProps) {
  const dispatch = useDispatch();

  // 话题状态管理
  const [topics, setTopics] = useState<ChatTopic[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 搜索相关状态
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // 话题菜单相关状态
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [contextTopic, setContextTopic] = useState<ChatTopic | null>(null);

  // 添加话题到分组对话框状态
  const [addToGroupMenuAnchorEl, setAddToGroupMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [topicToGroup, setTopicToGroup] = useState<ChatTopic | null>(null);

  // 分组对话框状态
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);

  // 使用话题分组钩子
  const { topicGroups, topicGroupMap, ungroupedTopics } = useTopicGroups(topics);

  // 当助手变化时加载话题
  useEffect(() => {
    const loadTopics = async () => {
      if (!currentAssistant) {
        setTopics([]);
        return;
      }

      // 避免频繁设置加载状态，只有当真正需要从数据库加载时才设置
      const hasTopicsInRedux = currentAssistant.topics && currentAssistant.topics.length > 0;

      if (hasTopicsInRedux) {
        // 如果Redux中已有数据，直接使用，不设置加载状态
        console.log(`[TopicTab] 使用currentAssistant.topics，数量: ${currentAssistant.topics.length}`);

        // 按最后消息时间降序排序话题（最新的在前面）
        const sortedTopics = [...currentAssistant.topics].sort((a, b) => {
          const timeA = new Date(a.lastMessageTime || a.updatedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.lastMessageTime || b.updatedAt || b.createdAt || 0).getTime();
          return timeB - timeA; // 降序排序
        });

        console.log(`[TopicTab] 话题已按时间降序排序，最新的话题: ${sortedTopics[0]?.name || '无'}`);
        setTopics(sortedTopics);
        return;
      }

      // 只有需要从数据库加载时才设置加载状态
      setIsLoading(true);
      try {
        // 从数据库加载该助手的所有话题
        console.log(`[TopicTab] 从数据库加载助手 ${currentAssistant.id} 的话题`);
        const allTopics = await dexieStorage.getAllTopics();
        const assistantTopics = allTopics.filter(
          topic => topic.assistantId === currentAssistant.id
        );

        if (assistantTopics.length === 0) {
          console.log(`[TopicTab] 助手 ${currentAssistant.id} 没有话题，可能需要创建默认话题`);
        } else {
          console.log(`[TopicTab] 已加载助手 ${currentAssistant.id} 的话题，数量: ${assistantTopics.length}`);

          // 按最后消息时间降序排序话题（最新的在前面）
          const sortedTopics = [...assistantTopics].sort((a, b) => {
            const timeA = new Date(a.lastMessageTime || a.updatedAt || a.createdAt || 0).getTime();
            const timeB = new Date(b.lastMessageTime || b.updatedAt || b.createdAt || 0).getTime();
            return timeB - timeA; // 降序排序
          });

          console.log(`[TopicTab] 话题已按时间降序排序，最新的话题: ${sortedTopics[0]?.name || '无'}`);
          setTopics(sortedTopics);
        }
      } catch (error) {
        console.error(`[TopicTab] 加载话题失败:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTopics();
  }, [currentAssistant]);

  // 添加订阅话题变更事件
  useEffect(() => {
    if (!currentAssistant) return;

    const handleTopicChange = (eventData: any) => {
      if (eventData && (eventData.assistantId === currentAssistant.id || !eventData.assistantId)) {
        console.log('[TopicTab] 收到话题变更事件，准备刷新话题');

        // 如果是话题创建事件且有topic数据，将新话题添加到顶部
        if (eventData.topic && eventData.type === 'create') {
          console.log('[TopicTab] 收到新话题创建事件，将新话题添加到顶部:', eventData.topic.name);
          setTopics(prevTopics => [eventData.topic, ...prevTopics]);
        }
        // 如果currentAssistant.topics已更新，则使用它并排序
        else if (currentAssistant.topics && currentAssistant.topics.length > 0) {
          // 按最后消息时间降序排序话题（最新的在前面）
          const sortedTopics = [...currentAssistant.topics].sort((a, b) => {
            const timeA = new Date(a.lastMessageTime || a.updatedAt || a.createdAt || 0).getTime();
            const timeB = new Date(b.lastMessageTime || b.updatedAt || b.createdAt || 0).getTime();
            return timeB - timeA; // 降序排序
          });

          setTopics(sortedTopics);
        }
      }
    };

    // 订阅话题变更事件
    const unsubCreate = EventEmitter.on(EVENT_NAMES.TOPIC_CREATED, handleTopicChange);
    const unsubDelete = EventEmitter.on(EVENT_NAMES.TOPIC_DELETED, handleTopicChange);

    return () => {
      unsubCreate();
      unsubDelete();
    };
  }, [currentAssistant]);

  // 自动选择第一个话题（当话题加载完成且有话题但没有当前选中的话题时）
  useEffect(() => {
    // 只有在非加载状态、有话题且没有当前选中话题时才执行
    if (!isLoading && topics.length > 0 && !currentTopic) {
      console.log('[TopicTab] 自动选择第一个话题:', topics[0].name);

      // 使用requestAnimationFrame代替setTimeout，更符合React渲染周期
      // 这样可以确保在下一次渲染帧中执行，减少闪烁
      requestAnimationFrame(() => {
        onSelectTopic(topics[0]);
      });
    }
  }, [topics, isLoading, currentTopic, onSelectTopic]);

  // 监听SHOW_TOPIC_SIDEBAR事件，确保在切换到话题标签页时自动选择话题
  useEffect(() => {
    const handleShowTopicSidebar = () => {
      // 如果有话题但没有选中的话题，自动选择第一个话题
      if (!isLoading && topics.length > 0) {
        // 如果没有当前选中的话题，选择第一个话题
        if (!currentTopic) {
          console.log('[TopicTab] 响应SHOW_TOPIC_SIDEBAR事件，自动选择第一个话题:', topics[0].name);
          // 使用requestAnimationFrame代替setTimeout
          requestAnimationFrame(() => {
            onSelectTopic(topics[0]);
          });
        } else {
          // 如果已有当前选中的话题，确保它在视图中可见
          console.log('[TopicTab] 响应SHOW_TOPIC_SIDEBAR事件，当前话题已选中:', currentTopic.name);
        }
      }
    };

    const unsubscribe = EventEmitter.on(EVENT_NAMES.SHOW_TOPIC_SIDEBAR, handleShowTopicSidebar);

    return () => {
      unsubscribe();
    };
  }, [topics, isLoading, currentTopic, onSelectTopic]);

  // 筛选话题
  const filteredTopics = React.useMemo(() => {
    if (!searchQuery) return topics;
    return topics.filter(topic => {
      // 检查名称或标题
      if ((topic.name && topic.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (topic.title && topic.title.toLowerCase().includes(searchQuery.toLowerCase()))) {
        return true;
      }

      // 检查消息内容
      return (topic.messages || []).some(message => {
        // 使用getMainTextContent获取消息内容
        const content = getMainTextContent(message);
        if (content) {
          return content.toLowerCase().includes(searchQuery.toLowerCase());
        }
        return false;
      });
    });
  }, [searchQuery, topics]);

  // 搜索相关处理函数
  const handleSearchClick = () => {
    setShowSearch(true);
  };

  const handleCloseSearch = () => {
    setShowSearch(false);
    setSearchQuery('');
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  // 打开话题菜单
  const handleOpenMenu = (event: React.MouseEvent, topic: ChatTopic) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget as HTMLElement);
    setContextTopic(topic);
  };

  // 关闭话题菜单
  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
    setContextTopic(null);
  };

  // 打开分组对话框
  const handleOpenGroupDialog = () => {
    setGroupDialogOpen(true);
  };

  // 关闭分组对话框
  const handleCloseGroupDialog = () => {
    setGroupDialogOpen(false);
  };

  // 打开添加到分组菜单
  const handleAddToGroupMenu = (event: React.MouseEvent, topic: ChatTopic) => {
    event.stopPropagation();
    setTopicToGroup(topic);
    setAddToGroupMenuAnchorEl(event.currentTarget as HTMLElement);
  };

  // 关闭添加到分组菜单
  const handleCloseAddToGroupMenu = () => {
    setAddToGroupMenuAnchorEl(null);
    setTopicToGroup(null);
  };

  // 添加到指定分组
  const handleAddToGroup = (groupId: string) => {
    if (!topicToGroup) return;

    dispatch(addItemToGroup({
      groupId,
      itemId: topicToGroup.id
    }));

    handleCloseAddToGroupMenu();
  };

  // 添加到新分组
  const handleAddToNewGroup = () => {
    handleCloseAddToGroupMenu();
    handleOpenGroupDialog();
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 标题和按钮区域 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        {showSearch ? (
          <TextField
            fullWidth
            size="small"
            placeholder="搜索话题..."
            value={searchQuery}
            onChange={handleSearchChange}
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleCloseSearch}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        ) : (
          <>
            <Typography variant="subtitle1" fontWeight="medium">
              {currentAssistant?.name || '所有话题'}
            </Typography>
            <Box>
              <IconButton size="small" onClick={handleSearchClick} sx={{ mr: 1 }}>
                <SearchIcon fontSize="small" />
              </IconButton>
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={onCreateTopic}
              >
                新建话题
              </Button>
            </Box>
          </>
        )}
      </Box>

      {/* 加载状态显示 */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
          <Typography variant="body2" sx={{ ml: 1 }}>
            加载中...
          </Typography>
        </Box>
      )}

      {/* 没有话题时的提示 */}
      {!isLoading && topics.length === 0 && (
        <Box sx={{ py: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            此助手没有话题，点击上方的"+"按钮创建一个新话题。
          </Typography>
        </Box>
      )}

      {/* 分组区域 */}
      <TopicGroups
        topicGroups={topicGroups}
        topics={filteredTopics}
        topicGroupMap={topicGroupMap}
        currentTopic={currentTopic}
        onSelectTopic={onSelectTopic}
        onOpenMenu={handleOpenMenu}
        onDeleteTopic={onDeleteTopic}
        onAddItem={handleOpenGroupDialog}
      />

      {/* 未分组话题列表 */}
      {ungroupedTopics.length > 0 && (
        <>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1, mb: 1 }}>
            未分组话题
          </Typography>
          <List sx={{ flexGrow: 1, overflow: 'auto' }}>
            {ungroupedTopics
              .filter(topic => {
                if (!searchQuery) return true;
                // 检查名称或标题
                if ((topic.name && topic.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    (topic.title && topic.title.toLowerCase().includes(searchQuery.toLowerCase()))) {
                  return true;
                }
                // 检查消息内容
                return (topic.messages || []).some(message => {
                  const content = getMainTextContent(message);
                  return content ? content.toLowerCase().includes(searchQuery.toLowerCase()) : false;
                });
              })
              .map(topic => (
                <TopicItem
                  key={topic.id}
                  topic={topic}
                  isSelected={currentTopic?.id === topic.id}
                  onSelectTopic={onSelectTopic}
                  onOpenMenu={handleOpenMenu}
                  onDeleteTopic={onDeleteTopic}
                />
              ))}
          </List>
        </>
      )}

      {/* 分组对话框 */}
      <GroupDialog
        open={groupDialogOpen}
        onClose={handleCloseGroupDialog}
        type="topic"
      />

      {/* 话题菜单 */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={(e) => {
          if (contextTopic) handleAddToGroupMenu(e, contextTopic);
          handleCloseMenu();
        }}>
          添加到分组...
        </MenuItem>
        <MenuItem onClick={handleCloseMenu}>
          编辑话题名称
        </MenuItem>
        <MenuItem onClick={handleCloseMenu}>
          编辑提示词
        </MenuItem>
        <MenuItem onClick={handleCloseMenu}>
          分析对话
        </MenuItem>
        <MenuItem onClick={() => {
          if (contextTopic) onDeleteTopic(contextTopic.id, {} as React.MouseEvent);
          handleCloseMenu();
        }}>
          删除话题
        </MenuItem>
      </Menu>

      {/* 添加到分组菜单 */}
      <Menu
        anchorEl={addToGroupMenuAnchorEl}
        open={Boolean(addToGroupMenuAnchorEl)}
        onClose={handleCloseAddToGroupMenu}
      >
        {topicGroups.map((group) => (
          <MenuItem
            key={group.id}
            onClick={() => handleAddToGroup(group.id)}
          >
            {group.name}
          </MenuItem>
        ))}
        <MenuItem onClick={handleAddToNewGroup}>创建新分组...</MenuItem>
      </Menu>
    </Box>
  );
}