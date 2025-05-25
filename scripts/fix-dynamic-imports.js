#!/usr/bin/env node

/**
 * 修复动态导入和静态导入冲突的脚本
 * 分析项目中的导入模式并提供修复建议
 */

import fs from 'fs';
import path from 'path';

// 问题模块列表
const problematicModules = [
  'src/shared/store/slices/messageBlocksSlice.ts',
  'src/shared/store/index.ts',
  'src/shared/utils/messageUtils.ts',
  'src/shared/utils/mcpToolParser.ts',
  'src/shared/services/MobileFileStorageService.ts',
  'src/shared/services/messages/ApiProvider.ts'
];

// 分析单个文件的导入
function analyzeFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { staticImports: [], dynamicImports: [] };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const staticImports = [];
  const dynamicImports = [];

  // 匹配静态导入
  const staticImportRegex = /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g;
  let match;
  while ((match = staticImportRegex.exec(content)) !== null) {
    staticImports.push(match[1]);
  }

  // 匹配动态导入
  const dynamicImportRegex = /import\(['"`]([^'"`]+)['"`]\)/g;
  while ((match = dynamicImportRegex.exec(content)) !== null) {
    dynamicImports.push(match[1]);
  }

  return { staticImports, dynamicImports, content };
}

// 扫描所有文件找到导入冲突
function findImportConflicts() {
  const conflicts = new Map();

  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && !['node_modules', '.git', 'dist', 'build'].includes(file)) {
        scanDirectory(filePath);
      } else if (file.match(/\.(ts|tsx|js|jsx)$/)) {
        const analysis = analyzeFile(filePath);
        
        // 检查是否导入了问题模块
        [...analysis.staticImports, ...analysis.dynamicImports].forEach(importPath => {
          const resolvedPath = resolveImportPath(importPath, filePath);
          if (problematicModules.some(pm => resolvedPath.includes(pm.replace('src/', '')))) {
            if (!conflicts.has(resolvedPath)) {
              conflicts.set(resolvedPath, { staticFiles: [], dynamicFiles: [] });
            }
            
            if (analysis.staticImports.includes(importPath)) {
              conflicts.get(resolvedPath).staticFiles.push(filePath);
            }
            if (analysis.dynamicImports.includes(importPath)) {
              conflicts.get(resolvedPath).dynamicFiles.push(filePath);
            }
          }
        });
      }
    }
  }

  scanDirectory('src');
  return conflicts;
}

// 解析导入路径
function resolveImportPath(importPath, fromFile) {
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    return path.resolve(path.dirname(fromFile), importPath);
  }
  return importPath;
}

// 生成修复建议
function generateFixSuggestions(conflicts) {
  console.log('\n🔍 [Import Conflicts] 发现的导入冲突:\n');

  for (const [modulePath, conflict] of conflicts) {
    if (conflict.staticFiles.length > 0 && conflict.dynamicFiles.length > 0) {
      console.log(`📁 模块: ${modulePath}`);
      console.log(`   静态导入文件 (${conflict.staticFiles.length}个):`);
      conflict.staticFiles.slice(0, 3).forEach(file => {
        console.log(`     - ${file}`);
      });
      if (conflict.staticFiles.length > 3) {
        console.log(`     ... 还有 ${conflict.staticFiles.length - 3} 个文件`);
      }

      console.log(`   动态导入文件 (${conflict.dynamicFiles.length}个):`);
      conflict.dynamicFiles.slice(0, 3).forEach(file => {
        console.log(`     - ${file}`);
      });
      if (conflict.dynamicFiles.length > 3) {
        console.log(`     ... 还有 ${conflict.dynamicFiles.length - 3} 个文件`);
      }
      console.log('');
    }
  }
}

// 自动修复函数
function autoFix() {
  console.log('\n🛠️ [Auto Fix] 开始自动修复...\n');

  // 修复策略：将动态导入改为静态导入（如果合理的话）
  const fixStrategies = {
    'messageBlocksSlice': 'static', // 状态管理应该静态导入
    'index.ts': 'static',           // 主入口文件应该静态导入
    'messageUtils': 'static',       // 工具函数应该静态导入
    'mcpToolParser': 'dynamic',     // 解析器可以保持动态导入
    'MobileFileStorageService': 'dynamic', // 文件服务可以保持动态导入
    'ApiProvider': 'static'         // API提供者应该静态导入
  };

  // 这里可以实现具体的修复逻辑
  console.log('修复策略:');
  Object.entries(fixStrategies).forEach(([module, strategy]) => {
    console.log(`  ${module}: ${strategy === 'static' ? '统一为静态导入' : '统一为动态导入'}`);
  });
}

// 主函数
function main() {
  console.log('🔍 开始分析导入冲突...');
  
  const conflicts = findImportConflicts();
  generateFixSuggestions(conflicts);
  
  console.log('\n💡 修复建议:');
  console.log('1. 对于核心模块（store, utils），建议统一使用静态导入');
  console.log('2. 对于可选模块（文件服务、解析器），可以保持动态导入');
  console.log('3. 避免在同一个模块中混合使用静态和动态导入');
  
  autoFix();
}

main();
