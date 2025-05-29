import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Box } from '@mui/material';
import type { RootState } from '../../../shared/store';
import { messageBlocksSelectors } from '../../../shared/store/slices/messageBlocksSlice';
import type { MainTextMessageBlock, ToolMessageBlock } from '../../../shared/types/newMessage';
import { MessageBlockType } from '../../../shared/types/newMessage';
import Markdown from '../Markdown';
import ToolBlock from './ToolBlock';
import { hasToolUseTags, fixBrokenToolTags } from '../../../shared/utils/mcpToolParser';

interface Props {
  block: MainTextMessageBlock;
  role: string;
  messageId?: string;
}

const MainTextBlock: React.FC<Props> = ({ block, role, messageId }) => {
  const content = block.content || '';
  const isUserMessage = role === 'user';

  // 获取工具块
  const blockEntities = useSelector((state: RootState) => messageBlocksSelectors.selectEntities(state));

  // 获取用户输入渲染设置
  const renderUserInputAsMarkdown = useSelector((state: RootState) => state.settings.renderUserInputAsMarkdown);

  // 处理内容和工具块的原位置渲染
  const renderedContent = useMemo(() => {
    // 如果是用户消息且设置为不渲染markdown，则显示纯文本
    if (isUserMessage && !renderUserInputAsMarkdown) {
      return (
        <Box sx={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          lineHeight: 1.6,
          fontFamily: 'inherit'
        }}>
          {content}
        </Box>
      );
    }

    // 🔥 使用工具解析器的检测函数，支持自动修复被分割的标签
    const hasTools = hasToolUseTags(content);

    if (isUserMessage || !hasTools) {
      // 用户消息或没有工具标签，直接渲染
      return <Markdown content={content} allowHtml={false} />;
    }

    // 查找对应的工具块
    const toolBlocks = Object.values(blockEntities).filter(
      (block): block is ToolMessageBlock =>
        block?.type === MessageBlockType.TOOL &&
        !!messageId &&
        block.messageId === messageId
    );

    // 🔥 使用修复后的内容进行工具标签处理
    const fixedContent = fixBrokenToolTags(content);

    // 统计XML中的工具调用数量
    const toolUseMatches = fixedContent.match(/<tool_use[\s\S]*?<\/tool_use>/gi) || [];
    console.log(`[MainTextBlock] 检测到 ${toolUseMatches.length} 个工具标签，${toolBlocks.length} 个工具块`);

    if (toolBlocks.length === 0) {
      // 没有工具块，移除工具标签
      const cleanContent = fixedContent.replace(/<tool_use[\s\S]*?<\/tool_use>/gi, '');
      return <Markdown content={cleanContent} allowHtml={false} />;
    }

    // 分割内容并插入工具块
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let toolIndex = 0;

    // 使用更宽松的正则表达式匹配工具标签
    const toolUseRegex = /<tool_use[\s\S]*?<\/tool_use>/gi;
    let match;

    while ((match = toolUseRegex.exec(fixedContent)) !== null) {
      // 添加工具标签前的文本
      if (match.index > lastIndex) {
        const textBefore = fixedContent.slice(lastIndex, match.index);
        if (textBefore.trim()) {
          parts.push(
            <Markdown key={`text-${parts.length}`} content={textBefore} allowHtml={false} />
          );
        }
      }

      // 添加工具块（如果存在）
      if (toolIndex < toolBlocks.length) {
        const toolBlock = toolBlocks[toolIndex];
        console.log(`[MainTextBlock] 渲染工具块 ${toolIndex}: ${toolBlock.id}`);
        parts.push(
          <div key={`tool-${toolBlock.id}`} style={{ margin: '16px 0' }}>
            <ToolBlock block={toolBlock} />
          </div>
        );
        toolIndex++;
      } else {
        // 如果工具块不够，显示占位符
        console.warn(`[MainTextBlock] 工具块不足，跳过第 ${toolIndex} 个工具标签`);
        parts.push(
          <div key={`placeholder-${toolIndex}`} style={{ margin: '16px 0', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
            <span style={{ color: '#666' }}>工具调用处理中...</span>
          </div>
        );
        toolIndex++;
      }

      lastIndex = match.index + match[0].length;
    }

    // 添加剩余的文本
    if (lastIndex < fixedContent.length) {
      const textAfter = fixedContent.slice(lastIndex);
      if (textAfter.trim()) {
        parts.push(
          <Markdown key={`text-${parts.length}`} content={textAfter} allowHtml={false} />
        );
      }
    }

    return <>{parts}</>;
  }, [content, isUserMessage, blockEntities, messageId, renderUserInputAsMarkdown]);

  if (!content.trim()) {
    return null;
  }

  return (
    <div className="main-text-block">
      {renderedContent}
    </div>
  );
};

export default MainTextBlock;
