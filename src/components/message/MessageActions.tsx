import React, { useState, useEffect } from 'react';
import { IconButton, Menu, MenuItem, Box, Chip, Typography, Button, Popover } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import HistoryIcon from '@mui/icons-material/History';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import ForkRightIcon from '@mui/icons-material/ForkRight';
import { useDispatch, useSelector } from 'react-redux';
import type { Message } from '../../shared/types';
import type { RootState } from '../../shared/store';
import { switchToVersion } from '../../shared/store/messagesSlice';
import MessageEditor from '../../components/message/MessageEditor';
import { TTSService } from '../../shared/services/TTSService';
import { useTheme } from '@mui/material/styles';
import { TopicService } from '../../shared/services/TopicService';

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
  const dispatch = useDispatch();
  const isUser = message.role === 'user';
  const alternateVersions = !isUser && message.alternateVersions ? message.alternateVersions : [];
  const hasAlternateVersions = alternateVersions.length > 0;
  
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

  const theme = useTheme();
  // AI回复气泡颜色
  const aiBubbleColor = theme.palette.mode === 'dark' ? '#1a3b61' : '#e6f4ff';
  // 气泡激活颜色，稍微深一点
  const aiBubbleActiveColor = theme.palette.mode === 'dark' ? '#234b79' : '#d3e9ff';
  // 文字颜色
  const textColor = theme.palette.mode === 'dark' ? '#ffffff' : '#333333';

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
      // 根据内容类型获取文本
      const textContent = typeof message.content === 'string'
        ? message.content
        : (message.content as {text?: string}).text || '';
        
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
  
  // 打开版本切换弹出框
  const handleVersionMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setVersionAnchorEl(event.currentTarget);
    handleMenuClose();
  };
  
  // 关闭版本切换弹出框
  const handleVersionMenuClose = () => {
    setVersionAnchorEl(null);
  };
  
  // 获取所有版本的消息详情
  const getVersionMessages = () => {
    if (!topicId) return [];
    
    // 获取相关的所有版本ID
    let versionIds: string[] = [];
    
    // 如果当前消息有alternateVersions，添加所有相关ID
    if (message.alternateVersions && message.alternateVersions.length > 0) {
      versionIds = [...message.alternateVersions, message.id];
    }
    
    // 查找引用了当前消息作为替代版本的消息
    const relatedMessages = messages.filter(
      msg => msg.id !== message.id && msg.alternateVersions && msg.alternateVersions.includes(message.id)
    );
    
    // 添加这些消息的ID及其alternateVersions
    relatedMessages.forEach(msg => {
      versionIds.push(msg.id);
      if (msg.alternateVersions) {
        versionIds = [...versionIds, ...msg.alternateVersions];
      }
    });
    
    // 如果没有找到版本ID但当前消息是版本1，则查找所有引用此消息的版本
    if (versionIds.length === 0) {
      // 查找所有包含此消息ID在其alternateVersions中的消息
      const referencingMessages = messages.filter(
        msg => msg.alternateVersions && msg.alternateVersions.includes(message.id)
      );
      
      if (referencingMessages.length > 0) {
        // 添加这些消息和它们的alternateVersions
        referencingMessages.forEach(msg => {
          versionIds.push(msg.id);
          if (msg.alternateVersions) {
            versionIds = [...versionIds, ...msg.alternateVersions];
          }
        });
        // 确保当前消息ID也包含在内
        versionIds.push(message.id);
      } else {
        // 如果仍然没有找到相关版本，则只使用当前消息
        versionIds = [message.id];
      }
    }
    
    // 去重
    versionIds = [...new Set(versionIds)];
    
    console.log('版本ID列表:', versionIds);
    
    // 查找所有关联版本的消息，并按版本号排序
    const versionMessages = versionIds
      .map(id => messages.find(msg => msg.id === id))
      .filter((msg): msg is Message => !!msg)
      .sort((a, b) => {
        // 确保按照版本号升序排列
        const versionA = a.version || 1;
        const versionB = b.version || 1;
        return versionA - versionB;
      });
    
    console.log('找到的版本消息:', versionMessages.map(m => `ID:${m.id}, 版本:${m.version || '1'}, 当前:${m.isCurrentVersion}`));
    
    return versionMessages;
  };

  // 切换到特定版本
  const handleSwitchVersion = (messageId: string) => {
    if (!topicId) return;
    
    console.log(`切换到消息版本: ${messageId}`);
    
    // 优先使用父组件传递的版本切换函数
    if (onSwitchVersion) {
      onSwitchVersion(messageId);
    } else {
      // 直接调用Redux action来切换版本
      dispatch(switchToVersion({ 
        topicId, 
        messageId 
      }));
    }
    
    // 关闭弹窗
    handleVersionMenuClose();
  };

  // 文本朗读处理
  const handleTextToSpeech = async () => {
    if (!message || !topicId) return;
    
    try {
      // 根据内容类型获取文本
      const textContent = typeof message.content === 'string'
        ? message.content
        : (message.content as {text?: string}).text || '';
        
      // 使用TTSService实例
      const ttsServiceInstance = TTSService.getInstance();
      const newState = await ttsServiceInstance.togglePlayback(message.id, textContent);
    setIsPlaying(newState);
    handleMenuClose();
    } catch (error) {
      console.error('文本朗读失败:', error);
    }
  };

  // 计算实际的版本总数
  const calculateVersionCount = () => {
    const versions = getVersionMessages();
    return versions.length;
  };

  // 计算当前版本号
  const getCurrentVersionNumber = () => {
    // 如果当前消息有明确的版本号，直接使用
    if (message.version) {
      return message.version;
    }
    
    // 否则，从所有版本中查找当前消息的位置
    const versions = getVersionMessages();
    const index = versions.findIndex(msg => msg.id === message.id);
    
    // 如果找到，版本号是索引+1；否则返回1
    return index >= 0 ? index + 1 : 1;
  };

  // 检查当前消息是否应该显示版本标签
  const shouldShowVersionIndicator = () => {
    // 有alternateVersions且被标记为当前版本
    if (hasAlternateVersions && message.isCurrentVersion) {
      return true;
    }
    
    // 没有alternateVersions但是被其他消息引用为替代版本(版本1)
    if (!hasAlternateVersions && message.isCurrentVersion === true) {
      // 查找是否有其他消息引用了当前消息
      const referencedByOthers = messages.some(
        msg => msg.id !== message.id && 
              msg.alternateVersions && 
              msg.alternateVersions.includes(message.id)
      );
      
      if (referencedByOthers) {
        return true;
      }
    }
    
    return false;
  };

  // 处理分支创建
  const handleCreateBranch = async () => {
    if (!topicId) return;
    
    // 1. 找到当前消息在消息列表中的索引
    const currentIndex = messages.findIndex(msg => msg.id === message.id);
    if (currentIndex === -1) return;
    
    // 2. 获取当前消息及之前的所有消息
    const contextMessages = messages.slice(0, currentIndex + 1);
    
    try {
      // 3. 使用TopicService创建新话题
      console.log('准备创建分支话题');
      const branchTitle = `从 "${typeof message.content === 'string' ? message.content.substring(0, 20) : '对话'}..." 分支`;
      
      // 使用TopicService的createNewTopic方法创建话题，确保UI立即更新
      const newTopic = await TopicService.createNewTopic();
      
      if (!newTopic) {
        alert('创建分支话题失败');
        return;
      }
      
      console.log('话题创建成功:', newTopic.id);
      
      // 4. 更新话题标题
      newTopic.title = branchTitle;
      await TopicService.saveTopic(newTopic);
      
      // 5. 添加上下文消息到新话题
      for (const msg of contextMessages) {
        const messageCopy = {...msg}; // 创建消息的深拷贝
        await TopicService.addMessageToTopic(newTopic.id, messageCopy);
      }
      console.log('已将上下文消息添加到新话题');
      
      // 通知用户
      alert('已创建分支话题');
    } catch (error) {
      console.error('创建分支话题出错:', error);
      alert('创建分支话题出错: ' + (error instanceof Error ? error.message : String(error)));
    }
    
    // 关闭菜单
    handleMenuClose();
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
          <MenuItem onClick={handleCopyContent} sx={{ fontSize: '14px' }}>复制</MenuItem>
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

  // 修改这里 - 创建功能按钮区域
  return (
    <>
      {/* 创建一个容器来放置功能按钮，水平排列在气泡上方 */}
      <Box 
        sx={{
          position: 'absolute',
          top: -18,
          right: 10,
          display: 'flex',
          flexDirection: 'row',
          gap: '5px',
          zIndex: 10,
          pointerEvents: 'auto',
        }}
      >
        {/* 语音播放按钮 - 仅对AI回复显示且TTS功能启用时 */}
        {enableTTS && (
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
              '&:hover': {
                backgroundColor: aiBubbleActiveColor,
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }
            }}
          />
        )}

        {/* 版本指示器 */}
        {shouldShowVersionIndicator() && (
          <Chip
            size="small"
            label={`版本 ${getCurrentVersionNumber()}/${calculateVersionCount()}`}
            variant="filled"
            color="info"
            onClick={handleVersionMenuOpen}
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
              '&:hover': {
                backgroundColor: aiBubbleActiveColor,
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }
            }}
          />
        )}
      </Box>

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
        <MenuItem onClick={handleCopyContent} sx={{ fontSize: '14px' }}>复制</MenuItem>
        <MenuItem onClick={handleTextToSpeech} sx={{ fontSize: '14px' }}>
          {isPlaying ? '停止播放' : '播放语音'}
        </MenuItem>
        {onRegenerate && <MenuItem onClick={handleRegenerateClick} sx={{ fontSize: '14px' }}>重新生成</MenuItem>}
        <MenuItem onClick={handleCreateBranch} sx={{ fontSize: '14px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ForkRightIcon fontSize="small" />
            创建分支
          </Box>
        </MenuItem>
        {hasAlternateVersions && (
          <MenuItem onClick={handleVersionMenuOpen} sx={{ fontSize: '14px' }}>查看其他版本</MenuItem>
        )}
        <MenuItem onClick={handleEditClick} sx={{ fontSize: '14px' }}>编辑</MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: '#f44336', fontSize: '14px' }}>删除</MenuItem>
      </Menu>
      
      {/* 版本选择弹窗 */}
      <Popover
        open={versionPopoverOpen}
        anchorEl={versionAnchorEl}
        onClose={handleVersionMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <Box 
          sx={{
            p: 2,
            maxWidth: 280,
            display: 'flex',
            flexDirection: 'column',
            gap: 1
        }}
      >
          <Typography variant="subtitle2" gutterBottom>
            选择消息版本
          </Typography>
          
          <Box 
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              justifyContent: 'flex-start'
            }}
          >
            {getVersionMessages().map((versionMsg, index) => (
              <Button
                key={versionMsg.id}
                variant={versionMsg.isCurrentVersion ? "contained" : "outlined"}
                size="small"
                onClick={() => {
                  handleSwitchVersion(versionMsg.id);
                  handleVersionMenuClose();
                }}
                sx={{ 
                  minWidth: '60px',
                  fontSize: '12px',
                  borderRadius: '4px',
                  boxShadow: 'none',
                  padding: '2px 8px',
                  backgroundColor: versionMsg.isCurrentVersion ? '#2196f3' : 'transparent',
                  '&:hover': {
                    backgroundColor: versionMsg.isCurrentVersion ? '#1976d2' : 'rgba(33, 150, 243, 0.08)',
                    boxShadow: 'none',
                  }
                }}
              >
                版本 {versionMsg.version || index + 1}
              </Button>
            ))}
          </Box>
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