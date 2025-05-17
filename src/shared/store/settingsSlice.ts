import { createSlice } from '@reduxjs/toolkit';
import type { Model } from '../types';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { GeneratedImage } from '../types';
import { ThinkingDisplayStyle } from '../../components/message/ThinkingProcess';

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
  currentModelId?: string;
  generatedImages?: GeneratedImage[];
  autoNameTopic: boolean;
  topicNamingModelId?: string;
  modelSelectorStyle: 'dialog' | 'dropdown';
  thinkingDisplayStyle: string;
  toolbarDisplayStyle: 'icon' | 'text' | 'both'; // 工具栏显示样式：仅图标、仅文字、图标+文字
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
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    avatar: 'D',
    color: '#754AB4',
    isEnabled: true,
    apiKey: '',
    baseUrl: 'https://api.deepseek.com',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek-V3', provider: 'deepseek', enabled: true, isDefault: false },
      { id: 'deepseek-reasoner', name: 'DeepSeek-R1', provider: 'deepseek', enabled: true, isDefault: false },
    ]
  },
  {
    id: 'volcengine',
    name: '火山引擎',
    avatar: 'V',
    color: '#ff3d00',
    isEnabled: true,
    apiKey: '',
    baseUrl: 'https://api.volcengine.com/v1',
    providerType: 'volcengine',
    models: [
      { id: 'doubao-1.5-pro', name: '豆包 1.5 Pro', provider: 'volcengine', enabled: true, isDefault: false, description: '豆包大模型专业版' },
      { id: 'doubao-1.5-lite', name: '豆包 1.5 Lite', provider: 'volcengine', enabled: true, isDefault: false, description: '豆包大模型轻量版' },
      { id: 'doubao-1.5-thinking-pro', name: '豆包 1.5 Thinking Pro', provider: 'volcengine', enabled: true, isDefault: false, description: '豆包大模型思考专业版' },
      { id: 'deepseek-r1', name: 'DeepSeek R1', provider: 'volcengine', enabled: true, isDefault: false, description: 'DeepSeek R1大模型' }
    ]
  }
];

// 获取默认模型ID
const getDefaultModelId = (providers: ModelProvider[]): string | undefined => {
  for (const provider of providers) {
    if (provider.isEnabled) {
      const defaultModel = provider.models.find(m => m.isDefault && m.enabled);
      if (defaultModel) return defaultModel.id;

      // 如果没有默认模型，取第一个启用的模型
      const firstEnabledModel = provider.models.find(m => m.enabled);
      if (firstEnabledModel) return firstEnabledModel.id;
    }
  }
  return undefined;
};

