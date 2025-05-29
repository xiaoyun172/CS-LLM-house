import React from 'react';
import {
  Box,
  ListItemButton,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Paper,
  alpha,
  Avatar
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LanguageIcon from '@mui/icons-material/Language';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SettingsIcon from '@mui/icons-material/Settings';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import StorageIcon from '@mui/icons-material/Storage';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import ExtensionIcon from '@mui/icons-material/Extension';
import InfoIcon from '@mui/icons-material/Info';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import SettingsApplicationsIcon from '@mui/icons-material/SettingsApplications';
import TuneIcon from '@mui/icons-material/Tune';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CodeIcon from '@mui/icons-material/Code';
import ForumIcon from '@mui/icons-material/Forum';
import MenuBookIcon from '@mui/icons-material/MenuBook';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/chat');
  };

  const navigateTo = (path: string) => {
    navigate(path);
  };

  // 定义设置菜单组
  const settingsGroups = [
    {
      title: '基本设置',
      items: [
        { id: 'appearance', title: '外观', description: '主题、字体大小和语言设置', icon: <FormatColorFillIcon />, path: '/settings/appearance', color: '#6366f1' },
        { id: 'behavior', title: '行为', description: '消息发送和通知设置', icon: <SettingsApplicationsIcon />, path: '/settings/behavior', color: '#8b5cf6' },
      ]
    },
    {
      title: '模型服务',
      items: [
        { id: 'default-model', title: '配置模型', description: '管理AI模型和API密钥', icon: <SmartToyIcon />, path: '/settings/default-model', color: '#ec4899' },
        { id: 'default-model-settings', title: '默认模型', description: '选择默认模型和自动化选项', icon: <TuneIcon />, path: '/settings/default-model-settings', color: '#4f46e5' },
        { id: 'system-prompts', title: '系统提示词', description: '管理全局系统提示词和提示词模板', icon: <AutoFixHighIcon />, path: '/settings/system-prompts', color: '#0ea5e9' },
        { id: 'ai-debate', title: 'AI辩论设置', description: '配置AI互相辩论讨论功能', icon: <ForumIcon />, path: '/settings/ai-debate', color: '#e11d48' },
        { id: 'model-combo', title: '模型组合', description: '创建和管理多模型组合', icon: <SmartToyIcon />, path: '/settings/model-combo', color: '#f43f5e' },
        { id: 'web-search', title: '网络搜索', description: '配置网络搜索和相关服务', icon: <LanguageIcon />, path: '/settings/web-search', color: '#3b82f6' },
        { id: 'mcp-server', title: 'MCP 服务器', description: '高级服务器配置', icon: <SettingsIcon />, path: '/settings/mcp-server', color: '#10b981' },
      ]
    },
    {
      title: '快捷方式',
      items: [
        { id: 'shortcuts', title: '快捷助手', description: '自定义键盘快捷键', icon: <KeyboardIcon />, path: '/settings/shortcuts', color: '#f59e0b' },
        { id: 'shortcut-language', title: '快捷短语', description: '创建常用短语模板', icon: <KeyboardIcon />, path: '/settings/shortcut-language', color: '#f97316' },
      ]
    },
    {
      title: '其他设置',
      items: [
        { id: 'knowledge-settings', title: '知识库设置', description: '管理知识库配置和嵌入模型', icon: <MenuBookIcon />, path: '/settings/knowledge', color: '#059669' },
        { id: 'data-settings', title: '数据设置', description: '管理数据存储和隐私选项', icon: <StorageIcon />, path: '/settings/data', color: '#0ea5e9' },
        { id: 'voice-settings', title: '语音功能', description: '语音识别和文本转语音设置', icon: <RecordVoiceOverIcon />, path: '/settings/voice', color: '#8b5cf6' },
        { id: 'features', title: '功能模块', description: '启用或禁用应用功能', icon: <ExtensionIcon />, path: '/settings/features', color: '#22c55e' },
        { id: 'vue-demo', title: 'Vue 组件演示', description: 'Vue与Capacitor功能演示', icon: <CodeIcon />, path: '/vue-demo', color: '#42b983' },
        { id: 'about', title: '关于我们', description: '应用信息和技术支持', icon: <InfoIcon />, path: '/settings/about', color: '#64748b' },
      ]
    }
  ];

  return (
    <Box sx={{
      flexGrow: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      bgcolor: (theme) => theme.palette.mode === 'light'
        ? alpha(theme.palette.primary.main, 0.02)
        : alpha(theme.palette.background.default, 0.9),
    }}>
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
            sx={{
              color: (theme) => theme.palette.primary.main,
            }}
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
            设置
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          px: 2,
          py: 2,
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
        {settingsGroups.map((group, index) => (
          <Box key={index} sx={{ mb: 3 }}>
            <Typography
              variant="subtitle1"
              sx={{
                px: 1,
                mb: 1.5,
                fontSize: '0.85rem',
                fontWeight: 600,
                color: (theme) => theme.palette.mode === 'light' ? '#475569' : '#94A3B8',
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}
            >
              {group.title}
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)'
                },
                gap: 2
              }}
            >
              {group.items.map((item) => (
                <Paper
                  key={item.id}
                  elevation={0}
                  sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'all 0.2s ease-in-out',
                    bgcolor: 'background.paper',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                      borderColor: (theme) => alpha(theme.palette.primary.main, 0.3),
                    }
                  }}
                >
                  <ListItemButton
                    onClick={() => navigateTo(item.path)}
                    sx={{
                      p: 0,
                      height: '100%',
                      '&:hover': {
                        bgcolor: 'transparent',
                      }
                    }}
                  >
                    <Box sx={{
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%',
                      p: 2
                    }}>
                      <Avatar
                        sx={{
                          bgcolor: alpha(item.color, 0.12),
                          color: item.color,
                          mr: 2,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                        }}
                      >
                        {item.icon}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 600,
                            mb: 0.5,
                            color: 'text.primary'
                          }}
                        >
                          {item.title}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            color: 'text.secondary',
                            fontSize: '0.8rem',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          {item.description}
                        </Typography>
                      </Box>
                      <ChevronRightIcon sx={{ color: (theme) => alpha(theme.palette.primary.main, 0.5), ml: 1 }} />
                    </Box>
                  </ListItemButton>
                </Paper>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default SettingsPage;