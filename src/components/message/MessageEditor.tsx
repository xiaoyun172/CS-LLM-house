import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, useMediaQuery, useTheme } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { newMessagesActions } from '../../shared/store/slices/newMessagesSlice';
import type { Message } from '../../shared/types/newMessage.ts';
import type { RootState } from '../../shared/store';
import { getMainTextContent } from '../../shared/utils/messageUtils';
import { UserMessageStatus, AssistantMessageStatus } from '../../shared/types/newMessage.ts';
import { dexieStorage } from '../../shared/services/DexieStorageService';


// 开发环境日志工具
const isDev = process.env.NODE_ENV === 'development';
const devLog = isDev ? console.log : () => {};
const devWarn = isDev ? console.warn : () => {};
const devError = isDev ? console.error : () => {};

interface MessageEditorProps {
  message: Message;
  topicId?: string;
  open: boolean;
  onClose: () => void;
}

const MessageEditor: React.FC<MessageEditorProps> = ({ message, topicId, open, onClose }) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // 🚀 性能优化：只选择当前消息相关的消息块，避免不必要的重渲染
  const relevantMessageBlocks = useSelector((state: RootState) => {
    if (!message.blocks || message.blocks.length === 0) return {};
    const entities = state.messageBlocks.entities;
    const relevant: Record<string, any> = {};
    message.blocks.forEach(blockId => {
      if (entities[blockId]) {
        relevant[blockId] = entities[blockId];
      }
    });
    return relevant;
  });

  // 🚀 性能优化：缓存初始内容，减少重复计算
  const initialContent = useMemo(() => {
    const content = getMainTextContent(message);
    devLog('[MessageEditor] 获取初始内容:', {
      messageId: message.id,
      contentLength: content.length,
      content: content.substring(0, 100) + (content.length > 100 ? '...' : '')
    });
    return content;
  }, [message]);

  const [editedContent, setEditedContent] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const isUser = message.role === 'user';

  // 🚀 性能优化：内容初始化逻辑优化
  useEffect(() => {
    if (open && !isInitialized) {
      devLog('[MessageEditor] 初始化编辑内容:', initialContent);
      setEditedContent(initialContent);
      setIsInitialized(true);
    } else if (!open) {
      // Dialog关闭时重置状态
      setIsInitialized(false);
      setEditedContent('');
    }
  }, [open, initialContent, isInitialized]);

  // 🚀 性能优化：保存逻辑 - 减少数据库调用和日志输出
  const handleSave = useCallback(async () => {
    // 获取编辑后的文本内容
    const editedText = typeof editedContent === 'string'
      ? editedContent.trim()
      : '';

    devLog('[MessageEditor] 保存编辑内容:', {
      messageId: message.id,
      topicId,
      editedTextLength: editedText.length,
      hasBlocks: message.blocks?.length > 0
    });

    if (!topicId || !editedText) {
      devWarn('[MessageEditor] 保存失败: 缺少topicId或内容为空');
      return;
    }

    try {
      // 🚀 性能优化：查找主文本块 - 使用优化后的选择器
      const mainTextBlockId = message.blocks?.find((blockId: string) => {
        const block = relevantMessageBlocks[blockId];
        return block && (
          block.type === 'main_text' ||
          (block.type as string) === 'MAIN_TEXT' ||
          (block.type as string) === 'main_text'
        );
      });

      devLog('[MessageEditor] 找到主文本块:', mainTextBlockId);

      // � 性能优化：批量更新数据库和Redux状态
      const updatedAt = new Date().toISOString();
      const messageUpdates = {
        status: isUser ? UserMessageStatus.SUCCESS : AssistantMessageStatus.SUCCESS,
        updatedAt,
        content: editedText
      };

      // 🚀 性能优化：使用事务批量更新数据库，减少I/O操作
      try {
        await dexieStorage.transaction('rw', [dexieStorage.messages, dexieStorage.message_blocks, dexieStorage.topics], async () => {
          // 更新消息块
          if (mainTextBlockId) {
            await dexieStorage.updateMessageBlock(mainTextBlockId, {
              content: editedText,
              updatedAt
            });
          }

          // 更新消息
          await dexieStorage.updateMessage(message.id, messageUpdates);

          // 更新话题中的消息（如果需要）
          if (topicId) {
            await dexieStorage.updateMessageInTopic(topicId, message.id, {
              ...message,
              ...messageUpdates
            });
          }
        });

        devLog('[MessageEditor] 批量数据库更新完成');
      } catch (dbError) {
        devError('[MessageEditor] 数据库更新失败:', dbError);
        throw dbError; // 重新抛出错误以便后续处理
      }

      // 🚀 性能优化：批量更新Redux状态
      if (mainTextBlockId) {
        dispatch({
          type: 'messageBlocks/updateOneBlock',
          payload: {
            id: mainTextBlockId,
            changes: {
              content: editedText,
              updatedAt
            }
          }
        });
      }

      dispatch(newMessagesActions.updateMessage({
        id: message.id,
        changes: messageUpdates
      }));

      devLog('[MessageEditor] Redux状态更新完成');

      // � 性能优化：直接关闭Dialog，移除不必要的延迟和事件
      // Redux状态更新是同步的，不需要额外的延迟或全局事件
      onClose();

    } catch (error) {
      devError('[MessageEditor] 保存失败:', error);
      alert('保存失败，请重试');
    }
  }, [editedContent, topicId, message, relevantMessageBlocks, dispatch, isUser, onClose]);

  // 🚀 性能优化：关闭处理 - 使用useCallback
  const handleClose = useCallback(() => {
    devLog('[MessageEditor] 关闭编辑器');
    onClose();
  }, [onClose]);

  // 🚀 性能优化：内容变更处理 - 使用useCallback
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedContent(e.target.value);
  }, []);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth={isMobile ? "xs" : "sm"} // 移动端使用更小的宽度
      // 移动端优化：确保Dialog正确显示
      slotProps={{
        paper: {
          sx: {
            margin: isMobile ? 1 : 3,
            maxHeight: isMobile ? '90vh' : '80vh',
            // 移动端确保内容可见
            ...(isMobile && {
              position: 'fixed',
              top: '5%',
              left: '5%',
              right: '5%',
              bottom: 'auto',
              transform: 'none'
            })
          }
        }
      }}
      // 移动端禁用backdrop点击关闭，避免意外关闭
      disableEscapeKeyDown={isMobile}
    >
      <DialogTitle sx={{
        pb: 1,
        fontWeight: 500,
        fontSize: isMobile ? '1.1rem' : '1.25rem' // 移动端字体调整
      }}>
        编辑{isUser ? '消息' : '回复'}
      </DialogTitle>
      <DialogContent sx={{
        pt: 2,
        pb: isMobile ? 1 : 2 // 移动端减少底部间距
      }}>
        <TextField
          multiline
          fullWidth
          minRows={isMobile ? 3 : 4} // 移动端减少最小行数
          maxRows={isMobile ? 8 : 10} // 移动端调整最大行数
          value={editedContent}
          onChange={handleContentChange}
          variant="outlined"
          placeholder={isInitialized ? "请输入内容..." : "正在加载内容..."}
          disabled={!isInitialized} // 未初始化时禁用输入
          autoFocus={isInitialized && !isMobile} // 移动端不自动聚焦，避免键盘弹出问题
          sx={{
            '& .MuiOutlinedInput-root': {
              fontSize: isMobile ? '16px' : '14px', // 移动端使用16px避免缩放
              lineHeight: 1.5
            }
          }}
        />
      </DialogContent>
      <DialogActions sx={{
        px: 3,
        pb: 2,
        gap: 1 // 按钮间距
      }}>
        <Button
          onClick={handleClose}
          color="inherit"
          size={isMobile ? "medium" : "small"}
          sx={{ minWidth: isMobile ? 80 : 'auto' }}
        >
          取消
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={!isInitialized || !editedContent || !editedContent.trim()}
          size={isMobile ? "medium" : "small"}
          sx={{
            mr: 1,
            minWidth: isMobile ? 80 : 'auto'
          }}
        >
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MessageEditor;