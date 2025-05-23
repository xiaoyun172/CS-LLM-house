import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { newMessagesActions } from '../../shared/store/slices/newMessagesSlice';
import type { Message } from '../../shared/types/newMessage.ts';
import type { RootState } from '../../shared/store';
import { getMainTextContent } from '../../shared/utils/messageUtils';
import { UserMessageStatus, AssistantMessageStatus } from '../../shared/types/newMessage.ts';

interface MessageEditorProps {
  message: Message;
  topicId?: string;
  open: boolean;
  onClose: () => void;
}

const MessageEditor: React.FC<MessageEditorProps> = ({ message, topicId, open, onClose }) => {
  const dispatch = useDispatch();

  // 只选择需要的数据，避免不必要的重渲染
  const messageBlocks = useSelector((state: RootState) => state.messageBlocks.entities);

  // 获取消息内容
  const initialContent = getMainTextContent(message);
  const [editedContent, setEditedContent] = useState(initialContent);
  const isUser = message.role === 'user';

  // 保存编辑的消息内容
  const handleSave = async () => {
    // 获取编辑后的文本内容
    const editedText = typeof editedContent === 'string'
      ? editedContent
      : '';

    if (topicId && editedText.trim()) {
      // 查找主文本块
      const mainTextBlockId = message.blocks.find((blockId: string) => {
        const block = messageBlocks[blockId];
        return block && block.type === 'main_text';
      });

      if (mainTextBlockId) {
        // 更新块内容
        dispatch({
          type: 'messageBlocks/updateMessageBlock',
          payload: {
            id: mainTextBlockId,
            changes: {
              content: editedText
            }
          }
        });
      }

      // 同时更新消息对象
      dispatch(newMessagesActions.updateMessage({
        id: message.id,
        changes: {
          // 直接使用新的消息状态
          status: isUser ? UserMessageStatus.SUCCESS : AssistantMessageStatus.SUCCESS
        }
      }));

      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle sx={{ pb: 1, fontWeight: 500 }}>
        编辑{isUser ? '消息' : '回复'}
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <TextField
          multiline
          fullWidth
          minRows={4}
          maxRows={10}
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          variant="outlined"
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" size="small">
          取消
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={!editedContent || !editedContent.trim()}
          sx={{ mr: 1 }}
        >
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MessageEditor;