import { useState } from 'react';
import {
  Box,
  Collapse,
  IconButton,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SettingsIcon from '@mui/icons-material/Settings';
import TuneIcon from '@mui/icons-material/Tune';
import SettingItem from './SettingItem';

interface Setting {
  id: string;
  name: string;
  description: string;
  defaultValue: boolean;
}

interface SettingGroup {
  id: string;
  title: string;
  settings: Setting[];
}

interface SettingGroupsProps {
  groups: SettingGroup[];
  onSettingChange: (settingId: string, value: boolean) => void;
}

/**
 * 可折叠的设置分组组件
 */
export default function SettingGroups({ groups, onSettingChange }: SettingGroupsProps) {
  // 每个分组的展开状态
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    general: true,  // 常规设置默认展开
    context: false  // 上下文设置默认收起
  });

  // 切换分组展开状态
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // 获取分组图标
  const getGroupIcon = (groupId: string) => {
    switch (groupId) {
      case 'general':
        return <SettingsIcon sx={{ color: 'primary.main' }} />;
      case 'context':
        return <TuneIcon sx={{ color: 'primary.main' }} />;
      default:
        return <SettingsIcon sx={{ color: 'primary.main' }} />;
    }
  };

  // 获取分组描述
  const getGroupDescription = (group: SettingGroup) => {
    const enabledCount = group.settings.length;
    switch (group.id) {
      case 'general':
        return `${enabledCount} 个基础功能设置`;
      case 'context':
        return '上下文长度和消息数量';
      default:
        return `${enabledCount} 个设置项`;
    }
  };

  return (
    <Box>
      {groups.map((group, index) => (
        <Box key={group.id}>
          {/* 可折叠的分组标题栏 */}
          <ListItem
            component="div"
            onClick={() => toggleGroup(group.id)}
            sx={{
              px: 2,
              py: 0.75,
              cursor: 'pointer',
              position: 'relative',
              zIndex: 1,
              '&:hover': {
                backgroundColor: 'transparent !important',
                transform: 'none !important',
                boxShadow: 'none !important'
              },
              '&:focus': {
                backgroundColor: 'transparent !important'
              },
              '&:active': {
                backgroundColor: 'rgba(0, 0, 0, 0.02)'
              },
              '& *': {
                '&:hover': {
                  backgroundColor: 'transparent !important',
                  transform: 'none !important'
                }
              }
            }}
          >
            {getGroupIcon(group.id)}
            <ListItemText
              primary={group.title}
              secondary={getGroupDescription(group)}
              primaryTypographyProps={{ fontWeight: 'medium', sx: { ml: 1.5 } }}
              secondaryTypographyProps={{ fontSize: '0.75rem', sx: { ml: 1.5 } }}
            />
            <ListItemSecondaryAction>
              <IconButton edge="end" size="small" sx={{ padding: '4px' }}>
                {expandedGroups[group.id] ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>

          {/* 可折叠的设置项内容 */}
          <Collapse
            in={expandedGroups[group.id]}
            timeout={{ enter: 300, exit: 200 }}
            easing={{ enter: 'cubic-bezier(0.4, 0, 0.2, 1)', exit: 'cubic-bezier(0.4, 0, 0.6, 1)' }}
            unmountOnExit
          >
            <Box sx={{ pb: 1 }}>
              {/* 分组内的设置项 */}
              {group.settings.map(setting => (
                <SettingItem
                  key={setting.id}
                  setting={setting}
                  onChange={onSettingChange}
                />
              ))}
            </Box>
          </Collapse>

          {/* 最后一个分组不需要底部外边距 */}
          {index < groups.length - 1 && <Box sx={{ height: 8 }} />}
        </Box>
      ))}
    </Box>
  );
}