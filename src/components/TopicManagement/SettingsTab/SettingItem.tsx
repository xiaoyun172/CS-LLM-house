import React, { useState, useEffect } from 'react';
import {
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  FormControl,
  Select,
  MenuItem
} from '@mui/material';
import { getAppSettings } from '../../../shared/utils/settingsUtils';
import { useAppSelector } from '../../../shared/store';

interface Setting {
  id: string;
  name: string;
  description: string;
  defaultValue: boolean | string;
  type?: 'switch' | 'select';
  options?: Array<{ value: string; label: string }>;
}

interface SettingItemProps {
  setting: Setting;
  onChange: (settingId: string, value: boolean | string) => void;
}

/**
 * 单个设置项组件
 */
export default function SettingItem({ setting, onChange }: SettingItemProps) {
  // 获取Redux中的消息样式状态
  const messageStyle = useAppSelector(state => state.settings.messageStyle);

  // 初始化时就从localStorage读取值，避免undefined到boolean的变化
  const getInitialValue = React.useCallback(() => {
    try {
      // 特殊处理消息样式
      if (setting.id === 'messageStyle') {
        return messageStyle || 'bubble';
      }

      const appSettings = getAppSettings();
      const currentValue = appSettings[setting.id];
      return currentValue !== undefined ? currentValue : setting.defaultValue;
    } catch (error) {
      console.error('加载设置失败:', error);
      return setting.defaultValue;
    }
  }, [setting.id, setting.defaultValue, messageStyle]);

  // 使用受控状态，初始值从localStorage读取
  const [value, setValue] = useState<boolean | string>(() => getInitialValue());

  // 监听设置变化时重新加载
  useEffect(() => {
    const newValue = getInitialValue();
    setValue(newValue);
  }, [getInitialValue]);

  const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    setValue(newValue);
    onChange(setting.id, newValue);
  };

  const handleSelectChange = (event: any) => {
    const newValue = event.target.value;
    setValue(newValue);
    onChange(setting.id, newValue);
  };

  // 根据设置类型渲染不同的控件
  const renderControl = () => {
    if (setting.type === 'select' && setting.options) {
      return (
        <FormControl size="small" sx={{ minWidth: 80 }}>
          <Select
            value={value as string}
            onChange={handleSelectChange}
            variant="outlined"
            sx={{
              fontSize: '0.875rem',
              '& .MuiSelect-select': {
                py: 0.5,
                px: 1
              }
            }}
          >
            {setting.options.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    // 默认使用开关
    return (
      <Switch
        checked={value as boolean}
        edge="end"
        onChange={handleSwitchChange}
      />
    );
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
        {renderControl()}
      </ListItemSecondaryAction>
    </ListItem>
  );
}