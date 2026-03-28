const express = require('express');
const path = require('path');
const router = express.Router();

// ============ 数据库初始化 ============
const DB_PATH = path.join(__dirname, '..', 'data', 'game.db');
let db = null;

function getDb() {
  if (!db) {
    const Database = require('better-sqlite3');
  db = new Database(DB_PATH, { WAL: true, busyTimeout: 5000 });
    initTables();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS material_exchange_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      exchange_id TEXT NOT NULL,
      input_item TEXT NOT NULL,
      input_count INTEGER NOT NULL,
      output_item TEXT NOT NULL,
      output_count INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now', '+8 hours')),
      exchange_date TEXT DEFAULT (date('now', '+8 hours'))
    );

    CREATE TABLE IF NOT EXISTS material_exchange_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      exchange_id TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      last_date TEXT NOT NULL,
      UNIQUE(player_id, exchange_id)
    );
  `);
}

// ============ 材料兑换模板 ============
// exchangeId: { input: {id, name, count}, output: {id, name, count}, dailyLimit }
const EXCHANGE_TEMPLATES = {
  'iron_to_fire': {
    name: '铁矿炼火晶',
    description: '将5个铁锭炼化成1个火晶',
    input: { itemId: 'iron_ingot', itemName: '铁锭', count: 5 },
    output: { itemId: 'fire_crystal', itemName: '火晶', count: 1 },
    dailyLimit: 20,
    icon: '🔴'
  },
  'jade_to_pure': {
    name: '玉石提纯',
    description: '将3个玉石提纯为1个纯净玉髓',
    input: { itemId: 'jade', itemName: '玉石', count: 3 },
    output: { itemId: 'pure_jade', itemName: '纯净玉髓', count: 1 },
    dailyLimit: 15,
    icon: '💎'
  },
  'bone_to_essence': {
    name: '兽骨淬魂',
    description: '将5个兽骨淬炼为1份魂晶精华',
    input: { itemId: 'beast_bone', itemName: '兽骨', count: 5 },
    output: { itemId: 'soul_crystal', itemName: '魂晶精华', count: 1 },
    dailyLimit: 10,
    icon: '💀'
  },
  'wood_to_life': {
    name: '灵木生机',
    description: '将3个灵木炼化为1份生命精华',
    input: { itemId: 'spirit_wood', itemName: '灵木', count: 3 },
    output: { itemId: 'life_essence', itemName: '生命精华', count: 1 },
    dailyLimit: 15,
    icon: '🌿'
  },
  'stone_to_power': {
    name: '灵石锻魄',
    description: '将5个精炼石锻造成1份力量结晶',
    input: { itemId: 'refined_stone', itemName: '精炼石', count: 5 },
    output: { itemId: 'power_crystal', itemName: '力量结晶', count: 1 },
    dailyLimit: 10,
    icon: '⚡'
  },
  'cloth_to_armor': {
    name: '布甲裁剪',
    description: '将5块布料裁剪为1份护甲片',
    input: { itemId: 'cloth', itemName: '布料', count: 5 },
    output: { itemId: 'armor_shard', itemName: '护甲片', count: 1 },
    dailyLimit: 20,
    icon: '🛡️'
  },
  'spirit_to_core': {
    name: '灵气凝丹',
    description: '将10份灵气凝聚为1颗灵气核心',
    input: { itemId: 'spirit_air', itemName: '灵气', count: 10 },
    output: { itemId: 'spirit_core', itemName: '灵气核心', count: 1 },
    dailyLimit: 5,
    icon: '🌟'
  },
  'crystal_combine': {
    name: '晶石融合',
    description: '将3个低阶晶石融合为1个高阶晶石',
    input: { itemId: 'low_crystal', itemName: '低阶晶石', count: 3 },
    output: { itemId: 'high_crystal', itemName: '高阶晶石', count: 1 },
    dailyLimit: 10,
    icon: '💠'
  }
};

// ============ 工具函数 ============
function getShanghaiDateStr() {
  const d = new Date(Date.now() + 8 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

function extractUserId(req) {
  return parseInt(req.userId || req.query.userId || req.query.player_id || req.body.userId || req.body.player_id || 1);
}

// ============ 路由 ============

// GET /api/material-exchange/templates - 获取所有兑换模板
router.get('/templates', (req, res) => {
  try {
    const templates = Object.entries(EXCHANGE_TEMPLATES).map(([id, t]) => ({
      exchangeId: id,
      name: t.name,
      description: t.description,
      icon: t.icon,
      input: t.input,
      output: t.output,
      dailyLimit: t.dailyLimit
    }));
    res.json({ success: true, templates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/material-exchange/my - 获取玩家兑换记录和今日次数
router.get('/my', (req, res) => {
  try {
    const userId = extractUserId(req);
    const database = getDb();
    const today = getShanghaiDateStr();

    // 获取今日各兑换的次数
    const dailyRecords = database.prepare(
      'SELECT exchange_id, count FROM material_exchange_daily WHERE player_id = ? AND last_date = ?'
    ).all(userId, today);

    const dailyMap = {};
    dailyRecords.forEach(r => { dailyMap[r.exchange_id] = r.count; });

    // 获取最近兑换记录
    const recentRecords = database.prepare(
      'SELECT exchange_id, input_item, input_count, output_item, output_count, created_at FROM material_exchange_log WHERE player_id = ? ORDER BY id DESC LIMIT 20'
    ).all(userId);

    const templates = Object.entries(EXCHANGE_TEMPLATES).map(([id, t]) => ({
      exchangeId: id,
      name: t.name,
      icon: t.icon,
      input: t.input,
      output: t.output,
      dailyLimit: t.dailyLimit,
      usedToday: dailyMap[id] || 0,
      remainingToday: Math.max(0, t.dailyLimit - (dailyMap[id] || 0))
    }));

    res.json({ success: true, templates, recentRecords });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/material-exchange/exchange - 执行材料兑换
router.post('/exchange', (req, res) => {
  try {
    const userId = extractUserId(req);
    const { exchangeId } = req.body;

    if (!exchangeId || !EXCHANGE_TEMPLATES[exchangeId]) {
      return res.status(400).json({ error: '无效的兑换ID' });
    }

    const template = EXCHANGE_TEMPLATES[exchangeId];
    const database = getDb();
    const today = getShanghaiDateStr();

    // 检查今日次数
    const dailyRecord = database.prepare(
      'SELECT count FROM material_exchange_daily WHERE player_id = ? AND exchange_id = ? AND last_date = ?'
    ).get(userId, exchangeId, today);

    const usedToday = dailyRecord ? dailyRecord.count : 0;
    if (usedToday >= template.dailyLimit) {
      return res.status(400).json({
        error: `今日兑换次数已用完，该兑换每日限制${template.dailyLimit}次`,
        dailyLimit: template.dailyLimit,
        usedToday
      });
    }

    // 检查玩家背包是否有足够材料
    const playerItem = database.prepare(
      'SELECT * FROM player_items WHERE user_id = ? AND item_id = ?'
    ).get(String(userId), template.input.itemId);

    if (!playerItem || playerItem.count < template.input.count) {
      return res.status(400).json({
        error: `材料不足，需要${template.input.count}个${template.input.itemName}，当前拥有${playerItem ? playerItem.count : 0}个`
      });
    }

    // 扣除材料
    const newCount = playerItem.count - template.input.count;
    if (newCount <= 0) {
      database.prepare('DELETE FROM player_items WHERE id = ?').run(playerItem.id);
    } else {
      database.prepare('UPDATE player_items SET count = ? WHERE id = ?').run(newCount, playerItem.id);
    }

    // 写入玩家获得物品
    const existingOutput = database.prepare(
      'SELECT * FROM player_items WHERE user_id = ? AND item_id = ?'
    ).get(String(userId), template.output.itemId);

    if (existingOutput) {
      database.prepare('UPDATE player_items SET count = count + ? WHERE id = ?').run(template.output.count, existingOutput.id);
    } else {
      database.prepare(
        'INSERT INTO player_items (user_id, item_id, item_name, item_type, count, source) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(String(userId), template.output.itemId, template.output.itemName, 'material', template.output.count, 'material_exchange');
    }

    // 记录兑换日志
    database.prepare(
      'INSERT INTO material_exchange_log (player_id, exchange_id, input_item, input_count, output_item, output_count, exchange_date) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(userId, exchangeId, template.input.itemId, template.input.count, template.output.itemId, template.output.count, today);

    // 更新每日计数
    const upsertDaily = database.transaction(() => {
      const existing = database.prepare(
        'SELECT id, count FROM material_exchange_daily WHERE player_id = ? AND exchange_id = ?'
      ).get(userId, exchangeId);

      if (existing) {
        database.prepare(
          'UPDATE material_exchange_daily SET count = count + 1, last_date = ? WHERE id = ?'
        ).run(today, existing.id);
      } else {
        database.prepare(
          'INSERT INTO material_exchange_daily (player_id, exchange_id, count, last_date) VALUES (?, ?, 1, ?)'
        ).run(userId, exchangeId, today);
      }
    });
    upsertDaily();

    res.json({
      success: true,
      message: `成功兑换${template.output.count}个${template.output.itemName}`,
      exchangeId,
      spent: { itemId: template.input.itemId, itemName: template.input.itemName, count: template.input.count },
      gained: { itemId: template.output.itemId, itemName: template.output.itemName, count: template.output.count },
      usedToday: usedToday + 1,
      remainingToday: template.dailyLimit - usedToday - 1
    });
  } catch (err) {
    console.error('[material-exchange] exchange error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
