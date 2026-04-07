/**
 * attributes.js - 修炼属性系统
 * P0-1: 实现攻击/防御/抗性/速度/暴击修炼字段(各10级)
 *
 * API:
 *   GET  /api/attributes/cultivation     - 获取玩家修炼属性
 *   POST /api/attributes/cultivation/upgrade - 升级修炼属性
 *
 * 修炼效果叠加到战斗属性
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const Database = require('better-sqlite3');

const Logger = {
  info: (...args) => console.log('[attributes]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[attributes:error]', new Date().toISOString(), ...args)
};

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db;
try {
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
// 修炼属性配置：5个属性 × 10级
// ============================================================
const CULTIVATION_ATTRS = {
  attack:       { name: '攻击修炼', icon: '⚔️', baseEffect: 5,  effectPerLevel: 5,  desc: '每级+5%攻击力' },
  defense:      { name: '防御修炼', icon: '🛡️', baseEffect: 5,  effectPerLevel: 5,  desc: '每级+5%防御力' },
  resistance:   { name: '抗性修炼', icon: '🔮', baseEffect: 3,  effectPerLevel: 3,  desc: '每级+3%伤害减免' },
  speed:        { name: '速度修炼', icon: '💨', baseEffect: 2,  effectPerLevel: 2,  desc: '每级+2速度' },
  crit:         { name: '暴击修炼', icon: '💥', baseEffect: 2,  effectPerLevel: 2,  desc: '每级+2%暴击率' },
};

// 每级升级消耗 (level 1→2 起, 到 level 9→10 满)
const UPGRADE_COSTS = {
  1:  { lingshi: 1000,  cultivationPower: 50  },
  2:  { lingshi: 2000,  cultivationPower: 100 },
  3:  { lingshi: 4000,  cultivationPower: 200 },
  4:  { lingshi: 8000,  cultivationPower: 400 },
  5:  { lingshi: 16000, cultivationPower: 800 },
  6:  { lingshi: 32000, cultivationPower: 1600 },
  7:  { lingshi: 64000, cultivationPower: 3200 },
  8:  { lingshi: 128000, cultivationPower: 6400 },
  9:  { lingshi: 256000, cultivationPower: 12800 },
  // level 10 is max, no further upgrade
};

// ============================================================
// 初始化 player_attributes 表
// ============================================================
function initAttributesTable() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS player_attributes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL UNIQUE,
        attack_cultivation INTEGER NOT NULL DEFAULT 0,
        defense_cultivation INTEGER NOT NULL DEFAULT 0,
        resistance_cultivation INTEGER NOT NULL DEFAULT 0,
        speed_cultivation INTEGER NOT NULL DEFAULT 0,
        crit_cultivation INTEGER NOT NULL DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    Logger.info('player_attributes 表初始化完成');
  } catch (e) {
    Logger.error('player_attributes 表初始化失败:', e.message);
  }
}
initAttributesTable();

// ============================================================
// 辅助函数
// ============================================================
function getPlayerId(req) {
  return Number(req.userId) || Number(req.query.userId) || Number(req.body?.userId) || 1;
}

function getPlayerResource(userId) {
  // 从 player 表获取灵石和修为值
  try {
    const player = db.prepare('SELECT spirit_stones, cultivation_power FROM player WHERE id = ?').get(userId);
    if (player) return player;
  } catch (e) {}
  // 回退
  return { spirit_stones: 0, cultivation_power: 0 };
}

function consumePlayerResource(userId, lingshi, cultivationPower) {
  try {
    if (lingshi > 0) {
      db.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?').run(lingshi, userId);
    }
    if (cultivationPower > 0) {
      // 从 cultivation 表扣减修为值
      db.prepare('UPDATE cultivation SET value = MAX(0, value - ?) WHERE user_id = ?').run(cultivationPower, userId);
    }
    return true;
  } catch (e) {
    Logger.error('consumePlayerResource error:', e.message);
    return false;
  }
}

function getOrCreateAttributes(playerId) {
  try {
    let attr = db.prepare('SELECT * FROM player_attributes WHERE player_id = ?').get(playerId);
    if (!attr) {
      db.prepare(`
        INSERT INTO player_attributes (player_id, attack_cultivation, defense_cultivation,
          resistance_cultivation, speed_cultivation, crit_cultivation)
        VALUES (?, 0, 0, 0, 0, 0)
      `).run(playerId);
      attr = db.prepare('SELECT * FROM player_attributes WHERE player_id = ?').get(playerId);
    }
    return attr;
  } catch (e) {
    Logger.error('getOrCreateAttributes error:', e.message);
    return null;
  }
}

// 计算某个修炼属性的战斗加成
function calcAttrBonus(attrKey, level) {
  if (level <= 0) return 0;
  const cfg = CULTIVATION_ATTRS[attrKey];
  // 第1级: baseEffect, 之后每级 +effectPerLevel
  // 公式: baseEffect + (level - 1) * effectPerLevel
  return cfg.baseEffect + (level - 1) * cfg.effectPerLevel;
}

// 计算所有修炼加成的总战斗加成
function calcAllBattleBonuses(attr) {
  return {
    attackBonus:       calcAttrBonus('attack',     attr.attack_cultivation),
    defenseBonus:      calcAttrBonus('defense',    attr.defense_cultivation),
    resistanceBonus:   calcAttrBonus('resistance', attr.resistance_cultivation),
    speedBonus:        calcAttrBonus('speed',      attr.speed_cultivation),
    critBonus:         calcAttrBonus('crit',      attr.crit_cultivation),
  };
}

// ============================================================
// GET /api/attributes/cultivation - 获取修炼属性
// ============================================================
router.get('/cultivation', (req, res) => {
  const playerId = getPlayerId(req);
  try {
    const attr = getOrCreateAttributes(playerId);
    if (!attr) return res.json({ success: false, message: '获取属性失败' });

    const resource = getPlayerResource(playerId);
    const bonuses = calcAllBattleBonuses(attr);

    // 构建每个属性的详情
    const details = {};
    for (const [key, cfg] of Object.entries(CULTIVATION_ATTRS)) {
      const level = attr[`${key}_cultivation`] || 0;
      const nextCost = level < 10 ? UPGRADE_COSTS[level] : null;
      const currentBonus = calcAttrBonus(key, level);
      const nextBonus = level < 10 ? calcAttrBonus(key, level + 1) : currentBonus;

      details[key] = {
        name: cfg.name,
        icon: cfg.icon,
        level,
        maxLevel: 10,
        currentBonus,
        nextBonus,
        desc: cfg.desc,
        nextCost: nextCost ? {
          lingshi: nextCost.lingshi,
          cultivationPower: nextCost.cultivationPower,
        } : null,
        progress: Math.floor((level / 10) * 100),
      };
    }

    res.json({
      success: true,
      playerId,
      resource: {
        spiritStones: resource.spirit_stones || 0,
        cultivationPower: resource.cultivation_power || 0,
      },
      bonuses,
      details,
    });
  } catch (err) {
    Logger.error('GET /cultivation error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// ============================================================
// POST /api/attributes/cultivation/upgrade - 升级修炼属性
// ============================================================
router.post('/cultivation/upgrade', (req, res) => {
  const playerId = getPlayerId(req);
  const { attribute } = req.body; // 'attack' | 'defense' | 'resistance' | 'speed' | 'crit'

  // 验证属性名
  if (!attribute || !CULTIVATION_ATTRS[attribute]) {
    return res.json({
      success: false,
      message: `无效的修炼属性: ${attribute}，可选: ${Object.keys(CULTIVATION_ATTRS).join(', ')}`
    });
  }

  try {
    const attr = getOrCreateAttributes(playerId);
    if (!attr) return res.json({ success: false, message: '获取属性失败' });

    const currentLevel = attr[`${attribute}_cultivation`] || 0;

    if (currentLevel >= 10) {
      return res.json({
        success: false,
        message: `${CULTIVATION_ATTRS[attribute].name}已达满级(10级)`
      });
    }

    // 获取升级消耗
    const cost = UPGRADE_COSTS[currentLevel + 1];
    if (!cost) {
      return res.json({ success: false, message: '已达满级，无法继续升级' });
    }

    // 检查资源是否足够
    const resource = getPlayerResource(playerId);
    if ((resource.spirit_stones || 0) < cost.lingshi) {
      return res.json({
        success: false,
        message: `灵石不足，需要 ${cost.lingshi}，当前 ${resource.spirit_stones || 0}`
      });
    }
    if ((resource.cultivation_power || 0) < cost.cultivationPower) {
      return res.json({
        success: false,
        message: `修为值不足，需要 ${cost.cultivationPower}，当前 ${resource.cultivation_power || 0}`
      });
    }

    // 扣减资源
    const consumed = consumePlayerResource(playerId, cost.lingshi, cost.cultivationPower);
    if (!consumed) {
      return res.json({ success: false, message: '资源扣减失败' });
    }

    // 升级属性
    const newLevel = currentLevel + 1;
    db.prepare(`UPDATE player_attributes SET ${attribute}_cultivation = ?, updated_at = CURRENT_TIMESTAMP WHERE player_id = ?`)
      .run(newLevel, playerId);

    // 重新获取更新后的数据
    const updatedAttr = getOrCreateAttributes(playerId);
    const bonuses = calcAllBattleBonuses(updatedAttr);

    const cfg = CULTIVATION_ATTRS[attribute];
    const nextCost = newLevel < 10 ? UPGRADE_COSTS[newLevel] : null;

    Logger.info(`[修炼属性升级] playerId=${playerId} attribute=${attribute} ${currentLevel}→${newLevel}`);

    res.json({
      success: true,
      message: `${cfg.icon} ${cfg.name} 升级成功！${currentLevel}级 → ${newLevel}级`,
      upgrade: {
        attribute,
        name: cfg.name,
        icon: cfg.icon,
        oldLevel: currentLevel,
        newLevel,
        cost: {
          lingshi: cost.lingshi,
          cultivationPower: cost.cultivationPower,
        },
        currentBonus: calcAttrBonus(attribute, newLevel),
        nextBonus: newLevel < 10 ? calcAttrBonus(attribute, newLevel + 1) : calcAttrBonus(attribute, newLevel),
        nextCost: nextCost ? {
          lingshi: nextCost.lingshi,
          cultivationPower: nextCost.cultivationPower,
        } : null,
      },
      bonuses,
      // 返回更新后的资源
      resource: {
        spiritStones: (resource.spirit_stones || 0) - cost.lingshi,
        cultivationPower: (resource.cultivation_power || 0) - cost.cultivationPower,
      },
    });
  } catch (err) {
    Logger.error('POST /cultivation/upgrade error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

module.exports = router;
