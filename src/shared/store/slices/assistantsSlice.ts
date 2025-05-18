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
        if (!assistant.topicIds.includes(topic.id)) {
          assistant.topicIds.push(topic.id);
        }
        if (!assistant.topics) {
          assistant.topics = [];
        }
        if (!assistant.topics.some((t: ChatTopic) => t.id === topic.id)) {
          assistant.topics.push(topic);
        }
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
        } else {
          if (assistant.topicIds.includes(topic.id)) {
             assistant.topics.push(topic);
          }
        }
      }
    },
    updateAssistantTopics: (state, action: PayloadAction<{ assistantId: string; topics: ChatTopic[] }>) => {
      const { assistantId, topics } = action.payload;
      const assistant = state.assistants.find((a: Assistant) => a.id === assistantId);
      if (assistant) {
        assistant.topics = topics;
      }
    },
    // 其他 reducers...
  }
});

export const { 
  setAssistants, 
  setCurrentAssistant, 
  addTopic, 
  removeTopic, 
  updateTopic, 
  updateAssistantTopics 
} = assistantsSlice.actions;
export default assistantsSlice.reducer; 