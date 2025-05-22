import React, { useState, useEffect, useRef } from 'react';
import { Paper, Typography, Box, Collapse } from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import { useSelector } from 'react-redux';
import type { RootState } from '../../shared/store';
import {
  isReasoningInProgress,
  cleanReasoningContent,
  formatThinkingTimeSeconds
} from '../../shared/utils/thinkingUtils';

// 思考过程显示样式类型
export type ThinkingDisplayStyle = 'compact' | 'full' | 'hidden';

// 思考过程显示样式常量
export const ThinkingDisplayStyle = {
  COMPACT: 'compact' as ThinkingDisplayStyle,
  FULL: 'full' as ThinkingDisplayStyle,
  HIDDEN: 'hidden' as ThinkingDisplayStyle
};

interface ThinkingProcessProps {
  reasoning?: string;
  reasoningTime?: number;
}

const ThinkingProcess: React.FC<ThinkingProcessProps> = ({ reasoning, reasoningTime }) => {
  const [expanded, setExpanded] = useState(false);  // 默认关闭思考过程
  const prevReasoningRef = useRef<string>('');
  const reasoningRef = useRef<HTMLDivElement>(null);

  // 从设置中获取思考过程显示样式
  const thinkingStyle = useSelector((state: RootState) =>
    (state.settings as any).thinkingDisplayStyle || ThinkingDisplayStyle.COMPACT
  );

  // 更新视图时，如果思考过程展开，自动滚动到底部
  useEffect(() => {
    if (!reasoning) return;
    if (expanded && reasoningRef.current && reasoning !== prevReasoningRef.current) {
      reasoningRef.current.scrollTop = reasoningRef.current.scrollHeight;
      prevReasoningRef.current = reasoning;
    }
  }, [reasoning, expanded]);

  // 对于完整展示模式，默认展开
  useEffect(() => {
    if (thinkingStyle === ThinkingDisplayStyle.FULL) {
      setExpanded(true);
    }
  }, [thinkingStyle]);

  // 提前返回 - 没有思考过程或设置为隐藏时不显示
  if (!reasoning || thinkingStyle === ThinkingDisplayStyle.HIDDEN) return null;

  // 使用工具函数判断思考过程是否正在进行中
  const reasoningInProgress = reasoning ? isReasoningInProgress(reasoning) : false;

  // 使用工具函数提取思考过程内容，去除标签
  const cleanedReasoning = reasoning ? cleanReasoningContent(reasoning) : '';

  // 使用工具函数将毫秒转换为秒，保留一位小数
  const thinkingTimeInSeconds = formatThinkingTimeSeconds(reasoningTime);

  // 紧凑样式 - 类似截图中的样式
  if (thinkingStyle === ThinkingDisplayStyle.COMPACT) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          mb: 1,
          maxWidth: '100%'
        }}
      >
        <Paper
          elevation={0}
          onClick={() => setExpanded(!expanded)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 1.5,
            py: 1,
            backgroundColor: '#f7f7f7',
            borderRadius: '18px',
            cursor: 'pointer',
            border: '1px solid #e0e0e0',
            '&:hover': {
              backgroundColor: '#f0f0f0',
            }
          }}
        >
          <LightbulbOutlinedIcon
            sx={{
              mr: 1,
              fontSize: '18px',
              color: '#65b0ff'
            }}
          />
          <Typography
            variant="body2"
            sx={{
              color: '#65b0ff',
              fontWeight: 'medium',
              flexGrow: 1
            }}
          >
            {reasoningInProgress ? '正在深度思考...' : `已完成深度思考（用时${thinkingTimeInSeconds}秒）`}
          </Typography>
          {expanded ?
            <KeyboardArrowUpIcon fontSize="small" sx={{ color: '#999' }} /> :
            <KeyboardArrowDownIcon fontSize="small" sx={{ color: '#999' }} />
          }
        </Paper>

        <Collapse in={expanded}>
          <Paper
            elevation={0}
            ref={reasoningRef}
            sx={{
              p: 1.5,
              mt: 1,
              maxHeight: '400px',
              overflowY: 'auto',
              backgroundColor: '#f5f7fa',
              borderRadius: 1,
              border: '1px solid #ebedf0',
              fontSize: '13px',
              lineHeight: 1.5,
              color: '#666',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {cleanedReasoning}
          </Paper>
        </Collapse>
      </Box>
    );
  }

  // 完整展示样式 - 原有样式的改进版
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        mb: 1,
        maxWidth: '100%'
      }}
    >
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          color: '#65b0ff',
          fontSize: '14px',
          cursor: 'pointer',
          mb: 1
        }}
      >
        <PsychologyIcon sx={{ mr: 0.5, fontSize: '16px' }} />
        <Typography
          variant="caption"
          sx={{
            color: '#65b0ff',
            fontWeight: 'medium',
            mr: 0.5
          }}
        >
          {reasoningInProgress ? '正在思考中...' : `已完成深度思考（用时${thinkingTimeInSeconds}秒）`}
        </Typography>
        {expanded ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
      </Box>

      <Collapse in={expanded}>
        <Paper
          elevation={0}
          ref={reasoningRef}
          sx={{
            p: 1.5,
            mb: 1,
            maxHeight: '400px',
            overflowY: 'auto',
            backgroundColor: '#f5f7fa',
            borderRadius: 1,
            border: '1px solid #ebedf0',
            fontSize: '13px',
            lineHeight: 1.5,
            color: '#666',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {cleanedReasoning}
        </Paper>
      </Collapse>
    </Box>
  );
};

export default ThinkingProcess;