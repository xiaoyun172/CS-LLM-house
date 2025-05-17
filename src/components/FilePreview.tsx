import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import type { FileContent } from '../shared/types';
import { FileUploadService } from '../shared/services/FileUploadService';

interface FilePreviewProps {
  file: FileContent;
  onRemove: () => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, onRemove }) => {
  // 获取文件图标
  const getFileIcon = () => {
    const mimeType = file.mimeType.toLowerCase();
    
    if (mimeType.startsWith('image/')) {
      return <ImageIcon color="primary" />;
    } else if (mimeType.startsWith('video/')) {
      return <VideoFileIcon color="error" />;
    } else if (mimeType.startsWith('audio/')) {
      return <AudioFileIcon color="success" />;
    } else if (mimeType.includes('pdf')) {
      return <PictureAsPdfIcon sx={{ color: '#e53935' }} />;
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
      return <DescriptionIcon sx={{ color: '#1565c0' }} />;
    } else if (mimeType.includes('text/')) {
      return <TextSnippetIcon sx={{ color: '#757575' }} />;
    } else {
      return <InsertDriveFileIcon color="action" />;
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        borderRadius: '8px',
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        position: 'relative',
        margin: '4px 0',
        maxWidth: '100%',
      }}
    >
      {/* 文件图标 */}
      <Box sx={{ marginRight: '8px', display: 'flex', alignItems: 'center' }}>
        {getFileIcon()}
      </Box>
      
      {/* 文件信息 */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            maxWidth: '200px',
          }}
        >
          {file.name}
        </Typography>
        <Typography
          variant="caption"
          color="textSecondary"
          sx={{ display: 'block' }}
        >
          {FileUploadService.formatFileSize(file.size)}
        </Typography>
      </Box>
      
      {/* 删除按钮 */}
      <IconButton
        size="small"
        onClick={onRemove}
        sx={{
          position: 'absolute',
          top: -8,
          right: -8,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          color: 'white',
          padding: '2px',
          width: '20px',
          height: '20px',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
          },
        }}
      >
        <CancelIcon fontSize="small" />
      </IconButton>
    </Box>
  );
};

export default FilePreview; 