/**
 * 封印领域 API - server/backend/routes/sealed_realm.js
 * 封印魔物、领域探索、封印商店
 *
 * 端点:
 *   GET  /api/sealed-realm/info     - 获取封印领域信息
 *   POST /api/sealed-realm/battle   - 结算战斗结果
 *   POST /api/sealed-realm/explore  - 探索区域
 *   POST /api/sealed-realm/buy      - 购买商店道具
 *   POST /api/sealed-realm/exchange - 特殊兑换
 *   POST /api/sealed-realm/reset    - 重置每周挑战(管理员)
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// 数据库连接
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');
let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  initDB();
} catch (e) {
  console.log('[sealedRealm] DB连接失败:', e.message);
  db = null;
}

function initDB() {
  if (!db) return;
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS sealed_realm (
        user_id      INTEGER PRIMARY KEY,
        seal_level   INTEGER DEFAULT 1,
        seal_fragments INTEGER DEFAULT 0,
        attempts     INTEGER DEFAULT 5,
        last_reset   TEXT DEFAULT CURRENT_TIMESTAMP,
        created_at   TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at   TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sealed_realm_demons (
        user_id      INTEGER,
        demon_id     INTEGER,
        defeated     INTEGER DEFAULT 0,
        defeated_at  TEXT,
        PRIMARY KEY (user_id, demon_id)
      );

      CREATE TABLE IF NOT EXISTS sealed_realm_zones (
        user_id      INTEGER,
        zone_id      INTEGER,
        progress     INTEGER DEFAULT 0,
        cleared      INTEGER DEFAULT 0,
        updated_at   TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, zone_id)
      );

      CREATE TABLE IF NOT EXISTS sealed_realm_logs (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id      INTEGER,
        action       TEXT,
        detail       TEXT,
        created_at   TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (e) {
    console.error('[sealedRealm] initDB error:', e.message);
  }
}

//  демоны 基础数据 (50个 демона 分5个封印区)
const DEMON_TEMPLATES = [
  // 封印区1: 练气期 (1-10级)
  { id: 1,  name: '封印幽灵',     icon: '👻', realm: '练气后期',   hp_base: 5000,   difficulty: 'easy',     difficultyText: '简单',   sealFragment: 5,  zone: 1, unlockLevel: 1 },
  { id: 2,  name: '怨念魔',       icon: '😈', realm: '练气巅峰',   hp_base: 8000,   difficulty: 'easy',     difficultyText: '简单',   sealFragment: 8,  zone: 1, unlockLevel: 3 },
  { id: 3,  name: '噬魂蛛',       icon: '🕷️', realm: '筑基初期',   hp_base: 12000,  difficulty: 'normal',   difficultyText: '普通',   sealFragment: 12, zone: 1, unlockLevel: 5 },
  { id: 4,  name: '地狱三头犬',   icon: '🐕', realm: '筑基初期',   hp_base: 18000,  difficulty: 'normal',   difficultyText: '普通',   sealFragment: 18, zone: 1, unlockLevel: 7 },
  { id: 5,  name: '深渊领主',     icon: '👹', realm: '筑基中期',   hp_base: 25000,  difficulty: 'hard',     difficultyText: '困难',   sealFragment: 25, zone: 1, unlockLevel: 10, isBoss: true },
  // 封印区2: 筑基期 (11-20级)
  { id: 6,  name: '寒冰魔蛇',     icon: '🐍', realm: '筑基中期',   hp_base: 35000,  difficulty: 'normal',   difficultyText: '普通',   sealFragment: 20, zone: 2, unlockLevel: 11 },
  { id: 7,  name: '烈焰巨魔',     icon: '🔥', realm: '筑基后期',   hp_base: 50000,  difficulty: 'hard',     difficultyText: '困难',   sealFragment: 30, zone: 2, unlockLevel: 13 },
  { id: 8,  name: '雷霆巨鹰',     icon: '🦅', realm: '筑基巅峰',   hp_base: 70000,  difficulty: 'hard',     difficultyText: '困难',   sealFragment: 40, zone: 2, unlockLevel: 15 },
  { id: 9,  name: '暗黑骑士',     icon: '🗡️', realm: '金丹初期',   hp_base: 100000, difficulty: 'nightmare', difficultyText: '噩梦',  sealFragment: 55, zone: 2, unlockLevel: 18 },
  { id: 10, name: '虚空魔龙',     icon: '🐉', realm: '金丹初期',   hp_base: 150000, difficulty: 'nightmare', difficultyText: '噩梦',  sealFragment: 80, zone: 2, unlockLevel: 20, isBoss: true },
  // 封印区3: 金丹期 (21-35级)
  { id: 11, name: '剧毒蟾蜍',     icon: '🐸', realm: '金丹中期',   hp_base: 200000, difficulty: 'hard',     difficultyText: '困难',   sealFragment: 60, zone: 3, unlockLevel: 21 },
  { id: 12, name: '死亡骑士',     icon: '💀', realm: '金丹后期',   hp_base: 280000, difficulty: 'nightmare', difficultyText: '噩梦',  sealFragment: 85, zone: 3, unlockLevel: 24 },
  { id: 13, name: '幽冥巨蟒',     icon: '🐲', realm: '金丹巅峰',   hp_base: 350000, difficulty: 'nightmare', difficultyText: '噩梦',  sealFragment: 110, zone: 3, unlockLevel: 27 },
  { id: 14, name: '堕落天使',     icon: '👼', realm: '元婴初期',   hp_base: 450000, difficulty: 'hell',      difficultyText: '地狱',  sealFragment: 140, zone: 3, unlockLevel: 30 },
  { id: 15, name: '修罗魔尊',     icon: '👺', realm: '元婴初期',   hp_base: 600000, difficulty: 'hell',      difficultyText: '地狱',  sealFragment: 200, zone: 3, unlockLevel: 35, isBoss: true },
  // 封印区4: 元婴期 (36-50级)
  { id: 16, name: '冰霜巨人',     icon: '🧊', realm: '元婴中期',   hp_base: 800000, difficulty: 'nightmare', difficultyText: '噩梦',  sealFragment: 180, zone: 4, unlockLevel: 36 },
  { id: 17, name: '炼狱火凤',     icon: '🦅', realm: '元婴后期',   hp_base: 1000000, difficulty: 'hell',    difficultyText: '地狱',  sealFragment: 250, zone: 4, unlockLevel: 39 },
  { id: 18, name: '冥王哈迪斯',   icon: '💀', realm: '元婴巅峰',   hp_base: 1300000, difficulty: 'hell',    difficultyText: '地狱',  sealFragment: 320, zone: 4, unlockLevel: 42 },
  { id: 19, name: '混沌魔兽',     icon: '🐛', realm: '化神初期',   hp_base: 1600000, difficulty: 'hell',    difficultyText: '地狱',  sealFragment: 400, zone: 4, unlockLevel: 45 },
  { id: 20, name: '吞天魔蛙',     icon: '🐸', realm: '化神初期',   hp_base: 2000000, difficulty: 'hell',    difficultyText: '地狱',  sealFragment: 500, zone: 4, unlockLevel: 50, isBoss: true },
  // 封印区5: 化神期+ (51+级)
  { id: 21, name: '时空裂隙兽',   icon: '🌀', realm: '化神中期',   hp_base: 3000000, difficulty: 'hell',    difficultyText: '地狱',  sealFragment: 600, zone: 5, unlockLevel: 51 },
  { id: 22, name: '星辰巨兽',     icon: '⭐', realm: '化神后期',   hp_base: 4000000, difficulty: 'hell',    difficultyText: '地狱',  sealFragment: 750, zone: 5, unlockLevel: 55 },
  { id: 23, name: '太古凶兽',     icon: '🦖', realm: '化神巅峰',   hp_base: 5000000, difficulty: 'hell',    difficultyText: '地狱',  sealFragment: 900, zone: 5, unlockLevel: 60 },
  { id: 24, name: '命运魔神',     icon: '🎭', realm: '大乘初期',   hp_base: 7000000, difficulty: 'hell',    difficultyText: '地狱',  sealFragment: 1200, zone: 5, unlockLevel: 65 },
  { id: 25, name: '万魔之王',     icon: '👑', realm: '大乘初期',   hp_base: 10000000, difficulty: 'hell',   difficultyText: '地狱',  sealFragment: 2000, zone: 5, unlockLevel: 70, isBoss: true },
];

// 探索区域
const ZONE_TEMPLATES = [
  { id: 1, name: '幽魂荒原', icon: '🏜️', progress: 0, cleared: false, unlockReq: null,      rewards: ['💎灵石', '🪨材料'],    prerequisite: null },
  { id: 2, name: '迷雾森林', icon: '🌲', progress: 0, cleared: false, unlockReq: 'zone_1_80', rewards: ['🌿灵草', '💊丹药'],    prerequisite: { zone: 1, progress: 80 } },
  { id: 3, name: '深渊矿洞', icon: '⛏️', progress: 0, cleared: false, unlockReq: 'zone_2_80', rewards: ['💎灵石', '🪨矿石'],   prerequisite: { zone: 2, progress: 80 } },
  { id: 4, name: '封印废墟', icon: '🏛️', progress: 0, cleared: false, unlockReq: 'zone_3_80', rewards: ['🔮封印道具', '✨稀有'], prerequisite: { zone: 3, progress: 80 } },
  { id: 5, name: '万魔领域', icon: '👹', progress: 0, cleared: false, unlockReq: 'zone_4_80', rewards: ['💎灵石x3', '🔮封印图纸'], prerequisite: { zone: 4, progress: 80 } },
];

// 商店物品
const SHOP_ITEMS = [
  { id: 1, name: '灵石袋',       icon: '💎', desc: '随机获得500-2000灵石',    cost: 20,  type: 'lingshi',   amount: [500, 2000] },
  { id: 2, name: '灵草包',       icon: '🌿', desc: '随机获得10-50灵草',      cost: 15,  type: 'herb',      amount: [10, 50] },
  { id: 3, name: '强化石',       icon: '🪨', desc: '装备强化材料',            cost: 30,  type: 'material', amount: [1, 3] },
  { id: 4, name: '经验丹',       icon: '💊', desc: '服用后获得大量经验',      cost: 40,  type: 'exp',       amount: [1000, 5000] },
  { id: 5, name: '封印令牌',     icon: '🎫', desc: '封印领域额外挑战次数',    cost: 50,  type: 'attempt',  amount: [1, 1] },
  { id: 6, name: '随机宝石',     icon: '💠', desc: '随机属性宝石一颗',        cost: 60,  type: 'gem',       amount: [1, 1] },
];

const SPECIAL_ITEMS = [
  { id: 1, name: '封印之魂',   icon: '👻', desc: '兑换封印系绝技残页',   cost: 200, reward_type: 'skill_fragment' },
  { id: 2, name: '领域图纸·上', icon: '📜', desc: '制作专属封印武器(上篇)', cost: 300, reward_type: 'blueprint' },
  { id: 3, name: '万魔精魄',   icon: '💀', desc: '稀有收藏品,展示用',     cost: 500, reward_type: 'trophy' },
];

// 获取/初始化玩家封印领域数据
function getOrCreatePlayerData(userId) {
  if (!db) return null;
  try {
    const row = db.prepare('SELECT * FROM sealed_realm WHERE user_id = ?').get(userId);
    if (row) return row;

    db.prepare(`INSERT INTO sealed_realm (user_id, seal_level, seal_fragments, attempts, last_reset) VALUES (?, 1, 0, 5, datetime('now'))`).run(userId);
    return db.prepare('SELECT * FROM sealed_realm WHERE user_id = ?').get(userId);
  } catch (e) {
    console.error('[sealedRealm] getOrCreatePlayerData error:', e.message);
    return null;
  }
}

// 获取玩家 демон 状态
function getPlayerDemons(userId) {
  if (!db) return {};
  try {
    const rows = db.prepare('SELECT demon_id, defeated FROM sealed_realm_demons WHERE user_id = ?').all(userId);
    const map = {};
    rows.forEach(r => { map[r.demon_id] = r.defeated === 1; });
    return map;
  } catch (e) {
    return {};
  }
}

// 获取玩家区域状态
function getPlayerZones(userId) {
  if (!db) return {};
  try {
    const rows = db.prepare('SELECT zone_id, progress, cleared FROM sealed_realm_zones WHERE user_id = ?').all(userId);
    const map = {};
    rows.forEach(r => { map[r.zone_id] = { progress: r.progress, cleared: r.cleared === 1 }; });
    return map;
  } catch (e) {
    return {};
  }
}

// 记录日志
function addLog(userId, action, detail) {
  if (!db) return;
  try {
    db.prepare('INSERT INTO sealed_realm_logs (user_id, action, detail) VALUES (?, ?, ?)').run(userId, action, detail);
  } catch (e) {
    console.error('[sealedRealm] addLog error:', e.message);
  }
}

// 计算当前封印等级 (根据击败 демона 数量)
function calcSealLevel(defeatedCount) {
  if (defeatedCount >= 20) return 5;
  if (defeatedCount >= 15) return 4;
  if (defeatedCount >= 10) return 3;
  if (defeatedCount >= 5) return 2;
  return 1;
}

// 格式化 демона (根据玩家等级计算实际HP)
function formatDemon(demon, playerLevel, defeated, playerRealm) {
  const realmOrder = ['练气', '筑基', '金丹', '元婴', '化神', '大乘', '渡劫', '真仙'];
  const realmIdx = realmOrder.findIndex(r => playerRealm && playerRealm.includes(r));
  const levelBonus = Math.max(0, (realmIdx >= 0 ? realmIdx : 0)) * 0.2;
  const hpMultiplier = 1 + (playerLevel - demon.unlockLevel) * 0.05 + levelBonus;
  const actualHp = Math.floor(demon.hp_base * Math.max(0.5, hpMultiplier));

  const realmReq = demon.zone === 1 ? '练气期' :
                   demon.zone === 2 ? '筑基期' :
                   demon.zone === 3 ? '金丹期' :
                   demon.zone === 4 ? '元婴期' : '化神期';

  return {
    id: demon.id,
    name: demon.name,
    icon: demon.icon,
    realm: demon.realm,
    hp: actualHp,
    difficulty: demon.difficulty,
    difficultyText: demon.difficultyText,
    rewards: [
      { icon: '💎', text: '灵石', amount: Math.floor(demon.sealFragment * 8) },
      { icon: '🪨', text: '材料', amount: Math.floor(demon.sealFragment / 3) },
    ],
    sealFragment: demon.sealFragment,
    unlocked: playerLevel >= demon.unlockLevel,
    unlockReq: `${realmReq}${demon.unlockLevel}级`,
    defeated: defeated,
    isBoss: !!demon.isBoss,
  };
}

// 格式化区域
function formatZone(zone, playerData, allZoneData) {
  const prereq = zone.prerequisite;
  let unlocked = true;
  let unlockHint = null;

  if (prereq) {
    const prevZone = allZoneData[prereq.zone] || {};
    unlocked = prevZone.progress >= prereq.progress;
    unlockHint = unlocked ? null : `需要 ${ZONE_TEMPLATES[prereq.zone - 1].name} 探索度 ${prereq.progress}%`;
  }

  return {
    id: zone.id,
    name: zone.name,
    icon: zone.icon,
    progress: playerData.progress || 0,
    unlocked: unlocked,
    cleared: playerData.cleared || false,
    unlockReq: unlockHint,
    rewards: zone.rewards,
  };
}

// ============ 路由 ============

// GET /api/sealed-realm/info - 获取封印领域信息
router.get('/info', (req, res) => {
  const userId = req.user ? req.user.id : req.session?.userId || 1;

  try {
    const playerData = getOrCreatePlayerData(userId);
    if (!playerData) {
      return res.json({ code: 1, message: '数据库未初始化', data: null });
    }

    // 获取玩家等级 (从 player 表)
    let playerLevel = 1, playerRealm = '练气期';
    if (db) {
      try {
        const p = db.prepare('SELECT level, realm FROM players WHERE id = ?').get(userId);
        if (p) { playerLevel = p.level || 1; playerRealm = p.realm || '练气期'; }
      } catch (e) {}
    }

    const demonStates = getPlayerDemons(userId);
    const zoneStates = getPlayerZones(userId);
    const defeatedCount = Object.values(demonStates).filter(Boolean).length;
    const sealLevel = calcSealLevel(defeatedCount);

    // 计算总体封印进度
    const totalSealProgress = Math.min(100, Math.floor((defeatedCount / DEMON_TEMPLATES.length) * 100));

    // 探索进度
    const exploreProgress = Math.floor(
      Object.values(zoneStates).reduce((sum, z) => sum + (z.progress || 0), 0) / ZONE_TEMPLATES.length
    );

    const demons = DEMON_TEMPLATES.map(d =>
      formatDemon(d, playerLevel, !!demonStates[d.id], playerRealm)
    );

    const zones = ZONE_TEMPLATES.map(z =>
      formatZone(z, zoneStates[z.id] || {}, zoneStates)
    );

    res.json({
      code: 0,
      data: {
        sealLevel,
        progress: totalSealProgress,
        exploreProgress,
        demons,
        zones,
        remainingAttempts: playerData.attempts,
        maxAttempts: 5,
        currentSealProgress: totalSealProgress,
        sealFragments: playerData.seal_fragments,
        shopItems: SHOP_ITEMS,
        specialItems: SPECIAL_ITEMS,
      },
      message: 'success',
    });
  } catch (e) {
    console.error('[sealedRealm] /info error:', e);
    res.json({ code: 1, message: e.message, data: null });
  }
});

// POST /api/sealed-realm/battle - 结算战斗结果
router.post('/battle', (req, res) => {
  const userId = req.user ? req.user.id : req.session?.userId || 1;
  const { demon_id, victory, damage_taken } = req.body;

  try {
    const playerData = getOrCreatePlayerData(userId);
    if (!playerData) return res.json({ code: 1, message: '数据库错误', data: null });

    if (playerData.attempts <= 0) {
      return res.json({ code: 2, message: '挑战次数已用尽', data: null });
    }

    const demon = DEMON_TEMPLATES.find(d => d.id === demon_id);
    if (!demon) return res.json({ code: 3, message: ' демон 不存在', data: null });

    // 检查是否已击败
    const existing = db ? db.prepare('SELECT defeated FROM sealed_realm_demons WHERE user_id = ? AND demon_id = ?').get(userId, demon_id) : null;
    if (existing && existing.defeated) {
      return res.json({ code: 4, message: '该 демон 已击败', data: null });
    }

    // 获取玩家等级
    let playerLevel = 1;
    if (db) {
      try {
        const p = db.prepare('SELECT level FROM players WHERE id = ?').get(userId);
        if (p) playerLevel = p.level || 1;
      } catch (e) {}
    }

    if (playerLevel < demon.unlockLevel) {
      return res.json({ code: 5, message: '等级不足,无法挑战', data: null });
    }

    // 消耗次数
    if (db) {
      db.prepare('UPDATE sealed_realm SET attempts = attempts - 1, updated_at = datetime("now") WHERE user_id = ?').run(userId);
    }

    let reward = { sealFragment: 0, lingshi: 0 };
    if (victory) {
      // 胜利: 记录击败状态
      if (db) {
        db.prepare(`INSERT OR REPLACE INTO sealed_realm_demons (user_id, demon_id, defeated, defeated_at) VALUES (?, ?, 1, datetime('now'))`).run(userId, demon_id);
        // 增加封印碎片
        db.prepare('UPDATE sealed_realm SET seal_fragments = seal_fragments + ?, updated_at = datetime("now") WHERE user_id = ?').run(demon.sealFragment, userId);
      }
      reward = {
        sealFragment: demon.sealFragment,
        lingshi: demon.sealFragment * 8,
        materials: Math.floor(demon.sealFragment / 3),
      };

      // 增加灵石
      if (db) {
        try {
          db.prepare('UPDATE players SET lingshi = lingshi + ? WHERE id = ?').run(reward.lingshi, userId);
        } catch (e) {}
      }

      addLog(userId, 'battle_win', `击败 демон ${demon.name}(id=${demon_id}), 获得封印碎片x${demon.sealFragment}`);
    } else {
      // 失败: 不减少封印碎片,只扣次数
      addLog(userId, 'battle_lose', `挑战 демон ${demon.name}(id=${demon_id})失败`);
    }

    // 重新计算封印等级
    const demonStates = getPlayerDemons(userId);
    const defeatedCount = Object.values(demonStates).filter(Boolean).length;
    const newSealLevel = calcSealLevel(defeatedCount);
    const totalProgress = Math.min(100, Math.floor((defeatedCount / DEMON_TEMPLATES.length) * 100));

    res.json({
      code: 0,
      data: {
        victory,
        reward,
        newSealLevel,
        totalProgress,
        remainingAttempts: Math.max(0, playerData.attempts - 1),
      },
      message: victory ? '挑战成功!' : '挑战失败',
    });
  } catch (e) {
    console.error('[sealedRealm] /battle error:', e);
    res.json({ code: 1, message: e.message, data: null });
  }
});

// POST /api/sealed-realm/explore - 探索区域
router.post('/explore', (req, res) => {
  const userId = req.user ? req.user.id : req.session?.userId || 1;
  const { zone_id } = req.body;

  try {
    const zone = ZONE_TEMPLATES.find(z => z.id === zone_id);
    if (!zone) return res.json({ code: 3, message: '区域不存在', data: null });

    const zoneStates = getPlayerZones(userId);
    const currentProgress = zoneStates[zone_id]?.progress || 0;

    if (currentProgress >= 100) {
      return res.json({ code: 4, message: '该区域已探索完毕', data: null });
    }

    // 成功率 70%, 每次探索增加 5-15% 进度
    const success = Math.random() > 0.3;
    const gain = success ? Math.floor(5 + Math.random() * 10) : 0;
    const newProgress = Math.min(100, currentProgress + gain);
    const cleared = newProgress >= 100;

    if (db) {
      db.prepare(`INSERT OR REPLACE INTO sealed_realm_zones (user_id, zone_id, progress, cleared, updated_at) VALUES (?, ?, ?, ?, datetime('now'))`).run(userId, zone_id, newProgress, cleared ? 1 : 0);
    }

    addLog(userId, 'explore', `探索 ${zone.name}, ${success ? '成功+' + gain + '%' : '失败'}, 当前进度 ${newProgress}%`);

    res.json({
      code: 0,
      data: {
        zoneId: zone_id,
        success,
        gain,
        newProgress,
        cleared,
        rewards: cleared ? zone.rewards : null,
      },
      message: success ? `探索成功! +${gain}%` : '探索失败',
    });
  } catch (e) {
    console.error('[sealedRealm] /explore error:', e);
    res.json({ code: 1, message: e.message, data: null });
  }
});

// POST /api/sealed-realm/buy - 购买商店道具
router.post('/buy', (req, res) => {
  const userId = req.user ? req.user.id : req.session?.userId || 1;
  const { item_id } = req.body;

  try {
    const item = SHOP_ITEMS.find(i => i.id === item_id);
    if (!item) return res.json({ code: 3, message: '物品不存在', data: null });

    const playerData = getOrCreatePlayerData(userId);
    if (!playerData || playerData.seal_fragments < item.cost) {
      return res.json({ code: 4, message: '封印碎片不足', data: null });
    }

    // 扣除封印碎片
    if (db) {
      db.prepare('UPDATE sealed_realm SET seal_fragments = seal_fragments - ?, updated_at = datetime("now") WHERE user_id = ?').run(item.cost, userId);
    }

    // 发放奖励
    let reward = {};
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    switch (item.type) {
      case 'lingshi':
        reward.lingshi = rand(item.amount[0], item.amount[1]);
        if (db) {
          try { db.prepare('UPDATE players SET lingshi = lingshi + ? WHERE id = ?').run(reward.lingshi, userId); } catch (e) {}
        }
        break;
      case 'herb':
        reward.herbs = rand(item.amount[0], item.amount[1]);
        if (db) {
          try { db.prepare('UPDATE players SET herbs = herbs + ? WHERE id = ?').run(reward.herbs, userId); } catch (e) {}
        }
        break;
      case 'attempt':
        reward.attempts = item.amount[0];
        if (db) {
          try { db.prepare('UPDATE sealed_realm SET attempts = attempts + ? WHERE user_id = ?').run(reward.attempts, userId); } catch (e) {}
        }
        break;
      default:
        reward.items = [{ icon: item.icon, name: item.name, amount: 1 }];
    }

    addLog(userId, 'buy', `购买 ${item.name}, 花费 ${item.cost} 封印碎片`);

    res.json({
      code: 0,
      data: { item, reward },
      message: `购买了 ${item.name}`,
    });
  } catch (e) {
    console.error('[sealedRealm] /buy error:', e);
    res.json({ code: 1, message: e.message, data: null });
  }
});

// POST /api/sealed-realm/exchange - 特殊兑换
router.post('/exchange', (req, res) => {
  const userId = req.user ? req.user.id : req.session?.userId || 1;
  const { item_id } = req.body;

  try {
    const item = SPECIAL_ITEMS.find(i => i.id === item_id);
    if (!item) return res.json({ code: 3, message: '物品不存在', data: null });

    const playerData = getOrCreatePlayerData(userId);
    if (!playerData || playerData.seal_fragments < item.cost) {
      return res.json({ code: 4, message: '封印碎片不足', data: null });
    }

    if (db) {
      db.prepare('UPDATE sealed_realm SET seal_fragments = seal_fragments - ?, updated_at = datetime("now") WHERE user_id = ?').run(item.cost, userId);
    }

    // 发放特殊奖励到背包
    if (db) {
      try {
        const existing = db.prepare("SELECT items FROM player_items WHERE user_id = ? AND item_type = ?").get(userId, item.reward_type);
        if (existing) {
          db.prepare("UPDATE player_items SET items = items || ? WHERE user_id = ? AND item_type = ?").run(JSON.stringify([{ icon: item.icon, name: item.name }]), userId, item.reward_type);
        } else {
          db.prepare("INSERT INTO player_items (user_id, item_type, items) VALUES (?, ?, ?)").run(userId, item.reward_type, JSON.stringify([{ icon: item.icon, name: item.name }]));
        }
      } catch (e) {}
    }

    addLog(userId, 'exchange', `特殊兑换 ${item.name}, 花费 ${item.cost} 封印碎片`);

    res.json({
      code: 0,
      data: { item },
      message: `兑换成功: ${item.name}`,
    });
  } catch (e) {
    console.error('[sealedRealm] /exchange error:', e);
    res.json({ code: 1, message: e.message, data: null });
  }
});

// POST /api/sealed-realm/reset - 重置每周挑战
router.post('/reset', (req, res) => {
  const userId = req.user ? req.user.id : req.session?.userId || 1;

  try {
    if (db) {
      db.prepare(`UPDATE sealed_realm SET attempts = 5, last_reset = datetime('now'), updated_at = datetime('now') WHERE user_id = ?`).run(userId);
      // 不重置 демон 击败状态(永久解锁)
    }

    addLog(userId, 'reset', '每周重置, 挑战次数恢复为5');

    res.json({ code: 0, message: '每周重置成功', data: { attempts: 5 } });
  } catch (e) {
    console.error('[sealedRealm] /reset error:', e);
    res.json({ code: 1, message: e.message, data: null });
  }
});

module.exports = router;
