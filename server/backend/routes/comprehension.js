// 天道领悟系统 REST API
const express = require('express');
const router = express.Router();
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('journal_mode=WAL');
  db.pragma('busy_timeout=5000');
  initComprehensionTables();
} catch (err) {
  console.log('[comprehension] 数据库连接失败:', err.message);
  db = null;
}

const {
  COMPREHENSION_TREES,
  COMPREHENSION_POINT_SOURCES,
  calculateComprehensionBonus,
  getPlayerComprehensionStatus,
  addComprehensionPoints
} = require('../../game/comprehension_system');

// 初始化领悟系统数据库表
function initComprehensionTables() {
  if (!db) return;
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS player_comprehension (
        player_id INTEGER PRIMARY KEY,
        comprehension_points INTEGER NOT NULL DEFAULT 0,
        used_points INTEGER NOT NULL DEFAULT 0,
        total_earned INTEGER NOT NULL DEFAULT 0,
        last_update INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS player_comprehension_nodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        node_id TEXT NOT NULL,
        tree_id TEXT NOT NULL,
        level INTEGER NOT NULL DEFAULT 0,
        unlocked_at INTEGER,
        UNIQUE(player_id, node_id)
      );

      CREATE TABLE IF NOT EXISTS comprehension_attack_nodes (
        node_id TEXT PRIMARY KEY,
        name_cn TEXT,
        description TEXT,
        cost INTEGER,
        tier INTEGER,
        max_level INTEGER,
        effects TEXT
      );

      CREATE TABLE IF NOT EXISTS comprehension_defense_nodes (
        node_id TEXT PRIMARY KEY,
        name_cn TEXT,
        description TEXT,
        cost INTEGER,
        tier INTEGER,
        max_level INTEGER,
        effects TEXT
      );

      CREATE TABLE IF NOT EXISTS comprehension_general_nodes (
        node_id TEXT PRIMARY KEY,
        name_cn TEXT,
        description TEXT,
        cost INTEGER,
        tier INTEGER,
        max_level INTEGER,
        effects TEXT
      );
    `);

    // 延迟填充节点配置数据（等COMPREHENSION_TREES可用）
    setTimeout(() => {
      try {
        initNodeData();
      } catch(e) {
        console.log('[comprehension] 节点数据填充失败:', e.message);
      }
    }, 100);
  } catch (err) {
    console.log('[comprehension] 表初始化失败:', err.message);
  }
}

function initNodeData() {
  if (!db) return;
  // COMPREHENSION_TREES 在模块加载后已可用
  for (const [treeKey, tree] of Object.entries(COMPREHENSION_TREES)) {
    const tableName = `comprehension_${treeKey}_nodes`;
    for (const node of tree.nodes) {
      try {
        db.prepare(`
          INSERT OR IGNORE INTO ${tableName} (node_id, name_cn, description, cost, tier, max_level, effects)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(node.nodeId, node.nameCN, node.description, node.cost, node.tier, node.maxLevel, JSON.stringify(node.effects));
      } catch (e) {
        // 忽略重复插入错误
      }
    }
  }
}

// 统一userId提取
function extractUserId(req) {
  return parseInt(req.query.player_id || req.query.userId || req.query.playerId ||
    (req.body && (req.body.player_id || req.body.userId || req.body.playerId)) ||
    (req.userId) ||
    (req.params && req.params.playerId) ||
    1);
}

