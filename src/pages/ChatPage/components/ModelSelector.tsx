import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../shared/store';
import DialogModelSelector from './DialogModelSelector';


// 定义组件props类型
interface ModelSelectorProps {
  selectedModel: any;
  availableModels: any[];
  handleModelSelect: (model: any) => void;
  handleMenuClick: () => void;
  handleMenuClose: () => void;
  menuOpen: boolean;
  iconMode?: boolean; // 是否使用图标模式
}

// 导出ModelSelector组件 - 根据设置选择不同的选择器样式
export const ModelSelector: React.FC<ModelSelectorProps> = (props) => {
  const modelSelectorStyle = useSelector((state: RootState) => state.settings.modelSelectorStyle);

  // 如果是图标模式，强制使用DialogModelSelector（因为它支持弹出菜单）
  if (props.iconMode || modelSelectorStyle === 'dropdown') {
    // 图标模式或下拉模式都使用DialogModelSelector，但传递不同的样式标志
    return (
      <DialogModelSelector
        selectedModel={props.selectedModel}
        availableModels={props.availableModels}
        handleModelSelect={props.handleModelSelect}
        handleMenuClick={props.handleMenuClick}
        handleMenuClose={props.handleMenuClose}
        menuOpen={props.menuOpen}
        iconMode={props.iconMode}
        useDropdownStyle={modelSelectorStyle === 'dropdown' && !props.iconMode}
      />
    );
  }

  return (
    <DialogModelSelector
      selectedModel={props.selectedModel}
      availableModels={props.availableModels}
      handleModelSelect={props.handleModelSelect}
      handleMenuClick={props.handleMenuClick}
      handleMenuClose={props.handleMenuClose}
      menuOpen={props.menuOpen}
    />
  );
};