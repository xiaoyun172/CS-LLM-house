import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../shared/store';
import { useChatPageLayout } from './hooks/useChatPageLayout.ts';
import { useModelSelection } from './hooks/useModelSelection.ts';
import { useTopicManagement } from './hooks/useTopicManagement.ts';
import { useMessageHandling } from './hooks/useMessageHandling.ts';
import { useChatFeatures } from './hooks/useChatFeatures.ts';
import { ChatPageUI } from './components/ChatPageUI.tsx';
import { 
  selectMessagesForTopic, 
  selectTopicLoading, 
  selectTopicStreaming 
} from '../../shared/store/selectors/messageSelectors';

const ChatPage: React.FC = () => {
  // 从Redux获取状态
  const currentTopic = useSelector((state: RootState) => state.messages.currentTopic);

  // 使用新的选择器获取当前主题的消息
  const currentMessages = useSelector((state: RootState) => 
    currentTopic ? selectMessagesForTopic(state, currentTopic.id) : []
  );

  // 使用新的选择器获取流式状态和加载状态
  const isStreaming = useSelector((state: RootState) => 
    currentTopic ? selectTopicStreaming(state, currentTopic.id) : false
  );
  const isLoading = useSelector((state: RootState) => 
    currentTopic ? selectTopicLoading(state, currentTopic.id) : false
  );

  // 布局相关钩子
  const { 
    isMobile, 
    drawerOpen, 
    setDrawerOpen, 
    navigate 
  } = useChatPageLayout();

  // 模型选择钩子
  const { 
    selectedModel, 
    availableModels, 
    handleModelSelect, 
    handleModelMenuClick, 
    handleModelMenuClose, 
    menuOpen 
  } = useModelSelection();

  // 主题管理钩子
  const { handleClearTopic } = useTopicManagement(currentTopic);

  // 消息处理钩子
  const { 
    handleSendMessage, 
    handleDeleteMessage, 
    handleRegenerateMessage,
    loadTopicMessages
  } = useMessageHandling(selectedModel, currentTopic);

  // 特殊功能钩子 (网络搜索、图像生成、URL抓取等)
  const {
    webSearchActive,
    imageGenerationMode,
    toggleWebSearch,
    toggleImageGenerationMode,
    handleUrlScraping,
    handleStopResponseClick,
    handleMessageSend
  } = useChatFeatures(currentTopic, currentMessages, selectedModel, handleSendMessage);

  // 在主题切换时加载消息
  useEffect(() => {
    if (currentTopic?.id) {
      console.log(`[ChatPage] 开始加载主题 ${currentTopic.id} 的消息`);
      // 直接使用在组件顶层获取的loadTopicMessages函数
      loadTopicMessages(currentTopic.id)
        .then((messageCount) => {
          console.log(`[ChatPage] 主题 ${currentTopic.id} 的消息加载完成，消息数量:`, messageCount);
        })
        .catch(error => {
          console.error('[ChatPage] 加载主题消息失败:', error);
        });
    }
  }, [currentTopic?.id, selectedModel, loadTopicMessages]);

  return (
    <ChatPageUI
      currentTopic={currentTopic}
      currentMessages={currentMessages}
      isStreaming={isStreaming}
      isLoading={isLoading}
      isMobile={isMobile}
      drawerOpen={drawerOpen}
      setDrawerOpen={setDrawerOpen}
      navigate={navigate}
      selectedModel={selectedModel}
      availableModels={availableModels}
      handleModelSelect={handleModelSelect}
      handleModelMenuClick={handleModelMenuClick}
      handleModelMenuClose={handleModelMenuClose}
      menuOpen={menuOpen}
      handleClearTopic={handleClearTopic}
      handleDeleteMessage={handleDeleteMessage}
      handleRegenerateMessage={handleRegenerateMessage}
      webSearchActive={webSearchActive}
      imageGenerationMode={imageGenerationMode}
      toggleWebSearch={toggleWebSearch}
      toggleImageGenerationMode={toggleImageGenerationMode}
      handleMessageSend={handleMessageSend}
      handleUrlScraping={handleUrlScraping}
      handleStopResponseClick={handleStopResponseClick}
    />
  );
};

export default ChatPage;