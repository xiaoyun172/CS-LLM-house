import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
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
import MessageActions from './MessageActions';
import MessageBlockRenderer from './MessageBlockRenderer';
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

  // 调试日志
  console.log(`[MessageItem] 渲染消息: ID=${message.id}, 角色=${message.role}, 状态=${message.status}, 块数量=${blocks.length}`);
  if (blocks.length > 0) {
    blocks.forEach(block => {
      // 安全地获取内容长度
      let contentLength = 0;
      if (block.type === MessageBlockType.MAIN_TEXT ||
          block.type === MessageBlockType.CODE ||
          block.type === MessageBlockType.THINKING ||
          block.type === MessageBlockType.CITATION ||
          block.type === MessageBlockType.TRANSLATION) {
        contentLength = (block as any).content?.length || 0;
      }
      console.log(`[MessageItem] 块信息: ID=${block.id}, 类型=${block.type}, 状态=${block.status}, 内容长度=${contentLength}`);
    });
  }

  // 如果Redux中没有块，从数据库加载
  useEffect(() => {
    const loadBlocks = async () => {
      if (blocks.length === 0 && message.blocks.length > 0) {
        console.log(`[MessageItem] 从数据库加载块: 消息ID=${message.id}, 块ID列表=${message.blocks.join(',')}`);
        try {
          const messageBlocks: MessageBlock[] = [];
          for (const blockId of message.blocks) {
            const block = await dexieStorage.getMessageBlock(blockId);
            if (block) {
              // 安全地获取内容长度
              let contentLength = 0;
              if (block.type === MessageBlockType.MAIN_TEXT ||
                  block.type === MessageBlockType.CODE ||
                  block.type === MessageBlockType.THINKING ||
                  block.type === MessageBlockType.CITATION ||
                  block.type === MessageBlockType.TRANSLATION) {
                contentLength = (block as any).content?.length || 0;
              }
              console.log(`[MessageItem] 从数据库加载块成功: ID=${block.id}, 类型=${block.type}, 内容长度=${contentLength}`);
              messageBlocks.push(block);
            } else {
              console.warn(`[MessageItem] 数据库中找不到块: ID=${blockId}`);
            }
          }

          if (messageBlocks.length > 0) {
            console.log(`[MessageItem] 更新Redux状态: 加载了${messageBlocks.length}个块`);
            dispatch(upsertManyBlocks(messageBlocks));
          } else {
            console.warn(`[MessageItem] 数据库中没有找到任何块: 消息ID=${message.id}`);
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

  // 所有渲染逻辑已移至MessageBlockRenderer组件

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
              ? theme.palette.mode === 'dark'
                ? '#333333' // 深色主题下使用灰色背景
                : theme.palette.primary.light
              : theme.palette.background.paper,
            color: isUserMessage && theme.palette.mode === 'dark'
              ? '#ffffff' // 深色主题下使用白色文字
              : 'inherit',
            width: '100%',
            borderRadius: '12px',
            borderTopLeftRadius: !isUserMessage ? 0 : '12px',
            borderTopRightRadius: isUserMessage ? 0 : '12px',
            position: 'relative', // 确保相对定位
          }}
        >
          {/* 三点菜单按钮 - 根据消息类型放在气泡内部的左上角或右上角 */}
          <Box sx={{
            position: 'absolute',
            top: 2,
            // 用户消息和助手消息都放在右侧
            right: 2,
            left: 'auto',
            zIndex: 2
          }}>
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
          ) : (
            // 使用新的MessageBlockRenderer组件渲染所有块
            <Box sx={{ width: '100%' }}>
              {message.blocks && message.blocks.length > 0 ? (
                <MessageBlockRenderer
                  blocks={message.blocks}
                  message={message}
                  // 无论是用户还是助手消息，右侧都需要额外padding，避免与三点菜单重叠
                  extraPaddingLeft={0}
                  extraPaddingRight={2}
                />
              ) : (
                // 如果消息没有块，显示消息内容
                <Box sx={{
                  p: 1,
                  // 无论是用户还是助手消息，右侧都需要额外padding
                  pl: 1,
                  pr: 3
                }}>
                  {(message as any).content || '(无内容)'}
                </Box>
              )}
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default MessageItem;