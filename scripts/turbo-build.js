#!/usr/bin/env node

/**
 * 🚀 超快构建脚本
 * SWC + 高速类型检查 = 极速构建
 */

import { spawn } from 'child_process';
import { performance } from 'perf_hooks';
import { platform } from 'os';

const startTime = performance.now();

console.log('🚀 启动超快构建 (SWC + 高速检测)...');

// 根据平台确定可执行文件名
const isWindows = platform() === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

// 并行运行快速类型检查和SWC构建
const typeCheckProcess = spawn(npmCmd, [
  'run', 'type-check:fast'
], { stdio: 'pipe', shell: true });

const buildProcess = spawn(npmCmd, [
  'run', 'build:fast'
], { stdio: 'pipe', shell: true });

let typeCheckDone = false;
let buildDone = false;
let hasErrors = false;

// 处理类型检查输出
typeCheckProcess.stdout.on('data', (data) => {
  process.stdout.write(`[类型检查] ${data}`);
});

typeCheckProcess.stderr.on('data', (data) => {
  process.stderr.write(`[类型检查] ${data}`);
});

// 处理构建输出
buildProcess.stdout.on('data', (data) => {
  process.stdout.write(`[SWC构建] ${data}`);
});

buildProcess.stderr.on('data', (data) => {
  process.stderr.write(`[SWC构建] ${data}`);
});

typeCheckProcess.on('close', (code) => {
  typeCheckDone = true;
  if (code !== 0) {
    hasErrors = true;
    console.error('❌ 快速类型检查失败');
  } else {
    console.log('✅ 快速类型检查通过');
  }
  checkComplete();
});

buildProcess.on('close', (code) => {
  buildDone = true;
  if (code !== 0) {
    hasErrors = true;
    console.error('❌ SWC构建失败');
  } else {
    console.log('✅ SWC构建完成');
  }
  checkComplete();
});

function checkComplete() {
  if (typeCheckDone && buildDone) {
    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    if (hasErrors) {
      console.log(`❌ 超快构建失败 (${duration}s)`);
      process.exit(1);
    } else {
      console.log(`🎉 超快构建完成！(${duration}s)`);
      console.log('📦 构建产物: dist/');
      process.exit(0);
    }
  }
}

// 处理中断信号
process.on('SIGINT', () => {
  console.log('\n🛑 超快构建被中断');
  typeCheckProcess.kill();
  buildProcess.kill();
  process.exit(1);
});
