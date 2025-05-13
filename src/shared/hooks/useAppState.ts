import { create } from 'zustand';

interface AppState {
  showExitConfirm: boolean;
  setShowExitConfirm: (show: boolean) => void;
}

/**
 * 应用状态管理钩子
 * 用于管理全局应用状态，如退出确认对话框的显示状态
 */
export const useAppState = create<AppState>((set) => ({
  showExitConfirm: false,
  setShowExitConfirm: (show) => set({ showExitConfirm: show }),
}));
