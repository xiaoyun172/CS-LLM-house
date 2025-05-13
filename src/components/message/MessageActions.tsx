import React, { useState, useEffect } from 'react';
import { IconButton, Menu, MenuItem, Box, Chip, Typography, Button, Popover } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import HistoryIcon from '@mui/icons-material/History';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import { useDispatch, useSelector } from 'react-redux';
import type { Message } from '../../shared/types';
import type { RootState } from '../../shared/store';
import { switchToVersion } from '../../shared/store/messagesSlice';
import MessageEditor from '../../components/message/MessageEditor';
import { TTSService } from '../../shared/services/TTSService';

interface MessageActionsProps {
  message: Message;
  topicId?: string;
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
}

const MessageActions: React.FC<MessageActionsProps> = ({ 
  message, 
  topicId, 
  onRegenerate, 
  onDelete 
}) => {
  const dispatch = useDispatch();
  const isUser = message.role === 'user';
  const alternateVersions = !isUser && message.alternateVersions ? message.alternateVersions : [];
  const hasAlternateVersions = alternateVersions.length > 0;
  const versionCount = alternateVersions.length + 1;
  
  // 获取当前主题的所有消息，用于找到各个版本的消息
  const messages = useSelector((state: RootState) => 
    state.messages.messagesByTopic[topicId || ''] || []);

  // 菜单状态
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);
  
  // 编辑对话框状态
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // 版本切换弹出框状态
  const [versionAnchorEl, setVersionAnchorEl] = useState<null | HTMLElement>(null);
  const versionPopoverOpen = Boolean(versionAnchorEl);

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

  // 复制消息内容
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    handleMenuClose();
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
  
  // 打开版本切换弹出框
  const handleVersionMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setVersionAnchorEl(event.currentTarget);
    handleMenuClose();
  };
  
  // 关闭版本切换弹出框
  const handleVersionMenuClose = () => {
    setVersionAnchorEl(null);
  };
  
  // 切换到特定版本
  const handleSwitchVersion = (messageId: string) => {
    if (topicId) {
      dispatch(switchToVersion({ topicId, messageId }));
      handleVersionMenuClose();
    }
  };

  // 切换语音播放状态
  const handlePlayTTS = async () => {
    const ttsService = TTSService.getInstance();
    const newState = await ttsService.togglePlayback(message.id, message.content);
    setIsPlaying(newState);
    handleMenuClose();
  };
  
  // 获取所有版本的消息详情
  const getVersionMessages = () => {
    if (!hasAlternateVersions || !topicId) return [];
    
    // 获取当前版本和其他版本的消息
    const versionIds = [...alternateVersions, message.id];
    return versionIds
      .map(id => messages.find(msg => msg.id === id))
      .filter((msg): msg is Message => !!msg);
  };

  // 如果是用户消息，不显示TTS按钮
  if (isUser) {
    return (
      <>
        {/* 操作按钮 */}
        <IconButton
          size="small"
          onClick={handleMenuClick}
          sx={{
            position: 'absolute', 
            top: 2, 
            right: 2,
            color: '#a0a0a0',
            opacity: 0.7,
            '&:hover': {
              opacity: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.04)'
            }
          }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
        
        {/* 操作菜单 */}
        <Menu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={handleMenuClose}
          PaperProps={{
            sx: { 
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              borderRadius: '6px',
              minWidth: '120px',
            }
          }}
        >
          <MenuItem onClick={handleCopy} sx={{ fontSize: '14px' }}>复制</MenuItem>
          <MenuItem onClick={handleEditClick} sx={{ fontSize: '14px' }}>编辑</MenuItem>
          <MenuItem onClick={handleDeleteClick} sx={{ color: '#f44336', fontSize: '14px' }}>删除</MenuItem>
        </Menu>
        
        {/* 编辑对话框 */}
        {editDialogOpen && (
          <MessageEditor
            message={message}
            topicId={topicId}
            open={editDialogOpen}
            onClose={() => setEditDialogOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      {/* 版本指示器 */}
      {hasAlternateVersions && message.isCurrentVersion && (
        <>
          <Chip
            size="small"
            label={`版本 ${message.version || '?'}/${versionCount}`}
            variant="filled"
            color="info"
            onClick={(e) => setVersionAnchorEl(e.currentTarget)}
            icon={<HistoryIcon style={{ fontSize: 12 }} />}
            sx={{
              position: 'absolute',
              top: -18,
              right: 15,
              height: 20,
              paddingLeft: '2px',
              paddingRight: '4px',
              fontSize: '10px',
              fontWeight: 'medium',
              opacity: 0.95,
              zIndex: 10,
              backgroundColor: 'rgba(79, 146, 255, 0.9)',
              color: 'white',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              borderRadius: '10px',
              border: 'none',
              '&:hover': {
                opacity: 1,
                cursor: 'pointer',
                backgroundColor: 'rgba(64, 132, 244, 1)'
              },
              '& .MuiChip-icon': {
                ml: 0.3,
                mr: -0.3,
                fontSize: '10px',
                color: 'white'
              },
              '& .MuiChip-label': {
                padding: '0 4px',
                lineHeight: 1.2
              }
            }}
          />
          {/* 添加小箭头指向气泡 */}
          <Box
            sx={{
              position: 'absolute',
              top: -3,
              right: 30,
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: '4px solid rgba(79, 146, 255, 0.9)',
              zIndex: 9
            }}
          />
        </>
      )}

      {/* 语音播放按钮 - 仅对AI回复显示且TTS功能启用时 */}
      {enableTTS && (
        <>
          <Chip
            size="small"
            label={isPlaying ? "播放中" : "播放"}
            variant="filled"
            color={isPlaying ? "success" : "primary"}
            onClick={handlePlayTTS}
            icon={isPlaying ? <VolumeUpIcon style={{ fontSize: 12 }} /> : <VolumeOffIcon style={{ fontSize: 12 }} />}
            sx={{
              position: 'absolute',
              top: -18,
              right: hasAlternateVersions && message.isCurrentVersion ? 80 : 15,
              height: 20,
              paddingLeft: '2px',
              paddingRight: '4px',
              fontSize: '10px',
              fontWeight: 'medium',
              opacity: 0.95,
              zIndex: 10,
              backgroundColor: isPlaying ? 'rgba(76, 175, 80, 0.9)' : 'rgba(79, 146, 255, 0.9)',
              color: 'white',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              borderRadius: '10px',
              border: 'none',
              '&:hover': {
                opacity: 1,
                cursor: 'pointer',
                backgroundColor: isPlaying ? 'rgba(56, 155, 60, 1)' : 'rgba(64, 132, 244, 1)'
              },
              '& .MuiChip-icon': {
                ml: 0.3,
                mr: -0.3,
                fontSize: '10px',
                color: 'white'
              },
              '& .MuiChip-label': {
                padding: '0 4px',
                lineHeight: 1.2
              }
            }}
          />
          {/* 添加小箭头指向气泡 */}
          <Box
            sx={{
              position: 'absolute',
              top: -3,
              right: hasAlternateVersions && message.isCurrentVersion ? 95 : 30,
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: '4px solid',
              borderTopColor: isPlaying ? 'rgba(76, 175, 80, 0.9)' : 'rgba(79, 146, 255, 0.9)',
              zIndex: 9
            }}
          />
        </>
      )}

      {/* 操作按钮 */}
      <IconButton
        size="small"
        onClick={handleMenuClick}
        sx={{
          position: 'absolute', 
          top: 2, 
          right: 2,
          color: '#a0a0a0',
          opacity: 0.7,
          '&:hover': {
            opacity: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.04)'
          }
        }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      
      {/* 操作菜单 */}
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { 
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            borderRadius: '6px',
            minWidth: '120px',
          }
        }}
      >
        {enableTTS && (
          <MenuItem onClick={handlePlayTTS} sx={{ fontSize: '14px' }}>
            {isPlaying ? '停止播放' : '语音播放'}
          </MenuItem>
        )}
        <MenuItem onClick={handleCopy} sx={{ fontSize: '14px' }}>复制</MenuItem>
        <MenuItem onClick={handleEditClick} sx={{ fontSize: '14px' }}>编辑</MenuItem>
        <MenuItem onClick={handleRegenerateClick} sx={{ fontSize: '14px' }}>重新生成</MenuItem>
        {hasAlternateVersions && (
          <MenuItem onClick={handleVersionMenuOpen} sx={{ fontSize: '14px' }}>历史版本</MenuItem>
        )}
        <MenuItem onClick={handleDeleteClick} sx={{ color: '#f44336', fontSize: '14px' }}>删除</MenuItem>
      </Menu>
      
      {/* 版本切换弹出框 */}
      <Popover
        open={versionPopoverOpen}
        anchorEl={versionAnchorEl}
        onClose={handleVersionMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        PaperProps={{
          sx: { 
            p: 2,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            borderRadius: '6px',
            maxWidth: '300px'
          }
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          回复历史版本
        </Typography>
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            您可以切换查看AI回复的不同版本
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
          {getVersionMessages().map((versionMsg, index) => (
            <Button
              key={versionMsg.id}
              variant={versionMsg.isCurrentVersion ? "contained" : "outlined"}
              size="small"
              onClick={() => handleSwitchVersion(versionMsg.id)}
              sx={{ 
                justifyContent: 'flex-start',
                textTransform: 'none',
                fontSize: '13px',
                py: 0.75
              }}
            >
              版本 {versionMsg.version || index + 1}
              {versionMsg.isCurrentVersion && " (当前)"}
            </Button>
          ))}
        </Box>
      </Popover>
      
      {/* 编辑对话框 */}
      {editDialogOpen && (
        <MessageEditor
          message={message}
          topicId={topicId}
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
        />
      )}
    </>
  );
};

export default MessageActions; 