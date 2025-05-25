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
  isSystem?: boolean; // 标记是否为系统供应商
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
  enableTopicNaming: boolean; // 统一字段名称，与最佳实例保持一致
  topicNamingModelId?: string;
  topicNamingPrompt: string; // 添加自定义提示词配置
  modelSelectorStyle: 'dialog' | 'dropdown';
  thinkingDisplayStyle: string;
  toolbarDisplayStyle: 'icon' | 'text' | 'both'; // 工具栏显示样式：仅图标、仅文字、图标+文字
  inputBoxStyle: 'default' | 'modern' | 'minimal'; // 输入框风格：默认、现代、简约
  inputLayoutStyle: 'default' | 'compact'; // 输入框布局样式：默认（分离）或聚合
  showSystemPromptBubble: boolean; // 是否显示系统提示词气泡
  showUserAvatar: boolean; // 是否显示用户头像
  showUserName: boolean; // 是否显示用户名称
  showModelAvatar: boolean; // 是否显示模型头像
  showModelName: boolean; // 是否显示模型名称
  messageStyle: 'plain' | 'bubble'; // 消息样式：简洁或气泡
  renderUserInputAsMarkdown: boolean; // 是否渲染用户输入的markdown
  // 顶部工具栏设置
  topToolbar: {
    showSettingsButton: boolean; // 是否显示设置按钮
    showModelSelector: boolean; // 是否显示模型选择器
    modelSelectorStyle: 'full' | 'icon'; // 模型选择器样式：完整显示或图标
    showChatTitle: boolean; // 是否显示"对话"标题
    showTopicName: boolean; // 是否显示话题名称
    showNewTopicButton: boolean; // 是否显示新建话题按钮
    showClearButton: boolean; // 是否显示清空按钮
    showMenuButton: boolean; // 是否显示菜单按钮
    // 组件顺序配置
    leftComponents: string[]; // 左侧组件顺序
    rightComponents: string[]; // 右侧组件顺序
  };
  isLoading: boolean; // 添加加载状态以处理异步操作

  // 思考过程自动折叠
  thoughtAutoCollapse?: boolean;

  // 多模型对比显示样式
  multiModelDisplayStyle?: 'horizontal' | 'grid' | 'vertical';

  // 工具调用显示详情
  showToolDetails?: boolean;

  // 引用显示详情
  showCitationDetails?: boolean;

  // 消息气泡宽度设置
  messageBubbleMinWidth?: number; // 最小宽度百分比 (10-90)
  messageBubbleMaxWidth?: number; // 最大宽度百分比 (50-100)
  userMessageMaxWidth?: number;   // 用户消息最大宽度百分比 (50-100)

  // 工具栏折叠状态
  toolbarCollapsed?: boolean; // 工具栏是否折叠
}

