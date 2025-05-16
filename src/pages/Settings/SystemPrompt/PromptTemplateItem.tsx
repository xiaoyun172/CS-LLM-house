import React from 'react';
import {
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  Avatar,
  Box,
  Typography
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import SaveIcon from '@mui/icons-material/Save';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { styles } from './styles';
import type { SystemPromptTemplate } from './types';

/**
 * 系统提示词管理 - 提示词模板列表项UI组件
 * 显示单个提示词模板，包含模板名称、内容预览和操作按钮
 */
interface PromptTemplateItemProps {
  template: SystemPromptTemplate;
  onSetDefault: (id: string) => void;
  onDuplicate: (template: SystemPromptTemplate) => void;
  onEdit: (template: SystemPromptTemplate) => void;
  onDelete: (id: string) => void;
}

export const PromptTemplateItem: React.FC<PromptTemplateItemProps> = ({
  template,
  onSetDefault,
  onDuplicate,
  onEdit,
  onDelete
}) => {
  return (
    <ListItem
      sx={styles.templateItem}
      secondaryAction={
        <Box>
          <Tooltip title="设为默认">
            <IconButton 
              edge="end" 
              onClick={() => onSetDefault(template.id)}
              color={template.isDefault ? "primary" : "default"}
              size="small"
            >
              <SaveIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="复制">
            <IconButton 
              edge="end" 
              onClick={() => onDuplicate(template)}
              size="small"
            >
              <ContentCopyIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="编辑">
            <IconButton 
              edge="end" 
              onClick={() => onEdit(template)}
              size="small"
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="删除">
            <IconButton 
              edge="end" 
              onClick={() => onDelete(template.id)}
              disabled={template.isDefault}
              size="small"
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      }
    >
      <Avatar 
        sx={template.isDefault ? styles.defaultAvatar : styles.normalAvatar}
      >
        <AutoFixHighIcon />
      </Avatar>
      <ListItemText
        primary={
          <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
            {template.name}
            {template.isDefault && (
              <Typography 
                variant="caption" 
                sx={styles.defaultBadge}
              >
                默认
              </Typography>
            )}
          </Box>
        }
        secondary={template.content.substring(0, 60) + (template.content.length > 60 ? '...' : '')}
      />
    </ListItem>
  );
}; 