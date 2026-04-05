const express = require('express');
const router = express.Router();

// 成就触发服务
let achievementTrigger;
try {
  achievementTrigger = require('../../game/achievement_trigger_service');
} catch (e) {
  console.log('[player] 成就触发服务未找到:', e.message);
  achievementTrigger = null;
}

// 数据库引用（由 server.js 注入）
let dbRef = null;
function setDb(db) { dbRef = db; }

// 功法模板（与 gongfa.js 保持一致）
const GONGFAS = [
  { id: 1, name: '九天真元诀', type: 'attack',  level: 1, attackBonus: 50,   defenseBonus: 0, hpBonus: 0,    speedBonus: 0 },
  { id: 2, name: '烈焰焚天诀', type: 'attack',  level: 2, attackBonus: 120,  defenseBonus: 0, hpBonus: 0,    speedBonus: 0 },
  { id: 3, name: '天雷破空诀', type: 'attack',  level: 3, attackBonus: 300,  defenseBonus: 0, hpBonus: 0,    speedBonus: 0 },
  { id: 4, name: '混沌灭世诀', type: 'attack',  level: 4, attackBonus: 800,  defenseBonus: 0, hpBonus: 0,    speedBonus: 0 },
  { id: 5, name: '金刚护体术', type: 'defense', level: 1, attackBonus: 0,   defenseBonus: 30, hpBonus: 0,   speedBonus: 0 },
  { id: 6, name: '玄冥护甲诀', type: 'defense', level: 2, attackBonus: 0,   defenseBonus: 80, hpBonus: 0,   speedBonus: 0 },
  { id: 7, name: '天地护元术', type: 'defense', level: 3, attackBonus: 0,   defenseBonus: 200, hpBonus: 0,  speedBonus: 0 },
  { id: 8, name: '生生不息诀', type: 'hp',      level: 1, attackBonus: 0,    defenseBonus: 0, hpBonus: 500,   speedBonus: 0 },
  { id: 9, name: '造化长春功', type: 'hp',      level: 2, attackBonus: 0,    defenseBonus: 0, hpBonus: 1500,  speedBonus: 0 },
  { id: 10, name: '不死凤凰诀', type: 'hp',     level: 3, attackBonus: 0,    defenseBonus: 0, hpBonus: 5000,  speedBonus: 0 },
  { id: 11, name: '流光掠影术', type: 'speed',  level: 1, attackBonus: 0,   defenseBonus: 0, hpBonus: 0,    speedBonus: 5 },
  { id: 12, name: '瞬风千里诀', type: 'speed',  level: 2, attackBonus: 0,   defenseBonus: 0, hpBonus: 0,    speedBonus: 15 },
];

// 灵根类型配置（与 spirit_root.js 保持一致）
const SPIRIT_ROOTS = {
  metal:  { id: 'metal',  nameCN: '金灵根', spiritRate: 1.05, bonus: { attack: 15, critRate: 5, critDamage: 10 } },
  wood:   { id: 'wood',   nameCN: '木灵根', spiritRate: 1.08, bonus: { hp: 100, defense: 8, healEffect: 15 } },
  water:  { id: 'water',  nameCN: '水灵根', spiritRate: 1.07, bonus: { skillDamage: 12, cdReduction: 8, maxHp: 50 } },
  fire:   { id: 'fire',   nameCN: '火灵根', spiritRate: 1.06, bonus: { attack: 12, critRate: 8, burnDamage: 20 } },
  earth:  { id: 'earth',  nameCN: '土灵根', spiritRate: 1.06, bonus: { defense: 12, hp: 80, resistance: 10 } },
  wind:   { id: 'wind',   nameCN: '风灵根', spiritRate: 1.07, bonus: { speed: 15, dodge: 10, attack: 5 } },
  thunder:{ id: 'thunder',nameCN: '雷灵根', spiritRate: 1.05, bonus: { attack: 10, comboRate: 15, stunChance: 5 } },
  ice:    { id: 'ice',    nameCN: '冰灵根', spiritRate: 1.05, bonus: { defense: 8, freezeChance: 8, hp: 40 } },
  dark:   { id: 'dark',   nameCN: '暗灵根', spiritRate: 1.06, bonus: { attack: 12, lifesteal: 8, critDamage: 15 } },
  light:  { id: 'light',  nameCN: '光灵根', spiritRate: 1.08, bonus: { healEffect: 20, shield: 15, defense: 5 } },
};

