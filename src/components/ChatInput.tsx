import React, { useState, useEffect } from 'react';
import { IconButton, CircularProgress, Badge, Tooltip } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import KeyboardVoiceIcon from '@mui/icons-material/KeyboardVoice';
import LinkIcon from '@mui/icons-material/Link';
import StopIcon from '@mui/icons-material/Stop';

import { useChatInputLogic } from '../shared/hooks/useChatInputLogic';
import { useFileUpload } from '../shared/hooks/useFileUpload';
import { useUrlScraper } from '../shared/hooks/useUrlScraper';
import { useInputStyles } from '../shared/hooks/useInputStyles';
import MultiModelSelector from './MultiModelSelector';
import type { ImageContent, SiliconFlowImageFormat, FileContent } from '../shared/types';
import ImageIcon from '@mui/icons-material/Image';
import SearchIcon from '@mui/icons-material/Search';
import UrlScraperStatus from './UrlScraperStatus';
import type { FileStatus } from './FilePreview';
import IntegratedFilePreview from './IntegratedFilePreview';
import UploadMenu from './UploadMenu';
import EnhancedToast, { toastManager } from './EnhancedToast';
import { dexieStorage } from '../shared/services/DexieStorageService';
import { useSelector } from 'react-redux';
import type { RootState } from '../shared/store';
import AIDebateButton from './AIDebateButton';
import type { DebateConfig } from '../shared/services/AIDebateService';

