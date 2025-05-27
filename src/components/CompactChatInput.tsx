import React, { useState, useEffect } from 'react';
import { Box, IconButton, Typography, Collapse } from '@mui/material';
import MCPToolsButton from './chat/MCPToolsButton';
import WebSearchProviderSelector from './WebSearchProviderSelector';
import { useChatInputLogic } from '../shared/hooks/useChatInputLogic';
import { useTopicManagement } from '../shared/hooks/useTopicManagement';
import { useFileUpload } from '../shared/hooks/useFileUpload';
import { useUrlScraper } from '../shared/hooks/useUrlScraper';
import { useInputStyles } from '../shared/hooks/useInputStyles';
import { getBasicIcons, getExpandedIcons } from '../shared/config/inputIcons';

import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import StopIcon from '@mui/icons-material/Stop';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { useSelector } from 'react-redux';
import type { RootState } from '../shared/store';
import type { SiliconFlowImageFormat, ImageContent, FileContent } from '../shared/types';
import { dexieStorage } from '../shared/services/DexieStorageService';

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
  onDetectUrl,
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
  const [expanded, setExpanded] = useState(false);
  const [showProviderSelector, setShowProviderSelector] = useState(false);
  const [inputHeight, setInputHeight] = useState(40); // 输入框容器高度
  const [isFullExpanded, setIsFullExpanded] = useState(false); // 是否全展开

  // 文件和图片上传相关状态
  const [images, setImages] = useState<ImageContent[]>([]);
  const [files, setFiles] = useState<FileContent[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // 获取当前话题状态
  const currentTopicId = useSelector((state: RootState) => state.messages.currentTopicId);
  const [currentTopicState, setCurrentTopicState] = useState<any>(null);

  // 使用自定义hooks
  const { styles, isDarkMode, inputBoxStyle } = useInputStyles();
  const { handleCreateTopic } = useTopicManagement();

  // URL解析功能
  const {
    detectedUrl,
    parsedContent,
    urlScraperStatus,
    scraperError,
    resetUrlScraper,
    detectUrlInMessage
  } = useUrlScraper({ onDetectUrl });

  // 文件上传功能
  const { handleImageUpload: uploadImages, handleFileUpload: uploadFiles } = useFileUpload({
    currentTopicState,
    setUploadingMedia
  });

  // 聊天输入逻辑
  const {
    message,
    setMessage,
    textareaRef,
    canSendMessage,
    handleSubmit,
    handleKeyDown,
    handleChange
  } = useChatInputLogic({
    onSendMessage,
    onSendImagePrompt,
    isLoading,
    allowConsecutiveMessages,
    imageGenerationMode,
    toolsEnabled,
    parsedContent,
    images,
    files,
    setImages,
    setFiles,
    resetUrlScraper
  });

  // 当话题ID变化时，从数据库获取话题信息
  useEffect(() => {
    const loadTopic = async () => {
      if (!currentTopicId) return;

      try {
        const topic = await dexieStorage.getTopic(currentTopicId);
        if (topic) {
          setCurrentTopicState(topic);
        }
      } catch (error) {
        console.error('加载话题信息失败:', error);
      }
    };

    loadTopic();
  }, [currentTopicId]);



  // 处理网络搜索按钮点击
  const handleWebSearchClick = () => {
    if (webSearchActive) {
      // 如果当前处于搜索模式，则关闭搜索
      toggleWebSearch?.();
    } else {
      // 如果当前不在搜索模式，显示提供商选择器
      setShowProviderSelector(true);
    }
  };

  // 处理提供商选择
  const handleProviderSelect = (providerId: string) => {
    if (providerId && toggleWebSearch) {
      // 选择了提供商，激活搜索模式
      toggleWebSearch();
    }
  };

  // 自动调整文本框和容器高度
  useEffect(() => {
    if (textareaRef.current) {
      // 重置高度以获取真实的scrollHeight
      textareaRef.current.style.height = 'auto';

      const scrollHeight = textareaRef.current.scrollHeight;
      const minHeight = 24; // 最小高度（单行）
      const maxHeight = isFullExpanded ? 200 : 120; // 最大高度，全展开时更高

      // 计算textarea的实际高度
      let textareaHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));

      // 如果内容超出最大高度，保持最大高度并启用滚动
      if (scrollHeight > maxHeight) {
        textareaHeight = maxHeight;
      }

      textareaRef.current.style.height = `${textareaHeight}px`;

      // 计算容器高度（textarea高度 + padding）
      const containerHeight = textareaHeight + 16; // 8px上下padding
      setInputHeight(containerHeight);
    }
  }, [message, isFullExpanded]);

  // 处理输入变化，包含URL检测
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleChange(e);
    detectUrlInMessage(e.target.value);
  };

  // 处理键盘事件，包含全展开功能
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    handleKeyDown(e);
    // Ctrl/Cmd + Enter 切换全展开模式
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setIsFullExpanded(!isFullExpanded);
    }
  };



  // 处理图片上传
  const handleImageUpload = async (source: 'camera' | 'photos' = 'photos') => {
    try {
      const newImages = await uploadImages(source);
      setImages(prev => [...prev, ...newImages]);
    } catch (error) {
      console.error('图片上传失败:', error);
      alert('图片上传失败，请重试');
    }
  };

  // 处理文件上传
  const handleFileUpload = async () => {
    try {
      const newFiles = await uploadFiles();
      setFiles(prev => [...prev, ...newFiles]);
    } catch (error) {
      console.error('文件上传失败:', error);
      alert('文件上传失败，请重试');
    }
  };

  // 删除已选择的图片
  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // 删除已选择的文件
  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 使用配置文件获取图标
  const basicIcons = getBasicIcons({
    toolsEnabled,
    webSearchActive,
    imageGenerationMode,
    onNewTopic,
    onClearTopic,
    handleWebSearchClick,
    toggleImageGenerationMode
  });

  const expandedIcons = getExpandedIcons({
    toolsEnabled,
    uploadingMedia,
    toggleToolsEnabled,
    handleImageUpload,
    handleFileUpload
  });

  return (
    <Box sx={{
      width: '100%',
      maxWidth: '800px',
      margin: '0 auto',
      // 添加全局滚动条样式
      '& textarea::-webkit-scrollbar': {
        width: '6px',
      },
      '& textarea::-webkit-scrollbar-track': {
        background: 'transparent',
      },
      '& textarea::-webkit-scrollbar-thumb': {
        background: isDarkMode ? '#555' : '#ccc',
        borderRadius: '3px',
      },
      '& textarea::-webkit-scrollbar-thumb:hover': {
        background: isDarkMode ? '#666' : '#999',
      },
    }}>
      {/* 输入框区域 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start', // 改为顶部对齐，适应多行文本
          background: isDarkMode ? '#2A2A2A' : '#FFFFFF', // 不透明背景
          border: styles.border,
          borderRadius: `${styles.borderRadius} ${styles.borderRadius} 0 0`, // 只有上边圆角
          boxShadow: styles.boxShadow,
          padding: '8px 12px',
          marginBottom: '0', // 移除间距，让它们贴合
          borderBottom: 'none', // 移除底部边框
          minHeight: '40px', // 最小高度
          height: `${inputHeight}px`, // 动态高度
          transition: 'height 0.2s ease', // 平滑过渡
        }}
      >
        <Box sx={{ flex: 1, marginRight: '8px', paddingTop: '4px' }}>
          <textarea
            ref={textareaRef}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              resize: 'none',
              fontSize: '14px',
              lineHeight: '1.4',
              fontFamily: 'inherit',
              color: isDarkMode ? '#ffffff' : '#000000',
              minHeight: '24px',
              overflow: 'auto', // 始终允许滚动
              padding: '0',
              scrollbarWidth: 'thin', // Firefox
              scrollbarColor: isDarkMode ? '#555 transparent' : '#ccc transparent', // Firefox
            }}
            placeholder={
              imageGenerationMode
                ? "输入图像生成提示词... (Ctrl+Enter 全展开)"
                : webSearchActive
                  ? "输入网络搜索内容... (Ctrl+Enter 全展开)"
                  : "和ai助手说点什么... (Ctrl+Enter 全展开)"
            }
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            disabled={isLoading && !allowConsecutiveMessages}
          />
        </Box>

        {/* 发送按钮 */}
        <Box sx={{ paddingTop: '4px' }}>
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
      </Box>

      {/* 文件预览和URL状态显示 */}
      {(images.length > 0 || files.length > 0 || urlScraperStatus !== 'idle') && (
        <Box
          sx={{
            padding: '8px 12px',
            background: isDarkMode ? '#2A2A2A' : '#FFFFFF',
            border: styles.border,
            borderTop: 'none',
            borderBottom: 'none',
            maxHeight: '120px',
            overflowY: 'auto'
          }}
        >
          {/* URL解析状态 */}
          {urlScraperStatus !== 'idle' && (
            <Box sx={{ mb: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {urlScraperStatus === 'parsing' && '正在解析网页...'}
                {urlScraperStatus === 'success' && `已解析: ${detectedUrl}`}
                {urlScraperStatus === 'error' && `解析失败: ${scraperError}`}
              </Typography>
              {urlScraperStatus !== 'parsing' && (
                <IconButton
                  size="small"
                  onClick={resetUrlScraper}
                  sx={{ ml: 1, p: 0.5 }}
                >
                  <CloseIcon sx={{ fontSize: 12 }} />
                </IconButton>
              )}
            </Box>
          )}

          {/* 图片预览 */}
          {images.length > 0 && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
                已选择 {images.length} 张图片
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {images.map((image, index) => (
                  <Box
                    key={index}
                    sx={{
                      position: 'relative',
                      width: 60,
                      height: 60,
                      borderRadius: 1,
                      overflow: 'hidden',
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <img
                      src={image.base64Data || image.url}
                      alt={`预览 ${index + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveImage(index)}
                      sx={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        backgroundColor: 'error.main',
                        color: 'white',
                        width: 20,
                        height: 20,
                        '&:hover': { backgroundColor: 'error.dark' }
                      }}
                    >
                      <CloseIcon sx={{ fontSize: 12 }} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* 文件预览 */}
          {files.length > 0 && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
                已选择 {files.length} 个文件
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {files.map((file, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 1,
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <AttachFileIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="caption" sx={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {file.name}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveFile(index)}
                      sx={{ p: 0.5 }}
                    >
                      <CloseIcon sx={{ fontSize: 12 }} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* 功能图标行 - 优化视觉层次和对比度 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px', // 增加padding
          background: isDarkMode ? '#2A2A2A' : '#FFFFFF',
          border: styles.border,
          borderTop: 'none',
          borderRadius: expanded ? 'none' : `0 0 ${styles.borderRadius} ${styles.borderRadius}`, // 展开时移除下圆角
          boxShadow: styles.boxShadow,
          minHeight: '40px', // 增加高度，与输入框保持一致
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
                color: item.active
                  ? item.color
                  : isDarkMode ? '#B0B0B0' : '#555', // 提高对比度
                backgroundColor: item.active ? `${item.color}15` : 'transparent',
                border: item.active ? `1px solid ${item.color}30` : '1px solid transparent',
                width: 34, // 稍微增大
                height: 34,
                borderRadius: '8px', // 更圆润
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: `${item.color}20`,
                  borderColor: `${item.color}50`,
                  color: item.color,
                  transform: 'translateY(-1px)',
                  boxShadow: `0 2px 8px ${item.color}20`
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
            color: expanded ? '#2196F3' : isDarkMode ? '#B0B0B0' : '#555',
            backgroundColor: expanded ? '#2196F315' : 'transparent',
            border: expanded ? '1px solid #2196F330' : '1px solid transparent',
            width: 30,
            height: 30,
            borderRadius: '8px',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: '#2196F320',
              borderColor: '#2196F350',
              color: '#2196F3',
              transform: 'translateY(-1px)',
              boxShadow: '0 2px 8px #2196F320'
            }
          }}
        >
          {expanded ? <CloseIcon fontSize="small" /> : <AddIcon fontSize="small" />}
        </IconButton>
      </Box>

      {/* 扩展功能面板 - 优化为紧凑的横向布局 */}
      <Collapse in={expanded}>
        <Box
          sx={{
            marginTop: '0',
            padding: '8px 12px', // 减少padding
            background: isDarkMode ? '#2A2A2A' : '#FFFFFF', // 与主体保持一致
            border: styles.border,
            borderTop: 'none',
            borderRadius: `0 0 ${styles.borderRadius} ${styles.borderRadius}`,
            boxShadow: styles.boxShadow,
            backdropFilter: inputBoxStyle === 'modern' ? 'blur(10px)' : 'none',
            WebkitBackdropFilter: inputBoxStyle === 'modern' ? 'blur(10px)' : 'none',
          }}
        >
          {/* 紧凑的横向布局 */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: 2, // 增加间距
              flexWrap: 'wrap' // 允许换行
            }}
          >
            {expandedIcons.map((item, index) => (
              <Box
                key={index}
                onClick={item.disabled ? undefined : item.onClick}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  padding: '6px 12px', // 横向padding
                  borderRadius: '12px', // 更圆润的边角
                  cursor: item.disabled ? 'not-allowed' : 'pointer',
                  opacity: item.disabled ? 0.5 : 1,
                  backgroundColor: item.active
                    ? `${item.color}15` // 更淡的背景色
                    : isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  border: item.active
                    ? `1px solid ${item.color}40`
                    : `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                  transition: 'all 0.2s ease',
                  minWidth: 'fit-content',
                  '&:hover': item.disabled ? {} : {
                    backgroundColor: `${item.color}20`,
                    borderColor: `${item.color}60`,
                    transform: 'translateY(-1px)',
                    boxShadow: `0 2px 8px ${item.color}20`
                  }
                }}
              >
                <Box
                  sx={{
                    width: 20, // 更小的图标
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: item.active ? item.color : isDarkMode ? '#B0B0B0' : '#666',
                    '& svg': {
                      fontSize: '18px' // 明确设置图标大小
                    }
                  }}
                >
                  {item.icon}
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    color: item.active ? item.color : isDarkMode ? '#B0B0B0' : '#666',
                    fontSize: '12px',
                    fontWeight: item.active ? 500 : 400,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {item.label}
                </Typography>
              </Box>
            ))}

            {/* 添加一个提示文字，说明这里可以添加更多功能 */}
            <Typography
              variant="caption"
              sx={{
                color: isDarkMode ? '#666' : '#999',
                fontSize: '11px',
                fontStyle: 'italic',
                marginLeft: 'auto'
              }}
            >
              更多功能即将推出...
            </Typography>
          </Box>
        </Box>
      </Collapse>

      {/* 网络搜索提供商选择器 */}
      <WebSearchProviderSelector
        open={showProviderSelector}
        onClose={() => setShowProviderSelector(false)}
        onProviderSelect={handleProviderSelect}
      />
    </Box>
  );
};

export default CompactChatInput;
