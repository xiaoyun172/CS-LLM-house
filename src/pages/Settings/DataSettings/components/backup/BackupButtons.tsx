import React from 'react';
import { Box, Button, CircularProgress } from '@mui/material';
import BackupIcon from '@mui/icons-material/Backup';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import SettingsIcon from '@mui/icons-material/Settings';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { alpha } from '@mui/material/styles';

interface BackupButtonsProps {
  isLoading: boolean;
  onBasicBackup: () => void;
  onFullBackup: () => void;
  onCustomBackup: () => void;
  onRestore: () => void;
  onImportExternal: () => void;
  onClearAll: () => void;
}

/**
 * 备份按钮组件
 */
const BackupButtons: React.FC<BackupButtonsProps> = ({
  isLoading,
  onBasicBackup,
  onFullBackup,
  onCustomBackup,
  onRestore,
  onImportExternal,
  onClearAll
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 1 }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <Button
          variant="contained"
          startIcon={isLoading ? <CircularProgress size={24} color="inherit" /> : <BackupIcon />}
          fullWidth
          onClick={onBasicBackup}
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
          onClick={onFullBackup}
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
      
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<SettingsIcon />}
          fullWidth
          onClick={onCustomBackup}
          disabled={isLoading}
          sx={{ 
            py: 1.5,
            borderRadius: 2,
            borderColor: '#9333EA',
            color: '#9333EA',
            '&:hover': {
              borderColor: '#8324DB',
              bgcolor: alpha('#9333EA', 0.05),
            },
          }}
        >
          自定义选择性备份
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<FileDownloadIcon />}
          fullWidth
          onClick={onRestore}
          disabled={isLoading}
          sx={{ 
            py: 1.5,
            borderRadius: 2,
            borderColor: 'divider',
            '&:hover': {
              borderColor: '#9333EA',
              bgcolor: alpha('#9333EA', 0.05),
            },
          }}
        >
          导入备份文件并恢复
        </Button>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<CloudDownloadIcon />}
          fullWidth
          onClick={onImportExternal}
          disabled={isLoading}
          sx={{ 
            py: 1.5,
            borderRadius: 2,
            borderColor: '#2563EB',
            color: '#2563EB',
            '&:hover': {
              borderColor: '#1D4ED8',
              bgcolor: alpha('#2563EB', 0.05),
            },
          }}
        >
          导入其他AI助手备份
        </Button>
        
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteSweepIcon />}
          fullWidth
          onClick={onClearAll}
          disabled={isLoading}
          sx={{ 
            py: 1.5,
            borderRadius: 2,
            borderColor: '#d32f2f',
            color: '#d32f2f',
            '&:hover': {
              borderColor: '#b71c1c',
              bgcolor: alpha('#d32f2f', 0.05),
            },
          }}
        >
          清理全部助手和话题
        </Button>
      </Box>
    </Box>
  );
};

export default BackupButtons; 