import React from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import PhotoIcon from '@mui/icons-material/Photo';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';

interface UploadMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onImageUpload: (source: 'camera' | 'photos') => void;
  onFileUpload: () => void;
  onMultiModelSend?: () => void;
  showMultiModel?: boolean;
}

const UploadMenu: React.FC<UploadMenuProps> = ({
  anchorEl,
  open,
  onClose,
  onImageUpload,
  onFileUpload,
  onMultiModelSend,
  showMultiModel = false,
}) => {
  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
      sx={{
        '& .MuiPaper-root': {
          minWidth: '200px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        },
      }}
    >
      <MenuItem
        onClick={() => {
          onImageUpload('photos');
          onClose();
        }}
        sx={{ py: 1.5 }}
      >
        <ListItemIcon>
          <PhotoIcon color="primary" />
        </ListItemIcon>
        <ListItemText primary="从相册选择图片" />
      </MenuItem>

      <MenuItem
        onClick={() => {
          onImageUpload('camera');
          onClose();
        }}
        sx={{ py: 1.5 }}
      >
        <ListItemIcon>
          <CameraAltIcon color="secondary" />
        </ListItemIcon>
        <ListItemText primary="拍摄照片" />
      </MenuItem>

      <MenuItem
        onClick={() => {
          onFileUpload();
          onClose();
        }}
        sx={{ py: 1.5 }}
      >
        <ListItemIcon>
          <InsertDriveFileIcon sx={{ color: '#4caf50' }} />
        </ListItemIcon>
        <ListItemText primary="上传文件" />
      </MenuItem>

      {/* 多模型选项 */}
      {showMultiModel && onMultiModelSend && (
        <>
          <Divider sx={{ my: 0.5 }} />
          <MenuItem
            onClick={() => {
              onMultiModelSend();
              onClose();
            }}
            sx={{ py: 1.5 }}
          >
            <ListItemIcon>
              <CompareArrowsIcon sx={{ color: '#FF9800' }} />
            </ListItemIcon>
            <ListItemText
              primary="发送到多个模型"
              secondary="同时向多个AI模型发送消息"
              sx={{
                '& .MuiListItemText-secondary': {
                  fontSize: '0.75rem',
                  color: 'text.secondary'
                }
              }}
            />
          </MenuItem>
        </>
      )}
    </Menu>
  );
};

export default UploadMenu;