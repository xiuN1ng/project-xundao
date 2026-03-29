const express = require('express');
const path = require('path');
const router = express.Router();

const Logger = {
  info: (...args) => console.log('[lottery]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[lottery:error]', new Date().toISOString(), ...args)
};

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  Logger.info('数据库连接成功');
} catch (err) {
  Logger.error('数据库连接失败:', err.message);
  db = {
    _data: {},
    prepare() { return this; },
    get() { return null; },
    all() { return []; },
    run() { return { changes: 0 }; }
  };
}

// ==================== 抽奖配置 ====================
const SINGLE_COST = 100;       // 单抽 100 灵石
const TEN_COST = 900;          // 十连 900 灵石（9折）
const GUARANTEE_COUNT = 90;     // 保底 90 抽

// 物品类型
const ITEM_TYPES = {
  LINGSHI: 'spirit_stones',     // 灵石
  Pill: 'pill',           // 丹药
  FRAGMENT: 'fragment',   // 装备碎片
  MATERIAL: 'material',   // 材料
  ARTIFACT: 'artifact'    // 法器
};

// 品质概率配置
const QUALITY_CONFIG = {
  normal:   { probability: 0.70, label: '普通', color: '#9E9E9E' },
  uncommon: { probability: 0.25, label: '精良', color: '#4CAF50' },
  rare:     { probability: 0.04, label: '史诗', color: '#9C27B0' },
  legendary:{ probability: 0.01, label: '传说', color: '#FF9800' }
};

// 奖池数据
const POOL = {
  // 普通品质 (70%)
  normal: [
    { type: ITEM_TYPES.LINGSHI,   name: '灵石',          icon: '💎', count: 200,  desc: '200灵石' },
    { type: ITEM_TYPES.LINGSHI,   name: '灵石',          icon: '💎', count: 500,  desc: '500灵石' },
    { type: ITEM_TYPES.LINGSHI,   name: '灵石',          icon: '💎', count: 1000, desc: '1000灵石' },
    { type: ITEM_TYPES.PILL,      name: '聚气丹',         icon: '💊', count: 1,    desc: '聚气丹×1' },
    { type: ITEM_TYPES.PILL,      name: '养气丹',         icon: '💊', count: 1,    desc: '养气丹×1' },
    { type: ITEM_TYPES.MATERIAL,  name: '灵气草',         icon: '🌿', count: 3,    desc: '灵气草×3' },
    { type: ITEM_TYPES.MATERIAL,  name: '灵石矿',         icon: '🪨', count: 2,    desc: '灵石矿×2' },
    { type: ITEM_TYPES.FRAGMENT,  name: '铁剑碎片',       icon: '🗡️', count: 1,    desc: '铁剑碎片×1' },
    { type: ITEM_TYPES.FRAGMENT,  name: '布甲碎片',       icon: '👕', count: 1,    desc: '布甲碎片×1' },
  ],
  // 精良品质 (25%)
  uncommon: [
    { type: ITEM_TYPES.LINGSHI,   name: '灵石',          icon: '💎', count: 2000, desc: '2000灵石' },
    { type: ITEM_TYPES.PILL,      name: '筑基丹',         icon: '💊', count: 1,    desc: '筑基丹×1' },
    { type: ITEM_TYPES.PILL,      name: '结金丹',         icon: '💊', count: 1,    desc: '结金丹×1' },
    { type: ITEM_TYPES.MATERIAL,  name: '玄铁',           icon: '⚙️', count: 1,    desc: '玄铁×1' },
    { type: ITEM_TYPES.FRAGMENT,  name: '仙剑碎片',       icon: '⚔️', count: 1,    desc: '仙剑碎片×1' },
    { type: ITEM_TYPES.FRAGMENT,  name: '仙甲碎片',       icon: '🛡️', count: 1,    desc: '仙甲碎片×1' },
    { type: ITEM_TYPES.ARTIFACT,  name: '下品法器',        icon: '🔮', count: 1,    desc: '下品法器×1' },
  ],
  // 史诗品质 (4%)
  rare: [
    { type: ITEM_TYPES.LINGSHI,   name: '灵石',          icon: '💎', count: 5000, desc: '5000灵石' },
    { type: ITEM_TYPES.PILL,      name: '元婴丹',         icon: '💊', count: 1,    desc: '元婴丹×1' },
    { type: ITEM_TYPES.PILL,      name: '化神丹',         icon: '💊', count: 1,    desc: '化神丹×1' },
    { type: ITEM_TYPES.FRAGMENT,  name: '仙剑·真',        icon: '⚔️', count: 2,    desc: '仙剑·真碎片×2' },
    { type: ITEM_TYPES.ARTIFACT,  name: '中品法器',        icon: '🔮', count: 1,    desc: '中品法器×1' },
  ],
  // 传说品质 (1%)
  legendary: [
    { type: ITEM_TYPES.LINGSHI,   name: '灵石',          icon: '💎', count: 20000, desc: '20000灵石' },
    { type: ITEM_TYPES.PILL,      name: '飞升丹',         icon: '💊', count: 1,    desc: '飞升丹×1' },
    { type: ITEM_TYPES.ARTIFACT,  name: '上品法器',        icon: '🔮', count: 1,    desc: '上品法器×1' },
    { type: ITEM_TYPES.FRAGMENT,  name: '天仙剑碎片',     icon: '⚔️', count: 3,    desc: '天仙剑碎片×3' },
  ]
};

