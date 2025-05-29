import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Switch,
  Typography,
  Box,
  Chip,
  Avatar,
  alpha,
  Button,
  Divider,
  useTheme
} from '@mui/material';
import {
  Build as BuildIcon,
  Settings as SettingsIcon,
  Cloud as CloudIcon,
  Storage as StorageIcon,
  Http as HttpIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../shared/store';
import type { MCPServer, MCPServerType } from '../../shared/types';
import { mcpService } from '../../shared/services/MCPService';

interface MCPToolsButtonProps {
  onMCPToggle?: (enabled: boolean) => void;
  mcpEnabled?: boolean;
}

const MCPToolsButton: React.FC<MCPToolsButtonProps> = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [open, setOpen] = useState(false);
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [activeServers, setActiveServers] = useState<MCPServer[]>([]);

  // 获取输入框风格设置
  const inputBoxStyle = useSelector((state: RootState) =>
    (state.settings as any).inputBoxStyle || 'default'
  );

  // 获取工具栏显示样式设置
  const toolbarDisplayStyle = useSelector((state: RootState) =>
    (state.settings as any).toolbarDisplayStyle || 'both'
  );

  // 根据风格获取工具栏样式
  const getToolbarStyles = () => {
    const baseStyles = {
      buttonBg: isDarkMode ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)',
      buttonBorder: isDarkMode ? 'rgba(60, 60, 60, 0.8)' : 'rgba(230, 230, 230, 0.8)',
      buttonShadow: isDarkMode ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.07)',
      hoverBg: isDarkMode ? 'rgba(40, 40, 40, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      hoverShadow: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.1)',
      borderRadius: '50px',
      backdropFilter: 'blur(5px)'
    };

    switch (inputBoxStyle) {
      case 'modern':
        return {
          ...baseStyles,
          buttonBg: isDarkMode
            ? 'linear-gradient(135deg, rgba(45, 45, 45, 0.9) 0%, rgba(35, 35, 35, 0.9) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
          buttonBorder: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          buttonShadow: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
          hoverBg: isDarkMode
            ? 'linear-gradient(135deg, rgba(55, 55, 55, 0.95) 0%, rgba(45, 45, 45, 0.95) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%)',
          hoverShadow: isDarkMode ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.15)',
          borderRadius: '16px',
          backdropFilter: 'blur(10px)'
        };
      case 'minimal':
        return {
          ...baseStyles,
          buttonBg: isDarkMode ? 'rgba(40, 40, 40, 0.6)' : 'rgba(255, 255, 255, 0.7)',
          buttonBorder: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
          buttonShadow: 'none',
          hoverBg: isDarkMode ? 'rgba(50, 50, 50, 0.8)' : 'rgba(255, 255, 255, 0.9)',
          hoverShadow: 'none',
          borderRadius: '12px',
          backdropFilter: 'none'
        };
      default:
        return baseStyles;
    }
  };

  const toolbarStyles = getToolbarStyles();

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = () => {
    const allServers = mcpService.getServers();
    const active = mcpService.getActiveServers();
    setServers(allServers);
    setActiveServers(active);
  };

  const handleOpen = () => {
    setOpen(true);
    loadServers();
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleToggleServer = async (serverId: string, isActive: boolean) => {
    try {
      await mcpService.toggleServer(serverId, isActive);
      loadServers();
    } catch (error) {
      console.error('切换服务器状态失败:', error);
    }
  };

  const handleNavigateToSettings = () => {
    setOpen(false);
    navigate('/settings/mcp-server');
  };

  const getServerTypeIcon = (type: MCPServerType) => {
    switch (type) {
      case 'sse':
        return <CloudIcon />;
      case 'streamableHttp':
        return <HttpIcon />;
      case 'inMemory':
        return <StorageIcon />;
      default:
        return <SettingsIcon />;
    }
  };

  const getServerTypeColor = (type: MCPServerType) => {
    switch (type) {
      case 'sse':
        return '#2196f3';
      case 'streamableHttp':
        return '#4caf50';
      case 'inMemory':
        return '#ff9800';
      default:
        return '#9e9e9e';
    }
  };

  const hasActiveServers = activeServers.length > 0;

  return (
    <>
      <Box
        onClick={handleOpen}
        sx={{
          display: 'flex',
          alignItems: 'center',
          background: hasActiveServers
            ? (isDarkMode ? '#424242' : '#10b981')
            : toolbarStyles.buttonBg,
          backdropFilter: toolbarStyles.backdropFilter,
          WebkitBackdropFilter: toolbarStyles.backdropFilter,
          color: hasActiveServers ? '#FFFFFF' : (isDarkMode ? '#9E9E9E' : '#10b981'),
          border: `1px solid ${toolbarStyles.buttonBorder}`,
          borderRadius: toolbarStyles.borderRadius,
          padding: '6px 12px',
          margin: '0 4px',
          cursor: 'pointer',
          boxShadow: toolbarStyles.buttonShadow ? `0 1px 3px ${toolbarStyles.buttonShadow}` : 'none',
          transition: 'all 0.3s ease',
          minWidth: 'max-content',
          userSelect: 'none',
          '&:hover': {
            boxShadow: toolbarStyles.hoverShadow ? `0 2px 4px ${toolbarStyles.hoverShadow}` : 'none',
            background: hasActiveServers
              ? (isDarkMode ? '#525252' : '#059669')
              : toolbarStyles.hoverBg,
            transform: inputBoxStyle === 'modern' ? 'translateY(-1px)' : 'none'
          },
          '&:active': {
            transform: 'scale(0.98)'
          }
        }}
        title="MCP 工具"
      >
        {toolbarDisplayStyle !== 'text' && <BuildIcon sx={{ fontSize: '18px' }} />}
        {toolbarDisplayStyle !== 'icon' && (
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              fontSize: '13px',
              ml: toolbarDisplayStyle === 'both' ? 0.5 : 0
            }}
          >
            工具
          </Typography>
        )}
      </Box>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '80vh'
          }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          pb: 1
        }}>
          <BuildIcon sx={{ color: '#10b981' }} />
          MCP 工具服务器
          {hasActiveServers && (
            <Chip
              label={`${activeServers.length} 个运行中`}
              size="small"
              color="success"
              variant="outlined"
            />
          )}
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          {servers.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <BuildIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                还没有配置 MCP 服务器
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                MCP 服务器可以为 AI 提供额外的工具和功能
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleNavigateToSettings}
                sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
              >
                添加服务器
              </Button>
            </Box>
          ) : (
            <>
              <List sx={{ py: 0 }}>
                {servers.map((server, index) => (
                  <React.Fragment key={server.id}>
                    <ListItem sx={{ py: 2 }}>
                      <ListItemIcon>
                        <Avatar
                          sx={{
                            bgcolor: alpha(getServerTypeColor(server.type), 0.1),
                            color: getServerTypeColor(server.type),
                            width: 32,
                            height: 32
                          }}
                        >
                          {getServerTypeIcon(server.type)}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {server.name}
                            </Typography>
                            {server.isActive && (
                              <Chip
                                label="运行中"
                                size="small"
                                color="success"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box component="div">
                            {server.description && (
                              <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block' }}>
                                {server.description}
                              </Typography>
                            )}
                            {server.baseUrl && (
                              <Typography variant="caption" color="text.secondary" component="span" sx={{ display: 'block' }}>
                                {server.baseUrl}
                              </Typography>
                            )}
                          </Box>
                        }
                        secondaryTypographyProps={{ component: 'div' }}
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={server.isActive}
                          onChange={(e) => handleToggleServer(server.id, e.target.checked)}
                          color="primary"
                          size="small"
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < servers.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>

              <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<SettingsIcon />}
                  onClick={handleNavigateToSettings}
                  size="small"
                >
                  管理 MCP 服务器
                </Button>
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MCPToolsButton;
