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
import {
  ExpandMore as ExpandMoreIcon,
  ContentCopy as ContentCopyIcon,
  Code as CodeIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

import { MessageBlockStatus } from '../../../shared/types/newMessage';
import type { ToolMessageBlock } from '../../../shared/types/newMessage';
import Markdown from '../Markdown';
import { EventEmitter } from '../../../shared/services/EventEmitter';

interface Props {
  block: ToolMessageBlock;
}

/**
 * 工具调用块组件 - 基于电脑版的实现
 * 显示AI的工具调用过程和结果
 */
const ToolBlock: React.FC<Props> = ({ block }) => {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const theme = useTheme();

  // 获取工具响应数据 - 按照电脑版的方式
  const toolResponse = block.metadata?.rawMcpToolResponse;

  const isProcessing = block.status === MessageBlockStatus.STREAMING ||
                       block.status === MessageBlockStatus.PROCESSING;

  // 复制工具调用内容到剪贴板
  const handleCopyCall = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发折叠/展开
    const input = block.input || (block.toolResponses?.[0]?.arguments);
    if (input) {
      const callText = JSON.stringify(input, null, 2);

      navigator.clipboard.writeText(callText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      EventEmitter.emit('ui:copy_success', { content: '已复制工具调用内容' });
    }
  }, [block.input, block.toolResponses]);

  // 切换折叠/展开状态
  const toggleExpanded = useCallback(() => {
    setExpanded(!expanded);
  }, [expanded]);

  // 格式化工具调用参数 - 按照电脑版的方式
  const formatToolCall = useCallback(() => {
    const params = toolResponse?.arguments || block.input || (block.toolResponses?.[0]?.arguments);
    if (!params) return '';

    try {
      return JSON.stringify(params, null, 2);
    } catch (e) {
      return String(params);
    }
  }, [toolResponse, block.input, block.toolResponses]);

  // 格式化工具结果内容 - 按照电脑版的方式
  const formatToolResult = useCallback(() => {
    // 按照电脑版的方式，优先使用 block.content（这是我们在 messageThunk 中设置的）
    if (block.content && typeof block.content === 'object') {
      const response = block.content as any;

      // 如果是错误响应
      if (response.isError) {
        const errorContent = response.content?.[0]?.text || '工具调用失败';
        return `错误: ${errorContent}`;
      }

      // 处理正常响应
      if (response.content && response.content.length > 0) {
        // 如果只有一个文本内容，尝试格式化 JSON
        if (response.content.length === 1 && response.content[0].type === 'text') {
          const text = response.content[0].text || '';
          try {
            const parsed = JSON.parse(text);
            return JSON.stringify(parsed, null, 2);
          } catch {
            return text;
          }
        }

        // 多个内容或非文本内容，格式化显示
        return response.content.map((item: any) => {
          switch (item.type) {
            case 'text':
              // 尝试格式化 JSON 文本
              const text = item.text || '';
              try {
                const parsed = JSON.parse(text);
                return JSON.stringify(parsed, null, 2);
              } catch {
                return text;
              }
            case 'image':
              return `[图像数据: ${item.mimeType || 'unknown'}]`;
            case 'resource':
              return `[资源数据: ${item.mimeType || 'unknown'}]`;
            default:
              return `[未知内容类型: ${item.type}]`;
          }
        }).join('\n\n');
      }

      return '无响应内容';
    }

    // 兼容旧格式
    if (block.output) {
      try {
        return JSON.stringify(block.output, null, 2);
      } catch (e) {
        return String(block.output);
      }
    }

    // 兼容 toolResponses 格式
    const toolResponseData = block.toolResponses?.[0];
    if (toolResponseData?.response) {
      const { response } = toolResponseData;

      if (response.isError) {
        const errorContent = response.content?.[0]?.text || '工具调用失败';
        return `错误: ${errorContent}`;
      }

      if (response.content && response.content.length > 0) {
        if (response.content.length === 1 && response.content[0].type === 'text') {
          const text = response.content[0].text || '';
          try {
            const parsed = JSON.parse(text);
            return JSON.stringify(parsed, null, 2);
          } catch {
            return text;
          }
        }

        return response.content.map((item) => {
          switch (item.type) {
            case 'text':
              const text = item.text || '';
              try {
                const parsed = JSON.parse(text);
                return JSON.stringify(parsed, null, 2);
              } catch {
                return text;
              }
            case 'image':
              return `[图像数据: ${item.mimeType || 'unknown'}]`;
            case 'resource':
              return `[资源数据: ${item.mimeType || 'unknown'}]`;
            default:
              return `[未知内容类型: ${item.type}]`;
          }
        }).join('\n\n');
      }
    }

    return '无响应内容';
  }, [block.content, block.output, block.toolResponses]);

  // 复制工具结果内容到剪贴板
  const handleCopyResult = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发折叠/展开
    const resultText = formatToolResult();
    if (resultText) {
      navigator.clipboard.writeText(resultText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      EventEmitter.emit('ui:copy_success', { content: '已复制工具结果内容' });
    }
  }, [formatToolResult]);

  // 获取工具名称
  const getToolName = useCallback(() => {
    return block.name || block.toolName || (block.toolResponses?.[0]?.tool?.name) || '工具调用';
  }, [block.name, block.toolName, block.toolResponses]);

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
          {(block.content || block.output || block.toolResponses?.[0]?.response || isProcessing) && (
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
