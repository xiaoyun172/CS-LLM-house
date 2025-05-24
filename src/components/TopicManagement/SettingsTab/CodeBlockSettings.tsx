import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  FormControl,
  Select,
  MenuItem,
  Typography,
  Divider,
  Collapse,
  IconButton
} from '@mui/material';
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import EditIcon from '@mui/icons-material/Edit';
import PaletteIcon from '@mui/icons-material/Palette';

// 代码风格选项
const CODE_STYLES = [
  { value: 'vscDarkPlus', label: 'VS Code Dark+', description: '深色主题，适合夜间使用' },
  { value: 'vs', label: 'VS Code Light', description: '浅色主题，适合白天使用' },
  { value: 'github', label: 'GitHub', description: 'GitHub 风格主题' },
  { value: 'monokai', label: 'Monokai', description: '经典深色主题' },
  { value: 'solarizedlight', label: 'Solarized Light', description: 'Solarized 浅色主题' },
  { value: 'solarizeddark', label: 'Solarized Dark', description: 'Solarized 深色主题' },
  { value: 'tomorrow', label: 'Tomorrow', description: '清新浅色主题' },
  { value: 'twilight', label: 'Twilight', description: '暮光深色主题' }
];

interface CodeBlockSettingsProps {
  onSettingChange?: (settingId: string, value: any) => void;
}

/**
 * 代码块设置组件
 */
