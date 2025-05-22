import React from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsIcon from '@mui/icons-material/Settings';
import MessageList from '../../../components/message/MessageList';
import ChatInput from '../../../components/ChatInput';
import { Sidebar } from '../../../components/TopicManagement';
import ChatToolbar from '../../../components/ChatToolbar';
import { ModelSelector } from './ModelSelector';
import type { SiliconFlowImageFormat } from '../../../shared/types';

// 所有从父组件传入的props类型
interface ChatPageUIProps {
  currentTopic: any;
  currentMessages: any[];
  isStreaming: boolean;
  isLoading: boolean;
  isMobile: boolean;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  navigate: (path: string) => void;
  selectedModel: any;
  availableModels: any[];
  handleModelSelect: (model: any) => void;
  handleModelMenuClick: (event: React.MouseEvent<HTMLElement>) => void;
  handleModelMenuClose: () => void;
  menuOpen: boolean;
  handleClearTopic: () => void;
  handleDeleteMessage: (messageId: string) => void;
  handleRegenerateMessage: (messageId: string) => void;
  handleSwitchMessageVersion: (versionId: string) => void;
  webSearchActive: boolean;
  imageGenerationMode: boolean;
  toolsEnabled: boolean;
  toggleWebSearch: () => void;
  toggleImageGenerationMode: () => void;
  toggleToolsEnabled: () => void;
  handleMessageSend: (content: string, images?: SiliconFlowImageFormat[]) => void;
  handleUrlScraping: (url: string) => Promise<string>;
  handleStopResponseClick: () => void;
}

export const ChatPageUI: React.FC<ChatPageUIProps> = ({
  currentTopic,
  currentMessages,
  isStreaming,
  isLoading,
  isMobile,
  drawerOpen,
  setDrawerOpen,
  navigate,
  selectedModel,
  availableModels,
  handleModelSelect,
  handleModelMenuClick,
  handleModelMenuClose,
  menuOpen,
  handleClearTopic,
  handleDeleteMessage,
  handleRegenerateMessage,
  handleSwitchMessageVersion,
  webSearchActive,
  imageGenerationMode,
  toolsEnabled,
  toggleWebSearch,
  toggleImageGenerationMode,
  toggleToolsEnabled,
  handleMessageSend,
  handleUrlScraping,
  handleStopResponseClick
}) => {
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
              <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
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
                  paddingBottom: '100px', // 为输入框留出足够空间
                  width: '100%', // 确保容器占满可用宽度
                  maxWidth: '100%', // 确保不超出父容器
                }}
              >
              <MessageList
                messages={currentMessages}
                onRegenerate={handleRegenerateMessage}
                onDelete={handleDeleteMessage}
                onSwitchVersion={handleSwitchMessageVersion}
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
                  gap: 0, // 移除元素间间距
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    margin: '0 auto',
                    width: '100%',
                    maxWidth: '800px', // 设置最大宽度
                    pointerEvents: 'none'
                  }
                }}
              >
                {/* 工具栏 - 仅显示气泡按钮 */}
                <ChatToolbar
                  onClearTopic={handleClearTopic}
                  imageGenerationMode={imageGenerationMode}
                  toggleImageGenerationMode={toggleImageGenerationMode}
                  webSearchActive={webSearchActive}
                  toggleWebSearch={toggleWebSearch}
                  toolsEnabled={toolsEnabled}
                  onToolsEnabledChange={toggleToolsEnabled}
                />

                {/* 聊天输入框 */}
                <ChatInput
                  onSendMessage={(content, images) => {
                    // 只有在有当前话题时才发送消息
                    if (currentTopic) {
                      handleMessageSend(content, images);
                    } else {
                      console.log('没有当前话题，无法发送消息');
                    }
                  }}
                  isLoading={isLoading}
                  allowConsecutiveMessages={true}
                  imageGenerationMode={imageGenerationMode}
                  onSendImagePrompt={(prompt) => handleMessageSend(prompt)}
                  webSearchActive={webSearchActive}
                  onDetectUrl={handleUrlScraping}
                  onStopResponse={handleStopResponseClick}
                  isStreaming={isStreaming}
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
                  paddingBottom: '100px', // 为输入框留出足够空间
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
                    对话开始了，请输入您的问题
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
                  gap: 0, // 移除元素间间距
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    margin: '0 auto',
                    width: '100%',
                    maxWidth: '800px', // 设置最大宽度
                    pointerEvents: 'none'
                  }
                }}
              >
                {/* 工具栏 */}
                <ChatToolbar
                  onClearTopic={handleClearTopic}
                  imageGenerationMode={imageGenerationMode}
                  toggleImageGenerationMode={toggleImageGenerationMode}
                  webSearchActive={webSearchActive}
                  toggleWebSearch={toggleWebSearch}
                  toolsEnabled={toolsEnabled}
                  onToolsEnabledChange={toggleToolsEnabled}
                />

                {/* 聊天输入框 */}
                <ChatInput
                  onSendMessage={(content, images) => {
                    // 只有在有当前话题时才发送消息
                    if (currentTopic) {
                      handleMessageSend(content, images);
                    } else {
                      console.log('没有当前话题，无法发送消息');
                    }
                  }}
                  isLoading={isLoading}
                  allowConsecutiveMessages={true}
                  imageGenerationMode={imageGenerationMode}
                  onSendImagePrompt={(prompt) => handleMessageSend(prompt)}
                  webSearchActive={webSearchActive}
                  onDetectUrl={handleUrlScraping}
                  onStopResponse={handleStopResponseClick}
                  isStreaming={isStreaming}
                />
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};