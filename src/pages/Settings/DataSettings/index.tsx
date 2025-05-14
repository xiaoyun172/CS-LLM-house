import React, { useState } from 'react';
import {
  Box,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Container,
  Paper,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  Avatar
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BackupIcon from '@mui/icons-material/Backup';
import RestoreIcon from '@mui/icons-material/Restore';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FolderIcon from '@mui/icons-material/Folder';
import InfoIcon from '@mui/icons-material/Info';
import SettingsIcon from '@mui/icons-material/Settings';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore';
import BackupTableIcon from '@mui/icons-material/BackupTable';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import { useNavigate } from 'react-router-dom';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import { Share } from '@capacitor/share';
import { getAllTopicsFromDB, getAllAssistantsFromDB, saveTopicToDB, saveAssistantToDB } from '../../../shared/services/storageService';
import { alpha } from '@mui/material/styles';

// 默认备份目录
const DEFAULT_BACKUP_DIRECTORY = 'AetherLink/backups';

const DataSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [backups, setBackups] = useState<{name: string, path: string, date: Date, isExternal?: boolean}[]>([]);
  const [backupPath, setBackupPath] = useState<string>('');
  const [backupLocation, setBackupLocation] = useState<string>(
    localStorage.getItem('backup-location') || DEFAULT_BACKUP_DIRECTORY
  );
  const [backupStorageType, setBackupStorageType] = useState<'documents' | 'external'>(
    localStorage.getItem('backup-storage-type') === 'external' ? 'external' : 'documents'
  );
  const [openDialog, setOpenDialog] = useState(false);
  const [customFolderName, setCustomFolderName] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info' as 'success' | 'error' | 'info'
  });

  // 返回设置主页
  const handleBack = () => {
    navigate('/settings');
  };

  // 显示提示信息
  const showMessage = (message: string, severity: 'success' | 'error' | 'info' = 'info') => {
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

  // 打开备份设置对话框
  const openBackupSettings = () => {
    setOpenDialog(true);
    setCustomFolderName(backupLocation.split('/').pop() || 'AetherLink_Backups');
  };

  // 关闭备份设置对话框
  const closeBackupSettings = () => {
    setOpenDialog(false);
  };

  // 保存备份设置
  const saveBackupSettings = async () => {
    try {
      let newBackupLocation: string;
      
      if (backupStorageType === 'external') {
        // 使用根目录，必须确保文件夹名合法
        const safeFolderName = customFolderName.replace(/[^a-zA-Z0-9_-]/g, '_');
        newBackupLocation = safeFolderName;
      } else {
        // 使用Documents目录
        newBackupLocation = `AetherLink/${customFolderName.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      }
      
      // 保存设置到localStorage
      localStorage.setItem('backup-location', newBackupLocation);
      localStorage.setItem('backup-storage-type', backupStorageType);
      
      // 更新状态
      setBackupLocation(newBackupLocation);
      
      // 确保目录存在
      await ensureBackupDirectory();
      
      // 加载备份列表
      await loadBackups();
      
      closeBackupSettings();
      showMessage('备份设置已保存', 'success');
    } catch (error) {
      console.error('保存备份设置失败:', error);
      showMessage('保存备份设置失败: ' + (error as Error).message, 'error');
    }
  };

  // 检查和创建备份目录
  const ensureBackupDirectory = async () => {
    try {
      await Filesystem.mkdir({
        path: backupLocation,
        directory: backupStorageType === 'external' ? Directory.External : Directory.Documents,
        recursive: true
      });
      
      // 获取完整路径
      try {
        const uriResult = await Filesystem.getUri({
          path: backupLocation,
          directory: backupStorageType === 'external' ? Directory.External : Directory.Documents
        });
        if (uriResult && uriResult.uri) {
          // 保存完整路径用于显示
          setBackupPath(uriResult.uri);
        }
      } catch (error) {
        console.error('获取备份路径失败:', error);
      }
      
      return true;
    } catch (error) {
      console.error('创建备份目录失败:', error);
      return false;
    }
  };

  // 加载备份列表
  const loadBackups = async () => {
    try {
      setIsLoading(true);
      await ensureBackupDirectory();
      
      const result = await Filesystem.readdir({
        path: backupLocation,
        directory: backupStorageType === 'external' ? Directory.External : Directory.Documents
      });
      
      if (result && result.files) {
        // 按修改时间排序
        const backupFiles = result.files
          .filter(file => file.name.endsWith('.json'))
          .map(file => ({
            name: file.name,
            path: `${backupLocation}/${file.name}`,
            date: new Date(file.mtime || Date.now()),
            isExternal: backupStorageType === 'external'
          }))
          .sort((a, b) => b.date.getTime() - a.date.getTime());
        
        setBackups(backupFiles);
      }
    } catch (error) {
      console.error('加载备份列表失败:', error);
      showMessage('加载备份列表失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 组件加载时获取备份列表
  React.useEffect(() => {
    loadBackups();
  }, [backupLocation, backupStorageType]);

  // 打开备份文件夹
  const openBackupFolder = async () => {
    try {
      // 不能直接打开文件夹，只能显示路径
      const text = `备份存储路径: ${backupPath}`;
      await copyToClipboard(backupPath);
      showMessage(`${text} (已复制到剪贴板)`, 'info');
    } catch (error) {
      console.error('显示备份路径失败:', error);
    }
  };

  // 添加复制到剪贴板功能
  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('复制到剪贴板失败:', error);
      // 备用方法
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        return success;
      } catch (fallbackError) {
        console.error('备用剪贴板方法也失败:', fallbackError);
        return false;
      }
    }
  };

  // 创建备份
  const createBackup = async () => {
    try {
      setIsLoading(true);
      
      // 确保目录存在
      await ensureBackupDirectory();
      
      // 获取数据
      const allTopics = await getAllTopicsFromDB();
      const allAssistants = await getAllAssistantsFromDB();
      
      const backupData = {
        topics: allTopics,
        assistants: allAssistants,
        timestamp: Date.now(),
        appInfo: {
          version: '1.0.0', // 可以从package.json中读取
          name: 'AetherLink'
        }
      };
      
      // 创建文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `AetherLink_Backup_${timestamp}.json`;
      const path = `${backupLocation}/${fileName}`;
      
      // 将JSON转换为字符串
      const jsonString = JSON.stringify(backupData);
      
      // 写入文件 - 使用UTF8编码
      await Filesystem.writeFile({
        path,
        data: jsonString,
        directory: backupStorageType === 'external' ? Directory.External : Directory.Documents,
        recursive: true,
        encoding: Encoding.UTF8
      });
      
      // 获取完整路径
      try {
        const uriResult = await Filesystem.getUri({
          path,
          directory: backupStorageType === 'external' ? Directory.External : Directory.Documents
        });
        
        if (uriResult && uriResult.uri) {
          // 复制到剪贴板
          const copied = await copyToClipboard(uriResult.uri);
          showMessage(`备份创建成功: ${uriResult.uri}${copied ? ' (已复制到剪贴板)' : ''}`, 
            'success');
        } else {
          showMessage('备份创建成功', 'success');
        }
      } catch (pathError) {
        console.error('获取备份路径失败:', pathError);
        showMessage('备份创建成功', 'success');
      }
      
      loadBackups(); // 刷新备份列表
    } catch (error) {
      console.error('创建备份失败:', error);
      showMessage('创建备份失败: ' + (error as Error).message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 恢复备份
  const restoreBackup = async (path: string, isExternal: boolean = false) => {
    try {
      setIsLoading(true);
      
      // 读取备份文件
      const result = await Filesystem.readFile({
        path,
        directory: isExternal ? Directory.External : Directory.Documents,
        encoding: Encoding.UTF8
      });
      
      if (result && result.data) {
        // 确保数据是字符串并解析JSON
        const contentStr = typeof result.data === 'string' 
          ? result.data 
          : new TextDecoder().decode(result.data as any);
        
        const backupData = JSON.parse(contentStr);
        let restoreMessage = ''; // 用于跟踪恢复了哪些数据
        
        // 恢复话题
        if (Array.isArray(backupData.topics)) {
          for (const topic of backupData.topics) {
            await saveTopicToDB(topic);
          }
          restoreMessage += `• 已恢复 ${backupData.topics.length} 个对话话题\n`;
          console.log(`已恢复 ${backupData.topics.length} 个话题`);
        }
        
        // 恢复助手
        if (Array.isArray(backupData.assistants)) {
          for (const assistant of backupData.assistants) {
            await saveAssistantToDB(assistant);
          }
          restoreMessage += `• 已恢复 ${backupData.assistants.length} 个助手\n`;
          console.log(`已恢复 ${backupData.assistants.length} 个助手`);
        }
        
        // 检查备份版本（新格式会有backupVersion字段）
        const isNewFormat = backupData.appInfo && backupData.appInfo.backupVersion >= 2;
        
        // 恢复设置数据（如果存在）
        if (backupData.settings) {
          // 获取当前设置
          const currentSettingsJson = localStorage.getItem('settings');
          const currentSettings = currentSettingsJson ? JSON.parse(currentSettingsJson) : {};
          
          if (isNewFormat) {
            // 新格式 - 恢复完整设置
            localStorage.setItem('settings', JSON.stringify(backupData.settings));
            restoreMessage += '• 已恢复所有应用设置与偏好\n';
          } else {
            // 旧格式 - 只恢复模型和供应商相关设置
            const mergedSettings = {
              ...currentSettings,
              providers: backupData.settings.providers || currentSettings.providers,
              models: backupData.settings.models || currentSettings.models,
              defaultModelId: backupData.settings.defaultModelId || currentSettings.defaultModelId,
              currentModelId: backupData.settings.currentModelId || currentSettings.currentModelId,
            };
            
            // 保存合并后的设置
            localStorage.setItem('settings', JSON.stringify(mergedSettings));
            restoreMessage += '• 已恢复模型和供应商设置\n';
          }
          console.log('已恢复设置数据');
        }
        
        // 恢复备份设置（如果存在）
        if (isNewFormat && backupData.backupSettings) {
          const { location, storageType } = backupData.backupSettings;
          if (location) localStorage.setItem('backup-location', location);
          if (storageType) localStorage.setItem('backup-storage-type', storageType);
          restoreMessage += '• 已恢复备份设置\n';
        }
        
        // 恢复其他localStorage项目（如果存在）
        if (isNewFormat && backupData.localStorage) {
          const keys = Object.keys(backupData.localStorage);
          let restoredCount = 0;
          
          for (const key of keys) {
            // 跳过已经恢复的项目和迁移相关标记
            if (key !== 'settings' && 
                key !== 'backup-location' && 
                key !== 'backup-storage-type' && 
                !key.startsWith('aetherlink-migration') && 
                key !== 'idb-migration-done') {
              
              try {
                const value = backupData.localStorage[key];
                localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
                restoredCount++;
              } catch (e) {
                console.error(`恢复localStorage项 "${key}" 失败:`, e);
              }
            }
          }
          
          if (restoredCount > 0) {
            restoreMessage += `• 已恢复 ${restoredCount} 个其他应用设置\n`;
          }
        }
        
        // 显示详细的恢复信息
        if (restoreMessage) {
          showMessage(`备份恢复成功：\n${restoreMessage}\n请重启应用以应用所有更改`, 'success');
        } else {
          showMessage('备份恢复成功，请重启应用以查看恢复的数据', 'success');
        }
      } else {
        showMessage('备份文件为空或格式错误', 'error');
      }
    } catch (error) {
      console.error('恢复备份失败:', error);
      showMessage('恢复备份失败: ' + (error as Error).message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 导出备份文件
  const exportBackup = async (path: string, name: string, isExternal: boolean = false) => {
    try {
      // 读取备份文件
      const result = await Filesystem.readFile({
        path,
        directory: isExternal ? Directory.External : Directory.Documents,
        encoding: Encoding.UTF8
      });
      
      if (result && result.data) {
        // 确保数据是字符串
        const contentStr = typeof result.data === 'string' 
          ? result.data 
          : new TextDecoder().decode(result.data as any);
          
        // 导出为新路径 - 始终导出到下载目录
        await Filesystem.writeFile({
          path: name,
          data: contentStr,
          directory: Directory.External,
          recursive: true,
          encoding: Encoding.UTF8
        });
        
        // 获取导出的完整路径
        try {
          const uriResult = await Filesystem.getUri({
            path: name,
            directory: Directory.External
          });
          
          if (uriResult && uriResult.uri) {
            // 复制到剪贴板
            const copied = await copyToClipboard(uriResult.uri);
            showMessage(`备份已导出到: ${uriResult.uri}${copied ? ' (已复制到剪贴板)' : ''}`, 
              'success');
          } else {
            showMessage('备份已导出到下载文件夹', 'success');
          }
        } catch (pathError) {
          console.error('获取导出路径失败:', pathError);
          showMessage('备份已导出到下载文件夹', 'success');
        }
      }
    } catch (error) {
      console.error('导出备份失败:', error);
      showMessage('导出备份失败: ' + (error as Error).message, 'error');
    }
  };

  // 删除备份
  const deleteBackup = async (path: string, isExternal: boolean = false) => {
    try {
      await Filesystem.deleteFile({
        path,
        directory: isExternal ? Directory.External : Directory.Documents
      });
      
      showMessage('备份已删除', 'success');
      loadBackups(); // 刷新备份列表
    } catch (error) {
      console.error('删除备份失败:', error);
      showMessage('删除备份失败: ' + (error as Error).message, 'error');
    }
  };

  // 格式化日期显示
  const formatDate = (date: Date) => {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 格式化存储位置显示
  const getLocationDisplay = () => {
    if (backupStorageType === 'external') {
      return `内部存储/${backupLocation}`;
    } else {
      return `Documents/${backupLocation}`;
    }
  };

  // 真正的自定义位置备份（调用系统文件管理器）
  const createCustomLocationBackup = async () => {
    try {
      setIsLoading(true);
      
      // 获取对话和助手数据
      const allTopics = await getAllTopicsFromDB();
      const allAssistants = await getAllAssistantsFromDB();
      
      // 获取所有设置数据
      const settingsJson = localStorage.getItem('settings');
      const settings = settingsJson ? JSON.parse(settingsJson) : {};
      
      // 获取备份设置
      const backupSettings = {
        location: localStorage.getItem('backup-location') || DEFAULT_BACKUP_DIRECTORY,
        storageType: localStorage.getItem('backup-storage-type') || 'documents'
      };
      
      // 获取所有其他localStorage项目
      const localStorageItems: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key !== 'settings' && !key.startsWith('aetherlink-migration') && key !== 'idb-migration-done') {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              // 尝试解析JSON，如果失败则存储原始字符串
              try {
                localStorageItems[key] = JSON.parse(value);
              } catch {
                localStorageItems[key] = value;
              }
            }
          } catch (e) {
            console.error(`读取localStorage项 "${key}" 失败:`, e);
          }
        }
      }
      
      // 构建完整备份数据
      const backupData = {
        // 主要数据
        topics: allTopics,
        assistants: allAssistants,
        
        // 所有设置
        settings: {
          // 完整设置对象
          ...settings,
          // 确保这些关键字段存在
          providers: settings.providers || [],
          models: settings.models || [],
          defaultModelId: settings.defaultModelId,
          currentModelId: settings.currentModelId,
          theme: settings.theme,
          fontSize: settings.fontSize,
          language: settings.language,
          sendWithEnter: settings.sendWithEnter,
          enableNotifications: settings.enableNotifications,
          generatedImages: settings.generatedImages || [],
        },
        
        // 备份设置
        backupSettings,
        
        // 其他localStorage数据
        localStorage: localStorageItems,
        
        // 元数据
        timestamp: Date.now(),
        appInfo: {
          version: '1.0.0',
          name: 'AetherLink',
          backupVersion: 2 // 增加版本号以区分新格式
        }
      };
      
      // 创建文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `AetherLink_Backup_Full_${timestamp}.json`;
      
      // 将JSON转换为字符串
      const jsonString = JSON.stringify(backupData);
      
      // 首先创建临时文件
      const tempPath = fileName;
      
      await Filesystem.writeFile({
        path: tempPath,
        data: jsonString,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      });
      
      // 获取临时文件URI
      const tempFileResult = await Filesystem.getUri({
        path: tempPath,
        directory: Directory.Cache
      });
      
      if (tempFileResult && tempFileResult.uri) {
        try {
          // 尝试使用Share API调用系统的分享/保存功能
          await Share.share({
            title: '保存完整备份文件',
            text: '选择位置保存备份文件',
            url: tempFileResult.uri,
            dialogTitle: '选择保存位置'
          });
          
          showMessage('请在系统分享菜单中选择"保存到设备"或文件管理器应用', 'info');
        } catch (shareError) {
          console.error('分享文件失败:', shareError);
          
          // 尝试使用文件打开器
          try {
            await FileOpener.open({
              filePath: tempFileResult.uri,
              contentType: 'application/json'
            });
            
            showMessage('文件已打开，请使用"另存为"保存到您想要的位置', 'info');
          } catch (openError) {
            console.error('打开文件失败:', openError);
            // 回退到保存到下载目录
            await saveToDownloadDirectory(fileName, jsonString);
          }
        }
      } else {
        // 无法获取临时文件URI，回退到下载目录
        await saveToDownloadDirectory(fileName, jsonString);
      }
    } catch (error) {
      console.error('创建自定义位置备份失败:', error);
      showMessage('创建备份失败: ' + (error as Error).message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 保存到下载目录
  const saveToDownloadDirectory = async (fileName: string, jsonString: string) => {
    try {
      // 确保下载目录存在
      const downloadDir = "Download";
      try {
        await Filesystem.mkdir({
          path: downloadDir,
          directory: Directory.External,
          recursive: true
        });
      } catch (mkdirError) {
        console.log('目录可能已存在:', mkdirError);
      }
      
      // 写入文件到下载目录
      const filePath = `${downloadDir}/${fileName}`;
      await Filesystem.writeFile({
        path: filePath,
        data: jsonString,
        directory: Directory.External,
        encoding: Encoding.UTF8
      });
      
      // 获取完整URI以显示
      const uriResult = await Filesystem.getUri({
        path: filePath,
        directory: Directory.External
      });
      
      if (uriResult && uriResult.uri) {
        // 尝试使用FileOpener打开文件所在目录
        try {
          await FileOpener.open({
            filePath: uriResult.uri,
            contentType: 'application/json'
          });
          
          const copied = await copyToClipboard(uriResult.uri);
          showMessage(
            `备份已保存到下载目录: ${uriResult.uri}${copied ? ' (已复制到剪贴板)' : ''}`, 
            'success'
          );
        } catch (openError) {
          console.error('打开文件失败，但文件已保存:', openError);
          const copied = await copyToClipboard(uriResult.uri);
          showMessage(
            `备份已保存到下载目录: ${uriResult.uri}${copied ? ' (已复制到剪贴板)' : ''}`, 
            'success'
          );
        }
      } else {
        showMessage('备份已保存到下载目录', 'success');
      }
    } catch (error) {
      console.error('保存到下载目录失败:', error);
      
      // 回退到保存到内部存储根目录
      try {
        await Filesystem.writeFile({
          path: fileName,
          data: jsonString,
          directory: Directory.External,
          encoding: Encoding.UTF8
        });
        
        const uriResult = await Filesystem.getUri({
          path: fileName,
          directory: Directory.External
        });
        
        if (uriResult && uriResult.uri) {
          const copied = await copyToClipboard(uriResult.uri);
          showMessage(
            `备份已保存到内部存储根目录: ${uriResult.uri}${copied ? ' (已复制到剪贴板)' : ''}`,
            'success'
          );
        } else {
          showMessage('备份已保存到内部存储根目录', 'success');
        }
      } catch (fallbackError) {
        console.error('保存到内部存储根目录也失败:', fallbackError);
        showMessage('保存备份失败: ' + (fallbackError as Error).message, 'error');
      }
    }
  };

  return (
    <Box sx={{
      flexGrow: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      bgcolor: (theme) => theme.palette.mode === 'light'
        ? alpha(theme.palette.primary.main, 0.02)
        : alpha(theme.palette.background.default, 0.9),
    }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: 1,
          borderColor: 'divider',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={handleBack}
            aria-label="back"
            sx={{
              color: (theme) => theme.palette.primary.main,
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 1,
              fontWeight: 600,
              backgroundImage: 'linear-gradient(90deg, #9333EA, #754AB4)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            数据设置
          </Typography>
          <Tooltip title="备份设置">
            <IconButton 
              onClick={openBackupSettings}
              aria-label="backup settings"
              sx={{
                color: (theme) => theme.palette.primary.main,
              }}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          p: 2,
          mt: 8,
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0,0,0,0.1)',
            borderRadius: '3px',
          },
        }}
      >
        <Container maxWidth="sm" sx={{ my: 2 }}>
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
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: '#9333EA',
                  fontSize: '1.5rem',
                  mr: 2,
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                }}
              >
                <BackupTableIcon />
              </Avatar>
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    backgroundImage: 'linear-gradient(90deg, #9333EA, #754AB4)',
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  数据备份与恢复
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  备份您的对话和助手数据，以便在更换设备或重新安装应用后恢复
                </Typography>
              </Box>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Alert 
              severity="info" 
              variant="outlined"
              sx={{ 
                mb: 3, 
                borderRadius: 2,
                '& .MuiAlert-icon': {
                  color: '#9333EA',
                }
              }}
            >
              备份您的对话和助手数据，以便在更换设备或重新安装应用后恢复。
              {backupPath && (
                <Box mt={1}>
                  <Typography variant="caption" component="div" sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                    <span>备份存储位置:</span>
                    <Tooltip title="点击复制完整路径">
                      <Chip 
                        icon={<FolderIcon fontSize="small" />} 
                        label={getLocationDisplay()} 
                        size="small" 
                        onClick={openBackupFolder}
                        color="primary"
                        variant="outlined"
                        sx={{ 
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: 'rgba(25, 118, 210, 0.08)'
                          }
                        }}
                      />
                    </Tooltip>
                  </Typography>
                </Box>
              )}
            </Alert>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 1 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={isLoading ? <CircularProgress size={24} color="inherit" /> : <BackupIcon />}
                  fullWidth
                  onClick={createBackup}
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
                  {isLoading ? '备份中...' : '备份聊天和助手'}
                </Button>
                
                <Button
                  variant="contained"
                  startIcon={isLoading ? <CircularProgress size={24} color="inherit" /> : <SaveAltIcon />}
                  fullWidth
                  onClick={createCustomLocationBackup}
                  disabled={isLoading}
                  sx={{ 
                    py: 1.5,
                    borderRadius: 2,
                    backgroundColor: '#6B7280',
                    fontWeight: 600,
                    '&:hover': {
                      backgroundColor: '#4B5563',
                    },
                  }}
                >
                  {isLoading ? '备份中...' : '完整系统备份'}
                </Button>
              </Box>
              
              <Button
                variant="outlined"
                startIcon={<SettingsBackupRestoreIcon />}
                fullWidth
                onClick={() => navigate('/settings/data/advanced-backup')}
                disabled={isLoading}
                sx={{ 
                  py: 1.5,
                  borderRadius: 2,
                  borderColor: (theme) => alpha(theme.palette.info.main, 0.5),
                  color: 'info.main',
                  '&:hover': {
                    borderColor: 'info.main',
                    bgcolor: (theme) => alpha(theme.palette.info.main, 0.1),
                  },
                }}
              >
                高级备份 (可自定义备份内容)
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<FileDownloadIcon />}
                fullWidth
                onClick={() => document.getElementById('import-backup')?.click()}
                disabled={isLoading}
                sx={{ 
                  py: 1.5,
                  borderRadius: 2,
                  borderColor: 'divider',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
                  },
                }}
              >
                导入备份
              </Button>
              <input
                id="import-backup"
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  try {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    setIsLoading(true);
                    
                    // 读取文件内容
                    const reader = new FileReader();
                    reader.onload = async (event) => {
                      try {
                        const content = event.target?.result as string;
                        
                        // 创建备份目录
                        await ensureBackupDirectory();
                        
                        // 验证JSON格式
                        try {
                          const backupData = JSON.parse(content);
                          // 检查是否为新格式备份
                          const isNewFormat = backupData.appInfo && backupData.appInfo.backupVersion >= 2;
                          
                          // 验证基本数据结构，至少应该有topics、assistants或settings字段
                          if (!backupData.topics && !backupData.assistants && !backupData.settings) {
                            showMessage('无效的备份文件格式：缺少必要的数据字段', 'error');
                            return;
                          }
                          
                          // 提示用户备份文件的格式类型和内容
                          let formatInfo = isNewFormat ? '完整备份 (v2)' : '基础备份 (v1)';
                          let contentInfo = [];
                          
                          if (backupData.topics) contentInfo.push(`${backupData.topics.length} 个对话话题`);
                          if (backupData.assistants) contentInfo.push(`${backupData.assistants.length} 个助手`);
                          if (backupData.settings) {
                            if (isNewFormat) {
                              contentInfo.push('完整应用设置');
                            } else {
                              contentInfo.push('模型供应商设置');
                            }
                          }
                          
                          showMessage(`检测到${formatInfo}，包含: ${contentInfo.join('、')}。正在导入...`, 'info');
                          
                          // 保存到备份目录
                          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                          const fileName = `AetherLink_Backup_Imported_${timestamp}.json`;
                          const path = `${backupLocation}/${fileName}`;
                          
                          // 写入文件
                          await Filesystem.writeFile({
                            path,
                            data: content,
                            directory: backupStorageType === 'external' ? Directory.External : Directory.Documents,
                            recursive: true,
                            encoding: Encoding.UTF8
                          });
                          
                          showMessage('备份导入成功', 'success');
                          loadBackups(); // 刷新列表
                        } catch (parseError) {
                          console.error('JSON解析失败:', parseError);
                          showMessage('无效的备份文件格式: ' + (parseError as Error).message, 'error');
                        }
                      } catch (error) {
                        console.error('导入备份失败:', error);
                        showMessage('导入备份失败: ' + (error as Error).message, 'error');
                      } finally {
                        setIsLoading(false);
                      }
                    };
                    
                    reader.onerror = () => {
                      showMessage('读取文件失败', 'error');
                      setIsLoading(false);
                    };
                    
                    reader.readAsText(file);
                  } catch (error) {
                    console.error('导入备份失败:', error);
                    showMessage('导入备份失败: ' + (error as Error).message, 'error');
                    setIsLoading(false);
                  }
                  
                  // 清空文件选择，允许重复选择同一文件
                  e.target.value = '';
                }}
              />
            </Box>
          </Paper>

          {backups.length > 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: '#9333EA',
                    fontSize: '1.5rem',
                    mr: 2,
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                  }}
                >
                  <CloudSyncIcon />
                </Avatar>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    backgroundImage: 'linear-gradient(90deg, #9333EA, #754AB4)',
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  可用备份
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />
              
              <List>
                {backups.map((backup) => (
                  <React.Fragment key={backup.path}>
                    <Paper
                      elevation={0}
                      sx={{
                        mb: 2,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        overflow: 'hidden',
                        transition: 'all 0.2s',
                        '&:hover': {
                          boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
                          borderColor: (theme) => alpha(theme.palette.primary.main, 0.3),
                        }
                      }}
                    >
                      <ListItem
                        sx={{
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          p: 2
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            width: '100%',
                            alignItems: 'center',
                            mb: 1.5
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            <RestoreIcon sx={{ color: '#9333EA' }} />
                          </ListItemIcon>
                          <ListItemText 
                            primary={
                              <Typography variant="subtitle2" fontWeight={600} sx={{ wordBreak: 'break-word' }}>
                                {backup.name.replace('AetherLink_Backup_', '').replace('.json', '')}
                              </Typography>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary">
                                {formatDate(backup.date)}
                              </Typography>
                            }
                            sx={{ mr: 1 }}
                          />
                        </Box>
                        
                        <Box
                          sx={{
                            display: 'flex',
                            width: '100%',
                            justifyContent: 'flex-end',
                            gap: 1
                          }}
                        >
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => restoreBackup(backup.path, backup.isExternal)}
                            disabled={isLoading}
                            sx={{ 
                              minWidth: '80px',
                              borderRadius: 1.5,
                              borderColor: (theme) => alpha(theme.palette.primary.main, 0.5),
                              color: 'primary.main',
                              '&:hover': {
                                borderColor: 'primary.main',
                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                              },
                            }}
                          >
                            恢复
                          </Button>
                          
                          <Tooltip title="查看备份详情并复制路径">
                            <IconButton
                              size="small"
                              aria-label="info"
                              onClick={async () => {
                                const success = await copyToClipboard(backup.path);
                                showMessage(`备份路径: ${backup.path}${success ? ' (已复制到剪贴板)' : ''}`, 
                                  success ? 'success' : 'info');
                              }}
                              sx={{
                                bgcolor: (theme) => alpha(theme.palette.info.main, 0.1),
                                '&:hover': {
                                  bgcolor: (theme) => alpha(theme.palette.info.main, 0.2),
                                }
                              }}
                            >
                              <InfoIcon color="info" fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="导出备份到下载文件夹">
                            <IconButton 
                              size="small"
                              aria-label="export"
                              onClick={() => exportBackup(backup.path, backup.name, backup.isExternal)}
                              disabled={isLoading}
                              sx={{
                                bgcolor: (theme) => alpha(theme.palette.success.main, 0.1),
                                '&:hover': {
                                  bgcolor: (theme) => alpha(theme.palette.success.main, 0.2),
                                }
                              }}
                            >
                              <FileDownloadIcon color="success" fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="删除备份">
                            <IconButton 
                              size="small"
                              aria-label="delete"
                              onClick={() => deleteBackup(backup.path, backup.isExternal)}
                              disabled={isLoading}
                              sx={{
                                bgcolor: (theme) => alpha(theme.palette.error.main, 0.1),
                                '&:hover': {
                                  bgcolor: (theme) => alpha(theme.palette.error.main, 0.2),
                                }
                              }}
                            >
                              <DeleteIcon color="error" fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </ListItem>
                    </Paper>
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          ) : (
            <Paper 
              elevation={0}
              sx={{ 
                p: 3, 
                textAlign: 'center',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)', 
              }}
            >
              <Typography variant="body1" color="text.secondary">
                {isLoading ? '加载备份中...' : '暂无备份'}
              </Typography>
            </Paper>
          )}
        </Container>
      </Box>

      {/* 备份设置对话框 */}
      <Dialog 
        open={openDialog} 
        onClose={closeBackupSettings}
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          }
        }}
      >
        <DialogTitle sx={{
          fontWeight: 600,
          backgroundImage: 'linear-gradient(90deg, #9333EA, #754AB4)',
          backgroundClip: 'text',
          color: 'transparent',
          pb: 1
        }}>备份设置</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            选择备份文件的存储位置和文件夹名称
          </DialogContentText>
          
          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <FormLabel component="legend">存储位置</FormLabel>
            <RadioGroup
              value={backupStorageType}
              onChange={(e) => setBackupStorageType(e.target.value as 'documents' | 'external')}
            >
              <FormControlLabel 
                value="documents" 
                control={<Radio />} 
                label="Documents目录 (应用专用)" 
              />
              <FormControlLabel 
                value="external" 
                control={<Radio />} 
                label="内部存储根目录 (可共享)" 
              />
            </RadioGroup>
          </FormControl>
          
          <TextField
            autoFocus
            margin="dense"
            id="folder-name"
            label="文件夹名称"
            type="text"
            fullWidth
            variant="outlined"
            value={customFolderName}
            onChange={(e) => setCustomFolderName(e.target.value)}
            helperText={
              backupStorageType === 'external' 
                ? '将在内部存储根目录创建此文件夹' 
                : '将在Documents/AetherLink/下创建此文件夹'
            }
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pb: 3 }}>
          <Button 
            onClick={closeBackupSettings}
            sx={{ borderRadius: 2 }}
          >
            取消
          </Button>
          <Button 
            onClick={saveBackupSettings} 
            sx={{ 
              borderRadius: 2,
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
              '&:hover': {
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2),
              }, 
            }}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ 
            width: '100%',
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DataSettingsPage; 