import React from 'react';
import { Box, Typography, IconButton, Chip } from '@mui/material';
import {
  InsertDriveFile as FileIcon,
  Description as DocumentIcon,
  Image as ImageIcon,
  Code as CodeIcon,
  Archive as ArchiveIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import type { FileMessageBlock } from '../../../shared/types/newMessage';
import { FileTypes } from '../../../shared/utils/fileUtils';

interface Props {
  block: FileMessageBlock;
}

/**
 * 文件块组件
 * 用于显示文件信息和提供下载功能
 */
const FileBlock: React.FC<Props> = ({ block }) => {
  if (!block.file) {
    return (
      <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
        <Typography color="error">文件信息不可用</Typography>
      </Box>
    );
  }

  const { file } = block;

  // 根据文件类型选择图标
  const getFileIcon = () => {
    switch (file.type) {
      case FileTypes.IMAGE:
        return <ImageIcon />;
      case FileTypes.TEXT:
      case FileTypes.DOCUMENT:
        return <DocumentIcon />;
      case FileTypes.CODE:
        return <CodeIcon />;
      case FileTypes.ARCHIVE:
        return <ArchiveIcon />;
      default:
        return <FileIcon />;
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 处理文件下载
  const handleDownload = () => {
    if (!file.base64Data) {
      console.warn('文件没有base64数据，无法下载');
      return;
    }

    try {
      // 创建下载链接
      const link = document.createElement('a');

      // 处理base64数据
      let base64Data = file.base64Data;
      if (base64Data.includes(',')) {
        base64Data = base64Data.split(',')[1];
      }

      // 创建Blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: file.mimeType || 'application/octet-stream' });

      // 创建下载URL
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = file.origin_name || file.name || '下载文件';

      // 触发下载
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 清理URL
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('文件下载失败:', error);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        p: 2,
        border: '1px solid #e0e0e0',
        borderRadius: 1,
        backgroundColor: '#f9f9f9',
        maxWidth: '400px',
        gap: 2
      }}
    >
      {/* 文件图标 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: 1,
          backgroundColor: '#e3f2fd',
          color: '#1976d2'
        }}
      >
        {getFileIcon()}
      </Box>

      {/* 文件信息 */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {file.origin_name || file.name || '未知文件'}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {formatFileSize(file.size || 0)}
          </Typography>

          {(() => {
            const fileName = file.origin_name || file.name || '';
            const ext = fileName.split('.').pop();
            return ext && ext !== fileName ? (
              <Chip
                label={ext.toUpperCase()}
                size="small"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            ) : null;
          })()}
        </Box>
      </Box>

      {/* 下载按钮 */}
      {file.base64Data && (
        <IconButton
          size="small"
          onClick={handleDownload}
          sx={{
            color: '#1976d2',
            '&:hover': {
              backgroundColor: '#e3f2fd'
            }
          }}
        >
          <DownloadIcon fontSize="small" />
        </IconButton>
      )}
    </Box>
  );
};

export default React.memo(FileBlock);