interface ChatInputProps {
  onSendMessage: (message: string, images?: SiliconFlowImageFormat[], toolsEnabled?: boolean, files?: any[]) => void;
  onSendMultiModelMessage?: (message: string, models: any[], images?: SiliconFlowImageFormat[], toolsEnabled?: boolean, files?: any[]) => void; // 多模型发送回调
  onStartDebate?: (question: string, config: DebateConfig) => void; // 开始AI辩论回调
  onStopDebate?: () => void; // 停止AI辩论回调
  isLoading?: boolean;
  allowConsecutiveMessages?: boolean; // 允许连续发送消息，即使AI尚未回复
  imageGenerationMode?: boolean; // 是否处于图像生成模式
  onSendImagePrompt?: (prompt: string) => void; // 发送图像生成提示词的回调
  webSearchActive?: boolean; // 是否处于网络搜索模式
  onDetectUrl?: (url: string) => Promise<string>; // 用于检测并解析URL的回调
  onStopResponse?: () => void; // 停止AI回复的回调
  isStreaming?: boolean; // 是否正在流式响应中
  isDebating?: boolean; // 是否正在AI辩论中
  toolsEnabled?: boolean; // 工具开关状态
  availableModels?: any[]; // 可用模型列表
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onSendMultiModelMessage,
  onStartDebate,
  onStopDebate,
  isLoading = false,
  allowConsecutiveMessages = true, // 默认允许连续发送
  imageGenerationMode = false, // 默认不是图像生成模式
  onSendImagePrompt,
  webSearchActive = false, // 默认不是网络搜索模式
  onDetectUrl,
  onStopResponse,
  isStreaming = false,
  isDebating = false, // 默认不在辩论中
  toolsEnabled = true, // 默认启用工具
  availableModels = [] // 默认空数组
}) => {
  // 基础状态
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [uploadMenuAnchorEl, setUploadMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [multiModelSelectorOpen, setMultiModelSelectorOpen] = useState(false);

  // 文件和图片状态
  const [images, setImages] = useState<ImageContent[]>([]);
  const [files, setFiles] = useState<FileContent[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // 文件状态管理
  const [fileStatuses, setFileStatuses] = useState<Record<string, { status: FileStatus; progress?: number; error?: string }>>({});

  // Toast消息管理
  const [toastMessages, setToastMessages] = useState<any[]>([]);

  // 获取当前话题状态
  const currentTopicId = useSelector((state: RootState) => state.messages.currentTopicId);
  const [currentTopicState, setCurrentTopicState] = useState<any>(null);

  // 使用共享的 hooks
  const { styles, isDarkMode, inputBoxStyle } = useInputStyles();

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
  const { handleImageUpload, handleFileUpload } = useFileUpload({
    currentTopicState,
    setUploadingMedia
  });

  // 聊天输入逻辑 - 启用 ChatInput 特有功能
  const {
    message,
    setMessage,
    textareaRef,
    canSendMessage,
    handleSubmit,
    handleKeyDown,
    handleChange,
    textareaHeight,
    showCharCount,
    handleCompositionStart,
    handleCompositionEnd,
    isMobile,
    isTablet
  } = useChatInputLogic({
    onSendMessage,
    onSendMultiModelMessage,
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
    resetUrlScraper,
    enableTextareaResize: true,
    enableCompositionHandling: true,
    enableCharacterCount: true,
    availableModels
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

  // Toast消息订阅
  useEffect(() => {
    const unsubscribe = toastManager.subscribe(setToastMessages);
    return unsubscribe;
  }, []);

  // 从 useInputStyles hook 获取样式
  const { inputBg: inputBgColor, border, borderRadius, boxShadow } = styles;
  const iconColor = isDarkMode ? '#64B5F6' : '#1976D2';
  const textColor = isDarkMode ? '#E0E0E0' : '#000000';
  const disabledColor = isDarkMode ? '#555' : '#ccc';

  // handleSubmit 现在由 useChatInputLogic hook 提供

  // 处理多模型发送
  const handleMultiModelSend = (selectedModels: any[]) => {
    if (!message.trim() && images.length === 0 && files.length === 0) return;
    if (!onSendMultiModelMessage) return;

    let processedMessage = message.trim();

    // 如果有解析的内容，添加到消息中
    if (parsedContent && urlScraperStatus === 'success') {
      processedMessage = `${processedMessage}\n\n${parsedContent}`;
      // 重置URL解析状态 - 使用 hook 提供的函数
      resetUrlScraper();
    }

    // 创建正确的图片格式
    const formattedImages: SiliconFlowImageFormat[] = [...images, ...files.filter(f => f.mimeType.startsWith('image/'))].map(img => ({
      type: 'image_url',
      image_url: {
        url: img.base64Data || img.url
      }
    }));

    console.log('发送多模型消息:', {
      message: processedMessage,
      models: selectedModels.map(m => `${m.provider || m.providerType}:${m.id}`),
      images: formattedImages.length,
      files: files.length,
      toolsEnabled: toolsEnabled
    });

    onSendMultiModelMessage(
      processedMessage,
      selectedModels,
      formattedImages.length > 0 ? formattedImages : undefined,
      toolsEnabled,
      files
    );

    // 重置状态 - 使用 hook 提供的函数
    setMessage('');
    setImages([]);
    setFiles([]);
    setUploadingMedia(false);
  };

  // 输入处理逻辑现在由 useChatInputLogic 和 useUrlScraper hooks 提供

  // 增强的 handleChange 以支持 URL 检测
  const enhancedHandleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // 调用 hook 提供的 handleChange
    handleChange(e);
    // 检测 URL
    detectUrlInMessage(e.target.value);
  };

  // 添加焦点管理以确保复制粘贴功能正常工作，并处理键盘显示
  useEffect(() => {
    // 设置一个延迟以确保组件挂载后聚焦生效
    const timer = setTimeout(() => {
      if (textareaRef.current) {
        // 聚焦后立即模糊，这有助于解决某些Android设备上的复制粘贴问题
        textareaRef.current.focus();
        textareaRef.current.blur();

        // 确保初始高度正确设置，以显示完整的placeholder
        const initialHeight = isMobile ? 32 : isTablet ? 36 : 34;
        textareaRef.current.style.height = `${initialHeight}px`;
      }
    }, 300);

    // 添加键盘显示检测
    const handleFocus = () => {
      setIsKeyboardVisible(true);
    };

    const handleBlur = () => {
      setIsKeyboardVisible(false);
    };

    if (textareaRef.current) {
      textareaRef.current.addEventListener('focus', handleFocus);
      textareaRef.current.addEventListener('blur', handleBlur);
    }

    return () => {
      clearTimeout(timer);
      if (textareaRef.current) {
        textareaRef.current.removeEventListener('focus', handleFocus);
        textareaRef.current.removeEventListener('blur', handleBlur);
      }
    };
  }, [isMobile, isTablet]); // 添加依赖项以响应屏幕尺寸变化

  // 处理上传菜单
  const handleOpenUploadMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    setUploadMenuAnchorEl(event.currentTarget);
  };

  const handleCloseUploadMenu = () => {
    setUploadMenuAnchorEl(null);
  };

  // 文件上传处理函数 - 包装 hook 提供的函数以更新本地状态
  const handleImageUploadLocal = async (source: 'camera' | 'photos' = 'photos') => {
    try {
      const uploadedImages = await handleImageUpload(source);
      setImages(prev => [...prev, ...uploadedImages]);
    } catch (error) {
      console.error('图片上传失败:', error);
    }
  };

  const handleFileUploadLocal = async () => {
    try {
      const uploadedFiles = await handleFileUpload();
      setFiles(prev => [...prev, ...uploadedFiles]);
    } catch (error) {
      console.error('文件上传失败:', error);
    }
  };

  // 删除已选择的图片
  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // 删除已选择的文件
  const handleRemoveFile = (index: number) => {
    const fileToRemove = files[index];
    if (fileToRemove) {
      const fileKey = `${fileToRemove.name}-${fileToRemove.size}`;
      // 清理文件状态
      setFileStatuses(prev => {
        const newStatuses = { ...prev };
        delete newStatuses[fileKey];
        return newStatuses;
      });
    }
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 显示正在加载的指示器，但不禁用输入框
  const showLoadingIndicator = isLoading && !allowConsecutiveMessages;

  // 根据屏幕尺寸调整样式
  const getResponsiveStyles = () => {
    if (isMobile) {
      return {
        padding: '0px 8px 8px 8px', // 保留底部padding用于间距
        maxWidth: '100%',
        margin: '0'
      };
    } else if (isTablet) {
      return {
        padding: '0px 16px 12px 16px', // 保留底部padding用于间距
        maxWidth: '100%', // 改为100%，由外部容器控制最大宽度
        margin: '0'
      };
    } else {
      return {
        padding: '0px 10px 10px 10px', // 保留底部padding用于间距
        maxWidth: '100%', // 改为100%，由外部容器控制最大宽度
        margin: '0'
      };
    }
  };

  const responsiveStyles = getResponsiveStyles();

  return (
    <div style={{
      backgroundColor: 'transparent',
      ...responsiveStyles,
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      boxShadow: 'none',
      transition: 'all 0.3s ease',
      marginBottom: isKeyboardVisible ? '0' : '0',
      // 确保没有任何背景色或边框
      border: 'none',
      outline: 'none'
    }}>
      {/* URL解析状态显示 */}
      {urlScraperStatus !== 'idle' && (
        <UrlScraperStatus
          status={urlScraperStatus}
          url={detectedUrl}
          error={scraperError}
          onClose={resetUrlScraper}
        />
      )}

      {/* 集成的文件预览区域 */}
      <IntegratedFilePreview
        files={files}
        images={images}
        onRemoveFile={handleRemoveFile}
        onRemoveImage={handleRemoveImage}
        fileStatuses={fileStatuses}
        compact={true}
        maxVisibleItems={isMobile ? 2 : 3}
      />

      <div style={{
          display: 'flex',
          alignItems: 'center',
        padding: isTablet ? '6px 12px' : isMobile ? '5px 8px' : '5px 8px',
        borderRadius: borderRadius,
        background: inputBgColor,
          border: border,
        minHeight: isTablet ? '56px' : isMobile ? '48px' : '50px', // 增加容器最小高度以适应新的textarea高度
        boxShadow: boxShadow,
        width: '100%',
        maxWidth: '100%', // 使用100%宽度，与外部容器一致
        backdropFilter: inputBoxStyle === 'modern' ? 'blur(10px)' : 'none',
        WebkitBackdropFilter: inputBoxStyle === 'modern' ? 'blur(10px)' : 'none',
        transition: 'all 0.3s ease'
      }}>
        {/* 语音图标 */}
          <IconButton
          size={isTablet ? "large" : "medium"}
          style={{
            color: iconColor,
            padding: isTablet ? '10px' : '8px',
            marginRight: isTablet ? '6px' : '4px'
          }}
          >
          <KeyboardVoiceIcon />
          </IconButton>

        {/* 文本输入区域 */}
        <div style={{
          flexGrow: 1,
          margin: isTablet ? '0 12px' : '0 8px',
          position: 'relative'
        }}>
          <textarea
            ref={textareaRef}
            style={{
              fontSize: isTablet ? '17px' : '16px',
              padding: isTablet ? '10px 0' : '8px 0', // 减少padding以给placeholder更多空间
              border: 'none',
              outline: 'none',
              width: '100%',
              backgroundColor: 'transparent',
              lineHeight: '1.4', // 优化行高，减少垂直空间占用
              fontFamily: 'inherit',
              resize: 'none',
              overflow: textareaHeight >= (isMobile ? 200 : 250) ? 'auto' : 'hidden',
              minHeight: `${isMobile ? 32 : isTablet ? 36 : 34}px`, // 与计算逻辑保持一致
              height: `${textareaHeight}px`,
              maxHeight: `${isMobile ? 200 : 250}px`,
              color: textColor,
              transition: 'height 0.2s ease-out',
              scrollbarWidth: 'thin',
              scrollbarColor: `${isDarkMode ? '#555 transparent' : '#ccc transparent'}`
            }}
            placeholder={imageGenerationMode ? "输入图像生成提示词..." : webSearchActive ? "输入网络搜索内容..." : "和ai助手说点什么"}
            value={message}
            onChange={enhancedHandleChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            disabled={isLoading && !allowConsecutiveMessages}
            rows={1}
          />

          {/* 字符计数显示 */}
          {showCharCount && (
            <div
              style={{
                position: 'absolute',
                bottom: '-20px',
                right: '0',
                fontSize: '12px',
                color: message.length > 1000 ? '#f44336' : isDarkMode ? '#888' : '#666',
                opacity: 0.8,
                transition: 'all 0.2s ease'
              }}
            >
              {message.length}{message.length > 1000 ? ' (过长)' : ''}
            </div>
          )}
        </div>

        {/* 添加按钮，打开上传菜单 */}
        <Tooltip title="添加图片或文件">
          <IconButton
            size={isTablet ? "large" : "medium"}
            onClick={handleOpenUploadMenu}
            disabled={uploadingMedia || (isLoading && !allowConsecutiveMessages)}
            style={{
              color: uploadingMedia ? disabledColor : iconColor,
              padding: isTablet ? '10px' : '8px',
              position: 'relative',
              marginRight: isTablet ? '4px' : '0'
            }}
          >
            {uploadingMedia ? (
              <CircularProgress size={isTablet ? 28 : 24} />
            ) : (
              <Badge badgeContent={images.length + files.length} color="primary" max={9} invisible={images.length + files.length === 0}>
                <AddCircleIcon />
              </Badge>
            )}
          </IconButton>
        </Tooltip>

        {/* AI辩论按钮 */}
        <AIDebateButton
          onStartDebate={onStartDebate}
          onStopDebate={onStopDebate}
          isDebating={isDebating}
          disabled={uploadingMedia || (isLoading && !allowConsecutiveMessages)}
          question={message}
        />

        {/* 发送按钮或停止按钮 */}
        <IconButton
          onClick={isStreaming && onStopResponse ? onStopResponse : handleSubmit}
          disabled={!isStreaming && (!canSendMessage() || (isLoading && !allowConsecutiveMessages))}
          size={isTablet ? "large" : "medium"}
          style={{
            color: isStreaming ? '#ff4d4f' : !canSendMessage() || (isLoading && !allowConsecutiveMessages) ? disabledColor : imageGenerationMode ? '#9C27B0' : webSearchActive ? '#3b82f6' : urlScraperStatus === 'success' ? '#26C6DA' : isDarkMode ? '#4CAF50' : '#09bb07',
            padding: isTablet ? '10px' : '8px'
          }}
        >
          {isStreaming ? (
            <Tooltip title="停止生成">
              <StopIcon fontSize={isTablet ? "medium" : "small"} />
            </Tooltip>
          ) : showLoadingIndicator ? (
            <CircularProgress size={isTablet ? 28 : 24} color="inherit" />
          ) : imageGenerationMode ? (
            <Tooltip title="生成图像">
              <ImageIcon fontSize={isTablet ? "medium" : "small"} />
            </Tooltip>
          ) : webSearchActive ? (
            <Tooltip title="搜索网络">
              <SearchIcon fontSize={isTablet ? "medium" : "small"} />
            </Tooltip>
          ) : urlScraperStatus === 'success' ? (
            <Tooltip title="发送解析的网页内容">
              <LinkIcon fontSize={isTablet ? "medium" : "small"} />
            </Tooltip>
          ) : (
            <SendIcon fontSize={isTablet ? "medium" : "small"} />
          )}
        </IconButton>
      </div>

      {/* 上传选择菜单 */}
      <UploadMenu
        anchorEl={uploadMenuAnchorEl}
        open={Boolean(uploadMenuAnchorEl)}
        onClose={handleCloseUploadMenu}
        onImageUpload={handleImageUploadLocal}
        onFileUpload={handleFileUploadLocal}
        onMultiModelSend={() => setMultiModelSelectorOpen(true)}
        showMultiModel={!!(onSendMultiModelMessage && availableModels.length > 1 && !isStreaming && canSendMessage())}
      />

      {/* 多模型选择器 */}
      <MultiModelSelector
        open={multiModelSelectorOpen}
        onClose={() => setMultiModelSelectorOpen(false)}
        availableModels={availableModels}
        onConfirm={handleMultiModelSend}
        maxSelection={5}
      />

      {/* Toast通知 */}
      <EnhancedToast
        messages={toastMessages}
        onClose={(id) => toastManager.remove(id)}
        maxVisible={3}
      />
    </div>
  );
};

export default ChatInput;
