import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Paper
} from '@mui/material';
import { styles } from './styles';

/**
 * 系统提示词管理 - 默认提示词设置UI组件
 * 用于编辑和配置全局默认系统提示词，包含开关控制和文本编辑区域
 */
interface DefaultPromptSectionProps {
  defaultPrompt: string;
  useDefaultPrompt: boolean;
  onChangeDefaultPrompt: (value: string) => void;
  onToggleUseDefault: (value: boolean) => void;
}

export const DefaultPromptSection: React.FC<DefaultPromptSectionProps> = ({
  defaultPrompt,
  useDefaultPrompt,
  onChangeDefaultPrompt,
  onToggleUseDefault
}) => {
  return (
    <Paper
      elevation={0}
      sx={styles.paper}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          默认系统提示词
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          当助手没有特定系统提示词时，将使用此默认提示词
        </Typography>
      
        <FormControlLabel
          control={
            <Switch 
              checked={useDefaultPrompt}
              onChange={(e) => onToggleUseDefault(e.target.checked)}
            />
          }
          label="使用全局默认系统提示词"
        />
      
        {useDefaultPrompt && (
          <TextField
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={defaultPrompt}
            onChange={(e) => onChangeDefaultPrompt(e.target.value)}
            placeholder="输入默认系统提示词..."
            sx={{ mt: 2 }}
          />
        )}
      </Box>
    </Paper>
  );
}; 