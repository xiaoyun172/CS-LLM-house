import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  AppBar,
  Toolbar,
  IconButton,
  Container,
  Divider,
  Paper,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../shared/store';
import { setTheme, setFontSize, setLanguage } from '../../shared/store/settingsSlice';

const AppearanceSettings: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);

  const handleBack = () => {
    navigate('/settings');
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleBack}
            aria-label="back"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            外观
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ mt: 2, mb: 2 }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            外观
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <FormControl fullWidth margin="normal">
            <InputLabel id="theme-label">主题</InputLabel>
            <Select
              labelId="theme-label"
              value={settings.theme}
              onChange={(e) => dispatch(setTheme(e.target.value as 'light' | 'dark' | 'system'))}
              label="主题"
            >
              <MenuItem value="light">浅色</MenuItem>
              <MenuItem value="dark">深色</MenuItem>
              <MenuItem value="system">跟随系统</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ mt: 3 }}>
            <Typography gutterBottom>字体大小</Typography>
            <Slider
              value={settings.fontSize}
              onChange={(_, value) => dispatch(setFontSize(value as number))}
              min={12}
              max={24}
              step={1}
              marks={[
                { value: 12, label: '12' },
                { value: 16, label: '16' },
                { value: 20, label: '20' },
                { value: 24, label: '24' },
              ]}
              valueLabelDisplay="auto"
            />
          </Box>

          <FormControl fullWidth margin="normal">
            <InputLabel id="language-label">语言</InputLabel>
            <Select
              labelId="language-label"
              value={settings.language}
              onChange={(e) => dispatch(setLanguage(e.target.value as string))}
              label="语言"
            >
              <MenuItem value="zh-CN">简体中文</MenuItem>
              <MenuItem value="en-US">English (US)</MenuItem>
            </Select>
          </FormControl>
        </Paper>
      </Container>
    </Box>
  );
};

export default AppearanceSettings; 