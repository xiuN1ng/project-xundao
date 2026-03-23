#!/usr/bin/env node
/**
 * 数值配置导入脚本
 * 
 * 将 docs/数值设定/ 的策划文档导入到 server/resources/data/
 * 
 * 用法: node scripts/import-to-server.js
 */

const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, '..', 'docs', '数值设定');
const DEST = path.join(__dirname, '..', 'server', 'resources', 'data');

// 确保目标目录存在
if (!fs.existsSync(DEST)) {
  fs.mkdirSync(DEST, { recursive: true });
}

if (!fs.existsSync(SOURCE)) {
  console.error(`❌ 源目录不存在: ${SOURCE}`);
  console.log('请先在 docs/数值设定/ 中添加策划文档');
  process.exit(1);
}

// 复制文件
const files = fs.readdirSync(SOURCE);
let count = 0;

for (const file of files) {
  const srcPath = path.join(SOURCE, file);
  const destPath = path.join(DEST, file);
  
  if (fs.statSync(srcPath).isFile()) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`✅ ${file}`);
    count++;
  }
}

console.log(`\n📦 共导入 ${count} 个文件到 ${DEST}`);
