/**
 * 数据存储层 - MySQL 操作封装
 */

const { pool } = require('./database');

// 玩家数据操作
const playerStorage = {
  // 创建或获取玩家
  async getOrCreatePlayer(playerId, username = null) {
    let player;
    
    if (playerId) {
      [player] = await pool.execute('SELECT * FROM player WHERE id = ?', [playerId]);
      if (player.length > 0) {
        return player[0];
      }
    }
    
    // 创建新玩家
    const usernameStr = username || `player_${Date.now()}`;
    const [result] = await pool.execute(
      'INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)',
      [usernameStr, 10000, 1, 0]
    );
    
    [player] = await pool.execute('SELECT * FROM player WHERE id = ?', [result.insertId]);
    return player[0];
  },

  // 更新玩家灵石
  async updateSpiritStones(playerId, amount) {
    await pool.execute(
      'UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?',
      [amount, playerId]
    );
  },

  // 更新玩家境界
  async updateRealmLevel(playerId, realmLevel) {
    await pool.execute(
      'UPDATE player SET realm_level = ? WHERE id = ?',
      [realmLevel, playerId]
    );
  },

  // 更新玩家等级
  async updateLevel(playerId, level) {
    await pool.execute(
      'UPDATE player SET level = ? WHERE id = ?',
      [level, playerId]
    );
  }
};

// 功法数据操作
const gongfaStorage = {
  // 获取所有功法
  async getGongfaList(filters = {}) {
    let sql = 'SELECT * FROM gongfa';
    const params = [];
    const conditions = [];
    
    if (filters.type) {
      conditions.push('type = ?');
      params.push(filters.type);
    }
    if (filters.rarity) {
      conditions.push('rarity = ?');
      params.push(filters.rarity);
    }
    if (filters.realm_req !== undefined) {
      conditions.push('realm_req <= ?');
      params.push(filters.realm_req);
    }
    if (filters.level_req !== undefined) {
      conditions.push('level_req <= ?');
      params.push(filters.level_req);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY rarity DESC, realm_req ASC';
    
    const [rows] = await pool.execute(sql, params);
    return rows;
  },

  // 获取单个功法
  async getGongfaById(gongfaId) {
    const [rows] = await pool.execute('SELECT * FROM gongfa WHERE id = ?', [gongfaId]);
    return rows[0] || null;
  },

  // 获取玩家已学习的功法
  async getLearnedGongfa(playerId) {
    const [rows] = await pool.execute(
      'SELECT pg.*, g.name, g.type, g.icon, g.rarity FROM player_gongfa pg JOIN gongfa g ON pg.gongfa_id = g.id WHERE pg.player_id = ?',
      [playerId]
    );
    return rows;
  },

  // 学习功法
  async learnGongfa(playerId, gongfaId) {
    await pool.execute(
      'INSERT INTO player_gongfa (player_id, gongfa_id, level, exp) VALUES (?, ?, ?, ?)',
      [playerId, gongfaId, 1, 0]
    );
  },

  // 检查是否已学习
  async hasLearned(playerId, gongfaId) {
    const [rows] = await pool.execute(
      'SELECT * FROM player_gongfa WHERE player_id = ? AND gongfa_id = ?',
      [playerId, gongfaId]
    );
    return rows.length > 0;
  },

  // 升级功法
  async upgradeGongfa(playerId, gongfaId) {
    await pool.execute(
      'UPDATE player_gongfa SET level = level + 1, updated_at = CURRENT_TIMESTAMP WHERE player_id = ? AND gongfa_id = ?',
      [playerId, gongfaId]
    );
  },

  // 获取玩家功法经验
  async getGongfaExp(playerId, gongfaId) {
    const [rows] = await pool.execute(
      'SELECT exp FROM player_gongfa WHERE player_id = ? AND gongfa_id = ?',
      [playerId, gongfaId]
    );
    return rows[0]?.exp || 0;
  },

  // 消耗功法经验
  async consumeGongfaExp(playerId, gongfaId, exp) {
    await pool.execute(
      'UPDATE player_gongfa SET exp = exp - ?, updated_at = CURRENT_TIMESTAMP WHERE player_id = ? AND gongfa_id = ?',
      [exp, playerId, gongfaId]
    );
  }
};

// 功法装备操作
const equipmentStorage = {
  // 获取装备列表
  async getEquipment(playerId) {
    const [rows] = await pool.execute(
      'SELECT * FROM player_gongfa_equipment WHERE player_id = ?',
      [playerId]
    );
    
    const equipment = {};
    rows.forEach(row => {
      equipment[row.slot] = row.gongfa_id;
    });
    return equipment;
  },

  // 装备功法
  async equipGongfa(playerId, slot, gongfaId) {
    await pool.execute(
      `INSERT INTO player_gongfa_equipment (player_id, slot, gongfa_id, updated_at) 
       VALUES (?, ?, ?, CURRENT_TIMESTAMP) 
       ON DUPLICATE KEY UPDATE gongfa_id = excluded.gongfa_id, updated_at = CURRENT_TIMESTAMP`,
      [playerId, slot, gongfaId]
    );
  },

  // 卸下功法
  async unequipGongfa(playerId, slot) {
    await pool.execute(
      'UPDATE player_gongfa_equipment SET gongfa_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE player_id = ? AND slot = ?',
      [playerId, slot]
    );
  }
};

// 玩家游戏数据操作
const gameDataStorage = {
  // 获取玩家游戏数据
  async getPlayerGameData(playerId) {
    const [rows] = await pool.execute(
      'SELECT player_data FROM player_game_data WHERE player_id = ?',
      [playerId]
    );
    
    if (rows.length > 0) {
      return JSON.parse(rows[0].player_data);
    }
    return null;
  },

  // 保存玩家游戏数据
  async savePlayerGameData(playerId, gameData) {
    const jsonData = JSON.stringify(gameData);
    
    await pool.execute(
      `INSERT INTO player_game_data (player_id, player_data, updated_at) 
       VALUES (?, ?, CURRENT_TIMESTAMP) 
       ON DUPLICATE KEY UPDATE player_data = excluded.player_data, updated_at = CURRENT_TIMESTAMP`,
      [playerId, jsonData]
    );
  }
};

// 境界副本进度操作
const realmDungeonStorage = {
  // 获取玩家副本进度
  async getProgress(playerId) {
    const [rows] = await pool.execute(
      'SELECT realm, highest_floor, cleared FROM realm_dungeon_progress WHERE player_id = ?',
      [playerId]
    );
    
    const progress = {};
    rows.forEach(row => {
      progress[row.realm] = {
        highestFloor: row.highest_floor,
        cleared: !!row.cleared
      };
    });
    return progress;
  },

  // 更新副本进度
  async updateProgress(playerId, realm, highestFloor, cleared) {
    await pool.execute(
      `INSERT INTO realm_dungeon_progress (player_id, realm, highest_floor, cleared, updated_at) 
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP) 
       ON DUPLICATE KEY UPDATE highest_floor = GREATEST(highest_floor, excluded.highest_floor), cleared = cleared | excluded.cleared, updated_at = CURRENT_TIMESTAMP`,
      [playerId, realm, highestFloor, cleared ? 1 : 0]
    );
  }
};

module.exports = {
  playerStorage,
  gongfaStorage,
  equipmentStorage,
  gameDataStorage,
  realmDungeonStorage
};
