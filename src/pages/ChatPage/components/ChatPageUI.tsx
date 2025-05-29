import React, { useMemo, useCallback } from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import ClearAllIcon from '@mui/icons-material/ClearAll';

import MessageList from '../../../components/message/MessageList';
import ChatInput from '../../../components/ChatInput';
import CompactChatInput from '../../../components/CompactChatInput';
import { Sidebar } from '../../../components/TopicManagement';
import ChatToolbar from '../../../components/ChatToolbar';
import { ModelSelector } from './ModelSelector';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../../shared/store';
import type { SiliconFlowImageFormat } from '../../../shared/types';
import { EventEmitter, EVENT_NAMES } from '../../../shared/services/EventService';
import { TopicService } from '../../../shared/services/TopicService';
import { newMessagesActions } from '../../../shared/store/slices/newMessagesSlice';

// 样式常量 - 提取重复的样式对象以提升性能
const STYLES = {
  mainContainer: {
    display: 'flex',
    flexDirection: { xs: 'column', sm: 'row' },
    height: '100vh',
    bgcolor: 'transparent'
  },
  contentContainer: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
    bgcolor: 'transparent'
  },
  appBar: {
    bgcolor: 'background.paper',
    color: 'text.primary',
    borderBottom: '1px solid',
    borderColor: 'divider',
  },
  toolbar: {
    position: 'relative',
    minHeight: '56px !important'
  },
  chatArea: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 64px)',
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  messageContainer: {
    flexGrow: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    maxWidth: '100%',
    backgroundColor: 'transparent',
    marginBottom: '80px',
  },
  inputContainer: {
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
    gap: 0,
    justifyContent: 'center',
    alignItems: 'center'
  },
  toolbarContainer: {
    width: '100%',
    maxWidth: '800px',
    display: 'flex',
    justifyContent: 'center'
  },
  inputWrapper: {
    width: '100%',
    maxWidth: '800px',
    display: 'flex',
    justifyContent: 'center'
  },
  welcomeContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '80%',
    p: 3,
    textAlign: 'center',
    bgcolor: 'transparent',
  },
  welcomeText: {
    fontWeight: 400,
    color: '#000000',
    mb: 1,
  }
} as const;

