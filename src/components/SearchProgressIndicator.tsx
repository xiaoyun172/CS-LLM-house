import React, { useEffect, useState } from 'react';
import { styled } from '@mui/material/styles';
import { Box, Typography, LinearProgress, Paper, Fade } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CachedIcon from '@mui/icons-material/Cached';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

// 搜索状态
export type SearchStatus = 
  | 'idle'           // 空闲状态
  | 'preparing'      // 准备搜索
  | 'searching'      // 搜索中
  | 'processing'     // 处理结果中
  | 'cached'         // 使用缓存结果
  | 'generating'     // 生成回答中
  | 'completed'      // 完成
  | 'error';         // 错误

// 组件属性
interface SearchProgressIndicatorProps {
  status: SearchStatus;
  query?: string;
  error?: string;
  visible: boolean;
  onClose?: () => void;
}

// 样式
const ProgressContainer = styled(Paper)(({ theme }) => ({
  position: 'fixed',
  bottom: theme.spacing(2),
  right: theme.spacing(2),
  width: 300,
  padding: theme.spacing(2),
  zIndex: 1000,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  borderRadius: theme.spacing(1),
  backgroundColor: theme.palette.background.paper,
  '&:hover': {
    boxShadow: '0 6px 24px rgba(0, 0, 0, 0.2)',
  }
}));

const StatusIcon = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 40,
  height: 40,
  borderRadius: '50%',
  backgroundColor: theme.palette.primary.light,
  color: theme.palette.primary.contrastText,
}));

// 获取搜索状态描述和进度百分比
const getStatusInfo = (status: SearchStatus): { text: string; progress: number } => {
  switch (status) {
    case 'preparing':
      return { text: '准备搜索查询...', progress: 10 };
    case 'searching':
      return { text: '正在搜索网络...', progress: 30 };
    case 'cached':
      return { text: '从缓存获取结果...', progress: 50 };
    case 'processing':
      return { text: '处理搜索结果...', progress: 70 };
    case 'generating':
      return { text: '生成回答...', progress: 90 };
    case 'completed':
      return { text: '搜索完成', progress: 100 };
    case 'error':
      return { text: '搜索出错', progress: 100 };
    default:
      return { text: '准备中...', progress: 0 };
  }
};

// 搜索进度指示器组件
const SearchProgressIndicator: React.FC<SearchProgressIndicatorProps> = ({ 
  status, 
  query, 
  error, 
  visible,
  onClose 
}) => {
  const [show, setShow] = useState(false);
  const { text, progress } = getStatusInfo(status);

  // 处理组件显示和自动隐藏
  useEffect(() => {
    if (visible) {
      setShow(true);
      
      // 如果状态是completed或error，设置定时器在3秒后自动隐藏
      if (status === 'completed' || status === 'error') {
        const timer = setTimeout(() => {
          setShow(false);
          if (onClose) onClose();
        }, 3000);
        return () => clearTimeout(timer);
      }
    } else {
      setShow(false);
    }
  }, [visible, status, onClose]);

  // 获取状态图标
  const getStatusIcon = () => {
    switch (status) {
      case 'cached':
        return <CachedIcon />;
      case 'completed':
        return <CheckCircleIcon style={{ color: '#4caf50' }} />;
      case 'error':
        return <ErrorIcon style={{ color: '#f44336' }} />;
      default:
        return <SearchIcon />;
    }
  };

  if (!show) return null;

  return (
    <Fade in={show}>
      <ProgressContainer>
        <Box display="flex" alignItems="center" gap={2}>
          <StatusIcon>
            {getStatusIcon()}
          </StatusIcon>
          <Box flexGrow={1}>
            <Typography variant="subtitle2" fontWeight="bold">
              {status === 'error' ? '搜索出错' : '智能搜索'}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {query && query.length > 30 ? `${query.substring(0, 30)}...` : query}
            </Typography>
          </Box>
        </Box>
        
        <Box>
          <Typography variant="caption" color="text.secondary">
            {text}
          </Typography>
          <LinearProgress 
            variant={status === 'completed' || status === 'error' ? 'determinate' : 'indeterminate'} 
            value={progress} 
            color={status === 'error' ? 'error' : 'primary'}
            sx={{ 
              height: 6, 
              borderRadius: 3,
              mt: 0.5,
              backgroundColor: status === 'error' ? 'rgba(244, 67, 54, 0.1)' : undefined 
            }}
          />
        </Box>
        
        {error && (
          <Typography variant="caption" color="error">
            {error}
          </Typography>
        )}
      </ProgressContainer>
    </Fade>
  );
};

export default SearchProgressIndicator; 