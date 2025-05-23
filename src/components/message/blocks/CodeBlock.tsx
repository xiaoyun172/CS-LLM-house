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
      fontStyle: 'italic',
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
      fontStyle: 'italic',
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
          fontSize: '14px', // 增大字体大小，提高可读性
          lineHeight: '1.5', // 增加行高，提高可读性
          backgroundColor: isDarkMode ? '#1e1e1e' : '#f8f8f8',
          border: isDarkMode ? '1px solid #404040' : '1px solid #d0d0d0',
          padding: '16px', // 增加内边距
        }}
        codeTagProps={{
          style: {
            color: isDarkMode ? '#e6e6e6' : '#2d3748', // 提高对比度
            fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, "Liberation Mono", Menlo, Courier, monospace',
            background: 'transparent',
            fontSize: '14px',
            fontWeight: '400', // 设置字体粗细
            letterSpacing: '0.025em', // 增加字符间距，提高可读性
          }
        }}
        wrapLongLines={true}
        showLineNumbers={false} // 可以根据需要开启行号
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
