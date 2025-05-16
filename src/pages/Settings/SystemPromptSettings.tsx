import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Switch,
  FormControlLabel,
  Alert,
  Tooltip,
  AppBar,
  Toolbar,
  Paper,
  alpha,
  Avatar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../shared/store';
import { saveSystemPromptTemplates, setDefaultSystemPrompt } from '../../shared/store/slices/systemPromptsSlice';
import { uuid } from '../../shared/utils';

// 系统提示词模板类型
export interface SystemPromptTemplate {
  id: string;
  name: string;
  content: string;
  isDefault?: boolean;
}

export default function SystemPromptSettings() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const systemPromptTemplates = useSelector((state: RootState) => state.systemPrompts?.templates || []);
  const defaultSystemPrompt = useSelector((state: RootState) => state.systemPrompts?.defaultPrompt || '');
  
  // 本地状态
  const [templates, setTemplates] = useState<SystemPromptTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<SystemPromptTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [defaultPrompt, setDefaultPrompt] = useState('');
  const [useDefaultPrompt, setUseDefaultPrompt] = useState(true);
  
  // 从Redux加载数据
  useEffect(() => {
    if (systemPromptTemplates.length > 0) {
      setTemplates(systemPromptTemplates);
    } else {
      // 如果没有保存的模板，创建默认模板
      const defaultTemplates = [
        {
          id: uuid(),
          name: '通用助手',
          content: '你是一个友好、专业、乐于助人的AI助手。你会以客观、准确的态度回答用户的问题，并在不确定的情况下坦诚表明。你可以协助用户完成各种任务，提供信息，或进行有意义的对话。',
          isDefault: true
        },
        {
          id: uuid(),
          name: '内容分析助手',
          content: '你是一个专注于网页内容分析的AI助手。你能帮助用户理解、总结和提取网页中的关键信息。无论是新闻、文章、论坛还是社交媒体内容，你都能提供有价值的见解和分析。'
        },
        {
          id: uuid(),
          name: '编程助手',
          content: '你是一个经验丰富的编程助手。你擅长解答各种编程问题、代码审查、算法优化和开发实践建议。无论是初学者的基础问题还是高级开发者的复杂查询，你都能提供清晰、准确的指导。'
        }
      ];
      setTemplates(defaultTemplates);
      setDefaultPrompt(defaultTemplates[0].content);
    }
    
    if (defaultSystemPrompt) {
      setDefaultPrompt(defaultSystemPrompt);
    }
  }, [systemPromptTemplates, defaultSystemPrompt]);
  
  // 处理返回按钮
  const handleBack = () => {
    navigate('/settings');
  };
  
  // 保存模板到Redux
  const saveTemplates = () => {
    dispatch(saveSystemPromptTemplates(templates));
    if (useDefaultPrompt) {
      dispatch(setDefaultSystemPrompt(defaultPrompt));
    }
  };
  
  // 添加新模板
  const handleAddTemplate = () => {
    setEditingTemplate({
      id: uuid(),
      name: '',
      content: ''
    });
    setDialogOpen(true);
  };
  
  // 编辑模板
  const handleEditTemplate = (template: SystemPromptTemplate) => {
    setEditingTemplate({ ...template });
    setDialogOpen(true);
  };
  
  // 复制模板
  const handleDuplicateTemplate = (template: SystemPromptTemplate) => {
    const newTemplate = {
      ...template,
      id: uuid(),
      name: `${template.name} (副本)`,
      isDefault: false
    };
    
    setTemplates([...templates, newTemplate]);
  };
  
  // 删除模板
  const handleDeleteTemplate = (id: string) => {
    // 如果是默认模板，则不允许删除
    const templateToDelete = templates.find(t => t.id === id);
    if (templateToDelete?.isDefault) {
      alert('不能删除默认模板');
      return;
    }
    
    setTemplates(templates.filter(t => t.id !== id));
  };
  
  // 设为默认模板
  const handleSetDefault = (id: string) => {
    setTemplates(templates.map(t => ({
      ...t,
      isDefault: t.id === id
    })));
    
    const defaultTemplate = templates.find(t => t.id === id);
    if (defaultTemplate) {
      setDefaultPrompt(defaultTemplate.content);
    }
  };
  
  // 保存编辑中的模板
  const handleSaveTemplate = () => {
    if (!editingTemplate) return;
    
    if (!editingTemplate.name.trim() || !editingTemplate.content.trim()) {
      alert('名称和内容不能为空');
      return;
    }
    
    const isNew = !templates.some(t => t.id === editingTemplate.id);
    
    if (isNew) {
      setTemplates([...templates, editingTemplate]);
    } else {
      setTemplates(templates.map(t => 
        t.id === editingTemplate.id ? editingTemplate : t
      ));
    }
    
    setDialogOpen(false);
    setEditingTemplate(null);
  };
  
  // 关闭对话框
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
  };
  
  return (
    <Box sx={{ 
      flexGrow: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      bgcolor: (theme) => theme.palette.mode === 'light'
        ? alpha(theme.palette.primary.main, 0.02)
        : alpha(theme.palette.background.default, 0.9),
    }}>
      <AppBar 
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: 1,
          borderColor: 'divider',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={handleBack}
            aria-label="back"
            sx={{
              color: (theme) => theme.palette.primary.main,
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1, 
              fontWeight: 600,
              backgroundImage: 'linear-gradient(90deg, #9333EA, #754AB4)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            系统提示词管理
          </Typography>
          <Button 
            variant="text" 
            color="primary"
            onClick={saveTemplates}
            startIcon={<SaveIcon />}
          >
            保存
          </Button>
        </Toolbar>
      </AppBar>
      
      <Box 
        sx={{ 
          flexGrow: 1, 
          overflow: 'auto', 
          p: 2,
          mt: 8,
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0,0,0,0.1)',
            borderRadius: '3px',
          },
        }}
      >
        <Alert severity="info" sx={{ mb: 3 }}>
          系统提示词是发送给AI模型的特殊指令，用于定义助手的行为、知识和限制。
          通过管理系统提示词模板，你可以创建具有不同特性的助手。
        </Alert>
      
        <Paper
          elevation={0}
          sx={{
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            mb: 3,
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              默认系统提示词
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              当助手没有特定系统提示词时，将使用此默认提示词
            </Typography>
          
            <FormControlLabel
              control={
                <Switch 
                  checked={useDefaultPrompt}
                  onChange={(e) => setUseDefaultPrompt(e.target.checked)}
                />
              }
              label="使用全局默认系统提示词"
            />
          
            {useDefaultPrompt && (
              <TextField
                fullWidth
                multiline
                rows={4}
                variant="outlined"
                value={defaultPrompt}
                onChange={(e) => setDefaultPrompt(e.target.value)}
                placeholder="输入默认系统提示词..."
                sx={{ mt: 2 }}
              />
            )}
          </Box>
        </Paper>
      
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 2 
        }}>
          <Typography variant="subtitle1">
            提示词模板
          </Typography>
          <Button 
            variant="outlined" 
            startIcon={<AddIcon />}
            onClick={handleAddTemplate}
          >
            添加模板
          </Button>
        </Box>
      
        <Paper
          elevation={0}
          sx={{
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <List sx={{ p: 0 }}>
            {templates.map((template, index) => (
              <React.Fragment key={template.id}>
                {index > 0 && <Divider />}
                <ListItem
                  sx={{ py: 2 }}
                  secondaryAction={
                    <Box>
                      <Tooltip title="设为默认">
                        <IconButton 
                          edge="end" 
                          onClick={() => handleSetDefault(template.id)}
                          color={template.isDefault ? "primary" : "default"}
                          size="small"
                        >
                          <SaveIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="复制">
                        <IconButton 
                          edge="end" 
                          onClick={() => handleDuplicateTemplate(template)}
                          size="small"
                        >
                          <ContentCopyIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="编辑">
                        <IconButton 
                          edge="end" 
                          onClick={() => handleEditTemplate(template)}
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="删除">
                        <IconButton 
                          edge="end" 
                          onClick={() => handleDeleteTemplate(template.id)}
                          disabled={template.isDefault}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <Avatar 
                    sx={{ 
                      mr: 2, 
                      bgcolor: template.isDefault ? '#9333EA' : '#10b981',
                      color: 'white',
                    }}
                  >
                    <AutoFixHighIcon />
                  </Avatar>
                  <ListItemText
                    primary={
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                        {template.name}
                        {template.isDefault && (
                          <Typography 
                            variant="caption" 
                            sx={{ ml: 1, bgcolor: '#9333EA', color: 'white', px: 1, py: 0.3, borderRadius: 1 }}
                          >
                            默认
                          </Typography>
                        )}
                      </Box>
                    }
                    secondary={template.content.substring(0, 60) + (template.content.length > 60 ? '...' : '')}
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      </Box>
      
      {/* 编辑对话框 */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingTemplate?.id ? '编辑提示词模板' : '添加提示词模板'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="模板名称"
            fullWidth
            variant="outlined"
            value={editingTemplate?.name || ''}
            onChange={(e) => setEditingTemplate(prev => prev ? {...prev, name: e.target.value} : null)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="提示词内容"
            fullWidth
            multiline
            rows={8}
            variant="outlined"
            value={editingTemplate?.content || ''}
            onChange={(e) => setEditingTemplate(prev => prev ? {...prev, content: e.target.value} : null)}
            placeholder="输入提示词内容..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button 
            onClick={handleSaveTemplate}
            variant="contained" 
            disabled={!editingTemplate?.name || !editingTemplate?.content}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 