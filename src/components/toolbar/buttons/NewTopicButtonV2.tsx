import React from 'react';
import AddIcon from '@mui/icons-material/Add';
import { TopicService } from '../../../shared/services/TopicService';
import { EventEmitter, EVENT_NAMES } from '../../../shared/services/EventService';
import type { ToolbarButtonProps } from './types';
import ToolbarButton from './ToolbarButton';

/**
 * 新建话题按钮组件 - 使用通用按钮组件
 */
const NewTopicButtonV2: React.FC<ToolbarButtonProps> = ({ 
  displayStyle, 
  isDarkMode 
}) => {
  // 创建新话题 - 使用统一的TopicService
  const handleCreateTopic = async () => {
    // 触发新建话题事件
    EventEmitter.emit(EVENT_NAMES.ADD_NEW_TOPIC);
    console.log('[NewTopicButtonV2] Emitted ADD_NEW_TOPIC event.');
    
    // 创建新话题
    await TopicService.createNewTopic();
  };
  
  return (
    <ToolbarButton
      displayStyle={displayStyle}
      isDarkMode={isDarkMode}
      icon={<AddIcon sx={{ fontSize: '18px' }} />}
      label="新建话题"
      onClick={handleCreateTopic}
      color={isDarkMode ? '#FFFFFF' : '#4CAF50'}
      iconColor={isDarkMode ? '#9E9E9E' : '#4CAF50'}
    />
  );
};

export default NewTopicButtonV2; 