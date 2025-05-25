#!/usr/bin/env node

/**
 * 🚀 超快完整检测脚本
 * 使用增量编译 + 并行处理 + 智能缓存
 */

import { spawn } from 'child_process';
import { performance } from 'perf_hooks';
import { platform } from 'os';
import { existsSync, mkdirSync } from 'fs';

const startTime = performance.now();

console.log('🚀 启动超快完整检测 (增量 + 并行)...');

// 确保缓存目录存在
const cacheDir = 'node_modules/.tmp';
if (!existsSync(cacheDir)) {
  mkdirSync(cacheDir, { recursive: true });
}

// 根据平台确定可执行文件名
const isWindows = platform() === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

// 并行运行多个检查任务
const tasks = [
  {
    name: '增量类型检查',
    process: spawn(npmCmd, [
      'run', 'type-check:incremental'
    ], { stdio: 'pipe', shell: true }),
    color: '\x1b[36m', // 青色
    done: false,
    success: false
  },
  {
    name: 'ESLint检查',
    process: spawn(npmCmd, [
      'run', 'lint:fast'
    ], { stdio: 'pipe', shell: true }),
    color: '\x1b[33m', // 黄色
    done: false,
    success: false
  },
  {
    name: 'SWC构建',
    process: spawn(npmCmd, [
      'run', 'build:fast'
    ], { stdio: 'pipe', shell: true }),
    color: '\x1b[32m', // 绿色
    done: false,
    success: false
  }
];

// 处理每个任务的输出
tasks.forEach(task => {
  task.process.stdout.on('data', (data) => {
    process.stdout.write(`${task.color}[${task.name}]\x1b[0m ${data}`);
  });

  task.process.stderr.on('data', (data) => {
    process.stderr.write(`${task.color}[${task.name}]\x1b[0m ${data}`);
  });

  task.process.on('close', (code) => {
    task.done = true;
    task.success = code === 0;
    
    if (task.success) {
      console.log(`${task.color}✅ ${task.name}通过\x1b[0m`);
    } else {
      console.log(`${task.color}❌ ${task.name}失败\x1b[0m`);
    }
    
    checkAllComplete();
  });
});

function checkAllComplete() {
  const allDone = tasks.every(task => task.done);
  
  if (allDone) {
    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    const allSuccess = tasks.every(task => task.success);
    
    console.log('\n' + '='.repeat(50));
    
    if (allSuccess) {
      console.log(`🎉 超快完整检测全部通过！(${duration}s)`);
      console.log('✅ 类型检查: 通过');
      console.log('✅ 代码规范: 通过');
      console.log('✅ 构建测试: 通过');
      console.log('📦 构建产物: dist/');
      process.exit(0);
    } else {
      console.log(`❌ 完整检测发现问题 (${duration}s)`);
      tasks.forEach(task => {
        const status = task.success ? '✅' : '❌';
        console.log(`${status} ${task.name}: ${task.success ? '通过' : '失败'}`);
      });
      process.exit(1);
    }
  }
}

// 处理中断信号
process.on('SIGINT', () => {
  console.log('\n🛑 完整检测被中断');
  tasks.forEach(task => {
    if (!task.done) {
      task.process.kill();
    }
  });
  process.exit(1);
});
