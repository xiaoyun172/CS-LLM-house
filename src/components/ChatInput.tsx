import React, { useState } from 'react';
import { TextField, IconButton, Box, CircularProgress, Paper } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PhotoIcon from '@mui/icons-material/Photo';
import KeyboardVoiceIcon from '@mui/icons-material/KeyboardVoice';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading = false }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage('');
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        borderTop: '1px solid #f0f0f0',
        bgcolor: '#f9f9f9', // 微信输入框背景色
        p: 1.5,
        position: 'relative',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 0.5,
          borderRadius: 3,
          bgcolor: '#ffffff',
          border: 'none',
        }}
      >
        {/* 功能图标区域 */}
        <Box sx={{ display: 'flex', mx: 1 }}>
          <IconButton
            size="small"
            sx={{ color: '#797979' }}
          >
            <KeyboardVoiceIcon fontSize="small" />
          </IconButton>
        </Box>
        
        {/* 输入框 */}
        <TextField
          fullWidth
          variant="standard"
          placeholder="和Cherry说点什么"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={isLoading}
          sx={{
            '& .MuiInput-underline:before': { borderBottom: 'none' },
            '& .MuiInput-underline:after': { borderBottom: 'none' },
            '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottom: 'none' },
            mx: 1,
            '& .MuiInputBase-input': {
              py: 1,
              fontSize: '15px',
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          multiline
          maxRows={4}
        />
        
        {/* 其他功能图标和发送按钮 */}
        <Box sx={{ display: 'flex' }}>
          <IconButton
            size="small"
            sx={{ color: '#797979', mx: 0.5 }}
          >
            <PhotoIcon fontSize="small" />
          </IconButton>
          
          <IconButton
            size="small"
            sx={{ color: '#797979', mx: 0.5 }}
          >
            <AddCircleOutlineIcon fontSize="small" />
          </IconButton>
          
          {message.trim() ? (
            <IconButton
              color="primary"
              type="submit"
              disabled={isLoading}
              sx={{
                color: '#07c160', // 微信发送按钮绿色
                mx: 0.5,
              }}
            >
              {isLoading ? <CircularProgress size={20} thickness={5} /> : <SendIcon />}
            </IconButton>
          ) : null}
        </Box>
      </Paper>
    </Box>
  );
};

export default ChatInput;
