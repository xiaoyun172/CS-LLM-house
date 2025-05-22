import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Model } from '../types';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { GeneratedImage } from '../types';
import { ThinkingDisplayStyle } from '../../components/message/blocks/ThinkingBlock';
import { getStorageItem, setStorageItem } from '../utils/storage';

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
  showSystemPromptBubble: boolean; // 是否显示系统提示词气泡
  isLoading: boolean; // 添加加载状态以处理异步操作

  // 思考过程自动折叠
  thoughtAutoCollapse?: boolean;

  // 多模型对比显示样式
  multiModelDisplayStyle?: 'horizontal' | 'grid' | 'vertical';

  // 工具调用显示详情
  showToolDetails?: boolean;

  // 引用显示详情
  showCitationDetails?: boolean;
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

// 初始化默认状态
const getInitialState = (): SettingsState => {
  // 默认状态
  const defaultState: SettingsState = {
    theme: 'system' as 'light' | 'dark' | 'system',
    fontSize: 16,
    language: 'zh-CN',
    sendWithEnter: true,
    enableNotifications: true,
    models: [],
    providers: initialProviders,
    autoNameTopic: true,
    modelSelectorStyle: 'dialog' as 'dialog' | 'dropdown',
    thinkingDisplayStyle: ThinkingDisplayStyle.COMPACT,
    toolbarDisplayStyle: 'both' as 'icon' | 'text' | 'both',
    showSystemPromptBubble: true, // 默认显示系统提示词气泡
    isLoading: true // 初始时设为加载中状态
  };

  // 设置默认模型
  const defaultModelId = getDefaultModelId(initialProviders);
  return {
    ...defaultState,
    defaultModelId,
    currentModelId: defaultModelId
  };
};

// 创建异步加载设置的thunk
export const loadSettings = createAsyncThunk('settings/load', async () => {
  try {
    const savedSettings = await getStorageItem<SettingsState>('settings');
    if (savedSettings) {
      const providers = savedSettings.providers || initialProviders;

      // 如果没有存储当前模型ID，使用默认模型ID
      if (!savedSettings.currentModelId) {
        savedSettings.currentModelId = savedSettings.defaultModelId || getDefaultModelId(providers);
      }

      // 如果没有思考过程显示样式设置，使用默认值
      if (!savedSettings.thinkingDisplayStyle) {
        savedSettings.thinkingDisplayStyle = ThinkingDisplayStyle.COMPACT;
      }

      // 如果没有工具栏显示样式设置，使用默认值
      if (!savedSettings.toolbarDisplayStyle) {
        savedSettings.toolbarDisplayStyle = 'both';
      }

      // 如果没有系统提示词气泡显示设置，使用默认值
      if (savedSettings.showSystemPromptBubble === undefined) {
        savedSettings.showSystemPromptBubble = true;
      }

      return {
        ...savedSettings,
        providers
      };
    }

    // 如果没有保存的设置，返回null让reducer使用默认值
    return null;
  } catch (e) {
    console.error('Failed to load settings from storage', e);
    return null;
  }
});

// 创建异步保存设置的thunk
export const saveSettings = createAsyncThunk('settings/save', async (state: SettingsState) => {
  try {
    await setStorageItem('settings', state);
    return true;
  } catch (e) {
    console.error('Failed to save settings to storage', e);
    return false;
  }
});