// 内部记录：每个玩家的保底计数
const guaranteeMap = {}; // userId -> { count, lastGuaranteeTime }

function getGuaranteeInfo(userId) {
  if (!guaranteeMap[userId]) {
    guaranteeMap[userId] = { count: 0, lastGuaranteeTime: Date.now() };
  }
  return guaranteeMap[userId];
}

// 随机抽取品质（带保底逻辑）
function drawQuality(userId) {
  const gi = getGuaranteeInfo(userId);
  gi.count++;

  // 保底触发：90抽必出传说
  if (gi.count >= GUARANTEE_COUNT) {
    gi.count = 0;
    return 'legendary';
  }

  // 70/25/4/1 概率
  const rand = Math.random();
  let cumulative = 0;
  cumulative += QUALITY_CONFIG.normal.probability;     if (rand < cumulative) return 'normal';
  cumulative += QUALITY_CONFIG.uncommon.probability;    if (rand < cumulative) return 'uncommon';
  cumulative += QUALITY_CONFIG.rare.probability;        if (rand < cumulative) return 'rare';
  return 'legendary';
}

// 从奖池抽取物品
function drawItem(userId) {
  const quality = drawQuality(userId);
  const pool = POOL[quality];
  const item = pool[Math.floor(Math.random() * pool.length)];
  const cfg = QUALITY_CONFIG[quality];
  return { ...item, quality, qualityLabel: cfg.label, qualityColor: cfg.color };
}

