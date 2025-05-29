import React, { useMemo, useCallback } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  useTheme,
  IconButton,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Avatar,
  useMediaQuery
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import type { Model } from '../../../shared/types';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../shared/store';

// 样式常量 - 提取重复的样式对象以提升性能
const DIALOG_STYLES = {
  iconButton: {
    color: (isDark: boolean) => isDark ? 'text.primary' : 'black',
  },
  button: (isDark: boolean) => ({
    textTransform: 'none',
    color: isDark ? 'text.primary' : 'black',
    mr: 1,
    fontWeight: 'normal',
    fontSize: '0.9rem',
    border: `1px solid ${isDark ? 'divider' : '#eeeeee'}`,
    borderRadius: '16px',
    px: 2,
    py: 0.5,
    '&:hover': {
      bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f5f5f5',
      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : '#e0e0e0'}`,
    }
  }),
  dialogPaper: (fullScreen: boolean) => ({
    borderRadius: fullScreen ? 0 : 2,
    height: fullScreen ? '100%' : 'auto',
    maxHeight: fullScreen ? '100%' : '80vh'
  }),
  dialogTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    pb: 1
  },
  tabsContainer: {
    borderBottom: 1,
    borderColor: 'divider'
  },
  dialogContent: {
    px: 1,
    py: 2
  },
  list: {
    pt: 0
  }
} as const;

// ModelItem 样式常量
const MODEL_ITEM_STYLES = {
  listItem: (isSelected: boolean, isDark: boolean) => ({
    borderRadius: 1,
    mb: 0.5,
    cursor: 'pointer',
    bgcolor: isSelected
      ? isDark
        ? 'rgba(144, 202, 249, 0.16)'
        : 'rgba(25, 118, 210, 0.08)'
      : 'transparent',
    '&:hover': {
      bgcolor: isSelected
        ? isDark
          ? 'rgba(144, 202, 249, 0.24)'
          : 'rgba(25, 118, 210, 0.12)'
        : isDark
          ? 'rgba(255, 255, 255, 0.08)'
          : 'rgba(0, 0, 0, 0.04)'
    }
  }),
  listItemIcon: {
    minWidth: 40
  },
  avatar: (provider: any, isSelected: boolean, primaryColor: string) => ({
    width: 28,
    height: 28,
    bgcolor: provider?.color || (isSelected ? primaryColor : 'grey.400'),
    color: 'white'
  }),
  primaryText: (isSelected: boolean) => ({
    variant: 'body1' as const,
    fontWeight: isSelected ? 'medium' : 'normal'
  }),
  secondaryText: {
    variant: 'caption' as const,
    noWrap: true
  }
} as const;

interface DialogModelSelectorProps {
  selectedModel: Model | null;
  availableModels: Model[];
  handleModelSelect: (model: Model) => void;
  handleMenuClick: () => void;
  handleMenuClose: () => void;
  menuOpen: boolean;
  iconMode?: boolean; // 是否使用图标模式
  useDropdownStyle?: boolean; // 是否使用下拉样式
}

export const DialogModelSelector: React.FC<DialogModelSelectorProps> = ({
  selectedModel,
  availableModels,
  handleModelSelect,
  handleMenuClick,
  handleMenuClose,
  menuOpen,
  iconMode = false,
  useDropdownStyle = false
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeTab, setActiveTab] = React.useState<string>('all');
  const providers = useSelector((state: RootState) => state.settings.providers || []);

  // 优化主题相关计算 - 使用 useMemo 缓存
  const isDark = useMemo(() => theme.palette.mode === 'dark', [theme.palette.mode]);

  // 优化提供商名称映射 - 使用 useMemo 预计算
  const providerNameMap = useMemo(() => {
    const map = new Map<string, string>();
    providers.forEach(provider => {
      map.set(provider.id, provider.name);
    });
    return map;
  }, [providers]);

  // 优化获取提供商名称的函数 - 使用 useCallback 和预计算的映射
  const getProviderName = useCallback((providerId: string) => {
    return providerNameMap.get(providerId) || providerId;
  }, [providerNameMap]);

  // 优化按提供商分组的模型 - 修复依赖项问题
  const groupedModels = useMemo(() => {
    const groups: Record<string, Model[]> = {};
    const providersMap: Record<string, { id: string, displayName: string }> = {};

    availableModels.forEach(model => {
      const providerId = model.provider || model.providerType || '未知';
      const displayName = getProviderName(providerId);

      // 使用原始ID作为键但保存显示名
      if (!providersMap[providerId]) {
        providersMap[providerId] = { id: providerId, displayName };
      }

      if (!groups[providerId]) {
        groups[providerId] = [];
      }
      groups[providerId].push(model);
    });

    // 转换为数组格式，以便可以排序
    const providersArray = Object.values(providersMap);
    // 按显示名称排序
    providersArray.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return { groups, providers: providersArray };
  }, [availableModels, getProviderName]);

  // 优化标签页切换处理函数 - 使用 useCallback
  const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  }, []);

  // 优化模型选择处理函数 - 使用 useCallback
  const handleModelSelectWithClose = useCallback((model: Model) => {
    handleModelSelect(model);
  }, [handleModelSelect]);

  return (
    <>
      {iconMode ? (
        // 图标模式：只显示图标按钮
        <IconButton
          onClick={handleMenuClick}
          color="inherit"
          size="small"
          sx={DIALOG_STYLES.iconButton}
        >
          <SmartToyIcon />
        </IconButton>
      ) : (
        // 完整模式：显示带文字的按钮
        <Button
          onClick={handleMenuClick}
          endIcon={<KeyboardArrowDownIcon />}
          sx={DIALOG_STYLES.button(isDark)}
        >
          {selectedModel?.name || '选择模型'}
        </Button>
      )}

      <Dialog
        open={menuOpen}
        onClose={handleMenuClose}
        fullScreen={fullScreen}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: DIALOG_STYLES.dialogPaper(fullScreen)
        }}
      >
        <DialogTitle sx={DIALOG_STYLES.dialogTitle}>
          选择模型
          <IconButton edge="end" onClick={handleMenuClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <Divider />

        <Box sx={DIALOG_STYLES.tabsContainer}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="model provider tabs"
          >
            <Tab label="全部" value="all" />
            {groupedModels.providers.map(provider => (
              <Tab key={provider.id} label={provider.displayName} value={provider.id} />
            ))}
          </Tabs>
        </Box>

        <DialogContent sx={DIALOG_STYLES.dialogContent}>
          <List sx={DIALOG_STYLES.list}>
            {activeTab === 'all' ? (
              // 显示所有模型
              availableModels.map((model) => (
                <ModelItem
                  key={`${model.id}-${model.provider}`}
                  model={model}
                  isSelected={selectedModel?.id === model.id && selectedModel?.provider === model.provider}
                  onSelect={() => handleModelSelectWithClose(model)}
                  providerDisplayName={getProviderName(model.provider || model.providerType || '未知')}
                  providers={providers}
                />
              ))
            ) : (
              // 显示特定提供商的模型
              groupedModels.groups[activeTab]?.map((model) => (
                <ModelItem
                  key={`${model.id}-${model.provider}`}
                  model={model}
                  isSelected={selectedModel?.id === model.id && selectedModel?.provider === model.provider}
                  onSelect={() => handleModelSelectWithClose(model)}
                  providerDisplayName={getProviderName(model.provider || model.providerType || '未知')}
                  providers={providers}
                />
              ))
            )}
          </List>
        </DialogContent>
      </Dialog>
    </>
  );
};

interface ModelItemProps {
  model: Model;
  isSelected: boolean;
  onSelect: () => void;
  providerDisplayName: string;
  providers: any[]; // 传入 providers 避免在组件内部使用 useSelector
}

// 优化 ModelItem 组件 - 使用 React.memo 避免不必要的重新渲染
const ModelItem: React.FC<ModelItemProps> = React.memo(({
  model,
  isSelected,
  onSelect,
  providerDisplayName,
  providers
}) => {
  const theme = useTheme();

  // 优化主题相关计算 - 使用 useMemo 缓存
  const isDark = useMemo(() => theme.palette.mode === 'dark', [theme.palette.mode]);

  // 优化提供商查找 - 使用 useMemo 缓存
  const provider = useMemo(() =>
    providers?.find(p => p.id === (model.provider || model.providerType)),
    [providers, model.provider, model.providerType]
  );

  // 优化样式计算 - 使用 useMemo 缓存
  const listItemStyle = useMemo(() =>
    MODEL_ITEM_STYLES.listItem(isSelected, isDark),
    [isSelected, isDark]
  );

  const avatarStyle = useMemo(() =>
    MODEL_ITEM_STYLES.avatar(provider, isSelected, theme.palette.primary.main),
    [provider, isSelected, theme.palette.primary.main]
  );

  const primaryTextProps = useMemo(() =>
    MODEL_ITEM_STYLES.primaryText(isSelected),
    [isSelected]
  );

  return (
    <ListItem
      onClick={onSelect}
      sx={listItemStyle}
    >
      <ListItemIcon sx={MODEL_ITEM_STYLES.listItemIcon}>
        <Avatar sx={avatarStyle}>
          {provider?.avatar || providerDisplayName[0]}
        </Avatar>
      </ListItemIcon>
      <ListItemText
        primary={model.name}
        secondary={model.description || `${providerDisplayName}模型`}
        primaryTypographyProps={primaryTextProps}
        secondaryTypographyProps={MODEL_ITEM_STYLES.secondaryText}
      />
      {isSelected && (
        <CheckIcon color="primary" fontSize="small" />
      )}
    </ListItem>
  );
});

export default DialogModelSelector;