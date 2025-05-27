import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  AppBar,
  Toolbar,
  Alert,
  FormControlLabel,
  Switch,
  FormHelperText,
  Tabs,
  Tab,
  Slider,
  Stack
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useNavigate } from 'react-router-dom';
import { TTSService } from '../../shared/services/TTSService';
import { getStorageItem, setStorageItem } from '../../shared/utils/storage';

// 🚀 性能优化：将常量移到组件外部，避免每次渲染时重新创建
// 硅基流动TTS模型
const TTS_MODELS = [
  { value: 'FunAudioLLM/CosyVoice2-0.5B', label: 'CosyVoice2-0.5B' },
] as const;

// 预设音色
const PRESET_VOICES = [
  { value: 'alex', label: '沉稳男声 (alex)' },
  { value: 'benjamin', label: '低沉男声 (benjamin)' },
  { value: 'charles', label: '磁性男声 (charles)' },
  { value: 'david', label: '欢快男声 (david)' },
  { value: 'anna', label: '沉稳女声 (anna)' },
  { value: 'bella', label: '激情女声 (bella)' },
  { value: 'claire', label: '温柔女声 (claire)' },
  { value: 'diana', label: '欢快女声 (diana)' },
] as const;

// OpenAI TTS模型
const OPENAI_MODELS = [
  { value: 'tts-1', label: '标准模型 (tts-1)' },
  { value: 'tts-1-hd', label: '高清模型 (tts-1-hd)' },
] as const;

// OpenAI TTS语音
const OPENAI_VOICES = [
  { value: 'alloy', label: '中性平衡语音 (alloy)' },
  { value: 'echo', label: '深沉有力语音 (echo)' },
  { value: 'fable', label: '温暖柔和语音 (fable)' },
  { value: 'onyx', label: '明亮清晰语音 (onyx)' },
  { value: 'nova', label: '温柔女声语音 (nova)' },
  { value: 'shimmer', label: '欢快流畅语音 (shimmer)' },
] as const;

// OpenAI TTS音频格式
const OPENAI_FORMATS = [
  { value: 'mp3', label: 'MP3 (推荐)' },
  { value: 'opus', label: 'Opus (低延迟)' },
  { value: 'aac', label: 'AAC (兼容性好)' },
  { value: 'flac', label: 'FLAC (无损质量)' },
] as const;

// 🚀 性能优化：定义状态类型，便于状态合并
interface SiliconFlowSettings {
  apiKey: string;
  showApiKey: boolean;
  selectedModel: string;
  selectedVoice: string;
}

interface OpenAISettings {
  apiKey: string;
  showApiKey: boolean;
  selectedModel: string;
  selectedVoice: string;
  selectedFormat: string;
  speed: number;
  useStream: boolean;
}

interface UIState {
  tabValue: number;
  isSaved: boolean;
  saveError: string;
  isTestPlaying: boolean;
}

