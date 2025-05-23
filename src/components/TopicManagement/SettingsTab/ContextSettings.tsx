import React, { useState } from 'react';
import {
  Box,
  Typography,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Collapse,
  IconButton,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import TuneIcon from '@mui/icons-material/Tune';
import type { MathRendererType } from '../../../shared/types';
import type { ThinkingOption } from '../../../shared/config/reasoningConfig';

interface ContextSettingsProps {
  contextLength: number;
  contextCount: number;
  mathRenderer: MathRendererType;
  thinkingEffort: ThinkingOption;
  onContextLengthChange: (value: number) => void;
  onContextCountChange: (value: number) => void;
  onMathRendererChange: (value: MathRendererType) => void;
  onThinkingEffortChange: (value: ThinkingOption) => void;
}

/**
 * 可折叠的上下文设置组件
 */
export default function ContextSettings({
  contextLength,
  contextCount,
  mathRenderer,
  thinkingEffort,
  onContextLengthChange,
  onContextCountChange,
  onMathRendererChange,
  onThinkingEffortChange
}: ContextSettingsProps) {
  const [expanded, setExpanded] = useState(false);

  // 处理上下文长度变化
  const handleContextLengthChange = (_event: Event, newValue: number | number[]) => {
    const value = newValue as number;
    onContextLengthChange(value);
  };

  // 处理上下文消息数变化
  const handleContextCountChange = (_event: Event, newValue: number | number[]) => {
    const value = newValue as number;
    onContextCountChange(value);
  };

  // 处理数学渲染器变化
  const handleMathRendererChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const value = event.target.value as MathRendererType;
    onMathRendererChange(value);
  };

  // 处理思维链长度变化
  const handleThinkingEffortChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const value = event.target.value as ThinkingOption;
    onThinkingEffortChange(value);
  };

  // 处理文本框输入
  const handleTextFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 64000) {
      onContextLengthChange(value);
    }
  };

  return (
    <Box>
      {/* 可折叠的标题栏 */}
      <ListItem
        component="div"
        onClick={() => setExpanded(!expanded)}
        sx={{
          px: 2,
          py: 0.75,
          cursor: 'pointer',
          position: 'relative',
          zIndex: 1,
          '&:hover': {
            backgroundColor: 'transparent !important',
            transform: 'none !important',
            boxShadow: 'none !important'
          },
          '&:focus': {
            backgroundColor: 'transparent !important'
          },
          '&:active': {
            backgroundColor: 'rgba(0, 0, 0, 0.02)'
          },
          '& *': {
            '&:hover': {
              backgroundColor: 'transparent !important',
              transform: 'none !important'
            }
          }
        }}
      >
        <TuneIcon sx={{ mr: 1.5, color: 'primary.main' }} />
        <ListItemText
          primary="上下文设置"
          secondary={`长度: ${contextLength === 64000 ? '不限' : contextLength} 字符 | 消息数: ${contextCount === 100 ? '最大' : contextCount} 条`}
          primaryTypographyProps={{
            fontWeight: 'medium',
            sx: { mt: 1, mb: 0.25 } // 增加上边距，添加下边距
          }}
          secondaryTypographyProps={{
            fontSize: '0.75rem',
            sx: { mt: 0.5, mb: 0.5 } // 增加上下边距
          }}
        />
        <ListItemSecondaryAction>
          <IconButton edge="end" size="small" sx={{ padding: '4px' }}>
            {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </ListItemSecondaryAction>
      </ListItem>

      {/* 可折叠的内容区域 */}
      <Collapse
        in={expanded}
        timeout={{ enter: 300, exit: 200 }}
        easing={{ enter: 'cubic-bezier(0.4, 0, 0.2, 1)', exit: 'cubic-bezier(0.4, 0, 0.6, 1)' }}
        unmountOnExit
      >
        <Box sx={{ px: 2, pb: 2 }}>
          {/* 上下文长度控制 */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ width: '100%', mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="body2" fontWeight="medium">
                  上下文长度: {contextLength === 64000 ? '不限' : contextLength} 字符
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  每条消息的最大上下文长度
                </Typography>
              </Box>
              <Box sx={{ width: '80px' }}>
                <TextField
                  size="small"
                  type="number"
                  value={contextLength}
                  onChange={handleTextFieldChange}
                  slotProps={{
                    htmlInput: { min: 0, max: 64000 }
                  }}
                />
              </Box>
            </Box>
            <Slider
              value={contextLength}
              onChange={handleContextLengthChange}
              min={0}
              max={64000}
              step={1000}
              marks={[
                { value: 0, label: '0' },
                { value: 16000, label: '16K' },
                { value: 32000, label: '32K' },
                { value: 48000, label: '48K' },
                { value: 64000, label: '64K' }
              ]}
            />
          </Box>

          {/* 上下文消息数量控制 */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ width: '100%', mb: 1 }}>
              <Typography variant="body2" fontWeight="medium">
                上下文消息数: {contextCount === 100 ? '最大' : contextCount} 条
              </Typography>
              <Typography variant="caption" color="text.secondary">
                每次请求包含的历史消息数量
              </Typography>
            </Box>
            <Slider
              value={contextCount}
              onChange={handleContextCountChange}
              min={0}
              max={100}
              step={1}
              marks={[
                { value: 0, label: '0' },
                { value: 25, label: '25' },
                { value: 50, label: '50' },
                { value: 75, label: '75' },
                { value: 100, label: '最大' }
              ]}
            />
          </Box>

          {/* 思维链长度选择 */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ width: '100%', mb: 1 }}>
              <Typography variant="body2" fontWeight="medium">
                思维链长度
              </Typography>
              <Typography variant="caption" color="text.secondary">
                设置AI思考过程的深度，影响回答质量和速度
              </Typography>
            </Box>
            <FormControl fullWidth size="small" sx={{ mt: 1 }}>
              <InputLabel id="thinking-effort-label">思维链长度</InputLabel>
              <Select
                labelId="thinking-effort-label"
                id="thinking-effort-select"
                value={thinkingEffort}
                label="思维链长度"
                onChange={handleThinkingEffortChange as any}
              >
                <MenuItem value="off">关闭思考</MenuItem>
                <MenuItem value="low">低强度思考</MenuItem>
                <MenuItem value="medium">中强度思考（推荐）</MenuItem>
                <MenuItem value="high">高强度思考</MenuItem>
                <MenuItem value="auto">自动思考</MenuItem>
              </Select>
            </FormControl>
            <Typography
              variant="caption"
              sx={{
                mt: 1,
                color: 'text.secondary',
                fontSize: '0.7rem',
                lineHeight: 1.2,
                display: 'block'
              }}
            >
              {thinkingEffort === 'off' && '不启用思考过程，AI将直接回答'}
              {thinkingEffort === 'low' && '简单思考，适合快速回答'}
              {thinkingEffort === 'medium' && '平衡思考深度和响应速度，适合大多数场景'}
              {thinkingEffort === 'high' && '深度思考，适合复杂问题分析'}
              {thinkingEffort === 'auto' && '根据问题复杂度自动调整思考深度'}
            </Typography>
          </Box>

          {/* 数学公式渲染器选择 */}
          <Box>
            <FormControl fullWidth size="small">
              <InputLabel id="math-renderer-label">数学公式渲染器</InputLabel>
              <Select
                labelId="math-renderer-label"
                id="math-renderer-select"
                value={mathRenderer}
                label="数学公式渲染器"
                onChange={handleMathRendererChange as any}
              >
                <MenuItem value="KaTeX">KaTeX (轻量)</MenuItem>
                <MenuItem value="MathJax">MathJax (兼容性好)</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}
