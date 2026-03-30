const express = require('express');
const path = require('path');
const router = express.Router();

// 简单的日志记录器
const Logger = {
  info: (...args) => console.log('[arena]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[arena:error]', new Date().toISOString(), ...args),
  warn: (...args) => console.warn('[arena:warn]', new Date().toISOString(), ...args)
};

// 数据库路径
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

// 赛季结束时间（每周一 00:00 UTC = 周一 08:00 北京时间）
function getSeasonEndTime() {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=周日,1=周一...
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
  const nextMonday = new Date(now);
  nextMonday.setUTCDate(nextMonday.getUTCDate() + daysUntilMonday);
  nextMonday.setUTCHours(0, 0, 0, 0);
  return nextMonday.toISOString();
}

// ArenaSystem 单例（声明在前，避免 initAIBots() 中 TDZ）
let ArenaSystem = null;

// 初始化数据库连接
let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  Logger.info('数据库连接成功');
} catch (err) {
  Logger.error('数据库连接失败:', err.message);
  // 创建内存存储mock
  db = {
    _data: {},
    prepare() { return this; },
    get() { return null; },
    all() { return []; },
    run() { return { changes: 0 }; }
  };
}

// 功法模板（与 gongfa.js 保持一致，用于计算属性加成）
const GONGFAS = [
  { id: 1, name: '九天真元诀', type: 'attack',  attackBonus: 50,   defenseBonus: 0, hpBonus: 0,    speedBonus: 0 },
  { id: 2, name: '烈焰焚天诀', type: 'attack',  attackBonus: 120,  defenseBonus: 0, hpBonus: 0,    speedBonus: 0 },
  { id: 3, name: '天雷破空诀', type: 'attack',  attackBonus: 300,  defenseBonus: 0, hpBonus: 0,    speedBonus: 0 },
  { id: 4, name: '混沌灭世诀', type: 'attack',  attackBonus: 800,  defenseBonus: 0, hpBonus: 0,    speedBonus: 0 },
  { id: 5, name: '金刚护体术', type: 'defense', attackBonus: 0,   defenseBonus: 30, hpBonus: 0,   speedBonus: 0 },
  { id: 6, name: '玄冥护甲诀', type: 'defense', attackBonus: 0,   defenseBonus: 80, hpBonus: 0,   speedBonus: 0 },
  { id: 7, name: '天地护元术', type: 'defense', attackBonus: 0,   defenseBonus: 200, hpBonus: 0,  speedBonus: 0 },
  { id: 8, name: '生生不息诀', type: 'hp',      attackBonus: 0,   defenseBonus: 0, hpBonus: 500,   speedBonus: 0 },
  { id: 9, name: '造化长春功', type: 'hp',      attackBonus: 0,   defenseBonus: 0, hpBonus: 1500,  speedBonus: 0 },
  { id: 10, name: '不死凤凰诀', type: 'hp',     attackBonus: 0,   defenseBonus: 0, hpBonus: 5000,  speedBonus: 0 },
  { id: 11, name: '流光掠影术', type: 'speed',  attackBonus: 0,   defenseBonus: 0, hpBonus: 0,    speedBonus: 5 },
  { id: 12, name: '瞬风千里诀', type: 'speed',  attackBonus: 0,   defenseBonus: 0, hpBonus: 0,    speedBonus: 15 },
];

/**
 * 获取玩家已学功法的属性加成（学习即生效）
 */
function getGongfaBonus(db, userId) {
  if (!db || !userId) return { attackBonus: 0, defenseBonus: 0, hpBonus: 0, speedBonus: 0 };
  let atk = 0, def = 0, hp = 0, spd = 0;
  try {
    const learned = db.prepare('SELECT * FROM player_gongfa WHERE user_id = ?').all(userId);
    for (const lg of learned) {
      const t = GONGFAS.find(g => g.id === lg.gongfa_id);
      if (t) { atk += t.attackBonus || 0; def += t.defenseBonus || 0; hp += t.hpBonus || 0; spd += t.speedBonus || 0; }
    }
  } catch (e) { /* ignore */ }
  return { attackBonus: atk, defenseBonus: def, hpBonus: hp, speedBonus: spd };
}

// 初始化 arena_player 表
function initArenaTables() {
  if (!db) return;
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS arena_player (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL UNIQUE,
        arena_points INTEGER DEFAULT 0,
        rank_id INTEGER DEFAULT 0,
        rank_name TEXT DEFAULT '凡人',
        current_season TEXT DEFAULT 'default',
        win_count INTEGER DEFAULT 0,
        lose_count INTEGER DEFAULT 0,
        total_battles INTEGER DEFAULT 0,
        daily_challenges_used INTEGER DEFAULT 0,
        last_challenge_reset TEXT,
        highest_rank INTEGER DEFAULT 0,
        highest_rank_id INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // 为已有表添加新增列（ALTER TABLE 对已存在表无效，用此方式兼容）
    try { db.exec("ALTER TABLE arena_player ADD COLUMN highest_rank INTEGER DEFAULT 0"); } catch(e) {}
    try { db.exec("ALTER TABLE arena_player ADD COLUMN highest_rank_id INTEGER DEFAULT 0"); } catch(e) {}
    try { db.exec("ALTER TABLE arena_player ADD COLUMN extra_challenges_bought INTEGER DEFAULT 0"); } catch(e) {}
    try { db.exec("ALTER TABLE arena_player ADD COLUMN daily_reward_claimed INTEGER DEFAULT 0"); } catch(e) {}
    Logger.info('arena_player表初始化完成');
  } catch (err) {
    Logger.warn('arena_player表初始化失败:', err.message);
  }

  // 初始化 arena_battles 表（战斗记录）
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS arena_battles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        season TEXT,
        attacker_id INTEGER NOT NULL,
        defender_id INTEGER NOT NULL,
        attacker_points_before INTEGER DEFAULT 0,
        attacker_points_after INTEGER DEFAULT 0,
        defender_points_before INTEGER DEFAULT 0,
        defender_points_after INTEGER DEFAULT 0,
        attacker_rank_before INTEGER DEFAULT 0,
        attacker_rank_after INTEGER DEFAULT 0,
        defender_rank_before INTEGER DEFAULT 0,
        defender_rank_after INTEGER DEFAULT 0,
        result TEXT,
        winner_id INTEGER,
        battle_time TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    Logger.info('arena_battles表初始化完成');
  } catch (err) {
    Logger.warn('arena_battles表初始化失败:', err.message);
  }
}

initArenaTables();

// ========== 成就 + 每日任务触发器 ==========
let achievementTrigger = null;
try {
  achievementTrigger = require('../../game/achievement_trigger_service');
  Logger.info('成就触发服务加载成功');
} catch (e) {
  Logger.warn('成就触发服务加载失败:', e.message);
}

let dailyQuestRouter = null;
let questRouter = null;
try {
  questRouter = require('./quest');
} catch (e) {
  Logger.warn('[arena] quest路由加载失败:', e.message);
}
try {
  dailyQuestRouter = require('./dailyQuest');
  Logger.info('每日任务路由加载成功');
} catch (e) {
  Logger.warn('每日任务路由加载失败:', e.message);
}

// 事件总线
let eventBus = null;
try {
  eventBus = require('../../game/eventBus');
  Logger.info('eventBus 加载成功');
} catch (e) {
  Logger.warn('eventBus 加载失败:', e.message);
}

