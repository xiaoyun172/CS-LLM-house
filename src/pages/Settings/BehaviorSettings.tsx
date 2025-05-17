import React from 'react';
import {
  Box,
  Typography,
  FormControlLabel,
  Switch,
  AppBar,
  Toolbar,
  IconButton,
  Container,
  Divider,
  alpha,
  useTheme,
  Card,
  CardContent,
  Stack,
  Zoom,
  LinearProgress,
  Avatar,
  Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../shared/store';
import { setSendWithEnter, setEnableNotifications } from '../../shared/store/settingsSlice';

const BehaviorSettings: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);
  const theme = useTheme();
  const [saving, setSaving] = React.useState(false);

  const handleBack = () => {
    navigate('/settings');
  };

  // 模拟保存设置后的反馈效果
  const handleSettingChange = (action: any, value: boolean) => {
    setSaving(true);
    dispatch(action(value));
    setTimeout(() => setSaving(false), 600);
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        background: theme.palette.mode === 'dark' 
          ? `linear-gradient(145deg, ${alpha(theme.palette.background.default, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`
          : `linear-gradient(145deg, ${alpha(theme.palette.primary.light, 0.05)} 0%, ${alpha(theme.palette.background.paper, 0.8)} 100%)`,
        pb: 8
      }}
    >
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={{ 
          backdropFilter: 'blur(10px)',
          background: theme.palette.mode === 'dark' 
            ? alpha(theme.palette.background.paper, 0.7)
            : alpha(theme.palette.primary.main, 0.92),
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`
        }}
      >
        {saving && (
          <LinearProgress 
            sx={{ 
              height: 2, 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              zIndex: 9999 
            }} 
          />
        )}
        <Toolbar sx={{ px: { xs: 2, sm: 3 } }}>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleBack}
            aria-label="back"
            sx={{ 
              mr: 1,
              '&:hover': {
                transform: 'scale(1.05)',
                transition: 'transform 0.2s'
              }
            }}
          >
            <ArrowBackIcon />
          </IconButton>

          <Stack direction="row" alignItems="center" sx={{ flexGrow: 1 }}>
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                fontWeight: 600,
                background: theme.palette.mode === 'dark' 
                  ? 'linear-gradient(45deg, #f5f5f5 30%, #e0e0e0 90%)'
                  : 'linear-gradient(45deg, #222 30%, #444 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: theme.palette.mode === 'dark' ? 'transparent' : 'transparent',
                color: theme.palette.mode === 'dark' ? 'white' : 'black',
              }}
            >
              行为设置
            </Typography>
          </Stack>
          
          <Chip 
            label={saving ? "正在保存..." : "已保存"} 
            color={saving ? "primary" : "success"} 
            size="small"
            variant="outlined"
            icon={saving ? <SettingsBackupRestoreIcon fontSize="small" /> : <DoneAllIcon fontSize="small" />}
            sx={{
              height: 28,
              border: 'none',
              bgcolor: alpha(saving ? theme.palette.primary.main : theme.palette.success.main, 0.15),
              fontSize: '0.75rem'
            }}
          />
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ px: { xs: 2, sm: 3 }, mt: 5, mb: 4 }}>
        <Stack spacing={3}>
          <Box textAlign="center" mb={2}>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 700, 
                mb: 1.5,
                background: theme.palette.mode === 'dark' 
                  ? 'linear-gradient(120deg, #fff 0%, #ccc 100%)'
                  : 'linear-gradient(120deg, #333 0%, #666 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.3px'
              }}
            >
              交互偏好设置
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                maxWidth: 450, 
                mx: 'auto',
                opacity: 0.8
              }}
            >
              自定义您的应用交互方式，让操作更符合个人使用习惯
            </Typography>
          </Box>

          <Stack spacing={3}>
            {[
              {
                id: 'sendWithEnter',
                icon: <SendIcon />,
                title: '消息发送',
                setting: {
                  checked: settings.sendWithEnter,
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => 
                    handleSettingChange(setSendWithEnter, e.target.checked),
                  title: '使用Enter键发送消息',
                  description: '按Enter键快速发送消息，使用Shift+Enter添加换行'
                }
              },
              {
                id: 'notifications',
                icon: <NotificationsIcon />,
                title: '通知设置',
                setting: {
                  checked: settings.enableNotifications,
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => 
                    handleSettingChange(setEnableNotifications, e.target.checked),
                  title: '启用通知',
                  description: '当收到新消息或有重要更新时接收通知提醒'
                }
              }
            ].map((section, index) => (
              <Zoom 
                key={section.id}
                in={true} 
                style={{ 
                  transitionDelay: `${index * 100}ms` 
                }}
              >
                <Card 
                  elevation={0} 
                  sx={{ 
                    borderRadius: 3,
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    boxShadow: theme.palette.mode === 'dark'
                      ? `0 10px 25px -5px ${alpha(theme.palette.common.black, 0.25)}`
                      : `0 10px 30px -8px ${alpha(theme.palette.primary.main, 0.1)}`,
                    overflow: 'hidden',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      boxShadow: theme.palette.mode === 'dark'
                        ? `0 15px 35px -5px ${alpha(theme.palette.common.black, 0.3)}`
                        : `0 15px 35px -10px ${alpha(theme.palette.primary.main, 0.15)}`,
                      transform: 'translateY(-4px)'
                    }
                  }}
                >
                  <Box 
                    sx={{ 
                      p: 1,
                      background: theme.palette.mode === 'dark'
                        ? `linear-gradient(90deg, ${alpha(theme.palette.primary.dark, 0.2)} 0%, ${alpha(theme.palette.background.paper, 0.1)} 100%)`
                        : `linear-gradient(90deg, ${alpha(theme.palette.primary.light, 0.2)} 0%, ${alpha(theme.palette.background.paper, 0.05)} 100%)`
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5 }}>
                      <Avatar 
                        sx={{ 
                          width: 40, 
                          height: 40, 
                          bgcolor: theme.palette.mode === 'dark'
                            ? alpha(theme.palette.primary.main, 0.2)
                            : alpha(theme.palette.primary.light, 0.25),
                          color: theme.palette.primary.main
                        }}
                      >
                        {section.icon}
                      </Avatar>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          ml: 2, 
                          fontWeight: 600,
                          fontSize: '1.1rem'
                        }}
                      >
                        {section.title}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Divider />
                  
                  <CardContent sx={{ p: 3 }}>
                    <FormControlLabel
                      sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        width: '100%', 
                        m: 0,
                        '& .MuiFormControlLabel-label': { 
                          flex: 1 
                        }
                      }}
                      labelPlacement="start"
                      control={
                        <Switch
                          checked={section.setting.checked}
                          onChange={section.setting.onChange}
                          color="primary"
                          sx={{ 
                            ml: 2,
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: theme.palette.primary.main
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: alpha(theme.palette.primary.main, 0.5)
                            }
                          }}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {section.setting.title}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: theme.palette.mode === 'dark' 
                                ? alpha(theme.palette.text.secondary, 0.8) 
                                : theme.palette.text.secondary 
                            }}
                          >
                            {section.setting.description}
                          </Typography>
                        </Box>
                      }
                    />
                  </CardContent>
                </Card>
              </Zoom>
            ))}
          </Stack>
          
          <Typography 
            variant="caption" 
            sx={{ 
              display: 'block', 
              textAlign: 'center', 
              mt: 2, 
              color: theme.palette.mode === 'dark' 
                ? alpha(theme.palette.text.secondary, 0.6) 
                : theme.palette.text.secondary,
              opacity: 0.7,
              mx: 'auto',
              maxWidth: 350
            }}
          >
            您的设置将自动保存并同步到所有设备，无需手动操作
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
};

export default BehaviorSettings;