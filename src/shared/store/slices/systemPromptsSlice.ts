import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { SystemPromptTemplate } from '../../../pages/Settings/SystemPromptSettings';

export interface SystemPromptsState {
  templates: SystemPromptTemplate[];
  defaultPrompt: string;
}

const initialState: SystemPromptsState = {
  templates: [],
  defaultPrompt: '你是一个友好、专业、乐于助人的AI助手。你会以客观、准确的态度回答用户的问题，并在不确定的情况下坦诚表明。你可以协助用户完成各种任务，提供信息，或进行有意义的对话。'
};

// 从localStorage加载数据
try {
  const savedTemplates = localStorage.getItem('systemPromptTemplates');
  const defaultPrompt = localStorage.getItem('defaultSystemPrompt');
  
  if (savedTemplates) {
    initialState.templates = JSON.parse(savedTemplates);
  }
  
  if (defaultPrompt) {
    initialState.defaultPrompt = defaultPrompt;
  }
} catch (error) {
  console.error('加载系统提示词数据失败:', error);
}

const systemPromptsSlice = createSlice({
  name: 'systemPrompts',
  initialState,
  reducers: {
    saveSystemPromptTemplates: (state, action: PayloadAction<SystemPromptTemplate[]>) => {
      state.templates = action.payload;
      // 保存到localStorage
      localStorage.setItem('systemPromptTemplates', JSON.stringify(action.payload));
    },
    
    setDefaultSystemPrompt: (state, action: PayloadAction<string>) => {
      state.defaultPrompt = action.payload;
      // 保存到localStorage
      localStorage.setItem('defaultSystemPrompt', action.payload);
    },
    
    addPromptTemplate: (state, action: PayloadAction<SystemPromptTemplate>) => {
      state.templates.push(action.payload);
      // 保存到localStorage
      localStorage.setItem('systemPromptTemplates', JSON.stringify(state.templates));
    },
    
    updatePromptTemplate: (state, action: PayloadAction<SystemPromptTemplate>) => {
      const index = state.templates.findIndex(t => t.id === action.payload.id);
      if (index !== -1) {
        state.templates[index] = action.payload;
        // 保存到localStorage
        localStorage.setItem('systemPromptTemplates', JSON.stringify(state.templates));
      }
    },
    
    deletePromptTemplate: (state, action: PayloadAction<string>) => {
      state.templates = state.templates.filter(t => t.id !== action.payload);
      // 保存到localStorage
      localStorage.setItem('systemPromptTemplates', JSON.stringify(state.templates));
    }
  }
});

export const { 
  saveSystemPromptTemplates, 
  setDefaultSystemPrompt,
  addPromptTemplate,
  updatePromptTemplate,
  deletePromptTemplate
} = systemPromptsSlice.actions;

export default systemPromptsSlice.reducer; 