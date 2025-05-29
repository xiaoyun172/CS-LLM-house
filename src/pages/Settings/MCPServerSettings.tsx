import React, { useState, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,

  Switch,
  Fab,
  Chip,
  Avatar,
  alpha,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import SettingsIcon from '@mui/icons-material/Settings';
import CloudIcon from '@mui/icons-material/Cloud';
import StorageIcon from '@mui/icons-material/Storage';
import HttpIcon from '@mui/icons-material/Http';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { MCPServer, MCPServerType } from '../../shared/types';
import { mcpService } from '../../shared/services/MCPService';

const MCPServerSettings: React.FC = () => {
  const navigate = useNavigate();
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [builtinDialogOpen, setBuiltinDialogOpen] = useState(false);
  const [builtinServers, setBuiltinServers] = useState<MCPServer[]>([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // 新服务器表单状态
  const [newServer, setNewServer] = useState<Partial<MCPServer>>({
    name: '',
    type: 'sse',
    description: '',
    baseUrl: '',
    isActive: false
  });

  useEffect(() => {
    loadServers();
    loadBuiltinServers();
  }, []);

  const loadServers = () => {
    const serverList = mcpService.getServers();
    setServers(serverList);
  };

  const loadBuiltinServers = () => {
    try {
      const builtinList = mcpService.getBuiltinServers();
      setBuiltinServers(builtinList);
    } catch (error) {
      console.error('加载内置服务器失败:', error);
    }
  };

  const handleBack = () => {
    navigate('/settings');
  };

  const handleToggleServer = async (serverId: string, isActive: boolean) => {
    try {
      await mcpService.toggleServer(serverId, isActive);
      loadServers();
      setSnackbar({
        open: true,
        message: isActive ? '服务器已启用' : '服务器已停用',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: '操作失败',
        severity: 'error'
      });
    }
  };

  const handleAddServer = async () => {
    if (!newServer.name || !newServer.type) {
      setSnackbar({
        open: true,
        message: '请填写必要信息',
        severity: 'error'
      });
      return;
    }

    if ((newServer.type === 'sse' || newServer.type === 'streamableHttp') && !newServer.baseUrl) {
      setSnackbar({
        open: true,
        message: '网络类型服务器需要提供 URL',
        severity: 'error'
      });
      return;
    }

    try {
      const server: MCPServer = {
        id: Date.now().toString(),
        name: newServer.name!,
        type: newServer.type!,
        description: newServer.description,
        baseUrl: newServer.baseUrl,
        isActive: false,
        headers: {},
        env: {},
        args: []
      };

      await mcpService.addServer(server);
      loadServers();
      setAddDialogOpen(false);
      setNewServer({
        name: '',
        type: 'sse',
        description: '',
        baseUrl: '',
        isActive: false
      });
      setSnackbar({
        open: true,
        message: '服务器添加成功',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: '添加失败',
        severity: 'error'
      });
    }
  };

  const handleAddBuiltinServer = async (builtinServer: MCPServer) => {
    try {
      await mcpService.addBuiltinServer(builtinServer.name, {
        description: builtinServer.description,
        env: builtinServer.env,
        args: builtinServer.args,
        tags: builtinServer.tags,
        provider: builtinServer.provider
      });

      loadServers();
      setBuiltinDialogOpen(false);
      setSnackbar({
        open: true,
        message: `内置服务器 ${builtinServer.name} 添加成功`,
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: '添加内置服务器失败',
        severity: 'error'
      });
    }
  };

  const handleEditServer = (server: MCPServer) => {
    navigate(`/settings/mcp-server/${server.id}`, { state: { server } });
  };

  const handleDeleteServer = async (serverId: string) => {
    if (window.confirm('确定要删除这个服务器吗？')) {
      try {
        await mcpService.removeServer(serverId);
        loadServers();
        setSnackbar({
          open: true,
          message: '服务器已删除',
          severity: 'success'
        });
      } catch (error) {
        setSnackbar({
          open: true,
          message: '删除失败',
          severity: 'error'
        });
      }
    }
  };

  const handleImportJson = async () => {
    try {
      const config = JSON.parse(importJson);

      if (!config.mcpServers || typeof config.mcpServers !== 'object') {
        throw new Error('JSON 格式不正确：缺少 mcpServers 字段');
      }

      let importCount = 0;
      const errors: string[] = [];

      for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
        try {
          const server: MCPServer = {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
            name: serverName,
            type: (serverConfig as any).type || 'sse',
            baseUrl: (serverConfig as any).url,
            description: `从 JSON 导入的服务器: ${serverName}`,
            isActive: false,
            headers: {},
            env: {},
            args: []
          };

          await mcpService.addServer(server);
          importCount++;
        } catch (error) {
          errors.push(`${serverName}: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }

      loadServers();
      setImportDialogOpen(false);
      setImportJson('');

      if (importCount > 0) {
        setSnackbar({
          open: true,
          message: `成功导入 ${importCount} 个服务器${errors.length > 0 ? `，${errors.length} 个失败` : ''}`,
          severity: errors.length > 0 ? 'error' : 'success'
        });
      } else {
        setSnackbar({
          open: true,
          message: '导入失败：' + errors.join('; '),
          severity: 'error'
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: `JSON 解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
        severity: 'error'
      });
    }
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

  const getServerTypeLabel = (type: MCPServerType) => {
    switch (type) {
      case 'sse':
        return 'SSE';
      case 'streamableHttp':
        return 'HTTP 流';
      case 'inMemory':
        return '内存';
      default:
        return '未知';
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

  return (
    <Box sx={{
      flexGrow: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      bgcolor: 'background.default'
    }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={handleBack}
            aria-label="back"
            sx={{ color: 'primary.main' }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 1,
              fontWeight: 600,
              backgroundImage: 'linear-gradient(90deg, #10b981, #059669)',
              backgroundClip: 'text',
              color: 'transparent'
            }}
          >
            MCP 服务器
          </Typography>
          {servers.length > 0 && (
            <>
              <Button
                variant="outlined"
                onClick={() => setImportDialogOpen(true)}
                sx={{
                  borderColor: '#10b981',
                  color: '#10b981',
                  '&:hover': { borderColor: '#059669', color: '#059669' },
                  mr: 1
                }}
              >
                导入配置
              </Button>
              <Button
                variant="outlined"
                onClick={() => setBuiltinDialogOpen(true)}
                sx={{
                  borderColor: '#10b981',
                  color: '#10b981',
                  '&:hover': { borderColor: '#059669', color: '#059669' },
                  mr: 1
                }}
              >
                内置服务器
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          mt: 8,
          px: 2,
          py: 2
        }}
      >
        {servers.length === 0 ? (
          <Paper
            sx={{
              p: 4,
              textAlign: 'center',
              bgcolor: alpha('#10b981', 0.05),
              border: '1px dashed',
              borderColor: alpha('#10b981', 0.3)
            }}
          >
            <SettingsIcon sx={{ fontSize: 48, color: '#10b981', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              还没有配置 MCP 服务器
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              MCP 服务器可以为 AI 提供额外的工具和功能
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAddDialogOpen(true)}
                sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
              >
                添加服务器
              </Button>
              <Button
                variant="outlined"
                onClick={() => setImportDialogOpen(true)}
                sx={{ borderColor: '#10b981', color: '#10b981', '&:hover': { borderColor: '#059669', color: '#059669' } }}
              >
                导入配置
              </Button>
              <Button
                variant="outlined"
                onClick={() => setBuiltinDialogOpen(true)}
                sx={{ borderColor: '#10b981', color: '#10b981', '&:hover': { borderColor: '#059669', color: '#059669' } }}
              >
                内置服务器
              </Button>
            </Box>
          </Paper>
        ) : (
          <List sx={{ p: 0 }}>
            {servers.map((server) => (
              <Paper
                key={server.id}
                sx={{
                  mb: 2,
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    boxShadow: 2
                  }
                }}
              >
                <ListItem
                  sx={{
                    py: 2,
                    px: 3
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: alpha(getServerTypeColor(server.type), 0.1),
                      color: getServerTypeColor(server.type),
                      mr: 2
                    }}
                  >
                    {getServerTypeIcon(server.type)}
                  </Avatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {server.name}
                        </Typography>
                        <Chip
                          label={getServerTypeLabel(server.type)}
                          size="small"
                          sx={{
                            bgcolor: alpha(getServerTypeColor(server.type), 0.1),
                            color: getServerTypeColor(server.type),
                            fontWeight: 500
                          }}
                        />
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
                          <Typography variant="body2" color="text.secondary" component="div">
                            {server.description}
                          </Typography>
                        )}
                        {server.baseUrl && (
                          <Typography variant="caption" color="text.secondary" component="div">
                            {server.baseUrl}
                          </Typography>
                        )}
                      </Box>
                    }
                    secondaryTypographyProps={{ component: 'div' }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
                    <IconButton
                      onClick={() => handleEditServer(server)}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDeleteServer(server.id)}
                      size="small"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                    <Switch
                      checked={server.isActive}
                      onChange={(e) => handleToggleServer(server.id, e.target.checked)}
                      color="primary"
                    />
                  </Box>
                </ListItem>
              </Paper>
            ))}
          </List>
        )}
      </Box>

      <Fab
        color="primary"
        aria-label="add"
        onClick={() => setAddDialogOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          bgcolor: '#10b981',
          '&:hover': { bgcolor: '#059669' }
        }}
      >
        <AddIcon />
      </Fab>

      {/* 添加服务器对话框 */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>添加 MCP 服务器</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="服务器名称"
            fullWidth
            variant="outlined"
            value={newServer.name}
            onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>服务器类型</InputLabel>
            <Select
              value={newServer.type}
              label="服务器类型"
              onChange={(e) => setNewServer({ ...newServer, type: e.target.value as MCPServerType })}
            >
              <MenuItem value="sse">SSE (Server-Sent Events)</MenuItem>
              <MenuItem value="streamableHttp">HTTP 流式传输</MenuItem>
              <MenuItem value="inMemory">内存服务器</MenuItem>
            </Select>
          </FormControl>
          {(newServer.type === 'sse' || newServer.type === 'streamableHttp') && (
            <TextField
              margin="dense"
              label="服务器 URL"
              fullWidth
              variant="outlined"
              value={newServer.baseUrl}
              onChange={(e) => setNewServer({ ...newServer, baseUrl: e.target.value })}
              placeholder="https://example.com/mcp"
              sx={{ mb: 2 }}
            />
          )}
          <TextField
            margin="dense"
            label="描述（可选）"
            fullWidth
            variant="outlined"
            multiline
            rows={2}
            value={newServer.description}
            onChange={(e) => setNewServer({ ...newServer, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>取消</Button>
          <Button onClick={handleAddServer} variant="contained">添加</Button>
        </DialogActions>
      </Dialog>

      {/* JSON 导入对话框 */}
      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>导入 MCP 服务器配置</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            粘贴包含 MCP 服务器配置的 JSON 文件内容。支持的格式示例：
          </Typography>
          <Box
            sx={{
              bgcolor: 'grey.100',
              p: 2,
              borderRadius: 1,
              mb: 2,
              fontFamily: 'monospace',
              fontSize: '0.875rem'
            }}
          >
            {`{
  "mcpServers": {
    "fetch": {
      "type": "sse",
      "url": "https://mcp.api-inference.modelscope.cn/sse/89261d74d6814a"
    },
    "memory": {
      "type": "streamableHttp",
      "url": "https://example.com/mcp/memory"
    }
  }
}`}
          </Box>
          <TextField
            autoFocus
            margin="dense"
            label="JSON 配置"
            fullWidth
            multiline
            rows={10}
            variant="outlined"
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            placeholder="在此粘贴 JSON 配置..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>取消</Button>
          <Button
            onClick={handleImportJson}
            variant="contained"
            disabled={!importJson.trim()}
          >
            导入
          </Button>
        </DialogActions>
      </Dialog>

      {/* 内置服务器对话框 */}
      <Dialog
        open={builtinDialogOpen}
        onClose={() => setBuiltinDialogOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={window.innerWidth < 600}
        sx={{
          '& .MuiDialog-paper': {
            maxHeight: { xs: '100vh', sm: '90vh' },
            margin: { xs: 0, sm: 2 },
            borderRadius: { xs: 0, sm: 2 }
          }
        }}
      >
        <DialogTitle sx={{
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 2.5 },
          fontSize: { xs: '1.25rem', sm: '1.5rem' },
          fontWeight: 600,
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}>
          添加内置 MCP 服务器
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 } }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: { xs: 2, sm: 3 },
              fontSize: { xs: '0.875rem', sm: '0.875rem' },
              lineHeight: 1.5
            }}
          >
            选择要添加的内置 MCP 服务器。这些服务器由 Cherry Studio 提供，无需额外配置即可使用。
          </Typography>
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 1.5, sm: 2 },
            maxHeight: { xs: '60vh', sm: '70vh', md: '80vh' },
            overflow: 'auto',
            pr: { xs: 0.5, sm: 1 }
          }}>
            {builtinServers.map((builtinServer) => (
              <Paper
                key={builtinServer.id}
                elevation={1}
                sx={{
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: { xs: 2, sm: 1 },
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    boxShadow: { xs: 2, sm: 3 },
                    borderColor: 'primary.main'
                  }
                }}
              >
                <Box
                  sx={{
                    p: { xs: 2, sm: 2.5, md: 3 },
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: { xs: 2, sm: 3 }
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    {/* 服务器名称和标签 */}
                    <Box sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: { xs: 1, sm: 1.5 },
                      mb: { xs: 1, sm: 1.5 },
                      flexWrap: 'wrap'
                    }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight={600}
                        sx={{
                          fontSize: { xs: '1rem', sm: '1.1rem' },
                          color: 'text.primary',
                          wordBreak: 'break-word'
                        }}
                      >
                        {builtinServer.name}
                      </Typography>
                      {builtinServer.tags && builtinServer.tags.map((tag) => (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          variant="outlined"
                          sx={{
                            fontSize: { xs: '0.7rem', sm: '0.75rem' },
                            height: { xs: 20, sm: 24 },
                            '& .MuiChip-label': {
                              px: { xs: 1, sm: 1.5 }
                            }
                          }}
                        />
                      ))}
                    </Box>
                    
                    {/* 描述 */}
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: { xs: 0.5, sm: 1 },
                        fontSize: { xs: '0.875rem', sm: '0.875rem' },
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: { xs: 3, sm: 2 },
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {builtinServer.description}
                    </Typography>
                    
                    {/* 提供者信息 */}
                    {builtinServer.provider && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          fontSize: { xs: '0.75rem', sm: '0.75rem' },
                          opacity: 0.8
                        }}
                      >
                        提供者: {builtinServer.provider}
                      </Typography>
                    )}
                  </Box>
                  
                  {/* 添加按钮 */}
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    flexShrink: 0
                  }}>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddBuiltinServer(builtinServer);
                      }}
                      color="primary"
                      size={window.innerWidth < 600 ? 'small' : 'medium'}
                      sx={{
                        bgcolor: alpha('#10b981', 0.1),
                        border: '1px solid',
                        borderColor: alpha('#10b981', 0.3),
                        '&:hover': {
                          bgcolor: alpha('#10b981', 0.2),
                          borderColor: '#10b981'
                        },
                        width: { xs: 36, sm: 40 },
                        height: { xs: 36, sm: 40 }
                      }}
                    >
                      <AddIcon sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
                    </IconButton>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 2.5 },
          borderTop: '1px solid',
          borderColor: 'divider',
          gap: { xs: 1, sm: 2 }
        }}>
          <Button
            onClick={() => setBuiltinDialogOpen(false)}
            variant="outlined"
            fullWidth={window.innerWidth < 600}
            sx={{
              minHeight: { xs: 44, sm: 36 },
              fontSize: { xs: '1rem', sm: '0.875rem' }
            }}
          >
            关闭
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MCPServerSettings;
