import React from 'react';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import type { ToolbarButtonProps } from './types';
import ToolbarButton from './ToolbarButton';

interface ClearTopicButtonProps extends ToolbarButtonProps {
  /**
   * 清除话题的回调函数
   */
  onClearTopic?: () => void;
}

/**
 * 清除话题按钮组件 - 使用通用按钮组件
 */
const ClearTopicButton: React.FC<ClearTopicButtonProps> = ({
  displayStyle,
  isDarkMode,
  onClearTopic
}) => {
  return (
    <ToolbarButton
      displayStyle={displayStyle}
      isDarkMode={isDarkMode}
      icon={<DeleteSweepIcon sx={{ fontSize: '18px' }} />}
      label="清空内容"
      onClick={onClearTopic}
      color={isDarkMode ? '#FFFFFF' : '#2196F3'}
      iconColor={isDarkMode ? '#9E9E9E' : '#2196F3'}
    />
  );
};

export default ClearTopicButton;