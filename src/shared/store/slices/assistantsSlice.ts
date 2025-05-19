import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Assistant, ChatTopic } from '../../types/Assistant';

interface AssistantsState {
  assistants: Assistant[];
  currentAssistant: Assistant | null;
}

const initialState: AssistantsState = {
  assistants: [],
  currentAssistant: null
};

const assistantsSlice = createSlice({
  name: 'assistants',
  initialState,
  reducers: {
    setAssistants: (state, action: PayloadAction<Assistant[]>) => {
      state.assistants = action.payload;
    },
    setCurrentAssistant: (state, action: PayloadAction<Assistant | null>) => {
      state.currentAssistant = action.payload;
    },
    addTopic: (state, action: PayloadAction<{ assistantId: string; topic: ChatTopic }>) => {
      const { assistantId, topic } = action.payload;
      const assistant = state.assistants.find((a: Assistant) => a.id === assistantId);
      if (assistant) {
        if (!assistant.topicIds) {
          assistant.topicIds = [];
        }

        if (!assistant.topics) {
          assistant.topics = [];
        }

        if (!assistant.topicIds.includes(topic.id)) {
          assistant.topicIds.push(topic.id);
        }

        if (!assistant.topics.some((t: ChatTopic) => t.id === topic.id)) {
          assistant.topics.push(topic);
        }

        console.log(`[assistantsSlice] 添加话题 ${topic.id} 到助手 ${assistantId}，当前话题数量: ${assistant.topics.length}`);
      }
    },
    removeTopic: (state, action: PayloadAction<{ assistantId: string; topicId: string }>) => {
      const { assistantId, topicId } = action.payload;
      const assistant = state.assistants.find((a: Assistant) => a.id === assistantId);
      if (assistant) {
        assistant.topicIds = assistant.topicIds.filter((id: string) => id !== topicId);

        if (assistant.topics) {
          assistant.topics = assistant.topics.filter((t: ChatTopic) => t.id !== topicId);
        }

        console.log(`[assistantsSlice] 从助手 ${assistantId} 移除话题 ${topicId}，剩余话题数量: ${assistant.topics?.length || 0}`);
      }
    },
    updateTopic: (state, action: PayloadAction<{ assistantId: string; topic: ChatTopic }>) => {
      const { assistantId, topic } = action.payload;
      const assistant = state.assistants.find((a: Assistant) => a.id === assistantId);
      if (assistant) {
        if (!assistant.topics) {
          assistant.topics = [];
        }

        const index = assistant.topics.findIndex((t: ChatTopic) => t.id === topic.id);
        if (index !== -1) {
          assistant.topics[index] = topic;
          console.log(`[assistantsSlice] 更新助手 ${assistantId} 的话题 ${topic.id}`);
        } else {
          if (assistant.topicIds.includes(topic.id)) {
            assistant.topics.push(topic);
            console.log(`[assistantsSlice] 添加话题 ${topic.id} 到助手 ${assistantId} 的topics数组`);
          }
        }
      }
    },
    updateAssistantTopics: (state, action: PayloadAction<{ assistantId: string; topics: ChatTopic[] }>) => {
      const { assistantId, topics } = action.payload;
      const assistant = state.assistants.find((a: Assistant) => a.id === assistantId);
      if (assistant) {
        assistant.topics = topics;

        assistant.topicIds = topics.map(topic => topic.id);

        console.log(`[assistantsSlice] 更新助手 ${assistantId} 的话题，数量: ${topics.length}，topicIds: ${assistant.topicIds.join(', ')}`);
      }
    },
    // 添加新的reducers，类似电脑版
    addAssistant: (state, action: PayloadAction<Assistant>) => {
      // 检查是否已存在相同ID的助手
      const existingIndex = state.assistants.findIndex(a => a.id === action.payload.id);
      if (existingIndex !== -1) {
        // 如果存在，更新它
        state.assistants[existingIndex] = action.payload;
      } else {
        // 如果不存在，添加新助手
        state.assistants.push(action.payload);
      }
      console.log(`[assistantsSlice] 添加助手: ${action.payload.id} (${action.payload.name})`);
    },
    updateAssistant: (state, action: PayloadAction<Assistant>) => {
      const index = state.assistants.findIndex(a => a.id === action.payload.id);
      if (index !== -1) {
        state.assistants[index] = action.payload;

        // 如果更新的是当前选中的助手，也更新currentAssistant
        if (state.currentAssistant && state.currentAssistant.id === action.payload.id) {
          state.currentAssistant = action.payload;
        }

        console.log(`[assistantsSlice] 更新助手: ${action.payload.id} (${action.payload.name})`);
      }
    },
    removeAssistant: (state, action: PayloadAction<string>) => {
      const assistantId = action.payload;
      state.assistants = state.assistants.filter(a => a.id !== assistantId);

      // 如果删除的是当前选中的助手，清除currentAssistant
      if (state.currentAssistant && state.currentAssistant.id === assistantId) {
        state.currentAssistant = null;
      }

      console.log(`[assistantsSlice] 删除助手: ${assistantId}`);
    }
  }
});

export const {
  setAssistants,
  setCurrentAssistant,
  addTopic,
  removeTopic,
  updateTopic,
  updateAssistantTopics,
  addAssistant,
  updateAssistant,
  removeAssistant
} = assistantsSlice.actions;
export default assistantsSlice.reducer;