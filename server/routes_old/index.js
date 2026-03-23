/**
 * 路由汇总 - 挂机修仙
 * 将所有 API 路由模块化导入
 */

// 动态加载所有路由
const fs = require('fs');
const path = require('path');

function loadRoutes(app, db, authenticateToken, Logger) {
  const routesDir = __dirname;
  
  // 路由文件映射
  const routeFiles = [
    'auth.js',      // 认证
    'player.js',   // 玩家
    'realm.js',    // 境界
    'gongfa.js',   // 功法
    'skills.js',   // 技能
    'tasks.js',    // 任务
    'shop.js',     // 商店
    'dungeon.js',  // 副本
    'tribulation.js', // 天劫
    'arena.js',    // 竞技场
    'social.js',   // 社交
    'vip.js',       // VIP
    './backend/routes/mount.js' // 坐骑系统
  ];
  
  routeFiles.forEach(file => {
    try {
      const route = require(path.join(routesDir, file));
      if (typeof route === 'function') {
        route(app, db, authenticateToken, Logger);
        Logger.info(`✓ 加载路由: ${file}`);
      }
    } catch (e) {
      Logger.warn(`路由加载失败: ${file} - ${e.message}`);
    }
  });
  
  // 健康检查和根路由
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });
  
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
  
  app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
  
  Logger.info('✓ 所有路由加载完成');
}

module.exports = { loadRoutes };