/**
 * 获取玩家灵根属性加成
 * @param {object} db - 数据库实例
 * @param {number} userId - 玩家ID
 * @returns {{ spiritRootId, spiritRootName, atk, def, hp, ... }}
 */
function getSpiritRootBonus(db, userId) {
  if (!db || !userId) return { spiritRootId: 'fire', spiritRootName: '火灵根', atk: 0, def: 0, hp: 0 };
  try {
    const user = db.prepare('SELECT spirit_root FROM Users WHERE id = ?').get(userId);
    const rootId = user && user.spirit_root ? user.spirit_root : 'fire';
    const root = SPIRIT_ROOTS[rootId] || SPIRIT_ROOTS.fire;
    const b = root.bonus;
    return {
      spiritRootId: root.id,
      spiritRootName: root.nameCN,
      spiritRate: root.spiritRate || 1.0,
      atk: b.attack || 0,
      def: b.defense || 0,
      hp: b.hp || 0,
      critRate: b.critRate || 0,
      critDamage: b.critDamage || 0,
      burnDamage: b.burnDamage || 0,
      lifesteal: b.lifesteal || 0,
      dodge: b.dodge || 0,
      speed: b.speed || 0,
      comboRate: b.comboRate || 0,
      stunChance: b.stunChance || 0,
      freezeChance: b.freezeChance || 0,
      resistance: b.resistance || 0,
      skillDamage: b.skillDamage || 0,
      healEffect: b.healEffect || 0,
      shield: b.shield || 0,
      cdReduction: b.cdReduction || 0,
      maxHp: b.maxHp || 0,
    };
  } catch (e) {
    console.error('[player] getSpiritRootBonus错误:', e.message);
    return { spiritRootId: 'fire', spiritRootName: '火灵根', atk: 0, def: 0, hp: 0 };
  }
}

/**
 * 获取玩家已学功法的属性加成
 * @param {object} db - 数据库实例
 * @param {number} userId - 玩家ID
 * @returns {{ attackBonus, defenseBonus, hpBonus, speedBonus, learnedGongfas[] }}
 */
function getGongfaBonuses(db, userId) {
  const result = { attackBonus: 0, defenseBonus: 0, hpBonus: 0, speedBonus: 0, learnedGongfas: [] };
  if (!db || !userId) return result;
  try {
    const learned = db.prepare('SELECT * FROM player_gongfa WHERE user_id = ?').all(userId);
    for (const lg of learned) {
      const template = GONGFAS.find(g => g.id === lg.gongfa_id);
      if (template) {
        result.attackBonus   += template.attackBonus   || 0;
        result.defenseBonus  += template.defenseBonus  || 0;
        result.hpBonus       += template.hpBonus       || 0;
        result.speedBonus    += template.speedBonus    || 0;
        result.learnedGongfas.push({ id: template.id, name: template.name, type: template.type,
          attackBonus: template.attackBonus, defenseBonus: template.defenseBonus,
          hpBonus: template.hpBonus, speedBonus: template.speedBonus, isEquipped: !!lg.is_equipped });
      }
    }
  } catch (e) {
    console.error('[player] getGongfaBonuses错误:', e.message);
  }
  return result;
}

// 模拟数据库（测试用满级账号）
let player = {
  id: 1,
  name: '云泽',
  level: 100,
  realm: 8,
  lingshi: 500,
  diamonds: 0,
  hp: 1000,
  attack: 50,
  defense: 50,
  speed: 30,
  sectId: 1,
  createdAt: Date.now()
};

