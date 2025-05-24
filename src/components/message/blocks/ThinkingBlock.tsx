import React, { useState, useEffect, useCallback, useReducer } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Collapse,
  useTheme,
  Chip
} from '@mui/material';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { styled } from '@mui/material/styles';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../shared/store';
import type { ThinkingMessageBlock } from '../../../shared/types/newMessage';
import { MessageBlockStatus } from '../../../shared/types/newMessage';
import Markdown from '../Markdown';
import { EventEmitter, EVENT_NAMES } from '../../../shared/services/EventEmitter';
import { useDeepMemo } from '../../../hooks/useMemoization';
import { formatThinkingTimeSeconds } from '../../../shared/utils/thinkingUtils';

// 思考过程显示样式类型
export type ThinkingDisplayStyle = 'compact' | 'full' | 'hidden';

// 思考过程显示样式常量
export const ThinkingDisplayStyle = {
  COMPACT: 'compact' as ThinkingDisplayStyle,
  FULL: 'full' as ThinkingDisplayStyle,
  HIDDEN: 'hidden' as ThinkingDisplayStyle
};

interface Props {
  block: ThinkingMessageBlock;
}

/**
 * 思考块组件
 * 显示AI的思考过程，可折叠/展开
 */
const ThinkingBlock: React.FC<Props> = ({ block }) => {
  // 从设置中获取思考过程显示样式
  const thinkingDisplayStyle = useSelector((state: RootState) =>
    (state.settings as any).thinkingDisplayStyle || 'compact'
  );

  // 从设置中获取是否自动折叠思考过程
  const thoughtAutoCollapse = useSelector((state: RootState) =>
    (state.settings as any).thoughtAutoCollapse !== false
  );

  const [expanded, setExpanded] = useState(!thoughtAutoCollapse);
  const theme = useTheme();
  const isThinking = block.status === MessageBlockStatus.STREAMING;
  // 修复：使用稳定的思考时间，避免每次渲染都变化
  const [thinkingTime, setThinkingTime] = useState(() => block.thinking_millsec || 0);
  const [copied, setCopied] = useState(false);

  // 添加强制更新机制
  const [updateCounter, forceUpdate] = useReducer(state => state + 1, 0);
  const [content, setContent] = useState(block.content || '');

  // 使用记忆化的block内容，避免不必要的重渲染
  const memoizedContent = useDeepMemo(() => content, [content, updateCounter]);

  // 格式化思考时间（毫秒转为秒，保留1位小数）
  const formattedThinkingTime = formatThinkingTimeSeconds(thinkingTime).toFixed(1);

  // 复制思考内容到剪贴板
  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发折叠/展开
    if (block.content) {
      navigator.clipboard.writeText(block.content);
      // 显示复制成功状态
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      // 发送复制事件
      EventEmitter.emit(EVENT_NAMES.UI_COPY_SUCCESS || 'ui:copy_success', { content: '已复制思考内容' });
    }
  }, [block.content]);

  // 切换折叠/展开状态
  const toggleExpanded = useCallback(() => {
    setExpanded(!expanded);
  }, [expanded]);

  // 监听内容变化
  useEffect(() => {
    setContent(block.content || '');
  }, [block.content]);

  // 添加流式输出事件监听 - 简化版本，参考最佳实例
  useEffect(() => {
    // 检查是否正在流式输出
    if (isThinking) {
      // 监听流式输出事件
      const thinkingDeltaHandler = () => {
        setContent(block.content || '');
        forceUpdate();
      };

      // 只订阅思考完成事件，减少重复更新
      const unsubscribeThinkingComplete = EventEmitter.on(EVENT_NAMES.STREAM_THINKING_COMPLETE, thinkingDeltaHandler);

      return () => {
        unsubscribeThinkingComplete();
      };
    }
  }, [isThinking, block.content]);

  // 修复：分离思考时间更新和自动折叠逻辑
  // 思考时间计时器 - 只在思考状态变化时更新
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (isThinking) {
      // 如果正在思考，每100毫秒更新一次计时
      timer = setInterval(() => {
        setThinkingTime(prev => prev + 100);
      }, 100);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isThinking]); // 只依赖思考状态

  // 修复：只在思考完成时设置最终时间，避免重复设置
  useEffect(() => {
    if (!isThinking && block.thinking_millsec && block.thinking_millsec !== thinkingTime) {
      // 只有当思考完成且服务器返回的时间与当前时间不同时才更新
      setThinkingTime(block.thinking_millsec);
    }
  }, [isThinking, block.thinking_millsec]); // 移除 thinkingTime 依赖避免循环

  // 自动折叠逻辑 - 独立处理
  useEffect(() => {
    if (!isThinking && thoughtAutoCollapse) {
      setExpanded(false);
    }
  }, [isThinking, thoughtAutoCollapse]);

  // 如果设置为隐藏思考过程，则不显示
  if (thinkingDisplayStyle === 'hidden') {
    return null;
  }

  // 根据显示样式选择不同的渲染方式
  const renderCompactStyle = () => (
    <StyledPaper
      onClick={toggleExpanded}
      elevation={0}
      sx={{
        cursor: 'pointer',
        mb: 2,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: '8px',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        width: '100%', // 固定占满屏幕宽度
        maxWidth: '100%', // 确保不超出屏幕
        minWidth: 0, // 允许收缩
        '&:hover': {
          backgroundColor: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.05)'
            : 'rgba(0, 0, 0, 0.02)',
        }
      }}
    >
      {/* 标题栏 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 1.5,
          borderBottom: expanded ? `1px solid ${theme.palette.divider}` : 'none'
        }}
      >
        <LightbulbIcon
          sx={{
            mr: 1,
            color: isThinking ? theme.palette.warning.main : theme.palette.text.secondary,
            animation: isThinking ? 'pulse 1.5s infinite' : 'none',
            '@keyframes pulse': {
              '0%': { opacity: 0.6 },
              '50%': { opacity: 1 },
              '100%': { opacity: 0.6 }
            }
          }}
        />

        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          思考过程
          <Chip
            label={isThinking ? `思考中... ${formattedThinkingTime}s` : `思考完成 ${formattedThinkingTime}s`}
            size="small"
            color={isThinking ? "warning" : "default"}
            variant="outlined"
            sx={{ ml: 1, height: 20 }}
          />
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            size="small"
            onClick={handleCopy}
            sx={{ mr: 1 }}
            color={copied ? "success" : "default"}
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>

          <ExpandMoreIcon
            sx={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }}
          />
        </Box>
      </Box>

      {/* 内容区域 */}
      <Collapse in={expanded}>
        <Box sx={{
          p: 2,
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          overflow: 'hidden' // 防止内容溢出导致重排
        }}>
          <Markdown content={memoizedContent} allowHtml={false} />
        </Box>
      </Collapse>
    </StyledPaper>
  );

  // 完整显示样式
  const renderFullStyle = () => (
    <StyledPaper
      elevation={0}
      sx={{
        mb: 2,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: '8px',
        overflow: 'hidden',
        width: '100%', // 固定占满屏幕宽度
        maxWidth: '100%', // 确保不超出屏幕
        minWidth: 0 // 允许收缩
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 1.5,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}
      >
        <LightbulbIcon
          sx={{
            mr: 1,
            color: isThinking ? theme.palette.warning.main : theme.palette.primary.main
          }}
        />

        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          {isThinking ? '正在深度思考...' : '深度思考过程'}
          <Chip
            label={`${formattedThinkingTime}s`}
            size="small"
            color={isThinking ? "warning" : "primary"}
            sx={{ ml: 1, height: 20 }}
          />
        </Typography>

        <IconButton
          size="small"
          onClick={handleCopy}
          color={copied ? "success" : "default"}
        >
          <ContentCopyIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{
        p: 2,
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        overflow: 'hidden' // 防止内容溢出导致重排
      }} key={`thinking-content-${updateCounter}`}>
        <Markdown content={memoizedContent} allowHtml={false} />
      </Box>
    </StyledPaper>
  );

  return thinkingDisplayStyle === 'full' ? renderFullStyle() : renderCompactStyle();
};

// 样式化组件
const StyledPaper = styled(Paper)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  boxShadow: 'none',
  transition: theme.transitions.create(['background-color', 'box-shadow']),
  // 性能优化：固定布局属性，避免重排
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  // 启用硬件加速
  transform: 'translateZ(0)',
  willChange: 'background-color, box-shadow'
}));

export default React.memo(ThinkingBlock);
