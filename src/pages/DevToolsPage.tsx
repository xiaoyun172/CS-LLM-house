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
  useTheme,
  Checkbox,
  Tooltip,

} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import ClearIcon from '@mui/icons-material/Clear';

import { useNavigate } from 'react-router-dom';
import LoggerService from '../shared/services/LoggerService';
import RequestInterceptorService from '../shared/services/RequestInterceptorService';
import { Clipboard } from '@capacitor/clipboard';


// 定义新的日志项类型
interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
}



// 开发者工具页面
const DevToolsPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [tabValue, setTabValue] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const [filter, setFilter] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // 多选功能相关状态
  const [selectMode, setSelectMode] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());



  // 添加日志
  const addLog = (log: LogEntry) => {
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
    // 清空日志
    LoggerService.clearLogs();

    // 清空组件状态
    setLogs([]);

    // 添加一条清空日志的记录
    LoggerService.log('INFO', '[开发者工具] 日志已清空');

    // 关闭对话框
    setClearDialogOpen(false);
  };

  // 加载数据
  useEffect(() => {
    // 初始化请求拦截器
    RequestInterceptorService.setupRequestInterceptors();

    // 加载已存储的日志
    const storedLogs = LoggerService.getRecentLogs();
    setLogs(storedLogs);

    // 添加一条初始日志
    const initLog: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: '开发者工具已启动',
    };
    addLog(initLog);

    // 现代WebView管理系统在后台自动运行，无需前端调用

    // 定期刷新日志和网络请求
    const intervalId = setInterval(() => {
      const updatedLogs = LoggerService.getRecentLogs();
      setLogs(updatedLogs);

      // 获取网络请求记录
      RequestInterceptorService.getAllRequests();
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);



  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && tabValue === 0 && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll, tabValue]);

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
    log.message.toLowerCase().includes(filter.toLowerCase()) ||
    log.level.toLowerCase().includes(filter.toLowerCase())
  );

  // 获取日志级别的颜色
  const getLogLevelColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR':
        return isDarkMode ? '#ff6b6b' : '#f44336';
      case 'WARN':
        return isDarkMode ? '#ffc078' : '#ff9800';
      case 'INFO':
        return isDarkMode ? '#74c0fc' : '#2196f3';
      case 'DEBUG':
        return isDarkMode ? '#63e6be' : '#4caf50';
      default:
        return 'inherit';
    }
  };



  // 格式化JSON显示
  const formatJSON = (jsonString: string) => {
    try {
      const obj = JSON.parse(jsonString);
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      return jsonString;
    }
  };

  // 切换选择模式
  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    if (selectMode) {
      // 退出选择模式时清空选择
      setSelectedLogs(new Set());
    }
  };

  // 处理日志选择
  const handleLogSelect = (timestamp: string) => {
    const newSelected = new Set(selectedLogs);
    if (newSelected.has(timestamp)) {
      newSelected.delete(timestamp);
    } else {
      newSelected.add(timestamp);
    }
    setSelectedLogs(newSelected);
  };

  // 全选
  const selectAll = () => {
    const newSelected = new Set<string>();
    filteredLogs.forEach(log => {
      newSelected.add(log.timestamp);
    });
    setSelectedLogs(newSelected);
  };

  // 取消全选
  const clearSelection = () => {
    setSelectedLogs(new Set());
  };



  // 复制选中的日志
  const copySelectedLogs = () => {
    const selectedLogEntries = filteredLogs.filter(log => selectedLogs.has(log.timestamp));

    if (selectedLogEntries.length === 0) return;

    const textToCopy = selectedLogEntries.map(log => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      return `[${time}][${log.level}] ${log.message}${log.data ? '\n' + JSON.stringify(log.data, null, 2) : ''}`;
    }).join('\n\n');

    // 使用Capacitor的Clipboard插件代替navigator.clipboard
    Clipboard.write({
      string: textToCopy
    }).then(() => {
      // 成功复制后添加一条日志
      LoggerService.log('INFO', `[开发者工具] 已复制 ${selectedLogEntries.length} 条日志到剪贴板`);

      // 可选：复制成功后退出选择模式
      // setSelectMode(false);
      // setSelectedLogs(new Set());
    })
    .catch((err: Error) => {
      LoggerService.log('ERROR', `[开发者工具] 复制日志失败: ${err.message}`);
    });
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

          {/* 多选模式工具栏 */}
          {selectMode ? (
            <>
              <Tooltip title="全选">
                <IconButton color="inherit" onClick={selectAll}>
                  <SelectAllIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="清除选择">
                <IconButton color="inherit" onClick={clearSelection}>
                  <ClearIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="复制选中日志">
                <IconButton
                  color="inherit"
                  onClick={copySelectedLogs}
                  disabled={selectedLogs.size === 0}
                >
                  <ContentCopyIcon />
                </IconButton>
              </Tooltip>
              <Button
                color="inherit"
                onClick={toggleSelectMode}
              >
                退出选择
              </Button>
            </>
          ) : (
            <>
              <Button
                color="inherit"
                startIcon={<ContentCopyIcon />}
                onClick={toggleSelectMode}
              >
                多选
              </Button>
              <Button
                color="inherit"
                startIcon={<DeleteIcon />}
                onClick={handleClearLogsClick}
              >
                清除
              </Button>
            </>
          )}
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
          bgcolor: theme.palette.mode === 'dark' ? theme.palette.background.paper : '#f5f5f5',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
            borderRadius: '4px',
          },
        }}
      >
        {tabValue === 0 && (
          <List dense sx={{ p: 0 }}>
            {filteredLogs.map((log, index) => (
              <React.Fragment key={log.timestamp}>
                <ListItem
                  sx={{
                    py: 0.5,
                    bgcolor: theme.palette.mode === 'dark'
                      ? (index % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent')
                      : (index % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent'),
                    cursor: selectMode ? 'pointer' : 'default',
                    '&:hover': {
                      bgcolor: selectMode
                        ? (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)')
                        : undefined
                    }
                  }}
                  onClick={selectMode ? () => handleLogSelect(log.timestamp) : undefined}
                  secondaryAction={selectMode && (
                    <Checkbox
                      edge="end"
                      checked={selectedLogs.has(log.timestamp)}
                      onChange={() => handleLogSelect(log.timestamp)}
                      slotProps={{ input: { 'aria-labelledby': `log-${log.timestamp}` } }}
                    />
                  )}
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
                            color: getLogLevelColor(log.level),
                            fontWeight: 'bold',
                            mr: 1,
                            textTransform: 'uppercase',
                          }}
                        >
                          [{log.level}]
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
                        {log.message}
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
          <Box sx={{ p: 2, overflowY: 'auto', height: '100%' }}>
            <Typography variant="h6" gutterBottom>网络请求监控</Typography>
            <List>
              {filteredLogs
                .filter(log => log.level === 'DEBUG' || log.level === 'INFO')
                .map((log, index) => (
                  <React.Fragment key={log.timestamp}>
                    <ListItem
                      alignItems="flex-start"
                      sx={{
                        borderLeft: `4px solid ${getLogLevelColor(log.level)}`,
                        pl: 2,
                        backgroundColor: theme.palette.mode === 'dark'
                          ? (log.level === 'INFO' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(156, 39, 176, 0.1)')
                          : (log.level === 'INFO' ? 'rgba(76, 175, 80, 0.05)' : 'rgba(156, 39, 176, 0.05)'),
                        cursor: selectMode ? 'pointer' : 'default',
                        '&:hover': {
                          bgcolor: selectMode
                            ? (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)')
                            : undefined
                        }
                      }}
                      onClick={selectMode ? () => handleLogSelect(log.timestamp) : undefined}
                      secondaryAction={selectMode && (
                        <Checkbox
                          edge="end"
                          checked={selectedLogs.has(log.timestamp)}
                          onChange={() => handleLogSelect(log.timestamp)}
                          slotProps={{ input: { 'aria-labelledby': `log-${log.timestamp}` } }}
                        />
                      )}
                    >
                      <Box sx={{ width: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{ color: getLogLevelColor(log.level) }}
                          >
                            {log.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </Typography>
                        </Box>
                        {log.data && (
                          <Paper
                            variant="outlined"
                            sx={{
                              p: 1,
                              backgroundColor: theme.palette.mode === 'dark'
                                ? 'rgba(255, 255, 255, 0.03)'
                                : 'rgba(0, 0, 0, 0.02)',
                              maxHeight: '300px',
                              overflow: 'auto',
                            }}
                          >
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                              {typeof log.data === 'string' ? formatJSON(log.data) : JSON.stringify(log.data, null, 2)}
                            </pre>
                          </Paper>
                        )}
                        {log.level === 'INFO' && log.data && log.data.reasoning && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="subtitle2" sx={{ color: getLogLevelColor('INFO') }}>
                              思考过程:
                            </Typography>
                            <Paper
                              variant="outlined"
                              sx={{
                                p: 1,
                                backgroundColor: theme.palette.mode === 'dark'
                                  ? 'rgba(33, 150, 243, 0.1)'
                                  : 'rgba(33, 150, 243, 0.05)',
                                maxHeight: '200px',
                                overflow: 'auto',
                              }}
                            >
                              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {log.data.reasoning}
                              </pre>
                            </Paper>
                          </Box>
                        )}
                      </Box>
                    </ListItem>
                    {index < filteredLogs.filter(l => l.level === 'DEBUG' || l.level === 'INFO').length - 1 && <Divider />}
                  </React.Fragment>
                ))}
            </List>
          </Box>
        )}

        {tabValue === 2 && (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              开发者工具设置
            </Typography>
            <Typography variant="body2" color="text.secondary">
              现代WebView内核管理系统已在后台自动运行，无需手动配置。
            </Typography>
            <Typography variant="body2" sx={{ mt: 2 }}>
              系统会自动：
            </Typography>
            <Typography variant="body2" component="ul" sx={{ pl: 2, mt: 1 }}>
              <li>检测WebView版本并选择最佳策略</li>
              <li>在版本过旧时提示升级</li>
              <li>应用性能优化配置</li>
              <li>确保最佳的浏览体验</li>
            </Typography>
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
