import React from 'react';
import { Typography, Paper, Box, Divider, AppBar, Toolbar, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import VueComponentBridge from '../../components/VueComponents/VueComponentBridge';
import VueCapacitorBridge from './VueCapacitorBridge';

const VueDemoPage: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1); // 返回上一页
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
              color: '#42b983',  // Vue绿色
            }}
          >
            Vue 组件演示
          </Typography>
        </Toolbar>
      </AppBar>

      {/* 可滚动内容区 */}
      <Box 
        sx={{ 
          flexGrow: 1, 
          overflow: 'auto',  // 关键设置：允许内容滚动
          px: 2,
          py: 2,
          mt: 8,  // 为顶部AppBar留出空间
        }}
      >
        <Box sx={{ maxWidth: '800px', mx: 'auto', pb: 6 }}>  
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              基础Vue组件
            </Typography>
            <Box sx={{ my: 2 }}>
              <VueComponentBridge title="来自React的Vue组件" />
            </Box>
            <Typography variant="body2" color="text.secondary">
              这个基础Vue组件被包装在React组件中，数据通过props传递。
            </Typography>
          </Paper>

          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Capacitor功能演示 (Vue实现)
            </Typography>
            <Box sx={{ my: 2 }}>
              <VueCapacitorBridge />
            </Box>
            <Typography variant="body2" color="text.secondary">
              这个Vue组件展示了如何在Vue组件中使用Capacitor原生功能。
            </Typography>
          </Paper>

          <Divider sx={{ my: 4 }} />

          <Typography variant="body1">
            无视这个页面用来测试vue兼容。
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default VueDemoPage; 