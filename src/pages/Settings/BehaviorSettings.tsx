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
  Paper,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../shared/store';
import { setSendWithEnter, setEnableNotifications } from '../../shared/store/settingsSlice';

const BehaviorSettings: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);

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
            行为
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ mt: 2, mb: 2 }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            行为
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.sendWithEnter}
                  onChange={(e) => dispatch(setSendWithEnter(e.target.checked))}
                />
              }
              label="使用Enter键发送消息"
            />
          </Box>

          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.enableNotifications}
                  onChange={(e) => dispatch(setEnableNotifications(e.target.checked))}
                />
              }
              label="启用通知"
            />
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default BehaviorSettings; 