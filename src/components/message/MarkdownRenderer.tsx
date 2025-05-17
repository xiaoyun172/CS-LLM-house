import React, { useState, useEffect, useRef } from 'react';
import { Typography, Box, useTheme } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const theme = useTheme();
  const renderRef = useRef<number>(0);
  const [renderKey, setRenderKey] = useState<number>(0);

  // 从localStorage加载渲染器设置
  useEffect(() => {
    try {
      // 渲染器类型现在直接使用rehypeKatex，不再需要从设置读取
      localStorage.getItem('appSettings');
      // 读取操作仅作为检查点，以防未来有其他设置需要加载
    } catch (error) {
      console.error('加载渲染器设置失败', error);
    }
  }, []);

  // 内容改变时强制重新渲染
  useEffect(() => {
    renderRef.current += 1;
    setRenderKey(renderRef.current);
  }, [content]);

  // 自定义Markdown样式
  const markdownStyles = {
    h1: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      borderBottom: theme.palette.mode === 'dark' ? '1px solid #666' : '1px solid #e0e0e0',
      paddingBottom: '8px',
      marginTop: '16px',
      marginBottom: '16px',
      color: theme.palette.mode === 'dark' ? '#fff' : '#000'
    },
    h2: {
      fontSize: '1.25rem',
      fontWeight: 'bold',
      marginTop: '16px',
      marginBottom: '12px',
      color: theme.palette.mode === 'dark' ? '#e0e0e0' : '#202020'
    },
    h3: {
      fontSize: '1.1rem',
      fontWeight: 'bold',
      marginTop: '12px',
      marginBottom: '8px',
      color: theme.palette.mode === 'dark' ? '#d0d0d0' : '#303030'
    },
    h4: {
      fontSize: '1rem',
      fontWeight: 'bold',
      marginTop: '8px',
      marginBottom: '4px',
      color: theme.palette.mode === 'dark' ? '#c0c0c0' : '#404040'
    },
    strong: {
      fontWeight: 'bold',
      color: theme.palette.mode === 'dark' ? '#fff' : 'inherit',
    },
    ol: {
      paddingLeft: '20px',
    },
    ul: {
      paddingLeft: '20px',
    },
    li: {
      marginBottom: '4px',
    },
    blockquote: {
      borderLeft: '4px solid #e0e0e0',
      paddingLeft: '12px',
      margin: '8px 0',
      color: '#555',
      fontStyle: 'italic'
    },
    table: {
      borderCollapse: 'collapse' as const,
      width: '100%',
      marginBottom: '16px',
    },
    th: {
      border: '1px solid #e0e0e0',
      padding: '8px',
      backgroundColor: '#f5f5f5',
      textAlign: 'left' as const
    },
    td: {
      border: '1px solid #e0e0e0',
      padding: '8px'
    },
    a: {
      color: theme.palette.mode === 'dark' 
        ? theme.palette.primary.light
        : theme.palette.primary.main,
      textDecoration: 'none',
      borderBottom: `1px solid ${theme.palette.mode === 'dark' 
        ? 'rgba(144, 202, 249, 0.5)' 
        : 'rgba(25, 118, 210, 0.5)'}`,
      paddingBottom: '1px',
      transition: 'color 0.2s, border-color 0.2s',
    }
  };

  return (
    <Box key={renderKey} sx={{ 
      wordBreak: 'break-word',
      width: '100%',
      '& img': { maxWidth: '100%' },
      '& .darkmode-bold': {
        color: '#ffffff',
        fontWeight: 'bold',
        textShadow: '0px 0px 1px rgba(255, 255, 255, 0.3)'
      },
      '& p': {
        color: theme.palette.mode === 'dark' ? '#e6e6e6' : 'inherit'
      },
      '& code': {
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        color: theme.palette.mode === 'dark' ? '#e0e0e0' : 'inherit',
      },
      '& .math-inline': {
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
        borderRadius: '4px',
        padding: '0 4px',
      },
      '& .math-display': {
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
        borderRadius: '4px',
        padding: '8px',
        overflowX: 'auto',
        margin: '8px 0',
      }
    }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({className, children, ...props}) {
            const match = /language-(\w+)/.exec(className || '')
            const isInline = !match && !className;
            return !isInline && match ? (
              <SyntaxHighlighter
                // @ts-ignore
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            )
          },
          a: ({href, children}) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                color: theme.palette.mode === 'dark' 
                  ? '#90caf9'
                  : '#1976d2',
                textDecoration: 'none',
                borderBottom: `1px solid ${theme.palette.mode === 'dark' 
                  ? 'rgba(144, 202, 249, 0.5)' 
                  : 'rgba(25, 118, 210, 0.5)'}`,
                paddingBottom: '1px',
                transition: 'color 0.2s, border-color 0.2s',
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              {children}
            </a>
          ),
          h1: ({children}) => (
            <Typography 
              variant="h1" 
              component="h1" 
              style={markdownStyles.h1}
              sx={{
                fontWeight: 'bold',
                color: theme.palette.mode === 'dark' ? '#fff !important' : 'inherit',
              }}
            >
              {children}
            </Typography>
          ),
          h2: ({children}) => (
            <Typography 
              variant="h2" 
              component="h2" 
              style={markdownStyles.h2}
              sx={{
                fontWeight: 'bold',
                color: theme.palette.mode === 'dark' ? '#e0e0e0 !important' : 'inherit',
              }}
            >
              {children}
            </Typography>
          ),
          h3: ({children}) => (
            <Typography 
              variant="h3" 
              component="h3" 
              style={markdownStyles.h3}
              sx={{
                fontWeight: 'bold',
                color: theme.palette.mode === 'dark' ? '#d0d0d0 !important' : 'inherit',
              }}
            >
              {children}
            </Typography>
          ),
          h4: ({children}) => (
            <Typography 
              variant="h4" 
              component="h4" 
              style={markdownStyles.h4}
              sx={{
                fontWeight: 'bold',
                color: theme.palette.mode === 'dark' ? '#c0c0c0 !important' : 'inherit',
              }}
            >
              {children}
            </Typography>
          ),
          ol: ({children}) => (
            <ol style={markdownStyles.ol}>{children}</ol>
          ),
          ul: ({children}) => (
            <ul style={markdownStyles.ul}>{children}</ul>
          ),
          li: ({children}) => (
            <li style={markdownStyles.li}>{children}</li>
          ),
          blockquote: ({children}) => (
            <blockquote style={markdownStyles.blockquote}>
              {children}
            </blockquote>
          ),
          table: ({children}) => (
            <div style={{overflowX: 'auto', width: '100%'}}>
              <table style={markdownStyles.table}>{children}</table>
            </div>
          ),
          th: ({children}) => (
            <th style={markdownStyles.th}>{children}</th>
          ),
          td: ({children}) => (
            <td style={markdownStyles.td}>{children}</td>
          ),
          strong: ({children}) => (
            <strong 
              style={markdownStyles.strong}
              className={theme.palette.mode === 'dark' ? 'darkmode-bold' : ''}
            >
              {children}
            </strong>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </Box>
  );
};

export default MarkdownRenderer; 