import React from 'react';
import {
  Select,
  MenuItem,
  FormControl,
  Typography,
  useTheme,
  Box,
  ListSubheader,
  Avatar
} from '@mui/material';
import type { Model } from '../../../shared/types';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../shared/store';
import type { SelectChangeEvent } from '@mui/material';

interface DropdownModelSelectorProps {
  selectedModel: Model | null;
  availableModels: Model[];
  handleModelSelect: (model: Model) => void;
}

export const DropdownModelSelector: React.FC<DropdownModelSelectorProps> = ({
  selectedModel,
  availableModels,
  handleModelSelect
}) => {
  const theme = useTheme();
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

  // 获取提供商信息的函数
  const getProviderInfo = React.useCallback((providerId: string) => {
    return providers.find(p => p.id === providerId);
  }, [providers]);

  // 按供应商分组模型
  const groupedModels = React.useMemo(() => {
    const groups: { [key: string]: Model[] } = {};

    availableModels.forEach(model => {
      const providerId = model.provider || model.providerType || 'unknown';
      if (!groups[providerId]) {
        groups[providerId] = [];
      }
      groups[providerId].push(model);
    });

    // 按供应商名称排序
    const sortedGroups = Object.keys(groups).sort((a, b) => {
      const nameA = getProviderName(a);
      const nameB = getProviderName(b);
      return nameA.localeCompare(nameB);
    });

    return { groups, sortedGroups };
  }, [availableModels, getProviderName]);

  const handleChange = (event: SelectChangeEvent<string>) => {
    const compositeValue = event.target.value;
    if (!compositeValue) return;

    try {
      // 从复合值中提取模型ID和提供商
      const [modelId, providerId] = compositeValue.split('---');

      // 找到匹配ID和提供商的模型
      const model = availableModels.find(m =>
        m.id === modelId && (m.provider || '') === providerId
      );

      if (model) {
        // 使用setTimeout防止事件处理冲突
        setTimeout(() => {
          handleModelSelect(model);
        }, 0);
      } else {
        console.error('未找到匹配的模型:', modelId, providerId);
      }
    } catch (error) {
      console.error('处理模型选择时出错:', error);
    }
  };

  // 生成唯一的复合值，防止-字符在modelId或providerId中导致的解析错误
  const getCompositeValue = React.useCallback((model: Model): string => {
    return `${model.id}---${model.provider || ''}`;
  }, []);

  // 获取当前选中模型的复合值
  const getCurrentValue = React.useCallback((): string => {
    if (!selectedModel) return '';
    return getCompositeValue(selectedModel);
  }, [selectedModel, getCompositeValue]);

  return (
    <FormControl
      variant="outlined"
      size="small"
      sx={{
        minWidth: 180,
        mr: 1,
        '& .MuiOutlinedInput-root': {
          borderRadius: '16px',
          fontSize: '0.9rem',
          bgcolor: 'transparent', // 完全透明背景
          border: 'none', // 移除边框
          '& .MuiOutlinedInput-notchedOutline': {
            border: 'none', // 移除默认边框
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            border: 'none', // 悬停时也不显示边框
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            border: 'none', // 聚焦时也不显示边框
          },
          '&:hover': {
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
          }
        }
      }}
    >
      <Select
        labelId="model-select-label"
        id="model-select"
        value={getCurrentValue()}
        onChange={handleChange}
        displayEmpty
        sx={{
          bgcolor: 'transparent',
          border: 'none',
          '& .MuiSelect-select': {
            padding: '8px 32px 8px 12px', // 调整内边距
            bgcolor: 'transparent',
            border: 'none',
            '&:focus': {
              bgcolor: 'transparent',
            }
          },
          '& .MuiSelect-icon': {
            color: theme.palette.text.secondary,
          },
          '&:before': {
            display: 'none',
          },
          '&:after': {
            display: 'none',
          },
          '&:focus': {
            bgcolor: 'transparent',
          },
          '&:hover': {
            bgcolor: 'transparent',
          }
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              maxHeight: 400,
              mt: 0.5,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              bgcolor: theme.palette.mode === 'dark' ? '#2A2A2A' : '#FFFFFF', // 不透明背景
              '& .MuiList-root': {
                py: 0,
                bgcolor: 'transparent'
              }
            }
          },
          MenuListProps: {
            sx: {
              py: 0,
              bgcolor: 'transparent'
            }
          }
        }}
      >
        {groupedModels.sortedGroups.map((providerId) => {
          const providerName = getProviderName(providerId);
          const providerInfo = getProviderInfo(providerId);
          const models = groupedModels.groups[providerId];

          return [
            // 供应商分组标题
            <ListSubheader
              key={`header-${providerId}`}
              sx={{
                bgcolor: theme.palette.mode === 'dark' ? '#3A3A3A' : '#F5F5F5', // 更明显的背景色
                fontWeight: 600,
                fontSize: '0.875rem',
                py: 1.5,
                px: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                position: 'sticky', // 粘性定位
                top: 0, // 固定在顶部
                zIndex: 10, // 确保在其他元素之上
                borderBottom: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                '&:not(:first-of-type)': {
                  borderTop: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`
                }
              }}
            >
              <Avatar
                sx={{
                  width: 20,
                  height: 20,
                  bgcolor: providerInfo?.color || theme.palette.primary.main,
                  fontSize: '0.75rem'
                }}
              >
                {providerInfo?.avatar || providerName[0]}
              </Avatar>
              {providerName}
            </ListSubheader>,
            // 该供应商下的模型
            ...models.map((model) => {
              const compositeValue = getCompositeValue(model);

              return (
                <MenuItem
                  key={compositeValue}
                  value={compositeValue}
                  sx={{
                    py: 1.5,
                    pl: 4, // 增加左边距以显示层级关系
                    pr: 2,
                    bgcolor: 'transparent',
                    '&:hover': {
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'
                    },
                    '&.Mui-selected': {
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(33, 150, 243, 0.2)' : 'rgba(33, 150, 243, 0.1)',
                      '&:hover': {
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(33, 150, 243, 0.3)' : 'rgba(33, 150, 243, 0.15)'
                      }
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {model.name}
                      </Typography>
                      {model.description && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {model.description}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </MenuItem>
              );
            })
          ];
        }).flat()}
      </Select>
    </FormControl>
  );
};

export default DropdownModelSelector;