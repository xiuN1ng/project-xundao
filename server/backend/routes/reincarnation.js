/**
 * reincarnation.js - 轮回转生系统
 * P45: 天道轮回转生系统
 *
 * API:
 *   GET  /api/reincarnation/info         - 获取轮回信息
 *   GET  /api/reincarnation/insight      - 天道感悟积累
 *   GET  /api/reincarnation/talents      - 轮回天赋列表
 *   GET  /api/reincarnation/shop         - 轮回商店
 *   POST /api/reincarnation/rebirth      - 触发轮回重修
 *   POST /api/reincarnation/buy          - 购买轮回道具
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const Database = require('better-sqlite3');

const Logger = {
  info: (...args) => console.log('[reincarnation]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[reincarnation:error]', new Date().toISOString(), ...args),
  warn: (...args) => console.warn('[reincarnation:warn]', new Date().toISOString(), ...args)
};

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db;
try {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  initTables();
  Logger.info('数据库连接成功');
} catch (err) {
  Logger.error('数据库连接失败:', err.message);
  db = {
    prepare: () => ({ run: () => {}, get: () => null, all: () => [] }),
    exec: () => {}, transaction: () => ({ commit: () => {}, rollback: () => {} })
  };
}

// ============================================================
// 数据库初始化
// ============================================================
function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS reincarnation_data (
      player_id      INTEGER PRIMARY KEY,
      cycles         INTEGER DEFAULT 0,
      insight_points INTEGER DEFAULT 0,
      rebirth_count  INTEGER DEFAULT 0,
      total_insight_earned INTEGER DEFAULT 0,
      past_realms    TEXT DEFAULT '[]',
      highest_realm  INTEGER DEFAULT 2,
      highest_layer  INTEGER DEFAULT 0,
      created_at     INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at     INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS reincarnation_talents (
      player_id      INTEGER PRIMARY KEY,
      unlocked_talents TEXT DEFAULT '[]',
      talent_points   INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS reincarnation_shop_log (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id    INTEGER,
      item_id      TEXT,
      cost         INTEGER,
      bought_at    INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);
}

// ============================================================
// 轮回加成公式
// ============================================================
// 每轮回1次: 全属性+3% (可叠加)
// 每轮回+1境界: 额外+2%/层
// 轮回10层: 天道之眼 (看破敌人弱点)
// 轮回20层: 轮回净土 (离线收益+50%)

function calcPermanentBonus(cycles, highestLayer) {
  const basePct = cycles * 3;
  const layerBonus = highestLayer * 2;
  return {
    atk_pct:   basePct + layerBonus,
    def_pct:   basePct + layerBonus,
    hp_pct:    basePct + layerBonus,
    cult_speed_pct: basePct + layerBonus
  };
}

// ============================================================
// 轮回天赋配置
// ============================================================
const REINCARNATION_TALENTS = [
  { id: 'eye_of_heaven',    name: '天道之眼',      icon: '👁️', layer: 10,  desc: '战斗时显示敌人弱点，暴击率+15%',        effect: { crit: 15 } },
  { id: 'pure_land',        name: '轮回净土',      icon: '🏔️', layer: 20,  desc: '离线收益+50%，挂机经验+20%',            effect: { offline_bonus: 50, exp_bonus: 20 } },
  { id: 'soul_feedback',    name: '元神反馈',      icon: '🔮', layer: 5,   desc: '每次轮回后永久攻击+5%',                effect: { atk_pct: 5 } },
  { id: 'body_refined',     name: '百炼真身',      icon: '🛡️', layer: 5,   desc: '每次轮回后永久防御+5%',                effect: { def_pct: 5 } },
  { id: 'spirit_root_plus',  name: '灵根升华',      icon: '🌿', layer: 15,  desc: '修炼速度+30%，突破成功率+10%',          effect: { cult_speed_pct: 30, breakthrough_bonus: 10 } },
  { id: 'life_extend',      name: '寿元延绵',      icon: '⏳', layer: 8,   desc: '最大生命值+20%',                       effect: { hp_pct: 20 } },
  { id: 'fighting_soul',    name: '战魂不灭',      icon: '⚔️', layer: 12,  desc: '竞技场伤害+25%',                        effect: { pvp_damage: 25 } },
  { id: 'rebirth_blessing', name: '轮回祝福',      icon: '✨', layer: 3,   desc: '每次轮回保留10%天道感悟',              effect: { insight_keep_pct: 10 } },
  { id: 'heaven_step',      name: '步步登天',      icon: '🪜', layer: 7,   desc: '每升一境界额外获得境界奖励+15%',        effect: { realm_reward_bonus: 15 } },
  { id: 'destiny_overload', name: '命格强化',      icon: '⭐', layer: 18,  desc: '所有稀有掉落率+20%',                   effect: { rare_drop: 20 } },
];

// ============================================================
// 轮回商店道具
// ============================================================
const REINCARNATION_SHOP = [
  { id: 'rebirth_pill',       name: '轮回丹',      icon: '💊', cost: 500,  desc: '立即触发轮回重修，无需达到飞升期', usable: true },
  { id: '渡厄丹',            name: '渡厄丹',      icon: '💊', cost: 300,  desc: '轮回时保留50%天道感悟(不消耗)', usable: true },
  { id: '天道残卷',         name: '天道残卷',    icon: '📜', cost: 800,  desc: '随机解锁1个已满足条件的轮回天赋', usable: true },
  { id: '轮回钥匙',         name: '轮回钥匙',    icon: '🗝️', cost: 1000, desc: '解锁特定轮回层专属副本', usable: false },
  { id: '轮回印记',         name: '轮回印记',    icon: '🔮', cost: 200,  desc: '+1轮回层数(仅限已达飞升期)', usable: true },
  { id: '天悟果',           name: '天悟果',      icon: '🍎', cost: 150,  desc: '+1000天道感悟点', usable: true },
  { id: '轮回卷轴',         name: '轮回卷轴',    icon: '📜', cost: 600,  desc: '查看下一轮回层奖励预览', usable: true },
];

// ============================================================
// 境界ID映射 (用于past_realms记录)
// ============================================================
const REALM_NAMES = {
  1: '练气期', 2: '筑基期', 3: '金丹期', 4: '元婴期',
  5: '化神期', 6: '炼虚期', 7: '大乘期', 8: '渡劫期', 9: '飞升期'
};

// ============================================================
// Helper: 获取或初始化玩家轮回数据
// ============================================================
function getOrInitReincarnationData(playerId) {
  let data = db.prepare('SELECT * FROM reincarnation_data WHERE player_id = ?').get(playerId);
  if (!data) {
    db.prepare(`INSERT INTO reincarnation_data (player_id) VALUES (?)`).run(playerId);
    data = db.prepare('SELECT * FROM reincarnation_data WHERE player_id = ?').get(playerId);
  }
  let talents = db.prepare('SELECT * FROM reincarnation_talents WHERE player_id = ?').get(playerId);
  if (!talents) {
    db.prepare(`INSERT INTO reincarnation_talents (player_id) VALUES (?)`).run(playerId);
    talents = { unlocked_talents: '[]', talent_points: 0 };
  }
  return {
    ...data,
    unlocked_talents: JSON.parse(talents.unlocked_talents || '[]'),
    talent_points: talents.talent_points || 0
  };
}

// ============================================================
// API: 获取轮回信息
// GET /api/reincarnation/info
// ============================================================
router.get('/info', (req, res) => {
  const playerId = req.query.player_id || (req.user && req.user.player_id);
  if (!playerId) return res.json({ code: -1, msg: '缺少player_id' });

  const rd = getOrInitReincarnationData(playerId);
  const bonus = calcPermanentBonus(rd.cycles, rd.highest_layer);

  // 获取玩家当前境界
  let currentRealm = 2;
  let currentLayer = 0;
  try {
    const player = db.prepare('SELECT realm, layer FROM players WHERE id = ?').get(playerId);
    if (player) {
      currentRealm = player.realm || 2;
      currentLayer = player.layer || 0;
    }
  } catch (e) { /* ignore */ }

  res.json({
    code: 0,
    data: {
      cycles:           rd.cycles,
      insight_points:   rd.insight_points,
      total_insight:    rd.total_insight_earned,
      rebirth_count:    rd.rebirth_count,
      past_realms:      JSON.parse(rd.past_realms || '[]'),
      highest_realm:    rd.highest_realm,
      highest_layer:    rd.highest_layer,
      permanent_bonus:  bonus,
      current_realm:    currentRealm,
      current_layer:    currentLayer,
      current_realm_name: REALM_NAMES[currentRealm] || '凡人之躯',
      insight_to_next:  Math.max(0, (rd.cycles + 1) * 1000 - rd.insight_points),
      rebirth_unlocked: currentRealm >= 9, // 飞升期才可轮回
    }
  });
});

