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
import { addMessage, updateMessage } from '../../shared/store/messagesSlice';
import { generateId, createMessage } from '../../shared/utils';
import WebSearchService from '../../shared/services/WebSearchService';
import FirecrawlService from '../../shared/services/FirecrawlService';

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [webSearchActive, setWebSearchActive] = useState(false); // 控制是否处于网络搜索模式
  const [imageGenerationMode, setImageGenerationMode] = useState(false); // 控制是否处于图像生成模式

  // 从Redux获取状态
  const currentTopic = useSelector((state: RootState) => state.messages.currentTopic);
  const messagesByTopic = useSelector((state: RootState) => state.messages.messagesByTopic);
  const loadingByTopic = useSelector((state: RootState) => state.messages.loadingByTopic);
  const dispatch = useDispatch();

  // 使用自定义钩子
  const { selectedModel, availableModels, handleModelSelect, handleModelMenuClick, handleModelMenuClose, menuOpen } = useModelSelection();
  const { handleClearTopic } = useTopicManagement(currentTopic);
  const { handleSendMessage, handleDeleteMessage, handleRegenerateMessage, handleSwitchMessageVersion } = useMessageHandling(selectedModel, currentTopic);

  // 当屏幕尺寸变化时更新抽屉状态
  useEffect(() => {
    setDrawerOpen(!isMobile);
  }, [isMobile]);

  // 监听自定义事件
  useEffect(() => {
    console.log('ChatPage: 设置事件监听器');

    const handleTopicCreated = (event: CustomEvent) => {
      console.log('ChatPage: 接收到topicCreated事件', event.detail);
      // 强制刷新当前状态
      dispatch({ type: 'FORCE_TOPICS_UPDATE' });
    };

    const handleTopicCleared = (event: CustomEvent) => {
      console.log('ChatPage: 接收到topicCleared事件', event.detail);
      // 强制刷新当前状态
      dispatch({ type: 'FORCE_MESSAGES_UPDATE' });
    };

    // 添加事件监听
    window.addEventListener('topicCreated', handleTopicCreated as EventListener);
    window.addEventListener('topicCleared', handleTopicCleared as EventListener);

    // 清理事件监听
    return () => {
      window.removeEventListener('topicCreated', handleTopicCreated as EventListener);
      window.removeEventListener('topicCleared', handleTopicCleared as EventListener);
    };
  }, [dispatch]);

  // 移除了自动创建话题的逻辑
  // 当没有当前话题时，不再自动创建新话题

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
    // 如果启用图像生成模式，关闭网络搜索模式
    if (!imageGenerationMode && webSearchActive) {
      setWebSearchActive(false);
    }
  };

  // 切换网络搜索模式
  const toggleWebSearch = () => {
    setWebSearchActive(!webSearchActive);
    // 如果启用网络搜索模式，关闭图像生成模式
    if (!webSearchActive && imageGenerationMode) {
      setImageGenerationMode(false);
    }
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

          // 新增: 将URL图片转换为Base64数据
          try {
            // 获取图片数据并转换为Base64
            const response = await fetch(imageUrl);
            const blob = await response.blob();

            // 将Blob转换为Base64
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
              const base64data = reader.result as string;

              // 创建图像格式
              const imageFormat: SiliconFlowImageFormat = {
                type: 'image_url',
                image_url: {
                  url: base64data  // 使用Base64数据替代URL
                }
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
            };
          } catch (error) {
            console.error("图像转换失败:", error);
            // 如果转换失败，使用原始URL
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

  // 处理网络搜索请求
  const handleWebSearch = async (query: string) => {
    if (!currentTopic || !query.trim()) return;

    // 创建用户消息
    const userMessage = createMessage({
      content: query,
      role: 'user',
      id: `user-${generateId()}`
    });

    // 添加用户消息到Redux
    dispatch(addMessage({ topicId: currentTopic.id, message: userMessage }));

    try {
      // 设置临时的搜索中消息
      const searchingMessage = createMessage({
        content: "正在搜索网络，请稍候...",
        role: 'assistant',
        status: 'pending',
        id: `search-${generateId()}`
      });

      dispatch(addMessage({ topicId: currentTopic.id, message: searchingMessage }));

      // 调用网络搜索服务
      const searchResults = await WebSearchService.search(query);

      // 准备搜索结果内容
      let resultsContent = `### 网络搜索结果\n\n`;

      if (searchResults.length === 0) {
        resultsContent += "没有找到相关结果。";
      } else {
        searchResults.forEach((result, index) => {
          resultsContent += `**${index + 1}. [${result.title}](${result.url})**\n`;
          resultsContent += `${result.snippet}\n\n`;
        });
      }

      // 更新搜索消息为完成状态，显示搜索结果
      dispatch(updateMessage({
        topicId: currentTopic.id,
        messageId: searchingMessage.id,
        updates: {
          content: resultsContent,
          status: 'complete',
          webSearchResults: searchResults
        }
      }));

      // 关闭网络搜索模式
      setWebSearchActive(false);

    } catch (error) {
      console.error("网络搜索失败:", error);
      // 添加错误消息
      const errorMessage = createMessage({
        content: `网络搜索失败: ${error instanceof Error ? error.message : String(error)}`,
        role: 'assistant',
        status: 'error',
        id: `error-${generateId()}`
      });
      dispatch(addMessage({ topicId: currentTopic.id, message: errorMessage }));

      // 关闭网络搜索模式
      setWebSearchActive(false);
    }
  };

  // 处理URL解析，使用FirecrawlService来抓取内容
  const handleUrlScraping = async (url: string): Promise<string> => {
    try {
      // 使用新的scrapeUrlWithOptions方法，请求多种格式
      const result = await FirecrawlService.scrapeUrlWithOptions(url, {
        formats: ['markdown', 'html'],
        onlyMainContent: true
      });

      // 检查抓取是否成功
      if (!result.success) {
        throw new Error(result.error || '网页解析失败');
      }

      // 优先使用markdown格式，如果没有则使用html或文本
      let content = '';
      if (result.markdown) {
        content = result.markdown;
      } else if (result.html) {
        content = `<div class="web-content">${result.html}</div>`;
      } else if (result.rawText) {
        content = result.rawText;
      } else {
        throw new Error('无法获取网页内容');
      }

      // 格式化返回的内容，添加来源信息
      const formattedContent = `### 网页内容: ${url}\n\n${content}`;

      return formattedContent;
    } catch (error) {
      console.error('URL解析失败:', error);
      throw error;
    }
  };

  // 处理消息发送
  const handleMessageSend = async (content: string, images?: SiliconFlowImageFormat[]) => {
    // 如果处于图像生成模式，则调用图像生成处理函数
    if (imageGenerationMode) {
      handleImagePrompt(content);
      return;
    }

    // 如果处于网络搜索模式，则调用网络搜索处理函数
    if (webSearchActive) {
      handleWebSearch(content);
      return;
    }

    // 正常的消息发送处理
    handleSendMessage(content, images);
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
            bgcolor: 'background.paper',
            color: 'text.primary',
            borderBottom: '1px solid',
            borderColor: 'divider',
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
                handleMenuClick={handleModelMenuClick}
                handleMenuClose={handleModelMenuClose}
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
                  onClearTopic={handleClearTopic}
                  imageGenerationMode={imageGenerationMode}
                  toggleImageGenerationMode={toggleImageGenerationMode}
                  webSearchActive={webSearchActive}
                  toggleWebSearch={toggleWebSearch}
                />

                {/* 聊天输入框 */}
                <ChatInput
                  onSendMessage={(content, images) => {
                    // 移除自动创建话题的逻辑，只有在有当前话题时才发送消息
                    if (currentTopic) {
                      handleMessageSend(content, images);
                    } else {
                      console.log('没有当前话题，无法发送消息');
                      // 可以在这里添加提示用户先创建话题的逻辑
                    }
                  }}
                  isLoading={isLoading}
                  allowConsecutiveMessages={true}
                  imageGenerationMode={imageGenerationMode}
                  onSendImagePrompt={handleImagePrompt}
                  webSearchActive={webSearchActive}
                  onDetectUrl={handleUrlScraping}
                />
              </Box>
            </>
          ) : (
            <>
              <Box
                sx={{
                  flexGrow: 1,
                  overflow: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  paddingBottom: '80px', // 为输入框留出足够空间
                }}
              >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                    height: '80%',
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
              </Box>

              {/* 即使没有当前话题，也显示输入框 */}
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
                {/* 工具栏 */}
                <ChatToolbar
                  onClearTopic={handleClearTopic}
                  imageGenerationMode={imageGenerationMode}
                  toggleImageGenerationMode={toggleImageGenerationMode}
                  webSearchActive={webSearchActive}
                  toggleWebSearch={toggleWebSearch}
                />

                {/* 聊天输入框 */}
                <ChatInput
                  onSendMessage={(content, images) => {
                    // 移除自动创建话题的逻辑，只有在有当前话题时才发送消息
                    if (currentTopic) {
                      handleMessageSend(content, images);
                    } else {
                      console.log('没有当前话题，无法发送消息');
                      // 可以在这里添加提示用户先创建话题的逻辑
                    }
                  }}
                  isLoading={isLoading}
                  allowConsecutiveMessages={true}
                  imageGenerationMode={imageGenerationMode}
                  onSendImagePrompt={handleImagePrompt}
                  webSearchActive={webSearchActive}
                  onDetectUrl={handleUrlScraping}
                />
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ChatPage;