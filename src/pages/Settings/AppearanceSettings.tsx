import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Slider,
  FormHelperText,
  Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../shared/store';
import { setTheme, setFontSize } from '../../shared/store/settingsSlice';

const AppearanceSettings: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);

  const handleBack = () => {
    navigate('/settings');
  };

  // 字体大小处理函数
  const handleFontSizeChange = (_: Event, newValue: number | number[]) => {
    dispatch(setFontSize(newValue as number));
  };

  // 字体大小预设值
  const fontSizePresets = [
    { value: 12, label: '极小' },
    { value: 14, label: '小' },
    { value: 16, label: '标准' },
    { value: 18, label: '大' },
    { value: 20, label: '极大' },
    { value: 24, label: '超大' }
  ];

  // 获取当前字体大小的描述
  const getCurrentFontSizeLabel = (fontSize: number) => {
    const preset = fontSizePresets.find(p => p.value === fontSize);
    return preset ? preset.label : '自定义';
  };

  const handleNavigateToChatInterface = () => {
    navigate('/settings/appearance/chat-interface');
  };

  const handleNavigateToTopToolbar = () => {
    navigate('/settings/appearance/top-toolbar');
  };

  const handleNavigateToMessageBubble = () => {
    navigate('/settings/appearance/message-bubble');
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
        {/* 主题和字体设置 */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            mb: 3,
            border: '1px solid #eee',
            borderRadius: 2,
            background: 'background.paper',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            },
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{
              mb: 3,
              fontWeight: 600,
              fontSize: { xs: '1.1rem', sm: '1.25rem' },
              color: 'text.primary',
            }}
          >
            主题和字体
          </Typography>

          {/* 主题选择 */}
          <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
            <InputLabel>主题</InputLabel>
            <Select
              value={settings.theme}
              onChange={(e) => dispatch(setTheme(e.target.value as 'light' | 'dark' | 'system'))}
              label="主题"
              sx={{
                '& .MuiSelect-select': {
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderRadius: 2,
                },
              }}
            >
              <MenuItem value="light">浅色</MenuItem>
              <MenuItem value="dark">深色</MenuItem>
              <MenuItem value="system">跟随系统</MenuItem>
            </Select>
            <FormHelperText>
              选择应用的外观主题，跟随系统将自动适配设备的深色/浅色模式
            </FormHelperText>
          </FormControl>

          {/* 全局字体大小控制 */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2
            }}>
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 500,
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                }}
              >
                全局字体大小
              </Typography>
              <Chip
                label={`${settings.fontSize}px (${getCurrentFontSizeLabel(settings.fontSize)})`}
                size="small"
                color="primary"
                variant="outlined"
                sx={{
                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                  fontWeight: 500,
                }}
              />
            </Box>

            <Slider
              value={settings.fontSize}
              min={12}
              max={24}
              step={1}
              onChange={handleFontSizeChange}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value}px`}
              marks={fontSizePresets.map(preset => ({
                value: preset.value,
                label: preset.label
              }))}
              sx={{
                '& .MuiSlider-thumb': {
                  width: { xs: 20, sm: 24 },
                  height: { xs: 20, sm: 24 },
                  '&:hover': {
                    boxShadow: '0 0 0 8px rgba(147, 51, 234, 0.16)',
                  },
                },
                '& .MuiSlider-track': {
                  background: 'linear-gradient(90deg, #9333EA, #754AB4)',
                },
                '& .MuiSlider-rail': {
                  opacity: 0.3,
                },
                '& .MuiSlider-mark': {
                  backgroundColor: 'currentColor',
                  height: 8,
                  width: 2,
                  '&.MuiSlider-markActive': {
                    backgroundColor: 'currentColor',
                  },
                },
                '& .MuiSlider-markLabel': {
                  fontSize: { xs: '0.65rem', sm: '0.75rem' },
                  color: 'text.secondary',
                  transform: 'translateX(-50%)',
                  top: { xs: 28, sm: 32 },
                },
                '& .MuiSlider-valueLabel': {
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: 'linear-gradient(45deg, #9333EA, #754AB4)',
                },
              }}
            />

            <FormHelperText sx={{ mt: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              调整应用中所有文本的基础字体大小，影响聊天消息、界面文字等全局显示效果
            </FormHelperText>
          </Box>
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

        {/* 信息气泡管理入口 */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            border: '1px solid #eee',
            cursor: 'pointer'
          }}
          onClick={handleNavigateToMessageBubble}
        >
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Typography variant="subtitle1">
              信息气泡管理
            </Typography>
            <ChevronRightIcon color="action" />
          </Box>
        </Paper>

        {/* 顶部工具栏设置入口 */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            border: '1px solid #eee',
            cursor: 'pointer'
          }}
          onClick={handleNavigateToTopToolbar}
        >
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Typography variant="subtitle1">
              顶部工具栏设置
            </Typography>
            <ChevronRightIcon color="action" />
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default AppearanceSettings;
