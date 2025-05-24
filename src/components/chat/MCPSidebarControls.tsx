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
  Radio,
  Collapse,
  IconButton
} from '@mui/material';
import {
  ExtensionOutlined as ExtensionOutlinedIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  SettingsOutlined as SettingsOutlinedIcon,
  CloudOutlined as CloudOutlinedIcon,
  StorageOutlined as StorageOutlinedIcon,
  HttpOutlined as HttpOutlinedIcon,
  PsychologyOutlined as PsychologyOutlinedIcon,
  CodeOutlined as CodeOutlinedIcon
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
  const [expanded, setExpanded] = useState(false);

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
        return <CloudOutlinedIcon />;
      case 'streamableHttp':
        return <HttpOutlinedIcon />;
      case 'inMemory':
        return <StorageOutlinedIcon />;
      default:
        return <SettingsOutlinedIcon />;
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
    <Box>
      {/* 可折叠的MCP标题栏 */}
      <ListItem
        component="div"
        onClick={() => setExpanded(!expanded)}
        sx={{
          px: 2,
          py: 0.75,
          cursor: 'pointer',
          position: 'relative',
          zIndex: 1,
          '&:hover': {
            backgroundColor: 'transparent !important',
            transform: 'none !important',
            boxShadow: 'none !important'
          },
          '&:focus': {
            backgroundColor: 'transparent !important'
          },
          '&:active': {
            backgroundColor: 'rgba(0, 0, 0, 0.02)'
          },
          '& *': {
            '&:hover': {
              backgroundColor: 'transparent !important',
              transform: 'none !important'
            }
          }
        }}
      >
        <ExtensionOutlinedIcon sx={{ mr: 1.5, color: 'primary.main' }} />
        <ListItemText
          primary="MCP 工具"
          secondary={
            hasActiveServers
              ? `${activeServers.length} 个服务器运行中 | 模式: ${mcpMode === 'function' ? '函数调用' : '提示词注入'}`
              : `模式: ${mcpMode === 'function' ? '函数调用' : '提示词注入'}`
          }
          primaryTypographyProps={{
            fontWeight: 'medium',
            sx: { mt: 1, mb: 0.25 }
          }}
          secondaryTypographyProps={{
            fontSize: '0.75rem',
            sx: { mt: 0.5, mb: 0.5 }
          }}
        />
        <ListItemSecondaryAction sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {hasActiveServers && (
            <Chip
              label={activeServers.length}
              size="small"
              color="success"
              variant="outlined"
              sx={{ mr: 1 }}
            />
          )}
          <IconButton edge="end" size="small" sx={{ padding: '4px' }}>
            {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </ListItemSecondaryAction>
      </ListItem>

      {/* 可折叠的内容区域 */}
      <Collapse
        in={expanded}
        timeout={{ enter: 300, exit: 200 }}
        easing={{ enter: 'cubic-bezier(0.4, 0, 0.2, 1)', exit: 'cubic-bezier(0.4, 0, 0.6, 1)' }}
        unmountOnExit
      >
        <Box sx={{ px: 2, pb: 2 }}>
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
                  <Typography variant="body2" fontWeight={600}>
                    启用 MCP 工具
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
                          <CodeOutlinedIcon sx={{ fontSize: 16 }} />
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
                          <PsychologyOutlinedIcon sx={{ fontSize: 16 }} />
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
                        startIcon={<SettingsOutlinedIcon />}
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
                        startIcon={<SettingsOutlinedIcon />}
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
      </Collapse>
    </Box>
  );
};

export default MCPSidebarControls;
