import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'  // 使用SWC版本
import vue from '@vitejs/plugin-vue'
// import { muiIconsPlugin } from './scripts/vite-mui-icons-plugin'
import checker from 'vite-plugin-checker' // 保留检查器用于开发模式

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // MUI图标动态分析插件（暂时注释，保持SWC构建纯净）
    // muiIconsPlugin({
    //   scanDirs: ['src'],
    //   enableCache: true,
    //   verbose: true
    // }),
    react({
      // SWC 优化配置
      devTarget: 'es2022'
    }),
    vue({
      template: {
        compilerOptions: {
          // 将所有带vue-前缀的标签视为自定义元素
          isCustomElement: tag => tag.startsWith('vue-')
        }
      }
    }),
    // 超快并行类型检查 - 暂时禁用以解决缓存问题
    // process.env.NODE_ENV === 'development' && checker({
    //   typescript: {
    //     buildMode: false, // 开发时立即显示错误
    //     tsconfigPath: './tsconfig.app.json'
    //   },
    //   enableBuild: false // 生产构建时禁用，完全依赖SWC
    // })
  ],

  // 开发服务器配置
  server: {
    port: 5173,
    cors: false, // 完全禁用 CORS 检查
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': '*',
      'Access-Control-Allow-Headers': '*',
    },
    proxy: {

      // Exa API代理
      '/api/exa': {
        target: 'https://api.exa.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/exa/, ''),
        headers: {
          'Origin': 'https://api.exa.ai'
        }
      },
      // Bocha API代理
      '/api/bocha': {
        target: 'https://api.bochaai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bocha/, ''),
        headers: {
          'Origin': 'https://api.bochaai.com'
        }
      },
      // Firecrawl API代理
      '/api/firecrawl': {
        target: 'https://api.firecrawl.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/firecrawl/, ''),
        headers: {
          'Origin': 'https://api.firecrawl.dev'
        }
      },
      // 通用 fetch 代理 - 直接代理任意 URL
      '/api/fetch-proxy': {
        target: 'http://localhost:5173', // 占位符
        changeOrigin: true,
        configure: (proxy, _options) => {
          // 自定义代理逻辑
          proxy.on('proxyReq', (proxyReq, req, res) => {
            const url = new URL(req.url!, `http://${req.headers.host}`);
            const targetUrl = url.searchParams.get('url');

            if (!targetUrl) {
              res.writeHead(400, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              });
              res.end(JSON.stringify({ error: '缺少 url 参数' }));
              return;
            }

            console.log(`[Fetch Proxy] 代理请求: ${targetUrl}`);

            // 使用 Node.js 的 fetch 或 http 模块直接请求
            import('node-fetch').then(({ default: fetch }) => {
              fetch(targetUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (compatible; Cherry-Studio-Mobile/1.0)',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
                }
              })
              .then(response => response.text())
              .then(html => {
                if (!res.headersSent) {
                  res.writeHead(200, {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': '*',
                    'Access-Control-Allow-Headers': '*'
                  });
                  res.end(html);
                }
              })
              .catch(error => {
                console.error(`[Fetch Proxy] 错误:`, error);
                if (!res.headersSent) {
                  res.writeHead(500, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                  });
                  res.end(JSON.stringify({ error: error.message }));
                }
              });
            }).catch(error => {
              console.error(`[Fetch Proxy] 导入错误:`, error);
              if (!res.headersSent) {
                res.writeHead(500, {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ error: 'Failed to import fetch' }));
              }
            });

            // 阻止默认代理行为
            proxyReq.destroy();
          });
        },
      },

      // 通用 MCP 代理 - 支持所有 MCP 服务器和端点
      '/api/mcp': {
        target: 'https://mcp.api-inference.modelscope.cn',
        changeOrigin: true,
        rewrite: (path) => {
          // 简单地移除 /api/mcp 前缀
          const newPath = path.replace(/^\/api\/mcp/, '');
          console.log(`[MCP Proxy] 路径重写: ${path} -> ${newPath}`);
          return newPath;
        },
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log(`[MCP Proxy] 代理请求: ${req.method} ${req.url} -> ${proxyReq.path}`);
            // 设置必要的头部
            proxyReq.setHeader('Origin', 'https://mcp.api-inference.modelscope.cn');
            proxyReq.setHeader('Referer', 'https://mcp.api-inference.modelscope.cn');
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (compatible; MCP-Client/1.0)');
          });

          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log(`[MCP Proxy] 代理响应: ${proxyRes.statusCode} ${req.url}`);
            // 完全开放的 CORS 头部
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', '*');
            res.setHeader('Access-Control-Allow-Headers', '*');
            res.setHeader('Access-Control-Allow-Credentials', 'true');
            res.setHeader('Access-Control-Max-Age', '86400');
          });

          proxy.on('error', (err, req, res) => {
            console.error(`[MCP Proxy] 代理错误: ${req.url}`, err);
            if (!res.headersSent) {
              res.writeHead(500, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              });
              res.end(JSON.stringify({ error: 'MCP Proxy error', message: err.message }));
            }
          });
        },
      },

      // 直接代理 /messages/ 端点（MCP 协议需要）
      '/messages': {
        target: 'https://mcp.api-inference.modelscope.cn',
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log(`[MCP Messages Proxy] 代理请求: ${req.method} ${req.url} -> ${proxyReq.path}`);
            // 设置必要的头部
            proxyReq.setHeader('Origin', 'https://mcp.api-inference.modelscope.cn');
            proxyReq.setHeader('Referer', 'https://mcp.api-inference.modelscope.cn');
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (compatible; MCP-Client/1.0)');
          });

          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log(`[MCP Messages Proxy] 代理响应: ${proxyRes.statusCode} ${req.url}`);
            // 完全开放的 CORS 头部
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', '*');
            res.setHeader('Access-Control-Allow-Headers', '*');
            res.setHeader('Access-Control-Allow-Credentials', 'true');
            res.setHeader('Access-Control-Max-Age', '86400');
          });

          proxy.on('error', (err, req, res) => {
            console.error(`[MCP Messages Proxy] 代理错误: ${req.url}`, err);
            if (!res.headersSent) {
              res.writeHead(500, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              });
              res.end(JSON.stringify({ error: 'MCP Messages Proxy error', message: err.message }));
            }
          });
        },
      },



      // 通用 CORS 代理 - 处理所有外部 URL 请求，包括 SSE
      '/api/cors-proxy': {
        target: 'http://localhost:5173', // 占位符，实际会被重写
        changeOrigin: true,
        configure: (proxy, _options) => {
          // 处理 OPTIONS 请求
          proxy.on('proxyReq', (proxyReq, req, res) => {
            if (req.method === 'OPTIONS') {
              res.writeHead(200, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': '*',
                'Access-Control-Allow-Headers': '*',
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Max-Age': '86400'
              });
              res.end();
              proxyReq.destroy();
              return;
            }

            const urlParam = new URL(req.url!, `http://${req.headers.host}`).searchParams.get('url');

            if (!urlParam) {
              res.writeHead(400, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              });
              res.end(JSON.stringify({ error: '缺少 url 参数' }));
              return;
            }

            console.log(`[CORS Proxy] 代理请求: ${urlParam}`);

            // 检查是否明确指定了连接类型
            const url = new URL(req.url!, `http://${req.headers.host}`);
            const forceSSE = url.searchParams.get('force_sse') === 'true';
            const forceHTTP = url.searchParams.get('force_http') === 'true';

            // 根据明确指定的类型或请求头来决定是否使用 SSE
            const isSSE = forceSSE ||
                         (!forceHTTP && req.headers.accept?.includes('text/event-stream'));

            if (isSSE) {
              console.log(`[CORS Proxy] 检测到 SSE 请求，设置代理目标`);

              try {
                const targetUrl = new URL(urlParam);
                const targetOrigin = `${targetUrl.protocol}//${targetUrl.host}`;

                console.log(`[CORS Proxy SSE] 设置代理目标: ${targetOrigin}`);
                console.log(`[CORS Proxy SSE] 完整路径: ${targetUrl.pathname}${targetUrl.search}`);
                console.log(`[CORS Proxy SSE] 原始请求头:`, req.headers);

                // 重写请求路径
                proxyReq.path = targetUrl.pathname + targetUrl.search;

                // 设置目标主机和必要的头部
                proxyReq.setHeader('Host', targetUrl.host);
                proxyReq.setHeader('Accept', 'text/event-stream');
                proxyReq.setHeader('Cache-Control', 'no-cache');
                proxyReq.setHeader('Connection', 'keep-alive');

                // 保持原始的 User-Agent 和其他可能重要的头部
                if (req.headers['user-agent']) {
                  proxyReq.setHeader('User-Agent', req.headers['user-agent']);
                }
                if (req.headers['origin']) {
                  proxyReq.setHeader('Origin', req.headers['origin']);
                }
                if (req.headers['referer']) {
                  proxyReq.setHeader('Referer', req.headers['referer']);
                }

                console.log(`[CORS Proxy SSE] 设置的请求头:`, {
                  Host: targetUrl.host,
                  Accept: 'text/event-stream',
                  'Cache-Control': 'no-cache',
                  Connection: 'keep-alive',
                  'User-Agent': req.headers['user-agent'],
                  Origin: req.headers['origin'],
                  Referer: req.headers['referer']
                });

                // 动态设置代理目标
                (proxy as any).options.target = targetOrigin;

                return; // 让原生代理处理
              } catch (error) {
                console.error(`[CORS Proxy SSE] URL 解析失败:`, error);
                res.writeHead(400, {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ error: 'Invalid URL for SSE' }));
                proxyReq.destroy();
                return;
              }
            }

            // 非 SSE 请求使用简化的 fetch 方式
            console.log(`[CORS Proxy] 使用 HTTP 代理处理请求: ${urlParam}`);

            const targetUrl = urlParam;
            console.log(`[CORS Proxy] 准备发送 ${req.method} 请求到: ${targetUrl}`);

            // 收集请求体
            let requestBody = '';
            if (req.method !== 'GET' && req.method !== 'HEAD') {
              req.on('data', chunk => {
                requestBody += chunk.toString();
              });
            }

            req.on('end', async () => {
              try {
                const { default: fetch } = await import('node-fetch');

                const options: any = {
                  method: req.method,
                  headers: {
                    'Content-Type': req.headers['content-type'] || 'application/json',
                    'User-Agent': 'AetherLink-Proxy/1.0',
                    'Accept': req.headers.accept || 'application/json'
                  },
                  timeout: 30000 // 30秒超时
                };

                console.log(`[CORS Proxy] 发送请求到: ${targetUrl}`, { method: req.method, hasBody: !!requestBody });

                const response = await fetch(targetUrl, options);

                if (!res.headersSent) {
                  console.log(`[CORS Proxy] 请求成功: ${response.status} ${targetUrl}`);

                  // 设置响应头
                  res.writeHead(response.status, {
                    'Content-Type': response.headers.get('content-type') || 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': '*',
                    'Access-Control-Allow-Headers': '*',
                    'Access-Control-Allow-Credentials': 'true',
                    'Access-Control-Expose-Headers': '*'
                  });

                  // 转发响应体
                  if (response.body) {
                    response.body.pipe(res);
                  } else {
                    res.end();
                  }
                }
              } catch (error: any) {
                console.error(`[CORS Proxy] 请求失败:`, {
                  url: targetUrl,
                  error: error.message,
                  code: error.code
                });

                if (!res.headersSent) {
                  res.writeHead(500, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                  });
                  res.end(JSON.stringify({
                    error: 'CORS Proxy error',
                    message: error.message,
                    code: error.code,
                    targetUrl: targetUrl
                  }));
                }
              }
            });

            // 阻止默认代理行为
            proxyReq.destroy();
          });

          // 设置响应头
          proxy.on('proxyRes', (proxyRes, req, res) => {
            const urlParam = new URL(req.url!, `http://${req.headers.host}`).searchParams.get('url');
            console.log(`[CORS Proxy] 代理响应: ${proxyRes.statusCode} ${req.url}`);
            console.log(`[CORS Proxy] 目标URL: ${urlParam}`);
            console.log(`[CORS Proxy] 响应头:`, proxyRes.headers);

            // 设置 CORS 头
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', '*');
            res.setHeader('Access-Control-Allow-Headers', '*');
            res.setHeader('Access-Control-Allow-Credentials', 'true');
            res.setHeader('Access-Control-Expose-Headers', '*');
          });

          // 错误处理
          proxy.on('error', (err, req, res) => {
            console.error(`[CORS Proxy] 代理错误: ${req.url}`, err);
            if (!res.headersSent) {
              res.writeHead(500, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              });
              res.end(JSON.stringify({ error: 'CORS Proxy error', message: err.message }));
            }
          });
        },
      }
    }
  },

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
          'mui-vendor': ['@mui/material', '@mui/system', '@mui/utils'],
          // MUI图标会由muiIconsPlugin动态添加
          'mui-icons': [],
          // 将工具库拆分到单独的chunk
          'utils-vendor': ['redux', '@reduxjs/toolkit', 'lodash'],
          // Vue相关库
          'vue-vendor': ['vue'],
          // 🔥 升级：语法高亮相关 - 使用 Shiki
          'syntax-vendor': ['shiki'],
          // 日期处理相关
          'date-vendor': ['date-fns'],
          // 动画相关
          'animation-vendor': ['framer-motion']
        },
        // 限制chunk大小
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // 限制chunk大小警告阈值
    chunkSizeWarningLimit: 2000,
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      '@mui/system',
      '@mui/utils',
      '@reduxjs/toolkit',
      'vue'
      // MUI图标会由muiIconsPlugin动态添加
    ],
    // 强制预构建这些依赖，即使它们没有被直接导入
    force: true
  },
  // 启用esbuild优化
  esbuild: {
    pure: ['console.log', 'console.debug', 'console.trace'],
    legalComments: 'none',
  },

  // 缓存配置
  cacheDir: 'node_modules/.vite',

  // 定义全局常量
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __PROD__: JSON.stringify(process.env.NODE_ENV === 'production'),
  },
})
