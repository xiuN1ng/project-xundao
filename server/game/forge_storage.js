/**
 * 炼器系统 - 数据存储层
 */

const { pool } = require('./database');

// 炼器配方存储
const forgeStorage = {
  // 获取所有配方
  async getRecipes(filters = {}) {
    let sql = 'SELECT * FROM equipment_recipes';
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
    if (filters.level_req !== undefined) {
      conditions.push('level_req <= ?');
      params.push(filters.level_req);
    }
    if (filters.realm_req !== undefined) {
      conditions.push('realm_req <= ?');
      params.push(filters.realm_req);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY rarity DESC, level_req ASC';
    
    const [rows] = await pool.execute(sql, params);
    return rows.map(row => ({
      ...row,
      base_stats: row.base_stats ? JSON.parse(row.base_stats) : {},
      materials: row.materials ? JSON.parse(row.materials) : {}
    }));
  },

  // 获取单个配方
  async getRecipeById(recipeId) {
    const [rows] = await pool.execute('SELECT * FROM equipment_recipes WHERE id = ?', [recipeId]);
    if (!rows[0]) return null;
    return {
      ...rows[0],
      base_stats: rows[0].base_stats ? JSON.parse(rows[0].base_stats) : {},
      materials: rows[0].materials ? JSON.parse(rows[0].materials) : {}
    };
  },

  // 获取强化材料列表
  async getEnhancementMaterials(filters = {}) {
    let sql = 'SELECT * FROM enhancement_materials';
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
    if (filters.level_req !== undefined) {
      conditions.push('level_req <= ?');
      params.push(filters.level_req);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY rarity DESC, level_req ASC';
    
    const [rows] = await pool.execute(sql, params);
    return rows.map(row => ({
      ...row,
      stats_bonus: row.stats_bonus ? JSON.parse(row.stats_bonus) : {}
    }));
  },

  // 获取单个强化材料
  async getMaterialById(materialId) {
    const [rows] = await pool.execute('SELECT * FROM enhancement_materials WHERE id = ?', [materialId]);
    if (!rows[0]) return null;
    return {
      ...rows[0],
      stats_bonus: rows[0].stats_bonus ? JSON.parse(rows[0].stats_bonus) : {}
    };
  }
};

// 玩家装备存储
const playerEquipmentStorage = {
  // 获取玩家装备列表
  async getPlayerEquipment(playerId, filters = {}) {
    let sql = 'SELECT pe.*, er.name, er.type, er.rarity, er.icon, er.description, er.base_stats FROM player_equipment pe JOIN equipment_recipes er ON pe.equipment_id = er.id WHERE pe.player_id = ?';
    const params = [playerId];
    const conditions = [];
    
    if (filters.slot) {
      conditions.push('pe.slot = ?');
      params.push(filters.slot);
    }
    if (filters.is_equipped !== undefined) {
      conditions.push('pe.is_equipped = ?');
      params.push(filters.is_equipped);
    }
    
    if (conditions.length > 0) {
      sql += ' AND ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY pe.obtained_at DESC';
    
    const [rows] = await pool.execute(sql, params);
    return rows.map(row => ({
      ...row,
      base_stats: row.base_stats ? JSON.parse(row.base_stats) : {}
    }));
  },

  // 获取玩家单个装备
  async getEquipmentById(playerId, equipmentRecordId) {
    const [rows] = await pool.execute(
      'SELECT pe.*, er.name, er.type, er.rarity, er.icon, er.description, er.base_stats FROM player_equipment pe JOIN equipment_recipes er ON pe.equipment_id = er.id WHERE pe.id = ? AND pe.player_id = ?',
      [equipmentRecordId, playerId]
    );
    if (!rows[0]) return null;
    return {
      ...rows[0],
      base_stats: rows[0].base_stats ? JSON.parse(rows[0].base_stats) : {}
    };
  },

  // 添加玩家装备
  async addEquipment(playerId, equipmentId, slot) {
    const [result] = await pool.execute(
      'INSERT INTO player_equipment (player_id, equipment_id, slot, level, exp, is_equipped) VALUES (?, ?, ?, ?, ?, ?)',
      [playerId, equipmentId, slot, 1, 0, 0]
    );
    return result.insertId;
  },

  // 更新装备强化等级
  async updateEquipmentLevel(playerId, equipmentRecordId, level, exp) {
    await pool.execute(
      'UPDATE player_equipment SET level = ?, exp = ? WHERE id = ? AND player_id = ?',
      [level, exp, equipmentRecordId, playerId]
    );
  },

  // 装备/卸下装备
  async toggleEquip(playerId, equipmentRecordId, isEquipped) {
    // 如果要装备，先卸下同槽位的其他装备
    if (isEquipped) {
      const equip = await this.getEquipmentById(playerId, equipmentRecordId);
      if (equip) {
        await pool.execute(
          'UPDATE player_equipment SET is_equipped = 0 WHERE player_id = ? AND slot = ? AND id != ?',
          [playerId, equip.slot, equipmentRecordId]
        );
      }
    }
    
    await pool.execute(
      'UPDATE player_equipment SET is_equipped = ? WHERE id = ? AND player_id = ?',
      [isEquipped ? 1 : 0, equipmentRecordId, playerId]
    );
  },

  // 删除玩家装备
  async deleteEquipment(playerId, equipmentRecordId) {
    await pool.execute(
      'DELETE FROM player_equipment WHERE id = ? AND player_id = ?',
      [equipmentRecordId, playerId]
    );
  },

  // 获取玩家已装备的装备
  async getEquippedItems(playerId) {
    const [rows] = await pool.execute(
      'SELECT pe.*, er.name, er.type, er.rarity, er.icon, er.description, er.base_stats FROM player_equipment pe JOIN equipment_recipes er ON pe.equipment_id = er.id WHERE pe.player_id = ? AND pe.is_equipped = 1',
      [playerId]
    );
    return rows.map(row => ({
      ...row,
      base_stats: row.base_stats ? JSON.parse(row.base_stats) : {}
    }));
  }
};

// 玩家材料仓库存储
const playerMaterialStorage = {
  // 获取玩家材料
  async getPlayerMaterials(playerId) {
    const [rows] = await pool.execute(
      'SELECT pm.*, em.name, em.type, em.rarity, em.icon, em.description, em.stats_bonus, em.drop_source FROM player_materials pm JOIN enhancement_materials em ON pm.material_id = em.id WHERE pm.player_id = ?',
      [playerId]
    );
    return rows.map(row => ({
      ...row,
      stats_bonus: row.stats_bonus ? JSON.parse(row.stats_bonus) : {}
    }));
  },

  // 获取玩家单个材料数量
  async getMaterialQuantity(playerId, materialId) {
    const [rows] = await pool.execute(
      'SELECT quantity FROM player_materials WHERE player_id = ? AND material_id = ?',
      [playerId, materialId]
    );
    return rows[0]?.quantity || 0;
  },

  // 添加材料
  async addMaterial(playerId, materialId, quantity) {
    // 使用 INSERT ... ON DUPLICATE KEY UPDATE
    await pool.execute(
      'INSERT INTO player_materials (player_id, material_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?',
      [playerId, materialId, quantity, quantity]
    );
  },

  // 消耗材料
  async consumeMaterial(playerId, materialId, quantity) {
    const currentQty = await this.getMaterialQuantity(playerId, materialId);
    if (currentQty < quantity) {
      throw new Error(`材料不足，需要${quantity}个${materialId}，但只有${currentQty}个`);
    }
    
    if (currentQty === quantity) {
      // 如果用完了，删除记录
      await pool.execute(
        'DELETE FROM player_materials WHERE player_id = ? AND material_id = ?',
        [playerId, materialId]
      );
    } else {
      // 否则减少数量
      await pool.execute(
        'UPDATE player_materials SET quantity = quantity - ? WHERE player_id = ? AND material_id = ?',
        [quantity, playerId, materialId]
      );
    }
  }
};

module.exports = {
  forgeStorage,
  playerEquipmentStorage,
  playerMaterialStorage
};
