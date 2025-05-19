import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  Avatar
} from '@mui/material';

// 导入常用的emoji表情
const COMMON_EMOJIS = [
  '😀', '😊', '🤖', '👨‍💻', '👩‍💻', '🧠', '🚀', '🔍', '📚', '💡', 
  '🎯', '🎨', '🎮', '🌍', '💻', '📝', '📊', '🧩', '⚙️', '🔧',
  '🧪', '🔬', '🏆', '🎓', '💼', '📈', '💰', '🛒', '🤝', '📱',
  '💬', '📧', '📅', '🔐', '🔑', '🛡️', '📁', '📋', '📌', '🧲'
];

interface AssistantIconPickerProps {
  open: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  currentEmoji?: string;
}

/**
 * 助手图标选择器组件
 */
export default function AssistantIconPicker({
  open,
  onClose,
  onSelectEmoji,
  currentEmoji
}: AssistantIconPickerProps) {
  const [selectedEmoji, setSelectedEmoji] = useState<string>(currentEmoji || '');

  const handleEmojiSelect = (emoji: string) => {
    setSelectedEmoji(emoji);
  };

  const handleConfirm = () => {
    if (selectedEmoji) {
      onSelectEmoji(selectedEmoji);
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>选择助手图标</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          从下方选择一个emoji作为助手图标：
        </Typography>
        
        {selectedEmoji && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <Avatar
              sx={{
                width: 64,
                height: 64,
                fontSize: '2.5rem',
                bgcolor: 'primary.main'
              }}
            >
              {selectedEmoji}
            </Avatar>
          </Box>
        )}
        
        <Box 
          sx={{ 
            display: 'grid', 
            gridTemplateColumns: {
              xs: 'repeat(5, 1fr)',
              sm: 'repeat(8, 1fr)'
            },
            gap: 1
          }}
        >
          {COMMON_EMOJIS.map((emoji) => (
            <Box key={emoji} sx={{ display: 'flex', justifyContent: 'center' }}>
              <IconButton
                onClick={() => handleEmojiSelect(emoji)}
                sx={{
                  width: 40,
                  height: 40,
                  fontSize: '1.5rem',
                  border: selectedEmoji === emoji ? '2px solid' : 'none',
                  borderColor: 'primary.main',
                  borderRadius: '8px'
                }}
              >
                {emoji}
              </IconButton>
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={handleConfirm} color="primary" variant="contained">
          确认
        </Button>
      </DialogActions>
    </Dialog>
  );
} 