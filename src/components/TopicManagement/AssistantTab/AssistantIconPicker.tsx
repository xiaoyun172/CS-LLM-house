import { useState } from 'react';
import {
  Popover,
  Box,
  IconButton,
  Typography
} from '@mui/material';

// 导入常用的emoji表情
export const COMMON_EMOJIS = [
  '😀', '😊', '🤖', '👨‍💻', '👩‍💻', '🧠', '🚀', '🔍', '📚', '💡', 
  '🎯', '🎨', '🎮', '🌍', '💻', '📝', '📊', '🧩', '⚙️', '🔧',
  '🧪', '🔬', '🏆', '🎓', '💼', '📈', '💰', '🛒', '🤝', '📱',
  '💬', '📧', '📅', '🔐', '🔑', '🛡️', '📁', '📋', '📌', '🧲'
];

interface AssistantIconPickerProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  currentEmoji?: string;
}

/**
 * 助手图标选择器组件 - 改为Popover形式
 */
export default function AssistantIconPicker({
  anchorEl,
  open,
  onClose,
  onSelectEmoji,
  currentEmoji
}: AssistantIconPickerProps) {
  const [selectedEmoji, setSelectedEmoji] = useState<string>(currentEmoji || '');

  const handleEmojiSelect = (emoji: string) => {
    setSelectedEmoji(emoji);
    onSelectEmoji(emoji);
    onClose();
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
    >
      <Box sx={{ p: 2, maxWidth: 300 }}>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          选择一个emoji作为助手图标
        </Typography>
        
        <Box 
          sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(8, 1fr)',
            gap: 1
          }}
        >
          {COMMON_EMOJIS.map((emoji) => (
            <IconButton
              key={emoji}
              onClick={() => handleEmojiSelect(emoji)}
              sx={{
                width: 32,
                height: 32,
                fontSize: '1.2rem',
                border: selectedEmoji === emoji ? '2px solid' : 'none',
                borderColor: 'primary.main'
              }}
            >
              {emoji}
            </IconButton>
          ))}
        </Box>
      </Box>
    </Popover>
  );
} 