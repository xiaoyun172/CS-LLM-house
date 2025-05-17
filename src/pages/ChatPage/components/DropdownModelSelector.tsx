import React from 'react';
import { 
  Select,
  MenuItem,
  FormControl,
  Typography,
  useTheme,
  Box
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
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : '#e0e0e0',
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
          '&:focus': {
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
          }
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              maxHeight: 300,
              mt: 0.5,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
            }
          }
        }}
      >
        {availableModels.map((model) => {
          const providerName = getProviderName(model.provider || model.providerType || '未知');
          const compositeValue = getCompositeValue(model);
          
          return (
            <MenuItem key={compositeValue} value={compositeValue} sx={{ py: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {model.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {providerName}
                  </Typography>
                </Box>
              </Box>
            </MenuItem>
          );
        })}
      </Select>
    </FormControl>
  );
};

export default DropdownModelSelector; 