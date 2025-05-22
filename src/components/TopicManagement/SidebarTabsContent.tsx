import React from 'react';
import { Box, Tabs, Tab, CircularProgress } from '@mui/material';
import { useSidebarContext } from './SidebarContext';
import TabPanel, { a11yProps } from './TabPanel';
import AssistantTab from './AssistantTab/index';
import TopicTab from './TopicTab/index';
import SettingsTab from './SettingsTab/index';

/**
 * 侧边栏标签页内容组件
 */
export default function SidebarTabsContent() {
  const {
    loading,
    value,
    setValue,
    userAssistants,
    currentAssistant,
    assistantWithTopics,
    currentTopic,
    handleSelectAssistant,
    handleAddAssistant,
    handleUpdateAssistant,
    handleDeleteAssistant,
    isPending, // 获取isPending状态
    handleSelectTopic,
    handleCreateTopic,
    handleDeleteTopic,
    handleUpdateTopic,
    settings,
    settingsArray,
    handleSettingChange,
    handleContextLengthChange,
    handleContextCountChange,
    handleMathRendererChange
  } = useSidebarContext();

  // 标签页切换
  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    console.log(`[SidebarTabs] 标签页切换: ${value} -> ${newValue}`, {
      currentAssistant: currentAssistant?.id,
      assistantWithTopics: assistantWithTopics?.id,
      topicsCount: assistantWithTopics?.topics?.length || 0,
      topicIds: assistantWithTopics?.topicIds?.length || 0,
      currentTopic: currentTopic?.id
    });

    if (newValue === 1) { // 切换到话题标签页
      console.log('[SidebarTabs] 切换到话题标签页，话题详情:',
        assistantWithTopics?.topics?.map((t) => ({id: t.id, name: t.name})) || []);
    }

    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {loading || isPending ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <CircularProgress />
          {isPending && <Box sx={{ ml: 2 }}>切换助手中...</Box>}
        </Box>
      ) : (
        <>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={value}
              onChange={handleChange}
              aria-label="sidebar tabs"
              variant="fullWidth"
              sx={{
                minHeight: '48px',
                margin: '0 10px',
                padding: '10px 0',
                '& .MuiTabs-indicator': {
                  display: 'none', // 隐藏底部指示器
                },
                '& .MuiTab-root': {
                  minHeight: '32px',
                  borderRadius: '8px',
                  transition: 'background-color 0.3s',
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(0, 0, 0, 0.06)', // 选中标签的背景色
                  },
                },
              }}
            >
              <Tab
                label="助手"
                {...a11yProps(0)}
                sx={{
                  minHeight: '32px',
                  borderRadius: '8px',
                }}
              />
              <Tab
                label="话题"
                {...a11yProps(1)}
                sx={{
                  minHeight: '32px',
                  borderRadius: '8px',
                }}
              />
              <Tab
                label="设置"
                {...a11yProps(2)}
                sx={{
                  minHeight: '32px',
                  borderRadius: '8px',
                  color: value === 2 ? 'primary.main' : 'inherit'
                }}
              />
            </Tabs>
          </Box>

          <TabPanel value={value} index={0}>
            <AssistantTab
              userAssistants={userAssistants}
              currentAssistant={currentAssistant}
              onSelectAssistant={handleSelectAssistant}
              onAddAssistant={handleAddAssistant}
              onUpdateAssistant={handleUpdateAssistant}
              onDeleteAssistant={handleDeleteAssistant}
            />
          </TabPanel>

          <TabPanel value={value} index={1}>
            {/* 直接渲染组件，与电脑版保持一致 */}
            <TopicTab
              key={assistantWithTopics?.id || currentAssistant?.id || 'no-assistant'}
              currentAssistant={assistantWithTopics || currentAssistant}
              currentTopic={currentTopic}
              onSelectTopic={handleSelectTopic}
              onCreateTopic={handleCreateTopic}
              onDeleteTopic={handleDeleteTopic}
              onUpdateTopic={handleUpdateTopic}
            />
          </TabPanel>

          <TabPanel value={value} index={2}>
            <SettingsTab
              settings={settingsArray}
              onSettingChange={handleSettingChange}
              initialContextLength={settings.contextLength}
              onContextLengthChange={handleContextLengthChange}
              initialContextCount={settings.contextCount}
              onContextCountChange={handleContextCountChange}
              initialMathRenderer={settings.mathRenderer}
              onMathRendererChange={handleMathRendererChange}
            />
          </TabPanel>
        </>
      )}
    </Box>
  );
}
