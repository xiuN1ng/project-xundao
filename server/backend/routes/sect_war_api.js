/**
 * 宗门战争/领地战系统 API - sect_war_api.js
 * 
 * 功能：
 * 1. 宗门宣战 - 消耗宣战令向其他宗门宣战
 * 2. 领地占领 - 占领地图上的领地据点（灵山/秘境/洞天）
 * 3. 防守设置 - 宗主设置防守阵容，其他成员协助防守
 * 4. 战争收益 - 占领期间每日获得灵石/贡献度
 * 5. 战斗记录 - 记录每次攻守战斗的详细结果
 * 
 * API前缀: /api/sect-war-api
 */

const express = require('express');
const router = express.Router();
const path = require('path');

// 数据库路径
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');
let db = null;

try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  console.log('[sect_war_api] 数据库连接成功:', DB_PATH);
} catch (e) {
  console.error('[sect_war_api] 数据库连接失败:', e.message);
}

// 战力系统
let combatPowerSystem = null;
try {
  combatPowerSystem = require('../game/combat_power');
} catch (e) {
  console.warn('[sect_war_api] 战力系统加载失败:', e.message);
}

// ============================================================
// 领地类型定义
// ============================================================
const TERRITORY_TYPES = {
  lingshan: { name: '灵山', emoji: '⛰️', daily_stone: 50, daily_contrib: 20, power_req: 0 },
  mijing:   { name: '秘境', emoji: '🏔️', daily_stone: 150, daily_contrib: 60, power_req: 5000 },
  dongtian: { name: '洞天', emoji: '🌀', daily_stone: 500, daily_contrib: 200, power_req: 20000 }
};

// 预定义领地数据
const SEED_TERRITORIES = [
  { territory_id: 'ls_01', name: '青云峰',     type: 'lingshan', power_req: 0,     daily_stone: 50,  daily_contrib: 20 },
  { territory_id: 'ls_02', name: '紫霄洞',     type: 'lingshan', power_req: 0,     daily_stone: 60,  daily_contrib: 25 },
  { territory_id: 'ls_03', name: '玄冰崖',     type: 'lingshan', power_req: 0,     daily_stone: 55,  daily_contrib: 22 },
  { territory_id: 'ls_04', name: '烈焰谷',     type: 'lingshan', power_req: 0,     daily_stone: 50,  daily_contrib: 20 },
  { territory_id: 'mj_01', name: '幽冥秘境',   type: 'mijing',   power_req: 5000,  daily_stone: 150, daily_contrib: 60 },
  { territory_id: 'mj_02', name: '虚空秘境',   type: 'mijing',   power_req: 8000,  daily_stone: 180, daily_contrib: 72 },
  { territory_id: 'mj_03', name: '万妖秘境',   type: 'mijing',   power_req: 10000, daily_stone: 200, daily_contrib: 80 },
  { territory_id: 'dt_01', name: '天帝洞天',   type: 'dongtian', power_req: 20000, daily_stone: 500, daily_contrib: 200 },
  { territory_id: 'dt_02', name: '鸿蒙洞天',   type: 'dongtian', power_req: 30000, daily_stone: 600, daily_contrib: 240 },
  { territory_id: 'dt_03', name: '归墟洞天',   type: 'dongtian', power_req: 50000, daily_stone: 800, daily_contrib: 320 },
];

