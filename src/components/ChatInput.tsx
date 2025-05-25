import React, { useState, useRef, useEffect } from 'react';
import { IconButton, CircularProgress, Badge, Tooltip, useMediaQuery } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import KeyboardVoiceIcon from '@mui/icons-material/KeyboardVoice';
import LinkIcon from '@mui/icons-material/Link';
import StopIcon from '@mui/icons-material/Stop';

import { ImageUploadService } from '../shared/services/ImageUploadService';
import MultiModelSelector from './MultiModelSelector';
import { FileUploadService } from '../shared/services/FileUploadService';
import type { ImageContent, SiliconFlowImageFormat, FileContent } from '../shared/types';
import ImageIcon from '@mui/icons-material/Image';
import SearchIcon from '@mui/icons-material/Search';
import { isValidUrl } from '../shared/utils';
import UrlScraperStatus from './UrlScraperStatus';
import type { FileStatus } from './FilePreview';
import IntegratedFilePreview from './IntegratedFilePreview';
import UploadMenu from './UploadMenu';
import EnhancedToast, { toastManager } from './EnhancedToast';
import type { ScraperStatus } from './UrlScraperStatus';
import { dexieStorage } from '../shared/services/DexieStorageService';
import { useSelector } from 'react-redux';
import type { RootState } from '../shared/store';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

