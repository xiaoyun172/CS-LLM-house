import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import type { ChartMessageBlock } from '../../shared/types/newMessage.ts';
import { Bar, Line, Pie, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// 注册ChartJS组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface ChartBlockProps {
  block: ChartMessageBlock;
}

/**
 * 图表块组件
 */
const ChartBlock: React.FC<ChartBlockProps> = ({ block }) => {
  const theme = useTheme();
  
  // 生成图表主题配置
  const getThemeOptions = () => {
    const isDark = theme.palette.mode === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDark ? theme.palette.text.primary : theme.palette.text.primary;
    
    return {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        x: {
          grid: {
            color: gridColor,
          },
          ticks: {
            color: textColor,
          },
        },
        y: {
          grid: {
            color: gridColor,
          },
          ticks: {
            color: textColor,
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: textColor,
          },
        },
      },
    };
  };
  
  // 渲染不同类型的图表
  const renderChart = () => {
    const options = {
      ...getThemeOptions(),
      ...(block.options || {})
    };
    
    switch (block.chartType) {
      case 'bar':
        return <Bar data={block.data} options={options} />;
      case 'line':
        return <Line data={block.data} options={options} />;
      case 'pie':
        return <Pie data={block.data} options={options} />;
      case 'scatter':
        return <Scatter data={block.data} options={options} />;
      default:
        return (
          <Typography variant="body2" color="error">
            不支持的图表类型: {block.chartType}
          </Typography>
        );
    }
  };

  return (
    <Box sx={{ marginY: 2 }}>
      <Box sx={{ 
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(255, 255, 255, 0.03)'
          : 'rgba(0, 0, 0, 0.01)',
        borderRadius: '8px',
        padding: 2,
        height: '300px'
      }}>
        {renderChart()}
      </Box>
    </Box>
  );
};

export default ChartBlock; 