// ============================================================
// 数据库初始化：建表 + 种子数据
// ============================================================
function initSectWarTables() {
  if (!db) return;

  try {
    // 领地表
    db.exec(`
      CREATE TABLE IF NOT EXISTS sect_war_territories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sect_id INTEGER DEFAULT NULL,
        territory_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        power_req INTEGER DEFAULT 0,
        daily_stone INTEGER DEFAULT 0,
        daily_contrib INTEGER DEFAULT 0,
        occupied_at DATETIME DEFAULT NULL,
        occupied_until DATETIME DEFAULT NULL,
        last_reward_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 宣战表
    db.exec(`
      CREATE TABLE IF NOT EXISTS sect_war_declarations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        attacker_sect INTEGER NOT NULL,
        defender_sect INTEGER NOT NULL,
        territory_id TEXT NOT NULL,
        declared_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'active',
        winner_id INTEGER DEFAULT NULL,
        ended_at DATETIME DEFAULT NULL,
        UNIQUE(attacker_sect, defender_sect, territory_id, status)
      )
    `);

    // 战斗记录表
    db.exec(`
      CREATE TABLE IF NOT EXISTS sect_war_battles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        declaration_id INTEGER NOT NULL,
        attacker_id INTEGER NOT NULL,
        defender_id INTEGER NOT NULL,
        attacker_sect INTEGER NOT NULL,
        defender_sect INTEGER NOT NULL,
        territory_id TEXT NOT NULL,
        attacker_power INTEGER DEFAULT 0,
        defender_power INTEGER DEFAULT 0,
        result TEXT DEFAULT 'attacker_win',
        battle_log TEXT DEFAULT '{}',
        damage_dealt INTEGER DEFAULT 0,
        damage_received INTEGER DEFAULT 0,
        fought_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (declaration_id) REFERENCES sect_war_declarations(id)
      )
    `);

    // 参战人员表
    db.exec(`
      CREATE TABLE IF NOT EXISTS sect_war_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        declaration_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        player_name TEXT,
        sect_id INTEGER NOT NULL,
        role TEXT DEFAULT 'member',
        defense_power INTEGER DEFAULT 0,
        contribution INTEGER DEFAULT 0,
        is_defender INTEGER DEFAULT 0,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (declaration_id) REFERENCES sect_war_declarations(id),
        UNIQUE(declaration_id, player_id)
      )
    `);

    // 种子领地数据
    const insertTerritory = db.prepare(`
      INSERT OR IGNORE INTO sect_war_territories
        (territory_id, name, type, power_req, daily_stone, daily_contrib)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertMany = db.transaction((territories) => {
      for (const t of territories) {
        insertTerritory.run(t.territory_id, t.name, t.type, t.power_req, t.daily_stone, t.daily_contrib);
      }
    });
    insertMany(SEED_TERRITORIES);

    console.log('[sect_war_api] 数据库表初始化完成');
  } catch (e) {
    console.error('[sect_war_api] 表初始化错误:', e.message);
  }
}

// 启动时初始化
initSectWarTables();

// ============================================================
// 辅助函数
// ============================================================

// 从 req 提取 playerId
function getPlayerId(req) {
  if (req.user && req.user.id) return req.user.id;
  return parseInt(req.body?.player_id || req.query?.player_id || req.query?.userId || 1);
}

// 从 req 提取 JWT user（用于 authenticateToken）
function getUserFromReq(req) {
  if (req.user) return req.user;
  const playerId = getPlayerId(req);
  return { id: playerId, username: `玩家${playerId}` };
}

// 获取玩家宗门信息
function getPlayerSect(playerId) {
  if (!db) return null;
  try {
    const user = db.prepare('SELECT sectId FROM Users WHERE id = ?').get(playerId);
    if (!user || !user.sectId) return null;
    const sect = db.prepare('SELECT * FROM sects WHERE id = ?').get(user.sectId);
    if (!sect) return null;
    const member = db.prepare('SELECT role FROM SectMembers WHERE userId = ? AND sectId = ?')
      .get(playerId, sect.id);
    return {
      ...sect,
      role: member ? member.role : '成员'
    };
  } catch (e) {
    return null;
  }
}

// 获取玩家战力（优先使用 combatPowerSystem）
function getPlayerPower(playerId) {
  if (!db) return 1000;
  try {
    const user = db.prepare('SELECT * FROM Users WHERE id = ?').get(playerId);
    if (!user) return 1000;
    if (combatPowerSystem) {
      const power = combatPowerSystem.getQuickCombatPower(user);
      return power || (user.level || 1) * 500;
    }
    // Fallback: 简单战力估算
    return Math.floor((user.level || 1) * 500 + (user.realmLevel || 1) * 2000);
  } catch (e) {
    return 1000;
  }
}

// 获取宗门战力（所有成员战力总和）
function getSectPower(sectId) {
  if (!db) return 0;
  try {
    const members = db.prepare(`
      SELECT u.id FROM SectMembers sm
      JOIN Users u ON u.id = sm.userId
      WHERE sm.sectId = ?
    `).all(sectId);
    return members.reduce((sum, m) => sum + getPlayerPower(m.id), 0);
  } catch (e) {
    return 0;
  }
}

// 检查/消耗物品
function hasItem(playerId, itemId, count = 1) {
  if (!db) return false;
  try {
    const row = db.prepare('SELECT quantity FROM player_inventory WHERE player_id = ? AND item_id = ?')
      .get(playerId, itemId);
    return row && row.quantity >= count;
  } catch (e) {
    // player_inventory 表可能不存在，尝试 playerData JSON
    try {
      const user = db.prepare('SELECT inventory FROM Users WHERE id = ?').get(playerId);
      if (!user || !user.inventory) return false;
      const inv = typeof user.inventory === 'string' ? JSON.parse(user.inventory) : user.inventory;
      const item = inv.find(i => i.item_id === itemId);
      return item && item.quantity >= count;
    } catch (e2) {
      return false;
    }
  }
}

