import { useDispatch } from 'react-redux';
import { EventEmitter, EVENT_NAMES } from '../services/EventService';
import { TopicService } from '../services/TopicService';
import { newMessagesActions } from '../store/slices/newMessagesSlice';

export const useTopicManagement = () => {
  const dispatch = useDispatch();

  // 创建新话题
  const handleCreateTopic = async () => {
    // 触发新建话题事件
    EventEmitter.emit(EVENT_NAMES.ADD_NEW_TOPIC);
    console.log('[TopicManagement] Emitted ADD_NEW_TOPIC event.');

    // 创建新话题
    const newTopic = await TopicService.createNewTopic();

    // 如果成功创建话题，自动跳转到新话题
    if (newTopic) {
      console.log('[TopicManagement] 成功创建新话题，自动跳转:', newTopic.id);

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

  return {
    handleCreateTopic
  };
};
