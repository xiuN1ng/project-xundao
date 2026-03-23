/**
 * 宝石系统 - 数据存储层
 */

const { pool } = require('./database');

// 宝石定义
const GEM_TYPES = {
  attack: { id: 'attack', name: '攻击宝石', icon: '⚔️', color: '#ff4444', stat: 'atk', description: '增加攻击力' },
  defense: { id: 'defense', name: '防御宝石', icon: '🛡️', color: '#4488ff', stat: 'def', description: '增加防御力' },
  life: { id: 'life', name: '生命宝石', icon: '❤️', color: '#44ff44', stat: 'hp', description: '增加生命值' },
  speed: { id: 'speed', name: '敏捷宝石', icon: '⚡', color: '#ffff44', stat: 'speed', description: '增加速度' },
  critical: { id: 'critical', name: '暴击宝石', icon: '🔥', color: '#ff8800', stat: 'crit', description: '增加暴击率' },
  dodge: { id: 'dodge', name: '闪避宝石', icon: '💨', color: '#00ffff', stat: 'dodge', description: '增加闪避率' }
};

// 宝石等级定义
const GEM_LEVELS = {
  1: { name: '一级', multiplier: 1, exp: 0 },
  2: { name: '二级', multiplier: 2, exp: 100 },
  3: { name: '三级', multiplier: 3, exp: 300 },
  4: { name: '四级', multiplier: 4, exp: 700 },
  5: { name: '五级', multiplier: 5, exp: 1500 },
  6: { name: '六级', multiplier: 6, exp: 3000 },
  7: { name: '七级', multiplier: 7, exp: 6000 },
  8: { name: '八级', multiplier: 8, exp: 12000 },
  9: { name: '九级', multiplier: 9, exp: 25000 },
  10: { name: '十级', multiplier: 10, exp: 50000 }
};

// 宝石存储
const gemStorage = {
  // 获取所有宝石类型定义
  getGemTypes() {
    return GEM_TYPES;
  },

  // 获取单个宝石类型
  getGemType(typeId) {
    return GEM_TYPES[typeId];
  },

  // 获取宝石等级信息
  getGemLevel(level) {
    return GEM_LEVELS[level];
  },

  // 获取所有等级信息
  getAllGemLevels() {
    return GEM_LEVELS;
  },

  // 获取所有宝石定义
  getAllGemDefinitions() {
    const gems = [];
    for (const [typeId, typeInfo] of Object.entries(GEM_TYPES)) {
      for (const [level, levelInfo] of Object.entries(GEM_LEVELS)) {
        gems.push({
          id: `${typeId}_${level}`,
          type: typeId,
          level: parseInt(level),
          name: `${typeInfo.name}（${levelInfo.name}）`,
          icon: typeInfo.icon,
          color: typeInfo.color,
          stat: typeInfo.stat,
          multiplier: levelInfo.multiplier,
          description: typeInfo.description
        });
      }
    }
    return gems;
  }
};

