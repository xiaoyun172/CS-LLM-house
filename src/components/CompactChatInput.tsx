import React, { useState, useRef, useEffect } from 'react';
import { Box, IconButton, Typography, useTheme, Collapse } from '@mui/material';
import MCPToolsButton from './chat/MCPToolsButton';

import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import StopIcon from '@mui/icons-material/Stop';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import SearchIcon from '@mui/icons-material/Search';
import BuildIcon from '@mui/icons-material/Build';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ImageIcon from '@mui/icons-material/Image';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../shared/store';
import type { SiliconFlowImageFormat } from '../shared/types';
import { EventEmitter, EVENT_NAMES } from '../shared/services/EventService';
import { TopicService } from '../shared/services/TopicService';
import { newMessagesActions } from '../shared/store/slices/newMessagesSlice';
import type { ShortcutPhrase, PhraseInsertOptions } from '../shared/types/shortcutLanguage';

interface CompactChatInputProps {
  onSendMessage: (message: string, images?: SiliconFlowImageFormat[], toolsEnabled?: boolean, files?: any[]) => void;
  onSendMultiModelMessage?: (message: string, models: any[], images?: SiliconFlowImageFormat[], toolsEnabled?: boolean, files?: any[]) => void;
  isLoading?: boolean;
  allowConsecutiveMessages?: boolean;
  imageGenerationMode?: boolean;
  onSendImagePrompt?: (prompt: string) => void;
  webSearchActive?: boolean;
  onDetectUrl?: (url: string) => Promise<string>;
  onStopResponse?: () => void;
  isStreaming?: boolean;
  toolsEnabled?: boolean;
  availableModels?: any[];
  onClearTopic?: () => void;
  onNewTopic?: () => void;
  toggleImageGenerationMode?: () => void;
  toggleWebSearch?: () => void;
  toggleToolsEnabled?: () => void;
}

