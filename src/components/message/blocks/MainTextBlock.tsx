import React, { useState, useEffect, useMemo } from 'react';
import type { MainTextMessageBlock } from '../../../shared/types/newMessage';
import { MessageBlockStatus } from '../../../shared/types/newMessage';
import Markdown from '../Markdown';
import { shouldUseHighPerformanceMode } from '../../../shared/utils/performanceSettings';
import HighPerformanceStreamingContainer from './HighPerformanceStreamingContainer';

interface Props {
  block: MainTextMessageBlock;
  role: string;
}

/**
 * 智能流式文本容器
 * 根据性能设置选择最佳渲染策略
 */
const StreamingTextContainer: React.FC<{ content: string; isStreaming: boolean; onComplete?: () => void }> = ({ content, isStreaming, onComplete }) => {
  // 检查是否启用高性能模式
  const useHighPerformanceMode = shouldUseHighPerformanceMode(isStreaming);

  console.log(`[StreamingTextContainer] isStreaming: ${isStreaming}, useHighPerformanceMode: ${useHighPerformanceMode}`);

  // 如果启用高性能模式且正在流式输出，使用超高性能容器
  if (useHighPerformanceMode && isStreaming) {
    console.log(`[StreamingTextContainer] 使用高性能容器`);
    return (
      <HighPerformanceStreamingContainer
        content={content}
        isStreaming={isStreaming}
        onComplete={onComplete}
      />
    );
  }

  // 否则始终使用标准 Markdown 渲染（无论是否流式）
  console.log(`[StreamingTextContainer] 使用 Markdown 渲染`);
  return <Markdown content={content} allowHtml={false} />;
};

/**
 * 主文本块组件 - 高性能版本
 * 流式输出时使用轻量级渲染，完成后自动切换到完整渲染
 */
const MainTextBlock: React.FC<Props> = ({ block, role }) => {
  const isUserMessage = role === 'user';
  const content = block.content || '';

  // 判断是否正在流式输出
  const isStreaming = block.status === MessageBlockStatus.STREAMING;

  // 状态切换优化：使用延迟切换避免闪烁
  const [renderMode, setRenderMode] = useState<'streaming' | 'complete'>(() =>
    isStreaming ? 'streaming' : 'complete'
  );

  // 监听状态变化，延迟切换渲染模式
  useEffect(() => {
    console.log(`[MainTextBlock] isStreaming 变化: ${isStreaming}, 当前 renderMode: ${renderMode}`);

    if (isStreaming) {
      // 立即切换到流式模式
      console.log(`[MainTextBlock] 切换到流式模式`);
      setRenderMode('streaming');
    } else {
      // 延迟切换到完整模式，避免闪烁
      console.log(`[MainTextBlock] 准备切换到完整模式，延迟100ms`);
      const timer = setTimeout(() => {
        console.log(`[MainTextBlock] 切换到完整模式`);
        setRenderMode('complete');
      }, 100); // 100ms 延迟，给用户一个平滑的过渡

      return () => {
        clearTimeout(timer);
      };
    }
  }, [isStreaming]);

  // 如果内容为空，不显示任何内容
  if (!content || content.trim() === '') {
    return null;
  }

  // 容器样式优化
  const containerStyle = useMemo(() => ({
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    boxSizing: 'border-box' as const
  }), []);

  return (
    <div style={containerStyle}>
      {isUserMessage ? (
        // 用户消息始终使用纯文本
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {content}
        </div>
      ) : (
        // AI消息使用智能渲染模式
        <StreamingTextContainer
          content={content}
          isStreaming={renderMode === 'streaming'}
          onComplete={() => {
            // 高性能容器完成后，强制切换到完整模式
            setRenderMode('complete');
          }}
        />
      )}
    </div>
  );
};

export default React.memo(MainTextBlock);
