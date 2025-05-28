import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Switch,
  TextField,
  FormControlLabel,
  Slider,
  IconButton,
  Divider,
  Button,
  Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAppSelector, useAppDispatch } from '../../shared/store';
import {
  setSearchEnabled,
  setSearchCustomEndpoint,
  setSearchMaxResults,
  setSearchIncludeInConversation
} from '../../shared/store/settingsSlice';
import { searchService } from '../../shared/services/SearchService';
import { alpha } from '@mui/material/styles';

const SearchSettings: React.FC = () => {
  const dispatch = useAppDispatch();
  const searchSettings = useAppSelector(state => state.settings.search);
  
  const [customEndpoint, setCustomEndpoint] = useState<string>('');
  const [endpointError, setEndpointError] = useState<string>('');
  const [testStatus, setTestStatus] = useState<{ success?: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (searchSettings?.customEndpoint) {
      setCustomEndpoint(searchSettings.customEndpoint);
    } else {
      setCustomEndpoint('');
    }
  }, [searchSettings?.customEndpoint]);

  // 启用/禁用搜索功能
  const handleToggleSearch = (enabled: boolean) => {
    dispatch(setSearchEnabled(enabled));
  };

  // 修改最大结果数量
  const handleMaxResultsChange = (_event: Event, newValue: number | number[]) => {
    const value = typeof newValue === 'number' ? newValue : newValue[0];
    dispatch(setSearchMaxResults(value));
  };

  // 更新在对话中包含搜索结果的选项
  const handleIncludeInConversationChange = (include: boolean) => {
    dispatch(setSearchIncludeInConversation(include));
  };

  // 验证URL格式
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  // 保存自定义端点
  const saveCustomEndpoint = () => {
    // 如果为空，则清除自定义端点
    if (!customEndpoint.trim()) {
      dispatch(setSearchCustomEndpoint(undefined));
      setEndpointError('');
      return;
    }

    // 验证URL格式
    if (!isValidUrl(customEndpoint)) {
      setEndpointError('请输入有效的URL');
      return;
    }

    dispatch(setSearchCustomEndpoint(customEndpoint.trim()));
    setEndpointError('');
  };

  // 清除自定义端点
  const clearCustomEndpoint = () => {
    setCustomEndpoint('');
    dispatch(setSearchCustomEndpoint(undefined));
    setEndpointError('');
  };

  // 测试搜索功能
  const testSearchConnection = async () => {
    try {
      setTesting(true);
      setTestStatus(null);
      
      // 临时更新SearchService配置
      const currentConfig = searchService.getConfig();
      if (customEndpoint && isValidUrl(customEndpoint)) {
        searchService.setConfig({ endpoint: customEndpoint });
      }

      // 执行测试查询
      const results = await searchService.search('测试查询', { maxResults: 1 });
      
      // 恢复原始配置
      searchService.setConfig(currentConfig);
      
      setTestStatus({
        success: true,
        message: `连接成功！找到 ${results.length} 条结果。`
      });
    } catch (error) {
      let errorMessage = '连接测试失败';
      if (error instanceof Error) {
        errorMessage = `错误: ${error.message}`;
      }
      
      setTestStatus({
        success: false,
        message: errorMessage
      });
    } finally {
      setTesting(false);
    }
  };

  // 重置为默认端点
  const resetToDefault = () => {
    clearCustomEndpoint();
    searchService.setConfig({ endpoint: 'https://duckduckgo-api.vercel.app/search' });
  };

  if (!searchSettings) {
    return <Typography>加载设置中...</Typography>;
  }

  return (
    <Box sx={{ width: '100%', mb: 4 }}>
      <Typography variant="h6" fontWeight={600} mb={2}>
        网络搜索设置
      </Typography>

      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          mb: 3
        }}
      >
        <FormControlLabel
          control={
            <Switch
              checked={searchSettings.enabled}
              onChange={e => handleToggleSearch(e.target.checked)}
              color="primary"
            />
          }
          label={
            <Typography fontWeight={500}>
              {searchSettings.enabled ? '已启用搜索功能' : '已禁用搜索功能'}
            </Typography>
          }
        />

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
          启用后，AI可以使用网络搜索为回答提供最新信息。搜索基于DuckDuckGo，不需要API密钥。
        </Typography>

        <Divider sx={{ my: 2 }} />

        {searchSettings.enabled && (
          <>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 3, mb: 2 }}>
              搜索结果数量
            </Typography>

            <Box sx={{ px: 2, width: '100%', maxWidth: 400 }}>
              <Slider
                value={searchSettings.maxResults}
                min={1}
                max={10}
                step={1}
                marks
                valueLabelDisplay="auto"
                onChange={handleMaxResultsChange}
                disabled={!searchSettings.enabled}
              />

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="text.secondary">最少 (1)</Typography>
                <Typography variant="caption" color="text.secondary">最多 (10)</Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            <FormControlLabel
              control={
                <Switch
                  checked={searchSettings.includeInConversation}
                  onChange={e => handleIncludeInConversationChange(e.target.checked)}
                  color="primary"
                  disabled={!searchSettings.enabled}
                />
              }
              label={
                <Typography fontWeight={500}>
                  在对话中显示搜索结果
                </Typography>
              }
            />

            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
              启用后，搜索结果将作为消息显示在对话流中，以便查看AI使用了哪些信息。
            </Typography>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              自定义搜索API端点 (可选)
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <TextField
                fullWidth
                placeholder="https://duckduckgo-api.vercel.app/search"
                value={customEndpoint}
                onChange={e => setCustomEndpoint(e.target.value)}
                error={!!endpointError}
                helperText={endpointError || '留空使用默认API端点'}
                disabled={!searchSettings.enabled}
                sx={{ mr: 1 }}
              />
              
              <IconButton 
                onClick={clearCustomEndpoint}
                disabled={!customEndpoint || !searchSettings.enabled}
                sx={{ 
                  bgcolor: theme => alpha(theme.palette.error.main, 0.1),
                  '&:hover': {
                    bgcolor: theme => alpha(theme.palette.error.main, 0.2),
                  }
                }}
              >
                <DeleteIcon color="error" />
              </IconButton>
            </Box>

            <Box sx={{ display: 'flex', mt: 2 }}>
              <Button 
                onClick={saveCustomEndpoint}
                disabled={!searchSettings.enabled || (!customEndpoint && !searchSettings.customEndpoint)}
                variant="outlined"
                sx={{ mr: 1 }}
              >
                保存端点
              </Button>
              
              <Button 
                onClick={resetToDefault} 
                disabled={!searchSettings.enabled}
                startIcon={<RefreshIcon />}
                variant="outlined"
                color="secondary"
                sx={{ mr: 1 }}
              >
                重置为默认
              </Button>
              
              <Button 
                onClick={testSearchConnection}
                disabled={testing || !searchSettings.enabled}
                variant="contained"
              >
                {testing ? '测试中...' : '测试连接'}
              </Button>
            </Box>

            {testStatus && (
              <Alert 
                severity={testStatus.success ? 'success' : 'error'} 
                sx={{ mt: 2 }}
              >
                {testStatus.message}
              </Alert>
            )}

            <Box sx={{ 
              p: 2, 
              mt: 3, 
              bgcolor: theme => alpha(theme.palette.info.main, 0.1),
              borderRadius: 2,
              border: '1px solid',
              borderColor: theme => alpha(theme.palette.info.main, 0.3)
            }}>
              <Typography variant="body2" fontWeight={500} color="info.main">
                自托管API端点
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                如需更稳定的使用体验，您可以通过以下命令自行部署DuckDuckGo API服务：
              </Typography>
              <Box sx={{ 
                bgcolor: 'background.paper', 
                p: 1, 
                borderRadius: 1, 
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                mt: 1
              }}>
                docker run -p 8000:8000 binjie09/duckduckgo-api
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                然后设置自定义端点为: http://localhost:8000
              </Typography>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default SearchSettings; 