const CodeBlockSettings: React.FC<CodeBlockSettingsProps> = ({ onSettingChange }) => {
  const [expanded, setExpanded] = useState(false);
  const [codeStyle, setCodeStyle] = useState('vscDarkPlus');
  const [editorEnabled, setEditorEnabled] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);
  const [copyEnabled, setCopyEnabled] = useState(true);

  // 从 localStorage 加载设置
  useEffect(() => {
    try {
      const appSettingsJSON = localStorage.getItem('appSettings');
      if (appSettingsJSON) {
        const appSettings = JSON.parse(appSettingsJSON);

        // 加载代码块相关设置
        if (appSettings.codeStyle) setCodeStyle(appSettings.codeStyle);
        if (appSettings.codeEditorEnabled !== undefined) setEditorEnabled(appSettings.codeEditorEnabled);
        if (appSettings.codeShowLineNumbers !== undefined) setShowLineNumbers(appSettings.codeShowLineNumbers);
        if (appSettings.codeWordWrap !== undefined) setWordWrap(appSettings.codeWordWrap);
        if (appSettings.codeCopyEnabled !== undefined) setCopyEnabled(appSettings.codeCopyEnabled);

        console.log('[CodeBlockSettings] 从localStorage加载的代码块设置:', {
          codeStyle: appSettings.codeStyle,
          editorEnabled: appSettings.codeEditorEnabled,
          showLineNumbers: appSettings.codeShowLineNumbers,
          wordWrap: appSettings.codeWordWrap,
          copyEnabled: appSettings.codeCopyEnabled
        });
      }
    } catch (error) {
      console.error('加载代码块设置失败:', error);
    }
  }, []);

  // 保存设置到 localStorage
  const saveSettingToStorage = (key: string, value: any) => {
    try {
      const appSettingsJSON = localStorage.getItem('appSettings');
      const appSettings = appSettingsJSON ? JSON.parse(appSettingsJSON) : {};
      const newSettings = {
        ...appSettings,
        [key]: value
      };
      localStorage.setItem('appSettings', JSON.stringify(newSettings));
      console.log(`[CodeBlockSettings] 设置已保存: ${key} = ${value}`);

      // 触发自定义事件通知设置变化
      console.log(`[CodeBlockSettings] 触发settingsChanged事件: ${key} = ${value}`);
      window.dispatchEvent(new CustomEvent('settingsChanged', {
        detail: { key, value }
      }));

      // 通知父组件设置变化
      if (onSettingChange) {
        onSettingChange(key, value);
      }
    } catch (error) {
      console.error('保存代码块设置失败:', error);
    }
  };

  // 处理代码风格变化
  const handleCodeStyleChange = (event: any) => {
    const newStyle = event.target.value;
    setCodeStyle(newStyle);
    saveSettingToStorage('codeStyle', newStyle);
  };

  // 处理编辑器开关
  const handleEditorToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked;
    setEditorEnabled(enabled);
    saveSettingToStorage('codeEditorEnabled', enabled);
  };

  // 处理行号显示开关
  const handleLineNumbersToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked;
    setShowLineNumbers(enabled);
    saveSettingToStorage('codeShowLineNumbers', enabled);
  };

  // 处理自动换行开关
  const handleWordWrapToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked;
    setWordWrap(enabled);
    saveSettingToStorage('codeWordWrap', enabled);
  };

  // 处理复制功能开关
  const handleCopyToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked;
    setCopyEnabled(enabled);
    saveSettingToStorage('codeCopyEnabled', enabled);
  };

  const selectedStyle = CODE_STYLES.find(style => style.value === codeStyle);

  return (
    <>
      <Divider sx={{ my: 1 }} />

      {/* 代码块设置标题 */}
      <ListItem
        component="div"
        onClick={() => setExpanded(!expanded)}
        sx={{ px: 2, py: 1.5, cursor: 'pointer' }}
      >
        <ListItemIcon sx={{ minWidth: '40px' }}>
          <CodeOutlinedIcon sx={{ color: 'primary.main' }} />
        </ListItemIcon>
        <ListItemText
          primary="代码块设置"
          secondary="配置代码显示和编辑功能"
          primaryTypographyProps={{ fontWeight: 'medium' }}
        />
        <IconButton size="small">
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </ListItem>

      {/* 可折叠的设置内容 */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <List sx={{ pl: 2, pr: 2, py: 0 }}>

          {/* 代码风格选择 */}
          <ListItem sx={{ px: 1, py: 1.5, flexDirection: 'column', alignItems: 'flex-start' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, width: '100%' }}>
              <PaletteIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
              <Typography variant="body2" fontWeight="medium">
                代码风格
              </Typography>
            </Box>

            <FormControl fullWidth size="small">
              <Select
                value={codeStyle}
                onChange={handleCodeStyleChange}
                sx={{ fontSize: '0.875rem' }}
              >
                {CODE_STYLES.map((style) => (
                  <MenuItem key={style.value} value={style.value}>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {style.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {style.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedStyle && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                当前: {selectedStyle.description}
              </Typography>
            )}
          </ListItem>

          {/* 开启编辑器 */}
          <ListItem sx={{ px: 1, py: 1 }}>
            <ListItemIcon sx={{ minWidth: '36px' }}>
              <EditIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
            </ListItemIcon>
            <ListItemText
              primary="开启编辑器"
              secondary="允许直接编辑代码块内容"
              primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
            <Switch
              checked={editorEnabled}
              onChange={handleEditorToggle}
              color="primary"
              size="small"
            />
          </ListItem>

          {/* 显示行号 */}
          <ListItem sx={{ px: 1, py: 1 }}>
            <ListItemText
              primary="显示行号"
              secondary="在代码块中显示行号"
              primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
              secondaryTypographyProps={{ variant: 'caption' }}
              sx={{ pl: 4.5 }} // 与上面的图标对齐
            />
            <Switch
              checked={showLineNumbers}
              onChange={handleLineNumbersToggle}
              color="primary"
              size="small"
            />
          </ListItem>

          {/* 自动换行 */}
          <ListItem sx={{ px: 1, py: 1 }}>
            <ListItemText
              primary="自动换行"
              secondary="长代码行自动换行显示"
              primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
              secondaryTypographyProps={{ variant: 'caption' }}
              sx={{ pl: 4.5 }}
            />
            <Switch
              checked={wordWrap}
              onChange={handleWordWrapToggle}
              color="primary"
              size="small"
            />
          </ListItem>

          {/* 复制功能 */}
          <ListItem sx={{ px: 1, py: 1 }}>
            <ListItemText
              primary="复制功能"
              secondary="显示复制按钮，允许复制代码"
              primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
              secondaryTypographyProps={{ variant: 'caption' }}
              sx={{ pl: 4.5 }}
            />
            <Switch
              checked={copyEnabled}
              onChange={handleCopyToggle}
              color="primary"
              size="small"
            />
          </ListItem>

        </List>
      </Collapse>
    </>
  );
};

export default CodeBlockSettings;
