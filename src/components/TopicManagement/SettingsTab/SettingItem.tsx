import React, { useState, useEffect } from 'react';
import {
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch
} from '@mui/material';
import { getAppSettings } from '../../../shared/utils/settingsUtils';

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
  // 初始化时就从localStorage读取值，避免undefined到boolean的变化
  const getInitialValue = React.useCallback(() => {
    try {
      const appSettings = getAppSettings();
      const currentValue = appSettings[setting.id];
      return currentValue !== undefined ? currentValue : setting.defaultValue;
    } catch (error) {
      console.error('加载设置失败:', error);
      return setting.defaultValue;
    }
  }, [setting.id, setting.defaultValue]);

  // 使用受控状态，初始值从localStorage读取
  const [checked, setChecked] = useState<boolean>(() => getInitialValue());

  // 监听设置变化时重新加载
  useEffect(() => {
    const newValue = getInitialValue();
    setChecked(newValue);
  }, [getInitialValue]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    setChecked(newValue);
    onChange(setting.id, newValue);
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
          checked={checked}
          edge="end"
          onChange={handleChange}
        />
      </ListItemSecondaryAction>
    </ListItem>
  );
}