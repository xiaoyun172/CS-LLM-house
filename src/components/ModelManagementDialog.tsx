import React, { useState, useEffect } from 'react';
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
  onRemoveModel: (modelId: string) => void;
  existingModels: Model[];
}

const ModelManagementDialog: React.FC<ModelManagementDialogProps> = ({
  open,
  onClose,
  provider,
  onAddModel,
  onRemoveModel,
  existingModels
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [models, setModels] = useState<Model[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // 检查模型是否已经在提供商的模型列表中
  const isModelInProvider = (modelId: string): boolean => {
    return existingModels.some(m => m.id === modelId);
  };
  
  // 按group对模型进行分组
  const getGroupedModels = (): GroupedModels => {
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
  };
  
  // 分组后的模型
  const groupedModels = getGroupedModels();
  
  // 获取模型列表
  const loadModels = async () => {
    try {
      setLoading(true);
      const fetchedModels = await fetchModels(provider);
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
  
  // 添加整个组
  const handleAddGroup = (group: string) => {
    groupedModels[group].forEach(model => {
      if (!isModelInProvider(model.id)) {
        onAddModel(model);
      }
    });
  };
  
  // 移除整个组
  const handleRemoveGroup = (group: string) => {
    groupedModels[group].forEach(model => {
      if (isModelInProvider(model.id)) {
        onRemoveModel(model.id);
      }
    });
  };
  
  // 加载模型
  useEffect(() => {
    if (open) {
      loadModels();
    }
  }, [open, provider]);
  
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
                                  onClick={() => onRemoveModel(model.id)}
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
                                  onClick={() => onAddModel(model)}
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