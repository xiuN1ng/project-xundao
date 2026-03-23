/**
 * 天梯系统存储层
 * 段位赛、实时匹配、赛季奖励
 */

let db;
function getDb() {
  if (!db) {
    const Database = require('better-sqlite3');
    const path = require('path');
    const dbPath = path.join(__dirname, '..', 'data', 'game.db');
    db = new Database(dbPath);
  }
  return db;
}

// 初始化天梯相关表
function initLadderTables() {
  const database = getDb();
  
  // 天梯玩家数据
  database.exec(`
    CREATE TABLE IF NOT EXISTS ladder_player (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL UNIQUE,
      rank INTEGER DEFAULT 0,
      division INTEGER DEFAULT 1,
      points INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      current_streak INTEGER DEFAULT 0,
      best_streak INTEGER DEFAULT 0,
      season_id INTEGER DEFAULT 1,
      last_match_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // 天梯匹配记录
  database.exec(`
    CREATE TABLE IF NOT EXISTS ladder_match (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      season_id INTEGER NOT NULL,
      player1_id INTEGER NOT NULL,
      player2_id INTEGER NOT NULL,
      player1_points_before INTEGER,
      player2_points_before INTEGER,
      winner_id INTEGER,
      player1_points_change INTEGER,
      player2_points_change INTEGER,
      duration INTEGER,
      fought_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // 天梯赛季配置
  database.exec(`
    CREATE TABLE IF NOT EXISTS ladder_season (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      season_num INTEGER NOT NULL UNIQUE,
      start_date DATETIME,
      end_date DATETIME,
      is_active INTEGER DEFAULT 0,
      reward_distribution TEXT DEFAULT '[]'
    )
  `);
  
  // 赛季奖励记录
  database.exec(`
    CREATE TABLE IF NOT EXISTS ladder_rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      season_id INTEGER NOT NULL,
      rank INTEGER,
      division INTEGER,
      rewards_claimed INTEGER DEFAULT 0,
      claimed_at DATETIME,
      UNIQUE(player_id, season_id)
    )
  `);
  
  console.log('✅ 天梯表初始化完成');
}

// 天梯段位配置
const LADDER_DIVISIONS = {
  // 段位: { name: 名称, minPoints: 最低积分, icon: 图标 }
  0: { name: '青铜', minPoints: 0, icon: '🥉' },
  1: { name: '白银', minPoints: 1200, icon: '🥈' },
  2: { name: '黄金', minPoints: 2400, icon: '🥇' },
  3: { name: '铂金', minPoints: 3600, icon: '💎' },
  4: { name: '钻石', minPoints: 4800, icon: '💠' },
  5: { name: '大师', minPoints: 6000, icon: '👑' },
  6: { name: '王者', minPoints: 8000, icon: '🏆' }
};

// 赛季奖励配置
const SEASON_REWARDS = {
  1: [
    { rank: 1, rewards: { spirit_stones: 10000, title: '天梯王者' } },
    { rank: 2, rewards: { spirit_stones: 5000, title: '天梯亚军' } },
    { rank: 3, rewards: { spirit_stones: 3000, title: '天梯季军' } },
    { rank: [4, 10], rewards: { spirit_stones: 1000 } },
    { rank: [11, 100], rewards: { spirit_stones: 500 } }
  ]
};

const ladderStorage = {
  // 获取玩家天梯数据
  getPlayerLadderData(playerId) {
    const database = getDb();
    let data = database.prepare('SELECT * FROM ladder_player WHERE player_id = ?').get(playerId);
    
    if (!data) {
      // 初始化新玩家
      database.prepare(`
        INSERT INTO ladder_player (player_id, rank, division, points) VALUES (?, 0, 0, 0)
      `).run(playerId);
      data = database.prepare('SELECT * FROM ladder_player WHERE player_id = ?').get(playerId);
    }
    
    // 获取段位信息
    const divisionInfo = LADDER_DIVISIONS[data.division] || LADDER_DIVISIONS[0];
    
    return {
      ...data,
      division_name: divisionInfo.name,
      division_icon: divisionInfo.icon,
      win_rate: data.wins + data.losses > 0 
        ? Math.round(data.wins / (data.wins + data.losses) * 100) 
        : 0
    };
  },
  
  // 获取天梯排行榜
  getLadderRankings(limit = 100) {
    const database = getDb();
    const rankings = database.prepare(`
      SELECT lp.*, p.username, p.level, p.realm_level
      FROM ladder_player lp
      LEFT JOIN player p ON lp.player_id = p.id
      ORDER BY lp.points DESC, lp.wins DESC
      LIMIT ?
    `).all(limit);
    
    return rankings.map((r, i) => ({
      rank: i + 1,
      player_id: r.player_id,
      username: r.username || 'Unknown',
      level: r.level || 1,
      realm: r.realm_level || 1,
      points: r.points,
      division: r.division,
      division_name: LADDER_DIVISIONS[r.division]?.name || '青铜',
      division_icon: LADDER_DIVISIONS[r.division]?.icon || '🥉',
      wins: r.wins,
      losses: r.losses,
      win_rate: r.wins + r.losses > 0 
        ? Math.round(r.wins / (r.wins + r.losses) * 100) 
        : 0
    }));
  },
  
  // 匹配对手
  findMatch(playerId) {
    const database = getDb();
    const playerData = this.getPlayerLadderData(playerId);
    
    // 查找积分相近的对手（±300分）
    const opponent = database.prepare(`
      SELECT lp.*, p.username, p.level, p.realm_level
      FROM ladder_player lp
      LEFT JOIN player p ON lp.player_id = p.id
      WHERE lp.player_id != ? 
        AND lp.points BETWEEN ? AND ?
        AND (lp.last_match_at IS NULL OR lp.last_match_at < datetime('now', '-5 minutes'))
      ORDER BY ABS(lp.points - ?) ASC
      LIMIT 1
    `).get(
      playerId,
      playerData.points - 300,
      playerData.points + 300,
      playerData.points
    );
    
    if (!opponent) {
      // 没有合适对手，返回AI对手
      return {
        is_ai: true,
        opponent: {
          player_id: 0,
          username: '天梯机器人',
          level: playerData.points / 100 + 1,
          realm: Math.floor(playerData.points / 1200) + 1,
          points: playerData.points + Math.floor(Math.random() * 200 - 100)
        }
      };
    }
    
    return {
      is_ai: false,
      opponent: {
        player_id: opponent.player_id,
        username: opponent.username,
        level: opponent.level || 1,
        realm: opponent.realm_level || 1,
        points: opponent.points
      }
    };
  },
  
  // 开始匹配
  startMatching(playerId) {
    const match = this.findMatch(playerId);
    
    // 记录匹配开始时间
    const database = getDb();
    database.prepare(`
      UPDATE ladder_player SET last_match_at = ? WHERE player_id = ?
    `).run(new Date().toISOString(), playerId);
    
    return match;
  },
  
  // 结束比赛并计算积分
  finishMatch(playerId, opponentId, winnerId, isAI = false) {
    const database = getDb();
    
    const playerData = this.getPlayerLadderData(playerId);
    const opponentData = opponentId === 0 
      ? { points: playerData.points + Math.floor(Math.random() * 200 - 100) }
      : this.getPlayerLadderData(opponentId);
    
    // 计算积分变化
    const basePoints = 25;
    const pointDiff = playerData.points - opponentData.points;
    
    // 基础输赢积分
    let playerPointsChange = winnerId === playerId ? basePoints : -basePoints;
    
    // 根据积分差调整
    if (pointDiff > 300) {
      // 对方太强，输了少扣分
      playerPointsChange = winnerId === playerId ? basePoints : -10;
    } else if (pointDiff < -300) {
      // 对方太弱，赢了少加分
      playerPointsChange = winnerId === playerId ? 10 : -basePoints;
    }
    
    // 更新玩家数据
    const newPoints = Math.max(0, playerData.points + playerPointsChange);
    const newDivision = this.calculateDivision(newPoints);
    
    database.prepare(`
      UPDATE ladder_player 
      SET points = ?, division = ?, 
          wins = wins + ?, 
          losses = losses + ?,
          current_streak = ?,
          best_streak = MAX(best_streak, ?),
          updated_at = ?
      WHERE player_id = ?
    `).run(
      newPoints,
      newDivision,
      winnerId === playerId ? 1 : 0,
      winnerId !== playerId ? 1 : 0,
      winnerId === playerId ? playerData.current_streak + 1 : 0,
      winnerId === playerId ? playerData.current_streak + 1 : 0,
      new Date().toISOString(),
      playerId
    );
    
    // 记录比赛
    if (!isAI) {
      database.prepare(`
        INSERT INTO ladder_match 
        (season_id, player1_id, player2_id, player1_points_before, player2_points_before, 
         winner_id, player1_points_change, player2_points_change)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        1, playerId, opponentId,
        playerData.points, opponentData.points,
        winnerId, playerPointsChange, -playerPointsChange
      );
    }
    
    // 检查是否升级/降段
    const oldDivision = playerData.division;
    const divisionChanged = oldDivision !== newDivision;
    
    return {
      success: true,
      points_change: playerPointsChange,
      new_points: newPoints,
      new_division: newDivision,
      division_name: LADDER_DIVISIONS[newDivision].name,
      division_icon: LADDER_DIVISIONS[newDivision].icon,
      division_changed: divisionChanged,
      is_victory: winnerId === playerId
    };
  },
  
  // 计算段位
  calculateDivision(points) {
    let division = 0;
    for (const [div, info] of Object.entries(LADDER_DIVISIONS)) {
      if (points >= info.minPoints) {
        division = parseInt(div);
      }
    }
    return division;
  },
  
  // 获取当前赛季信息
  getCurrentSeason() {
    const database = getDb();
    const season = database.prepare('SELECT * FROM ladder_season WHERE is_active = 1').get();
    
    if (!season) {
      // 创建第一赛季
      database.prepare(`
        INSERT INTO ladder_season (season_num, start_date, end_date, is_active)
        VALUES (1, datetime('now'), datetime('now', '+30 days'), 1)
      `).run();
      return { id: 1, season_num: 1, is_active: 1 };
    }
    
    return season;
  },
  
  // 发放赛季奖励
  distributeSeasonRewards(seasonId) {
    const database = getDb();
    const rankings = this.getLadderRankings(100);
    const rewards = SEASON_REWARDS[seasonId] || SEASON_REWARDS[1];
    
    const distributed = [];
    
    rankings.forEach((player, index) => {
      const rank = index + 1;
      
      // 查找对应的奖励档位
      const rewardConfig = rewards.find(r => {
        if (Array.isArray(r.rank)) {
          return rank >= r.rank[0] && rank <= r.rank[1];
        }
        return r.rank === rank;
      });
      
      if (rewardConfig) {
        // 发放奖励
        if (rewardConfig.rewards.spirit_stones) {
          database.prepare(`
            UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?
          `).run(rewardConfig.rewards.spirit_stones, player.player_id);
        }
        
        // 记录奖励
        database.prepare(`
          INSERT OR REPLACE INTO ladder_rewards 
          (player_id, season_id, rank, division, rewards_claimed, claimed_at)
          VALUES (?, ?, ?, ?, 1, ?)
        `).run(player.player_id, seasonId, rank, player.division, new Date().toISOString());
        
        distributed.push({
          player_id: player.player_id,
          username: player.username,
          rank: rank,
          rewards: rewardConfig.rewards
        });
      }
    });
    
    return { success: true, distributed_count: distributed.length };
  }
};

// 初始化
initLadderTables();

module.exports = { ladderStorage, LADDER_DIVISIONS, SEASON_REWARDS };
