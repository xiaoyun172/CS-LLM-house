/**
 * 工具栏按钮的显示样式
 */
export type ToolbarDisplayStyle = 'icon' | 'text' | 'both';

/**
 * 工具栏按钮的通用属性
 */
export interface ToolbarButtonProps {
  /**
   * 显示样式: 仅图标、仅文字、图标和文字
   */
  displayStyle: ToolbarDisplayStyle;
  
  /**
   * 是否为黑暗模式
   */
  isDarkMode: boolean;
  
  /**
   * 自定义类名
   */
  className?: string;
} 