import { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Menu,
  MenuItem,
  FormControlLabel,
  Checkbox,
  InputLabel,
  Select,
  FormControl
} from '@mui/material';
import { type ChatTopic } from '../../shared/types';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../shared/store';
import { addItemToGroup, removeItemFromGroup } from '../../shared/store/slices/groupsSlice';
import GroupDialog from './GroupDialog';
import { CreateGroupButton, DraggableGroup, DraggableItem } from './GroupComponents';
import { formatDateForTopicTitle } from '../../shared/utils';
import { SystemPromptService } from '../../shared/services/SystemPromptService';
import type { SystemPromptTemplate } from '../../shared/services/SystemPromptService';

interface TopicTabProps {
  currentAssistant: ({
    id: string;
    name: string;
    systemPrompt?: string;
    topics: ChatTopic[];
    topicIds?: string[]; // 添加可选的 topicIds 字段
  }) | null;
  currentTopic: ChatTopic | null;
  onSelectTopic: (topic: ChatTopic) => void;
  onCreateTopic: () => void;
  onDeleteTopic: (topicId: string, event: React.MouseEvent) => void;
  onUpdateTopic?: (topic: ChatTopic) => void;
}

export default function TopicTab({
  currentAssistant,
  currentTopic,
  onSelectTopic,
  onCreateTopic,
  onDeleteTopic,
  onUpdateTopic
}: TopicTabProps) {
  // 组件初始化时打印详细日志
  console.log('[TopicTab] 组件渲染', {
    currentAssistantId: currentAssistant?.id,
    currentAssistantName: currentAssistant?.name,
    topicsFromProps: currentAssistant?.topics?.length || 0,
    topicIdsFromProps: currentAssistant?.topicIds?.length || 0, 
    currentTopicId: currentTopic?.id
  });
  
  // 如果助手存在但没有话题，记录错误
  if (currentAssistant && (!currentAssistant.topics || currentAssistant.topics.length === 0)) {
    console.error('[TopicTab] 警告: 当前助手没有话题数组或话题数组为空', {
      assistant: currentAssistant.id,
      hasTopic: !!currentAssistant.topics,
      topicIdsLength: currentAssistant.topicIds?.length || 0
    });
  }

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

  // 编辑话题名称对话框相关状态
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [topicName, setTopicName] = useState('');

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

  // 从Redux状态获取话题列表
  const assistantTopics = useMemo(() => {
    if (!currentAssistant) return [];

    // 如果currentAssistant.topics存在且有内容，则使用它
    if (currentAssistant.topics && currentAssistant.topics.length > 0) {
      console.log('[TopicTab] 使用currentAssistant.topics，数量:', currentAssistant.topics.length);
      return currentAssistant.topics;
    }

    // 否则，尝试从topicIds加载话题
    if (currentAssistant.topicIds && currentAssistant.topicIds.length > 0) {
      console.log('[TopicTab] currentAssistant.topics为空，但有topicIds，数量:', currentAssistant.topicIds.length);
      console.warn('[TopicTab] 话题数据不一致，请检查useAssistant钩子是否正确加载话题');
    }

    return [];
  }, [currentAssistant]);

  // 添加调试日志以便追踪问题
  useEffect(() => {
    console.log('[TopicTab] currentAssistant:', currentAssistant);
    console.log('[TopicTab] assistantTopics:', assistantTopics);

    // 检查 topics 和 topicIds 是否同步
    if (currentAssistant) {
      console.log('[TopicTab] currentAssistant.name:', currentAssistant.name);
      console.log('[TopicTab] currentAssistant.id:', currentAssistant.id);
      console.log('[TopicTab] currentAssistant.topics.length:', currentAssistant.topics?.length || 0);

      // 检查是否有 topicIds 中的 ID 不在 topics 中
      if (currentAssistant.topicIds && currentAssistant.topics) {
        console.log('[TopicTab] currentAssistant.topicIds:', currentAssistant.topicIds);

        const missingTopics = currentAssistant.topicIds.filter(
          (id: string) => !currentAssistant.topics.some(topic => topic.id === id)
        );
        if (missingTopics.length > 0) {
          console.warn('[TopicTab] 发现 topicIds 中存在但 topics 中不存在的话题:', missingTopics);
        }
      }
    } else {
      console.warn('[TopicTab] currentAssistant 为 null 或 undefined');
    }
  }, [currentAssistant, assistantTopics]);

  // 获取未分组的话题
  const ungroupedTopics = useMemo(() => {
    return assistantTopics.filter(topic => !topicGroupMap[topic.id]);
  }, [assistantTopics, topicGroupMap]);

  const [templates, setTemplates] = useState<SystemPromptTemplate[]>([]);
  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // 初始化模板数据
  useEffect(() => {
    const loadTemplates = async () => {
      const promptService = SystemPromptService.getInstance();
      await promptService.initialize();
      setTemplates(promptService.getTemplates());
    };
    loadTemplates();
  }, []);

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

  // 筛选话题
  const filteredTopics = useMemo(() => {
    if (!searchQuery) return assistantTopics;
    return assistantTopics.filter(topic => {
      // 检查标题
      if (topic.title && topic.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return true;
      }

      // 检查消息内容
      return topic.messages.some(message => {
        const content = message.content;
        if (typeof content === 'string') {
          return content.toLowerCase().includes(searchQuery.toLowerCase());
        } else if (content && typeof content === 'object') {
          // 如果内容是对象，检查text属性
          return content.text ? content.text.toLowerCase().includes(searchQuery.toLowerCase()) : false;
        }
        return false;
      });
    });
  }, [searchQuery, assistantTopics]);

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

  // handleRemoveFromGroup未使用但预留，暂时添加注释以避免TypeScript警告
  // const handleRemoveFromGroup = (event: React.MouseEvent, topic: ChatTopic) => {
  //   event.stopPropagation();
  //   if (topicGroupMap[topic.id]) {
  //     dispatch(removeItemFromGroup({
  //       itemId: topic.id,
  //       type: 'topic'
  //     }));
  //   }
  // };

  // 添加话题到新分组
  const handleAddToNewGroup = () => {
    setGroupDialogOpen(true);
    handleCloseAddToGroupMenu();
  };

  // handleDeleteClick未使用但预留，暂时添加注释以避免TypeScript警告
  // const handleDeleteClick = (event: React.MouseEvent, topicId: string) => {
  //   event.stopPropagation();
  //   event.preventDefault();
  //   setTopicPendingDelete(topicId);
  //   // 设置2秒后清除状态，如果用户没确认删除
  //   setTimeout(() => {
  //     // 防止清除后来设置的其他topicPendingDelete
  //     if (topicPendingDelete === topicId) {
  //       setTopicPendingDelete(null);
  //     }
  //   }, 2000);
  // };

  // 编辑话题名称
  const handleEditTopicName = () => {
    if (!contextTopic) return;

    setTopicName(contextTopic.title || '');
    setNameDialogOpen(true);
    handleCloseMenu();
  };

  // 保存话题名称
  const handleSaveTopicName = () => {
    if (contextTopic && onUpdateTopic) {
      const now = new Date();
      const formattedDate = formatDateForTopicTitle(now);
      onUpdateTopic({
        ...contextTopic,
        title: topicName.trim() || `新的对话 ${formattedDate}`
      });
    }
    handleCloseNameDialog();
  };

  // 关闭名称编辑对话框
  const handleCloseNameDialog = () => {
    setNameDialogOpen(false);
    setTopicName('');
  };

  // 选择模板时更新编辑提示词
  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setSelectedTemplateId(templateId);

    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setTopicPrompt(template.content);
      }
    }

    // 如果选择了模板，关闭使用助手提示词的选项
    setUseAssistantPrompt(false);
  };

  // 渲染单个话题项
  const renderTopicItem = (topic: ChatTopic, index: number, inGroup: boolean = false) => {
    const isSelected = currentTopic?.id === topic.id;

    // 添加触发点击话题的处理函数，带详细日志
    const handleTopicClick = () => {
      console.log('[TopicTab] 话题被点击:', {
        topicId: topic.id,
        topicName: topic.name,
        isSelected,
        currentTopicId: currentTopic?.id,
        assistantId: currentAssistant?.id,
        topicAssistantId: topic.assistantId
      });
      onSelectTopic(topic);
    };

    return (
      <Box key={topic.id} sx={{ position: 'relative' }}>
        {inGroup ? (
          <DraggableItem id={topic.id} index={index}>
            <ListItemButton
              onClick={handleTopicClick}
              selected={isSelected}
              sx={{
                borderRadius: '8px',
                mb: 1,
                pl: 2,
                height: '40px',
                '&.Mui-selected': {
                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                },
                '&.Mui-selected:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.12)',
                }
              }}
            >
              <ListItemText
                primary={topic.name || topic.title}
                primaryTypographyProps={{
                  variant: 'body2',
                  fontWeight: isSelected ? 600 : 400,
                  sx: {
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }
                }}
              />
              {isSelected && (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTopic(topic.id, e);
                  }}
                  sx={{ ml: 1, p: 0 }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
              {!isSelected && (
                <IconButton
                  size="small"
                  onClick={(e) => handleAddToGroupMenu(e, topic)}
                  sx={{ ml: 1, opacity: 0.6 }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              )}
            </ListItemButton>
          </DraggableItem>
        ) : (
          <ListItemButton
            onClick={handleTopicClick}
            selected={isSelected}
            sx={{
              borderRadius: '8px',
              mb: 1,
              pl: 2,
              height: '40px',
              '&.Mui-selected': {
                backgroundColor: 'rgba(25, 118, 210, 0.08)',
              },
              '&.Mui-selected:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.12)',
              }
            }}
          >
            <ListItemText
              primary={topic.name || topic.title}
              primaryTypographyProps={{
                variant: 'body2',
                fontWeight: isSelected ? 600 : 400,
                sx: {
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }
              }}
            />
            {isSelected && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTopic(topic.id, e);
                }}
                sx={{ ml: 1, p: 0 }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
            {!isSelected && (
              <IconButton
                size="small"
                onClick={(e) => handleAddToGroupMenu(e, topic)}
                sx={{ ml: 1, opacity: 0.6 }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            )}
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
            {currentAssistant?.name ? `${currentAssistant.name}的话题` : '所有话题'}
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
        <MenuItem onClick={handleEditTopicName}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          编辑名称
        </MenuItem>
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
                        setUseTemplate(false);
                        setSelectedTemplateId('');
                      }
                    }}
                  />
                }
                label="使用助手默认提示词"
              />
            </Box>
          )}

          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={useTemplate}
                  onChange={(e) => {
                    setUseTemplate(e.target.checked);
                    if (e.target.checked) {
                      setUseAssistantPrompt(false);
                    }
                  }}
                />
              }
              label="使用提示词模板"
            />
          </Box>

          {useTemplate && (
            <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
              <InputLabel>选择提示词模板</InputLabel>
              <Select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e as any)}
                label="选择提示词模板"
              >
                {templates.map(template => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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

      {/* 话题名称编辑对话框 */}
      <Dialog
        open={nameDialogOpen}
        onClose={handleCloseNameDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>编辑话题名称</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="话题名称"
            fullWidth
            variant="outlined"
            value={topicName}
            onChange={(e) => setTopicName(e.target.value)}
            margin="dense"
            placeholder="为您的对话起个名字"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNameDialog}>取消</Button>
          <Button
            onClick={handleSaveTopicName}
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