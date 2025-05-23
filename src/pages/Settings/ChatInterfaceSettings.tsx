import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  FormGroup,
  FormControlLabel,
  Switch,
  Tooltip,
  IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InfoIcon from '@mui/icons-material/Info';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../shared/store';
import { updateSettings } from '../../shared/store/settingsSlice';
import { ThinkingDisplayStyle } from '../../components/message/blocks/ThinkingBlock';

const ChatInterfaceSettings: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);

  // 获取所有设置项
  const thinkingDisplayStyle = (settings as any).thinkingDisplayStyle || ThinkingDisplayStyle.COMPACT;
  const thoughtAutoCollapse = (settings as any).thoughtAutoCollapse !== false;
  const multiModelDisplayStyle = (settings as any).multiModelDisplayStyle || 'horizontal';
  const showToolDetails = (settings as any).showToolDetails !== false;
  const showCitationDetails = (settings as any).showCitationDetails !== false;
  const toolbarDisplayStyle = settings.toolbarDisplayStyle || 'both';
  const showSystemPromptBubble = settings.showSystemPromptBubble !== false;

  const handleBack = () => {
    navigate('/settings/appearance');
  };

  // 事件处理函数
  const handleThinkingStyleChange = (event: { target: { value: any } }) => {
    dispatch(updateSettings({
      thinkingDisplayStyle: event.target.value
    }));
  };

  const handleThoughtAutoCollapseChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(updateSettings({
      thoughtAutoCollapse: event.target.checked
    }));
  };

  const handleMultiModelDisplayStyleChange = (event: { target: { value: any } }) => {
    dispatch(updateSettings({
      multiModelDisplayStyle: event.target.value
    }));
  };

  const handleShowToolDetailsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(updateSettings({
      showToolDetails: event.target.checked
    }));
  };

  const handleShowCitationDetailsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(updateSettings({
      showCitationDetails: event.target.checked
    }));
  };

  const handleToolbarStyleChange = (event: { target: { value: any } }) => {
    dispatch(updateSettings({
      toolbarDisplayStyle: event.target.value
    }));
  };

  const handleSystemPromptBubbleChange = (event: { target: { value: any } }) => {
    dispatch(updateSettings({
      showSystemPromptBubble: event.target.value === 'show'
    }));
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          padding: 2,
          borderBottom: 1,
          borderColor: 'divider',
          position: 'sticky',
          top: 0,
          backgroundColor: 'background.paper',
          zIndex: 10
        }}
      >
        <ArrowBackIcon
          sx={{ mr: 2, cursor: 'pointer' }}
          onClick={handleBack}
        />
        <Typography variant="h6" color="primary">
          聊天界面设置
        </Typography>
      </Box>

      <Box sx={{ p: 2 }}>
        {/* 思考过程显示设置 */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #eee' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">思考过程显示</Typography>
            <Tooltip title="配置AI思考过程的显示方式和行为">
              <IconButton size="small" sx={{ ml: 1 }}>
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel>显示样式</InputLabel>
            <Select
              value={thinkingDisplayStyle}
              onChange={handleThinkingStyleChange}
              label="显示样式"
            >
              <MenuItem value={ThinkingDisplayStyle.COMPACT}>紧凑模式（可折叠）</MenuItem>
              <MenuItem value={ThinkingDisplayStyle.FULL}>完整模式（始终展开）</MenuItem>
              <MenuItem value={ThinkingDisplayStyle.HIDDEN}>隐藏（不显示思考过程）</MenuItem>
            </Select>
          </FormControl>

          <FormGroup>
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

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            设置AI助手思考过程的显示方式。紧凑模式仅显示一行可点击展开，完整模式会显示思考过程的标题和按钮，隐藏则不显示思考过程。
          </Typography>
        </Paper>

        {/* 多模型对比显示设置 */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #eee' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">多模型对比显示</Typography>
            <Tooltip title="配置多模型对比时的布局方式">
              <IconButton size="small" sx={{ ml: 1 }}>
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel>布局方式</InputLabel>
            <Select
              value={multiModelDisplayStyle}
              onChange={handleMultiModelDisplayStyleChange}
              label="布局方式"
            >
              <MenuItem value="horizontal">水平布局（默认）</MenuItem>
              <MenuItem value="vertical">垂直布局（并排显示）</MenuItem>
              <MenuItem value="single">单独布局（堆叠显示）</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            设置多模型对比时的布局方式。水平布局将模型响应并排显示，垂直布局将模型响应上下排列，单独布局将模型响应堆叠显示。
          </Typography>
        </Paper>

        {/* 工具栏显示设置 */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #eee' }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            工具栏显示方式
          </Typography>

          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel>工具栏显示样式</InputLabel>
            <Select
              value={toolbarDisplayStyle}
              onChange={handleToolbarStyleChange}
              label="工具栏显示样式"
            >
              <MenuItem value="both">图标+文字（默认）</MenuItem>
              <MenuItem value="icon">仅图标</MenuItem>
              <MenuItem value="text">仅文字</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            设置聊天界面顶部工具栏的显示方式。可以选择同时显示图标和文字，或仅显示图标，或仅显示文字。
          </Typography>
        </Paper>

        {/* 工具调用设置 */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #eee' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
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

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            控制是否显示工具调用的详细信息，包括调用参数和返回结果。
          </Typography>
        </Paper>

        {/* 引用设置 */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #eee' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
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

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            控制是否显示引用的详细信息，包括引用来源和相关内容。
          </Typography>
        </Paper>

        <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #eee' }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            系统提示词气泡设置
          </Typography>

          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel id="prompt-bubble-style-label">系统提示词气泡显示</InputLabel>
            <Select
              labelId="prompt-bubble-style-label"
              value={showSystemPromptBubble ? 'show' : 'hide'}
              onChange={handleSystemPromptBubbleChange}
              label="系统提示词气泡显示"
            >
              <MenuItem value="show">显示</MenuItem>
              <MenuItem value="hide">隐藏</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            控制是否在聊天界面顶部显示系统提示词气泡。系统提示词气泡可以帮助您查看和编辑当前会话的系统提示词。
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default ChatInterfaceSettings;