import React, { useState, useEffect } from 'react';
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

// 硅基流动TTS模型
const TTS_MODELS = [
  { value: 'FunAudioLLM/CosyVoice2-0.5B', label: 'CosyVoice2-0.5B' },
];

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
];

// OpenAI TTS模型
const OPENAI_MODELS = [
  { value: 'tts-1', label: '标准模型 (tts-1)' },
  { value: 'tts-1-hd', label: '高清模型 (tts-1-hd)' },
];

// OpenAI TTS语音
const OPENAI_VOICES = [
  { value: 'alloy', label: '中性平衡语音 (alloy)' },
  { value: 'echo', label: '深沉有力语音 (echo)' },
  { value: 'fable', label: '温暖柔和语音 (fable)' },
  { value: 'onyx', label: '明亮清晰语音 (onyx)' },
  { value: 'nova', label: '温柔女声语音 (nova)' },
  { value: 'shimmer', label: '欢快流畅语音 (shimmer)' },
];

// OpenAI TTS音频格式
const OPENAI_FORMATS = [
  { value: 'mp3', label: 'MP3 (推荐)' },
  { value: 'opus', label: 'Opus (低延迟)' },
  { value: 'aac', label: 'AAC (兼容性好)' },
  { value: 'flac', label: 'FLAC (无损质量)' },
];