// 获取玩家信息（优先从 Users 表读取，替代内存 mock）
router.get('/', (req, res) => {
  const userId = parseInt(req.body.userId) || parseInt(req.body.player_id) || parseInt(req.query.playerId) || parseInt(req.get('X-User-Id')) || 1;

  if (dbRef && userId) {
    try {
      const user = dbRef.prepare('SELECT * FROM Users WHERE id = ?').get(userId);
      if (user) {
        // 获取已学功法的属性加成（学习即生效）
        const gb = getGongfaBonuses(dbRef, userId);
        const gbRoot = getSpiritRootBonus(dbRef, userId);
        const baseHp  = user.hp      || 1000;
        const baseAtk = user.attack  || 50;
        const baseDef = user.defense || 50;
        const baseSpd = user.speed   || 30;
        return res.json({
          id: user.id,
          name: user.nickname || user.username,
          level: user.level || 1,
          realm: user.realm || 1,
          lingshi: user.lingshi || 0,
          diamonds: user.diamonds || 0,
          hp: baseHp  + gb.hpBonus,
          attack: baseAtk + gb.attackBonus,
          defense: baseDef + gb.defenseBonus,
          speed: baseSpd  + gb.speedBonus,
          baseHp, baseAttack: baseAtk, baseDefense: baseDef, baseSpeed: baseSpd,
          gongfaBonuses: gb,
          spirit_root_bonus: gbRoot,
          sectId: user.sectId || null,
          vipLevel: user.vipLevel || 0,
          createdAt: user.createdAt
        });
      }
    } catch (e) {
      console.error('[player] GET / Users表查询失败:', e.message);
    }
  }
  res.json(player);
});

// 获取玩家信息 (兼容 /info 路径)
router.get('/info', (req, res) => {
  const userId = parseInt(req.body.userId) || parseInt(req.body.player_id) || parseInt(req.query.playerId) || parseInt(req.get('X-User-Id')) || 1;

  if (dbRef && userId) {
    try {
      const user = dbRef.prepare('SELECT * FROM Users WHERE id = ?').get(userId);
      if (user) {
        // 获取已学功法的属性加成（学习即生效）
        const gb = getGongfaBonuses(dbRef, userId);
        const gbRoot = getSpiritRootBonus(dbRef, userId);
        const baseHp  = user.hp      || 1000;
        const baseAtk = user.attack  || 50;
        const baseDef = user.defense || 50;
        const baseSpd = user.speed   || 30;
        return res.json({
          id: user.id,
          name: user.nickname || user.username,
          level: user.level || 1,
          realm: user.realm || 1,
          lingshi: user.lingshi || 0,
          diamonds: user.diamonds || 0,
          hp: baseHp  + gb.hpBonus,
          attack: baseAtk + gb.attackBonus,
          defense: baseDef + gb.defenseBonus,
          speed: baseSpd  + gb.speedBonus,
          baseHp, baseAttack: baseAtk, baseDefense: baseDef, baseSpeed: baseSpd,
          gongfaBonuses: gb,
          spirit_root_bonus: gbRoot,
          sectId: user.sectId || null,
          vipLevel: user.vipLevel || 0,
          createdAt: user.createdAt
        });
      }
    } catch (e) {
      console.error('[player] GET /info Users表查询失败:', e.message);
    }
  }
  // Fallback: 返回内存 mock
  res.json(player);
});

