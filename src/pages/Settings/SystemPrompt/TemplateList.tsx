import React from 'react';
import {
  Box,
  Typography,
  Button,
  List,
  Paper,
  Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { PromptTemplateItem } from './PromptTemplateItem';
import { styles } from './styles';
import type { SystemPromptTemplate } from './types';

/**
 * 系统提示词管理 - 提示词模板列表UI组件
 * 显示所有可用的提示词模板，并提供添加新模板的按钮
 */
interface TemplateListProps {
  templates: SystemPromptTemplate[];
  onAddTemplate: () => void;
  onSetDefault: (id: string) => void;
  onDuplicate: (template: SystemPromptTemplate) => void;
  onEdit: (template: SystemPromptTemplate) => void;
  onDelete: (id: string) => void;
}

export const TemplateList: React.FC<TemplateListProps> = ({
  templates,
  onAddTemplate,
  onSetDefault,
  onDuplicate,
  onEdit,
  onDelete
}) => {
  return (
    <>
      <Box sx={styles.headerContainer}>
        <Typography variant="subtitle1">
          提示词模板
        </Typography>
        <Button 
          variant="outlined" 
          startIcon={<AddIcon />}
          onClick={onAddTemplate}
        >
          添加模板
        </Button>
      </Box>
      
      <Paper
        elevation={0}
        sx={styles.paper}
      >
        <List sx={{ p: 0 }}>
          {templates.map((template, index) => (
            <React.Fragment key={template.id}>
              {index > 0 && <Divider />}
              <PromptTemplateItem
                template={template}
                onSetDefault={onSetDefault}
                onDuplicate={onDuplicate}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </React.Fragment>
          ))}
        </List>
      </Paper>
    </>
  );
}; 