// ============================================================
// API: 天道感悟积累
// GET /api/reincarnation/insight
// ============================================================
router.get('/insight', (req, res) => {
  const playerId = req.query.player_id || (req.user && req.user.player_id);
  if (!playerId) return res.json({ code: -1, msg: '缺少player_id' });

  const rd = getOrInitReincarnationData(playerId);

  // 每世天道感悟记录
  const pastLives = JSON.parse(rd.past_realms || '[]');
  const totalEarned = rd.total_insight_earned;

  res.json({
    code: 0,
    data: {
      current_insight: rd.insight_points,
      total_earned: totalEarned,
      insight_per_rebirth: 1000,
      next_insight_at: (rd.cycles + 1) * 1000,
      past_lives: pastLives,
      bonus_from_insight: {
        atk_pct: Math.floor(rd.insight_points / 100) * 0.5,
        def_pct: Math.floor(rd.insight_points / 100) * 0.5,
        cult_speed_pct: Math.floor(rd.insight_points / 200) * 1
      }
    }
  });
});

// ============================================================
// API: 轮回天赋列表
// GET /api/reincarnation/talents
// ============================================================
router.get('/talents', (req, res) => {
  const playerId = req.query.player_id || (req.user && req.user.player_id);
  if (!playerId) return res.json({ code: -1, msg: '缺少player_id' });

  const rd = getOrInitReincarnationData(playerId);
  const unlocked = rd.unlocked_talents || [];

  const talentsWithStatus = REINCARNATION_TALENTS.map(t => ({
    ...t,
    unlocked: unlocked.includes(t.id),
    can_unlock: rd.cycles >= t.layer,
  }));

  res.json({
    code: 0,
    data: {
      talents: talentsWithStatus,
      talent_points: rd.talent_points,
      cycles: rd.cycles
    }
  });
});

