/**
 * 境界副本 HTTP 路由
 * 封装 server/game/realm_dungeon_system.js
 * 端点: GET /status, GET /list, POST /enter, POST /battle, POST /claim
 */

const express = require('express');
const router = express.Router();
const path = require('path');

const Logger = {
  info: (...args) => console.log('[realm_dungeon]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[realm_dungeon:error]', new Date().toISOString(), ...args)
};

// 数据库连接
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');
let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('journal_mode=WAL');
  initTables();
  Logger.info('数据库连接成功');
} catch (err) {
  Logger.error('数据库连接失败:', err.message);
  db = {
    prepare() { return this; },
    get() { return null; },
    all() { return []; },
    run() { return { changes: 0 }; }
  };
}

// 境界副本数据（从 game/realm_dungeon_system.js 复制核心配置）
const REALM_DUNGEON_DATA = {
  '练气期': {
    id: 1, name: '练气期试炼', desc: '刚刚踏入修仙之路的试炼',
    floors: [
      { id: 1, name: '灵气山谷', enemy: '灵气蛇', hp: 200, atk: 15, def: 2, exp: 50, stones: 10, items: [] },
      { id: 2, name: '灵草园', enemy: '守护灵草', hp: 350, atk: 25, def: 5, exp: 80, stones: 20, items: [] },
      { id: 3, name: '山洞秘径', enemy: '山魈', hp: 500, atk: 40, def: 8, exp: 120, stones: 35, items: [] },
      { id: 4, name: '灵气泉眼', enemy: '灵泉守卫', hp: 800, atk: 60, def: 12, exp: 200, stones: 50, items: [] },
      { id: 5, name: '试炼终点', enemy: '试炼长老', hp: 1200, atk: 80, def: 15, exp: 300, stones: 100, items: ['realm_token_qi'] }
    ],
    boss: { name: '试炼长老', hp: 1200, atk: 80, def: 15, exp: 500, stones: 200, items: ['realm_token_qi'] },
    clearRewards: { exp: 1000, stones: 300 }
  },
  '筑基期': {
    id: 2, name: '筑基期挑战', desc: '筑就仙道根基的考验',
    floors: [
      { id: 1, name: '寒冰洞窟', enemy: '冰魔', hp: 2000, atk: 120, def: 30, exp: 400, stones: 150, items: [] },
      { id: 2, name: '烈焰山谷', enemy: '火麒麟幼崽', hp: 3000, atk: 180, def: 45, exp: 600, stones: 250, items: [] },
      { id: 3, name: '雷霆深渊', enemy: '雷蛟', hp: 4500, atk: 250, def: 60, exp: 900, stones: 400, items: [] },
      { id: 4, name: '阴阳池', enemy: '阴阳兽', hp: 6000, atk: 320, def: 80, exp: 1200, stones: 600, items: [] },
      { id: 5, name: '筑基之巅', enemy: '金丹真人', hp: 10000, atk: 450, def: 100, exp: 2000, stones: 1000, items: ['foundation_pill'] }
    ],
    boss: { name: '金丹真人', hp: 10000, atk: 450, def: 100, exp: 5000, stones: 3000, items: ['foundation_pill'] },
    clearRewards: { exp: 8000, stones: 5000 }
  },
  '金丹期': {
    id: 3, name: '金丹期劫难', desc: '金丹凝聚的劫难考验',
    floors: [
      { id: 1, name: '万魔坑', enemy: '魔兵', hp: 15000, atk: 600, def: 150, exp: 3000, stones: 2000, items: [] },
      { id: 2, name: '妖神山脉', enemy: '大妖', hp: 25000, atk: 900, def: 220, exp: 5000, stones: 3500, items: [] },
      { id: 3, name: '幽冥鬼域', enemy: '鬼王', hp: 35000, atk: 1200, def: 300, exp: 7000, stones: 5000, items: [] },
      { id: 4, name: '上古遗迹', enemy: '守护傀儡', hp: 50000, atk: 1600, def: 400, exp: 10000, stones: 8000, items: [] },
      { id: 5, name: '渡劫台', enemy: '天劫化身', hp: 80000, atk: 2200, def: 500, exp: 15000, stones: 12000, items: ['golden_core'] }
    ],
    boss: { name: '天劫化身', hp: 80000, atk: 2200, def: 500, exp: 50000, stones: 30000, items: ['golden_core'] },
    clearRewards: { exp: 80000, stones: 50000 }
  },
  '元婴期': {
    id: 4, name: '元婴期历练', desc: '元婴出窍的神通试炼',
    floors: [
      { id: 1, name: '虚空裂缝', enemy: '虚空怪物', hp: 100000, atk: 3000, def: 800, exp: 20000, stones: 15000, items: [] },
      { id: 2, name: '上古仙府', enemy: '仙府守卫', hp: 150000, atk: 4500, def: 1200, exp: 35000, stones: 25000, items: [] },
      { id: 3, name: '神魔战场', enemy: '古魔将', hp: 200000, atk: 6000, def: 1600, exp: 50000, stones: 40000, items: [] },
      { id: 4, name: '万妖山脉', enemy: '妖祖', hp: 300000, atk: 8000, def: 2000, exp: 80000, stones: 60000, items: [] },
      { id: 5, name: '元婴之巅', enemy: '化神大能', hp: 500000, atk: 12000, def: 3000, exp: 150000, stones: 100000, items: ['yuan_ying_pill'] }
    ],
    boss: { name: '化神大能', hp: 500000, atk: 12000, def: 3000, exp: 150000, stones: 100000, items: ['yuan_ying_pill'] },
    clearRewards: { exp: 200000, stones: 150000 }
  },
  '化神期': {
    id: 5, name: '化神期劫关', desc: '化神蜕变的神通试炼',
    floors: [
      { id: 1, name: '幽冥血海', enemy: '血魔', hp: 800000, atk: 18000, def: 4500, exp: 200000, stones: 120000, items: [] },
      { id: 2, name: '九天雷池', enemy: '雷神', hp: 1200000, atk: 25000, def: 6000, exp: 350000, stones: 200000, items: [] },
      { id: 3, name: '星辰大海', enemy: '星神', hp: 1800000, atk: 35000, def: 8000, exp: 500000, stones: 300000, items: [] },
      { id: 4, name: '混沌虚空', enemy: '混沌兽', hp: 2500000, atk: 50000, def: 12000, exp: 800000, stones: 500000, items: [] },
      { id: 5, name: '化神天劫', enemy: '天劫雷尊', hp: 4000000, atk: 70000, def: 16000, exp: 1200000, stones: 800000, items: ['transcendence_pill'] }
    ],
    boss: { name: '天劫雷尊', hp: 4000000, atk: 70000, def: 16000, exp: 1200000, stones: 800000, items: ['transcendence_pill'] },
    clearRewards: { exp: 2000000, stones: 1500000 }
  }
};

