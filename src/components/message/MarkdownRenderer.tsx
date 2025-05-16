import React, { useState, useEffect } from 'react';
import { Typography, Box, useTheme } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import type { MathRendererType } from '../../shared/types';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const theme = useTheme();
  // 设置数学公式渲染器的状态
  const [mathRenderer, setMathRenderer] = useState<MathRendererType>('KaTeX');

  // 从localStorage加载渲染器设置
  useEffect(() => {
    try {
      const appSettingsJSON = localStorage.getItem('appSettings');
      if (appSettingsJSON) {
        const appSettings = JSON.parse(appSettingsJSON);
        if (appSettings.mathRenderer) {
          setMathRenderer(appSettings.mathRenderer);
        }
      }
    } catch (error) {
      console.error('加载数学公式渲染器设置失败', error);
    }
  }, []);

  // 自定义Markdown样式
  const markdownStyles = {
    h1: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      borderBottom: '1px solid #e0e0e0',
      paddingBottom: '8px',
      marginTop: '16px',
      marginBottom: '16px',
      color: '#000'
    },
    h2: {
      fontSize: '1.25rem',
      fontWeight: 'bold',
      marginTop: '16px',
      marginBottom: '12px',
      color: '#202020'
    },
    h3: {
      fontSize: '1.1rem',
      fontWeight: 'bold',
      marginTop: '12px',
      marginBottom: '8px',
      color: '#303030'
    },
    h4: {
      fontSize: '1rem',
      fontWeight: 'bold',
      marginTop: '8px',
      marginBottom: '4px'
    },
    strong: {
      fontWeight: 'bold',
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
    // 链接样式 - 根据主题自动适应颜色
    a: {
      color: theme.palette.mode === 'dark' 
        ? theme.palette.primary.light  // 深色模式下更亮的蓝色
        : theme.palette.primary.main,  // 浅色模式下标准蓝色
      textDecoration: 'none',
      borderBottom: `1px solid ${theme.palette.mode === 'dark' 
        ? 'rgba(144, 202, 249, 0.5)' 
        : 'rgba(25, 118, 210, 0.5)'}`,
      paddingBottom: '1px',
      transition: 'color 0.2s, border-color 0.2s',
      '&:hover': {
        color: theme.palette.mode === 'dark'
          ? theme.palette.primary.light
          : theme.palette.primary.dark,
        borderBottomColor: theme.palette.mode === 'dark'
          ? theme.palette.primary.light
          : theme.palette.primary.dark,
      }
    }
  };

  // 处理数学公式的渲染，根据设置选择渲染器
  const renderMath = (tex: string, isBlock: boolean) => {
    // 根据选择的渲染器进行渲染
    switch (mathRenderer) {
      case 'KaTeX':
        return isBlock ? <BlockMath math={tex} /> : <InlineMath math={tex} />;
      case 'MathJax':
        // 这里可以使用MathJax渲染，但需要另外安装react-mathjax
        // 简单起见，先用KaTeX渲染
        return isBlock ? <BlockMath math={tex} /> : <InlineMath math={tex} />;
      case 'none':
        // 不渲染数学公式，直接返回原始文本
        return isBlock ? (
          <pre style={{ margin: '8px 0', padding: '8px', backgroundColor: '#f6f8fa' }}>
            {tex}
          </pre>
        ) : (
          <code>{tex}</code>
        );
      default:
        return isBlock ? <BlockMath math={tex} /> : <InlineMath math={tex} />;
    }
  };

  // 使用正则表达式匹配数学公式
  const renderWithMath = (text: string): React.ReactNode[] => {
    // 如果禁用了数学公式渲染，直接返回原始文本
    if (mathRenderer === 'none') {
      return [text];
    }
    
    const blockRegex = /\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]/g;
    const inlineRegex = /\$([^\$]*?)\$|\\\(([\s\S]*?)\\\)/g;
    
    // 首先处理块级公式
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    
    while ((match = blockRegex.exec(text)) !== null) {
      // 添加公式前的文本
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      // 添加数学公式
      const formula = match[1] || match[2];
      parts.push(
        <React.Fragment key={`math-block-${match.index}`}>
          {renderMath(formula, true)}
        </React.Fragment>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // 添加剩余文本
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    // 处理每一部分中的内联公式
    return parts.map((part, index) => {
      if (typeof part !== 'string') {
        return part;
      }
      
      const inlineParts: React.ReactNode[] = [];
      let lastInlineIndex = 0;
      let inlineMatch;
      
      while ((inlineMatch = inlineRegex.exec(part)) !== null) {
        // 添加公式前的文本
        if (inlineMatch.index > lastInlineIndex) {
          inlineParts.push(part.substring(lastInlineIndex, inlineMatch.index));
        }
        
        // 添加内联数学公式
        const formula = inlineMatch[1] || inlineMatch[2];
        inlineParts.push(
          <React.Fragment key={`math-inline-${index}-${inlineMatch.index}`}>
            {renderMath(formula, false)}
          </React.Fragment>
        );
        
        lastInlineIndex = inlineMatch.index + inlineMatch[0].length;
      }
      
      // 添加剩余文本
      if (lastInlineIndex < part.length) {
        inlineParts.push(part.substring(lastInlineIndex));
      }
      
      return inlineParts.length === 1 ? inlineParts[0] : inlineParts;
    });
  };

  return (
    <Box sx={{ 
      wordBreak: 'break-word',
      width: '100%',
      '& img': { maxWidth: '100%' }
    }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 代码高亮处理
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
          // 普通段落，处理内联公式
          p: ({children}) => {
            if (typeof children === 'string') {
              return <p>{renderWithMath(children)}</p>;
            }
            return <p>{children}</p>;
          },
          // 链接样式
          a: ({href, children}) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                color: theme.palette.mode === 'dark' 
                  ? '#90caf9' // 深色模式下的柔和蓝色
                  : '#1976d2', // 浅色模式下的标准蓝色
                textDecoration: 'none',
                borderBottom: `1px solid ${theme.palette.mode === 'dark' 
                  ? 'rgba(144, 202, 249, 0.5)' 
                  : 'rgba(25, 118, 210, 0.5)'}`,
                paddingBottom: '1px',
                transition: 'color 0.2s, border-color 0.2s',
              }}
              onClick={(e) => {
                // 防止链接点击事件冒泡到消息组件
                e.stopPropagation();
              }}
            >
              {children}
            </a>
          ),
          // 增强标题样式
          h1: ({children}) => (
            <Typography 
              variant="h1" 
              component="h1" 
              style={markdownStyles.h1}
            >
              {children}
            </Typography>
          ),
          h2: ({children}) => (
            <Typography 
              variant="h2" 
              component="h2" 
              style={markdownStyles.h2}
            >
              {children}
            </Typography>
          ),
          h3: ({children}) => (
            <Typography 
              variant="h3" 
              component="h3" 
              style={markdownStyles.h3}
            >
              {children}
            </Typography>
          ),
          h4: ({children}) => (
            <Typography 
              variant="h4" 
              component="h4" 
              style={markdownStyles.h4}
            >
              {children}
            </Typography>
          ),
          // 增强列表样式
          ol: ({children}) => (
            <ol style={markdownStyles.ol}>{children}</ol>
          ),
          ul: ({children}) => (
            <ul style={markdownStyles.ul}>{children}</ul>
          ),
          li: ({children}) => (
            <li style={markdownStyles.li}>{children}</li>
          ),
          // 增强引用块样式
          blockquote: ({children}) => (
            <blockquote style={markdownStyles.blockquote}>
              {children}
            </blockquote>
          ),
          // 增强表格样式
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
          // 文本加粗增强
          strong: ({children}) => (
            <strong style={markdownStyles.strong}>{children}</strong>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </Box>
  );
};

export default MarkdownRenderer; 