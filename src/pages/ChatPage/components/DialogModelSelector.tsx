import React from 'react';
import { 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  Box, 
  Typography, 
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
import type { Model } from '../../../shared/types';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../shared/store';

interface DialogModelSelectorProps {
  selectedModel: Model | null;
  availableModels: Model[];
  handleModelSelect: (model: Model) => void;
  handleMenuClick: () => void;
  handleMenuClose: () => void;
  menuOpen: boolean;
}

export const DialogModelSelector: React.FC<DialogModelSelectorProps> = ({
  selectedModel,
  availableModels,
  handleModelSelect,
  handleMenuClick,
  handleMenuClose,
  menuOpen
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeTab, setActiveTab] = React.useState<string>('all');
  const providers = useSelector((state: RootState) => state.settings.providers || []);
  
  // 获取提供商名称的函数
  const getProviderName = React.useCallback((providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    // 如果找到提供商，返回用户设置的名称
    if (provider) {
      return provider.name;
    }
    // 没有找到，返回原始ID
    return providerId;
  }, [providers]);
  
  // 按提供商分组的模型
  const groupedModels = React.useMemo(() => {
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
    const providers = Object.values(providersMap);
    // 按显示名称排序
    providers.sort((a, b) => a.displayName.localeCompare(b.displayName));
    
    return { groups, providers };
  }, [availableModels, getProviderName]);
  
  const handleTabChange = (_: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };
  
  return (
    <>
      <Button
        onClick={handleMenuClick}
        endIcon={<KeyboardArrowDownIcon />}
        sx={{
          textTransform: 'none',
          color: theme.palette.mode === 'dark' ? theme.palette.text.primary : 'black',
          mr: 1,
          fontWeight: 'normal',
          fontSize: '0.9rem',
          border: `1px solid ${theme.palette.mode === 'dark' ? theme.palette.divider : '#eeeeee'}`,
          borderRadius: '16px',
          px: 2,
          py: 0.5,
          '&:hover': {
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#f5f5f5',
            border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : '#e0e0e0'}`,
          }
        }}
      >
        {selectedModel?.name || '选择模型'}
      </Button>
      
      <Dialog
        open={menuOpen}
        onClose={handleMenuClose}
        fullScreen={fullScreen}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: fullScreen ? 0 : 2,
            height: fullScreen ? '100%' : 'auto',
            maxHeight: fullScreen ? '100%' : '80vh'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6">选择模型</Typography>
          <IconButton edge="end" onClick={handleMenuClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <Divider />
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
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
        
        <DialogContent sx={{ px: 1, py: 2 }}>
          <List sx={{ pt: 0 }}>
            {activeTab === 'all' ? (
              // 显示所有模型
              availableModels.map((model) => (
                <ModelItem 
                  key={model.id} 
                  model={model} 
                  isSelected={selectedModel?.id === model.id && selectedModel?.provider === model.provider}
                  onSelect={() => handleModelSelect(model)}
                  providerDisplayName={getProviderName(model.provider || model.providerType || '未知')}
                />
              ))
            ) : (
              // 显示特定提供商的模型
              groupedModels.groups[activeTab]?.map((model) => (
                <ModelItem 
                  key={model.id} 
                  model={model} 
                  isSelected={selectedModel?.id === model.id && selectedModel?.provider === model.provider}
                  onSelect={() => handleModelSelect(model)}
                  providerDisplayName={getProviderName(model.provider || model.providerType || '未知')}
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
}

const ModelItem: React.FC<ModelItemProps> = ({ model, isSelected, onSelect, providerDisplayName }) => {
  const theme = useTheme();
  // 获取提供商信息
  const provider = useSelector((state: RootState) => 
    state.settings.providers?.find(p => p.id === (model.provider || model.providerType))
  );
  
  return (
    <ListItem 
      onClick={onSelect}
      sx={{
        borderRadius: 1,
        mb: 0.5,
        cursor: 'pointer',
        bgcolor: isSelected 
          ? theme.palette.mode === 'dark' 
            ? 'rgba(144, 202, 249, 0.16)' 
            : 'rgba(25, 118, 210, 0.08)'
          : 'transparent',
        '&:hover': {
          bgcolor: isSelected
            ? theme.palette.mode === 'dark'
              ? 'rgba(144, 202, 249, 0.24)'
              : 'rgba(25, 118, 210, 0.12)'
            : theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.08)'
              : 'rgba(0, 0, 0, 0.04)'
        }
      }}
    >
      <ListItemIcon sx={{ minWidth: 40 }}>
        <Avatar 
          sx={{ 
            width: 28, 
            height: 28,
            bgcolor: provider?.color || (isSelected ? theme.palette.primary.main : 'grey.400'),
            color: 'white'
          }}
        >
          {provider?.avatar || providerDisplayName[0]}
        </Avatar>
      </ListItemIcon>
      <ListItemText 
        primary={model.name} 
        secondary={model.description || `${providerDisplayName}模型`}
        primaryTypographyProps={{
          variant: 'body1',
          fontWeight: isSelected ? 'medium' : 'normal'
        }}
        secondaryTypographyProps={{
          variant: 'caption',
          noWrap: true
        }}
      />
      {isSelected && (
        <CheckIcon color="primary" fontSize="small" />
      )}
    </ListItem>
  );
};

export default DialogModelSelector; 