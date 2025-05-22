import React, { useState, useEffect, useReducer, useRef } from 'react';
import { Box } from '@mui/material';
import type { MainTextMessageBlock } from '../../../shared/types/newMessage';
import { MessageBlockStatus } from '../../../shared/types/newMessage';
import Markdown from '../Markdown';
import { EventEmitter, EVENT_NAMES } from '../../../shared/services/EventEmitter';

interface Props {
  block: MainTextMessageBlock;
  role: string;
}

/**
 * 主文本块组件
 * 完全重写，与电脑版保持一致
 * 负责渲染消息的主要文本内容
 */
const MainTextBlock: React.FC<Props> = ({ block, role }) => {
  // 用户消息可以选择是否使用Markdown渲染
  const isUserMessage = role === 'user';

  // 添加强制更新机制
  const [updateCounter, forceUpdate] = useReducer(state => state + 1, 0);

  // 使用ref跟踪当前内容，避免闭包问题
  const contentRef = useRef<string>(block.content || '');

  // 使用state管理显示内容
  const [content, setContent] = useState(block.content || '');

  // 跟踪是否已经替换了占位符
  const hasReplacedPlaceholder = useRef<boolean>(false);

  // 跟踪最后一次更新时间
  const lastUpdateTime = useRef<number>(Date.now());

  // 只在非流式输出状态下更新内容
  useEffect(() => {
    if (block.status !== MessageBlockStatus.STREAMING) {
      contentRef.current = block.content || '';
      setContent(block.content || '');
    }
  }, [block.content, block.status]);

  // 添加流式输出事件监听
  useEffect(() => {
    // 只在流式输出状态下添加事件监听
    if (block.status !== MessageBlockStatus.STREAMING) {
      return;
    }

    // 用于跟踪DeepSeek模型的累积内容
    const deepSeekAccumulatedContent = useRef<string>('');

    // 处理文本增量事件
    const handleTextDelta = (data: any) => {
      // 更新最后一次更新时间
      lastUpdateTime.current = Date.now();

      // 如果没有文本，忽略
      if (!data.text) {
        return;
      }

      // 检查是否是DeepSeek模型
      const isDeepSeekModel = data.isDeepSeekModel === true ||
                             data.modelProvider === 'deepseek' ||
                             (data.modelId && data.modelId.includes('deepseek'));

      // 记录日志，便于调试
      console.log(`[MainTextBlock] 收到文本增量: 长度=${data.text.length}, 首块=${data.isFirstChunk}, 完整响应=${data.isCompleteResponse || false}, DeepSeek=${isDeepSeekModel}, 内容=${data.text.substring(0, 30)}${data.text.length > 30 ? '...' : ''}`);

      // 如果是标记为完整响应，直接替换内容
      if (data.isCompleteResponse === true) {
        console.log('[MainTextBlock] 处理完整响应，直接替换内容');
        contentRef.current = data.text;
        setContent(data.text);
        hasReplacedPlaceholder.current = true;
        forceUpdate();
        return;
      }

      // 如果是第一个文本块，直接替换内容
      if (data.isFirstChunk === true) {
        console.log('[MainTextBlock] 处理首个文本块，直接替换内容');
        contentRef.current = data.text;
        setContent(data.text);
        hasReplacedPlaceholder.current = true;

        // 如果是DeepSeek模型，重置累积内容
        if (isDeepSeekModel) {
          deepSeekAccumulatedContent.current = data.text;
        }

        forceUpdate();
        return;
      }

      // 如果当前内容是占位符，但收到了实际内容，替换占位符
      if (contentRef.current === '正在生成回复...' && !hasReplacedPlaceholder.current) {
        console.log('[MainTextBlock] 当前内容是占位符，替换为实际内容');
        contentRef.current = data.text;
        setContent(data.text);
        hasReplacedPlaceholder.current = true;

        // 如果是DeepSeek模型，重置累积内容
        if (isDeepSeekModel) {
          deepSeekAccumulatedContent.current = data.text;
        }

        forceUpdate();
        return;
      }

      // DeepSeek模型特殊处理
      if (isDeepSeekModel) {
        // 累积DeepSeek的内容
        deepSeekAccumulatedContent.current += data.text;

        // 使用累积的内容替换当前内容
        contentRef.current = deepSeekAccumulatedContent.current;
        setContent(deepSeekAccumulatedContent.current);

        console.log(`[MainTextBlock] DeepSeek累积内容: 长度=${deepSeekAccumulatedContent.current.length}`);

        forceUpdate();
        return;
      }

      // 正常情况：累加文本内容
      contentRef.current += data.text;
      setContent(prev => prev + data.text);

      // 强制重新渲染
      forceUpdate();

      // 触发滚动到底部事件
      EventEmitter.emit(EVENT_NAMES.UI_SCROLL_TO_BOTTOM, {
        timestamp: Date.now()
      });
    };

    // 处理首个文本块事件
    const handleFirstChunk = (data: any) => {
      // 如果没有文本，忽略
      if (!data.text) {
        return;
      }

      // 检查是否是DeepSeek模型
      const isDeepSeekModel = data.isDeepSeekModel === true ||
                             data.modelProvider === 'deepseek' ||
                             (data.modelId && data.modelId.includes('deepseek'));

      console.log(`[MainTextBlock] 处理首个文本块事件: 长度=${data.text.length}, DeepSeek=${isDeepSeekModel}, 完整响应=${data.isCompleteResponse || false}`);

      // 直接替换内容
      contentRef.current = data.text;
      setContent(data.text);
      hasReplacedPlaceholder.current = true;

      // 如果是DeepSeek模型，重置累积内容
      if (isDeepSeekModel && deepSeekAccumulatedContent) {
        deepSeekAccumulatedContent.current = data.text;
      }

      forceUpdate();
    };

    // 处理文本完成事件
    const handleTextComplete = (data: any) => {
      // 如果有完整文本，使用完整文本
      if (data.text) {
        // 检查是否是DeepSeek模型
        const isDeepSeekModel = data.isDeepSeekModel === true ||
                               data.modelProvider === 'deepseek' ||
                               (data.modelId && data.modelId.includes('deepseek'));

        console.log(`[MainTextBlock] 处理文本完成事件: 长度=${data.text.length}, DeepSeek=${isDeepSeekModel}`);

        // 如果是DeepSeek模型，使用累积的内容
        if (isDeepSeekModel && deepSeekAccumulatedContent && deepSeekAccumulatedContent.current) {
          console.log(`[MainTextBlock] 使用DeepSeek累积内容: 长度=${deepSeekAccumulatedContent.current.length}`);
          contentRef.current = deepSeekAccumulatedContent.current;
          setContent(deepSeekAccumulatedContent.current);
        } else {
          // 其他模型，使用完整文本
          contentRef.current = data.text;
          setContent(data.text);
        }

        forceUpdate();
      }
    };

    // 订阅事件
    const unsubscribeTextDelta = EventEmitter.on(EVENT_NAMES.STREAM_TEXT_DELTA, handleTextDelta);
    const unsubscribeFirstChunk = EventEmitter.on(EVENT_NAMES.STREAM_TEXT_FIRST_CHUNK, handleFirstChunk);
    const unsubscribeTextComplete = EventEmitter.on(EVENT_NAMES.STREAM_TEXT_COMPLETE, handleTextComplete);

    // 定期检查内容是否需要更新
    const updateInterval = setInterval(() => {
      // 如果块内容不是占位符，但当前内容是占位符，替换占位符
      if (block.content !== '正在生成回复...' && contentRef.current === '正在生成回复...' && !hasReplacedPlaceholder.current) {
        contentRef.current = block.content || '';
        setContent(block.content || '');
        hasReplacedPlaceholder.current = true;
        forceUpdate();
      }
    }, 50);

    // 清理函数
    return () => {
      unsubscribeTextDelta();
      unsubscribeFirstChunk();
      unsubscribeTextComplete();
      clearInterval(updateInterval);
    };
  }, [block.status]);

  // 如果内容为空，不显示任何内容
  if (!content || content.trim() === '') {
    return null;
  }

  // 如果内容是占位符，且块内容也是占位符，不显示任何内容
  if (content === '正在生成回复...' && block.content === '正在生成回复...') {
    console.log('[MainTextBlock] 内容和块内容都是占位符，跳过渲染');
    return null;
  }

  // 添加key属性，强制在内容变化时重新渲染
  return (
    <Box sx={{ width: '100%' }} key={`${content.length}-${updateCounter}`}>
      {isUserMessage ? (
        <Box sx={{ whiteSpace: 'pre-wrap' }}>
          {content}
        </Box>
      ) : (
        <Markdown content={content} allowHtml={false} />
      )}
    </Box>
  );
};

export default React.memo(MainTextBlock);
