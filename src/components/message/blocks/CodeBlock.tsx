import React, { useState, useEffect } from 'react';
import { Box, IconButton, Tooltip, Snackbar, useTheme, Chip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import type { CodeMessageBlock } from '../../../shared/types/newMessage';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import CodeMirrorEditor from '../../CodeEditor/CodeMirrorEditor';

// 支持两种使用方式：消息块系统和 Markdown 渲染
interface MessageBlockProps {
  block: CodeMessageBlock;
  code?: never;
  language?: never;
}

interface MarkdownProps {
  code: string;
  language: string;
  block?: never;
}

type Props = MessageBlockProps | MarkdownProps;

/**
 * 代码块组件
 * 负责渲染代码内容，支持语法高亮、复制功能和编辑功能
 * 支持消息块系统和 Markdown 渲染两种使用方式
 */
const CodeBlock: React.FC<Props> = (props) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [codeSettings, setCodeSettings] = useState({
    showLineNumbers: false,
    wordWrap: true,
    copyEnabled: true,
    editorEnabled: false
  });
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // 获取代码内容和语言
  const originalCodeContent = 'block' in props && props.block ? props.block.content : props.code;
  const codeLanguage = 'block' in props && props.block ? (props.block.language || 'text') : props.language;

  // 添加编辑状态
  const [editedCodeContent, setEditedCodeContent] = useState(originalCodeContent);

  // 使用编辑后的内容或原始内容
  const codeContent = editedCodeContent;

  // 当原始内容变化时，更新编辑内容
  useEffect(() => {
    setEditedCodeContent(originalCodeContent);
  }, [originalCodeContent]);

  // 加载代码块设置
  useEffect(() => {
    const loadSettings = () => {
      try {
        const appSettingsJSON = localStorage.getItem('appSettings');
        if (appSettingsJSON) {
          const appSettings = JSON.parse(appSettingsJSON);
          const newSettings = {
            showLineNumbers: appSettings.codeShowLineNumbers !== undefined ? appSettings.codeShowLineNumbers : false,
            wordWrap: appSettings.codeWordWrap !== undefined ? appSettings.codeWordWrap : true,
            copyEnabled: appSettings.codeCopyEnabled !== undefined ? appSettings.codeCopyEnabled : true,
            editorEnabled: appSettings.codeEditorEnabled !== undefined ? appSettings.codeEditorEnabled : false
          };
          console.log('[CodeBlock] 加载的设置:', newSettings);
          console.log('[CodeBlock] 原始appSettings:', appSettings);
          setCodeSettings(newSettings);
        }
      } catch (error) {
        console.error('加载代码块设置失败:', error);
      }
    };

    // 初始加载
    loadSettings();

    // 监听设置变化
    const handleSettingsChange = (event: any) => {
      console.log('[CodeBlock] 收到设置变化事件:', event.detail);
      loadSettings();
    };

    console.log('[CodeBlock] 添加settingsChanged事件监听器');
    window.addEventListener('settingsChanged', handleSettingsChange);

    return () => {
      window.removeEventListener('settingsChanged', handleSettingsChange);
    };
  }, []);

  // 自定义深色主题样式
  const darkThemeStyle = {
    ...vscDarkPlus,
    'code[class*="language-"]': {
      ...vscDarkPlus['code[class*="language-"]'],
      background: 'transparent',
      color: '#e6e6e6', // 提高文字对比度
      fontSize: '14px',
      lineHeight: '1.5',
    },
    'pre[class*="language-"]': {
      ...vscDarkPlus['pre[class*="language-"]'],
      background: '#1e1e1e',
      border: '1px solid #404040',
    },
    // 优化各种语法元素的颜色
    'token.comment': {
      color: '#6a9955', // 注释颜色更清晰
      fontStyle: 'normal', // 移除斜体，避免模糊
    },
    'token.string': {
      color: '#ce9178', // 字符串颜色
    },
    'token.keyword': {
      color: '#569cd6', // 关键字颜色
    },
    'token.function': {
      color: '#dcdcaa', // 函数名颜色
    },
    'token.number': {
      color: '#b5cea8', // 数字颜色
    }
  };

  // 自定义浅色主题样式
  const lightThemeStyle = {
    ...vs,
    'code[class*="language-"]': {
      ...vs['code[class*="language-"]'],
      background: 'transparent',
      color: '#2d3748', // 提高文字对比度
      fontSize: '14px',
      lineHeight: '1.5',
    },
    'pre[class*="language-"]': {
      ...vs['pre[class*="language-"]'],
      background: '#f8f8f8',
      border: '1px solid #d0d0d0',
    },
    // 优化各种语法元素的颜色
    'token.comment': {
      color: '#008000', // 注释颜色
      fontStyle: 'normal', // 移除斜体，避免模糊
    },
    'token.string': {
      color: '#a31515', // 字符串颜色
    },
    'token.keyword': {
      color: '#0000ff', // 关键字颜色
    },
    'token.function': {
      color: '#795e26', // 函数名颜色
    },
    'token.number': {
      color: '#098658', // 数字颜色
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codeContent)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => {
        console.error('复制失败:', err);
      });
  };

  // 处理代码编辑
  const handleCodeChange = (newValue: string) => {
    console.log('代码已更新:', newValue);
    setEditedCodeContent(newValue);
  };

  // 根据设置决定使用编辑器还是预览
  const shouldUseEditor = codeSettings.editorEnabled && isEditing;

  return (
    <Box
      sx={{
        marginY: 2,
        borderRadius: 2,
        overflow: 'hidden',
        border: isDarkMode ? '1px solid #333' : '1px solid #e0e0e0',
        backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
        boxShadow: isDarkMode
          ? '0 2px 8px rgba(0, 0, 0, 0.3)'
          : '0 2px 8px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* 代码块头部 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
          borderBottom: isDarkMode ? '1px solid #333' : '1px solid #e0e0e0',
        }}
      >
        {/* 语言标签 */}
        <Chip
          label={codeLanguage.toUpperCase()}
          size="small"
          sx={{
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: isDarkMode ? '#404040' : '#e0e0e0',
            color: isDarkMode ? '#ffffff' : '#333333',
            '& .MuiChip-label': {
              px: 1,
            }
          }}
        />

        {/* 工具栏 */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {/* 编辑/预览切换按钮 */}
          {codeSettings.editorEnabled && (
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
                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
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
        {shouldUseEditor ? (
          <CodeMirrorEditor
            value={codeContent}
            onChange={handleCodeChange}
            language={codeLanguage}
            readOnly={false}
            height="auto"
            showLineNumbers={codeSettings.showLineNumbers}
            wordWrap={codeSettings.wordWrap}
            copyEnabled={false} // 头部已有复制按钮
          />
        ) : (
          <SyntaxHighlighter
            language={codeLanguage}
            style={isDarkMode ? darkThemeStyle : lightThemeStyle}
            customStyle={{
              margin: 0,
              borderRadius: 0,
              backgroundColor: 'transparent',
              border: 'none',
              padding: '20px',
            }}
            wrapLongLines={codeSettings.wordWrap}
            showLineNumbers={codeSettings.showLineNumbers}
          >
            {codeContent}
          </SyntaxHighlighter>
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

export default React.memo(CodeBlock);
