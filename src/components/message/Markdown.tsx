import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { Box, Link } from '@mui/material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownProps {
  content: string;
  allowHtml?: boolean;
}

const Markdown: React.FC<MarkdownProps> = ({ content, allowHtml = false }) => {
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
        backgroundColor: 'grey.100',
        px: 0.5,
        borderRadius: 0.5,
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
                style={vscDarkPlus as any}
                PreTag="div"
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