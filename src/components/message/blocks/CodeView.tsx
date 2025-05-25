import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Box, IconButton, Tooltip, Snackbar, useTheme, Chip, ToggleButton, ToggleButtonGroup } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WebIcon from '@mui/icons-material/Web';
import CodeIcon from '@mui/icons-material/Code';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import CodeMirrorEditor from '../../CodeEditor/CodeMirrorEditor';
import HtmlPreview from './HtmlPreview';

type ViewMode = 'source' | 'preview' | 'split';

interface Props {
  code: string;
  language: string;
  onSave?: (newContent: string) => void;
}

/**
 * CodeView 组件
 * 核心代码块渲染组件，支持多种视图模式
 * - source: 源代码视图
 * - preview: HTML 预览视图 (仅 HTML 代码)
 * - split: 分屏模式 (仅 HTML 代码)
 */
const CodeView: React.FC<Props> = ({ code, language, onSave }) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('source');
  const [editedCode, setEditedCode] = useState(code);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [codeSettings, setCodeSettings] = useState({
    showLineNumbers: true,  // 默认显示行号
    wordWrap: true,
    copyEnabled: true,
    editorEnabled: false
  });

  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // 判断是否为 HTML 代码
  const isHtmlCode = useMemo(() => language.toLowerCase() === 'html', [language]);

  // 当原始代码变化时，更新编辑内容
  useEffect(() => {
    setEditedCode(code);
  }, [code]);

  // 加载代码块设置
  useEffect(() => {
    const loadSettings = () => {
      try {
        const appSettingsJSON = localStorage.getItem('appSettings');
        if (appSettingsJSON) {
          const appSettings = JSON.parse(appSettingsJSON);
          const newSettings = {
            showLineNumbers: appSettings.codeShowLineNumbers ?? true,  // 默认显示行号
            wordWrap: appSettings.codeWordWrap ?? true,
            copyEnabled: appSettings.codeCopyEnabled ?? true,
            editorEnabled: appSettings.codeEditorEnabled ?? false
          };
          setCodeSettings(newSettings);
        }
      } catch (error) {
        console.error('加载代码块设置失败:', error);
      }
    };

    loadSettings();
  }, []);

  // 复制代码
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(editedCode)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => {
        console.error('复制失败:', err);
      });
  }, [editedCode]);

  // 处理代码编辑
  const handleCodeChange = useCallback((newValue: string) => {
    setEditedCode(newValue);
    onSave?.(newValue);
  }, [onSave]);

  // 切换折叠状态
  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  // 自定义深色主题样式
  const darkThemeStyle = useMemo(() => ({
    ...vscDarkPlus,
    'code[class*="language-"]': {
      ...vscDarkPlus['code[class*="language-"]'],
      background: 'transparent',
      color: '#e6e6e6',
      fontSize: '14px',
      lineHeight: '1.5',
    },
    'pre[class*="language-"]': {
      ...vscDarkPlus['pre[class*="language-"]'],
      background: '#1e1e1e',
      border: '1px solid #404040',
    },
  }), []);

  // 自定义浅色主题样式
  const lightThemeStyle = useMemo(() => ({
    ...vs,
    'code[class*="language-"]': {
      ...vs['code[class*="language-"]'],
      background: 'transparent',
      color: '#2d3748',
      fontSize: '14px',
      lineHeight: '1.5',
    },
    'pre[class*="language-"]': {
      ...vs['pre[class*="language-"]'],
      background: '#f8f8f8',
      border: '1px solid #d0d0d0',
    },
  }), []);

  // 根据设置决定使用编辑器还是预览
  const shouldUseEditor = codeSettings.editorEnabled && isEditing;

  return (
    <Box
      sx={{
        marginY: 2,
        borderRadius: 2,
        border: isDarkMode ? '1px solid #404040' : '1px solid #d0d0d0',
        backgroundColor: isDarkMode ? '#1e1e1e' : '#f8f8f8',
        overflow: 'hidden'
      }}
    >
      {/* 代码块头部 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          backgroundColor: isDarkMode ? '#2d2d2d' : '#e8e8e8',
          borderBottom: isDarkMode ? '1px solid #404040' : '1px solid #d0d0d0'
        }}
      >
        {/* 语言标签 */}
        <Chip
          label={language.toUpperCase()}
          size="small"
          sx={{
            backgroundColor: isDarkMode ? '#404040' : '#ffffff',
            color: isDarkMode ? '#ffffff' : '#333333',
            fontWeight: 'bold',
            fontSize: '12px'
          }}
        />

        {/* 工具栏 */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {/* 折叠/展开按钮 */}
          <Tooltip title={isCollapsed ? "展开代码块" : "折叠代码块"}>
            <IconButton
              size="small"
              onClick={toggleCollapse}
              sx={{
                color: isDarkMode ? '#ffffff' : '#666666',
                '&:hover': {
                  backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'
                }
              }}
            >
              {isCollapsed ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          {/* HTML 预览切换按钮 */}
          {isHtmlCode && (
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, newMode) => newMode && setViewMode(newMode)}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  color: isDarkMode ? '#ffffff' : '#666666',
                  border: isDarkMode ? '1px solid #555' : '1px solid #ccc',
                  '&.Mui-selected': {
                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                    color: isDarkMode ? '#ffffff' : '#333333',
                  },
                  '&:hover': {
                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
                  }
                }
              }}
            >
              <ToggleButton value="source" aria-label="源代码视图">
                <Tooltip title="源代码视图">
                  <CodeIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="preview" aria-label="HTML预览视图">
                <Tooltip title="HTML 预览">
                  <WebIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
          )}

          {/* HTML 编辑按钮 */}
          {isHtmlCode && codeSettings.editorEnabled && (
            <Tooltip title={isEditing ? "切换到预览模式" : "切换到编辑模式"}>
              <IconButton
                size="small"
                onClick={() => setIsEditing(!isEditing)}
                sx={{
                  color: isDarkMode ? '#ffffff' : '#666666',
                  backgroundColor: isEditing ? (isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)') : 'transparent',
                  '&:hover': {
                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'
                  }
                }}
              >
                {isEditing ? <VisibilityIcon fontSize="small" /> : <EditIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          )}

          {/* 编辑/预览切换按钮 */}
          {codeSettings.editorEnabled && !isHtmlCode && (
            <Tooltip title={isEditing ? "切换到预览模式" : "切换到编辑模式"}>
              <IconButton
                size="small"
                onClick={() => setIsEditing(!isEditing)}
                sx={{
                  color: isDarkMode ? '#ffffff' : '#666666',
                  backgroundColor: isEditing ? (isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)') : 'transparent',
                  '&:hover': {
                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'
                  }
                }}
              >
                {isEditing ? <VisibilityIcon fontSize="small" /> : <EditIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          )}

          {/* 复制按钮 */}
          {codeSettings.copyEnabled && (
            <Tooltip title="复制代码">
              <IconButton
                size="small"
                onClick={handleCopy}
                sx={{
                  color: isDarkMode ? '#ffffff' : '#666666',
                  '&:hover': {
                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'
                  }
                }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* 代码内容区域 */}
      <Box sx={{ position: 'relative' }}>
        {isCollapsed ? (
          // 折叠状态：显示简化信息
          <Box
            sx={{
              padding: '16px',
              backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5',
              border: isDarkMode ? '1px solid #333' : '1px solid #e0e0e0',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
            onClick={toggleCollapse}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CodeIcon fontSize="small" sx={{ color: isDarkMode ? '#888' : '#666' }} />
              <span style={{
                color: isDarkMode ? '#ccc' : '#666',
                fontSize: '14px'
              }}>
                {language.toUpperCase()} 代码 ({editedCode.split('\n').length} 行)
              </span>
            </Box>
            <ExpandMoreIcon fontSize="small" sx={{ color: isDarkMode ? '#888' : '#666' }} />
          </Box>
        ) : (
          // 展开状态：显示完整代码
          <>
        {isHtmlCode && viewMode === 'preview' && !isEditing ? (
          // HTML 预览模式
          <HtmlPreview html={editedCode} />
        ) : shouldUseEditor || (isHtmlCode && isEditing) ? (
          // 编辑模式
          <CodeMirrorEditor
            value={editedCode}
            onChange={handleCodeChange}
            language={language}
            readOnly={false}
            height="auto"
            showLineNumbers={codeSettings.showLineNumbers}
            wordWrap={codeSettings.wordWrap}
            copyEnabled={false}
          />
        ) : (
          // 源代码预览模式
          <SyntaxHighlighter
            language={language}
            style={isDarkMode ? darkThemeStyle : lightThemeStyle}
            customStyle={{
              margin: 0,
              borderRadius: 0,
              backgroundColor: 'transparent',
              border: 'none',
              padding: '20px',
              lineHeight: '1.5',
              maxHeight: '400px',
              overflow: 'auto',
            }}
            wrapLongLines={codeSettings.wordWrap}
            showLineNumbers={true}
            startingLineNumber={1}
            lineNumberStyle={{
              minWidth: '3em',
              paddingRight: '1em',
              textAlign: 'right',
              userSelect: 'none',
              color: isDarkMode ? '#858585' : '#999999'
            }}
          >
            {editedCode}
          </SyntaxHighlighter>
        )}
          </>
        )}
      </Box>

      <Snackbar
        open={copySuccess}
        autoHideDuration={2000}
        message="代码已复制到剪贴板"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default memo(CodeView);