// 玩家宝石存储
const playerGemStorage = {
  // 获取玩家的宝石列表
  async getPlayerGems(playerId) {
    if (!pool) return [];
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM player_gems WHERE player_id = ? ORDER BY type, level DESC',
        [playerId]
      );
      return rows;
    } catch (error) {
      console.error('获取玩家宝石失败:', error.message);
      return [];
    }
  },

  // 获取玩家的单个宝石
  async getPlayerGemById(playerId, gemId) {
    if (!pool) return null;
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM player_gems WHERE id = ? AND player_id = ?',
        [gemId, playerId]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('获取玩家宝石失败:', error.message);
      return null;
    }
  },

  // 添加宝石给玩家
  async addGem(playerId, gemType, level = 1) {
    if (!pool) return null;
    try {
      const result = await pool.execute(
        'INSERT INTO player_gems (player_id, type, level) VALUES (?, ?, ?)',
        [playerId, gemType, level]
      );
      return { id: result[0].insertId, player_id: playerId, type: gemType, level };
    } catch (error) {
      console.error('添加宝石失败:', error.message);
      return null;
    }
  },

  // 批量添加宝石
  async addGems(playerId, gems) {
    if (!pool || !gems.length) return [];
    const results = [];
    const connection = await pool.getConnection();
    try {
      for (const gem of gems) {
        const [result] = await connection.execute(
          'INSERT INTO player_gems (player_id, type, level) VALUES (?, ?, ?)',
          [playerId, gem.type, gem.level || 1]
        );
        results.push({ id: result.insertId, player_id: playerId, type: gem.type, level: gem.level || 1 });
      }
      return results;
    } catch (error) {
      console.error('批量添加宝石失败:', error.message);
      return [];
    } finally {
      connection.release();
    }
  },

  // 删除玩家的宝石
  async deleteGem(playerId, gemId) {
    if (!pool) return false;
    try {
      const [result] = await pool.execute(
        'DELETE FROM player_gems WHERE id = ? AND player_id = ?',
        [gemId, playerId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('删除宝石失败:', error.message);
      return false;
    }
  },

  // 批量删除宝石
  async deleteGems(playerId, gemIds) {
    if (!pool || !gemIds.length) return 0;
    try {
      const placeholders = gemIds.map(() => '?').join(',');
      const [result] = await pool.execute(
        `DELETE FROM player_gems WHERE id IN (${placeholders}) AND player_id = ?`,
        [...gemIds, playerId]
      );
      return result.affectedRows;
    } catch (error) {
      console.error('批量删除宝石失败:', error.message);
      return 0;
    }
  },

  // 更新宝石等级
  async updateGemLevel(playerId, gemId, newLevel) {
    if (!pool) return false;
    try {
      const [result] = await pool.execute(
        'UPDATE player_gems SET level = ? WHERE id = ? AND player_id = ?',
        [newLevel, gemId, playerId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('更新宝石等级失败:', error.message);
      return false;
    }
  },

  // 统计玩家某种类型的宝石数量
  async countGemsByType(playerId, gemType) {
    if (!pool) return 0;
    try {
      const [rows] = await pool.execute(
        'SELECT COUNT(*) as count FROM player_gems WHERE player_id = ? AND type = ?',
        [playerId, gemType]
      );
      return rows[0].count;
    } catch (error) {
      console.error('统计宝石数量失败:', error.message);
      return 0;
    }
  },

  // 统计玩家某种类型某等级的宝石数量
  async countGemsByTypeAndLevel(playerId, gemType, level) {
    if (!pool) return 0;
    try {
      const [rows] = await pool.execute(
        'SELECT COUNT(*) as count FROM player_gems WHERE player_id = ? AND type = ? AND level = ?',
        [playerId, gemType, level]
      );
      return rows[0].count;
    } catch (error) {
      console.error('统计宝石数量失败:', error.message);
      return 0;
    }
  },

  // 查找可升级的宝石（用于合成）
  async findUpgradeableGems(playerId, gemType, level) {
    if (!pool) return [];
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM player_gems WHERE player_id = ? AND type = ? AND level = ? ORDER BY id LIMIT 3',
        [playerId, gemType, level]
      );
      return rows;
    } catch (error) {
      console.error('查找可升级宝石失败:', error.message);
      return [];
    }
  }
};

// 装备镶嵌存储
const equipmentGemStorage = {
  // 获取装备的镶嵌信息
  async getEquipmentGems(playerId, equipmentId) {
    if (!pool) return [];
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM equipment_gems WHERE player_id = ? AND equipment_id = ? ORDER BY slot',
        [playerId, equipmentId]
      );
      return rows;
    } catch (error) {
      console.error('获取装备镶嵌信息失败:', error.message);
      return [];
    }
  },

  // 镶嵌宝石
  async embedGem(playerId, equipmentId, slot, gemId) {
    if (!pool) return false;
    try {
      // 检查该槽位是否已有宝石
      const [existing] = await pool.execute(
        'SELECT * FROM equipment_gems WHERE player_id = ? AND equipment_id = ? AND slot = ?',
        [playerId, equipmentId, slot]
      );

      if (existing.length > 0) {
        // 槽位已有宝石，先取下
        await pool.execute(
          'DELETE FROM equipment_gems WHERE player_id = ? AND equipment_id = ? AND slot = ?',
          [playerId, equipmentId, slot]
        );
      }

      // 镶嵌新宝石
      await pool.execute(
        'INSERT INTO equipment_gems (player_id, equipment_id, slot, gem_id) VALUES (?, ?, ?, ?)',
        [playerId, equipmentId, slot, gemId]
      );
      return true;
    } catch (error) {
      console.error('镶嵌宝石失败:', error.message);
      return false;
    }
  },

  // 取下宝石
  async removeGem(playerId, equipmentId, slot) {
    if (!pool) return null;
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM equipment_gems WHERE player_id = ? AND equipment_id = ? AND slot = ?',
        [playerId, equipmentId, slot]
      );

      if (rows.length === 0) return null;

      await pool.execute(
        'DELETE FROM equipment_gems WHERE player_id = ? AND equipment_id = ? AND slot = ?',
        [playerId, equipmentId, slot]
      );

      return rows[0].gem_id;
    } catch (error) {
      console.error('取下宝石失败:', error.message);
      return null;
    }
  },

  // 清除装备所有镶嵌
  async clearEquipmentGems(playerId, equipmentId) {
    if (!pool) return [];
    try {
      const [rows] = await pool.execute(
        'SELECT gem_id FROM equipment_gems WHERE player_id = ? AND equipment_id = ?',
        [playerId, equipmentId]
      );

      await pool.execute(
        'DELETE FROM equipment_gems WHERE player_id = ? AND equipment_id = ?',
        [playerId, equipmentId]
      );

      return rows.map(r => r.gem_id);
    } catch (error) {
      console.error('清除装备镶嵌失败:', error.message);
      return [];
    }
  },

  // 获取某装备已镶嵌的宝石类型
  async getEmbeddedGemTypes(playerId, equipmentId) {
    if (!pool) return [];
    try {
      const [rows] = await pool.execute(
        'SELECT pg.type FROM equipment_gems eg JOIN player_gems pg ON eg.gem_id = pg.id WHERE eg.player_id = ? AND eg.equipment_id = ?',
        [playerId, equipmentId]
      );
      return rows.map(r => r.type);
    } catch (error) {
      console.error('获取已镶嵌宝石类型失败:', error.message);
      return [];
    }
  }
};

