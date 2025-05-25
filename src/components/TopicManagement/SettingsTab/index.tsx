import { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Avatar,
  IconButton,
  Tooltip,
  ListItemButton
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import FaceIcon from '@mui/icons-material/Face';
import TuneIcon from '@mui/icons-material/Tune';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useNavigate } from 'react-router-dom';
import type { MathRendererType } from '../../../shared/types';
import type { ThinkingOption } from '../../../shared/config/reasoningConfig';
import SettingGroups from './SettingGroups';
import AvatarUploader from '../../settings/AvatarUploader';
import MCPSidebarControls from '../../chat/MCPSidebarControls';
import ThrottleLevelSelector from './ThrottleLevelSelector';
import ContextSettings from './ContextSettings';
import CodeBlockSettings from './CodeBlockSettings';

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
  onThinkingEffortChange?: (value: ThinkingOption) => void;
  initialContextLength?: number;
  initialContextCount?: number;
  initialMathRenderer?: MathRendererType;
  initialThinkingEffort?: ThinkingOption;
  mcpMode?: 'prompt' | 'function';
  toolsEnabled?: boolean;
  onMCPModeChange?: (mode: 'prompt' | 'function') => void;
  onToolsToggle?: (enabled: boolean) => void;
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
  onThinkingEffortChange,
  initialContextLength = 16000,
  initialContextCount = 5,
  initialMathRenderer = 'KaTeX',
  initialThinkingEffort = 'medium',
  mcpMode = 'function',
  toolsEnabled = true,
  onMCPModeChange,
  onToolsToggle
}: SettingsTabProps) {
  const navigate = useNavigate();

  // 本地状态
  const [contextLength, setContextLength] = useState<number>(initialContextLength);
  const [contextCount, setContextCount] = useState<number>(initialContextCount);
  const [mathRenderer, setMathRenderer] = useState<MathRendererType>(initialMathRenderer);
  const [thinkingEffort, setThinkingEffort] = useState<ThinkingOption>(initialThinkingEffort);
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
        if (appSettings.defaultThinkingEffort) setThinkingEffort(appSettings.defaultThinkingEffort);

        // 加载流式输出设置
        console.log(`[SettingsTab] 从localStorage加载的设置:`, appSettings);
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
    { id: 'showMessageDivider', name: '对话分割线', defaultValue: true, description: '在对话轮次之间显示分割线' },
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
    // 保存到localStorage
    try {
      const appSettingsJSON = localStorage.getItem('appSettings');
      const appSettings = appSettingsJSON ? JSON.parse(appSettingsJSON) : {};
      localStorage.setItem('appSettings', JSON.stringify({
        ...appSettings,
        [settingId]: value
      }));
      console.log(`[SettingsTab] 设置已保存: ${settingId} = ${value}`);
    } catch (error) {
      console.error('保存设置失败', error);
    }

    if (onSettingChange) {
      onSettingChange(settingId, value);
    }
  };

  // 将设置分组
  const settingGroups = [
    {
      id: 'general',
      title: '常规设置',
      settings: availableSettings
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

      {/* 节流强度选择器 */}
      <ThrottleLevelSelector />

      {/* 代码块设置 */}
      <CodeBlockSettings onSettingChange={handleSettingChange} />

      {/* 可折叠的上下文设置 */}
      <ContextSettings
        contextLength={contextLength}
        contextCount={contextCount}
        mathRenderer={mathRenderer}
        thinkingEffort={thinkingEffort}
        onContextLengthChange={(value) => {
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
        }}
        onContextCountChange={(value) => {
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
        }}
        onMathRendererChange={(value) => {
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
        }}
        onThinkingEffortChange={(value) => {
          setThinkingEffort(value);
          if (onThinkingEffortChange) {
            onThinkingEffortChange(value);
          }
          // 保存到localStorage
          try {
            const appSettingsJSON = localStorage.getItem('appSettings');
            const appSettings = appSettingsJSON ? JSON.parse(appSettingsJSON) : {};
            localStorage.setItem('appSettings', JSON.stringify({
              ...appSettings,
              defaultThinkingEffort: value
            }));
          } catch (error) {
            console.error('保存思维链长度设置失败', error);
          }
        }}
      />

      <Divider sx={{ my: 1 }} />

      {/* 应用设置入口 */}
      <ListItemButton
        onClick={() => navigate('/settings')}
        sx={{
          px: 2,
          py: 1.5,
          borderRadius: 1,
          mx: 1,
          mb: 1,
          bgcolor: 'rgba(25, 118, 210, 0.08)',
          border: '1px solid rgba(25, 118, 210, 0.2)',
          '&:hover': {
            bgcolor: 'rgba(25, 118, 210, 0.12)',
          }
        }}
      >
        <ListItemIcon sx={{ minWidth: '40px' }}>
          <TuneIcon sx={{ color: 'primary.main' }} />
        </ListItemIcon>
        <ListItemText
          primary="应用设置"
          secondary="外观、行为、模型等设置"
          primaryTypographyProps={{ fontWeight: 'medium' }}
        />
        <ChevronRightIcon sx={{ color: 'text.secondary' }} />
      </ListItemButton>

      <Divider sx={{ my: 1 }} />

      {/* MCP 工具控制 */}
      <MCPSidebarControls
        mcpMode={mcpMode}
        toolsEnabled={toolsEnabled}
        onMCPModeChange={onMCPModeChange}
        onToolsToggle={onToolsToggle}
      />

      {/* 头像上传对话框 */}
      <AvatarUploader
        open={isAvatarDialogOpen}
        onClose={handleAvatarDialogClose}
        onSave={handleSaveAvatar}
      />
    </List>
  );
}