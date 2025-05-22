import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  alpha
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../shared/store';
import { addProvider } from '../../shared/store/settingsSlice';
import { generateId } from '../../shared/utils';

// 供应商类型列表
const providerTypes = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'azure-openai', label: 'Azure OpenAI' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'grok', label: 'xAI (Grok)' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'siliconflow', label: '硅基流动 (SiliconFlow)' },
  { value: 'volcengine', label: '火山引擎' },
  { value: 'custom', label: '其他' },
];

const AddProviderPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [providerName, setProviderName] = useState('');
  const [providerType, setProviderType] = useState('');
  const [avatarLetter, setAvatarLetter] = useState('');

  const handleBack = () => {
    navigate('/settings/default-model');
  };

  const handleProviderTypeChange = (event: React.ChangeEvent<{ value: unknown }> | any) => {
    const type = event.target.value as string;
    setProviderType(type);

    // 自动设置头像字母
    if (type === 'custom') {
      if (providerName) {
        setAvatarLetter(providerName.charAt(0).toUpperCase());
      }
    } else {
      const selectedProvider = providerTypes.find(p => p.value === type);
      if (selectedProvider) {
        setAvatarLetter(selectedProvider.label.charAt(0).toUpperCase());
      }
    }
  };

  const handleProviderNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const name = event.target.value;
    setProviderName(name);

    // 如果是自定义类型，自动更新头像字母
    if (providerType === 'custom' && name) {
      setAvatarLetter(name.charAt(0).toUpperCase());
    }
  };

  const handleSubmit = () => {
    // 获取一个随机颜色
    const colors = ['#10a37f', '#4285f4', '#b83280', '#8b5cf6', '#6366f1', '#ef4444', '#f59e0b', '#22c55e'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    // 创建新的供应商对象
    const newProvider = {
      id: generateId(), // 始终使用随机ID避免冲突
      name: providerName,
      avatar: avatarLetter,
      color: randomColor,
      isEnabled: true,
      apiKey: '',
      baseUrl: providerType === 'openai' ? 'https://api.openai.com/v1' :
               providerType === 'azure-openai' ? '' : // Azure OpenAI需要用户自定义endpoint
               providerType === 'anthropic' ? 'https://api.anthropic.com/v1' :
               providerType === 'gemini' ? 'https://generativelanguage.googleapis.com/v1' :
               providerType === 'grok' ? 'https://api.x.ai/v1' :
               providerType === 'deepseek' ? 'https://api.deepseek.com' :
               providerType === 'siliconflow' ? 'https://api.siliconflow.cn/v1' :
               providerType === 'volcengine' ? 'https://ark.cn-beijing.volces.com/api/v3/' : '',
      models: [],
      providerType: providerType // 保存供应商类型以便后续判断API调用
    };

    // 添加到Redux状态
    dispatch(addProvider(newProvider));

    // 添加成功后跳转到该供应商的详情页面
    navigate(`/settings/model-provider/${newProvider.id}`);
  };

  const isSubmitDisabled = !providerName || !providerType;

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
            添加提供商
          </Typography>
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
            maxWidth: 600,
            mx: 'auto',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
            <Avatar
              sx={{
                width: 64,
                height: 64,
                bgcolor: '#9333EA',
                fontSize: '1.7rem',
                mr: 2,
                boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              }}
            >
              {avatarLetter || 'P'}
            </Avatar>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 600,
                backgroundImage: 'linear-gradient(90deg, #9333EA, #754AB4)',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              {providerName || '新提供商'}
            </Typography>
          </Box>

          <Typography
            variant="subtitle1"
            gutterBottom
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              mb: 3
            }}
          >
            提供商信息
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom color="text.secondary">
              提供商名称
            </Typography>
            <TextField
              fullWidth
              placeholder="例如 OpenAI"
              value={providerName}
              onChange={handleProviderNameChange}
              variant="outlined"
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            />
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle2" gutterBottom color="text.secondary">
              提供商类型
            </Typography>
            <FormControl
              fullWidth
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            >
              <InputLabel>提供商类型</InputLabel>
              <Select
                value={providerType}
                onChange={handleProviderTypeChange}
                label="提供商类型"
              >
                {providerTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {providerType && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1, fontSize: '0.8rem' }}
              >
                {providerType === 'openai' ? '添加OpenAI兼容的API服务' :
                 providerType === 'azure-openai' ? '添加Azure OpenAI API服务（需要配置endpoint和apiVersion）' :
                 providerType === 'anthropic' ? '添加Anthropic Claude API服务' :
                 providerType === 'gemini' ? '添加Google Gemini API服务' :
                 providerType === 'grok' ? '添加xAI (Grok) API服务' :
                 providerType === 'deepseek' ? '添加DeepSeek API服务（使用OpenAI兼容格式）' :
                 providerType === 'siliconflow' ? '添加硅基流动 (SiliconFlow) API服务' :
                 providerType === 'volcengine' ? '添加火山引擎 (豆包/DeepSeek) API服务' :
                 '添加自定义API服务'}
              </Typography>
            )}
          </Box>

          <Box
            sx={{
              mt: 4,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 2
            }}
          >
            <Button
              variant="outlined"
              onClick={handleBack}
              sx={{
                borderRadius: 2,
                px: 3,
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
              sx={{
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
                '&:hover': {
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2),
                },
                borderRadius: 2,
                px: 3,
              }}
            >
              下一步
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default AddProviderPage;