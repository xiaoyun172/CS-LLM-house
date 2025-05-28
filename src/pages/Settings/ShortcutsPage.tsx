/**
 * 快捷助手设置页面
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Container,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Button,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Divider,
  Snackbar
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import EditIcon from '@mui/icons-material/Edit';
import RestoreIcon from '@mui/icons-material/Restore';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../shared/store';
import {
  loadShortcuts,
  updateShortcut,
  resetToDefaults,
  exportConfig,
  importConfig,
  setEnabled,
  setShowHints,
  toggleShortcut,
  clearError,
  selectShortcuts,
  selectShortcutsEnabled,
  selectShowHints,
  selectShortcutsLoading,
  selectShortcutsError
} from '../../shared/store/slices/shortcutsSlice';
import type { ShortcutConfig, KeyCombination, ShortcutCategory } from '../../shared/types/shortcuts';
import { shortcutsService } from '../../shared/services/ShortcutsService';

/**
 * 快捷键分类信息
 */
const CATEGORY_INFO: Record<ShortcutCategory, { name: string; description: string; color: string }> = {
  chat: { name: '聊天相关', description: '聊天和消息相关的快捷键', color: '#4CAF50' },
  navigation: { name: '导航相关', description: '页面导航和界面切换', color: '#2196F3' },
  editing: { name: '编辑相关', description: '文本编辑和输入相关', color: '#FF9800' },
  tools: { name: '工具相关', description: '各种工具和功能', color: '#9C27B0' },
  system: { name: '系统相关', description: '系统级操作和设置', color: '#607D8B' }
};

/**
 * 格式化快捷键组合显示
 */
const formatKeyCombo = (combo: KeyCombination): string => {
  const parts: string[] = [];
  if (combo.ctrl) parts.push('Ctrl');
  if (combo.alt) parts.push('Alt');
  if (combo.shift) parts.push('Shift');
  if (combo.meta) parts.push('Cmd');
  parts.push(combo.key);
  return parts.join(' + ');
};

const ShortcutsPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const theme = useTheme();

  // Redux状态
  const shortcuts = useAppSelector(selectShortcuts);
  const enabled = useAppSelector(selectShortcutsEnabled);
  const showHints = useAppSelector(selectShowHints);
  const loading = useAppSelector(selectShortcutsLoading);
  const error = useAppSelector(selectShortcutsError);

  // 本地状态
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingShortcut, setEditingShortcut] = useState<ShortcutConfig | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // 快捷键录制相关状态
  const [isRecording, setIsRecording] = useState(false);
  const [recordedCombo, setRecordedCombo] = useState<KeyCombination | null>(null);
  const [validationError, setValidationError] = useState<string>('');
  // 使用全局的快捷键服务实例

  // 加载快捷键配置
  useEffect(() => {
    dispatch(loadShortcuts());
  }, [dispatch]);

  // 错误处理
  useEffect(() => {
    if (error) {
      setSnackbarMessage(error);
      setSnackbarOpen(true);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleBack = () => {
    navigate('/settings');
  };

  const handleToggleEnabled = (checked: boolean) => {
    dispatch(setEnabled(checked));
  };

  const handleToggleShowHints = (checked: boolean) => {
    dispatch(setShowHints(checked));
  };

  const handleToggleShortcut = (id: string) => {
    dispatch(toggleShortcut(id));
  };

  const handleEditShortcut = (shortcut: ShortcutConfig) => {
    setEditingShortcut(shortcut);
    setRecordedCombo(null);
    setValidationError('');
    setIsRecording(false);
    setEditDialogOpen(true);
  };

  const handleSaveShortcut = () => {
    if (editingShortcut) {
      const finalShortcut = recordedCombo 
        ? { ...editingShortcut, combination: recordedCombo }
        : editingShortcut;
        
      dispatch(updateShortcut({
        id: editingShortcut.id,
        updates: finalShortcut
      }));
      setEditDialogOpen(false);
      setEditingShortcut(null);
      setRecordedCombo(null);
      setValidationError('');
      setIsRecording(false);
    }
  };

  // 开始录制快捷键
  const startRecording = () => {
    setIsRecording(true);
    setRecordedCombo(null);
    setValidationError('');
  };

  // 停止录制快捷键
  const stopRecording = () => {
    setIsRecording(false);
  };

  // 处理快捷键录制
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isRecording) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const combo: KeyCombination = {
      key: event.key,
      ctrl: event.ctrlKey,
      alt: event.altKey,
      shift: event.shiftKey,
      meta: event.metaKey
    };
    
    setRecordedCombo(combo);
    
    // 验证快捷键
    const validation = shortcutsService.validate({
      id: editingShortcut?.id,
      combination: combo
    });
    
    if (!validation.isValid) {
      setValidationError(validation.error || '快捷键无效');
    } else {
      setValidationError('');
    }
    
    setIsRecording(false);
  };

  const handleResetDefaults = () => {
    if (window.confirm('确定要重置为默认快捷键设置吗？这将覆盖所有自定义设置。')) {
      dispatch(resetToDefaults());
      setSnackbarMessage('已重置为默认设置');
      setSnackbarOpen(true);
    }
  };

  const handleExport = async () => {
    try {
      const result = await dispatch(exportConfig()).unwrap();
      const blob = new Blob([result], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shortcuts-config-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSnackbarMessage('配置已导出');
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage('导出失败');
      setSnackbarOpen(true);
    }
  };

  const handleImport = async () => {
    try {
      await dispatch(importConfig(importText)).unwrap();
      setImportDialogOpen(false);
      setImportText('');
      setSnackbarMessage('配置已导入');
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage('导入失败：格式错误');
      setSnackbarOpen(true);
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setImportText(content);
        setImportDialogOpen(true);
      };
      reader.readAsText(file);
    }
  };

  // 按分类分组快捷键
  const groupedShortcuts = Object.entries(CATEGORY_INFO).map(([category, info]) => ({
    category: category as ShortcutCategory,
    info,
    shortcuts: shortcuts.filter(s => s.category === category)
  }));

  return (
    <Box sx={{
      flexGrow: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      bgcolor: 'background.default'
    }}>
      {/* 顶部导航栏 */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={handleBack}
            aria-label="back"
            sx={{ color: 'primary.main' }}
          >
            <ArrowBackIcon />
          </IconButton>
          <KeyboardIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, fontWeight: 600 }}
          >
            快捷助手
          </Typography>
        </Toolbar>
      </AppBar>

      {/* 主要内容 */}
      <Container
        maxWidth="md"
        sx={{
          mt: 10,
          mb: 2,
          flexGrow: 1,
          overflowY: 'auto',
          height: 'calc(100vh - 80px)',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
            borderRadius: '4px',
            '&:hover': {
              background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
            },
          },
        }}
      >
        {/* 全局设置 */}
        <Paper elevation={0} sx={{ p: 3, mb: 3, border: 1, borderColor: 'divider' }}>
          <Typography variant="h6" gutterBottom>
            全局设置
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={enabled}
                  onChange={(e) => handleToggleEnabled(e.target.checked)}
                />
              }
              label="启用快捷键功能"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={showHints}
                  onChange={(e) => handleToggleShowHints(e.target.checked)}
                />
              }
              label="显示快捷键提示"
            />
          </Box>
        </Paper>

        {/* 操作按钮 */}
        <Paper elevation={0} sx={{ p: 3, mb: 3, border: 1, borderColor: 'divider' }}>
          <Typography variant="h6" gutterBottom>
            配置管理
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<RestoreIcon />}
              onClick={handleResetDefaults}
            >
              重置默认
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={handleExport}
            >
              导出配置
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileUploadIcon />}
              component="label"
            >
              导入配置
              <input
                type="file"
                hidden
                accept=".json"
                onChange={handleFileImport}
              />
            </Button>
          </Box>
        </Paper>

        {/* 快捷键列表 */}
        {groupedShortcuts.map(({ category, info, shortcuts: categoryShortcuts }) => (
          categoryShortcuts.length > 0 && (
            <Paper
              key={category}
              elevation={0}
              sx={{ mb: 3, border: 1, borderColor: 'divider' }}
            >
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ color: info.color }}>
                  {info.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {info.description}
                </Typography>
              </Box>
              <List>
                {categoryShortcuts.map((shortcut, index) => (
                  <React.Fragment key={shortcut.id}>
                    {index > 0 && <Divider />}
                    <ListItem>
                      <ListItemText
                        primary={shortcut.name}
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                            <Chip
                              label={formatKeyCombo(shortcut.combination)}
                              size="small"
                              variant="outlined"
                            />
                            <Typography variant="caption" color="text.secondary">
                              {shortcut.description}
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton
                            edge="end"
                            onClick={() => handleEditShortcut(shortcut)}
                            size="small"
                          >
                            <EditIcon />
                          </IconButton>
                          <Switch
                            checked={shortcut.enabled}
                            onChange={() => handleToggleShortcut(shortcut.id)}
                            size="small"
                          />
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          )
        ))}

        {shortcuts.length === 0 && !loading && (
          <Alert severity="info">
            暂无快捷键配置，请稍后重试或重置为默认设置。
          </Alert>
        )}
      </Container>

      {/* 编辑对话框 */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        onKeyDown={handleKeyDown}
      >
        <DialogTitle>编辑快捷键</DialogTitle>
        <DialogContent>
          {editingShortcut && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="名称"
                value={editingShortcut.name}
                onChange={(e) => setEditingShortcut({
                  ...editingShortcut,
                  name: e.target.value
                })}
                fullWidth
              />
              <TextField
                label="描述"
                value={editingShortcut.description}
                onChange={(e) => setEditingShortcut({
                  ...editingShortcut,
                  description: e.target.value
                })}
                fullWidth
                multiline
                rows={2}
              />
              
              {/* 快捷键设置区域 */}
              <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  快捷键组合
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    当前：
                  </Typography>
                  <Chip
                    label={formatKeyCombo(editingShortcut.combination)}
                    size="small"
                    variant="outlined"
                  />
                </Box>
                
                {recordedCombo && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                      新设置：
              </Typography>
                    <Chip
                      label={formatKeyCombo(recordedCombo)}
                      size="small"
                      color={validationError ? 'error' : 'success'}
                      variant="outlined"
                    />
                  </Box>
                )}
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant={isRecording ? 'contained' : 'outlined'}
                    color={isRecording ? 'secondary' : 'primary'}
                    onClick={isRecording ? stopRecording : startRecording}
                    size="small"
                  >
                    {isRecording ? '按下快捷键...' : '录制新快捷键'}
                  </Button>
                  {recordedCombo && (
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setRecordedCombo(null);
                        setValidationError('');
                      }}
                      size="small"
                    >
                      清除
                    </Button>
                  )}
                </Box>
                
                {validationError && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {validationError}
                  </Alert>
                )}
                
                {isRecording && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    请按下您想要设置的快捷键组合...
                  </Alert>
                )}
              </Box>
              
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>提示：</strong>为避免与浏览器快捷键冲突，建议使用 Alt + 字母 的组合。
                  系统会自动检测并提示可能的冲突。
                </Typography>
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            取消
          </Button>
          <Button 
            onClick={handleSaveShortcut} 
            variant="contained"
            disabled={!!validationError}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 导入对话框 */}
      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>导入配置</DialogTitle>
        <DialogContent>
          <TextField
            label="配置内容"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            fullWidth
            multiline
            rows={10}
            placeholder="请粘贴配置JSON内容..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>
            取消
          </Button>
          <Button onClick={handleImport} variant="contained">
            导入
          </Button>
        </DialogActions>
      </Dialog>

      {/* 消息提示 */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  );
};

export default ShortcutsPage;