// 默认设置常量 - 避免每次渲染时创建新对象
const DEFAULT_TOP_TOOLBAR_SETTINGS = {
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
  componentPositions: [],
} as const;

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
  isDebating?: boolean;
  handleStartDebate?: (question: string, config: any) => void;
  handleStopDebate?: () => void;
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
  isDebating,
  handleStartDebate,
  handleStopDebate
}) => {
  const dispatch = useDispatch();

  // 优化 selector - 使用 useMemo 避免每次渲染时创建默认对象
  const inputLayoutStyle = useSelector((state: RootState) =>
    (state.settings as any).inputLayoutStyle
  ) || 'default';

  const topToolbarSettings = useSelector((state: RootState) =>
    (state.settings as any).topToolbar
  );

  // 使用 useMemo 优化默认设置的合并
  const mergedTopToolbarSettings = useMemo(() => ({
    ...DEFAULT_TOP_TOOLBAR_SETTINGS,
    ...topToolbarSettings
  }), [topToolbarSettings]);

  // 根据布局样式决定是否显示工具栏
  const shouldShowToolbar = useMemo(() =>
    inputLayoutStyle === 'default',
    [inputLayoutStyle]
  );

  // 优化创建新话题函数 - 使用 useCallback 避免不必要的重新渲染
  const handleCreateTopic = useCallback(async () => {
    // 触发新建话题事件
    EventEmitter.emit(EVENT_NAMES.ADD_NEW_TOPIC);
    console.log('[ChatPageUI] Emitted ADD_NEW_TOPIC event.');

    // 创建新话题
    const newTopic = await TopicService.createNewTopic();

    // 如果成功创建话题，自动跳转到新话题
    if (newTopic) {
      console.log('[ChatPageUI] 成功创建新话题，自动跳转:', newTopic.id);

      // 设置当前话题 - 立即选择新创建的话题
      dispatch(newMessagesActions.setCurrentTopicId(newTopic.id));

      // 确保话题侧边栏显示并选中新话题
      setTimeout(() => {
        EventEmitter.emit(EVENT_NAMES.SHOW_TOPIC_SIDEBAR);

        // 再次确保新话题被选中，防止其他逻辑覆盖
        setTimeout(() => {
          dispatch(newMessagesActions.setCurrentTopicId(newTopic.id));
        }, 50);
      }, 100);
    }
  }, [dispatch]);

  // 优化渲染顶部工具栏组件的函数 - 使用 useCallback 避免不必要的重新渲染
  const renderToolbarComponent = useCallback((componentId: string) => {
    switch (componentId) {
      case 'menuButton':
        return isMobile && mergedTopToolbarSettings.showMenuButton ? (
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
        return mergedTopToolbarSettings.showChatTitle ? (
          <Typography key={componentId} variant="h6" noWrap component="div">
            对话
          </Typography>
        ) : null;

      case 'topicName':
        return mergedTopToolbarSettings.showTopicName && currentTopic ? (
          <Typography key={componentId} variant="body1" noWrap sx={{ color: 'text.secondary', ml: 1 }}>
            {currentTopic.name}
          </Typography>
        ) : null;

      case 'newTopicButton':
        return mergedTopToolbarSettings.showNewTopicButton ? (
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
        return mergedTopToolbarSettings.showClearButton && currentTopic ? (
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
        return mergedTopToolbarSettings.showModelSelector ? (
          <ModelSelector
            key={componentId}
            selectedModel={selectedModel}
            availableModels={availableModels}
            handleModelSelect={handleModelSelect}
            handleMenuClick={handleModelMenuClick}
            handleMenuClose={handleModelMenuClose}
            menuOpen={menuOpen}
            // 传递图标模式标志
            iconMode={mergedTopToolbarSettings.modelSelectorStyle === 'icon'}
          />
        ) : null;

      case 'settingsButton':
        return mergedTopToolbarSettings.showSettingsButton ? (
          <IconButton key={componentId} color="inherit" onClick={() => navigate('/settings')}>
            <SettingsIcon />
          </IconButton>
        ) : null;

      default:
        return null;
    }
  }, [
    isMobile,
    mergedTopToolbarSettings,
    setDrawerOpen,
    drawerOpen,
    currentTopic,
    handleCreateTopic,
    handleClearTopic,
    selectedModel,
    availableModels,
    handleModelSelect,
    handleModelMenuClick,
    handleModelMenuClose,
    menuOpen,
    navigate
  ]);

  // 优化消息发送回调函数 - 使用 useCallback 避免不必要的重新渲染
  const handleSendMessage = useCallback((content: string, images?: SiliconFlowImageFormat[], toolsEnabled?: boolean, files?: any[]) => {
    if (currentTopic) {
      handleMessageSend(content, images, toolsEnabled, files);
    } else {
      console.log('没有当前话题，无法发送消息');
    }
  }, [currentTopic, handleMessageSend]);

  const handleSendMultiModelMessage = useCallback((content: string, models: any[], images?: SiliconFlowImageFormat[], toolsEnabled?: boolean, files?: any[]) => {
    if (currentTopic) {
      handleMultiModelSend?.(content, models, images, toolsEnabled, files);
    } else {
      console.log('没有当前话题，无法发送多模型消息');
    }
  }, [currentTopic, handleMultiModelSend]);

  const handleSendImagePrompt = useCallback((prompt: string) => {
    handleMessageSend(prompt);
  }, [handleMessageSend]);

  // 优化 commonProps - 使用 useMemo 避免每次渲染时创建新对象
  const commonProps = useMemo(() => ({
    onSendMessage: handleSendMessage,
    onSendMultiModelMessage: handleMultiModelSend ? handleSendMultiModelMessage : undefined,
    availableModels,
    isLoading,
    allowConsecutiveMessages: true,
    imageGenerationMode,
    onSendImagePrompt: handleSendImagePrompt,
    webSearchActive,
    onStopResponse: handleStopResponseClick,
    isStreaming,
    isDebating,
    onStartDebate: handleStartDebate,
    onStopDebate: handleStopDebate,
    toolsEnabled
  }), [
    handleSendMessage,
    handleMultiModelSend,
    handleSendMultiModelMessage,
    availableModels,
    isLoading,
    imageGenerationMode,
    handleSendImagePrompt,
    webSearchActive,
    handleStopResponseClick,
    isStreaming,
    isDebating,
    handleStartDebate,
    handleStopDebate,
    toolsEnabled
  ]);

  // 优化渲染输入框组件函数 - 使用 useCallback
  const renderInputComponent = useCallback(() => {
    if (inputLayoutStyle === 'compact') {
      return (
        <CompactChatInput
          {...commonProps}
          onClearTopic={handleClearTopic}
          onNewTopic={handleCreateTopic}
          toggleImageGenerationMode={toggleImageGenerationMode}
          toggleWebSearch={toggleWebSearch}
          toggleToolsEnabled={toggleToolsEnabled}
        />
      );
    } else {
      return <ChatInput {...commonProps} />;
    }
  }, [
    inputLayoutStyle,
    commonProps,
    handleClearTopic,
    handleCreateTopic,
    toggleImageGenerationMode,
    toggleWebSearch,
    toggleToolsEnabled
  ]);

  return (
    <Box sx={STYLES.mainContainer}>
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
      <Box sx={STYLES.contentContainer}>
        {/* 顶部应用栏 */}
        <AppBar
          position="static"
          elevation={0}
          className="status-bar-safe-area"
          sx={STYLES.appBar}
        >
          <Toolbar sx={{
            ...STYLES.toolbar,
            justifyContent: mergedTopToolbarSettings.componentPositions?.length > 0 ? 'center' : 'space-between',
          }}>
            {/* 如果有DIY布局，使用绝对定位渲染组件 */}
            {mergedTopToolbarSettings.componentPositions?.length > 0 ? (
              <>
                {mergedTopToolbarSettings.componentPositions.map((position: any) => {
                  const component = renderToolbarComponent(position.id);
                  if (!component) return null;

                  return (
                    <Box
                      key={position.id}
                      sx={{
                        position: 'absolute',
                        left: `${position.x}%`,
                        top: `${position.y}%`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 10
                      }}
                    >
                      {component}
                    </Box>
                  );
                })}
              </>
            ) : (
              /* 传统左右布局 */
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {mergedTopToolbarSettings.leftComponents?.map(renderToolbarComponent).filter(Boolean)}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {mergedTopToolbarSettings.rightComponents?.map(renderToolbarComponent).filter(Boolean)}
                </Box>
              </>
            )}
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
        <Box sx={STYLES.chatArea}>
          {currentTopic ? (
            <>
              {/* 消息列表应该有固定的可滚动区域，不会被输入框覆盖 */}
              <Box sx={STYLES.messageContainer}>
                <MessageList
                  messages={currentMessages}
                  onRegenerate={handleRegenerateMessage}
                  onDelete={handleDeleteMessage}
                  onSwitchVersion={handleSwitchMessageVersion}
                  onResend={handleResendMessage}
                />
              </Box>

              {/* 输入框容器，固定在底部 */}
              <Box sx={STYLES.inputContainer}>
                {/* 工具栏容器 - 仅在默认布局时显示 */}
                {shouldShowToolbar && (
                  <Box sx={STYLES.toolbarContainer}>
                    <ChatToolbar
                      onClearTopic={handleClearTopic}
                      imageGenerationMode={imageGenerationMode}
                      toggleImageGenerationMode={toggleImageGenerationMode}
                      webSearchActive={webSearchActive}
                      toggleWebSearch={toggleWebSearch}
                      toolsEnabled={toolsEnabled}
                      onToolsEnabledChange={toggleToolsEnabled}
                    />
                  </Box>
                )}

                {/* 输入框容器 */}
                <Box sx={STYLES.inputWrapper}>
                  {renderInputComponent()}
                </Box>
              </Box>
            </>
          ) : (
            <>
              <Box
                sx={{
                  ...STYLES.messageContainer,
                  marginBottom: '100px', // 为输入框留出足够空间
                }}
              >
                <Box sx={STYLES.welcomeContainer}>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={STYLES.welcomeText}
                  >
                    对话开始了，请输入您的问题
                  </Typography>
                </Box>
              </Box>

              {/* 即使没有当前话题，也显示输入框 */}
              <Box sx={STYLES.inputContainer}>
                {/* 工具栏容器 - 仅在默认布局时显示 */}
                {shouldShowToolbar && (
                  <Box sx={STYLES.toolbarContainer}>
                    <ChatToolbar
                      onClearTopic={handleClearTopic}
                      imageGenerationMode={imageGenerationMode}
                      toggleImageGenerationMode={toggleImageGenerationMode}
                      webSearchActive={webSearchActive}
                      toggleWebSearch={toggleWebSearch}
                      toolsEnabled={toolsEnabled}
                      onToolsEnabledChange={toggleToolsEnabled}
                    />
                  </Box>
                )}

                {/* 输入框容器 */}
                <Box sx={STYLES.inputWrapper}>
                  {renderInputComponent()}
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};