// 更新玩家信息
router.put('/', (req, res) => {
  const oldLevel = player.level;
  // 就地修改对象，不新建引用（保持 _player 同步）
  Object.assign(player, req.body);
  _player = player; // 保持 _player 指向最新对象
  
  // ========== 数据库持久化 ==========
  if (dbRef && player.id) {
    try {
      const fields = [];
      const values = [];
      // 支持持久化的字段映射
      const fieldMap = {
        name: 'username', level: 'level', realm: 'realm_level',
        lingshi: 'spirit_stones', diamonds: 'diamonds',
        hp: 'hp', attack: 'attack', defense: 'defense', speed: 'speed',
        sectId: 'sect_id', level: 'level'
      };
      for (const [key, dbCol] of Object.entries(fieldMap)) {
        if (req.body[key] !== undefined) {
          fields.push(`${dbCol} = ?`);
          values.push(req.body[key]);
        }
      }
      if (fields.length > 0) {
        values.push(player.id);
        dbRef.prepare(`UPDATE player SET ${fields.join(', ')} WHERE id = ?`).run(...values);
      }
    } catch (e) {
      console.error('[player] DB持久化失败:', e.message);
    }
  }
  
  // ========== 成就触发：升级 ==========
  let achievementResults = [];
  if (achievementTrigger && player.level > oldLevel) {
    try {
      achievementResults = achievementTrigger.onLevelUp(player.id, player.level);
      const notifications = achievementTrigger.popNotifications(player.id);
      if (notifications.length > 0) {
        console.log(`[成就通知] 用户${player.id}达成成就:`, notifications.map(n => n.achievementName).join(', '));
      }
    } catch (e) {
      console.error('[player] 成就触发失败:', e.message);
    }
  }
  
  res.json({ 
    ...player, 
    achievements: achievementResults.length > 0 ? achievementResults.map(a => ({
      id: a.id,
      name: a.name,
      desc: a.desc,
      reward: a.reward
    })) : undefined
  });
});

// 获取玩家资源
router.get('/resources', (req, res) => {
  res.json({
    lingshi: player.lingshi,
    diamonds: player.diamonds
  });
});

// 增加资源（同步写入 Users.lingshi，权威数据源）
router.post('/resources', (req, res) => {
  const { lingshi, diamonds } = req.body;
  if (lingshi) player.lingshi += lingshi;
  if (diamonds) player.diamonds += diamonds;
  
  if (dbRef && player.id) {
    try {
      if (lingshi) {
        dbRef.prepare('UPDATE Users SET lingshi = lingshi + ?, updatedAt = ? WHERE id = ?').run(lingshi, new Date().toISOString(), player.id);
        dbRef.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?').run(lingshi, player.id);
      }
      if (diamonds) {
        dbRef.prepare('UPDATE player SET diamonds = diamonds + ? WHERE id = ?').run(diamonds, player.id);
      }
    } catch (e) {
      console.error('[player] resources DB持久化失败:', e.message);
    }
  }
  
  res.json({ lingshi: player.lingshi, diamonds: player.diamonds });
});

