import { useState, useMemo } from 'react';
import { 
  Box, 
  Typography,
  Button,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Menu,
  MenuItem,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { type ChatTopic } from '../../shared/types';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import ForumIcon from '@mui/icons-material/Forum';
import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../shared/store';
import { addItemToGroup, removeItemFromGroup } from '../../shared/store/slices/groupsSlice';
import GroupDialog from './GroupDialog';
import { CreateGroupButton, DraggableGroup, DraggableItem } from './GroupComponents';

interface TopicTabProps {
  currentAssistant: { id: string; name: string; systemPrompt?: string; } | null;
  topics: ChatTopic[];
  currentTopic: ChatTopic | null;
  onSelectTopic: (topic: ChatTopic) => void;
  onCreateTopic: () => void;
  onDeleteTopic: (topicId: string, event: React.MouseEvent) => void;
  onUpdateTopic?: (topic: ChatTopic) => void;
}

export default function TopicTab({
  currentAssistant,
  topics,
  currentTopic,
  onSelectTopic,
  onCreateTopic,
  onDeleteTopic,
  onUpdateTopic
}: TopicTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const dispatch = useDispatch();
  
  // 话题菜单相关状态
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [contextTopic, setContextTopic] = useState<ChatTopic | null>(null);
  
  // 编辑提示词对话框相关状态
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [topicPrompt, setTopicPrompt] = useState('');
  const [useAssistantPrompt, setUseAssistantPrompt] = useState(false);
  
  // 分组相关状态
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  
  // 添加话题到分组对话框状态
  const [addToGroupMenuAnchorEl, setAddToGroupMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [topicToGroup, setTopicToGroup] = useState<ChatTopic | null>(null);
  
  // 从Redux获取分组数据
  const { groups, topicGroupMap } = useSelector((state: RootState) => state.groups);
  
  // 是否显示菜单
  const isMenuOpen = Boolean(menuAnchorEl);
  const isAddToGroupMenuOpen = Boolean(addToGroupMenuAnchorEl);
  
  // 获取话题分组
  const topicGroups = useMemo(() => {
    return groups
      .filter(group => group.type === 'topic')
      .sort((a, b) => a.order - b.order);
  }, [groups]);
  
  // 获取当前助手的话题
  const assistantTopics = useMemo(() => {
    if (!currentAssistant) return [];
    // 直接返回所有话题
    return topics;
  }, [currentAssistant, topics]);
  
  // 获取未分组的话题
  const ungroupedTopics = useMemo(() => {
    return assistantTopics.filter(topic => !topicGroupMap[topic.id]);
  }, [assistantTopics, topicGroupMap]);

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

  // 过滤话题列表
  const filteredTopics = assistantTopics.filter(
    (topic) => !searchQuery || (topic.title && topic.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  // 关闭菜单
  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
    setContextTopic(null);
  };
  
  // 编辑提示词
  const handleEditPrompt = () => {
    if (!contextTopic) return;
    
    // 如果话题没有提示词，但助手有系统提示词，则初始化为助手的提示词
    if (!contextTopic.prompt && currentAssistant?.systemPrompt) {
      setTopicPrompt(currentAssistant.systemPrompt);
      setUseAssistantPrompt(true);
    } else {
      setTopicPrompt(contextTopic.prompt || '');
      setUseAssistantPrompt(currentAssistant?.systemPrompt ? false : false);
    }
    
    setPromptDialogOpen(true);
    handleCloseMenu();
  };
  
  // 保存提示词
  const handleSavePrompt = () => {
    if (contextTopic && onUpdateTopic) {
      // 如果选择使用助手提示词，则清空话题提示词
      const updatedPrompt = useAssistantPrompt ? '' : topicPrompt;
      
      onUpdateTopic({
        ...contextTopic,
        prompt: updatedPrompt
      });
    }
    handleClosePromptDialog();
  };
  
  // 关闭提示词对话框
  const handleClosePromptDialog = () => {
    setPromptDialogOpen(false);
    setTopicPrompt('');
    setUseAssistantPrompt(false);
  };
  
  // 分析对话
  const handleAnalyzeConversation = () => {
    // 实现对话分析功能
    handleCloseMenu();
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
  
  // 添加话题到分组
  const handleAddToGroup = (groupId: string) => {
    if (topicToGroup) {
      // 如果话题已经在其他分组中，先移除
      if (topicGroupMap[topicToGroup.id]) {
        dispatch(removeItemFromGroup({ 
          itemId: topicToGroup.id, 
          type: 'topic' 
        }));
      }
      
      // 添加到新分组
      dispatch(addItemToGroup({ 
        groupId, 
        itemId: topicToGroup.id 
      }));
    }
    
    handleCloseAddToGroupMenu();
  };
  
  // 从分组中移除话题
  const handleRemoveFromGroup = (event: React.MouseEvent, topic: ChatTopic) => {
    event.stopPropagation();
    event.preventDefault();
    
    dispatch(removeItemFromGroup({ 
      itemId: topic.id, 
      type: 'topic' 
    }));
  };
  
  // 添加话题到新分组
  const handleAddToNewGroup = () => {
    setGroupDialogOpen(true);
    handleCloseAddToGroupMenu();
  };
  
  // 渲染单个话题项
  const renderTopicItem = (topic: ChatTopic, index: number, inGroup: boolean = false) => {
    const isSelected = currentTopic?.id === topic.id;
    const lastMessage = topic.messages.length > 0 
      ? new Date(topic.lastMessageTime).toLocaleString('zh-CN', { 
          hour: '2-digit', 
          minute: '2-digit',
          month: 'short',
          day: 'numeric'
        })
      : '';
      
    return (
      <Box key={topic.id} sx={{ position: 'relative' }}>
        {inGroup ? (
          <DraggableItem id={topic.id} index={index}>
            <ListItemButton 
              onClick={() => onSelectTopic(topic)}
              selected={isSelected}
              sx={{ 
                borderRadius: '8px', 
                mb: 1,
                pl: 2,
                '&.Mui-selected': {
                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                },
                '&.Mui-selected:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.12)',
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <ForumIcon fontSize="small" color={isSelected ? "primary" : "action"} />
              </ListItemIcon>
              <ListItemText 
                primary={topic.title || '新对话'} 
                secondary={lastMessage}
                primaryTypographyProps={{
                  variant: 'body2',
                  fontWeight: isSelected ? 600 : 400,
                  noWrap: true
                }}
                secondaryTypographyProps={{
                  variant: 'caption',
                  noWrap: true
                }}
              />
              
              <IconButton 
                size="small" 
                onClick={(e) => handleRemoveFromGroup(e, topic)}
                sx={{ mr: -1 }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </ListItemButton>
          </DraggableItem>
        ) : (
          <ListItemButton 
            onClick={() => onSelectTopic(topic)}
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
            <ListItemIcon sx={{ minWidth: 40 }}>
              <ForumIcon fontSize="small" color={isSelected ? "primary" : "action"} />
            </ListItemIcon>
            <ListItemText 
              primary={topic.title || '新对话'} 
              secondary={lastMessage}
              primaryTypographyProps={{
                variant: 'body2',
                fontWeight: isSelected ? 600 : 400,
                noWrap: true
              }}
              secondaryTypographyProps={{
                variant: 'caption',
                noWrap: true
              }}
            />
            
            <IconButton 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                setContextTopic(topic);
                setMenuAnchorEl(e.currentTarget);
              }}
              sx={{ mr: -1 }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </ListItemButton>
        )}
      </Box>
    );
  };
  
  // 渲染分组和未分组的话题
  const renderTopicGroups = () => {
    // 在搜索模式下，直接显示所有过滤后的话题
    if (searchQuery) {
      return (
        <List sx={{ p: 0 }}>
          {filteredTopics.map((topic, index) => renderTopicItem(topic, index))}
        </List>
      );
    }
    
    return (
      <>
        {/* 创建分组按钮 */}
        <CreateGroupButton type="topic" onClick={handleOpenGroupDialog} />
        
        {/* 分组列表 */}
        {topicGroups.map((group) => {
          // 获取分组内的话题
          const groupTopics = assistantTopics.filter(
            topic => topicGroupMap[topic.id] === group.id
          );
          
          if (groupTopics.length === 0) return null;
          
          return (
            <DraggableGroup 
              key={group.id} 
              group={group} 
              onAddItem={onCreateTopic}
            >
              {groupTopics.map((topic, index) => 
                renderTopicItem(topic, index, true)
              )}
            </DraggableGroup>
          );
        })}
        
        {/* 未分组的话题 */}
        {ungroupedTopics.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                mb: 1, 
                fontWeight: 500, 
                color: 'text.secondary',
                fontSize: '0.875rem'
              }}
            >
              未分组
            </Typography>
            
            <List sx={{ pl: 1 }}>
              {ungroupedTopics.map((topic, index) => 
                renderTopicItem(topic, index)
              )}
            </List>
          </Box>
        )}
      </>
    );
  };
  
  // 添加到分组菜单
  const renderAddToGroupMenu = () => (
    <Menu
      anchorEl={addToGroupMenuAnchorEl}
      open={isAddToGroupMenuOpen}
      onClose={handleCloseAddToGroupMenu}
    >
      <MenuItem onClick={handleAddToNewGroup}>
        <AddIcon fontSize="small" sx={{ mr: 1 }} />
        创建新分组
      </MenuItem>
      
      {topicGroups.length > 0 && (
        <>
          <MenuItem disabled sx={{ opacity: 0.7 }}>
            选择现有分组
          </MenuItem>
          
          {topicGroups.map(group => (
            <MenuItem 
              key={group.id} 
              onClick={() => handleAddToGroup(group.id)}
              sx={{ pl: 3 }}
            >
              {group.name}
            </MenuItem>
          ))}
        </>
      )}
    </Menu>
  );

  return (
    <>
      {showSearch ? (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <TextField
            autoFocus
            variant="outlined"
            size="small"
            fullWidth
            placeholder="搜索话题"
            value={searchQuery}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
            }}
            sx={{ 
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
              }
            }}
          />
          <IconButton onClick={handleCloseSearch} size="small" sx={{ ml: 1 }}>
            <CloseIcon />
          </IconButton>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1">
            {currentAssistant?.name || '所有'} 话题
          </Typography>
          <Box>
            <IconButton onClick={handleSearchClick} size="small" sx={{ mr: 1 }}>
              <SearchIcon />
            </IconButton>
            <IconButton onClick={onCreateTopic} size="small">
              <AddIcon />
            </IconButton>
          </Box>
        </Box>
      )}
      
      {renderTopicGroups()}
      
      {/* 话题菜单 */}
      <Menu
        anchorEl={menuAnchorEl}
        open={isMenuOpen}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={handleEditPrompt}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          编辑提示词
        </MenuItem>
        <MenuItem onClick={(e) => {
          e.stopPropagation();
          if (contextTopic) {
            handleAddToGroupMenu(e, contextTopic);
          }
          handleCloseMenu();
        }}>
          <AddIcon fontSize="small" sx={{ mr: 1 }} />
          添加到分组
        </MenuItem>
        <MenuItem onClick={handleAnalyzeConversation}>
          <AnalyticsIcon fontSize="small" sx={{ mr: 1 }} />
          分析对话
        </MenuItem>
        <MenuItem 
          onClick={(e) => {
            if (contextTopic) {
              onDeleteTopic(contextTopic.id, e);
            }
            handleCloseMenu();
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          删除话题
        </MenuItem>
      </Menu>
      
      {/* 提示词编辑对话框 */}
      <Dialog
        open={promptDialogOpen}
        onClose={handleClosePromptDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>编辑话题提示词</DialogTitle>
        <DialogContent>
          {currentAssistant?.systemPrompt && (
            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={useAssistantPrompt}
                    onChange={(e) => {
                      setUseAssistantPrompt(e.target.checked);
                      if (e.target.checked) {
                        setTopicPrompt(currentAssistant.systemPrompt || '');
                      }
                    }}
                  />
                }
                label="使用助手默认提示词"
              />
            </Box>
          )}
          
            <TextField
              autoFocus
            label="话题提示词"
              multiline
            rows={6}
            fullWidth
              variant="outlined"
              value={topicPrompt}
              onChange={(e) => setTopicPrompt(e.target.value)}
            disabled={useAssistantPrompt}
            />
          
          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
            提示词将用于引导AI的行为和角色定位，作为系统指令发送给模型。
          </Typography>
        </DialogContent>
        <DialogActions>
              <Button onClick={handleClosePromptDialog}>取消</Button>
              <Button 
            onClick={handleSavePrompt}
            color="primary"
              >
                保存
              </Button>
        </DialogActions>
      </Dialog>
      
      {/* 分组对话框 */}
      <GroupDialog 
        open={groupDialogOpen}
        onClose={handleCloseGroupDialog}
        type="topic"
      />
      
      {renderAddToGroupMenu()}
    </>
  );
} 