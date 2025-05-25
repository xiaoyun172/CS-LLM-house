import React, { useState, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  FormControl,
  FormControlLabel,
  Switch,
  TextField,
  Button,
  Card,
  CardContent,
  CardActions,
  Select,
  MenuItem,
  InputLabel,
  OutlinedInput,
  Slider,
  FormGroup,
  alpha,
  Divider,
  Tooltip,
  Alert,
  Paper
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import LanguageIcon from '@mui/icons-material/Language';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useDispatch, useSelector } from 'react-redux';
import type { WebSearchProvider, WebSearchCustomProvider } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';
import {
  toggleWebSearchEnabled,
  setWebSearchProvider,
  setWebSearchApiKey,
  setWebSearchMaxResults,
  toggleIncludeInContext,
  toggleShowTimestamp,
  toggleFilterSafeSearch,
  setSearchMode,
  addCustomProvider,
  updateCustomProvider,
  deleteCustomProvider,
  toggleCustomProviderEnabled,
  toggleSearchWithTime,
  setExcludeDomains
} from '../../shared/store/slices/webSearchSlice';
import type { RootState } from '../../shared/store';

const WebSearchSettings: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // 从Redux获取设置
  const webSearchSettings = useSelector((state: RootState) => state.webSearch) || {
    enabled: false,
    provider: 'firecrawl' as WebSearchProvider,
    apiKey: '',
    includeInContext: true,
    maxResults: 5,
    showTimestamp: true,
    filterSafeSearch: true,
    searchMode: 'auto' as 'auto' | 'manual',
    searchWithTime: false,
    excludeDomains: [],
    providers: [],
    customProviders: []
  };

  const [editingProvider, setEditingProvider] = useState<WebSearchCustomProvider | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // 初始化设置 - 这里不需要设置本地状态，因为我们直接使用Redux的状态
  }, [webSearchSettings]);

  const handleBack = () => {
    navigate('/settings');
  };

  const handleToggleEnabled = () => {
    dispatch(toggleWebSearchEnabled());
  };

  const handleProviderChange = (event: SelectChangeEvent) => {
    dispatch(setWebSearchProvider(event.target.value as WebSearchProvider));
  };

  const handleApiKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setWebSearchApiKey(event.target.value));
  };

  const handleMaxResultsChange = (_: Event, newValue: number | number[]) => {
    dispatch(setWebSearchMaxResults(newValue as number));
  };

  const handleToggleIncludeInContext = () => {
    dispatch(toggleIncludeInContext());
  };

  const handleToggleShowTimestamp = () => {
    dispatch(toggleShowTimestamp());
  };

  const handleToggleFilterSafeSearch = () => {
    dispatch(toggleFilterSafeSearch());
  };

  const handleSearchModeChange = (event: SelectChangeEvent) => {
    dispatch(setSearchMode(event.target.value as 'auto' | 'manual'));
  };

  const handleAddCustomProvider = () => {
    const newProvider: WebSearchCustomProvider = {
      id: uuidv4(),
      name: '新搜索服务',
      apiKey: '',
      baseUrl: '',
      enabled: true
    };

    setEditingProvider(newProvider);
    setIsEditing(true);
  };

  const handleEditProvider = (provider: WebSearchCustomProvider) => {
    setEditingProvider({...provider});
    setIsEditing(true);
  };

  const handleDeleteProvider = (id: string) => {
    dispatch(deleteCustomProvider(id));
  };

  const handleSaveProvider = () => {
    if (!editingProvider) return;

    if (editingProvider.id && webSearchSettings.customProviders?.some(p => p.id === editingProvider.id)) {
      dispatch(updateCustomProvider(editingProvider));
    } else {
      dispatch(addCustomProvider(editingProvider));
    }

    setEditingProvider(null);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditingProvider(null);
    setIsEditing(false);
  };

  const handleProviderFieldChange = (field: keyof WebSearchCustomProvider, value: string | boolean) => {
    if (!editingProvider) return;

    setEditingProvider(prev => ({
      ...prev!,
      [field]: value
    }));
  };

  // 渲染主要内容
  return (
    <Box sx={{
      flexGrow: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      bgcolor: (theme) => theme.palette.mode === 'light'
        ? alpha(theme.palette.primary.main, 0.02)
        : alpha(theme.palette.background.default, 0.9),
    }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: 1,
          borderColor: 'divider',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={handleBack}
            aria-label="back"
            sx={{
              color: (theme) => theme.palette.primary.main,
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 1,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: (theme) => theme.palette.text.primary,
            }}
          >
            <LanguageIcon sx={{ color: '#3b82f6' }} /> 网络搜索设置
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          px: 2,
          py: 2,
          mt: 8,
          mb: 2,
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
            p: 3,
            mb: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            variant="h6"
            gutterBottom
            sx={{
              fontWeight: 600,
              color: (theme) => theme.palette.text.primary,
              mb: 2,
            }}
          >
            基本设置
          </Typography>

          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={webSearchSettings.enabled}
                  onChange={handleToggleEnabled}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography sx={{ mr: 1 }}>启用网络搜索</Typography>
                  <Tooltip title="开启后，AI可以通过网络搜索获取最新信息">
                    <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </Tooltip>
                </Box>
              }
            />
          </FormGroup>

          <Divider sx={{ my: 2 }} />

          <FormControl fullWidth margin="normal">
            <InputLabel id="search-provider-label">搜索服务商</InputLabel>
            <Select
              labelId="search-provider-label"
              value={webSearchSettings.provider}
              onChange={handleProviderChange}
              input={<OutlinedInput label="搜索服务商" />}
              disabled={!webSearchSettings.enabled}
            >
              <MenuItem value="tavily">Tavily (推荐)</MenuItem>
              <MenuItem value="searxng">Searxng (自托管)</MenuItem>
              <MenuItem value="exa">Exa (神经搜索)</MenuItem>
              <MenuItem value="bocha">Bocha (AI搜索)</MenuItem>
              <MenuItem value="firecrawl">Firecrawl (网页抓取)</MenuItem>
              <MenuItem value="custom">自定义服务</MenuItem>
            </Select>
          </FormControl>

          {webSearchSettings.provider !== 'custom' &&
           webSearchSettings.provider !== 'searxng' && (
            <>
              <TextField
                fullWidth
                margin="normal"
                label="API 密钥"
                type="password"
                value={webSearchSettings.apiKey || ''}
                onChange={handleApiKeyChange}
                disabled={!webSearchSettings.enabled}
                variant="outlined"
                placeholder={`请输入 ${webSearchSettings.provider} API 密钥`}
              />

              {webSearchSettings.provider === 'tavily' && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Tavily 是专为AI设计的搜索API，提供高质量的搜索结果。访问
                  <a href="https://tavily.com" target="_blank" rel="noopener noreferrer" style={{ marginLeft: 5 }}>
                    tavily.com
                  </a>
                  获取 API 密钥。
                </Alert>
              )}

              {webSearchSettings.provider === 'exa' && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Exa 是基于神经网络的搜索引擎，提供语义搜索功能。访问
                  <a href="https://exa.ai" target="_blank" rel="noopener noreferrer" style={{ marginLeft: 5 }}>
                    exa.ai
                  </a>
                  获取 API 密钥。
                </Alert>
              )}

              {webSearchSettings.provider === 'bocha' && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Bocha 是AI驱动的搜索引擎，提供智能搜索结果。访问
                  <a href="https://bochaai.com" target="_blank" rel="noopener noreferrer" style={{ marginLeft: 5 }}>
                    bochaai.com
                  </a>
                  获取 API 密钥。
                </Alert>
              )}

              {webSearchSettings.provider === 'firecrawl' && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Firecrawl 提供强大的网络爬取和搜索功能。访问
                  <a href="https://firecrawl.dev" target="_blank" rel="noopener noreferrer" style={{ marginLeft: 5 }}>
                    firecrawl.dev
                  </a>
                  获取 API 密钥。
                </Alert>
              )}
            </>
          )}

          {webSearchSettings.provider === 'searxng' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Searxng 是自托管的开源搜索引擎。您需要部署自己的 Searxng 实例，然后在此配置服务器地址。
              <a href="https://searxng.github.io/searxng/" target="_blank" rel="noopener noreferrer" style={{ marginLeft: 5 }}>
                了解更多
              </a>
            </Alert>
          )}

          {webSearchSettings.provider === 'custom' && webSearchSettings.customProviders && webSearchSettings.customProviders.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                自定义搜索服务列表
              </Typography>

              {webSearchSettings.customProviders.map((provider) => (
                <Card
                  key={provider.id}
                  variant="outlined"
                  sx={{
                    mb: 2,
                    borderColor: provider.enabled ? alpha('#3b82f6', 0.5) : 'divider'
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6">{provider.name}</Typography>
                      <FormControlLabel
                        control={
                          <Switch
                            size="small"
                            checked={provider.enabled}
                            onChange={() => dispatch(toggleCustomProviderEnabled(provider.id))}
                          />
                        }
                        label="启用"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      API URL: {provider.baseUrl}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => handleEditProvider(provider)}
                    >
                      编辑
                    </Button>
                    <Button
                      size="small"
                      startIcon={<DeleteIcon />}
                      color="error"
                      onClick={() => handleDeleteProvider(provider.id)}
                    >
                      删除
                    </Button>
                  </CardActions>
                </Card>
              ))}
            </Box>
          )}

          {webSearchSettings.provider === 'custom' && (
            <Button
              startIcon={<AddIcon />}
              variant="outlined"
              sx={{ mt: 2 }}
              onClick={handleAddCustomProvider}
              disabled={!webSearchSettings.enabled}
            >
              添加自定义搜索服务
            </Button>
          )}
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            variant="h6"
            gutterBottom
            sx={{
              fontWeight: 600,
              color: (theme) => theme.palette.text.primary,
              mb: 2,
            }}
          >
            搜索选项
          </Typography>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="search-mode-label">搜索模式</InputLabel>
            <Select
              labelId="search-mode-label"
              value={webSearchSettings.searchMode}
              onChange={handleSearchModeChange}
              input={<OutlinedInput label="搜索模式" />}
              disabled={!webSearchSettings.enabled}
            >
              <MenuItem value="auto">自动搜索 (AI 自动判断何时搜索)</MenuItem>
              <MenuItem value="manual">手动搜索 (点击搜索按钮启动)</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ mb: 3 }}>
            <Typography id="max-results-slider" gutterBottom>
              最大结果数量: {webSearchSettings.maxResults}
            </Typography>
            <Slider
              aria-labelledby="max-results-slider"
              value={webSearchSettings.maxResults}
              onChange={handleMaxResultsChange}
              min={1}
              max={20}
              step={1}
              marks={[
                { value: 1, label: '1' },
                { value: 5, label: '5' },
                { value: 10, label: '10' },
                { value: 20, label: '20' },
              ]}
              disabled={!webSearchSettings.enabled}
            />
          </Box>

          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={webSearchSettings.includeInContext}
                  onChange={handleToggleIncludeInContext}
                  disabled={!webSearchSettings.enabled}
                />
              }
              label="将搜索结果包含在上下文中"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={webSearchSettings.showTimestamp}
                  onChange={handleToggleShowTimestamp}
                  disabled={!webSearchSettings.enabled}
                />
              }
              label="显示搜索结果时间戳"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={webSearchSettings.filterSafeSearch}
                  onChange={handleToggleFilterSafeSearch}
                  disabled={!webSearchSettings.enabled}
                />
              }
              label="启用安全搜索过滤"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={webSearchSettings.searchWithTime}
                  onChange={() => dispatch(toggleSearchWithTime())}
                  disabled={!webSearchSettings.enabled}
                />
              }
              label="在搜索查询中添加当前日期"
            />
          </FormGroup>
        </Paper>

        {/* 高级设置 */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            variant="h6"
            gutterBottom
            sx={{
              fontWeight: 600,
              color: (theme) => theme.palette.text.primary,
              mb: 2,
            }}
          >
            高级设置
          </Typography>

          <Typography variant="subtitle2" gutterBottom>
            排除域名 (每行一个)
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={webSearchSettings.excludeDomains?.join('\n') || ''}
            onChange={(e) => {
              const domains = e.target.value.split('\n').filter(d => d.trim());
              dispatch(setExcludeDomains(domains));
            }}
            placeholder="example.com&#10;spam-site.com"
            disabled={!webSearchSettings.enabled}
            variant="outlined"
            sx={{ mb: 2 }}
          />

          <Typography variant="body2" color="text.secondary" gutterBottom>
            这些域名将从搜索结果中排除
          </Typography>
        </Paper>
      </Box>

      {isEditing && editingProvider && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2,
          }}
        >
          <Paper
            sx={{
              p: 3,
              width: '100%',
              maxWidth: 500,
              maxHeight: '90vh',
              overflow: 'auto',
              borderRadius: 2,
            }}
          >
            <Typography variant="h6" gutterBottom>
              {editingProvider.id ? '编辑搜索服务' : '添加搜索服务'}
            </Typography>

            <TextField
              fullWidth
              margin="normal"
              label="服务名称"
              value={editingProvider.name}
              onChange={(e) => handleProviderFieldChange('name', e.target.value)}
              variant="outlined"
            />

            <TextField
              fullWidth
              margin="normal"
              label="基础 URL"
              value={editingProvider.baseUrl}
              onChange={(e) => handleProviderFieldChange('baseUrl', e.target.value)}
              variant="outlined"
              placeholder="https://api.example.com"
            />

            <TextField
              fullWidth
              margin="normal"
              label="API 密钥"
              type="password"
              value={editingProvider.apiKey}
              onChange={(e) => handleProviderFieldChange('apiKey', e.target.value)}
              variant="outlined"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={editingProvider.enabled}
                  onChange={(e) => handleProviderFieldChange('enabled', e.target.checked)}
                />
              }
              label="启用此服务"
            />

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button onClick={handleCancelEdit}>取消</Button>
              <Button
                variant="contained"
                onClick={handleSaveProvider}
                sx={{
                  bgcolor: '#3b82f6',
                  '&:hover': {
                    bgcolor: '#2563eb',
                  }
                }}
              >
                保存
              </Button>
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default WebSearchSettings;