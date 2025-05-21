import React from 'react';
import { Box, Typography, Link, useTheme } from '@mui/material';
import type { CitationMessageBlock } from '../../../shared/types/newMessage';

interface Props {
  block: CitationMessageBlock;
}

/**
 * 引用块组件
 * 负责渲染引用内容，如网络搜索结果
 */
const CitationBlock: React.FC<Props> = ({ block }) => {
  const theme = useTheme();

  // 如果没有引用内容，不渲染任何内容
  if (!block.sources || block.sources.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
        引用来源
      </Typography>

      {block.sources.map((source, index) => (
        <Box
          key={index}
          sx={{
            mb: 1,
            p: 1,
            borderLeft: `3px solid ${theme.palette.primary.main}`,
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.03)',
            borderRadius: '4px'
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {index + 1}. {source.title || '未知来源'}
          </Typography>

          {source.url && (
            <Link
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                display: 'block',
                fontSize: '0.8rem',
                mb: 0.5,
                color: theme.palette.primary.main,
                wordBreak: 'break-all'
              }}
            >
              {source.url}
            </Link>
          )}

          {source.content && (
            <Typography variant="body2" sx={{ fontSize: '0.8rem', color: theme.palette.text.secondary }}>
              {source.content.length > 200 ? `${source.content.substring(0, 200)}...` : source.content}
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
};

export default React.memo(CitationBlock);
