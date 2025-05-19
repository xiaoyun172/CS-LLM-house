import React from 'react';
import { 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction, 
  Switch
} from '@mui/material';

interface Setting {
  id: string;
  name: string;
  description: string;
  defaultValue: boolean;
}

interface SettingItemProps {
  setting: Setting;
  onChange: (settingId: string, value: boolean) => void;
}

/**
 * 单个设置项组件
 */
export default function SettingItem({ setting, onChange }: SettingItemProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(setting.id, event.target.checked);
  };

  return (
    <ListItem sx={{ px: 2, py: 1 }}>
      <ListItemText 
        primary={setting.name} 
        secondary={setting.description}
        primaryTypographyProps={{ fontSize: '0.95rem' }}
        secondaryTypographyProps={{ fontSize: '0.8rem' }}
      />
      <ListItemSecondaryAction>
        <Switch 
          defaultChecked={setting.defaultValue} 
          edge="end"
          onChange={handleChange} 
        />
      </ListItemSecondaryAction>
    </ListItem>
  );
} 