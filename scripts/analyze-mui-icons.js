#!/usr/bin/env node

/**
 * 分析项目中实际使用的MUI图标
 * 用于优化Vite预构建配置
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 要扫描的目录
const scanDirs = ['src'];

// 存储找到的图标
const foundIcons = new Set();

// 递归扫描文件
function scanDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // 跳过node_modules和其他不需要的目录
      if (!['node_modules', '.git', 'dist', 'build'].includes(file)) {
        scanDirectory(filePath);
      }
    } else if (file.match(/\.(ts|tsx|js|jsx)$/)) {
      // 扫描TypeScript和JavaScript文件
      scanFile(filePath);
    }
  }
}

// 扫描单个文件
function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // 匹配MUI图标导入
    const importMatches = content.match(/@mui\/icons-material\/(\w+)/g);
    if (importMatches) {
      importMatches.forEach(match => {
        const iconName = match.replace('@mui/icons-material/', '');
        foundIcons.add(iconName);
      });
    }

    // 匹配动态导入
    const dynamicMatches = content.match(/import\(['"`]@mui\/icons-material\/(\w+)['"`]\)/g);
    if (dynamicMatches) {
      dynamicMatches.forEach(match => {
        const iconName = match.match(/@mui\/icons-material\/(\w+)/)[1];
        foundIcons.add(iconName);
      });
    }

  } catch (error) {
    console.warn(`警告: 无法读取文件 ${filePath}:`, error.message);
  }
}

// 生成Vite配置
function generateViteConfig() {
  const icons = Array.from(foundIcons).sort();

  console.log('\n=== MUI图标使用分析报告 ===');
  console.log(`找到 ${icons.length} 个不同的MUI图标:`);
  console.log(icons.join(', '));

  console.log('\n=== Vite optimizeDeps.include 配置 ===');
  const includeConfig = icons.map(icon => `      '@mui/icons-material/${icon}'`).join(',\n');
  console.log(includeConfig);

  console.log('\n=== Vite manualChunks 配置 ===');
  const chunksConfig = icons.map(icon => `            '@mui/icons-material/${icon}'`).join(',\n');
  console.log(`          'mui-icons': [\n${chunksConfig}\n          ]`);

  // 保存到文件
  const configContent = {
    foundIcons: icons,
    optimizeDepsInclude: icons.map(icon => `@mui/icons-material/${icon}`),
    manualChunks: {
      'mui-icons': icons.map(icon => `@mui/icons-material/${icon}`)
    },
    generatedAt: new Date().toISOString(),
    totalIcons: icons.length
  };

  fs.writeFileSync('mui-icons-analysis.json', JSON.stringify(configContent, null, 2));
  console.log('\n配置已保存到 mui-icons-analysis.json');
}

// 主函数
function main() {
  console.log('开始分析MUI图标使用情况...');

  for (const dir of scanDirs) {
    if (fs.existsSync(dir)) {
      console.log(`扫描目录: ${dir}`);
      scanDirectory(dir);
    } else {
      console.warn(`警告: 目录不存在: ${dir}`);
    }
  }

  generateViteConfig();
}

// 运行分析
main();
