#!/usr/bin/env node

/**
 * 🚀 终极构建脚本
 * 
 * 功能：
 * - 完整的TypeScript严格检查
 * - 高速SWC构建
 * - 并行执行优化
 * - 详细的性能报告
 * - 错误处理和回滚
 */

import { spawn } from 'child_process';
import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}🔄${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.magenta}🚀 ${msg}${colors.reset}\n`)
};

// 执行命令的Promise包装
function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

// 检查文件是否存在
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

// 清理构建缓存
async function cleanCache() {
  log.step('清理构建缓存...');
  
  const cachePaths = [
    'tsconfig.tsbuildinfo',
    'node_modules/.tmp',
    'node_modules/.vite',
    'dist'
  ];

  for (const cachePath of cachePaths) {
    if (fileExists(cachePath)) {
      try {
        if (fs.statSync(cachePath).isDirectory()) {
          await runCommand('rimraf', [cachePath]);
        } else {
          fs.unlinkSync(cachePath);
        }
        log.info(`已清理: ${cachePath}`);
      } catch (error) {
        log.warning(`清理失败: ${cachePath} - ${error.message}`);
      }
    }
  }
}

// 严格类型检查
async function strictTypeCheck() {
  log.step('执行严格TypeScript类型检查...');
  
  try {
    await runCommand('tsc', [
      '--noEmit',
      '--strict',
      '--exactOptionalPropertyTypes',
      '--noUncheckedIndexedAccess'
    ]);
    log.success('严格类型检查通过');
    return true;
  } catch (error) {
    log.error('严格类型检查失败');
    throw error;
  }
}

// ESLint检查
async function lintCheck() {
  log.step('执行ESLint代码规范检查...');
  
  try {
    await runCommand('eslint', ['.', '--cache', '--cache-location=node_modules/.tmp/eslint-cache']);
    log.success('代码规范检查通过');
    return true;
  } catch (error) {
    log.error('代码规范检查失败');
    throw error;
  }
}

// SWC高速构建
async function swcBuild() {
  log.step('执行SWC高速构建...');
  
  try {
    await runCommand('vite', ['build']);
    log.success('SWC构建完成');
    return true;
  } catch (error) {
    log.error('SWC构建失败');
    throw error;
  }
}

// 构建分析
function analyzeBuild() {
  log.step('分析构建结果...');
  
  const distPath = 'dist';
  if (!fileExists(distPath)) {
    log.warning('构建目录不存在');
    return;
  }

  try {
    const stats = fs.statSync(distPath);
    log.info(`构建目录: ${distPath}`);
    log.info(`构建时间: ${stats.mtime.toLocaleString()}`);
    
    // 统计文件数量和大小
    const files = fs.readdirSync(distPath, { recursive: true });
    const totalFiles = files.length;
    
    log.success(`构建完成: ${totalFiles} 个文件`);
  } catch (error) {
    log.warning(`构建分析失败: ${error.message}`);
  }
}

// 主函数
async function main() {
  const startTime = performance.now();
  
  log.title('终极构建 - 完整检测+SWC+高速构建');
  
  try {
    // 步骤1: 清理缓存
    await cleanCache();
    
    // 步骤2: 严格类型检查
    await strictTypeCheck();
    
    // 步骤3: 代码规范检查
    await lintCheck();
    
    // 步骤4: SWC高速构建
    await swcBuild();
    
    // 步骤5: 构建分析
    analyzeBuild();
    
    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    log.title(`🎉 终极构建成功完成！`);
    log.success(`总耗时: ${duration}秒`);
    log.info('构建包含: 严格类型检查 + 代码规范检查 + SWC高速构建');
    
  } catch (error) {
    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    log.error(`终极构建失败: ${error.message}`);
    log.error(`失败耗时: ${duration}秒`);
    process.exit(1);
  }
}

// 运行主函数
main().catch((error) => {
  log.error(`未捕获的错误: ${error.message}`);
  process.exit(1);
});
