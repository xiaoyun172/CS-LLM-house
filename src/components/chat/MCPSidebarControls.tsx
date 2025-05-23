import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Chip,
  Avatar,
  alpha,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio
} from '@mui/material';
import {
  Extension as ExtensionIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Cloud as CloudIcon,
  Storage as StorageIcon,
  Http as HttpIcon,
  Psychology as PsychologyIcon,
  Code as CodeIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { MCPServer, MCPServerType } from '../../shared/types';
import { mcpService } from '../../shared/services/MCPService';

interface MCPSidebarControlsProps {
  onMCPModeChange?: (mode: 'prompt' | 'function') => void;
  mcpMode?: 'prompt' | 'function';
  onToolsToggle?: (enabled: boolean) => void;
  toolsEnabled?: boolean;
}

const MCPSidebarControls: React.FC<MCPSidebarControlsProps> = ({
  onMCPModeChange,
  mcpMode = 'function',
  onToolsToggle,
  toolsEnabled = true
}) => {
  const navigate = useNavigate();
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

  const handleToggleServer = async (serverId: string, isActive: boolean) => {
    try {
      await mcpService.toggleServer(serverId, isActive);
      loadServers();
    } catch (error) {
      console.error('切换服务器状态失败:', error);
    }
  };

  const handleModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const mode = event.target.value as 'prompt' | 'function';
    onMCPModeChange?.(mode);
  };

  const handleNavigateToSettings = () => {
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
    <Box sx={{ p: 2 }}>
      {/* MCP 工具总开关 */}
      <Box sx={{ mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={toolsEnabled}
              onChange={(e) => onToolsToggle?.(e.target.checked)}
              color="primary"
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ExtensionIcon sx={{ color: '#10b981' }} />
              <Typography variant="subtitle2" fontWeight={600}>
                MCP 工具
              </Typography>
              {hasActiveServers && (
                <Chip
                  label={activeServers.length}
                  size="small"
                  color="success"
                  variant="outlined"
                />
              )}
            </Box>
          }
        />
      </Box>

      {toolsEnabled && (
        <>
          <Divider sx={{ mb: 2 }} />

          {/* 工具调用模式选择 */}
          <Box sx={{ mb: 2 }}>
            <FormControl component="fieldset">
              <FormLabel component="legend" sx={{ fontSize: '0.875rem', fontWeight: 600, mb: 1 }}>
                工具调用模式
              </FormLabel>
              <RadioGroup
                value={mcpMode}
                onChange={handleModeChange}
                sx={{ gap: 0.5 }}
              >
                <FormControlLabel
                  value="function"
                  control={<Radio size="small" />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CodeIcon sx={{ fontSize: 16 }} />
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          函数调用
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          模型自动调用工具（推荐）
                        </Typography>
                      </Box>
                    </Box>
                  }
                  sx={{
                    m: 0,
                    p: 1,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: mcpMode === 'function' ? 'primary.main' : 'divider',
                    bgcolor: mcpMode === 'function' ? alpha('#1976d2', 0.05) : 'transparent'
                  }}
                />
                <FormControlLabel
                  value="prompt"
                  control={<Radio size="small" />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PsychologyIcon sx={{ fontSize: 16 }} />
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          提示词注入
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          通过提示词指导 AI 使用工具
                        </Typography>
                      </Box>
                    </Box>
                  }
                  sx={{
                    m: 0,
                    p: 1,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: mcpMode === 'prompt' ? 'primary.main' : 'divider',
                    bgcolor: mcpMode === 'prompt' ? alpha('#1976d2', 0.05) : 'transparent'
                  }}
                />
              </RadioGroup>
            </FormControl>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* MCP 服务器列表 */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2" fontWeight={600}>
                MCP 服务器 ({servers.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              {servers.length === 0 ? (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    还没有配置 MCP 服务器
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleNavigateToSettings}
                    startIcon={<SettingsIcon />}
                  >
                    添加服务器
                  </Button>
                </Box>
              ) : (
                <List dense sx={{ py: 0 }}>
                  {servers.map((server) => (
                    <ListItem key={server.id} sx={{ px: 1, py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Avatar
                          sx={{
                            bgcolor: alpha(getServerTypeColor(server.type), 0.1),
                            color: getServerTypeColor(server.type),
                            width: 24,
                            height: 24
                          }}
                        >
                          {getServerTypeIcon(server.type)}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontWeight={500}>
                            {server.name}
                          </Typography>
                        }
                        secondary={
                          server.description && (
                            <Typography variant="caption" color="text.secondary">
                              {server.description}
                            </Typography>
                          )
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
                  ))}
                </List>
              )}

              {servers.length > 0 && (
                <Box sx={{ p: 1 }}>
                  <Button
                    fullWidth
                    size="small"
                    variant="text"
                    onClick={handleNavigateToSettings}
                    startIcon={<SettingsIcon />}
                  >
                    管理服务器
                  </Button>
                </Box>
              )}
            </AccordionDetails>
          </Accordion>
        </>
      )}
    </Box>
  );
};

export default MCPSidebarControls;
