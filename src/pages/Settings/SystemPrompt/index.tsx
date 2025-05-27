import React, { useState, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Container,
  CircularProgress
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { DefaultPromptSection } from './DefaultPromptSection';
import { TemplateList } from './TemplateList';
import { TemplateEditDialog } from './TemplateEditDialog';
import { styles } from './styles';
import type { SystemPromptTemplate } from '../../../shared/services/SystemPromptService';
import { useAppSelector, useAppDispatch } from '../../../shared/store';
import {
  setDefaultSystemPrompt,
  setUseDefaultPrompt,
  addPromptTemplate,
  updatePromptTemplate,
  deletePromptTemplate,
  loadSystemPrompts
} from '../../../shared/store/slices/systemPromptsSlice';

/**
 * 系统提示词管理 - 主页面UI组件
 * 提供系统提示词的管理功能，包括默认提示词设置和模板管理
 */
const SystemPromptSettings: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  // 从Redux状态获取数据
  const { templates, defaultPrompt, useDefaultPrompt, loading, error } = useAppSelector(
    (state) => state.systemPrompts
  );

  // 状态管理
  const [editingTemplate, setEditingTemplate] = useState<SystemPromptTemplate | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // 初始化加载数据
  useEffect(() => {
    // 确保系统提示词数据已加载
    dispatch(loadSystemPrompts());
  }, [dispatch]);

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
  const handleChangeTemplateField = (field: keyof SystemPromptTemplate, value: string | boolean) => {
    if (editingTemplate) {
      setEditingTemplate({
        ...editingTemplate,
        [field]: value
      });
    }
  };

  // 保存模板
  const handleSaveTemplate = async (template: SystemPromptTemplate) => {
    if (template.id) {
      // 更新现有模板
      dispatch(updatePromptTemplate(template));
    } else {
      // 添加新模板
      dispatch(addPromptTemplate({
        ...template,
        id: crypto.randomUUID(), // 使用随机ID
        createdAt: Date.now(),
        updatedAt: Date.now()
      }));
    }

    setShowEditDialog(false);
  };

  // 删除模板
  const handleDeleteTemplate = async (id: string) => {
    dispatch(deletePromptTemplate(id));
  };

  // 设置默认模板
  const handleSetDefaultTemplate = async (id: string) => {
    // 找到模板
    const template = templates.find(t => t.id === id);
    if (!template) return;
    
    // 更新所有模板，将当前模板设为默认
    const updatedTemplates = templates.map(t => ({
      ...t,
      isDefault: t.id === id
    }));
    
    // 更新默认提示词内容
    dispatch(setDefaultSystemPrompt(template.content));
    
    // 更新每个模板
    updatedTemplates.forEach(template => {
      dispatch(updatePromptTemplate(template));
    });
  };

  // 复制模板
  const handleDuplicateTemplate = async (template: SystemPromptTemplate) => {
    const now = Date.now();
    const duplicatedTemplate: SystemPromptTemplate = {
      id: crypto.randomUUID(),
      name: `${template.name} (复制)`,
      content: template.content,
      isDefault: false,
      createdAt: now,
      updatedAt: now
    };
    
    dispatch(addPromptTemplate(duplicatedTemplate));
  };

  // 处理默认提示词变更
  const handleChangeDefaultPrompt = async (value: string) => {
    dispatch(setDefaultSystemPrompt(value));
    
    // 同时更新默认模板的内容
    const defaultTemplate = templates.find(t => t.isDefault);
    if (defaultTemplate) {
      dispatch(updatePromptTemplate({
        ...defaultTemplate,
        content: value,
        updatedAt: Date.now()
      }));
    }
  };

  // 处理是否使用默认提示词变更
  const handleToggleUseDefaultPrompt = async (value: boolean) => {
    dispatch(setUseDefaultPrompt(value));
  };

  // 显示加载状态
  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  // 显示错误状态
  if (error) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        p: 3
      }}>
        <Typography color="error" variant="h6" gutterBottom>
          加载系统提示词数据失败
        </Typography>
        <Typography color="text.secondary">
          {error}
        </Typography>
      </Box>
    );
  }

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
            onToggleUseDefault={handleToggleUseDefaultPrompt}
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