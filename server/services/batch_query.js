/**
 * 批量查询优化模块
 * 提供批量查询、数据预加载、N+1查询优化等功能
 */

// 懒加载数据库连接，避免循环依赖
let _db = null;
function getDb() {
  if (_db) return _db;
  
  try {
    // 尝试从server.js导入db实例
    const server = require('../server');
    _db = server.db || server;
  } catch {
    // 如果导入失败，使用独立的数据库连接
    const Database = require('better-sqlite3');
    const path = require('path');
    const dbPath = path.join(__dirname, '..', 'data', 'game.db');
    _db = new Database(dbPath);
  }
  return _db;
}

// 简单的内存缓存
const cache = {
  data: new Map(),
  timestamps: new Map(),
  
  // 缓存配置
  defaultTTL: 30000, // 默认30秒过期
  
  set(key, value, ttl = this.defaultTTL) {
    this.data.set(key, value);
    this.timestamps.set(key, Date.now() + ttl);
  },
  
  get(key) {
    const expiry = this.timestamps.get(key);
    if (!expiry) return null;
    if (Date.now() > expiry) {
      this.data.delete(key);
      this.timestamps.delete(key);
      return null;
    }
    return this.data.get(key);
  },
  
  has(key) {
    return this.get(key) !== null;
  },
  
  delete(key) {
    this.data.delete(key);
    this.timestamps.delete(key);
  },
  
  clear() {
    this.data.clear();
    this.timestamps.clear();
  }
};

/**
 * 批量查询工具
 */
