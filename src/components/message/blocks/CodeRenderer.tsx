import React, { memo, useCallback } from 'react';
import type { CodeMessageBlock } from '../../../shared/types/newMessage';
import ShikiCodeRenderer from './ShikiCodeRenderer';

// 支持两种使用方式：消息块系统和 Markdown 渲染
interface MessageBlockProps {
  block: CodeMessageBlock;
  code?: never;
  language?: never;
  codeBlockId?: never;
  onUpdate?: never;
}

interface MarkdownProps {
  code: string;
  language: string;
  block?: never;
  codeBlockId?: string | null;
  onUpdate?: (id: string, newContent: string) => void;
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

  // 获取代码块ID
  const codeBlockId = 'block' in props && props.block ? props.block.id : props.codeBlockId || null;

  // 保存代码的回调函数
  const handleSave = useCallback((newContent: string) => {
    // 如果是Markdown渲染且提供了onUpdate回调和codeBlockId
    if (!('block' in props) && props.onUpdate && props.codeBlockId) {
      props.onUpdate(props.codeBlockId, newContent);
    }
    // 如果是消息块系统，可以在这里添加更新逻辑
    else if ('block' in props) {
      // 这里可以添加消息块更新逻辑
      console.log('保存代码:', newContent);
    }
  }, [props]);

  return (
    <ShikiCodeRenderer
      code={codeContent}
      language={language}
      onSave={handleSave}
      codeBlockId={codeBlockId}
    />
  );
};

export default memo(CodeRenderer);
