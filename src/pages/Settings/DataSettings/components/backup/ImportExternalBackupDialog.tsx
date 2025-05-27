import React, { useState } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Box,
  Typography,
  Alert,
  AlertTitle,
  CircularProgress,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadDoneIcon from '@mui/icons-material/FileDownloadDone';
import ChatIcon from '@mui/icons-material/Chat';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { importExternalBackupFromFile } from '../../utils/restoreUtils';

interface ImportExternalBackupDialogProps {
  open: boolean;
  onClose: () => void;
  onImportSuccess: (message: string) => void;
  onImportError: (message: string) => void;
}

const ImportExternalBackupDialog: React.FC<ImportExternalBackupDialogProps> = ({
  open,
  onClose,
  onImportSuccess,
  onImportError
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    topicsCount: number;
    assistantsCount: number;
    source: string;
    error?: string;
  } | null>(null);

  // 处理导入操作
  const handleImport = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';

      input.onchange = async (e: Event) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];

        if (!file) return;

        setIsLoading(true);

        try {
          // 导入外部备份
          const result = await importExternalBackupFromFile(file);
          setImportResult(result);

          if (result.success) {
            // 生成成功消息
            let importMessage = `从 ${getSourceName(result.source)} 导入成功：\n`;

            if (result.topicsCount > 0) {
              importMessage += `• 已导入 ${result.topicsCount} 个对话话题\n`;
            }

            if (result.assistantsCount > 0) {
              importMessage += `• 已创建 ${result.assistantsCount} 个助手\n`;
            }

            // 成功导入，但不关闭对话框，等用户点击确认
          } else {
            // 导入失败，显示错误信息
            onImportError(`导入外部备份失败: ${result.error || '未知错误'}`);
            handleClose();
          }
        } catch (error) {
          console.error('导入外部备份失败:', error);
          onImportError('导入外部备份失败: ' + (error instanceof Error ? error.message : '未知错误'));
          handleClose();
        } finally {
          setIsLoading(false);
        }
      };

      input.click();
    } catch (error) {
      console.error('打开文件选择器失败:', error);
      onImportError('打开文件选择器失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 获取来源名称
  const getSourceName = (source: string): string => {
    switch (source) {
      case 'desktop':
        return 'Cherry Stuido 电脑版';
      case 'chatboxai':
        return 'ChatboxAI';
      default:
        return '外部AI助手';
    }
  };

  // 处理关闭对话框
  const handleClose = () => {
    if (!isLoading) {
      setImportResult(null);
      onClose();
    }
  };

  // 处理确认完成
  const handleConfirm = () => {
    if (importResult && importResult.success) {
      // 生成成功消息
      let importMessage = `从 ${getSourceName(importResult.source)} 导入成功：\n`;

      if (importResult.topicsCount > 0) {
        importMessage += `• 已导入 ${importResult.topicsCount} 个对话话题\n`;
      }

      if (importResult.assistantsCount > 0) {
        importMessage += `• 已创建 ${importResult.assistantsCount} 个助手\n`;
      }

      onImportSuccess(importMessage);
    }
    handleClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
        }
      }}
    >
      <DialogTitle>
        导入外部AI助手的聊天记录
      </DialogTitle>

      <DialogContent>
        {!importResult && (
          <>
            <DialogContentText sx={{ mb: 2 }}>
              支持的备份格式：
            </DialogContentText>

            <Box sx={{ mb: 2 }}>
              <Chip
                label="Cherry Stuido 电脑版"
                color="secondary"
                sx={{ mr: 1, mb: 1 }}
              />
              <Chip
                label="ChatboxAI"
                color="primary"
                sx={{ mr: 1, mb: 1 }}
              />
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
              <AlertTitle>如何导入</AlertTitle>
              • <strong>Cherry Stuido 电脑版</strong>：支持导入电脑版的完整备份文件，包含所有对话记录和消息块数据<br/>
              • <strong>ChatboxAI</strong>：从 ChatboxAI 导出的备份文件将被转换为 AetherLink 格式<br/>
              • 导入的数据将创建对应的助手和对话，保持原有的对话结构
            </Alert>

            <Button
              variant="contained"
              startIcon={isLoading ? <CircularProgress size={24} color="inherit" /> : <FileUploadIcon />}
              fullWidth
              onClick={handleImport}
              disabled={isLoading}
              sx={{
                py: 1.5,
                borderRadius: 2,
                background: 'linear-gradient(90deg, #9333EA, #754AB4)',
                fontWeight: 600,
                '&:hover': {
                  background: 'linear-gradient(90deg, #8324DB, #6D3CAF)',
                },
              }}
            >
              {isLoading ? '导入中...' : '选择并导入备份文件'}
            </Button>
          </>
        )}

        {importResult && importResult.success && (
          <>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              <FileDownloadDoneIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
              <Typography variant="h6" color="success.main">
                导入成功
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                已从 {getSourceName(importResult.source)} 导入数据
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <List>
              <ListItem>
                <ListItemIcon>
                  <ChatIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={`${importResult.topicsCount} 个对话话题`}
                  secondary="导入的对话将出现在您的对话列表中"
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <SmartToyIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={`${importResult.assistantsCount} 个助手`}
                  secondary={`已创建"${getSourceName(importResult.source)} 导入助手"`}
                />
              </ListItem>
            </List>

            <Alert severity="success" sx={{ mt: 2 }}>
              导入操作已完成，您可以在助手列表中找到新创建的助手及其对话。
            </Alert>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={handleClose}
          color="inherit"
          disabled={isLoading}
        >
          取消
        </Button>

        {importResult && importResult.success && (
          <Button
            onClick={handleConfirm}
            variant="contained"
            color="primary"
          >
            完成
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ImportExternalBackupDialog;