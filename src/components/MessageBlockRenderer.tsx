import React from 'react';
import { Box, Typography, Skeleton, Alert } from '@mui/material';
import { MessageBlockType, MessageBlockStatus } from '../shared/types/newMessage';
import type { MessageBlock, ToolMessageBlock } from '../shared/types/newMessage';
import CitationsList from './CitationsList';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkCjkFriendly from 'remark-cjk-friendly';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import ToolBlock from './message/blocks/ToolBlock';
import 'katex/dist/katex.min.css';

interface MessageBlockRendererProps {
  block: MessageBlock;
}

/**
 * 消息块渲染器
 * 根据不同的块类型渲染相应的内容
 */
const MessageBlockRenderer: React.FC<MessageBlockRendererProps> = ({ block }) => {
  // 渲染加载状态
  const renderLoadingState = () => (
    <Box sx={{ py: 1 }}>
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" width="80%" />
      <Skeleton variant="text" width="40%" />
    </Box>
  );

  // 渲染错误状态
  const renderErrorState = () => (
    <Alert severity="error" sx={{ my: 1 }}>
      {'content' in block ? String(block.content) || '处理过程中发生错误' : '处理过程中发生错误'}
    </Alert>
  );

  // 根据块类型渲染内容
  switch (block.type) {
    case MessageBlockType.MAIN_TEXT:
      if (block.status === MessageBlockStatus.PROCESSING) {
        return renderLoadingState();
      }
      if (block.status === MessageBlockStatus.ERROR) {
        return renderErrorState();
      }
      return (
        <Box sx={{
          py: 0.5,
          // 添加关键的 white-space: pre-wrap 样式
          '& p': {
            whiteSpace: 'pre-wrap',
            margin: '1em 0',
            '&:first-of-type': { marginTop: 0 },
            '&:last-child': { marginBottom: 0.5 }
          },
          '& span': {
            whiteSpace: 'pre'
          },
          userSelect: 'text',
          wordBreak: 'break-word'
        }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkCjkFriendly, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              // 自定义链接渲染
              a: ({ href, children, ...props }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#3b82f6',
                    textDecoration: 'none'
                  }}
                  {...props}
                >
                  {children}
                </a>
              ),
              // 自定义代码块渲染
              code: ({ className, children, ...props }: any) => {
                const inline = !className;
                if (inline) {
                  return (
                    <code
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.1)',
                        padding: '2px 4px',
                        borderRadius: '3px',
                        fontSize: '0.9em'
                      }}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                }
                return (
                  <pre
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.05)',
                      padding: '12px',
                      borderRadius: '6px',
                      overflow: 'auto',
                      fontSize: '0.9em'
                    }}
                  >
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                );
              }
            }}
          >
            {'content' in block ? block.content || '' : ''}
          </ReactMarkdown>
        </Box>
      );

    case MessageBlockType.THINKING:
      if (block.status === MessageBlockStatus.PROCESSING) {
        return (
          <Box sx={{ py: 1, px: 2, bgcolor: 'rgba(255, 193, 7, 0.1)', borderRadius: 1, mb: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              🤔 思考中...
            </Typography>
            {renderLoadingState()}
          </Box>
        );
      }
      if (block.status === MessageBlockStatus.ERROR) {
        return renderErrorState();
      }
      return (
        <Box sx={{ py: 1, px: 2, bgcolor: 'rgba(255, 193, 7, 0.1)', borderRadius: 1, mb: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            🤔 思考过程
          </Typography>
          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
            {'content' in block ? block.content : ''}
          </Typography>
        </Box>
      );

    case MessageBlockType.CODE:
      if (block.status === MessageBlockStatus.PROCESSING) {
        return renderLoadingState();
      }
      if (block.status === MessageBlockStatus.ERROR) {
        return renderErrorState();
      }
      return (
        <Box sx={{ my: 1 }}>
          <pre
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              padding: '12px',
              borderRadius: '6px',
              overflow: 'auto',
              fontSize: '0.9em'
            }}
          >
            <code>{'content' in block ? block.content : ''}</code>
          </pre>
        </Box>
      );

    case MessageBlockType.IMAGE:
      if (block.status === MessageBlockStatus.PROCESSING) {
        return (
          <Box sx={{ py: 1 }}>
            <Skeleton variant="rectangular" width="100%" height={200} />
          </Box>
        );
      }
      if (block.status === MessageBlockStatus.ERROR) {
        return renderErrorState();
      }
      return (
        <Box sx={{ my: 1 }}>
          <img
            src={'url' in block ? block.url : ''}
            alt="Generated content"
            style={{
              maxWidth: '100%',
              height: 'auto',
              borderRadius: '6px'
            }}
          />
        </Box>
      );

    case MessageBlockType.CITATION:
      if (block.status === MessageBlockStatus.PROCESSING) {
        return renderLoadingState();
      }
      if (block.status === MessageBlockStatus.ERROR) {
        return renderErrorState();
      }
      // 渲染引用列表
      const citations = (block as any).citations || [];
      return <CitationsList citations={citations} />;

    case MessageBlockType.FILE:
      if (block.status === MessageBlockStatus.PROCESSING) {
        return renderLoadingState();
      }
      if (block.status === MessageBlockStatus.ERROR) {
        return renderErrorState();
      }
      return (
        <Box sx={{ my: 1, p: 2, bgcolor: 'rgba(0, 0, 0, 0.05)', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            📎 文件: {'fileName' in block ? (block as any).fileName || '未知文件' : '未知文件'}
          </Typography>
          {'content' in block && (block as any).content && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              {(block as any).content}
            </Typography>
          )}
        </Box>
      );

    case MessageBlockType.ERROR:
      return (
        <Alert severity="error" sx={{ my: 1 }}>
          {'content' in block ? block.content || '发生未知错误' : '发生未知错误'}
        </Alert>
      );

    case MessageBlockType.TOOL:
      const toolBlock = block as ToolMessageBlock;
      return <ToolBlock block={toolBlock} />;

    default:
      return (
        <Box sx={{ py: 1 }}>
          <Typography variant="body2" color="text.secondary">
            未知块类型: {block.type}
          </Typography>
          {'content' in block && block.content && (
            <Typography variant="body2">
              {block.content}
            </Typography>
          )}
        </Box>
      );
  }
};

export default MessageBlockRenderer;