// AI机器人池（8个，分低/中/高三层）
// tier: 1=低阶, 2=中阶, 3=高阶
// tier0: 新手陪练(1-20级) | tier1: 练气境(30-55级) | tier2: 筑基-金丹境(56-75级) | tier3: 元婴+(76-95级)
const AI_BOTS = [
  { username: '小道士',   level: 8,  realm_level: 1, combat_power: 800,   tier: 0 },
  { username: '凡人甲',   level: 12, realm_level: 1, combat_power: 1500,  tier: 0 },
  { username: '凡人乙',   level: 18, realm_level: 1, combat_power: 2200,  tier: 0 },
  { username: '小修士',   level: 30, realm_level: 2, combat_power: 5000,  tier: 1 },
  { username: '练气士',   level: 40, realm_level: 3, combat_power: 12000, tier: 1 },
  { username: '筑基散修', level: 50, realm_level: 4, combat_power: 25000, tier: 1 },
  { username: '内门弟子', level: 60, realm_level: 5, combat_power: 45000, tier: 2 },
  { username: '核心真传', level: 70, realm_level: 6, combat_power: 70000, tier: 2 },
  { username: '长老级',   level: 80, realm_level: 7, combat_power: 100000, tier: 2 },
  { username: '宗主级',   level: 88, realm_level: 8, combat_power: 150000, tier: 3 },
  { username: '飞升大能', level: 95, realm_level: 9, combat_power: 200000, tier: 3 }, // 渡劫境
  { username: '真仙下凡', level: 99, realm_level: 10, combat_power: 500000, tier: 3 }, // 真仙境
];

function initAIBots() {
  if (!db) return;
  try {
    const existing = db.prepare('SELECT COUNT(*) as c FROM arena_player WHERE player_id < 0').get().c || 0;
    if (existing >= AI_BOTS.length) {
      Logger.info(`AI机器人池已初始化 (${existing}个)`);
      return;
    }
    const insert = db.prepare(`
      INSERT OR IGNORE INTO arena_player (player_id, arena_points, rank_id, rank_name, current_season, win_count, lose_count, total_battles, daily_challenges_used, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    const insertPlayer = db.prepare(`
      INSERT OR IGNORE INTO player (id, user_id, level, realm, attack, defense, hp, vip_level, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))
    `);
    // tier0=青铜(1), tier1=白银(2), tier2=黄金(3), tier3=钻石(5)
    const tierRank = { 0: [1, '青铜'], 1: [2, '白银'], 2: [3, '黄金'], 3: [5, '钻石'] };
    const basePoints = { 0: 100, 1: 500, 2: 2000, 3: 4500 };  // 按层初始积分
    const season = ArenaSystem ? ArenaSystem.getCurrentSeasonId() : 'default';

    for (let i = 0; i < AI_BOTS.length; i++) {
      const botId = -(i + 1);
      const bot = AI_BOTS[i];
      const [rankId, rankName] = tierRank[bot.tier] || [1, '青铜'];
      const points = basePoints[bot.tier] || 500;
      try {
        // combat_power = ATK*10 + DEF*5 + HP/10，用 combat_power 反推合理属性
        const cp = bot.combat_power || 5000;
        const atk = Math.floor(cp * 0.05);
        const def = Math.floor(cp * 0.025);
        const hp  = Math.floor(cp * 1.0);
        insertPlayer.run(botId, botId, bot.level, bot.realm_level || bot.level, atk, def, hp);
        insert.run(botId, points, rankId, rankName, season, Math.floor(points/50), Math.floor(points/80), Math.floor(points/30));
      } catch(e) {}
    }
    Logger.info(`AI机器人池初始化完成 (${AI_BOTS.length}个: 低阶${AI_BOTS.filter(b=>b.tier===1).length}/中阶${AI_BOTS.filter(b=>b.tier===2).length}/高阶${AI_BOTS.filter(b=>b.tier===3).length})`);
  } catch (err) {
    Logger.warn('AI机器人池初始化失败:', err.message);
  }
}

initAIBots();

// 加载竞技场系统（单例实例，不重新实例化）
try {
  const { arenaSystem } = require('../../services/arena_system');
  ArenaSystem = arenaSystem;
  Logger.info('竞技场系统加载成功');
} catch (err) {
  Logger.error('竞技场系统加载失败:', err.message);
  ArenaSystem = null;
}

// 工具函数：获取上海时区日期字符串 (YYYY-MM-DD)
function getDateString() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

// 工具函数：获取或创建玩家竞技场数据
function getOrCreateArenaPlayer(playerId) {
  if (!db) return null;

  try {
    let arenaPlayer = db.prepare('SELECT * FROM arena_player WHERE player_id = ?').get(playerId);

    if (!arenaPlayer) {
      const currentSeason = ArenaSystem ? ArenaSystem.getCurrentSeasonId() : 'default';
      db.prepare(`
        INSERT INTO arena_player (player_id, arena_points, rank_id, rank_name, current_season, created_at, updated_at)
        VALUES (?, 0, 0, '凡人', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(playerId, currentSeason);
      arenaPlayer = db.prepare('SELECT * FROM arena_player WHERE player_id = ?').get(playerId);
    }

    return arenaPlayer;
  } catch (err) {
    Logger.error('getOrCreateArenaPlayer错误:', err.message);
    return null;
  }
}

// 工具函数：检查并重置每日挑战次数（使用SQL DATE()比较避免时区/格式问题）
function checkAndResetDailyChallenges(playerId) {
  if (!db) return { challengesUsed: 0, dailyRewardClaimed: false };

  try {
    // 使用 SQL DATE() 比较，兼容任何 datetime 存储格式
    const result = db.prepare(`
      SELECT daily_challenges_used, daily_reward_claimed,
             DATE(last_challenge_reset) as reset_date
      FROM arena_player WHERE player_id = ?
    `).get(playerId);

    if (!result || result.reset_date !== getDateString()) {
      // 日期不同（跨日），重置挑战次数
      if (result) {
        db.prepare(`
          UPDATE arena_player
          SET daily_challenges_used = 0,
              last_challenge_reset = CURRENT_TIMESTAMP,
              daily_reward_claimed = 0
          WHERE player_id = ?
        `).run(playerId);
      }
      return { challengesUsed: 0, dailyRewardClaimed: false };
    }

    return {
      challengesUsed: result.daily_challenges_used || 0,
      dailyRewardClaimed: !!result.daily_reward_claimed
    };
  } catch (err) {
    Logger.error('checkAndResetDailyChallenges错误:', err.message);
    return { challengesUsed: 0, dailyRewardClaimed: false };
  }
}

