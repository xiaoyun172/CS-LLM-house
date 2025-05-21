import React from 'react';
import { Box } from '@mui/material';
import type { MainTextMessageBlock } from '../../../shared/types/newMessage';
import Markdown from '../Markdown';

interface Props {
  block: MainTextMessageBlock;
  role: string;
}

/**
 * 主文本块组件
 * 负责渲染消息的主要文本内容
 */
const MainTextBlock: React.FC<Props> = ({ block, role }) => {
  // 用户消息可以选择是否使用Markdown渲染
  const isUserMessage = role === 'user';

  return (
    <Box sx={{ width: '100%' }}>
      {isUserMessage ? (
        <Box sx={{ whiteSpace: 'pre-wrap' }}>
          {block.content}
        </Box>
      ) : (
        <Markdown content={block.content} allowHtml={false} />
      )}
    </Box>
  );
};

export default React.memo(MainTextBlock);
