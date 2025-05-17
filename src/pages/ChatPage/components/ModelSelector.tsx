import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../shared/store';
import type { Model } from '../../../shared/types';
import DialogModelSelector from './DialogModelSelector';
import DropdownModelSelector from './DropdownModelSelector';

interface ModelSelectorProps {
  selectedModel: Model | null;
  availableModels: Model[];
  handleModelSelect: (model: Model) => void;
  handleMenuClick: () => void;
  handleMenuClose: () => void;
  menuOpen: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = (props) => {
  const modelSelectorStyle = useSelector((state: RootState) =>
    state.settings.modelSelectorStyle || 'dialog'
  );
  
  // 确保模型可用性检查
  const hasModels = Array.isArray(props.availableModels) && props.availableModels.length > 0;
  
  if (!hasModels) {
    return null; // 如果没有可用模型，不渲染选择器
  }
  
  if (modelSelectorStyle === 'dropdown') {
    return <DropdownModelSelector
      selectedModel={props.selectedModel}
      availableModels={props.availableModels}
      handleModelSelect={props.handleModelSelect}
    />;
  }
  
  return <DialogModelSelector
    selectedModel={props.selectedModel}
    availableModels={props.availableModels}
    handleModelSelect={props.handleModelSelect}
    handleMenuClick={props.handleMenuClick}
    handleMenuClose={props.handleMenuClose}
    menuOpen={props.menuOpen}
  />;
};

export default ModelSelector; 