import React from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Divider,
  alpha
} from '@mui/material';
import {
  Language as LanguageIcon,
  Settings as SettingsIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../shared/store';
import { setWebSearchProvider } from '../shared/store/slices/webSearchSlice';
import type { WebSearchProviderConfig } from '../shared/types';

interface WebSearchProviderSelectorProps {
  open: boolean;
  onClose: () => void;
  onProviderSelect?: (providerId: string) => void;
}

/**
 * 网络搜索提供商选择器
 * 类似电脑版的快捷面板，适配移动端UI
 */
const WebSearchProviderSelector: React.FC<WebSearchProviderSelectorProps> = ({
  open,
  onClose,
  onProviderSelect
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const webSearchSettings = useSelector((state: RootState) => state.webSearch);

  // 安全地解构，确保所有值都有默认值
  const providers = webSearchSettings?.providers || [];
  const currentProvider = webSearchSettings?.provider || 'firecrawl';
  const enabled = webSearchSettings?.enabled || false;

  // 如果providers为空，显示加载状态
  if (!providers || providers.length === 0) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>加载中...</DialogTitle>
        <DialogContent>
          <Typography>正在加载搜索提供商...</Typography>
        </DialogContent>
      </Dialog>
    );
  }

  const handleProviderSelect = (providerId: string) => {
    dispatch(setWebSearchProvider(providerId as any));
    onProviderSelect?.(providerId);
    onClose();
  };

  const handleDisableWebSearch = () => {
    dispatch(setWebSearchProvider('custom' as any)); // 设置为无效提供商来禁用
    onProviderSelect?.('');
    onClose();
  };

  const handleOpenSettings = () => {
    onClose();
    navigate('/settings/web-search');
  };

  const getProviderIcon = (providerId: string) => {
    switch (providerId) {
      case 'tavily':
        return '🔍';
      case 'searxng':
        return '🌐';
      case 'exa':
        return '🎯';
      case 'bocha':
        return '🤖';
      case 'firecrawl':
        return '🔥';
      case 'local-google':
        return '🌍';
      case 'local-bing':
        return '🔎';
      default:
        return '🔍';
    }
  };

  const getProviderStatus = (provider: WebSearchProviderConfig) => {
    // 本地搜索提供商不需要配置
    if (provider.id === 'local-google' || provider.id === 'local-bing') {
      return { available: true, label: '本地搜索' };
    }

    // 检查API密钥
    if (provider.apiKey && provider.apiKey.trim()) {
      return { available: true, label: 'API密钥' };
    }

    // 检查自托管服务（如Searxng）
    if (provider.apiHost && provider.apiHost.trim()) {
      return { available: true, label: '自托管' };
    }

    // 检查基础认证（用于Searxng）
    if ('basicAuthUsername' in provider && 'basicAuthPassword' in provider) {
      if (provider.basicAuthUsername && provider.basicAuthPassword) {
        return { available: true, label: '基础认证' };
      }
    }

    return { available: false, label: '需要配置' };
  };

  const availableProviders = providers.filter(p => {
    const status = getProviderStatus(p);
    return status.available;
  });

  const unavailableProviders = providers.filter(p => {
    const status = getProviderStatus(p);
    return !status.available;
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '80vh'
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          pb: 1
        }}
      >
        <LanguageIcon color="primary" />
        <Typography variant="h6" component="span">
          选择搜索提供商
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 0, pb: 2 }}>
        {/* 禁用网络搜索选项 */}
        <List dense>
          <ListItem disablePadding>
            <ListItemButton
              onClick={handleDisableWebSearch}
              selected={!enabled || !currentProvider}
              sx={{
                mx: 2,
                borderRadius: 2,
                mb: 1
              }}
            >
              <ListItemIcon>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha('#666', 0.1),
                    fontSize: '16px'
                  }}
                >
                  🚫
                </Box>
              </ListItemIcon>
              <ListItemText
                primary="不使用网络搜索"
                secondary="禁用网络搜索功能"
              />
              {(!enabled || !currentProvider) && (
                <ListItemSecondaryAction>
                  <CheckIcon color="primary" />
                </ListItemSecondaryAction>
              )}
            </ListItemButton>
          </ListItem>
        </List>

        <Divider sx={{ my: 1 }} />

        {/* 可用的提供商 */}
        {availableProviders.length > 0 && (
          <>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ px: 2, py: 1 }}
            >
              可用的搜索提供商
            </Typography>
            <List dense>
              {availableProviders.map((provider) => {
                const status = getProviderStatus(provider);
                const isSelected = enabled && currentProvider === provider.id;

                return (
                  <ListItem key={provider.id} disablePadding>
                    <ListItemButton
                      onClick={() => handleProviderSelect(provider.id)}
                      selected={isSelected}
                      sx={{
                        mx: 2,
                        borderRadius: 2,
                        mb: 0.5
                      }}
                    >
                      <ListItemIcon>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: alpha('#3b82f6', 0.1),
                            fontSize: '16px'
                          }}
                        >
                          {getProviderIcon(provider.id)}
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={provider.name}
                        secondary={`✓ ${status.label}`}
                      />
                      {isSelected && (
                        <ListItemSecondaryAction>
                          <CheckIcon color="primary" />
                        </ListItemSecondaryAction>
                      )}
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </>
        )}

        {/* 需要配置的提供商 */}
        {unavailableProviders.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ px: 2, py: 1 }}
            >
              需要配置的提供商
            </Typography>
            <List dense>
              {unavailableProviders.map((provider) => {
                const status = getProviderStatus(provider);

                return (
                  <ListItem key={provider.id} disablePadding>
                    <ListItemButton
                      disabled
                      sx={{
                        mx: 2,
                        borderRadius: 2,
                        mb: 0.5
                      }}
                    >
                      <ListItemIcon>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: alpha('#666', 0.1),
                            fontSize: '16px',
                            opacity: 0.5
                          }}
                        >
                          {getProviderIcon(provider.id)}
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={provider.name}
                        secondary={`⚠️ ${status.label}`}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </>
        )}

        <Divider sx={{ my: 1 }} />

        {/* 设置按钮 */}
        <List dense>
          <ListItem disablePadding>
            <ListItemButton
              onClick={handleOpenSettings}
              sx={{
                mx: 2,
                borderRadius: 2
              }}
            >
              <ListItemIcon>
                <SettingsIcon color="action" />
              </ListItemIcon>
              <ListItemText
                primary="搜索设置"
                secondary="配置搜索提供商和选项"
              />
            </ListItemButton>
          </ListItem>
        </List>
      </DialogContent>
    </Dialog>
  );
};

export default WebSearchProviderSelector;
