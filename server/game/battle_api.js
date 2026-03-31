/**
 * 战斗系统 API - 基于新战斗引擎
 * 
 * 端点:
 *   POST /api/battle/start     - 开始战斗
 *   POST /api/battle/quick     - 快速战斗
 *   GET  /api/battle/calculate - 计算战力
 *   GET  /api/battle/enemy     - 获取敌人配置
 */

const express = require('express');
const router = express.Router();
const BattleEngine = require('./battle_engine');

// 统一 userId 提取
function extractUserId(req) {
  return req.userId || parseInt(req.query.player_id) || parseInt((req.body && req.body.player_id)) || 1;
}

// 统一数据库连接
let db = null;
function getDb() {
  if (!db) {
    try {
      const Database = require('better-sqlite3');
      const path = require('path');
      const dbPath = path.join(__dirname, '..', 'data', 'game.db');
      db = new Database(dbPath);
      db.pragma('journal_mode = WAL');
    } catch (e) {
      console.log('[Battle] DB连接失败:', e.message);
    }
  }
  return db;
}

/**
 * POST /api/battle/start
 * 开始一场战斗（完整版，返回回放）
 */
router.post('/start', (req, res) => {
  const userId = extractUserId(req);
  const database = getDb();

  try {
    const player = getPlayerData(userId, database);
    if (!player) {
      return res.json({ success: false, message: '玩家不存在' });
    }

    const enemyData = req.body.enemy || getDefaultEnemy(player.level);
    
    const engine = new BattleEngine({
      maxRounds: 100,
      enableReplay: true
    });

    const result = engine.startBattle(player, enemyData);

    if (result.rewards) {
      grantRewards(userId, result.rewards, database);
    }

    console.log(`[Battle] 玩家${userId} vs ${enemyData.name} - ${result.winner}胜利 (${result.rounds}回合) | 奖励: exp+${result.rewards?.exp || 0} gold+${result.rewards?.gold || 0}`);

    res.json({
      success: true,
      ...result
    });

  } catch (err) {
    console.error('[Battle] POST /start error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

/**
 * POST /api/battle/quick
 * 快速战斗（不返回详细回放）
 */
router.post('/quick', (req, res) => {
  const userId = extractUserId(req);
  const database = getDb();

  try {
    const player = getPlayerData(userId, database);
    if (!player) {
      return res.json({ success: false, message: '玩家不存在' });
    }

    const enemyData = req.body.enemy || getDefaultEnemy(player.level);
    
    const engine = new BattleEngine({
      maxRounds: 100,
      enableReplay: false
    });

    const result = engine.startBattle(player, enemyData);

    if (result.rewards) {
      grantRewards(userId, result.rewards, database);
    }

    res.json({
      success: true,
      winner: result.winner,
      rounds: result.rounds,
      rewards: result.rewards,
      playerHp: result.player.hpPercent,
      enemyHp: result.enemy.hpPercent
    });

  } catch (err) {
    console.error('[Battle] POST /quick error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

/**
 * GET /api/battle/calculate
 * 计算角色战力
 */
router.get('/calculate', (req, res) => {
  const userId = extractUserId(req);
  const database = getDb();

  try {
    const player = getPlayerData(userId, database);
    if (!player) {
      return res.json({ success: false, message: '玩家不存在' });
    }

    const power = calculatePower(player);

    res.json({
      success: true,
      power: Math.floor(power),
      breakdown: {
        atk: player.atk,
        def: player.def,
        hp: player.hp,
        spd: player.spd,
        crit: (player.critRate || 0) * 10
      }
    });

  } catch (err) {
    console.error('[Battle] GET /calculate error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

/**
 * GET /api/battle
 * 获取竞技场信息（对手列表、玩家状态）
 */
router.get('/', (req, res) => {
  const playerId = extractUserId(req);
  const database = getDb();

  try {
    let player = null;
    if (database) {
      player = database.prepare('SELECT * FROM player WHERE id=?').get(playerId);
    }

    if (!player) {
      // 返回默认数据（玩家不存在时）
      return res.json({
        success: true,
        data: {
          player: { id: playerId, name: 'player_' + playerId, level: 1 },
          opponents: [
            { id: 1, name: '散修', level: 1, rank: 100, hp: 800, maxHp: 800, atk: 60, def: 30 },
            { id: 2, name: '炼气士', level: 2, rank: 200, hp: 1040, maxHp: 1040, atk: 75, def: 36 },
            { id: 3, name: '筑基修士', level: 3, rank: 300, hp: 1352, maxHp: 1352, atk: 93, def: 43 }
          ],
          arena: { rank: 0, winCount: 0, streak: 0 }
        }
      });
    }

    const level = player.level || 1;
    const opponents = [];
    for (let i = -2; i <= 3; i++) {
      if (i === 0) continue;
      const oppLevel = Math.max(1, level + i);
      opponents.push({
        id: `npc_${oppLevel}_${Math.abs(i)}`,
        name: ['散修', '炼气士', '筑基修士', '金丹真人', '元婴老怪', '化神大能'][Math.min(oppLevel - 1, 5)],
        level: oppLevel,
        rank: oppLevel * 100,
        hp: Math.floor(800 * Math.pow(1.3, oppLevel - 1)),
        maxHp: Math.floor(800 * Math.pow(1.3, oppLevel - 1)),
        atk: Math.floor(60 * Math.pow(1.25, oppLevel - 1)),
        def: Math.floor(30 * Math.pow(1.2, oppLevel - 1))
      });
    }

    res.json({
      success: true,
      data: {
        player: { id: player.id, name: player.name || 'player_' + player.id, level: player.level || 1 },
        opponents,
        arena: { rank: 0, winCount: 0, streak: 0 }
      }
    });
  } catch (err) {
    console.error('[Battle] GET / error:', err.message);
    res.json({ success: true, data: { opponents: [], arena: { rank: 0, winCount: 0, streak: 0 } } });
  }
});

/**
 * GET /api/battle/enemy
 * 获取敌人配置
 */
router.get('/enemy', (req, res) => {
  const chapter = parseInt(req.query.chapter) || 1;
  const type = req.query.type || 'normal';
  const enemy = generateEnemy(chapter, type);
  res.json({ success: true, enemy });
});

/**
 * 获取玩家数据
 */
function getPlayerData(userId, database) {
  if (!database) return null;

  try {
    const player = database.prepare('SELECT * FROM player WHERE id = ?').get(userId);
    if (!player) {
      const firstPlayer = database.prepare('SELECT * FROM player LIMIT 1').get();
      if (!firstPlayer) return null;
      return buildPlayerData(firstPlayer, database);
    }
    return buildPlayerData(player, database);
  } catch (e) {
    console.error('[Battle] getPlayerData error:', e.message);
    return null;
  }
}

/**
 * 从player记录构建战斗数据
 */
function buildPlayerData(player, database) {
  try {
    const equipBonus = getEquipmentBonus(player.id, database);
    const skills = getPlayerSkills(player.id, database);
    const baseHp = 1000 + (player.level || 1) * 100;
    const totalHp = baseHp + equipBonus.hp;

    return {
      id: player.id,
      name: player.username || '修仙者',
      level: player.level || 1,
      realm: player.realm_level || 1,
      hp: totalHp,
      maxHp: totalHp,
      mp: 100,
      maxMp: 100,
      atk: (50 + (player.level || 1) * 10) + equipBonus.atk,
      def: (20 + (player.level || 1) * 5) + equipBonus.def,
      spd: 50 + (player.level || 1),
      critRate: 10,
      critDmg: 150,
      acc: 90,
      eva: 10,
      element: 'metal',
      skills: skills,
      penetration: equipBonus.penetration || 0
    };
  } catch (e) {
    console.error('[Battle] buildPlayerData error:', e.message);
    return null;
  }
}

/**
 * 获取装备加成
 */
function getEquipmentBonus(userId, database) {
  const bonus = { atk: 0, def: 0, hp: 0, penetration: 0 };
  
  try {
    const equips = database.prepare(`
      SELECT fe.bonus_atk, fe.bonus_def, fe.bonus_hp, fe.bonus_penetration
      FROM player_equipped pe
      JOIN forge_equipment fe ON pe.equipment_id = fe.id
      WHERE pe.player_id = ?
    `).all(userId);

    for (const equip of equips) {
      bonus.atk += equip.bonus_atk || 0;
      bonus.def += equip.bonus_def || 0;
      bonus.hp += equip.bonus_hp || 0;
      bonus.penetration += equip.bonus_penetration || 0;
    }
  } catch (e) {
    // 忽略
  }

  return bonus;
}

/**
 * 获取玩家技能
 */
function getPlayerSkills(userId, database) {
  try {
    const rows = database.prepare(`
      SELECT g.id, g.name, g.element, g.type, g.multiplier, g.mp_cost as mpCost, 
             g.cooldown, g.effect, pg.current_level as level
      FROM player_gongfa pg
      JOIN gongfa g ON pg.gongfa_id = g.id
      WHERE pg.player_id = ? AND pg.is_learned = 1
      LIMIT 5
    `).all(userId);

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      element: row.element || 'metal',
      type: row.type || 'attack',
      multiplier: (row.multiplier || 1) * (1 + (row.level || 1) * 0.1),
      mpCost: row.mpCost || 10,
      cooldown: row.cooldown || 3,
      currentCooldown: 0,
      effect: row.effect ? JSON.parse(row.effect) : null
    }));
  } catch (e) {
    return [{
      id: 'normal_attack',
      name: '普通攻击',
      element: 'metal',
      type: 'attack',
      multiplier: 1.0,
      mpCost: 0,
      cooldown: 0,
      currentCooldown: 0,
      effect: null
    }];
  }
}

/**
 * 计算战力
 */
function calculatePower(player) {
  return (
    (player.atk || 0) * 1.0 +
    (player.def || 0) * 0.5 +
    (player.hp || 0) * 0.1 +
    (player.spd || 0) * 2 +
    (player.critRate || 0) * 10
  );
}

/**
 * 获取默认敌人
 */
function getDefaultEnemy(level) {
  const elements = ['metal', 'wood', 'water', 'fire', 'earth'];
  
  return {
    id: 'enemy_default',
    name: '妖兽',
    level: level,
    hp: Math.floor(1000 * Math.pow(1.3, level)),
    maxHp: Math.floor(1000 * Math.pow(1.3, level)),
    atk: Math.floor(80 * Math.pow(1.25, level)),
    def: Math.floor(40 * Math.pow(1.2, level)),
    spd: 45,
    critRate: 5,
    critDmg: 150,
    acc: 85,
    eva: 5,
    element: elements[level % 5],
    skills: []
  };
}

/**
 * 生成敌人
 */
function generateEnemy(chapter, type) {
  const baseLevel = chapter;
  const elements = ['metal', 'wood', 'water', 'fire', 'earth'];
  
  const config = {
    normal: { hpMod: 1.0, atkMod: 1.0, defMod: 1.0 },
    elite: { hpMod: 2.5, atkMod: 1.3, defMod: 1.3 },
    boss: { hpMod: 10, atkMod: 2.0, defMod: 1.8 }
  };

  const mod = config[type] || config.normal;

  return {
    id: 'enemy_' + type + '_' + chapter,
    name: type === 'boss' ? '第' + chapter + '章Boss' : '第' + chapter + '章妖兽',
    level: baseLevel,
    element: elements[chapter % 5],
    hp: Math.floor(1000 * Math.pow(1.35, chapter) * mod.hpMod),
    maxHp: Math.floor(1000 * Math.pow(1.35, chapter) * mod.hpMod),
    atk: Math.floor(100 * Math.pow(1.25, chapter) * mod.atkMod),
    def: Math.floor(50 * Math.pow(1.2, chapter) * mod.defMod),
    spd: 45 + chapter,
    critRate: 5 + Math.floor(chapter / 10),
    critDmg: 150,
    acc: 85,
    eva: 5 + Math.floor(chapter / 20),
    type: type,
    skills: []
  };
}

/**
 * 发放奖励
 */
function grantRewards(userId, rewards, database) {
  if (!database) return;

  try {
    if (rewards.exp > 0) {
      database.prepare('UPDATE player SET exp = exp + ? WHERE id = ?').run(rewards.exp, userId);
    }

    if (rewards.gold > 0) {
      database.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?').run(rewards.gold, userId);
    }

    console.log('[Battle] 玩家' + userId + '获得奖励: 经验+' + rewards.exp + ', 灵石+' + rewards.gold);
  } catch (e) {
    console.error('[Battle] grantRewards error:', e.message);
  }
}

module.exports = router;
