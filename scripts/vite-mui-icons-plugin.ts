/**
 * Vite插件：动态分析和预构建MUI图标
 * 在构建开始时自动扫描项目中使用的MUI图标，并动态更新预构建配置
 */

import fs from 'fs';
import path from 'path';
import type { Plugin } from 'vite';

export interface MuiIconsPluginOptions {
  /**
   * 要扫描的目录列表
   * @default ['src']
   */
  scanDirs?: string[];

  /**
   * 是否启用缓存
   * @default true
   */
  enableCache?: boolean;

  /**
   * 是否显示详细日志
   * @default false
   */
  verbose?: boolean;
}

// 缓存文件路径
const CACHE_FILE = 'node_modules/.vite/mui-icons-cache.json';

// 分析MUI图标使用情况
function analyzeMuiIcons(scanDirs: string[] = ['src']): string[] {
  const foundIcons = new Set<string>();

  function scanDirectory(dir: string): void {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // 跳过不需要的目录
        if (!['node_modules', '.git', 'dist', 'build', '.vite'].includes(file)) {
          scanDirectory(filePath);
        }
      } else if (file.match(/\.(ts|tsx|js|jsx)$/)) {
        scanFile(filePath);
      }
    }
  }

  function scanFile(filePath: string): void {
    try {
      const content = fs.readFileSync(filePath, 'utf8');

      // 匹配MUI图标导入
      const patterns = [
        /@mui\/icons-material\/(\w+)/g,
        /import\(['"`]@mui\/icons-material\/(\w+)['"`]\)/g,
        /from\s+['"`]@mui\/icons-material\/(\w+)['"`]/g
      ];

      patterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const iconMatch = match.match(/@mui\/icons-material\/(\w+)/);
            if (iconMatch) {
              foundIcons.add(iconMatch[1]);
            }
          });
        }
      });

    } catch (error) {
      // 静默忽略读取错误
    }
  }

  // 扫描所有目录
  scanDirs.forEach(dir => scanDirectory(dir));

  return Array.from(foundIcons).sort();
}

// 检查缓存是否有效
function isCacheValid(cacheFile: string, scanDirs: string[]): boolean {
  if (!fs.existsSync(cacheFile)) return false;

  try {
    const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    const cacheTime = new Date(cache.timestamp).getTime();
    const now = Date.now();

    // 缓存超过1小时失效
    if (now - cacheTime > 60 * 60 * 1000) return false;

    // 检查源文件是否有更新
    for (const dir of scanDirs) {
      if (fs.existsSync(dir)) {
        const dirStat = fs.statSync(dir);
        if (dirStat.mtime.getTime() > cacheTime) return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

// 保存缓存
function saveCache(icons: string[], cacheFile: string): void {
  const cacheDir = path.dirname(cacheFile);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  const cache = {
    icons,
    timestamp: new Date().toISOString(),
    count: icons.length
  };

  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
}

// 读取缓存
function readCache(cacheFile: string): string[] {
  try {
    const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    return cache.icons || [];
  } catch {
    return [];
  }
}

// 创建Vite插件
export function muiIconsPlugin(options: MuiIconsPluginOptions = {}): Plugin {
  const {
    scanDirs = ['src'],
    enableCache = true,
    verbose = false
  } = options;

  let icons: string[] = [];

  return {
    name: 'mui-icons-dynamic',

    // 在配置解析前运行
    configResolved(config) {
      const startTime = Date.now();

      if (verbose) {
        console.log('\n🔍 [MUI Icons Plugin] 开始分析MUI图标使用情况...');
      }

      // 检查缓存
      if (enableCache && isCacheValid(CACHE_FILE, scanDirs)) {
        icons = readCache(CACHE_FILE);
        if (verbose) {
          console.log(`📦 [MUI Icons Plugin] 从缓存加载 ${icons.length} 个图标`);
        }
      } else {
        // 重新分析
        icons = analyzeMuiIcons(scanDirs);

        if (enableCache) {
          saveCache(icons, CACHE_FILE);
        }

        if (verbose) {
          console.log(`🔍 [MUI Icons Plugin] 分析完成，找到 ${icons.length} 个图标`);
          console.log(`⏱️ [MUI Icons Plugin] 分析耗时: ${Date.now() - startTime}ms`);
        }
      }

      // 动态更新optimizeDeps配置
      if (config.optimizeDeps) {
        const muiIconImports = icons.map(icon => `@mui/icons-material/${icon}`);

        if (!config.optimizeDeps.include) {
          config.optimizeDeps.include = [];
        }

        // 添加MUI图标到预构建列表
        config.optimizeDeps.include.push(...muiIconImports);

        if (verbose) {
          console.log(`⚡ [MUI Icons Plugin] 已添加 ${icons.length} 个图标到预构建列表`);
        }
      }

      // 动态更新manualChunks配置
      const output = config.build?.rollupOptions?.output;
      if (output && !Array.isArray(output) && output.manualChunks) {
        const manualChunks = output.manualChunks;

        if (typeof manualChunks === 'object') {
          // 更新mui-icons chunk
          manualChunks['mui-icons'] = icons.map(icon => `@mui/icons-material/${icon}`);

          if (verbose) {
            console.log(`📦 [MUI Icons Plugin] 已更新 mui-icons chunk，包含 ${icons.length} 个图标`);
          }
        }
      }
    },

    // 在构建开始时显示信息
    buildStart() {
      if (verbose && icons.length > 0) {
        console.log(`\n🎨 [MUI Icons Plugin] 预构建的MUI图标:`);
        console.log(`   ${icons.slice(0, 10).join(', ')}${icons.length > 10 ? ` ... 等${icons.length}个` : ''}`);
      }
    },

    // 提供API给其他插件使用
    configureServer(server) {
      // 添加中间件来处理图标信息查询
      server.middlewares.use('/api/mui-icons', (req, res, next) => {
        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            icons,
            count: icons.length,
            timestamp: new Date().toISOString()
          }));
        } else {
          next();
        }
      });
    }
  };
}

export default muiIconsPlugin;
