import React, { useEffect, useRef, useState, memo } from 'react';
import { Box, Alert, CircularProgress, useTheme } from '@mui/material';
import mermaid from 'mermaid';

interface MermaidPreviewProps {
  children: string;
  className?: string;
}

/**
 * 🔥 Mermaid 图表预览组件
 * 支持各种 Mermaid 图表类型：流程图、序列图、甘特图等
 */
const MermaidPreview: React.FC<MermaidPreviewProps> = ({ children, className }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  useEffect(() => {
    const renderMermaid = async () => {
      if (!children.trim()) {
        setError('Mermaid 代码为空');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // 配置 Mermaid
        mermaid.initialize({
          startOnLoad: false,
          theme: isDarkMode ? 'dark' : 'default',
          securityLevel: 'loose',
          fontFamily: 'Arial, sans-serif',
          fontSize: 14,
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis'
          },
          sequence: {
            useMaxWidth: true,
            diagramMarginX: 50,
            diagramMarginY: 10,
            actorMargin: 50,
            width: 150,
            height: 65,
            boxMargin: 10,
            boxTextMargin: 5,
            noteMargin: 10,
            messageMargin: 35
          },
          gantt: {
            useMaxWidth: true,
            leftPadding: 75,
            gridLineStartPadding: 35,
            fontSize: 11,
            fontFamily: 'Arial, sans-serif',
            sectionFontSize: 24,
            numberSectionStyles: 4
          },
          journey: {
            useMaxWidth: true,
            diagramMarginX: 50,
            diagramMarginY: 10
          },
          timeline: {
            useMaxWidth: true,
            diagramMarginX: 50,
            diagramMarginY: 10
          },
          gitgraph: {
            useMaxWidth: true,
            diagramPadding: 8,
            nodeLabel: {
              width: 75,
              height: 100,
              x: -25,
              y: -8
            }
          },
          c4: {
            useMaxWidth: true,
            diagramMarginX: 50,
            diagramMarginY: 10
          },
          sankey: {
            useMaxWidth: true,
            width: 600,
            height: 400,
            linkColor: 'gradient',
            nodeAlignment: 'justify'
          },
          block: {
            useMaxWidth: true,
            padding: 8
          },
          packet: {
            useMaxWidth: true,
            rowHeight: 32,
            bitWidth: 32
          }
        });

        // 生成唯一ID
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // 渲染 Mermaid 图表
        const { svg } = await mermaid.render(id, children);
        
        // 处理 SVG 内容
        const processedSvg = svg
          .replace(/max-width:\s*[\d.]+px/, 'max-width: 100%')
          .replace(/width="[\d.]+"/, 'width="100%"')
          .replace(/height="[\d.]+"/, 'height="auto"');

        setSvgContent(processedSvg);
        setIsLoading(false);
      } catch (err) {
        console.error('Mermaid 渲染失败:', err);
        setError(err instanceof Error ? err.message : '渲染失败');
        setIsLoading(false);
      }
    };

    renderMermaid();
  }, [children, isDarkMode]);

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
            正在渲染 Mermaid 图表...
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
          <Box sx={{ fontWeight: 'bold', mb: 1 }}>Mermaid 渲染失败</Box>
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
            color: 'text.secondary'
          }}
        >
          {children}
        </Box>
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      className={`mermaid-preview ${className || ''}`}
      sx={{
        margin: '16px 0',
        padding: 2,
        backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
        borderRadius: 2,
        border: isDarkMode ? '1px solid #404040' : '1px solid #d0d0d0',
        overflow: 'auto',
        textAlign: 'center',
        
        // Mermaid 图表样式优化
        '& svg': {
          maxWidth: '100%',
          height: 'auto',
          display: 'block',
          margin: '0 auto'
        },
        
        // 深色模式下的文本颜色调整
        ...(isDarkMode && {
          '& .node rect, & .node circle, & .node ellipse, & .node polygon': {
            fill: '#2d2d2d',
            stroke: '#555555'
          },
          '& .node .label, & text': {
            fill: '#e6e6e6 !important',
            color: '#e6e6e6 !important'
          },
          '& .edgePath .path': {
            stroke: '#888888'
          },
          '& .arrowheadPath': {
            fill: '#888888',
            stroke: '#888888'
          }
        })
      }}
    >
      <div dangerouslySetInnerHTML={{ __html: svgContent }} />
    </Box>
  );
};

export default memo(MermaidPreview);