const batchQuery = {
  /**
   * 批量获取玩家数据
   * @param {number[]} playerIds - 玩家ID数组
   * @returns {Map<number, Object>} playerId -> player data
   */
  async getPlayersByIds(playerIds) {
    if (!playerIds || playerIds.length === 0) return new Map();
    
    // 去重
    const uniqueIds = [...new Set(playerIds)];
    
    // 构建IN查询
    const placeholders = uniqueIds.map(() => '?').join(',');
    const rows = getDb().prepare(
      `SELECT * FROM player WHERE id IN (${placeholders})`
    ).all(...uniqueIds);
    
    const result = new Map();
    rows.forEach(row => result.set(row.id, row));
    return result;
  },
  
  /**
   * 批量获取玩家游戏数据
   * @param {number[]} playerIds - 玩家ID数组
   * @returns {Map<number, Object>} playerId -> game data
   */
  async getPlayersGameData(playerIds) {
    if (!playerIds || playerIds.length === 0) return new Map();
    
    const uniqueIds = [...new Set(playerIds)];
    const placeholders = uniqueIds.map(() => '?').join(',');
    
    const rows = getDb().prepare(
      `SELECT player_id, player_data FROM player_game_data WHERE player_id IN (${placeholders})`
    ).all(...uniqueIds);
    
    const result = new Map();
    rows.forEach(row => {
      try {
        result.set(row.player_id, row.player_data ? JSON.parse(row.player_data) : null);
      } catch (e) {
        result.set(row.player_id, null);
      }
    });
    return result;
  },
  
  /**
   * 批量获取宗门数据（包含建筑、弟子、技能）
   * @param {number[]} playerIds - 玩家ID数组
   * @returns {Map<number, Object>} playerId -> sect data with relations
   */
  async getSectsWithRelations(playerIds) {
    if (!playerIds || playerIds.length === 0) return new Map();
    
    const uniqueIds = [...new Set(playerIds)];
    const placeholders = uniqueIds.map(() => '?').join(',');
    
    // 1. 批量获取宗门基本信息
    const sectRows = getDb().prepare(
      `SELECT * FROM sect WHERE player_id IN (${placeholders})`
    ).all(...uniqueIds);
    
    // 2. 批量获取建筑数据
    const buildingRows = getDb().prepare(
      `SELECT * FROM sect_buildings WHERE player_id IN (${placeholders})`
    ).all(...uniqueIds);
    
    // 3. 批量获取弟子数据
    const discipleRows = getDb().prepare(
      `SELECT * FROM sect_disciples WHERE player_id IN (${placeholders})`
    ).all(...uniqueIds);
    
    // 4. 批量获取技能数据
    const techRows = getDb().prepare(
      `SELECT * FROM sect_techs WHERE player_id IN (${placeholders})`
    ).all(...uniqueIds);
    
    // 构建玩家ID到数据的映射
    const result = new Map();
    
    // 初始化结果Map
    sectRows.forEach(sect => {
      result.set(sect.player_id, {
        id: sect.id,
        player_id: sect.player_id,
        sect_type: sect.sect_type,
        sect_name: sect.name || sect.sect_name,
        sect_level: sect.level || sect.sect_level || 1,
        sect_exp: sect.exp || sect.sect_exp || 0,
        contribution: sect.contribution || 0,
        buildings: {},
        disciples: [],
        techs: [],
        created_at: sect.created_at
      });
    });
    
    // 填充建筑数据
    buildingRows.forEach(b => {
      const sect = result.get(b.player_id);
      if (sect) {
        sect.buildings[b.building_id] = b.level;
      }
    });
    
    // 填充弟子数据
    discipleRows.forEach(d => {
      const sect = result.get(d.player_id);
      if (sect) {
        sect.disciples.push({
          disciple_id: d.disciple_id || `disciple_${d.id}`,
          name: d.disciple_name || d.name || '未知弟子',
          class: d.disciple_class,
          level: d.disciple_level || d.level || 1,
          cultivation: d.cultivation || 0,
          talent: d.talent || 1,
          loyalty: d.loyalty ?? 50,
          created_at: d.created_at
        });
      }
    });
    
    // 填充技能数据
    techRows.forEach(t => {
      const sect = result.get(t.player_id);
      if (sect) {
        sect.techs.push(t.tech_id);
      }
    });
    
    return result;
  },
  
  /**
   * 批量获取活动进度
   * @param {number[]} playerIds - 玩家ID数组
   * @param {string} activityId - 活动ID
   * @returns {Map<number, Object>} playerId -> activity progress
   */
  async getActivitiesProgress(playerIds, activityId = null) {
    if (!playerIds || playerIds.length === 0) return new Map();
    
    const uniqueIds = [...new Set(playerIds)];
    const placeholders = uniqueIds.map(() => '?').join(',');
    
    let sql = `SELECT * FROM activity_progress WHERE player_id IN (${placeholders})`;
    const params = [...uniqueIds];
    
    if (activityId) {
      sql += ' AND activity_id = ?';
      params.push(activityId);
    }
    
    const rows = getDb().prepare(sql).all(...params);
    
    const result = new Map();
    rows.forEach(row => {
      result.set(row.player_id, {
        id: row.id,
        player_id: row.player_id,
        activity_id: row.activity_id,
        progress: row.progress,
        claimed: !!row.claimed,
        updated_at: row.updated_at
      });
    });
    
    return result;
  },
  
  /**
   * 批量获取世界BOSS伤害记录
   * @param {string} bossId - BOSS ID
   * @param {number[]} playerIds - 玩家ID数组（可选）
   * @param {number} limit - 返回数量限制
   * @returns {Array} 伤害记录数组
   */
  async getBossDamageRecords(bossId, playerIds = null, limit = 100) {
    let sql, params;
    
    if (playerIds && playerIds.length > 0) {
      const placeholders = playerIds.map(() => '?').join(',');
      sql = `SELECT * FROM world_boss_damage WHERE boss_id = ? AND player_id IN (${placeholders}) ORDER BY damage DESC LIMIT ?`;
      params = [bossId, ...playerIds, limit];
    } else {
      sql = `SELECT * FROM world_boss_damage WHERE boss_id = ? ORDER BY damage DESC LIMIT ?`;
      params = [bossId, limit];
    }
    
    const rows = getDb().prepare(sql).all(...params);
    return rows.map(row => ({
      id: row.id,
      boss_id: row.boss_id,
      player_id: row.player_id,
      damage: row.damage,
      last_attack: row.last_attack
    }));
  },
  
  /**
   * 批量获取装备数据
   * @param {number[]} playerIds - 玩家ID数组
   * @param {Object} filters - 过滤条件
   * @returns {Map<number, Array>} playerId -> equipment array
   */
  async getPlayerEquipment(playerIds, filters = {}) {
    if (!playerIds || playerIds.length === 0) return new Map();
    
    const uniqueIds = [...new Set(playerIds)];
    const placeholders = uniqueIds.map(() => '?').join(',');
    
    let sql = `SELECT pe.*, er.name, er.type, er.rarity, er.icon, er.description, er.base_stats 
               FROM player_equipment pe 
               JOIN equipment_recipes er ON pe.equipment_id = er.id 
               WHERE pe.player_id IN (${placeholders})`;
    const params = [...uniqueIds];
    
    if (filters.slot) {
      sql += ' AND pe.slot = ?';
      params.push(filters.slot);
    }
    if (filters.is_equipped !== undefined) {
      sql += ' AND pe.is_equipped = ?';
      params.push(filters.is_equipped ? 1 : 0);
    }
    sql += ' ORDER BY pe.obtained_at DESC';
    
    const rows = getDb().prepare(sql).all(...params);
    
    // 按玩家分组
    const result = new Map();
    uniqueIds.forEach(id => result.set(id, []));
    
    rows.forEach(row => {
      const list = result.get(row.player_id);
      if (list) {
        list.push({
          ...row,
          base_stats: row.base_stats ? JSON.parse(row.base_stats) : {}
        });
      }
    });
    
    return result;
  },
  
  /**
   * 批量获取玩家材料
   * @param {number[]} playerIds - 玩家ID数组
   * @param {string} materialType - 材料类型过滤（可选）
   * @returns {Map<number, Object>} playerId -> materials map
   */
  async getPlayerMaterials(playerIds, materialType = null) {
    if (!playerIds || playerIds.length === 0) return new Map();
    
    const uniqueIds = [...new Set(playerIds)];
    const placeholders = uniqueIds.map(() => '?').join(',');
    
    let sql = `SELECT pm.*, am.name, am.type, am.rarity, am.icon, am.description 
               FROM player_materials pm 
               JOIN alchemy_materials am ON pm.material_id = am.id 
               WHERE pm.player_id IN (${placeholders})`;
    const params = [...uniqueIds];
    
    if (materialType) {
      sql += ' AND am.type = ?';
      params.push(materialType);
    }
    
    const rows = getDb().prepare(sql).all(...params);
    
    // 按玩家分组
    const result = new Map();
    uniqueIds.forEach(id => result.set(id, {}));
    
    rows.forEach(row => {
      const materials = result.get(row.player_id);
      if (materials) {
        materials[row.material_id] = {
          quantity: row.quantity,
          name: row.name,
          type: row.type,
          rarity: row.rarity,
          icon: row.icon,
          description: row.description
        };
      }
    });
    
    return result;
  },
  
  /**
   * 批量获取玩家境界副本进度
   * @param {number[]} playerIds - 玩家ID数组
   * @returns {Map<number, Object>} playerId -> progress map
   */
  async getRealmDungeonProgress(playerIds) {
    if (!playerIds || playerIds.length === 0) return new Map();
    
    try {
      const uniqueIds = [...new Set(playerIds)];
      const placeholders = uniqueIds.map(() => '?').join(',');
      
      const rows = getDb().prepare(
        `SELECT * FROM realm_dungeon_progress WHERE player_id IN (${placeholders})`
      ).all(...uniqueIds);
      
      const result = new Map();
      uniqueIds.forEach(id => result.set(id, {}));
      
      rows.forEach(row => {
        const progress = result.get(row.player_id);
        if (progress) {
          progress[row.realm] = {
            highestFloor: row.highest_floor,
            cleared: !!row.cleared
          };
        }
      });
      
      return result;
    } catch (e) {
      console.warn('getRealmDungeonProgress table not available:', e.message);
      return new Map();
    }
  },
  
  /**
   * 批量获取每日副本进度
   * @param {number[]} playerIds - 玩家ID数组
   * @param {string} date - 日期 (YYYY-MM-DD格式)
   * @returns {Map<number, Object>} playerId -> dungeon progress map
   */
  async getDailyDungeonProgress(playerIds, date = null) {
    if (!playerIds || playerIds.length === 0) return new Map();
    
    const uniqueIds = [...new Set(playerIds)];
    const placeholders = uniqueIds.map(() => '?').join(',');
    
    let sql = `SELECT * FROM daily_dungeon_progress WHERE player_id IN (${placeholders})`;
    const params = [...uniqueIds];
    
    if (date) {
      sql += ' AND progress_date = ?';
      params.push(date);
    }
    
    const rows = getDb().prepare(sql).all(...params);
    
    const result = new Map();
    uniqueIds.forEach(id => result.set(id, {}));
    
    rows.forEach(row => {
      const progress = result.get(row.player_id);
      if (progress) {
        progress[row.dungeon_id] = {
          completed: !!row.completed,
          bestTime: row.best_time,
          completedAt: row.completed_at
        };
      }
    });
    
    return result;
  }
};

