import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { WebSearchSettings, WebSearchCustomProvider, WebSearchProvider } from '../../types';
import { getStorageItem, setStorageItem } from '../../utils/storage';

// 存储键名
const STORAGE_KEY = 'webSearchSettings';

// 从IndexedDB加载初始状态
const loadFromStorage = async (): Promise<WebSearchSettings> => {
  try {
    const savedSettings = await getStorageItem<WebSearchSettings>(STORAGE_KEY);
    if (savedSettings) {
      return savedSettings;
    }
  } catch (error) {
    console.error('Failed to load webSearchSettings from IndexedDB', error);
  }

  // 默认初始状态
  return {
    enabled: false,
    provider: 'firecrawl',
    apiKey: '',
    includeInContext: true,
    maxResults: 5,
    showTimestamp: true,
    filterSafeSearch: true,
    searchMode: 'manual',
    customProviders: []
  };
};

// 定义初始状态（首次加载使用默认值）
const initialState: WebSearchSettings = {
  enabled: false,
  provider: 'firecrawl',
  apiKey: '',
  includeInContext: true,
  maxResults: 5,
  showTimestamp: true,
  filterSafeSearch: true,
  searchMode: 'manual',
  customProviders: []
};

// 立即异步加载数据
loadFromStorage().then(settings => {
  // 此处暂时无法直接修改initialState
  // 但Redux初始化后会调用setWebSearchSettings来更新状态
  if (typeof window !== 'undefined') {
    setTimeout(async () => {
      // 使用动态ESM导入替代require
      const storeModule = await import('../../store');
      const store = storeModule.default;
      store.dispatch(setWebSearchSettings(settings));
    }, 0);
  }
}).catch(err => console.error('加载网络搜索设置失败:', err));

// 保存到IndexedDB的辅助函数
const saveToStorage = (state: WebSearchSettings) => {
  setStorageItem(STORAGE_KEY, state).catch(error => {
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
      state.apiKey = action.payload;
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
  toggleCustomProviderEnabled
} = webSearchSlice.actions;

export default webSearchSlice.reducer;