import React, { useState, useRef, useEffect } from 'react';
import { IconButton, CircularProgress, Badge, Tooltip } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PhotoIcon from '@mui/icons-material/Photo';
import KeyboardVoiceIcon from '@mui/icons-material/KeyboardVoice';
import CancelIcon from '@mui/icons-material/Cancel';
import ImageUploadService from '../shared/services/ImageUploadService';
import type { ImageContent, SiliconFlowImageFormat } from '../shared/types';
import ImageIcon from '@mui/icons-material/Image';
import SearchIcon from '@mui/icons-material/Search';

interface ChatInputProps {
  onSendMessage: (message: string, images?: SiliconFlowImageFormat[]) => void;
  isLoading?: boolean;
  allowConsecutiveMessages?: boolean; // 允许连续发送消息，即使AI尚未回复
  imageGenerationMode?: boolean; // 是否处于图像生成模式
  onSendImagePrompt?: (prompt: string) => void; // 发送图像生成提示词的回调
  webSearchActive?: boolean; // 是否处于网络搜索模式
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  isLoading = false,
  allowConsecutiveMessages = true, // 默认允许连续发送
  imageGenerationMode = false, // 默认不是图像生成模式
  onSendImagePrompt,
  webSearchActive = false // 默认不是网络搜索模式
}) => {
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<ImageContent[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // 添加一个状态来跟踪键盘是否显示
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // 判断是否允许发送消息
  const canSendMessage = () => {
    // 必须有文本或图片才能发送
    const hasContent = message.trim() || images.length > 0;
    // 如果允许连续发送，则只要有内容就可以发送
    // 如果不允许连续发送，则需要检查isLoading状态
    return hasContent && (allowConsecutiveMessages || !isLoading);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if ((!message.trim() && images.length === 0) || isLoading) return;
    
    let processedMessage = message.trim();
    
    // 如果是图像生成模式，则调用生成图像的回调
    if (imageGenerationMode && onSendImagePrompt) {
      onSendImagePrompt(processedMessage);
      setMessage('');
      return;
    }
    
    // 创建正确的图片格式
    const formattedImages: SiliconFlowImageFormat[] = images.map(img => ({
      type: 'image_url',
      image_url: {
        url: img.base64Data || img.url
      }
    }));
    
    // 重置状态
    setMessage('');
    setImages([]);
    setUploadingImages(false);
    
    // 添加到消息列表
    onSendMessage(processedMessage, formattedImages);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
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

  // 处理图片上传
  const handleImageUpload = async (source: 'camera' | 'photos' = 'photos') => {
    try {
      setUploadingImages(true);
      
      // 选择图片
      const selectedImages = await ImageUploadService.selectImages(source);
      if (selectedImages.length === 0) {
        setUploadingImages(false);
        return;
      }
      
      // 压缩图片
      const compressedImages = await Promise.all(
        selectedImages.map(img => ImageUploadService.compressImage(img, 1024)) // 限制1MB
      );
      
      // 确保所有图片格式正确
      const formattedImages = compressedImages.map(
        img => ImageUploadService.ensureCorrectFormat(img)
      );
      
      // 更新状态
      setImages(prev => [...prev, ...formattedImages]);
      setUploadingImages(false);
    } catch (error) {
      console.error('图片上传失败:', error);
      setUploadingImages(false);
      alert('图片上传失败，请重试');
    }
  };

  // 删除已选择的图片
  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
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
      {/* 已选择的图片预览 */}
      {images.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'nowrap',
          overflowX: 'auto',
          width: '100%',
          maxWidth: '600px',
          padding: '8px 0',
          gap: '8px',
          marginBottom: '8px'
        }}>
          {images.map((image, index) => (
            <div
              key={`preview-${index}`}
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
        </div>
      )}
      
      <div style={{
          display: 'flex',
          alignItems: 'center',
        padding: '5px 8px',
        borderRadius: '20px',
        backgroundColor: '#ffffff',
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
            color: '#797979',
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
              maxHeight: '80px'
            }}
            placeholder={imageGenerationMode ? "输入图像生成提示词..." : webSearchActive ? "输入网络搜索内容..." : "和ai助手说点什么"}
            value={message}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            disabled={isLoading && !allowConsecutiveMessages}
            rows={1}
          />
        </div>
        
        {/* 图片上传按钮 */}
        <Tooltip title="上传图片">
          <IconButton
            size="medium"
            onClick={() => handleImageUpload('photos')}
            disabled={uploadingImages || (isLoading && !allowConsecutiveMessages)}
            style={{
              color: uploadingImages ? '#ccc' : '#797979',
              padding: '8px',
              position: 'relative'
            }}
          >
            {uploadingImages ? (
              <CircularProgress size={24} />
            ) : (
              <Badge badgeContent={images.length} color="primary" max={9} invisible={images.length === 0}>
            <PhotoIcon />
              </Badge>
            )}
          </IconButton>
        </Tooltip>
          
        {/* 发送按钮 */}
          <IconButton
          onClick={handleSubmit}
          disabled={!canSendMessage() || isLoading && !allowConsecutiveMessages}
            size="medium"
            style={{
            color: !canSendMessage() || (isLoading && !allowConsecutiveMessages) ? '#ccc' : imageGenerationMode ? '#9C27B0' : webSearchActive ? '#3b82f6' : '#09bb07',
            padding: '8px'
              }}
            >
          {showLoadingIndicator ? (
            <CircularProgress size={24} color="inherit" />
          ) : imageGenerationMode ? (
            <Tooltip title="生成图像">
              <ImageIcon />
            </Tooltip>
          ) : webSearchActive ? (
            <Tooltip title="搜索网络">
              <SearchIcon />
            </Tooltip>
          ) : (
            <SendIcon />
          )}
            </IconButton>
      </div>
    </div>
  );
};

export default ChatInput;
