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
        return [];
      }
    }
    return [];
  };

  // 处理新建话题
  const handleNewTopic = () => {
    try {
      // 创建一个新的话题
      const newTopic = {
        id: generateId(),
        title: '新话题 ' + new Date().toLocaleTimeString(),
        lastMessageTime: new Date().toISOString(),
        messages: []
      };

      // 添加到Redux
      dispatch(createTopic(newTopic));

      // 刷新话题列表
      setTopics([newTopic, ...topics]);

      // 获取当前助手ID
      const currentAssistantId = localStorage.getItem('currentAssistant');
      console.log('当前助手ID:', currentAssistantId);

      if (!currentAssistantId) {
        console.error('未找到当前助手ID，无法关联话题');
        return;
      }

      // 获取助手列表
      const assistants = AssistantService.getUserAssistants();
      const currentAssistant = assistants.find(a => a.id === currentAssistantId);

      if (!currentAssistant) {
        console.error(`未找到ID为${currentAssistantId}的助手`);
        return;
      }

      console.log(`正在将话题"${newTopic.title}"(${newTopic.id})关联到助手"${currentAssistant.name}"(${currentAssistant.id})`);

      // 将话题与当前助手关联 - 更新助手对象
      const updatedAssistant = {
        ...currentAssistant,
        topicIds: [...(currentAssistant.topicIds || []), newTopic.id]
      };

      // 保存更新的助手到localStorage
      const success = AssistantService.updateAssistant(updatedAssistant);

      if (success) {
        console.log(`成功将话题"${newTopic.title}"关联到助手"${currentAssistant.name}"`);

        // 再次验证关联是否成功
        const updatedAssistants = AssistantService.getUserAssistants();
        const updatedCurrentAssistant = updatedAssistants.find(a => a.id === currentAssistantId);

        if (updatedCurrentAssistant && updatedCurrentAssistant.topicIds?.includes(newTopic.id)) {
          console.log('验证成功：话题已成功关联到助手的话题列表');
          console.log('助手的话题ID列表:', updatedCurrentAssistant.topicIds);
        } else {
          console.error('验证失败：话题未显示在助手的话题列表中');
          // 使用另一种方法尝试关联
          AssistantService.addTopicToAssistant(currentAssistantId, newTopic.id);
        }
      } else {
        console.error(`无法更新助手"${currentAssistant.name}"的话题列表`);
        // 使用另一种方法尝试关联
        AssistantService.addTopicToAssistant(currentAssistantId, newTopic.id);
      }

      // 设置为当前话题
      dispatch(setCurrentTopic(newTopic));

      // 派发一个自定义事件，通知应用新话题已创建
      const topicCreatedEvent = new CustomEvent('topicCreated', {
        detail: { topic: newTopic, assistantId: currentAssistantId }
      });
      window.dispatchEvent(topicCreatedEvent);

      // 手动触发Redux store的变化，确保所有相关组件都能感知到更新
      dispatch({ type: 'FORCE_TOPICS_UPDATE' });

      console.log('已派发话题创建事件，通知应用刷新话题列表');
    } catch (error) {
      console.error('创建新话题时出错:', error);
    }
  };

  // 清空当前话题内容
  const handleClearTopic = () => {
    if (!currentTopic) return;

    // 创建一个空的消息数组
    dispatch(setTopicMessages({
      topicId: currentTopic.id,
      messages: []
    }));

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
      }
    } catch (error) {
      console.error('更新本地存储失败:', error);
    }
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