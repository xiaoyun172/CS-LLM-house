import React, { useEffect, useState } from 'react';
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

  // 获取文本内容
  const textContent = isComplexContent
    ? (message.content as {text?: string}).text || ''
    : message.content as string;

  // 获取图片内容 - 增加从message.images获取
  const contentImages = isComplexContent
    ? (message.content as {images?: ImageContent[]}).images || []
    : [];

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
  const allImages = [...contentImages, ...convertedImages];

  // 显示图片数量进行调试
  console.log(`[MessageItem] 消息ID: ${message.id}, 旧格式图片: ${contentImages.length}, 新格式图片: ${directImages.length}, 总图片: ${allImages.length}`);

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

  // 格式化模型名称，处理各种模型ID格式
  const formatModelName = (modelName: string, providerName?: string): string => {
    // 如果没有模型名称，返回默认名称
    if (!modelName) return "AI助手";

    // 处理包含随机ID的格式，如"75srv668hpo2vq7kpdvzgt/DeepSeek-V3"
    if (modelName.includes('/')) {
      // 直接使用斜杠后面的部分作为模型名称
      const parts = modelName.split('/');
      if (parts.length >= 2 && parts[1]) {
        // 如果有提供商名称，组合显示
        if (providerName) {
          return `${providerName}/${parts[1]}`;
        }
        // 否则只返回模型名称部分
        return parts[1];
      }
    }

    // 清理模型名和提供商名
    const cleanProvider = providerName?.split('/')[0] || '';
    const cleanModel = modelName.split('/').pop() || modelName;

    // 分解模型名称
    const modelParts = cleanModel.split('-');
    const providerParts = cleanProvider.split('-');
    const displayProvider = providerParts[0] || '';

    let displayModel = modelName;

    // 处理不同格式的模型名
    if (cleanModel.includes('-')) {
      // 保留模型的主要版本名，如"gemini-2.5"中只取"gemini"
      const mainModelName = modelParts[0];

      // 检查是否有重要标识符需要保留(如"pro", "turbo", "opus"等)
      const importantIdentifiers = ["pro", "turbo", "opus", "vision", "ultra"];
      const hasImportantIdentifier = modelParts.some(part =>
        importantIdentifiers.some(id => part.toLowerCase().includes(id))
      );

      if (hasImportantIdentifier) {
        // 找出所有重要标识符
        const importantParts = modelParts.filter(part =>
          importantIdentifiers.some(id => part.toLowerCase().includes(id))
        );

        // 对于长名称如"gemini-2.5-pro-preview-05-06"，转化为简洁形式
        if (modelParts.length > 3) {
          // 保留前两部分和重要标识符
          const versionPart = modelParts.length > 1 ? `-${modelParts[1]}` : '';
          displayModel = `${mainModelName}${versionPart}${importantParts.length > 0 ? '-' + importantParts[0] : ''}`;
        } else {
          // 对于较短名称，保持原样
          displayModel = cleanModel;
        }
      } else {
        // 如果没有重要标识符，只保留主要名称和版本
        displayModel = modelParts.length > 1 ? `${mainModelName}-${modelParts[1]}` : mainModelName;
      }
    }

    // 最终组合显示名称
    if (displayProvider && displayModel) {
      return `${displayProvider}/${displayModel}`;
    } else if (displayModel) {
      return displayModel;
    } else if (displayProvider) {
      return displayProvider;
    }

    return modelName;
  };

  // 获取模型信息
  const getAssistantName = () => {
    if (isUser) return "我";

    // 调试日志
    console.log(`[MessageItem] 获取助手名称: messageId=${message.id}, messageModelId=${message.modelId}, topicModelId=${currentTopic?.modelId}, defaultModelId=${defaultModelId}`);
    console.log(`[MessageItem] 可用模型数量: ${allModels.length}`);

    // 如果消息中有模型ID，则根据模型ID查找模型名称
    let modelName = "AI助手"; // 默认名称
    let modelId = message.modelId || currentTopic?.modelId || defaultModelId;

    // 检查modelId是否包含斜杠，如果是，可能是直接使用了完整ID
    if (modelId && modelId.includes('/')) {
      // 直接从ID中提取模型名称部分
      const parts = modelId.split('/');
      if (parts.length >= 2 && parts[1]) {
        // 尝试查找匹配的提供商
        const providerName = parts[0].split('-')[0]; // 提取提供商名称
        return formatModelName(modelId, providerName);
      }
    }

    if (modelId && allModels.length > 0) {
      // 查找完全匹配的模型
      let model = allModels.find(m => m.id === modelId);

      // 如果没找到完全匹配的，尝试查找部分匹配的模型
      if (!model) {
        // 先尝试查找ID包含在modelId中的模型
        for (const m of allModels) {
          if (modelId.includes(m.id)) {
            model = m;
            break;
          }
        }

        // 如果还没找到，尝试查找modelId包含在ID中的模型
        if (!model) {
          for (const m of allModels) {
            if (m.id.includes(modelId)) {
              model = m;
              break;
            }
          }
        }

        // 最后尝试查找名称匹配的模型
        if (!model) {
          for (const m of allModels) {
            if (modelId.includes(m.name) || m.name.includes(modelId)) {
              model = m;
              break;
            }
          }
        }
      }

      console.log(`[MessageItem] 查找模型结果:`, model ? `找到模型 ${model.name}/${model.provider}` : "未找到模型", "搜索的modelId:", modelId);

      if (model) {
        // 使用格式化函数处理模型名称
        modelName = formatModelName(model.name, model.provider);
      } else {
        // 如果没有找到模型，尝试直接格式化模型ID
        modelName = formatModelName(modelId);
      }
    }

    console.log(`[MessageItem] 最终显示名称: ${modelName}`);
    return modelName;
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

      <Paper
        elevation={0}
        sx={{
          maxWidth: '85%',
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
        {/* 错误状态显示 */}
        {isError && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            mb: 1, 
            color: theme.palette.error.main
          }}>
            <ErrorOutlineIcon fontSize="small" sx={{ mr: 1 }} />
            <Typography variant="body2" color="error">
              请求失败，请重试
            </Typography>
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

        {/* 思考过程，只对AI回复显示 */}
        {!isUser && reasoning && (
          <Box sx={{ mt: 1 }}>
            <ThinkingProcess 
              reasoning={reasoning} 
              reasoningTime={reasoningTime} 
            />
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

      {/* 消息操作按钮 */}
      {!isUser && !isPending && !isError && (
        <MessageActions 
          message={message}
          topicId={currentTopic?.id}
          onRegenerate={onRegenerate}
          onDelete={onDelete}
          onSwitchVersion={onSwitchVersion}
        />
      )}
    </Box>
  );
};

export default MessageItem;
