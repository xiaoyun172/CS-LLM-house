import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setCurrentTopic, createTopic, addMessage, setTopicMessages } from '../../../shared/store/messagesSlice';
import type { ChatTopic, Message } from '../../../shared/types';
import { AssistantService } from '../../../shared/services/AssistantService';

export function useTopicManagement(currentTopic: ChatTopic | null) {
  const dispatch = useDispatch();
  // 本地状态
  const [topics, setTopics] = useState<ChatTopic[]>([]);

  // 初始化加载主题
  useEffect(() => {
    loadTopics().then(loadedTopics => {
      setTopics(loadedTopics);
    });
  }, []);

  // 当主题变化时保存到本地存储
  useEffect(() => {
    if (topics.length > 0) {
      localStorage.setItem('chatTopics', JSON.stringify(topics));
    }
  }, [topics]);

  // 从本地存储加载主题
  const loadTopics = async (): Promise<ChatTopic[]> => {
    // 从本地存储加载主题
    const savedTopics = localStorage.getItem('chatTopics');
    if (savedTopics) {
      try {
        const parsedTopics = JSON.parse(savedTopics);

        // 确保每个主题都有messages数组
        const validTopics = parsedTopics.map((topic: ChatTopic) => ({
          ...topic,
          messages: topic.messages || []
        }));

        // 如果有主题，选择第一个
        if (validTopics.length > 0 && !currentTopic) {
          // 设置当前主题
          dispatch(setCurrentTopic(validTopics[0]));

          // 加载该主题的所有消息到Redux
          validTopics.forEach((topic: ChatTopic) => {
            if (topic.messages && topic.messages.length > 0) {
              topic.messages.forEach((message: Message) => {
                dispatch(addMessage({ topicId: topic.id, message }));
              });
            }
          });
        }

        return validTopics;
      } catch (error) {
        console.error('解析本地存储的主题失败:', error);
        return createDefaultTopic();
      }
    }
    // 没有保存的话题时自动创建一个默认话题
    return createDefaultTopic();
  };

  // 创建默认话题的辅助函数
  const createDefaultTopic = (): ChatTopic[] => {
    console.log('没有找到已保存的话题，创建默认话题');
    
    // 创建一个新的默认话题
    const defaultTopic = {
      id: generateId(),
      title: '默认对话',
      lastMessageTime: new Date().toISOString(),
      messages: []
    };

    // 添加到Redux
    dispatch(createTopic(defaultTopic));
    
    // 设置为当前话题
    dispatch(setCurrentTopic(defaultTopic));
    
    // 获取当前助手ID
    const currentAssistantId = localStorage.getItem('currentAssistant');
    
    // 如果存在助手ID，尝试关联话题
    if (currentAssistantId) {
      try {
        // 获取助手列表
        const assistants = AssistantService.getUserAssistants();
        const currentAssistant = assistants.find(a => a.id === currentAssistantId);

        if (currentAssistant) {
          console.log(`正在将默认话题关联到助手"${currentAssistant.name}"`);

          // 将话题与当前助手关联
          const updatedAssistant = {
            ...currentAssistant,
            topicIds: [...(currentAssistant.topicIds || []), defaultTopic.id]
          };

          // 保存更新的助手
          AssistantService.updateAssistant(updatedAssistant);
        }
      } catch (error) {
        console.error('关联默认话题到助手时出错:', error);
      }
    }
    
    return [defaultTopic];
  };

  // 处理新建话题
  const handleNewTopic = () => {
    console.log('useTopicManagement: 开始创建新话题');
    try {
      // 创建一个新的话题
      const newTopic = {
        id: generateId(),
        title: '新话题 ' + new Date().toLocaleTimeString(),
        lastMessageTime: new Date().toISOString(),
        messages: []
      };

      console.log('useTopicManagement: 新话题已创建:', newTopic);

      // 添加到Redux
      dispatch(createTopic(newTopic));
      console.log('useTopicManagement: 新话题已添加到Redux');

      // 刷新话题列表
      setTopics(prevTopics => [newTopic, ...prevTopics]);
      console.log('useTopicManagement: 本地话题列表已更新');

      // 获取当前助手ID
      const currentAssistantId = localStorage.getItem('currentAssistant');
      console.log('useTopicManagement: 当前助手ID:', currentAssistantId);

      if (!currentAssistantId) {
        console.error('useTopicManagement: 未找到当前助手ID，无法关联话题');
      } else {
        // 使用AssistantService的addTopicToAssistant方法关联话题
        const success = AssistantService.addTopicToAssistant(currentAssistantId, newTopic.id);
        console.log(`useTopicManagement: 将话题关联到助手 ${success ? '成功' : '失败'}`);
        
        if (!success) {
          console.error('useTopicManagement: 添加话题到助手失败，尝试检查助手存储');
      const assistants = AssistantService.getUserAssistants();
          console.log('useTopicManagement: 当前助手列表:', assistants.map(a => ({id: a.id, name: a.name, topicIds: a.topicIds})));
        } else {
          // 验证关联是否成功
          const assistants = AssistantService.getUserAssistants();
          const assistant = assistants.find(a => a.id === currentAssistantId);
          if (assistant && assistant.topicIds?.includes(newTopic.id)) {
            console.log('useTopicManagement: 验证成功 - 话题已成功关联到助手的话题列表');
            
            // 新增：派发自定义事件通知侧边栏组件更新话题列表
            const event = new CustomEvent('topicCreated', {
              detail: { 
                topic: newTopic,
                assistantId: currentAssistantId
              }
            });
            window.dispatchEvent(event);
            console.log('useTopicManagement: 已派发topicCreated事件，通知组件更新');
          } else {
            console.error('useTopicManagement: 验证失败 - 话题未显示在助手的话题列表中');
          }
        }
      }

      // 设置为当前话题
      dispatch(setCurrentTopic(newTopic));
      console.log('useTopicManagement: 新话题已设置为当前话题');

      // 手动触发Redux store的变化，确保所有相关组件都能感知到更新
      dispatch({ type: 'FORCE_TOPICS_UPDATE' });
      console.log('useTopicManagement: 已派发强制更新事件');
      
      // 确保localStorage也被更新
      const currentTopics = [...topics, newTopic];
      localStorage.setItem('chatTopics', JSON.stringify(currentTopics));
      console.log('useTopicManagement: 已将更新后的话题列表保存到localStorage');

      return newTopic;
    } catch (error) {
      console.error('useTopicManagement: 创建新话题时出错:', error);
      return null;
    }
  };

  // 清空当前话题内容
  const handleClearTopic = () => {
    if (!currentTopic) return;

    console.log('useTopicManagement: 开始清空话题内容', currentTopic.id);

    // 创建一个空的消息数组
    dispatch(setTopicMessages({
      topicId: currentTopic.id,
      messages: []
    }));

    console.log('useTopicManagement: 已派发清空消息的action');

    // 更新本地存储
    try {
      const topicsJson = localStorage.getItem('chatTopics');
      if (topicsJson) {
        const savedTopics = JSON.parse(topicsJson);
        const updatedTopics = savedTopics.map((topic: ChatTopic) => {
          if (topic.id === currentTopic.id) {
            return { ...topic, messages: [] };
          }
          return topic;
        });
        localStorage.setItem('chatTopics', JSON.stringify(updatedTopics));
        console.log('useTopicManagement: 已更新localStorage中的话题消息');
        
        // 更新本地状态
        setTopics(updatedTopics);
        console.log('useTopicManagement: 已更新本地状态中的话题消息');
      }
    } catch (error) {
      console.error('更新本地存储失败:', error);
    }

    // 手动触发强制刷新事件，确保所有组件都能接收到更新
    dispatch({ type: 'FORCE_MESSAGES_UPDATE' });
    console.log('useTopicManagement: 已派发强制更新事件');
    
    // 派发自定义事件通知其他组件更新
    const event = new CustomEvent('topicCleared', {
      detail: { topicId: currentTopic.id }
    });
    window.dispatchEvent(event);
    console.log('useTopicManagement: 已派发topicCleared事件');
  };

  // 生成唯一ID
  const generateId = (): string => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  return {
    topics,
    handleNewTopic,
    handleClearTopic
  };
} 