import React from 'react';
import { Paper, Typography, Box, Avatar, CircularProgress } from '@mui/material';
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
  const currentTopic = useSelector((state: RootState) => state.messages.currentTopic);
  const models = useSelector((state: RootState) => state.settings.models);
  const defaultModelId = useSelector((state: RootState) => state.settings.defaultModelId);
  // 从providers获取所有模型
  const providers = useSelector((state: RootState) => state.settings.providers);
  const providerModels = providers.flatMap(provider => provider.models);
  const allModels = [...(models || []), ...providerModels];
  
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
  
  // Token计数
  const tokenCount = estimateTokens(textContent);
  const tokenStr = `~${tokenCount} tokens`;

  // 格式化模型名称，处理各种模型ID格式
  const formatModelName = (modelName: string, providerName?: string): string => {
    // 如果没有模型名称，返回默认名称
    if (!modelName) return "AI助手";
    
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
    
    if (modelId && allModels.length > 0) {
      // 查找完全匹配的模型
      let model = allModels.find(m => m.id === modelId);
      
      // 如果没找到完全匹配的，尝试查找部分匹配的模型
      if (!model) {
        for (const m of allModels) {
          if (modelId.includes(m.id) || m.id.includes(modelId)) {
            model = m;
            break;
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
          src={isUser ? "" : "/assets/ai-avatar.png"}
          sx={{ 
            width: 36, 
            height: 36, 
            bgcolor: isUser ? '#87d068' : '#1677ff',
          }}
        >
          {isUser ? "我" : "AI"}
        </Avatar>
        
        <Typography 
          variant="body2" 
          sx={{ 
            mx: 1, 
            fontSize: '0.8rem', 
            color: 'text.secondary' 
          }}
        >
          {assistantName}
        </Typography>
      </Box>
      
      <Box sx={{ 
        width: 'auto', 
        maxWidth: '95%', 
        display: 'flex', 
        flexDirection: 'column',
        alignSelf: isUser ? 'flex-end' : 'flex-start',
      }}>
        {/* 思考过程组件 */}
        {!isUser && reasoning && <ThinkingProcess reasoning={reasoning} reasoningTime={reasoningTime} />}
        
        <Box sx={{ position: 'relative' }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              backgroundColor: isUser ? '#95ec69' : '#ffffff', // 微信风格的绿色用户气泡和白色AI气泡
              color: '#000000', // 黑色文字
              boxShadow: isError ? '0 1px 2px rgba(255, 0, 0, 0.1)' : '0 1px 2px rgba(0, 0, 0, 0.1)',
              border: isUser ? 'none' : '1px solid #f0f0f0',
              position: 'relative',
              pr: 4, // 为操作按钮留出空间
              mt: message.alternateVersions?.length ? 2.5 : 0, // 调整空间大小，确保版本标签显示完整
              minWidth: '60px', // 最小宽度更小，适应短消息
              display: 'inline-block', // 使气泡宽度适应内容
              maxWidth: '100%', // 防止超出容器边界
            }}
          >
            {isError && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ErrorOutlineIcon color="error" fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="caption" color="error" fontWeight="medium">
                  发生错误
                </Typography>
              </Box>
            )}
            
            {isPending ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <>
                {/* 图片内容 */}
                {allImages.length > 0 && (
                  <Box sx={{ mb: textContent ? 2 : 0 }}>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: 1,
                        maxWidth: '100%'
                      }}
                    >
                      {allImages.map((image: ImageContent, index: number) => (
                        <ImageContentComponent 
                          key={`img-${index}`}
                          image={image}
                          index={index}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
                
                {/* 文本内容 - 使用独立的MarkdownRenderer组件 */}
                <Box sx={{ wordBreak: 'break-word' }}>
                  {textContent && (
                    <MarkdownRenderer content={textContent} />
                  )}
                </Box>
              </>
            )}
            
            {/* 显示Token计数 - 始终显示，不受设置控制 */}
            {!isPending && textContent && (
              <Box 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'flex-end', 
                  mt: 1,
                  opacity: 0.5,
                  fontSize: '0.7rem'
                }}
              >
                <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                  {tokenStr}
                </Typography>
              </Box>
            )}
            
            {/* 添加消息操作组件 */}
            <MessageActions 
              message={message} 
              topicId={currentTopic?.id}
              onRegenerate={onRegenerate}
              onDelete={onDelete}
              onSwitchVersion={onSwitchVersion}
            />
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default MessageItem;