const REALM_ORDER = ['练气期', '筑基期', '金丹期', '元婴期', '化神期'];

// 每用户副本状态（内存）
// key: userId, value: { currentRealm, currentFloor, status, enemy, maxHp, hp, battleStartTime }
const userDungeonState = {};

// 每用户副本进度（keyed by userId-realmId）
// value: { highestFloor, cleared, claimed, enterCount }

function initTables() {
  if (!db) return;
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS realm_dungeon_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        realm_id TEXT NOT NULL,
        highest_floor INTEGER DEFAULT 0,
        cleared INTEGER DEFAULT 0,
        rewarded INTEGER DEFAULT 0,
        enter_count INTEGER DEFAULT 0,
        last_enter TEXT,
        UNIQUE(user_id, realm_id)
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS realm_dungeon_battle (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        realm_id TEXT NOT NULL,
        floor INTEGER NOT NULL,
        status TEXT DEFAULT 'fighting',
        enemy_hp INTEGER DEFAULT 0,
        max_enemy_hp INTEGER DEFAULT 0,
        player_hp INTEGER DEFAULT 0,
        started_at TEXT DEFAULT (datetime('now')),
        finished_at TEXT,
        UNIQUE(user_id, realm_id)
      )
    `);
    Logger.info('realm_dungeon 表初始化完成');
  } catch (e) {
    Logger.error('建表失败:', e.message);
  }
}

// 辅助：获取玩家数据
function getPlayer(userId) {
  try {
    const user = db.prepare('SELECT * FROM Users WHERE id = ?').get(userId);
    if (user) return user;
    return null;
  } catch (e) {
    return null;
  }
}

// 辅助：获取玩家境界名
function getRealmName(realmLevel) {
  const idx = Math.min(parseInt(realmLevel) - 1, REALM_ORDER.length - 1);
  return REALM_ORDER[idx] || REALM_ORDER[0];
}

// 辅助：获取用户副本进度
function getProgress(userId, realmId) {
  try {
    return db.prepare('SELECT * FROM realm_dungeon_progress WHERE user_id = ? AND realm_id = ?').get(userId, realmId);
  } catch (e) {
    return null;
  }
}

// 辅助：保存进度
function saveProgress(userId, realmId, data) {
  try {
    db.prepare(`
      INSERT OR REPLACE INTO realm_dungeon_progress (user_id, realm_id, highest_floor, cleared, rewarded, enter_count, last_enter)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(userId, realmId, data.highestFloor || 0, data.cleared ? 1 : 0, data.rewarded ? 1 : 0, data.enterCount || 0);
  } catch (e) {
    Logger.error('保存进度失败:', e.message);
  }
}

