import { useState } from 'react';
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
  DialogActions,
  Button,
  TextField,
  Avatar,
  Chip,
  Menu,
  MenuItem,
  IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
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
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { type Assistant } from '../../shared/types/Assistant';
import { storageService } from '../../shared/services/storageService';

// 预设助手数据 - 应该移动到服务中
const predefinedAssistants: Assistant[] = [
  { 
    id: 'default', 
    name: '默认助手', 
    description: '通用型AI助手，可以回答各种问题', 
    icon: <EmojiEmotionsIcon sx={{ color: '#FFD700' }} />,
    isSystem: true
  },
  { 
    id: 'browser', 
    name: '消息器顽天助手', 
    description: '帮助分析各种网页内容', 
    icon: <AutoAwesomeIcon sx={{ color: '#1E90FF' }} />,
    isSystem: true 
  },
  { 
    id: 'product-manager', 
    name: '产品经理', 
    description: '帮助规划和设计产品功能', 
    icon: <WorkIcon sx={{ color: '#FF9800' }} />
  },
  { 
    id: 'strategy-pm', 
    name: '策略产品经理', 
    description: '专注于产品战略和路线图规划', 
    icon: <AnalyticsIcon sx={{ color: '#F44336' }} />
  },
  { 
    id: 'community-ops', 
    name: '社群运营', 
    description: '帮助社区和用户管理', 
    icon: <PeopleIcon sx={{ color: '#2196F3' }} />
  },
  { 
    id: 'content-ops', 
    name: '内容运营', 
    description: '协助内容创作和管理', 
    icon: <ArticleIcon sx={{ color: '#4CAF50' }} />
  },
  { 
    id: 'merchant-ops', 
    name: '商家运营', 
    description: '协助商家管理和优化', 
    icon: <StorefrontIcon sx={{ color: '#9C27B0' }} />
  },
  { 
    id: 'product-ops', 
    name: '产品运营', 
    description: '帮助产品功能推广和用户增长', 
    icon: <InventoryIcon sx={{ color: '#795548' }} />
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
  const [assistantDialogOpen, setAssistantDialogOpen] = useState(false);
  const [selectedAssistantId, setSelectedAssistantId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 助手长按菜单相关状态
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [contextAssistant, setContextAssistant] = useState<Assistant | null>(null);
  
  // 编辑提示词对话框相关状态
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  
  // 是否显示菜单
  const isMenuOpen = Boolean(menuAnchorEl);
  
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
    
    // 检查是否已经添加过
    const exists = userAssistants.some(assistant => assistant.id === selectedAssistantId);
    if (exists) {
      handleCloseAssistantDialog();
      return;
    }
    
    // 获取选择的助手
    const selected = predefinedAssistants.find(assistant => assistant.id === selectedAssistantId);
    if (!selected) return;
    
    // 添加到用户助手列表
    const newAssistant = {
      ...selected,
      topicIds: []
    };
    
    onAddAssistant(newAssistant);
    handleCloseAssistantDialog();
  };

  // 过滤可显示的预设助手
  const getFilteredAssistants = () => {
    if (!searchQuery) return predefinedAssistants;
    
    return predefinedAssistants.filter(assistant => 
      assistant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assistant.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };
  
  // 长按处理 - 打开菜单
  const handleLongPress = (event: React.MouseEvent, assistant: Assistant) => {
    event.preventDefault();
    event.stopPropagation();
    setContextAssistant(assistant);
    setMenuAnchorEl(event.currentTarget as HTMLElement);
  };
  
  // 关闭菜单
  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
    setContextAssistant(null);
  };
  
  // 编辑提示词
  const handleEditPrompt = () => {
    if (!contextAssistant) return;
    
    setSystemPrompt(contextAssistant.systemPrompt || '');
    setPromptDialogOpen(true);
    handleCloseMenu();
  };
  
  // 关闭提示词对话框
  const handleClosePromptDialog = () => {
    setPromptDialogOpen(false);
  };
  
  // 复制助手
  const handleDuplicateAssistant = () => {
    if (!contextAssistant) return;
    
    const newAssistant = {
      ...contextAssistant,
      id: `${contextAssistant.id}-copy-${Date.now()}`,
      name: `${contextAssistant.name} (复制)`,
      topicIds: []
    };
    
    onAddAssistant(newAssistant);
    handleCloseMenu();
  };
  
  // 删除助手
  const handleDeleteAssistant = () => {
    if (!contextAssistant || !onDeleteAssistant) return;
    
    // 系统助手不能删除
    if (contextAssistant.isSystem) {
      handleCloseMenu();
      return;
    }
    
    onDeleteAssistant(contextAssistant.id);
    handleCloseMenu();
  };

  return (
    <>
      <List sx={{ p: 0 }}>
        {userAssistants.map((assistant) => (
          <ListItemButton 
            key={assistant.id} 
            sx={{ 
              borderRadius: '8px', 
              mb: 1,
              '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' },
              bgcolor: currentAssistant?.id === assistant.id ? 'rgba(103, 58, 183, 0.08)' : 'transparent',
            }}
            onClick={() => onSelectAssistant(assistant)}
            onContextMenu={(e) => handleLongPress(e, assistant)}
            onTouchStart={(e) => {
              const touchTimer = setTimeout(() => {
                handleLongPress(e.nativeEvent as unknown as React.MouseEvent, assistant);
              }, 800);
              
              e.currentTarget.dataset.timer = String(touchTimer);
            }}
            onTouchEnd={(e) => {
              const timer = e.currentTarget.dataset.timer;
              if (timer) clearTimeout(Number(timer));
            }}
            onTouchMove={(e) => {
              const timer = e.currentTarget.dataset.timer;
              if (timer) clearTimeout(Number(timer));
            }}
          >
            <ListItemIcon sx={{ minWidth: '40px' }}>
              {assistant.icon}
            </ListItemIcon>
            <ListItemText 
              primary={assistant.name} 
              primaryTypographyProps={{ 
                sx: { 
                  fontWeight: currentAssistant?.id === assistant.id ? 'medium' : 'normal',
                  color: currentAssistant?.id === assistant.id ? 'primary.main' : 'text.primary'
                }
              }}
            />
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleLongPress(e, assistant);
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </ListItemButton>
        ))}
        <ListItemButton 
          onClick={handleOpenAssistantDialog}
          sx={{ 
            borderRadius: '8px',
            '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
          }}
        >
          <ListItemIcon sx={{ minWidth: '40px' }}>
            <AddIcon />
          </ListItemIcon>
          <ListItemText primary="添加助手" />
        </ListItemButton>
      </List>
      
      {/* 助手选择对话框 */}
      <Dialog 
        open={assistantDialogOpen} 
        onClose={handleCloseAssistantDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">选择助手</Typography>
          <TextField
            placeholder="搜索助手"
            variant="outlined"
            fullWidth
            size="small"
            value={searchQuery}
            onChange={handleSearchChange}
            sx={{ mt: 2 }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
            }}
          />
        </DialogTitle>
        <DialogContent dividers>
          <Box 
            sx={{ 
              display: 'grid', 
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)'
              },
              gap: 1
            }}
          >
            {getFilteredAssistants().map((assistant) => {
              const isAlreadyAdded = userAssistants.some(a => a.id === assistant.id);
              return (
                <Box
                  key={assistant.id}
                  onClick={() => !isAlreadyAdded && handleSelectAssistant(assistant.id)}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: selectedAssistantId === assistant.id ? 'primary.main' : 'divider',
                    bgcolor: selectedAssistantId === assistant.id ? 'rgba(103, 58, 183, 0.08)' : 'transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: isAlreadyAdded ? 'default' : 'pointer',
                    opacity: isAlreadyAdded ? 0.6 : 1,
                    position: 'relative',
                    '&:hover': {
                      bgcolor: isAlreadyAdded ? 'transparent' : 'rgba(0, 0, 0, 0.04)',
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Avatar sx={{ mr: 1, bgcolor: 'primary.light' }}>
                      {assistant.icon}
                    </Avatar>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                      {assistant.name}
                    </Typography>
                    {isAlreadyAdded && (
                      <Chip 
                        label="已添加" 
                        size="small" 
                        sx={{ ml: 'auto' }}
                      />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {assistant.description}
                  </Typography>
                  {selectedAssistantId === assistant.id && (
                    <CheckCircleIcon
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        color: 'primary.main',
                      }}
                    />
                  )}
                </Box>
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAssistantDialog}>取消</Button>
          <Button 
            onClick={handleAddAssistant}
            variant="contained" 
            disabled={!selectedAssistantId || userAssistants.some(a => a.id === selectedAssistantId)}
          >
            添加
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 助手菜单 */}
      <Menu
        anchorEl={menuAnchorEl}
        open={isMenuOpen}
        onClose={handleCloseMenu}
        PaperProps={{
          elevation: 3,
          sx: { minWidth: 180, borderRadius: 2 }
        }}
      >
        <MenuItem onClick={handleEditPrompt}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="编辑助手" />
        </MenuItem>
        <MenuItem onClick={handleDuplicateAssistant}>
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="复制助手" />
        </MenuItem>
        <MenuItem 
          onClick={handleDeleteAssistant}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText primary="删除" />
        </MenuItem>
      </Menu>
      
      {/* 编辑提示词对话框 */}
      <Dialog
        open={promptDialogOpen}
        onClose={handleClosePromptDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          编辑助手提示词
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            multiline
            rows={10}
            variant="outlined"
            fullWidth
            placeholder="输入能够提高助手效果的系统提示词..."
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            sx={{ mt: 1 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            * 助手系统提示词将应用于该助手下的所有话题，但可被话题特定提示词覆盖
          </Typography>
        </DialogContent>
        <DialogActions>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', px: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Tokens: {systemPrompt.length > 0 ? Math.ceil(systemPrompt.length / 4) : 0}
            </Typography>
            <Box>
              <Button onClick={handleClosePromptDialog}>取消</Button>
              <Button 
                variant="contained" 
                onClick={async () => {
                  // 首先检查是否有上下文助手，如果没有则使用当前选择的助手
                  const targetAssistant = contextAssistant || currentAssistant;
                  
                  if (!targetAssistant) {
                    alert('无法保存助手提示词: 未选择任何助手');
                    return;
                  }
                  
                  // 更新助手提示词
                  const updatedAssistant = {
                    ...targetAssistant,
                    systemPrompt
                  };
                  
                  // 使用存储服务保存
                  try {
                    await storageService.saveAssistant(updatedAssistant);
                    alert('助手提示词已保存');
                  } catch (error) {
                    console.error('保存失败:', error);
                    alert('保存失败: ' + (error instanceof Error ? error.message : String(error)));
                  }
                  
                  // 也尝试通过回调更新
                  try {
                    if (onUpdateAssistant) {
                      onUpdateAssistant(updatedAssistant);
                    }
                  } catch (e) {
                    console.error('通过回调更新失败:', e);
                  }
                  
                  setPromptDialogOpen(false);
                }}
              >
                保存
              </Button>
            </Box>
          </Box>
        </DialogActions>
      </Dialog>
    </>
  );
} 