/**
 * 快捷短语设置页面
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
  Button,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Snackbar,
  Menu,
  ListItemIcon,
  Tabs,
  Tab,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { keyframes } from '@mui/system';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FavoriteIcon from '@mui/icons-material/Favorite';
import SearchIcon from '@mui/icons-material/Search';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SyncIcon from '@mui/icons-material/Sync';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../shared/store';
import {
  loadAllData,
  createPhrase,
  updatePhrase,
  deletePhrase,
  createCategory,
  updateCategory,
  deleteCategory,
  exportPhrases,
  importPhrases,
  setSelectedCategory,
  setSearchKeyword,
  setSortBy,
  toggleShowFavorites,
  togglePhraseFavorite,
  clearError,
  resetFilters,
  selectCategories,
  selectSelectedCategoryId,
  selectSearchKeyword,
  selectSortSettings,
  selectShowFavorites,
  selectError,
  selectFilteredPhrases
} from '../../shared/store/slices/shortcutLanguageSlice';
import type { ShortcutPhrase, PhraseCategory } from '../../shared/types/shortcutLanguage';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// 定义旋转动画
const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
}

const ShortcutLanguagePage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const theme = useTheme();

  // Redux状态
  const phrases = useAppSelector(selectFilteredPhrases);
  const categories = useAppSelector(selectCategories);
  const selectedCategoryId = useAppSelector(selectSelectedCategoryId);
  const searchKeyword = useAppSelector(selectSearchKeyword);
  const sortSettings = useAppSelector(selectSortSettings);
  const showFavorites = useAppSelector(selectShowFavorites);
  const error = useAppSelector(selectError);

  // 本地状态
  const [tabValue, setTabValue] = useState(0);
  const [phraseDialogOpen, setPhraseDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingPhrase, setEditingPhrase] = useState<ShortcutPhrase | null>(null);
  const [editingCategory, setEditingCategory] = useState<PhraseCategory | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPhraseId, setSelectedPhraseId] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // 表单状态
  const [phraseForm, setPhraseForm] = useState({
    name: '',
    content: '',
    description: '',
    categoryId: '',
    tags: ''
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    icon: '📝',
    color: '#2196F3'
  });

  // 加载数据
  useEffect(() => {
    dispatch(loadAllData());
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

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setSearchKeyword(event.target.value));
  };

  const handleCategoryFilter = (categoryId: string | null) => {
    dispatch(setSelectedCategory(categoryId));
  };

  const handleSortChange = (sortBy: string) => {
    const currentOrder = sortSettings.sortOrder;
    const newOrder = sortSettings.sortBy === sortBy && currentOrder === 'asc' ? 'desc' : 'asc';
    dispatch(setSortBy({ sortBy: sortBy as any, sortOrder: newOrder }));
  };

  const handleToggleFavorites = () => {
    dispatch(toggleShowFavorites());
  };

  const handleAddPhrase = () => {
    setPhraseForm({
      name: '',
      content: '',
      description: '',
      categoryId: categories[0]?.id || '',
      tags: ''
    });
    setEditingPhrase(null);
    setPhraseDialogOpen(true);
  };

  const handleEditPhrase = (phrase: ShortcutPhrase) => {
    setPhraseForm({
      name: phrase.name,
      content: phrase.content,
      description: phrase.description || '',
      categoryId: phrase.categoryId,
      tags: phrase.tags.join(', ')
    });
    setEditingPhrase(phrase);
    setPhraseDialogOpen(true);
  };

  const handleSavePhrase = async () => {
    try {
      const phraseData = {
        name: phraseForm.name,
        content: phraseForm.content,
        description: phraseForm.description,
        categoryId: phraseForm.categoryId,
        tags: phraseForm.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        usageCount: 0,
        isFavorite: false,
        isDefault: false
      };

      if (editingPhrase) {
        await dispatch(updatePhrase({
          id: editingPhrase.id,
          updates: phraseData
        })).unwrap();
        setSnackbarMessage('短语已更新');
      } else {
        await dispatch(createPhrase(phraseData)).unwrap();
        setSnackbarMessage('短语已创建');
      }

      setPhraseDialogOpen(false);
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage('操作失败');
      setSnackbarOpen(true);
    }
  };

  const handleDeletePhrase = async (id: string) => {
    if (window.confirm('确定要删除这个短语吗？')) {
      try {
        await dispatch(deletePhrase(id)).unwrap();
        setSnackbarMessage('短语已删除');
        setSnackbarOpen(true);
      } catch (error) {
        setSnackbarMessage('删除失败');
        setSnackbarOpen(true);
      }
    }
  };

  const handleTogglePhraseFavorite = (id: string) => {
    dispatch(togglePhraseFavorite(id));
  };

  const handleAddCategory = () => {
    setCategoryForm({
      name: '',
      description: '',
      icon: '📝',
      color: '#2196F3'
    });
    setEditingCategory(null);
    setCategoryDialogOpen(true);
  };

  const handleEditCategory = (category: PhraseCategory) => {
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      icon: category.icon || '📝',
      color: category.color || '#2196F3'
    });
    setEditingCategory(category);
    setCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    try {
      const categoryData = {
        name: categoryForm.name,
        description: categoryForm.description,
        icon: categoryForm.icon,
        color: categoryForm.color,
        order: categories.length + 1,
        isDefault: false
      };

      if (editingCategory) {
        await dispatch(updateCategory({
          id: editingCategory.id,
          updates: categoryData
        })).unwrap();
        setSnackbarMessage('分类已更新');
      } else {
        await dispatch(createCategory(categoryData)).unwrap();
        setSnackbarMessage('分类已创建');
      }

      setCategoryDialogOpen(false);
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage('操作失败');
      setSnackbarOpen(true);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm('确定要删除这个分类吗？分类下的短语将无法显示。')) {
      try {
        await dispatch(deleteCategory(id)).unwrap();
        setSnackbarMessage('分类已删除');
        setSnackbarOpen(true);
      } catch (error) {
        setSnackbarMessage('删除失败：分类下还有短语');
        setSnackbarOpen(true);
      }
    }
  };

  const handleExport = async () => {
    try {
      const result = await dispatch(exportPhrases()).unwrap();
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shortcut-phrases-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSnackbarMessage('短语库已导出');
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage('导出失败');
      setSnackbarOpen(true);
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          await dispatch(importPhrases(data)).unwrap();
          setSnackbarMessage('短语库已导入');
          setSnackbarOpen(true);
        } catch (error) {
          setSnackbarMessage('导入失败：格式错误');
          setSnackbarOpen(true);
        }
      };
      reader.readAsText(file);
    }
  };

  const handlePhraseMenuOpen = (event: React.MouseEvent<HTMLElement>, phraseId: string) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedPhraseId(phraseId);
  };

  const handlePhraseMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedPhraseId(null);
  };

  const handleManualSync = async () => {
    setSyncStatus('syncing');
    try {
      // 导入快捷短语服务进行数据验证
      const { shortcutLanguageService } = await import('../../shared/services/ShortcutLanguageService');

      // 验证数据完整性
      const validation = await shortcutLanguageService.validateData();

      // 强制重新加载数据
      await shortcutLanguageService.forceReload();

      // 重新加载Redux状态
      await dispatch(loadAllData()).unwrap();

      setSyncStatus('synced');
      setLastSyncTime(new Date());

      if (validation.fixedIssues.length > 0) {
        setSnackbarMessage(`数据同步成功，已修复 ${validation.fixedIssues.length} 个问题`);
      } else {
        setSnackbarMessage('数据同步成功');
      }
      setSnackbarOpen(true);
    } catch (error) {
      setSyncStatus('error');
      setSnackbarMessage('数据同步失败');
      setSnackbarOpen(true);
    }
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : '未知分类';
  };

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
          <ChatBubbleIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, fontWeight: 600 }}
          >
            快捷短语
          </Typography>
        </Toolbar>
      </AppBar>

      {/* 标签页 */}
      <Box sx={{ mt: 8, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} centered>
          <Tab label="短语管理" />
          <Tab label="分类管理" />
        </Tabs>
      </Box>

      {/* 短语管理标签页 */}
      <TabPanel value={tabValue} index={0}>
        <Container
          maxWidth="md"
          sx={{
            mt: 2,
            mb: 2,
            flexGrow: 1,
            overflowY: 'auto',
            height: 'calc(100vh - 140px)',
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
          {/* 搜索和过滤 */}
          <Paper elevation={0} sx={{ p: 2, mb: 2, border: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <TextField
                placeholder="搜索短语..."
                value={searchKeyword}
                onChange={handleSearchChange}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ flexGrow: 1, minWidth: 200 }}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>分类</InputLabel>
                <Select
                  value={selectedCategoryId || ''}
                  onChange={(e) => handleCategoryFilter(e.target.value || null)}
                  label="分类"
                >
                  <MenuItem value="">全部分类</MenuItem>
                  {categories.map(category => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <ToggleButtonGroup size="small" exclusive>
                <ToggleButton
                  value="name"
                  selected={sortSettings.sortBy === 'name'}
                  onClick={() => handleSortChange('name')}
                >
                  按名称
                </ToggleButton>
                <ToggleButton
                  value="usageCount"
                  selected={sortSettings.sortBy === 'usageCount'}
                  onClick={() => handleSortChange('usageCount')}
                >
                  按使用次数
                </ToggleButton>
                <ToggleButton
                  value="updatedAt"
                  selected={sortSettings.sortBy === 'updatedAt'}
                  onClick={() => handleSortChange('updatedAt')}
                >
                  按更新时间
                </ToggleButton>
              </ToggleButtonGroup>

              <Button
                variant={showFavorites ? "contained" : "outlined"}
                size="small"
                startIcon={<FavoriteIcon />}
                onClick={handleToggleFavorites}
              >
                收藏
              </Button>

              <Button
                variant="outlined"
                size="small"
                onClick={() => dispatch(resetFilters())}
              >
                重置
              </Button>
            </Box>
          </Paper>

          {/* 操作按钮 */}
          <Paper elevation={0} sx={{ p: 2, mb: 2, border: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddPhrase}
              >
                添加短语
              </Button>
              <Button
                variant="outlined"
                startIcon={<FileDownloadIcon />}
                onClick={handleExport}
              >
                导出短语库
              </Button>
              <Button
                variant="outlined"
                startIcon={<FileUploadIcon />}
                component="label"
              >
                导入短语库
                <input
                  type="file"
                  hidden
                  accept=".json"
                  onChange={handleFileImport}
                />
              </Button>

              {/* 同步状态和按钮 */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={
                    syncStatus === 'syncing' ? <SyncIcon sx={{ animation: `${spin} 1s linear infinite` }} /> :
                    syncStatus === 'synced' ? <CloudDoneIcon /> :
                    <CloudOffIcon />
                  }
                  onClick={handleManualSync}
                  disabled={syncStatus === 'syncing'}
                  color={syncStatus === 'error' ? 'error' : 'primary'}
                >
                  {syncStatus === 'syncing' ? '同步中...' :
                   syncStatus === 'synced' ? '已同步' :
                   '同步失败'}
                </Button>
                {lastSyncTime && (
                  <Typography variant="caption" color="text.secondary">
                    最后同步: {lastSyncTime.toLocaleTimeString()}
                  </Typography>
                )}
              </Box>
            </Box>
          </Paper>

          {/* 短语列表 */}
          <Paper elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
            {phrases.length > 0 ? (
              <List>
                {phrases.map((phrase, index) => (
                  <React.Fragment key={phrase.id}>
                    {index > 0 && <Divider />}
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1">
                              {phrase.name}
                            </Typography>
                            <Chip
                              label={getCategoryName(phrase.categoryId)}
                              size="small"
                              variant="outlined"
                            />
                            {phrase.isFavorite && (
                              <FavoriteIcon sx={{ color: 'error.main', fontSize: 16 }} />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {phrase.content}
                            </Typography>
                            {phrase.tags.length > 0 && (
                              <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {phrase.tags.map(tag => (
                                  <Chip key={tag} label={tag} size="small" />
                                ))}
                              </Box>
                            )}
                            <Typography variant="caption" color="text.secondary">
                              使用次数: {phrase.usageCount}
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={(e) => handlePhraseMenuOpen(e, phrase.id)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Alert severity="info">
                  {searchKeyword || selectedCategoryId || showFavorites
                    ? '没有找到匹配的短语'
                    : '暂无短语，点击"添加短语"开始创建'}
                </Alert>
              </Box>
            )}
          </Paper>
        </Container>
      </TabPanel>

      {/* 分类管理标签页 */}
      <TabPanel value={tabValue} index={1}>
        <Container
          maxWidth="md"
          sx={{
            mt: 2,
            mb: 2,
            flexGrow: 1,
            overflowY: 'auto',
            height: 'calc(100vh - 140px)',
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
          <Paper elevation={0} sx={{ p: 2, mb: 2, border: 1, borderColor: 'divider' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddCategory}
            >
              添加分类
            </Button>
          </Paper>

          <Paper elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
            {categories.length > 0 ? (
              <List>
                {categories.map((category, index) => (
                  <React.Fragment key={category.id}>
                    {index > 0 && <Divider />}
                    <ListItem>
                      <ListItemIcon>
                        <Box
                          sx={{
                            fontSize: 24,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {category.icon}
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={category.name}
                        secondary={category.description}
                      />
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            edge="end"
                            onClick={() => handleEditCategory(category)}
                            size="small"
                          >
                            <EditIcon />
                          </IconButton>
                          {!category.isDefault && (
                            <IconButton
                              edge="end"
                              onClick={() => handleDeleteCategory(category.id)}
                              size="small"
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Alert severity="info">
                  暂无分类，点击"添加分类"开始创建
                </Alert>
              </Box>
            )}
          </Paper>
        </Container>
      </TabPanel>

      {/* 短语菜单 */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handlePhraseMenuClose}
      >
        <MenuItem onClick={() => {
          if (selectedPhraseId) {
            handleTogglePhraseFavorite(selectedPhraseId);
          }
          handlePhraseMenuClose();
        }}>
          <ListItemIcon>
            <FavoriteIcon />
          </ListItemIcon>
          切换收藏
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedPhraseId) {
            const phrase = phrases.find(p => p.id === selectedPhraseId);
            if (phrase) handleEditPhrase(phrase);
          }
          handlePhraseMenuClose();
        }}>
          <ListItemIcon>
            <EditIcon />
          </ListItemIcon>
          编辑
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedPhraseId) {
            handleDeletePhrase(selectedPhraseId);
          }
          handlePhraseMenuClose();
        }}>
          <ListItemIcon>
            <DeleteIcon />
          </ListItemIcon>
          删除
        </MenuItem>
      </Menu>

      {/* 短语编辑对话框 */}
      <Dialog
        open={phraseDialogOpen}
        onClose={() => setPhraseDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingPhrase ? '编辑短语' : '添加短语'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="短语名称"
              value={phraseForm.name}
              onChange={(e) => setPhraseForm({ ...phraseForm, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="短语内容"
              value={phraseForm.content}
              onChange={(e) => setPhraseForm({ ...phraseForm, content: e.target.value })}
              fullWidth
              multiline
              rows={4}
              required
            />
            <TextField
              label="描述"
              value={phraseForm.description}
              onChange={(e) => setPhraseForm({ ...phraseForm, description: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>分类</InputLabel>
              <Select
                value={phraseForm.categoryId}
                onChange={(e) => setPhraseForm({ ...phraseForm, categoryId: e.target.value })}
                label="分类"
                required
              >
                {categories.map(category => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="标签"
              value={phraseForm.tags}
              onChange={(e) => setPhraseForm({ ...phraseForm, tags: e.target.value })}
              fullWidth
              placeholder="用逗号分隔多个标签"
              helperText="例如：问候,礼貌,常用"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPhraseDialogOpen(false)}>
            取消
          </Button>
          <Button
            onClick={handleSavePhrase}
            variant="contained"
            disabled={!phraseForm.name || !phraseForm.content || !phraseForm.categoryId}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 分类编辑对话框 */}
      <Dialog
        open={categoryDialogOpen}
        onClose={() => setCategoryDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingCategory ? '编辑分类' : '添加分类'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="分类名称"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="描述"
              value={categoryForm.description}
              onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              fullWidth
            />
            <TextField
              label="图标"
              value={categoryForm.icon}
              onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
              fullWidth
              placeholder="输入emoji图标"
            />
            <TextField
              label="颜色"
              value={categoryForm.color}
              onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
              fullWidth
              type="color"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryDialogOpen(false)}>
            取消
          </Button>
          <Button
            onClick={handleSaveCategory}
            variant="contained"
            disabled={!categoryForm.name}
          >
            保存
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

export default ShortcutLanguagePage;
