/**
 * 封神榜系统存储层
 * 玩家战力排行榜、挑战系统
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

// 初始化封神榜相关表
function initDeityTables() {
  const database = getDb();
  
  // 封神榜榜单配置
  database.exec(`
    CREATE TABLE IF NOT EXISTS deity_list (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_type TEXT NOT NULL,
      list_name TEXT NOT NULL,
      description TEXT,
      min_requirement INTEGER DEFAULT 0,
      reward_config TEXT DEFAULT '{}',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // 封神榜记录
  database.exec(`
    CREATE TABLE IF NOT EXISTS deity_record (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      list_type TEXT NOT NULL,
      rank INTEGER NOT NULL,
      value INTEGER DEFAULT 0,
      record_date DATE DEFAULT (date('now')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, list_type, record_date)
    )
  `);
  
  // 封神榜挑战记录
  database.exec(`
    CREATE TABLE IF NOT EXISTS deity_challenge (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      challenger_id INTEGER NOT NULL,
      target_id INTEGER NOT NULL,
      list_type TEXT NOT NULL,
      result TEXT,
      challenger_points_before INTEGER,
      challenger_points_after INTEGER,
      target_rank_before INTEGER,
      target_rank_after INTEGER,
      challenged_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('✅ 封神榜表初始化完成');
}

// 榜单类型配置
const DEITY_LIST_TYPES = {
  combat_power: {
    name: '战力榜',
    icon: '⚔️',
    description: '根据玩家总战力排名',
    reward_mult: 1
  },
  realm: {
    name: '境界榜',
    icon: '⬆️',
    description: '根据玩家境界排名',
    reward_mult: 1.5
  },
  wealth: {
    name: '富豪榜',
    icon: '💎',
    description: '根据玩家灵石数量排名',
    reward_mult: 0.8
  },
  arena: {
    name: '竞技榜',
    icon: '🏆',
    description: '根据竞技场排名',
    reward_mult: 1.2
  }
};

// 榜单奖励配置
const LIST_REWARDS = {
  combat_power: {
    1: { spirit_stones: 5000, title: '封神·战力第一' },
    2: { spirit_stones: 3000, title: '封神·战力第二' },
    3: { spirit_stones: 2000, title: '封神·战力第三' },
    4: { spirit_stones: 1000 },
    5: { spirit_stones: 800 },
    6: { spirit_stones: 600 },
    7: { spirit_stones: 500 },
    8: { spirit_stones: 400 },
    9: { spirit_stones: 300 },
    10: { spirit_stones: 200 }
  },
  realm: {
    1: { spirit_stones: 8000, title: '封神·境界第一人' },
    2: { spirit_stones: 5000, title: '封神·境界第二人' },
    3: { spirit_stones: 3000, title: '封神·境界第三人' }
  },
  wealth: {
    1: { spirit_stones: 10000, title: '封神·首富' }
  },
  arena: {
    1: { spirit_stones: 5000, title: '封神·竞技王者' },
    2: { spirit_stones: 3000 },
    3: { spirit_stones: 2000 }
  }
};

const deityStorage = {
  // 获取榜单类型列表
  getListTypes() {
    return Object.entries(DEITY_LIST_TYPES).map(([type, config]) => ({
      type,
      name: config.name,
      icon: config.icon,
      description: config.description
    }));
  },
  
  // 获取指定榜单的排名
  getRanking(listType, limit = 100) {
    const database = getDb();
    const config = DEITY_LIST_TYPES[listType];
    
    if (!config) {
      return { success: false, error: '榜单类型不存在' };
    }
    
    let orderField = 'combat_power';
    if (listType === 'realm') orderField = 'realm_level';
    if (listType === 'wealth') orderField = 'spirit_stones';
    if (listType === 'arena') orderField = 'arena_rank';
    
    const rankings = database.prepare(`
      SELECT 
        p.id as player_id,
        p.username,
        p.combat_power,
        p.realm_level,
        p.spirit_stones,
        p.level,
        ROW_NUMBER() OVER (ORDER BY ${orderField} DESC) as rank
      FROM player p
      WHERE p.${orderField} > 0
      ORDER BY ${orderField} DESC
      LIMIT ?
    `).all(limit);
    
    return rankings.map((r, i) => ({
      rank: i + 1,
      player_id: r.player_id,
      username: r.username || 'Unknown',
      level: r.level || 1,
      realm: r.realm_level || 1,
      combat_power: r.combat_power || 0,
      spirit_stones: r.spirit_stones || 0,
      value: r[orderField] || 0
    }));
  },
  
  // 获取玩家在某榜单的排名
  getPlayerRank(playerId, listType) {
    const database = getDb();
    const config = DEITY_LIST_TYPES[listType];
    
    if (!config) {
      return { success: false, error: '榜单类型不存在' };
    }
    
    let orderField = 'combat_power';
    if (listType === 'realm') orderField = 'realm_level';
    if (listType === 'wealth') orderField = 'spirit_stones';
    if (listType === 'arena') orderField = 'arena_rank';
    
    // 获取玩家在所有榜单中的排名
    const player = database.prepare(`
      SELECT ${orderField} as value FROM player WHERE id = ?
    `).get(playerId);
    
    if (!player) {
      return { success: false, error: '玩家不存在' };
    }
    
    // 计算排名
    const countResult = database.prepare(`
      SELECT COUNT(*) as cnt FROM player WHERE ${orderField} > ?
    `).get(player.value);
    
    const rank = countResult.cnt + 1;
    
    return {
      success: true,
      data: {
        player_id: playerId,
        list_type: listType,
        rank: rank,
        value: player.value,
        list_name: config.name
      }
    };
  },
  
  // 获取所有榜单中玩家的最高排名
  getPlayerBestRank(playerId) {
    const database = getDb();
    const player = database.prepare(`
      SELECT combat_power, realm_level, spirit_stones, arena_rank FROM player WHERE id = ?
    `).get(playerId);
    
    if (!player) {
      return { success: false, error: '玩家不存在' };
    }
    
    const rankings = {};
    let bestRank = null;
    let bestType = null;
    let bestPosition = 999999;
    
    for (const [type, config] of Object.entries(DEITY_LIST_TYPES)) {
      let orderField = 'combat_power';
      if (type === 'realm') orderField = 'realm_level';
      if (type === 'wealth') orderField = 'spirit_stones';
      if (type === 'arena') orderField = 'arena_rank';
      
      const countResult = database.prepare(`
        SELECT COUNT(*) as cnt FROM player WHERE ${orderField} > ?
      `).get(player[orderField] || 0);
      
      const rank = countResult.cnt + 1;
      rankings[type] = rank;
      
      if (rank < bestPosition) {
        bestPosition = rank;
        bestType = type;
      }
    }
    
    return {
      success: true,
      data: {
        player_id: playerId,
        rankings: rankings,
        best_type: bestType,
        best_rank: bestPosition,
        best_list_name: DEITY_LIST_TYPES[bestType]?.name
      }
    };
  },
  
  // 挑战榜单玩家
  challengeTarget(challengerId, targetId, listType) {
    const database = getDb();
    
    // 获取挑战者和目标玩家信息
    const challenger = database.prepare(`
      SELECT id, username, combat_power, realm_level FROM player WHERE id = ?
    `).get(challengerId);
    
    const target = database.prepare(`
      SELECT id, username, combat_power, realm_level FROM player WHERE id = ?
    `).get(targetId);
    
    if (!challenger || !target) {
      return { success: false, error: '玩家不存在' };
    }
    
    // 简单的战斗逻辑：战力高的一方获胜
    const challengerPower = challenger.combat_power || 0;
    const targetPower = target.combat_power || 0;
    
    // 加入随机因素
    const randomFactor = 0.8 + Math.random() * 0.4;
    const challengerScore = challengerPower * randomFactor;
    const targetScore = targetPower * (1.5 - randomFactor);
    
    const challengerWins = challengerScore > targetScore;
    const winnerId = challengerWins ? challengerId : targetId;
    
    // 记录挑战
    database.prepare(`
      INSERT INTO deity_challenge 
      (challenger_id, target_id, list_type, result)
      VALUES (?, ?, ?, ?)
    `).run(challengerId, targetId, listType, challengerWins ? 'win' : 'lose');
    
    // 如果挑战成功，给予奖励
    let reward = null;
    if (challengerWins) {
      const config = DEITY_LIST_TYPES[listType];
      const rewardAmount = Math.floor((targetPower - challengerPower) * 0.1) + 100;
      
      database.prepare(`
        UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?
      `).run(rewardAmount, challengerId);
      
      reward = { spirit_stones: rewardAmount };
    }
    
    return {
      success: true,
      data: {
        challenger_wins: challengerWins,
        winner_id: winnerId,
        challenger_power: challengerPower,
        target_power: targetPower,
        reward: reward,
        message: challengerWins 
          ? `挑战成功！获得${reward?.spirit_stones || 0}灵石`
          : '挑战失败，再接再厉'
      }
    };
  },
  
  // 记录每日榜单
  recordDailyList() {
    const database = getDb();
    const today = new Date().toISOString().split('T')[0];
    
    // 为每个榜单类型记录当天数据
    for (const listType of Object.keys(DEITY_LIST_TYPES)) {
      const rankings = this.getRanking(listType, 100);
      
      rankings.forEach(r => {
        try {
          database.prepare(`
            INSERT OR REPLACE INTO deity_record 
            (player_id, list_type, rank, value, record_date)
            VALUES (?, ?, ?, ?, ?)
          `).run(r.player_id, listType, r.rank, r.value, today);
        } catch (e) {
          // 忽略重复记录
        }
      });
    }
    
    return { success: true, message: '榜单记录完成' };
  },
  
  // 获取榜单奖励
  getListRewards(listType, rank) {
    const rewards = LIST_REWARDS[listType];
    if (!rewards) return null;
    return rewards[rank] || null;
  }
};

// 初始化
initDeityTables();

module.exports = { deityStorage, DEITY_LIST_TYPES, LIST_REWARDS };
