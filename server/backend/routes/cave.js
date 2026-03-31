/**
 * 洞府系统 - 魅力值/舒适度计算、装饰物存储、灵田定时收获
 * 洞府是玩家的私人空间，影响修炼效率和社交互动
 */

const express = require('express');
const router = express.Router();
const path = require('path');

// ==================== 数据库支持 ====================
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');
let db = null;

try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('journal_mode=WAL');
  initCaveVisitTables();
} catch (e) {
  console.log('[cave] DB初始化失败:', e.message);
}

function initCaveVisitTables() {
  if (!db) return;
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS cave_visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visitor_id INTEGER NOT NULL,
        host_id INTEGER NOT NULL,
        visited_at TEXT DEFAULT (datetime('now')),
        reward_given INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS cave_visit_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visitor_id INTEGER NOT NULL,
        host_id INTEGER NOT NULL,
        visited_at TEXT DEFAULT (datetime('now')),
        reward_given INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS cave_rankings (
        player_id INTEGER PRIMARY KEY,
        charm INTEGER DEFAULT 0,
        comfort INTEGER DEFAULT 0,
        decorations INTEGER DEFAULT 0,
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_cave_visits_visitor ON cave_visits(visitor_id);
      CREATE INDEX IF NOT EXISTS idx_cave_visits_host ON cave_visits(host_id);
    `);
  } catch (e) {
    console.log('[cave] 访客表初始化失败:', e.message);
  }
}

// 同步洞府数据到排行榜表
function syncCaveRanking(cave) {
  if (!db) return;
  try {
    const stmt = db.prepare(`
      INSERT INTO cave_rankings (player_id, charm, comfort, decorations, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(player_id) DO UPDATE SET
        charm = excluded.charm,
        comfort = excluded.comfort,
        decorations = excluded.decorations,
        updated_at = datetime('now')
    `);
    stmt.run(cave.playerId, cave.charm, cave.comfort, cave.decorations.length);
  } catch (e) {
    // ignore
  }
}

// ==================== 装饰物配置 ====================
const DECORATION_TYPES = {
  // 家具类
  '石桌':      { category: 'furniture', charm: 2,  comfort: 3,  cost: 50,   icon: '🪑' },
  '玉榻':      { category: 'furniture', charm: 5,  comfort: 8,  cost: 200,  icon: '🛏️' },
  '灵芝盆景':  { category: 'furniture', charm: 8,  comfort: 5,  cost: 500,  icon: '🎍' },
  '琉璃屏风':  { category: 'furniture', charm: 10, comfort: 6, cost: 800,  icon: '🪟' },
  '仙藤摇椅':  { category: 'furniture', charm: 12, comfort: 15, cost: 1500, icon: '🪑' },
  // 植物类
  '灵芝草':    { category: 'plant', charm: 3,  comfort: 2,  cost: 30,   icon: '🌿' },
  '九幽兰':    { category: 'plant', charm: 6,  comfort: 4,  cost: 120,  icon: '🌸' },
  '七彩莲':    { category: 'plant', charm: 15, comfort: 10, cost: 600,  icon: '🪷' },
  '悟道茶树':  { category: 'plant', charm: 25, comfort: 20, cost: 3000, icon: '🍃' },
  // 器物类
  '青铜香炉':  { category: 'artifact', charm: 5,  comfort: 2,  cost: 100,  icon: '🏺' },
  '太极图':    { category: 'artifact', charm: 20, comfort: 15, cost: 2000, icon: '☯️' },
  '聚灵阵盘':  { category: 'artifact', charm: 30, comfort: 25, cost: 5000, icon: '🔮' },
  '诛仙剑':    { category: 'artifact', charm: 50, comfort: 10, cost: 20000, icon: '⚔️' },
  // 建筑类
  '灵石喷泉':  { category: 'building', charm: 15, comfort: 20, cost: 1000, icon: '⛲' },
  '藏书阁':    { category: 'building', charm: 25, comfort: 30, cost: 5000, icon: '📚' },
  '炼丹房':    { category: 'building', charm: 20, comfort: 25, cost: 3000, icon: '🏠' },
  '炼器室':    { category: 'building', charm: 18, comfort: 22, cost: 2500, icon: '🔧' },
  '灵兽园':    { category: 'building', charm: 35, comfort: 40, cost: 10000, icon: '🦌' },
};

// ==================== 灵田作物配置 ====================
const CROP_TYPES = {
  '灵草': {
    icon: '🌱', growTime: 300, // 5分钟
    harvest: { type: 'herb', min: 1, max: 3 },
    exp: 10, cost: 0
  },
  '灵芝': {
    icon: '🍄', growTime: 900, // 15分钟
    harvest: { type: 'rareHerb', min: 1, max: 2 },
    exp: 30, cost: 10
  },
  '筑基丹材料': {
    icon: '💊', growTime: 1800, // 30分钟
    harvest: { type: 'pillMaterial', min: 1, max: 1 },
    exp: 100, cost: 50
  },
  '金灵果': {
    icon: '🍎', growTime: 3600, // 60分钟
    harvest: { type: 'goldenFruit', min: 1, max: 1 },
    exp: 250, cost: 200
  },
  '悟道花': {
    icon: '🌺', growTime: 7200, // 120分钟
    harvest: { type: 'enlightenFlower', min: 1, max: 1 },
    exp: 500, cost: 500
  },
};

// ==================== 洞府数据存储 ====================
// 模拟数据存储（生产环境应使用数据库）
const caveDb = {
  // 玩家洞府数据: playerId -> caveData
  data: new Map(),

  // 获取或创建洞府数据
  getOrCreateCave(playerId) {
    if (!this.data.has(playerId)) {
      this.data.set(playerId, {
        playerId,
        charm: 0,          // 魅力值
        comfort: 0,        // 舒适度
        decorations: [],   // 已放置的装饰物 [{type, pos, id}]
        decorationSlots: 12, // 装饰物槽位上限
        spiritFields: [],   // 灵田 [{id, cropType, plantedAt, lastHarvest, locked}]
        fieldSlots: 4,      // 灵田槽位上限
        totalHarvests: 0,  // 总收获次数
        totalCultivationBonus: 0, // 累计修炼加成
        lastOnlineAt: Date.now(),
        lastAutoSave: Date.now(),
      });
    }
    return this.data.get(playerId);
  },

  // 计算魅力值和舒适度
  recalculateStats(cave) {
    let charm = 0;
    let comfort = 0;
    for (const deco of cave.decorations) {
      const config = DECORATION_TYPES[deco.type];
      if (config) {
        charm += config.charm;
        comfort += config.comfort;
      }
    }
    cave.charm = charm;
    cave.comfort = comfort;
    return { charm, comfort };
  },
};

// ==================== 工具函数 ====================

// 计算修炼加成（基于舒适度）
function calcCultivationBonus(comfort) {
  // 舒适度每10点 +1% 修炼效率，上限 +50%
  return Math.min(50, Math.floor(comfort / 10));
}

// 计算访客吸引力（基于魅力值）
function calcVisitorAttraction(charm) {
  // 魅力值每5点可吸引1个访客，上限10个
  return Math.min(10, Math.floor(charm / 5));
}

// 获取作物成熟状态
function getCropStatus(field) {
  if (!field.cropType || field.locked) {
    return { status: 'empty', ready: false, remaining: 0 };
  }
  const config = CROP_TYPES[field.cropType];
  if (!config) return { status: 'empty', ready: false, remaining: 0 };

  const now = Date.now();
  const elapsed = now - field.plantedAt;
  const remaining = Math.max(0, config.growTime * 1000 - elapsed);
  const ready = remaining === 0;

  return {
    status: ready ? 'ready' : 'growing',
    ready,
    remaining,
    progress: Math.min(100, (elapsed / (config.growTime * 1000)) * 100),
  };
}

// 生成唯一ID
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ==================== API 路由 ====================

// GET /api/cave - 获取洞府基础信息
router.get('/', (req, res) => {
  const playerId = parseInt(req.query.player_id) || 1;
  const cave = caveDb.getOrCreateCave(playerId);
  const cultivationBonus = calcCultivationBonus(cave.comfort);
  const visitorAttraction = calcVisitorAttraction(cave.charm);

  // 更新在线状态
  cave.lastOnlineAt = Date.now();

  res.json({
    success: true,
    cave: {
      charm: cave.charm,
      comfort: cave.comfort,
      decorationCount: cave.decorations.length,
      decorationSlots: cave.decorationSlots,
      fieldCount: cave.spiritFields.filter(f => !f.locked).length,
      fieldSlots: cave.fieldSlots,
      cultivationBonus,
      visitorAttraction,
    },
    decorationTypes: Object.entries(DECORATION_TYPES).map(([name, cfg]) => ({
      name, icon: cfg.icon, category: cfg.category,
      charm: cfg.charm, comfort: cfg.comfort, cost: cfg.cost
    })),
    cropTypes: Object.entries(CROP_TYPES).map(([name, cfg]) => ({
      name, icon: cfg.icon, growTime: cfg.growTime, cost: cfg.cost
    })),
  });
});

// GET /api/cave/detail - 获取洞府详细信息（装饰物和灵田）
router.get('/detail', (req, res) => {
  const playerId = parseInt(req.query.player_id) || 1;
  const cave = caveDb.getOrCreateCave(playerId);

  // 更新所有灵田状态
  const fields = cave.spiritFields.map(field => ({
    ...field,
    ...getCropStatus(field),
  }));

  res.json({
    success: true,
    cave: {
      playerId: cave.playerId,
      charm: cave.charm,
      comfort: cave.comfort,
      decorations: cave.decorations,
      decorationSlots: cave.decorationSlots,
      spiritFields: fields,
      fieldSlots: cave.fieldSlots,
      totalHarvests: cave.totalHarvests,
      cultivationBonus: calcCultivationBonus(cave.comfort),
      visitorAttraction: calcVisitorAttraction(cave.charm),
    },
  });
});

// POST /api/cave/decoration/add - 添加装饰物
router.post('/decoration/add', (req, res) => {
  const { player_id, decoration_type, position } = req.body;
  const playerId = parseInt(player_id) || 1;
  const cave = caveDb.getOrCreateCave(playerId);

  // 验证装饰物类型
  const decoConfig = DECORATION_TYPES[decoration_type];
  if (!decoConfig) {
    return res.json({ success: false, message: '无效的装饰物类型' });
  }

  // 检查槽位
  if (cave.decorations.length >= cave.decorationSlots) {
    return res.json({ success: false, message: '装饰物槽位已满' });
  }

  // 检查是否已放置同类型装饰物（部分装饰物可重复放置）
  const repeatableTypes = ['灵芝草', '灵草', '九幽兰'];
  const existingSame = cave.decorations.find(d => d.type === decoration_type && !repeatableTypes.includes(decoration_type));
  if (existingSame) {
    return res.json({ success: false, message: '该装饰物已放置，请先移除' });
  }

  // 添加装饰物
  const deco = {
    id: genId(),
    type: decoration_type,
    pos: position || cave.decorations.length,
    placedAt: Date.now(),
  };
  cave.decorations.push(deco);

  // 重新计算属性
  caveDb.recalculateStats(cave);

  res.json({
    success: true,
    message: `已放置 ${decoConfig.icon} ${decoration_type}`,
    decoration: deco,
    charm: cave.charm,
    comfort: cave.comfort,
    cultivationBonus: calcCultivationBonus(cave.comfort),
  });
});

// POST /api/cave/decoration/remove - 移除装饰物
router.post('/decoration/remove', (req, res) => {
  const { player_id, decoration_id } = req.body;
  const playerId = parseInt(player_id) || 1;
  const cave = caveDb.getOrCreateCave(playerId);

  const idx = cave.decorations.findIndex(d => d.id === decoration_id);
  if (idx === -1) {
    return res.json({ success: false, message: '装饰物不存在' });
  }

  const removed = cave.decorations.splice(idx, 1)[0];
  const config = DECORATION_TYPES[removed.type];

  // 重新计算属性
  caveDb.recalculateStats(cave);

  res.json({
    success: true,
    message: `已移除 ${config?.icon || ''} ${removed.type}`,
    refund: config ? Math.floor(config.cost * 0.5) : 0, // 返还50%成本
    charm: cave.charm,
    comfort: cave.comfort,
    cultivationBonus: calcCultivationBonus(cave.comfort),
  });
});

// POST /api/cave/field/plant - 种植作物
router.post('/field/plant', (req, res) => {
  const { player_id, field_id, crop_type } = req.body;
  const playerId = parseInt(player_id) || 1;
  const cave = caveDb.getOrCreateCave(playerId);

  // 验证作物类型
  const cropConfig = CROP_TYPES[crop_type];
  if (!cropConfig) {
    return res.json({ success: false, message: '无效的作物类型' });
  }

  // 找到指定灵田
  const field = cave.spiritFields.find(f => f.id === field_id);
  if (!field) {
    return res.json({ success: false, message: '灵田不存在' });
  }
  if (field.locked) {
    return res.json({ success: false, message: '该灵田已锁定' });
  }
  if (field.cropType) {
    const status = getCropStatus(field);
    if (!status.ready) {
      return res.json({ success: false, message: '该灵田作物尚未成熟，无法种植新作物' });
    }
  }

  // 种植
  field.cropType = crop_type;
  field.plantedAt = Date.now();

  res.json({
    success: true,
    message: `已在灵田 ${field.icon || '🌱'} 种植 ${cropConfig.icon} ${crop_type}`,
    field: { ...field, ...getCropStatus(field) },
  });
});

// POST /api/cave/field/unlock - 解锁灵田槽位
router.post('/field/unlock', (req, res) => {
  const { player_id, field_id } = req.body;
  const playerId = parseInt(player_id) || 1;
  const cave = caveDb.getOrCreateCave(playerId);

  const field = cave.spiritFields.find(f => f.id === field_id);
  if (!field) {
    return res.json({ success: false, message: '灵田不存在' });
  }
  if (!field.locked) {
    return res.json({ success: false, message: '该灵田已是解锁状态' });
  }

  // 解锁费用递增
  const unlockCount = cave.spiritFields.filter(f => !f.locked).length;
  const unlockCost = 100 * Math.pow(2, unlockCount);

  // 简化检查：直接解锁（实际应检查玩家灵石）
  field.locked = false;

  res.json({
    success: true,
    message: `已解锁灵田，消耗灵石 ${unlockCost}`,
    fieldSlots: cave.fieldSlots,
    fieldCount: cave.spiritFields.filter(f => !f.locked).length,
  });
});

// POST /api/cave/field/harvest - 收获灵田
router.post('/field/harvest', (req, res) => {
  const { player_id, field_id } = req.body;
  const playerId = parseInt(player_id) || 1;
  const cave = caveDb.getOrCreateCave(playerId);

  const fieldIdx = cave.spiritFields.findIndex(f => f.id === field_id);
  if (fieldIdx === -1) {
    return res.json({ success: false, message: '灵田不存在' });
  }

  const field = cave.spiritFields[fieldIdx];
  const status = getCropStatus(field);

  if (!status.ready) {
    return res.json({
      success: false,
      message: `作物还需 ${Math.ceil(status.remaining / 1000)} 秒成熟`,
      remaining: status.remaining,
    });
  }

  const cropConfig = CROP_TYPES[field.cropType];
  if (!cropConfig) {
    return res.json({ success: false, message: '作物配置异常' });
  }

  // 计算收获数量
  const harvestAmount = Math.floor(Math.random() * (cropConfig.harvest.max - cropConfig.harvest.min + 1)) + cropConfig.harvest.min;

  // 收获结果
  const result = {
    type: field.cropType,
    icon: cropConfig.icon,
    amount: harvestAmount,
    resourceType: cropConfig.harvest.type,
    exp: cropConfig.exp,
  };

  // 清空灵田（保留类型便于续种）
  field.lastHarvest = Date.now();
  field.cropType = null;
  field.plantedAt = null;

  cave.totalHarvests++;
  cave.totalCultivationBonus += cropConfig.exp;

  res.json({
    success: true,
    message: `收获了 ${result.icon} ${result.type} x${result.amount}，获得修为 ${result.exp}`,
    harvest: result,
    totalHarvests: cave.totalHarvests,
  });
});

// POST /api/cave/field/harvest-all - 一键收获所有成熟灵田
router.post('/field/harvest-all', (req, res) => {
  const { player_id } = req.body;
  const playerId = parseInt(player_id) || 1;
  const cave = caveDb.getOrCreateCave(playerId);

  const results = [];
  let totalExp = 0;

  for (const field of cave.spiritFields) {
    if (field.locked || !field.cropType) continue;
    const status = getCropStatus(field);
    if (!status.ready) continue;

    const cropConfig = CROP_TYPES[field.cropType];
    const harvestAmount = Math.floor(Math.random() * (cropConfig.harvest.max - cropConfig.harvest.min + 1)) + cropConfig.harvest.min;

    results.push({
      fieldId: field.id,
      type: field.cropType,
      icon: cropConfig.icon,
      amount: harvestAmount,
      resourceType: cropConfig.harvest.type,
    });
    totalExp += cropConfig.exp;

    // 清空
    field.lastHarvest = Date.now();
    field.cropType = null;
    field.plantedAt = null;
    cave.totalHarvests++;
  }

  cave.totalCultivationBonus += totalExp;

  res.json({
    success: true,
    message: `一键收获 ${results.length} 个灵田，共获得修为 ${totalExp}`,
    harvests: results,
    totalExp,
    totalHarvests: cave.totalHarvests,
  });
});

// GET /api/cave/bonus - 获取洞府加成
router.get('/bonus', (req, res) => {
  const playerId = parseInt(req.query.player_id) || 1;
  const cave = caveDb.getOrCreateCave(playerId);

  const cultivationBonus = calcCultivationBonus(cave.comfort);
  const visitorAttraction = calcVisitorAttraction(cave.charm);

  res.json({
    success: true,
    bonuses: {
      cultivationRate: cultivationBonus,  // 修炼效率加成 %
      visitorCapacity: visitorAttraction,   // 可容纳访客数
      charm: cave.charm,
      comfort: cave.comfort,
    },
    description: {
      cultivationRate: `修炼效率 +${cultivationBonus}%（受舒适度影响）`,
      visitorCapacity: `可容纳 ${visitorAttraction} 位访客（受魅力值影响）`,
    },
  });
});

// POST /api/cave/upgrade-slots - 升级槽位
router.post('/upgrade-slots', (req, res) => {
  const { player_id, slot_type } = req.body;
  const playerId = parseInt(player_id) || 1;
  const cave = caveDb.getOrCreateCave(playerId);

  // 装饰物槽位升级
  if (slot_type === 'decoration') {
    const upgradeCost = Math.floor(500 * Math.pow(1.8, cave.decorationSlots - 12));
    // 简化：直接升级
    cave.decorationSlots += 4;
    res.json({ success: true, message: `装饰物槽位扩展至 ${cave.decorationSlots}，消耗灵石 ${upgradeCost}`, decorationSlots: cave.decorationSlots });
    return;
  }

  // 灵田槽位升级
  if (slot_type === 'field') {
    const upgradeCost = Math.floor(200 * Math.pow(2, cave.fieldSlots - 4));
    // 简化：直接升级并添加新槽位
    cave.fieldSlots += 1;
    cave.spiritFields.push({ id: genId(), cropType: null, plantedAt: null, lastHarvest: null, locked: true });
    res.json({ success: true, message: `灵田槽位扩展至 ${cave.fieldSlots}，消耗灵石 ${upgradeCost}`, fieldSlots: cave.fieldSlots });
    return;
  }

  res.json({ success: false, message: '无效的槽位类型' });
});

// GET /api/cave/stats - 获取洞府统计
router.get('/stats', (req, res) => {
  const playerId = parseInt(req.query.player_id) || 1;
  const cave = caveDb.getOrCreateCave(playerId);

  res.json({
    success: true,
    stats: {
      totalDecorations: cave.decorations.length,
      decorationSlots: cave.decorationSlots,
      totalFields: cave.spiritFields.filter(f => !f.locked).length,
      fieldSlots: cave.fieldSlots,
      totalHarvests: cave.totalHarvests,
      totalCultivationBonus: cave.totalCultivationBonus,
      charm: cave.charm,
      comfort: cave.comfort,
      cultivationBonus: calcCultivationBonus(cave.comfort),
      visitorAttraction: calcVisitorAttraction(cave.charm),
    },
  });
});

// GET /api/cave/ranking - 洞府魅力排行榜（必须在 /:player_id 之前，否则被误匹配）
router.get('/ranking', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.page_size) || 10;
  const offset = (page - 1) * pageSize;

  // 优先从数据库读取排行榜
  if (db) {
    try {
      // 先同步当前在线玩家的洞府数据到排行榜
      for (const [pid, cave] of caveDb.data) {
        syncCaveRanking(cave);
      }

      const totalRow = db.prepare('SELECT COUNT(*) as total FROM cave_rankings').get();
      const total = totalRow ? totalRow.total : 0;

      const ranks = db.prepare(`
        SELECT cr.player_id, cr.charm, cr.comfort, cr.decorations, cr.updated_at,
               COALESCE(u.nickname, '修士' || cr.player_id) as player_name,
               COALESCE(u.level, 1) as level
        FROM cave_rankings cr
        LEFT JOIN Users u ON u.id = cr.player_id
        ORDER BY cr.charm DESC, cr.comfort DESC
        LIMIT ? OFFSET ?
      `).all(pageSize, offset);

      const ranking = ranks.map((r, idx) => ({
        rank: offset + idx + 1,
        playerId: r.player_id,
        playerName: r.player_name,
        level: r.level,
        charm: r.charm,
        comfort: r.comfort,
        decorationCount: r.decorations,
        cultivationBonus: calcCultivationBonus(r.comfort),
        updatedAt: r.updated_at,
      }));

      return res.json({
        success: true,
        ranking,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    } catch (e) {
      console.log('[cave] 排行榜DB查询失败:', e.message);
    }
  }

  // Fallback: 从内存构建排行榜
  const allCaves = Array.from(caveDb.data.entries())
    .map(([playerId, cave]) => ({
      playerId,
      charm: cave.charm,
      comfort: cave.comfort,
      decorationCount: cave.decorations.length,
      cultivationBonus: calcCultivationBonus(cave.comfort),
    }))
    .sort((a, b) => b.charm - a.charm);

  const total = allCaves.length;
  const paged = allCaves.slice(offset, offset + pageSize).map((c, idx) => ({
    rank: offset + idx + 1,
    playerId: c.playerId,
    playerName: `修士${c.playerId}`,
    charm: c.charm,
    comfort: c.comfort,
    decorationCount: c.decorationCount,
    cultivationBonus: c.cultivationBonus,
  }));

  res.json({
    success: true,
    ranking: paged,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

// POST /api/cave/visit - 访问其他玩家的洞府
router.post('/visit', (req, res) => {
  const { host_id, visitor_id } = req.body;
  const visitorId = parseInt(visitor_id) || (req.userId || 1);
  const hostId = parseInt(host_id);

  if (!hostId || hostId === visitorId) {
    return res.json({ success: false, message: '无效的目标玩家' });
  }

  const cave = caveDb.getOrCreateCave(hostId);

  // 检查目标洞府是否有访客容量
  const capacity = calcVisitorAttraction(cave.charm);
  if (capacity === 0) {
    return res.json({ success: false, message: '该洞府魅力值不足，无法被访问' });
  }

  // 检查今日访问次数限制（每个玩家每天最多访问5次）
  let canVisit = true;
  if (db) {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const row = db.prepare(`
        SELECT COUNT(*) as cnt FROM cave_visits
        WHERE visitor_id = ? AND date(visited_at) = ?
      `).get(visitorId, todayStr);
      if (row && row.cnt >= 5) {
        canVisit = false;
      }
    } catch (e) {
      // ignore
    }
  }

  if (!canVisit) {
    return res.json({ success: false, message: '今日访问次数已达上限（5次/天）' });
  }

  // 记录访客
  if (db) {
    try {
      db.prepare(`
        INSERT INTO cave_visits (visitor_id, host_id, visited_at, reward_given)
        VALUES (?, ?, datetime('now'), 0)
      `).run(visitorId, hostId);
    } catch (e) {
      // ignore
    }
  }

  // 计算访问奖励
  const visitorReward = Math.min(50, Math.max(5, cave.charm * 2));
  const hostReward = Math.min(30, Math.max(3, cave.comfort));

  let hostName = `修士${hostId}`;
  let visitorName = `修士${visitorId}`;
  if (db) {
    try {
      const hostRow = db.prepare('SELECT nickname FROM Users WHERE id = ?').get(hostId);
      if (hostRow) hostName = hostRow.nickname;
      const visitorRow = db.prepare('SELECT nickname FROM Users WHERE id = ?').get(visitorId);
      if (visitorRow) visitorName = visitorRow.nickname;
    } catch (e) {
      // ignore
    }
  }

  res.json({
    success: true,
    message: `拜访了 ${hostName} 的洞府！`,
    visit: {
      hostId,
      hostName,
      visitorId,
      visitorName,
      visitedAt: new Date().toISOString(),
      visitorReward,
      hostReward,
      hostCharm: cave.charm,
      hostComfort: cave.comfort,
      hostCultivationBonus: calcCultivationBonus(cave.comfort),
    },
  });
});

// GET /api/cave/:player_id - 获取指定玩家的洞府详情（互访）（必须在 /ranking 之后）
router.get('/:player_id', (req, res) => {
  const hostId = parseInt(req.params.player_id) || 1;
  const visitorId = parseInt(req.query.visitor_id) || (req.userId || 1);

  // 不能访问自己的洞府（用 /detail）
  if (hostId === visitorId) {
    return res.json({ success: false, message: '请使用 /detail 查看自己的洞府' });
  }

  const cave = caveDb.getOrCreateCave(hostId);

  // 更新所有灵田状态
  const fields = cave.spiritFields.map(field => ({
    ...field,
    ...getCropStatus(field),
  }));

  // 查询今日访客记录
  let visitCountToday = 0;
  if (db) {
    try {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
      const row = db.prepare(`
        SELECT COUNT(*) as cnt FROM cave_visits
        WHERE host_id = ? AND date(visited_at) = ?
      `).get(hostId, todayStr);
      visitCountToday = row ? row.cnt : 0;
    } catch (e) {
      // ignore
    }
  }

  res.json({
    success: true,
    cave: {
      playerId: cave.playerId,
      charm: cave.charm,
      comfort: cave.comfort,
      decorations: cave.decorations,
      decorationSlots: cave.decorationSlots,
      spiritFields: fields,
      fieldSlots: cave.fieldSlots,
      totalHarvests: cave.totalHarvests,
      cultivationBonus: calcCultivationBonus(cave.comfort),
      visitorAttraction: calcVisitorAttraction(cave.charm),
      visitCountToday,
    },
    hostId,
  });
});

module.exports = router;
