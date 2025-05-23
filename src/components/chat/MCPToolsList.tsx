import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  PlayArrow as PlayAllIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import type { MCPToolResponse, MCPCallToolResponse } from '../../shared/types';
import { parseAndCallTools } from '../../shared/utils/mcpToolParser';
// MCPToolBlock 已被移除，使用统一的 ToolBlock 组件

interface MCPToolsListProps {
  toolResponses: MCPToolResponse[];
  onUpdate?: (toolResponses: MCPToolResponse[]) => void;
  autoExecute?: boolean;
  showControls?: boolean;
}

const MCPToolsList: React.FC<MCPToolsListProps> = ({
  toolResponses,
  onUpdate,
  autoExecute = false,
  showControls = true
}) => {
  const [tools, setTools] = useState<MCPToolResponse[]>(toolResponses);
  const [executing, setExecuting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setTools(toolResponses);
  }, [toolResponses]);

  useEffect(() => {
    if (autoExecute && tools.some(tool => tool.status === 'pending')) {
      handleExecuteAll();
    }
  }, [autoExecute, tools]);

  const handleToolUpdate = (updatedTool: MCPToolResponse, _result: MCPCallToolResponse) => {
    const updatedTools = tools.map(tool =>
      tool.id === updatedTool.id ? updatedTool : tool
    );

    setTools(updatedTools);

    if (onUpdate) {
      onUpdate(updatedTools);
    }
  };

  const handleExecuteAll = async () => {
    if (executing) return;

    const pendingTools = tools.filter(tool => tool.status === 'pending');
    if (pendingTools.length === 0) return;

    setExecuting(true);
    setProgress(0);

    try {
      let completedCount = 0;

      // 并行执行所有待执行的工具
      const promises = pendingTools.map(async (tool) => {
        try {
          tool.status = 'invoking';

          // 更新工具状态
          const updatedTools = tools.map(t => t.id === tool.id ? tool : t);
          setTools([...updatedTools]);

          // 调用工具
          const result = await parseAndCallTools([tool], [], (toolResponse, callResult) => {
            handleToolUpdate(toolResponse, callResult);
          });

          completedCount++;
          setProgress((completedCount / pendingTools.length) * 100);

          return result;
        } catch (error) {
          console.error(`工具 ${tool.tool.name} 执行失败:`, error);

          const errorResult: MCPCallToolResponse = {
            isError: true,
            content: [
              {
                type: 'text',
                text: `工具执行失败: ${error instanceof Error ? error.message : '未知错误'}`
              }
            ]
          };

          tool.status = 'error';
          tool.response = errorResult;

          handleToolUpdate(tool, errorResult);

          completedCount++;
          setProgress((completedCount / pendingTools.length) * 100);
        }
      });

      await Promise.all(promises);
    } catch (error) {
      console.error('批量执行工具失败:', error);
    } finally {
      setExecuting(false);
      setProgress(0);
    }
  };

  const handleRetryFailed = () => {
    const updatedTools = tools.map(tool =>
      tool.status === 'error' ? { ...tool, status: 'pending' as const, response: undefined } : tool
    );

    setTools(updatedTools);

    if (onUpdate) {
      onUpdate(updatedTools);
    }
  };

  const getStatusCounts = () => {
    const counts = {
      pending: 0,
      invoking: 0,
      done: 0,
      error: 0
    };

    tools.forEach(tool => {
      counts[tool.status]++;
    });

    return counts;
  };

  const statusCounts = getStatusCounts();
  const hasFailedTools = statusCounts.error > 0;
  const hasPendingTools = statusCounts.pending > 0;
  const allCompleted = statusCounts.pending === 0 && statusCounts.invoking === 0;

  if (tools.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mb: 2 }}>
      {/* 工具列表头部 */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            MCP 工具调用
            <Chip
              label={`${tools.length} 个工具`}
              size="small"
              variant="outlined"
            />
          </Typography>

          {showControls && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {hasFailedTools && (
                <Button
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={handleRetryFailed}
                  color="error"
                  variant="outlined"
                >
                  重试失败
                </Button>
              )}

              {hasPendingTools && (
                <Button
                  size="small"
                  startIcon={<PlayAllIcon />}
                  onClick={handleExecuteAll}
                  disabled={executing}
                  variant="contained"
                >
                  {executing ? '执行中...' : '执行全部'}
                </Button>
              )}
            </Box>
          )}
        </Box>

        {/* 状态统计 */}
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          {statusCounts.pending > 0 && (
            <Chip label={`待执行: ${statusCounts.pending}`} size="small" color="default" />
          )}
          {statusCounts.invoking > 0 && (
            <Chip label={`执行中: ${statusCounts.invoking}`} size="small" color="primary" />
          )}
          {statusCounts.done > 0 && (
            <Chip label={`已完成: ${statusCounts.done}`} size="small" color="success" />
          )}
          {statusCounts.error > 0 && (
            <Chip label={`失败: ${statusCounts.error}`} size="small" color="error" />
          )}
        </Box>

        {/* 进度条 */}
        {executing && (
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ mb: 1 }}
          />
        )}

        {/* 状态提示 */}
        {allCompleted && statusCounts.done > 0 && statusCounts.error === 0 && (
          <Alert severity="success" sx={{ mb: 1 }}>
            所有工具执行完成！
          </Alert>
        )}

        {hasFailedTools && (
          <Alert severity="error" sx={{ mb: 1 }}>
            有 {statusCounts.error} 个工具执行失败，请检查错误信息或重试。
          </Alert>
        )}
      </Box>

      {/* 工具块列表 */}
      <Box>
        {tools.map((toolResponse) => (
          <Box key={toolResponse.id} sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              工具: {toolResponse.tool.name}
            </Typography>
            <Typography variant="body2">
              状态: {toolResponse.status}
            </Typography>
            {toolResponse.response && (
              <Typography variant="body2">
                结果: {JSON.stringify(toolResponse.response, null, 2)}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default MCPToolsList;
