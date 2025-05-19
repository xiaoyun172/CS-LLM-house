import React from 'react';
import { 
  Box, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Paper
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../shared/store';
import { updateSettings } from '../../shared/store/settingsSlice';
import { ThinkingDisplayStyle } from '../../components/message/ThinkingProcess';

const ChatInterfaceSettings: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);

  // 获取当前思考过程显示样式设置
  const thinkingDisplayStyle = (settings as any).thinkingDisplayStyle || ThinkingDisplayStyle.COMPACT;
  
  // 获取当前工具栏显示样式设置
  const toolbarDisplayStyle = settings.toolbarDisplayStyle || 'both';
  
  // 获取系统提示词气泡显示设置
  const showSystemPromptBubble = settings.showSystemPromptBubble !== false;

  const handleBack = () => {
    navigate('/settings/appearance');
  };

  // 处理思考过程显示样式变更
  const handleThinkingStyleChange = (event: { target: { value: any } }) => {
    dispatch(updateSettings({ 
      thinkingDisplayStyle: event.target.value
    }));
  };

  // 处理工具栏显示样式变更
  const handleToolbarStyleChange = (event: { target: { value: any } }) => {
    dispatch(updateSettings({ 
      toolbarDisplayStyle: event.target.value
    }));
  };

  // 处理系统提示词气泡显示设置变更
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
        <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #eee' }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            思考过程显示方式
          </Typography>
          
          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel id="thinking-style-label">思考过程显示样式</InputLabel>
            <Select
              labelId="thinking-style-label"
              value={thinkingDisplayStyle}
              onChange={handleThinkingStyleChange}
              label="思考过程显示样式"
            >
              <MenuItem value={ThinkingDisplayStyle.COMPACT}>思考块样式</MenuItem>
              <MenuItem value={ThinkingDisplayStyle.FULL}>简约思考样式</MenuItem>
              <MenuItem value={ThinkingDisplayStyle.HIDDEN}>隐藏</MenuItem>
            </Select>
          </FormControl>
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
            设置AI助手思考过程的显示方式。思考块样式仅显示一行可点击展开，简约思考样式会显示思考过程的标题和按钮，隐藏则不显示思考过程。
          </Typography>
        </Paper>

        <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #eee' }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            工具栏显示方式
          </Typography>
          
          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel id="toolbar-style-label">工具栏显示样式</InputLabel>
            <Select
              labelId="toolbar-style-label"
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