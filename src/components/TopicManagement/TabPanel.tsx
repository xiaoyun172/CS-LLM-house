import React from 'react';
import { Box } from '@mui/material';
import { fullScrollOptimization } from './SettingsTab/scrollOptimization';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

/**
 * 标签面板组件，用于在标签页中显示内容
 */
export default function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`sidebar-tabpanel-${index}`}
      aria-labelledby={`sidebar-tab-${index}`}
      style={{
        height: 'calc(100% - 48px)',
        overflow: 'auto',
        padding: '10px',
        display: value === index ? 'block' : 'none',
        // 移动端滚动优化
        WebkitOverflowScrolling: 'touch', // iOS 平滑滚动
        scrollBehavior: 'smooth', // 平滑滚动行为
        // 性能优化
        willChange: 'scroll-position', // 提示浏览器优化滚动
        transform: 'translateZ(0)', // 启用硬件加速
        // 滚动条样式优化
        scrollbarWidth: 'thin', // Firefox 细滚动条
      }}
      {...other}
    >
      <Box
        sx={{
          // 防止内容溢出导致的滚动问题
          minHeight: 'fit-content',
          // 应用完整的滚动优化
          ...fullScrollOptimization,
        }}
      >
        {children}
      </Box>
    </div>
  );
}

/**
 * 生成标签页的辅助属性
 */
export function a11yProps(index: number) {
  return {
    id: `sidebar-tab-${index}`,
    'aria-controls': `sidebar-tabpanel-${index}`,
  };
}
