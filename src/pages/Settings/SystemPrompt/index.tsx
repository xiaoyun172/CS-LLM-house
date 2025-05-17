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
import { SystemPromptService } from '../../../shared/services/SystemPromptService';
import type { SystemPromptTemplate } from '../../../shared/services/SystemPromptService';

/**
 * 系统提示词管理 - 主页面UI组件
 * 提供系统提示词的管理功能，包括默认提示词设置和模板管理
 */
const SystemPromptSettings: React.FC = () => {
  const navigate = useNavigate();
  const promptService = SystemPromptService.getInstance();

  // 状态管理
  const [templates, setTemplates] = useState<SystemPromptTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<SystemPromptTemplate | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [defaultPrompt, setDefaultPrompt] = useState('');
  const [useDefaultPrompt, setUseDefaultPrompt] = useState(true);

  // 初始化加载数据
  useEffect(() => {
    const initializeData = async () => {
      // 直接获取数据，不再调用initialize()，因为它现在通过Redux thunk初始化
      setTemplates(promptService.getTemplates());
      setDefaultPrompt(promptService.getDefaultPrompt());
      setUseDefaultPrompt(promptService.getUseDefaultPrompt());
    };

    initializeData();
  }, []);

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
      await promptService.updateTemplate(template);
    } else {
      // 添加新模板
      await promptService.addTemplate(template.name, template.content, template.isDefault);
    }

    // 重新加载模板列表
    setTemplates(promptService.getTemplates());
    setDefaultPrompt(promptService.getDefaultPrompt());

    setShowEditDialog(false);
  };

  // 删除模板
  const handleDeleteTemplate = async (id: string) => {
    await promptService.deleteTemplate(id);
    setTemplates(promptService.getTemplates());
    setDefaultPrompt(promptService.getDefaultPrompt());
  };

  // 设置默认模板
  const handleSetDefaultTemplate = async (id: string) => {
    await promptService.setDefaultTemplate(id);
    setTemplates(promptService.getTemplates());
    setDefaultPrompt(promptService.getDefaultPrompt());
  };

  // 复制模板
  const handleDuplicateTemplate = async (template: SystemPromptTemplate) => {
    await promptService.duplicateTemplate(template.id);
    setTemplates(promptService.getTemplates());
  };

  // 处理默认提示词变更
  const handleChangeDefaultPrompt = async (value: string) => {
    await promptService.setDefaultPrompt(value);
    setDefaultPrompt(value);
    setTemplates(promptService.getTemplates());
  };

  // 处理是否使用默认提示词变更
  const handleToggleUseDefaultPrompt = async (value: boolean) => {
    await promptService.setUseDefaultPrompt(value);
    setUseDefaultPrompt(value);
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