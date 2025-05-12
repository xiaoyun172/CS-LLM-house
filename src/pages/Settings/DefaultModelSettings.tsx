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
  ListSubheader
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../shared/store';

/**
 * 默认模型设置组件
 */
const DefaultModelSettings: React.FC = () => {
  const navigate = useNavigate();
  const providers = useAppSelector(state => state.settings.providers);

  const handleBack = () => {
    navigate('/settings');
  };

  const handleAddProvider = () => {
    navigate('/settings/add-provider');
  };

  const handleProviderClick = (providerId: string) => {
    navigate(`/settings/model-provider/${providerId}`);
  };

  return (
    <Box sx={{ 
      flexGrow: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      bgcolor: '#f8fafc',
    }}>
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={{ 
          bgcolor: '#8e24aa', 
          color: 'white',
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleBack}
            aria-label="back"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            模型设置
          </Typography>
          <Button 
            color="inherit" 
            startIcon={<AddIcon />}
            onClick={handleAddProvider}
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
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
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
              >
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      bgcolor: provider.color || '#8e24aa',
                    }}
                  >
                    {provider.avatar || provider.name.charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary={provider.name}
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
                <ChevronRightIcon color="action" />
              </ListItemButton>
            ))}
          </List>
        </Paper>
        
        <Paper
          elevation={0}
          sx={{
            mb: 2,
            borderRadius: 2,
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
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
                }}
              >
                推荐操作
              </ListSubheader>
            }
          >
            <ListItem>
              <ListItemButton onClick={handleAddProvider}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: '#8e24aa' }}>
                    <AddIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary="添加模型服务商"
                  secondary="设置新的模型服务商"
                />
              </ListItemButton>
            </ListItem>
          </List>
        </Paper>
      </Box>
    </Box>
  );
};

export default DefaultModelSettings; 