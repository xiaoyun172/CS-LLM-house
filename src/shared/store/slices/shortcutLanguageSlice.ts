/**
 * 快捷短语状态管理
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
  ShortcutLanguageState,
  ShortcutPhrase,
  PhraseCategory,
  PhraseFilter,
  PhraseExportData
} from '../../types/shortcutLanguage';
import { shortcutLanguageService } from '../../services/ShortcutLanguageService';

/**
 * 初始状态
 */
const initialState: ShortcutLanguageState = {
  phrases: [],
  categories: [],
  selectedCategoryId: null,
  searchKeyword: '',
  sortBy: 'name',
  sortOrder: 'asc',
  showFavorites: false,
  loading: false,
  error: null
};

/**
 * 异步操作：加载所有数据
 */
export const loadAllData = createAsyncThunk(
  'shortcutLanguage/loadAllData',
  async () => {
    const phrases = shortcutLanguageService.getAllPhrases();
    const categories = shortcutLanguageService.getAllCategories();
    return { phrases, categories };
  }
);

/**
 * 异步操作：创建短语
 */
export const createPhrase = createAsyncThunk(
  'shortcutLanguage/createPhrase',
  async (phrase: Omit<ShortcutPhrase, 'id' | 'createdAt' | 'updatedAt'>) => {
    return await shortcutLanguageService.createPhrase(phrase);
  }
);

/**
 * 异步操作：更新短语
 */
export const updatePhrase = createAsyncThunk(
  'shortcutLanguage/updatePhrase',
  async ({ id, updates }: { id: string; updates: Partial<ShortcutPhrase> }) => {
    return await shortcutLanguageService.updatePhrase(id, updates);
  }
);

/**
 * 异步操作：删除短语
 */
export const deletePhrase = createAsyncThunk(
  'shortcutLanguage/deletePhrase',
  async (id: string) => {
    await shortcutLanguageService.deletePhrase(id);
    return id;
  }
);

/**
 * 异步操作：使用短语
 */
export const usePhrase = createAsyncThunk(
  'shortcutLanguage/usePhrase',
  async (id: string) => {
    await shortcutLanguageService.usePhrase(id);
    return id;
  }
);

/**
 * 异步操作：创建分类
 */
export const createCategory = createAsyncThunk(
  'shortcutLanguage/createCategory',
  async (category: Omit<PhraseCategory, 'id' | 'createdAt'>) => {
    return await shortcutLanguageService.createCategory(category);
  }
);

/**
 * 异步操作：更新分类
 */
export const updateCategory = createAsyncThunk(
  'shortcutLanguage/updateCategory',
  async ({ id, updates }: { id: string; updates: Partial<PhraseCategory> }) => {
    return await shortcutLanguageService.updateCategory(id, updates);
  }
);

/**
 * 异步操作：删除分类
 */
export const deleteCategory = createAsyncThunk(
  'shortcutLanguage/deleteCategory',
  async (id: string) => {
    await shortcutLanguageService.deleteCategory(id);
    return id;
  }
);

/**
 * 异步操作：导出短语
 */
export const exportPhrases = createAsyncThunk(
  'shortcutLanguage/exportPhrases',
  async () => {
    return await shortcutLanguageService.exportPhrases();
  }
);

/**
 * 异步操作：导入短语
 */
export const importPhrases = createAsyncThunk(
  'shortcutLanguage/importPhrases',
  async (data: PhraseExportData) => {
    await shortcutLanguageService.importPhrases(data);
    const phrases = shortcutLanguageService.getAllPhrases();
    const categories = shortcutLanguageService.getAllCategories();
    return { phrases, categories };
  }
);

/**
 * 异步操作：获取使用统计
 */
export const getUsageStats = createAsyncThunk(
  'shortcutLanguage/getUsageStats',
  async () => {
    return shortcutLanguageService.getUsageStats();
  }
);

/**
 * 快捷短语状态切片
 */
