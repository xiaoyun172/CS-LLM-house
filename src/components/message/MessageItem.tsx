import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Avatar,
  Paper,
  useTheme,
  Skeleton
} from '@mui/material';
import type { Message, MessageBlock } from '../../shared/types/newMessage.ts';
import { MessageBlockType } from '../../shared/types/newMessage.ts';
import { messageBlocksSelectors } from '../../shared/store/slices/messageBlocksSlice';
import { dexieStorage } from '../../shared/services/DexieStorageService';
import { upsertManyBlocks } from '../../shared/store/slices/messageBlocksSlice';
import Markdown from './Markdown';
import CodeBlock from './CodeBlock';
import MessageActions from './MessageActions';
import TranslationBlock from './TranslationBlock';
import TableBlock from './TableBlock';
import MultiModelBlock from './MultiModelBlock';
import ChartBlock from './ChartBlock';
import MathBlock from './MathBlock';
import type { RootState } from '../../shared/store';

interface MessageItemProps {
  message: Message;
  showAvatar?: boolean;
  isCompact?: boolean;
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  forceUpdate?: () => void;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  showAvatar = true,
  isCompact = false,
  onRegenerate,
  onDelete,
  forceUpdate
}) => {
  const dispatch = useDispatch();
  const theme = useTheme();

  // 从Redux状态中获取块
  const blocks = useSelector((state: RootState) =>
    message.blocks
      .map((blockId: string) => messageBlocksSelectors.selectById(state, blockId))
      .filter(Boolean) as MessageBlock[]
  );

  const loading = useSelector((state: RootState) =>
    state.messageBlocks.loadingState === 'loading'
  );

  // 如果Redux中没有块，从数据库加载
  useEffect(() => {
    const loadBlocks = async () => {
      if (blocks.length === 0 && message.blocks.length > 0) {
        try {
          const messageBlocks: MessageBlock[] = [];
          for (const blockId of message.blocks) {
            const block = await dexieStorage.getMessageBlock(blockId);
            if (block) {
              messageBlocks.push(block);
            }
          }

          if (messageBlocks.length > 0) {
            dispatch(upsertManyBlocks(messageBlocks));
          }
        } catch (error) {
          console.error('加载消息块失败:', error);
        }
      }
    };

    loadBlocks();
  }, [message.blocks, blocks.length, dispatch]);

  // 在块状态变化时，可以使用forceUpdate触发重新渲染
  useEffect(() => {
    if (message.status === 'streaming' && forceUpdate) {
      // 定期触发强制更新以确保UI反映最新状态
      const interval = setInterval(() => {
        forceUpdate();
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [message.status, forceUpdate]);

  // 渲染主文本块
  const renderMainTextBlock = (block: MessageBlock) => {
    if (block.type !== MessageBlockType.MAIN_TEXT) return null;
    return (
      <Markdown content={block.content} allowHtml={false} />
    );
  };

  // 渲染思考块
  const renderThinkingBlock = (block: MessageBlock) => {
    if (block.type !== MessageBlockType.THINKING) return null;
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

  // 渲染图片块
  const renderImageBlock = (block: MessageBlock) => {
    if (block.type !== MessageBlockType.IMAGE) return null;
    return (
      <Box
        component="img"
        src={block.url}
        alt="图片"
        sx={{
          maxWidth: '100%',
          maxHeight: '400px',
          borderRadius: '4px',
          marginTop: '8px'
        }}
      />
    );
  };

  // 渲染代码块
  const renderCodeBlock = (block: MessageBlock) => {
    if (block.type !== MessageBlockType.CODE) return null;
    return (
      <CodeBlock
        code={block.content}
        language={block.language || 'text'}
      />
    );
  };

  // 根据块类型渲染不同内容
  const renderBlock = (block: MessageBlock) => {
    switch (block.type) {
      case MessageBlockType.MAIN_TEXT:
        return renderMainTextBlock(block);
      case MessageBlockType.THINKING:
        return renderThinkingBlock(block);
      case MessageBlockType.IMAGE:
        return renderImageBlock(block);
      case MessageBlockType.CODE:
        return renderCodeBlock(block);
      case MessageBlockType.CITATION:
        return (
          <Box sx={{ fontStyle: 'italic', marginTop: '8px', borderLeft: `2px solid ${theme.palette.grey[400]}`, paddingLeft: '8px' }}>
            {block.content}
            {block.source && <Typography variant="caption" display="block">— {block.source}</Typography>}
          </Box>
        );
      case MessageBlockType.TRANSLATION:
        return <TranslationBlock block={block} />;
      case MessageBlockType.TABLE:
        return <TableBlock block={block} />;
      case MessageBlockType.MULTI_MODEL:
        return <MultiModelBlock block={block} />;
      case MessageBlockType.CHART:
        return <ChartBlock block={block} />;
      case MessageBlockType.MATH:
        return <MathBlock block={block} />;
      default:
        return null;
    }
  };

  const isUserMessage = message.role === 'user';

  return (
    <Box
      sx={{
        display: 'flex',
        marginBottom: isCompact ? 1 : 2,
        paddingX: 2,
        alignItems: 'flex-start',
        flexDirection: isUserMessage ? 'row-reverse' : 'row',
      }}
    >
      {showAvatar && (
        <Avatar
          sx={{
            bgcolor: isUserMessage ? 'primary.main' : 'secondary.main',
            marginLeft: isUserMessage ? 1.5 : 0,
            marginRight: isUserMessage ? 0 : 1.5,
            width: 36,
            height: 36
          }}
        >
          {isUserMessage ? 'U' : 'A'}
        </Avatar>
      )}

      <Box sx={{ position: 'relative', maxWidth: '80%' }}>
        {/* 消息气泡 */}
        <Paper
          elevation={0}
          sx={{
            padding: 1.5,
            backgroundColor: isUserMessage
              ? theme.palette.primary.light
              : theme.palette.background.paper,
            width: '100%',
            borderRadius: '12px',
            borderTopLeftRadius: !isUserMessage ? 0 : '12px',
            borderTopRightRadius: isUserMessage ? 0 : '12px',
            position: 'relative', // 确保相对定位
          }}
        >
          {/* 三点菜单按钮 - 放在气泡内部右上角 */}
          <Box sx={{ position: 'absolute', top: 2, right: 2, zIndex: 2 }}>
            <MessageActions
              message={message as any}
              topicId={message.topicId}
              onRegenerate={onRegenerate}
              onDelete={onDelete}
            />
          </Box>

          {loading ? (
            <>
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="text" width="60%" />
            </>
          ) : blocks.length > 0 ? (
            blocks.map(block => (
              <Box key={block.id} sx={{ marginBottom: 1 }}>
                {renderBlock(block)}
              </Box>
            ))
          ) : (
            // 如果没有块但有消息内容，直接显示消息内容
            <Typography variant="body1">
              {'(无内容)'}
            </Typography>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default MessageItem;