// ============================================================
// API: 轮回商店
// GET /api/reincarnation/shop
// ============================================================
router.get('/shop', (req, res) => {
  const playerId = req.query.player_id || (req.user && req.user.player_id);
  if (!playerId) return res.json({ code: -1, msg: '缺少player_id' });

  const rd = getOrInitReincarnationData(playerId);

  // 获取玩家轮回积分 (可用于购买)
  const cyclePoints = rd.cycles * 100 + rd.insight_points;

  res.json({
    code: 0,
    data: {
      items: REINCARNATION_SHOP,
      cycle_points: cyclePoints,
      player_cycles: rd.cycles
    }
  });
});

// ============================================================
// API: 触发轮回重修
// POST /api/reincarnation/rebirth
// ============================================================
router.post('/rebirth', (req, res) => {
  const playerId = req.user && req.user.player_id;
  if (!playerId) return res.json({ code: -1, msg: '未登录' });

  const { confirm } = req.body;
  if (!confirm) return res.json({ code: -1, msg: '需要确认才能轮回' });

  const rd = getOrInitReincarnationData(playerId);

  // 检查是否达到飞升期
  let player;
  try {
    player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
  } catch (e) {
    return res.json({ code: -1, msg: '玩家数据不存在' });
  }

  if (!player) return res.json({ code: -1, msg: '玩家不存在' });

  const currentRealm = player.realm || 2;
  const currentLayer = player.layer || 0;

  if (currentRealm < 9) {
    return res.json({ code: -1, msg: `必须达到飞升期才能轮回，当前境界：${REALM_NAMES[currentRealm] || '未知'}` });
  }

  // 计算本世收获
  const insightGained = Math.floor(Math.random() * 500) + 200 + currentLayer * 50;
  const newCycles = rd.cycles + 1;
  const newRebirthCount = rd.rebirth_count + 1;

  // 记录past_realms
  const pastLives = JSON.parse(rd.past_realms || '[]');
  pastLives.unshift({
    realm: currentRealm,
    layer: currentLayer,
    insight_gained: insightGained,
    rebirth_num: newRebirthCount,
    timestamp: Date.now()
  });
  if (pastLives.length > 20) pastLives.pop(); // 只保留最近20世

  // 轮回：重置境界为练气期1层，保留部分天道感悟
  let insightKeepPct = 10; // 默认保留10%
  const unlocked = rd.unlocked_talents || [];
  if (unlocked.includes('rebirth_blessing')) insightKeepPct += 40; // 轮回祝福+40%

  const keptInsight = Math.floor(rd.insight_points * (insightKeepPct / 100));
  const resetInsight = rd.insight_points - keptInsight;

  // 开启新一世
  const newPastRealms = JSON.stringify(pastLives);
  const newHighestRealm = Math.max(rd.highest_realm, currentRealm);
  const newHighestLayer = Math.max(rd.highest_layer, newCycles);

  try {
    const tx = db.transaction(() => {
      // 更新轮回数据
      db.prepare(`
        UPDATE reincarnation_data SET
          cycles = ?, insight_points = ?, rebirth_count = ?,
          past_realms = ?, highest_realm = ?, highest_layer = ?,
          total_insight_earned = total_insight_earned + ?,
          updated_at = strftime('%s', 'now')
        WHERE player_id = ?
      `).run(newCycles, keptInsight, newRebirthCount, newPastRealms, newHighestRealm, newHighestLayer, resetInsight, playerId);

      // 重置玩家境界为练气期
      db.prepare(`UPDATE players SET realm = 2, layer = 1, hp = 100, max_hp = 100, attack = 10, defense = 5 WHERE id = ?`).run(playerId);

      // 检查并解锁新天赋
      const newTalents = [];
      for (const t of REINCARNATION_TALENTS) {
        if (newCycles >= t.layer && !unlocked.includes(t.id)) {
          newTalents.push(t.id);
        }
      }
      if (newTalents.length > 0) {
        const updated = [...unlocked, ...newTalents];
        db.prepare(`UPDATE reincarnation_talents SET unlocked_talents = ? WHERE player_id = ?`)
          .run(JSON.stringify(updated), playerId);
      }
    });
    tx.commit();

    const bonus = calcPermanentBonus(newCycles, newHighestLayer);

    res.json({
      code: 0,
      msg: '轮回重修成功！',
      data: {
        new_cycles: newCycles,
        rebirth_count: newRebirthCount,
        kept_insight: keptInsight,
        lost_insight: resetInsight,
        permanent_bonus: bonus,
        new_talents: newTalents || [],
        new_realm: 2,
        new_layer: 1,
        insight_gained_this_life: insightGained
      }
    });
  } catch (err) {
    Logger.error('轮回失败:', err.message);
    res.json({ code: -1, msg: '轮回失败: ' + err.message });
  }
});

