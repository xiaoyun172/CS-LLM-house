import React, { useState, useRef, useEffect } from 'react';
import { Box, IconButton, Typography, useTheme, Collapse } from '@mui/material';
import MCPToolsButton from './chat/MCPToolsButton';
import WebSearchProviderSelector from './WebSearchProviderSelector';
import { ImageUploadService } from '../shared/services/ImageUploadService';
import { FileUploadService } from '../shared/services/FileUploadService';
import type { ImageContent, FileContent } from '../shared/types';
import { isValidUrl } from '../shared/utils';
import { dexieStorage } from '../shared/services/DexieStorageService';

import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import StopIcon from '@mui/icons-material/Stop';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import SearchIcon from '@mui/icons-material/Search';
import BuildIcon from '@mui/icons-material/Build';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ImageIcon from '@mui/icons-material/Image';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../shared/store';
import type { SiliconFlowImageFormat } from '../shared/types';
import { EventEmitter, EVENT_NAMES } from '../shared/services/EventService';
import { TopicService } from '../shared/services/TopicService';
import { newMessagesActions } from '../shared/store/slices/newMessagesSlice';

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
  const [message, setMessage] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [showProviderSelector, setShowProviderSelector] = useState(false);
  const [inputHeight, setInputHeight] = useState(40); // 输入框容器高度
  const [isFullExpanded, setIsFullExpanded] = useState(false); // 是否全展开
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 文件和图片上传相关状态
  const [images, setImages] = useState<ImageContent[]>([]);
  const [files, setFiles] = useState<FileContent[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // URL解析状态
  const [detectedUrl, setDetectedUrl] = useState<string>('');
  const [parsedContent, setParsedContent] = useState<string>('');
  const [urlScraperStatus, setUrlScraperStatus] = useState<'idle' | 'parsing' | 'success' | 'error'>('idle');
  const [scraperError, setScraperError] = useState<string>('');

  // 获取当前话题状态
  const currentTopicId = useSelector((state: RootState) => state.messages.currentTopicId);
  const [currentTopicState, setCurrentTopicState] = useState<any>(null);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const dispatch = useDispatch();

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

  // 处理URL抓取
  const handleUrlScraping = async (url: string) => {
    if (!onDetectUrl) return;

    try {
      setUrlScraperStatus('parsing');
      const content = await onDetectUrl(url);
      setParsedContent(content);
      setUrlScraperStatus('success');
    } catch (error) {
      console.error('URL抓取失败:', error);
      setUrlScraperStatus('error');
      setScraperError(error instanceof Error ? error.message : '网页解析失败');
    }
  };

  // 重置URL抓取状态
  const resetUrlScraper = () => {
    setDetectedUrl('');
    setParsedContent('');
    setUrlScraperStatus('idle');
    setScraperError('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    setMessage(newMessage);

    // 如果URL已经被检测到，不再重复检测
    if (detectedUrl || urlScraperStatus !== 'idle') return;

    // 如果消息包含URL并且我们有处理函数，尝试检测URL
    if (onDetectUrl) {
      // 使用正则表达式寻找可能的URL
      const urlMatch = newMessage.match(/https?:\/\/\S+/);
      if (urlMatch && urlMatch[0]) {
        const potentialUrl = urlMatch[0];
        // 检验URL是否有效
        if (isValidUrl(potentialUrl)) {
          setDetectedUrl(potentialUrl);
          handleUrlScraping(potentialUrl);
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    // Ctrl/Cmd + Enter 切换全展开模式
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setIsFullExpanded(!isFullExpanded);
    }
  };

  const handleSubmit = async () => {
    if ((!message.trim() && images.length === 0 && files.length === 0 && !parsedContent) ||
        (isLoading && !allowConsecutiveMessages)) {
      return;
    }

    let processedMessage = message.trim();

    // 如果有解析的内容，添加到消息中
    if (parsedContent && urlScraperStatus === 'success') {
      // 将网页内容和用户消息合并
      processedMessage = `${processedMessage}\n\n${parsedContent}`;
      // 重置URL解析状态
      setDetectedUrl('');
      setParsedContent('');
      setUrlScraperStatus('idle');
    }

    // 如果是图像生成模式，则调用生成图像的回调
    if (imageGenerationMode && onSendImagePrompt) {
      console.log('调用图像生成回调');
      onSendImagePrompt(processedMessage);
      setMessage('');

      // 重置输入框高度到默认值
      const defaultHeight = 40; // 默认容器高度
      setInputHeight(defaultHeight);
      if (textareaRef.current) {
        textareaRef.current.style.height = '24px'; // 重置textarea高度
      }
      return;
    }

    // 创建正确的图片格式
    const formattedImages: SiliconFlowImageFormat[] = [...images, ...files.filter(f => f.mimeType.startsWith('image/'))].map(img => ({
      type: 'image_url',
      image_url: {
        url: img.base64Data || img.url
      }
    }));

    // 调用父组件的回调
    console.log('发送消息:', {
      message: processedMessage,
      images: formattedImages.length,
      files: files.length,
      allFiles: files,
      toolsEnabled: toolsEnabled
    });
    onSendMessage(processedMessage, formattedImages.length > 0 ? formattedImages : undefined, toolsEnabled, files);

    // 重置状态
    setMessage('');
    setImages([]);
    setFiles([]);
    setUploadingMedia(false);

    // 重置输入框高度到默认值
    const defaultHeight = 40; // 默认容器高度
    setInputHeight(defaultHeight);
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px'; // 重置textarea高度
    }
  };

  const canSendMessage = () => {
    // 必须有文本或图片或文件才能发送
    const hasContent = message.trim() || images.length > 0 || files.length > 0 || parsedContent.trim();
    // 如果允许连续发送，则只要有内容就可以发送
    // 如果不允许连续发送，则需要检查isLoading状态
    return hasContent && (allowConsecutiveMessages || !isLoading);
  };



  // 处理图片上传
  const handleImageUpload = async (source: 'camera' | 'photos' = 'photos') => {
    try {
      setUploadingMedia(true);

      // 选择图片
      const selectedImages = await ImageUploadService.selectImages(source);
      if (selectedImages.length === 0) {
        setUploadingMedia(false);
        return;
      }

      // 压缩图片并存储进度
      const totalImages = selectedImages.length;
      let completedImages = 0;

      // 创建一个进度更新函数
      const updateProgress = (increment: number = 1) => {
        completedImages += increment;
        console.log(`处理图片进度: ${completedImages}/${totalImages}`);
      };

      // 处理图片
      const processedImages = await Promise.all(
        selectedImages.map(async (img, index) => {
          try {
            // 1. 压缩图片
            const compressedImage = await ImageUploadService.compressImage(img, 1024); // 限制1MB
            updateProgress(0.5); // 算作半个完成单位

            // 2. 尝试保存到DexieStorageService
            if (currentTopicState) {
              try {
                const imageRef = await dexieStorage.saveBase64Image(
                  compressedImage.base64Data || '',
                  {
                    mimeType: compressedImage.mimeType,
                    width: compressedImage.width,
                    height: compressedImage.height,
                    size: compressedImage.size,
                    topicId: currentTopicState.id
                  }
                );

                updateProgress(0.5);

                // 成功保存，返回图片引用
                return {
                  url: `[图片:${imageRef}]`, // 注意：这里imageRef直接是字符串ID
                  mimeType: compressedImage.mimeType,
                  width: compressedImage.width,
                  height: compressedImage.height
                } as ImageContent;

              } catch (storageError) {
                // 数据库存储失败，直接使用压缩后的图片
                console.warn('数据库存储图片失败，使用内存中的图片:', storageError);
                updateProgress(0.5);

                // 返回压缩后的图片，而不是引用
                return compressedImage;
              }
            } else {
              // 没有当前话题，使用原始方式
              const formattedImage = ImageUploadService.ensureCorrectFormat(compressedImage);
              updateProgress(0.5);
              return formattedImage;
            }
          } catch (error) {
            console.error(`处理第 ${index + 1} 张图片时出错:`, error);
            updateProgress(1);
            return null; // 返回null，稍后过滤掉
          }
        })
      );

      // 过滤掉错误的图片（null值）
      const validImages = processedImages.filter(img => img !== null) as ImageContent[];

      // 更新状态
      setImages(prev => [...prev, ...validImages]);
      setUploadingMedia(false);
    } catch (error) {
      console.error('图片上传失败:', error);
      setUploadingMedia(false);
      alert('图片上传失败，请重试');
    }
  };

  // 处理文件上传
  const handleFileUpload = async () => {
    try {
      setUploadingMedia(true);

      // 选择文件
      const selectedFiles = await FileUploadService.selectFiles();
      if (selectedFiles.length === 0) {
        setUploadingMedia(false);
        return;
      }

      // 处理文件，不需要特殊处理，直接添加到files状态
      setFiles(prev => [...prev, ...selectedFiles]);
      setUploadingMedia(false);
    } catch (error) {
      console.error('文件上传失败:', error);
      setUploadingMedia(false);
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
      icon: <SearchIcon />,
      label: '网络搜索',
      onClick: handleWebSearchClick,
      color: webSearchActive ? '#3b82f6' : '#607D8B',
      active: webSearchActive
    },
    {
      icon: <ImageIcon />,
      label: '生成图片',
      onClick: toggleImageGenerationMode,
      color: imageGenerationMode ? '#9C27B0' : '#FF9800',
      active: imageGenerationMode
    },
    {
      icon: <AddCircleIcon />,
      label: '新建话题',
      onClick: onNewTopic || handleCreateTopic,
      color: '#2196F3'
    },
    {
      icon: <ClearAllIcon />,
      label: '清空内容',
      onClick: onClearTopic,
      color: '#f44336'
    }
  ];

  // 扩展功能图标 - 包含上传功能
  const expandedIcons = [
    {
      icon: <PhotoCameraIcon />,
      label: '拍照上传',
      onClick: () => handleImageUpload('camera'),
      color: '#FF9800',
      disabled: uploadingMedia
    },
    {
      icon: <ImageIcon />,
      label: '图片上传',
      onClick: () => handleImageUpload('photos'),
      color: '#2196F3',
      disabled: uploadingMedia
    },
    {
      icon: <AttachFileIcon />,
      label: '文件上传',
      onClick: handleFileUpload,
      color: '#9C27B0',
      disabled: uploadingMedia
    },
    {
      icon: <BuildIcon />,
      label: '高级工具',
      onClick: toggleToolsEnabled,
      color: toolsEnabled ? '#4CAF50' : '#9E9E9E',
      active: toolsEnabled
    }
  ];

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
            onChange={handleChange}
            onKeyDown={handleKeyDown}
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
