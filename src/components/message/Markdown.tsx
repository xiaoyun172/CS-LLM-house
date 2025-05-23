import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkCjkFriendly from 'remark-cjk-friendly';
import { Box, Link, useTheme } from '@mui/material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownProps {
  content: string;
  allowHtml?: boolean;
}

const Markdown: React.FC<MarkdownProps> = ({ content, allowHtml = false }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // 自定义深色主题样式
  const darkThemeStyle = {
    ...vscDarkPlus,
    'code[class*="language-"]': {
      ...vscDarkPlus['code[class*="language-"]'],
      background: 'transparent',
    },
    'pre[class*="language-"]': {
      ...vscDarkPlus['pre[class*="language-"]'],
      background: '#1e1e1e',
    }
  };

  // 自定义浅色主题样式
  const lightThemeStyle = {
    ...vs,
    'code[class*="language-"]': {
      ...vs['code[class*="language-"]'],
      background: 'transparent',
    },
    'pre[class*="language-"]': {
      ...vs['pre[class*="language-"]'],
      background: '#f5f5f5',
    }
  };

  return (
    <Box sx={{
      // 基础样式
      color: 'text.primary',
      lineHeight: 1.6,
      userSelect: 'text',
      wordBreak: 'break-word',

      // 图片样式
      '& img': { maxWidth: '100%', height: 'auto' },

      // 链接样式
      '& a': {
        color: 'primary.main',
        textDecoration: 'none',
        '&:hover': { textDecoration: 'underline' }
      },

      // 标题样式
      '& h1, & h2, & h3, & h4, & h5, & h6': {
        mt: 2,
        mb: 1,
        fontWeight: 'bold',
        '&:first-of-type': { mt: 0 }
      },
      '& h1': {
        fontSize: '2em',
        borderBottom: 1,
        borderColor: 'divider',
        pb: 0.3
      },
      '& h2': {
        fontSize: '1.5em',
        borderBottom: 1,
        borderColor: 'divider',
        pb: 0.3
      },
      '& h3': { fontSize: '1.2em' },
      '& h4': { fontSize: '1em' },
      '& h5': { fontSize: '0.9em' },
      '& h6': { fontSize: '0.8em' },

      // 段落样式 - 关键的 white-space: pre-wrap
      '& p': {
        my: 1,
        whiteSpace: 'pre-wrap',
        '&:last-child': { mb: 0.5 },
        '&:first-of-type': { mt: 0 }
      },

      // 列表样式
      '& ul, & ol': {
        pl: 3,
        my: 1
      },
      '& li': {
        mb: 0.5,
        '& > ul, & > ol': { my: 0.5 }
      },
      '& ul': { listStyle: 'initial' },

      // 引用样式
      '& blockquote': {
        borderLeft: 4,
        borderColor: 'grey.300',
        pl: 2,
        ml: 0,
        my: 2,
        color: 'text.secondary'
      },

      // 分隔线样式
      '& hr': {
        border: 'none',
        borderTop: 1,
        borderColor: 'divider',
        my: 2.5
      },

      // 行内代码样式
      '& code': {
        fontFamily: 'monospace',
        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        px: 0.5,
        py: 0.25,
        borderRadius: 0.5,
        color: isDarkMode ? '#e3e3e3' : 'inherit',
        wordBreak: 'keep-all',
        whiteSpace: 'pre'
      },

      // 代码块容器样式
      '& pre': {
        m: 0,
        p: 0,
        backgroundColor: 'transparent',
      },

      // span 元素保持预格式化
      '& span': {
        whiteSpace: 'pre'
      },

      // 表格样式
      '& table': {
        borderCollapse: 'collapse',
        my: 1,
        width: '100%'
      },
      '& th, & td': {
        border: 1,
        borderColor: 'divider',
        p: 0.5
      },
      '& th': {
        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
        fontWeight: 'bold'
      }
    }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkCjkFriendly]}
        rehypePlugins={allowHtml ? [rehypeRaw] : []}
        components={{
          a: ({ ...props }) => (
            <Link
              {...props}
              target="_blank"
              rel="noopener noreferrer"
            />
          ),
          img: ({ src, alt, ...props }: any) => {
            // 处理图片显示，支持 base64 和普通 URL
            if (!src) {
              return null;
            }

            return (
              <img
                src={src}
                alt={alt || 'Generated Image'}
                {...props}
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: '8px',
                  margin: '8px 0',
                  display: 'block',
                  ...props.style
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            );
          },
          code: ({ className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';

            return props.inline ? (
              <code className={className} {...props}>
                {children}
              </code>
            ) : (
              <Box
                component="div"
                sx={{
                  margin: 0,
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5',
                  border: isDarkMode ? '1px solid #333' : '1px solid #e0e0e0',
                  overflow: 'auto',
                  '& pre': {
                    margin: 0,
                    padding: '12px',
                    backgroundColor: 'transparent !important',
                    overflow: 'auto',
                  },
                  '& code': {
                    color: isDarkMode ? '#d4d4d4' : '#333333',
                    fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
                    background: 'transparent',
                    fontSize: 'inherit',
                  }
                }}
              >
                <SyntaxHighlighter
                  language={language || 'text'}
                  style={isDarkMode ? darkThemeStyle : lightThemeStyle}
                  PreTag="div"
                  CodeTag="code"
                  customStyle={{
                    margin: 0,
                    padding: '12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: 0,
                  }}
                  codeTagProps={{
                    style: {
                      color: 'inherit',
                      fontFamily: 'inherit',
                      background: 'transparent',
                      fontSize: 'inherit',
                    }
                  }}
                  wrapLongLines={true}
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </Box>
            );
          },
          // 自定义段落渲染，避免嵌套问题
          p: ({ children, ...props }: any) => {
            // 检查子元素中是否包含块级元素
            const hasBlockElement = React.Children.toArray(children).some((child: any) => {
              // 检查是否是代码块
              if (child?.props?.className?.includes('language-') ||
                  (typeof child === 'object' && child?.type?.name === 'SyntaxHighlighter')) {
                return true;
              }

              // 检查是否是其他块级元素（div, pre, etc.）
              if (typeof child === 'object' && child?.type) {
                const tagName = child.type?.name || child.type;
                if (['div', 'pre', 'blockquote', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
                  return true;
                }
              }

              return false;
            });

            if (hasBlockElement) {
              // 如果包含块级元素，使用div而不是p
              return <Box component="div" sx={{ mb: 2, lineHeight: 1.6 }} {...props}>{children}</Box>;
            }

            // 普通段落，只包含内联元素
            return <Box component="p" sx={{ mb: 2, lineHeight: 1.6 }} {...props}>{children}</Box>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </Box>
  );
};

export default Markdown;