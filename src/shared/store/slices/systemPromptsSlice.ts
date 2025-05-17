import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { SystemPromptTemplate } from '../../services/SystemPromptService';
import { SystemPromptService } from '../../services/SystemPromptService';

// 获取系统提示词服务实例
const promptService = SystemPromptService.getInstance();

export interface SystemPromptsState {
  templates: SystemPromptTemplate[];
  defaultPrompt: string;
  useDefaultPrompt: boolean;
  initialized: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: SystemPromptsState = {
  templates: [],
  defaultPrompt: '',
  useDefaultPrompt: true,
  initialized: false,
  loading: false,
  error: null
};

// 创建异步thunk来加载初始状态
export const loadSystemPrompts = createAsyncThunk(
  'systemPrompts/loadSystemPrompts',
  async (_, { rejectWithValue }) => {
    try {
      // 初始化提示词服务
      await promptService.initialize();

      // 返回加载的数据
      return {
        templates: promptService.getTemplates(),
        defaultPrompt: promptService.getDefaultPrompt(),
        useDefaultPrompt: promptService.getUseDefaultPrompt()
      };
    } catch (error) {
      console.error('加载系统提示词数据失败:', error);
      return rejectWithValue(error instanceof Error ? error.message : '未知错误');
    }
  }
);

const systemPromptsSlice = createSlice({
  name: 'systemPrompts',
  initialState,
  reducers: {
    initializeSystemPrompts: (state) => {
      if (!state.initialized && !state.loading) {
        // 标记为加载中，实际加载应该通过loadSystemPrompts thunk进行
        state.loading = true;
      }
    },

    saveSystemPromptTemplates: (state, action: PayloadAction<SystemPromptTemplate[]>) => {
      state.templates = action.payload;
      // 更新持久化存储
      action.payload.forEach(async template => {
        await promptService.updateTemplate(template);
      });
    },

    setDefaultSystemPrompt: (state, action: PayloadAction<string>) => {
      state.defaultPrompt = action.payload;
      // 更新持久化存储
      promptService.setDefaultPrompt(action.payload);
    },

    setUseDefaultPrompt: (state, action: PayloadAction<boolean>) => {
      state.useDefaultPrompt = action.payload;
      // 更新持久化存储，但不影响action的返回值
      void promptService.setUseDefaultPrompt(action.payload);
    },

    addPromptTemplate: (state, action: PayloadAction<SystemPromptTemplate>) => {
      state.templates.push(action.payload);
      // 更新持久化存储
      promptService.addTemplate(
        action.payload.name,
        action.payload.content,
        action.payload.isDefault || false
      );
    },

    updatePromptTemplate: (state, action: PayloadAction<SystemPromptTemplate>) => {
      const index = state.templates.findIndex(t => t.id === action.payload.id);
      if (index !== -1) {
        state.templates[index] = action.payload;
        // 更新持久化存储
        promptService.updateTemplate(action.payload);
      }
    },

    deletePromptTemplate: (state, action: PayloadAction<string>) => {
      state.templates = state.templates.filter(t => t.id !== action.payload);
      // 更新持久化存储
      promptService.deleteTemplate(action.payload);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSystemPrompts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadSystemPrompts.fulfilled, (state, action) => {
        state.templates = action.payload.templates;
        state.defaultPrompt = action.payload.defaultPrompt;
        state.useDefaultPrompt = action.payload.useDefaultPrompt;
        state.initialized = true;
        state.loading = false;
        state.error = null;
      })
      .addCase(loadSystemPrompts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || '加载系统提示词失败';
      });
  }
});

export const {
  initializeSystemPrompts,
  saveSystemPromptTemplates,
  setDefaultSystemPrompt,
  setUseDefaultPrompt,
  addPromptTemplate,
  updatePromptTemplate,
  deletePromptTemplate
} = systemPromptsSlice.actions;

// 添加获取当前激活提示词的选择器
export const selectActiveSystemPrompt = (state: { systemPrompts: SystemPromptsState }) => {
  return state.systemPrompts.useDefaultPrompt ? state.systemPrompts.defaultPrompt : '';
};

// 添加选择器获取加载状态
export const selectSystemPromptsLoading = (state: { systemPrompts: SystemPromptsState }) => {
  return state.systemPrompts.loading;
};

// 添加选择器获取错误信息
export const selectSystemPromptsError = (state: { systemPrompts: SystemPromptsState }) => {
  return state.systemPrompts.error;
};

export default systemPromptsSlice.reducer;