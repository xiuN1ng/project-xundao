/**
 * 数据存储层 - SQLite 操作封装
 * 使用better-sqlite3，与server.js共享数据库连接
 */

let db;
try {
  // 尝试从server.js导入db实例
  const server = require('../server');
  db = server.db || server;
} catch {
  // 如果导入失败，使用独立的数据库连接
  const Database = require('better-sqlite3');
  const path = require('path');
  const dbPath = path.join(__dirname, '..', 'data', 'game.db');
  db = new Database(dbPath);
}

// 玩家数据操作
const playerStorage = {
  // 创建或获取玩家
  getOrCreatePlayer(playerId, username = null) {
    let player;
    
    if (playerId) {
      player = db.prepare('SELECT * FROM player WHERE id = ?').get(playerId);
      if (player) return player;
    }
    
    // 创建新玩家
    const usernameStr = username || `player_${Date.now()}`;
    const result = db.prepare(
      'INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)'
    ).run(usernameStr, 10000, 1, 0);
    
    return db.prepare('SELECT * FROM player WHERE id = ?').get(result.lastInsertRowid);
  },

  // 更新玩家灵石
  updateSpiritStones(playerId, amount) {
    db.prepare(
      'UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?'
    ).run(amount, playerId);
  },

  // 更新玩家强化石
  updateQianghuaStones(playerId, amount) {
    db.prepare(
      'UPDATE player SET qianghua_stones = COALESCE(qianghua_stones, 0) + ? WHERE id = ?'
    ).run(amount, playerId);
  },

  // 获取玩家强化石数量
  getQianghuaStones(playerId) {
    const player = db.prepare('SELECT qianghua_stones FROM player WHERE id = ?').get(playerId);
    return player?.qianghua_stones || 0;
  },

  // 检查玩家是否有足够灵石
  async hasEnoughSpiritStones(playerId, amount) {
    const [rows] = await pool.execute(
      'SELECT spirit_stones FROM player WHERE id = ?',
      [playerId]
    );
    if (rows.length === 0) return false;
    return rows[0].spirit_stones >= amount;
  },

  // 扣除玩家灵石
  async deductSpiritStones(playerId, amount) {
    await pool.execute(
      'UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ? AND spirit_stones >= ?',
      [amount, playerId, amount]
    );
  },

  // 添加资源（灵石和经验）
  async addResources(playerId, spiritStones = 0, exp = 0) {
    if (spiritStones > 0) {
      await pool.execute(
        'UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?',
        [spiritStones, playerId]
      );
    }
    if (exp > 0) {
      // 经验添加到玩家游戏数据中
      const gameData = await gameDataStorage.getPlayerGameData(playerId);
      if (!gameData) {
        // 创建初始游戏数据
        await gameDataStorage.savePlayerGameData(playerId, {
          exp: exp,
          level: 1,
          realm_level: 0,
          cultivation: 0
        });
      } else {
        gameData.exp = (gameData.exp || 0) + exp;
        await gameDataStorage.savePlayerGameData(playerId, gameData);
      }
    }
  },

  // 更新玩家境界
  updateRealmLevel(playerId, realmLevel) {
    db.prepare(
      'UPDATE player SET realm_level = ? WHERE id = ?'
    ).run(realmLevel, playerId);
  },

  // 更新玩家等级
  updateLevel(playerId, level) {
    db.prepare(
      'UPDATE player SET level = ? WHERE id = ?'
    ).run(level, playerId);
  },

  // 更新玩家经验
  updateExperience(playerId, exp) {
    db.prepare(
      'UPDATE player SET experience = COALESCE(experience, 0) + ? WHERE id = ?'
    ).run(exp, playerId);
  }
};

