import React, { useCallback } from 'react';
import {
  Stack,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  FormHelperText,
} from '@mui/material';
import { Visibility as VisibilityIcon, VisibilityOff as VisibilityOffIcon } from '@mui/icons-material';

// 硅基流动TTS配置接口
export interface SiliconFlowTTSSettings {
  apiKey: string;
  showApiKey: boolean;
  selectedModel: string;
  selectedVoice: string;
}

// 组件Props接口
interface SiliconFlowTTSTabProps {
  settings: SiliconFlowTTSSettings;
  onSettingsChange: (settings: SiliconFlowTTSSettings) => void;
}

// 硅基流动TTS模型选项
const SILICONFLOW_MODELS = [
  { value: 'FishSpeech', label: 'FishSpeech - 高质量语音合成' },
  { value: 'ChatTTS', label: 'ChatTTS - 对话式语音' },
];

// 硅基流动TTS语音选项
const SILICONFLOW_VOICES = {
  FishSpeech: [
    { value: 'fishaudio_fish_speech_1', label: '标准语音' },
    { value: 'fishaudio_fish_speech_1_4', label: '增强语音' },
  ],
  ChatTTS: [
    { value: 'chattts', label: 'ChatTTS标准' },
  ],
};

/**
 * 硅基流动TTS配置组件
 */
export const SiliconFlowTTSTab: React.FC<SiliconFlowTTSTabProps> = ({
  settings,
  onSettingsChange,
}) => {
  // 🚀 性能优化：使用useCallback缓存事件处理函数
  const handleApiKeyChange = useCallback((value: string) => {
    onSettingsChange({ ...settings, apiKey: value });
  }, [settings, onSettingsChange]);

  const handleShowApiKeyToggle = useCallback(() => {
    onSettingsChange({ ...settings, showApiKey: !settings.showApiKey });
  }, [settings, onSettingsChange]);

  const handleModelChange = useCallback((value: string) => {
    // 切换模型时重置语音选择
    const firstVoice = SILICONFLOW_VOICES[value as keyof typeof SILICONFLOW_VOICES]?.[0]?.value || '';
    onSettingsChange({
      ...settings,
      selectedModel: value,
      selectedVoice: firstVoice
    });
  }, [settings, onSettingsChange]);

  const handleVoiceChange = useCallback((value: string) => {
    onSettingsChange({ ...settings, selectedVoice: value });
  }, [settings, onSettingsChange]);

  // 获取当前模型的语音选项
  const currentVoices = SILICONFLOW_VOICES[settings.selectedModel as keyof typeof SILICONFLOW_VOICES] || [];

  return (
    <>
      <Typography
        variant="subtitle1"
        sx={{
          mb: { xs: 2, sm: 3 },
          fontWeight: 600,
          fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' },
          color: 'text.primary',
        }}
      >
        硅基流动 TTS API 设置
      </Typography>

      <Stack spacing={{ xs: 2, sm: 3 }}>
        <FormControl fullWidth variant="outlined">
          <TextField
            label="API密钥"
            variant="outlined"
            value={settings.apiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            type={settings.showApiKey ? 'text' : 'password'}
            placeholder="请输入硅基流动API密钥"
            helperText="获取API密钥请访问：https://siliconflow.cn/"
            slotProps={{
              input: {
                endAdornment: (
                  <IconButton
                    onClick={handleShowApiKeyToggle}
                    edge="end"
                    size={window.innerWidth < 600 ? "small" : "medium"}
                    sx={{
                      '&:hover': {
                        bgcolor: 'action.hover',
                        transform: 'scale(1.1)',
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    {settings.showApiKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                ),
              },
            }}
            sx={{
              mb: { xs: 1.5, sm: 2 },
              '& .MuiInputBase-root': {
                fontSize: { xs: '0.9rem', sm: '1rem' },
              },
              '& .MuiInputLabel-root': {
                fontSize: { xs: '0.9rem', sm: '1rem' },
              },
              '& .MuiFormHelperText-root': {
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                mt: { xs: 0.5, sm: 1 },
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderRadius: { xs: 1.5, sm: 2 },
              },
            }}
          />
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>TTS模型</InputLabel>
          <Select
            value={settings.selectedModel}
            onChange={(e) => handleModelChange(e.target.value)}
            label="TTS模型"
          >
            {SILICONFLOW_MODELS.map((model) => (
              <MenuItem key={model.value} value={model.value}>
                {model.label}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>
            选择适合的TTS模型，不同模型有不同的语音特色
          </FormHelperText>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>语音选择</InputLabel>
          <Select
            value={settings.selectedVoice}
            onChange={(e) => handleVoiceChange(e.target.value)}
            label="语音选择"
            disabled={!settings.selectedModel}
          >
            {currentVoices.map((voice) => (
              <MenuItem key={voice.value} value={voice.value}>
                {voice.label}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>
            {settings.selectedModel
              ? '选择您喜欢的语音风格'
              : '请先选择TTS模型'
            }
          </FormHelperText>
        </FormControl>
      </Stack>
    </>
  );
};

export default SiliconFlowTTSTab;
