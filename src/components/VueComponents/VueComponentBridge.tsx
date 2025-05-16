import React, { useEffect, useRef } from 'react';
import { createApp } from 'vue';
import type { App as VueApp } from 'vue';
// @ts-ignore - Vue文件导入
import VueExample from './VueExample.vue';

interface VueComponentBridgeProps {
  title?: string;
  // 其他你想传递给Vue组件的props
}

const VueComponentBridge: React.FC<VueComponentBridgeProps> = ({ title }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const vueAppRef = useRef<VueApp | null>(null);

  useEffect(() => {
    // 确保DOM元素已挂载
    if (!containerRef.current) return;

    // 创建Vue应用实例
    const vueApp = createApp(VueExample, {
      title: title || 'Vue 组件示例',
      // 其他props可以在这里传递
    });

    // 挂载到容器元素
    vueApp.mount(containerRef.current);
    vueAppRef.current = vueApp;

    // 清理函数：组件卸载时销毁Vue应用
    return () => {
      if (vueAppRef.current) {
        vueAppRef.current.unmount();
        vueAppRef.current = null;
      }
    };
  }, [title]); // 当title改变时重新渲染

  return <div ref={containerRef} className="vue-component-container" />;
};

export default VueComponentBridge; 