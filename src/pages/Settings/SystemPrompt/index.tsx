import React, { useState, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Container
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { DefaultPromptSection } from './DefaultPromptSection';
import { TemplateList } from './TemplateList';
import { TemplateEditDialog } from './TemplateEditDialog';
import { styles } from './styles';
import type { SystemPromptTemplate } from './types';
import {
  loadTemplates,
  saveTemplates,
  loadDefaultPrompt,
  saveDefaultPrompt,
  loadUseDefaultPrompt,
  saveUseDefaultPrompt,
  createTemplate
} from './service';

/**
 * 系统提示词管理 - 主页面UI组件
 * 提供系统提示词的管理功能，包括默认提示词设置和模板管理
 */
const SystemPromptSettings: React.FC = () => {
  const navigate = useNavigate();
  
  // 状态管理
  const [templates, setTemplates] = useState<SystemPromptTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<SystemPromptTemplate | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [defaultPrompt, setDefaultPrompt] = useState('');
  const [useDefaultPrompt, setUseDefaultPrompt] = useState(true);
  
  // 初始化加载数据
  useEffect(() => {
    setTemplates(loadTemplates());
    setDefaultPrompt(loadDefaultPrompt());
    setUseDefaultPrompt(loadUseDefaultPrompt());
  }, []);
  
  // 保存模板变更
  useEffect(() => {
    if (templates.length > 0) {
      saveTemplates(templates);
    }
  }, [templates]);
  
  // 保存默认提示词变更
  useEffect(() => {
    if (defaultPrompt) {
      saveDefaultPrompt(defaultPrompt);
    }
  }, [defaultPrompt]);
  
  // 保存是否使用默认提示词
  useEffect(() => {
    saveUseDefaultPrompt(useDefaultPrompt);
  }, [useDefaultPrompt]);
  
  // 返回上一页
  const handleBack = () => {
    navigate(-1);
  };
  
  // 打开添加模板对话框
  const handleAddTemplate = () => {
    setEditingTemplate({
      id: '',
      name: '',
      content: '',
      isDefault: false
    });
    setShowEditDialog(true);
  };
  
  // 打开编辑模板对话框
  const handleEditTemplate = (template: SystemPromptTemplate) => {
    setEditingTemplate({...template});
    setShowEditDialog(true);
  };
  
  // 修改编辑中的模板字段
  const handleChangeTemplateField = (field: keyof SystemPromptTemplate, value: string) => {
    if (editingTemplate) {
      setEditingTemplate({
        ...editingTemplate,
        [field]: value
      });
    }
  };
  
  // 保存模板
  const handleSaveTemplate = (template: SystemPromptTemplate) => {
    if (template.id) {
      // 更新现有模板
      setTemplates(templates.map(t => 
        t.id === template.id ? template : t
      ));
    } else {
      // 添加新模板
      const newTemplate = createTemplate({
        name: template.name,
        content: template.content,
        isDefault: template.isDefault
      });
      setTemplates([...templates, newTemplate]);
    }
    setShowEditDialog(false);
  };
  
  // 删除模板
  const handleDeleteTemplate = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
  };
  
  // 设置默认模板
  const handleSetDefaultTemplate = (id: string) => {
    const updatedTemplates = templates.map(t => ({
      ...t,
      isDefault: t.id === id
    }));
    
    setTemplates(updatedTemplates);
    
    // 更新默认提示词
    const defaultTemplate = updatedTemplates.find(t => t.isDefault);
    if (defaultTemplate) {
      setDefaultPrompt(defaultTemplate.content);
    }
  };
  
  // 复制模板
  const handleDuplicateTemplate = (template: SystemPromptTemplate) => {
    const duplicate = createTemplate({
      name: `${template.name} (复制)`,
      content: template.content,
      isDefault: false
    });
    setTemplates([...templates, duplicate]);
  };
  
  // 处理默认提示词变更
  const handleChangeDefaultPrompt = (value: string) => {
    setDefaultPrompt(value);
    
    // 同时更新默认模板内容
    const defaultTemplate = templates.find(t => t.isDefault);
    if (defaultTemplate) {
      setTemplates(templates.map(t => 
        t.isDefault ? {...t, content: value} : t
      ));
    }
  };

  return (
    <Box sx={styles.container}>
      <AppBar position="fixed" elevation={0} sx={styles.appBar}>
        <Toolbar>
          <IconButton
            edge="start"
            onClick={handleBack}
            sx={styles.backButton}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={styles.title}>
            系统提示词管理
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Box sx={styles.contentArea}>
        <Container maxWidth="md">
          <DefaultPromptSection 
            defaultPrompt={defaultPrompt}
            useDefaultPrompt={useDefaultPrompt}
            onChangeDefaultPrompt={handleChangeDefaultPrompt}
            onToggleUseDefault={setUseDefaultPrompt}
          />
          
          <TemplateList 
            templates={templates}
            onAddTemplate={handleAddTemplate}
            onSetDefault={handleSetDefaultTemplate}
            onDuplicate={handleDuplicateTemplate}
            onEdit={handleEditTemplate}
            onDelete={handleDeleteTemplate}
          />
        </Container>
      </Box>
      
      <TemplateEditDialog 
        open={showEditDialog}
        template={editingTemplate}
        onClose={() => setShowEditDialog(false)}
        onSave={handleSaveTemplate}
        onChange={handleChangeTemplateField}
      />
    </Box>
  );
};

export default SystemPromptSettings; 