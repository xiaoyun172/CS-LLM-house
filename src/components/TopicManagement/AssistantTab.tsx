import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Menu,
  MenuItem,
  IconButton,
  Tooltip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import FaceIcon from '@mui/icons-material/Face';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import WorkIcon from '@mui/icons-material/Work';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import PeopleIcon from '@mui/icons-material/People';
import ArticleIcon from '@mui/icons-material/Article';
import StorefrontIcon from '@mui/icons-material/Storefront';
import InventoryIcon from '@mui/icons-material/Inventory';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import FolderIcon from '@mui/icons-material/Folder';
import EditOffIcon from '@mui/icons-material/EditOff';
import EditAttributesIcon from '@mui/icons-material/EditAttributes';
import { type Assistant } from '../../shared/types/Assistant';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../shared/store';
import { addItemToGroup, removeItemFromGroup } from '../../shared/store/slices/groupsSlice';
import { deleteTopic } from '../../shared/store/messagesSlice';
import { CreateGroupButton, DraggableGroup, DraggableItem } from './GroupComponents';
import GroupDialog from './GroupDialog';
import { TopicService } from '../../shared/services/TopicService';
import { SystemPromptService } from '../../shared/services/SystemPromptService';
import type { SystemPromptTemplate } from '../../shared/services/SystemPromptService';
import { EventEmitter, EVENT_NAMES } from '../../shared/services/EventService';
import { v4 as uuid } from 'uuid';

// 预设助手数据 - 应该移动到服务中
const predefinedAssistants: Assistant[] = [
  {
    id: 'default',
    name: '默认助手',
    description: '通用型AI助手，可以回答各种问题',
    icon: <EmojiEmotionsIcon sx={{ color: '#FFD700' }} />,
    isSystem: true,
    systemPrompt: '你是一个友好、专业、乐于助人的AI助手。你会以客观、准确的态度回答用户的问题，并在不确定的情况下坦诚表明。你可以协助用户完成各种任务，提供信息，或进行有意义的对话。',
    topicIds: [],
    topics: []
  },
  {
    id: 'browser',
    name: '消息器顽天助手',
    description: '帮助分析各种网页内容',
    icon: <AutoAwesomeIcon sx={{ color: '#1E90FF' }} />,
    isSystem: true,
    systemPrompt: '你是一个专注于网页内容分析的AI助手。你能帮助用户理解、总结和提取网页中的关键信息。无论是新闻、文章、论坛还是社交媒体内容，你都能提供有价值的见解和分析。',
    topicIds: [],
    topics: []
  },
  {
    id: 'product-manager',
    name: '产品经理',
    description: '帮助规划和设计产品功能',
    icon: <WorkIcon sx={{ color: '#FF9800' }} />,
    systemPrompt: '你是一位经验丰富的产品经理。你擅长产品规划、需求分析、功能设计和用户体验优化。你会从用户需求和商业价值的角度思考问题，并提供专业的产品建议和解决方案。',
    topicIds: [],
    topics: []
  },
  {
    id: 'strategy-pm',
    name: '策略产品经理',
    description: '专注于产品战略和路线图规划',
    icon: <AnalyticsIcon sx={{ color: '#F44336' }} />,
    systemPrompt: '你是一位专注于产品战略的产品经理。你擅长分析市场趋势、竞品研究、商业模式设计和产品路线图规划。你能从宏观角度思考产品发展方向，并提供有价值的战略建议。',
    topicIds: [],
    topics: []
  },
  {
    id: 'community-ops',
    name: '社群运营',
    description: '帮助社区和用户管理',
    icon: <PeopleIcon sx={{ color: '#2196F3' }} />,
    systemPrompt: '你是一位专业的社群运营专家。你擅长用户互动、内容策划、活动组织和社区氛围营造。你了解如何提升用户黏性和活跃度，构建健康有序的社区生态。',
    topicIds: [],
    topics: []
  },
  {
    id: 'content-ops',
    name: '内容运营',
    description: '协助内容创作和管理',
    icon: <ArticleIcon sx={{ color: '#4CAF50' }} />,
    systemPrompt: '你是一位专业的内容运营专家。你擅长内容策划、创作指导、质量把控和传播优化。你了解如何通过优质内容吸引用户，提升品牌影响力。',
    topicIds: [],
    topics: []
  },
  {
    id: 'merchant-ops',
    name: '商家运营',
    description: '协助商家管理和优化',
    icon: <StorefrontIcon sx={{ color: '#9C27B0' }} />,
    systemPrompt: '你是一位专业的商家运营专家。你擅长商家引入、管理、培训和绩效优化。你了解如何提升商家满意度和平台生态健康度，促进双赢合作。',
    topicIds: [],
    topics: []
  },
  {
    id: 'product-ops',
    name: '产品运营',
    description: '帮助产品功能推广和用户增长',
    icon: <InventoryIcon sx={{ color: '#795548' }} />,
    systemPrompt: '你是一位专业的产品运营专家。你擅长功能推广、用户激活、留存提升和数据分析。你了解如何让产品更好地触达用户，提升关键指标。',
    topicIds: [],
    topics: []
  }
];

