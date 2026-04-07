/**
 * Cave Invasion System - 洞府入侵系统 v2.0
 * 魔修入侵 → 防守反击战斗 → 奖励/惩罚
 * 
 * 参考: DNF异界入侵 / 梦幻西游迷宫
 * 
 * 核心机制:
 * 1. 魔修定时随机入侵在线玩家洞府
 * 2. 玩家可主动入侵他人洞府 (消耗灵石)
 * 3. 被入侵时触发防守反击战斗系统
 * 4. 防守成功/失败对应不同奖励惩罚
 */

const Database = require('better-sqlite3');
const path = require('path');
const express = require('express');
const caveInvasionRouter = express.Router();

const DB_PATH = path.join(__dirname, '../data/game.db');
let _db;

function db() {
  if (!_db) _db = new Database(DB_PATH);
  return _db;
}

// =============================================
// 战斗引擎（内联，避免循环依赖）
// =============================================
const ELEMENTAL_CHART = {
  metal:  { metal: 1.0, wood: 1.5, water: 1.0, fire: 0.75, earth: 1.0 },
  wood:   { metal: 0.75, wood: 1.0, water: 1.0, fire: 1.0, earth: 1.5 },
  water:  { metal: 1.0, wood: 1.0, water: 1.0, fire: 1.5, earth: 0.75 },
  fire:   { metal: 1.5, wood: 1.0, water: 0.75, fire: 1.0, earth: 1.0 },
  earth:  { metal: 1.0, wood: 0.75, water: 1.5, fire: 1.0, earth: 1.0 }
};

class MiniBattleEngine {
  constructor() {
    this.maxRounds = 30;
  }

  /**
   * 执行防守反击战斗
   * @param {Object} defender - 防守方属性 { name, hp, maxHp, atk, def, element, skills, realm }
   * @param {Object} attacker - 攻击方属性 { name, hp, maxHp, atk, def, element, skills }
   * @returns {Object} 战斗结果
   */
  executeDefenseBattle(defender, attacker) {
    const log = [];
    let round = 0;
    let dHp = defender.hp;
    let aHp = attacker.hp;
    let dMp = defender.mp || 0;
    let aMp = attacker.mp || 0;
    const MAX_HP = defender.maxHp;

    // 境界压制
    const realmBonus = (defender.realm || 1) * 0.05;

    while (round < this.maxRounds && dHp > 0 && aHp > 0) {
      round++;
      const roundLog = { round, events: [] };

      // 攻击方先手 (魔修天性凶狠)
      const aElementMod = ELEMENTAL_CHART[attacker.element]?.[defender.element] || 1.0;
      const aDmg = Math.max(1, Math.floor(attacker.atk * aElementMod * (1 + Math.random() * 0.4) - defender.def * 0.5));
      dHp = Math.max(0, dHp - aDmg);
      roundLog.events.push({ who: attacker.name, target: defender.name, type: 'attack', damage: aDmg, remainHp: dHp });

      if (dHp <= 0) break;

      // 防守方反击 (境界压制加成)
      const dElementMod = ELEMENTAL_CHART[defender.element]?.[attacker.element] || 1.0;
      const dDmg = Math.max(1, Math.floor(defender.atk * dElementMod * (1 + Math.random() * 0.4 + realmBonus) - attacker.def * 0.5));
      aHp = Math.max(0, aHp - dDmg);
      roundLog.events.push({ who: defender.name, target: attacker.name, type: 'counter', damage: dDmg, remainHp: aHp });

      log.push(roundLog);
    }

    const defenderWon = dHp > 0;
    const survivorHp = defenderWon ? dHp : 0;

    return {
      rounds: round,
      defenderWon,
      defenderSurvivorHp: survivorHp,
      defenderHpPercent: Math.round((survivorHp / MAX_HP) * 100),
      attackerHp: Math.max(0, aHp),
      log: log.slice(0, 5) // 只保留前5回合详细日志
    };
  }