// ============================================================
// API: 购买轮回商店道具
// POST /api/reincarnation/buy
// ============================================================
router.post('/buy', (req, res) => {
  const playerId = req.user && req.user.player_id;
  if (!playerId) return res.json({ code: -1, msg: '未登录' });

  const { item_id } = req.body;
  if (!item_id) return res.json({ code: -1, msg: '缺少item_id' });

  const item = REINCARNATION_SHOP.find(i => i.id === item_id);
  if (!item) return res.json({ code: -1, msg: '道具不存在' });

  const rd = getOrInitReincarnationData(playerId);
  const cyclePoints = rd.cycles * 100 + rd.insight_points;

  if (cyclePoints < item.cost) {
    return res.json({ code: -1, msg: `轮回积分不足，需要${item.cost}，当前${cyclePoints}` });
  }

  // 扣除积分，发放道具
  const newInsight = Math.max(0, rd.insight_points - item.cost);

  try {
    db.prepare(`UPDATE reincarnation_data SET insight_points = ? WHERE player_id = ?`).run(newInsight, playerId);

    // 记录购买
    db.prepare(`INSERT INTO reincarnation_shop_log (player_id, item_id, cost) VALUES (?, ?, ?)`)
      .run(playerId, item_id, item.cost);

    // 根据道具类型给玩家发放
    if (item_id === '天悟果') {
      const gained = 1000;
      db.prepare(`UPDATE reincarnation_data SET insight_points = insight_points + ? WHERE player_id = ?`).run(gained, playerId);
    }

    res.json({
      code: 0,
      msg: `购买成功，获得【${item.name}】！`,
      data: {
        item: item,
        remaining_points: rd.insight_points - item.cost
      }
    });
  } catch (err) {
    Logger.error('购买失败:', err.message);
    res.json({ code: -1, msg: '购买失败: ' + err.message });
  }
});

module.exports = router;

// ============================================================
// API: 解锁轮回天赋
// POST /api/reincarnation/talents/unlock
// ============================================================
router.post('/talents/unlock', (req, res) => {
  const playerId = req.user && req.user.player_id;
  if (!playerId) return res.json({ code: -1, msg: '未登录' });

  const { talent_id } = req.body;
  if (!talent_id) return res.json({ code: -1, msg: '缺少talent_id' });

  const talent = REINCARNATION_TALENTS.find(t => t.id === talent_id);
  if (!talent) return res.json({ code: -1, msg: '天赋不存在' });

  const rd = getOrInitReincarnationData(playerId);
  const unlocked = rd.unlocked_talents || [];

  if (unlocked.includes(talent_id)) {
    return res.json({ code: -1, msg: '已解锁此天赋' });
  }

  if (rd.cycles < talent.layer) {
    return res.json({ code: -1, msg: `需要达到${talent.layer}层轮回才能解锁` });
  }

  try {
    const newUnlocked = [...unlocked, talent_id];
    db.prepare(`UPDATE reincarnation_talents SET unlocked_talents = ? WHERE player_id = ?`)
      .run(JSON.stringify(newUnlocked), playerId);

    res.json({
      code: 0,
      msg: `解锁成功！获得天赋【${talent.name}】`,
      data: {
        talent_id: talent_id,
        talent_name: talent.name,
        unlocked_count: newUnlocked.length
      }
    });
  } catch (err) {
    Logger.error('解锁天赋失败:', err.message);
    res.json({ code: -1, msg: '解锁失败: ' + err.message });
  }
});

module.exports = router;