interface AssistantTabProps {
  userAssistants: Assistant[];
  currentAssistant: Assistant | null;
  onSelectAssistant: (assistant: Assistant) => void;
  onAddAssistant: (assistant: Assistant) => void;
  onUpdateAssistant?: (assistant: Assistant) => void;
  onDeleteAssistant?: (assistantId: string) => void;
}

export default function AssistantTab({
  userAssistants,
  currentAssistant,
  onSelectAssistant,
  onAddAssistant,
  onUpdateAssistant,
  onDeleteAssistant
}: AssistantTabProps) {
  const dispatch = useDispatch();
  const [assistantDialogOpen, setAssistantDialogOpen] = useState(false);
  const [selectedAssistantId, setSelectedAssistantId] = useState<string | null>(null);

  // 编辑助手对话框状态
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [assistantToEdit, setAssistantToEdit] = useState<Assistant | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrompt, setEditPrompt] = useState('');

  // 编辑分组模式状态
  const [isGroupEditMode, setIsGroupEditMode] = useState(false);

  // 助手操作菜单状态
  const [assistantMenuAnchorEl, setAssistantMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMenuAssistant, setSelectedMenuAssistant] = useState<Assistant | null>(null);

  // 添加助手到分组对话框状态
  const [addToGroupMenuAnchorEl, setAddToGroupMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [assistantToGroup, setAssistantToGroup] = useState<Assistant | null>(null);

  // 从Redux获取分组数据
  const { groups, assistantGroupMap } = useSelector((state: RootState) => state.groups);

  // 添加分组相关状态
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);

  // 获取助手分组
  const assistantGroups = useMemo(() => {
    return groups
      .filter(group => group.type === 'assistant')
      .sort((a, b) => a.order - b.order);
  }, [groups]);

  // 获取未分组的助手
  const ungroupedAssistants = useMemo(() => {
    return userAssistants.filter(assistant => !assistantGroupMap[assistant.id]);
  }, [userAssistants, assistantGroupMap]);

  // 初始化模板数据
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

  // 打开助手选择对话框
  const handleOpenAssistantDialog = () => {
    setAssistantDialogOpen(true);
    setSelectedAssistantId(null);
  };

  // 关闭助手选择对话框
  const handleCloseAssistantDialog = () => {
    setAssistantDialogOpen(false);
  };

  // 选择助手
  const handleSelectAssistant = (assistantId: string) => {
    setSelectedAssistantId(assistantId);
  };

  // 确认添加助手
  const handleAddAssistant = () => {
    if (!selectedAssistantId) return;
    const selected = predefinedAssistants.find(assistant => assistant.id === selectedAssistantId);
    if (!selected) return;
    const existingSameNameCount = userAssistants.filter(a =>
      a.name === selected.name || a.name.startsWith(`${selected.name} (`)
    ).length;

    const assistantData = {
      ...selected,
      id: uuid(),
      name: existingSameNameCount > 0 ? `${selected.name} (${existingSameNameCount + 1})` : selected.name,
      isSystem: false,
    };

    onAddAssistant(assistantData as Assistant);
    handleCloseAssistantDialog();
  };

  // 打开分组对话框
  const handleOpenGroupDialog = () => {
    setGroupDialogOpen(true);
  };

  // 关闭分组对话框
  const handleCloseGroupDialog = () => {
    setGroupDialogOpen(false);
  };

  // 切换分组编辑模式
  const toggleGroupEditMode = () => {
    setIsGroupEditMode(!isGroupEditMode);
  };

  // 打开助手操作菜单或分组操作菜单
  const handleOpenMenu = (event: React.MouseEvent, assistant: Assistant) => {
    event.stopPropagation();
    event.preventDefault();

    if (isGroupEditMode) {
      // 分组编辑模式 - 打开分组操作菜单
      setAssistantToGroup(assistant);
      setAddToGroupMenuAnchorEl(event.currentTarget as HTMLElement);
    } else {
      // 普通模式 - 打开助手操作菜单
      setSelectedMenuAssistant(assistant);
      setAssistantMenuAnchorEl(event.currentTarget as HTMLElement);
    }
  };

  // 关闭助手操作菜单
  const handleCloseAssistantMenu = () => {
    setAssistantMenuAnchorEl(null);
    setSelectedMenuAssistant(null);
  };

  // 处理编辑助手
  const handleEditAssistant = () => {
    if (selectedMenuAssistant) {
      // 打开编辑对话框并初始化数据
      setAssistantToEdit(selectedMenuAssistant);
      setEditName(selectedMenuAssistant.name);
      setEditDescription(selectedMenuAssistant.description || '');
      setEditPrompt(selectedMenuAssistant.systemPrompt || '');
      setEditDialogOpen(true);
    }
    handleCloseAssistantMenu();
  };

  // 处理复制助手
  const handleCopyAssistant = () => {
    if (selectedMenuAssistant) {
      // 准备复制的助手数据
      const assistantData = {
        name: `${selectedMenuAssistant.name} (复制)`,
        description: selectedMenuAssistant.description,
        systemPrompt: selectedMenuAssistant.systemPrompt || ''
      };

      onAddAssistant(assistantData as Assistant);
    }
    handleCloseAssistantMenu();
  };

  // 处理清空话题
  const handleClearTopics = () => {
    if (selectedMenuAssistant && onUpdateAssistant) {
      const topicIdsToDelete = [...(selectedMenuAssistant.topicIds || [])];
      const assistantIdForEvent = selectedMenuAssistant.id;
      const updatedAssistant: Assistant = {
        ...selectedMenuAssistant,
        topicIds: []
      };
      onUpdateAssistant(updatedAssistant);

      if (topicIdsToDelete.length > 0) {
        Promise.all(topicIdsToDelete.map(async (topicId) => {
          try {
            await TopicService.deleteTopic(topicId);
            dispatch(deleteTopic(topicId));
          } catch (error) {
            console.warn(`[AssistantTab] 删除话题 ${topicId} 时出错:`, error);
          }
        })).then(() => {
          EventEmitter.emit(EVENT_NAMES.TOPICS_CLEARED, { assistantId: assistantIdForEvent, clearedTopicIds: topicIdsToDelete });
          console.log(`[AssistantTab] Emitted TOPICS_CLEARED for ${assistantIdForEvent}.`);
        }).catch(error => {
          console.error('[AssistantTab] Promise.all处理话题删除时发生意外错误:', error);
        });
      }

      if (currentAssistant && currentAssistant.id === assistantIdForEvent) {
        console.log('[AssistantTab] 清空了当前助手的话题，不再自动创建新话题.');
        localStorage.setItem('_justClearedTopics', assistantIdForEvent);
      }
    }
    handleCloseAssistantMenu();
  };

  // 处理删除助手
  const handleDeleteAssistant = () => {
    if (selectedMenuAssistant && onDeleteAssistant) {
      onDeleteAssistant(selectedMenuAssistant.id);
    }
    handleCloseAssistantMenu();
  };

  // 打开分组管理
  const handleOpenGroupManagement = () => {
    if (selectedMenuAssistant) {
      setAssistantToGroup(selectedMenuAssistant);
      setAddToGroupMenuAnchorEl(assistantMenuAnchorEl);
    }
    handleCloseAssistantMenu();
  };

  // 关闭添加到分组菜单
  const handleCloseAddToGroupMenu = () => {
    setAddToGroupMenuAnchorEl(null);
    setAssistantToGroup(null);
  };

  // 添加助手到分组
  const handleAddToGroup = (groupId: string) => {
    if (assistantToGroup) {
      // 如果助手已经在其他分组中，先移除
      if (assistantGroupMap[assistantToGroup.id]) {
        dispatch(removeItemFromGroup({
          itemId: assistantToGroup.id,
          type: 'assistant'
        }));
      }

      // 添加到新分组
      dispatch(addItemToGroup({
        groupId,
        itemId: assistantToGroup.id
      }));
    }

    handleCloseAddToGroupMenu();
  };

  // 添加助手到新分组
  const handleAddToNewGroup = () => {
    setGroupDialogOpen(true);
    handleCloseAddToGroupMenu();
  };

  // 从分组中移除助手
  const handleRemoveFromGroup = (event: React.MouseEvent, assistant: Assistant) => {
    event.stopPropagation();
    event.preventDefault();

    dispatch(removeItemFromGroup({
      itemId: assistant.id,
      type: 'assistant'
    }));
  };

  // 关闭编辑对话框
  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setAssistantToEdit(null);
    setEditName('');
    setEditDescription('');
    setEditPrompt('');
  };

  // 保存编辑后的助手
  const handleSaveAssistant = () => {
    if (assistantToEdit && onUpdateAssistant) {
      const updatedAssistant: Assistant = {
        ...assistantToEdit,
        name: editName,
        description: editDescription,
        systemPrompt: editPrompt
      };
      onUpdateAssistant(updatedAssistant);
      handleCloseEditDialog();
    }
  };

  // 选择模板时更新编辑提示词
  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setSelectedTemplateId(templateId);
    
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setEditPrompt(template.content);
      }
    }
  };

  // 渲染单个助手项
  const renderAssistantItem = (assistant: Assistant, index: number, inGroup: boolean = false) => {
    const isSelected = currentAssistant?.id === assistant.id;
    
    return (
      <Box key={assistant.id} sx={{ position: 'relative' }}>
        {inGroup ? (
          <DraggableItem id={assistant.id} index={index}>
            <ListItemButton
              onClick={() => onSelectAssistant(assistant)}
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
                {assistant.icon || <FaceIcon />}
              </ListItemIcon>
              <ListItemText
                primary={assistant.name}
                secondary={`${assistant.topicIds?.length || 0}个话题`}
                primaryTypographyProps={{
                  variant: 'body2',
                  fontWeight: isSelected ? 600 : 400
                }}
                secondaryTypographyProps={{
                  variant: 'caption'
                }}
              />

              {isGroupEditMode ? (
                <IconButton
                  size="small"
                  onClick={(e) => handleRemoveFromGroup(e, assistant)}
                  sx={{ mr: -1 }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              ) : (
                <IconButton
                  size="small"
                  onClick={(e) => handleOpenMenu(e, assistant)}
                  sx={{ mr: -1 }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              )}
            </ListItemButton>
          </DraggableItem>
        ) : (
          <ListItemButton
            onClick={() => onSelectAssistant(assistant)}
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
              {assistant.icon || <FaceIcon />}
            </ListItemIcon>
            <ListItemText
              primary={assistant.name}
              secondary={`${assistant.topicIds?.length || 0}个话题`}
              primaryTypographyProps={{
                variant: 'body2',
                fontWeight: isSelected ? 600 : 400
              }}
              secondaryTypographyProps={{
                variant: 'caption'
              }}
            />

            <IconButton
              size="small"
              onClick={(e) => handleOpenMenu(e, assistant)}
              sx={{ mr: -1 }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </ListItemButton>
        )}
      </Box>
    );
  };

  // 渲染分组和未分组的助手
  const renderAssistantGroups = () => {
    return (
      <>
        {/* 创建分组按钮 */}
        <CreateGroupButton type="assistant" onClick={handleOpenGroupDialog} />

        {/* 分组列表 */}
        {assistantGroups.map((group) => {
          // 获取分组内的助手
          const groupAssistants = userAssistants.filter(
            assistant => assistantGroupMap[assistant.id] === group.id
          );

          if (groupAssistants.length === 0) return null;

          return (
            <DraggableGroup
              key={group.id}
              group={group}
              onAddItem={() => handleOpenAssistantDialog()}
            >
              {groupAssistants.map((assistant, index) =>
                renderAssistantItem(assistant, index, true)
              )}
            </DraggableGroup>
          );
        })}

        {/* 未分组的助手 */}
        {ungroupedAssistants.length > 0 && (
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
              {ungroupedAssistants.map((assistant, index) =>
                renderAssistantItem(assistant, index)
              )}
            </List>
          </Box>
        )}
      </>
    );
  };

  // 助手操作菜单
  const renderAssistantMenu = () => (
    <Menu
      anchorEl={assistantMenuAnchorEl}
      open={Boolean(assistantMenuAnchorEl)}
      onClose={handleCloseAssistantMenu}
    >
      <MenuItem onClick={handleEditAssistant}>
        <ListItemIcon>
          <EditIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary="编辑助手" />
      </MenuItem>

      <MenuItem onClick={handleCopyAssistant}>
        <ListItemIcon>
          <ContentCopyIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary="复制助手" />
      </MenuItem>

      <MenuItem onClick={handleOpenGroupManagement}>
        <ListItemIcon>
          <FolderIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary="分组管理" />
      </MenuItem>

      <MenuItem onClick={handleClearTopics}>
        <ListItemIcon>
          <DeleteSweepIcon fontSize="small" sx={{ color: 'warning.main' }} />
        </ListItemIcon>
        <ListItemText primary="清空话题" />
      </MenuItem>

      <MenuItem onClick={handleDeleteAssistant}>
        <ListItemIcon>
          <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
        </ListItemIcon>
        <ListItemText primary="删除" />
      </MenuItem>
    </Menu>
  );

  // 添加到分组菜单
  const renderAddToGroupMenu = () => (
    <Menu
      anchorEl={addToGroupMenuAnchorEl}
      open={Boolean(addToGroupMenuAnchorEl)}
      onClose={handleCloseAddToGroupMenu}
    >
      <MenuItem onClick={handleAddToNewGroup}>
        <AddIcon fontSize="small" sx={{ mr: 1 }} />
        创建新分组
      </MenuItem>

      {assistantGroups.length > 0 && (
        <>
          <MenuItem disabled sx={{ opacity: 0.7 }}>
            选择现有分组
          </MenuItem>

          {assistantGroups.map(group => (
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1">
          助手
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title={isGroupEditMode ? "退出分组编辑模式" : "进入分组编辑模式"}>
            <IconButton
              onClick={toggleGroupEditMode}
              size="small"
              color={isGroupEditMode ? "primary" : "default"}
              sx={{ mr: 1 }}
            >
              {isGroupEditMode ? <EditAttributesIcon /> : <EditOffIcon />}
            </IconButton>
          </Tooltip>
          <IconButton
            onClick={handleOpenAssistantDialog}
            size="small"
          >
            <AddIcon />
          </IconButton>
        </Box>
      </Box>

      {isGroupEditMode && (
        <Box sx={{ mb: 2, px: 1 }}>
          <Typography variant="caption" color="text.secondary">
            已进入分组编辑模式，可以对助手进行分组管理
          </Typography>
        </Box>
      )}

      {renderAssistantGroups()}

      {/* 助手选择对话框 */}
      <Dialog
        open={assistantDialogOpen}
        onClose={handleCloseAssistantDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>添加助手</DialogTitle>
        <DialogContent>
          {/* 预设助手列表 */}
          <List>
            {predefinedAssistants.map(assistant => (
              <ListItemButton
                key={assistant.id}
                onClick={() => handleSelectAssistant(assistant.id)}
                selected={selectedAssistantId === assistant.id}
                sx={{ borderRadius: '8px', mb: 1 }}
              >
                <ListItemIcon>
                  {assistant.icon}
                </ListItemIcon>
                <ListItemText
                  primary={assistant.name}
                  secondary={assistant.description}
                />
                {selectedAssistantId === assistant.id && (
                  <CheckCircleIcon color="primary" />
                )}
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAssistantDialog}>取消</Button>
          <Button
            onClick={handleAddAssistant}
            variant="contained"
            disabled={!selectedAssistantId}
          >
            添加
          </Button>
        </DialogActions>
      </Dialog>

      {/* 编辑助手对话框 */}
      <Dialog
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>编辑助手</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              autoFocus
              margin="dense"
              label="助手名称"
              fullWidth
              variant="outlined"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="描述"
              fullWidth
              variant="outlined"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              sx={{ mb: 2 }}
            />
            <DialogContentText sx={{ mb: 1 }}>
              系统提示词（定义助手的行为和风格）
            </DialogContentText>
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={useTemplate}
                  onChange={(e) => setUseTemplate(e.target.checked)}
                />
              }
              label="使用提示词模板"
            />
            
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
              margin="dense"
              label="系统提示词"
              fullWidth
              multiline
              rows={6}
              variant="outlined"
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder="输入系统提示词..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>取消</Button>
          <Button
            onClick={handleSaveAssistant}
            variant="contained"
            disabled={!editName}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 分组对话框 */}
      <GroupDialog
        open={groupDialogOpen}
        onClose={handleCloseGroupDialog}
        type="assistant"
      />

      {/* 助手操作菜单 */}
      {renderAssistantMenu()}

      {/* 添加到分组菜单 */}
      {renderAddToGroupMenu()}
    </>
  );
}