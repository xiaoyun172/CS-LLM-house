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
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import PushPinIcon from '@mui/icons-material/PushPin';
import ClearIcon from '@mui/icons-material/Clear';
import FolderIcon from '@mui/icons-material/Folder';
import DeleteIcon from '@mui/icons-material/Delete';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useDispatch, useSelector } from 'react-redux';
import { addItemToGroup } from '../../../shared/store/slices/groupsSlice';
import GroupDialog from '../GroupDialog';
import { dexieStorage } from '../../../shared/services/DexieStorageService';
import { EventEmitter, EVENT_NAMES } from '../../../shared/services/EventService';
import { getMainTextContent } from '../../../shared/utils/blockUtils';
import type { ChatTopic } from '../../../shared/types';
import type { Assistant } from '../../../shared/types/Assistant';
import { useTopicGroups } from './hooks/useTopicGroups';
import TopicGroups from './TopicGroups';
import TopicItem from './TopicItem';
import type { RootState } from '../../../shared/store';
import { TopicService } from '../../../shared/services/TopicService';

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
  onDeleteTopic,
  onUpdateTopic
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

  // 编辑对话框状态
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDialogType, setEditDialogType] = useState<'name' | 'prompt'>('name');
  const [editDialogValue, setEditDialogValue] = useState('');

  // 确认对话框状态
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    content: string;
    onConfirm: () => void;
  }>({ title: '', content: '', onConfirm: () => {} });

  // 移动到助手菜单状态
  const [moveToMenuAnchorEl, setMoveToMenuAnchorEl] = useState<null | HTMLElement>(null);

  // 使用话题分组钩子
  const { topicGroups, topicGroupMap, ungroupedTopics } = useTopicGroups(topics);

  // 获取所有助手列表（用于移动功能）
  const allAssistants = useSelector((state: RootState) => state.assistants.assistants);

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


        // 按最后消息时间降序排序话题（最新的在前面）
        const sortedTopics = [...currentAssistant.topics].sort((a, b) => {
          const timeA = new Date(a.lastMessageTime || a.updatedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.lastMessageTime || b.updatedAt || b.createdAt || 0).getTime();
          return timeB - timeA; // 降序排序
        });


        setTopics(sortedTopics);
        return;
      }

      // 只有需要从数据库加载时才设置加载状态
      setIsLoading(true);
      try {
        // 从数据库加载该助手的所有话题

        const allTopics = await dexieStorage.getAllTopics();
        const assistantTopics = allTopics.filter(
          topic => topic.assistantId === currentAssistant.id
        );

        if (assistantTopics.length === 0) {
          // 助手没有话题，可能需要创建默认话题
        } else {

          // 按最后消息时间降序排序话题（最新的在前面）
          const sortedTopics = [...assistantTopics].sort((a, b) => {
            const timeA = new Date(a.lastMessageTime || a.updatedAt || a.createdAt || 0).getTime();
            const timeB = new Date(b.lastMessageTime || b.updatedAt || b.createdAt || 0).getTime();
            return timeB - timeA; // 降序排序
          });


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
        // 如果是话题创建事件且有topic数据，将新话题添加到顶部
        if (eventData.topic && eventData.type === 'create') {
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
          // 使用requestAnimationFrame代替setTimeout
          requestAnimationFrame(() => {
            onSelectTopic(topics[0]);
          });
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

  // 编辑话题名称
  const handleEditTopicName = () => {
    if (!contextTopic) return;
    setEditDialogType('name');
    setEditDialogValue(contextTopic.name || contextTopic.title || '');
    setEditDialogOpen(true);
    handleCloseMenu();
  };

  // 编辑提示词
  const handleEditPrompt = () => {
    if (!contextTopic) return;
    setEditDialogType('prompt');
    setEditDialogValue(contextTopic.prompt || '');
    setEditDialogOpen(true);
    handleCloseMenu();
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!contextTopic) return;

    try {
      const updatedTopic = {
        ...contextTopic,
        [editDialogType === 'name' ? 'name' : 'prompt']: editDialogValue,
        updatedAt: new Date().toISOString()
      };

      // 如果是编辑名称，标记为手动编辑
      if (editDialogType === 'name') {
        updatedTopic.isNameManuallyEdited = true;
      }

      // 保存到数据库
      await dexieStorage.saveTopic(updatedTopic);

      // 更新本地状态
      setTopics(prevTopics =>
        prevTopics.map(topic =>
          topic.id === updatedTopic.id ? updatedTopic : topic
        )
      );

      // 如果有更新回调，调用它
      if (onUpdateTopic) {
        onUpdateTopic(updatedTopic);
      }

      // 发送更新事件
      EventEmitter.emit(EVENT_NAMES.TOPIC_UPDATED, updatedTopic);

      setEditDialogOpen(false);
      setEditDialogValue('');
    } catch (error) {
      console.error('保存话题编辑失败:', error);
    }
  };

  // 固定/取消固定话题
  const handleTogglePin = async () => {
    if (!contextTopic) return;

    try {
      const updatedTopic = {
        ...contextTopic,
        pinned: !contextTopic.pinned,
        updatedAt: new Date().toISOString()
      };

      // 保存到数据库
      await dexieStorage.saveTopic(updatedTopic);

      // 更新本地状态
      setTopics(prevTopics =>
        prevTopics.map(topic =>
          topic.id === updatedTopic.id ? updatedTopic : topic
        )
      );

      // 如果有更新回调，调用它
      if (onUpdateTopic) {
        onUpdateTopic(updatedTopic);
      }

      // 发送更新事件
      EventEmitter.emit(EVENT_NAMES.TOPIC_UPDATED, updatedTopic);

      handleCloseMenu();
    } catch (error) {
      console.error('切换话题固定状态失败:', error);
    }
  };

  // 自动命名话题 - 与最佳实例保持一致
  const handleAutoRenameTopic = async () => {
    if (!contextTopic) return;

    try {
      // 动态导入TopicNamingService
      const { TopicNamingService } = await import('../../../shared/services/TopicNamingService');

      console.log(`[TopicTab] 手动触发话题自动命名: ${contextTopic.id}`);

      // 强制生成话题名称，不检查shouldNameTopic条件
      const newName = await TopicNamingService.generateTopicName(contextTopic, undefined, true);

      if (newName && newName !== contextTopic.name) {
        // 更新话题名称
        const updatedTopic = {
          ...contextTopic,
          name: newName,
          isNameManuallyEdited: false, // 标记为自动生成
          updatedAt: new Date().toISOString()
        };

        // 保存到数据库
        await dexieStorage.saveTopic(updatedTopic);

        // 更新本地状态
        setTopics(prevTopics =>
          prevTopics.map(topic =>
            topic.id === updatedTopic.id ? updatedTopic : topic
          )
        );

        // 如果有更新回调，调用它
        if (onUpdateTopic) {
          onUpdateTopic(updatedTopic);
        }

        // 发送更新事件
        EventEmitter.emit(EVENT_NAMES.TOPIC_UPDATED, updatedTopic);

        console.log(`话题已自动命名: ${newName}`);
      } else {
        console.log('话题命名未发生变化或生成失败');
      }
    } catch (error) {
      console.error('自动命名话题失败:', error);
    }

    handleCloseMenu();
  };

  // 清空消息 - 使用聊天界面的清空方法
  const handleClearMessages = () => {
    if (!contextTopic) return;

    setConfirmDialogConfig({
      title: '清空消息',
      content: '确定要清空此话题的所有消息吗？此操作不可撤销。',
      onConfirm: async () => {
        try {
          // 使用 TopicService 的清空方法，与聊天界面保持一致
          const success = await TopicService.clearTopicContent(contextTopic.id);

          if (success) {
            // 更新本地状态 - 清空消息但保留话题
            setTopics(prevTopics =>
              prevTopics.map(topic =>
                topic.id === contextTopic.id
                  ? { ...topic, messageIds: [], messages: [], updatedAt: new Date().toISOString() }
                  : topic
              )
            );

            // 如果有更新回调，调用它
            if (onUpdateTopic) {
              const updatedTopic = {
                ...contextTopic,
                messageIds: [],
                messages: [],
                updatedAt: new Date().toISOString()
              };
              onUpdateTopic(updatedTopic);
            }

            console.log('话题消息已清空');
          } else {
            console.error('清空话题消息失败');
          }

          setConfirmDialogOpen(false);
        } catch (error) {
          console.error('清空话题消息失败:', error);
          setConfirmDialogOpen(false);
        }
      }
    });

    setConfirmDialogOpen(true);
    handleCloseMenu();
  };

  // 打开移动到助手菜单
  const handleOpenMoveToMenu = (event: React.MouseEvent) => {
    event.stopPropagation();
    setMoveToMenuAnchorEl(event.currentTarget as HTMLElement);
  };

  // 关闭移动到助手菜单
  const handleCloseMoveToMenu = () => {
    setMoveToMenuAnchorEl(null);
  };

  // 移动话题到其他助手
  const handleMoveTo = async (targetAssistant: Assistant) => {
    if (!contextTopic || !currentAssistant) return;

    try {
      // 更新话题的助手ID
      const updatedTopic = {
        ...contextTopic,
        assistantId: targetAssistant.id,
        updatedAt: new Date().toISOString()
      };

      // 保存到数据库
      await dexieStorage.saveTopic(updatedTopic);

      // 从当前助手的话题列表中移除
      setTopics(prevTopics =>
        prevTopics.filter(topic => topic.id !== contextTopic.id)
      );

      // 发送话题移动事件
      EventEmitter.emit(EVENT_NAMES.TOPIC_MOVED, {
        topic: updatedTopic,
        fromAssistantId: currentAssistant.id,
        toAssistantId: targetAssistant.id
      });

      handleCloseMoveToMenu();
      handleCloseMenu();
    } catch (error) {
      console.error('移动话题失败:', error);
    }
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
          <FolderIcon sx={{ mr: 1, fontSize: 18 }} />
          添加到分组...
        </MenuItem>
        <MenuItem onClick={handleEditTopicName}>
          <EditIcon sx={{ mr: 1, fontSize: 18 }} />
          编辑话题名称
        </MenuItem>
        <MenuItem onClick={handleAutoRenameTopic}>
          <AutoAwesomeIcon sx={{ mr: 1, fontSize: 18 }} />
          自动命名话题
        </MenuItem>
        <MenuItem onClick={handleEditPrompt}>
          <EditIcon sx={{ mr: 1, fontSize: 18 }} />
          编辑提示词
        </MenuItem>
        <MenuItem onClick={handleTogglePin}>
          <PushPinIcon sx={{ mr: 1, fontSize: 18 }} />
          {contextTopic?.pinned ? '取消固定' : '固定话题'}
        </MenuItem>
        <MenuItem onClick={handleClearMessages}>
          <ClearIcon sx={{ mr: 1, fontSize: 18 }} />
          清空消息
        </MenuItem>
        {allAssistants.length > 1 && currentAssistant && (
          <MenuItem onClick={handleOpenMoveToMenu}>
            <FolderIcon sx={{ mr: 1, fontSize: 18 }} />
            移动到...
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={() => {
          if (contextTopic) {
            // 使用确认对话框来删除话题
            setConfirmDialogConfig({
              title: '删除话题',
              content: '确定要删除此话题吗？此操作不可撤销。',
              onConfirm: async () => {
                try {
                  // 直接调用删除逻辑，不需要传递事件对象
                  await TopicService.deleteTopic(contextTopic.id);

                  // 从本地状态中移除话题
                  setTopics(prevTopics =>
                    prevTopics.filter(topic => topic.id !== contextTopic.id)
                  );

                  // 发送删除事件
                  EventEmitter.emit(EVENT_NAMES.TOPIC_DELETED, {
                    topicId: contextTopic.id,
                    assistantId: currentAssistant?.id
                  });

                  console.log('话题已删除');
                } catch (error) {
                  console.error('删除话题失败:', error);
                }
                setConfirmDialogOpen(false);
              }
            });
            setConfirmDialogOpen(true);
          }
          handleCloseMenu();
        }}>
          <DeleteIcon sx={{ mr: 1, fontSize: 18 }} />
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

      {/* 移动到助手菜单 */}
      <Menu
        anchorEl={moveToMenuAnchorEl}
        open={Boolean(moveToMenuAnchorEl)}
        onClose={handleCloseMoveToMenu}
      >
        {allAssistants
          .filter(assistant => assistant.id !== currentAssistant?.id)
          .map((assistant) => (
            <MenuItem
              key={assistant.id}
              onClick={() => handleMoveTo(assistant)}
            >
              {assistant.emoji && <span style={{ marginRight: 8 }}>{assistant.emoji}</span>}
              {assistant.name}
            </MenuItem>
          ))}
      </Menu>

      {/* 编辑对话框 */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editDialogType === 'name' ? '编辑话题名称' : '编辑提示词'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            fullWidth
            multiline={editDialogType === 'prompt'}
            rows={editDialogType === 'prompt' ? 4 : 1}
            value={editDialogValue}
            onChange={(e) => setEditDialogValue(e.target.value)}
            placeholder={editDialogType === 'name' ? '请输入话题名称' : '请输入提示词'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            取消
          </Button>
          <Button onClick={handleSaveEdit} variant="contained">
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 确认对话框 */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>{confirmDialogConfig.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialogConfig.content}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>
            取消
          </Button>
          <Button onClick={confirmDialogConfig.onConfirm} variant="contained" color="error">
            确认
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}