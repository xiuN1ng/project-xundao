/**
 * 宗门大厅/驻地建设 API (P88-3)
 * 挂机修仙游戏 - 宗门建筑系统
 *
 * API端点:
 * 1. GET  /api/sect-hall/buildings     - 获取宗门建筑列表
 * 2. POST /api/sect-hall/donate        - 捐献灵石/材料升级
 * 3. POST /api/sect-hall/upgrade       - 升级建筑
 * 4. GET  /api/sect-hall/benefits      - 获取宗门建筑buff
 * 5. GET  /api/sect-hall/contributions - 获取贡献排行榜
 *
 * 数据库表:
 * - sect_buildings: 宗门建筑状态 (buildingId, sectId, level, progress, contributions)
 * - sect_building_donations: 捐献记录
 */

const express = require('express');
const router = express.Router();
const path = require('path');

const Logger = {
  info: (...args) => console.log('[sect-hall]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[sect-hall:error]', new Date().toISOString(), ...args)
};

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  Logger.info('数据库连接成功');
} catch (err) {
  Logger.error('数据库连接失败:', err.message);
  db = {
    prepare: () => ({ run: () => {}, get: () => null, all: () => [] }),
    exec: () => {}
  };
}

// ============================================================
// 宗门建筑配置：5种建筑 x 10级
// ============================================================
const BUILDING_TYPES = {
  scripture_library: {
    id: 'scripture_library',
    name: '藏经阁',
    icon: '📚',
    desc: '技能研究：提升全宗技能研究速度',
    buffType: 'skill_research_speed',
    buffName: '技能研究速度',
    maxLevel: 10,
    upgradeCost: (level) => Math.floor(5000 * Math.pow(1.8, level)),
  },
  smithy: {
    id: 'smithy',
    name: '炼器室',
    icon: '🔨',
    desc: '装备加成：提升全宗装备属性',
    buffType: 'equipment_bonus',
    buffName: '装备属性加成',
    maxLevel: 10,
    upgradeCost: (level) => Math.floor(6000 * Math.pow(1.8, level)),
  },
  alchemy_room: {
    id: 'alchemy_room',
    name: '炼丹房',
    icon: '⚗️',
    desc: '丹药折扣：降低全宗丹药消耗',
    buffType: 'pill_discount',
    buffName: '丹药消耗折扣',
    maxLevel: 10,
    upgradeCost: (level) => Math.floor(5000 * Math.pow(1.8, level)),
  },
  spirit_formation: {
    id: 'spirit_formation',
    name: '聚灵阵',
    icon: '🌀',
    desc: '全宗灵力：提升全宗每日灵力恢复',
    buffType: 'spirit_recovery',
    buffName: '灵力恢复加成',
    maxLevel: 10,
    upgradeCost: (level) => Math.floor(8000 * Math.pow(1.8, level)),
  },
  beast_hall: {
    id: 'beast_hall',
    name: '兽栏',
    icon: '🐉',
    desc: '灵兽加成：提升全宗灵兽属性',
    buffType: 'beast_bonus',
    buffName: '灵兽属性加成',
    maxLevel: 10,
    upgradeCost: (level) => Math.floor(7000 * Math.pow(1.8, level)),
  },
};

