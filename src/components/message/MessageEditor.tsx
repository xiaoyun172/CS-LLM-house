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

  // 保存编辑的消息内容
  const handleSave = async () => {
    // 获取编辑后的文本内容
    const editedText = typeof editedContent === 'string'
      ? editedContent
      : (editedContent as {text?: string}).text || '';
    
    if (topicId && editedText.trim()) {
      // 更新消息
      dispatch(updateMessage({
        topicId,
        messageId: message.id,
        updates: {
          content: editedText,
          status: 'complete' // 确保状态为完成
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
          disabled={typeof editedContent === 'string' ? !editedContent.trim() : !((editedContent as {text?: string}).text || '').trim()}
          sx={{ mr: 1 }}
        >
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MessageEditor; 