import React, { useState } from 'react';
import { Box, IconButton, Dialog, DialogContent } from '@mui/material';
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap';
import type { ImageMessageBlock } from '../../../shared/types/newMessage';

interface Props {
  block: ImageMessageBlock;
}

/**
 * 图片块组件
 * 负责渲染图片内容，支持点击放大
 */
const ImageBlock: React.FC<Props> = ({ block }) => {
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Box sx={{ position: 'relative', maxWidth: '100%', display: 'inline-block' }}>
      <Box
        component="img"
        src={block.url}
        alt="图片内容"
        sx={{
          maxWidth: '100%',
          maxHeight: '300px',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
        onClick={handleOpen}
      />

      <IconButton
        size="small"
        sx={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          color: 'white',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.7)'
          }
        }}
        onClick={handleOpen}
      >
        <ZoomOutMapIcon fontSize="small" />
      </IconButton>

      <Dialog open={open} onClose={handleClose} maxWidth="lg">
        <DialogContent sx={{ padding: 0 }}>
          <Box
            component="img"
            src={block.url}
            alt="图片内容"
            sx={{
              maxWidth: '100%',
              maxHeight: '90vh'
            }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default React.memo(ImageBlock);