// 功法数据操作
const gongfaStorage = {
  // 获取所有功法
  getGongfaList(filters = {}) {
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
    
    return db.prepare(sql).all(...params);
  },

  // 获取单个功法
  getGongfaById(gongfaId) {
    return db.prepare('SELECT * FROM gongfa WHERE id = ?').get(gongfaId);
  },

  // 获取玩家已学习的功法
  getLearnedGongfa(playerId) {
    return db.prepare(
      'SELECT pg.*, g.name, g.type, g.icon, g.rarity FROM player_gongfa pg JOIN gongfa g ON pg.gongfa_id = g.id WHERE pg.player_id = ?'
    ).all(playerId);
  },

  // 学习功法
  learnGongfa(playerId, gongfaId) {
    db.prepare(
      'INSERT INTO player_gongfa (player_id, gongfa_id, level, exp) VALUES (?, ?, ?, ?)'
    ).run(playerId, gongfaId, 1, 0);
  },

  // 检查是否已学习
  hasLearned(playerId, gongfaId) {
    const row = db.prepare(
      'SELECT * FROM player_gongfa WHERE player_id = ? AND gongfa_id = ?'
    ).get(playerId, gongfaId);
    return !!row;
  },

  // 升级功法
  upgradeGongfa(playerId, gongfaId) {
    db.prepare(
      'UPDATE player_gongfa SET level = level + 1, updated_at = CURRENT_TIMESTAMP WHERE player_id = ? AND gongfa_id = ?'
    ).run(playerId, gongfaId);
  },

  // 获取玩家功法经验
  getGongfaExp(playerId, gongfaId) {
    const row = db.prepare(
      'SELECT exp FROM player_gongfa WHERE player_id = ? AND gongfa_id = ?'
    ).get(playerId, gongfaId);
    return row?.exp || 0;
  },

  // 消耗功法经验
  consumeGongfaExp(playerId, gongfaId, exp) {
    db.prepare(
      'UPDATE player_gongfa SET exp = exp - ?, updated_at = CURRENT_TIMESTAMP WHERE player_id = ? AND gongfa_id = ?'
    ).run(exp, playerId, gongfaId);
  }
};

// 功法装备操作
const equipmentStorage = {
  // 获取装备列表
  getEquipment(playerId) {
    const rows = db.prepare(
      'SELECT * FROM player_gongfa_equipment WHERE player_id = ?'
    ).all(playerId);
    
    const equipment = {};
    rows.forEach(row => {
      equipment[row.slot] = row.gongfa_id;
    });
    return equipment;
  },

  // 装备功法
  equipGongfa(playerId, slot, gongfaId) {
    // SQLite使用INSERT OR REPLACE
    db.prepare(
      `INSERT OR REPLACE INTO player_gongfa_equipment (player_id, slot, gongfa_id, updated_at) 
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`
    ).run(playerId, slot, gongfaId);
  },

  // 卸下功法
  unequipGongfa(playerId, slot) {
    db.prepare(
      'UPDATE player_gongfa_equipment SET gongfa_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE player_id = ? AND slot = ?'
    ).run(playerId, slot);
  }
};

// 玩家游戏数据操作
const gameDataStorage = {
  // 获取玩家游戏数据
  getPlayerGameData(playerId) {
    const row = db.prepare(
      'SELECT player_data FROM player_game_data WHERE player_id = ?'
    ).get(playerId);
    
    if (row && row.player_data) {
      try {
        return JSON.parse(row.player_data);
      } catch (e) {
        console.error('解析玩家数据失败:', e.message);
        return null;
      }
    }
    return null;
  },

  // 保存玩家游戏数据
  savePlayerGameData(playerId, gameData) {
    const jsonData = JSON.stringify(gameData);
    
    db.prepare(
      `INSERT OR REPLACE INTO player_game_data (player_id, player_data, updated_at) 
       VALUES (?, ?, CURRENT_TIMESTAMP)`
    ).run(playerId, jsonData);
  }
};

