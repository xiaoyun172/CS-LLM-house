import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Collapse,
  IconButton,
  Chip,
  useTheme,
  Divider
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CodeIcon from '@mui/icons-material/Code';
import { styled } from '@mui/material/styles';

import { MessageBlockStatus } from '../../../shared/types/newMessage';
import type { ToolMessageBlock } from '../../../shared/types/newMessage';
import Markdown from '../Markdown';
import { EventEmitter } from '../../../shared/services/EventEmitter';

interface Props {
  block: ToolMessageBlock;
}

/**
 * 工具调用块组件
 * 显示AI的工具调用过程和结果
 */
const ToolBlock: React.FC<Props> = ({ block }) => {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const theme = useTheme();

  // 使用记忆化的block内容，避免不必要的重渲染

  const isProcessing = block.status === MessageBlockStatus.STREAMING ||
                       block.status === MessageBlockStatus.PROCESSING;

  // 复制工具调用内容到剪贴板
  const handleCopyCall = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发折叠/展开
    if (block.input) {
      const callText = JSON.stringify(block.input, null, 2);

      navigator.clipboard.writeText(callText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      EventEmitter.emit('ui:copy_success', { content: '已复制工具调用内容' });
    }
  }, [block.input]);

  // 复制工具结果内容到剪贴板
  const handleCopyResult = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发折叠/展开
    if (block.output) {
      const resultText = JSON.stringify(block.output, null, 2);

      navigator.clipboard.writeText(resultText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      EventEmitter.emit('ui:copy_success', { content: '已复制工具结果内容' });
    }
  }, [block.output]);

  // 切换折叠/展开状态
  const toggleExpanded = useCallback(() => {
    setExpanded(!expanded);
  }, [expanded]);

  // 格式化工具调用内容
  const formatToolCall = useCallback(() => {
    if (!block.input) return '';

    try {
      // 尝试格式化JSON对象
      return JSON.stringify(block.input, null, 2);
    } catch (e) {
      return String(block.input);
    }
  }, [block.input]);

  // 格式化工具结果内容
  const formatToolResult = useCallback(() => {
    if (!block.output) return '';

    try {
      // 尝试格式化JSON对象
      return JSON.stringify(block.output, null, 2);
    } catch (e) {
      return String(block.output);
    }
  }, [block.output]);

  // 获取工具名称
  const getToolName = useCallback(() => {
    return block.name || '工具调用';
  }, [block.name]);

  return (
    <StyledPaper
      elevation={0}
      sx={{
        mb: 2,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    >
      {/* 标题栏 */}
      <Box
        onClick={toggleExpanded}
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 1.5,
          cursor: 'pointer',
          borderBottom: expanded ? `1px solid ${theme.palette.divider}` : 'none',
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.05)'
              : 'rgba(0, 0, 0, 0.02)',
          }
        }}
      >
        <CodeIcon
          sx={{
            mr: 1,
            color: theme.palette.info.main
          }}
        />

        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          {getToolName()}
          {isProcessing && (
            <Chip
              label="处理中"
              size="small"
              color="info"
              variant="outlined"
              sx={{ ml: 1, height: 20 }}
            />
          )}
        </Typography>

        <ExpandMoreIcon
          sx={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s'
          }}
        />
      </Box>

      {/* 内容区域 */}
      <Collapse in={expanded}>
        <Box sx={{ p: 2 }}>
          {/* 工具调用部分 */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                调用参数
              </Typography>
              <IconButton
                size="small"
                onClick={handleCopyCall}
                color={copied ? "success" : "default"}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Box>
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                backgroundColor: theme.palette.mode === 'dark'
                  ? 'rgba(0, 0, 0, 0.2)'
                  : 'rgba(0, 0, 0, 0.03)',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              {formatToolCall()}
            </Paper>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* 工具结果部分 */}
          {(block.output || isProcessing) && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  调用结果
                </Typography>
                {!isProcessing && (
                  <IconButton
                    size="small"
                    onClick={handleCopyResult}
                    color={copied ? "success" : "default"}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
              {isProcessing ? (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    正在处理工具调用...
                  </Typography>
                </Box>
              ) : (
                <Markdown content={formatToolResult()} allowHtml={false} />
              )}
            </Box>
          )}
        </Box>
      </Collapse>
    </StyledPaper>
  );
};

// 样式化组件
const StyledPaper = styled(Paper)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  boxShadow: 'none',
  transition: theme.transitions.create(['background-color', 'box-shadow']),
}));

export default React.memo(ToolBlock);
