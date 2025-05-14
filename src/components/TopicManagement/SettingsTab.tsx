import { 
  Box, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Divider, 
  Switch, 
  Typography,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Avatar,
  IconButton,
  Tooltip
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import FaceIcon from '@mui/icons-material/Face';
import type { MathRendererType } from '../../shared/types';
import { useState, useEffect } from 'react';
import AvatarUploader from '../settings/AvatarUploader';

interface Setting {
  id: string;
  name: string;
  description: string;
  defaultValue: boolean;
}

interface SettingsTabProps {
  settings?: Setting[];
  onSettingChange?: (settingId: string, value: boolean) => void;
  onContextLengthChange?: (value: number) => void;
  onContextCountChange?: (value: number) => void;
  onMathRendererChange?: (value: MathRendererType) => void;
  initialContextLength?: number;
  initialContextCount?: number;
  initialMathRenderer?: MathRendererType;
}

export default function SettingsTab({ 
  settings = [],
  onSettingChange,
  onContextLengthChange,
  onContextCountChange,
  onMathRendererChange,
  initialContextLength = 2000,
  initialContextCount = 10,
  initialMathRenderer = 'KaTeX'
}: SettingsTabProps) {
  // 默认设置选项
  const defaultSettings: Setting[] = [
    { id: 'streamOutput', name: '流式输出', defaultValue: true, description: '实时显示AI回答，打字机效果' },
    { id: 'showMessageDivider', name: '消息分割线', defaultValue: true, description: '在消息之间显示分割线' },
    { id: 'copyableCodeBlocks', name: '代码块可复制', defaultValue: true, description: '允许复制代码块的内容' },
  ];

  // 本地状态
  const [contextLength, setContextLength] = useState<number>(initialContextLength);
  const [contextCount, setContextCount] = useState<number>(initialContextCount);
  const [mathRenderer, setMathRenderer] = useState<MathRendererType>(initialMathRenderer);
  const [userAvatar, setUserAvatar] = useState<string>("");
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);

  // 从localStorage加载设置和头像
  useEffect(() => {
    try {
      const appSettingsJSON = localStorage.getItem('appSettings');
      if (appSettingsJSON) {
        const appSettings = JSON.parse(appSettingsJSON);
        if (appSettings.contextLength) setContextLength(appSettings.contextLength);
        if (appSettings.contextCount) setContextCount(appSettings.contextCount);
        if (appSettings.mathRenderer) setMathRenderer(appSettings.mathRenderer);
      }
      
      // 加载用户头像
      const savedUserAvatar = localStorage.getItem('user_avatar');
      if (savedUserAvatar) {
        setUserAvatar(savedUserAvatar);
      }
    } catch (error) {
      console.error('加载设置失败', error);
    }
  }, []);

  // 如果没有传入设置，使用默认设置
  const availableSettings = settings.length ? settings : defaultSettings;
  
  // 处理头像上传
  const handleAvatarDialogOpen = () => {
    setIsAvatarDialogOpen(true);
  };
  
  const handleAvatarDialogClose = () => {
    setIsAvatarDialogOpen(false);
  };
  
  const handleSaveAvatar = (avatarDataUrl: string) => {
    setUserAvatar(avatarDataUrl);
    localStorage.setItem('user_avatar', avatarDataUrl);
  };

  const handleSettingChange = (settingId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    if (onSettingChange) {
      onSettingChange(settingId, event.target.checked);
    }
  };

  const handleContextLengthChange = (_event: Event, newValue: number | number[]) => {
    const value = newValue as number;
    setContextLength(value);
    if (onContextLengthChange) {
      onContextLengthChange(value);
    }
    // 保存到localStorage
    try {
      const appSettingsJSON = localStorage.getItem('appSettings');
      const appSettings = appSettingsJSON ? JSON.parse(appSettingsJSON) : {};
      localStorage.setItem('appSettings', JSON.stringify({
        ...appSettings,
        contextLength: value
      }));
    } catch (error) {
      console.error('保存设置失败', error);
    }
  };

  const handleContextCountChange = (_event: Event, newValue: number | number[]) => {
    const value = newValue as number;
    setContextCount(value);
    if (onContextCountChange) {
      onContextCountChange(value);
    }
    // 保存到localStorage
    try {
      const appSettingsJSON = localStorage.getItem('appSettings');
      const appSettings = appSettingsJSON ? JSON.parse(appSettingsJSON) : {};
      localStorage.setItem('appSettings', JSON.stringify({
        ...appSettings,
        contextCount: value
      }));
    } catch (error) {
      console.error('保存设置失败', error);
    }
  };

  const handleMathRendererChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const value = event.target.value as MathRendererType;
    setMathRenderer(value);
    if (onMathRendererChange) {
      onMathRendererChange(value);
    }
    // 保存到localStorage
    try {
      const appSettingsJSON = localStorage.getItem('appSettings');
      const appSettings = appSettingsJSON ? JSON.parse(appSettingsJSON) : {};
      localStorage.setItem('appSettings', JSON.stringify({
        ...appSettings,
        mathRenderer: value
      }));
    } catch (error) {
      console.error('保存设置失败', error);
    }
  };

  return (
    <List sx={{ p: 0 }}>
      <ListItem sx={{ px: 2, py: 1.5 }}>
        <ListItemIcon sx={{ minWidth: '40px' }}>
          <SettingsIcon sx={{ color: 'primary.main' }} />
        </ListItemIcon>
        <ListItemText 
          primary="助手设置" 
          secondary="设置助手行为和外观" 
          primaryTypographyProps={{ fontWeight: 'medium' }}
        />
      </ListItem>
      
      <Divider sx={{ my: 1 }} />
      
      {/* 用户头像设置区域 */}
      <ListItem sx={{ 
        px: 2, 
        py: 1.5, 
        display: 'flex', 
        justifyContent: 'space-between',
        bgcolor: 'rgba(255, 193, 7, 0.1)', // 黄色背景提示区域
        borderLeft: '3px solid #ffc107' // 左侧黄色线条
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar 
            src={userAvatar} 
            sx={{ 
              width: 40, 
              height: 40, 
              mr: 1.5, 
              bgcolor: userAvatar ? 'transparent' : '#87d068'
            }}
          >
            {!userAvatar && "我"}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight="medium">
              用户头像
            </Typography>
            <Typography variant="caption" color="text.secondary">
              设置您的个人头像
            </Typography>
          </Box>
        </Box>
        <Tooltip title="设置头像">
          <IconButton 
            size="small" 
            color="primary" 
            onClick={handleAvatarDialogOpen}
            sx={{ 
              bgcolor: 'rgba(0, 0, 0, 0.04)',
              '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.1)' }
            }}
          >
            <FaceIcon />
          </IconButton>
        </Tooltip>
      </ListItem>
      
      {availableSettings.map((setting) => (
        <ListItem key={setting.id} sx={{ px: 2, py: 1 }}>
          <ListItemText 
            primary={setting.name} 
            secondary={setting.description}
            primaryTypographyProps={{ fontSize: '0.95rem' }}
            secondaryTypographyProps={{ fontSize: '0.8rem' }}
          />
          <Switch 
            defaultChecked={setting.defaultValue} 
            edge="end"
            onChange={(e) => handleSettingChange(setting.id, e)} 
          />
        </ListItem>
      ))}

      <Divider sx={{ my: 1 }} />
      
      {/* 上下文长度控制 */}
      <ListItem sx={{ px: 2, py: 1, flexDirection: 'column', alignItems: 'stretch' }}>
        <Box sx={{ width: '100%', mb: 1 }}>
          <Typography variant="body2" fontWeight="medium">
            上下文长度
          </Typography>
          <Typography variant="caption" color="text.secondary">
            控制单条消息的最大长度（{contextLength}字符）
          </Typography>
        </Box>
        <Slider
          value={contextLength}
          onChange={handleContextLengthChange}
          min={500}
          max={8000}
          step={100}
          valueLabelDisplay="auto"
          aria-labelledby="context-length-slider"
        />
      </ListItem>

      {/* 上下文数量控制 */}
      <ListItem sx={{ px: 2, py: 1, flexDirection: 'column', alignItems: 'stretch' }}>
        <Box sx={{ width: '100%', mb: 1 }}>
          <Typography variant="body2" fontWeight="medium">
            上下文数量
          </Typography>
          <Typography variant="caption" color="text.secondary">
            控制对话中保留的消息数量（{contextCount}条）
          </Typography>
        </Box>
        <Slider
          value={contextCount}
          onChange={handleContextCountChange}
          min={1}
          max={50}
          step={1}
          valueLabelDisplay="auto"
          aria-labelledby="context-count-slider"
        />
      </ListItem>

      {/* 数学公式渲染器选择 */}
      <ListItem sx={{ px: 2, py: 1, flexDirection: 'column', alignItems: 'stretch' }}>
        <FormControl fullWidth size="small" sx={{ mt: 1 }}>
          <InputLabel id="math-renderer-label">数学公式引擎</InputLabel>
          <Select
            labelId="math-renderer-label"
            id="math-renderer-select"
            value={mathRenderer}
            label="数学公式引擎"
            onChange={handleMathRendererChange as any}
          >
            <MenuItem value="KaTeX">KaTeX</MenuItem>
            <MenuItem value="MathJax">MathJax</MenuItem>
            <MenuItem value="none">无</MenuItem>
          </Select>
          <FormHelperText>选择数学公式的渲染引擎</FormHelperText>
        </FormControl>
      </ListItem>
      
      <Box sx={{ p: 2, mt: 2, bgcolor: 'rgba(0, 0, 0, 0.03)', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 'medium' }}>
          提示
        </Typography>
        <Typography variant="caption" color="text.secondary">
          每个助手都有独立的话题组，可以方便您管理不同场景下的对话。
        </Typography>
      </Box>

      {/* 头像上传对话框 */}
      <AvatarUploader
        open={isAvatarDialogOpen}
        onClose={handleAvatarDialogClose}
        onSave={handleSaveAvatar}
        currentAvatar={userAvatar}
        title="设置用户头像"
      />
    </List>
  );
} 