const initialState = getInitialState();

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload;
      // 异步操作将通过 extraReducers 处理
    },
    setFontSize: (state, action: PayloadAction<number>) => {
      state.fontSize = action.payload;
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
    setSendWithEnter: (state, action: PayloadAction<boolean>) => {
      state.sendWithEnter = action.payload;
    },
    setEnableNotifications: (state, action: PayloadAction<boolean>) => {
      state.enableNotifications = action.payload;
    },
    addModel: (state, action: PayloadAction<Model>) => {
        state.models.push(action.payload);
    },
    updateModel: (state, action: PayloadAction<{ id: string; updates: Partial<Model> }>) => {
      const { id, updates } = action.payload;
      const modelIndex = state.models.findIndex(model => model.id === id);
      if (modelIndex !== -1) {
        state.models[modelIndex] = { ...state.models[modelIndex], ...updates };
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
    },
    setDefaultModel: (state, action: PayloadAction<string>) => {
        state.models.forEach(model => {
        model.isDefault = model.id === action.payload;
      });
      state.defaultModelId = action.payload;
    },
    setCurrentModel: (state, action: PayloadAction<string>) => {
      state.currentModelId = action.payload;
    },
    addProvider: (state, action: PayloadAction<ModelProvider>) => {
      state.providers.push(action.payload);
    },
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
      }
    },
    deleteProvider: (state, action: PayloadAction<string>) => {
      state.providers = state.providers.filter(provider => provider.id !== action.payload);
    },
    toggleProviderEnabled: (state, action: PayloadAction<{ id: string; enabled: boolean }>) => {
      const { id, enabled } = action.payload;
      const providerIndex = state.providers.findIndex(provider => provider.id === id);
      if (providerIndex !== -1) {
        state.providers[providerIndex].isEnabled = enabled;
      }
    },
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
      }
    },
    setProviderDefaultModel: (state, action: PayloadAction<{ providerId: string; modelId: string }>) => {
      const { providerId, modelId } = action.payload;
      const providerIndex = state.providers.findIndex(provider => provider.id === providerId);
      if (providerIndex !== -1) {
        state.providers[providerIndex].models.forEach(model => {
          model.isDefault = model.id === modelId;
        });
      }
    },
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
      }
    },
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
    },
    deleteGeneratedImage: (state, action: PayloadAction<string>) => {
      // 如果generatedImages不存在，直接返回
      if (!state.generatedImages) {
        return;
      }

      // 根据图像URL删除
      state.generatedImages = state.generatedImages.filter(
        image => image.url !== action.payload
      );
    },
    clearGeneratedImages: (state) => {
      state.generatedImages = [];
    },
    updateSettings: (state, action: PayloadAction<Partial<SettingsState>>) => {
      Object.assign(state, action.payload);
    },
    setModelSelectorStyle: (state, action: PayloadAction<'dialog' | 'dropdown'>) => {
      state.modelSelectorStyle = action.payload;
    },
  },
  extraReducers: (builder) => {
    // 处理加载设置
    builder
      .addCase(loadSettings.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadSettings.fulfilled, (state, action) => {
        if (action.payload) {
          // 合并加载的设置与当前状态
          return {
            ...action.payload,
            isLoading: false
          };
        }
        state.isLoading = false;
      })
      .addCase(loadSettings.rejected, (state) => {
        state.isLoading = false;
      })
      // 统一的响应保存设置操作的处理
      .addCase(saveSettings.pending, () => {
        // 可以在这里设置保存中的状态标记，如果需要的话
      })
      .addCase(saveSettings.fulfilled, () => {
        // 保存完成后的处理，如果需要的话
      })
      .addCase(saveSettings.rejected, () => {
        // 保存失败的处理，如果需要的话
      });
  }
});

// 导出操作
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

// 重用现有的action creators，但添加异步保存
export const saveSettingsToStorage = (state: RootState) => (
  async (dispatch: any) => {
    try {
      // 触发异步保存
      await dispatch(saveSettings(state.settings));
    } catch (error) {
      console.error('保存设置时出错:', error);
    }
  }
);

// 中间件，用于在每次状态更改后保存
export const settingsMiddleware = (store: any) => (next: any) => (action: any) => {
  // 首先让reducer处理action
  const result = next(action);

  // 如果是设置相关的action，自动保存状态
  if (action.type.startsWith('settings/') &&
      !action.type.includes('load') &&
      !action.type.includes('save')) {
    store.dispatch(saveSettings(store.getState().settings));
  }

  return result;
};

export default settingsSlice.reducer;

// 用于TypeScript的RootState类型提示
interface RootState {
  settings: SettingsState;
}
