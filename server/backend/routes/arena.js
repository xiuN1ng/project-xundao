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
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

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

// 初始化AI机器人池（10个AI玩家）
const AI_BOTS = [
  { username: '剑痴', level: 95, realm_level: 8, combat_power: 85000 },
  { username: '刀狂', level: 90, realm_level: 7, combat_power: 72000 },
  { username: '枪神', level: 88, realm_level: 7, combat_power: 68000 },
  { username: '拳霸', level: 85, realm_level: 7, combat_power: 60000 },
  { username: '掌尊', level: 82, realm_level: 6, combat_power: 52000 },
  { username: '指仙', level: 78, realm_level: 6, combat_power: 45000 },
  { username: '暗影刺客', level: 75, realm_level: 6, combat_power: 40000 },
  { username: '天师道', level: 70, realm_level: 5, combat_power: 35000 },
  { username: '丹王', level: 65, realm_level: 5, combat_power: 28000 },
  { username: '符箓师', level: 60, realm_level: 4, combat_power: 20000 }
];

function initAIBots() {
  if (!db) return;
  try {
    const existing = db.prepare('SELECT COUNT(*) as c FROM arena_player WHERE player_id < 0').get().c || 0;
    if (existing > 0) {
      Logger.info(`AI机器人池已初始化 (${existing}个)`);
      return;
    }
    const insert = db.prepare(`
      INSERT OR IGNORE INTO arena_player (player_id, username, arena_points, rank_id, rank_name, current_season, win_count, lose_count, total_battles, daily_challenges_used, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    const insertPlayer = db.prepare(`
      INSERT OR IGNORE INTO player (id, username, level, realm_level, combat_power, vip_level, created_at)
      VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
    `);
    const basePoints = [5000, 4500, 4000, 3500, 3000, 2500, 2000, 1500, 1000, 500];
    const rankIds = [5, 5, 4, 4, 4, 3, 3, 3, 2, 2];
    const rankNames = ['钻石', '钻石', '铂金', '铂金', '铂金', '黄金', '黄金', '黄金', '白银', '白银'];
    const season = ArenaSystem ? ArenaSystem.getCurrentSeasonId() : 'default';
    
    for (let i = 0; i < AI_BOTS.length; i++) {
      const botId = -(i + 1);
      const bot = AI_BOTS[i];
      try {
        insertPlayer.run(botId, bot.username, bot.level, bot.realm_level, bot.combat_power);
        insert.run(botId, bot.username, basePoints[i], rankIds[i], rankNames[i], season, Math.floor(basePoints[i]/50), Math.floor(basePoints[i]/80), Math.floor(basePoints[i]/30));
      } catch(e) {}
    }
    Logger.info(`AI机器人池初始化完成 (${AI_BOTS.length}个)`);
  } catch (err) {
    Logger.warn('AI机器人池初始化失败:', err.message);
  }
}

initAIBots();

// 加载竞技场系统（单例实例，不重新实例化）
let ArenaSystem;
try {
  const { arenaSystem } = require('../../services/arena_system');
  ArenaSystem = arenaSystem;
  Logger.info('竞技场系统加载成功');
} catch (err) {
  Logger.error('竞技场系统加载失败:', err.message);
  ArenaSystem = null;
}

// 工具函数：获取日期字符串
function getDateString() {
  return new Date().toISOString().split('T')[0];
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

// 工具函数：检查并重置每日挑战次数
function checkAndResetDailyChallenges(playerId) {
  if (!db) return { challengesUsed: 0, dailyRewardClaimed: false };
  
  try {
    const arenaPlayer = db.prepare('SELECT * FROM arena_player WHERE player_id = ?').get(playerId);
    const today = getDateString();
    
    if (!arenaPlayer || arenaPlayer.last_challenge_date !== today) {
      // 重置每日挑战次数
      if (arenaPlayer) {
        db.prepare(`
          UPDATE arena_player 
          SET daily_challenges_used = 0, 
              last_challenge_date = ?,
              daily_reward_claimed = 0
          WHERE player_id = ?
        `).run(today, playerId);
      }
      return { challengesUsed: 0, dailyRewardClaimed: false };
    }
    
    return {
      challengesUsed: arenaPlayer.daily_challenges_used || 0,
      dailyRewardClaimed: !!arenaPlayer.daily_reward_claimed
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
      SELECT p.id, p.username, p.level, p.realm_level, p.combat_power,
             ap.arena_points, ap.rank_id, ap.rank_name, ap.win_count, ap.lose_count, ap.total_battles
      FROM player p
      JOIN arena_player ap ON p.id = ap.player_id
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
        combatPower: p.combat_power || 0,
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
          remainingChallenges: dailyChallengeCount - dailyInfo.challengesUsed,
          dailyRewardClaimed: dailyInfo.dailyRewardClaimed
        },
        season: {
          currentSeasonId: arenaPlayer.current_season,
          seasonRemainingTime: seasonInfo.remainingDays
        },
        ranking: {
          current,
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
// GET /opponents/:userId - 获取可挑战对手列表
// ============================================
router.get('/opponents/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { refresh } = req.query;
    
    if (!db) {
      return res.json({ success: false, error: '数据库不可用' });
    }
    
    // 获取玩家竞技场数据
    const arenaPlayer = getOrCreateArenaPlayer(userId);
    if (!arenaPlayer) {
      return res.status(500).json({ success: false, error: '竞技场数据获取失败' });
    }
    
    const currentPoints = arenaPlayer.arena_points;
    const range = 2000;
    
    // 查找附近的对手
    const opponents = db.prepare(`
      SELECT p.id, p.username, p.level, p.realm_level, p.combat_power,
             ap.arena_points, ap.rank_id, ap.rank_name, ap.win_count, ap.lose_count
      FROM player p
      JOIN arena_player ap ON p.id = ap.player_id
      WHERE ap.player_id != ?
        AND ap.arena_points BETWEEN ? AND ?
      ORDER BY ap.arena_points DESC
      LIMIT ?
    `).all(userId, Math.max(0, currentPoints - range), currentPoints + range, 5);
    
    // 补充高排名玩家
    if (opponents.length < 5) {
      const topOpponents = db.prepare(`
        SELECT p.id, p.username, p.level, p.realm_level, p.combat_power,
               ap.arena_points, ap.rank_id, ap.rank_name, ap.win_count, ap.lose_count
        FROM player p
        JOIN arena_player ap ON p.id = ap.player_id
        WHERE ap.player_id != ?
        ORDER BY ap.arena_points DESC
        LIMIT ?
      `).all(userId, 5 - opponents.length);
      
      const existingIds = new Set(opponents.map(o => o.id));
      for (const top of topOpponents) {
        if (!existingIds.has(top.id)) {
          opponents.push(top);
        }
        if (opponents.length >= 5) break;
      }
    }
    
    const currentRank = ArenaSystem ? ArenaSystem.getRank(arenaPlayer.rank_id) : { icon: '👤' };
    const refreshCost = ArenaSystem ? ArenaSystem.challengeConfig.refreshCost : 50;
    
    const opponentList = opponents.map(op => {
      const opRank = ArenaSystem ? ArenaSystem.getRank(op.rank_id) : { icon: '👤' };
      return {
        playerId: op.id,
        username: op.username,
        level: op.level,
        realmLevel: op.realm_level,
        combatPower: op.combat_power || 0,
        arenaPoints: op.arena_points,
        rankId: op.rank_id,
        rankName: op.rank_name,
        rankIcon: opRank.icon,
        winCount: op.win_count,
        loseCount: op.lose_count,
        winRate: (op.win_count + op.lose_count) > 0
          ? Math.round((op.win_count / (op.win_count + op.lose_count)) * 100)
          : 0,
        isRecommend: Math.abs(op.arena_points - currentPoints) < 500
      };
    });
    
    res.json({
      success: true,
      data: {
        playerPoints: currentPoints,
        playerRankId: arenaPlayer.rank_id,
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
             ap1.username as attacker_name,
             ap2.username as defender_name
      FROM arena_battles ab
      LEFT JOIN player ap1 ON ab.attacker_id = ap1.id
      LEFT JOIN player ap2 ON ab.defender_id = ap2.id
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
    // 支持 player_id / userId 双别名
    const player_id = parseInt(req.body.player_id) || parseInt(req.body.userId);
    const target_id = parseInt(req.body.target_id) || parseInt(req.body.targetId);
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
    
    // 检查每日挑战次数
    const dailyInfo = checkAndResetDailyChallenges(player_id);
    const vipLevel = player.vip_level || 0;
    const dailyChallengeCount = ArenaSystem.getDailyChallengeCount(vipLevel);
    
    if (dailyInfo.challengesUsed >= dailyChallengeCount) {
      return res.status(400).json({
        success: false,
        error: '今日挑战次数已用完',
        remaining: 0,
        maxChallenges: dailyChallengeCount
      });
    }
    
    // 获取对手信息
    const targetPlayer = db.prepare(`
      SELECT p.id, p.username, p.level, p.realm_level, p.combat_power,
             ap.arena_points, ap.rank_id, ap.rank_name, ap.win_count, ap.lose_count
      FROM player p
      JOIN arena_player ap ON p.id = ap.player_id
      WHERE p.id = ?
    `).get(target_id);
    
    if (!targetPlayer) {
      return res.status(404).json({ success: false, error: '对手不存在或未参加竞技场' });
    }
    
    // 获取双方竞技场数据
    const attackerArena = getOrCreateArenaPlayer(player_id);
    const defenderArena = getOrCreateArenaPlayer(target_id);
    
    // 模拟战斗
    const attackerPower = player.combat_power || 1000;
    const defenderPower = targetPlayer.combat_power || 1000;
    const attackerWin = ArenaSystem.simulateBattle(attackerPower, defenderPower);
    
    // 计算积分变化
    const attackerRank = ArenaSystem.getRank(attackerArena.rank_id);
    const defenderRank = ArenaSystem.getRank(defenderArena.rank_id);
    
    const attackerPointsGain = attackerWin ? attackerRank.winPoints : 0;
    const attackerPointsLoss = !attackerWin ? attackerRank.losePoints : 0;
    const defenderPointsGain = !attackerWin ? defenderRank.winPoints : 0;
    const defenderPointsLoss = attackerWin ? defenderRank.losePoints : 0;
    
    // 更新数据
    const today = getDateString();
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
          daily_challenges_used = daily_challenges_used + 1,
          last_challenge_date = ?,
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
    
    // 更新防守者数据
    db.prepare(`
      UPDATE arena_player
      SET arena_points = ?,
          rank_id = ?,
          rank_name = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE player_id = ?
    `).run(
      newDefenderPoints,
      newDefenderRank.id,
      newDefenderRank.name,
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
    
    // 计算奖励
    const reward = attackerWin
      ? { arenaPoints: attackerRank.winPoints, lingshi: 100, dailyPoints: 10 }
      : { arenaPoints: 0, lingshi: 20, dailyPoints: 2 };
    
    // 发放灵石奖励
    if (attackerWin && reward.lingshi > 0) {
      try {
        db.prepare('UPDATE player SET lingshi = lingshi + ? WHERE id = ?').run(reward.lingshi, player_id);
      } catch (e) {
        Logger.warn('灵石奖励发放失败:', e.message);
      }
    }
    
    res.json({
      success: true,
      data: {
        battleId: Date.now(),
        win: attackerWin,
        result: attackerWin ? '胜利' : '失败',
        battleReport,
        reward,
        ranking: {
          newPoints: newAttackerPoints,
          newRankId: newAttackerRank.id,
          newRankName: newAttackerRank.name,
          pointsGained: attackerPointsGain,
          pointsLost: attackerPointsLoss
        },
        remainingChallenges: dailyChallengeCount - dailyInfo.challengesUsed - 1
      }
    });
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
    const { player_id } = req.query;
    
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
    const { player_id, season_id, rank_id } = req.body;
    
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
    
    // 发放奖励
    if (dailyReward.spiritStones) {
      db.prepare('UPDATE player SET lingshi = lingshi + ? WHERE id = ?').run(dailyReward.spiritStones, player_id);
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
    const userId = parseInt(req.query.userId) || parseInt(req.query.player_id) || 1;
    
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
          remainingChallenges: Math.max(0, dailyChallengeCount - dailyInfo.challengesUsed),
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
    const userId = parseInt(req.body.userId) || parseInt(req.body.player_id) || 1;
    
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
    
    if (dailyInfo.challengesUsed >= dailyChallengeCount) {
      return res.status(400).json({
        success: false,
        error: '今日挑战次数已用完',
        remainingChallenges: 0,
        maxChallenges: dailyChallengeCount
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
      SELECT p.id, p.username, p.level, p.realm_level, p.combat_power,
             ap.arena_points, ap.rank_id, ap.rank_name, ap.win_count, ap.lose_count
      FROM player p
      JOIN arena_player ap ON p.id = ap.player_id
      WHERE ap.player_id != ?
        AND ap.arena_points BETWEEN ? AND ?
      ORDER BY ABS(ap.arena_points - ?) ASC
      LIMIT 5
    `).all(userId, Math.max(0, currentPoints - range), currentPoints + range, currentPoints);
    
    // 补充高排名玩家
    if (opponents.length < 3) {
      const topOpponents = db.prepare(`
        SELECT p.id, p.username, p.level, p.realm_level, p.combat_power,
               ap.arena_points, ap.rank_id, ap.rank_name, ap.win_count, ap.lose_count
        FROM player p
        JOIN arena_player ap ON p.id = ap.player_id
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
          combatPower: target.combat_power || 0,
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
        remainingChallenges: dailyChallengeCount - dailyInfo.challengesUsed,
        maxChallenges: dailyChallengeCount
      }
    });
  } catch (error) {
    Logger.error('POST /match 错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
