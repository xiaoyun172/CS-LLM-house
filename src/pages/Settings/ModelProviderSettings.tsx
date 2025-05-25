import React, { useState, useEffect, useCallback } from 'react';
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
  FormControlLabel,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AutofpsSelectIcon from '@mui/icons-material/AutofpsSelect';
import VerifiedIcon from '@mui/icons-material/Verified';
import SettingsIcon from '@mui/icons-material/Settings';
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
import SimpleModelDialog from '../../components/settings/SimpleModelDialog';
import { testApiConnection } from '../../shared/api';
import { sendChatRequest } from '../../shared/api';



const getCompleteApiUrl = (baseUrl: string): string => {
  if (!baseUrl.trim()) return '';

  if (baseUrl.endsWith('#')) {
    return baseUrl.slice(0, -1);
  }

  // 如果已经包含完整路径，直接返回
  if (baseUrl.includes('/chat/completions') || baseUrl.includes('/messages') || baseUrl.includes('/v1/models')) {
    return baseUrl;
  }

  const forceUseOriginalHost = () => {
    if (baseUrl.endsWith('/')) {
      return true;
    }
    // 火山引擎特殊处理 - 使用 /v3/chat/completions
    if (baseUrl.endsWith('volces.com/api/v3')) {
      return true;
    }
    // 智谱AI特殊处理 - 使用 /v4/chat/completions
    if (baseUrl.endsWith('bigmodel.cn/api/paas/v4/')) {
      return true;
    }
    return false;
  };

  if (forceUseOriginalHost()) {
    // 火山引擎和智谱AI直接添加 /chat/completions
    if (baseUrl.endsWith('volces.com/api/v3') || baseUrl.endsWith('bigmodel.cn/api/paas/v4/')) {
      return `${baseUrl}chat/completions`;
    }
    return baseUrl;
  }

  // 其他提供商添加 /v1/chat/completions
  return `${baseUrl}/v1/chat/completions`;
};

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
  const [modelToEdit, setModelToEdit] = useState<Model | undefined>(undefined);
  const [newModelName, setNewModelName] = useState('');
  const [newModelValue, setNewModelValue] = useState('');
  const [baseUrlError, setBaseUrlError] = useState('');
  const [openModelManagementDialog, setOpenModelManagementDialog] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testingModelId, setTestingModelId] = useState<string | null>(null);
  const [testResultDialogOpen, setTestResultDialogOpen] = useState(false);

  // 编辑供应商名称相关状态
  const [openEditProviderDialog, setOpenEditProviderDialog] = useState(false);
  const [editProviderName, setEditProviderName] = useState('');

  // 当provider加载完成后初始化状态
  useEffect(() => {
    if (provider) {
      setApiKey(provider.apiKey || '');
      setBaseUrl(provider.baseUrl || '');
      setIsEnabled(provider.isEnabled);
    }
  }, [provider]);

  const handleBack = () => {
    navigate('/settings/default-model', { replace: true });
  };

  // 保存API配置
  const saveApiConfig = () => {
    if (provider) {
      // 验证baseUrl是否有效（如果已输入）
      if (baseUrl && !isValidUrl(baseUrl)) {
        setBaseUrlError('请输入有效的URL');
        return false;
      }

      dispatch(updateProvider({
        id: provider.id,
        updates: {
          apiKey,
          baseUrl,
          isEnabled
        }
      }));
      return true;
    }
    return false;
  };

  const handleSave = () => {
    if (saveApiConfig()) {
      navigate('/settings/default-model', { replace: true });
    }
  };

  const handleDelete = () => {
    if (provider) {
      dispatch(deleteProvider(provider.id));
    }
    setOpenDeleteDialog(false);
    navigate('/settings/default-model', { replace: true });
  };

  // 编辑供应商名称相关函数
  const handleEditProviderName = () => {
    if (provider) {
      setEditProviderName(provider.name);
      setOpenEditProviderDialog(true);
    }
  };

  const handleSaveProviderName = () => {
    if (provider && editProviderName.trim()) {
      dispatch(updateProvider({
        id: provider.id,
        updates: {
          name: editProviderName.trim()
        }
      }));
      setOpenEditProviderDialog(false);
      setEditProviderName('');
    }
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

  const handleEditModel = (updatedModel: Model) => {
    if (provider && updatedModel) {
      // 从provider的models数组中删除旧模型
      const updatedModels = provider.models.filter(m =>
        modelToEdit ? m.id !== modelToEdit.id : true
      );

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
      setModelToEdit(undefined);
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

  const handleAddModelFromApi = useCallback((model: Model) => {
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
  }, [provider, dispatch]);

  // 批量添加多个模型
  const handleBatchAddModels = useCallback((addedModels: Model[]) => {
    if (provider && addedModels.length > 0) {
      // 获取所有不存在的模型
      const newModels = addedModels.filter(model =>
        !provider.models.some(m => m.id === model.id)
      ).map(model => ({
        ...model,
        provider: provider.id,
        providerType: provider.providerType,
        enabled: true
      }));

      if (newModels.length === 0) return;

      // 创建更新后的模型数组
      const updatedModels = [...provider.models, ...newModels];

      // 更新provider
      dispatch(updateProvider({
        id: provider.id,
        updates: {
          models: updatedModels
        }
      }));
    }
  }, [provider, dispatch]);

  // 批量删除多个模型
  const handleBatchRemoveModels = useCallback((modelIds: string[]) => {
    if (provider && modelIds.length > 0) {
      // 过滤掉要删除的模型
      const updatedModels = provider.models.filter(model => !modelIds.includes(model.id));

      // 更新provider
      dispatch(updateProvider({
        id: provider.id,
        updates: {
          models: updatedModels
        }
      }));
    }
  }, [provider, dispatch]);

  // 打开模型管理对话框前先保存当前API配置
  const handleOpenModelManagement = () => {
    if (saveApiConfig()) {
      setOpenModelManagementDialog(true);
    } else {
      // 如果保存失败（例如URL无效），提示用户
      if (baseUrlError) {
        alert('请输入有效的基础URL');
      }
    }
  };

  // API测试功能
  const handleTestConnection = async () => {
    if (provider) {
      // 先保存当前配置
      const configSaved = saveApiConfig();
      if (!configSaved) {
        // 如果保存失败（例如URL无效），提示用户
        if (baseUrlError) {
          setTestResult({ success: false, message: '请输入有效的基础URL' });
          return;
        }
      }

      // 开始测试
      setIsTesting(true);
      setTestResult(null);

      try {
        // 创建一个模拟模型对象，包含当前输入的API配置
        const testModel = {
          id: provider.models.length > 0 ? provider.models[0].id : 'gpt-3.5-turbo',
          name: provider.name,
          provider: provider.id,
          providerType: provider.providerType,
          apiKey: apiKey,
          baseUrl: baseUrl,
          enabled: true
        };

        // 调用测试连接API
        const success = await testApiConnection(testModel);

        if (success) {
          setTestResult({ success: true, message: '连接成功！API配置有效。' });
        } else {
          setTestResult({ success: false, message: '连接失败，请检查API密钥和基础URL是否正确。' });
        }
      } catch (error) {
        console.error('测试API连接时出错:', error);
        setTestResult({
          success: false,
          message: `连接错误: ${error instanceof Error ? error.message : String(error)}`
        });
      } finally {
        setIsTesting(false);
      }
    }
  };

  // 增强的测试单个模型的函数
  const handleTestModelConnection = async (model: Model) => {
    if (!provider) return;

    // 保存当前测试的模型ID
    setTestingModelId(model.id);
    setTestResult(null);

    try {
      // 创建测试模型对象，使用当前保存的API配置
      const testModel = {
        ...model,
        apiKey: apiKey,
        baseUrl: baseUrl,
        enabled: true
      };

      // 直接发送真实的API请求，而不仅仅是测试连接
      const testResponse = await sendChatRequest({
        messages: [{
          role: 'user',
          content: '这是一条API测试消息，请简短回复以验证连接。'
        }],
        modelId: testModel.id
      });

      if (testResponse.success) {
        // 显示成功信息和API响应内容
        setTestResult({
          success: true,
          message: `模型 ${model.name} 连接成功!\n\n响应内容: "${testResponse.content?.substring(0, 100)}${testResponse.content && testResponse.content.length > 100 ? '...' : ''}"`
        });
      } else {
        // 显示失败信息和错误原因
        setTestResult({
          success: false,
          message: `模型 ${model.name} 连接失败：${testResponse.error || '未知错误'}`
        });
      }
    } catch (error) {
      console.error('测试模型连接时出错:', error);
      setTestResult({
        success: false,
        message: `连接错误: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setTestingModelId(null);
    }
  };

  // 更新原有的Snackbar处理
  useEffect(() => {
    // 当有测试结果时，如果内容较长则自动打开详细对话框
    if (testResult && testResult.message && testResult.message.length > 80) {
      setTestResultDialogOpen(true);
    }
  }, [testResult]);

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
        {/* API配置部分 */}
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
                {provider.isSystem ? '系统供应商' :
                 provider.providerType === 'openai' ? 'OpenAI API' :
                 provider.providerType === 'anthropic' ? 'Anthropic API' :
                 provider.providerType === 'gemini' ? 'Google Generative AI API' : '自定义API'}
              </Typography>
            </Box>
            <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
              {!provider.isSystem && (
                <>
                  <IconButton
                    onClick={handleEditProviderName}
                    sx={{
                      bgcolor: (theme) => alpha(theme.palette.info.main, 0.1),
                      '&:hover': {
                        bgcolor: (theme) => alpha(theme.palette.info.main, 0.2),
                      }
                    }}
                  >
                    <EditIcon color="info" />
                  </IconButton>
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
                </>
              )}
            </Box>
          </Box>

          {provider.isSystem ? (
            // 系统供应商显示说明信息
            <Box sx={{
              p: 2,
              bgcolor: (theme) => alpha(theme.palette.info.main, 0.1),
              borderRadius: 2,
              border: '1px solid',
              borderColor: (theme) => alpha(theme.palette.info.main, 0.3)
            }}>
              <Typography variant="body2" color="info.main" sx={{ fontWeight: 500 }}>
                🧠 系统供应商说明
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                模型组合供应商是系统内置的虚拟供应商，它使用您配置的模型组合来提供服务。
                模型组合中的各个模型会使用它们各自配置的 API 密钥和基础 URL。
              </Typography>
            </Box>
          ) : (
            // 普通供应商显示API配置
            <>
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
                  placeholder="输入基础URL，例如: https://api.openai.com"
                  value={baseUrl}
                  onChange={(e) => {
                    setBaseUrl(e.target.value);
                    setBaseUrlError('');
                  }}
                  error={!!baseUrlError}
                  helperText={
                    <span>
                      {baseUrlError && (
                        <span style={{ display: 'block', color: 'error.main', marginBottom: '4px', fontSize: '0.75rem' }}>
                          {baseUrlError}
                        </span>
                      )}
                      <span style={{ display: 'block', color: 'text.secondary', marginBottom: '4px', fontSize: '0.75rem' }}>
                        在URL末尾添加 # 可强制使用自定义格式
                      </span>
                      {baseUrl && (
                        <span
                          style={{
                            display: 'inline-block',
                            color: baseUrl.endsWith('#') ? '#ed6c02' : '#666',
                            fontFamily: 'monospace',
                            fontSize: '0.7rem',
                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            marginTop: '4px'
                          }}
                        >
                          {baseUrl.endsWith('#') ? '强制使用: ' : '完整地址: '}
                          {getCompleteApiUrl(baseUrl)}
                        </span>
                      )}
                    </span>
                  }
                  variant="outlined"
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
                />
              </Box>

              {/* 添加API测试按钮 */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={isTesting ? <CircularProgress size={16} /> : <VerifiedIcon />}
                  onClick={handleTestConnection}
                  disabled={isTesting || !apiKey}
                  sx={{
                    borderRadius: 2,
                    borderColor: (theme) => alpha(theme.palette.info.main, 0.5),
                    color: 'info.main',
                    '&:hover': {
                      borderColor: 'info.main',
                      bgcolor: (theme) => alpha(theme.palette.info.main, 0.1),
                    },
                  }}
                >
                  {isTesting ? '测试中...' : '测试连接'}
                </Button>
              </Box>
            </>
          )}
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
              {provider.isSystem ? '模型组合' : '可用模型'}
            </Typography>
            {provider.isSystem ? (
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={() => window.location.href = '/settings/model-combo'}
                sx={{
                  borderRadius: 2,
                  borderColor: (theme) => alpha(theme.palette.primary.main, 0.5),
                  color: 'primary.main',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                  },
                }}
              >
                管理组合
              </Button>
            ) : (
              <>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}
                >
                  点击✓测试单个模型
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AutofpsSelectIcon />}
                  onClick={handleOpenModelManagement}
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
              </>
            )}
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
                    provider.isSystem ? (
                      // 系统供应商（模型组合）显示不同的操作按钮
                      <Box>
                        <IconButton
                          aria-label="edit-combo"
                          onClick={() => window.location.href = '/settings/model-combo'}
                          sx={{
                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                            '&:hover': {
                              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2),
                            }
                          }}
                        >
                          <SettingsIcon color="primary" />
                        </IconButton>
                      </Box>
                    ) : (
                      // 普通供应商显示原有的操作按钮
                      <Box>
                        <IconButton
                          aria-label="test"
                          onClick={() => handleTestModelConnection(model)}
                          disabled={testingModelId !== null}
                          sx={{
                            mr: 1,
                            bgcolor: (theme) => alpha(theme.palette.success.main, 0.1),
                            '&:hover': {
                              bgcolor: (theme) => alpha(theme.palette.success.main, 0.2),
                            }
                          }}
                        >
                          {testingModelId === model.id ? <CircularProgress size={16} color="success" /> : <VerifiedIcon color="success" />}
                        </IconButton>
                        <IconButton
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
                    )
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
                  {provider.isSystem ? '尚未创建任何模型组合' : '尚未添加任何模型'}
                </Typography>
                {provider.isSystem && (
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => window.location.href = '/settings/model-combo'}
                    sx={{ mt: 2 }}
                  >
                    创建模型组合
                  </Button>
                )}
              </Box>
            )}
          </List>
        </Paper>

        {/* 修改Snackbar，简短显示结果并添加查看详情按钮 */}
        <Snackbar
          open={testResult !== null && !testResultDialogOpen}
          autoHideDuration={6000}
          onClose={() => setTestResult(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          action={
            <Button color="inherit" size="small" onClick={() => setTestResultDialogOpen(true)}>
              查看详情
            </Button>
          }
        >
          <Alert
            onClose={() => setTestResult(null)}
            severity={testResult?.success ? "success" : "error"}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {testResult?.success ? '连接测试成功!' : '连接测试失败'}
          </Alert>
        </Snackbar>

        {/* 添加测试结果详细对话框 */}
        <Dialog
          open={testResultDialogOpen}
          onClose={() => setTestResultDialogOpen(false)}
          maxWidth="md"
          PaperProps={{
            sx: {
              width: '100%',
              maxWidth: 500,
              borderRadius: 2
            }
          }}
        >
          <DialogTitle sx={{
            fontWeight: 600,
            color: testResult?.success ? 'success.main' : 'error.main',
            display: 'flex',
            alignItems: 'center'
          }}>
            {testResult?.success ? <VerifiedIcon sx={{mr: 1}}/> : null}
            API测试结果
          </DialogTitle>
          <DialogContent>
            <Typography sx={{ whiteSpace: 'pre-wrap' }}>
              {testResult?.message || ''}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button
              onClick={() => setTestResultDialogOpen(false)}
              variant="contained"
              color={testResult?.success ? 'success' : 'primary'}
              sx={{ borderRadius: 2 }}
            >
              确定
            </Button>
          </DialogActions>
        </Dialog>
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
      <SimpleModelDialog
        open={openEditModelDialog}
        onClose={() => setOpenEditModelDialog(false)}
        onSave={handleEditModel}
        editModel={modelToEdit}
      />

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

      {/* 编辑供应商名称对话框 */}
      <Dialog open={openEditProviderDialog} onClose={() => setOpenEditProviderDialog(false)}>
        <DialogTitle sx={{
          fontWeight: 600,
          backgroundImage: 'linear-gradient(90deg, #9333EA, #754AB4)',
          backgroundClip: 'text',
          color: 'transparent',
        }}>
          编辑供应商名称
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="供应商名称"
            placeholder="例如: 我的智谱AI"
            type="text"
            fullWidth
            variant="outlined"
            value={editProviderName}
            onChange={(e) => setEditProviderName(e.target.value)}
            sx={{ mb: 2, mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenEditProviderDialog(false)}>取消</Button>
          <Button
            onClick={handleSaveProviderName}
            disabled={!editProviderName.trim()}
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

      {/* 自动获取模型对话框 */}
      {provider && (
        <ModelManagementDialog
          open={openModelManagementDialog}
          onClose={() => setOpenModelManagementDialog(false)}
          provider={provider}
          onAddModel={handleAddModelFromApi}
          onAddModels={handleBatchAddModels}
          onRemoveModel={handleDeleteModel}
          onRemoveModels={handleBatchRemoveModels}
          existingModels={provider.models || []}
        />
      )}
    </Box>
  );
};

export default ModelProviderSettings;