const CompactChatInput: React.FC<CompactChatInputProps> = ({
  onSendMessage,
  // onSendMultiModelMessage, // 暂时未使用
  isLoading = false,
  allowConsecutiveMessages = true,
  imageGenerationMode = false,
  onSendImagePrompt,
  webSearchActive = false,
  // onDetectUrl, // 暂时未使用
  onStopResponse,
  isStreaming = false,
  toolsEnabled = true,
  // availableModels = [], // 暂时未使用
  onClearTopic,
  onNewTopic,
  toggleImageGenerationMode,
  toggleWebSearch,
  toggleToolsEnabled
}) => {
  const [message, setMessage] = useState('');
  const [expanded, setExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const dispatch = useDispatch();

  // 新建话题处理函数
  const handleCreateTopic = async () => {
    try {
      // 触发新建话题事件
      EventEmitter.emit(EVENT_NAMES.ADD_NEW_TOPIC);
      console.log('[CompactChatInput] Emitted ADD_NEW_TOPIC event.');

      // 创建新话题
      const newTopic = await TopicService.createNewTopic();

      // 如果成功创建话题，自动跳转到新话题
      if (newTopic) {
        console.log('[CompactChatInput] 成功创建新话题，自动跳转:', newTopic.id);

        // 设置当前话题 - 立即选择新创建的话题
        dispatch(newMessagesActions.setCurrentTopicId(newTopic.id));

        // 确保话题侧边栏显示并选中新话题
        setTimeout(() => {
          EventEmitter.emit(EVENT_NAMES.SHOW_TOPIC_SIDEBAR);

          // 再次确保新话题被选中，防止其他逻辑覆盖
          setTimeout(() => {
            dispatch(newMessagesActions.setCurrentTopicId(newTopic.id));
          }, 50);
        }, 100);
      }
    } catch (error) {
      console.error('[CompactChatInput] 创建新话题失败:', error);
    }
  };

  // 获取输入框风格设置
  const inputBoxStyle = useSelector((state: RootState) =>
    (state.settings as any).inputBoxStyle || 'default'
  );

  // 快捷短语插入处理
  const handlePhraseInsert = (event: CustomEvent) => {
    console.log('[CompactChatInput] 收到phrase-insert事件:', event.detail);
    const { phrase, options } = event.detail as { phrase: ShortcutPhrase; options?: PhraseInsertOptions };

    if (!textareaRef.current) {
      console.log('[CompactChatInput] textareaRef.current为空');
      return;
    }

    const textarea = textareaRef.current;
    const currentValue = textarea.value;
    const cursorPosition = textarea.selectionStart || 0;

    let newValue = '';
    let newCursorPosition = cursorPosition;

    // 根据插入选项处理文本插入
    switch (options?.position) {
      case 'start':
        newValue = phrase.content + (options.addNewline ? '\n' : '') + currentValue;
        newCursorPosition = phrase.content.length + (options.addNewline ? 1 : 0);
        break;
      case 'end':
        newValue = currentValue + (options.addNewline ? '\n' : '') + phrase.content;
        newCursorPosition = newValue.length;
        break;
      case 'replace':
        newValue = phrase.content;
        newCursorPosition = phrase.content.length;
        break;
      case 'cursor':
      default:
        const beforeCursor = currentValue.substring(0, cursorPosition);
        const afterCursor = currentValue.substring(cursorPosition);
        newValue = beforeCursor + phrase.content + afterCursor;
        newCursorPosition = cursorPosition + phrase.content.length;
        break;
    }

    // 更新消息内容
    setMessage(newValue);

    // 设置光标位置
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(newCursorPosition, newCursorPosition);

        // 如果设置了自动发送
        if (options?.autoSend && newValue.trim()) {
          handleSubmit();
        }
      }
    }, 0);
  };

  // 自动调整文本框高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  // 添加快捷短语监听器
  useEffect(() => {
    const handlePhraseInsertEvent = (event: Event) => {
      handlePhraseInsert(event as CustomEvent);
    };

    // 监听全局快捷短语插入事件
    window.addEventListener('phrase-insert', handlePhraseInsertEvent);

    return () => {
      window.removeEventListener('phrase-insert', handlePhraseInsertEvent);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!message.trim() || (isLoading && !allowConsecutiveMessages)) return;

    if (imageGenerationMode && onSendImagePrompt) {
      onSendImagePrompt(message.trim());
    } else {
      onSendMessage(message.trim(), undefined, toolsEnabled);
    }

    setMessage('');
  };

  const canSendMessage = () => {
    return message.trim().length > 0;
  };

  // 获取样式配置
  const getStyles = () => {
    const baseStyles = {
      inputBg: isDarkMode ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      iconBg: isDarkMode ? 'rgba(40, 40, 40, 0.8)' : 'rgba(248, 250, 252, 0.8)',
      border: isDarkMode ? '1px solid rgba(60, 60, 60, 0.8)' : '1px solid rgba(230, 230, 230, 0.8)',
      borderRadius: '20px',
      boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
    };

    switch (inputBoxStyle) {
      case 'modern':
        return {
          ...baseStyles,
          inputBg: isDarkMode
            ? 'linear-gradient(135deg, rgba(45, 45, 45, 0.95) 0%, rgba(35, 35, 35, 0.95) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%)',
          borderRadius: '24px',
          boxShadow: isDarkMode ? '0 4px 16px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.15)',
        };
      case 'minimal':
        return {
          ...baseStyles,
          inputBg: isDarkMode ? 'rgba(40, 40, 40, 0.7)' : 'rgba(255, 255, 255, 0.8)',
          border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
          borderRadius: '16px',
          boxShadow: 'none',
        };
      default:
        return baseStyles;
    }
  };

  const styles = getStyles();



  // 基础功能图标
  const basicIcons = [
    {
      icon: <BuildIcon />,
      label: '工具',
      onClick: () => {}, // 空函数，实际功能由 MCPToolsButton 处理
      color: toolsEnabled ? '#4CAF50' : '#9E9E9E',
      active: toolsEnabled
    },
    {
      icon: <AddCircleIcon />,
      label: '新建话题',
      onClick: onNewTopic || handleCreateTopic, // 优先使用传入的回调，否则使用内置实现
      color: '#2196F3'
    },
    {
      icon: <ImageIcon />,
      label: '生成图片',
      onClick: toggleImageGenerationMode,
      color: imageGenerationMode ? '#9C27B0' : '#FF9800',
      active: imageGenerationMode
    },
    {
      icon: <ClearAllIcon />,
      label: '清空内容',
      onClick: onClearTopic,
      color: '#f44336'
    },
    {
      icon: <SearchIcon />,
      label: '网络搜索',
      onClick: toggleWebSearch,
      color: webSearchActive ? '#3b82f6' : '#607D8B',
      active: webSearchActive
    }
  ];

  // 扩展功能图标
  const expandedIcons = [
    {
      icon: <ClearAllIcon />,
      label: '清空内容',
      onClick: onClearTopic,
      color: '#f44336'
    },
    {
      icon: <BuildIcon />,
      label: '工具',
      onClick: toggleToolsEnabled,
      color: toolsEnabled ? '#4CAF50' : '#9E9E9E',
      active: toolsEnabled
    }
  ];

  return (
    <Box sx={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      {/* 输入框区域 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          background: isDarkMode ? '#2A2A2A' : '#FFFFFF', // 不透明背景
          border: styles.border,
          borderRadius: `${styles.borderRadius} ${styles.borderRadius} 0 0`, // 只有上边圆角
          boxShadow: styles.boxShadow,
          padding: '8px 12px',
          marginBottom: '0', // 移除间距，让它们贴合
          borderBottom: 'none', // 移除底部边框
          height: '40px', // 稍微增加高度
        }}
      >
        <Box sx={{ flex: 1, marginRight: '8px' }}>
          <textarea
            ref={textareaRef}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              resize: 'none',
              fontSize: '14px',
              lineHeight: '1.3',
              fontFamily: 'inherit',
              color: isDarkMode ? '#ffffff' : '#000000',
              height: '24px',
              overflow: 'hidden',
              padding: '0'
            }}
            placeholder={
              imageGenerationMode
                ? "输入图像生成提示词..."
                : webSearchActive
                  ? "输入网络搜索内容..."
                  : "和ai助手说点什么"
            }
            value={message}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            disabled={isLoading && !allowConsecutiveMessages}
            rows={1}
          />
        </Box>

        {/* 发送按钮 */}
        <IconButton
          onClick={isStreaming && onStopResponse ? onStopResponse : handleSubmit}
          disabled={!isStreaming && (!canSendMessage() || (isLoading && !allowConsecutiveMessages))}
          sx={{
            backgroundColor: isStreaming
              ? '#ff4d4f'
              : !canSendMessage() || (isLoading && !allowConsecutiveMessages)
                ? 'rgba(0,0,0,0.1)'
                : imageGenerationMode
                  ? '#9C27B0'
                  : webSearchActive
                    ? '#3b82f6'
                    : '#4CAF50',
            color: 'white',
            width: 32,
            height: 32,
            '&:hover': {
              backgroundColor: isStreaming
                ? '#ff7875'
                : !canSendMessage() || (isLoading && !allowConsecutiveMessages)
                  ? 'rgba(0,0,0,0.1)'
                  : imageGenerationMode
                    ? '#AB47BC'
                    : webSearchActive
                      ? '#1976d2'
                      : '#66BB6A',
            },
            '&:disabled': {
              backgroundColor: 'rgba(0,0,0,0.1)',
              color: 'rgba(0,0,0,0.3)'
            }
          }}
        >
          {isStreaming ? <StopIcon /> : <SendIcon />}
        </IconButton>
      </Box>

      {/* 功能图标行 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          background: isDarkMode ? '#2A2A2A' : '#FFFFFF', // 不透明背景
          border: styles.border,
          borderTop: 'none', // 移除顶部边框
          borderRadius: `0 0 ${styles.borderRadius} ${styles.borderRadius}`, // 只有下边圆角
          boxShadow: styles.boxShadow,
          height: '36px', // 稍微增加高度
        }}
      >
        {/* 基础功能图标 */}
        {basicIcons.map((item, index) => {
          // 如果是工具按钮，使用 MCPToolsButton 组件
          if (item.label === '工具') {
            return (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center' }}>
                <MCPToolsButton />
              </Box>
            );
          }

          return (
            <IconButton
              key={index}
              onClick={item.onClick}
              size="small"
              sx={{
                color: item.active ? item.color : isDarkMode ? '#9E9E9E' : '#666',
                backgroundColor: item.active ? `${item.color}20` : 'transparent',
                width: 32,
                height: 32,
                '&:hover': {
                  backgroundColor: `${item.color}20`,
                  color: item.color
                }
              }}
            >
              {item.icon}
            </IconButton>
          );
        })}

        {/* 展开/收起按钮 */}
        <IconButton
          onClick={() => setExpanded(!expanded)}
          size="small"
          sx={{
            color: expanded ? '#2196F3' : isDarkMode ? '#9E9E9E' : '#666',
            backgroundColor: expanded ? '#2196F320' : 'transparent',
            width: 28,
            height: 28,
            '&:hover': {
              backgroundColor: '#2196F320',
              color: '#2196F3'
            }
          }}
        >
          {expanded ? <CloseIcon /> : <AddIcon />}
        </IconButton>
      </Box>

      {/* 扩展功能面板 */}
      <Collapse in={expanded}>
        <Box
          sx={{
            marginTop: '0', // 移除间距，让它们贴合
            padding: '12px',
            background: styles.iconBg,
            border: styles.border,
            borderTop: 'none', // 移除顶部边框
            borderRadius: `0 0 ${styles.borderRadius} ${styles.borderRadius}`, // 只有下边圆角
            boxShadow: styles.boxShadow,
            backdropFilter: inputBoxStyle === 'modern' ? 'blur(10px)' : 'none',
            WebkitBackdropFilter: inputBoxStyle === 'modern' ? 'blur(10px)' : 'none',
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 1
            }}
          >
            {expandedIcons.map((item, index) => (
              <Box
                key={index}
                onClick={item.onClick}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '8px 4px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: item.active ? `${item.color}20` : 'transparent',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: `${item.color}20`,
                    transform: 'translateY(-1px)'
                  }
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '8px',
                    backgroundColor: item.active ? item.color : isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '4px',
                    color: item.active ? 'white' : item.color
                  }}
                >
                  {item.icon}
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: item.active ? item.color : isDarkMode ? '#9E9E9E' : '#666',
                    fontSize: '10px',
                    textAlign: 'center'
                  }}
                >
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Collapse>


    </Box>
  );
};

export default CompactChatInput;
