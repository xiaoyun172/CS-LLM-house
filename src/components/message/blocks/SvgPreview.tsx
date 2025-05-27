import React, { useState, useCallback, memo } from 'react';
import { Box, Alert, IconButton, Tooltip, useTheme } from '@mui/material';
import { Download as DownloadIcon, Fullscreen as FullscreenIcon } from '@mui/icons-material';
import DOMPurify from 'dompurify';

interface SvgPreviewProps {
  children: string;
  className?: string;
}

/**
 * 🔥 SVG 预览组件
 * 安全地渲染 SVG 内容，支持下载和全屏预览
 */
const SvgPreview: React.FC<SvgPreviewProps> = ({ children, className }) => {
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // 清理和验证 SVG 内容
  const sanitizedSvg = React.useMemo(() => {
    try {
      if (!children.trim()) {
        setError('SVG 内容为空');
        return '';
      }

      // 使用 DOMPurify 清理 SVG 内容
      const cleaned = DOMPurify.sanitize(children, {
        USE_PROFILES: { svg: true, svgFilters: true },
        ADD_TAGS: ['use', 'defs', 'pattern', 'mask', 'clipPath'],
        ADD_ATTR: ['xmlns', 'xmlns:xlink', 'viewBox', 'preserveAspectRatio']
      });

      if (!cleaned || cleaned.trim() === '') {
        setError('SVG 内容无效或包含不安全的元素');
        return '';
      }

      setError(null);
      return cleaned;
    } catch (err) {
      console.error('SVG 处理失败:', err);
      setError(err instanceof Error ? err.message : 'SVG 处理失败');
      return '';
    }
  }, [children]);

  // 下载 SVG
  const handleDownload = useCallback(() => {
    try {
      const blob = new Blob([sanitizedSvg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'image.svg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('下载 SVG 失败:', err);
    }
  }, [sanitizedSvg]);

  // 全屏预览
  const handleFullscreen = useCallback(() => {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>SVG 预览</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              background-color: ${isDarkMode ? '#1e1e1e' : '#ffffff'};
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
            }
            svg {
              max-width: 100%;
              max-height: 100%;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
          </style>
        </head>
        <body>
          ${sanitizedSvg}
        </body>
        </html>
      `);
      newWindow.document.close();
    }
  }, [sanitizedSvg, isDarkMode]);

  if (error) {
    return (
      <Box sx={{ margin: '16px 0' }}>
        <Alert 
          severity="error"
          sx={{ 
            backgroundColor: isDarkMode ? '#2d1b1b' : '#fdeded',
            color: isDarkMode ? '#f5c6cb' : '#721c24',
            border: isDarkMode ? '1px solid #5a2a2a' : '1px solid #f5c6cb'
          }}
        >
          <Box sx={{ fontWeight: 'bold', mb: 1 }}>SVG 渲染失败</Box>
          <Box sx={{ fontSize: '14px', fontFamily: 'monospace' }}>{error}</Box>
        </Alert>
        
        {/* 显示原始代码作为备选 */}
        <Box
          sx={{
            mt: 2,
            p: 2,
            backgroundColor: isDarkMode ? '#1e1e1e' : '#f8f8f8',
            borderRadius: 1,
            border: isDarkMode ? '1px solid #404040' : '1px solid #d0d0d0',
            fontFamily: 'monospace',
            fontSize: '14px',
            whiteSpace: 'pre-wrap',
            color: 'text.secondary',
            maxHeight: '300px',
            overflow: 'auto'
          }}
        >
          {children}
        </Box>
      </Box>
    );
  }

  if (!sanitizedSvg) {
    return null;
  }

  return (
    <Box
      className={`svg-preview ${className || ''}`}
      sx={{
        position: 'relative',
        margin: '16px 0',
        padding: 2,
        backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
        borderRadius: 2,
        border: isDarkMode ? '1px solid #404040' : '1px solid #d0d0d0',
        overflow: 'auto',
        textAlign: 'center',
        
        // SVG 样式优化
        '& svg': {
          maxWidth: '100%',
          height: 'auto',
          display: 'block',
          margin: '0 auto',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          borderRadius: 1
        },
        
        // 悬停时显示工具栏
        '&:hover .svg-toolbar': {
          opacity: 1
        }
      }}
    >
      {/* 工具栏 */}
      <Box
        className="svg-toolbar"
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          display: 'flex',
          gap: 0.5,
          opacity: 0,
          transition: 'opacity 0.2s ease',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: 1,
          padding: 0.5
        }}
      >
        <Tooltip title="全屏预览">
          <IconButton
            size="small"
            onClick={handleFullscreen}
            sx={{
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            <FullscreenIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="下载 SVG">
          <IconButton
            size="small"
            onClick={handleDownload}
            sx={{
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* SVG 内容 */}
      <div dangerouslySetInnerHTML={{ __html: sanitizedSvg }} />
    </Box>
  );
};

export default memo(SvgPreview);
