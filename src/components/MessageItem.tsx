import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Paper, Typography, Box, Avatar, CircularProgress, useTheme } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import type { Message, ImageContent, SiliconFlowImageFormat } from '../shared/types';
import type { RootState } from '../shared/store';
import { useSelector } from 'react-redux';
import ThinkingProcess from '../components/message/ThinkingProcess';
import MessageActions from '../components/message/MessageActions';
import ImageContentComponent from '../components/message/ImageContent';
import MarkdownRenderer from '../components/message/MarkdownRenderer';

interface MessageItemProps {
  message: Message;
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onSwitchVersion?: (messageId: string) => void;
}

// 图片引用正则表达式
const IMAGE_REF_REGEX = /\[图片:([a-zA-Z0-9_-]+)\]/g;

const MessageItemComponent: React.FC<MessageItemProps> = ({ message, onRegenerate, onDelete, onSwitchVersion }) => {
  const theme = useTheme();
  const currentTopic = useSelector((state: RootState) => state.messages.currentTopic);
  const defaultModelId = useSelector((state: RootState) => state.settings.defaultModelId);
  const providers = useSelector((state: RootState) => state.settings.providers);

  // 用于存储用户头像和模型头像
  const [userAvatar, setUserAvatar] = useState<string>("");
  const [modelAvatar, setModelAvatar] = useState<string>("");

  const isUser = useMemo(() => message.role === 'user', [message.role]);
  const isError = useMemo(() => message.status === 'error', [message.status]);
  const isPending = useMemo(() => message.status === 'pending', [message.status]);

  // 获取思考过程
  const reasoning = message.reasoning;
  const reasoningTime = message.reasoningTime;

  // 提取图片引用的辅助函数
  const extractImageReferences = useCallback((content: string): ImageContent[] => {
    const extracted: ImageContent[] = [];
    let match;
    const imageIds = new Set<string>();
    IMAGE_REF_REGEX.lastIndex = 0;
    while ((match = IMAGE_REF_REGEX.exec(content)) !== null) {
      const imageId = match[1];
      if (!imageIds.has(imageId)) {
        imageIds.add(imageId);
        extracted.push({
          url: match[0], // This is the [图片:ID] string itself
          mimeType: 'image/jpeg',
        });
      }
    }
    return extracted;
  }, []);

  // 获取文本内容
  const { textContent, allImages } = useMemo(() => {
    let currentTextContent = "";
    const imagesCollector: ImageContent[] = [];

    if (typeof message.content === 'object' && message.content !== null) {
      currentTextContent = (message.content as { text?: string }).text || "";
      const contentObjectImages = (message.content as { images?: ImageContent[] }).images || [];
      imagesCollector.push(...contentObjectImages);
      if (currentTextContent) {
        imagesCollector.push(...extractImageReferences(currentTextContent));
      }
    } else if (typeof message.content === 'string') {
      currentTextContent = message.content;
      imagesCollector.push(...extractImageReferences(currentTextContent));
    }

    const directSFImages: SiliconFlowImageFormat[] = message.images || [];
    const convertedSFImages: ImageContent[] = directSFImages.map(sfImg => ({
      url: sfImg.image_url.url,
      mimeType: sfImg.image_url.url.startsWith('data:')
        ? sfImg.image_url.url.split(';')[0].split(':')[1]
        : 'image/jpeg',
      base64Data: sfImg.image_url.url.startsWith('data:') ? sfImg.image_url.url : undefined,
    }));
    imagesCollector.push(...convertedSFImages);

    const uniqueImages = Array.from(new Map(imagesCollector.map(img => [img.url, img])).values());

    return {
      textContent: currentTextContent,
      allImages: uniqueImages,
    };
  }, [message.content, message.images, extractImageReferences]);

  // 从本地存储加载头像
  useEffect(() => {
    // 加载用户头像
    const savedUserAvatar = localStorage.getItem('user_avatar');
    if (savedUserAvatar) {
      setUserAvatar(savedUserAvatar);
    }

    // 尝试加载模型头像
    if (!isUser && message.modelId) {
      const modelId = message.modelId;
      const savedModelAvatar = localStorage.getItem(`model_avatar_${modelId}`);
      if (savedModelAvatar) {
        setModelAvatar(savedModelAvatar);
      }
    }
  }, [isUser, message.modelId]);

  // 获取模型信息
  const assistantName = useMemo(() => {
    if (isUser) return "我";

    // 调试日志
    console.log(`[MessageItem] 获取助手名称: messageId=${message.id}, messageModelId=${message.modelId}, defaultModelId=${defaultModelId}`);
    
    // 确定要使用的模型ID
    let modelIdToUse = message.modelId || defaultModelId;
    
    // 查找对应的模型和提供商
    if (modelIdToUse && providers.length > 0) {
      // 遍历所有提供商
      for (const provider of providers) {
        // 查找该提供商下的匹配模型
        const model = provider.models.find(m => m.id === modelIdToUse);
        if (model) {
          // 找到匹配模型，返回提供商/模型格式
          return `${provider.name}/${model.name}`;
        }
      }
      
      // 如果没找到精确匹配，检查ID是否包含提供商信息
      if (modelIdToUse.includes('/')) {
        const [providerId, modelPart] = modelIdToUse.split('/');
        // 尝试查找对应的提供商
        const provider = providers.find(p => p.id === providerId);
        if (provider && modelPart) {
          return `${provider.name}/${modelPart}`;
        }
        return modelPart || modelIdToUse; // 至少返回模型部分
      }
    }
    
    // 如果所有尝试都失败，返回原始ID或默认名称
    return modelIdToUse || "AI助手";
  }, [isUser, message.modelId, defaultModelId, providers]);

  // 添加调试信息，输出当前使用的模型
  console.log(`[MessageItem] 当前消息使用的模型ID: ${message.modelId}, 显示名称: ${assistantName}, 模型数量: ${providers.length}`);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        mb: 2,
        mx: 2,
        position: 'relative',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: isUser ? 'row-reverse' : 'row',
          alignItems: 'center',
          mb: 1
        }}
      >
        <Avatar
          alt={isUser ? "用户" : "AI"}
          src={isUser ? userAvatar : (modelAvatar || "/assets/ai-avatar.png")}
          sx={{
            width: 36,
            height: 36,
            bgcolor: isUser ? '#87d068' : '#1677ff',
          }}
        >
          {isUser && !userAvatar ? "我" : (!modelAvatar && assistantName ? assistantName.charAt(0) : null)}
        </Avatar>
        <Typography
          variant="body2"
          sx={{
            mx: 1,
            color: 'text.secondary',
            fontSize: '0.75rem',
          }}
        >
          {assistantName}
        </Typography>
      </Box>

      {/* 思考过程，只对AI回复显示，移动到这里，在模型名字后、气泡前显示 */}
      {!isUser && reasoning && (
        <Box sx={{ 
          width: '95%',  // 与AI消息宽度匹配
          mb: 1
        }}>
          <ThinkingProcess 
            reasoning={reasoning} 
            reasoningTime={reasoningTime} 
          />
        </Box>
      )}

      <Paper
        elevation={1}
        sx={{
          p: 1.5,
          ml: isUser ? 0 : 0,
          mr: isUser ? 0 : 0,
          bgcolor: isUser ? theme.palette.primary.main : theme.palette.background.paper,
          color: isUser ? theme.palette.primary.contrastText : theme.palette.text.primary,
          borderRadius: isUser ? '12px 12px 0 12px' : '12px 12px 12px 0',
          maxWidth: '95%',
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          position: 'relative',
          boxShadow: theme.shadows[1],
        }}
      >
        {isPending && (
          <CircularProgress size={20} sx={{ position: 'absolute', top: 8, right: 8 }} />
        )}
        {isError && (
          <ErrorOutlineIcon color="error" sx={{ position: 'absolute', top: 8, right: 8 }} />
        )}

        {allImages.length > 0 && (
          allImages.map((img, idx) => (
            <ImageContentComponent key={img.url || idx} image={img} index={idx} />
          ))
        )}
        
        {textContent && <MarkdownRenderer content={textContent} />}
        
        {!isPending && (
          <MessageActions 
            message={message}
            topicId={currentTopic?.id}
            onRegenerate={onRegenerate}
            onDelete={onDelete}
            onSwitchVersion={onSwitchVersion}
          />
        )}
      </Paper>
    </Box>
  );
};

const MessageItem = React.memo(MessageItemComponent);

export default MessageItem;
