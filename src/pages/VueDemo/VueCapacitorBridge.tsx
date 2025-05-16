import React, { useEffect, useRef } from 'react';
import { createApp } from 'vue';
import type { App as VueApp } from 'vue';
// @ts-ignore - Vue文件导入
import CapacitorFeatures from '../../components/VueComponents/CapacitorFeatures.vue';

// Capacitor功能与Vue的桥接组件
const VueCapacitorBridge: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const vueAppRef = useRef<VueApp | null>(null);

  useEffect(() => {
    // 确保DOM元素已挂载
    if (!containerRef.current) return;

    // 创建Vue应用实例
    const vueApp = createApp(CapacitorFeatures, {
      title: 'Capacitor 原生功能 (Vue实现)',
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
  }, []); 

  return (
    <div 
      ref={containerRef} 
      className="vue-capacitor-container" 
      style={{ minHeight: '400px' }}
    />
  );
};

export default VueCapacitorBridge; 