// 将物品写入背包（player_items 表）
function addToBag(userId, item) {
  try {
    // 检查是否可叠加（灵石、丹药、材料）
    if ([ITEM_TYPES.LINGSHI, ITEM_TYPES.PILL, ITEM_TYPES.MATERIAL].includes(item.type)) {
      const existing = db.prepare(
        'SELECT * FROM player_items WHERE user_id = ? AND item_name = ? AND item_type = ?'
      ).get(String(userId), item.name, item.type);

      if (existing) {
        db.prepare('UPDATE player_items SET count = count + ? WHERE id = ?').run(item.count, existing.id);
        return { bagId: existing.id, stacked: true };
      }
    }

    // 不可叠加物品直接插入
    const result = db.prepare(
      'INSERT INTO player_items (user_id, item_id, item_name, item_type, icon, count, source) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(String(userId), item.id || 0, item.name, item.type, item.icon || '📦', item.count || 1, 'lottery');

    return { bagId: result.lastInsertRowid, stacked: false };
  } catch (err) {
    Logger.error('addToBag error:', err.message);
    // 降级：灵石直接加到玩家账户（写入 Users.lingshi，权威数据源）
    if (item.type === ITEM_TYPES.LINGSHI) {
      db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(item.count, userId);
      return { bagId: null, stacked: true, spirit_stonesAdded: item.count };
    }
    return { bagId: null, stacked: false };
  }
}

// ==================== API ====================

// GET / - 抽奖配置信息
router.get('/', (req, res) => {
  res.json({
    success: true,
    config: {
      singleCost: SINGLE_COST,
      tenCost: TEN_COST,
      guaranteeCount: GUARANTEE_COUNT,
      qualityConfig: QUALITY_CONFIG
    }
  });
});

// GET /info - 兼容客户端调用
router.get('/info', (req, res) => {
  res.json({
    success: true,
    data: {
      config: {
        singleCost: SINGLE_COST,
        tenCost: TEN_COST,
        guaranteeCount: GUARANTEE_COUNT,
        qualityConfig: QUALITY_CONFIG
      }
    }
  });
});

// GET /history - 抽奖历史
router.get('/history', (req, res) => {
  const userId = parseInt(req.query.userId) || 1;
  try {
    const history = db.prepare(
      'SELECT * FROM lottery_history WHERE user_id = ? ORDER BY id DESC LIMIT 50'
    ).all(userId);
    res.json({ success: true, history });
  } catch (err) {
    res.json({ success: true, history: [] });
  }
});

// POST /draw - 单抽
router.post('/draw', (req, res) => {
  const userId = parseInt(req.body.userId) || parseInt(req.body.player_id) || 1;
  const drawType = req.body.type || 'single';

  // 如果是十连，自动转发到 /drawTen 逻辑
  if (drawType === 'ten') {
    const tenHandler = require('./lottery')._drawTenHandler;
    if (tenHandler) {
      return tenHandler(req, res);
    }
    // 否则内联十连逻辑
    return handleDrawTen(req, res, userId);
  }

  try {
    const user = db.prepare('SELECT lingshi FROM Users WHERE id = ?').get(userId);
    if (!user || parseInt(user.lingshi) < SINGLE_COST) {
      return res.json({ success: false, message: '灵石不足' });
    }

    db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(SINGLE_COST, userId);

    const item = drawItem(userId);
    const bagResult = addToBag(userId, item);

    // 记录历史
    try {
      db.prepare(
        'INSERT INTO lottery_history (user_id, item_name, quality, created_at) VALUES (?, ?, ?, ?)'
      ).run(userId, item.name, item.quality, new Date().toISOString());
    } catch (e) { /* 历史表可能不存在 */ }

    // 获取当前保底进度
    const gi = getGuaranteeInfo(userId);

    res.json({
      success: true,
      item,
      bagResult,
      guaranteeProgress: `${gi.count}/${GUARANTEE_COUNT}`,
      lingshiCost: SINGLE_COST
    });
  } catch (err) {
    Logger.error('POST /draw error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// 十连抽处理函数（供 /draw type=ten 调用）
function handleDrawTen(req, res, userId) {
  try {
    const user = db.prepare('SELECT lingshi FROM Users WHERE id = ?').get(userId);
    if (!user || parseInt(user.lingshi) < TEN_COST) {
      return res.json({ success: false, message: '灵石不足（十连需要900灵石）' });
    }

    db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(TEN_COST, userId);

    const items = [];
    const bagResults = [];

    for (let i = 0; i < 10; i++) {
      const item = drawItem(userId);
      const bagResult = addToBag(userId, item);
      items.push(item);
      bagResults.push(bagResult);

      try {
        db.prepare(
          'INSERT INTO lottery_history (user_id, item_name, quality, created_at) VALUES (?, ?, ?, ?)'
        ).run(userId, item.name, item.quality, new Date().toISOString());
      } catch (e) { /* 历史表可能不存在 */ }
    }

    // 保证至少一件精良或以上
    const hasHighQuality = items.some(i => ['uncommon', 'rare', 'legendary'].includes(i.quality));
    if (!hasHighQuality) {
      const replacement = drawItem(userId);
      items[9] = replacement;
      bagResults[9] = addToBag(userId, replacement);
    }

    const gi = getGuaranteeInfo(userId);
    res.json({
      success: true,
      items,
      bagResults,
      guaranteeProgress: `${gi.count}/${GUARANTEE_COUNT}`,
      lingshiCost: TEN_COST
    });
  } catch (err) {
    Logger.error('POST /draw (ten) error:', err.message);
    res.json({ success: false, message: err.message });
  }
}

// 导出给 /draw type=ten 复用
module.exports._drawTenHandler = handleDrawTen;

// POST /drawTen - 十连抽
router.post('/drawTen', (req, res) => {
  const userId = parseInt(req.body.userId) || 1;

  try {
    const user = db.prepare('SELECT lingshi FROM Users WHERE id = ?').get(userId);
    if (!user || parseInt(user.lingshi) < TEN_COST) {
      return res.json({ success: false, message: '灵石不足（十连需要900灵石）' });
    }

    db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(TEN_COST, userId);

    const items = [];
    const bagResults = [];

    for (let i = 0; i < 10; i++) {
      const item = drawItem(userId);
      const bagResult = addToBag(userId, item);
      items.push(item);
      bagResults.push(bagResult);

      try {
        db.prepare(
          'INSERT INTO lottery_history (user_id, item_name, quality, created_at) VALUES (?, ?, ?, ?)'
        ).run(userId, item.name, item.quality, new Date().toISOString());
      } catch (e) { /* 历史表可能不存在 */ }
    }

    // 保证至少一件精良或以上
    const hasHighQuality = items.some(i => ['uncommon', 'rare', 'legendary'].includes(i.quality));
    if (!hasHighQuality) {
      // 替换最后一件为精良
      const replacement = drawItem(userId);
      items[9] = replacement;
      bagResults[9] = addToBag(userId, replacement);
    }

    const gi = getGuaranteeInfo(userId);

    res.json({
      success: true,
      items,
      bagResults,
      guaranteeProgress: `${gi.count}/${GUARANTEE_COUNT}`,
      lingshiCost: TEN_COST
    });
  } catch (err) {
    Logger.error('POST /drawTen error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

module.exports = router;
