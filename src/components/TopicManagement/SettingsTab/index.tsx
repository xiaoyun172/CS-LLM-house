import { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  IconButton,
  Tooltip,
  TextField
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import FaceIcon from '@mui/icons-material/Face';
import type { MathRendererType } from '../../../shared/types';
import SettingGroups from './SettingGroups';
import AvatarUploader from '../../settings/AvatarUploader';

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

/**
 * 设置选项卡主组件
 */
export default function SettingsTab({
  settings = [],
  onSettingChange,
  onContextLengthChange,
  onContextCountChange,
  onMathRendererChange,
  initialContextLength = 16000,
  initialContextCount = 5,
  initialMathRenderer = 'KaTeX'
}: SettingsTabProps) {
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
  const availableSettings = settings.length ? settings : [
    { id: 'streamOutput', name: '流式输出', defaultValue: true, description: '实时显示AI回答，打字机效果' },
    { id: 'showMessageDivider', name: '消息分割线', defaultValue: true, description: '在消息之间显示分割线' },
    { id: 'copyableCodeBlocks', name: '代码块可复制', defaultValue: true, description: '允许复制代码块的内容' },
  ];

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

  const handleSettingChange = (settingId: string, value: boolean) => {
    if (onSettingChange) {
      onSettingChange(settingId, value);
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

  // 将设置分组
  const settingGroups = [
    {
      id: 'general',
      title: '常规设置',
      settings: availableSettings
    },
    {
      id: 'context',
      title: '上下文设置',
      settings: []
    }
  ];

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

      {/* 使用SettingGroups渲染设置分组 */}
      <SettingGroups groups={settingGroups} onSettingChange={handleSettingChange} />

      <Divider sx={{ my: 1 }} />

      {/* 上下文长度控制 */}
      <ListItem sx={{ px: 2, py: 1, flexDirection: 'column', alignItems: 'stretch' }}>
        <Box sx={{ width: '100%', mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="body2" fontWeight="medium">
              上下文长度: {contextLength === 64000 ? '不限' : contextLength} 字符
            </Typography>
            <Typography variant="caption" color="text.secondary">
              每条消息的最大上下文长度
            </Typography>
          </Box>
          <Box sx={{ width: '80px' }}>
            <TextField
              size="small"
              type="number"
              value={contextLength}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value >= 0 && value <= 64000) {
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
                }
              }}
              InputProps={{
                inputProps: { min: 0, max: 64000 }
              }}
            />
          </Box>
        </Box>
        <Slider
          value={contextLength}
          onChange={handleContextLengthChange}
          min={0}
          max={64000}
          step={1000}
          marks={[
            { value: 0, label: '0' },
            { value: 16000, label: '16K' },
            { value: 32000, label: '32K' },
            { value: 48000, label: '48K' },
            { value: 64000, label: '64K' }
          ]}
        />
      </ListItem>

      {/* 上下文消息数量控制 */}
      <ListItem sx={{ px: 2, py: 1, flexDirection: 'column', alignItems: 'stretch' }}>
        <Box sx={{ width: '100%', mb: 1 }}>
          <Typography variant="body2" fontWeight="medium">
            上下文消息数: {contextCount === 100 ? '最大' : contextCount} 条
          </Typography>
          <Typography variant="caption" color="text.secondary">
            每次请求包含的历史消息数量
          </Typography>
        </Box>
        <Slider
          value={contextCount}
          onChange={handleContextCountChange}
          min={0}
          max={100}
          step={1}
          marks={[
            { value: 0, label: '0' },
            { value: 25, label: '25' },
            { value: 50, label: '50' },
            { value: 75, label: '75' },
            { value: 100, label: '最大' }
          ]}
        />
      </ListItem>

      {/* 数学公式渲染器选择 */}
      <ListItem sx={{ px: 2, py: 1, flexDirection: 'column', alignItems: 'stretch' }}>
        <FormControl fullWidth size="small" sx={{ mt: 1 }}>
          <InputLabel id="math-renderer-label">数学公式渲染器</InputLabel>
          <Select
            labelId="math-renderer-label"
            id="math-renderer-select"
            value={mathRenderer}
            label="数学公式渲染器"
            onChange={handleMathRendererChange as any}
          >
            <MenuItem value="KaTeX">KaTeX (轻量)</MenuItem>
            <MenuItem value="MathJax">MathJax (兼容性好)</MenuItem>
          </Select>
        </FormControl>
      </ListItem>

      {/* 头像上传对话框 */}
      <AvatarUploader
        open={isAvatarDialogOpen}
        onClose={handleAvatarDialogClose}
        onSave={handleSaveAvatar}
      />
    </List>
  );
}