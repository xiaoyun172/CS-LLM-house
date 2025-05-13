import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { splitVendorChunkPlugin } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), splitVendorChunkPlugin()],

  // 优化构建配置
  build: {
    sourcemap: false, // 生产环境不生成sourcemap
    minify: 'terser', // 使用terser进行更强的压缩
    terserOptions: {
      compress: {
        drop_console: false, // 保留console以便调试
        drop_debugger: true, // 移除debugger语句
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // 将React相关库拆分到单独的chunk
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // 将UI库拆分到单独的chunk
          'mui-vendor': ['@mui/material', '@mui/icons-material'],
          // 将工具库拆分到单独的chunk
          'utils-vendor': ['redux', '@reduxjs/toolkit']
        },
        // 限制chunk大小
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // 限制chunk大小警告阈值
    chunkSizeWarningLimit: 800,
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@mui/material', '@reduxjs/toolkit'],
  },
  // 启用esbuild优化
  esbuild: {
    pure: ['console.log', 'console.debug', 'console.trace'],
    legalComments: 'none',
  },
})
