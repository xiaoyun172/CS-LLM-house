#!/usr/bin/env node

/**
 * 🚀 超快完整构建脚本
 * 完整检测 + 高速构建 = 最佳平衡
 */

import { spawn } from 'child_process';
import { performance } from 'perf_hooks';
import { platform } from 'os';
import { existsSync, mkdirSync } from 'fs';

const startTime = performance.now();

console.log('🚀 启动超快完整构建 (完整检测 + 高速度)...');

// 确保缓存目录存在
const cacheDir = 'node_modules/.tmp';
if (!existsSync(cacheDir)) {
  mkdirSync(cacheDir, { recursive: true });
}

// 根据平台确定可执行文件名
const isWindows = platform() === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

let currentStep = 0;
const totalSteps = 3;

const steps = [
  {
    name: '增量类型检查',
    command: ['run', 'type-check:incremental'],
    emoji: '🔍'
  },
  {
    name: '快速代码规范检查',
    command: ['run', 'lint:fast'],
    emoji: '📝'
  },
  {
    name: 'SWC高速构建',
    command: ['run', 'build:fast'],
    emoji: '⚡'
  }
];

async function runStep(step) {
  currentStep++;
  const stepTime = performance.now();
  
  console.log(`\n${step.emoji} [${currentStep}/${totalSteps}] ${step.name}...`);
  
  return new Promise((resolve, reject) => {
    const process = spawn(npmCmd, step.command, { 
      stdio: 'pipe', 
      shell: true 
    });

    let hasOutput = false;

    process.stdout.on('data', (data) => {
      if (!hasOutput) {
        hasOutput = true;
        console.log(`   📊 ${step.name}进行中...`);
      }
      // 只显示重要输出，减少噪音
      const output = data.toString();
      if (output.includes('error') || output.includes('warning') || output.includes('✓')) {
        process.stdout.write(`   ${data}`);
      }
    });

    process.stderr.on('data', (data) => {
      process.stderr.write(`   ❌ ${data}`);
    });

    process.on('close', (code) => {
      const stepDuration = ((performance.now() - stepTime) / 1000).toFixed(2);
      
      if (code === 0) {
        console.log(`   ✅ ${step.name}完成 (${stepDuration}s)`);
        resolve();
      } else {
        console.log(`   ❌ ${step.name}失败 (${stepDuration}s)`);
        reject(new Error(`${step.name}失败`));
      }
    });
  });
}

async function runAllSteps() {
  try {
    for (const step of steps) {
      await runStep(step);
    }
    
    const endTime = performance.now();
    const totalDuration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '🎉'.repeat(20));
    console.log('🚀 超快完整构建成功！');
    console.log(`⏱️  总耗时: ${totalDuration}s`);
    console.log('✅ 类型检查: 完整通过');
    console.log('✅ 代码规范: 完整通过');
    console.log('✅ 构建产物: 生成完成');
    console.log('📦 输出目录: dist/');
    console.log('🎉'.repeat(20));
    
  } catch (error) {
    const endTime = performance.now();
    const totalDuration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '❌'.repeat(20));
    console.log('💥 完整构建失败！');
    console.log(`⏱️  耗时: ${totalDuration}s`);
    console.log(`🚫 错误: ${error.message}`);
    console.log('❌'.repeat(20));
    
    process.exit(1);
  }
}

// 处理中断信号
process.on('SIGINT', () => {
  console.log('\n🛑 完整构建被中断');
  process.exit(1);
});

// 开始执行
runAllSteps();