// 初始化宝石表
async function initGemTables() {
  if (!pool) return;
  const connection = await pool.getConnection();
  
  try {
    // 玩家宝石表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS player_gems (
        id INT PRIMARY KEY AUTO_INCREMENT,
        player_id INT NOT NULL,
        type VARCHAR(20) NOT NULL,
        level INT DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_player_type (player_id, type),
        INDEX idx_player_id (player_id)
      )
    `);

    // 装备镶嵌表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS equipment_gems (
        id INT PRIMARY KEY AUTO_INCREMENT,
        player_id INT NOT NULL,
        equipment_id INT NOT NULL,
        slot INT NOT NULL,
        gem_id INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_equipment_slot (player_id, equipment_id, slot),
        INDEX idx_player_equipment (player_id, equipment_id)
      )
    `);

    console.log('✅ 宝石系统数据库表初始化完成');
  } catch (error) {
    console.error('❌ 宝石系统数据库表初始化失败:', error.message);
  } finally {
    connection.release();
  }
}

// 种子数据 - 初始宝石
async function seedInitialGems() {
  if (!pool) return;
  const connection = await pool.getConnection();
  
  try {
    // 检查是否已有种子数据
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM player_gems');
    if (rows[0].count > 0) return;

    // 初始给玩家一些宝石（用于测试）
    // 实际游戏中可能通过任务、商城等途径获得
    console.log('✅ 宝石种子数据准备完成');
  } catch (error) {
    console.error('宝石种子数据检查失败:', error.message);
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  gemStorage,
  playerGemStorage,
  equipmentGemStorage,
  GEM_TYPES,
  GEM_LEVELS,
  initGemTables,
  seedInitialGems
};
