import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  Box
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import type { Message } from '../../shared/types/newMessage.ts';
import MessageEditor from './MessageEditor';
import { TTSService } from '../../shared/services/TTSService';
import { getMainTextContent } from '../../shared/utils/messageUtils';

interface MessageActionsProps {
  message: Message;
  topicId?: string;
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onSwitchVersion?: (messageId: string) => void;
}

const MessageActions: React.FC<MessageActionsProps> = ({
  message,
  topicId,
  onRegenerate,
  onDelete,
  onSwitchVersion
}) => {
  const isUser = message.role === 'user';

  // 菜单状态
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  // 编辑对话框状态
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // TTS播放状态
  const [isPlaying, setIsPlaying] = useState(false);
  // TTS功能启用状态
  const [enableTTS, setEnableTTS] = useState(true);

  // 初始化TTS服务
  useEffect(() => {
    const ttsService = TTSService.getInstance();

    // 从localStorage加载TTS配置
    const apiKey = localStorage.getItem('siliconflow_api_key') || '';
    const model = localStorage.getItem('tts_model') || 'FunAudioLLM/CosyVoice2-0.5B';
    const voice = localStorage.getItem('tts_voice') || 'alex';
    const enabled = localStorage.getItem('enable_tts') !== 'false'; // 默认启用

    // 设置TTS配置
    if (apiKey) {
      ttsService.setApiKey(apiKey);
    }
    if (model && voice) {
      ttsService.setDefaultVoice(model, `${model}:${voice}`);
    }

    // 更新启用状态
    setEnableTTS(enabled);
  }, []);

  // 监听TTS播放状态变化
  useEffect(() => {
    const ttsService = TTSService.getInstance();

    // 检测初始状态
    if (ttsService.getCurrentMessageId() === message.id) {
      setIsPlaying(ttsService.getIsPlaying());
    }

    // 每隔500ms检查一次播放状态
    const intervalId = setInterval(() => {
      const isCurrentlyPlaying = ttsService.getIsPlaying() &&
                                 ttsService.getCurrentMessageId() === message.id;
      if (isPlaying !== isCurrentlyPlaying) {
        setIsPlaying(isCurrentlyPlaying);
      }
    }, 500);

    return () => clearInterval(intervalId);
  }, [message.id, isPlaying]);

  // 打开菜单
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  // 关闭菜单
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // 复制消息内容到剪贴板
  const handleCopyContent = () => {
    if (!message) return;

    try {
      // 使用工具函数获取主文本内容
      const textContent = getMainTextContent(message);

      navigator.clipboard.writeText(textContent);
      // 使用快照通知
      handleMenuClose();
      // 可以使用alert替代snackbar
      alert('内容已复制到剪贴板');
    } catch (error) {
      console.error('复制内容失败:', error);
    }
  };

  // 打开编辑对话框
  const handleEditClick = () => {
    setEditDialogOpen(true);
    handleMenuClose();
  };

  // 删除消息
  const handleDeleteClick = () => {
    if (onDelete) {
      onDelete(message.id);
    }
    handleMenuClose();
  };

  // 重新生成消息
  const handleRegenerateClick = () => {
    if (onRegenerate) {
      onRegenerate(message.id);
    }
    handleMenuClose();
  };

  // 切换版本
  const handleSwitchVersion = () => {
    if (onSwitchVersion) {
      onSwitchVersion(message.id);
    }
    handleMenuClose();
  };

  // 文本转语音
  const handleTextToSpeech = async () => {
    try {
      const ttsService = TTSService.getInstance();
      const content = getMainTextContent(message);

      if (isPlaying) {
        // 如果正在播放，停止
        ttsService.stop();
        setIsPlaying(false);
      } else {
        // 开始播放
        await ttsService.speak(content, message.id);
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('TTS错误:', error);
      alert('文本转语音失败');
    }

    handleMenuClose();
  };

  // 检查是否有多个版本
  const hasMultipleVersions = Array.isArray(message.versions) && message.versions.length > 1;

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {!isUser && enableTTS && (
          <IconButton
            size="small"
            onClick={handleTextToSpeech}
            sx={{
              opacity: 0.6,
              padding: 0.5, // 减小内边距
              backgroundColor: 'rgba(255, 255, 255, 0.5)', // 半透明背景
              '&:hover': {
                opacity: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.8)'
              }
            }}
          >
            {isPlaying ?
              <VolumeOffIcon sx={{ fontSize: '0.9rem' }} /> :
              <VolumeUpIcon sx={{ fontSize: '0.9rem' }} />
            }
          </IconButton>
        )}

        <IconButton
          size="small"
          onClick={handleMenuClick}
          sx={{
            opacity: 0.6,
            padding: 0.5, // 减小内边距
            backgroundColor: 'rgba(255, 255, 255, 0.5)', // 半透明背景
            '&:hover': {
              opacity: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.8)'
            },
            ml: !isUser && enableTTS ? 0.5 : 0 // 如果有TTS按钮，添加左边距
          }}
        >
          <MoreVertIcon sx={{ fontSize: '0.9rem' }} />
        </IconButton>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleCopyContent}>复制内容</MenuItem>
        <MenuItem onClick={handleEditClick}>编辑</MenuItem>
        {!isUser && <MenuItem onClick={handleRegenerateClick}>重新生成</MenuItem>}
        {!isUser && hasMultipleVersions && <MenuItem onClick={handleSwitchVersion}>切换版本</MenuItem>}
        <MenuItem onClick={handleDeleteClick}>删除</MenuItem>
      </Menu>

      {/* 编辑对话框 */}
      <MessageEditor
        message={message}
        topicId={topicId}
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
      />
    </>
  );
};

export default MessageActions;