import React, { useState, useEffect } from 'react';
import {
  IconButton,
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
  Divider
} from '@mui/material';
import {
  Extension as ExtensionIcon,
  Settings as SettingsIcon,
  Cloud as CloudIcon,
  Storage as StorageIcon,
  Http as HttpIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { MCPServer, MCPServerType } from '../../shared/types';
import { mcpService } from '../../shared/services/MCPService';

interface MCPToolsButtonProps {
  onMCPToggle?: (enabled: boolean) => void;
  mcpEnabled?: boolean;
}

const MCPToolsButton: React.FC<MCPToolsButtonProps> = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [activeServers, setActiveServers] = useState<MCPServer[]>([]);

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
      <IconButton
        onClick={handleOpen}
        size="small"
        sx={{
          color: hasActiveServers ? '#10b981' : 'text.secondary',
          bgcolor: hasActiveServers ? alpha('#10b981', 0.1) : 'transparent',
          '&:hover': {
            bgcolor: hasActiveServers ? alpha('#10b981', 0.2) : alpha('#000', 0.04)
          }
        }}
        title="MCP 工具"
      >
        <ExtensionIcon />
      </IconButton>

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
          <ExtensionIcon sx={{ color: '#10b981' }} />
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
              <ExtensionIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
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
                          <Box>
                            {server.description && (
                              <Typography variant="body2" color="text.secondary">
                                {server.description}
                              </Typography>
                            )}
                            {server.baseUrl && (
                              <Typography variant="caption" color="text.secondary">
                                {server.baseUrl}
                              </Typography>
                            )}
                          </Box>
                        }
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
