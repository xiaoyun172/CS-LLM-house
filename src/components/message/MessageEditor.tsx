import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import { useDispatch } from 'react-redux';
import { updateMessage } from '../../shared/store/messagesSlice';
import type { Message } from '../../shared/types';

interface MessageEditorProps {
  message: Message;
  topicId?: string;
  open: boolean;
  onClose: () => void;
}

const MessageEditor: React.FC<MessageEditorProps> = ({ message, topicId, open, onClose }) => {
  const dispatch = useDispatch();
  const [editedContent, setEditedContent] = useState(message.content);
  const isUser = message.role === 'user';

  // 保存编辑后的内容
  const handleSaveEdit = () => {
    if (topicId && editedContent.trim()) {
      dispatch(updateMessage({
        topicId: topicId,
        messageId: message.id,
        updates: { content: editedContent }
      }));
    }
    onClose();
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
          onClick={handleSaveEdit} 
          variant="contained" 
          color="primary"
          disabled={!editedContent.trim()}
          size="small"
        >
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MessageEditor; 