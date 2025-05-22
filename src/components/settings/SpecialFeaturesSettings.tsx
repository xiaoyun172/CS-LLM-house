import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  FormControlLabel,
  FormGroup,
  Switch,
  RadioGroup,
  Radio,
  Divider,
  Paper,
  useTheme,
  Tooltip,
  IconButton
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../shared/store';
import { settingsActions } from '../../shared/store/slices/settingsSlice';

/**
 * 特殊功能设置组件
 * 用于配置思考过程显示、多模型对比和工具调用等特殊功能
 */
const SpecialFeaturesSettings: React.FC = () => {
  const theme = useTheme();
  const dispatch = useDispatch();

  // 从Redux获取设置
  const settings = useSelector((state: RootState) => state.settings);

  // 思考过程显示样式
  const thinkingDisplayStyle = settings.thinkingDisplayStyle || 'compact';

  // 思考过程自动折叠
  const thoughtAutoCollapse = settings.thoughtAutoCollapse !== false;

  // 多模型对比显示样式
  const multiModelDisplayStyle = settings.multiModelDisplayStyle || 'horizontal';

  // 工具调用显示详情
  const showToolDetails = settings.showToolDetails !== false;

  // 引用显示详情
  const showCitationDetails = settings.showCitationDetails !== false;

  // 更新思考过程显示样式
  const handleThinkingDisplayStyleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as 'compact' | 'full' | 'hidden';
    dispatch(settingsActions.updateSettings({
      thinkingDisplayStyle: value
    }));
  };

  // 更新思考过程自动折叠
  const handleThoughtAutoCollapseChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(settingsActions.updateSettings({
      thoughtAutoCollapse: event.target.checked
    }));
  };

  // 更新多模型对比显示样式
  const handleMultiModelDisplayStyleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as 'horizontal' | 'grid' | 'vertical';
    dispatch(settingsActions.updateSettings({
      multiModelDisplayStyle: value
    }));
  };

  // 更新工具调用显示详情
  const handleShowToolDetailsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(settingsActions.updateSettings({
      showToolDetails: event.target.checked
    }));
  };

  // 更新引用显示详情
  const handleShowCitationDetailsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(settingsActions.updateSettings({
      showCitationDetails: event.target.checked
    }));
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        mb: 3,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: '8px'
      }}
    >
      <Typography variant="h6" gutterBottom>
        特殊功能设置
      </Typography>

      <Divider sx={{ my: 2 }} />

      {/* 思考过程设置 */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1">思考过程显示</Typography>
          <Tooltip title="配置AI思考过程的显示方式">
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <FormControl component="fieldset">
          <RadioGroup
            value={thinkingDisplayStyle}
            onChange={handleThinkingDisplayStyleChange}
          >
            <FormControlLabel
              value="compact"
              control={<Radio size="small" />}
              label="紧凑模式（可折叠）"
            />
            <FormControlLabel
              value="full"
              control={<Radio size="small" />}
              label="完整模式（始终展开）"
            />
            <FormControlLabel
              value="hidden"
              control={<Radio size="small" />}
              label="隐藏（不显示思考过程）"
            />
          </RadioGroup>
        </FormControl>

        {thinkingDisplayStyle === 'compact' && (
          <FormGroup sx={{ mt: 1, ml: 4 }}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={thoughtAutoCollapse}
                  onChange={handleThoughtAutoCollapseChange}
                />
              }
              label="思考完成后自动折叠"
            />
          </FormGroup>
        )}
      </Box>

      {/* 多模型对比设置 */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1">多模型对比显示</Typography>
          <Tooltip title="配置多模型对比的显示方式">
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <FormControl component="fieldset">
          <RadioGroup
            value={multiModelDisplayStyle}
            onChange={handleMultiModelDisplayStyleChange}
          >
            <FormControlLabel
              value="horizontal"
              control={<Radio size="small" />}
              label="水平标签页（默认）"
            />
            <FormControlLabel
              value="grid"
              control={<Radio size="small" />}
              label="网格布局（并排显示）"
            />
            <FormControlLabel
              value="vertical"
              control={<Radio size="small" />}
              label="垂直布局（堆叠显示）"
            />
          </RadioGroup>
        </FormControl>
      </Box>

      {/* 工具调用设置 */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1">工具调用设置</Typography>
          <Tooltip title="配置工具调用的显示详情">
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={showToolDetails}
                onChange={handleShowToolDetailsChange}
              />
            }
            label="显示工具调用详情"
          />
        </FormGroup>
      </Box>

      {/* 引用设置 */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1">引用设置</Typography>
          <Tooltip title="配置引用的显示详情">
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={showCitationDetails}
                onChange={handleShowCitationDetailsChange}
              />
            }
            label="显示引用详情"
          />
        </FormGroup>
      </Box>
    </Paper>
  );
};

export default SpecialFeaturesSettings;
