import React from 'react';
import type { Model } from '../../../shared/types';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../shared/store';
import DialogModelSelector from './DialogModelSelector';
import DropdownModelSelector from './DropdownModelSelector';

interface ModelSelectorProps {
  selectedModel: Model | null;
  availableModels: Model[];
  handleModelSelect: (model: Model) => void;
  handleModelMenuClick: () => void;
  handleModelMenuClose: () => void;
  menuOpen: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = (props) => {
  const modelSelectorStyle = useSelector((state: RootState) => 
    state.settings.modelSelectorStyle || 'dialog'
  );
  
  // 根据设置选择使用哪种选择器
  if (modelSelectorStyle === 'dropdown') {
    return <DropdownModelSelector 
      selectedModel={props.selectedModel}
      availableModels={props.availableModels}
      handleModelSelect={props.handleModelSelect}
    />;
  }
  
  // 默认使用对话框选择器
  return <DialogModelSelector 
    selectedModel={props.selectedModel}
    availableModels={props.availableModels}
    handleModelSelect={props.handleModelSelect}
    handleMenuClick={props.handleModelMenuClick}
    handleMenuClose={props.handleModelMenuClose}
    menuOpen={props.menuOpen}
  />;
};

export default ModelSelector; 