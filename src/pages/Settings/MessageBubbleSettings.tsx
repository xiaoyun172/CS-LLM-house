import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Tooltip,
  IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InfoIcon from '@mui/icons-material/Info';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../shared/store';
import { updateSettings } from '../../shared/store/settingsSlice';

const MessageBubbleSettings: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);

  // 获取版本切换样式设置，默认为'popup'
  const versionSwitchStyle = (settings as any).versionSwitchStyle || 'popup';

  const handleBack = () => {
    navigate('/settings/appearance');
  };

  // 版本切换样式变更事件处理函数
  const handleVersionSwitchStyleChange = (event: { target: { value: any } }) => {
    dispatch(updateSettings({
      versionSwitchStyle: event.target.value
    }));
  };

  return (
    <Box sx={{
      height: '100vh',
      backgroundColor: 'background.default',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          padding: 2,
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          zIndex: 10,
          flexShrink: 0
        }}
      >
        <ArrowBackIcon
          sx={{ mr: 2, cursor: 'pointer' }}
          onClick={handleBack}
        />
        <Typography variant="h6" color="primary">
          信息气泡管理
        </Typography>
      </Box>

      <Box sx={{
        p: 2,
        flex: 1,
        overflow: 'auto',
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '3px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: 'rgba(0,0,0,0.3)',
        }
      }}>
        {/* 版本切换样式设置 */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #eee' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">版本切换样式</Typography>
            <Tooltip title="设置版本历史的显示和切换方式">
              <IconButton size="small" sx={{ ml: 1 }}>
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel>版本切换样式</InputLabel>
            <Select
              value={versionSwitchStyle}
              onChange={handleVersionSwitchStyleChange}
              label="版本切换样式"
            >
              <MenuItem value="popup">弹出列表（默认）</MenuItem>
              <MenuItem value="arrows">箭头式切换 &lt; 2 &gt;</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            设置版本历史的显示和切换方式：
            <br />• 弹出列表：点击版本历史按钮，弹出所有版本列表（默认方式）
            <br />• 箭头式切换：使用左右箭头在版本间切换，类似 &lt; 2 &gt; 的形式
          </Typography>
        </Paper>

        {/* 可以添加更多信息气泡相关的设置项 */}

        {/* 底部间距 */}
        <Box sx={{ height: '20px' }} />
      </Box>
    </Box>
  );
};

export default MessageBubbleSettings; 