// 语音设置组件
const VoiceSettings: React.FC = () => {
  const navigate = useNavigate();

  // 🚀 性能优化：使用 useMemo 缓存 TTSService 实例
  const ttsService = useMemo(() => TTSService.getInstance(), []);

  // 🚀 性能优化：使用 useRef 管理定时器，避免内存泄漏
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 🚀 性能优化：合并相关状态，减少重新渲染次数
  const [siliconFlowSettings, setSiliconFlowSettings] = useState<SiliconFlowSettings>({
    apiKey: '',
    showApiKey: false,
    selectedModel: 'FunAudioLLM/CosyVoice2-0.5B',
    selectedVoice: 'alex',
  });

  const [openaiSettings, setOpenaiSettings] = useState<OpenAISettings>({
    apiKey: '',
    showApiKey: false,
    selectedModel: 'tts-1',
    selectedVoice: 'alloy',
    selectedFormat: 'mp3',
    speed: 1.0,
    useStream: false,
  });

  const [uiState, setUIState] = useState<UIState>({
    tabValue: 0,
    isSaved: false,
    saveError: '',
    isTestPlaying: false,
  });

  // 其他独立状态
  const [testText, setTestText] = useState('你好，我是语音合成服务，感谢你的使用！');
  const [enableTTS, setEnableTTS] = useState(true);
  const [useOpenai, setUseOpenai] = useState(false);

  // 🚀 性能优化：只在组件挂载时加载设置，避免重复调用
  useEffect(() => {
    const loadSettings = async () => {
      try {
        console.log('[VoiceSettings] 开始加载设置...');

        // 加载基础设置
        const storedApiKey = await getStorageItem<string>('siliconflow_api_key') || '';
        const storedModel = await getStorageItem<string>('tts_model') || 'FunAudioLLM/CosyVoice2-0.5B';
        const storedVoice = await getStorageItem<string>('tts_voice') || 'alex';
        const storedEnableTTS = (await getStorageItem<string>('enable_tts')) !== 'false'; // 默认启用

        // 加载OpenAI设置
        const storedOpenaiApiKey = await getStorageItem<string>('openai_tts_api_key') || '';
        const storedOpenaiModel = await getStorageItem<string>('openai_tts_model') || 'tts-1';
        const storedOpenaiVoice = await getStorageItem<string>('openai_tts_voice') || 'alloy';
        const storedOpenaiFormat = await getStorageItem<string>('openai_tts_format') || 'mp3';
        const storedOpenaiSpeed = Number(await getStorageItem<string>('openai_tts_speed') || '1.0');
        const storedUseOpenaiStream = (await getStorageItem<string>('openai_tts_stream')) === 'true';
        const storedUseOpenai = (await getStorageItem<string>('use_openai_tts')) === 'true';

        // 🚀 性能优化：批量更新状态，减少重新渲染
        setSiliconFlowSettings({
          apiKey: storedApiKey,
          showApiKey: false,
          selectedModel: storedModel,
          selectedVoice: storedVoice,
        });

        setOpenaiSettings({
          apiKey: storedOpenaiApiKey,
          showApiKey: false,
          selectedModel: storedOpenaiModel,
          selectedVoice: storedOpenaiVoice,
          selectedFormat: storedOpenaiFormat,
          speed: storedOpenaiSpeed,
          useStream: storedUseOpenaiStream,
        });

        setUIState(prev => ({
          ...prev,
          tabValue: storedUseOpenai ? 1 : 0,
        }));

        setEnableTTS(storedEnableTTS);
        setUseOpenai(storedUseOpenai);

        // 设置TTSService
        ttsService.setApiKey(storedApiKey);
        ttsService.setOpenAIApiKey(storedOpenaiApiKey);
        ttsService.setOpenAIModel(storedOpenaiModel);
        ttsService.setOpenAIVoice(storedOpenaiVoice);
        ttsService.setOpenAIResponseFormat(storedOpenaiFormat);
        ttsService.setOpenAISpeed(storedOpenaiSpeed);
        ttsService.setUseOpenAIStream(storedUseOpenaiStream);
        ttsService.setUseOpenAI(storedUseOpenai);

        if (storedModel && storedVoice) {
          ttsService.setDefaultVoice(storedModel, `${storedModel}:${storedVoice}`);
        }

        console.log('[VoiceSettings] 设置加载完成');
      } catch (error) {
        console.error('加载语音设置失败:', error);
      }
    };

    loadSettings();
  }, []); // 🚀 空依赖数组，只在组件挂载时执行一次

  // 🚀 性能优化：使用 useCallback 缓存函数，避免子组件不必要的重新渲染
  const handleBack = useCallback(() => {
    navigate('/settings');
  }, [navigate]);

  // 🚀 性能优化：使用 useCallback 缓存保存函数
  const handleSave = useCallback(async () => {
    try {
      // 保存到异步存储
      await setStorageItem('siliconflow_api_key', siliconFlowSettings.apiKey);
      await setStorageItem('tts_model', siliconFlowSettings.selectedModel);
      await setStorageItem('tts_voice', siliconFlowSettings.selectedVoice);
      await setStorageItem('enable_tts', enableTTS.toString());

      // 保存OpenAI设置
      await setStorageItem('openai_tts_api_key', openaiSettings.apiKey);
      await setStorageItem('openai_tts_model', openaiSettings.selectedModel);
      await setStorageItem('openai_tts_voice', openaiSettings.selectedVoice);
      await setStorageItem('openai_tts_format', openaiSettings.selectedFormat);
      await setStorageItem('openai_tts_speed', openaiSettings.speed.toString());
      await setStorageItem('openai_tts_stream', openaiSettings.useStream.toString());
      await setStorageItem('use_openai_tts', useOpenai.toString());

      // 更新TTSService
      ttsService.setApiKey(siliconFlowSettings.apiKey);
      ttsService.setDefaultVoice(siliconFlowSettings.selectedModel, `${siliconFlowSettings.selectedModel}:${siliconFlowSettings.selectedVoice}`);

      // 更新OpenAI设置
      ttsService.setOpenAIApiKey(openaiSettings.apiKey);
      ttsService.setOpenAIModel(openaiSettings.selectedModel);
      ttsService.setOpenAIVoice(openaiSettings.selectedVoice);
      ttsService.setOpenAIResponseFormat(openaiSettings.selectedFormat);
      ttsService.setOpenAISpeed(openaiSettings.speed);
      ttsService.setUseOpenAIStream(openaiSettings.useStream);
      ttsService.setUseOpenAI(useOpenai);

      // 🚀 性能优化：使用 ref 管理定时器，避免内存泄漏
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // 显示保存成功提示
      setUIState(prev => ({
        ...prev,
        isSaved: true,
        saveError: '',
      }));

      // 3秒后隐藏提示
      saveTimeoutRef.current = setTimeout(() => {
        setUIState(prev => ({
          ...prev,
          isSaved: false,
        }));
      }, 3000);
    } catch (error) {
      console.error('保存设置失败:', error);
      setUIState(prev => ({
        ...prev,
        saveError: '保存设置失败，请重试',
      }));
    }
  }, [siliconFlowSettings, openaiSettings, enableTTS, useOpenai, ttsService]);

  // 🚀 性能优化：使用 useCallback 缓存测试TTS函数
  const handleTestTTS = useCallback(async () => {
    if (uiState.isTestPlaying) {
      ttsService.stop();
      if (playCheckIntervalRef.current) {
        clearInterval(playCheckIntervalRef.current);
      }
      setUIState(prev => ({ ...prev, isTestPlaying: false }));
      return;
    }

    setUIState(prev => ({ ...prev, isTestPlaying: true }));

    // 临时设置OpenAI状态
    ttsService.setUseOpenAI(useOpenai);

    if (useOpenai) {
      // 使用OpenAI TTS
      ttsService.setOpenAIApiKey(openaiSettings.apiKey);
      ttsService.setOpenAIModel(openaiSettings.selectedModel);
      ttsService.setOpenAIVoice(openaiSettings.selectedVoice);
      ttsService.setOpenAIResponseFormat(openaiSettings.selectedFormat);
      ttsService.setOpenAISpeed(openaiSettings.speed);
      ttsService.setUseOpenAIStream(openaiSettings.useStream);
    } else {
      // 使用硅基流动TTS
      ttsService.setApiKey(siliconFlowSettings.apiKey);
      ttsService.setDefaultVoice(siliconFlowSettings.selectedModel, `${siliconFlowSettings.selectedModel}:${siliconFlowSettings.selectedVoice}`);
    }

    const success = await ttsService.speak(testText);

    if (!success) {
      setUIState(prev => ({ ...prev, isTestPlaying: false }));
    }

    // 🚀 性能优化：使用 ref 管理定时器，避免内存泄漏
    if (playCheckIntervalRef.current) {
      clearInterval(playCheckIntervalRef.current);
    }

    // 监听播放结束
    playCheckIntervalRef.current = setInterval(() => {
      if (!ttsService.getIsPlaying()) {
        setUIState(prev => ({ ...prev, isTestPlaying: false }));
        if (playCheckIntervalRef.current) {
          clearInterval(playCheckIntervalRef.current);
        }
      }
    }, 500);
  }, [uiState.isTestPlaying, useOpenai, openaiSettings, siliconFlowSettings, testText, ttsService]);

  // 🚀 性能优化：使用 useCallback 缓存标签变化处理函数
  const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: number) => {
    setUIState(prev => ({ ...prev, tabValue: newValue }));
    setUseOpenai(newValue === 1);
  }, []);

  // 🚀 性能优化：使用 useCallback 缓存速度滑块变化处理函数
  const handleSpeedChange = useCallback((_: Event, newValue: number | number[]) => {
    setOpenaiSettings(prev => ({ ...prev, speed: newValue as number }));
  }, []);

  // 🚀 性能优化：使用 useCallback 缓存格式化速度值函数
  const formatSpeed = useCallback((value: number) => {
    return `${value}x`;
  }, []);

  // 🚀 性能优化：组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (playCheckIntervalRef.current) {
        clearInterval(playCheckIntervalRef.current);
      }
    };
  }, []);

  // 🚀 性能优化：创建硅基流动设置的事件处理函数
  const handleSiliconFlowApiKeyChange = useCallback((value: string) => {
    setSiliconFlowSettings(prev => ({ ...prev, apiKey: value }));
  }, []);

  const handleSiliconFlowShowApiKeyToggle = useCallback(() => {
    setSiliconFlowSettings(prev => ({ ...prev, showApiKey: !prev.showApiKey }));
  }, []);

  const handleSiliconFlowModelChange = useCallback((value: string) => {
    setSiliconFlowSettings(prev => ({ ...prev, selectedModel: value }));
  }, []);

  const handleSiliconFlowVoiceChange = useCallback((value: string) => {
    setSiliconFlowSettings(prev => ({ ...prev, selectedVoice: value }));
  }, []);

  // 🚀 性能优化：创建OpenAI设置的事件处理函数
  const handleOpenAIApiKeyChange = useCallback((value: string) => {
    setOpenaiSettings(prev => ({ ...prev, apiKey: value }));
  }, []);

  const handleOpenAIShowApiKeyToggle = useCallback(() => {
    setOpenaiSettings(prev => ({ ...prev, showApiKey: !prev.showApiKey }));
  }, []);

  const handleOpenAIModelChange = useCallback((value: string) => {
    setOpenaiSettings(prev => ({ ...prev, selectedModel: value }));
  }, []);

  const handleOpenAIVoiceChange = useCallback((value: string) => {
    setOpenaiSettings(prev => ({ ...prev, selectedVoice: value }));
  }, []);

  const handleOpenAIFormatChange = useCallback((value: string) => {
    setOpenaiSettings(prev => ({ ...prev, selectedFormat: value }));
  }, []);

  const handleOpenAIStreamToggle = useCallback((checked: boolean) => {
    setOpenaiSettings(prev => ({ ...prev, useStream: checked }));
  }, []);

  return (
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: 1,
          borderColor: 'divider',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={handleBack}
            aria-label="back"
            sx={{ color: 'primary.main' }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 1,
              fontWeight: 600,
              backgroundImage: 'linear-gradient(90deg, #9333EA, #754AB4)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            语音功能设置
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          p: 2,
          mt: 8,
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0,0,0,0.1)',
            borderRadius: '3px',
          },
        }}
      >
        {/* 保存结果提示 */}
        {uiState.isSaved && (
          <Alert severity="success" sx={{ mb: 2 }}>
            设置已保存成功
          </Alert>
        )}

        {uiState.saveError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {uiState.saveError}
          </Alert>
        )}

        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            文本转语音 (TTS) 功能
          </Typography>

          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={enableTTS}
                  onChange={(e) => setEnableTTS(e.target.checked)}
                  color="primary"
                />
              }
              label="启用语音转换功能"
            />
          </Box>

          <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
            启用后，在聊天界面可以将AI回复内容转换为语音播放。本应用支持OpenAI TTS和硅基流动TTS服务，如API无效则会自动降级使用浏览器内置的Web Speech API功能。
          </Typography>

          <Tabs
            value={uiState.tabValue}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="硅基流动 TTS" />
            <Tab label="OpenAI TTS" />
          </Tabs>

          {uiState.tabValue === 0 && (
            <>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                硅基流动 TTS API 设置
              </Typography>

              <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
                <TextField
                  label="API密钥"
                  variant="outlined"
                  value={siliconFlowSettings.apiKey}
                  onChange={(e) => handleSiliconFlowApiKeyChange(e.target.value)}
                  type={siliconFlowSettings.showApiKey ? 'text' : 'password'}
                  placeholder="请输入硅基流动API密钥"
                  helperText="获取API密钥请访问：https://cloud.siliconflow.cn/account/ak"
                  slotProps={{
                    input: {
                      endAdornment: (
                        <IconButton
                          onClick={handleSiliconFlowShowApiKeyToggle}
                          edge="end"
                        >
                          {siliconFlowSettings.showApiKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      ),
                    },
                  }}
                  sx={{ mb: 2 }}
                />
              </FormControl>

              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>TTS模型</InputLabel>
                  <Select
                    value={siliconFlowSettings.selectedModel}
                    onChange={(e) => handleSiliconFlowModelChange(e.target.value)}
                    label="TTS模型"
                  >
                    {TTS_MODELS.map((model) => (
                      <MenuItem key={model.value} value={model.value}>
                        {model.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>预设音色</InputLabel>
                  <Select
                    value={siliconFlowSettings.selectedVoice}
                    onChange={(e) => handleSiliconFlowVoiceChange(e.target.value)}
                    label="预设音色"
                  >
                    {PRESET_VOICES.map((voice) => (
                      <MenuItem key={voice.value} value={voice.value}>
                        {voice.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </>
          )}

          {uiState.tabValue === 1 && (
            <>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                OpenAI TTS API 设置
              </Typography>

              <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
                <TextField
                  label="OpenAI API密钥"
                  variant="outlined"
                  value={openaiSettings.apiKey}
                  onChange={(e) => handleOpenAIApiKeyChange(e.target.value)}
                  type={openaiSettings.showApiKey ? 'text' : 'password'}
                  placeholder="请输入OpenAI API密钥"
                  helperText="获取API密钥请访问：https://platform.openai.com/api-keys"
                  slotProps={{
                    input: {
                      endAdornment: (
                        <IconButton
                          onClick={handleOpenAIShowApiKeyToggle}
                          edge="end"
                        >
                          {openaiSettings.showApiKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      ),
                    },
                  }}
                  sx={{ mb: 2 }}
                />
              </FormControl>

              <Stack spacing={3} sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>TTS模型</InputLabel>
                    <Select
                      value={openaiSettings.selectedModel}
                      onChange={(e) => handleOpenAIModelChange(e.target.value)}
                      label="TTS模型"
                    >
                      {OPENAI_MODELS.map((model) => (
                        <MenuItem key={model.value} value={model.value}>
                          {model.label}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>
                      标准模型性价比高，高清模型音质更好但价格更高
                    </FormHelperText>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>语音选择</InputLabel>
                    <Select
                      value={openaiSettings.selectedVoice}
                      onChange={(e) => handleOpenAIVoiceChange(e.target.value as string)}
                      label="语音选择"
                    >
                      {OPENAI_VOICES.map((voice) => (
                        <MenuItem key={voice.value} value={voice.value}>
                          {voice.label}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>
                      OpenAI提供多种不同特点的语音，选择合适的语音
                    </FormHelperText>
                  </FormControl>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>音频格式</InputLabel>
                    <Select
                      value={openaiSettings.selectedFormat}
                      onChange={(e) => handleOpenAIFormatChange(e.target.value)}
                      label="音频格式"
                    >
                      {OPENAI_FORMATS.map((format) => (
                        <MenuItem key={format.value} value={format.value}>
                          {format.label}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>
                      MP3格式兼容性最好，Opus格式延迟低，FLAC质量无损
                    </FormHelperText>
                  </FormControl>

                  <FormControl fullWidth>
                    <Typography gutterBottom>语速调整</Typography>
                    <Slider
                      value={openaiSettings.speed}
                      min={0.25}
                      max={4.0}
                      step={0.05}
                      onChange={handleSpeedChange}
                      valueLabelDisplay="auto"
                      valueLabelFormat={formatSpeed}
                      marks={[
                        { value: 0.25, label: '0.25x' },
                        { value: 1, label: '1x' },
                        { value: 2, label: '2x' },
                        { value: 4, label: '4x' }
                      ]}
                    />
                    <FormHelperText>
                      调整语音播放速度 (0.25x-4.0x，默认1.0x)
                    </FormHelperText>
                  </FormControl>
                </Box>

                <FormControlLabel
                  control={
                    <Switch
                      checked={openaiSettings.useStream}
                      onChange={(e) => handleOpenAIStreamToggle(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="使用流式输出（降低延迟）"
                />
                <FormHelperText>
                  启用流式输出可以降低首次音频播放的延迟，在处理长文本时效果更明显。注意：部分浏览器可能不支持此功能。
                </FormHelperText>
              </Stack>
            </>
          )}
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            测试语音效果
          </Typography>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="测试文本"
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            variant="outlined"
            sx={{ mb: 3 }}
          />

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="contained"
              color={uiState.isTestPlaying ? "error" : "primary"}
              startIcon={<VolumeUpIcon />}
              onClick={handleTestTTS}
              disabled={!enableTTS || (useOpenai && !openaiSettings.apiKey) || (!useOpenai && !siliconFlowSettings.apiKey)}
            >
              {uiState.isTestPlaying ? "停止播放" : "播放测试"}
            </Button>

            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
            >
              保存设置
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default VoiceSettings;