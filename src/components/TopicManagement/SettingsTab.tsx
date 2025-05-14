import { 
  Box, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Divider, 
  Switch, 
  Typography
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';

interface Setting {
  id: string;
  name: string;
  description: string;
  defaultValue: boolean;
}

interface SettingsTabProps {
  settings?: Setting[];
  onSettingChange?: (settingId: string, value: boolean) => void;
}

export default function SettingsTab({ 
  settings = [],
  onSettingChange 
}: SettingsTabProps) {
  // 默认设置选项
  const defaultSettings: Setting[] = [
    { id: 'streamOutput', name: '流式输出', defaultValue: true, description: '实时显示AI回答，打字机效果' },
    { id: 'showMessageDivider', name: '消息分割线', defaultValue: true, description: '在消息之间显示分割线' },
    { id: 'copyableCodeBlocks', name: '代码块可复制', defaultValue: true, description: '允许复制代码块的内容' },
  ];

  // 如果没有传入设置，使用默认设置
  const availableSettings = settings.length ? settings : defaultSettings;

  const handleSettingChange = (settingId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    if (onSettingChange) {
      onSettingChange(settingId, event.target.checked);
    }
  };

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
      
      {availableSettings.map((setting) => (
        <ListItem key={setting.id} sx={{ px: 2, py: 1 }}>
          <ListItemText 
            primary={setting.name} 
            secondary={setting.description}
            primaryTypographyProps={{ fontSize: '0.95rem' }}
            secondaryTypographyProps={{ fontSize: '0.8rem' }}
          />
          <Switch 
            defaultChecked={setting.defaultValue} 
            edge="end"
            onChange={(e) => handleSettingChange(setting.id, e)} 
          />
        </ListItem>
      ))}
      
      <Box sx={{ p: 2, mt: 2, bgcolor: 'rgba(0, 0, 0, 0.03)', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 'medium' }}>
          提示
        </Typography>
        <Typography variant="caption" color="text.secondary">
          每个助手都有独立的话题组，可以方便您管理不同场景下的对话。
        </Typography>
      </Box>
    </List>
  );
} 