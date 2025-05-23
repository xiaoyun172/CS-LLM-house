import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { WebSearchSettings, WebSearchCustomProvider, WebSearchProvider, WebSearchProviderConfig } from '../../types';
import { getStorageItem, setStorageItem } from '../../utils/storage';

// 存储键名
const STORAGE_KEY = 'webSearchSettings';

// 默认提供商配置 - 包含付费服务和本地搜索引擎
const getDefaultProviders = (): WebSearchProviderConfig[] => [
  {
    id: 'tavily',
    name: 'Tavily',
    apiHost: 'https://api.tavily.com',
    apiKey: ''
  },
  {
    id: 'searxng',
    name: 'Searxng',
    apiHost: '',
    basicAuthUsername: '',
    basicAuthPassword: ''
  },
  {
    id: 'exa',
    name: 'Exa',
    apiHost: 'https://api.exa.ai',
    apiKey: ''
  },
  {
    id: 'bocha',
    name: 'Bocha',
    apiHost: 'https://api.bochaai.com',
    apiKey: ''
  },
  {
    id: 'firecrawl',
    name: 'Firecrawl',
    apiHost: 'https://api.firecrawl.dev',
    apiKey: ''
  },
  {
    id: 'local-google',
    name: 'Google',
    url: 'https://www.google.com/search?q=%s'
  },
  {
    id: 'local-bing',
    name: 'Bing',
    url: 'https://cn.bing.com/search?q=%s&ensearch=1'
  }
];

// 从IndexedDB加载初始状态
const loadFromStorage = async (): Promise<WebSearchSettings> => {
  try {
    const savedSettings = await getStorageItem<WebSearchSettings>(STORAGE_KEY);
    if (savedSettings) {
      // 确保包含所有必需的字段
      return {
        ...savedSettings,
        searchWithTime: savedSettings.searchWithTime ?? false,
        excludeDomains: savedSettings.excludeDomains ?? [],
        providers: savedSettings.providers ?? getDefaultProviders()
      };
    }
  } catch (error) {
    console.error('Failed to load webSearchSettings from IndexedDB', error);
  }

  // 默认初始状态
  return {
    enabled: false,
    provider: 'tavily',
    apiKey: '',
    includeInContext: true,
    maxResults: 5,
    showTimestamp: true,
    filterSafeSearch: true,
    searchMode: 'manual',
    searchWithTime: false,
    excludeDomains: [],
    providers: getDefaultProviders(),
    customProviders: []
  };
};

// 定义初始状态（首次加载使用默认值）
const initialState: WebSearchSettings = {
  enabled: false,
  provider: 'tavily',
  apiKey: '',
  includeInContext: true,
  maxResults: 5,
  showTimestamp: true,
  filterSafeSearch: true,
  searchMode: 'manual',
  searchWithTime: false,
  excludeDomains: [],
  providers: getDefaultProviders(),
  customProviders: []
};

// 延迟加载数据，避免循环导入
let isInitialized = false;

export const initializeWebSearchSettings = async () => {
  if (isInitialized) return;

  try {
    const settings = await loadFromStorage();
    // 这个函数会在store初始化后被调用
    return settings;
  } catch (err) {
    console.error('加载网络搜索设置失败:', err);
    return null;
  } finally {
    isInitialized = true;
  }
};

// 保存到IndexedDB的辅助函数
const saveToStorage = (state: WebSearchSettings) => {
  // 创建一个可序列化的副本，移除任何不可序列化的属性
  const serializableState: WebSearchSettings = {
    enabled: state.enabled,
    provider: state.provider,
    apiKey: state.apiKey,
    baseUrl: state.baseUrl,
    includeInContext: state.includeInContext,
    maxResults: state.maxResults,
    showTimestamp: state.showTimestamp,
    filterSafeSearch: state.filterSafeSearch,
    searchMode: state.searchMode,
    searchWithTime: state.searchWithTime,
    excludeDomains: [...(state.excludeDomains || [])],
    providers: state.providers.map(p => ({ ...p })),
    customProviders: (state.customProviders || []).map(p => ({ ...p })),
    contentLimit: state.contentLimit
  };

  setStorageItem(STORAGE_KEY, serializableState).catch(error => {
    console.error('Failed to save webSearchSettings to IndexedDB', error);
  });
};

