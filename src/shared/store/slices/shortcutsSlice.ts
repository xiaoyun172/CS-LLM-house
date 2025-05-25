/**
 * 快捷键状态管理
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { ShortcutsState, ShortcutConfig, KeyCombination } from '../../types/shortcuts';
import { shortcutsService } from '../../services/ShortcutsService';

/**
 * 初始状态
 */
const initialState: ShortcutsState = {
  shortcuts: [],
  enabled: true,
  showHints: true,
  loading: false,
  error: null
};

/**
 * 异步操作：加载快捷键配置
 */
export const loadShortcuts = createAsyncThunk(
  'shortcuts/loadShortcuts',
  async () => {
    return shortcutsService.getShortcuts();
  }
);

/**
 * 异步操作：更新快捷键
 */
export const updateShortcut = createAsyncThunk(
  'shortcuts/updateShortcut',
  async ({ id, updates }: { id: string; updates: Partial<ShortcutConfig> }) => {
    await shortcutsService.updateShortcut(id, updates);
    return { id, updates };
  }
);

/**
 * 异步操作：重置为默认设置
 */
export const resetToDefaults = createAsyncThunk(
  'shortcuts/resetToDefaults',
  async () => {
    shortcutsService.resetToDefaults();
    return shortcutsService.getShortcuts();
  }
);

/**
 * 异步操作：导入配置
 */
export const importConfig = createAsyncThunk(
  'shortcuts/importConfig',
  async (config: string) => {
    await shortcutsService.importConfig(config);
    return shortcutsService.getShortcuts();
  }
);

/**
 * 异步操作：导出配置
 */
export const exportConfig = createAsyncThunk(
  'shortcuts/exportConfig',
  async () => {
    return shortcutsService.exportConfig();
  }
);

/**
 * 快捷键状态切片
 */
const shortcutsSlice = createSlice({
  name: 'shortcuts',
  initialState,
  reducers: {
    /**
     * 设置快捷键启用状态
     */
    setEnabled: (state, action: PayloadAction<boolean>) => {
      state.enabled = action.payload;
    },

    /**
     * 设置是否显示快捷键提示
     */
    setShowHints: (state, action: PayloadAction<boolean>) => {
      state.showHints = action.payload;
    },

    /**
     * 切换单个快捷键的启用状态
     */
    toggleShortcut: (state, action: PayloadAction<string>) => {
      const shortcut = state.shortcuts.find(s => s.id === action.payload);
      if (shortcut) {
        shortcut.enabled = !shortcut.enabled;
        shortcut.updatedAt = new Date().toISOString();
        // 同步到服务
        shortcutsService.toggle(action.payload, shortcut.enabled);
      }
    },

    /**
     * 清除错误信息
     */
    clearError: (state) => {
      state.error = null;
    },

    /**
     * 验证快捷键组合
     */
    validateShortcut: (state, action: PayloadAction<{ 
      id?: string; 
      combination: KeyCombination 
    }>) => {
      const { id, combination } = action.payload;
      const validation = shortcutsService.validate({ id, combination });
      
      if (!validation.isValid) {
        state.error = validation.error || '快捷键验证失败';
      } else {
        state.error = null;
      }
    },

    /**
     * 设置快捷键列表
     */
    setShortcuts: (state, action: PayloadAction<ShortcutConfig[]>) => {
      state.shortcuts = action.payload;
    }
  },
  extraReducers: (builder) => {
    // 加载快捷键配置
    builder
      .addCase(loadShortcuts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadShortcuts.fulfilled, (state, action) => {
        state.loading = false;
        state.shortcuts = action.payload;
      })
      .addCase(loadShortcuts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '加载快捷键配置失败';
      });

    // 更新快捷键
    builder
      .addCase(updateShortcut.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateShortcut.fulfilled, (state, action) => {
        state.loading = false;
        const { id, updates } = action.payload;
        const index = state.shortcuts.findIndex(s => s.id === id);
        if (index !== -1) {
          state.shortcuts[index] = {
            ...state.shortcuts[index],
            ...updates,
            updatedAt: new Date().toISOString()
          };
        }
      })
      .addCase(updateShortcut.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '更新快捷键失败';
      });

    // 重置为默认设置
    builder
      .addCase(resetToDefaults.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetToDefaults.fulfilled, (state, action) => {
        state.loading = false;
        state.shortcuts = action.payload;
      })
      .addCase(resetToDefaults.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '重置快捷键失败';
      });

    // 导入配置
    builder
      .addCase(importConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(importConfig.fulfilled, (state, action) => {
        state.loading = false;
        state.shortcuts = action.payload;
      })
      .addCase(importConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '导入配置失败';
      });

    // 导出配置
    builder
      .addCase(exportConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(exportConfig.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(exportConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '导出配置失败';
      });
  }
});

// 导出actions
export const {
  setEnabled,
  setShowHints,
  toggleShortcut,
  clearError,
  validateShortcut,
  setShortcuts
} = shortcutsSlice.actions;

// 选择器
export const selectShortcuts = (state: { shortcuts: ShortcutsState }) => state.shortcuts.shortcuts;
export const selectShortcutsEnabled = (state: { shortcuts: ShortcutsState }) => state.shortcuts.enabled;
export const selectShowHints = (state: { shortcuts: ShortcutsState }) => state.shortcuts.showHints;
export const selectShortcutsLoading = (state: { shortcuts: ShortcutsState }) => state.shortcuts.loading;
export const selectShortcutsError = (state: { shortcuts: ShortcutsState }) => state.shortcuts.error;

// 按分类选择快捷键
export const selectShortcutsByCategory = (category: string) => 
  (state: { shortcuts: ShortcutsState }) => 
    state.shortcuts.shortcuts.filter(s => s.category === category);

// 选择启用的快捷键
export const selectEnabledShortcuts = (state: { shortcuts: ShortcutsState }) => 
  state.shortcuts.shortcuts.filter(s => s.enabled);

// 导出reducer
export default shortcutsSlice.reducer;
