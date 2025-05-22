import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  Box,
  useTheme,
  Chip,
  Popover,
  Typography,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import HistoryIcon from '@mui/icons-material/History';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import type { Message } from '../../shared/types/newMessage.ts';
import MessageEditor from './MessageEditor';
import { TTSService } from '../../shared/services/TTSService';
import { getMainTextContent } from '../../shared/utils/messageUtils';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { TopicService } from '../../shared/services/TopicService';
import { newMessagesActions } from '../../shared/store/slices/newMessagesSlice';

interface MessageActionsProps {
  message: Message;
  topicId?: string;
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onSwitchVersion?: (messageId: string) => void;
  renderMode?: 'full' | 'menuOnly'; // 新增渲染模式参数
}

const MessageActions: React.FC<MessageActionsProps> = ({
  message,
  topicId,
  onRegenerate,
  onDelete,
  onSwitchVersion,
  renderMode = 'full' // 默认为完整渲染模式
}) => {
  const isUser = message.role === 'user';
  const theme = useTheme();

  // AI回复气泡颜色
  const aiBubbleColor = theme.palette.mode === 'dark' ? '#1a3b61' : '#e6f4ff';
  // 气泡激活颜色，稍微深一点
  const aiBubbleActiveColor = theme.palette.mode === 'dark' ? '#234b79' : '#d3e9ff';
  // 文字颜色
  const textColor = theme.palette.mode === 'dark' ? '#ffffff' : '#333333';

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

  // 创建分支
  const handleCreateBranch = async () => {
    try {
      if (!topicId) {
        console.error('[MessageActions] 无法创建分支: 缺少topicId');
        alert('无法创建分支: 缺少主题ID');
        return;
      }

      // 显示加载提示
      alert('正在创建分支...');

      // 调用TopicService创建分支
      const newTopic = await TopicService.createTopicBranch(topicId, message.id);

      if (newTopic) {
        console.log(`[MessageActions] 成功创建分支主题: ${newTopic.id}`);

        // 确保切换到新主题
        import('../../shared/store').then(({ default: store }) => {
          // 显式设置当前主题ID
          store.dispatch(newMessagesActions.setCurrentTopicId(newTopic.id));

          // 强制刷新页面以确保切换到新主题
          setTimeout(() => {
            window.location.reload();
          }, 500);
        });

        // 成功提示
        alert(`已创建分支: ${newTopic.name}，即将切换到新分支...`);
      } else {
        console.error('[MessageActions] 创建分支失败');
        alert('创建分支失败，请重试');
      }
    } catch (error) {
      console.error('[MessageActions] 创建分支错误:', error);
      alert('创建分支时发生错误');
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

  // 检查是否有多个版本 - 放宽条件，对象存在且长度至少为1也显示历史按钮，方便调试
  // 旧逻辑: const hasMultipleVersions = Array.isArray(message.versions) && message.versions.length > 1;
  const hasMultipleVersions = Array.isArray(message.versions) && message.versions.length >= 1;

  // 调试日志，查看versions数据
  console.log(`[MessageActions] 消息ID=${message.id}, 角色=${message.role}, 有versions属性=${!!message.versions}, 版本数量=${message.versions?.length || 0}`, message.versions);

  // 获取当前版本号
  const getCurrentVersionNumber = () => {
    if (!message.versions || message.versions.length === 0) return 1;

    // 找到当前激活的版本索引
    const currentIndex = message.versions.findIndex(v => v.isActive);

    // 如果找到激活版本，版本号是索引+1；否则返回1
    return currentIndex >= 0 ? currentIndex + 1 : 1;
  };

  // 获取总版本数
  const getTotalVersionCount = () => {
    return message.versions?.length || 1;
  };

  // 切换到特定版本
  const handleSwitchToVersion = (versionId: string) => {
    if (onSwitchVersion) {
      onSwitchVersion(versionId);
    }

    // 关闭弹窗
    setVersionAnchorEl(null);
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: zhCN
      });
    } catch (error) {
      console.error('日期格式化错误:', error);
      return '未知时间';
    }
  };

  return (
    <>
      {/* 根据renderMode决定渲染哪些部分 */}
      {renderMode === 'full' && (
        /* 只显示版本指示器和播放按钮，不显示三点菜单 */
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {/* 只有助手消息且有多个版本时显示版本指示器 */}
          {!isUser && hasMultipleVersions && (
            <Chip
              size="small"
              label={`版本 ${getCurrentVersionNumber()}/${getTotalVersionCount()}`}
              variant="filled"
              color="info"
              onClick={(e) => setVersionAnchorEl(e.currentTarget)}
              icon={<HistoryIcon style={{ fontSize: 12 }} />}
              sx={{
                height: 18,
                paddingLeft: '2px',
                paddingRight: '4px',
                fontSize: '10px',
                fontWeight: 'medium',
                opacity: 0.95,
                backgroundColor: aiBubbleColor,
                color: textColor,
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                borderRadius: '10px',
                border: 'none',
                '&:hover': {
                  opacity: 1,
                  cursor: 'pointer',
                  backgroundColor: aiBubbleActiveColor
                },
                '& .MuiChip-icon': {
                  ml: 0.3,
                  mr: -0.3,
                  fontSize: '10px',
                  color: textColor
                },
                '& .MuiChip-label': {
                  padding: '0 4px',
                  lineHeight: 1.2
                }
              }}
            />
          )}

          {!isUser && enableTTS && (
            <Chip
              size="small"
              label={isPlaying ? "播放中" : "播放"}
              variant="filled"
              color="primary"
              onClick={handleTextToSpeech}
              icon={isPlaying ? <VolumeUpIcon style={{ fontSize: 12 }} /> : <VolumeOffIcon style={{ fontSize: 12 }} />}
              sx={{
                height: 18,
                paddingLeft: '2px',
                paddingRight: '4px',
                fontSize: '10px',
                fontWeight: 'medium',
                opacity: 0.95,
                backgroundColor: isPlaying ? aiBubbleActiveColor : aiBubbleColor,
                color: textColor,
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                borderRadius: '10px',
                border: 'none',
                '&:hover': {
                  opacity: 1,
                  cursor: 'pointer',
                  backgroundColor: aiBubbleActiveColor
                },
                '& .MuiChip-icon': {
                  ml: 0.3,
                  mr: -0.3,
                  fontSize: '10px',
                  color: textColor
                },
                '& .MuiChip-label': {
                  padding: '0 4px',
                  lineHeight: 1.2
                }
              }}
            />
          )}
        </Box>
      )}

      {/* 三点菜单按钮 - 只在menuOnly模式下显示 */}
      {renderMode === 'menuOnly' && (
        <IconButton
          size="small"
          onClick={handleMenuClick}
          sx={{
            padding: 0.5,
            backgroundColor: theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.15)'
              : 'rgba(0, 0, 0, 0.08)',
            borderRadius: '50%',
            width: 20,
            height: 20,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            opacity: 0.8,
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            '&:hover': {
              opacity: 1,
              backgroundColor: theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.25)'
                : 'rgba(0, 0, 0, 0.15)'
            }
          }}
        >
          <MoreVertIcon sx={{ fontSize: '0.9rem' }} />
        </IconButton>
      )}

      {/* 版本切换弹出框 */}
      <Popover
        open={versionPopoverOpen}
        anchorEl={versionAnchorEl}
        onClose={() => setVersionAnchorEl(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            maxWidth: '250px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
            borderRadius: '8px',
            mt: 0.5
          }
        }}
      >
        <Box sx={{ p: 1 }}>
          <Typography variant="subtitle2" sx={{ p: 1, fontWeight: 'bold' }}>
            消息版本历史
          </Typography>
          <List dense sx={{ maxHeight: '300px', overflow: 'auto' }}>
            {message.versions?.map((version, index) => (
              <ListItem
                key={version.id}
                onClick={() => handleSwitchToVersion(version.id)}
                sx={{
                  borderRadius: '4px',
                  mb: 0.5,
                  backgroundColor: version.isActive
                    ? (theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.2)' : 'rgba(25, 118, 210, 0.1)')
                    : 'transparent',
                  '&:hover': {
                    backgroundColor: theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.04)'
                  },
                  cursor: 'pointer'
                }}
              >
                <ListItemText
                  primary={`版本 ${index + 1}`}
                  secondary={`${formatTime(version.createdAt)}${version.isActive ? ' (当前)' : ''}`}
                  primaryTypographyProps={{ fontSize: '0.9rem' }}
                  secondaryTypographyProps={{ fontSize: '0.75rem' }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </Popover>

      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left', // 改为left，避免菜单覆盖主聊天内容
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left', // 改为left，确保菜单从左侧展开
        }}
      >
        <MenuItem onClick={handleCopyContent}>复制内容</MenuItem>
        <MenuItem onClick={handleEditClick}>编辑</MenuItem>
        {!isUser && <MenuItem onClick={handleRegenerateClick}>重新生成</MenuItem>}
        {!isUser && <MenuItem onClick={() => {
          handleMenuClose();
          // 使用消息ID作为DOM元素ID参考
          const messageElement = document.getElementById(`message-${message.id}`);
          setVersionAnchorEl(messageElement || document.body);
        }}>查看历史版本</MenuItem>}
        <MenuItem onClick={handleCreateBranch} sx={{ display: 'flex', alignItems: 'center' }}>
          <CallSplitIcon fontSize="small" sx={{ mr: 1 }} />
          分支
        </MenuItem>
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