const webSearchSlice = createSlice({
  name: 'webSearch',
  initialState,
  reducers: {
    setWebSearchSettings: (_, action: PayloadAction<WebSearchSettings>) => {
      const newState = { ...action.payload };
      saveToStorage(newState);
      return newState;
    },
    toggleWebSearchEnabled: (state) => {
      state.enabled = !state.enabled;
      saveToStorage(state);
    },
    setWebSearchProvider: (state, action: PayloadAction<WebSearchProvider>) => {
      state.provider = action.payload;
      saveToStorage(state);
    },
    setWebSearchApiKey: (state, action: PayloadAction<string>) => {
      // 更新全局apiKey（向后兼容）
      state.apiKey = action.payload;

      // 同时更新当前选中provider的apiKey
      const currentProviderIndex = state.providers.findIndex(p => p.id === state.provider);
      if (currentProviderIndex !== -1) {
        state.providers[currentProviderIndex].apiKey = action.payload;
      }

      saveToStorage(state);
    },
    setWebSearchBaseUrl: (state, action: PayloadAction<string | undefined>) => {
      state.baseUrl = action.payload;
      saveToStorage(state);
    },
    setWebSearchMaxResults: (state, action: PayloadAction<number>) => {
      state.maxResults = action.payload;
      saveToStorage(state);
    },
    toggleIncludeInContext: (state) => {
      state.includeInContext = !state.includeInContext;
      saveToStorage(state);
    },
    toggleShowTimestamp: (state) => {
      state.showTimestamp = !state.showTimestamp;
      saveToStorage(state);
    },
    toggleFilterSafeSearch: (state) => {
      state.filterSafeSearch = !state.filterSafeSearch;
      saveToStorage(state);
    },
    setSearchMode: (state, action: PayloadAction<'auto' | 'manual'>) => {
      state.searchMode = action.payload;
      saveToStorage(state);
    },
    addCustomProvider: (state, action: PayloadAction<WebSearchCustomProvider>) => {
      if (!state.customProviders) {
        state.customProviders = [];
      }
      state.customProviders.push(action.payload);
      saveToStorage(state);
    },
    updateCustomProvider: (state, action: PayloadAction<WebSearchCustomProvider>) => {
      if (!state.customProviders) {
        state.customProviders = [];
        state.customProviders.push(action.payload);
        saveToStorage(state);
        return;
      }

      const index = state.customProviders.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.customProviders[index] = action.payload;
      } else {
        state.customProviders.push(action.payload);
      }
      saveToStorage(state);
    },
    deleteCustomProvider: (state, action: PayloadAction<string>) => {
      if (!state.customProviders) return;
      state.customProviders = state.customProviders.filter(p => p.id !== action.payload);
      saveToStorage(state);
    },
    toggleCustomProviderEnabled: (state, action: PayloadAction<string>) => {
      if (!state.customProviders) return;

      const index = state.customProviders.findIndex(p => p.id === action.payload);
      if (index !== -1) {
        state.customProviders[index].enabled = !state.customProviders[index].enabled;
        saveToStorage(state);
      }
    },
    // 新增的action
    toggleSearchWithTime: (state) => {
      state.searchWithTime = !state.searchWithTime;
      saveToStorage(state);
    },
    setExcludeDomains: (state, action: PayloadAction<string[]>) => {
      state.excludeDomains = action.payload;
      saveToStorage(state);
    },
    addExcludeDomain: (state, action: PayloadAction<string>) => {
      if (!state.excludeDomains.includes(action.payload)) {
        state.excludeDomains.push(action.payload);
        saveToStorage(state);
      }
    },
    removeExcludeDomain: (state, action: PayloadAction<string>) => {
      state.excludeDomains = state.excludeDomains.filter(domain => domain !== action.payload);
      saveToStorage(state);
    },
    setContentLimit: (state, action: PayloadAction<number | undefined>) => {
      state.contentLimit = action.payload;
      saveToStorage(state);
    },
    updateProvider: (state, action: PayloadAction<WebSearchProviderConfig>) => {
      const index = state.providers.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.providers[index] = action.payload;
        saveToStorage(state);
      }
    },
    resetProviders: (state) => {
      state.providers = getDefaultProviders();
      saveToStorage(state);
    }
  }
});

export const {
  setWebSearchSettings,
  toggleWebSearchEnabled,
  setWebSearchProvider,
  setWebSearchApiKey,
  setWebSearchBaseUrl,
  setWebSearchMaxResults,
  toggleIncludeInContext,
  toggleShowTimestamp,
  toggleFilterSafeSearch,
  setSearchMode,
  addCustomProvider,
  updateCustomProvider,
  deleteCustomProvider,
  toggleCustomProviderEnabled,
  toggleSearchWithTime,
  setExcludeDomains,
  addExcludeDomain,
  removeExcludeDomain,
  setContentLimit,
  updateProvider,
  resetProviders
} = webSearchSlice.actions;

export default webSearchSlice.reducer;