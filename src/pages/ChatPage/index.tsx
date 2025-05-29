import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../shared/store';
import { useChatPageLayout } from './hooks/useChatPageLayout.ts';
import { useModelSelection } from './hooks/useModelSelection.ts';
import { useTopicManagement } from './hooks/useTopicManagement.ts';
import { useMessageHandling } from './hooks/useMessageHandling.ts';
import { useChatFeatures } from './hooks/useChatFeatures.ts';
import { useAIDebate } from './hooks/useAIDebate.ts';
import { ChatPageUI } from './components/ChatPageUI.tsx';
import {
  selectMessagesForTopic,
  selectTopicLoading,
  selectTopicStreaming
} from '../../shared/store/selectors/messageSelectors';
import { dexieStorage } from '../../shared/services/DexieStorageService';
import { EventEmitter, EVENT_NAMES } from '../../shared/services/EventService';
import { TopicService } from '../../shared/services/TopicService';
import { newMessagesActions } from '../../shared/store/slices/newMessagesSlice';
import { addTopic } from '../../shared/store/slices/assistantsSlice';


const ChatPage: React.FC = () => {
  const dispatch = useDispatch();

  // 从Redux获取状态
  const currentTopicId = useSelector((state: RootState) => state.messages.currentTopicId);
  const currentAssistant = useSelector((state: RootState) => state.assistants.currentAssistant);
  const [currentTopic, setCurrentTopic] = useState<any>(null);

  // 消息引用，用于分支功能
  const messagesRef = useRef<any[]>([]);

  // 当话题ID变化时，从数据库获取话题信息
  useEffect(() => {
    const loadTopic = async () => {
      if (!currentTopicId) {
        setCurrentTopic(null);
        return;
      }

      try {
        const topic = await dexieStorage.getTopic(currentTopicId);
        if (topic) {
          setCurrentTopic(topic);
        }
      } catch (error) {
        console.error('加载话题信息失败:', error);
      }
    };

    loadTopic();
  }, [currentTopicId]);

  // 创建记忆化的消息选择器
  const selectCurrentMessages = useMemo(
    () => {
      if (!currentTopic?.id) {
        return () => [];
      }
      return createSelector(
        [(state: RootState) => selectMessagesForTopic(state, currentTopic.id)],
        (messages) => {
          // 添加转换逻辑避免直接返回输入
          return messages ? [...messages] : [];
        }
      );
    },
    [currentTopic?.id]
  );

  // 使用记忆化的选择器获取当前主题的消息
  const currentMessages = useSelector(selectCurrentMessages);

  // 更新消息引用
  useEffect(() => {
    messagesRef.current = currentMessages;
  }, [currentMessages]);

  // 创建记忆化的状态选择器
  const selectCurrentTopicStreaming = useMemo(
    () => {
      if (!currentTopic?.id) {
        return () => false;
      }
      return createSelector(
        [(state: RootState) => selectTopicStreaming(state, currentTopic.id)],
        (streaming) => {
          // 添加转换逻辑避免直接返回输入
          return Boolean(streaming);
        }
      );
    },
    [currentTopic?.id]
  );

  const selectCurrentTopicLoading = useMemo(
    () => {
      if (!currentTopic?.id) {
        return () => false;
      }
      return createSelector(
        [(state: RootState) => selectTopicLoading(state, currentTopic.id)],
        (loading) => {
          // 添加转换逻辑避免直接返回输入
          return Boolean(loading);
        }
      );
    },
    [currentTopic?.id]
  );

  // 使用记忆化的选择器获取状态
  const isStreaming = useSelector(selectCurrentTopicStreaming);
  const isLoading = useSelector(selectCurrentTopicLoading);

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
    handleSwitchMessageVersion,
    handleResendMessage,
    loadTopicMessages
  } = useMessageHandling(selectedModel, currentTopic);

  // 特殊功能钩子 (网络搜索、图像生成、URL抓取等)
  const {
    webSearchActive,
    imageGenerationMode,
    toolsEnabled,
    mcpMode,
    toggleWebSearch,
    toggleImageGenerationMode,
    toggleToolsEnabled,
    handleMCPModeChange,
    handleStopResponseClick,
    handleMessageSend,
    handleMultiModelSend
  } = useChatFeatures(currentTopic, currentMessages, selectedModel, handleSendMessage);

  // AI辩论功能钩子
  const {
    isDebating,
    handleStartDebate,
    handleStopDebate
  } = useAIDebate({
    onSendMessage: handleSendMessage,
    currentTopic
  });

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

  // 添加NEW_BRANCH事件处理
  useEffect(() => {
    const handleNewBranch = async (index: number) => {
      if (!currentTopic || !currentAssistant) {
        console.error('[ChatPage] 无法创建分支: 缺少当前话题或助手');
        return;
      }

      const currentMessages = messagesRef.current;

      if (index < 0 || index >= currentMessages.length) {
        console.error(`[ChatPage] 无效的分支索引: ${index}, 消息总数: ${currentMessages.length}`);
        return;
      }

      console.log(`[ChatPage] 开始创建分支，索引: ${index}, 消息总数: ${currentMessages.length}`);
      console.log(`[ChatPage] 选中的消息:`, currentMessages[index]);
      console.log(`[ChatPage] 将克隆 ${index + 1} 条消息`);

      try {
        // 创建新话题
        const newTopic = await TopicService.createTopic(`${currentTopic.name} (分支)`);
        if (!newTopic) {
          console.error('[ChatPage] 创建分支话题失败');
          return;
        }

        // 添加话题到Redux store
        dispatch(addTopic({ assistantId: currentAssistant.id, topic: newTopic }));

        // 克隆消息到新话题 (从开始到分支点，包括选中的消息)
        // index是消息在列表中的索引位置（从0开始）
        // 我们需要克隆从开始到index位置的所有消息（包括index位置的消息）
        const messagesToClone = currentMessages.slice(0, index + 1); // +1 包括选中的消息

        for (const message of messagesToClone) {
          // 生成新的消息ID和时间戳
          const timestamp = Date.now();
          const clonedMessage = {
            ...message,
            id: `${message.id}_clone_${timestamp}`,
            topicId: newTopic.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          // 克隆消息的块
          const clonedBlocks = [];
          if (message.blocks && message.blocks.length > 0) {
            // 从Redux或数据库获取原始块
            for (const blockId of message.blocks) {
              try {
                const originalBlock = await dexieStorage.getMessageBlock(blockId);
                if (originalBlock) {
                  const clonedBlock = {
                    ...originalBlock,
                    id: `${originalBlock.id}_clone_${timestamp}`,
                    messageId: clonedMessage.id,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  };
                  clonedBlocks.push(clonedBlock);
                }
              } catch (error) {
                console.warn(`[ChatPage] 无法克隆块 ${blockId}:`, error);
              }
            }
          }

          // 更新克隆消息的块ID
          clonedMessage.blocks = clonedBlocks.map(block => block.id);

          // 使用saveMessageAndBlocks保存新格式的消息
          await TopicService.saveMessageAndBlocks(clonedMessage, clonedBlocks);
        }

        // 切换到新话题
        dispatch(newMessagesActions.setCurrentTopicId(newTopic.id));

        console.log(`[ChatPage] 成功创建分支话题: ${newTopic.id}`);
      } catch (error) {
        console.error('[ChatPage] 创建分支失败:', error);
      }
    };

    // 监听NEW_BRANCH事件
    const unsubscribe = EventEmitter.on(EVENT_NAMES.NEW_BRANCH, handleNewBranch);

    return () => {
      unsubscribe();
    };
  }, [currentTopic, currentAssistant, dispatch]);

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
      handleSwitchMessageVersion={handleSwitchMessageVersion}
      handleResendMessage={handleResendMessage}
      webSearchActive={webSearchActive}
      imageGenerationMode={imageGenerationMode}
      toolsEnabled={toolsEnabled}
      mcpMode={mcpMode}
      toggleWebSearch={toggleWebSearch}
      toggleImageGenerationMode={toggleImageGenerationMode}
      toggleToolsEnabled={toggleToolsEnabled}
      handleMCPModeChange={handleMCPModeChange}
      handleMessageSend={handleMessageSend}
      handleMultiModelSend={handleMultiModelSend}
      handleStopResponseClick={handleStopResponseClick}
      isDebating={isDebating}
      handleStartDebate={handleStartDebate}
      handleStopDebate={handleStopDebate}
    />
  );
};

export default ChatPage;