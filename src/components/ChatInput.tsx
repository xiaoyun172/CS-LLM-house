import React, { useState, useRef, useEffect } from 'react';
import { IconButton, CircularProgress, Badge, Tooltip, Box } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import KeyboardVoiceIcon from '@mui/icons-material/KeyboardVoice';
import CancelIcon from '@mui/icons-material/Cancel';
import LinkIcon from '@mui/icons-material/Link';
import StopIcon from '@mui/icons-material/Stop';
import { ImageUploadService } from '../shared/services/ImageUploadService';
import { FileUploadService } from '../shared/services/FileUploadService';
import type { ImageContent, SiliconFlowImageFormat, FileContent } from '../shared/types';
import ImageIcon from '@mui/icons-material/Image';
import SearchIcon from '@mui/icons-material/Search';
import { isValidUrl } from '../shared/utils';
import UrlScraperStatus from './UrlScraperStatus';
import FilePreview from './FilePreview';
import UploadMenu from './UploadMenu';
import type { ScraperStatus } from './UrlScraperStatus';
import { dexieStorage } from '../shared/services/DexieStorageService';
import { useSelector } from 'react-redux';
import type { RootState } from '../shared/store';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

interface ChatInputProps {
  onSendMessage: (message: string, images?: SiliconFlowImageFormat[]) => void;
  isLoading?: boolean;
  allowConsecutiveMessages?: boolean; // 允许连续发送消息，即使AI尚未回复
  imageGenerationMode?: boolean; // 是否处于图像生成模式
  onSendImagePrompt?: (prompt: string) => void; // 发送图像生成提示词的回调
  webSearchActive?: boolean; // 是否处于网络搜索模式
  onDetectUrl?: (url: string) => Promise<string>; // 用于检测并解析URL的回调
  onStopResponse?: () => void; // 停止AI回复的回调
  isStreaming?: boolean; // 是否正在流式响应中
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading = false,
  allowConsecutiveMessages = true, // 默认允许连续发送
  imageGenerationMode = false, // 默认不是图像生成模式
  onSendImagePrompt,
  webSearchActive = false, // 默认不是网络搜索模式
  onDetectUrl,
  onStopResponse,
  isStreaming = false
}) => {
  const [message, setMessage] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [images, setImages] = useState<ImageContent[]>([]);
  const [files, setFiles] = useState<FileContent[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadMenuAnchorEl, setUploadMenuAnchorEl] = useState<null | HTMLElement>(null);

  // URL解析状态
  const [detectedUrl, setDetectedUrl] = useState<string>('');
  const [parsedContent, setParsedContent] = useState<string>('');
  const [urlScraperStatus, setUrlScraperStatus] = useState<ScraperStatus>('idle');
  const [scraperError, setScraperError] = useState<string>('');

  // 获取当前话题状态 - 移到组件顶层
  const currentTopicId = useSelector((state: RootState) => state.messages.currentTopicId);
  const [currentTopicState, setCurrentTopicState] = useState<any>(null);

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

  // 获取主题相关颜色
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const inputBgColor = isDarkMode ? alpha(theme.palette.background.paper, 0.5) : alpha(theme.palette.background.paper, 0.8);
  const iconColor = theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main;
  const textColor = isDarkMode ? '#E0E0E0' : '#000000';
  const disabledColor = isDarkMode ? '#555' : '#ccc';

  // 判断是否允许发送消息
  const canSendMessage = () => {
    // 必须有文本或图片或文件才能发送
    const hasContent = message.trim() || images.length > 0 || files.length > 0 || parsedContent.trim();
    // 如果允许连续发送，则只要有内容就可以发送
    // 如果不允许连续发送，则需要检查isLoading状态
    return hasContent && (allowConsecutiveMessages || !isLoading);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if ((!message.trim() && images.length === 0 && files.length === 0 && !parsedContent) || isLoading) {
      console.log('无内容或正在加载，不发送消息');
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
      return;
    }

    // 创建正确的图片格式
    const formattedImages: SiliconFlowImageFormat[] = [...images, ...files.filter(f => f.mimeType.startsWith('image/'))].map(img => ({
      type: 'image_url',
      image_url: {
        url: img.base64Data || img.url
      }
    }));

    // 如果有非图片文件，添加到消息中
    const nonImageFiles = files.filter(f => !f.mimeType.startsWith('image/'));
    if (nonImageFiles.length > 0) {
      // 为每个文件添加描述
      const fileDescriptions = nonImageFiles.map(file =>
        `[文件: ${file.name} (${FileUploadService.formatFileSize(file.size)})]`
      ).join('\n');

      // 将文件描述添加到消息中
      if (processedMessage) {
        processedMessage += '\n\n' + fileDescriptions;
      } else {
        processedMessage = fileDescriptions;
      }
    }

    // 调用父组件的回调
    console.log('发送消息:', processedMessage, formattedImages.length > 0 ? '包含图片' : '不包含图片');
    onSendMessage(processedMessage, formattedImages.length > 0 ? formattedImages : undefined);

    // 重置状态
    setMessage('');
    setImages([]);
    setFiles([]);
    setUploadingMedia(false);
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  // 添加焦点管理以确保复制粘贴功能正常工作，并处理键盘显示
  useEffect(() => {
    // 设置一个延迟以确保组件挂载后聚焦生效
    const timer = setTimeout(() => {
      if (textareaRef.current) {
        // 聚焦后立即模糊，这有助于解决某些Android设备上的复制粘贴问题
        textareaRef.current.focus();
        textareaRef.current.blur();
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
  }, []);

  // 处理上传菜单
  const handleOpenUploadMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    setUploadMenuAnchorEl(event.currentTarget);
  };

  const handleCloseUploadMenu = () => {
    setUploadMenuAnchorEl(null);
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
        // 这里可以添加进度百分比显示的逻辑，比如设置状态或显示进度条
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

  // 显示正在加载的指示器，但不禁用输入框
  const showLoadingIndicator = isLoading && !allowConsecutiveMessages;

  return (
    <div style={{
      backgroundColor: 'transparent',
      padding: '0px 10px 10px 10px',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      boxShadow: 'none',
      transition: 'all 0.3s ease',
      marginBottom: isKeyboardVisible ? '0' : '0'
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

      {/* 已选择的媒体预览区域 */}
      {(images.length > 0 || files.length > 0) && (
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: '600px',
          padding: '8px 0',
          gap: '8px',
          marginBottom: '8px'
        }}>
          {/* 图片预览 */}
          {images.length > 0 && (
            <Box sx={{
              display: 'flex',
              flexWrap: 'nowrap',
              overflowX: 'auto',
              width: '100%',
              gap: '8px',
            }}>
              {images.map((image, index) => (
                <div
                  key={`preview-image-${index}`}
                  style={{
                    position: 'relative',
                    width: '60px',
                    height: '60px',
                    flexShrink: 0
                  }}
                >
                  <img
                    src={image.base64Data || image.url}
                    alt={`预览 ${index + 1}`}
                    style={{
                      width: '60px',
                      height: '60px',
                      objectFit: 'cover',
                      borderRadius: '4px',
                      border: '1px solid #e0e0e0'
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveImage(index)}
                    style={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      color: 'white',
                      padding: '2px',
                      width: '20px',
                      height: '20px'
                    }}
                  >
                    <CancelIcon fontSize="small" />
                  </IconButton>
                </div>
              ))}
            </Box>
          )}

          {/* 文件预览 */}
          {files.length > 0 && (
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              gap: '4px',
            }}>
              {files.map((file, index) => (
                <FilePreview
                  key={`preview-file-${index}`}
                  file={file}
                  onRemove={() => handleRemoveFile(index)}
                />
              ))}
            </Box>
          )}
        </Box>
      )}

      <div style={{
          display: 'flex',
          alignItems: 'center',
        padding: '5px 8px',
        borderRadius: '20px',
        backgroundColor: inputBgColor,
          border: 'none',
        minHeight: '40px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
        width: '100%',
        maxWidth: '600px'
      }}>
        {/* 语音图标 */}
          <IconButton
          size="medium"
          style={{
            color: iconColor,
            padding: '8px',
            marginRight: '4px'
          }}
          >
          <KeyboardVoiceIcon />
          </IconButton>

        {/* 文本输入区域 */}
        <div style={{
          flexGrow: 1,
          margin: '0 8px',
          position: 'relative'
        }}>
          <textarea
            ref={textareaRef}
            style={{
              fontSize: '16px',
              padding: '12px 0',
              border: 'none',
              outline: 'none',
              width: '100%',
              backgroundColor: 'transparent',
              lineHeight: '1.5',
              fontFamily: 'inherit',
              resize: 'none',
              overflow: 'hidden',
              minHeight: '24px',
              maxHeight: '80px',
              color: textColor
            }}
            placeholder={imageGenerationMode ? "输入图像生成提示词..." : webSearchActive ? "输入网络搜索内容..." : "和ai助手说点什么"}
            value={message}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            disabled={isLoading && !allowConsecutiveMessages}
            rows={1}
          />
        </div>

        {/* 添加按钮，打开上传菜单 */}
        <Tooltip title="添加图片或文件">
          <IconButton
            size="medium"
            onClick={handleOpenUploadMenu}
            disabled={uploadingMedia || (isLoading && !allowConsecutiveMessages)}
            style={{
              color: uploadingMedia ? disabledColor : iconColor,
              padding: '8px',
              position: 'relative'
            }}
          >
            {uploadingMedia ? (
              <CircularProgress size={24} />
            ) : (
              <Badge badgeContent={images.length + files.length} color="primary" max={9} invisible={images.length + files.length === 0}>
                <AddCircleIcon />
              </Badge>
            )}
          </IconButton>
        </Tooltip>

        {/* 发送按钮或停止按钮 */}
        <IconButton
          onClick={isStreaming && onStopResponse ? onStopResponse : handleSubmit}
          disabled={!isStreaming && (!canSendMessage() || (isLoading && !allowConsecutiveMessages))}
          size="medium"
          style={{
            color: isStreaming ? '#ff4d4f' : !canSendMessage() || (isLoading && !allowConsecutiveMessages) ? disabledColor : imageGenerationMode ? '#9C27B0' : webSearchActive ? '#3b82f6' : urlScraperStatus === 'success' ? '#26C6DA' : isDarkMode ? '#4CAF50' : '#09bb07',
            padding: '8px'
          }}
        >
          {isStreaming ? (
            <Tooltip title="停止生成">
              <StopIcon />
            </Tooltip>
          ) : showLoadingIndicator ? (
            <CircularProgress size={24} color="inherit" />
          ) : imageGenerationMode ? (
            <Tooltip title="生成图像">
              <ImageIcon />
            </Tooltip>
          ) : webSearchActive ? (
            <Tooltip title="搜索网络">
              <SearchIcon />
            </Tooltip>
          ) : urlScraperStatus === 'success' ? (
            <Tooltip title="发送解析的网页内容">
              <LinkIcon />
            </Tooltip>
          ) : (
            <SendIcon />
          )}
        </IconButton>
      </div>

      {/* 上传选择菜单 */}
      <UploadMenu
        anchorEl={uploadMenuAnchorEl}
        open={Boolean(uploadMenuAnchorEl)}
        onClose={handleCloseUploadMenu}
        onImageUpload={handleImageUpload}
        onFileUpload={handleFileUpload}
      />
    </div>
  );
};

export default ChatInput;
