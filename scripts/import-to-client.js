#!/usr/bin/env node
/**
 * 前端配置导入脚本
 * 
 * 将 docs/数值设定/ 的部分配置导入到 client/resources/data/
 * 只复制前端需要的显示配置（名称/描述/图标路径）
 * 
 * 用法: node scripts/import-to-client.js
 */

const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, '..', 'docs', '数值设定');
const DEST = path.join(__dirname, '..', 'client', 'resources', 'data');

// 确保目标目录存在
if (!fs.existsSync(DEST)) {
  fs.mkdirSync(DEST, { recursive: true });
}

// 前端需要的配置类型
const FRONTEND_FILES = [
  '装备配置.json',
  '技能配置.json', 
  '道具配置.json',
  '境界配置.json',
  '称号配置.json',
];

if (!fs.existsSync(SOURCE)) {
  console.error(`❌ 源目录不存在: ${SOURCE}`);
  process.exit(1);
}

const files = fs.readdirSync(SOURCE);
let count = 0;

for (const file of files) {
  // 复制所有 JSON 文件（前端目前只需要配置表）
  if (file.endsWith('.json')) {
    const srcPath = path.join(SOURCE, file);
    const destPath = path.join(DEST, file);
    fs.copyFileSync(srcPath, destPath);
    console.log(`✅ ${file}`);
    count++;
  }
}

console.log(`\n📦 共导入 ${count} 个配置文件到 ${DEST}`);
