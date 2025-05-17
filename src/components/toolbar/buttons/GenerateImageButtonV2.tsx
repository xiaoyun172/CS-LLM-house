import React from 'react';
import ImageIcon from '@mui/icons-material/Image';
import type { ToolbarButtonProps } from './types';
import ToolbarButton from './ToolbarButton';

interface GenerateImageButtonProps extends ToolbarButtonProps {
  /**
   * 是否处于图像生成模式
   */
  imageGenerationMode?: boolean;
  
  /**
   * 切换图像生成模式的回调函数
   */
  toggleImageGenerationMode?: () => void;
}

/**
 * 生成图片按钮组件 - 使用通用按钮组件
 */
const GenerateImageButtonV2: React.FC<GenerateImageButtonProps> = ({ 
  displayStyle, 
  isDarkMode,
  imageGenerationMode = false,
  toggleImageGenerationMode
}) => {
  return (
    <ToolbarButton
      displayStyle={displayStyle}
      isDarkMode={isDarkMode}
      icon={<ImageIcon sx={{ fontSize: '18px' }} />}
      label={imageGenerationMode ? '取消生成' : '生成图片'}
      onClick={toggleImageGenerationMode}
      isActive={imageGenerationMode}
      color={isDarkMode ? '#FFFFFF' : '#9C27B0'}
      iconColor={isDarkMode ? '#9E9E9E' : '#9C27B0'}
      activeBgColor={isDarkMode ? '#424242' : '#9C27B0'}
    />
  );
};

export default GenerateImageButtonV2; 