function consumeItem(playerId, itemId, count = 1) {
  if (!db) return false;
  try {
    db.prepare('UPDATE player_inventory SET quantity = quantity - ? WHERE player_id = ? AND item_id = ? AND quantity >= ?')
      .run(count, playerId, itemId, count);
    return true;
  } catch (e) {
    // player_inventory 不存在，尝试 playerData JSON
    try {
      const user = db.prepare('SELECT inventory FROM Users WHERE id = ?').get(playerId);
      if (!user) return false;
      const inv = typeof user.inventory === 'string' ? JSON.parse(user.inventory) : (user.inventory || []);
      const item = inv.find(i => i.item_id === itemId);
      if (!item || item.quantity < count) return false;
      item.quantity -= count;
      if (item.quantity <= 0) {
        const idx = inv.findIndex(i => i.item_id === itemId);
        if (idx >= 0) inv.splice(idx, 1);
      }
      db.prepare('UPDATE Users SET inventory = ? WHERE id = ?').run(JSON.stringify(inv), playerId);
      return true;
    } catch (e2) {
      return false;
    }
  }
}

// 给予玩家灵石/贡献度
function rewardPlayer(playerId, stones = 0, contrib = 0) {
  if (!db) return;
  try {
    if (stones > 0) db.prepare('UPDATE Users SET spirit_stones = spirit_stones + ? WHERE id = ?').run(stones, playerId);
    if (contrib > 0) {
      db.prepare('UPDATE SectMembers SET contribution = contribution + ? WHERE userId = ?').run(contrib, playerId);
    }
  } catch (e) {
    console.warn('[sect_war_api] 奖励发放失败:', e.message);
  }
}

// 领地信息格式化
function formatTerritory(t) {
  const typeInfo = TERRITORY_TYPES[t.type] || {};
  return {
    territory_id: t.territory_id,
    name: t.name,
    type: t.type,
    typeName: typeInfo.name || t.type,
    emoji: typeInfo.emoji || '📍',
    power_req: t.power_req || 0,
    daily_stone: t.daily_stone || 0,
    daily_contrib: t.daily_contrib || 0,
    occupied: !!t.sect_id,
    sect_id: t.sect_id || null,
    sect_name: t.sect_name || null,
    occupied_at: t.occupied_at || null,
    can_attack: !t.sect_id,
    can_claim: !!t.sect_id
  };
}