// GET /status/:playerId — 获取玩家所有副本进度
router.get('/status/:playerId', (req, res) => {
  const playerId = parseInt(req.params.playerId) || req.userId || 1;
  const player = getPlayer(playerId);
  if (!player) return res.json({ success: false, message: '玩家不存在' });

  try {
    const rows = db.prepare('SELECT * FROM realm_dungeon_progress WHERE user_id = ?').all(playerId);
    const result = {};
    rows.forEach(row => {
      result[row.realm_id] = {
        realmId: row.realm_id,
        highestFloor: row.highest_floor,
        cleared: !!row.cleared,
        rewarded: !!row.rewarded,
        enterCount: row.enter_count,
        lastEnter: row.last_enter
      };
    });
    res.json({ success: true, playerId, progress: result });
  } catch (e) {
    Logger.error('GET /status error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// GET /list/:playerId — 获取可挑战副本列表
router.get('/list/:playerId', (req, res) => {
  const playerId = parseInt(req.params.playerId) || req.userId || 1;
  const player = getPlayer(playerId);
  if (!player) return res.json({ success: false, message: '玩家不存在' });

  const playerRealmName = getRealmName(player.realm);
  const playerRealmIdx = REALM_ORDER.indexOf(playerRealmName);

  const available = REALM_ORDER.map((realmKey, idx) => {
    const dungeon = REALM_DUNGEON_DATA[realmKey];
    const progress = getProgress(playerId, realmKey) || { highestFloor: 0, cleared: 0, rewarded: 0, enterCount: 0 };
    return {
      id: dungeon.id,
      realmKey,
      name: dungeon.name,
      desc: dungeon.desc,
      totalFloors: dungeon.floors.length + 1,
      highestFloor: progress.highest_floor || 0,
      cleared: !!progress.cleared,
      rewarded: !!progress.rewarded,
      unlocked: idx <= playerRealmIdx,
      difficulty: idx + 1
    };
  });

  res.json({ success: true, playerId, currentRealm: playerRealmName, dungeons: available });
});

// POST /enter — 进入副本
router.post('/enter', (req, res) => {
  const userId = req.userId || parseInt(req.body.player_id) || parseInt(req.body.userId) || 1;
  const realmId = req.body.realmId || req.body.realm_id || req.body.dungeonId;

  if (!realmId) return res.json({ success: false, message: '缺少副本ID' });

  const player = getPlayer(userId);
  if (!player) return res.json({ success: false, message: '玩家不存在' });

  const dungeon = REALM_DUNGEON_DATA[realmId];
  if (!dungeon) return res.json({ success: false, message: '副本不存在' });

  // 难度校验: dungeon_level <= realm_level * 10
  // dungeon_level = dungeon.id (1-5), realm_level = player.realm
  const maxDungeonLevel = player.realm * 10;
  if (dungeon.id > maxDungeonLevel) {
    return res.json({ success: false, message: `境界不足，需要境界等级 >= ${Math.ceil(dungeon.id / 10)} 才能挑战此副本` });
  }

  // 境界顺序校验：玩家只能挑战当前境界或之前境界的副本
  const playerRealmName = getRealmName(player.realm);
  const playerRealmIdx = REALM_ORDER.indexOf(playerRealmName);
  const dungeonRealmIdx = REALM_ORDER.indexOf(realmId);
  if (dungeonRealmIdx > playerRealmIdx) {
    return res.json({ success: false, message: '境界不足，无法挑战此副本' });
  }

  // 初始化用户副本状态
  const stateKey = userId;
  userDungeonState[stateKey] = {
    currentRealm: realmId,
    currentFloor: 0,
    status: 'ready',
    enemy: null,
    maxHp: 0,
    hp: 0
  };

  // 更新进度
  const progress = getProgress(userId, realmId) || { highestFloor: 0, cleared: 0, rewarded: 0, enterCount: 0 };
  progress.enterCount = (progress.enterCount || 0) + 1;
  saveProgress(userId, realmId, progress);

  // 清除旧战斗记录
  try {
    db.prepare('DELETE FROM realm_dungeon_battle WHERE user_id = ? AND realm_id = ?').run(userId, realmId);
  } catch (e) { /* ignore */ }

  res.json({
    success: true,
    message: `进入${dungeon.name}！共${dungeon.floors.length + 1}层(含BOSS)`,
    dungeon: { id: dungeon.id, name: dungeon.name, totalFloors: dungeon.floors.length + 1 },
    progress: { highestFloor: progress.highestFloor || 0, cleared: !!progress.cleared }
  });
});

// POST /battle — 战斗（开始/攻击）
router.post('/battle', (req, res) => {
  const userId = req.userId || parseInt(req.body.player_id) || parseInt(req.body.userId) || 1;
  const action = req.body.action || 'attack'; // 'attack' | 'start'

  const stateKey = userId;
  let state = userDungeonState[stateKey];

  // 如果状态为空，尝试从DB恢复
  if (!state || !state.currentRealm) {
    // 查找最近的副本
    try {
      const battle = db.prepare('SELECT * FROM realm_dungeon_battle WHERE user_id = ? ORDER BY started_at DESC LIMIT 1').get(userId);
      if (battle) {
        state = {
          currentRealm: battle.realm_id,
          currentFloor: battle.floor,
          status: battle.status,
          enemy: { hp: battle.enemy_hp },
          maxHp: battle.max_enemy_hp,
          hp: battle.enemy_hp
        };
        userDungeonState[stateKey] = state;
      }
    } catch (e) { /* ignore */ }
  }

  if (!state || !state.currentRealm) {
    return res.json({ success: false, message: '请先进入副本' });
  }

  const dungeon = REALM_DUNGEON_DATA[state.currentRealm];
  if (!dungeon) return res.json({ success: false, message: '副本数据错误' });

  const player = getPlayer(userId);
  if (!player) return res.json({ success: false, message: '玩家不存在' });

  if (action === 'start' || state.status === 'ready') {
    // 开始新一轮战斗（第一层或下一层）
    state.currentFloor++;
    state.status = 'fighting';

    if (state.currentFloor > dungeon.floors.length) {
      // BOSS 战
      state.enemy = { ...dungeon.boss };
      state.maxHp = dungeon.boss.hp;
      state.hp = dungeon.boss.hp;
    } else {
      // 普通关卡
      const floorData = dungeon.floors[state.currentFloor - 1];
      state.enemy = { ...floorData };
      state.maxHp = floorData.hp;
      state.hp = floorData.hp;
    }

    // 保存战斗状态
    try {
      db.prepare(`
        INSERT OR REPLACE INTO realm_dungeon_battle (user_id, realm_id, floor, status, enemy_hp, max_enemy_hp, player_hp, started_at)
        VALUES (?, ?, ?, 'fighting', ?, ?, ?, datetime('now'))
      `).run(userId, state.currentRealm, state.currentFloor, state.hp, state.maxHp, player.hp || 1000);
    } catch (e) { Logger.error('保存战斗状态失败:', e.message); }

    return res.json({
      success: true,
      action: 'start',
      floor: state.currentFloor,
      totalFloors: dungeon.floors.length + 1,
      isBoss: state.currentFloor > dungeon.floors.length,
      enemy: { name: state.enemy.name, hp: state.hp, maxHp: state.maxHp, atk: state.enemy.atk }
    });
  }

  if (action === 'attack' || state.status === 'fighting') {
    // 执行攻击
    const playerAtk = player.attack || 50;
    const playerDef = player.defense || 10;
    const playerHp = player.hp || 1000;
    const enemyAtk = state.enemy.atk || 20;
    const enemyDef = state.enemy.def || 5;

    // 玩家对敌人伤害
    const playerDamage = Math.max(1, Math.floor(playerAtk * 1.5 - enemyDef * 0.5));
    state.hp = Math.max(0, state.hp - playerDamage);

    let result;
    if (state.hp <= 0) {
      // 敌人被击败
      const expReward = state.enemy.exp || 0;
      const stonesReward = state.enemy.stones || 0;

      state.status = 'victory';

      // 更新最高通关层
      const progress = getProgress(userId, state.currentRealm) || { highestFloor: 0, cleared: 0, rewarded: 0, enterCount: 0 };
      if (state.currentFloor > (progress.highestFloor || 0)) {
        progress.highestFloor = state.currentFloor;
      }

      // 检查是否通关所有楼层
      const isCleared = state.currentFloor > dungeon.floors.length;
      if (isCleared) {
        progress.cleared = true;
      }
      saveProgress(userId, state.currentRealm, progress);

      // 发放奖励
      if (stonesReward > 0) {
        try {
          db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(stonesReward, userId);
        } catch (e) { Logger.error('发放灵石失败:', e.message); }
      }

      // 标记战斗结束
      try {
        db.prepare("UPDATE realm_dungeon_battle SET status = 'victory', enemy_hp = 0, finished_at = datetime('now') WHERE user_id = ? AND realm_id = ?").run(userId, state.currentRealm);
      } catch (e) { /* ignore */ }

      result = {
        success: true,
        action: 'attack',
        victory: true,
        floor: state.currentFloor,
        expReward,
        stonesReward,
        cleared: !!progress.cleared,
        nextFloor: state.currentFloor < dungeon.floors.length + 1 ? state.currentFloor + 1 : null,
        enemy: { name: state.enemy.name, hp: 0, maxHp: state.maxHp }
      };
    } else {
      // 敌人反击
      const enemyDamage = Math.max(1, Math.floor(enemyAtk - playerDef * 0.3));
      const remainingHp = Math.max(0, playerHp - enemyDamage);

      // 更新DB中的敌人HP
      try {
        db.prepare('UPDATE realm_dungeon_battle SET enemy_hp = ? WHERE user_id = ? AND realm_id = ?').run(state.hp, userId, state.currentRealm);
      } catch (e) { /* ignore */ }

      result = {
        success: true,
        action: 'attack',
        victory: false,
        floor: state.currentFloor,
        playerDamage,
        enemyDamage,
        enemy: { name: state.enemy.name, hp: state.hp, maxHp: state.maxHp, atk: enemyAtk },
        playerHp: remainingHp,
        maxPlayerHp: playerHp
      };
    }

    return res.json(result);
  }

  return res.json({ success: false, message: '无效操作' });
});

// POST /claim — 领取通关奖励
router.post('/claim', (req, res) => {
  const userId = req.userId || parseInt(req.body.player_id) || parseInt(req.body.userId) || 1;
  const realmId = req.body.realmId || req.body.realm_id;

  if (!realmId) return res.json({ success: false, message: '缺少副本ID' });

  const dungeon = REALM_DUNGEON_DATA[realmId];
  if (!dungeon) return res.json({ success: false, message: '副本不存在' });

  const progress = getProgress(userId, realmId);
  if (!progress || !progress.cleared) {
    return res.json({ success: false, message: '副本尚未通关，无法领取奖励' });
  }
  if (progress.rewarded) {
    return res.json({ success: false, message: '奖励已领取' });
  }

  const rewards = dungeon.clearRewards || { exp: 1000, stones: 300 };
  const player = getPlayer(userId);
  if (player) {
    try {
      db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(rewards.stones, userId);
    } catch (e) { Logger.error('发放灵石失败:', e.message); }
  }

  // 标记已领取
  try {
    db.prepare('UPDATE realm_dungeon_progress SET rewarded = 1 WHERE user_id = ? AND realm_id = ?').run(userId, realmId);
  } catch (e) { /* ignore */ }

  res.json({ success: true, message: '奖励领取成功', rewards: { exp: rewards.exp, stones: rewards.stones } });
});

module.exports = router;
