import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { throttle } from 'lodash';

interface VirtualScrollerProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscanCount?: number;
  height?: number | string;
  width?: number | string;
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
  className?: string;
  style?: React.CSSProperties;
  itemKey?: (item: T, index: number) => string | number;
}

/**
 * 虚拟滚动组件
 * 用于高效渲染大量数据，只渲染可见区域的内容
 */
function VirtualScroller<T>({
  items,
  itemHeight,
  renderItem,
  overscanCount = 3,
  height = '100%',
  width = '100%',
  onScroll,
  className,
  style,
  itemKey = (_, index) => index,
}: VirtualScrollerProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // 计算可见区域的起始和结束索引
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscanCount);
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + overscanCount
  );

  // 计算可见项目
  const visibleItems = items.slice(startIndex, endIndex + 1);
  
  // 计算内容总高度
  const totalHeight = items.length * itemHeight;
  
  // 计算可见内容的偏移量
  const offsetY = startIndex * itemHeight;

  // 处理滚动事件
  const handleScroll = useCallback(
    throttle((e: React.UIEvent<HTMLDivElement>) => {
      const scrollTop = e.currentTarget.scrollTop;
      setScrollTop(scrollTop);
      onScroll?.(e);
    }, 16), // 约60fps
    [onScroll]
  );

  // 测量容器高度
  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === containerRef.current) {
            setContainerHeight(entry.contentRect.height);
          }
        }
      });

      resizeObserver.observe(containerRef.current);
      setContainerHeight(containerRef.current.clientHeight);

      return () => {
        if (containerRef.current) {
          resizeObserver.unobserve(containerRef.current);
        }
      };
    }
  }, []);

  return (
    <Box
      ref={containerRef}
      className={className}
      sx={{
        height,
        width,
        overflow: 'auto',
        position: 'relative',
        ...style,
      }}
      onScroll={handleScroll}
    >
      <Box sx={{ height: totalHeight, position: 'relative' }}>
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${offsetY}px)`,
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = startIndex + index;
            return (
              <Box
                key={itemKey(item, actualIndex)}
                sx={{ height: itemHeight, boxSizing: 'border-box' }}
              >
                {renderItem(item, actualIndex)}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

export default React.memo(VirtualScroller);