// ============================================================
// 数据库初始化
// ============================================================
function initTables() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS sect_buildings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sect_id INTEGER NOT NULL,
        building_type TEXT NOT NULL,
        level INTEGER DEFAULT 1,
        progress INTEGER DEFAULT 0,
        total_contribution INTEGER DEFAULT 0,
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(sect_id, building_type)
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS sect_building_donations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sect_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        building_type TEXT NOT NULL,
        contribution_points INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_sect_build_donate ON sect_building_donations(sect_id, player_id, building_type)`);
    Logger.info('数据库表初始化完成');
  } catch (e) {
    Logger.error('数据库表初始化失败:', e.message);
  }
}
initTables();

// ============================================================
// 中间件：获取当前玩家
// ============================================================
function getPlayerId(req) {
  if (req.userId) return req.userId;
  const query = req.query || {};
  const body = req.body || {};
  return parseInt(query.playerId || body.playerId || req.headers['x-player-id'] || 1);
}

// ============================================================
// 端点 1: GET /api/sect-hall/buildings
// 获取宗门建筑列表
// ============================================================
router.get('/buildings', (req, res) => {
  const { sectId } = req.query;
  const playerId = getPlayerId(req);

  if (!sectId) {
    return res.json({ code: 400, message: '缺少 sectId 参数' });
  }

  const sectIdNum = parseInt(sectId);
  const playerMember = db.prepare('SELECT role FROM SectMembers WHERE userId = ? AND sectId = ?').get(playerId, sectIdNum);
  if (!playerMember) {
    return res.json({ code: 403, message: '您尚未加入该宗门' });
  }

  // 初始化所有建筑（如果不存在）
  const existing = db.prepare('SELECT building_type, level, progress, total_contribution FROM sect_buildings WHERE sect_id = ?').all(sectIdNum);
  const existingMap = {};
  for (const b of existing) existingMap[b.building_type] = b;

  const buildings = Object.values(BUILDING_TYPES).map(cfg => {
    const stored = existingMap[cfg.id];
    const level = stored ? stored.level : 1;
    const progress = stored ? stored.progress : 0;
    const totalContribution = stored ? stored.total_contribution : 0;
    const nextCost = cfg.upgradeCost(level);
    const myRow = db.prepare('SELECT contribution_points FROM sect_building_donations WHERE player_id = ? AND sect_id = ? AND building_type = ?').get(playerId, sectIdNum, cfg.id);
    return {
      buildingType: cfg.id,
      name: cfg.name,
      icon: cfg.icon,
      desc: cfg.desc,
      level,
      progress,
      totalContribution,
      nextCost,
      maxLevel: cfg.maxLevel,
      canUpgrade: level < cfg.maxLevel,
      myContribution: myRow ? myRow.contribution_points : 0,
    };
  });

  res.json({
    code: 200,
    data: {
      buildings,
      sectId: sectIdNum,
      myRole: playerMember.role,
    }
  });
});

// ============================================================
// 端点 2: POST /api/sect-hall/donate
// 捐献灵石/材料增加建筑进度
// ============================================================
router.post('/donate', (req, res) => {
  const { buildingId, type, amount, sectId } = req.body;
  const playerId = getPlayerId(req);

  if (!buildingId || !type || !amount || !sectId) {
    return res.json({ code: 400, message: '缺少必要参数: buildingId, type, amount, sectId' });
  }

  const sectIdNum = parseInt(sectId);
  const amountNum = parseInt(amount);

  if (!['spirit_stone', 'material'].includes(type)) {
    return res.json({ code: 400, message: 'type 必须是 spirit_stone 或 material' });
  }
  if (amountNum <= 0) {
    return res.json({ code: 400, message: 'amount 必须大于 0' });
  }

  const playerMember = db.prepare('SELECT role FROM SectMembers WHERE userId = ? AND sectId = ?').get(playerId, sectIdNum);
  if (!playerMember) {
    return res.json({ code: 403, message: '您尚未加入该宗门' });
  }

  const cfg = BUILDING_TYPES[buildingId];
  if (!cfg) {
    return res.json({ code: 404, message: '建筑类型不存在' });
  }

  // 验证玩家资源
  let playerResource = 0;
  if (type === 'spirit_stone') {
    const p = db.prepare('SELECT spirit_stones FROM player WHERE id = ?').get(playerId);
    playerResource = p ? (p.spirit_stones || 0) : 0;
  } else {
    const mat = db.prepare('SELECT SUM(quantity) as total FROM player_items WHERE player_id = ? AND item_type = ?').get(playerId, 'material');
    playerResource = mat ? (mat.total || 0) : 0;
  }

  if (playerResource < amountNum) {
    return res.json({ code: 400, message: `${type === 'spirit_stone' ? '灵石' : '材料'}不足，当前持有: ${playerResource}` });
  }

  // 计算贡献点：灵石1:1，材料按10:1
  const contributionPoints = type === 'spirit_stone' ? amountNum : Math.floor(amountNum / 10);

  // 扣减玩家资源
  if (type === 'spirit_stone') {
    db.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?').run(amountNum, playerId);
  } else {
    const mats = db.prepare('SELECT id, quantity FROM player_items WHERE player_id = ? AND item_type = ? ORDER BY id ASC').all(playerId, 'material');
    let remaining = amountNum;
    for (const mat of mats) {
      if (remaining <= 0) break;
      const take = Math.min(mat.quantity, remaining);
      db.prepare('UPDATE player_items SET quantity = quantity - ? WHERE id = ?').run(take, mat.id);
      remaining -= take;
    }
  }

  // 获取/创建建筑记录
  let building = db.prepare('SELECT * FROM sect_buildings WHERE sect_id = ? AND building_type = ?').get(sectIdNum, buildingId);
  if (!building) {
    db.prepare('INSERT INTO sect_buildings (sect_id, building_type, level, progress, total_contribution) VALUES (?, ?, 1, 0, 0)').run(sectIdNum, buildingId);
    building = { level: 1, progress: 0, total_contribution: 0 };
  }

  // 更新建筑进度和总贡献
  const newProgress = building.progress + contributionPoints;
  const newTotalContrib = building.total_contribution + contributionPoints;
  db.prepare(`UPDATE sect_buildings SET progress = ?, total_contribution = ?, updated_at = datetime('now') WHERE sect_id = ? AND building_type = ?`).run(newProgress, newTotalContrib, sectIdNum, buildingId);

  // 记录捐献日志
  db.prepare('INSERT INTO sect_building_donations (sect_id, player_id, building_type, contribution_points) VALUES (?, ?, ?, ?)').run(sectIdNum, playerId, buildingId, contributionPoints);

  // 更新玩家宗门贡献
  db.prepare('UPDATE SectMembers SET contribution = contribution + ? WHERE userId = ? AND sectId = ?').run(contributionPoints, playerId, sectIdNum);

  // 检查是否自动升级
  const upgradeCost = cfg.upgradeCost(building.level);
  let newLevel = building.level;
  let upgradeTriggered = false;
  if (newProgress >= upgradeCost && building.level < cfg.maxLevel) {
    newLevel = building.level + 1;
    const remainingProgress = newProgress - upgradeCost;
    db.prepare(`UPDATE sect_buildings SET level = ?, progress = ?, updated_at = datetime('now') WHERE sect_id = ? AND building_type = ?`).run(newLevel, remainingProgress, sectIdNum, buildingId);
    upgradeTriggered = true;
  }

  const updated = db.prepare('SELECT level, progress, total_contribution FROM sect_buildings WHERE sect_id = ? AND building_type = ?').get(sectIdNum, buildingId);

  res.json({
    code: 200,
    data: {
      newLevel: updated.level,
      newProgress: updated.progress,
      contributionAdded: contributionPoints,
      totalContribution: updated.total_contribution,
      upgradeTriggered,
      nextCost: cfg.upgradeCost(updated.level),
    }
  });
});

// ============================================================
// 端点 3: POST /api/sect-hall/upgrade
// 手动触发升级
// ============================================================
router.post('/upgrade', (req, res) => {
  const { buildingId, sectId } = req.body;
  const playerId = getPlayerId(req);

  if (!buildingId || !sectId) {
    return res.json({ code: 400, message: '缺少必要参数: buildingId, sectId' });
  }

  const sectIdNum = parseInt(sectId);
  const playerMember = db.prepare('SELECT role FROM SectMembers WHERE userId = ? AND sectId = ?').get(playerId, sectIdNum);
  if (!playerMember) {
    return res.json({ code: 403, message: '您尚未加入该宗门' });
  }

  const cfg = BUILDING_TYPES[buildingId];
  if (!cfg) {
    return res.json({ code: 404, message: '建筑类型不存在' });
  }

  const building = db.prepare('SELECT level, progress FROM sect_buildings WHERE sect_id = ? AND building_type = ?').get(sectIdNum, buildingId);
  if (!building) {
    return res.json({ code: 404, message: '建筑未初始化' });
  }

  if (building.level >= cfg.maxLevel) {
    return res.json({ code: 400, message: '建筑已满级' });
  }

  const cost = cfg.upgradeCost(building.level);
  if (building.progress < cost) {
    return res.json({ code: 400, message: `建设进度不足，还需 ${cost - building.progress} 点贡献` });
  }

  const newLevel = building.level + 1;
  const remainingProgress = building.progress - cost;
  db.prepare(`UPDATE sect_buildings SET level = ?, progress = ?, updated_at = datetime('now') WHERE sect_id = ? AND building_type = ?`).run(newLevel, remainingProgress, sectIdNum, buildingId);

  res.json({
    code: 200,
    data: {
      success: true,
      newLevel,
      remainingProgress,
      cost,
      nextCost: newLevel < cfg.maxLevel ? cfg.upgradeCost(newLevel) : null,
    }
  });
});

// ============================================================
// 端点 4: GET /api/sect-hall/benefits
// 获取宗门建筑提供的所有buff
// ============================================================
router.get('/benefits', (req, res) => {
  const { sectId } = req.query;
  if (!sectId) return res.json({ code: 400, message: '缺少 sectId 参数' });

  const sectIdNum = parseInt(sectId);
  const buildings = db.prepare('SELECT building_type, level FROM sect_buildings WHERE sect_id = ?').all(sectIdNum);
  const levelMap = {};
  for (const b of buildings) levelMap[b.building_type] = b.level;

  const activeBuffs = Object.values(BUILDING_TYPES).map(cfg => {
    const level = levelMap[cfg.id] || 1;
    const bonus = calcBuffValue(cfg.buffType, level);
    return {
      buildingType: cfg.id,
      name: cfg.name,
      icon: cfg.icon,
      level,
      buffType: cfg.buffType,
      buffName: cfg.buffName,
      bonus,
      description: getBuffDescription(cfg.buffType, level),
    };
  });

  res.json({
    code: 200,
    data: {
      activeBuffs,
      totalBuffPower: activeBuffs.reduce((sum, b) => sum + b.bonus, 0),
    }
  });
});

// ============================================================
// 端点 5: GET /api/sect-hall/contributions
// 获取宗门贡献排行榜
// ============================================================
router.get('/contributions', (req, res) => {
  const { sectId } = req.query;
  if (!sectId) return res.json({ code: 400, message: '缺少 sectId 参数' });

  const sectIdNum = parseInt(sectId);
  const topContributors = db.prepare(`
    SELECT sm.userId as playerId, sm.contribution, sm.role, sm.joinedAt
    FROM SectMembers sm
    WHERE sm.sectId = ?
    ORDER BY sm.contribution DESC
    LIMIT 20
  `).all(sectIdNum);

  const result = topContributors.map((row, index) => ({
    rank: index + 1,
    playerId: row.playerId,
    playerName: row.playerName || `玩家${row.playerId}`,
    contribution: row.contribution,
    role: row.role,
    joinedAt: row.joinedAt,
  }));

  res.json({
    code: 200,
    data: {
      topContributors: result,
      totalMembers: result.length,
    }
  });
});

// ============================================================
// 辅助函数
// ============================================================
function calcBuffValue(buffType, level) {
  switch (buffType) {
    case 'skill_research_speed': return level * 5;
    case 'equipment_bonus': return level * 3;
    case 'pill_discount': return level * 2;
    case 'spirit_recovery': return level * 10;
    case 'beast_bonus': return level * 4;
    default: return level * 1;
  }
}

function getBuffDescription(buffType, level) {
  const val = calcBuffValue(buffType, level);
  switch (buffType) {
    case 'skill_research_speed': return `技能研究速度 +${val}%`;
    case 'equipment_bonus': return `装备属性 +${val}%`;
    case 'pill_discount': return `丹药消耗 -${val}%`;
    case 'spirit_recovery': return `每日灵力恢复 +${val}`;
    case 'beast_bonus': return `灵兽全属性 +${val}%`;
    default: return `等级${level}效果 +${val}`;
  }
}

module.exports = router;
