import React, { useState } from 'react';
import { Box, CircularProgress, IconButton, Dialog } from '@mui/material';
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap';
import CloseIcon from '@mui/icons-material/Close';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import type { ImageContent as ImageContentType } from '../../shared/types';

interface ImageContentProps {
  image: ImageContentType;
  index: number;
}

const ImageContent: React.FC<ImageContentProps> = ({ image, index }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  
  // 使用base64数据或URL
  const imgSrc = image.base64Data || image.url;
  
  const handleOpen = () => {
    setOpen(true);
  };
  
  const handleClose = () => {
    setOpen(false);
  };
  
  const handleImageLoad = () => {
    setLoading(false);
  };
  
  const handleImageError = () => {
    setLoading(false);
    setError(true);
  };
  
  return (
    <>
      <Box 
        sx={{
          position: 'relative',
          margin: '4px 0',
          borderRadius: 2,
          overflow: 'hidden',
          maxWidth: '240px',
          maxHeight: '240px',
          backgroundColor: '#f0f0f0',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
        }}
      >
        {loading && (
          <Box 
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(240, 240, 240, 0.8)',
              zIndex: 1,
            }}
          >
            <CircularProgress size={24} />
          </Box>
        )}
        
        {error ? (
          <Box
            sx={{
              width: '100%',
              height: '120px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f0f0f0',
              color: '#ff5252',
            }}
          >
            <ErrorOutlineIcon />
            <Box sx={{ mt: 1, fontSize: '0.75rem' }}>图片加载失败</Box>
          </Box>
        ) : (
          <Box sx={{ position: 'relative' }}>
            <img
              src={imgSrc}
              alt={`上传图片 ${index + 1}`}
              style={{
                width: '100%',
                maxHeight: '240px',
                objectFit: 'contain',
                cursor: 'pointer',
              }}
              onLoad={handleImageLoad}
              onError={handleImageError}
              onClick={handleOpen}
            />
            <IconButton
              size="small"
              onClick={handleOpen}
              sx={{
                position: 'absolute',
                right: 8,
                bottom: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                },
                width: 28,
                height: 28,
                padding: 0.5,
              }}
            >
              <ZoomOutMapIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </Box>
      
      {/* 图片预览对话框 */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="xl"
        PaperProps={{
          style: {
            backgroundColor: 'transparent',
            boxShadow: 'none',
            overflow: 'hidden',
            margin: 0,
            padding: 0,
          },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            padding: 2,
          }}
          onClick={handleClose}
        >
          <IconButton
            onClick={handleClose}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              color: 'white',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
          <img
            src={imgSrc}
            alt={`上传图片 ${index + 1}`}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain',
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </Box>
      </Dialog>
    </>
  );
};

export default ImageContent; 