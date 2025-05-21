import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Box } from '@mui/material';
import type { RootState } from '../../shared/store';
import { messageBlocksSelectors } from '../../shared/store/slices/messageBlocksSlice';
import type { MessageBlock, Message } from '../../shared/types/newMessage';
import { MessageBlockType, MessageBlockStatus } from '../../shared/types/newMessage';

// 直接导入块组件，与电脑版保持一致
import MainTextBlock from './blocks/MainTextBlock';
import ThinkingBlock from './blocks/ThinkingBlock';
import ImageBlock from './blocks/ImageBlock';
import CodeBlock from './blocks/CodeBlock';
import CitationBlock from './blocks/CitationBlock';
import ErrorBlock from './blocks/ErrorBlock';
import TranslationBlock from './blocks/TranslationBlock';
import TableBlock from './blocks/TableBlock';
import MathBlock from './blocks/MathBlock';
import MultiModelBlock from './blocks/MultiModelBlock';
import ChartBlock from './blocks/ChartBlock';

interface Props {
  blocks: string[];
  message: Message;
  // 添加额外的 padding 属性
  extraPaddingLeft?: number;
  extraPaddingRight?: number;
}

/**
 * 消息块渲染器组件
 * 负责根据块类型渲染不同的块组件
 */
const MessageBlockRenderer: React.FC<Props> = ({
  blocks,
  message,
  extraPaddingLeft = 0,
  extraPaddingRight = 0
}) => {
  // 从Redux状态中获取块实体
  const blockEntities = useSelector((state: RootState) => messageBlocksSelectors.selectEntities(state));

  // 获取所有有效的块
  const renderedBlocks = useMemo(() => {
    return blocks
      .map((blockId) => blockEntities[blockId])
      .filter(Boolean) as MessageBlock[];
  }, [blocks, blockEntities]);

  // 渲染占位符块
  const renderPlaceholder = () => {
    return (
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 1,
        color: 'text.secondary'
      }}>
        正在生成回复...
      </Box>
    );
  };

  // 渲染空内容错误提示
  const renderEmptyContentError = () => {
    return (
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 1,
        color: 'error.main'
      }}>
        生成回复失败，请重试
      </Box>
    );
  };

  // 检查是否有空内容的成功状态块
  const hasEmptySuccessBlock = useMemo(() => {
    if (renderedBlocks.length === 0) return false;

    // 如果消息状态是 streaming 或 processing，不显示错误
    if (message.status === 'streaming' || message.status === 'processing') {
      return false;
    }

    return renderedBlocks.some(block =>
      block.type === MessageBlockType.MAIN_TEXT &&
      block.status === MessageBlockStatus.SUCCESS &&
      (!('content' in block) || !(block as any).content || (block as any).content.trim() === '')
    );
  }, [renderedBlocks, message.status]);

  return (
    <Box sx={{ width: '100%' }}>
      {renderedBlocks.length === 0 && message.status === 'streaming' ? (
        renderPlaceholder()
      ) : hasEmptySuccessBlock ? (
        renderEmptyContentError()
      ) : (
        renderedBlocks.map((block) => {
          let blockComponent: React.ReactNode = null;

          // 处理空内容的成功状态块
          if (block.type === MessageBlockType.MAIN_TEXT &&
              block.status === MessageBlockStatus.SUCCESS &&
              (!('content' in block) || !(block as any).content || (block as any).content.trim() === '') &&
              message.status !== 'streaming' && message.status !== 'processing') {
            return renderEmptyContentError();
          }

          switch (block.type) {
            case MessageBlockType.MAIN_TEXT:
              blockComponent = <MainTextBlock key={block.id} block={block} role={message.role} />;
              break;
            case MessageBlockType.THINKING:
              blockComponent = <ThinkingBlock key={block.id} block={block} />;
              break;
            case MessageBlockType.IMAGE:
              blockComponent = <ImageBlock key={block.id} block={block} />;
              break;
            case MessageBlockType.CODE:
              blockComponent = <CodeBlock key={block.id} block={block} />;
              break;
            case MessageBlockType.CITATION:
              blockComponent = <CitationBlock key={block.id} block={block} />;
              break;
            case MessageBlockType.ERROR:
              blockComponent = <ErrorBlock key={block.id} block={block} />;
              break;
            case MessageBlockType.TRANSLATION:
              blockComponent = <TranslationBlock key={block.id} block={block} />;
              break;
            case MessageBlockType.TABLE:
              blockComponent = <TableBlock key={block.id} block={block} />;
              break;
            case MessageBlockType.MATH:
              blockComponent = <MathBlock key={block.id} block={block} />;
              break;
            case MessageBlockType.MULTI_MODEL:
              blockComponent = <MultiModelBlock key={block.id} block={block} />;
              break;
            case MessageBlockType.CHART:
              blockComponent = <ChartBlock key={block.id} block={block} />;
              break;
            default:
              console.warn('不支持的块类型:', block.type, block);
              break;
          }

          // 如果没有组件，跳过渲染
          if (!blockComponent) return null;

          return (
            <Box
              key={block.id}
              sx={{
                mb: 1,
                animation: block.status === MessageBlockStatus.STREAMING ? 'fadeIn 0.3s ease-in-out' : 'none',
                // 添加额外的 padding
                pl: extraPaddingLeft,
                pr: extraPaddingRight
              }}
            >
              {blockComponent}
            </Box>
          );
        })
      )}
    </Box>
  );
};

export default React.memo(MessageBlockRenderer);
