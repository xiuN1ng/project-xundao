/**
 * 路由自动注册中心 - server/routes/index.js
 * 自动扫描 backend/routes/ 目录并注册所有 API 路由
 * 解决手动 app.use() 容易遗漏的问题
 *
 * 使用方法:
 *   const loadRoutes = require('./routes');
 *   loadRoutes(app, db, authenticateToken, logger, { skipPaths });
 *
 * @param {object} app - Express app 实例
 * @param {object} db - 数据库实例
 * @param {function} authenticateToken - 鉴权中间件
 * @param {object} logger - 日志记录器 { info, warn, error }
 * @param {object} options - { skipPaths: Set } 跳过已注册的路径
 */

const fs = require('fs');
const path = require('path');

// 自动注册路由
function loadRoutes(app, db, authenticateToken, logger, options = {}) {
  const skipPaths = options.skipPaths || new Set();
  const routesDir = path.join(__dirname, '..', 'backend', 'routes');

  if (!fs.existsSync(routesDir)) {
    if (logger) logger.warn(`[Routes] 路由目录不存在: ${routesDir}`);
    return;
  }

  const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

  // API 路径映射：文件名 → API 路径
  // 格式: sect_war.js → /api/sect-war
  //       spirit_root.js → /api/spirit-root
  //       worldBoss.js → /api/worldBoss
  //       abyss.js → /api/abyss
  const nameToPath = (filename) => {
    const base = filename.replace('.js', '');
    // 已有明确 API 路径的文件名映射
    const explicitPaths = {
      'sect-war': '/api/sect-war',
      'sect_war': '/api/sect-war',
      'sect-war-api': '/api/sect-war-api',
      'sect_war_api': '/api/sect-war-api',
      'sect-missions': '/api/sect-missions',
      'sect_missions': '/api/sect-missions',
      'sect-activity': '/api/sect-activity',
      'sect_activity': '/api/sect-activity',
      'spirit_root': '/api/spirit-root',
      'spirit-artifact': '/api/spirit-artifact',
      'spirit_artifact': '/api/spirit-artifact',
      'worldBoss': '/api/worldBoss',
      'worldboss': '/api/worldboss',
      'equipmentDismantle': '/api/equipmentDismantle',
      'equipment_dismantle': '/api/equipment-dismantle',
      'abyss': '/api/abyssDungeon',
      'dailyQuest': '/api/dailyQuest',
      'daily_quest': '/api/daily-quest',
      'daily-trial': '/api/daily-trial',
      'daily_trial': '/api/daily-trial',
      'realmDungeon': '/api/realmDungeon',
      'realm_dungeon': '/api/realm-dungeon',
      'heartDemon': '/api/heartDemon',
      'heart_demon': '/api/heartDemon',
      'giftcode': '/api/giftcode',
      'deity': '/api/deity-list',
      'giftCode': '/api/giftCode',
      'artifact_resonance_api': '/api/artifact-resonance',
      'pet_talent_api': '/api/pet-talent',
      'ladder_season_v2_api': '/api/ladder-season-v2',
      'economy_api': '/api/economy',
      'random_events_api': '/api/events',
      // P88-2 限时商店
      'limited_shop': '/api/shop',
      // P88-6 灵兽进化
      'spirit_beast_api': '/api/spirit-beast',
    };
    if (explicitPaths[base]) return explicitPaths[base];

    // 通用转换: 下划线/大小写混合 → kebab-case
    // spiritRoot → spirit-root, worldBoss → worldBoss (保留大写)
    let apiPath = '/' + base
      .replace(/_/g, '-')
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase();

    return '/api' + apiPath;
  };

  // 需要跳过的文件（不是路由或需要特殊处理）
  const skipFiles = new Set([
    'index.js',           // 本文件
    'auth.js',            // 认证中间件，非路由
    'formation_api.js',   // 已在 server.js 手动注册到 /api/formation
    'trade_api.js',       // 已在 server.js 手动注册到 /api/trade（增强版）
    'gem.js',             // 已由 gem_api.js 替代，手动注册到 /api/gem
  ]);

  // 需要特殊处理的文件（使用 .router 属性）
  const routerPropertyFiles = new Set([
    'couple.js',
    'marriage.js',
    'quest.js',
  ]);

  let registered = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    if (skipFiles.has(file)) {
      skipped++;
      continue;
    }

    const filePath = path.join(routesDir, file);
    const apiPath = nameToPath(file);

    try {
      let router;
      // 清除缓存，确保每次重新加载
      delete require.cache[require.resolve(filePath)];

      const routeModule = require(filePath);

      // 跳过已在 server.js 中手动注册的路由
      if (skipPaths.has(apiPath)) {
        skipped++;
        if (logger) logger.info(`[Routes] ⊝ 跳过(已注册) ${apiPath} ← ${file}`);
        continue;
      }

      // 处理不同的导出格式
      if (routeModule && routeModule.router && typeof routeModule.router === 'function') {
        // 导出为 { router: ExpressRouter, ... } 格式
        router = routeModule.router;
      } else if (routeModule && typeof routeModule === 'function') {
        // 直接导出 express.Router()
        router = routeModule;
      } else if (routeModule && typeof routeModule === 'object' && routeModule.default && typeof routeModule.default === 'function') {
        // ES6 default export
        router = routeModule.default;
      } else {
        if (logger) logger.warn(`[Routes] ${file} 不是有效的路由模块，跳过`);
        skipped++;
        continue;
      }

      // 特殊处理：有些路由需要 db 初始化
      if (typeof router.setDb === 'function') {
        router.setDb(db);
      }

      app.use(apiPath, router);
      registered++;
      if (logger) logger.info(`[Routes] ✓ 已注册 ${apiPath} ← ${file}`);

    } catch (err) {
      errors++;
      if (logger) {
        logger.error(`[Routes] ✗ 注册失败 ${file}: ${err.message}`);
      }
    }
  }

  if (logger) {
    logger.info(`[Routes] 自动注册完成: ${registered} 成功, ${skipped} 跳过, ${errors} 错误`);
  }

  return { registered, skipped, errors };
}

module.exports = loadRoutes;
