import React, { useRef, useEffect, useState } from 'react';
import { Box, IconButton, Tooltip, useTheme } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { EditorView, lineNumbers } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  placeholder?: string;
  height?: string | number;
  // 可选的设置覆盖
  codeStyle?: string;
  showLineNumbers?: boolean;
  wordWrap?: boolean;
  copyEnabled?: boolean;
}

/**
 * CodeMirror 6 代码编辑器
 * 🔥 升级：显示模式使用简单预览，编辑模式使用 CodeMirror 6
 */
const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  value,
  onChange,
  language = 'javascript',
  readOnly = false,
  placeholder = '// 点击编辑代码...',
  height = '300px',
  codeStyle,
  showLineNumbers,
  wordWrap,
  copyEnabled
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState({
    codeStyle: 'vscDarkPlus',
    editorEnabled: false,
    showLineNumbers: false,
    wordWrap: true,
    copyEnabled: true
  });
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // 加载设置
  useEffect(() => {
    const loadSettings = () => {
      try {
        const appSettingsJSON = localStorage.getItem('appSettings');
        if (appSettingsJSON) {
          const appSettings = JSON.parse(appSettingsJSON);
          setSettings({
            codeStyle: appSettings.codeStyle || 'vscDarkPlus',
            editorEnabled: appSettings.codeEditorEnabled !== undefined ? appSettings.codeEditorEnabled : false,
            showLineNumbers: appSettings.codeShowLineNumbers !== undefined ? appSettings.codeShowLineNumbers : false,
            wordWrap: appSettings.codeWordWrap !== undefined ? appSettings.codeWordWrap : true,
            copyEnabled: appSettings.codeCopyEnabled !== undefined ? appSettings.codeCopyEnabled : true
          });
        }
      } catch (error) {
        console.error('加载代码编辑器设置失败:', error);
      }
    };

    // 初始加载
    loadSettings();

    // 监听设置变化
    const handleSettingsChange = (event: any) => {
      console.log('[CodeMirrorEditor] 收到设置变化事件:', event.detail);
      loadSettings();
    };

    window.addEventListener('settingsChanged', handleSettingsChange);

    return () => {
      window.removeEventListener('settingsChanged', handleSettingsChange);
    };
  }, []);

  // 获取最终设置值（props 优先级高于 localStorage）
  const finalSettings = {
    codeStyle: codeStyle || settings.codeStyle,
    showLineNumbers: showLineNumbers !== undefined ? showLineNumbers : settings.showLineNumbers,
    wordWrap: wordWrap !== undefined ? wordWrap : settings.wordWrap,
    copyEnabled: copyEnabled !== undefined ? copyEnabled : settings.copyEnabled,
    editorEnabled: settings.editorEnabled
  };

  // 获取语言扩展
  const getLanguageExtension = (lang: string) => {
    switch (lang.toLowerCase()) {
      case 'javascript':
      case 'js':
      case 'jsx':
      case 'typescript':
      case 'ts':
      case 'tsx':
        return javascript();
      case 'python':
      case 'py':
        return python();
      default:
        return [];
    }
  };

  // 初始化 CodeMirror
  useEffect(() => {
    if (isEditing && editorRef.current && !viewRef.current) {
      const extensions: Extension[] = [
        // 语言支持
        getLanguageExtension(language),

        // 主题
        EditorView.theme({
          '&': {
            fontSize: '14px',
            fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", "Source Code Pro", Consolas, "Liberation Mono", Menlo, Courier, monospace',
          },
          '.cm-content': {
            padding: '16px',
            minHeight: '120px',
          },
          '.cm-focused': {
            outline: 'none',
          },
          '.cm-editor': {
            borderRadius: '8px',
          },
          '.cm-scroller': {
            lineHeight: '1.5',
          }
        }),

        // 更新监听器
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        }),
      ];

      // 行号
      if (finalSettings.showLineNumbers) {
        extensions.push(lineNumbers());
      }

      // 自动换行
      if (finalSettings.wordWrap) {
        extensions.push(EditorView.lineWrapping);
      }

      // 深色主题
      if (isDarkMode) {
        extensions.push(oneDark);
      }

      const state = EditorState.create({
        doc: value,
        extensions,
      });

      viewRef.current = new EditorView({
        state,
        parent: editorRef.current,
      });
    }

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [isEditing, finalSettings.showLineNumbers, finalSettings.wordWrap, isDarkMode, language]);

  // 进入编辑模式
  const startEditing = () => {
    if (readOnly || !finalSettings.editorEnabled) return;
    setIsEditing(true);
  };

  // 保存编辑
  const saveEdit = () => {
    if (viewRef.current) {
      const newValue = viewRef.current.state.doc.toString();
      onChange(newValue);
    }
    setIsEditing(false);
  };

  // 取消编辑
  const cancelEdit = () => {
    setIsEditing(false);
  };

  // 复制代码
  const handleCopy = async () => {
    if (!finalSettings.copyEnabled) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const containerHeight = height === 'auto' ? 'auto' : height;
  const minHeight = height === 'auto' ? '150px' : height;

  return (
    <Box sx={{ position: 'relative', height: containerHeight, minHeight }}>
      {/* 工具栏 */}
      <Box
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 10,
          display: 'flex',
          gap: 0.5,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: 1,
          padding: 0.5,
        }}
      >
        {isEditing ? (
          <>
            <Tooltip title="保存 (Ctrl+S)">
              <IconButton size="small" onClick={saveEdit} sx={{ color: 'white' }}>
                <SaveIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="取消 (Esc)">
              <IconButton size="small" onClick={cancelEdit} sx={{ color: 'white' }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <>
            {!readOnly && finalSettings.editorEnabled && (
              <Tooltip title="编辑代码">
                <IconButton size="small" onClick={startEditing} sx={{ color: 'white' }}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {finalSettings.copyEnabled && (
              <Tooltip title={copied ? "已复制" : "复制代码"}>
                <IconButton size="small" onClick={handleCopy} sx={{ color: 'white' }}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </>
        )}
      </Box>

      {/* 编辑器内容 */}
      {isEditing ? (
        <Box
          ref={editorRef}
          sx={{
            height: height === 'auto' ? 'auto' : '100%',
            minHeight: height === 'auto' ? '120px' : undefined,
            border: `2px solid ${isDarkMode ? '#404040' : '#d0d0d0'}`,
            borderRadius: '8px',
            backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
            overflow: 'hidden',
            '& .cm-editor': {
              height: '100%',
            },
            '& .cm-scroller': {
              height: '100%',
            }
          }}
        />
      ) : (
        // 🔥 升级：预览模式使用简单文本显示
        <Box
          onClick={startEditing}
          sx={{
            height: height === 'auto' ? 'auto' : '100%',
            minHeight: height === 'auto' ? '100px' : undefined,
            cursor: readOnly ? 'default' : 'text',
            borderRadius: '8px',
            border: isDarkMode ? '1px solid #404040' : '1px solid #d0d0d0',
            backgroundColor: isDarkMode ? '#1e1e1e' : '#f8f8f8',
            overflow: 'auto',
            padding: '16px',
            fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", "Source Code Pro", Consolas, "Liberation Mono", Menlo, Courier, monospace',
            fontSize: '14px',
            lineHeight: '1.5',
            color: isDarkMode ? '#e6e6e6' : '#2d3748',
            whiteSpace: 'pre-wrap',
            '&:hover': readOnly ? {} : {
              borderColor: isDarkMode ? '#606060' : '#b0b0b0',
            },
          }}
        >
          {value || placeholder}
        </Box>
      )}
    </Box>
  );
};

export default CodeMirrorEditor;
