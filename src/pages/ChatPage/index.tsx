import React, { useState, useEffect } from 'react';
import { useMediaQuery, useTheme, Box, AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsIcon from '@mui/icons-material/Settings';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../shared/store';
import MessageList from '../../components/MessageList';
import ChatInput from '../../components/ChatInput';
import { Sidebar } from '../../components/TopicManagement';
import ChatToolbar from '../../components/ChatToolbar';
import { ModelSelector } from './components/ModelSelector';
import { useModelSelection } from './hooks/useModelSelection';
import { useTopicManagement } from './hooks/useTopicManagement';
import { useMessageHandling } from './hooks/useMessageHandling';
import type { SiliconFlowImageFormat } from '../../shared/types';
import { addMessage } from '../../shared/store/messagesSlice';
import { generateId, createMessage } from '../../shared/utils';

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [imageGenerationMode, setImageGenerationMode] = useState(false); // 控制是否处于图像生成模式

  // 从Redux获取状态
  const currentTopic = useSelector((state: RootState) => state.messages.currentTopic);
  const messagesByTopic = useSelector((state: RootState) => state.messages.messagesByTopic);
  const loadingByTopic = useSelector((state: RootState) => state.messages.loadingByTopic);
  const dispatch = useDispatch();

  // 使用自定义钩子
  const { selectedModel, availableModels, handleModelSelect, handleModelMenuClick, handleModelMenuClose, anchorEl, menuOpen } = useModelSelection();
  const { handleNewTopic, handleClearTopic } = useTopicManagement(currentTopic);
  const { handleSendMessage, handleDeleteMessage, handleRegenerateMessage, handleSwitchMessageVersion } = useMessageHandling(selectedModel, currentTopic);

  // 当屏幕尺寸变化时更新抽屉状态
  useEffect(() => {
    setDrawerOpen(!isMobile);
  }, [isMobile]);

  // 获取当前主题的消息
  const currentMessages = currentTopic
    ? messagesByTopic[currentTopic.id] || []
    : [];

  // 获取当前主题的加载状态
  const isLoading = currentTopic
    ? loadingByTopic[currentTopic.id] || false
    : false;
    
  // 处理消息版本切换
  const handleSwitchVersion = (messageId: string) => {
    if (currentTopic) {
      handleSwitchMessageVersion(currentTopic.id, messageId);
    }
  };

  // 切换图像生成模式
  const toggleImageGenerationMode = () => {
    setImageGenerationMode(!imageGenerationMode);
  };
  
  // 处理图像生成提示词
  const handleImagePrompt = (prompt: string) => {
    if (!currentTopic || !prompt.trim()) return;
    
    // 不调用handleSendMessage，而是直接添加用户消息到Redux
    // 创建用户消息
    const userMessage = createMessage({
      content: prompt,
      role: 'user',
      id: `user-${generateId()}`
    });
    
    // 直接添加用户消息到Redux
    dispatch(addMessage({ topicId: currentTopic.id, message: userMessage }));
    
    // 生成图像
    const generateImageWithPrompt = async () => {
      try {
        // 获取选中的模型
        const modelId = selectedModel?.id;
        if (!modelId) {
          throw new Error("未选择模型");
        }
        
        // 调用图像生成服务
        const imageGenerationService = await import('../../shared/services/APIService');
        const result = await imageGenerationService.generateImage(selectedModel, {
          prompt: prompt,
          negativePrompt: "",
          imageSize: "1024x1024",
          steps: 20,
          guidanceScale: 7.5
        });
        
        // 处理生成的图像
        if (result && result.url) {
          const imageUrl = result.url;
          // 创建图像格式
          const imageFormat: SiliconFlowImageFormat = {
            type: 'image_url',
            image_url: { url: imageUrl }
          };
          
          // 创建AI回复消息ID
          const requestId = generateId();
          
          // 创建AI助手的回复消息
          const assistantMessage = createMessage({
            content: "生成的图像:",
            role: 'assistant',
            status: 'complete',
            id: `assistant-${requestId}`,
            images: [imageFormat],
            modelId: selectedModel?.id
          });
          
          // 将消息添加到Redux
          dispatch(addMessage({ topicId: currentTopic.id, message: assistantMessage }));
        }
      } catch (error) {
        console.error("图像生成失败:", error);
        // 添加错误消息
        const errorMessage = createMessage({
          content: `图像生成失败: ${error instanceof Error ? error.message : String(error)}`,
          role: 'assistant',
          status: 'error',
          id: `error-${generateId()}`
        });
        dispatch(addMessage({ topicId: currentTopic.id, message: errorMessage }));
      } finally {
        // 关闭图像生成模式
        setImageGenerationMode(false);
      }
    };
    
    // 执行图像生成
    generateImageWithPrompt();
  };

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: { xs: 'column', sm: 'row' },
      height: '100vh',
      bgcolor: 'transparent'
    }}>
      {/* 桌面端固定显示侧边栏，移动端可隐藏 */}
      {!isMobile && <Sidebar />}

      {/* 主内容区域 */}
      <Box sx={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        bgcolor: 'transparent'
      }}>
        {/* 顶部应用栏 */}
        <AppBar
          position="static"
          elevation={0}
          className="status-bar-safe-area"
          sx={{
            bgcolor: 'white',
            color: 'black',
            borderBottom: '1px solid #eeeeee',
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {isMobile && (
                <IconButton
                  edge="start"
                  color="inherit"
                  onClick={() => setDrawerOpen(!drawerOpen)}
                  sx={{ mr: 1 }}
                >
                  <MenuIcon />
                </IconButton>
              )}
              <Typography variant="subtitle1" component="div" sx={{ fontWeight: 500 }}>
                对话
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {/* 模型选择组件 */}
              <ModelSelector 
                selectedModel={selectedModel}
                availableModels={availableModels}
                handleModelSelect={handleModelSelect}
                handleModelMenuClick={handleModelMenuClick}
                handleModelMenuClose={handleModelMenuClose}
                anchorEl={anchorEl}
                menuOpen={menuOpen}
              />

              <IconButton color="inherit" onClick={() => navigate('/settings')}>
                <SettingsIcon />
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>

        {/* 移动端侧边栏 */}
        {isMobile && (
          <Sidebar
            mobileOpen={drawerOpen}
            onMobileToggle={() => setDrawerOpen(!drawerOpen)}
          />
        )}

        {/* 聊天内容区域 */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 64px)', // 减去顶部导航栏高度
            width: '100%',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {currentTopic ? (
            <>
              {/* 消息列表应该有固定的可滚动区域，不会被输入框覆盖 */}
              <Box
                sx={{
                  flexGrow: 1,
                  overflow: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  paddingBottom: '80px', // 为输入框留出足够空间
                }}
              >
              <MessageList
                messages={currentMessages}
                onRegenerate={handleRegenerateMessage}
                onDelete={handleDeleteMessage}
                onSwitchVersion={handleSwitchVersion}
              />
              </Box>

              {/* 输入框容器，固定在底部 */}
              <Box
                sx={{
                  width: '100%',
                  position: 'fixed', 
                  bottom: 0,
                  left: 0,
                  right: 0,
                  zIndex: 2,
                  backgroundColor: 'transparent',
                  boxShadow: 'none',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0 // 移除元素间间距
                }}
              >
                {/* 工具栏 - 仅显示气泡按钮 */}
                <ChatToolbar
                  onNewTopic={handleNewTopic}
                  onClearTopic={handleClearTopic}
                  imageGenerationMode={imageGenerationMode}
                  toggleImageGenerationMode={toggleImageGenerationMode}
                />
                
                {/* 聊天输入框 */}
                <ChatInput
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                  allowConsecutiveMessages={true}
                  imageGenerationMode={imageGenerationMode}
                  onSendImagePrompt={handleImagePrompt}
                />
              </Box>
            </>
          ) : (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                p: 3,
                textAlign: 'center',
                bgcolor: 'transparent',
              }}
            >
              <Typography
                variant="h6"
                gutterBottom
                sx={{
                  fontWeight: 400,
                  color: '#000000',
                  mb: 1,
                }}
              >
                新的对话开始了，请输入您的问题
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ChatPage; 