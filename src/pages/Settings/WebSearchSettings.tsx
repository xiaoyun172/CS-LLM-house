import React, { useState } from 'react';
import {
  Box,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Paper,
  Tabs,
  Tab
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import SearchSettings from './SearchSettings';
import SmartSearchSettings from './SmartSearchSettings';
import { alpha } from '@mui/material/styles';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`search-tabpanel-${index}`}
      aria-labelledby={`search-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `search-tab-${index}`,
    'aria-controls': `search-tabpanel-${index}`,
  };
}

const WebSearchSettings: React.FC = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);

  const handleBack = () => {
    navigate('/settings');
  };

  const handleChangeTab = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ flexGrow: 1, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar 
        position="fixed" 
        elevation={0}
        sx={{ 
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
            color="inherit" 
            aria-label="back" 
            onClick={handleBack}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontWeight: 600,
              backgroundImage: 'linear-gradient(90deg, #3B82F6, #1D4ED8)',
              backgroundClip: 'text',
              color: 'transparent'
            }}
          >
            搜索设置
          </Typography>
        </Toolbar>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleChangeTab} aria-label="search settings tabs" centered>
            <Tab label="网络搜索" {...a11yProps(0)} />
            <Tab label="智能搜索" {...a11yProps(1)} />
          </Tabs>
        </Box>
      </AppBar>
      
      <Box 
        sx={{ 
          flexGrow: 1, 
          p: 2, 
          mt: 16, // 增加顶部距离，为选项卡腾出空间
          overflowY: 'auto',
          bgcolor: (theme) => theme.palette.mode === 'light'
            ? alpha(theme.palette.primary.main, 0.02)
            : alpha(theme.palette.background.default, 0.9),
        }}
      >
        <TabPanel value={tabValue} index={0}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 0, 
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              maxWidth: 800,
              mx: 'auto'
            }}
          >
            <SearchSettings />
          </Paper>
          
          <Box sx={{ 
            mt: 3, 
            p: 3, 
            borderRadius: 2, 
            border: '1px solid',
            borderColor: theme => alpha(theme.palette.info.main, 0.3),
            bgcolor: theme => alpha(theme.palette.info.main, 0.05),
            maxWidth: 800,
            mx: 'auto'
          }}>
            <Typography variant="subtitle1" fontWeight={600} color="info.main">
              关于无API密钥搜索
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              AetherLink集成的搜索功能基于开源的DuckDuckGo API代理，可以在不需要任何API密钥的情况下为AI提供实时的网络搜索能力。
              此功能完全免费使用，且可以部署到您自己的服务器上以获得更好的稳定性和控制权。
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              技术实现基于<a href="https://github.com/binjie09/duckduckgo-api" target="_blank" rel="noopener noreferrer" style={{color: '#3B82F6'}}>binjie09/duckduckgo-api</a>项目。
            </Typography>
          </Box>
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 0, 
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              maxWidth: 800,
              mx: 'auto'
            }}
          >
            <SmartSearchSettings />
          </Paper>
        </TabPanel>
      </Box>
    </Box>
  );
};

export default WebSearchSettings;