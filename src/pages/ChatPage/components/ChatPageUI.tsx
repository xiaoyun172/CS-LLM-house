import React from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import MessageList from '../../../components/message/MessageList';
import ChatInput from '../../../components/ChatInput';
import CompactChatInput from '../../../components/CompactChatInput';
import { Sidebar } from '../../../components/TopicManagement';
import ChatToolbar from '../../../components/ChatToolbar';
import SearchProgressIndicator from '../../../components/SearchProgressIndicator';
import { ModelSelector } from './ModelSelector';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../../shared/store';
import type { SiliconFlowImageFormat } from '../../../shared/types';
import { EventEmitter, EVENT_NAMES } from '../../../shared/services/EventService';
import { TopicService } from '../../../shared/services/TopicService';
import { newMessagesActions } from '../../../shared/store/slices/newMessagesSlice';
import type { SearchProgressStatus } from '../../../shared/services/WebSearchBackendService';

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
  handleModelMenuClick: () => void;
  handleModelMenuClose: () => void;
  menuOpen: boolean;
  handleClearTopic: () => void;
  handleDeleteMessage: (messageId: string) => void;
  handleRegenerateMessage: (messageId: string) => void;
  handleSwitchMessageVersion: (versionId: string) => void;
  handleResendMessage: (messageId: string) => void;
  webSearchActive: boolean;
  imageGenerationMode: boolean;
  toolsEnabled: boolean;
  mcpMode: 'prompt' | 'function';
  toggleWebSearch: () => void;
  toggleImageGenerationMode: () => void;
  toggleToolsEnabled: () => void;
  handleMCPModeChange: (mode: 'prompt' | 'function') => void;
  handleMessageSend: (content: string, images?: any[], toolsEnabled?: boolean, files?: any[]) => void;
  handleMultiModelSend?: (content: string, models: any[], images?: SiliconFlowImageFormat[], toolsEnabled?: boolean, files?: any[]) => void;
  handleStopResponseClick: () => void;
  smartSearchEnabled?: boolean;
  toggleSmartSearch?: () => void;
  showBothResults?: boolean;
  toggleShowBothResults?: () => void;
  searchProgress?: {
    visible: boolean;
    status: SearchProgressStatus;
    query?: string;
    error?: string;
  };
  handleSearchProgressClose?: () => void;
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
  handleResendMessage,
  webSearchActive,
  imageGenerationMode,
  toolsEnabled,
  mcpMode,
  toggleWebSearch,
  toggleImageGenerationMode,
  toggleToolsEnabled,
  handleMCPModeChange,
  handleMessageSend,
  handleMultiModelSend,
  handleStopResponseClick,
  smartSearchEnabled,
  toggleSmartSearch,
  showBothResults,
  toggleShowBothResults,
  searchProgress,
  handleSearchProgressClose
}) => {
  const dispatch = useDispatch();

  // 获取输入框布局样式设置
  const inputLayoutStyle = useSelector((state: RootState) =>
    (state.settings as any).inputLayoutStyle || 'default'
  );

  // 获取顶部工具栏设置
  const topToolbarSettings = useSelector((state: RootState) =>
    (state.settings as any).topToolbar || {
      showSettingsButton: true,
      showModelSelector: true,
      modelSelectorStyle: 'full',
      showChatTitle: true,
      showTopicName: false,
      showNewTopicButton: false,
      showClearButton: false,
      showMenuButton: true,
      leftComponents: ['menuButton', 'chatTitle', 'topicName', 'newTopicButton', 'clearButton'],
      rightComponents: ['modelSelector', 'settingsButton'],
    }
  );

  // 根据布局样式决定是否显示工具栏
  const shouldShowToolbar = inputLayoutStyle === 'default';

  // 创建新话题
  const handleCreateTopic = async () => {
    EventEmitter.emit(EVENT_NAMES.ADD_NEW_TOPIC);
    const newTopic = await TopicService.createNewTopic();
    if (newTopic) {
      dispatch(newMessagesActions.setCurrentTopicId(newTopic.id));
      setTimeout(() => {
        EventEmitter.emit(EVENT_NAMES.SHOW_TOPIC_SIDEBAR);
        setTimeout(() => {
          dispatch(newMessagesActions.setCurrentTopicId(newTopic.id));
        }, 50);
      }, 100);
    }
  };

  // 渲染顶部工具栏组件的函数
  const renderToolbarComponent = (componentId: string) => {
    switch (componentId) {
      case 'menuButton':
        return isMobile && topToolbarSettings.showMenuButton ? (
          <IconButton
            key={componentId}
            edge="start"
            color="inherit"
            onClick={() => setDrawerOpen(!drawerOpen)}
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>
        ) : null;

      case 'chatTitle':
        return topToolbarSettings.showChatTitle ? (
          <Typography key={componentId} variant="h6" noWrap component="div">
            对话
          </Typography>
        ) : null;

      case 'topicName':
        return topToolbarSettings.showTopicName && currentTopic ? (
          <Typography key={componentId} variant="body1" noWrap sx={{ color: 'text.secondary', ml: 1 }}>
            {currentTopic.name}
          </Typography>
        ) : null;

      case 'newTopicButton':
        return topToolbarSettings.showNewTopicButton ? (
          <IconButton
            key={componentId}
            color="inherit"
            onClick={handleCreateTopic}
            size="small"
            sx={{ ml: 1 }}
          >
            <AddIcon />
          </IconButton>
        ) : null;

      case 'clearButton':
        return topToolbarSettings.showClearButton && currentTopic ? (
          <IconButton
            key={componentId}
            color="inherit"
            onClick={handleClearTopic}
            size="small"
            sx={{ ml: 1 }}
          >
            <ClearAllIcon />
          </IconButton>
        ) : null;

      case 'modelSelector':
        return topToolbarSettings.showModelSelector ? (
          topToolbarSettings.modelSelectorStyle === 'icon' ? (
            <IconButton
              key={componentId}
              color="inherit"
              onClick={handleModelMenuClick}
              size="small"
            >
              <SmartToyIcon />
            </IconButton>
          ) : (
            <ModelSelector
              key={componentId}
              selectedModel={selectedModel}
              availableModels={availableModels}
              handleModelSelect={handleModelSelect}
              handleMenuClick={handleModelMenuClick}
              handleMenuClose={handleModelMenuClose}
              menuOpen={menuOpen}
            />
          )
        ) : null;

      case 'settingsButton':
        return topToolbarSettings.showSettingsButton ? (
          <IconButton key={componentId} color="inherit" onClick={() => navigate('/settings')}>
            <SettingsIcon />
          </IconButton>
        ) : null;

      default:
        return null;
    }
  };

  // 渲染输入框组件
  const renderInputComponent = () => {
    const commonProps = {
      onSendMessage: (content: string, images?: SiliconFlowImageFormat[], toolsEnabled?: boolean, files?: any[]) => {
        if (currentTopic) {
          handleMessageSend(content, images, toolsEnabled, files);
        } else {
          console.log('没有当前话题，无法发送消息');
        }
      },
      onSendMultiModelMessage: handleMultiModelSend ? (content: string, models: any[], images?: SiliconFlowImageFormat[], toolsEnabled?: boolean, files?: any[]) => {
        if (currentTopic) {
          handleMultiModelSend(content, models, images, toolsEnabled, files);
        } else {
          console.log('没有当前话题，无法发送多模型消息');
        }
      } : undefined,
      availableModels,
      isLoading,
      allowConsecutiveMessages: true,
      imageGenerationMode,
      onSendImagePrompt: (prompt: string) => handleMessageSend(prompt),
      webSearchActive,
      onStopResponse: handleStopResponseClick,
      isStreaming,
      toolsEnabled
    };

    if (inputLayoutStyle === 'compact') {
      return (
        <CompactChatInput
          {...commonProps}
          onClearTopic={handleClearTopic}
          toggleImageGenerationMode={toggleImageGenerationMode}
          toggleWebSearch={toggleWebSearch}
          toggleToolsEnabled={toggleToolsEnabled}
        />
      );
    } else {
      return <ChatInput {...commonProps} />;
    }
  };

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: { xs: 'column', sm: 'row' },
      height: '100vh',
      bgcolor: 'transparent'
    }}>
      {/* 桌面端固定显示侧边栏，移动端可隐藏 */}
      {!isMobile && (
        <Sidebar
          mcpMode={mcpMode}
          toolsEnabled={toolsEnabled}
          onMCPModeChange={handleMCPModeChange}
          onToolsToggle={toggleToolsEnabled}
        />
      )}

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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {topToolbarSettings.leftComponents?.map(renderToolbarComponent).filter(Boolean)}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {topToolbarSettings.rightComponents?.map(renderToolbarComponent).filter(Boolean)}
            </Box>
          </Toolbar>
        </AppBar>

        {/* 移动端侧边栏 */}
        {isMobile && (
          <Sidebar
            mobileOpen={drawerOpen}
            onMobileToggle={() => setDrawerOpen(!drawerOpen)}
            mcpMode={mcpMode}
            toolsEnabled={toolsEnabled}
            onMCPModeChange={handleMCPModeChange}
            onToolsToggle={toggleToolsEnabled}
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
                  width: '100%', // 确保容器占满可用宽度
                  maxWidth: '100%', // 确保不超出父容器
                  backgroundColor: 'transparent', // 确保背景透明
                  // 使用 margin-bottom 而不是 padding-bottom 来避免背景色问题
                  marginBottom: '80px', // 为输入框留出足够空间
                }}
              >
              <MessageList
                messages={currentMessages}
                onRegenerate={handleRegenerateMessage}
                onDelete={handleDeleteMessage}
                onSwitchVersion={handleSwitchMessageVersion}
                onResend={handleResendMessage}
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
                  justifyContent: 'center', // 居中对齐
                  alignItems: 'center' // 居中对齐
                }}
              >
                {/* 工具栏容器 - 仅在默认布局时显示 */}
                {shouldShowToolbar && (
                  <Box sx={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'center' }}>
                    <ChatToolbar
                      onClearTopic={handleClearTopic}
                      imageGenerationMode={imageGenerationMode}
                      toggleImageGenerationMode={toggleImageGenerationMode}
                      webSearchActive={webSearchActive}
                      toggleWebSearch={toggleWebSearch}
                      toolsEnabled={toolsEnabled}
                      onToolsEnabledChange={toggleToolsEnabled}
                      smartSearchEnabled={smartSearchEnabled}
                      toggleSmartSearch={toggleSmartSearch}
                      showBothResults={showBothResults}
                      toggleShowBothResults={toggleShowBothResults}
                    />
                  </Box>
                )}

                {/* 输入框容器 */}
                <Box sx={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'center' }}>
                  {renderInputComponent()}
                </Box>
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
                  backgroundColor: 'transparent', // 确保背景透明
                  // 使用 margin-bottom 而不是 padding-bottom 来避免背景色问题
                  marginBottom: '100px', // 为输入框留出足够空间
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
                  justifyContent: 'center', // 居中对齐
                  alignItems: 'center' // 居中对齐
                }}
              >
                {/* 工具栏容器 - 仅在默认布局时显示 */}
                {shouldShowToolbar && (
                  <Box sx={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'center' }}>
                    <ChatToolbar
                      onClearTopic={handleClearTopic}
                      imageGenerationMode={imageGenerationMode}
                      toggleImageGenerationMode={toggleImageGenerationMode}
                      webSearchActive={webSearchActive}
                      toggleWebSearch={toggleWebSearch}
                      toolsEnabled={toolsEnabled}
                      onToolsEnabledChange={toggleToolsEnabled}
                      smartSearchEnabled={smartSearchEnabled}
                      toggleSmartSearch={toggleSmartSearch}
                      showBothResults={showBothResults}
                      toggleShowBothResults={toggleShowBothResults}
                    />
                  </Box>
                )}

                {/* 输入框容器 */}
                <Box sx={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'center' }}>
                  {renderInputComponent()}
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Box>
      
      {/* 搜索进度指示器 */}
      {searchProgress && searchProgress.visible && (
        <SearchProgressIndicator 
          status={searchProgress.status}
          query={searchProgress.query}
          error={searchProgress.error}
          visible={searchProgress.visible}
          onClose={handleSearchProgressClose}
        />
      )}
    </Box>
  );
};