import React, { useState, useEffect, useCallback, useReducer } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Collapse,
  useTheme,
  Chip,
  Avatar,
  Tooltip
} from '@mui/material';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PsychologyIcon from '@mui/icons-material/Psychology';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import TimelineIcon from '@mui/icons-material/Timeline';
import { styled } from '@mui/material/styles';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../shared/store';
import type { ThinkingMessageBlock } from '../../../shared/types/newMessage';
import { MessageBlockStatus } from '../../../shared/types/newMessage';
import Markdown from '../Markdown';
import { EventEmitter, EVENT_NAMES } from '../../../shared/services/EventEmitter';
import { useDeepMemo } from '../../../hooks/useMemoization';
import { formatThinkingTimeSeconds } from '../../../shared/utils/thinkingUtils';
import { getThinkingScrollbarStyles, getCompactScrollbarStyles } from '../../../shared/utils/scrollbarStyles';

// 思考过程显示样式类型
export type ThinkingDisplayStyle = 'compact' | 'full' | 'hidden' | 'minimal' | 'bubble' | 'timeline' | 'card' | 'inline';

// 思考过程显示样式常量
export const ThinkingDisplayStyle = {
  COMPACT: 'compact' as ThinkingDisplayStyle,
  FULL: 'full' as ThinkingDisplayStyle,
  HIDDEN: 'hidden' as ThinkingDisplayStyle,
  MINIMAL: 'minimal' as ThinkingDisplayStyle,
  BUBBLE: 'bubble' as ThinkingDisplayStyle,
  TIMELINE: 'timeline' as ThinkingDisplayStyle,
  CARD: 'card' as ThinkingDisplayStyle,
  INLINE: 'inline' as ThinkingDisplayStyle
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

        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, gap: 1 }}>
          <Typography variant="subtitle2" component="span">
            思考过程
          </Typography>
          <Chip
            label={isThinking ? `思考中... ${formattedThinkingTime}s` : `思考完成 ${formattedThinkingTime}s`}
            size="small"
            color={isThinking ? "warning" : "default"}
            variant="outlined"
            sx={{ height: 20 }}
          />
        </Box>

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
          ...getThinkingScrollbarStyles(theme)
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

        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, gap: 1 }}>
          <Typography variant="subtitle2" component="span">
            {isThinking ? '正在深度思考...' : '深度思考过程'}
          </Typography>
          <Chip
            label={`${formattedThinkingTime}s`}
            size="small"
            color={isThinking ? "warning" : "primary"}
            sx={{ height: 20 }}
          />
        </Box>

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
        ...getThinkingScrollbarStyles(theme)
      }} key={`thinking-content-${updateCounter}`}>
        <Markdown content={memoizedContent} allowHtml={false} />
      </Box>
    </StyledPaper>
  );

  // 极简模式 - 只显示一个小图标
  const renderMinimalStyle = () => (
    <Box sx={{ position: 'relative', display: 'inline-block', mb: 1 }}>
      <Tooltip title={`思考过程 (${formattedThinkingTime}s)`} placement="top">
        <Box
          onClick={toggleExpanded}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            cursor: 'pointer',
            p: 0.5,
            borderRadius: '50%',
            backgroundColor: isThinking ? theme.palette.warning.light : theme.palette.grey[200],
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: isThinking ? theme.palette.warning.main : theme.palette.grey[300],
            }
          }}
        >
          <LightbulbIcon
            sx={{
              fontSize: 16,
              color: isThinking ? theme.palette.warning.contrastText : theme.palette.text.secondary,
              animation: isThinking ? 'pulse 1.5s infinite' : 'none',
              '@keyframes pulse': {
                '0%': { opacity: 0.6 },
                '50%': { opacity: 1 },
                '100%': { opacity: 0.6 }
              }
            }}
          />
        </Box>
      </Tooltip>
      {expanded && (
        <Box sx={{
          position: 'absolute',
          top: '100%',
          left: 0,
          mt: 1,
          zIndex: 1000,
          minWidth: 300,
          maxWidth: 500
        }}>
          <Paper
            elevation={4}
            sx={{
              borderRadius: '18px 18px 18px 4px',
              overflow: 'hidden',
              backgroundColor: theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.95)'
                : 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  思考过程 ({formattedThinkingTime}s)
                </Typography>
                <IconButton
                  size="small"
                  onClick={handleCopy}
                  color={copied ? "success" : "default"}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            <Box sx={{
              p: 2,
              ...getThinkingScrollbarStyles(theme)
            }}>
              <Markdown content={memoizedContent} allowHtml={false} />
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );

  // 气泡模式 - 类似聊天气泡
  const renderBubbleStyle = () => (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
      <Avatar
        sx={{
          width: 32,
          height: 32,
          mr: 1,
          backgroundColor: isThinking ? theme.palette.warning.main : theme.palette.primary.main
        }}
      >
        <PsychologyIcon sx={{ fontSize: 18 }} />
      </Avatar>
      <Box
        onClick={toggleExpanded}
        sx={{
          backgroundColor: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.08)'
            : 'rgba(0, 0, 0, 0.04)',
          borderRadius: '18px 18px 18px 4px',
          p: 1.5,
          cursor: 'pointer',
          maxWidth: '80%',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.12)'
              : 'rgba(0, 0, 0, 0.08)',
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: expanded ? 1 : 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }} component="span">
              💭 {isThinking ? '思考中...' : '思考完成'}
            </Typography>
            <Chip
              label={`${formattedThinkingTime}s`}
              size="small"
              variant="outlined"
              sx={{ height: 18, fontSize: '0.7rem' }}
            />
          </Box>
          <IconButton
            size="small"
            onClick={handleCopy}
            sx={{ ml: 1, p: 0.5 }}
            color={copied ? "success" : "default"}
          >
            <ContentCopyIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
        <Collapse in={expanded}>
          <Box sx={{
            mt: 1,
            ...getThinkingScrollbarStyles(theme)
          }}>
            <Markdown content={memoizedContent} allowHtml={false} />
          </Box>
        </Collapse>
      </Box>
    </Box>
  );

  // 时间线模式 - 左侧有时间线指示器
  const renderTimelineStyle = () => (
    <Box sx={{ display: 'flex', mb: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mr: 2 }}>
        <Box
          sx={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: isThinking ? theme.palette.warning.main : theme.palette.success.main,
            animation: isThinking ? 'pulse 1.5s infinite' : 'none',
            '@keyframes pulse': {
              '0%': { transform: 'scale(1)' },
              '50%': { transform: 'scale(1.2)' },
              '100%': { transform: 'scale(1)' }
            }
          }}
        />
        <Box
          sx={{
            width: 2,
            flex: 1,
            backgroundColor: theme.palette.divider,
            mt: 1
          }}
        />
      </Box>
      <Box sx={{ flex: 1 }}>
        <Box
          onClick={toggleExpanded}
          sx={{
            cursor: 'pointer',
            p: 1.5,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
            backgroundColor: theme.palette.background.paper,
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: theme.palette.primary.main,
              boxShadow: `0 0 0 1px ${theme.palette.primary.main}20`
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: expanded ? 1 : 0 }}>
            <TimelineIcon sx={{ mr: 1, color: theme.palette.text.secondary }} />
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, gap: 1 }}>
              <Typography variant="subtitle2" component="span">
                {isThinking ? '正在思考...' : '思考过程'}
              </Typography>
              <Chip
                label={`${formattedThinkingTime}s`}
                size="small"
                color={isThinking ? "warning" : "default"}
              />
            </Box>
            <IconButton
              size="small"
              onClick={handleCopy}
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
          <Collapse in={expanded}>
            <Box sx={{
              pl: 4,
              ...getThinkingScrollbarStyles(theme)
            }}>
              <Markdown content={memoizedContent} allowHtml={false} />
            </Box>
          </Collapse>
        </Box>
      </Box>
    </Box>
  );

  // 卡片模式 - 更突出的卡片设计
  const renderCardStyle = () => (
    <Box
      sx={{
        mb: 2,
        borderRadius: 3,
        background: `linear-gradient(135deg, ${theme.palette.primary.main}10, ${theme.palette.secondary.main}10)`,
        border: `2px solid ${theme.palette.primary.main}20`,
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 25px ${theme.palette.primary.main}20`,
          border: `2px solid ${theme.palette.primary.main}40`,
        }
      }}
    >
      <Box
        onClick={toggleExpanded}
        sx={{
          cursor: 'pointer',
          p: 2,
          background: `linear-gradient(90deg, ${theme.palette.primary.main}05, transparent)`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: expanded ? 1.5 : 0 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: isThinking ? theme.palette.warning.main : theme.palette.primary.main,
              mr: 2,
              animation: isThinking ? 'glow 2s infinite' : 'none',
              '@keyframes glow': {
                '0%': { boxShadow: `0 0 5px ${theme.palette.warning.main}` },
                '50%': { boxShadow: `0 0 20px ${theme.palette.warning.main}` },
                '100%': { boxShadow: `0 0 5px ${theme.palette.warning.main}` }
              }
            }}
          >
            <AutoAwesomeIcon sx={{ color: 'white', fontSize: 20 }} />
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              {isThinking ? '🧠 AI 正在深度思考' : '✨ 思考过程完成'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              耗时 {formattedThinkingTime} 秒
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              size="small"
              onClick={handleCopy}
              color={copied ? "success" : "primary"}
              sx={{
                backgroundColor: theme.palette.background.paper,
                '&:hover': { backgroundColor: theme.palette.action.hover }
              }}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
            <ExpandMoreIcon
              sx={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s',
                color: theme.palette.primary.main
              }}
            />
          </Box>
        </Box>
        <Collapse in={expanded}>
          <Box
            sx={{
              p: 2,
              backgroundColor: theme.palette.background.paper,
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              ...getThinkingScrollbarStyles(theme)
            }}
          >
            <Markdown content={memoizedContent} allowHtml={false} />
          </Box>
        </Collapse>
      </Box>
    </Box>
  );

  // 内联模式 - 嵌入在消息中
  const renderInlineStyle = () => (
    <Box sx={{ position: 'relative', width: '100%', mb: 1 }}>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          backgroundColor: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.05)'
            : 'rgba(0, 0, 0, 0.03)',
          borderRadius: 1,
          p: 0.5,
          border: `1px dashed ${theme.palette.divider}`,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.08)'
              : 'rgba(0, 0, 0, 0.06)',
          }
        }}
        onClick={toggleExpanded}
      >
        <LightbulbIcon
          sx={{
            fontSize: 14,
            mr: 0.5,
            color: isThinking ? theme.palette.warning.main : theme.palette.text.secondary,
            animation: isThinking ? 'pulse 1.5s infinite' : 'none',
            '@keyframes pulse': {
              '0%': { opacity: 0.6 },
              '50%': { opacity: 1 },
              '100%': { opacity: 0.6 }
            }
          }}
        />
        <Typography variant="caption" sx={{ mr: 0.5 }}>
          {isThinking ? '思考中' : '思考'}
        </Typography>
        <Chip
          label={`${formattedThinkingTime}s`}
          size="small"
          variant="outlined"
          sx={{ height: 16, fontSize: '0.6rem', mr: 0.5 }}
        />
        <IconButton
          size="small"
          onClick={handleCopy}
          sx={{ p: 0.25 }}
          color={copied ? "success" : "default"}
        >
          <ContentCopyIcon sx={{ fontSize: 12 }} />
        </IconButton>
      </Box>
      {expanded && (
        <Box
          sx={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0, // 使气泡占满整个容器宽度
            mb: 0.5,
            zIndex: 1000,
            width: '100%' // 使用100%宽度，自适应父容器
          }}
        >
          <Paper
            elevation={6}
            sx={{
              borderRadius: '18px 18px 18px 4px',
              overflow: 'hidden',
              backgroundColor: theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.95)'
                : 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(10px)',
              width: '100%' // 确保Paper也占满宽度
            }}
          >
            <Box sx={{ p: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="caption" color="text.secondary">
                思考内容:
              </Typography>
            </Box>
            <Box sx={{
              p: 1.5,
              ...getCompactScrollbarStyles(theme)
            }}>
              <Markdown content={memoizedContent} allowHtml={false} />
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );

  // 根据样式选择渲染方法
  switch (thinkingDisplayStyle) {
    case 'full':
      return renderFullStyle();
    case 'minimal':
      return renderMinimalStyle();
    case 'bubble':
      return renderBubbleStyle();
    case 'timeline':
      return renderTimelineStyle();
    case 'card':
      return renderCardStyle();
    case 'inline':
      return renderInlineStyle();
    case 'compact':
    default:
      return renderCompactStyle();
  }
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