/**
 * 数据预加载器 - 解决N+1查询问题
 */
const dataLoader = {
  /**
   * 预加载并关联数据
   * @param {string} type - 数据类型 (sect, player, activity等)
   * @param {number[]} ids - ID数组
   * @returns {Promise<Map>} id -> data
   */
  async preload(type, ids) {
    if (!ids || ids.length === 0) return new Map();
    
    // 使用缓存
    const cacheKey = `${type}:${ids.sort().join(',')}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    
    let data;
    switch (type) {
      case 'sect':
        data = await batchQuery.getSectsWithRelations(ids);
        break;
      case 'player':
        data = await batchQuery.getPlayersByIds(ids);
        break;
      case 'playerGameData':
        data = await batchQuery.getPlayersGameData(ids);
        break;
      case 'equipment':
        data = await batchQuery.getPlayerEquipment(ids);
        break;
      case 'materials':
        data = await batchQuery.getPlayerMaterials(ids);
        break;
      case 'realmProgress':
        data = await batchQuery.getRealmDungeonProgress(ids);
        break;
      case 'dailyProgress':
        data = await batchQuery.getDailyDungeonProgress(ids);
        break;
      default:
        data = new Map();
    }
    
    // 缓存结果
    cache.set(cacheKey, data, 10000); // 10秒缓存
    return data;
  },
  
  /**
   * 清除缓存
   */
  clearCache(type = null) {
    if (type) {
      // 清除指定类型的缓存
      for (const key of cache.data.keys()) {
        if (key.startsWith(`${type}:`)) {
          cache.delete(key);
        }
      }
    } else {
      cache.clear();
    }
  }
};

/**
 * 查询优化器 - 提供单次查询的优化版本
 */
const queryOptimizer = {
  /**
   * 优化获取单个宗门信息 - 使用JOIN减少查询次数
   * @param {number} playerId - 玩家ID
   * @returns {Object|null} 宗门数据
   */
  async getSectOptimized(playerId) {
    const cacheKey = `sect:${playerId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    
    // 使用批量查询但只获取单个玩家
    const sects = await batchQuery.getSectsWithRelations([playerId]);
    const sect = sects.get(playerId);
    
    if (sect) {
      cache.set(cacheKey, sect, 5000); // 5秒缓存
    }
    return sect || null;
  },
  
  /**
   * 优化获取玩家数据 - 包含游戏数据
   * @param {number} playerId - 玩家ID
   * @returns {Object} 玩家数据
   */
  async getPlayerWithGameData(playerId) {
    const cacheKey = `playerFull:${playerId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    
    // 批量获取玩家和游戏数据
    const [playerRows, gameDataRows] = await Promise.all([
      batchQuery.getPlayersByIds([playerId]),
      batchQuery.getPlayersGameData([playerId])
    ]);
    
    const player = playerRows.get(playerId);
    const gameData = gameDataRows.get(playerId);
    
    const result = {
      ...player,
      gameData
    };
    
    cache.set(cacheKey, result, 5000);
    return result;
  },
  
  /**
   * 批量更新玩家灵石（减少连接数）
   * @param {Array} updates - 更新数组 [{playerId, amount}, ...]
   * @returns {number} 影响的行数
   */
  async batchUpdateSpiritStones(updates) {
    if (!updates || updates.length === 0) return 0;
    
    let affectedRows = 0;
    
    // 使用事务批量更新
    const stmt = getDb().prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?');
    
    const transaction = getDb().transaction((items) => {
      for (const { playerId, amount } of items) {
        const result = stmt.run(amount, playerId);
        affectedRows += result.changes;
      }
    });
    
    transaction(updates);
    
    // 清除相关缓存
    updates.forEach(({ playerId }) => {
      cache.delete(`playerFull:${playerId}`);
      cache.delete(`sect:${playerId}`);
    });
    
    return affectedRows;
  }
};

module.exports = {
  batchQuery,
  dataLoader,
  queryOptimizer,
  cache
};
