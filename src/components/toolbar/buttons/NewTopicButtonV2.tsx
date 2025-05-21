import React from 'react';
import AddIcon from '@mui/icons-material/Add';
import { useDispatch } from 'react-redux';
import { TopicService } from '../../../shared/services/TopicService';
import { EventEmitter, EVENT_NAMES } from '../../../shared/services/EventService';
import { newMessagesActions } from '../../../shared/store/slices/newMessagesSlice';
import type { ToolbarButtonProps } from './types';
import ToolbarButton from './ToolbarButton';

/**
 * 新建话题按钮组件 - 使用通用按钮组件
 */
const NewTopicButtonV2: React.FC<ToolbarButtonProps> = ({
  displayStyle,
  isDarkMode
}) => {
  const dispatch = useDispatch();

  // 创建新话题 - 使用统一的TopicService
  const handleCreateTopic = async () => {
    // 触发新建话题事件
    EventEmitter.emit(EVENT_NAMES.ADD_NEW_TOPIC);
    console.log('[NewTopicButtonV2] Emitted ADD_NEW_TOPIC event.');

    // 创建新话题
    const newTopic = await TopicService.createNewTopic();

    // 如果成功创建话题，自动跳转到新话题
    if (newTopic) {
      console.log('[NewTopicButtonV2] 成功创建新话题，自动跳转:', newTopic.id);

      // 设置当前话题 - 立即选择新创建的话题
      dispatch(newMessagesActions.setCurrentTopicId(newTopic.id));

      // 确保话题侧边栏显示并选中新话题
      setTimeout(() => {
        EventEmitter.emit(EVENT_NAMES.SHOW_TOPIC_SIDEBAR);

        // 再次确保新话题被选中，防止其他逻辑覆盖
        setTimeout(() => {
          dispatch(newMessagesActions.setCurrentTopicId(newTopic.id));
        }, 50);
      }, 100);
    }
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