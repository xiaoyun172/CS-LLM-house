import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    vue({
      template: {
        compilerOptions: {
          // 将所有带vue-前缀的标签视为自定义元素
          isCustomElement: tag => tag.startsWith('vue-')
        }
      }
    })
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
      // Tavily API代理
      '/api/tavily': {
        target: 'https://api.tavily.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tavily/, ''),
        headers: {
          'Origin': 'https://api.tavily.com'
        }
      },
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
              console.log(`[CORS Proxy] 检测到 SSE 请求，使用 fetch 代理`);

              try {
                const targetUrl = urlParam;

                // 使用 fetch 创建 SSE 连接
                import('node-fetch').then(({ default: fetch }) => {
                  console.log(`[CORS Proxy SSE] 连接到: ${targetUrl}`);

                  fetch(targetUrl, {
                    method: 'GET',
                    headers: {
                      'Accept': 'text/event-stream',
                      'Cache-Control': 'no-cache',
                      'Connection': 'keep-alive',
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                      'Accept-Encoding': 'gzip, deflate, br',
                      'Pragma': 'no-cache',
                      'Sec-Fetch-Dest': 'empty',
                      'Sec-Fetch-Mode': 'cors',
                      'Sec-Fetch-Site': 'cross-site',
                      'Origin': 'http://localhost:5173',
                      'Referer': 'http://localhost:5173/'
                    },
                    signal: AbortSignal.timeout(60000) // SSE 连接需要更长的超时时间
                  })
                  .then(response => {
                    console.log(`[CORS Proxy SSE] 响应状态: ${response.status}`);

                    if (!response.ok) {
                      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    // 只有在响应头未发送时才设置
                    if (!res.headersSent) {
                      // 设置 SSE 响应头
                      res.writeHead(200, {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': '*',
                        'Access-Control-Allow-Headers': '*',
                        'Access-Control-Allow-Credentials': 'true',
                        'Access-Control-Expose-Headers': '*'
                      });

                      // 转发 SSE 流
                      if (response.body) {
                        console.log(`[CORS Proxy SSE] 开始转发 SSE 流`);

                        // 处理流错误
                        response.body.on('error', (error) => {
                          console.error(`[CORS Proxy SSE] 流错误:`, error);
                          if (!res.destroyed) {
                            res.destroy();
                          }
                        });

                        // 处理流结束
                        response.body.on('end', () => {
                          console.log(`[CORS Proxy SSE] 流结束`);
                          if (!res.destroyed) {
                            res.end();
                          }
                        });

                        // 处理客户端断开连接
                        res.on('close', () => {
                          console.log(`[CORS Proxy SSE] 客户端断开连接`);
                          // ReadableStream 没有 destroy 方法，我们只需要记录
                        });

                        // 开始管道传输
                        response.body.pipe(res);
                      } else {
                        console.log(`[CORS Proxy SSE] 没有响应体`);
                        res.end();
                      }
                    }
                  })
                  .catch(error => {
                    console.error(`[CORS Proxy SSE] 连接失败:`, error);
                    console.error(`[CORS Proxy SSE] 错误详情:`, {
                      code: error.code,
                      message: error.message,
                      stack: error.stack
                    });
                    if (!res.headersSent) {
                      res.writeHead(500, {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                      });
                      res.end(JSON.stringify({
                        error: 'SSE connection failed',
                        message: error.message,
                        code: error.code,
                        targetUrl: targetUrl
                      }));
                    }
                  });
                }).catch(error => {
                  console.error(`[CORS Proxy SSE] 导入错误:`, error);
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
                return;
              } catch (error) {
                console.error('[CORS Proxy SSE] URL 解析失败:', error);
                res.writeHead(500, {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ error: 'Invalid URL' }));
                proxyReq.destroy();
                return;
              }
            }

            // 非 SSE 请求使用原有的 fetch 方式
            console.log(`[CORS Proxy] 使用 HTTP 代理处理请求: ${urlParam}`);
            import('node-fetch').then(({ default: fetch }) => {
              const targetUrl = urlParam;
              console.log(`[CORS Proxy] 准备发送 ${req.method} 请求到: ${targetUrl}`);
              const options: any = {
                method: req.method,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept': req.headers.accept || '*/*',
                  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                  'Accept-Encoding': 'gzip, deflate, br',
                  'Connection': 'keep-alive',
                  'Cache-Control': 'no-cache',
                  'Pragma': 'no-cache',
                  'Sec-Fetch-Dest': 'empty',
                  'Sec-Fetch-Mode': 'cors',
                  'Sec-Fetch-Site': 'cross-site'
                },
                signal: AbortSignal.timeout(30000) // 30秒超时
              };

              // 如果是 POST/PUT 等请求，需要转发请求体
              if (req.method !== 'GET' && req.method !== 'HEAD') {
                let body = '';
                req.on('data', chunk => {
                  body += chunk.toString();
                });
                req.on('end', () => {
                  options.body = body;
                  if (req.headers['content-type']) {
                    options.headers['Content-Type'] = req.headers['content-type'];
                  }
                  makeRequest();
                });
              } else {
                makeRequest();
              }

              function makeRequest(retryCount = 0) {
                const maxRetries = 2;

                fetch(targetUrl, options)
                  .then(response => {
                    if (!res.headersSent) {
                      console.log(`[CORS Proxy] 请求成功: ${response.status} ${targetUrl}`);

                      // 设置响应头
                      res.writeHead(response.status, {
                        'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': '*',
                        'Access-Control-Allow-Headers': '*',
                        'Access-Control-Allow-Credentials': 'true',
                        'Access-Control-Expose-Headers': '*'
                      });

                      // 转发响应体
                      response.body?.pipe(res);
                    }
                  })
                  .catch(error => {
                    console.error(`[CORS Proxy] 请求失败 (尝试 ${retryCount + 1}/${maxRetries + 1}):`, {
                      url: targetUrl,
                      error: error.message,
                      code: error.code,
                      type: error.type
                    });

                    // 如果是网络错误且还有重试次数，则重试
                    if (retryCount < maxRetries &&
                        (error.code === 'ECONNRESET' ||
                         error.code === 'ENOTFOUND' ||
                         error.code === 'ETIMEDOUT' ||
                         error.message.includes('socket hang up'))) {
                      console.log(`[CORS Proxy] 将在 ${(retryCount + 1) * 1000}ms 后重试...`);
                      setTimeout(() => {
                        makeRequest(retryCount + 1);
                      }, (retryCount + 1) * 1000);
                      return;
                    }

                    if (!res.headersSent) {
                      res.writeHead(500, {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                      });
                      res.end(JSON.stringify({
                        error: 'CORS Proxy error',
                        message: error.message,
                        code: error.code,
                        retries: retryCount
                      }));
                    }
                  });
              }
            }).catch(error => {
              console.error(`[CORS Proxy] 导入错误:`, error);
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

          // 设置响应头
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log(`[CORS Proxy] 代理响应: ${proxyRes.statusCode} ${req.url}`);
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
          // 将UI库拆分到单独的chunk（移除icons-material以启用tree-shaking）
          'mui-vendor': ['@mui/material'],
          // 将工具库拆分到单独的chunk
          'utils-vendor': ['redux', '@reduxjs/toolkit'],
          // Vue相关库
          'vue-vendor': ['vue']
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
    include: ['react', 'react-dom', 'react-router-dom', '@mui/material', '@reduxjs/toolkit', 'vue'],
  },
  // 启用esbuild优化
  esbuild: {
    pure: ['console.log', 'console.debug', 'console.trace'],
    legalComments: 'none',
  },
})