// ============================================
// GET /api/comprehension/ - 获取玩家领悟状态
// ============================================
router.get('/', (req, res) => {
  const userId = extractUserId(req);
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });

  try {
    const status = getPlayerComprehensionStatus(userId, db);
    res.json({
      success: true,
      ...status
    });
  } catch (err) {
    console.log('[comprehension] GET / error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// GET /api/comprehension/bonus - 获取领悟被动加成
// ============================================
router.get('/bonus', (req, res) => {
  const userId = extractUserId(req);
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });

  try {
    const bonus = calculateComprehensionBonus(userId, db);
    res.json({
      success: true,
      bonus,
      bonusPercent: {
        attack: bonus.attack || 0,
        critRate: bonus.critRate || 0,
        critDamage: bonus.critDamage || 0,
        damageReduction: bonus.damageReduction || 0,
        dropRate: bonus.dropRate || 0,
        expBonus: bonus.expBonus || 0,
        cultSpeed: bonus.cultSpeed || 0,
        bossDamage: bonus.bossDamage || 0,
        spiritStoneBonus: bonus.spiritStoneBonus || 0,
        breakthroughBonus: bonus.bonus.breakthroughBonus || 0
      }
    });
  } catch (err) {
    console.log('[comprehension] GET /bonus error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// GET /api/comprehension/trees - 获取领悟树配置
// ============================================
router.get('/trees', (req, res) => {
  const userId = extractUserId(req);
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });

  try {
    const userStatus = getPlayerComprehensionStatus(userId, db);
    res.json({
      success: true,
      totalPoints: userStatus.totalPoints,
      availablePoints: userStatus.availablePoints,
      trees: userStatus.trees
    });
  } catch (err) {
    console.log('[comprehension] GET /trees error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// POST /api/comprehension/unlock - 解锁/升级领悟节点
// ============================================
router.post('/unlock', (req, res) => {
  const userId = extractUserId(req);
  const { nodeId, treeId } = req.body;

  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });
  if (!nodeId || !treeId) {
    return res.status(400).json({ success: false, error: '缺少 nodeId 或 treeId' });
  }

  try {
    // 获取玩家当前领悟点
    const playerData = db.prepare(
      'SELECT comprehension_points, used_points FROM player_comprehension WHERE player_id = ?'
    ).get(userId);

    const availablePoints = playerData
      ? Math.max(0, (playerData.comprehension_points || 0) - (playerData.used_points || 0))
      : 0;

    // 获取目标节点配置
    const tree = COMPREHENSION_TREES[treeId];
    if (!tree) {
      return res.status(400).json({ success: false, error: '无效的领悟树' });
    }

    const nodeConfig = tree.nodes.find(n => n.nodeId === nodeId);
    if (!nodeConfig) {
      return res.status(400).json({ success: false, error: '无效的节点' });
    }

    // 获取当前节点等级
    const currentNode = db.prepare(
      'SELECT level FROM player_comprehension_nodes WHERE player_id = ? AND node_id = ?'
    ).get(userId, nodeId);
    const currentLevel = currentNode ? currentNode.level : 0;

    if (currentLevel >= nodeConfig.maxLevel) {
      return res.status(400).json({ success: false, error: '节点已达最高等级' });
    }

    const cost = nodeConfig.cost;
    if (availablePoints < cost) {
      return res.status(400).json({
        success: false,
        error: `领悟点不足，需要${cost}点，当前可用${availablePoints}点`
      });
    }

    // 检查前置节点
    if (nodeConfig.requires && nodeConfig.requires.length > 0) {
      for (const reqId of nodeConfig.requires) {
        const reqNode = db.prepare(
          'SELECT level FROM player_comprehension_nodes WHERE player_id = ? AND node_id = ?'
        ).get(userId, reqId);
        if (!reqNode || reqNode.level < 1) {
          const reqNodeConfig = tree.nodes.find(n => n.nodeId === reqId);
          return res.status(400).json({
            success: false,
            error: `需要先解锁「${reqNodeConfig ? reqNodeConfig.nameCN : reqId}」`
          });
        }
      }
    }

    // 解锁/升级节点
    db.prepare(`
      INSERT INTO player_comprehension_nodes (player_id, node_id, tree_id, level, unlocked_at)
      VALUES (?, ?, ?, 1, ?)
      ON CONFLICT(player_id, node_id) DO UPDATE SET
        level = level + 1,
        unlocked_at = COALESCE(unlocked_at, excluded.unlocked_at)
    `).run(userId, nodeId, treeId, Date.now());

    // 扣减领悟点
    db.prepare(`
      UPDATE player_comprehension
      SET used_points = used_points + ?, last_update = ?
      WHERE player_id = ?
    `).run(cost, Date.now(), userId);

    // 获取更新后的状态
    const newStatus = getPlayerComprehensionStatus(userId, db);
    const newBonus = calculateComprehensionBonus(userId, db);

    // 触发成就/任务更新
    try {
      if (global.eventBus) {
        global.eventBus.emit('comprehension:nodeUnlocked', { playerId: userId, nodeId, treeId });
      }
    } catch (e) {}

    res.json({
      success: true,
      message: `领悟「${nodeConfig.nameCN}」成功！`,
      nodeId,
      treeId,
      pointsSpent: cost,
      remainingPoints: newStatus.availablePoints,
      newLevel: currentLevel + 1,
      bonus: newBonus
    });
  } catch (err) {
    console.log('[comprehension] POST /unlock error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// POST /api/comprehension/add-points - 手动添加领悟点（管理员/测试用）
// ============================================
router.post('/add-points', (req, res) => {
  const userId = extractUserId(req);
  const { source, amount } = req.body;

  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });

  try {
    let points = 0;
    if (source && COMPREHENSION_POINT_SOURCES[source]) {
      points = addComprehensionPoints(userId, source, db);
    } else if (amount && parseInt(amount) > 0) {
      points = parseInt(amount);
      db.prepare(`
        INSERT INTO player_comprehension (player_id, comprehension_points, used_points, total_earned, last_update)
        VALUES (?, ?, 0, ?, ?)
        ON CONFLICT(player_id) DO UPDATE SET
          comprehension_points = comprehension_points + excluded.comprehension_points,
          total_earned = total_earned + excluded.total_earned
      `).run(userId, points, points, Date.now());
    } else {
      return res.status(400).json({ success: false, error: '无效的来源或数量' });
    }

    const newStatus = getPlayerComprehensionStatus(userId, db);
    res.json({
      success: true,
      message: `获得${points}领悟点`,
      totalPoints: newStatus.totalPoints,
      availablePoints: newStatus.availablePoints
    });
  } catch (err) {
    console.log('[comprehension] POST /add-points error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// POST /api/comprehension/reset - 重置领悟树（消耗道具）
// ============================================
router.post('/reset', (req, res) => {
  const userId = extractUserId(req);
  const { treeId } = req.body;

  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });

  try {
    // 计算已使用的领悟点
    const usedNodes = db.prepare(
      'SELECT node_id, level FROM player_comprehension_nodes WHERE player_id = ? AND tree_id = ? AND level > 0'
    ).all(userId, treeId || 'attack');

    if (usedNodes.length === 0) {
      return res.status(400).json({ success: false, error: '该领悟树尚无已解锁节点' });
    }

    // 统计返还点数
    let refundPoints = 0;
    for (const node of usedNodes) {
      const tree = Object.values(COMPREHENSION_TREES).find(t =>
        t.nodes.some(n => n.nodeId === node.node_id)
      );
      if (tree) {
        const nodeConfig = tree.nodes.find(n => n.nodeId === node.node_id);
        if (nodeConfig) {
          refundPoints += nodeConfig.cost * (node.level || 1);
        }
      }
    }

    // 删除节点记录
    db.prepare('DELETE FROM player_comprehension_nodes WHERE player_id = ? AND tree_id = ?')
      .run(userId, treeId || 'attack');

    // 返还领悟点
    db.prepare(`
      UPDATE player_comprehension
      SET used_points = used_points - ?, comprehension_points = comprehension_points + ?
      WHERE player_id = ?
    `).run(refundPoints, refundPoints, userId);

    const newStatus = getPlayerComprehensionStatus(userId, db);
    res.json({
      success: true,
      message: `领悟树重置，返还${refundPoints}领悟点`,
      refundPoints,
      availablePoints: newStatus.availablePoints
    });
  } catch (err) {
    console.log('[comprehension] POST /reset error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// GET /api/comprehension/sources - 获取领悟点来源说明
// ============================================
router.get('/sources', (req, res) => {
  const sourcesInfo = {
    cultivation_complete: { name: '修炼完成', points: COMPREHENSION_POINT_SOURCES.cultivation_complete, description: '每次修炼完成后获得' },
    chapter_clear: { name: '章节通关', points: COMPREHENSION_POINT_SOURCES.chapter_clear, description: '每通关一个章节获得' },
    daily_login: { name: '每日登录', points: COMPREHENSION_POINT_SOURCES.daily_login, description: '每日首次登录时获得' },
    realm_breakthrough: { name: '境界突破', points: COMPREHENSION_POINT_SOURCES.realm_breakthrough, description: '每次境界突破时获得' },
    dungeon_complete: { name: '副本通关', points: COMPREHENSION_POINT_SOURCES.dungeon_complete, description: '每通关一个副本获得' },
    arena_win: { name: '竞技场胜利', points: COMPREHENSION_POINT_SOURCES.arena_win, description: '每次竞技场挑战胜利后获得' }
  };

  res.json({
    success: true,
    sources: sourcesInfo
  });
});

// 事件监听：接受其他系统传来的领悟点奖励事件
function setupEventListeners() {
  if (!global.eventBus) return;

  const handlers = {
    'cultivation:completed': () => addComprehensionPoints,
    'cultivation:start': () => null,
    'chapter:cleared': () => null,
    'player:login': () => null,
    'realm:breakthrough': () => null,
    'dungeon:complete': () => null,
    'arena:win': () => null
  };

  // cultivation:completed → 领悟点
  global.eventBus.on('cultivation:completed', (data) => {
    if (data && data.playerId) {
      addComprehensionPoints(data.playerId, 'cultivation_complete', db);
    }
  });

  global.eventBus.on('chapter:cleared', (data) => {
    if (data && data.playerId) {
      addComprehensionPoints(data.playerId, 'chapter_clear', db);
    }
  });

  global.eventBus.on('player:login', (data) => {
    if (data && data.playerId) {
      addComprehensionPoints(data.playerId, 'daily_login', db);
    }
  });

  global.eventBus.on('realm:breakthrough', (data) => {
    if (data && data.playerId) {
      addComprehensionPoints(data.playerId, 'realm_breakthrough', db);
    }
  });

  global.eventBus.on('dungeon:complete', (data) => {
    if (data && data.playerId) {
      addComprehensionPoints(data.playerId, 'dungeon_complete', db);
    }
  });

  global.eventBus.on('arena:win', (data) => {
    if (data && data.playerId) {
      addComprehensionPoints(data.playerId, 'arena_win', db);
    }
  });
}

// 尝试设置事件监听
try {
  setTimeout(setupEventListeners, 2000);
} catch (e) {}

module.exports = router;
