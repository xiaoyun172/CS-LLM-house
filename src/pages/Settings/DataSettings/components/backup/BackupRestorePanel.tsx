import React, { useState } from 'react';
import { Paper, LinearProgress, Typography, Box, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';
import BackupHeader from './BackupHeader';
import BackupButtons from './BackupButtons';
import BackupFilesList from './BackupFilesList';
import CustomBackupDialog from './CustomBackupDialog';
import ImportExternalBackupDialog from './ImportExternalBackupDialog';
import DatabaseDiagnosticDialog from './DatabaseDiagnosticDialog';
import NotificationSnackbar from './NotificationSnackbar';
import {
  prepareBasicBackupData,
  prepareFullBackupData,
  ensureBackupDirectory,
  createAndShareBackupFile
} from '../../utils/backupUtils';
import {
  performCustomBackup
} from '../../utils/customBackupUtils';
import type { CustomBackupOptions } from '../../utils/customBackupUtils';
import {
  readJSONFromFile,
  performFullRestore,
} from '../../utils/restoreUtils';
import { dexieStorage } from '../../../../../shared/services/DexieStorageService';

/**
 * 备份恢复面板组件
 */
const BackupRestorePanel: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState({
    active: false,
    stage: '',
    progress: 0
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info' as 'success' | 'error' | 'info' | 'warning'
  });

  // 备份文件列表刷新触发器
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 自定义备份对话框状态
  const [customBackupOpen, setCustomBackupOpen] = useState(false);
  const [customBackupOptions, setCustomBackupOptions] = useState<CustomBackupOptions>({
    topics: true,
    assistants: true,
    settings: true,
    modelSettings: true,
    uiSettings: true,
    backupSettings: true,
    shortcutPhrases: true,
    otherData: true
  });

  // 外部备份导入对话框状态
  const [importExternalOpen, setImportExternalOpen] = useState(false);

  // 清理确认对话框状态
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  // 数据库诊断对话框状态
  const [databaseDiagnosticOpen, setDatabaseDiagnosticOpen] = useState(false);

  // 显示提示信息
  const showMessage = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  // 关闭提示信息
  const handleCloseSnackbar = () => {
    setSnackbar({...snackbar, open: false});
  };

  // 刷新备份文件列表
  const refreshBackupFilesList = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // 处理基本备份
  const handleBasicBackup = async () => {
    try {
      setIsLoading(true);

      // 确保目录存在
      await ensureBackupDirectory();

      // 准备备份数据
      const backupData = await prepareBasicBackupData();

      // 创建文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `AetherLink_Backup_${timestamp}.json`;

      // 创建并共享备份文件
      await createAndShareBackupFile(
        fileName,
        backupData,
        (message) => showMessage(message, 'success'),
        (error) => showMessage('创建备份失败: ' + error.message, 'error'),
        refreshBackupFilesList // 添加备份完成后的回调
      );
    } catch (error) {
      console.error('创建备份失败:', error);
      showMessage('创建备份失败: ' + (error instanceof Error ? error.message : '未知错误'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 处理完整备份
  const handleFullBackup = async () => {
    try {
      setIsLoading(true);

      // 准备完整备份数据
      const backupData = await prepareFullBackupData();

      // 创建文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `AetherLink_Backup_Full_${timestamp}.json`;

      // 创建并共享备份文件
      await createAndShareBackupFile(
        fileName,
        backupData,
        (message) => showMessage(message, 'info'),
        (error) => showMessage('创建备份失败: ' + error.message, 'error'),
        refreshBackupFilesList // 添加备份完成后的回调
      );
    } catch (error) {
      console.error('创建自定义位置备份失败:', error);
      showMessage('创建备份失败: ' + (error instanceof Error ? error.message : '未知错误'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 处理自定义备份选项变更
  const handleCustomBackupOptionChange = (option: keyof CustomBackupOptions) => {
    setCustomBackupOptions(prev => {
      // 如果取消了settings选项，则启用modelSettings和uiSettings
      if (option === 'settings' && prev.settings) {
        return {
          ...prev,
          [option]: !prev[option]
        };
      }

      // 如果选中了settings选项，则禁用modelSettings和uiSettings
      if (option === 'settings' && !prev.settings) {
        return {
          ...prev,
          [option]: !prev[option],
          modelSettings: false,
          uiSettings: false
        };
      }

      return {
        ...prev,
        [option]: !prev[option]
      };
    });
  };

  // 打开自定义备份对话框
  const openCustomBackupDialog = () => {
    setCustomBackupOptions({
      topics: true,
      assistants: true,
      settings: true,
      modelSettings: true,
      uiSettings: true,
      backupSettings: true,
      shortcutPhrases: true,
      otherData: true
    });
    setCustomBackupOpen(true);
  };

  // 关闭自定义备份对话框
  const closeCustomBackupDialog = () => {
    setCustomBackupOpen(false);
  };

  // 打开导入外部备份对话框
  const openImportExternalDialog = () => {
    setImportExternalOpen(true);
  };

  // 关闭导入外部备份对话框
  const closeImportExternalDialog = () => {
    setImportExternalOpen(false);
  };

  // 执行自定义备份
  const handleCustomBackup = async () => {
    try {
      setIsLoading(true);
      closeCustomBackupDialog();

      // 执行自定义备份
      await performCustomBackup(
        customBackupOptions,
        (message) => {
          showMessage(message, 'info');
          // 在备份完成后刷新文件列表
          refreshBackupFilesList();
        },
        (error) => showMessage('创建自定义备份失败: ' + error.message, 'error')
      );
    } catch (error) {
      console.error('创建自定义备份失败:', error);
      showMessage('创建备份失败: ' + (error instanceof Error ? error.message : '未知错误'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 处理恢复备份
  const handleRestore = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';

      input.onchange = async (e: Event) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];

        if (!file) return;

        setIsLoading(true);
        setRestoreProgress({
          active: true,
          stage: '读取文件中...',
          progress: 0.05
        });

        try {
          // 读取JSON数据
          const backupData = await readJSONFromFile(file);
          setRestoreProgress({
            active: true,
            stage: '验证备份数据...',
            progress: 0.1
          });

          // 使用新的完整恢复过程
          const result = await performFullRestore(backupData, (stage, progress) => {
            setRestoreProgress({
              active: true,
              stage,
              progress
            });
          });

          // 处理恢复结果
          if (result.success) {
            // 生成成功消息
            let restoreMessage = '';

            if (result.topicsCount > 0) {
              restoreMessage += `• 已恢复 ${result.topicsCount} 个对话话题\n`;
            }

            if (result.assistantsCount > 0) {
              restoreMessage += `• 已恢复 ${result.assistantsCount} 个助手\n`;
            }

            if (result.settingsRestored) {
              restoreMessage += `• 已恢复应用设置\n`;
            }

            if (result.localStorageCount > 0) {
              restoreMessage += `• 已恢复 ${result.localStorageCount} 项其他应用数据\n`;
            }

            showMessage(`备份恢复成功：\n${restoreMessage}\n请重启应用以应用所有更改`, 'success');
          } else {
            // 显示错误信息
            showMessage(`恢复备份失败: ${result.error || '未知错误'}`, 'error');
          }
        } catch (error) {
          console.error('恢复备份失败:', error);
          showMessage('恢复备份失败: ' + (error instanceof Error ? error.message : '未知错误'), 'error');
        } finally {
          setIsLoading(false);
          // 恢复完成后重置进度条
          setTimeout(() => {
            setRestoreProgress({
              active: false,
              stage: '',
              progress: 0
            });
          }, 1000);
        }
      };

      input.click();
    } catch (error) {
      console.error('打开文件选择器失败:', error);
      showMessage('打开文件选择器失败: ' + (error instanceof Error ? error.message : '未知错误'), 'error');
      setIsLoading(false);
      setRestoreProgress({
        active: false,
        stage: '',
        progress: 0
      });
    }
  };

  // 处理清理所有数据
  const handleClearAll = () => {
    // 打开确认对话框
    setClearConfirmOpen(true);
  };

  // 确认彻底清理所有数据
  const confirmClearAll = async () => {
    setClearConfirmOpen(false);
    setIsLoading(true);
    
    try {
      // 使用dexieStorage清理所有数据
      await dexieStorage.clearDatabase();
      
      // 显示成功消息
      showMessage('所有数据已彻底清除', 'success');
      refreshBackupFilesList(); // 刷新备份文件列表
    } catch (error) {
      console.error('确认清理所有数据时出错:', error);
      showMessage('清理数据时发生错误: ' + (error instanceof Error ? error.message : String(error)), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 取消清理
  const cancelClearAll = () => {
    setClearConfirmOpen(false);
  };

  // 打开数据库诊断对话框
  const openDatabaseDiagnosticDialog = () => {
    setDatabaseDiagnosticOpen(true);
  };

  // 关闭数据库诊断对话框
  const closeDatabaseDiagnosticDialog = () => {
    setDatabaseDiagnosticOpen(false);
  };

  // 处理备份文件列表中的还原成功
  const handleBackupRestoreSuccess = (message: string) => {
    showMessage(message, 'success');
  };

  // 处理备份文件列表中的错误
  const handleBackupError = (message: string) => {
    showMessage(message, 'error');
  };

  // 处理备份文件删除
  const handleFileDeleted = () => {
    showMessage('备份文件已删除', 'info');
    // 刷新备份文件列表
    refreshBackupFilesList();
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        mb: 3,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      }}
    >
      <BackupHeader />

      {/* 恢复进度 */}
      {restoreProgress.active && (
        <Box sx={{ mb: 3, mt: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {restoreProgress.stage}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={restoreProgress.progress * 100}
            sx={{
              height: 8,
              borderRadius: 4,
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
              }
            }}
          />
        </Box>
      )}

      <BackupButtons
        isLoading={isLoading}
        onBasicBackup={handleBasicBackup}
        onFullBackup={handleFullBackup}
        onCustomBackup={openCustomBackupDialog}
        onRestore={handleRestore}
        onImportExternal={openImportExternalDialog}
        onClearAll={handleClearAll}
        onDiagnoseDatabase={openDatabaseDiagnosticDialog}
      />

      {/* 备份文件列表 */}
      <BackupFilesList
        onRestoreSuccess={handleBackupRestoreSuccess}
        onRestoreError={handleBackupError}
        onFileDeleted={handleFileDeleted}
        refreshTrigger={refreshTrigger}
      />

      {/* 自定义备份对话框 */}
      <CustomBackupDialog
        open={customBackupOpen}
        options={customBackupOptions}
        isLoading={isLoading}
        onClose={closeCustomBackupDialog}
        onOptionChange={handleCustomBackupOptionChange}
        onBackup={handleCustomBackup}
      />

      {/* 清理确认对话框 */}
      <Dialog
        open={clearConfirmOpen}
        onClose={cancelClearAll}
        aria-labelledby="clear-dialog-title"
        aria-describedby="clear-dialog-description"
      >
        <DialogTitle id="clear-dialog-title" color="error">
          确认彻底清理所有应用数据
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="clear-dialog-description">
            <strong>警告：这是一个彻底清理操作！</strong><br/><br/>
            此操作将永久删除以下所有数据：<br/>
            • 所有对话话题及其消息<br/>
            • 所有助手及其配置<br/>
            • 助手与话题的关联关系<br/>
            • 相关缓存和暂存数据<br/><br/>
            清理后数据无法恢复，强烈建议在清理前进行完整备份。<br/><br/>
            清理完成后，应用将恢复到初始状态，请重启应用以确保更改生效。<br/><br/>
            是否确认继续？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelClearAll} color="primary">
            取消
          </Button>
          <Button onClick={confirmClearAll} color="error" variant="contained">
            确认彻底清理
          </Button>
        </DialogActions>
      </Dialog>

      <NotificationSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={handleCloseSnackbar}
      />

      {/* 导入外部AI备份对话框 */}
      <ImportExternalBackupDialog
        open={importExternalOpen}
        onClose={closeImportExternalDialog}
        onImportSuccess={handleBackupRestoreSuccess}
        onImportError={handleBackupError}
      />

      {/* 数据库诊断对话框 */}
      <DatabaseDiagnosticDialog
        open={databaseDiagnosticOpen}
        onClose={closeDatabaseDiagnosticDialog}
      />
    </Paper>
  );
};

export default BackupRestorePanel;