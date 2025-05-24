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
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../shared/store';
import { setTheme } from '../../shared/store/settingsSlice';

const AppearanceSettings: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);

  const handleBack = () => {
    navigate('/settings');
  };

  const handleNavigateToChatInterface = () => {
    navigate('/settings/appearance/chat-interface');
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
          外观
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
        {/* 主题设置 */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #eee' }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            主题和颜色
          </Typography>
          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel>主题</InputLabel>
            <Select
              value={settings.theme}
              onChange={(e) => dispatch(setTheme(e.target.value as 'light' | 'dark' | 'system'))}
              label="主题"
            >
              <MenuItem value="light">浅色</MenuItem>
              <MenuItem value="dark">深色</MenuItem>
              <MenuItem value="system">跟随系统</MenuItem>
            </Select>
          </FormControl>
        </Paper>

        {/* 聊天界面设置入口 */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            border: '1px solid #eee',
            cursor: 'pointer'
          }}
          onClick={handleNavigateToChatInterface}
        >
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Typography variant="subtitle1">
              聊天界面设置
            </Typography>
            <ChevronRightIcon color="action" />
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default AppearanceSettings;
