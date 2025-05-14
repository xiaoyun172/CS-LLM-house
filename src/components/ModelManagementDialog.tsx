import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  TextField,
  Typography,
  Box,
  Divider,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import { alpha } from '@mui/material/styles';
import { fetchModels } from '../shared/services/APIService';
import type { Model } from '../shared/types';

// 分组模型的接口
interface GroupedModels {
  [key: string]: Model[];
}

interface ModelManagementDialogProps {
  open: boolean;
  onClose: () => void;
  provider: any;
  onAddModel: (model: Model) => void;
  onAddModels?: (models: Model[]) => void;
  onRemoveModel: (modelId: string) => void;
  onRemoveModels?: (modelIds: string[]) => void;
  existingModels: Model[];
}

const ModelManagementDialog: React.FC<ModelManagementDialogProps> = ({
  open,
  onClose,
  provider,
  onAddModel,
  onAddModels,
  onRemoveModel,
  onRemoveModels,
  existingModels
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [models, setModels] = useState<Model[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [pendingModels, setPendingModels] = useState<Map<string, boolean>>(new Map());
  // 使用ref存储初始provider，避免重新加载
  const initialProviderRef = useRef<any>(null);
  
  // 检查模型是否已经在提供商的模型列表中
  const isModelInProvider = useCallback((modelId: string): boolean => {
    return existingModels.some(m => m.id === modelId) || pendingModels.get(modelId) === true;
  }, [existingModels, pendingModels]);
  
  // 按group对模型进行分组
  const getGroupedModels = useCallback((): GroupedModels => {
    // 过滤搜索结果
    const filteredModels = models.filter(model => 
      model.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      model.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // 按group分组
    return filteredModels.reduce((groups: GroupedModels, model) => {
      const group = model.group || '其他模型';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(model);
      return groups;
    }, {});
  }, [models, searchTerm]);
  
  // 分组后的模型
  const groupedModels = getGroupedModels();
  
  // 加载模型列表
  const loadModels = async () => {
    try {
      setLoading(true);
      // 使用ref中存储的provider或当前provider
      const providerToUse = initialProviderRef.current || provider;
      const fetchedModels = await fetchModels(providerToUse);
      // 合并现有模型和从API获取的模型
      const allModels = [...fetchedModels];
      setModels(allModels);
      
      // 默认展开所有组
      const groups = new Set<string>();
      allModels.forEach(model => {
        if (model.group) {
          groups.add(model.group);
        }
      });
      setExpandedGroups(groups);
    } catch (error) {
      console.error('加载模型失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 处理组展开/折叠
  const handleGroupToggle = (group: string) => {
    const newExpandedGroups = new Set(expandedGroups);
    if (newExpandedGroups.has(group)) {
      newExpandedGroups.delete(group);
    } else {
      newExpandedGroups.add(group);
    }
    setExpandedGroups(newExpandedGroups);
  };
  
  // 添加模型，更新pending状态
  const handleAddSingleModel = (model: Model) => {
    if (!isModelInProvider(model.id)) {
      const newPendingModels = new Map(pendingModels);
      newPendingModels.set(model.id, true);
      setPendingModels(newPendingModels);
      onAddModel(model);
    }
  };

  // 移除模型，更新pending状态
  const handleRemoveSingleModel = (modelId: string) => {
    const newPendingModels = new Map(pendingModels);
    newPendingModels.delete(modelId);
    setPendingModels(newPendingModels);
    onRemoveModel(modelId);
  };
  
  // 添加整个组
  const handleAddGroup = (group: string) => {
    // 创建新模型集合，一次性添加整个组
    const modelsToAdd = groupedModels[group].filter(model => !isModelInProvider(model.id));
    
    if (modelsToAdd.length > 0) {
      // 批量更新pendingModels状态
      const newPendingModels = new Map(pendingModels);
      
      // 使用批量添加API（如果可用）
      if (onAddModels) {
        // 为每个模型创建副本
        const modelsCopy = modelsToAdd.map(model => ({...model}));
        
        // 更新本地状态
        modelsCopy.forEach(model => {
          newPendingModels.set(model.id, true);
        });
        setPendingModels(newPendingModels);
        
        // 批量添加
        onAddModels(modelsCopy);
      } else {
        // 为每个要添加的模型创建一个副本，添加到provider中
        modelsToAdd.forEach(model => {
          newPendingModels.set(model.id, true);
          onAddModel({...model});
        });
        setPendingModels(newPendingModels);
      }
    }
  };
  
  // 移除整个组
  const handleRemoveGroup = (group: string) => {
    // 找出要移除的模型ID列表
    const modelIdsToRemove = groupedModels[group]
      .filter(model => isModelInProvider(model.id))
      .map(model => model.id);
    
    if (modelIdsToRemove.length > 0) {
      // 批量更新pendingModels状态
      const newPendingModels = new Map(pendingModels);
      
      // 使用批量删除API（如果可用）
      if (onRemoveModels) {
        // 更新本地状态
        modelIdsToRemove.forEach(modelId => {
          newPendingModels.delete(modelId);
        });
        setPendingModels(newPendingModels);
        
        // 批量删除
        onRemoveModels(modelIdsToRemove);
      } else {
        // 移除每个模型
        modelIdsToRemove.forEach(modelId => {
          newPendingModels.delete(modelId);
          onRemoveModel(modelId);
        });
        setPendingModels(newPendingModels);
      }
    }
  };
  
  // 加载模型，只在对话框打开时加载一次
  useEffect(() => {
    if (open) {
      // 首次打开时保存provider的引用
      if (!initialProviderRef.current) {
        initialProviderRef.current = provider;
      }
      loadModels();
      // 重置pendingModels
      setPendingModels(new Map());
    } else {
      // 对话框关闭时重置ref，以便下次打开时使用新的provider
      initialProviderRef.current = null;
    }
  }, [open]); // 只依赖open状态，不依赖provider

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 700,
          backgroundImage: 'linear-gradient(90deg, #9333EA, #754AB4)',
          backgroundClip: 'text',
          color: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 3
        }}
      >
        {provider.name}模型管理
        {loading && <CircularProgress size={24} sx={{ ml: 2 }} />}
      </DialogTitle>
      
      <Box sx={{ px: 3, pb: 2 }}>
        <TextField
          fullWidth
          placeholder="搜索模型..."
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            sx: { borderRadius: 2 }
          }}
        />
      </Box>
      
      <Divider />
      
      <DialogContent 
        sx={{ 
          p: 2, 
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0,0,0,0.1)',
            borderRadius: '3px',
          },
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {Object.keys(groupedModels).length === 0 ? (
              <Typography variant="body1" sx={{ textAlign: 'center', my: 4, color: 'text.secondary' }}>
                找不到匹配的模型
              </Typography>
            ) : (
              Object.entries(groupedModels).map(([group, groupModels]) => {
                const isAllInProvider = groupModels.every(model => isModelInProvider(model.id));
                
                return (
                  <Accordion 
                    key={group}
                    expanded={expandedGroups.has(group)}
                    onChange={() => handleGroupToggle(group)}
                    sx={{
                      mb: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: '8px !important',
                      '&:before': {
                        display: 'none',
                      },
                      boxShadow: 'none'
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{ borderRadius: '8px' }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {group}
                          </Typography>
                          <Chip 
                            label={groupModels.length} 
                            size="small" 
                            sx={{ 
                              ml: 1, 
                              height: 20,
                              bgcolor: (theme) => alpha(theme.palette.success.main, 0.1),
                              color: 'success.main',
                              fontWeight: 600,
                              fontSize: '0.7rem'
                            }} 
                          />
                        </Box>
                        
                        <IconButton
                          size="small"
                          color={isAllInProvider ? "error" : "primary"}
                          onClick={(e) => {
                            e.stopPropagation();
                            isAllInProvider ? handleRemoveGroup(group) : handleAddGroup(group);
                          }}
                          sx={{
                            bgcolor: (theme) => alpha(
                              isAllInProvider ? theme.palette.error.main : theme.palette.primary.main, 
                              0.1
                            ),
                            ml: 'auto',
                          }}
                        >
                          {isAllInProvider ? <RemoveIcon /> : <AddIcon />}
                        </IconButton>
                      </Box>
                    </AccordionSummary>
                    
                    <AccordionDetails sx={{ p: 1 }}>
                      <List disablePadding>
                        {groupModels.map((model) => (
                          <ListItem
                            key={model.id}
                            sx={{
                              mb: 1,
                              borderRadius: 2,
                              border: '1px solid',
                              borderColor: 'divider',
                              bgcolor: isModelInProvider(model.id)
                                ? (theme) => alpha(theme.palette.success.main, 0.05)
                                : 'transparent',
                              transition: 'all 0.2s',
                            }}
                            secondaryAction={
                              isModelInProvider(model.id) ? (
                                <IconButton
                                  edge="end"
                                  color="error"
                                  onClick={() => handleRemoveSingleModel(model.id)}
                                  sx={{
                                    bgcolor: (theme) => alpha(theme.palette.error.main, 0.1),
                                    '&:hover': {
                                      bgcolor: (theme) => alpha(theme.palette.error.main, 0.2),
                                    }
                                  }}
                                >
                                  <RemoveIcon />
                                </IconButton>
                              ) : (
                                <IconButton
                                  edge="end"
                                  color="primary"
                                  onClick={() => handleAddSingleModel(model)}
                                  sx={{
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                                    '&:hover': {
                                      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2),
                                    }
                                  }}
                                >
                                  <AddIcon />
                                </IconButton>
                              )
                            }
                          >
                            <ListItemText
                              primary={
                                <Typography variant="body1" fontWeight={600}>
                                  {model.name}
                                </Typography>
                              }
                              secondary={
                                <Typography variant="body2" color="text.secondary" fontSize="0.8rem">
                                  {model.id}
                                </Typography>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                );
              })
            )}
          </>
        )}
      </DialogContent>
      
      <Divider />
      
      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={onClose}
          sx={{
            borderRadius: 2,
            px: 3,
            py: 1,
            fontWeight: 600
          }}
        >
          关闭
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ModelManagementDialog; 