import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  IconButton, 
  Typography,
  Box,
  Alert,
  useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { ChatTopic, Assistant } from '../shared/types/Assistant';
import { TopicService } from '../shared/services/TopicService';
import { AssistantManager } from '../shared/services/assistant/AssistantManager';

interface SystemPromptDialogProps {
  open: boolean;
  onClose: () => void;
  topic: ChatTopic | null;
  assistant: Assistant | null;
}

/**
 * 系统提示词编辑对话框
 * 用于编辑当前话题的系统提示词
 */
const SystemPromptDialog: React.FC<SystemPromptDialogProps> = ({ 
  open, 
  onClose, 
  topic, 
  assistant 
}) => {
  const theme = useTheme();
  const [prompt, setPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const [tokensCount, setTokensCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // 当对话框打开时，初始化提示词
  useEffect(() => {
    if (open) {
      // 优先使用话题的提示词
      setPrompt(topic?.prompt || assistant?.systemPrompt || '');
      
      // 简单估算token数量 (英文按照单词计算，中文按照字符计算)
      const text = topic?.prompt || assistant?.systemPrompt || '';
      const estimatedTokens = Math.ceil(text.split(/\s+/).length + 
        text.replace(/[\u4e00-\u9fa5]/g, '').length / 4);
      setTokensCount(estimatedTokens);
      
      // 重置错误状态
      setError(null);
    }
  }, [open, topic, assistant]);

  // 保存提示词
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // 如果没有话题但有助手，先创建话题
      if (!topic && assistant) {
        console.log('没有当前话题，尝试创建新话题');
        const newTopic = await TopicService.createNewTopic();
        
        if (newTopic) {
          console.log('成功创建新话题:', newTopic.id);
          
          // 更新新话题的提示词
          newTopic.prompt = prompt.trim();
          await TopicService.saveTopic(newTopic);
          
          // 同时更新助手的系统提示词
          if (assistant.systemPrompt !== undefined) {
            const updatedAssistant = { 
              ...assistant, 
              systemPrompt: prompt.trim() 
            };
            await AssistantManager.updateAssistant(updatedAssistant);
          }
          
          onClose();
          return;
        } else {
          throw new Error('创建话题失败');
        }
      }
      
      // 更新现有话题提示词
      if (topic) {
        console.log('更新现有话题的系统提示词');
        const updatedTopic = { ...topic, prompt: prompt.trim() };
        await TopicService.saveTopic(updatedTopic);
        
        // 如果助手也有systemPrompt字段，同步更新助手的系统提示词
        if (assistant && assistant.systemPrompt !== undefined) {
          const updatedAssistant = { 
            ...assistant, 
            systemPrompt: prompt.trim() 
          };
          await AssistantManager.updateAssistant(updatedAssistant);
        }
      }
      
      onClose();
    } catch (error) {
      console.error('保存系统提示词失败:', error);
      setError(error instanceof Error ? error.message : '保存系统提示词失败');
    } finally {
      setSaving(false);
    }
  };

  // 当提示词变化时，更新token计数
  const handlePromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setPrompt(text);
    
    // 简单估算token数量
    const estimatedTokens = Math.ceil(text.split(/\s+/).length + 
      text.replace(/[\u4e00-\u9fa5]/g, '').length / 4);
    setTokensCount(estimatedTokens);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: '12px',
          margin: '16px',
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: `1px solid ${theme.palette.divider}`,
        pb: 1
      }}>
        <Typography variant="h6">系统提示词设置</Typography>
        <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 2, pb: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {!topic && !saving && (
          <Alert severity="info" sx={{ mb: 2 }}>
            保存将创建新话题并应用此系统提示词
          </Alert>
        )}
        
        <TextField
          autoFocus
          multiline
          fullWidth
          variant="outlined"
          placeholder="输入系统提示词..."
          value={prompt}
          onChange={handlePromptChange}
          rows={8}
          sx={{ mb: 1 }}
        />
        
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'flex-end',
          color: theme.palette.text.secondary,
          fontSize: '0.75rem'
        }}>
          <Typography variant="caption">
            估计Token数量: {tokensCount}
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ 
        padding: '8px 24px 16px 24px',
        borderTop: `1px solid ${theme.palette.divider}`,
      }}>
        <Button onClick={onClose} color="inherit">
          取消
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          color="primary"
          disabled={saving}
        >
          {saving ? '保存中...' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SystemPromptDialog; 