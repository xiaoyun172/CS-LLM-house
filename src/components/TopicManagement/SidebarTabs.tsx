import { useEffect } from 'react';
import { SidebarProvider } from './SidebarContext';
import { useSidebarState } from './hooks/useSidebarState';
import { useAssistantManagement } from './hooks/useAssistantManagement';
import { useTopicManagement } from './hooks/useTopicManagement';
import { useSettingsManagement } from './hooks/useSettingsManagement';
import SidebarTabsContent from './SidebarTabsContent';

/**
 * 侧边栏标签页组件
 *
 * 这是一个容器组件，负责管理状态和提供上下文
 */
export default function SidebarTabs() {
  // 使用各种钩子获取状态和方法
  const {
    value,
    setValue,
    loading,
    userAssistants,
    setUserAssistants,
    currentAssistant,
    setCurrentAssistant,
    assistantWithTopics,
    currentTopic,
    updateAssistantTopic,
    refreshTopics
  } = useSidebarState();

  // 助手管理
  const {
    handleSelectAssistant,
    handleAddAssistant,
    handleUpdateAssistant,
    handleDeleteAssistant
  } = useAssistantManagement({
    currentAssistant,
    setCurrentAssistant,
    setUserAssistants,
    currentTopic,
    refreshTopics
  });

  // 话题管理
  const {
    handleCreateTopic,
    handleSelectTopic,
    handleDeleteTopic,
    handleUpdateTopic
  } = useTopicManagement({
    currentAssistant,
    setCurrentAssistant,
    assistantWithTopics,
    currentTopic,
    refreshTopics,
    updateAssistantTopic
  });

  // 设置管理
  const {
    settings,
    settingsArray,
    handleSettingChange,
    handleContextLengthChange,
    handleContextCountChange,
    handleMathRendererChange
  } = useSettingsManagement();

  // 添加调试日志以便追踪问题
  useEffect(() => {
    console.log('[SidebarTabs] currentAssistant:', currentAssistant?.name, currentAssistant?.id);
    console.log('[SidebarTabs] assistantWithTopics:', assistantWithTopics?.name, assistantWithTopics?.id);

    // 检查assistantWithTopics是否有话题
    if (assistantWithTopics) {
      console.log('[SidebarTabs] assistantWithTopics.topics:', assistantWithTopics.topics?.length || 0);
      console.log('[SidebarTabs] assistantWithTopics.topicIds:', assistantWithTopics.topicIds?.length || 0);

      if (!assistantWithTopics.topics || assistantWithTopics.topics.length === 0) {
        console.log('[SidebarTabs] assistantWithTopics没有话题，但不自动刷新，等待handleSelectAssistant处理');
        // 不再自动刷新话题，由handleSelectAssistant处理
      }
    } else if (currentAssistant) {
      // 不再自动刷新话题，避免重复刷新
      console.log('[SidebarTabs] assistantWithTopics为null，但currentAssistant存在，等待handleSelectAssistant处理');
    }
  }, [currentAssistant, assistantWithTopics]);

  // 将所有状态和方法传递给上下文提供者
  const contextValue = {
    // 状态
    loading,
    value,
    userAssistants,
    currentAssistant,
    assistantWithTopics,
    currentTopic,

    // 设置状态的函数
    setValue,
    setCurrentAssistant,

    // 助手管理函数
    handleSelectAssistant,
    handleAddAssistant,
    handleUpdateAssistant,
    handleDeleteAssistant,

    // 话题管理函数
    handleCreateTopic,
    handleSelectTopic,
    handleDeleteTopic,
    handleUpdateTopic,

    // 设置管理
    settings,
    settingsArray,
    handleSettingChange,
    handleContextLengthChange,
    handleContextCountChange,
    handleMathRendererChange,

    // 刷新函数
    refreshTopics
  };

  return (
    <SidebarProvider value={contextValue}>
      <SidebarTabsContent />
    </SidebarProvider>
  );
}
