import { createSlice } from '@reduxjs/toolkit';
import type { Model } from '../types';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface ModelProvider {
  id: string;
  name: string;
  avatar: string;
  color: string;
  isEnabled: boolean;
  apiKey?: string;
  baseUrl?: string;
  models: Model[];
  providerType?: string;
}

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  language: string;
  sendWithEnter: boolean;
  enableNotifications: boolean;
  models: Model[];
  providers: ModelProvider[];
  defaultModelId?: string;
}

// 初始预设供应商
const initialProviders: ModelProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    avatar: 'O',
    color: '#10a37f',
    isEnabled: true,
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
  models: [
      { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', enabled: true, isDefault: true },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', enabled: true, isDefault: false },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', enabled: true, isDefault: false },
    ]
  },
  {
    id: 'gemini',
    name: 'Gemini',
    avatar: 'G',
    color: '#4285f4',
    isEnabled: true,
    apiKey: '',
    baseUrl: 'https://generativelanguage.googleapis.com/v1',
    models: [
      { id: 'gemini-2.0-pro', name: 'Gemini 2.0 Pro', provider: 'gemini', enabled: true, isDefault: false },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'gemini', enabled: true, isDefault: false },
    ]
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    avatar: 'A',
    color: '#b83280',
    isEnabled: true,
    apiKey: '',
    baseUrl: 'https://api.anthropic.com/v1',
    models: [
      { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'anthropic', enabled: true, isDefault: false },
      { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'anthropic', enabled: true, isDefault: false },
    ]
  }
];

// 从localStorage加载数据或使用初始状态
const loadFromStorage = (): SettingsState => {
  try {
    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      return {
        ...parsed,
        // 确保providers存在，如果不存在则使用默认值
        providers: parsed.providers || initialProviders
      };
    }
  } catch (e) {
    console.error('Failed to load settings from localStorage', e);
  }
  
  return {
    theme: 'system',
    fontSize: 16,
    language: 'zh-CN',
    sendWithEnter: true,
    enableNotifications: true,
    models: [],
    providers: initialProviders,
  };
};

const initialState: SettingsState = loadFromStorage();

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload;
      saveToStorage(state);
    },
    setFontSize: (state, action: PayloadAction<number>) => {
      state.fontSize = action.payload;
      saveToStorage(state);
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
      saveToStorage(state);
    },
    setSendWithEnter: (state, action: PayloadAction<boolean>) => {
      state.sendWithEnter = action.payload;
      saveToStorage(state);
    },
    setEnableNotifications: (state, action: PayloadAction<boolean>) => {
      state.enableNotifications = action.payload;
      saveToStorage(state);
    },
    addModel: (state, action: PayloadAction<Model>) => {
        state.models.push(action.payload);
      saveToStorage(state);
    },
    updateModel: (state, action: PayloadAction<{ id: string; updates: Partial<Model> }>) => {
      const { id, updates } = action.payload;
      const modelIndex = state.models.findIndex(model => model.id === id);
      if (modelIndex !== -1) {
        state.models[modelIndex] = { ...state.models[modelIndex], ...updates };
        saveToStorage(state);
      }
    },
    deleteModel: (state, action: PayloadAction<string>) => {
      state.models = state.models.filter(model => model.id !== action.payload);
      saveToStorage(state);
    },
    setDefaultModel: (state, action: PayloadAction<string>) => {
        state.models.forEach(model => {
        model.isDefault = model.id === action.payload;
      });
      saveToStorage(state);
    },
    // 新增：添加供应商
    addProvider: (state, action: PayloadAction<ModelProvider>) => {
      state.providers.push(action.payload);
      saveToStorage(state);
    },
    // 新增：更新供应商
    updateProvider: (state, action: PayloadAction<{ id: string; updates: Partial<ModelProvider> }>) => {
      const { id, updates } = action.payload;
      const providerIndex = state.providers.findIndex(provider => provider.id === id);
      if (providerIndex !== -1) {
        state.providers[providerIndex] = { ...state.providers[providerIndex], ...updates };
        
        // 如果apiKey或baseUrl更新了，也要更新所有关联模型
        if (updates.apiKey !== undefined || updates.baseUrl !== undefined) {
          state.providers[providerIndex].models = state.providers[providerIndex].models.map(model => ({
            ...model,
            apiKey: updates.apiKey !== undefined ? updates.apiKey : model.apiKey,
            baseUrl: updates.baseUrl !== undefined ? updates.baseUrl : model.baseUrl
          }));
        }
        
        saveToStorage(state);
      }
    },
    // 新增：删除供应商
    deleteProvider: (state, action: PayloadAction<string>) => {
      state.providers = state.providers.filter(provider => provider.id !== action.payload);
      saveToStorage(state);
    },
    // 新增：切换供应商启用状态
    toggleProviderEnabled: (state, action: PayloadAction<{ id: string; enabled: boolean }>) => {
      const { id, enabled } = action.payload;
      const providerIndex = state.providers.findIndex(provider => provider.id === id);
      if (providerIndex !== -1) {
        state.providers[providerIndex].isEnabled = enabled;
        saveToStorage(state);
      }
    },
    // 新增：添加模型到供应商
    addModelToProvider: (state, action: PayloadAction<{ providerId: string; model: Model }>) => {
      const { providerId, model } = action.payload;
      const providerIndex = state.providers.findIndex(provider => provider.id === providerId);
      if (providerIndex !== -1) {
        const provider = state.providers[providerIndex];
        state.providers[providerIndex].models.push({
          ...model,
          provider: providerId,
          providerType: provider.providerType || providerId,
          apiKey: provider.apiKey,
          baseUrl: provider.baseUrl
        });
        saveToStorage(state);
      }
    },
    // 新增：设置供应商默认模型
    setProviderDefaultModel: (state, action: PayloadAction<{ providerId: string; modelId: string }>) => {
      const { providerId, modelId } = action.payload;
      const providerIndex = state.providers.findIndex(provider => provider.id === providerId);
      if (providerIndex !== -1) {
        state.providers[providerIndex].models.forEach(model => {
          model.isDefault = model.id === modelId;
        });
        saveToStorage(state);
      }
    },
  },
});

// 保存到localStorage的辅助函数
const saveToStorage = (state: SettingsState) => {
  try {
    localStorage.setItem('settings', JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save settings to localStorage', e);
  }
};

export const { 
  setTheme, 
  setFontSize, 
  setLanguage, 
  setSendWithEnter, 
  setEnableNotifications,
  addModel,
  updateModel,
  deleteModel,
  setDefaultModel,
  addProvider,
  updateProvider,
  deleteProvider,
  toggleProviderEnabled,
  addModelToProvider,
  setProviderDefaultModel,
} = settingsSlice.actions;

export default settingsSlice.reducer;