// 语音设置组件
const VoiceSettings: React.FC = () => {
  const navigate = useNavigate();
  const [ttsService] = useState(() => TTSService.getInstance());
  
  // 表单状态
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState('FunAudioLLM/CosyVoice2-0.5B');
  const [selectedVoice, setSelectedVoice] = useState('alex');
  const [testText, setTestText] = useState('你好，我是语音合成服务，感谢你的使用！');
  const [enableTTS, setEnableTTS] = useState(true);
  const [isTestPlaying, setIsTestPlaying] = useState(false);
  
  // OpenAI TTS设置
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [showOpenaiApiKey, setShowOpenaiApiKey] = useState(false);
  const [selectedOpenaiModel, setSelectedOpenaiModel] = useState('tts-1');
  const [selectedOpenaiVoice, setSelectedOpenaiVoice] = useState('alloy');
  const [selectedOpenaiFormat, setSelectedOpenaiFormat] = useState('mp3');
  const [openaiSpeed, setOpenaiSpeed] = useState(1.0);
  const [useOpenaiStream, setUseOpenaiStream] = useState(false);
  const [useOpenai, setUseOpenai] = useState(false);
  
  // 标签选择
  const [tabValue, setTabValue] = useState(0);
  
  // 保存状态
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  
  // 从localStorage加载设置
  useEffect(() => {
    const storedApiKey = localStorage.getItem('siliconflow_api_key') || '';
    const storedModel = localStorage.getItem('tts_model') || 'FunAudioLLM/CosyVoice2-0.5B';
    const storedVoice = localStorage.getItem('tts_voice') || 'alex';
    const storedEnableTTS = localStorage.getItem('enable_tts') !== 'false'; // 默认启用
    
    // 加载OpenAI设置
    const storedOpenaiApiKey = localStorage.getItem('openai_tts_api_key') || '';
    const storedOpenaiModel = localStorage.getItem('openai_tts_model') || 'tts-1';
    const storedOpenaiVoice = localStorage.getItem('openai_tts_voice') || 'alloy';
    const storedOpenaiFormat = localStorage.getItem('openai_tts_format') || 'mp3';
    const storedOpenaiSpeed = Number(localStorage.getItem('openai_tts_speed') || '1.0');
    const storedUseOpenaiStream = localStorage.getItem('openai_tts_stream') === 'true';
    const storedUseOpenai = localStorage.getItem('use_openai_tts') === 'true';
    
    setApiKey(storedApiKey);
    setSelectedModel(storedModel);
    setSelectedVoice(storedVoice);
    setEnableTTS(storedEnableTTS);
    
    setOpenaiApiKey(storedOpenaiApiKey);
    setSelectedOpenaiModel(storedOpenaiModel);
    setSelectedOpenaiVoice(storedOpenaiVoice);
    setSelectedOpenaiFormat(storedOpenaiFormat);
    setOpenaiSpeed(storedOpenaiSpeed);
    setUseOpenaiStream(storedUseOpenaiStream);
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
    
    // 设置初始标签
    if (storedUseOpenai) {
      setTabValue(1);
    }
  }, [ttsService]);
  
  // 返回上一页
  const handleBack = () => {
    navigate('/settings');
  };
  
  // 保存设置
  const handleSave = () => {
    try {
      // 保存到localStorage
      localStorage.setItem('siliconflow_api_key', apiKey);
      localStorage.setItem('tts_model', selectedModel);
      localStorage.setItem('tts_voice', selectedVoice);
      localStorage.setItem('enable_tts', enableTTS.toString());
      
      // 保存OpenAI设置
      localStorage.setItem('openai_tts_api_key', openaiApiKey);
      localStorage.setItem('openai_tts_model', selectedOpenaiModel);
      localStorage.setItem('openai_tts_voice', selectedOpenaiVoice);
      localStorage.setItem('openai_tts_format', selectedOpenaiFormat);
      localStorage.setItem('openai_tts_speed', openaiSpeed.toString());
      localStorage.setItem('openai_tts_stream', useOpenaiStream.toString());
      localStorage.setItem('use_openai_tts', useOpenai.toString());
      
      // 更新TTSService
      ttsService.setApiKey(apiKey);
      ttsService.setDefaultVoice(selectedModel, `${selectedModel}:${selectedVoice}`);
      
      // 更新OpenAI设置
      ttsService.setOpenAIApiKey(openaiApiKey);
      ttsService.setOpenAIModel(selectedOpenaiModel);
      ttsService.setOpenAIVoice(selectedOpenaiVoice);
      ttsService.setOpenAIResponseFormat(selectedOpenaiFormat);
      ttsService.setOpenAISpeed(openaiSpeed);
      ttsService.setUseOpenAIStream(useOpenaiStream);
      ttsService.setUseOpenAI(useOpenai);
      
      // 显示保存成功提示
      setIsSaved(true);
      setSaveError('');
      
      // 3秒后隐藏提示
      setTimeout(() => {
        setIsSaved(false);
      }, 3000);
    } catch (error) {
      console.error('保存设置失败:', error);
      setSaveError('保存设置失败，请重试');
    }
  };
  
  // 测试TTS语音
  const handleTestTTS = async () => {
    if (isTestPlaying) {
      ttsService.stop();
      setIsTestPlaying(false);
      return;
    }
    
    setIsTestPlaying(true);
    
    // 临时设置OpenAI状态
    ttsService.setUseOpenAI(useOpenai);
    
    if (useOpenai) {
      // 使用OpenAI TTS
      ttsService.setOpenAIApiKey(openaiApiKey);
      ttsService.setOpenAIModel(selectedOpenaiModel);
      ttsService.setOpenAIVoice(selectedOpenaiVoice);
      ttsService.setOpenAIResponseFormat(selectedOpenaiFormat);
      ttsService.setOpenAISpeed(openaiSpeed);
      ttsService.setUseOpenAIStream(useOpenaiStream);
    } else {
      // 使用硅基流动TTS
      ttsService.setApiKey(apiKey);
      ttsService.setDefaultVoice(selectedModel, `${selectedModel}:${selectedVoice}`);
    }
    
    const success = await ttsService.speak(testText);
    
    if (!success) {
      setIsTestPlaying(false);
    }
    
    // 监听播放结束
    const checkInterval = setInterval(() => {
      if (!ttsService.getIsPlaying()) {
        setIsTestPlaying(false);
        clearInterval(checkInterval);
      }
    }, 500);
  };
  
  // 处理标签变化
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setUseOpenai(newValue === 1);
  };
  
  // 处理速度滑块变化
  const handleSpeedChange = (_: Event, newValue: number | number[]) => {
    setOpenaiSpeed(newValue as number);
  };
  
  // 格式化速度值显示
  const formatSpeed = (value: number) => {
    return `${value}x`;
  };
  
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
        {isSaved && (
          <Alert severity="success" sx={{ mb: 2 }}>
            设置已保存成功
          </Alert>
        )}
        
        {saveError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {saveError}
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
            value={tabValue}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="硅基流动 TTS" />
            <Tab label="OpenAI TTS" />
          </Tabs>
          
          {tabValue === 0 && (
            <>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                硅基流动 TTS API 设置
              </Typography>
              
              <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
                <TextField
                  label="API密钥"
                  variant="outlined"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="请输入硅基流动API密钥"
                  helperText="获取API密钥请访问：https://cloud.siliconflow.cn/account/ak"
                  InputProps={{
                    endAdornment: (
                      <IconButton
                        onClick={() => setShowApiKey(!showApiKey)}
                        edge="end"
                      >
                        {showApiKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />
              </FormControl>
              
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>TTS模型</InputLabel>
                  <Select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
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
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
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
          
          {tabValue === 1 && (
            <>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                OpenAI TTS API 设置
              </Typography>
              
              <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
                <TextField
                  label="OpenAI API密钥"
                  variant="outlined"
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  type={showOpenaiApiKey ? 'text' : 'password'}
                  placeholder="请输入OpenAI API密钥"
                  helperText="获取API密钥请访问：https://platform.openai.com/api-keys"
                  InputProps={{
                    endAdornment: (
                      <IconButton
                        onClick={() => setShowOpenaiApiKey(!showOpenaiApiKey)}
                        edge="end"
                      >
                        {showOpenaiApiKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />
              </FormControl>
              
              <Stack spacing={3} sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>TTS模型</InputLabel>
                    <Select
                      value={selectedOpenaiModel}
                      onChange={(e) => setSelectedOpenaiModel(e.target.value)}
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
                      value={selectedOpenaiVoice}
                      onChange={(e) => setSelectedOpenaiVoice(e.target.value as string)}
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
                      value={selectedOpenaiFormat}
                      onChange={(e) => setSelectedOpenaiFormat(e.target.value)}
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
                      value={openaiSpeed}
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
                      checked={useOpenaiStream} 
                      onChange={(e) => setUseOpenaiStream(e.target.checked)} 
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
              color={isTestPlaying ? "error" : "primary"}
              startIcon={<VolumeUpIcon />}
              onClick={handleTestTTS}
              disabled={!enableTTS || (useOpenai && !openaiApiKey) || (!useOpenai && !apiKey)}
            >
              {isTestPlaying ? "停止播放" : "播放测试"}
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