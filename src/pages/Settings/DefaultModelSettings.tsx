import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Avatar,
  Divider,
  AppBar,
  Toolbar,
  IconButton,
  Button,
  Paper,
  ListSubheader,
  alpha
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../shared/store';
import { setModelSelectorStyle } from '../../shared/store/settingsSlice';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import FormattedAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';

/**
 * 默认模型设置组件
 */
const DefaultModelSettings: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const providers = useAppSelector(state => state.settings.providers);
  const modelSelectorStyle = useAppSelector(state => state.settings.modelSelectorStyle);

  const handleBack = () => {
    navigate('/settings');
  };

  const handleAddProvider = () => {
    navigate('/settings/add-provider');
  };

  const handleProviderClick = (providerId: string) => {
    navigate(`/settings/model-provider/${providerId}`);
  };

  const toggleModelSelectorStyle = () => {
    // 切换选择器样式
    const newStyle = modelSelectorStyle === 'dialog' ? 'dropdown' : 'dialog';
    dispatch(setModelSelectorStyle(newStyle));
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
            color="inherit"
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
            模型设置
          </Typography>
          <Button
            startIcon={<AddIcon />}
            onClick={handleAddProvider}
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
            mb: 2,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
            bgcolor: 'background.paper',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          }}
        >
          <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.01)' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              模型服务商
            </Typography>
            <Typography variant="body2" color="text.secondary">
              您可以配置多个模型服务商，点击对应的服务商进行设置和管理
            </Typography>
          </Box>

          <Divider />

          <List disablePadding>
            {providers.map((provider) => (
              <ListItemButton
                key={provider.id}
                onClick={() => handleProviderClick(provider.id)}
                sx={{
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
                  }
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      bgcolor: provider.color || '#8e24aa',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                    }}
                  >
                    {provider.avatar || provider.name.charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {provider.name}
                    </Typography>
                  }
                  secondary={
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography
                        component="span"
                        variant="body2"
                        sx={{
                          mr: 1,
                          color: provider.isEnabled ? 'success.main' : 'text.disabled',
                          fontWeight: 500
                        }}
                      >
                        {provider.isEnabled ? '已启用' : '已禁用'}
                      </Typography>
                      {provider.models.length > 0 && (
                        <Typography component="span" variant="body2" color="text.secondary">
                          {provider.models.length} 个模型
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <ChevronRightIcon sx={{ color: (theme) => alpha(theme.palette.primary.main, 0.5) }} />
              </ListItemButton>
            ))}
          </List>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            mb: 2,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
            bgcolor: 'background.paper',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          }}
        >
          <List
            subheader={
              <ListSubheader
                component="div"
                sx={{
                  bgcolor: 'rgba(0,0,0,0.01)',
                  py: 1,
                  fontWeight: 600,
                  color: 'text.primary'
                }}
              >
                推荐操作
              </ListSubheader>
            }
          >
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => navigate('/settings/default-model-settings')}
                sx={{
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
                  }
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{
                    bgcolor: alpha('#4f46e5', 0.12),
                    color: '#4f46e5',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                  }}>
                    <SmartToyIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={<Typography sx={{ fontWeight: 600, color: 'text.primary' }}>默认模型设置</Typography>}
                  secondary="设置默认使用的模型和自动化选项"
                />
                <ChevronRightIcon sx={{ color: 'text.secondary' }} />
              </ListItemButton>
            </ListItem>

            <Divider variant="inset" component="li" sx={{ ml: 0 }} />

            <ListItem disablePadding>
              <ListItemButton
                onClick={toggleModelSelectorStyle}
                sx={{
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
                  }
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{
                    bgcolor: alpha('#06b6d4', 0.12),
                    color: '#06b6d4',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                  }}>
                    {modelSelectorStyle === 'dialog' ? <ViewAgendaIcon /> : <FormattedAlignLeftIcon />}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={<Typography sx={{ fontWeight: 600, color: 'text.primary' }}>模型选择器样式</Typography>}
                  secondary={modelSelectorStyle === 'dialog' ? "当前：弹窗式选择器（点击切换为下拉式）" : "当前：下拉式选择器（点击切换为弹窗式）"}
                />
              </ListItemButton>
            </ListItem>

            <Divider variant="inset" component="li" sx={{ ml: 0 }} />

            <ListItem disablePadding>
              <ListItemButton
                onClick={() => navigate('/settings/add-provider')}
                sx={{
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
                  }
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{
                    bgcolor: alpha('#9333ea', 0.12),
                    color: '#9333ea',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                  }}>
                    <AddIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={<Typography sx={{ fontWeight: 600, color: 'text.primary' }}>添加模型服务商</Typography>}
                  secondary="设置新的模型服务商"
                />
                <ChevronRightIcon sx={{ color: 'text.secondary' }} />
              </ListItemButton>
            </ListItem>
          </List>
        </Paper>
      </Box>
    </Box>
  );
};

export default DefaultModelSettings;