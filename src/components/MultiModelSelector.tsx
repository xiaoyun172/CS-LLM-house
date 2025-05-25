import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Close as CloseIcon,
  CompareArrows as CompareArrowsIcon,
  SelectAll as SelectAllIcon,
  ClearAll as ClearAllIcon
} from '@mui/icons-material';
import type { Model } from '../shared/types';

interface MultiModelSelectorProps {
  open: boolean;
  onClose: () => void;
  availableModels: Model[];
  onConfirm: (selectedModels: Model[]) => void; // 传递模型对象而不是ID
  maxSelection?: number; // 最大选择数量
}

/**
 * 多模型选择器组件
 * 允许用户选择多个模型进行并行响应
 */
const MultiModelSelector: React.FC<MultiModelSelectorProps> = ({
  open,
  onClose,
  availableModels,
  onConfirm,
  maxSelection = 5 // 默认最多选择5个模型
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);

  // 生成唯一的模型标识符（供应商+模型ID）
  const getUniqueModelId = useCallback((model: Model) => {
    const provider = model.provider || model.providerType || 'unknown';
    return `${provider}:${model.id}`;
  }, []);

  // 处理模型选择
  const handleToggleModel = useCallback((model: Model) => {
    const uniqueId = getUniqueModelId(model);
    setSelectedModelIds(prev => {
      if (prev.includes(uniqueId)) {
        // 取消选择
        return prev.filter(id => id !== uniqueId);
      } else {
        // 添加选择（检查最大数量限制）
        if (prev.length >= maxSelection) {
          return prev; // 达到最大选择数量，不添加
        }
        return [...prev, uniqueId];
      }
    });
  }, [maxSelection, getUniqueModelId]);

  // 全选
  const handleSelectAll = useCallback(() => {
    const allUniqueIds = availableModels.slice(0, maxSelection).map(model => getUniqueModelId(model));
    setSelectedModelIds(allUniqueIds);
  }, [availableModels, maxSelection, getUniqueModelId]);

  // 清空选择
  const handleClearAll = useCallback(() => {
    setSelectedModelIds([]);
  }, []);

  // 确认选择
  const handleConfirm = useCallback(() => {
    if (selectedModelIds.length > 0) {
      // 将唯一ID转换回模型对象，传递给父组件
      const selectedModels = selectedModelIds.map(uniqueId => {
        return availableModels.find(model => getUniqueModelId(model) === uniqueId);
      }).filter(Boolean) as Model[];

      onConfirm(selectedModels);
      setSelectedModelIds([]); // 重置选择
      onClose();
    }
  }, [selectedModelIds, availableModels, getUniqueModelId, onConfirm, onClose]);

  // 关闭对话框
  const handleClose = useCallback(() => {
    setSelectedModelIds([]); // 重置选择
    onClose();
  }, [onClose]);

  // 获取模型显示名称
  const getModelDisplayName = useCallback((model: Model) => {
    return model.name || model.id;
  }, []);

  // 获取提供商名称
  const getProviderName = useCallback((model: Model) => {
    return model.provider || model.providerType || '未知';
  }, []);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen={fullScreen}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: fullScreen ? 0 : 2,
          maxHeight: '80vh'
        }
      }}
    >
      <DialogTitle sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        pb: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <CompareArrowsIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
          <Typography variant="h6">
            选择多个模型
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 1, py: 1 }}>
        {/* 选择状态和操作按钮 */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          px: 2
        }}>
          <Typography variant="body2" color="text.secondary">
            已选择 {selectedModelIds.length} / {maxSelection} 个模型
          </Typography>
          <Box>
            <Tooltip title="全选">
              <IconButton
                size="small"
                onClick={handleSelectAll}
                disabled={availableModels.length === 0}
              >
                <SelectAllIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="清空">
              <IconButton
                size="small"
                onClick={handleClearAll}
                disabled={selectedModelIds.length === 0}
              >
                <ClearAllIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* 已选择的模型标签 */}
        {selectedModelIds.length > 0 && (
          <Box sx={{ mb: 2, px: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              已选择的模型：
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selectedModelIds.map(uniqueId => {
                const model = availableModels.find(m => getUniqueModelId(m) === uniqueId);
                return model ? (
                  <Chip
                    key={uniqueId}
                    label={`${getProviderName(model)} / ${getModelDisplayName(model)}`}
                    size="small"
                    onDelete={() => handleToggleModel(model)}
                    color="primary"
                    variant="outlined"
                  />
                ) : null;
              })}
            </Box>
          </Box>
        )}

        {/* 模型列表 */}
        <List sx={{ pt: 0 }}>
          {availableModels.map((model) => {
            const uniqueId = getUniqueModelId(model);
            const isSelected = selectedModelIds.includes(uniqueId);
            const isDisabled = !isSelected && selectedModelIds.length >= maxSelection;

            return (
              <ListItem
                key={uniqueId}
                component="div"
                onClick={() => !isDisabled && handleToggleModel(model)}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  opacity: isDisabled ? 0.5 : 1,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  '&:hover': {
                    backgroundColor: isDisabled ? 'transparent' : theme.palette.action.hover
                  }
                }}
              >
                <ListItemIcon>
                  <Checkbox
                    checked={isSelected}
                    disabled={isDisabled}
                    color="primary"
                    onChange={() => !isDisabled && handleToggleModel(model)}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={`${getModelDisplayName(model)}`}
                  secondary={`${getProviderName(model)} • ${model.id}`}
                  primaryTypographyProps={{
                    fontWeight: isSelected ? 600 : 400
                  }}
                  secondaryTypographyProps={{
                    fontSize: '0.75rem'
                  }}
                />
              </ListItem>
            );
          })}
        </List>

        {availableModels.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              没有可用的模型
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit">
          取消
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={selectedModelIds.length === 0}
          startIcon={<CompareArrowsIcon />}
        >
          发送到 {selectedModelIds.length} 个模型
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MultiModelSelector;
