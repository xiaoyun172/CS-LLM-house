import React from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import PhotoIcon from '@mui/icons-material/Photo';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';

interface UploadMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onImageUpload: (source: 'camera' | 'photos') => void;
  onFileUpload: () => void;
}

const UploadMenu: React.FC<UploadMenuProps> = ({
  anchorEl,
  open,
  onClose,
  onImageUpload,
  onFileUpload,
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
    </Menu>
  );
};

export default UploadMenu; 