import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Box, useTheme, IconButton, Tooltip, Menu, MenuItem, FormControlLabel, Switch, Typography, Divider } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import OpenInBrowserIcon from '@mui/icons-material/OpenInBrowser';
import WebIcon from '@mui/icons-material/Web';
import { Browser } from '@capacitor/browser';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';


interface Props {
  html: string;
}

interface SecuritySettings {
  allowScripts: boolean;
  allowSameOrigin: boolean;
  allowForms: boolean;
  allowPopups: boolean;
  allowModals: boolean;
}

/**
 * HtmlPreview 组件
 * 基于 nextJsToolBox 的 HTML 预览功能改造
 * 使用 iframe 安全预览 HTML 内容，支持安全设置控制
 */
const HtmlPreview: React.FC<Props> = ({ html }) => {
  const previewRef = useRef<HTMLIFrameElement>(null);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // 安全设置状态
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    allowScripts: true,      // 默认允许脚本
    allowSameOrigin: false,  // 默认禁止同源访问（安全）
    allowForms: false,       // 默认禁止表单
    allowPopups: false,      // 默认禁止弹窗
    allowModals: false,      // 默认禁止模态框
  });

  // 设置菜单状态
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // 生成沙箱权限字符串
  const getSandboxPermissions = useCallback(() => {
    const permissions: string[] = [];

    if (securitySettings.allowScripts) permissions.push('allow-scripts');
    if (securitySettings.allowSameOrigin) permissions.push('allow-same-origin');
    if (securitySettings.allowForms) permissions.push('allow-forms');
    if (securitySettings.allowPopups) permissions.push('allow-popups');
    if (securitySettings.allowModals) permissions.push('allow-modals');

    return permissions.join(' ') || 'allow-scripts'; // 至少保留脚本权限
  }, [securitySettings]);

  // 菜单处理函数
  const handleSettingsClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleSettingsClose = () => {
    setAnchorEl(null);
  };

  const handleSecurityChange = (setting: keyof SecuritySettings) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setSecuritySettings(prev => ({
      ...prev,
      [setting]: event.target.checked
    }));
  };

  // 在外部浏览器打开
  const openInExternalBrowser = useCallback(async () => {
    try {
      // 创建临时 HTML 文件
      const fileName = `preview_${Date.now()}.html`;
      await Filesystem.writeFile({
        path: fileName,
        data: html,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      });

      // 获取文件 URI
      const fileUri = await Filesystem.getUri({
        directory: Directory.Cache,
        path: fileName
      });

      // 在外部浏览器打开
      await Browser.open({
        url: fileUri.uri,
        presentationStyle: 'popover'
      });
    } catch (error) {
      console.error('打开外部浏览器失败:', error);
      // 降级方案：使用 data URL
      const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
      await Browser.open({
        url: dataUrl,
        presentationStyle: 'popover'
      });
    }
  }, [html]);

  // 在内置 WebView 打开
  const openInInternalWebView = useCallback(async () => {
    try {
      // 创建临时 HTML 文件
      const fileName = `preview_${Date.now()}.html`;
      await Filesystem.writeFile({
        path: fileName,
        data: html,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      });

      // 获取文件 URI
      const fileUri = await Filesystem.getUri({
        directory: Directory.Cache,
        path: fileName
      });

      // 在内置 WebView 打开
      await Browser.open({
        url: fileUri.uri,
        presentationStyle: 'fullscreen',
        toolbarColor: isDarkMode ? '#1e1e1e' : '#ffffff'
      });
    } catch (error) {
      console.error('打开内置 WebView 失败:', error);
      // 降级方案：使用 data URL
      const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
      await Browser.open({
        url: dataUrl,
        presentationStyle: 'fullscreen',
        toolbarColor: isDarkMode ? '#1e1e1e' : '#ffffff'
      });
    }
  }, [html, isDarkMode]);

  // HTML 预览现在使用 srcDoc 属性直接更新，无需防抖函数

  // 当安全设置变化时，强制更新 iframe
  useEffect(() => {
    if (previewRef.current && html) {
      // 重新设置 srcdoc 以应用新的沙箱设置
      previewRef.current.srcdoc = html;
    }
  }, [securitySettings, html]);

  return (
    <Box
      sx={{
        minHeight: '300px',
        backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
        position: 'relative'
      }}
    >
      {/* 工具栏按钮 */}
      <Box
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 10,
          display: 'flex',
          gap: 0.5,
          backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.9)',
          borderRadius: '20px',
          padding: '4px',
          backdropFilter: 'blur(4px)'
        }}
      >
        <Tooltip title="在外部浏览器打开">
          <IconButton
            size="small"
            onClick={openInExternalBrowser}
            sx={{
              color: isDarkMode ? '#ffffff' : '#666666',
              '&:hover': {
                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
              }
            }}
          >
            <OpenInBrowserIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="在内置 WebView 打开">
          <IconButton
            size="small"
            onClick={openInInternalWebView}
            sx={{
              color: isDarkMode ? '#ffffff' : '#666666',
              '&:hover': {
                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
              }
            }}
          >
            <WebIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="安全设置">
          <IconButton
            size="small"
            onClick={handleSettingsClick}
            sx={{
              color: isDarkMode ? '#ffffff' : '#666666',
              '&:hover': {
                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
              }
            }}
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 安全设置菜单 */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleSettingsClose}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: isDarkMode ? '#2d2d2d' : '#ffffff',
              border: isDarkMode ? '1px solid #404040' : '1px solid #e0e0e0',
              minWidth: 280
            }
          }
        }}
      >
        <MenuItem disabled>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            iframe 安全设置
          </Typography>
        </MenuItem>
        <Divider />

        <MenuItem>
          <FormControlLabel
            control={
              <Switch
                checked={securitySettings.allowScripts}
                onChange={handleSecurityChange('allowScripts')}
                size="small"
              />
            }
            label={
              <Box>
                <Typography variant="body2">允许脚本执行</Typography>
                <Typography variant="caption" color="text.secondary">
                  启用 JavaScript 功能
                </Typography>
              </Box>
            }
          />
        </MenuItem>

        <MenuItem>
          <FormControlLabel
            control={
              <Switch
                checked={securitySettings.allowSameOrigin}
                onChange={handleSecurityChange('allowSameOrigin')}
                size="small"
                color="warning"
              />
            }
            label={
              <Box>
                <Typography variant="body2">允许同源访问 ⚠️</Typography>
                <Typography variant="caption" color="warning.main">
                  高风险：可访问父页面
                </Typography>
              </Box>
            }
          />
        </MenuItem>

        <MenuItem>
          <FormControlLabel
            control={
              <Switch
                checked={securitySettings.allowForms}
                onChange={handleSecurityChange('allowForms')}
                size="small"
              />
            }
            label={
              <Box>
                <Typography variant="body2">允许表单提交</Typography>
                <Typography variant="caption" color="text.secondary">
                  启用表单功能
                </Typography>
              </Box>
            }
          />
        </MenuItem>

        <MenuItem>
          <FormControlLabel
            control={
              <Switch
                checked={securitySettings.allowPopups}
                onChange={handleSecurityChange('allowPopups')}
                size="small"
              />
            }
            label={
              <Box>
                <Typography variant="body2">允许弹窗</Typography>
                <Typography variant="caption" color="text.secondary">
                  允许打开新窗口
                </Typography>
              </Box>
            }
          />
        </MenuItem>

        <MenuItem>
          <FormControlLabel
            control={
              <Switch
                checked={securitySettings.allowModals}
                onChange={handleSecurityChange('allowModals')}
                size="small"
              />
            }
            label={
              <Box>
                <Typography variant="body2">允许模态框</Typography>
                <Typography variant="caption" color="text.secondary">
                  允许 alert/confirm 等
                </Typography>
              </Box>
            }
          />
        </MenuItem>
      </Menu>

      {/* HTML 预览 iframe */}
      <iframe
        ref={previewRef}
        style={{
          width: '100%',
          height: '400px',
          border: 'none',
          backgroundColor: '#ffffff'
        }}
        title="HTML 预览"
        sandbox={getSandboxPermissions()}
        srcDoc={html}
      />
    </Box>
  );
};

export default HtmlPreview;
