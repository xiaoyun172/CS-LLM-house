// 为没有类型定义的模块添加声明
// 如果已经安装了@types包，这些声明就不需要了
declare module 'react-katex' {
  import React from 'react';
  
  export interface KatexProps {
    math: string;
    block?: boolean;
    errorColor?: string;
    renderError?: (error: Error | TypeError) => React.ReactNode;
    settings?: Record<string, any>;
    as?: string | React.ComponentType<any>;
  }
  
  export const InlineMath: React.FC<KatexProps>;
  export const BlockMath: React.FC<KatexProps>;
} 