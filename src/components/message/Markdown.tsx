import React, { useMemo, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkCjkFriendly from 'remark-cjk-friendly';
import remarkMath from 'remark-math';
import { Box, Link, useTheme } from '@mui/material';
import CodeBlock from './blocks/CodeBlock';
import 'katex/dist/katex.min.css';

// 🔥 参考最佳实例：工具函数
const ALLOWED_ELEMENTS = /<(style|p|div|span|b|i|strong|em|ul|ol|li|table|tr|td|th|thead|tbody|h[1-6]|blockquote|pre|code|br|hr|svg|path|circle|rect|line|polyline|polygon|text|g|defs|title|desc|tspan|sub|sup)/i;
const DISALLOWED_ELEMENTS = ['iframe'];

/**
 * 转义括号 - 参考最佳实例实现
 */
function escapeBrackets(text: string): string {
  const pattern = /(```[\s\S]*?```|`.*?`)|\\\[([\s\S]*?[^\\])\\]|\\\((.*?)\\\)/g;
  return text.replace(pattern, (match, codeBlock, squareBracket, roundBracket) => {
    if (codeBlock) {
      return codeBlock;
    } else if (squareBracket) {
      return `\n$$\n${squareBracket}\n$$\n`;
    } else if (roundBracket) {
      return `$${roundBracket}$`;
    }
    return match;
  });
}

/**
 * 移除SVG空行 - 参考最佳实例实现
 */
function removeSvgEmptyLines(text: string): string {
  const svgPattern = /(<svg[\s\S]*?<\/svg>)/g;
  return text.replace(svgPattern, (svgMatch) => {
    return svgMatch
      .split('\n')
      .filter((line) => line.trim() !== '')
      .join('\n');
  });
}

interface MarkdownProps {
  content: string;
  allowHtml?: boolean;
  mathEngine?: 'KaTeX' | 'none'; // 添加数学引擎支持
}

const Markdown: React.FC<MarkdownProps> = ({ content, allowHtml = false, mathEngine = 'KaTeX' }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // 🔥 参考最佳实例：remark 插件配置
  const remarkPlugins = useMemo(() => {
    const plugins = [remarkGfm, remarkCjkFriendly];
    if (mathEngine !== 'none') {
      plugins.push(remarkMath);
    }
    return plugins;
  }, [mathEngine]);

  // 🔥 参考最佳实例：内容预处理 + 强化换行处理
  const messageContent = useMemo(() => {
    if (!content) return '';

    let processedContent = removeSvgEmptyLines(escapeBrackets(content));

    // 🔥 强化换行处理：确保单个换行符被保持
    // 将单个换行符转换为双换行符，这样 Markdown 会正确识别为段落分隔
    processedContent = processedContent.replace(/([^\n])\n([^\n])/g, '$1\n\n$2');

    return processedContent;
  }, [content]);

  // 🔥 参考最佳实例：rehype 插件配置
  const rehypePlugins = useMemo(() => {
    const plugins: any[] = [];
    if (allowHtml && ALLOWED_ELEMENTS.test(messageContent)) {
      plugins.push(rehypeRaw);
    }
    if (mathEngine === 'KaTeX') {
      plugins.push(rehypeKatex as any);
    }
    return plugins;
  }, [mathEngine, messageContent, allowHtml]);

  return (
    <Box sx={{
      // 基础样式
      color: 'text.primary',
      lineHeight: 1.6,
      userSelect: 'text',
      wordBreak: 'break-word',

      // 图片样式
      '& img': { maxWidth: '100%', height: 'auto' },

      // 链接样式
      '& a': {
        color: 'primary.main',
        textDecoration: 'none',
        '&:hover': { textDecoration: 'underline' }
      },

      // 标题样式
      '& h1, & h2, & h3, & h4, & h5, & h6': {
        mt: 2,
        mb: 1,
        fontWeight: 'bold',
        '&:first-of-type': { mt: 0 }
      },
      '& h1': {
        fontSize: '2em',
        borderBottom: 1,
        borderColor: 'divider',
        pb: 0.3
      },
      '& h2': {
        fontSize: '1.5em',
        borderBottom: 1,
        borderColor: 'divider',
        pb: 0.3
      },
      '& h3': { fontSize: '1.2em' },
      '& h4': { fontSize: '1em' },
      '& h5': { fontSize: '0.9em' },
      '& h6': { fontSize: '0.8em' },

      // 段落样式 - 关键的 white-space: pre-wrap
      '& p': {
        my: 1,
        whiteSpace: 'pre-wrap',
        '&:last-child': { mb: 0.5 },
        '&:first-of-type': { mt: 0 }
      },

      // 列表样式
      '& ul, & ol': {
        pl: 3,
        my: 1
      },
      '& li': {
        mb: 0.5,
        '& > ul, & > ol': { my: 0.5 }
      },
      '& ul': { listStyle: 'initial' },

      // 引用样式
      '& blockquote': {
        borderLeft: 4,
        borderColor: 'grey.300',
        pl: 2,
        ml: 0,
        my: 2,
        color: 'text.secondary'
      },

      // 分隔线样式
      '& hr': {
        border: 'none',
        borderTop: 1,
        borderColor: 'divider',
        my: 2.5
      },

      // 行内代码样式
      '& code': {
        fontFamily: 'monospace',
        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        px: 0.5,
        py: 0.25,
        borderRadius: 0.5,
        color: isDarkMode ? '#e3e3e3' : 'inherit',
        wordBreak: 'keep-all',
        whiteSpace: 'pre'
      },

      // 代码块容器样式
      '& pre': {
        m: 0,
        p: 0,
        backgroundColor: 'transparent',
      },

      // span 元素保持预格式化
      '& span': {
        whiteSpace: 'pre'
      },

      // 表格样式
      '& table': {
        borderCollapse: 'collapse',
        my: 1,
        width: '100%'
      },
      '& th, & td': {
        border: 1,
        borderColor: 'divider',
        p: 0.5
      },
      '& th': {
        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
        fontWeight: 'bold'
      }
    }}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        disallowedElements={DISALLOWED_ELEMENTS}
        remarkRehypeOptions={{
          // 🔥 参考最佳实例配置 + 强化换行处理
          footnoteLabel: '脚注',
          footnoteLabelTagName: 'h4',
          footnoteBackContent: ' ',
          // 强制保持换行符
          allowDangerousHtml: false,
          // 确保换行符被正确处理
          handlers: {}
        }}
        components={{
          a: ({ ...props }) => (
            <Link
              {...props}
              target="_blank"
              rel="noopener noreferrer"
            />
          ),
          img: ({ src, alt, ...props }: any) => {
            // 处理图片显示，支持 base64 和普通 URL
            if (!src) {
              return null;
            }

            return (
              <img
                src={src}
                alt={alt || 'Generated Image'}
                {...props}
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: '8px',
                  margin: '8px 0',
                  display: 'block',
                  ...props.style
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            );
          },
          code: ({ className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';

            // 使用与最佳实例相同的判定逻辑：有 language- 类名或者包含换行符
            const isCodeBlock = match || (typeof children === 'string' && children.includes('\n'));

            return props.inline || !isCodeBlock ? (
              <code className={className} {...props}>
                {children}
              </code>
            ) : (
              <CodeBlock
                code={String(children).replace(/\n$/, '')}
                language={language || 'text'}
              />
            );
          },
          // 自定义段落渲染，避免嵌套问题
          p: ({ children, ...props }: any) => {
            // 递归检查子元素中是否包含块级元素
            const hasBlockElement = (elements: any): boolean => {
              return React.Children.toArray(elements).some((child: any) => {
                // 检查是否是代码块
                if (child?.props?.className?.includes('language-') ||
                    (typeof child === 'object' && child?.type?.name === 'SyntaxHighlighter')) {
                  return true;
                }

                // 检查是否是 Box 组件（我们的代码块容器）
                if (typeof child === 'object' && child?.type?.name === 'Box') {
                  return true;
                }

                // 检查是否是其他块级元素
                if (typeof child === 'object' && child?.type) {
                  const tagName = child.type?.name || child.type;
                  if (['div', 'pre', 'blockquote', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
                    return true;
                  }
                }

                // 递归检查子元素
                if (child?.props?.children) {
                  return hasBlockElement(child.props.children);
                }

                return false;
              });
            };

            if (hasBlockElement(children)) {
              // 如果包含块级元素，使用div而不是p
              return (
                <Box
                  component="div"
                  sx={{
                    mb: 2,
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap', // 保持换行符和空格
                    wordBreak: 'break-word' // 长单词换行
                  }}
                  {...props}
                >
                  {children}
                </Box>
              );
            }

            // 🔥 修复换行问题：普通段落，保持换行符
            return (
              <Box
                component="p"
                sx={{
                  mb: 2,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap', // 保持换行符和空格
                  wordBreak: 'break-word' // 长单词换行
                }}
                {...props}
              >
                {children}
              </Box>
            );
          },
        }}
      >
        {messageContent}
      </ReactMarkdown>
    </Box>
  );
};

export default memo(Markdown);