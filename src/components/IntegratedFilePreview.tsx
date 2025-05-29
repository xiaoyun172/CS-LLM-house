import React, { useState } from 'react';
import { Box, Collapse, IconButton, Typography, useTheme } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FilePreview from './FilePreview';
import type { FileStatus } from './FilePreview';
import type { FileContent, ImageContent } from '../shared/types';

interface IntegratedFilePreviewProps {
  files: FileContent[];
  images: ImageContent[];
  onRemoveFile: (index: number) => void;
  onRemoveImage: (index: number) => void;
  fileStatuses?: Record<string, { status: FileStatus; progress?: number; error?: string }>;
  compact?: boolean;
  maxVisibleItems?: number;
}

const IntegratedFilePreview: React.FC<IntegratedFilePreviewProps> = ({
  files,
  images,
  onRemoveFile,
  onRemoveImage,
  fileStatuses = {},
  compact = true,
  maxVisibleItems = 3
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const totalItems = files.length + images.length;
  const hasItems = totalItems > 0;
  const hasMoreItems = totalItems > maxVisibleItems;
  const visibleFiles = expanded ? files : files.slice(0, Math.max(0, maxVisibleItems - images.length));
  const visibleImages = expanded ? images : images.slice(0, maxVisibleItems);

  if (!hasItems) return null;

  return (
    <Box
      sx={{
        width: '100%',
        marginBottom: '8px',
        borderRadius: '12px',
        backgroundColor: theme.palette.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.03)'
          : 'rgba(0, 0, 0, 0.02)',
        border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
        overflow: 'hidden',
        transition: 'all 0.3s ease'
      }}
    >
      {/* 头部信息 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          backgroundColor: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.02)'
            : 'rgba(0, 0, 0, 0.02)',
          borderBottom: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`
        }}
      >
        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 500 }}>
          {totalItems} 个文件已选择
        </Typography>

        {hasMoreItems && (
          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
            sx={{
              padding: '2px',
              color: theme.palette.text.secondary,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              }
            }}
          >
            {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        )}
      </Box>

      {/* 文件预览内容 */}
      <Box sx={{ padding: '8px' }}>
        {/* 图片预览 */}
        {visibleImages.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              marginBottom: visibleFiles.length > 0 ? '8px' : 0
            }}
          >
            {visibleImages.map((image, index) => (
              <Box
                key={`image-${index}`}
                sx={{
                  position: 'relative',
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '1px solid rgba(0, 0, 0, 0.1)'
                }}
              >
                <img
                  src={image.base64Data || image.url}
                  alt={`预览 ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
                <IconButton
                  size="small"
                  onClick={() => onRemoveImage(index)}
                  sx={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    padding: '2px',
                    width: '16px',
                    height: '16px',
                    '&:hover': {
                      backgroundColor: 'rgba(244, 67, 54, 0.8)',
                    },
                  }}
                >
                  <ExpandMoreIcon sx={{ fontSize: 10, transform: 'rotate(45deg)' }} />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}

        {/* 文件预览 */}
        {visibleFiles.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px'
            }}
          >
            {visibleFiles.map((file, index) => {
              const fileKey = `${file.name}-${file.size}`;
              const fileStatus = fileStatuses[fileKey];

              return (
                <FilePreview
                  key={`file-${index}`}
                  file={file}
                  onRemove={() => onRemoveFile(index)}
                  compact={compact}
                  status={fileStatus?.status}
                  progress={fileStatus?.progress}
                  error={fileStatus?.error}
                  draggable={false}
                />
              );
            })}
          </Box>
        )}

        {/* 折叠的额外内容 */}
        <Collapse in={expanded}>
          <Box sx={{ marginTop: '8px' }}>
            {/* 显示剩余的图片 */}
            {images.length > maxVisibleItems && (
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  marginBottom: '8px'
                }}
              >
                {images.slice(maxVisibleItems).map((image, index) => (
                  <Box
                    key={`extra-image-${index}`}
                    sx={{
                      position: 'relative',
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <img
                      src={image.base64Data || image.url}
                      alt={`预览 ${maxVisibleItems + index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => onRemoveImage(maxVisibleItems + index)}
                      sx={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        padding: '2px',
                        width: '16px',
                        height: '16px',
                        '&:hover': {
                          backgroundColor: 'rgba(244, 67, 54, 0.8)',
                        },
                      }}
                    >
                      <ExpandMoreIcon sx={{ fontSize: 10, transform: 'rotate(45deg)' }} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}

            {/* 显示剩余的文件 */}
            {files.length > Math.max(0, maxVisibleItems - images.length) && (
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px'
                }}
              >
                {files.slice(Math.max(0, maxVisibleItems - images.length)).map((file, index) => {
                  const fileKey = `${file.name}-${file.size}`;
                  const fileStatus = fileStatuses[fileKey];
                  const actualIndex = Math.max(0, maxVisibleItems - images.length) + index;

                  return (
                    <FilePreview
                      key={`extra-file-${index}`}
                      file={file}
                      onRemove={() => onRemoveFile(actualIndex)}
                      compact={compact}
                      status={fileStatus?.status}
                      progress={fileStatus?.progress}
                      error={fileStatus?.error}
                      draggable={false}
                    />
                  );
                })}
              </Box>
            )}
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
};

export default IntegratedFilePreview;
