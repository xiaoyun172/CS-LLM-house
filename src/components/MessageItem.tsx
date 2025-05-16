import React, { useEffect, useState, useCallback } from 'react';
import { Paper, Typography, Box, Avatar, CircularProgress, useTheme } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import type { Message, ImageContent } from '../shared/types';
import type { RootState } from '../shared/store';
import { useSelector } from 'react-redux';
import ThinkingProcess from '../components/message/ThinkingProcess';
import MessageActions from '../components/message/MessageActions';
import ImageContentComponent from '../components/message/ImageContent';
import MarkdownRenderer from '../components/message/MarkdownRenderer';
import { estimateTokens } from '../shared/utils';

interface MessageItemProps {
  message: Message;
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onSwitchVersion?: (messageId: string) => void;
}

// 图片引用正则表达式
const IMAGE_REF_REGEX = /\[图片:([a-zA-Z0-9_-]+)\]/g;

const MessageItem: React.FC<MessageItemProps> = ({ message, onRegenerate, onDelete, onSwitchVersion }) => {
  const theme = useTheme();
  const currentTopic = useSelector((state: RootState) => state.messages.currentTopic);
  const models = useSelector((state: RootState) => state.settings.models);
  const defaultModelId = useSelector((state: RootState) => state.settings.defaultModelId);
  // 从providers获取所有模型
  const providers = useSelector((state: RootState) => state.settings.providers);
  const providerModels = providers.flatMap(provider => provider.models);
  const allModels = [...(models || []), ...providerModels];
  
  // 用于存储用户头像和模型头像
  const [userAvatar, setUserAvatar] = useState<string>("");
  const [modelAvatar, setModelAvatar] = useState<string>("");

  const isUser = message.role === 'user';
  const isError = message.status === 'error';
  const isPending = message.status === 'pending';

  // 获取思考过程
  const reasoning = message.reasoning;
  const reasoningTime = message.reasoningTime;

  // 判断消息内容类型
  const isComplexContent = typeof message.content === 'object';

  // 提取图片引用的辅助函数
  const extractImageReferences = useCallback((content: string): {
    processedContent: string,
    extractedImages: ImageContent[]
  } => {
    const extractedImages: ImageContent[] = [];
    let match;
    const imageIds = new Set<string>();
    
    // 重置正则表达式
    IMAGE_REF_REGEX.lastIndex = 0;
    
    // 查找所有图片引用
    while ((match = IMAGE_REF_REGEX.exec(content)) !== null) {
      const imageId = match[1];
      
      // 避免重复添加
      if (!imageIds.has(imageId)) {
        imageIds.add(imageId);
        
        // 创建图片内容对象
        extractedImages.push({
          url: match[0], // 保留原始引用格式 [图片:ID]
          mimeType: 'image/jpeg' // 默认类型，会在ImageContent组件中通过元数据更新
        });
      }
    }
    
    return {
      processedContent: content, // 保留引用文本，由渲染器处理
      extractedImages
    };
  }, []);

  // 获取文本内容
  let textContent = '';
  let extractedImages: ImageContent[] = [];
  
  if (isComplexContent) {
    // 复杂内容类型
    textContent = (message.content as {text?: string}).text || '';
    
    // 提取文本中的图片引用
    if (textContent) {
      const extracted = extractImageReferences(textContent);
      textContent = extracted.processedContent;
      extractedImages = extracted.extractedImages;
    }
    
    // 获取现有图片内容
    const contentImages = (message.content as {images?: ImageContent[]}).images || [];
    extractedImages = [...extractedImages, ...contentImages];
  } else {
    // 字符串内容类型
    textContent = message.content as string;
    
    // 提取文本中的图片引用
    const extracted = extractImageReferences(textContent);
    textContent = extracted.processedContent;
    extractedImages = extracted.extractedImages;
  }

  // 从message.images获取新格式图片
  const directImages = message.images || [];

  // 处理新格式图片，将SiliconFlowImageFormat转换为ImageContent
  const convertedImages: ImageContent[] = directImages.map(img => ({
    url: img.image_url.url,
    mimeType: img.image_url.url.startsWith('data:')
      ? img.image_url.url.split(';')[0].split(':')[1]
      : 'image/jpeg'
  }));

  // 合并所有图片
  const allImages = [...extractedImages, ...convertedImages];

  // 仅在开发环境显示调试信息
  if (process.env.NODE_ENV === 'development') {
    console.log(`[MessageItem] 消息ID: ${message.id}, 提取图片引用: ${extractedImages.length}, 旧格式图片: ${(message.content as any)?.images?.length || 0}, 新格式图片: ${directImages.length}, 总图片: ${allImages.length}`);
  }

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

  // Token计数
  const tokenCount = estimateTokens(textContent);
  const tokenStr = `~${tokenCount} tokens`;

  // 获取模型信息
  const getAssistantName = () => {
    if (isUser) return "我";

    // 调试日志
    console.log(`[MessageItem] 获取助手名称: messageId=${message.id}, messageModelId=${message.modelId}, topicModelId=${currentTopic?.modelId}, defaultModelId=${defaultModelId}`);
    
    // 确定要使用的模型ID
    let modelId = message.modelId || currentTopic?.modelId || defaultModelId;
    
    // 查找对应的模型和提供商
    if (modelId && providers.length > 0) {
      // 遍历所有提供商
      for (const provider of providers) {
        // 查找该提供商下的匹配模型
        const model = provider.models.find(m => m.id === modelId);
        if (model) {
          // 找到匹配模型，返回提供商/模型格式
          return `${provider.name}/${model.name}`;
        }
      }
      
      // 如果没找到精确匹配，检查ID是否包含提供商信息
      if (modelId.includes('/')) {
        const [providerId, modelPart] = modelId.split('/');
        // 尝试查找对应的提供商
        const provider = providers.find(p => p.id === providerId);
        if (provider && modelPart) {
          return `${provider.name}/${modelPart}`;
        }
        return modelPart || modelId; // 至少返回模型部分
      }
    }
    
    // 如果所有尝试都失败，返回原始ID或默认名称
    return modelId || "AI助手";
  };

  // 预先计算模型名称以便在界面中使用
  const assistantName = !isUser ? getAssistantName() : "我";

  // 添加调试信息，输出当前使用的模型
  console.log(`[MessageItem] 当前消息使用的模型ID: ${message.modelId}, 显示名称: ${assistantName}, 模型数量: ${allModels.length}`);

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
          {isUser && !userAvatar ? "我" : (!modelAvatar && assistantName.charAt(0))}
        </Avatar>
        <Typography
          variant="body2"
          sx={{
            mx: 1,
            color: 'text.secondary',
            fontSize: '0.75rem',
          }}
        >
          {isUser ? '我' : assistantName}
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
        elevation={0}
        sx={{
          maxWidth: isUser ? '85%' : '95%',
          width: isUser ? 'auto' : '95%', // AI消息宽度固定为95%
          minWidth: isUser ? 'auto' : '150px',
          p: 1.5,
          borderRadius: isUser ? '20px 4px 20px 20px' : '4px 20px 20px 20px',
          bgcolor: isUser 
            ? (theme.palette.mode === 'dark' ? '#17882c' : '#a0e58f')  // 用户消息气泡颜色
            : (theme.palette.mode === 'dark' ? '#1a3b61' : '#e6f4ff'), // AI消息气泡颜色
          position: 'relative',
          color: isUser 
            ? (theme.palette.mode === 'dark' ? '#ffffff' : '#333333')  // 用户消息文字颜色
            : (theme.palette.mode === 'dark' ? '#ffffff' : '#333333'), // AI消息文字颜色
        }}
      >
        {/* 消息操作按钮 - 移到Paper内部，使其相对于气泡定位 */}
        {!isUser && !isPending && !isError && (
          <MessageActions 
            message={message}
            topicId={currentTopic?.id}
            onRegenerate={onRegenerate}
            onDelete={onDelete}
            onSwitchVersion={onSwitchVersion}
          />
        )}

        {/* 错误状态显示 */}
        {isError && (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'flex-start', 
            mb: 1, 
            color: theme.palette.error.main
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <ErrorOutlineIcon fontSize="small" sx={{ mr: 1 }} />
              <Typography variant="body2" color="error">
                请求处理失败
              </Typography>
            </Box>
            <Box sx={{ 
              ml: 4, 
              mt: 0.5, 
              display: 'flex', 
              alignItems: 'center',
              gap: 1
            }}>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {textContent || '连接超时或网络错误，请稍后再试'}
              </Typography>
              {onRegenerate && (
                <Box 
                  component="span" 
                  onClick={() => onRegenerate(message.id)}
                  sx={{ 
                    fontSize: '0.75rem',
                    color: theme.palette.primary.main,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    '&:hover': {
                      opacity: 0.8
                    }
                  }}
                >
                  重试
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* 加载状态显示 */}
        {isPending && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            mb: 1
          }}>
            <CircularProgress size={16} sx={{ mr: 1 }} />
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              生成中...
            </Typography>
          </Box>
        )}

        {/* 内容区 */}
        <Box 
          sx={{ 
            wordBreak: 'break-word',
            '& img': {
              maxWidth: '100%',
              borderRadius: '8px'
            },
            '& pre': {
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
              padding: '10px',
              borderRadius: '8px',
              overflowX: 'auto',
              fontSize: '0.85em',
            },
            '& code': {
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
              padding: '0.2em 0.4em',
              borderRadius: '4px',
              fontSize: '0.9em',
              fontFamily: 'SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace',
            }
          }}
        >
          <MarkdownRenderer content={textContent} />
        </Box>

        {/* 显示图片 */}
        {allImages.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {allImages.map((image, index) => (
                <ImageContentComponent
                  key={`img-${index}`}
                  image={image}
                  index={index}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* 智能助手消息的token信息显示在底部 */}
        {!isUser && !isPending && (
          <Typography 
            variant="caption" 
            sx={{ 
              display: 'block', 
              textAlign: 'right', 
              mt: 1,
              fontSize: '0.7rem',
              opacity: 0.6,
              color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)',
            }}
          >
            {tokenStr}
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default MessageItem;
