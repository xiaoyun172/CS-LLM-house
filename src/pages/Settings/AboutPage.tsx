import React from 'react';
import {
  Box,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Container,
  Divider,
  Paper,
  Button,
  Chip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChatIcon from '@mui/icons-material/Chat';
import { useNavigate } from 'react-router-dom';

// QQ群链接
const QQ_GROUP_URL = 'http://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=V-b46WoBNLIM4oc34JMULwoyJ3hyrKac&authKey=q%2FSwCcxda4e55ygtwp3h9adQXhqBLZ9wJdvM0QxTjXQkbxAa2tHoraOGy2fiibyY&noverify=0&group_code=930126592';

const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/settings');
  };

  const handleJoinQQGroup = async () => {
    try {
      // 使用传统方法打开链接
      window.open(QQ_GROUP_URL, '_blank');
    } catch (error) {
      console.error('打开浏览器失败:', error);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleBack}
            aria-label="back"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            关于我们
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ mt: 2, mb: 2 }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            关于AetherLink
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <img 
              src="/assets/logo.png" 
              alt="AetherLink Logo" 
              style={{ 
                width: 120, 
                height: 120, 
                objectFit: 'contain' 
              }} 
            />
          </Box>

          <Typography variant="body1" paragraph>
            AetherLink是一个强大的AI助手应用，支持多种大语言模型，帮助您更高效地完成工作。
          </Typography>

          <Typography variant="body1" paragraph>
            我们致力于为用户提供最佳的AI辅助体验，让人工智能技术真正帮助到每一个人。
          </Typography>

          <Box sx={{ 
            mt: 3, 
            mb: 3, 
            p: 2, 
            borderRadius: 2,
            bgcolor: (theme) => theme.palette.mode === 'dark' 
              ? 'rgba(147, 51, 234, 0.1)' 
              : 'rgba(147, 51, 234, 0.05)',
            border: (theme) => `1px solid ${
              theme.palette.mode === 'dark' 
                ? 'rgba(147, 51, 234, 0.2)' 
                : 'rgba(147, 51, 234, 0.1)'
            }`
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <ChatIcon color="primary" sx={{ mr: 1, fontSize: 20 }} />
              <Typography variant="subtitle1" fontWeight="medium">
                用户交流群
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              如有问题或建议，欢迎加入我们的QQ群进行反馈
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="群号: 930126592" variant="outlined" size="small" />
              <Button 
                variant="contained" 
                size="small"
                onClick={handleJoinQQGroup}
                startIcon={<ChatIcon fontSize="small" />}
              >
                加入QQ群
              </Button>
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            版本: 0.1.5
          </Typography>

          <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button variant="outlined" href="https://github.com/1600822305/CS-LLM-house" target="_blank">
              GitHub
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => navigate('/devtools')}
            >
              开发者工具
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default AboutPage; 