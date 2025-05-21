import React, { useState } from 'react';
import { Box, IconButton, Tooltip, Snackbar, useTheme } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import type { CodeMessageBlock } from '../../../shared/types/newMessage';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Props {
  block: CodeMessageBlock;
}

/**
 * 代码块组件
 * 负责渲染代码内容，支持语法高亮和复制功能
 */
const CodeBlock: React.FC<Props> = ({ block }) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // 自定义深色主题样式
  const darkThemeStyle = {
    ...vscDarkPlus,
    'code[class*="language-"]': {
      ...vscDarkPlus['code[class*="language-"]'],
      background: 'transparent',
    },
    'pre[class*="language-"]': {
      ...vscDarkPlus['pre[class*="language-"]'],
      background: '#1e1e1e',
    }
  };

  // 自定义浅色主题样式
  const lightThemeStyle = {
    ...vs,
    'code[class*="language-"]': {
      ...vs['code[class*="language-"]'],
      background: 'transparent',
    },
    'pre[class*="language-"]': {
      ...vs['pre[class*="language-"]'],
      background: '#f5f5f5',
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(block.content)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => {
        console.error('复制失败:', err);
      });
  };

  return (
    <Box sx={{ position: 'relative', marginY: 2 }}>
      <Box sx={{ position: 'absolute', top: 5, right: 5, zIndex: 1 }}>
        <Tooltip title="复制代码">
          <IconButton
            size="small"
            onClick={handleCopy}
            sx={{
              color: 'white',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.5)'
              }
            }}
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <SyntaxHighlighter
        language={block.language || 'text'}
        style={isDarkMode ? darkThemeStyle : lightThemeStyle}
        customStyle={{
          margin: 0,
          borderRadius: '8px',
          fontSize: '0.9rem',
          backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5',
          border: isDarkMode ? '1px solid #333' : '1px solid #e0e0e0',
        }}
        codeTagProps={{
          style: {
            color: isDarkMode ? '#d4d4d4' : '#333333',
            fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
            background: 'transparent' // 确保代码文本背景为透明
          }
        }}
        wrapLongLines={true} // 允许长行换行
      >
        {block.content}
      </SyntaxHighlighter>

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
