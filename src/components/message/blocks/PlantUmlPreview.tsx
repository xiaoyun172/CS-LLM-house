import React, { useState, useEffect, useCallback, memo } from 'react';
import { Box, Alert, CircularProgress, IconButton, Tooltip, useTheme } from '@mui/material';
import { Download as DownloadIcon, Refresh as RefreshIcon } from '@mui/icons-material';

interface PlantUmlPreviewProps {
  children: string;
  className?: string;
}

/**
 * 🔥 PlantUML 预览组件
 * 使用 PlantUML 服务器渲染 UML 图表
 */
const PlantUmlPreview: React.FC<PlantUmlPreviewProps> = ({ children, className }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // PlantUML 服务器 URL（可以配置为自己的服务器）
  const PLANTUML_SERVER = 'https://www.plantuml.com/plantuml';

  // 编码 PlantUML 代码
  const encodePlantUml = useCallback((uml: string): string => {
    // 简单的 Base64 编码（实际应该使用 PlantUML 的特殊编码）
    try {
      // 添加 @startuml 和 @enduml 如果不存在
      let processedUml = uml.trim();
      if (!processedUml.startsWith('@start')) {
        processedUml = `@startuml\n${processedUml}\n@enduml`;
      }
      
      // 使用 btoa 进行 Base64 编码
      return btoa(unescape(encodeURIComponent(processedUml)));
    } catch (err) {
      console.error('PlantUML 编码失败:', err);
      return '';
    }
  }, []);

  // 验证是否为有效的 PlantUML 代码
  const isValidPlantUml = useCallback((uml: string): boolean => {
    const trimmed = uml.trim().toLowerCase();
    return (
      trimmed.includes('@startuml') ||
      trimmed.includes('@startmindmap') ||
      trimmed.includes('@startwbs') ||
      trimmed.includes('@startgantt') ||
      trimmed.includes('@startsalt') ||
      trimmed.includes('@startdot') ||
      trimmed.includes('@startditaa') ||
      trimmed.includes('participant') ||
      trimmed.includes('actor') ||
      trimmed.includes('class') ||
      trimmed.includes('interface') ||
      trimmed.includes('enum') ||
      trimmed.includes('abstract') ||
      trimmed.includes('component') ||
      trimmed.includes('package') ||
      trimmed.includes('node') ||
      trimmed.includes('database') ||
      trimmed.includes('cloud') ||
      trimmed.includes('frame') ||
      trimmed.includes('folder') ||
      trimmed.includes('rectangle') ||
      trimmed.includes('usecase') ||
      trimmed.includes('state') ||
      trimmed.includes('activity') ||
      trimmed.includes('start') ||
      trimmed.includes('end') ||
      trimmed.includes('if') ||
      trimmed.includes('while') ||
      trimmed.includes('repeat') ||
      trimmed.includes('fork') ||
      trimmed.includes('split')
    );
  }, []);

  // 渲染 PlantUML
  const renderPlantUml = useCallback(async () => {
    if (!children.trim()) {
      setError('PlantUML 代码为空');
      setIsLoading(false);
      return;
    }

    if (!isValidPlantUml(children)) {
      setError('不是有效的 PlantUML 代码');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const encoded = encodePlantUml(children);
      if (!encoded) {
        throw new Error('编码失败');
      }

      // 构建图片 URL
      const url = `${PLANTUML_SERVER}/svg/${encoded}`;
      
      // 预加载图片以检查是否成功
      const img = new Image();
      img.onload = () => {
        setImageUrl(url);
        setIsLoading(false);
      };
      img.onerror = () => {
        setError('PlantUML 服务器渲染失败，请检查代码语法');
        setIsLoading(false);
      };
      img.src = url;

    } catch (err) {
      console.error('PlantUML 渲染失败:', err);
      setError(err instanceof Error ? err.message : '渲染失败');
      setIsLoading(false);
    }
  }, [children, encodePlantUml, isValidPlantUml]);

  // 初始渲染
  useEffect(() => {
    renderPlantUml();
  }, [renderPlantUml]);

  // 下载图片
  const handleDownload = useCallback(async () => {
    if (!imageUrl) return;
    
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'plantuml-diagram.svg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('下载 PlantUML 图片失败:', err);
    }
  }, [imageUrl]);

  // 刷新渲染
  const handleRefresh = useCallback(() => {
    renderPlantUml();
  }, [renderPlantUml]);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 200,
          backgroundColor: isDarkMode ? '#1e1e1e' : '#f8f8f8',
          borderRadius: 2,
          border: isDarkMode ? '1px solid #404040' : '1px solid #d0d0d0',
          margin: '16px 0'
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={24} sx={{ mb: 1 }} />
          <Box sx={{ fontSize: '14px', color: 'text.secondary' }}>
            正在渲染 PlantUML 图表...
          </Box>
        </Box>
      </Box>
    );
  }

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
          <Box sx={{ fontWeight: 'bold', mb: 1 }}>PlantUML 渲染失败</Box>
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

  return (
    <Box
      className={`plantuml-preview ${className || ''}`}
      sx={{
        position: 'relative',
        margin: '16px 0',
        padding: 2,
        backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
        borderRadius: 2,
        border: isDarkMode ? '1px solid #404040' : '1px solid #d0d0d0',
        overflow: 'auto',
        textAlign: 'center',
        
        // 悬停时显示工具栏
        '&:hover .plantuml-toolbar': {
          opacity: 1
        }
      }}
    >
      {/* 工具栏 */}
      <Box
        className="plantuml-toolbar"
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
        <Tooltip title="刷新渲染">
          <IconButton
            size="small"
            onClick={handleRefresh}
            sx={{
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="下载图片">
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

      {/* PlantUML 图片 */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt="PlantUML Diagram"
          style={{
            maxWidth: '100%',
            height: 'auto',
            display: 'block',
            margin: '0 auto',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            borderRadius: 4
          }}
        />
      )}
    </Box>
  );
};

export default memo(PlantUmlPreview);
