import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import type { LogItem } from '../shared/services/LoggerService';
import { globalLogs, clearAllLogs } from '../shared/services/LoggerService';

// 开发者工具页面
const DevToolsPage: React.FC = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [filter, setFilter] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // 添加日志
  const addLog = (log: LogItem) => {
    setLogs(prevLogs => [...prevLogs, log]);
  };

  // 打开清除日志确认对话框
  const handleClearLogsClick = () => {
    setClearDialogOpen(true);
  };

  // 关闭清除日志确认对话框
  const handleClearDialogClose = () => {
    setClearDialogOpen(false);
  };

  // 清除日志
  const clearLogs = () => {
    // 清空全局日志
    clearAllLogs();

    // 清空组件状态
    setLogs([]);

    // 添加一条清空日志的记录
    console.info('[开发者工具] 日志已清空');

    // 关闭对话框
    setClearDialogOpen(false);
  };

  // 加载日志
  useEffect(() => {
    // 加载全局日志
    setLogs([...globalLogs]);

    // 添加一条初始日志
    addLog({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type: 'info',
      content: '开发者工具已启动',
    });

    // 触发一些测试日志
    console.log('[开发者工具] 测试日志');
    console.info('[开发者工具] 测试信息');
    console.warn('[开发者工具] 测试警告');
    console.error('[开发者工具] 测试错误');

    // 定期刷新日志
    const intervalId = setInterval(() => {
      setLogs([...globalLogs]);
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // 处理标签页变化
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // 处理返回
  const handleBack = () => {
    navigate(-1);
  };

  // 过滤日志
  const filteredLogs = logs.filter(log =>
    log.content.toLowerCase().includes(filter.toLowerCase()) ||
    log.type.toLowerCase().includes(filter.toLowerCase())
  );

  // 获取日志类型的颜色
  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'error':
        return '#f44336';
      case 'warn':
        return '#ff9800';
      case 'info':
        return '#2196f3';
      case 'api-request':
        return '#9c27b0';
      case 'api-response':
        return '#4caf50';
      default:
        return 'inherit';
    }
  };

  return (
    <Box sx={{ flexGrow: 1, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static">
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
            开发者工具
          </Typography>
          <Button
            color="inherit"
            startIcon={<DeleteIcon />}
            onClick={handleClearLogsClick}
          >
            清除
          </Button>
        </Toolbar>
      </AppBar>

      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        aria-label="dev tools tabs"
        variant="fullWidth"
      >
        <Tab label="控制台" id="tab-0" />
        <Tab label="网络" id="tab-1" />
        <Tab label="设置" id="tab-2" />
      </Tabs>

      <Box sx={{ p: 1, display: 'flex', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="过滤日志..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          sx={{ flexGrow: 1, mr: 1 }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              size="small"
            />
          }
          label="自动滚动"
          sx={{ ml: 1 }}
        />
      </Box>

      <Paper
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          bgcolor: '#f5f5f5',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: '4px',
          },
        }}
      >
        {tabValue === 0 && (
          <List dense sx={{ p: 0 }}>
            {filteredLogs.map((log, index) => (
              <React.Fragment key={log.id}>
                <ListItem
                  sx={{
                    py: 0.5,
                    bgcolor: index % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent',
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', mr: 1 }}>
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: getLogTypeColor(log.type),
                            fontWeight: 'bold',
                            mr: 1,
                            textTransform: 'uppercase',
                          }}
                        >
                          [{log.type}]
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography
                        variant="body2"
                        sx={{
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          fontFamily: 'monospace',
                          fontSize: '0.85rem',
                        }}
                      >
                        {log.content}
                      </Typography>
                    }
                  />
                </ListItem>
                {index < filteredLogs.length - 1 && <Divider />}
              </React.Fragment>
            ))}
            <div ref={logsEndRef} />
          </List>
        )}

        {tabValue === 1 && (
          <Box sx={{ p: 2 }}>
            <Typography>网络请求监控（开发中）</Typography>
          </Box>
        )}

        {tabValue === 2 && (
          <Box sx={{ p: 2 }}>
            <Typography>开发者工具设置（开发中）</Typography>
          </Box>
        )}
      </Paper>

      {/* 清除日志确认对话框 */}
      <Dialog
        open={clearDialogOpen}
        onClose={handleClearDialogClose}
        aria-labelledby="clear-logs-dialog-title"
        aria-describedby="clear-logs-dialog-description"
      >
        <DialogTitle id="clear-logs-dialog-title">
          确认清除日志
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="clear-logs-dialog-description">
            确定要清除所有日志吗？此操作无法撤销。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClearDialogClose} color="primary">
            取消
          </Button>
          <Button onClick={clearLogs} color="error" autoFocus>
            清除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DevToolsPage;
