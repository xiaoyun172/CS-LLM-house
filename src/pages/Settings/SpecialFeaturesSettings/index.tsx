import React from 'react';
import { Box, Typography, Container, AppBar, Toolbar, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import SpecialFeaturesSettings from '../../../components/settings/SpecialFeaturesSettings';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';

/**
 * 特殊功能设置页面
 * 包含思考过程显示、多模型对比和工具调用等特殊功能的设置
 */
const SpecialFeaturesSettingsPage: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/settings');
  };

  return (
    <Box sx={{ 
      flexGrow: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      overflow: 'hidden',
    }}>
      {/* 顶部导航栏 */}
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
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: (theme) => theme.palette.text.primary,
            }}
          >
            <AutoFixHighIcon sx={{ color: '#8b5cf6' }} /> 特殊功能设置
          </Typography>
        </Toolbar>
      </AppBar>

      {/* 可滚动内容区 */}
      <Box 
        sx={{ 
          flexGrow: 1, 
          overflow: 'auto',
          px: 2,
          py: 2,
          mt: 8,
          mb: 2,
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0,0,0,0.1)',
            borderRadius: '3px',
          },
        }}
      >
        <Container maxWidth="md">
          <SpecialFeaturesSettings />
        </Container>
      </Box>
    </Box>
  );
};

export default SpecialFeaturesSettingsPage;
