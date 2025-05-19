import { useState } from 'react';

/**
 * 设置管理钩子
 */
export function useSettingsManagement() {
  // 应用设置
  const [settings, setSettings] = useState({
    streamOutput: true,
    showMessageDivider: true,
    copyableCodeBlocks: true,
    contextLength: 16000, // 设置为16K，适合大多数模型
    contextCount: 5,      // 与电脑版保持一致，DEFAULT_CONTEXTCOUNT = 5
    mathRenderer: 'KaTeX' as const
  });

  // 转换设置对象为SettingsTab组件需要的格式
  const settingsArray = [
    { id: 'streamOutput', name: '流式输出', defaultValue: settings.streamOutput, description: '实时显示AI回答，打字机效果' },
    { id: 'showMessageDivider', name: '消息分割线', defaultValue: settings.showMessageDivider, description: '在消息之间显示分割线' },
    { id: 'copyableCodeBlocks', name: '代码块可复制', defaultValue: settings.copyableCodeBlocks, description: '允许复制代码块的内容' },
  ];

  // 设置相关函数
  const handleSettingChange = (settingId: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [settingId]: value }));
  };

  const handleContextLengthChange = (value: number) => {
    setSettings(prev => ({ ...prev, contextLength: value }));
  };

  const handleContextCountChange = (value: number) => {
    setSettings(prev => ({ ...prev, contextCount: value }));
  };

  const handleMathRendererChange = (value: any) => {
    setSettings(prev => ({ ...prev, mathRenderer: value }));
  };

  return {
    settings,
    settingsArray,
    handleSettingChange,
    handleContextLengthChange,
    handleContextCountChange,
    handleMathRendererChange
  };
}