// 从localStorage加载数据或使用初始状态
const loadFromStorage = (): SettingsState => {
  try {
    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      const providers = parsed.providers || initialProviders;

      // 如果没有存储当前模型ID，使用默认模型ID
      if (!parsed.currentModelId) {
        parsed.currentModelId = parsed.defaultModelId || getDefaultModelId(providers);
      }

      // 如果没有思考过程显示样式设置，使用默认值
      if (!parsed.thinkingDisplayStyle) {
        parsed.thinkingDisplayStyle = ThinkingDisplayStyle.COMPACT;
      }

      // 如果没有工具栏显示样式设置，使用默认值
      if (!parsed.toolbarDisplayStyle) {
        parsed.toolbarDisplayStyle = 'both';
      }

      return {
        ...parsed,
        providers
      };
    }
  } catch (e) {
    console.error('Failed to load settings from localStorage', e);
  }
  
  // 初始状态
  const defaultState = {
    theme: 'system' as 'light' | 'dark' | 'system',
    fontSize: 16,
    language: 'zh-CN',
    sendWithEnter: true,
    enableNotifications: true,
    models: [],
    providers: initialProviders,
    autoNameTopic: true,
    modelSelectorStyle: 'dialog' as 'dialog' | 'dropdown',
    thinkingDisplayStyle: ThinkingDisplayStyle.COMPACT, // 默认使用紧凑型显示样式
    toolbarDisplayStyle: 'both' as 'icon' | 'text' | 'both', // 默认显示图标+文字
  };

  // 设置默认模型
  const defaultModelId = getDefaultModelId(initialProviders);
  return {
    ...defaultState,
    defaultModelId,
    currentModelId: defaultModelId
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
      const modelId = action.payload;

      // 从全局models数组中删除模型
      state.models = state.models.filter(model => model.id !== modelId);

      // 从所有provider的models数组中删除模型
      state.providers.forEach((provider, index) => {
        state.providers[index].models = provider.models.filter(model => model.id !== modelId);
      });

      // 如果删除的是默认模型，需要重新设置默认模型
      if (state.defaultModelId === modelId) {
        // 尝试找到新的默认模型
        const firstAvailableModel = state.providers
          .flatMap(provider => provider.models)
          .find(model => model.enabled);

        if (firstAvailableModel) {
          state.defaultModelId = firstAvailableModel.id;
          firstAvailableModel.isDefault = true;
        } else {
          state.defaultModelId = undefined;
        }
      }

      // 如果删除的是当前选中的模型，需要重新设置当前模型
      if (state.currentModelId === modelId) {
        state.currentModelId = state.defaultModelId;
      }

      saveToStorage(state);
    },
    setDefaultModel: (state, action: PayloadAction<string>) => {
        state.models.forEach(model => {
        model.isDefault = model.id === action.payload;
      });
      state.defaultModelId = action.payload;
      saveToStorage(state);
    },
    // 新增：设置当前选择的模型
    setCurrentModel: (state, action: PayloadAction<string>) => {
      state.currentModelId = action.payload;
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
    // 新增：从供应商中删除模型
    deleteModelFromProvider: (state, action: PayloadAction<{ providerId: string; modelId: string }>) => {
      const { providerId, modelId } = action.payload;
      const providerIndex = state.providers.findIndex(provider => provider.id === providerId);

      if (providerIndex !== -1) {
        // 从provider的models数组中删除模型
        state.providers[providerIndex].models = state.providers[providerIndex].models.filter(
          model => model.id !== modelId
        );

        // 如果删除的是默认模型，需要重新设置默认模型
        if (state.defaultModelId === modelId) {
          // 尝试找到新的默认模型
          const firstAvailableModel = state.providers[providerIndex].models.find(model => model.enabled);

          if (firstAvailableModel) {
            state.defaultModelId = firstAvailableModel.id;
            firstAvailableModel.isDefault = true;
          } else {
            state.defaultModelId = undefined;
          }
        }

        // 如果删除的是当前选中的模型，需要重新设置当前模型
        if (state.currentModelId === modelId) {
          state.currentModelId = state.defaultModelId;
        }

        saveToStorage(state);
      }
    },
    // 添加保存生成图像的actions
    addGeneratedImage: (state, action: PayloadAction<GeneratedImage>) => {
      // 初始化generatedImages数组（如果不存在）
      if (!state.generatedImages) {
        state.generatedImages = [];
      }
      
      // 添加新生成的图像
      state.generatedImages.unshift(action.payload);
      
      // 限制保存的历史图像数量（保存最近的50张）
      if (state.generatedImages.length > 50) {
        state.generatedImages = state.generatedImages.slice(0, 50);
      }
      
      // 保存到localStorage
      saveToStorage(state);
    },
    // 添加删除图像的action
    deleteGeneratedImage: (state, action: PayloadAction<string>) => {
      // 如果generatedImages不存在，直接返回
      if (!state.generatedImages) {
        return;
      }
      
      // 根据图像URL删除
      state.generatedImages = state.generatedImages.filter(
        image => image.url !== action.payload
      );
      
      // 保存到localStorage
      saveToStorage(state);
    },
    // 添加清除所有图像的action
    clearGeneratedImages: (state) => {
      state.generatedImages = [];
      
      // 保存到localStorage
      saveToStorage(state);
    },
    // 更新设置
    updateSettings: (state, action: PayloadAction<Partial<SettingsState>>) => {
      Object.assign(state, action.payload);
      saveToStorage(state);
    },
    setModelSelectorStyle: (state, action: PayloadAction<'dialog' | 'dropdown'>) => {
      state.modelSelectorStyle = action.payload;
      saveToStorage(state);
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

// 导出actions
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
  setCurrentModel,
  addProvider,
  updateProvider,
  deleteProvider,
  toggleProviderEnabled,
  addModelToProvider,
  setProviderDefaultModel,
  deleteModelFromProvider,
  addGeneratedImage,
  deleteGeneratedImage,
  clearGeneratedImages,
  updateSettings,
  setModelSelectorStyle,
} = settingsSlice.actions;

export default settingsSlice.reducer;
