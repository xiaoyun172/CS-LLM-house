import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import type { ThinkingMessageBlock } from '../../../shared/types/newMessage';

interface Props {
  block: ThinkingMessageBlock;
}

/**
 * 思考块组件
 * 负责渲染AI的思考过程
 */
const ThinkingBlock: React.FC<Props> = ({ block }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        backgroundColor: theme.palette.mode === 'dark'
          ? 'rgba(0, 0, 0, 0.1)'
          : 'rgba(0, 0, 0, 0.03)',
        padding: '8px 12px',
        borderRadius: '8px',
        marginTop: '8px',
        borderLeft: `3px solid ${theme.palette.primary.main}`
      }}
    >
      <Typography variant="caption" sx={{ color: theme.palette.primary.main, display: 'block', marginBottom: '4px' }}>
        思考过程
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>
        {block.content}
      </Typography>
    </Box>
  );
};

export default React.memo(ThinkingBlock);