  /**
   * 执行主动反击战斗 (玩家反击入侵者)
   */
  executeCounterBattle(counter, original) {
    const log = [];
    let round = 0;
    let cHp = counter.hp;
    let oHp = original.hp;
    const MAX_HP = counter.maxHp;

    while (round < this.maxRounds && cHp > 0 && oHp > 0) {
      round++;
      const roundLog = { round, events: [] };

      // 反击方先手 (先发制人)
      const cElementMod = ELEMENTAL_CHART[counter.element]?.[original.element] || 1.0;
      const cDmg = Math.max(1, Math.floor(counter.atk * cElementMod * 1.2 * (1 + Math.random() * 0.3) - original.def * 0.4));
      oHp = Math.max(0, oHp - cDmg);
      roundLog.events.push({ who: counter.name, target: original.name, type: 'counter_attack', damage: cDmg, remainHp: oHp });

      if (oHp <= 0) break;

      // 原入侵者反击
      const oElementMod = ELEMENTAL_CHART[original.element]?.[counter.element] || 1.0;
      const oDmg = Math.max(1, Math.floor(original.atk * oElementMod * 0.8 * (1 + Math.random() * 0.3) - counter.def * 0.4));
      cHp = Math.max(0, cHp - oDmg);
      roundLog.events.push({ who: original.name, target: counter.name, type: 'attack', damage: oDmg, remainHp: cHp });

      log.push(roundLog);
    }

    return {
      rounds: round,
      counterWon: cHp > 0,
      counterSurvivorHp: Math.max(0, cHp),
      counterHpPercent: Math.round((Math.max(0, cHp) / MAX_HP) * 100),
      log: log.slice(0, 5)
    };
  }
}

const battleEngine = new MiniBattleEngine();

