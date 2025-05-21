import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
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
      '& img': { maxWidth: '100%' },
      '& a': { color: 'primary.main' },
      '& h1, & h2, & h3, & h4, & h5, & h6': { mt: 2, mb: 1 },
      '& p': { my: 1 },
      '& ul, & ol': { pl: 3 },
      '& blockquote': { 
        borderLeft: 4, 
        borderColor: 'grey.300', 
        pl: 2, 
        ml: 0, 
        my: 2,
        color: 'text.secondary'
      },
      '& code': {
        fontFamily: 'monospace',
        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        px: 0.5,
        borderRadius: 0.5,
        color: isDarkMode ? '#e3e3e3' : 'inherit'
      },
      '& pre': {
        m: 0,
        p: 0,
        backgroundColor: 'transparent',
      }
    }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={allowHtml ? [rehypeRaw] : []}
        components={{
          a: ({ ...props }) => (
            <Link 
              {...props} 
              target="_blank" 
              rel="noopener noreferrer"
            />
          ),
          code: ({ className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            
            return props.inline ? (
              <code className={className} {...props}>
                {children}
              </code>
            ) : (
              <SyntaxHighlighter
                language={language || 'text'}
                style={isDarkMode ? darkThemeStyle : lightThemeStyle}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5',
                  border: isDarkMode ? '1px solid #333' : '1px solid #e0e0e0',
                }}
                codeTagProps={{
                  style: {
                    color: isDarkMode ? '#d4d4d4' : '#333333',
                    fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
                    background: 'transparent' // 确保代码文本背景为透明
                  }
                }}
                wrapLongLines={true}
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </Box>
  );
};

export default Markdown; 