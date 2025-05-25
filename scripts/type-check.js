#!/usr/bin/env node

/**
 * 超快TypeScript类型检查脚本
 * 只使用tsc进行增量类型检查，速度已经很快了
 */

import { spawn } from 'child_process';
import { performance } from 'perf_hooks';
import { platform } from 'os';

const startTime = performance.now();

console.log('🚀 启动超快类型检查...');

// 根据平台确定可执行文件名
const isWindows = platform() === 'win32';
const tscCmd = isWindows ? 'npx.cmd' : 'npx';

// 使用增量TypeScript检查
const tscProcess = spawn(tscCmd, [
  'tsc',
  '--noEmit',
  '--incremental'
], { stdio: 'inherit', shell: true });

tscProcess.on('close', (code) => {
  const endTime = performance.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  if (code !== 0) {
    console.log(`❌ TypeScript 类型检查失败 (${duration}s)`);
    process.exit(1);
  } else {
    console.log(`✅ TypeScript 类型检查通过 (${duration}s)`);
    process.exit(0);
  }
});

// 处理中断信号
process.on('SIGINT', () => {
  console.log('\n🛑 类型检查被中断');
  tscProcess.kill();
  process.exit(1);
});