// 初始预设供应商
const initialProviders: ModelProvider[] = [
  {
    id: 'model-combo',
    name: '模型组合',
    avatar: '🧠',
    color: '#f43f5e',
    isEnabled: true,
    apiKey: '',
    baseUrl: '',
    isSystem: true, // 标记为系统供应商
    models: [] // 动态从模型组合服务加载
  },
  {
    id: 'openai',
    name: 'OpenAI',
    avatar: 'O',
    color: '#10a37f',
    isEnabled: true,
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    providerType: 'openai',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', enabled: true, isDefault: true },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', enabled: true, isDefault: false },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', enabled: true, isDefault: false },
      { id: 'o1', name: 'o1', provider: 'openai', enabled: true, isDefault: false },
      { id: 'o1-mini', name: 'o1-mini', provider: 'openai', enabled: true, isDefault: false },
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
    providerType: 'gemini',
    models: [
      { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Experimental', provider: 'gemini', enabled: true, isDefault: false },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'gemini', enabled: true, isDefault: false },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'gemini', enabled: true, isDefault: false },
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
    providerType: 'anthropic',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic', enabled: true, isDefault: false },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'anthropic', enabled: true, isDefault: false },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic', enabled: true, isDefault: false },
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
    providerType: 'openai',
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
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    providerType: 'volcengine',
    models: [
      { id: 'doubao-1.5-pro', name: '豆包 1.5 Pro', provider: 'volcengine', enabled: true, isDefault: false, description: '豆包大模型专业版' },
      { id: 'doubao-1.5-lite', name: '豆包 1.5 Lite', provider: 'volcengine', enabled: true, isDefault: false, description: '豆包大模型轻量版' },
      { id: 'doubao-1.5-thinking-pro', name: '豆包 1.5 Thinking Pro', provider: 'volcengine', enabled: true, isDefault: false, description: '豆包大模型思考专业版' },
      { id: 'deepseek-r1', name: 'DeepSeek R1', provider: 'volcengine', enabled: true, isDefault: false, description: 'DeepSeek R1大模型' }
    ]
  },
  {
    id: 'zhipu',
    name: '智谱AI',
    avatar: '智',
    color: '#4f46e5',
    isEnabled: true,
    apiKey: '',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4/',
    providerType: 'zhipu',
    models: [
      { id: 'glm-4-0520', name: 'GLM-4-0520', provider: 'zhipu', enabled: true, isDefault: false, description: 'GLM-4最新版本，性能优化' },
      { id: 'glm-4-plus', name: 'GLM-4-Plus', provider: 'zhipu', enabled: true, isDefault: false, description: 'GLM-4增强版，更强推理能力' },
      { id: 'glm-4-long', name: 'GLM-4-Long', provider: 'zhipu', enabled: true, isDefault: false, description: 'GLM-4长文本版，支持超长上下文' },
      { id: 'glm-4-air', name: 'GLM-4-Air', provider: 'zhipu', enabled: true, isDefault: false, description: 'GLM-4轻量版，快速响应' },
      { id: 'glm-4-airx', name: 'GLM-4-AirX', provider: 'zhipu', enabled: true, isDefault: false, description: 'GLM-4轻量增强版' },
      { id: 'glm-4-flash', name: 'GLM-4-Flash', provider: 'zhipu', enabled: true, isDefault: false, description: 'GLM-4极速版，超快响应' },
      { id: 'glm-4-flashx', name: 'GLM-4-FlashX', provider: 'zhipu', enabled: true, isDefault: false, description: 'GLM-4极速增强版' },
      { id: 'glm-4v', name: 'GLM-4V', provider: 'zhipu', enabled: true, isDefault: false, description: 'GLM-4视觉版，支持图像理解' },
      { id: 'glm-4v-flash', name: 'GLM-4V-Flash', provider: 'zhipu', enabled: true, isDefault: false, description: 'GLM-4V极速版' },
      { id: 'glm-4v-plus', name: 'GLM-4V-Plus', provider: 'zhipu', enabled: true, isDefault: false, description: 'GLM-4V增强版' },
      { id: 'glm-4-alltools', name: 'GLM-4-AllTools', provider: 'zhipu', enabled: true, isDefault: false, description: 'GLM-4全工具版，支持网络搜索等工具' }
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
    enableTopicNaming: true, // 统一字段名称，与最佳实例保持一致
    topicNamingPrompt: '', // 添加默认空提示词
    modelSelectorStyle: 'dialog' as 'dialog' | 'dropdown',
    thinkingDisplayStyle: ThinkingDisplayStyle.COMPACT,
    toolbarDisplayStyle: 'both' as 'icon' | 'text' | 'both',
    inputBoxStyle: 'default' as 'default' | 'modern' | 'minimal', // 默认输入框风格
    inputLayoutStyle: 'default' as 'default' | 'compact', // 输入框布局样式：默认（分离）或聚合
    showSystemPromptBubble: true, // 默认显示系统提示词气泡
    showUserAvatar: true, // 默认显示用户头像
    showUserName: true, // 默认显示用户名称
    showModelAvatar: true, // 默认显示模型头像
    showModelName: true, // 默认显示模型名称
    messageStyle: 'bubble' as 'plain' | 'bubble', // 默认使用气泡样式
    renderUserInputAsMarkdown: true, // 默认渲染用户输入的markdown
    // 顶部工具栏默认设置
    topToolbar: {
      showSettingsButton: true, // 默认显示设置按钮
      showModelSelector: true, // 默认显示模型选择器
      modelSelectorStyle: 'full', // 默认完整显示模型选择器
      showChatTitle: true, // 默认显示"对话"标题
      showTopicName: false, // 默认不显示话题名称
      showNewTopicButton: false, // 默认不显示新建话题按钮
      showClearButton: false, // 默认不显示清空按钮
      showMenuButton: true, // 默认显示菜单按钮
      // 默认组件顺序
      leftComponents: ['menuButton', 'chatTitle', 'topicName', 'newTopicButton', 'clearButton'],
      rightComponents: ['modelSelector', 'settingsButton'],
    },
    isLoading: true, // 初始时设为加载中状态

    // 消息气泡宽度默认设置
    messageBubbleMinWidth: 50, // 默认最小宽度50%
    messageBubbleMaxWidth: 99, // 默认AI消息最大宽度99%
    userMessageMaxWidth: 80,   // 默认用户消息最大宽度80%

    // 工具栏默认设置
    toolbarCollapsed: false    // 默认工具栏不折叠
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
      let providers = savedSettings.providers || initialProviders;

      // 确保模型组合供应商始终存在
      const hasModelComboProvider = providers.some(p => p.id === 'model-combo');
      if (!hasModelComboProvider) {
        // 如果没有模型组合供应商，添加到列表开头
        const modelComboProvider = initialProviders.find(p => p.id === 'model-combo');
        if (modelComboProvider) {
          providers = [modelComboProvider, ...providers];
        }
      }

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

      // 如果没有输入框风格设置，使用默认值
      if (!savedSettings.inputBoxStyle) {
        savedSettings.inputBoxStyle = 'default';
      }

      // 如果没有输入框布局样式设置，使用默认值
      if (!savedSettings.inputLayoutStyle) {
        savedSettings.inputLayoutStyle = 'default';
      }

      // 如果没有系统提示词气泡显示设置，使用默认值
      if (savedSettings.showSystemPromptBubble === undefined) {
        savedSettings.showSystemPromptBubble = true;
      }

      // 如果没有模型选择器样式设置，使用默认值
      if (!savedSettings.modelSelectorStyle) {
        savedSettings.modelSelectorStyle = 'dialog';
      }

      // 如果没有消息气泡宽度设置，使用默认值
      if (savedSettings.messageBubbleMinWidth === undefined) {
        savedSettings.messageBubbleMinWidth = 50;
      }
      if (savedSettings.messageBubbleMaxWidth === undefined) {
        savedSettings.messageBubbleMaxWidth = 99;
      }
      if (savedSettings.userMessageMaxWidth === undefined) {
        savedSettings.userMessageMaxWidth = 80;
      }

      // 如果没有工具栏折叠设置，使用默认值
      if (savedSettings.toolbarCollapsed === undefined) {
        savedSettings.toolbarCollapsed = false;
      }

      // 如果没有消息样式设置，使用默认值
      if (!savedSettings.messageStyle) {
        savedSettings.messageStyle = 'bubble';
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

    // 更新模型组合供应商的模型列表
    updateModelComboModels: (state, action: PayloadAction<any[]>) => {
      const comboProvider = state.providers.find(p => p.id === 'model-combo');
      if (comboProvider) {
        comboProvider.models = action.payload;
      }
    },
    // 话题命名相关的action creators
    setEnableTopicNaming: (state, action: PayloadAction<boolean>) => {
      state.enableTopicNaming = action.payload;
    },
    setTopicNamingPrompt: (state, action: PayloadAction<string>) => {
      state.topicNamingPrompt = action.payload;
    },
    setTopicNamingModelId: (state, action: PayloadAction<string>) => {
      state.topicNamingModelId = action.payload;
    },
    setMessageStyle: (state, action: PayloadAction<'plain' | 'bubble'>) => {
      state.messageStyle = action.payload;
    },
    setRenderUserInputAsMarkdown: (state, action: PayloadAction<boolean>) => {
      state.renderUserInputAsMarkdown = action.payload;
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
  updateModelComboModels,
  // 话题命名相关的actions
  setEnableTopicNaming,
  setTopicNamingPrompt,
  setTopicNamingModelId,
  // 消息样式相关的actions
  setMessageStyle,
  setRenderUserInputAsMarkdown,
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