// ============================================================
// 路由：GET /api/sect-war-api/territories
// 获取所有领地及其占领状态
// ============================================================
router.get('/territories', (req, res) => {
  if (!db) return res.status(503).json({ success: false, error: '数据库未连接' });

  try {
    const territories = db.prepare(`
      SELECT swt.*, s.name as sect_name
      FROM sect_war_territories swt
      LEFT JOIN sects s ON s.id = swt.sect_id
      ORDER BY swt.type, swt.id
    `).all();

    const byType = {};
    for (const t of territories) {
      const ft = formatTerritory(t);
      if (!byType[ft.type]) byType[ft.type] = [];
      byType[ft.type].push(ft);
    }

    res.json({
      success: true,
      territories: territories.map(formatTerritory),
      byType,
      summary: {
        total: territories.length,
        occupied: territories.filter(t => t.sect_id).length,
        free: territories.filter(t => !t.sect_id).length
      }
    });
  } catch (e) {
    console.error('[sect_war_api] /territories 错误:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============================================================
// 路由：GET /api/sect-war-api/my-sect
// 获取本宗门的领地与宣战状态
// ============================================================
router.get('/my-sect', (req, res) => {
  const playerId = getPlayerId(req);
  if (!db) return res.status(503).json({ success: false, error: '数据库未连接' });

  try {
    const sect = getPlayerSect(playerId);
    if (!sect) {
      return res.json({ success: false, error: '未加入宗门' });
    }

    // 本宗领地
    const territories = db.prepare(`
      SELECT * FROM sect_war_territories WHERE sect_id = ?
    `).all(sect.id);

    // 正在进行的宣战（我进攻的）
    const attacking = db.prepare(`
      SELECT swd.*, s.name as defender_sect_name, swt.name as territory_name, swt.type as territory_type
      FROM sect_war_declarations swd
      JOIN sects s ON s.id = swd.defender_sect
      JOIN sect_war_territories swt ON swt.territory_id = swd.territory_id
      WHERE swd.attacker_sect = ? AND swd.status = 'active'
    `).all(sect.id);

    // 正在被进攻（我防守的）
    const defending = db.prepare(`
      SELECT swd.*, s.name as attacker_sect_name, swt.name as territory_name, swt.type as territory_type
      FROM sect_war_declarations swd
      JOIN sects s ON s.id = swd.attacker_sect
      JOIN sect_war_territories swt ON swt.territory_id = swd.territory_id
      WHERE swd.defender_sect = ? AND swd.status = 'active'
    `).all(sect.id);

    // 总战力
    const sectPower = getSectPower(sect.id);
    const myPower = getPlayerPower(playerId);

    res.json({
      success: true,
      sect: {
        id: sect.id,
        name: sect.name,
        role: sect.role,
        isLeader: sect.role === '宗主' || sect.role === '掌门' || sect.leaderId === playerId,
        territories: territories.map(formatTerritory),
        totalPower: sectPower
      },
      attacking,
      defending,
      myPower,
      stats: {
        ownedTerritories: territories.length,
        activeWars: attacking.length + defending.length,
        totalDailyStone: territories.reduce((s, t) => s + (t.daily_stone || 0), 0),
        totalDailyContrib: territories.reduce((s, t) => s + (t.daily_contrib || 0), 0)
      }
    });
  } catch (e) {
    console.error('[sect_war_api] /my-sect 错误:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============================================================
// 路由：POST /api/sect-war-api/declare
// 宗门宣战（宗主发起，消耗宣战令）
// Body: { territory_id, target_sect_id? }
// ============================================================
router.post('/declare', (req, res) => {
  const playerId = getPlayerId(req);
  const { territory_id, target_sect_id } = req.body;

  if (!territory_id) {
    return res.status(400).json({ success: false, error: '缺少 territory_id' });
  }

  if (!db) return res.status(503).json({ success: false, error: '数据库未连接' });

  try {
    const sect = getPlayerSect(playerId);
    if (!sect) return res.status(403).json({ success: false, error: '未加入宗门' });

    const isLeader = sect.role === '宗主' || sect.role === '掌门' || sect.leaderId === playerId;
    if (!isLeader) {
      return res.status(403).json({ success: false, error: '只有宗主才能宣战' });
    }

    // 检查领地是否存在
    const territory = db.prepare('SELECT * FROM sect_war_territories WHERE territory_id = ?')
      .get(territory_id);
    if (!territory) {
      return res.status(404).json({ success: false, error: '领地不存在' });
    }

    // 检查是否已被占领（占领后才能挑战）
    if (!territory.sect_id) {
      return res.status(400).json({ success: false, error: '该领地目前无主，可直接占领，无需宣战' });
    }

    // 不能对自己宣战
    if (territory.sect_id === sect.id) {
      return res.status(400).json({ success: false, error: '不能对本宗门宣战' });
    }

    // 检查是否有正在进行的宣战
    const existing = db.prepare(`
      SELECT * FROM sect_war_declarations
      WHERE attacker_sect = ? AND territory_id = ? AND status = 'active'
    `).get(sect.id, territory_id);
    if (existing) {
      return res.status(400).json({ success: false, error: '该领地已有正在进行的宣战' });
    }

    // 检查宣战令物品
    const WAR_DECLARE_ITEM = 'declare_war';
    const hasWarDeclare = hasItem(playerId, WAR_DECLARE_ITEM, 1) || hasItem(playerId, '宣战令', 1);
    if (!hasWarDeclare) {
      return res.status(400).json({
        success: false,
        error: '缺少宣战令道具，请先获取宣战令'
      });
    }

    // 消耗宣战令
    consumeItem(playerId, WAR_DECLARE_ITEM, 1) || consumeItem(playerId, '宣战令', 1);

    // 创建宣战记录
    const result = db.prepare(`
      INSERT INTO sect_war_declarations
        (attacker_sect, defender_sect, territory_id, status)
      VALUES (?, ?, ?, 'active')
    `).run(sect.id, territory.sect_id, territory_id);

    res.json({
      success: true,
      message: '宣战成功！',
      declaration_id: result.lastInsertRowid,
      territory: formatTerritory(territory),
      defender_sect: territory.sect_id
    });
  } catch (e) {
    console.error('[sect_war_api] /declare 错误:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============================================================
// 路由：POST /api/sect-war-api/attack
// 发起攻击（触发战斗，消耗宣战的 declaration_id）
// Body: { declaration_id, attacker_player_id? }
// ============================================================
router.post('/attack', (req, res) => {
  const playerId = getPlayerId(req);
  const { declaration_id } = req.body;

  if (!declaration_id) {
    return res.status(400).json({ success: false, error: '缺少 declaration_id' });
  }

  if (!db) return res.status(503).json({ success: false, error: '数据库未连接' });

  try {
    const sect = getPlayerSect(playerId);
    if (!sect) return res.status(403).json({ success: false, error: '未加入宗门' });

    // 获取宣战信息
    const declaration = db.prepare(`
      SELECT swd.*, swt.name as territory_name, swt.type as territory_type,
             swt.daily_stone, swt.daily_contrib,
             ds.name as defender_sect_name, ds.leaderId as defender_leader_id
      FROM sect_war_declarations swd
      JOIN sect_war_territories swt ON swt.territory_id = swd.territory_id
      JOIN sects ds ON ds.id = swd.defender_sect
      WHERE swd.id = ? AND swd.status = 'active'
    `).get(declaration_id);

    if (!declaration) {
      return res.status(404).json({ success: false, error: '宣战记录不存在或已结束' });
    }

    // 验证：进攻方必须是宣战的宗门成员
    if (declaration.attacker_sect !== sect.id) {
      return res.status(403).json({ success: false, error: '只有攻方宗门成员才能发起攻击' });
    }

    const territory = db.prepare('SELECT * FROM sect_war_territories WHERE territory_id = ?')
      .get(declaration.territory_id);

    // 获取防守方阵容（所有已设置防守的成员）
    const defenders = db.prepare(`
      SELECT swp.*, u.level, u.realmLevel
      FROM sect_war_participants swp
      JOIN Users u ON u.id = swp.player_id
      WHERE swp.declaration_id = ? AND swp.is_defender = 1
      ORDER BY swp.defense_power DESC
    `).all(declaration_id);

    // 获取攻击方阵容
    const attackers = db.prepare(`
      SELECT swp.*, u.level, u.realmLevel
      FROM sect_war_participants swp
      JOIN Users u ON u.id = swp.player_id
      WHERE swp.declaration_id = ? AND swp.is_defender = 0
      ORDER BY swp.defense_power DESC
    `).all(declaration_id);

    // 攻方总战力
    const attackerPower = getPlayerPower(playerId);
    const isLeader = sect.role === '宗主' || sect.role === '掌门' || sect.leaderId === playerId;
    const leaderBonus = isLeader ? 1.15 : 1.0; // 宗主指挥加成 15%
    const totalAttackerPower = Math.floor(attackerPower * leaderBonus);

    // 守方战力（地利加成 +10%，防守阵容总战力）
    let totalDefenderPower = 0;
    if (defenders.length > 0) {
      totalDefenderPower = defenders.reduce((s, d) => s + (d.defense_power || 0), 0);
    } else {
      // 无防守阵容，用防守宗门宗主战力 + 地利加成
      totalDefenderPower = getPlayerPower(declaration.defender_leader_id) * 1.1;
    }

    // 战斗计算
    const terrainBonus = 1.1; // 防守方地利
    const effectiveDefender = Math.floor(totalDefenderPower * terrainBonus);

    // 胜负概率
    const powerRatio = totalAttackerPower / Math.max(1, effectiveDefender);
    const winProb = Math.min(0.95, powerRatio / (1 + powerRatio));
    const rand = Math.random();
    const attackerWins = rand < winProb;

    // 计算伤害
    const damageDealt = Math.floor(totalAttackerPower * (0.3 + Math.random() * 0.3));
    const damageReceived = Math.floor(effectiveDefender * (0.25 + Math.random() * 0.25));

    // 生成战报
    const battleLog = {
      timestamp: new Date().toISOString(),
      territory: declaration.territory_name,
      attackerSect: sect.name,
      defenderSect: declaration.defender_sect_name,
      attackerPlayer: playerId,
      attackerPower: totalAttackerPower,
      defenderPower: effectiveDefender,
      winProbability: Math.floor(winProb * 100),
      terrainBonus: '10%',
      leaderBonus: isLeader ? '15%' : '0%',
      damageDealt,
      damageReceived,
      result: attackerWins ? 'attacker_win' : 'defender_win',
      random: rand.toFixed(4),
      winThreshold: (winProb).toFixed(4)
    };

    // 记录战斗
    db.prepare(`
      INSERT INTO sect_war_battles
        (declaration_id, attacker_id, defender_id, attacker_sect, defender_sect,
         territory_id, attacker_power, defender_power, result, battle_log, damage_dealt, damage_received)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      declaration_id, playerId,
      defenders[0]?.player_id || declaration.defender_leader_id || 0,
      sect.id, declaration.defender_sect,
      declaration.territory_id, totalAttackerPower, effectiveDefender,
      attackerWins ? 'attacker_win' : 'defender_win',
      JSON.stringify(battleLog), damageDealt, damageReceived
    );

    // 更新攻击方参战记录
    db.prepare(`
      INSERT OR REPLACE INTO sect_war_participants
        (declaration_id, player_id, player_name, sect_id, role, contribution, is_defender)
      VALUES (?, ?, ?, ?, 'attacker', 0, 0)
    `).run(declaration_id, playerId, `玩家${playerId}`, sect.id);

    let outcome;
    if (attackerWins) {
      outcome = '进攻方胜利！领地归属已变更';

      // 变更领地归属
      db.prepare(`
        UPDATE sect_war_territories
        SET sect_id = ?, occupied_at = datetime('now'), occupied_until = NULL
        WHERE territory_id = ?
      `).run(sect.id, declaration.territory_id);

      // 更新宣战状态
      db.prepare(`
        UPDATE sect_war_declarations
        SET status = ' attacker_win', winner_id = ?, ended_at = datetime('now')
        WHERE id = ?
      `).run(sect.id, declaration_id);

      // 奖励战胜方（参与成员平分）
      const attackerMembers = db.prepare(`
        SELECT userId FROM SectMembers WHERE sectId = ? LIMIT 5
      `).all(sect.id);
      const rewardStone = Math.floor((declaration.daily_stone || 50) * 0.5);
      const rewardContrib = Math.floor((declaration.daily_contrib || 20) * 0.3);
      for (const m of attackerMembers) {
        rewardPlayer(m.userId, rewardStone, rewardContrib);
      }
    } else {
      outcome = '防守方胜利！领地归属不变';

      // 更新宣战状态
      db.prepare(`
        UPDATE sect_war_declarations
        SET status = 'defender_win', winner_id = ?, ended_at = datetime('now')
        WHERE id = ?
      `).run(declaration.defender_sect, declaration_id);
    }

    res.json({
      success: true,
      result: attackerWins ? 'win' : 'lose',
      outcome,
      battle: {
        id: null,
        attackerPower: totalAttackerPower,
        defenderPower: effectiveDefender,
        winProbability: Math.floor(winProb * 100),
        terrainBonus: '10%',
        leaderBonus: isLeader ? '15%' : '0%',
        damageDealt,
        damageReceived,
        result: attackerWins ? 'attacker_win' : 'defender_win'
      },
      declaration_id
    });
  } catch (e) {
    console.error('[sect_war_api] /attack 错误:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============================================================
// 路由：POST /api/sect-war-api/defend
// 设置防守阵容
// Body: { declaration_id, defense_power? }
// ============================================================
router.post('/defend', (req, res) => {
  const playerId = getPlayerId(req);
  const { declaration_id, defense_power } = req.body;

  if (!declaration_id) {
    return res.status(400).json({ success: false, error: '缺少 declaration_id' });
  }

  if (!db) return res.status(503).json({ success: false, error: '数据库未连接' });

  try {
    const sect = getPlayerSect(playerId);
    if (!sect) return res.status(403).json({ success: false, error: '未加入宗门' });

    const declaration = db.prepare(`
      SELECT * FROM sect_war_declarations WHERE id = ? AND status = 'active'
    `).get(declaration_id);

    if (!declaration) {
      return res.status(404).json({ success: false, error: '宣战记录不存在或已结束' });
    }

    // 防守方必须是防守宗门成员，或进攻方宗门成员也可以协助进攻
    if (declaration.defender_sect !== sect.id && declaration.attacker_sect !== sect.id) {
      return res.status(403).json({ success: false, error: '不是宣战双方宗门成员' });
    }

    const isDefender = declaration.defender_sect === sect.id;
    const isAttacker = declaration.attacker_sect === sect.id;

    // 计算防守战力（如果没有提供，使用当前战力）
    let power = defense_power;
    if (!power || power <= 0) {
      power = getPlayerPower(playerId);
    }

    // 检查是否已有记录
    const existing = db.prepare(`
      SELECT * FROM sect_war_participants WHERE declaration_id = ? AND player_id = ?
    `).get(declaration_id, playerId);

    if (existing) {
      db.prepare(`
        UPDATE sect_war_participants
        SET defense_power = ?, is_defender = ?, contribution = 0
        WHERE declaration_id = ? AND player_id = ?
      `).run(power, isDefender ? 1 : 0, declaration_id, playerId);
    } else {
      db.prepare(`
        INSERT INTO sect_war_participants
          (declaration_id, player_id, player_name, sect_id, role, defense_power, is_defender)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(declaration_id, playerId, `玩家${playerId}`, sect.id,
             isDefender ? 'defender' : 'attacker', power, isDefender ? 1 : 0);
    }

    res.json({
      success: true,
      message: isDefender ? '防守阵容已设置' : '进攻阵容已设置',
      defense_power: power,
      is_defender: isDefender
    });
  } catch (e) {
    console.error('[sect_war_api] /defend 错误:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============================================================
// 路由：GET /api/sect-war-api/battles
// 战斗记录（分页）
// ============================================================
router.get('/battles', (req, res) => {
  const playerId = getPlayerId(req);
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.page_size) || 20));

  if (!db) return res.status(503).json({ success: false, error: '数据库未连接' });

  try {
    const sect = getPlayerSect(playerId);

    let whereClause = '';
    let params = [];

    if (sect) {
      whereClause = 'WHERE swb.attacker_sect = ? OR swb.defender_sect = ?';
      params = [sect.id, sect.id];
    } else if (playerId) {
      whereClause = 'WHERE swb.attacker_id = ? OR swb.defender_id = ?';
      params = [playerId, playerId];
    }

    const total = db.prepare(`
      SELECT COUNT(*) as cnt FROM sect_war_battles swb ${whereClause}
    `).get(...params)?.cnt || 0;

    const battles = db.prepare(`
      SELECT swb.*,
             asect.name as attacker_sect_name,
             dsect.name as defender_sect_name,
             au.username as attacker_name,
             du.username as defender_name,
             swt.name as territory_name
      FROM sect_war_battles swb
      LEFT JOIN sects asect ON asect.id = swb.attacker_sect
      LEFT JOIN sects dsect ON dsect.id = swb.defender_sect
      LEFT JOIN Users au ON au.id = swb.attacker_id
      LEFT JOIN Users du ON du.id = swb.defender_id
      LEFT JOIN sect_war_territories swt ON swt.territory_id = swb.territory_id
      ${whereClause}
      ORDER BY swb.fought_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, (page - 1) * pageSize);

    res.json({
      success: true,
      battles: battles.map(b => ({
        id: b.id,
        declaration_id: b.declaration_id,
        territory_id: b.territory_id,
        territory_name: b.territory_name,
        attacker: {
          id: b.attacker_id,
          name: b.attacker_name || `玩家${b.attacker_id}`,
          sect: { id: b.attacker_sect, name: b.attacker_sect_name },
          power: b.attacker_power
        },
        defender: {
          id: b.defender_id,
          name: b.defender_name || `玩家${b.defender_id}`,
          sect: { id: b.defender_sect, name: b.defender_sect_name },
          power: b.defender_power
        },
        result: b.result,
        damage_dealt: b.damage_dealt,
        damage_received: b.damage_received,
        battle_log: b.battle_log ? JSON.parse(b.battle_log) : null,
        fought_at: b.fought_at
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (e) {
    console.error('[sect_war_api] /battles 错误:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============================================================
// 路由：GET /api/sect-war-api/rewards
// 领地每日收益预览
// ============================================================
router.get('/rewards', (req, res) => {
  const playerId = getPlayerId(req);

  if (!db) return res.status(503).json({ success: false, error: '数据库未连接' });

  try {
    const sect = getPlayerSect(playerId);
    if (!sect) return res.status(403).json({ success: false, error: '未加入宗门' });

    const territories = db.prepare(`
      SELECT * FROM sect_war_territories WHERE sect_id = ?
    `).all(sect.id);

    if (territories.length === 0) {
      return res.json({
        success: true,
        canClaim: false,
        message: '本宗未占领任何领地',
        territories: [],
        totalDailyStone: 0,
        totalDailyContrib: 0
      });
    }

    // 检查是否可领取
    const lastClaim = territories[0]?.last_reward_at;
    let canClaim = false;
    if (!lastClaim) {
      canClaim = true;
    } else {
      const lastDate = new Date(lastClaim);
      const now = new Date();
      canClaim = now.getDate() !== lastDate.getDate() || now.getMonth() !== lastDate.getMonth() || now.getFullYear() !== lastDate.getFullYear();
    }

    const totalStone = territories.reduce((s, t) => s + (t.daily_stone || 0), 0);
    const totalContrib = territories.reduce((s, t) => s + (t.daily_contrib || 0), 0);

    res.json({
      success: true,
      canClaim,
      nextClaimAt: canClaim ? '现在可领取' : getNextClaimTime(lastClaim),
      territories: territories.map(t => ({
        territory_id: t.territory_id,
        name: t.name,
        type: t.type,
        typeName: TERRITORY_TYPES[t.type]?.name || t.type,
        emoji: TERRITORY_TYPES[t.type]?.emoji || '📍',
        daily_stone: t.daily_stone || 0,
        daily_contrib: t.daily_contrib || 0,
        last_reward_at: t.last_reward_at
      })),
      totalDailyStone: totalStone,
      totalDailyContrib: totalContrib,
      stats: {
        lingshan: territories.filter(t => t.type === 'lingshan').length,
        mijing: territories.filter(t => t.type === 'mijing').length,
        dongtian: territories.filter(t => t.type === 'dongtian').length
      }
    });
  } catch (e) {
    console.error('[sect_war_api] /rewards 错误:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// 辅助：计算下次可领取时间
function getNextClaimTime(lastClaim) {
  if (!lastClaim) return '现在';
  const d = new Date(lastClaim);
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// ============================================================
// 路由：POST /api/sect-war-api/claim-daily
// 领取每日领地收益
// ============================================================
router.post('/claim-daily', (req, res) => {
  const playerId = getPlayerId(req);

  if (!db) return res.status(503).json({ success: false, error: '数据库未连接' });

  try {
    const sect = getPlayerSect(playerId);
    if (!sect) return res.status(403).json({ success: false, error: '未加入宗门' });

    const territories = db.prepare(`
      SELECT * FROM sect_war_territories WHERE sect_id = ?
    `).all(sect.id);

    if (territories.length === 0) {
      return res.status(400).json({ success: false, error: '本宗未占领任何领地' });
    }

    // 检查是否可领取（今日是否已领取）
    const lastClaim = territories[0]?.last_reward_at;
    if (lastClaim) {
      const lastDate = new Date(lastClaim);
      const now = new Date();
      const sameDay = now.getDate() === lastDate.getDate() &&
        now.getMonth() === lastDate.getMonth() &&
        now.getFullYear() === lastDate.getFullYear();
      if (sameDay) {
        return res.status(400).json({
          success: false,
          error: '今日已领取过领地收益，请明日再来',
          nextClaimAt: getNextClaimTime(lastClaim)
        });
      }
    }

    // 计算总奖励
    const totalStone = territories.reduce((s, t) => s + (t.daily_stone || 0), 0);
    const totalContrib = territories.reduce((s, t) => s + (t.daily_contrib || 0), 0);

    // 发放灵石
    if (totalStone > 0) {
      db.prepare('UPDATE Users SET spirit_stones = spirit_stones + ? WHERE id = ?')
        .run(totalStone, playerId);
    }

    // 发放贡献度
    if (totalContrib > 0) {
      db.prepare('UPDATE SectMembers SET contribution = contribution + ? WHERE sectId = ? AND userId = ?')
        .run(totalContrib, sect.id, playerId);
    }

    // 更新领取时间
    db.prepare(`
      UPDATE sect_war_territories SET last_reward_at = datetime('now') WHERE sect_id = ?
    `).run(sect.id);

    // 获取宗门成员数量，计算分配
    const memberCount = db.prepare('SELECT COUNT(*) as cnt FROM SectMembers WHERE sectId = ?')
      .get(sect.id)?.cnt || 1;
    const perMemberStone = Math.floor(totalStone / memberCount);
    const perMemberContrib = Math.floor(totalContrib / memberCount);

    res.json({
      success: true,
      message: `领地收益领取成功！`,
      rewards: {
        totalStone,
        totalContrib,
        perMemberStone,
        perMemberContrib,
        territoriesCount: territories.length,
        memberCount
      },
      received: {
        stone: totalStone,
        contrib: totalContrib
      }
    });
  } catch (e) {
    console.error('[sect_war_api] /claim-daily 错误:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============================================================
// 路由：POST /api/sect-war-api/occupy
// 直接占领无主领地（无需宣战）
// Body: { territory_id }
// ============================================================
router.post('/occupy', (req, res) => {
  const playerId = getPlayerId(req);
  const { territory_id } = req.body;

  if (!territory_id) {
    return res.status(400).json({ success: false, error: '缺少 territory_id' });
  }

  if (!db) return res.status(503).json({ success: false, error: '数据库未连接' });

  try {
    const sect = getPlayerSect(playerId);
    if (!sect) return res.status(403).json({ success: false, error: '未加入宗门' });

    const territory = db.prepare('SELECT * FROM sect_war_territories WHERE territory_id = ?')
      .get(territory_id);

    if (!territory) {
      return res.status(404).json({ success: false, error: '领地不存在' });
    }

    if (territory.sect_id) {
      return res.status(400).json({
        success: false,
        error: '该领地已被其他宗门占领，请通过宣战夺取',
        occupiedBy: territory.sect_id
      });
    }

    // 检查战力要求
    const sectPower = getSectPower(sect.id);
    if (sectPower < (territory.power_req || 0)) {
      return res.status(400).json({
        success: false,
        error: `宗门战力不足，占领该领地需要 ${territory.power_req} 战力，当前 ${sectPower}`,
        required: territory.power_req,
        current: sectPower
      });
    }

    // 直接占领
    db.prepare(`
      UPDATE sect_war_territories
      SET sect_id = ?, occupied_at = datetime('now'), occupied_until = NULL
      WHERE territory_id = ?
    `).run(sect.id, territory_id);

    res.json({
      success: true,
      message: `成功占领 ${territory.name}！`,
      territory: formatTerritory({ ...territory, sect_id: sect.id })
    });
  } catch (e) {
    console.error('[sect_war_api] /occupy 错误:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
