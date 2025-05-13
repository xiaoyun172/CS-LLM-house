import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Paper,
  TextField,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  Divider,
  FormControlLabel
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AutofpsSelectIcon from '@mui/icons-material/AutofpsSelect';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../shared/store';
import {
  updateProvider,
  deleteProvider
} from '../../shared/store/settingsSlice';
import type { Model } from '../../shared/types';
import { isValidUrl } from '../../shared/utils';
import { alpha } from '@mui/material/styles';
import ModelManagementDialog from '../../components/ModelManagementDialog';

const ModelProviderSettings: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { providerId } = useParams<{ providerId: string }>();

  const provider = useAppSelector(state =>
    state.settings.providers.find(p => p.id === providerId)
  );

  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [openAddModelDialog, setOpenAddModelDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openEditModelDialog, setOpenEditModelDialog] = useState(false);
  const [modelToEdit, setModelToEdit] = useState<Model | null>(null);
  const [newModelName, setNewModelName] = useState('');
  const [newModelValue, setNewModelValue] = useState('');
  const [baseUrlError, setBaseUrlError] = useState('');
  const [openModelManagementDialog, setOpenModelManagementDialog] = useState(false);

  // 当provider加载完成后初始化状态
  useEffect(() => {
    if (provider) {
      setApiKey(provider.apiKey || '');
      setBaseUrl(provider.baseUrl || '');
      setIsEnabled(provider.isEnabled);
    }
  }, [provider]);

  const handleBack = () => {
    navigate('/settings/default-model');
  };

  const handleSave = () => {
    if (provider) {
      // 验证baseUrl是否有效（如果已输入）
      if (baseUrl && !isValidUrl(baseUrl)) {
        setBaseUrlError('请输入有效的URL');
        return;
      }

      dispatch(updateProvider({
        id: provider.id,
        updates: {
          apiKey,
          baseUrl,
          isEnabled
        }
      }));
    }
    navigate('/settings/default-model');
  };

  const handleDelete = () => {
    if (provider) {
      dispatch(deleteProvider(provider.id));
    }
    setOpenDeleteDialog(false);
    navigate('/settings/default-model');
  };

  const handleAddModel = () => {
    if (provider && newModelName && newModelValue) {
      // 创建新模型对象
      const newModel: Model = {
        id: newModelValue,
        name: newModelName,
        provider: provider.id,
        providerType: provider.providerType,
        enabled: true,
        isDefault: false
      };

      // 创建更新后的模型数组
      const updatedModels = [...provider.models, newModel];

      // 更新provider
      dispatch(updateProvider({
        id: provider.id,
        updates: {
          models: updatedModels
        }
      }));

      // 清理状态
      setNewModelName('');
      setNewModelValue('');
      setOpenAddModelDialog(false);
    }
  };

  const handleEditModel = () => {
    if (provider && modelToEdit && newModelName && newModelValue) {
      // 创建更新后的模型对象
      const updatedModel: Model = {
        ...modelToEdit,
        name: newModelName,
        id: newModelValue, // 使用新输入的value作为模型ID
        providerType: modelToEdit.providerType || provider.providerType // 确保保留providerType
      };

      // 从provider的models数组中删除旧模型
      const updatedModels = provider.models.filter(m => m.id !== modelToEdit.id);

      // 添加更新后的模型到provider的models数组
      updatedModels.push(updatedModel);

      // 更新provider
      dispatch(updateProvider({
        id: provider.id,
        updates: {
          models: updatedModels
        }
      }));

      // 清理状态
      setModelToEdit(null);
      setNewModelName('');
      setNewModelValue('');
      setOpenEditModelDialog(false);
    }
  };

  const handleDeleteModel = (modelId: string) => {
    if (provider) {
      // 使用provider的更新方法，直接从provider的models数组中删除模型
      const updatedModels = provider.models.filter(model => model.id !== modelId);

      dispatch(updateProvider({
        id: provider.id,
        updates: {
          models: updatedModels
        }
      }));
    }
  };

  const openModelEditDialog = (model: Model) => {
    setModelToEdit(model);
    setNewModelName(model.name);
    setNewModelValue(model.id); // 使用模型ID作为value
    setOpenEditModelDialog(true);
  };

  const handleAddModelFromApi = (model: Model) => {
    if (provider) {
      // 创建新模型对象
      const newModel: Model = {
        ...model,
        provider: provider.id,
        providerType: provider.providerType,
        enabled: true
      };

      // 检查模型是否已存在
      const modelExists = provider.models.some(m => m.id === model.id);
      if (modelExists) {
        // 如果模型已存在，不添加
        return;
      }

      // 创建更新后的模型数组
      const updatedModels = [...provider.models, newModel];

      // 更新provider
      dispatch(updateProvider({
        id: provider.id,
        updates: {
          models: updatedModels
        }
      }));
    }
  };

  // 如果没有找到对应的提供商，显示错误信息
  if (!provider) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>未找到该提供商，请返回设置页面</Typography>
        <Button onClick={handleBack}>返回</Button>
      </Box>
    );
  }

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
            {provider.name}
          </Typography>
          <Button
            onClick={handleSave}
            sx={{
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
              '&:hover': {
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2),
              },
              borderRadius: 2,
            }}
          >
            保存
          </Button>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
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
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: provider.color || '#9333EA',
                fontSize: '1.5rem',
                mr: 2,
                boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              }}
            >
              {provider.avatar}
            </Avatar>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  backgroundImage: 'linear-gradient(90deg, #9333EA, #754AB4)',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                {provider.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {provider.providerType === 'openai' ? 'OpenAI API' :
                 provider.providerType === 'anthropic' ? 'Anthropic API' :
                 provider.providerType === 'gemini' ? 'Google Generative AI API' : '自定义API'}
              </Typography>
            </Box>
            <Box sx={{ ml: 'auto' }}>
              <IconButton
                color="error"
                onClick={() => setOpenDeleteDialog(true)}
                sx={{
                  bgcolor: (theme) => alpha(theme.palette.error.main, 0.1),
                  '&:hover': {
                    bgcolor: (theme) => alpha(theme.palette.error.main, 0.2),
                  }
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Typography
            variant="subtitle1"
            sx={{
              mb: 2,
              fontWeight: 600,
              color: 'text.primary'
            }}
          >
            API配置
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom color="text.secondary">
              启用状态
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  color="primary"
                />
              }
              label={isEnabled ? '已启用' : '已禁用'}
            />
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom color="text.secondary">
              API密钥
            </Typography>
            <TextField
              fullWidth
              placeholder="输入API密钥"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              variant="outlined"
              type="password"
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            />
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom color="text.secondary">
              基础URL (可选)
            </Typography>
            <TextField
              fullWidth
              placeholder="输入基础URL"
              value={baseUrl}
              onChange={(e) => {
                setBaseUrl(e.target.value);
                setBaseUrlError('');
              }}
              error={!!baseUrlError}
              helperText={baseUrlError}
              variant="outlined"
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            />
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                flex: 1,
                color: 'text.primary'
              }}
            >
              可用模型
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AutofpsSelectIcon />}
              onClick={() => setOpenModelManagementDialog(true)}
              sx={{
                mr: 2,
                borderRadius: 2,
                borderColor: (theme) => alpha(theme.palette.info.main, 0.5),
                color: 'info.main',
                '&:hover': {
                  borderColor: 'info.main',
                  bgcolor: (theme) => alpha(theme.palette.info.main, 0.1),
                },
              }}
            >
              自动获取
            </Button>
            <Button
              startIcon={<AddIcon />}
              onClick={() => setOpenAddModelDialog(true)}
              sx={{
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
                '&:hover': {
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2),
                },
                borderRadius: 2,
              }}
            >
              手动添加
            </Button>
          </Box>

          <List sx={{ width: '100%' }}>
            {provider.models.map((model) => (
              <Paper
                key={model.id}
                elevation={0}
                sx={{
                  mb: 2,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  overflow: 'hidden',
                  transition: 'all 0.2s',
                  '&:hover': {
                    boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
                    borderColor: (theme) => alpha(theme.palette.primary.main, 0.3),
                  }
                }}
              >
                <ListItem
                  secondaryAction={
                    <Box>
                      <IconButton
                        edge="end"
                        aria-label="edit"
                        onClick={() => openModelEditDialog(model)}
                        sx={{
                          mr: 1,
                          bgcolor: (theme) => alpha(theme.palette.info.main, 0.1),
                          '&:hover': {
                            bgcolor: (theme) => alpha(theme.palette.info.main, 0.2),
                          }
                        }}
                      >
                        <EditIcon color="info" />
                      </IconButton>
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleDeleteModel(model.id)}
                        sx={{
                          bgcolor: (theme) => alpha(theme.palette.error.main, 0.1),
                          '&:hover': {
                            bgcolor: (theme) => alpha(theme.palette.error.main, 0.2),
                          }
                        }}
                      >
                        <DeleteIcon color="error" />
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {model.name}
                        </Typography>
                        {model.isDefault && (
                          <Box
                            sx={{
                              ml: 1,
                              px: 1,
                              py: 0.2,
                              borderRadius: 1,
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              bgcolor: (theme) => alpha(theme.palette.success.main, 0.1),
                              color: 'success.main',
                            }}
                          >
                            默认
                          </Box>
                        )}
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary" fontSize="0.8rem">
                        ID: {model.id}
                      </Typography>
                    }
                  />
                </ListItem>
              </Paper>
            ))}
            {provider.models.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography color="text.secondary">
                  尚未添加任何模型
                </Typography>
              </Box>
            )}
          </List>
        </Paper>
      </Box>

      {/* 添加模型对话框 */}
      <Dialog open={openAddModelDialog} onClose={() => setOpenAddModelDialog(false)}>
        <DialogTitle sx={{
          fontWeight: 600,
          backgroundImage: 'linear-gradient(90deg, #9333EA, #754AB4)',
          backgroundClip: 'text',
          color: 'transparent',
        }}>
          添加模型
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="模型名称"
            placeholder="例如: GPT-4o"
            type="text"
            fullWidth
            variant="outlined"
            value={newModelName}
            onChange={(e) => setNewModelName(e.target.value)}
            sx={{ mb: 2, mt: 2 }}
          />
          <TextField
            margin="dense"
            label="模型ID"
            placeholder="例如: gpt-4o"
            type="text"
            fullWidth
            variant="outlined"
            value={newModelValue}
            onChange={(e) => setNewModelValue(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenAddModelDialog(false)}>取消</Button>
          <Button
            onClick={handleAddModel}
            disabled={!newModelName || !newModelValue}
            sx={{
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
              '&:hover': {
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2),
              },
              borderRadius: 2,
            }}
          >
            添加
          </Button>
        </DialogActions>
      </Dialog>

      {/* 编辑模型对话框 */}
      <Dialog open={openEditModelDialog} onClose={() => setOpenEditModelDialog(false)}>
        <DialogTitle sx={{
          fontWeight: 600,
          backgroundImage: 'linear-gradient(90deg, #9333EA, #754AB4)',
          backgroundClip: 'text',
          color: 'transparent',
        }}>
          编辑模型
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="模型名称"
            type="text"
            fullWidth
            variant="outlined"
            value={newModelName}
            onChange={(e) => setNewModelName(e.target.value)}
            sx={{ mb: 2, mt: 2 }}
          />
          <TextField
            margin="dense"
            label="模型ID"
            type="text"
            fullWidth
            variant="outlined"
            value={newModelValue}
            onChange={(e) => setNewModelValue(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenEditModelDialog(false)}>取消</Button>
          <Button
            onClick={handleEditModel}
            disabled={!newModelName || !newModelValue}
            sx={{
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
              '&:hover': {
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2),
              },
              borderRadius: 2,
            }}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle fontWeight={600}>删除提供商</DialogTitle>
        <DialogContent>
          <Typography>
            确定要删除 <b>{provider.name}</b> 提供商吗？这将同时删除所有相关的模型配置。
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDeleteDialog(false)}>取消</Button>
          <Button
            onClick={handleDelete}
            color="error"
            sx={{
              bgcolor: (theme) => alpha(theme.palette.error.main, 0.1),
              '&:hover': {
                bgcolor: (theme) => alpha(theme.palette.error.main, 0.2),
              },
              borderRadius: 2,
            }}
          >
            删除
          </Button>
        </DialogActions>
      </Dialog>

      {/* 自动获取模型对话框 */}
      {provider && (
        <ModelManagementDialog
          open={openModelManagementDialog}
          onClose={() => setOpenModelManagementDialog(false)}
          provider={provider}
          onAddModel={handleAddModelFromApi}
          onRemoveModel={handleDeleteModel}
          existingModels={provider.models || []}
        />
      )}
    </Box>
  );
};

export default ModelProviderSettings;