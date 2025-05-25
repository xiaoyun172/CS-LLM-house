import React, { memo, useCallback } from 'react';
import type { CodeMessageBlock } from '../../../shared/types/newMessage';
import CodeView from './CodeView';

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
 * CodeRenderer 组件 (原 CodeBlock)
 * 作为中间层，负责判断代码类型并委托给 CodeView 组件
 * 支持消息块系统和 Markdown 渲染两种使用方式
 */
const CodeRenderer: React.FC<Props> = (props) => {
  // 获取代码内容和语言
  const codeContent = 'block' in props && props.block ? props.block.content : props.code || '';
  const language = 'block' in props && props.block ? (props.block.language || 'text') : props.language || 'text';

  // 保存代码的回调函数
  const handleSave = useCallback((newContent: string) => {
    // 这里可以添加保存逻辑，比如更新消息块内容
    console.log('保存代码:', newContent);
  }, []);

  return (
    <CodeView 
      code={codeContent}
      language={language}
      onSave={handleSave}
    />
  );
};

export default memo(CodeRenderer);
