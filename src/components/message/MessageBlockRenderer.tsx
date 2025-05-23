import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Box } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
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
import FileBlock from './blocks/FileBlock';
import ToolBlock from './blocks/ToolBlock';
import PlaceholderBlock from './blocks/PlaceholderBlock';

// 定义动画变体
const blockWrapperVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  static: { opacity: 1, y: 0 }
};

// 动画块包装器组件
interface AnimatedBlockWrapperProps {
  children: React.ReactNode;
  enableAnimation: boolean;
}

const AnimatedBlockWrapper: React.FC<AnimatedBlockWrapperProps> = ({ children, enableAnimation }) => {
  return (
    <motion.div
      variants={blockWrapperVariants}
      initial={enableAnimation ? 'hidden' : 'static'}
      animate={enableAnimation ? 'visible' : 'static'}>
      {children}
    </motion.div>
  );
};

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
  // const theme = useTheme(); // 暂时不需要
  // 从Redux状态中获取块实体
  const blockEntities = useSelector((state: RootState) => messageBlocksSelectors.selectEntities(state));

  // 简化版本，不依赖事件监听，直接从Redux状态读取

  // 获取所有有效的块并进行排序
  const renderedBlocks = useMemo(() => {
    // 只渲染存在于Redux状态中的块
    const validBlocks = blocks
      .map((blockId) => blockEntities[blockId])
      .filter(Boolean) as MessageBlock[];

    // 对块进行排序：思考块在前，其他块在后
    const sortedBlocks = [...validBlocks].sort((a, b) => {
      // 思考块的优先级最高
      if (a.type === MessageBlockType.THINKING && b.type !== MessageBlockType.THINKING) {
        return -1;
      }
      if (b.type === MessageBlockType.THINKING && a.type !== MessageBlockType.THINKING) {
        return 1;
      }

      // 其他块按创建时间排序
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeA - timeB;
    });

    return sortedBlocks;
  }, [blocks, blockEntities]);

  // 渲染占位符块
  const renderPlaceholder = () => {
    // 检查是否有任何块正在流式输出
    const hasStreamingBlock = renderedBlocks.some(block => block.status === MessageBlockStatus.STREAMING);

    // 如果有流式输出的块，不显示占位符
    if (hasStreamingBlock) {
      return null;
    }

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

  // 渲染空内容提示 - 更友好的提示，不再显示为错误
  const renderEmptyContentMessage = () => {
    return (
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 1,
        color: 'text.secondary', // 使用次要文本颜色而不是错误颜色
        fontStyle: 'italic'
      }}>
        正在加载内容...
      </Box>
    );
  };

  // 检查是否有空内容的成功状态块
  const hasEmptySuccessBlock = useMemo(() => {
    if (renderedBlocks.length === 0) return false;

    // 如果消息状态是 streaming、processing 或 success，不显示错误
    if (message.status === 'streaming' || message.status === 'processing' || message.status === 'success') {
      return false;
    }

    // 如果消息有版本历史，不显示错误
    if (message.versions && message.versions.length > 0) {
      return false;
    }

    return renderedBlocks.some(block =>
      block.type === MessageBlockType.MAIN_TEXT &&
      block.status === MessageBlockStatus.SUCCESS &&
      (!('content' in block) || !(block as any).content || (block as any).content.trim() === '')
    );
  }, [renderedBlocks, message.status, message.versions]);

  // 是否启用动画
  const enableAnimation = message.status.includes('ing');

  return (
    <Box sx={{ width: '100%' }}>
      {/* 只有在没有渲染块且消息状态为streaming时才显示占位符 */}
      {renderedBlocks.length === 0 && message.status === 'streaming' ? (
        renderPlaceholder()
      ) : hasEmptySuccessBlock ? (
        renderEmptyContentMessage()
      ) : (
        <AnimatePresence mode="sync">
          {/* 添加key属性，确保在内容变化时重新渲染 */}
          {renderedBlocks.map((block) => {
            let blockComponent: React.ReactNode = null;

            // 处理空内容的成功状态块
            if (block.type === MessageBlockType.MAIN_TEXT &&
                block.status === MessageBlockStatus.SUCCESS &&
                (!('content' in block) || !(block as any).content || (block as any).content.trim() === '') &&
                message.status !== 'streaming' &&
                message.status !== 'processing' &&
                message.status !== 'success' &&
                (!message.versions || message.versions.length === 0)) {
              return renderEmptyContentMessage();
            }

            switch (block.type) {
              case MessageBlockType.UNKNOWN:
                // 参考电脑版逻辑：PROCESSING状态下渲染占位符块，SUCCESS状态下当作主文本块处理
                if (block.status === MessageBlockStatus.PROCESSING) {
                  blockComponent = <PlaceholderBlock key={block.id} block={block} />;
                } else if (block.status === MessageBlockStatus.SUCCESS) {
                  // 兼容性处理：将 UNKNOWN 类型的成功状态块当作主文本块处理
                  blockComponent = <MainTextBlock key={block.id} block={block as any} role={message.role} />;
                }
                break;
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
              case MessageBlockType.FILE:
                blockComponent = <FileBlock key={block.id} block={block} />;
                break;
              case MessageBlockType.TOOL:
                blockComponent = <ToolBlock key={block.id} block={block} />;
                break;
              default:
                console.warn('不支持的块类型:', (block as any).type, block);
                break;
            }

            // 如果没有组件，跳过渲染
            if (!blockComponent) return null;

            return (
              <AnimatedBlockWrapper
                key={block.id}
                enableAnimation={enableAnimation}>
                <Box
                  sx={{
                    mb: 1,
                    // 添加额外的 padding
                    pl: extraPaddingLeft,
                    pr: extraPaddingRight
                  }}
                >
                  {blockComponent}
                </Box>
              </AnimatedBlockWrapper>
            );
          })}
        </AnimatePresence>
      )}
    </Box>
  );
};

export default React.memo(MessageBlockRenderer);
