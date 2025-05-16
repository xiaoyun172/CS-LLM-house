import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField
} from '@mui/material';
import type { SystemPromptTemplate } from './types';

/**
 * 系统提示词管理 - 提示词模板编辑对话框UI组件
 * 用于创建新模板或编辑现有模板，包含名称和内容输入字段
 */
interface TemplateEditDialogProps {
  open: boolean;
  template: SystemPromptTemplate | null;
  onClose: () => void;
  onSave: (template: SystemPromptTemplate) => void;
  onChange: (field: keyof SystemPromptTemplate, value: string) => void;
}

export const TemplateEditDialog: React.FC<TemplateEditDialogProps> = ({
  open,
  template,
  onClose,
  onSave,
  onChange
}) => {
  if (!template) return null;
  
  const isValid = template.name.trim() && template.content.trim();
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {template?.id ? '编辑提示词模板' : '添加提示词模板'}
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="模板名称"
          fullWidth
          variant="outlined"
          value={template.name}
          onChange={(e) => onChange('name', e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          margin="dense"
          label="提示词内容"
          fullWidth
          multiline
          rows={8}
          variant="outlined"
          value={template.content}
          onChange={(e) => onChange('content', e.target.value)}
          placeholder="输入提示词内容..."
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button 
          onClick={() => onSave(template)}
          variant="contained" 
          disabled={!isValid}
        >
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 