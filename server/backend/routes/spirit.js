/**
 * 器灵系统 API 路由
 * 封装 spirit_system.js 的数据接口
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'game.db');

let db = null;
function getDb() {
  if (!db) {
    const Database = require('better-sqlite3');
    db = new Database(DB_PATH);
    db.pragma('journal_mode=WAL');
    db.pragma('busy_timeout=5000');
  }
  return db;
}

function getPlayerId(req) {
  return parseInt(req.headers['x-player-id'] || req.query.player_id || req.body?.player_id || 1);
}

// ============ 模拟 spirit_system 数据 ============
const SPIRIT_QUALITY = {
  WHITE: 'white', GREEN: 'green', BLUE: 'blue', PURPLE: 'purple', ORANGE: 'orange', GOLD: 'gold'
};
const QUALITY_MULTIPLIER = {
  white: 1.0, green: 1.5, blue: 2.0, purple: 3.0, orange: 5.0, gold: 8.0
};

const SPIRITS_DATA = {
  'spirit_fire_sword': { id: 'spirit_fire_sword', name: '火焰剑灵', type: 'attack', quality: 'blue', baseStats: { atk: 50, crit: 5 }, skill: { name: '火焰斩', description: '攻击时额外造成30%火焰伤害' } },
  'spirit_thunder_blade': { id: 'spirit_thunder_blade', name: '雷鸣刀灵', type: 'attack', quality: 'purple', baseStats: { atk: 80, crit: 10 }, skill: { name: '雷鸣斩', description: '攻击时额外造成40%雷属性伤害' } },
  'spirit_ice_shield': { id: 'spirit_ice_shield', name: '寒冰盾灵', type: 'defense', quality: 'blue', baseStats: { def: 60, hp: 200 }, skill: { name: '寒冰护体', description: '受到攻击时减少15%伤害' } },
  'spirit_earth_guard': { id: 'spirit_earth_guard', name: '厚土守护灵', type: 'defense', quality: 'purple', baseStats: { def: 100, hp: 500 }, skill: { name: '大地之力', description: '受到攻击时减少25%伤害' } },
  'spirit_healing': { id: 'spirit_healing', name: '灵泉辅助灵', type: 'support', quality: 'green', baseStats: { hp_regen: 10, def: 20 }, skill: { name: '灵泉滋养', description: '每回合恢复3%最大生命' } },
  'spirit_wood_life': { id: 'spirit_wood_life', name: '长生木灵', type: 'support', quality: 'purple', baseStats: { hp_regen: 20, hp: 300 }, skill: { name: '生命绽放', description: '每回合恢复5%最大生命' } },
};

// GET /api/spirit - 获取器灵数据
router.get('/', (req, res) => {
  const playerId = getPlayerId(req);
  const database = getDb();
  try {
    // 获取玩家拥有的器灵
    let ownedSpirits = [];
    try {
      ownedSpirits = database.prepare('SELECT * FROM player_spirits WHERE player_id=?').all(playerId);
    } catch (e) { /* 表不存在 */ }

    const spirits = Object.entries(SPIRITS_DATA).map(([id, spirit]) => {
      const owned = ownedSpirits.find(s => s.spirit_id === id);
      const qualityMult = QUALITY_MULTIPLIER[spirit.quality] || 1.0;
      return {
        ...spirit,
        owned: !!owned,
        equipped: owned ? owned.equipped === 1 : false,
        activated: owned ? owned.activated === 1 : false,
        stats: {
          atk: Math.floor((spirit.baseStats.atk || 0) * qualityMult),
          def: Math.floor((spirit.baseStats.def || 0) * qualityMult),
          hp: Math.floor((spirit.baseStats.hp || 0) * qualityMult),
          crit: spirit.baseStats.crit || 0,
          hp_regen: spirit.baseStats.hp_regen || 0
        }
      };
    });

    res.json({ success: true, data: { spirits, total: spirits.length } });
  } catch (e) {
    console.error('[spirit] GET / error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/spirit/:id - 获取单个器灵详情
router.get('/:id', (req, res) => {
  const spirit = SPIRITS_DATA[req.params.id];
  if (!spirit) return res.status(404).json({ success: false, message: '器灵不存在' });
  res.json({ success: true, data: spirit });
});

module.exports = router;