// 玩家登录 (处理离线挂机奖励)
router.post('/login', (req, res) => {
  const { userId } = req.body;
  const now = Date.now();
  
  const path = require('path');
  const DATA_DIR = path.join(__dirname, '..', 'data');
  const DB_PATH = path.join(DATA_DIR, 'game.db');
  
  let db;
  try {
    const Database = require('better-sqlite3');
    db = new Database(DB_PATH);
  } catch (e) {
    db = null;
  }
  
  // 离线收益配置
  const OFFLINE_RATE = 25; // 25灵石/小时 (离线50%效率)
  const MAX_OFFLINE_HOURS = 24;
  
  // VIP加成配置
  const VIP_MULTIPLIERS = {
    0: 1.0, 1: 1.1, 2: 1.2, 3: 1.3, 4: 1.5, 5: 1.8, 6: 2.0, 7: 2.2, 8: 2.5, 9: 2.8, 10: 3.0
  };
  
  if (db && userId) {
    try {
      // 获取玩家数据
      let p = db.prepare('SELECT * FROM player WHERE id = ?').get(userId);
      if (!p) {
        return res.status(404).json({ success: false, error: '玩家不存在' });
      }
      
      // 获取上次登录时间
      const lastLogin = p.last_login ? new Date(p.last_login).getTime() : now;
      const elapsedMs = now - lastLogin;
      const elapsedHours = Math.min(elapsedMs / (1000 * 60 * 60), MAX_OFFLINE_HOURS);
      
      // VIP加成
      const vipLevel = p.vip_level || 0;
      const vipMultiplier = VIP_MULTIPLIERS[vipLevel] || 1.0;
      
      // 计算离线收益
      const offlineReward = Math.floor(elapsedHours * OFFLINE_RATE * vipMultiplier);
      const isOnlineEligible = elapsedHours < 0.5; // 不到30分钟算在线
      
      // 发放离线奖励（写入 Users.lingshi，权威数据源）
      if (offlineReward > 0) {
        db.prepare('UPDATE Users SET lingshi = lingshi + ?, updatedAt = ? WHERE id = ?').run(offlineReward, new Date().toISOString(), userId);
        db.prepare('UPDATE player SET spirit_stones = spirit_stones + ?, last_login = CURRENT_TIMESTAMP WHERE id = ?').run(offlineReward, userId);
      } else {
        db.prepare('UPDATE player SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
      }
      
      // 返回更新后的玩家数据
      const updatedPlayer = db.prepare('SELECT * FROM player WHERE id = ?').get(userId);
      
      return res.json({
        success: true,
        player: {
          id: updatedPlayer.id,
          name: updatedPlayer.username,
          level: updatedPlayer.level,
          realm: updatedPlayer.realm_level,
          lingshi: updatedPlayer.spirit_stones,
          diamonds: updatedPlayer.diamonds,
          vipLevel: updatedPlayer.vip_level || 0
        },
        offlineReward: offlineReward > 0 ? offlineReward : 0,
        offlineHours: Math.round(elapsedHours * 10) / 10,
        isOnline: isOnlineEligible,
        vipMultiplier,
        lastLogin: p.last_login
      });
    } catch (e) {
      console.error('[player] login错误:', e.message);
      return res.status(500).json({ success: false, error: e.message });
    }
  }
  
  // 无数据库时使用mock player
  res.json({ success: true, player, offlineReward: 0 });
});

// ============================================================
// 离线收益系统
// 规则：
//   - 玩家离线时，每分钟获得挂机地图收益的50%
//   - 单次离线最多计算4小时（240分钟）
//   - 离线收益在玩家下次登录时一次性发放（前端登录时调用此接口）
// ============================================================

// 根据境界获取挂机基础收益（每分钟）
function getAfkBaseReward(realm) {
  const rewards = {
    1: { cultivation: 5,   exp: 2,   lingshi: 1 },   // 炼气
    2: { cultivation: 12,  exp: 5,   lingshi: 2 },  // 筑基
    3: { cultivation: 30,  exp: 12,  lingshi: 5 },  // 金丹
    4: { cultivation: 75,  exp: 30,  lingshi: 12 }, // 元婴
    5: { cultivation: 180, exp: 70,  lingshi: 25 }, // 化神
    6: { cultivation: 400, exp: 150, lingshi: 50 }, // 炼虚
    7: { cultivation: 900, exp: 350, lingshi: 100 },// 大乘
    8: { cultivation: 2000,exp: 800, lingshi: 200 },// 渡劫
    9: { cultivation: 4500,exp: 1800,lingshi: 400 }, // 飞升
  };
  return rewards[realm] || rewards[1];
}

// VIP加成表（灵石额外倍率）
const VIP_LINGSHI_MULTIPLIER = {
  0: 1.0, 1: 1.1, 2: 1.2, 3: 1.3, 4: 1.5,
  5: 1.8, 6: 2.0, 7: 2.2, 8: 2.5, 9: 2.8, 10: 3.0
};

/**
 * GET /api/player/offline-reward
 * 获取离线收益预览（玩家登录后前端调用，显示弹窗前预览）
 * 不会实际发放奖励
 */
router.get('/offline-reward', (req, res) => {
  const userId = parseInt(req.query.userId) || parseInt(req.query.player_id) || parseInt(req.get('X-User-Id')) || 1;

  const path = require('path');
  const DB_PATH = path.join(__dirname, '..', 'data', 'game.db');

  let db;
  try {
    const Database = require('better-sqlite3');
    db = new Database(DB_PATH);
  } catch (e) {
    db = null;
  }

  if (!db) {
    return res.json({ success: false, error: '数据库不可用' });
  }

  try {
    // 确保 last_logout_at 字段存在（与 /api/auth/logout 保持一致）
    try { db.exec("ALTER TABLE player ADD COLUMN last_logout_at TEXT"); } catch (_) {}

    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(userId);
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }

    const now = Date.now();
    const lastLogout = player.last_logout_at ? new Date(player.last_logout_at).getTime() : null;

    if (!lastLogout) {
      return res.json({
        success: true,
        hasOfflineReward: false,
        offlineMinutes: 0,
        message: '无离线记录'
      });
    }

    const offlineMs = now - lastLogout;
    const offlineMinutes = Math.min(Math.floor(offlineMs / 60000), 240); // 最多240分钟

    if (offlineMinutes < 1) {
      return res.json({
        success: true,
        hasOfflineReward: false,
        offlineMinutes: 0,
        message: '离线时间不足1分钟'
      });
    }

    const realm = player.realm_level || 1;
    const vipLevel = player.vip_level || 0;
    const vipMultiplier = VIP_LINGSHI_MULTIPLIER[vipLevel] || 1.0;
    const base = getAfkBaseReward(realm);

    // 离线收益 = 挂机收益 × 50% × 离线分钟数
    const cultivationGain = Math.floor(base.cultivation * offlineMinutes * 0.5);
    const expGain = Math.floor(base.exp * offlineMinutes * 0.5);
    const lingshiGain = Math.floor(base.lingshi * offlineMinutes * 0.5 * vipMultiplier);

    return res.json({
      success: true,
      hasOfflineReward: true,
      offlineMinutes,
      maxMinutes: 240,
      realm,
      vipLevel,
      vipMultiplier,
      rewards: {
        cultivation: cultivationGain,
        exp: expGain,
        lingshi: lingshiGain
      },
      // 挂机地图原始收益（用于显示）
      baseRewardPerMinute: {
        cultivation: base.cultivation,
        exp: base.exp,
        lingshi: base.lingshi
      },
      offlineRate: 0.5, // 离线收益为挂机的50%
      message: `离线${offlineMinutes}分钟，预计获得灵气+${cultivationGain}，经验+${expGain}，灵石+${lingshiGain}`
    });
  } catch (e) {
    console.error('[player] GET /offline-reward 错误:', e.message);
    return res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * POST /api/player/offline-reward
 * 领取离线收益（玩家登录后前端调用，正式发放奖励）
 */
router.post('/offline-reward', (req, res) => {
  const userId = parseInt(req.body.userId) || parseInt(req.body.player_id) || parseInt(req.get('X-User-Id')) || 1;

  const path = require('path');
  const DB_PATH = path.join(__dirname, '..', 'data', 'game.db');

  let db;
  try {
    const Database = require('better-sqlite3');
    db = new Database(DB_PATH);
  } catch (e) {
    db = null;
  }

  if (!db) {
    return res.json({ success: false, error: '数据库不可用' });
  }

  try {
    // 确保 last_logout_at 字段存在（与 /api/auth/logout 保持一致）
    try { db.exec("ALTER TABLE player ADD COLUMN last_logout_at TEXT"); } catch (_) {}

    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(userId);
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }

    const now = Date.now();
    const lastLogout = player.last_logout_at ? new Date(player.last_logout_at).getTime() : null;

    if (!lastLogout) {
      return res.json({
        success: true,
        claimed: false,
        offlineMinutes: 0,
        message: '无离线记录，无需领取'
      });
    }

    const offlineMs = now - lastLogout;
    const offlineMinutes = Math.min(Math.floor(offlineMs / 60000), 240);

    if (offlineMinutes < 1) {
      // 清空登出时间
      db.prepare('UPDATE player SET last_logout_at = NULL, last_login = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
      return res.json({
        success: true,
        claimed: false,
        offlineMinutes: 0,
        message: '离线时间不足1分钟'
      });
    }

    const realm = player.realm_level || 1;
    const vipLevel = player.vip_level || 0;
    const vipMultiplier = VIP_LINGSHI_MULTIPLIER[vipLevel] || 1.0;
    const base = getAfkBaseReward(realm);

    const cultivationGain = Math.floor(base.cultivation * offlineMinutes * 0.5);
    const expGain = Math.floor(base.exp * offlineMinutes * 0.5);
    const lingshiGain = Math.floor(base.lingshi * offlineMinutes * 0.5 * vipMultiplier);

    // 发放奖励
    if (lingshiGain > 0) {
      db.prepare('UPDATE Users SET lingshi = lingshi + ?, updatedAt = ? WHERE id = ?').run(lingshiGain, new Date().toISOString(), userId);
      db.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?').run(lingshiGain, userId);
    }

    if (expGain > 0) {
      db.prepare('UPDATE player SET exp = exp + ? WHERE id = ?').run(expGain, userId);
    }

    // 更新 cultivation 表的 accumulatedPower（如果存在）
    try {
      db.prepare('UPDATE Cultivations SET accumulatedPower = accumulatedPower + ? WHERE userId = ?').run(cultivationGain, userId);
    } catch (_) {}

    // 清空 last_logout_at，更新 last_login
    db.prepare('UPDATE player SET last_logout_at = NULL, last_login = CURRENT_TIMESTAMP WHERE id = ?').run(userId);

    console.log(`[offline-reward] 玩家${userId}领取离线收益：离线${offlineMinutes}分钟，灵气+${cultivationGain}，经验+${expGain}，灵石+${lingshiGain}`);

    return res.json({
      success: true,
      claimed: true,
      offlineMinutes,
      realm,
      vipLevel,
      rewards: {
        cultivation: cultivationGain,
        exp: expGain,
        lingshi: lingshiGain
      },
      message: `离线${offlineMinutes}分钟，领取成功！灵气+${cultivationGain}，经验+${expGain}，灵石+${lingshiGain}`
    });
  } catch (e) {
    console.error('[player] POST /offline-reward 错误:', e.message);
    return res.status(500).json({ success: false, error: e.message });
  }
});

// ============================================================
// 原有挂机/AFK系统保留，不受离线收益影响
// ============================================================

// GET /api/player/bag?type=equipment - 返回玩家装备背包
router.get('/bag', (req, res) => {
  const userId = req.userId || parseInt(req.query.userId || req.query.player_id || 1) || 1;
  const itemType = req.query.type || 'all';

  const path = require('path');
  const DATA_DIR = path.join(__dirname, '..', 'data');
  const DB_PATH = path.join(DATA_DIR, 'game.db');

  let db;
  try {
    const Database = require('better-sqlite3');
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  } catch (e) {
    db = null;
  }

  if (!db) {
    return res.json({ success: false, items: [], message: '数据库不可用' });
  }

  try {
    let query = 'SELECT id, item_id as itemId, item_name as name, item_type as type, count, icon, source FROM player_items WHERE user_id = ?';
    const params = [userId];

    if (itemType === 'equipment') {
      query += " AND (item_type = 'weapon' OR item_type = 'armor' OR item_type = 'accessory' OR item_type = 'fashion')";
    }

    query += ' ORDER BY item_type, id';
    const items = db.prepare(query).all(...params);
    res.json({ success: true, items });
  } catch (e) {
    console.error('[player] GET /bag error:', e.message);
    res.json({ success: false, items: [], message: e.message });
  }
});

module.exports = router;
module.exports._player = player;
module.exports.setDb = setDb;
module.exports.getSpiritRootBonus = getSpiritRootBonus;