// 境界副本进度操作
const realmDungeonStorage = {
  // 获取玩家副本进度
  getProgress(playerId) {
    const rows = db.prepare(
      'SELECT realm, highest_floor, cleared FROM realm_dungeon_progress WHERE player_id = ?'
    ).all(playerId);
    
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
  updateProgress(playerId, realm, highestFloor, cleared) {
    db.prepare(
      `INSERT OR REPLACE INTO realm_dungeon_progress (player_id, realm, highest_floor, cleared, updated_at) 
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`
    ).run(playerId, realm, highestFloor, cleared ? 1 : 0);
  }
};

// 经脉穴位存储 (SQLite版本)
const meridianStorageSQLite = {
  // 确保经脉表存在
  ensureTables() {
    try {
      db.prepare(`SELECT 1 FROM player_meridian LIMIT 1`).get();
    } catch (e) {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS player_meridian (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          player_id TEXT NOT NULL UNIQUE,
          meridians_data TEXT DEFAULT '{}',
          total_spirit_bonus INTEGER DEFAULT 0,
          total_atk_bonus INTEGER DEFAULT 0,
          total_def_bonus INTEGER DEFAULT 0,
          total_hp_bonus INTEGER DEFAULT 0,
          total_crit_bonus REAL DEFAULT 0,
          total_dodge_bonus REAL DEFAULT 0,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      
      db.prepare(`
        CREATE TABLE IF NOT EXISTS meridian_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          player_id TEXT NOT NULL,
          action TEXT NOT NULL,
          meridian_id TEXT,
          acupoint_id TEXT,
          result TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
    }
  },

  // 获取玩家经脉数据
  getPlayerMeridian(playerId) {
    this.ensureTables();
    const row = db.prepare('SELECT * FROM player_meridian WHERE player_id = ?').get(playerId);
    
    if (!row) {
      return this.initPlayerMeridian(playerId);
    }
    
    if (row.meridians_data) {
      try {
        row.meridiansData = JSON.parse(row.meridians_data);
      } catch (e) {
        row.meridiansData = {};
      }
    }
    
    return row;
  },

  // 初始化玩家经脉数据
  initPlayerMeridian(playerId) {
    this.ensureTables();
    db.prepare(
      `INSERT OR REPLACE INTO player_meridian (player_id, meridians_data, total_spirit_bonus, 
       total_atk_bonus, total_def_bonus, total_hp_bonus, total_crit_bonus, total_dodge_bonus) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(playerId, '{}', 0, 0, 0, 0, 0, 0);
    
    return this.getPlayerMeridian(playerId);
  },

  // 保存玩家经脉数据
  savePlayerMeridian(playerId, data) {
    this.ensureTables();
    const jsonData = JSON.stringify(data.meridiansData || {});
    
    db.prepare(
      `UPDATE player_meridian 
       SET meridians_data = ?, 
           total_spirit_bonus = ?, 
           total_atk_bonus = ?, 
           total_def_bonus = ?, 
           total_hp_bonus = ?,
           total_crit_bonus = ?,
           total_dodge_bonus = ?,
           updated_at = CURRENT_TIMESTAMP 
       WHERE player_id = ?`
    ).run(
      jsonData,
      data.totalSpiritBonus || 0,
      data.totalAtkBonus || 0,
      data.totalDefBonus || 0,
      data.totalHpBonus || 0,
      data.totalCritBonus || 0,
      data.totalDodgeBonus || 0,
      playerId
    );
  },

  // 激活穴位
  activateAcupoint(playerId, meridianId, acupointId, acupointData) {
    const meridianData = this.getPlayerMeridian(playerId);
    const meridians = meridianData.meridiansData || {};
    
    if (!meridians[meridianId]) {
      meridians[meridianId] = {
        id: meridianId,
        acupoints: []
      };
    }
    
    meridians[meridianId].acupoints.push({
      id: acupointId,
      activatedAt: Date.now(),
      ...acupointData
    });
    
    this.savePlayerMeridian(playerId, { meridiansData: meridians });
    
    return meridians;
  },

  // 检查穴位是否已激活
  isAcupointActivated(playerId, acupointId) {
    const meridianData = this.getPlayerMeridian(playerId);
    const meridians = meridianData.meridiansData || {};
    
    for (const meridian of Object.values(meridians)) {
      if (meridian.acupoints && meridian.acupoints.some(a => a.id === acupointId)) {
        return true;
      }
    }
    
    return false;
  },

  // 获取所有已激活穴位
  getAllActivatedAcupoints(playerId) {
    const meridianData = this.getPlayerMeridian(playerId);
    const meridians = meridianData.meridiansData || {};
    
    const allAcupoints = [];
    for (const meridian of Object.values(meridians)) {
      if (meridian.acupoints) {
        allAcupoints.push(...meridian.acupoints);
      }
    }
    
    return allAcupoints;
  },

  // 获取穴位总数
  getTotalAcupointsCount(playerId) {
    return this.getAllActivatedAcupoints(playerId).length;
  },

  // 获取经脉加成
  getMeridianBonuses(playerId) {
    const meridianData = this.getPlayerMeridian(playerId);
    
    return {
      totalSpiritBonus: meridianData.total_spirit_bonus || 0,
      totalAtkBonus: meridianData.total_atk_bonus || 0,
      totalDefBonus: meridianData.total_def_bonus || 0,
      totalHpBonus: meridianData.total_hp_bonus || 0,
      totalCritBonus: meridianData.total_crit_bonus || 0,
      totalDodgeBonus: meridianData.total_dodge_bonus || 0
    };
  },

  // 计算并更新经脉加成
  calculateAndUpdateBonuses(playerId, acupoints, effects) {
    const bonuses = {
      totalSpiritBonus: effects.spirit || 0,
      totalAtkBonus: (effects.atk || 0) + (effects.atk_percent ? Math.floor(effects.atk_percent * 100) : 0),
      totalDefBonus: (effects.def || 0) + (effects.def_percent ? Math.floor(effects.def_percent * 100) : 0),
      totalHpBonus: (effects.hp || 0) + (effects.hp_percent ? Math.floor(effects.hp_percent * 200) : 0),
      totalCritBonus: effects.crit || 0,
      totalDodgeBonus: effects.dodge || 0,
      meridiansData: {}
    };
    
    const meridianData = this.getPlayerMeridian(playerId);
    const meridians = meridianData.meridiansData || {};
    
    for (const [meridianId, meridian] of Object.entries(meridians)) {
      bonuses.meridiansData[meridianId] = { ...meridian };
    }
    
    this.savePlayerMeridian(playerId, bonuses);
    
    return bonuses;
  },

  // 添加经脉操作日志
  addMeridianLog(playerId, action, meridianId, acupointId, result) {
    this.ensureTables();
    db.prepare(
      `INSERT INTO meridian_log (player_id, action, meridian_id, acupoint_id, result, created_at) 
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    ).run(playerId, action, meridianId, acupointId, JSON.stringify(result));
  },

  // 获取经脉日志
  getMeridianLog(playerId, limit = 10) {
    this.ensureTables();
    return db.prepare(
      `SELECT * FROM meridian_log WHERE player_id = ? ORDER BY created_at DESC LIMIT ?`
    ).all(playerId, limit);
  }
};

module.exports = {
  playerStorage,
  gongfaStorage,
  equipmentStorage,
  gameDataStorage,
  realmDungeonStorage,
  meridianStorage: meridianStorageSQLite
};

// ============================================================
// CacheBreaker 缓存优化 (添加于 2026-03-10)
// 防止缓存雪崩：single-flight + 概率性提前过期
// ============================================================

// 简单内存缓存实现 (用于演示)
class SimpleCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }
  
  // 概率性提前过期 (10% 概率在 TTL 到达前刷新)
  getWithProbabilisticExpiry(key, ttl, fetchFn) {
    const now = Date.now();
    const cached = this.cache.get(key);
    
    // 有缓存且随机数 > 0.1 (90% 概率直接返回)
    if (cached && cached.expiresAt > now && Math.random() > 0.1) {
      return Promise.resolve(cached.value);
    }
    
    // 检查是否已有请求在进行 (single-flight)
    if (this.promises && this.promises.has(key)) {
      return this.promises.get(key);
    }
    
    // 创建新请求
    const promise = (async () => {
      try {
        const value = await fetchFn();
        this.cache.set(key, {
          value,
          expiresAt: now + ttl
        });
        return value;
      } finally {
        if (this.promises) this.promises.delete(key);
      }
    })();
    
    if (!this.promises) this.promises = new Map();
    this.promises.set(key, promise);
    
    return promise;
  }
  
  // 清理过期缓存
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }
}

// 全局缓存实例
global.gameCache = new SimpleCache();

// 定期清理过期缓存 (每分钟)
setInterval(() => {
  if (global.gameCache) {
    global.gameCache.cleanup();
  }
}, 60000);

console.log('✅ CacheBreaker 缓存优化已加载');