// ============================================
// GET / - 获取竞技场概览信息
// ============================================
router.get('/', (req, res) => {
  try {
    if (!db || !ArenaSystem) {
      return res.json({
        success: true,
        data: {
          ranks: ArenaSystem ? ArenaSystem.getAllRanks() : [],
          seasonInfo: { currentSeasonId: 'default', remainingDays: 7 }
        }
      });
    }

    const totalPlayers = db.prepare('SELECT COUNT(*) as count FROM arena_player').get().count || 0;
    const seasonInfo = ArenaSystem.getSeasonRemainingTime();
    const currentSeasonId = ArenaSystem.getCurrentSeasonId();
    const rewards = ArenaSystem.getRankRewards();

    res.json({
      success: true,
      data: {
        ranks: ArenaSystem.getAllRanks(),
        season: {
          currentSeasonId,
          remainingDays: seasonInfo.remainingDays,
          endTime: seasonInfo.endTime
        },
        rewards,
        totalPlayers
      }
    });
  } catch (error) {
    Logger.error('GET / 错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// GET /ranks - 获取竞技场排行榜
// ============================================
router.get('/ranks', (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    if (!db) {
      return res.json({ success: true, data: { ranking: [], total: 0 } });
    }

    const players = db.prepare(`
      SELECT p.id,
             COALESCE(u.nickname, u.username, 'AI_' || ap.player_id) as username,
             p.level, p.realm as realm_level,
             ap.arena_points, ap.rank_id, ap.rank_name, ap.win_count, ap.lose_count, ap.total_battles
      FROM arena_player ap
      LEFT JOIN player p ON p.user_id = ap.player_id
      LEFT JOIN Users u ON u.id = ap.player_id
      ORDER BY ap.arena_points DESC
      LIMIT ? OFFSET ?
    `).all(parseInt(limit), parseInt(offset));

    const total = db.prepare('SELECT COUNT(*) as count FROM arena_player').get().count || 0;

    const ranking = players.map((p, index) => {
      const rank = ArenaSystem ? ArenaSystem.getRank(p.rank_id) : { icon: '👤' };
      return {
        rank: parseInt(offset) + index + 1,
        playerId: p.id,
        username: p.username,
        level: p.level,
        realmLevel: p.realm_level,
        combatPower: Math.floor(p.level * 500 + (p.realm_level || 1) * 2000),
        arenaPoints: p.arena_points,
        rankId: p.rank_id,
        rankName: p.rank_name,
        rankIcon: rank.icon,
        winCount: p.win_count,
        loseCount: p.lose_count,
        totalBattles: p.total_battles,
        winRate: p.total_battles > 0 ? Math.round((p.win_count / p.total_battles) * 100) : 0
      };
    });

    res.json({
      success: true,
      data: {
        ranking,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + players.length < total
      }
    });
  } catch (error) {
    Logger.error('GET /ranks 错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// GET /rank/:userId - 获取指定玩家的排名信息
// ============================================
router.get('/rank/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    if (!db) {
      return res.json({ success: false, error: '数据库不可用' });
    }

    // 确保玩家存在
    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(userId);
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }

    // 获取竞技场数据
    const arenaPlayer = getOrCreateArenaPlayer(userId);
    if (!arenaPlayer) {
      return res.status(500).json({ success: false, error: '竞技场数据获取失败' });
    }

    // 获取段位信息
    const currentRank = ArenaSystem ? ArenaSystem.getRank(arenaPlayer.rank_id) : { name: '凡人', icon: '👤' };
    const seasonInfo = ArenaSystem ? ArenaSystem.getSeasonRemainingTime() : { remainingDays: 7 };

    // 计算排名
    const totalPlayers = db.prepare('SELECT COUNT(*) as count FROM arena_player').get().count || 1;
    const higherRanked = db.prepare('SELECT COUNT(*) as count FROM arena_player WHERE arena_points > ?').get(arenaPlayer.arena_points).count || 0;
    const ranking = higherRanked + 1;

    // 获取VIP等级
    const vipLevel = player.vip_level || 0;
    const dailyChallengeCount = ArenaSystem ? ArenaSystem.getDailyChallengeCount(vipLevel) : 5;

    // 检查每日数据
    const dailyInfo = checkAndResetDailyChallenges(userId);
    const extraBought = arenaPlayer.extra_challenges_bought || 0;
    const effectiveLimit = dailyChallengeCount + extraBought;

    res.json({
      success: true,
      data: {
        player: {
          playerId: player.id,
          username: player.username,
          arenaPoints: arenaPlayer.arena_points,
          rankId: arenaPlayer.rank_id,
          rankName: arenaPlayer.rank_name,
          rankIcon: currentRank.icon,
          winCount: arenaPlayer.win_count,
          loseCount: arenaPlayer.lose_count,
          totalBattles: arenaPlayer.total_battles,
          highestRank: arenaPlayer.highest_rank,
          highestRankId: arenaPlayer.highest_rank_id,
          winRate: arenaPlayer.total_battles > 0
            ? Math.round((arenaPlayer.win_count / arenaPlayer.total_battles) * 100)
            : 0
        },
        daily: {
          challengesUsed: dailyInfo.challengesUsed,
          dailyChallengeCount,
          extraChallengesBought: extraBought,
          effectiveMaxChallenges: effectiveLimit,
          remainingChallenges: Math.max(0, effectiveLimit - dailyInfo.challengesUsed),
          dailyRewardClaimed: dailyInfo.dailyRewardClaimed
        },
        season: {
          currentSeasonId: arenaPlayer.current_season,
          seasonRemainingTime: seasonInfo.remainingDays
        },
        ranking: {
          current: ranking,
          total: totalPlayers,
          percentage: Math.round((1 - (ranking / totalPlayers)) * 100)
        }
      }
    });
  } catch (error) {
    Logger.error('GET /rank/:userId 错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// GET /rivals/:userId - 获取可挑战对手列表（/opponents 的别名）
// ============================================
router.get('/rivals/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    if (!db) {
      return res.json({ success: false, error: '数据库不可用' });
    }

    // 获取玩家竞技场数据
    const arenaPlayer = getOrCreateArenaPlayer(userId);
    if (!arenaPlayer) {
      return res.status(500).json({ success: false, error: '竞技场数据获取失败' });
    }

    // 获取玩家真实属性
    const playerData = db.prepare('SELECT * FROM player WHERE user_id = ?').get(userId);
    const usersData = db.prepare('SELECT * FROM Users WHERE id = ?').get(userId);
    const playerLevel = playerData ? playerData.level : (usersData ? usersData.level : 1);
    const playerRealm = playerData ? playerData.realm : (usersData ? usersData.realm : 1);
    const baseAtk = playerData ? playerData.attack : (usersData ? usersData.attack : 100);
    const baseDef = playerData ? playerData.defense : (usersData ? usersData.defense : 50);
    const baseHP = playerData ? playerData.hp : (usersData ? usersData.hp : 1000);
    // 功法加成（player_equipped_gongfa 表可能不存在，降级处理）
    let totalGongfaAtk = 0, totalGongfaDef = 0, totalGongfaHp = 0;
    try {
      const gongfaRows = db.prepare(`
        SELECT gi.*, gt.atkBonus, gt.defBonus, gt.hpBonus, gt.atkPercent, gt.defPercent, gt.hpPercent
        FROM player_equipped_gongfa peg
        JOIN gongfa_templates gt ON gt.id = peg.gongfa_id
        JOIN player_gongfa pg ON pg.gongfa_id = peg.gongfa_id AND pg.user_id = peg.user_id
        WHERE peg.user_id = ?
      `).all(userId);
      for (const row of (gongfaRows || [])) {
        totalGongfaAtk += (row.atkBonus || 0) + Math.floor((baseAtk * (row.atkPercent || 0)) / 100);
        totalGongfaDef += (row.defBonus || 0) + Math.floor((baseDef * (row.defPercent || 0)) / 100);
        totalGongfaHp += (row.hpBonus || 0) + Math.floor((baseHP * (row.hpPercent || 0)) / 100);
      }
    } catch (e) {
      // player_equipped_gongfa 表不存在，跳过功法加成
    }
    const finalAtk = baseAtk + totalGongfaAtk;
    const finalDef = baseDef + totalGongfaDef;
    const finalHP = baseHP + totalGongfaHp;
    const playerCombatPower = Math.floor(finalAtk * 10 + finalDef * 5 + finalHP / 10);

    // 根据玩家 tier 选择 AI 池
    let tier;
    if (playerLevel <= 20) tier = 0;
    else if (playerLevel <= 45) tier = 1;
    else if (playerLevel <= 70) tier = 2;
    else tier = 3;

    // 获取同 tier 的真实玩家对手
    const minCp = Math.floor(playerCombatPower * 0.5);
    const maxCp = Math.floor(playerCombatPower * 1.5);
    let opponentList = db.prepare(`
      SELECT u.id, u.nickname, u.level as level, u.realm as realm,
             FLOOR(u.attack*10+u.defense*5+u.hp/10) as combatPower,
             COALESCE(ap.total_battles, 0) as totalBattles,
             COALESCE(ap.win_count, 0) as winCount,
             'player' as type
      FROM Users u
      LEFT JOIN arena_player ap ON ap.player_id = u.id
      WHERE u.id != ? AND u.id > 0
        AND FLOOR(u.attack*10+u.defense*5+u.hp/10) BETWEEN ? AND ?
      ORDER BY RANDOM()
      LIMIT 5
    `).all(userId, minCp, maxCp);

    // 获取 AI 对手
    const aiPool = [
      { id: -1, nickname: '青云弟子', level: 5, realm: 1, combatPower: 800, totalBattles: 50, winCount: 25, type: 'ai' },
      { id: -2, nickname: '玄武修士', level: 10, realm: 2, combatPower: 1200, totalBattles: 80, winCount: 40, type: 'ai' },
      { id: -3, nickname: '金丹真人', level: 18, realm: 4, combatPower: 2200, totalBattles: 150, winCount: 90, type: 'ai' },
      { id: -4, nickname: '筑基散修', level: 15, realm: 3, combatPower: 1600, totalBattles: 100, winCount: 55, type: 'ai' },
      { id: -5, nickname: '化神长老', level: 25, realm: 5, combatPower: 3500, totalBattles: 200, winCount: 120, type: 'ai' },
      { id: -6, nickname: '炼虚期高手', level: 35, realm: 6, combatPower: 5500, totalBattles: 300, winCount: 180, type: 'ai' },
      { id: -7, nickname: '元婴期散人', level: 45, realm: 5, combatPower: 7500, totalBattles: 400, winCount: 240, type: 'ai' },
      { id: -8, nickname: '大乘期强者', level: 65, realm: 8, combatPower: 12000, totalBattles: 500, winCount: 300, type: 'ai' },
    ];

    let tierAis = aiPool.filter(ai => {
      if (tier === 0) return ai.level <= 25;
      if (tier === 1) return ai.level > 20 && ai.level <= 50;
      if (tier === 2) return ai.level > 45 && ai.level <= 75;
      return ai.level > 70;
    });
    tierAis = tierAis.sort(() => Math.random() - 0.5).slice(0, 3);

    // 合并
    const allOpponents = [...opponentList, ...tierAis].map(opp => ({
      ...opp,
      isRecommend: opp.combatPower >= minCp && opp.combatPower <= maxCp,
      combatWarning: playerCombatPower > 0 && Math.abs(opp.combatPower - playerCombatPower) / playerCombatPower > 0.5 ? '实力悬殊' : null
    }));

    return res.json({
      success: true,
      playerLevel,
      playerRealm,
      playerCombatPower,
      opponents: allOpponents,
      remainingChallenges: arenaPlayer.challenge_times || 0,
      seasonEndTime: getSeasonEndTime()
    });
  } catch (error) {
    Logger.error('GET /rivals/:userId 错误:', error);
    return res.status(500).json({ success: false, error: '服务器错误: ' + error.message });
  }
});

// ============================================
// GET /opponents/:userId - 获取可挑战对手列表（基于战力匹配 + AI分级池）
// ============================================
router.get('/opponents/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    if (!db) {
      return res.json({ success: false, error: '数据库不可用' });
    }

    // 获取玩家竞技场数据
    const arenaPlayer = getOrCreateArenaPlayer(userId);
    if (!arenaPlayer) {
      return res.status(500).json({ success: false, error: '竞技场数据获取失败' });
    }

    // 获取玩家真实属性（优先 player 表，fallback 到 Users 表）
    const playerData = db.prepare('SELECT * FROM player WHERE user_id = ?').get(userId);
    const usersData = db.prepare('SELECT * FROM Users WHERE id = ?').get(userId);
    const playerLevel = playerData ? playerData.level : (usersData ? usersData.level : 1);
    const playerRealm = playerData ? playerData.realm : (usersData ? usersData.realm : 1);
    // 基础属性
    const baseAtk = playerData ? playerData.attack : (usersData ? usersData.attack : 100);
    const baseDef = playerData ? playerData.defense : (usersData ? usersData.defense : 50);
    const baseHP  = playerData ? playerData.hp : (usersData ? usersData.hp : 1000);
    // 功法加成（学习即生效）
    const gb = getGongfaBonus(db, userId);
    const playerAtk = baseAtk + gb.attackBonus;
    const playerDef = baseDef + gb.defenseBonus;
    const playerHP  = baseHP  + gb.hpBonus;
    // 战斗战力 = ATK*10 + DEF*5 + HP/10（与battle一致）
    const playerCombatPower = playerAtk * 10 + playerDef * 5 + Math.floor(playerHP / 10);

    const currentPoints = arenaPlayer.arena_points;
    const refreshCost = ArenaSystem ? ArenaSystem.challengeConfig.refreshCost : 50;

    // ========== AI分级池（按玩家等级匹配）==========
    // tier0: 新手(1-20级) | tier1: 练气境(30-55级) | tier2: 筑基-金丹境(56-75级) | tier3: 元婴+(76-95级)
    const playerTier = playerLevel <= 20 ? 0 : playerLevel <= 45 ? 1 : playerLevel <= 70 ? 2 : 3;

    // AI bot player_id: tier0 = -1,-2,-3 | tier1 = -4,-5,-6 | tier2 = -7,-8,-9 | tier3 = -10,-11
    // (botId = -(i+1) where i is AI_BOTS index)
    const allowedBotTiers = [];
    if (playerTier >= 0) allowedBotTiers.push(-1, -2, -3);  // tier0 新手 bots
    if (playerTier >= 1) allowedBotTiers.push(-4, -5, -6);  // tier1 练气 bots
    if (playerTier >= 2) allowedBotTiers.push(-7, -8, -9);  // tier2 筑基-金丹 bots
    if (playerTier >= 3) allowedBotTiers.push(-10);         // tier3 元婴+ bots (AI_BOTS[9])

    // ========== 战力过滤：±50% combat power 范围 ==========
    const minCombat = Math.max(1, Math.floor(playerCombatPower * 0.5));
    const maxCombat = Math.ceil(playerCombatPower * 1.5);

    // 真实玩家对手（排除AI bot: player_id < 0，只取正数的真实玩家）
    const realOpponents = db.prepare(`
      SELECT p.id,
             COALESCE(u.nickname, u.username, 'AI_' || ap.player_id) as username,
             p.level, p.realm as realm_level, p.attack, p.defense, p.hp,
             ap.arena_points, ap.rank_id, ap.rank_name, ap.win_count, ap.lose_count
      FROM player p
      JOIN arena_player ap ON p.user_id = ap.player_id
      LEFT JOIN Users u ON u.id = ap.player_id
      WHERE ap.player_id > 0
        AND ap.player_id != ?
        AND (
          /* 战力过滤：±50% */
          ((p.attack || 100)*10 + (p.defense || 50)*5 + (p.hp || 1000)/10) BETWEEN ? AND ?
          /* 或积分接近（±1500）的玩家 */
          OR ap.arena_points BETWEEN ? AND ?
        )
      ORDER BY ABS(ap.arena_points - ?) ASC
      LIMIT 3
    `).all(userId, minCombat, maxCombat, Math.max(0, currentPoints - 1500), currentPoints + 1500, currentPoints);

    // AI机器人对手（从允许的tier中选）
    const botOpponents = [];
    if (allowedBotTiers.length > 0) {
      const placeholders = allowedBotTiers.map(() => '?').join(',');
      const rawBots = db.prepare(`
        SELECT p.id,
               COALESCE(u.nickname, u.username, 'AI_' || ap.player_id) as username,
               p.level, p.realm as realm_level, p.attack, p.defense, p.hp,
               ap.arena_points, ap.rank_id, ap.rank_name, ap.win_count, ap.lose_count
        FROM player p
        JOIN arena_player ap ON p.user_id = ap.player_id
        LEFT JOIN Users u ON u.id = ap.player_id
        WHERE ap.player_id IN (${placeholders})
        ORDER BY RANDOM()
      `).all(...allowedBotTiers);

      for (const bot of rawBots) {
        const botCP = (bot.attack || 100) * 10 + (bot.defense || 50) * 5 + Math.floor((bot.hp || 1000) / 10);
        // 战力差距>70%显示警告标记，但不直接排除
        const cpRatio = Math.min(botCP / playerCombatPower, playerCombatPower / botCP);
        if (cpRatio < 0.3) continue; // 差距>70%跳过
        bot._cpRatio = cpRatio;
        bot._isAI = true;
        botOpponents.push(bot);
        if (botOpponents.length >= 3) break;
      }
    }

    // 合并：优先真实玩家（战力接近），不足用AI补充
    const combined = [...realOpponents, ...botOpponents].slice(0, 5);

    // 若仍不足5人，补充高排名玩家（排除AI bots）
    if (combined.length < 5) {
      const existingIds = new Set(combined.map(o => o.id));
      const top补充 = db.prepare(`
        SELECT p.id,
               COALESCE(u.nickname, u.username, 'AI_' || ap.player_id) as username,
               p.level, p.realm as realm_level, p.attack, p.defense, p.hp,
               ap.arena_points, ap.rank_id, ap.rank_name, ap.win_count, ap.lose_count
        FROM player p
        JOIN arena_player ap ON p.user_id = ap.player_id
        LEFT JOIN Users u ON u.id = ap.player_id
        WHERE ap.player_id > 0 AND ap.player_id != ?
        ORDER BY ap.arena_points DESC
        LIMIT ?
      `).all(userId, 5 - combined.length);

      for (const t of top补充) {
        if (!existingIds.has(t.id)) {
          t._isWarn = true; // 实力悬殊标记
          combined.push(t);
        }
        if (combined.length >= 5) break;
      }
    }

    const opponentList = combined.map(op => {
      const opCP = (op.attack || 100) * 10 + (op.defense || 50) * 5 + Math.floor((op.hp || 1000) / 10);
      const opRank = ArenaSystem ? ArenaSystem.getRank(op.rank_id) : { icon: '👤' };
      const cpRatio = Math.min(opCP / playerCombatPower, playerCombatPower / opCP);
      return {
        playerId: op.id,
        username: op.username,
        level: op.level,
        realmLevel: op.realm_level,
        combatPower: opCP,
        arenaPoints: op.arena_points,
        rankId: op.rank_id,
        rankName: op.rank_name,
        rankIcon: opRank.icon,
        winCount: op.win_count,
        loseCount: op.lose_count,
        winRate: (op.win_count + op.lose_count) > 0
          ? Math.round((op.win_count / (op.win_count + op.lose_count)) * 100)
          : 0,
        // 战力差距警告：<50%显示"实力悬殊"
        combatWarning: cpRatio < 0.5 ? '实力悬殊' : null,
        isRecommend: cpRatio >= 0.7,
        isAI: !!op._isAI
      };
    });

    res.json({
      success: true,
      data: {
        playerPoints: currentPoints,
        playerRankId: arenaPlayer.rank_id,
        playerLevel,
        playerCombatPower,
        playerTier,
        opponents: opponentList,
        refreshCost
      }
    });
  } catch (error) {
    Logger.error('GET /opponents/:userId 错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// GET /records/:userId - 获取玩家战斗记录
// ============================================
router.get('/records/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;

    if (!db) {
      return res.json({ success: true, data: { records: [] } });
    }

    const records = db.prepare(`
      SELECT ab.*,
             COALESCE(u1.nickname, u1.username, 'AI_' || ab.attacker_id) as attacker_name,
             COALESCE(u2.nickname, u2.username, 'AI_' || ab.defender_id) as defender_name
      FROM arena_battles ab
      LEFT JOIN Users u1 ON u1.id = ab.attacker_id
      LEFT JOIN Users u2 ON u2.id = ab.defender_id
      WHERE ab.attacker_id = ? OR ab.defender_id = ?
      ORDER BY ab.battle_time DESC
      LIMIT ?
    `).all(userId, userId, parseInt(limit));

    const formattedRecords = records.map(r => ({
      battleId: r.id,
      season: r.season,
      attackerId: r.attacker_id,
      attackerName: r.attacker_name || '未知',
      defenderId: r.defender_id,
      defenderName: r.defender_name || '未知',
      attackerPointsBefore: r.attacker_points_before,
      attackerPointsAfter: r.attacker_points_after,
      defenderPointsBefore: r.defender_points_before,
      defenderPointsAfter: r.defender_points_after,
      attackerRankBefore: r.attacker_rank_before,
      attackerRankAfter: r.attacker_rank_after,
      defenderRankBefore: r.defender_rank_before,
      defenderRankAfter: r.defender_rank_after,
      result: r.result,
      winnerId: r.winner_id,
      isWin: r.winner_id === parseInt(userId),
      battleTime: r.battle_time,
      formattedTime: new Date(r.battle_time).toLocaleString('zh-CN')
    }));

    res.json({
      success: true,
      data: {
        records: formattedRecords,
        total: formattedRecords.length
      }
    });
  } catch (error) {
    Logger.error('GET /records/:userId 错误:', error);
    // 如果表不存在，返回空记录
    res.json({ success: true, data: { records: [], total: 0 } });
  }
});

// ============================================
// POST /challenge - 发起挑战
// ============================================
router.post('/challenge', (req, res) => {
  try {
    // 支持 JWT(req.userId) / player_id / userId 三级兼容
    const player_id = req.userId || parseInt(req.body.player_id) || parseInt(req.body.userId);
    const target_id = parseInt(req.body.target_id) || parseInt(req.body.targetId) || parseInt(req.body.opponentId);
    const use_items = req.body.use_items;

    if (!player_id || !target_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数 (player_id/userId, target_id/targetId)' });
    }

    if (player_id === target_id) {
      return res.status(400).json({ success: false, error: '不能挑战自己' });
    }

    if (!db || !ArenaSystem) {
      return res.status(500).json({ success: false, error: '系统不可用' });
    }

    // 确保玩家存在
    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }

    // 检查每日挑战次数（原子操作：先尝试预留一个挑战名额）
    const vipLevel = player.vip_level || 0;
    const dailyChallengeCount = ArenaSystem.getDailyChallengeCount(vipLevel);
    const today = getDateString();

    // 读取额外购买的挑战次数
    const arenaPlayerInfo = db.prepare(
      'SELECT extra_challenges_bought FROM arena_player WHERE player_id = ?'
    ).get(player_id);
    const extraBought = arenaPlayerInfo ? arenaPlayerInfo.extra_challenges_bought || 0 : 0;
    const effectiveLimit = dailyChallengeCount + extraBought;

    // 原子预留：只有当日挑战次数 < (基础次数 + 额外购买次数) 时才+1
    const reserveResult = db.prepare(`
      UPDATE arena_player
      SET daily_challenges_used = daily_challenges_used + 1,
          last_challenge_reset = COALESCE(last_challenge_reset, CURRENT_TIMESTAMP)
      WHERE player_id = ?
        AND (
          DATE(last_challenge_reset) = ?
          OR last_challenge_reset IS NULL
        )
        AND daily_challenges_used < ?
    `).run(player_id, today, effectiveLimit);

    if (reserveResult.changes === 0) {
      // 可能：日期已跨天（自动重置为0）或者次数已满
      const afterReset = checkAndResetDailyChallenges(player_id);
      if (afterReset.challengesUsed >= effectiveLimit) {
        return res.status(400).json({
          success: false,
          error: '今日挑战次数已用完',
          remaining: 0,
          maxChallenges: dailyChallengeCount,
          extraChallengesBought: extraBought,
          canBuyExtra: true
        });
      }
      // 跨日重置后还有名额，再次尝试预留
      const retryResult = db.prepare(`
        UPDATE arena_player
        SET daily_challenges_used = daily_challenges_used + 1
        WHERE player_id = ? AND daily_challenges_used < ?
      `).run(player_id, effectiveLimit);
      if (retryResult.changes === 0) {
        return res.status(400).json({
          success: false,
          error: '今日挑战次数已用完',
          remaining: 0,
          maxChallenges: dailyChallengeCount,
          extraChallengesBought: extraBought,
          canBuyExtra: true
        });
      }
    }

    // 获取对手信息
    const targetPlayer = db.prepare(`
      SELECT p.id, p.user_id,
             COALESCE(u.nickname, u.username, 'AI_' || ap.player_id) as username,
             p.level, p.realm as realm_level, p.attack, p.defense, p.hp,
             ap.arena_points, ap.rank_id, ap.rank_name, ap.win_count, ap.lose_count
      FROM player p
      JOIN arena_player ap ON p.user_id = ap.player_id
      LEFT JOIN Users u ON u.id = ap.player_id
      WHERE p.user_id = ?
    `).get(target_id);

    if (!targetPlayer) {
      return res.status(404).json({ success: false, error: '对手不存在或未参加竞技场' });
    }

    // 获取双方竞技场数据
    const attackerArena = getOrCreateArenaPlayer(player_id);
    const defenderArena = getOrCreateArenaPlayer(target_id);

    // 模拟战斗（combat_power = ATK*10 + DEF*5 + HP/10，含功法加成）
    const gbA = getGongfaBonus(db, player_id);
    const gbD = getGongfaBonus(db, target_id);
    const attackerAtk = (player.attack || 100) + gbA.attackBonus;
    const attackerDef = (player.defense || 50) + gbA.defenseBonus;
    const attackerHP  = (player.hp || 1000) + gbA.hpBonus;
    const defenderAtk = (targetPlayer.attack || 100) + gbD.attackBonus;
    const defenderDef = (targetPlayer.defense || 50) + gbD.defenseBonus;
    const defenderHP  = (targetPlayer.hp || 1000) + gbD.hpBonus;
    const attackerPower = attackerAtk * 10 + attackerDef * 5 + Math.floor(attackerHP / 10);
    const defenderPower = defenderAtk * 10 + defenderDef * 5 + Math.floor(defenderHP / 10);
    const attackerWin = ArenaSystem.simulateBattle(attackerPower, defenderPower);

    // 计算积分变化
    const attackerRank = ArenaSystem.getRank(attackerArena.rank_id);
    const defenderRank = ArenaSystem.getRank(defenderArena.rank_id);

    const attackerPointsGain = attackerWin ? attackerRank.winPoints : 0;
    // 败者扣分：青铜/白银/黄金(losePoints=0)设置最低5分惩罚，高分段按losePoints扣
    const attackerPointsLoss = !attackerWin ? Math.max(attackerRank.losePoints, 5) : 0;
    const defenderPointsGain = !attackerWin ? defenderRank.winPoints : 0;
    const defenderPointsLoss = attackerWin ? Math.max(defenderRank.losePoints, 5) : 0;

    // 更新数据
    const newAttackerPoints = Math.max(0, attackerArena.arena_points + attackerPointsGain - attackerPointsLoss);
    const newDefenderPoints = Math.max(0, defenderArena.arena_points + defenderPointsGain - defenderPointsLoss);

    const newAttackerRank = ArenaSystem.getRankByPoints(newAttackerPoints);
    const newDefenderRank = ArenaSystem.getRankByPoints(newDefenderPoints);

    // 更新攻击者数据
    db.prepare(`
      UPDATE arena_player
      SET arena_points = ?,
          rank_id = ?,
          rank_name = ?,
          win_count = win_count + ?,
          lose_count = lose_count + ?,
          total_battles = total_battles + 1,
          last_challenge_reset = ?,
          highest_rank = CASE WHEN ? > highest_rank THEN ? ELSE highest_rank END,
          highest_rank_id = CASE WHEN ? > highest_rank_id THEN ? ELSE highest_rank_id END,
          updated_at = CURRENT_TIMESTAMP
      WHERE player_id = ?
    `).run(
      newAttackerPoints,
      newAttackerRank.id,
      newAttackerRank.name,
      attackerWin ? 1 : 0,
      attackerWin ? 0 : 1,
      today,
      newAttackerRank.id, newAttackerRank.id,
      newAttackerRank.id, newAttackerRank.id,
      player_id
    );

    // 更新防守者数据（无论输赢都要记录）
    db.prepare(`
      UPDATE arena_player
      SET arena_points = ?,
          rank_id = ?,
          rank_name = ?,
          win_count = win_count + ?,
          lose_count = lose_count + ?,
          total_battles = total_battles + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE player_id = ?
    `).run(
      newDefenderPoints,
      newDefenderRank.id,
      newDefenderRank.name,
      !attackerWin ? 1 : 0,   // defender wins when attacker loses
      attackerWin ? 1 : 0,    // defender loses when attacker wins
      target_id
    );

    // 记录战斗
    const currentSeason = ArenaSystem.getCurrentSeasonId();
    const winnerId = attackerWin ? player_id : target_id;

    try {
      db.prepare(`
        INSERT INTO arena_battles (season, attacker_id, defender_id, attacker_points_before, attacker_points_after,
          defender_points_before, defender_points_after, attacker_rank_before, attacker_rank_after,
          defender_rank_before, defender_rank_after, result, winner_id, battle_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        currentSeason,
        player_id,
        target_id,
        attackerArena.arena_points,
        newAttackerPoints,
        defenderArena.arena_points,
        newDefenderPoints,
        attackerArena.rank_id,
        newAttackerRank.id,
        defenderArena.rank_id,
        newDefenderRank.id,
        attackerWin ? 'attacker_win' : 'attacker_lose',
        winnerId
      );
    } catch (battleErr) {
      Logger.warn('战斗记录插入失败（表可能不存在）:', battleErr.message);
    }

    // 生成战斗报告
    const battleReport = ArenaSystem.generateBattleReport(
      { playerId: player_id, username: player.username, arenaPoints: newAttackerPoints },
      { playerId: target_id, username: targetPlayer.username, arenaPoints: newDefenderPoints },
      attackerPower,
      defenderPower
    );

    // 计算奖励（胜利：积分+灵石；失败：战败惩罚灵石）
    const reward = attackerWin
      ? { arenaPoints: attackerRank.winPoints, spiritStones: 100, dailyPoints: 10 }
      : { arenaPoints: 0, spiritStones: -Math.max(attackerPointsLoss * 2, 10), dailyPoints: 0, penalty: true };

    // 发放灵石奖励（胜利得灵石，失败扣灵石）
    if (reward.spiritStones !== 0) {
      try {
        if (reward.spiritStones > 0) {
          db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(reward.spiritStones, player_id);
        } else {
          const player = db.prepare('SELECT lingshi FROM Users WHERE id = ?').get(player_id);
          if (player && player.lingshi >= Math.abs(reward.spiritStones)) {
            db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(reward.spiritStones, player_id);
          }
        }
      } catch (e) {
        Logger.warn('灵石处理失败:', e.message);
      }
    }

    res.json({
      success: true,
      data: {
        battleId: Date.now(),
        win: attackerWin,
        result: attackerWin ? '胜利' : '失败',
        battleReport,
        reward: {
        ...reward,
        spiritStones: reward.spiritStones,
        penalty: reward.penalty || false
      },
        ranking: {
          newPoints: newAttackerPoints,
          newRankId: newAttackerRank.id,
          newRankName: newAttackerRank.name,
          pointsGained: attackerPointsGain,
          pointsLost: attackerPointsLoss
        },
        remainingChallenges: effectiveLimit - dailyInfo.challengesUsed - 1
      }
    });

    // ========== 成就 + 每日任务触发 ==========
    // 触发成就：战斗胜利（combat_win）
    if (attackerWin && achievementTrigger) {
      try {
        achievementTrigger.onCombatWin(player_id, attackerPower);
        const notifications = achievementTrigger.popNotifications(player_id);
        if (notifications && notifications.length > 0) {
          Logger.info(`[成就通知] 用户${player_id}在竞技场挑战中达成:`, notifications.map(n => n.achievementName).join(', '));
        }
      } catch (e) {
        Logger.warn('[arena] 成就触发失败:', e.message);
      }
    }
    // 触发每日任务：竞技场战斗（battle类型=1次）
    if (dailyQuestRouter && dailyQuestRouter.updateDailyQuestProgress) {
      try {
        dailyQuestRouter.updateDailyQuestProgress(player_id, 'battle', 1);
      } catch (e) {

    // 触发任务系统：竞技场战斗
    if (questRouter && questRouter.updateQuestProgressByType) {
      try {
        questRouter.updateQuestProgressByType(player_id, 'arena_battle', 1);
      } catch (e) {
        Logger.warn('[arena] 任务进度更新失败(arena_battle):', e.message);
      }
    }
        Logger.warn('[arena] 每日任务更新失败:', e.message);
      }
    }

    // ========== 事件总线触发：竞技场挑战 ==========
    if (eventBus) {
      eventBus.emit('arena:challenge', { userId: player_id, win: attackerWin, combatPower: attackerPower });
    }
  } catch (error) {
    Logger.error('POST /challenge 错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// GET /rewards - 获取段位奖励配置
// ============================================
router.get('/rewards', (req, res) => {
  try {
    const player_id = req.userId || parseInt(req.query.player_id);

    if (!ArenaSystem) {
      return res.json({ success: true, data: { rewards: [] } });
    }

    const rewards = ArenaSystem.getRankRewards();

    // 如果有玩家ID，附加领取状态
    let claimStatus = {};
    if (player_id && db) {
      try {
        const playerRewards = db.prepare('SELECT * FROM arena_season_rewards WHERE player_id = ?').all(player_id);
        for (const pr of playerRewards) {
          claimStatus[pr.season_id] = claimStatus[pr.season_id] || {};
          claimStatus[pr.season_id][pr.rank_id] = !!pr.claimed;
        }
      } catch (e) {
        // 表可能不存在
      }
    }

    res.json({
      success: true,
      data: {
        rewards,
        claimStatus
      }
    });
  } catch (error) {
    Logger.error('GET /rewards 错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// POST /claim-reward - 领取段位奖励
// ============================================
router.post('/claim-reward', (req, res) => {
  try {
    const player_id = req.userId || req.body.player_id;
    const { season_id, rank_id } = req.body;

    if (!player_id || !season_id || rank_id === undefined) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    if (!db) {
      return res.status(500).json({ success: false, error: '数据库不可用' });
    }

    // 检查是否已领取
    const existing = db.prepare(
      'SELECT * FROM arena_season_rewards WHERE player_id = ? AND season_id = ? AND rank_id = ?'
    ).get(player_id, season_id, rank_id);

    if (existing && existing.claimed) {
      return res.status(400).json({ success: false, error: '该奖励已领取' });
    }

    // 获取奖励配置
    if (!ArenaSystem) {
      return res.status(500).json({ success: false, error: '竞技场系统不可用' });
    }

    const rankInfo = ArenaSystem.getRank(rank_id);
    const dailyReward = rankInfo.dailyReward || {};

    // 发放奖励（写入 Users.lingshi，权威数据源）
    if (dailyReward.spiritStones) {
      db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(dailyReward.spiritStones, player_id);
    }

    // 记录领取
    if (existing) {
      db.prepare(
        'UPDATE arena_season_rewards SET claimed = 1, claimed_at = CURRENT_TIMESTAMP WHERE player_id = ? AND season_id = ? AND rank_id = ?'
      ).run(player_id, season_id, rank_id);
    } else {
      db.prepare(
        'INSERT INTO arena_season_rewards (player_id, season_id, rank_id, claimed, claimed_at) VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)'
      ).run(player_id, season_id, rank_id);
    }

    res.json({
      success: true,
      data: {
        reward: dailyReward,
        message: `领取${rankInfo.name}段位奖励成功！获得灵石x${dailyReward.spiritStones || 0}`
      }
    });
  } catch (error) {
    Logger.error('POST /claim-reward 错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// GET /info - 获取玩家竞技场信息 (当前排名/积分/赛季)
// ============================================
router.get('/info', (req, res) => {
  try {
    const userId = req.userId || parseInt(req.query.userId) || parseInt(req.query.player_id) || 1;

    if (!db || !ArenaSystem) {
      return res.json({
        success: true,
        data: { arenaPoints: 0, rankId: 0, rankName: '凡人', seasonDaysLeft: 7 }
      });
    }

    const arenaPlayer = getOrCreateArenaPlayer(userId);
    if (!arenaPlayer) {
      return res.status(404).json({ success: false, error: '竞技场数据不存在' });
    }

    const currentRank = ArenaSystem.getRank(arenaPlayer.rank_id);
    const seasonInfo = ArenaSystem.getSeasonRemainingTime();
    const dailyInfo = checkAndResetDailyChallenges(userId);
    const vipLevel = db.prepare('SELECT vip_level FROM player WHERE id = ?').get(userId)?.vip_level || 0;
    const dailyChallengeCount = ArenaSystem.getDailyChallengeCount(vipLevel);
    const extraBought = arenaPlayer.extra_challenges_bought || 0;
    const effectiveLimit = dailyChallengeCount + extraBought;

    // 计算排名
    const totalPlayers = db.prepare('SELECT COUNT(*) as count FROM arena_player').get().count || 1;
    const higherRanked = db.prepare('SELECT COUNT(*) as count FROM arena_player WHERE arena_points > ?').get(arenaPlayer.arena_points).count || 0;
    const ranking = higherRanked + 1;

    res.json({
      success: true,
      data: {
        arenaPoints: arenaPlayer.arena_points,
        rankId: arenaPlayer.rank_id,
        rankName: arenaPlayer.rank_name,
        rankIcon: currentRank.icon,
        winCount: arenaPlayer.win_count,
        loseCount: arenaPlayer.lose_count,
        totalBattles: arenaPlayer.total_battles,
        highestRank: arenaPlayer.highest_rank,
        highestRankId: arenaPlayer.highest_rank_id,
        ranking,
        totalPlayers,
        winRate: arenaPlayer.total_battles > 0
          ? Math.round((arenaPlayer.win_count / arenaPlayer.total_battles) * 100)
          : 0,
        daily: {
          challengesUsed: dailyInfo.challengesUsed,
          extraChallengesBought: extraBought,
          effectiveMaxChallenges: effectiveLimit,
          remainingChallenges: Math.max(0, effectiveLimit - dailyInfo.challengesUsed),
          maxChallenges: dailyChallengeCount
        },
        season: {
          currentSeasonId: ArenaSystem.getCurrentSeasonId(),
          remainingDays: seasonInfo.remainingDays
        }
      }
    });
  } catch (error) {
    Logger.error('GET /info 错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// POST /match - 匹配对手
// ============================================
router.post('/match', (req, res) => {
  try {
    const userId = req.userId || parseInt(req.body.userId) || parseInt(req.body.player_id) || 1;

    if (!db || !ArenaSystem) {
      return res.status(500).json({ success: false, error: '系统不可用' });
    }

    // 检查每日挑战次数
    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(userId);
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }

    const dailyInfo = checkAndResetDailyChallenges(userId);
    const vipLevel = player.vip_level || 0;
    const dailyChallengeCount = ArenaSystem.getDailyChallengeCount(vipLevel);
    const arenaPlayerForMatch = getOrCreateArenaPlayer(userId);
    const extraBought = arenaPlayerForMatch ? arenaPlayerForMatch.extra_challenges_bought || 0 : 0;
    const effectiveLimit = dailyChallengeCount + extraBought;

    if (dailyInfo.challengesUsed >= effectiveLimit) {
      return res.status(400).json({
        success: false,
        error: '今日挑战次数已用完',
        remainingChallenges: 0,
        maxChallenges: dailyChallengeCount,
        extraChallengesBought: extraBought,
        canBuyExtra: true
      });
    }

    // 获取当前积分
    const arenaPlayer = getOrCreateArenaPlayer(userId);
    if (!arenaPlayer) {
      return res.status(500).json({ success: false, error: '竞技场数据不存在' });
    }

    const currentPoints = arenaPlayer.arena_points;
    const range = 2000;

    // 查找附近对手
    let opponents = db.prepare(`
      SELECT p.id,
             COALESCE(u.nickname, u.username, 'AI_' || ap.player_id) as username,
             p.level, p.realm as realm_level,
             ap.arena_points, ap.rank_id, ap.rank_name, ap.win_count, ap.lose_count
      FROM player p
      JOIN arena_player ap ON p.user_id = ap.player_id
      LEFT JOIN Users u ON u.id = ap.player_id
      WHERE ap.player_id != ?
        AND ap.arena_points BETWEEN ? AND ?
      ORDER BY ABS(ap.arena_points - ?) ASC
      LIMIT 5
    `).all(userId, Math.max(0, currentPoints - range), currentPoints + range, currentPoints);

    // 补充高排名玩家
    if (opponents.length < 3) {
      const topOpponents = db.prepare(`
        SELECT p.id,
               COALESCE(u.nickname, u.username, 'AI_' || ap.player_id) as username,
               p.level, p.realm as realm_level,
               ap.arena_points, ap.rank_id, ap.rank_name, ap.win_count, ap.lose_count
        FROM player p
        JOIN arena_player ap ON p.user_id = ap.player_id
        LEFT JOIN Users u ON u.id = ap.player_id
        WHERE ap.player_id != ?
        ORDER BY ap.arena_points DESC
        LIMIT ?
      `).all(userId, 3 - opponents.length);

      const existingIds = new Set(opponents.map(o => o.id));
      for (const top of topOpponents) {
        if (!existingIds.has(top.id)) {
          opponents.push(top);
          existingIds.add(top.id);
        }
        if (opponents.length >= 3) break;
      }
    }

    if (opponents.length === 0) {
      return res.json({ success: false, error: '暂无可用对手' });
    }

    // 随机选择一个对手
    const target = opponents[Math.floor(Math.random() * opponents.length)];
    const targetRank = ArenaSystem.getRank(target.rank_id);

    res.json({
      success: true,
      data: {
        matchId: Date.now(),
        opponent: {
          playerId: target.id,
          username: target.username,
          level: target.level,
          realmLevel: target.realm_level,
          combatPower: Math.floor(target.level * 500 + (target.realm_level || 1) * 2000),
          arenaPoints: target.arena_points,
          rankId: target.rank_id,
          rankName: target.rank_name,
          rankIcon: targetRank.icon,
          winCount: target.win_count,
          loseCount: target.lose_count,
          winRate: (target.win_count + target.lose_count) > 0
            ? Math.round((target.win_count / (target.win_count + target.lose_count)) * 100)
            : 0
        },
        remainingChallenges: Math.max(0, effectiveLimit - dailyInfo.challengesUsed),
        maxChallenges: dailyChallengeCount,
        extraChallengesBought: extraBought,
        effectiveMaxChallenges: effectiveLimit
      }
    });
  } catch (error) {
    Logger.error('POST /match 错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /buy-challenge - 用灵石购买额外挑战次数
router.post('/buy-challenge', (req, res) => {
  try {
    const userId = req.userId || parseInt(req.body.player_id) || parseInt(req.body.userId);
    const quantity = Math.max(1, parseInt(req.body.quantity) || 1);

    if (!userId) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }

    if (!db || !ArenaSystem) {
      return res.status(500).json({ success: false, error: '系统不可用' });
    }

    // 每额外挑战一次消耗50灵石
    const costPerChallenge = ArenaSystem.challengeConfig.refreshCost || 50;
    const totalCost = costPerChallenge * quantity;

    // 获取玩家灵石
    const player = db.prepare('SELECT * FROM Users WHERE id = ?').get(userId);
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }

    if ((player.lingshi || 0) < totalCost) {
      return res.status(400).json({
        success: false,
        error: `灵石不足，需要${totalCost}灵石，当前${player.lingshi || 0}`,
        required: totalCost,
        current: player.lingshi || 0
      });
    }

    // 确保 arena_player 记录存在
    getOrCreateArenaPlayer(userId);

    // 重置每日次数（如跨日）
    checkAndResetDailyChallenges(userId);

    // 扣除灵石
    db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(totalCost, userId);

    // 增加 extra_challenges_bought
    db.prepare(`
      UPDATE arena_player
      SET extra_challenges_bought = extra_challenges_bought + ?
      WHERE player_id = ?
    `).run(quantity, userId);

    // 获取最终挑战次数状态
    const dailyInfo = checkAndResetDailyChallenges(userId);
    const vipLevel = player.vip_level || 0;
    const dailyChallengeCount = ArenaSystem.getDailyChallengeCount(vipLevel);
    const arenaInfo = db.prepare(
      'SELECT extra_challenges_bought FROM arena_player WHERE player_id = ?'
    ).get(userId);
    const extraBought = arenaInfo ? arenaInfo.extra_challenges_bought || 0 : 0;
    const effectiveLimit = dailyChallengeCount + extraBought;
    const remaining = Math.max(0, effectiveLimit - dailyInfo.challengesUsed);

    res.json({
      success: true,
      data: {
        message: `购买成功，获得${quantity}次额外挑战`,
        cost: totalCost,
        extraChallengesBought: quantity,
        totalExtraChallenges: extraBought,
        remainingChallenges: remaining,
        maxChallenges: dailyChallengeCount,
        effectiveMaxChallenges: effectiveLimit,
        remainingSpiritStones: (player.lingshi || 0) - totalCost
      }
    });
  } catch (error) {
    Logger.error('POST /buy-challenge 错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
