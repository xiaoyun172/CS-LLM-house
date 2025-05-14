import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { WebSearchSettings, WebSearchCustomProvider, WebSearchProvider } from '../../types';

// 从localStorage加载初始状态
const loadFromStorage = (): WebSearchSettings => {
  try {
    const savedSettings = localStorage.getItem('webSearchSettings');
    if (savedSettings) {
      return JSON.parse(savedSettings);
    }
  } catch (error) {
    console.error('Failed to load webSearchSettings from localStorage', error);
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

// 定义初始状态
const initialState: WebSearchSettings = loadFromStorage();

// 保存到localStorage的辅助函数
const saveToStorage = (state: WebSearchSettings) => {
  try {
    localStorage.setItem('webSearchSettings', JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save webSearchSettings to localStorage', error);
  }
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