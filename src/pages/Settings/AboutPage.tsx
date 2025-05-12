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
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';

const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/settings');
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
            关于Cherry Studio
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <img 
              src="/assets/logo.png" 
              alt="Cherry Studio Logo" 
              style={{ 
                width: 120, 
                height: 120, 
                objectFit: 'contain' 
              }} 
            />
          </Box>

          <Typography variant="body1" paragraph>
            Cherry Studio是一个强大的AI助手应用，支持多种大语言模型，帮助您更高效地完成工作。
          </Typography>

          <Typography variant="body1" paragraph>
            我们致力于为用户提供最佳的AI辅助体验，让人工智能技术真正帮助到每一个人。
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            版本: 0.0.2
          </Typography>

          <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button variant="outlined" href="https://github.com/CherryHQ/cherry-studio" target="_blank">
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