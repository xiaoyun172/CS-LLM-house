import { useState } from 'react';
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
  MenuItem
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
import { storageService } from '../../shared/services/storageService';

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
  
  // 话题菜单相关状态
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [contextTopic, setContextTopic] = useState<ChatTopic | null>(null);
  
  // 编辑提示词对话框相关状态
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [topicPrompt, setTopicPrompt] = useState('');
  const [useAssistantPrompt, setUseAssistantPrompt] = useState(false);
  
  // 是否显示菜单
  const isMenuOpen = Boolean(menuAnchorEl);

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
  const filteredTopics = topics.filter(
    (topic) => !searchQuery || (topic.title && topic.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  // 长按处理 - 打开菜单
  const handleLongPress = (event: React.MouseEvent, topic: ChatTopic) => {
    event.preventDefault();
    event.stopPropagation();
    setContextTopic(topic);
    setMenuAnchorEl(event.currentTarget as HTMLElement);
  };
  
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
  
  // 关闭提示词对话框
  const handleClosePromptDialog = () => {
    setPromptDialogOpen(false);
  };
  
  // 分析对话
  const handleAnalyzeConversation = () => {
    // 实现对话分析功能
    handleCloseMenu();
  };

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
      
      <List sx={{ p: 0 }}>
        {filteredTopics.map((topic) => (
          <ListItemButton 
            key={topic.id} 
            onClick={() => onSelectTopic(topic)}
            selected={currentTopic?.id === topic.id}
            sx={{ 
              borderRadius: '8px', 
              mb: 1,
              '&.Mui-selected': {
                backgroundColor: 'rgba(25, 118, 210, 0.08)',
              },
              '&.Mui-selected:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.12)',
              },
              '&:hover': { 
                bgcolor: 'rgba(0, 0, 0, 0.04)' 
              }
            }}
            onContextMenu={(e) => handleLongPress(e, topic)}
            onTouchStart={(e) => {
              const touchTimer = setTimeout(() => {
                handleLongPress(e.nativeEvent as unknown as React.MouseEvent, topic);
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
              <ForumIcon sx={{ color: currentTopic?.id === topic.id ? 'primary.main' : 'text.secondary' }} />
            </ListItemIcon>
            <ListItemText 
              primary={topic.title} 
              primaryTypographyProps={{ 
                noWrap: true,
                sx: { 
                  fontWeight: currentTopic?.id === topic.id ? 'medium' : 'normal',
                  color: currentTopic?.id === topic.id ? 'primary.main' : 'text.primary'
                }
              }}
              secondary={topic.prompt ? "已设置提示词" : null}
              secondaryTypographyProps={{
                variant: 'caption',
                sx: { color: 'success.main' }
              }}
            />
            <IconButton 
              edge="end" 
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleLongPress(e, topic);
              }}
              sx={{ mr: 1 }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
            <IconButton 
              edge="end" 
              size="small"
              onClick={(e) => onDeleteTopic(topic.id, e)}
              sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </ListItemButton>
        ))}

        {topics.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
            <Typography variant="body2">
              {!currentAssistant 
                ? '请先选择一个助手' 
                : `${currentAssistant.name}暂无话题`
              }
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {currentAssistant && '点击上方"+"按钮创建新话题'}
            </Typography>
          </Box>
        )}
      </List>
      
      {/* 话题菜单 */}
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
          <ListItemText primary="话题提示词" />
        </MenuItem>
        <MenuItem onClick={handleAnalyzeConversation}>
          <ListItemIcon>
            <AnalyticsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="分析对话" />
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
          编辑话题提示词
        </DialogTitle>
        <DialogContent>
          {currentAssistant?.systemPrompt && (
            <Box sx={{ mb: 2 }}>
              <Button
                variant={useAssistantPrompt ? "contained" : "outlined"}
                color="primary"
                size="small"
                onClick={() => setUseAssistantPrompt(!useAssistantPrompt)}
                sx={{ mb: 1 }}
              >
                {useAssistantPrompt ? "使用助手提示词" : "使用自定义提示词"}
              </Button>
              
              {useAssistantPrompt && (
                <Box sx={{ 
                  p: 2, 
                  bgcolor: 'primary.light', 
                  borderRadius: 1, 
                  color: 'primary.contrastText',
                  opacity: 0.9
                }}>
                  <Typography variant="body2" fontWeight="medium">
                    将使用 "{currentAssistant.name}" 的系统提示词:
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                    {currentAssistant.systemPrompt}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
          
          {(!useAssistantPrompt || !currentAssistant?.systemPrompt) && (
            <TextField
              autoFocus
              multiline
              rows={10}
              variant="outlined"
              fullWidth
              placeholder="输入针对此话题的特定提示词..."
              value={topicPrompt}
              onChange={(e) => setTopicPrompt(e.target.value)}
            />
          )}
          
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            * 话题提示词将覆盖助手的系统提示词，仅对当前话题有效
          </Typography>
        </DialogContent>
        <DialogActions>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', px: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {!useAssistantPrompt && `Tokens: ${topicPrompt.length > 0 ? Math.ceil(topicPrompt.length / 4) : 0}`}
            </Typography>
            <Box>
              <Button onClick={handleClosePromptDialog}>取消</Button>
              <Button 
                variant="contained" 
                onClick={async () => {
                  // 首先检查是否有上下文话题，如果没有则使用当前选中的话题
                  const targetTopic = contextTopic || currentTopic;
                  
                  if (!targetTopic) {
                    alert('无法保存话题提示词: 未选择任何话题');
                    return;
                  }
                  
                  // 如果使用助手提示词，则清除话题提示词
                  const updatedTopic = {
                    ...targetTopic,
                    prompt: useAssistantPrompt ? undefined : topicPrompt
                  };
                  
                  // 使用存储服务保存
                  try {
                    await storageService.saveTopic(updatedTopic);
                    alert('话题提示词已保存');
                  } catch (error) {
                    console.error('保存失败:', error);
                    alert('保存失败: ' + (error instanceof Error ? error.message : String(error)));
                  }
                  
                  // 也尝试通过回调更新
                  try {
                    if (onUpdateTopic) {
                      onUpdateTopic(updatedTopic);
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