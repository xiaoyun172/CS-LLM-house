import { 
  Box, 
  Typography,
  Divider
} from '@mui/material';
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
 * 设置分组组件
 */
export default function SettingGroups({ groups, onSettingChange }: SettingGroupsProps) {
  return (
    <Box>
      {groups.map((group, index) => (
        <Box key={group.id} sx={{ mb: 2 }}>
          {/* 分组标题 */}
          <Typography 
            variant="subtitle2" 
            sx={{ 
              px: 2, 
              py: 1, 
              fontWeight: 'medium',
              color: 'primary.main'
            }}
          >
            {group.title}
          </Typography>
          
          <Divider sx={{ mb: 1 }} />
          
          {/* 分组内的设置项 */}
          {group.settings.map(setting => (
            <SettingItem
              key={setting.id}
              setting={setting}
              onChange={onSettingChange}
            />
          ))}
          
          {/* 最后一个分组不需要底部外边距 */}
          {index < groups.length - 1 && <Box sx={{ height: 16 }} />}
        </Box>
      ))}
    </Box>
  );
} 