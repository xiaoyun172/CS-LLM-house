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
import {
  animationOptimization,
  createOptimizedClickHandler,
  createOptimizedSwitchHandler,
  listItemOptimization,
  switchOptimization
} from '../TopicManagement/SettingsTab/scrollOptimization';

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
        onClick={createOptimizedClickHandler(() => setExpanded(!expanded))}
        sx={{
          px: 2,
          py: 0.75,
          cursor: 'pointer',
          position: 'relative',
          zIndex: 1,
          // 优化触摸响应
          touchAction: 'manipulation', // 防止双击缩放，优化触摸响应
          userSelect: 'none', // 防止文本选择
          // 移动端优化
          '@media (hover: none)': {
            '&:active': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              transform: 'scale(0.98)', // 轻微缩放反馈
              transition: 'all 0.1s ease-out'
            }
          },
          // 桌面端优化
          '@media (hover: hover)': {
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
              transform: 'none !important',
              boxShadow: 'none !important'
            },
            '&:focus': {
              backgroundColor: 'transparent !important'
            },
            '&:active': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)'
            }
          },
          '& *': {
            pointerEvents: 'none', // 防止子元素干扰点击
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
        timeout={animationOptimization.timeout}
        easing={animationOptimization.easing}
        unmountOnExit
        sx={animationOptimization.sx}
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
              <Accordion
                defaultExpanded
                sx={{
                  // 优化Accordion性能
                  '& .MuiAccordion-root': {
                    boxShadow: 'none',
                    '&:before': {
                      display: 'none',
                    }
                  },
                  '& .MuiAccordionSummary-root': {
                    minHeight: 'auto',
                    padding: '8px 0',
                    touchAction: 'manipulation', // 优化触摸响应
                    userSelect: 'none',
                  },
                  '& .MuiAccordionDetails-root': {
                    padding: 0,
                    contain: 'layout style paint', // 优化渲染性能
                  }
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  onClick={(e) => e.stopPropagation()} // 防止事件冒泡
                >
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
                        <ListItem
                          key={server.id}
                          sx={{
                            px: 1,
                            py: 0.5,
                            ...listItemOptimization,
                          }}
                        >
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
                              onChange={createOptimizedSwitchHandler((checked) =>
                                handleToggleServer(server.id, checked)
                              )}
                              color="primary"
                              size="small"
                              sx={switchOptimization}
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
