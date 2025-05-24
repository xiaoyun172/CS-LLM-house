import { useState } from 'react';
import type { ThinkingOption } from '../../../shared/config/reasoningConfig';
import {
  getHighPerformanceStreamingSetting,
  setHighPerformanceStreamingSetting
} from '../../../shared/utils/performanceSettings';

/**
 * 设置管理钩子
 */
export function useSettingsManagement() {
  // 应用设置
  const [settings, setSettings] = useState({
    streamOutput: true,
    showMessageDivider: true,
    copyableCodeBlocks: true,
    highPerformanceStreaming: getHighPerformanceStreamingSetting(), // 从 localStorage 加载
    contextLength: 16000, // 设置为16K，适合大多数模型
    contextCount: 5,      // 与最佳实例保持一致，DEFAULT_CONTEXTCOUNT = 5
    mathRenderer: 'KaTeX' as const,
    defaultThinkingEffort: 'medium' as ThinkingOption
  });

  // 转换设置对象为SettingsTab组件需要的格式
  const settingsArray = [
    { id: 'streamOutput', name: '流式输出', defaultValue: settings.streamOutput, description: '实时显示AI回答，打字机效果' },
    { id: 'highPerformanceStreaming', name: '高性能流式输出', defaultValue: settings.highPerformanceStreaming, description: '启用超高性能渲染模式：虚拟化、Canvas或最小化渲染，大幅提升流式输出性能' },
    { id: 'showMessageDivider', name: '消息分割线', defaultValue: settings.showMessageDivider, description: '在消息之间显示分割线' },
    { id: 'copyableCodeBlocks', name: '代码块可复制', defaultValue: settings.copyableCodeBlocks, description: '允许复制代码块的内容' },
  ];

  // 设置相关函数
  const handleSettingChange = (settingId: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [settingId]: value }));

    // 特殊处理：保存高性能流式输出设置到 localStorage
    if (settingId === 'highPerformanceStreaming') {
      setHighPerformanceStreamingSetting(value);
    }
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

  const handleThinkingEffortChange = (value: ThinkingOption) => {
    setSettings(prev => ({ ...prev, defaultThinkingEffort: value }));
  };

  return {
    settings,
    settingsArray,
    handleSettingChange,
    handleContextLengthChange,
    handleContextCountChange,
    handleMathRendererChange,
    handleThinkingEffortChange
  };
}
