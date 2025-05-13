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
  Divider,
  Alert,
  FormControlLabel,
  Switch
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

// 语音设置组件
const VoiceSettings: React.FC = () => {
  const navigate = useNavigate();
  const [ttsService] = useState(() => TTSService.getInstance());
  
  // 表单状态
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState('FunAudioLLM/CosyVoice2-0.5B');
  const [selectedVoice, setSelectedVoice] = useState('alex');
  const [testText, setTestText] = useState('你好，我是硅基流动TTS服务，感谢你的使用！');
  const [enableTTS, setEnableTTS] = useState(true);
  const [isTestPlaying, setIsTestPlaying] = useState(false);
  
  // 保存状态
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  
  // 从localStorage加载设置
  useEffect(() => {
    const storedApiKey = localStorage.getItem('siliconflow_api_key') || '';
    const storedModel = localStorage.getItem('tts_model') || 'FunAudioLLM/CosyVoice2-0.5B';
    const storedVoice = localStorage.getItem('tts_voice') || 'alex';
    const storedEnableTTS = localStorage.getItem('enable_tts') !== 'false'; // 默认启用
    
    setApiKey(storedApiKey);
    setSelectedModel(storedModel);
    setSelectedVoice(storedVoice);
    setEnableTTS(storedEnableTTS);
    
    // 设置TTSService
    if (storedApiKey) {
      ttsService.setApiKey(storedApiKey);
    }
    if (storedModel && storedVoice) {
      ttsService.setDefaultVoice(storedModel, `${storedModel}:${storedVoice}`);
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
      
      // 更新TTSService
      ttsService.setApiKey(apiKey);
      ttsService.setDefaultVoice(selectedModel, `${selectedModel}:${selectedVoice}`);
      
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
    
    // 临时设置语音
    ttsService.setApiKey(apiKey);
    ttsService.setDefaultVoice(selectedModel, `${selectedModel}:${selectedVoice}`);
    
    const success = await ttsService.speak(testText, `${selectedModel}:${selectedVoice}`);
    
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
            启用后，在聊天界面可以将AI回复内容转换为语音播放。本应用优先使用硅基流动免费TTS API服务，如API无效则会自动降级使用浏览器内置的Web Speech API功能。
          </Typography>
          
          <Divider sx={{ my: 3 }} />
          
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
              disabled={!apiKey && enableTTS}
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