interface ChatInputProps {
  onSendMessage: (message: string, images?: SiliconFlowImageFormat[], toolsEnabled?: boolean, files?: any[]) => void;
  onSendMultiModelMessage?: (message: string, models: any[], images?: SiliconFlowImageFormat[], toolsEnabled?: boolean, files?: any[]) => void; // 多模型发送回调
  isLoading?: boolean;
  allowConsecutiveMessages?: boolean; // 允许连续发送消息，即使AI尚未回复
  imageGenerationMode?: boolean; // 是否处于图像生成模式
  onSendImagePrompt?: (prompt: string) => void; // 发送图像生成提示词的回调
  webSearchActive?: boolean; // 是否处于网络搜索模式
  onDetectUrl?: (url: string) => Promise<string>; // 用于检测并解析URL的回调
  onStopResponse?: () => void; // 停止AI回复的回调
  isStreaming?: boolean; // 是否正在流式响应中
  toolsEnabled?: boolean; // 工具开关状态
  availableModels?: any[]; // 可用模型列表
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onSendMultiModelMessage,
  isLoading = false,
  allowConsecutiveMessages = true, // 默认允许连续发送
  imageGenerationMode = false, // 默认不是图像生成模式
  onSendImagePrompt,
  webSearchActive = false, // 默认不是网络搜索模式
  onDetectUrl,
  onStopResponse,
  isStreaming = false,
  toolsEnabled = true, // 默认启用工具
  availableModels = [] // 默认空数组
}) => {
  const [message, setMessage] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [images, setImages] = useState<ImageContent[]>([]);
  const [files, setFiles] = useState<FileContent[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadMenuAnchorEl, setUploadMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [multiModelSelectorOpen, setMultiModelSelectorOpen] = useState(false);

  // 文件状态管理
  const [fileStatuses, setFileStatuses] = useState<Record<string, { status: FileStatus; progress?: number; error?: string }>>({});

  // Toast消息管理
  const [toastMessages, setToastMessages] = useState<any[]>([]);

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

  // Toast消息订阅
  useEffect(() => {
    const unsubscribe = toastManager.subscribe(setToastMessages);
    return unsubscribe;
  }, []);

  // 获取主题相关颜色和响应式断点
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // 小于600px
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md')); // 600px-900px

  // 文本输入增强状态
  const [textareaHeight, setTextareaHeight] = useState<number>(isMobile ? 24 : 28);
  const [isComposing, setIsComposing] = useState(false); // 输入法组合状态
  const [showCharCount, setShowCharCount] = useState(false); // 是否显示字符计数

  // 获取输入框风格设置
  const inputBoxStyle = useSelector((state: RootState) =>
    (state.settings as any).inputBoxStyle || 'default'
  );

  // 根据风格获取样式
  const getInputStyles = () => {
    const baseStyles = {
      inputBgColor: isDarkMode ? alpha(theme.palette.background.paper, 0.5) : alpha(theme.palette.background.paper, 0.95), // 浅色模式使用更高的透明度
      iconColor: theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main,
      textColor: isDarkMode ? '#E0E0E0' : '#000000',
      disabledColor: isDarkMode ? '#555' : '#ccc',
      borderRadius: '20px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
      border: 'none'
    };

    switch (inputBoxStyle) {
      case 'modern':
        return {
          ...baseStyles,
          inputBgColor: isDarkMode
            ? 'linear-gradient(135deg, rgba(45, 45, 45, 0.9) 0%, rgba(35, 35, 35, 0.9) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
          borderRadius: '16px',
          boxShadow: isDarkMode
            ? '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)'
            : '0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05)',
          border: isDarkMode
            ? '1px solid rgba(255, 255, 255, 0.1)'
            : '1px solid rgba(0, 0, 0, 0.05)',
          iconColor: isDarkMode ? '#64B5F6' : '#1976D2'
        };
      case 'minimal':
        return {
          ...baseStyles,
          inputBgColor: isDarkMode
            ? 'rgba(40, 40, 40, 0.6)'
            : 'rgba(255, 255, 255, 0.7)',
          borderRadius: '12px',
          boxShadow: 'none',
          border: isDarkMode
            ? '1px solid rgba(255, 255, 255, 0.08)'
            : '1px solid rgba(0, 0, 0, 0.08)',
          iconColor: isDarkMode ? '#9E9E9E' : '#757575'
        };
      default:
        return baseStyles;
    }
  };

  const styles = getInputStyles();
  const { inputBgColor, iconColor, textColor, disabledColor, borderRadius, boxShadow, border } = styles;

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
      const defaultHeight = isMobile ? 24 : 28;
      setTextareaHeight(defaultHeight);
      if (textareaRef.current) {
        textareaRef.current.style.height = `${defaultHeight}px`;
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

    // 不在这里处理文件描述，让API处理文件内容

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
    const defaultHeight = isMobile ? 24 : 28;
    setTextareaHeight(defaultHeight);
    if (textareaRef.current) {
      textareaRef.current.style.height = `${defaultHeight}px`;
    }
  };

  // 处理多模型发送
  const handleMultiModelSend = (selectedModels: any[]) => {
    if (!message.trim() && images.length === 0 && files.length === 0) return;
    if (!onSendMultiModelMessage) return;

    let processedMessage = message.trim();

    // 如果有解析的内容，添加到消息中
    if (parsedContent && urlScraperStatus === 'success') {
      processedMessage = `${processedMessage}\n\n${parsedContent}`;
      // 重置URL解析状态
      setDetectedUrl('');
      setParsedContent('');
      setUrlScraperStatus('idle');
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

    // 重置状态
    setMessage('');
    setImages([]);
    setFiles([]);
    setUploadingMedia(false);

    // 重置输入框高度到默认值
    const defaultHeight = isMobile ? 24 : 28;
    setTextareaHeight(defaultHeight);
    if (textareaRef.current) {
      textareaRef.current.style.height = `${defaultHeight}px`;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    setMessage(newMessage);

    // 自动调整textarea高度
    adjustTextareaHeight(e.target);

    // 显示/隐藏字符计数
    setShowCharCount(newMessage.length > 100 || newMessage.length > 500);

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

  // 自动调整textarea高度
  const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    // 重置高度以获取正确的scrollHeight
    textarea.style.height = 'auto';

    // 计算新高度 - 大幅提高最大高度限制
    const minHeight = isMobile ? 24 : 28;
    const maxHeight = isMobile ? 200 : 250; // 移动端200px，桌面端250px
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);

    // 设置新高度
    textarea.style.height = `${newHeight}px`;
    setTextareaHeight(newHeight);
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 处理快捷键
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'a':
          // Ctrl+A 全选 - 浏览器默认行为，不需要阻止
          break;
        case 'z':
          // Ctrl+Z 撤销 - 浏览器默认行为，不需要阻止
          break;
        case 'y':
          // Ctrl+Y 重做 - 浏览器默认行为，不需要阻止
          break;
      }
    }

    // Enter键发送消息（非输入法组合状态且非Shift+Enter）
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  // 输入法组合开始
  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  // 输入法组合结束
  const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    setIsComposing(false);
    // 组合结束后重新调整高度
    adjustTextareaHeight(e.target as HTMLTextAreaElement);
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
    let uploadToastId: string | null = null;

    try {
      setUploadingMedia(true);

      // 显示上传开始提示
      uploadToastId = toastManager.upload('正在选择文件...', '文件上传');

      // 选择文件
      const selectedFiles = await FileUploadService.selectFiles();
      if (selectedFiles.length === 0) {
        setUploadingMedia(false);
        if (uploadToastId) toastManager.remove(uploadToastId);
        return;
      }

      // 更新进度
      if (uploadToastId) {
        toastManager.updateProgress(uploadToastId, 20, `正在处理 ${selectedFiles.length} 个文件...`);
      }

      // 处理每个文件
      const processedFiles: FileContent[] = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileKey = `${file.name}-${file.size}`;

        try {
          // 设置文件状态为验证中
          setFileStatuses(prev => ({
            ...prev,
            [fileKey]: { status: 'validating' }
          }));

          // 模拟验证过程
          await new Promise(resolve => setTimeout(resolve, 500));

          // 检查文件大小
          if (file.size > 50 * 1024 * 1024) {
            throw new Error('文件太大，最大允许50MB');
          }

          // 设置文件状态为成功
          setFileStatuses(prev => ({
            ...prev,
            [fileKey]: { status: 'success' }
          }));

          processedFiles.push(file);

          // 更新总体进度
          const progress = 20 + ((i + 1) / selectedFiles.length) * 70;
          if (uploadToastId) {
            toastManager.updateProgress(uploadToastId, progress, `已处理 ${i + 1}/${selectedFiles.length} 个文件`);
          }

        } catch (fileError) {
          console.error(`处理文件 ${file.name} 失败:`, fileError);

          // 设置文件状态为错误
          setFileStatuses(prev => ({
            ...prev,
            [fileKey]: {
              status: 'error',
              error: fileError instanceof Error ? fileError.message : '处理失败'
            }
          }));

          // 显示单个文件错误
          toastManager.error(
            `文件 "${file.name}" 处理失败: ${fileError instanceof Error ? fileError.message : '未知错误'}`,
            '文件处理错误'
          );
        }
      }

      // 添加成功处理的文件
      if (processedFiles.length > 0) {
        setFiles(prev => [...prev, ...processedFiles]);
      }

      // 完成上传
      if (uploadToastId) {
        toastManager.updateProgress(uploadToastId, 100, '文件上传完成');
        setTimeout(() => {
          if (uploadToastId) toastManager.remove(uploadToastId);
        }, 1500);
      }

      // 显示成功消息
      if (processedFiles.length > 0) {
        toastManager.success(
          `成功上传 ${processedFiles.length} 个文件`,
          '上传完成',
          {
            action: processedFiles.length !== selectedFiles.length ? {
              label: '查看详情',
              onClick: () => {
                // 可以打开详情对话框
              }
            } : undefined
          }
        );
      }

      setUploadingMedia(false);
    } catch (error) {
      console.error('文件上传失败:', error);
      setUploadingMedia(false);

      if (uploadToastId) toastManager.remove(uploadToastId);

      toastManager.error(
        error instanceof Error ? error.message : '文件上传失败，请重试',
        '上传失败'
      );
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
        minHeight: isTablet ? '48px' : '40px',
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
              padding: isTablet ? '14px 0' : '12px 0',
              border: 'none',
              outline: 'none',
              width: '100%',
              backgroundColor: 'transparent',
              lineHeight: '1.5',
              fontFamily: 'inherit',
              resize: 'none',
              overflow: textareaHeight >= (isMobile ? 200 : 250) ? 'auto' : 'hidden',
              minHeight: `${isMobile ? 24 : 28}px`,
              height: `${textareaHeight}px`,
              maxHeight: `${isMobile ? 200 : 250}px`,
              color: textColor,
              transition: 'height 0.2s ease-out',
              scrollbarWidth: 'thin',
              scrollbarColor: `${isDarkMode ? '#555 transparent' : '#ccc transparent'}`
            }}
            placeholder={imageGenerationMode ? "输入图像生成提示词..." : webSearchActive ? "输入网络搜索内容..." : "和ai助手说点什么"}
            value={message}
            onChange={handleChange}
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
        onImageUpload={handleImageUpload}
        onFileUpload={handleFileUpload}
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