const shortcutLanguageSlice = createSlice({
  name: 'shortcutLanguage',
  initialState,
  reducers: {
    /**
     * 设置选中的分类
     */
    setSelectedCategory: (state, action: PayloadAction<string | null>) => {
      state.selectedCategoryId = action.payload;
    },

    /**
     * 设置搜索关键词
     */
    setSearchKeyword: (state, action: PayloadAction<string>) => {
      state.searchKeyword = action.payload;
    },

    /**
     * 设置排序方式
     */
    setSortBy: (state, action: PayloadAction<{
      sortBy: ShortcutLanguageState['sortBy'];
      sortOrder: ShortcutLanguageState['sortOrder']
    }>) => {
      state.sortBy = action.payload.sortBy;
      state.sortOrder = action.payload.sortOrder;
    },

    /**
     * 切换显示收藏
     */
    toggleShowFavorites: (state) => {
      state.showFavorites = !state.showFavorites;
    },

    /**
     * 切换短语收藏状态
     */
    togglePhraseFavorite: (state, action: PayloadAction<string>) => {
      const phrase = state.phrases.find(p => p.id === action.payload);
      if (phrase) {
        phrase.isFavorite = !phrase.isFavorite;
        phrase.updatedAt = new Date().toISOString();
      }
    },

    /**
     * 清除错误信息
     */
    clearError: (state) => {
      state.error = null;
    },

    /**
     * 重置过滤器
     */
    resetFilters: (state) => {
      state.selectedCategoryId = null;
      state.searchKeyword = '';
      state.showFavorites = false;
      state.sortBy = 'name';
      state.sortOrder = 'asc';
    }
  },
  extraReducers: (builder) => {
    // 加载所有数据
    builder
      .addCase(loadAllData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadAllData.fulfilled, (state, action) => {
        state.loading = false;
        state.phrases = action.payload.phrases;
        state.categories = action.payload.categories;
      })
      .addCase(loadAllData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '加载数据失败';
      });

    // 创建短语
    builder
      .addCase(createPhrase.fulfilled, (state, action) => {
        state.phrases.push(action.payload);
      })
      .addCase(createPhrase.rejected, (state, action) => {
        state.error = action.error.message || '创建短语失败';
      });

    // 更新短语
    builder
      .addCase(updatePhrase.fulfilled, (state, action) => {
        const index = state.phrases.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.phrases[index] = action.payload;
        }
      })
      .addCase(updatePhrase.rejected, (state, action) => {
        state.error = action.error.message || '更新短语失败';
      });

    // 删除短语
    builder
      .addCase(deletePhrase.fulfilled, (state, action) => {
        state.phrases = state.phrases.filter(p => p.id !== action.payload);
      })
      .addCase(deletePhrase.rejected, (state, action) => {
        state.error = action.error.message || '删除短语失败';
      });

    // 使用短语
    builder
      .addCase(usePhrase.fulfilled, (state, action) => {
        const phrase = state.phrases.find(p => p.id === action.payload);
        if (phrase) {
          phrase.usageCount++;
          phrase.lastUsedAt = new Date().toISOString();
          phrase.updatedAt = new Date().toISOString();
        }
      });

    // 创建分类
    builder
      .addCase(createCategory.fulfilled, (state, action) => {
        state.categories.push(action.payload);
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.error = action.error.message || '创建分类失败';
      });

    // 更新分类
    builder
      .addCase(updateCategory.fulfilled, (state, action) => {
        const index = state.categories.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.categories[index] = action.payload;
        }
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.error = action.error.message || '更新分类失败';
      });

    // 删除分类
    builder
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.categories = state.categories.filter(c => c.id !== action.payload);
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.error = action.error.message || '删除分类失败';
      });

    // 导入短语
    builder
      .addCase(importPhrases.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(importPhrases.fulfilled, (state, action) => {
        state.loading = false;
        state.phrases = action.payload.phrases;
        state.categories = action.payload.categories;
      })
      .addCase(importPhrases.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '导入短语失败';
      });
  }
});

// 导出actions
export const {
  setSelectedCategory,
  setSearchKeyword,
  setSortBy,
  toggleShowFavorites,
  togglePhraseFavorite,
  clearError,
  resetFilters
} = shortcutLanguageSlice.actions;

// 选择器
export const selectPhrases = (state: { shortcutLanguage: ShortcutLanguageState }) =>
  state.shortcutLanguage.phrases;

export const selectCategories = (state: { shortcutLanguage: ShortcutLanguageState }) =>
  state.shortcutLanguage.categories;

export const selectSelectedCategoryId = (state: { shortcutLanguage: ShortcutLanguageState }) =>
  state.shortcutLanguage.selectedCategoryId;

export const selectSearchKeyword = (state: { shortcutLanguage: ShortcutLanguageState }) =>
  state.shortcutLanguage.searchKeyword;

export const selectSortSettings = (state: { shortcutLanguage: ShortcutLanguageState }) => ({
  sortBy: state.shortcutLanguage.sortBy,
  sortOrder: state.shortcutLanguage.sortOrder
});

export const selectShowFavorites = (state: { shortcutLanguage: ShortcutLanguageState }) =>
  state.shortcutLanguage.showFavorites;

export const selectLoading = (state: { shortcutLanguage: ShortcutLanguageState }) =>
  state.shortcutLanguage.loading;

export const selectError = (state: { shortcutLanguage: ShortcutLanguageState }) =>
  state.shortcutLanguage.error;

// 过滤后的短语选择器
export const selectFilteredPhrases = (state: { shortcutLanguage: ShortcutLanguageState }) => {
  const { selectedCategoryId, searchKeyword, showFavorites, sortBy, sortOrder } = state.shortcutLanguage;

  const filter: PhraseFilter = {
    keyword: searchKeyword || undefined,
    categoryId: selectedCategoryId || undefined,
    favoritesOnly: showFavorites,
    sortBy,
    sortOrder
  };

  return shortcutLanguageService.getFilteredPhrases(filter);
};

// 按分类分组的短语选择器
export const selectPhrasesByCategory = (state: { shortcutLanguage: ShortcutLanguageState }) => {
  const phrases = state.shortcutLanguage.phrases;
  const categories = state.shortcutLanguage.categories;

  return categories.map(category => ({
    category,
    phrases: phrases.filter(phrase => phrase.categoryId === category.id)
  }));
};

// 收藏短语选择器
export const selectFavoritePhrases = (state: { shortcutLanguage: ShortcutLanguageState }) =>
  state.shortcutLanguage.phrases.filter(phrase => phrase.isFavorite);

// 导出reducer
export default shortcutLanguageSlice.reducer;