// =============================================
// 数据库初始化
// =============================================
function initTables() {
  try {
    db().exec(`
      CREATE TABLE IF NOT EXISTS cave_invasion_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invader_id INTEGER NOT NULL,
        target_id INTEGER NOT NULL,
        invader_power INTEGER NOT NULL DEFAULT 0,
        target_power INTEGER NOT NULL DEFAULT 0,
        result TEXT NOT NULL CHECK(result IN ('invader_won','target_defended','draw','counter_won','counter_lost')),
        stolen_spirit INTEGER DEFAULT 0,
        invader_hp INTEGER DEFAULT 0,
        defender_hp INTEGER DEFAULT 0,
        battle_log TEXT DEFAULT '[]',
        is_npc INTEGER DEFAULT 0,
        npc_type TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db().exec(`
      CREATE TABLE IF NOT EXISTS cave_defense_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        target_id INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        description TEXT,
        attacker_id INTEGER DEFAULT NULL,
        attacker_name TEXT DEFAULT '魔修',
        result TEXT,
        stolen_spirit INTEGER DEFAULT 0,
        rewards INTEGER DEFAULT 0,
        battle_result TEXT DEFAULT '{}',
        read INTEGER DEFAULT 0,
        expires_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db().exec(`
      CREATE TABLE IF NOT EXISTS cave_defense_stats (
        player_id INTEGER PRIMARY KEY,
        total_invasions_received INTEGER DEFAULT 0,
        total_invasions_defended INTEGER DEFAULT 0,
        total_invasions_lost INTEGER DEFAULT 0,
        total_counter_attacks INTEGER DEFAULT 0,
        total_counter_wins INTEGER DEFAULT 0,
        spirit_lost_total INTEGER DEFAULT 0,
        spirit_gained_total INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db().exec(`
      CREATE TABLE IF NOT EXISTS cave_invasion_cooldown (
        player_id INTEGER PRIMARY KEY,
        last_invade_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_invaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        invasion_count_today INTEGER DEFAULT 0,
        last_invasion_date TEXT DEFAULT NULL
      )
    `);

    // 索引
    db().exec(`CREATE INDEX IF NOT EXISTS idx_defense_events_target ON cave_defense_events(target_id, created_at DESC)`);
    db().exec(`CREATE INDEX IF NOT EXISTS idx_invasion_events_target ON cave_invasion_events(target_id, created_at DESC)`);
  } catch(e) {
    console.error('[cave-invasion] 表初始化失败:', e.message);
  }
}

initTables();

// =============================================
// 配置
// =============================================
const CONFIG = {
  INVADE_COST: 50,           // 主动入侵消耗灵石
  INVADE_COOLDOWN_MS: 5 * 60 * 1000,   // 主动入侵冷却 5分钟
  INVADE_COOLDOWN_DAILY: 10, // 每日最多入侵次数
  DEFENSE_WINDOW_MS: 30 * 60 * 1000,    // 防守窗口 30分钟
  NPC_INVASION_CHANCE: 0.15,  // 每分钟NPC入侵概率 (DNF异界风格)
  NPC_POWER_BASE: 500,        // NPC基础战力
  NPC_TYPES: [
    { id: 'ghost', name: '幽魂魔修', element: 'water', powerBase: 400,  reward: 80  },
    { id: 'demon', name: '血魔弟子', element: 'fire',  powerBase: 600,  reward: 120 },
    { id: 'evil',  name: '邪修长老', element: 'earth', powerBase: 900,  reward: 200 },
    { id: 'demon_lord', name: '魔君', element: 'metal', powerBase: 1500, reward: 500 }
  ]
};

// =============================================
// 工具函数
// =============================================
function getDateString(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getPlayerPower(playerId) {
  try {
    const p = db().prepare(`
      SELECT COALESCE(SUM(attack), 0) as atk, COALESCE(SUM(defense), 0) as def
      FROM equipment WHERE userId = ?
    `).get(playerId);
    const realm = db().prepare(`SELECT realm FROM Users WHERE id = ?`).get(playerId);
    const realmBonus = (realm?.realm || 1) * 50;
    return (p?.atk || 0) + (p?.def || 0) * 2 + realmBonus;
  } catch(e) { return 100; }
}

function getPlayerBattleAttr(playerId) {
  try {
    const p = db().prepare(`
      SELECT u.username, u.realm, u.hp as maxHp, u.atk as atk, u.element,
             COALESCE(SUM(e.attack), 0) as equipAtk,
             COALESCE(SUM(e.defense), 0) as equipDef
      FROM Users u
      LEFT JOIN equipment e ON e.userId = u.id
      WHERE u.id = ?
      GROUP BY u.id
    `).get(playerId);
    
    if (!p) return null;
    
    return {
      name: p.username,
      realm: p.realm || 1,
      hp: p.maxHp || 1000,
      maxHp: p.maxHp || 1000,
      mp: 100,
      atk: (p.atk || 10) + (p.equipAtk || 0),
      def: (p.equipDef || 0),
      element: p.element || 'metal'
    };
  } catch(e) { return null; }
}

function getPlayerName(playerId) {
  try {
    const p = db().prepare('SELECT username FROM Users WHERE id = ?').get(playerId);
    return p ? p.username : '神秘修士';
  } catch(e) { return '神秘修士'; }
}

function getOnlinePlayers() {
  try {
    // 简化版：返回最近活跃的玩家 (realm >= 1)
    return db().prepare(`
      SELECT id, username, realm FROM Users
      WHERE realm >= 2
      ORDER BY RANDOM()
      LIMIT 20
    `).all();
  } catch(e) { return []; }
}

function getRandomNPCTarget() {
  const players = getOnlinePlayers();
  if (players.length === 0) return null;
  return players[Math.floor(Math.random() * players.length)];
}

function syncDefenseStats(targetId, result, spiritDelta) {
  try {
    db().prepare(`
      INSERT INTO cave_defense_stats
        (player_id, total_invasions_received, total_invasions_defended,
         total_invasions_lost, spirit_lost_total, spirit_gained_total, updated_at)
      VALUES (?, 1, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(player_id) DO UPDATE SET
        total_invasions_received = total_invasions_received + 1,
        total_invasions_defended = total_invasions_defended + ?,
        total_invasions_lost = total_invasions_lost + ?,
        spirit_lost_total = spirit_lost_total + ?,
        spirit_gained_total = spirit_gained_total + ?,
        updated_at = datetime('now')
    `).run(
      targetId,
      result === 'target_defended' || result === 'counter_won' ? 1 : 0,
      result === 'invader_won' ? 1 : 0,
      result === 'invader_won' ? Math.abs(spiritDelta) : 0,
      result === 'target_defended' || result === 'counter_won' ? spiritDelta : 0,
      // for ON CONFLICT:
      result === 'target_defended' || result === 'counter_won' ? 1 : 0,
      result === 'invader_won' ? 1 : 0,
      result === 'invader_won' ? Math.abs(spiritDelta) : 0,
      result === 'target_defended' || result === 'counter_won' ? spiritDelta : 0
    );
  } catch(e) { console.error('[cave-invasion] stats sync error:', e.message); }
}

// =============================================
// NPC 入侵调度器 (供外部调用)
// =============================================
caveInvasionRouter.triggerNPCInvasion = function() {
  if (Math.random() > CONFIG.NPC_INVASION_CHANCE) return null;
  
  const target = getRandomNPCTarget();
  if (!target) return null;

  const npc = CONFIG.NPC_TYPES[Math.floor(Math.random() * CONFIG.NPC_TYPES.length)];
  const npcPower = npc.powerBase + Math.floor(Math.random() * 300);
  const targetPower = getPlayerPower(target.id);

  // 计算胜率 (DNF风格: 战力差距影响胜率)
  const powerRatio = npcPower / Math.max(targetPower, 1);
  const winThreshold = Math.min(Math.max(0.25, 0.45 - (powerRatio - 1) * 0.1), 0.75);
  const roll = Math.random();
  const npcWon = roll < winThreshold;

  let stolenSpirit = 0;
  let battleResult;

  if (npcWon) {
    stolenSpirit = Math.floor(Math.random() * npc.reward * 2) + npc.reward;
    // 尝试扣灵石
    try {
      const userStones = db().prepare('SELECT lingshi FROM Users WHERE id = ?').get(target.id);
      stolenSpirit = Math.min(stolenSpirit, userStones?.lingshi || 0);
      if (stolenSpirit > 0) {
        db().prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(stolenSpirit, target.id);
      }
    } catch(e) {}

    // 构建NPC攻击方
    const npcAttacker = {
      name: npc.name,
      hp: npcPower * 3,
      maxHp: npcPower * 3,
      atk: Math.floor(npcPower * 0.5),
      def: Math.floor(npcPower * 0.1),
      element: npc.element,
      mp: 0
    };
    const defender = getPlayerBattleAttr(target.id);
    if (defender) {
      battleResult = battleEngine.executeDefenseBattle(defender, npcAttacker);
    }
  } else {
    // NPC输了，给玩家奖励
    stolenSpirit = -Math.floor(npc.reward * 0.5);
    try {
      db().prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(Math.abs(stolenSpirit), target.id);
    } catch(e) {}

    const npcAttacker = {
      name: npc.name,
      hp: npcPower * 3,
      maxHp: npcPower * 3,
      atk: Math.floor(npcPower * 0.5),
      def: Math.floor(npcPower * 0.1),
      element: npc.element,
      mp: 0
    };
    const defender = getPlayerBattleAttr(target.id);
    if (defender) {
      battleResult = battleEngine.executeDefenseBattle(defender, npcAttacker);
    }
  }

  const result = npcWon ? 'invader_won' : 'target_defended';

  // 记录入侵事件
  try {
    db().prepare(`
      INSERT INTO cave_invasion_events
        (invader_id, target_id, invader_power, target_power, result,
         stolen_spirit, invader_hp, defender_hp, battle_log, is_npc, npc_type)
      VALUES (-1, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      target.id, npcPower, targetPower, result, stolenSpirit,
      battleResult?.attackerHp || 0,
      battleResult?.defenderSurvivorHp || 0,
      JSON.stringify(battleResult || {}),
      npc.id
    );
  } catch(e) {}

  // 写入防守事件通知
  const description = npcWon
    ? `【魔修入侵】${npc.name}闯入你的洞府！损失${stolenSpirit}灵石`
    : `【魔修入侵】${npc.name}试图入侵，被你击退！获得${Math.abs(stolenSpirit)}灵石`;

  try {
    db().prepare(`
      INSERT INTO cave_defense_events
        (target_id, event_type, description, attacker_id, attacker_name,
         result, stolen_spirit, rewards, battle_result, expires_at)
      VALUES (?, 'invasion_pending', ?, -1, ?, ?, ?, ?, ?, datetime('now', '+30 minutes'))
    `).run(target.id, description, npc.name, result, stolenSpirit, stolenSpirit, JSON.stringify(battleResult || {}));
  } catch(e) {}

  syncDefenseStats(target.id, result, stolenSpirit);

  return {
    targetId: target.id,
    targetName: target.username,
    npc,
    result,
    stolenSpirit,
    battleResult
  };
};

// =============================================
// API: GET /list - 获取入侵事件列表
// =============================================
caveInvasionRouter.get('/list', (req, res) => {
  const playerId = parseInt(req.query.playerId);
  if (!playerId) return res.json({ success: false, message: '缺少playerId' });

  try {
    const events = db().prepare(`
      SELECT * FROM cave_defense_events
      WHERE target_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(playerId);

    const stats = db().prepare(`
      SELECT * FROM cave_defense_stats WHERE player_id = ?
    `).get(playerId) || {};

    // 获取冷却状态
    const cooldown = db().prepare(`
      SELECT * FROM cave_invasion_cooldown WHERE player_id = ?
    `).get(playerId);
    const today = getDateString();
    const invasionCount = cooldown?.last_invasion_date === today ? (cooldown?.invasion_count_today || 0) : 0;

    const eventsWithNames = events.map(e => ({
      ...e,
      battleResult: e.battle_result ? JSON.parse(e.battle_result) : {},
      isExpired: e.expires_at && new Date(e.expires_at) < new Date(),
      canCounter: e.event_type === 'invasion_pending' && e.result === 'invader_won' && e.attacker_id > 0
    }));

    res.json({
      success: true,
      events: eventsWithNames,
      stats,
      cooldown: {
        invasionCount,
        maxInvasion: CONFIG.INVADE_COOLDOWN_DAILY,
        remainingInvasion: Math.max(0, CONFIG.INVADE_COOLDOWN_DAILY - invasionCount),
        lastInvadeAt: cooldown?.last_invade_at || null,
        cooldownMs: cooldown?.last_invade_at
          ? Math.max(0, CONFIG.INVADE_COOLDOWN_MS - (Date.now() - new Date(cooldown.last_invade_at).getTime()))
          : 0
      }
    });
  } catch(e) {
    res.json({ success: false, message: e.message });
  }
});

// =============================================
// API: GET /targets - 获取可入侵目标
// =============================================
caveInvasionRouter.get('/targets', (req, res) => {
  const playerId = parseInt(req.query.playerId);
  if (!playerId) return res.json({ success: false, message: '缺少playerId' });

  try {
    const targets = db().prepare(`
      SELECT id, username, realm FROM Users
      WHERE id != ? AND realm >= 2
      ORDER BY RANDOM()
      LIMIT 8
    `).all(playerId);

    const enriched = targets.map(t => {
      const power = getPlayerPower(t.id);
      const diff = power - getPlayerPower(playerId);
      return {
        ...t,
        power,
        powerDiff: diff,
        riskLevel: diff < -200 ? 'easy' : diff < 100 ? 'medium' : diff < 400 ? 'hard' : 'dangerous',
        potentialReward: Math.floor(Math.abs(diff) * 0.5) + 50
      };
    });

    res.json({ success: true, targets: enriched });
  } catch(e) {
    res.json({ success: false, message: e.message });
  }
});

// =============================================
// API: POST /invade - 发起入侵
// =============================================
caveInvasionRouter.post('/invade', (req, res) => {
  const { invaderId, targetId } = req.body;
  if (!invaderId || !targetId) return res.json({ success: false, message: '参数不完整' });

  const invaderIdInt = parseInt(invaderId);
  const targetIdInt = parseInt(targetId);

  if (invaderIdInt === targetIdInt) return res.json({ success: false, message: '不能入侵自己的洞府' });

  // 检查冷却
  try {
    const cooldown = db().prepare('SELECT * FROM cave_invasion_cooldown WHERE player_id = ?').get(invaderIdInt);
    const today = getDateString();

    if (cooldown) {
      const cooldownMs = Date.now() - new Date(cooldown.last_invade_at).getTime();
      if (cooldownMs < CONFIG.INVADE_COOLDOWN_MS) {
        return res.json({
          success: false,
          message: `冷却中，请等待${Math.ceil((CONFIG.INVADE_COOLDOWN_MS - cooldownMs) / 60000)}分钟`
        });
      }
      if (cooldown.last_invasion_date === today && cooldown.invasion_count_today >= CONFIG.INVADE_COOLDOWN_DAILY) {
        return res.json({ success: false, message: `今日入侵次数已用完（每日${CONFIG.INVADE_COOLDOWN_DAILY}次）` });
      }
    }

    // 消耗灵石
    const invaderFunds = db().prepare('SELECT lingshi, username FROM Users WHERE id = ?').get(invaderIdInt);
    if (!invaderFunds) return res.json({ success: false, message: '玩家不存在' });
    if ((invaderFunds.lingshi || 0) < CONFIG.INVADE_COST) {
      return res.json({ success: false, message: `灵石不足（需要${CONFIG.INVADE_COST}灵石）` });
    }
    db().prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(CONFIG.INVADE_COST, invaderIdInt);
  } catch(e) {}

  const invaderPower = getPlayerPower(invaderIdInt);
  const targetPower = getPlayerPower(targetIdInt);
  const powerRatio = invaderPower / Math.max(targetPower, 1);
  const winThreshold = Math.min(0.35 + (powerRatio - 1) * 0.15, 0.85);
  const roll = Math.random();

  let result, stolenSpirit = 0;
  let battleResult = {};

  if (roll < winThreshold) {
    result = 'invader_won';
    stolenSpirit = Math.floor(Math.random() * 150) + Math.floor(targetPower * 0.2) + 30;

    try {
      const targetStones = db().prepare('SELECT lingshi FROM Users WHERE id = ?').get(targetIdInt);
      stolenSpirit = Math.min(stolenSpirit, targetStones?.lingshi || 0);
      if (stolenSpirit > 0) {
        db().prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(stolenSpirit, targetIdInt);
        db().prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(stolenSpirit, invaderIdInt);
      }
    } catch(e) {}

    // 战斗日志
    const attacker = getPlayerBattleAttr(invaderIdInt);
    const defender = getPlayerBattleAttr(targetIdInt);
    if (attacker && defender) {
      battleResult = battleEngine.executeDefenseBattle(defender, attacker);
    }
  } else if (roll > 0.65) {
    result = 'draw';
    const attacker = getPlayerBattleAttr(invaderIdInt);
    const defender = getPlayerBattleAttr(targetIdInt);
    if (attacker && defender) {
      battleResult = battleEngine.executeDefenseBattle(defender, attacker);
    }
  } else {
    result = 'target_defended';
    const attacker = getPlayerBattleAttr(invaderIdInt);
    const defender = getPlayerBattleAttr(targetIdInt);
    if (attacker && defender) {
      battleResult = battleEngine.executeDefenseBattle(defender, attacker);
    }
  }

  // 记录事件
  try {
    db().prepare(`
      INSERT INTO cave_invasion_events
        (invader_id, target_id, invader_power, target_power, result,
         stolen_spirit, invader_hp, defender_hp, battle_log, is_npc)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      invaderIdInt, targetIdInt, invaderPower, targetPower, result,
      stolenSpirit,
      battleResult.attackerHp || 0,
      battleResult.defenderSurvivorHp || 0,
      JSON.stringify(battleResult)
    );
  } catch(e) {}

  // 更新冷却
  try {
    const today = getDateString();
    db().prepare(`
      INSERT INTO cave_invasion_cooldown (player_id, last_invade_at, last_invasion_date, invasion_count_today)
      VALUES (?, datetime('now'), ?, 1)
      ON CONFLICT(player_id) DO UPDATE SET
        last_invade_at = datetime('now'),
        last_invasion_date = ?,
        invasion_count_today = invasion_count_today + 1
    `).run(invaderIdInt, today, today);
  } catch(e) {}

  // 防守通知
  const invaderName = getPlayerName(invaderIdInt);
  const targetName = getPlayerName(targetIdInt);
  const descMap = {
    invader_won: `【洞府入侵】${invaderName}闯入你的洞府！损失${stolenSpirit}灵石！速去防守！`,
    target_defended: `【洞府入侵】${invaderName}试图入侵，被你成功击退！`,
    draw: `【洞府入侵】${invaderName}入侵，双方势均力敌！`
  };

  try {
    db().prepare(`
      INSERT INTO cave_defense_events
        (target_id, event_type, description, attacker_id, attacker_name,
         result, stolen_spirit, rewards, battle_result, expires_at)
      VALUES (?, 'invasion_pending', ?, ?, ?, ?, ?, ?, ?, datetime('now', '+30 minutes'))
    `).run(
      targetIdInt, descMap[result], invaderIdInt, invaderName,
      result, stolenSpirit, stolenSpirit, JSON.stringify(battleResult)
    );
  } catch(e) {}

  syncDefenseStats(targetIdInt, result, result === 'invader_won' ? -stolenSpirit : stolenSpirit);

  res.json({
    success: true,
    result,
    stolenSpirit,
    battleResult,
    invaderPower,
    targetPower,
    message: result === 'invader_won' ? `入侵成功！掠夺${stolenSpirit}灵石` :
             result === 'target_defended' ? '防守成功！入侵者被击退' : '平局收场'
  });
});

// =============================================
// API: POST /defend - 防守或反击
// =============================================
caveInvasionRouter.post('/defend', (req, res) => {
  const { playerId, eventId, action } = req.body;
  if (!playerId || !eventId) return res.json({ success: false, message: '参数不完整' });

  const playerIdInt = parseInt(playerId);
  const eventIdInt = parseInt(eventId);

  try {
    const evt = db().prepare(`
      SELECT * FROM cave_defense_events
      WHERE id = ? AND target_id = ?
    `).get(eventIdInt, playerIdInt);

    if (!evt) return res.json({ success: false, message: '入侵事件不存在' });
    if (evt.event_type !== 'invasion_pending') return res.json({ success: false, message: '事件已处理' });

    // 检查是否过期
    if (evt.expires_at && new Date(evt.expires_at) < new Date()) {
      db().prepare(`UPDATE cave_defense_events SET event_type='invasion_expired', read=1 WHERE id=?`).run(eventIdInt);
      return res.json({ success: false, message: '防守窗口已过期' });
    }

    const myPower = getPlayerPower(playerIdInt);
    const attackerId = evt.attacker_id;
    const isNPC = attackerId === -1;

    if (action === 'counter_attack') {
      // 反击
      if (isNPC) return res.json({ success: false, message: '无法反击NPC入侵' });
      if (evt.result !== 'invader_won') return res.json({ success: false, message: '未被入侵者赢，无法反击' });

      const counter = getPlayerBattleAttr(playerIdInt);
      const original = getPlayerBattleAttr(attackerId);
      if (!counter || !original) return res.json({ success: false, message: '玩家数据不存在' });

      // 反击方获得境界加成 + 先手优势
      counter.hp = counter.maxHp;
      const battleResult = battleEngine.executeCounterBattle(counter, original);

      if (battleResult.counterWon) {
        const recovered = Math.abs(evt.stolen_spirit) * 2;
        try {
          db().prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(recovered, playerIdInt);
        } catch(e) {}
        db().prepare(`
          UPDATE cave_defense_events
          SET event_type='invasion_counter_won', result='counter_won',
              rewards=?, battle_result=?, read=1
          WHERE id=?
        `).run(recovered, JSON.stringify(battleResult), eventIdInt);

        syncDefenseStats(playerIdInt, 'counter_won', recovered);
        res.json({
          success: true, result: 'counter_attack_won', recovered,
          battleResult,
          message: `反击成功！夺回${recovered}灵石（含双倍赔偿）`
        });
      } else {
        const extraLoss = Math.floor((evt.stolen_spirit || 50) * 0.5);
        try {
          db().prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(extraLoss, playerIdInt);
        } catch(e) {}
        db().prepare(`
          UPDATE cave_defense_events
          SET event_type='invasion_lost', result='counter_lost',
              battle_result=?, read=1
          WHERE id=?
        `).run(JSON.stringify(battleResult), eventIdInt);

        syncDefenseStats(playerIdInt, 'counter_lost', -extraLoss);
        res.json({
          success: true, result: 'counter_attack_lost', extraLoss,
          battleResult,
          message: `反击失败...额外损失${extraLoss}灵石`
        });
      }
    } else {
      // 普通防守
      const baseChance = 0.65;
      const realmBonus = (getPlayerBattleAttr(playerIdInt)?.realm || 1) * 0.03;
      const won = Math.random() < Math.min(baseChance + realmBonus, 0.85);

      const battleResult = {};
      if (won) {
        db().prepare(`
          UPDATE cave_defense_events
          SET event_type='invasion_defended', result='defended', read=1
          WHERE id=?
        `).run(eventIdInt);
        syncDefenseStats(playerIdInt, 'target_defended', 0);
        res.json({ success: true, result: 'defended', battleResult, message: '防守成功！你的洞府安然无恙' });
      } else {
        const loss = Math.floor((evt.stolen_spirit || 30) * 0.3);
        try {
          db().prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(loss, playerIdInt);
        } catch(e) {}
        db().prepare(`
          UPDATE cave_defense_events
          SET event_type='invasion_lost', result='lost', rewards=?, read=1
          WHERE id=?
        `).run(-loss, eventIdInt);
        syncDefenseStats(playerIdInt, 'invader_won', -loss);
        res.json({ success: true, result: 'lost', extraLoss: loss, battleResult, message: `防守失败...额外损失${loss}灵石` });
      }
    }
  } catch(e) {
    res.json({ success: false, message: e.message });
  }
});

// =============================================
// API: POST /read - 标记已读
// =============================================
caveInvasionRouter.post('/read', (req, res) => {
  const { playerId, eventId } = req.body;
  if (!playerId) return res.json({ success: false, message: '缺少playerId' });

  try {
    if (eventId) {
      db().prepare('UPDATE cave_defense_events SET read = 1 WHERE id = ? AND target_id = ?').run(eventId, playerId);
    } else {
      db().prepare('UPDATE cave_defense_events SET read = 1 WHERE target_id = ?').run(playerId);
    }
    res.json({ success: true });
  } catch(e) {
    res.json({ success: false, message: e.message });
  }
});

// =============================================
// API: GET /stats - 获取防守统计
// =============================================
caveInvasionRouter.get('/stats', (req, res) => {
  const playerId = parseInt(req.query.playerId);
  if (!playerId) return res.json({ success: false, message: '缺少playerId' });

  try {
    const stats = db().prepare('SELECT * FROM cave_defense_stats WHERE player_id = ?').get(playerId) || {};
    const todayEvents = db().prepare(`
      SELECT COUNT(*) as cnt FROM cave_defense_events
      WHERE target_id = ? AND date(created_at) = date('now')
    `).get(playerId);

    const rank = db().prepare(`
      SELECT player_id, total_invasions_defended,
             ROW_NUMBER() OVER (ORDER BY total_invasions_defended DESC) as rank
      FROM cave_defense_stats
      WHERE total_invasions_defended > 0
    `).all().findIndex(r => r.player_id === playerId) + 1;

    res.json({
      success: true,
      stats,
      todayInvasions: todayEvents?.cnt || 0,
      defenseRank: rank || 0
    });
  } catch(e) {
    res.json({ success: false, message: e.message });
  }
});

// =============================================
// API: POST /dispatch-npc - 手动触发一次NPC入侵 (后台管理接口)
// =============================================
caveInvasionRouter.post('/dispatch-npc', (req, res) => {
  // 简单的后台保护
  const secret = req.headers['x-admin-secret'];
  const ADMIN_SECRET = process.env.CAVE_INVASION_ADMIN_SECRET || 'admin-secret';
  if (secret !== ADMIN_SECRET) return res.status(403).json({ success: false, message: '权限不足' });

  const result = caveInvasionRouter.triggerNPCInvasion();
  if (!result) return res.json({ success: false, message: '本次未触发入侵（随机概率）' });

  res.json({ success: true, invasion: result });
});

module.exports = caveInvasionRouter;
