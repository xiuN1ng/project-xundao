/**
 * 炼丹系统数据存储层
 */

const { pool } = require('./database');

// 丹方数据存储
const alchemyRecipeStorage = {
  // 获取所有丹方
  async getRecipeList(filters = {}) {
    let sql = 'SELECT * FROM alchemy_recipes';
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

  // 获取单个丹方
  async getRecipeById(recipeId) {
    const [rows] = await pool.execute('SELECT * FROM alchemy_recipes WHERE id = ?', [recipeId]);
    return rows[0] || null;
  }
};

// 药材数据存储
const alchemyMaterialStorage = {
  // 获取所有药材
  async getMaterialList(filters = {}) {
    let sql = 'SELECT * FROM alchemy_materials';
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

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY rarity DESC, realm_req ASC';

    const [rows] = await pool.execute(sql, params);
    return rows;
  },

  // 获取单个药材
  async getMaterialById(materialId) {
    const [rows] = await pool.execute('SELECT * FROM alchemy_materials WHERE id = ?', [materialId]);
    return rows[0] || null;
  },

  // 获取玩家仓库中的药材
  async getPlayerMaterials(playerId) {
    const [rows] = await pool.execute(
      `SELECT pam.*, am.name, am.type, am.description, am.rarity, am.realm_req, am.icon, am.source, am.attributes 
       FROM player_alchemy_materials pam 
       JOIN alchemy_materials am ON pam.material_id = am.id 
       WHERE pam.player_id = ? AND pam.quantity > 0 
       ORDER BY am.rarity DESC, am.name ASC`,
      [playerId]
    );
    return rows;
  },

  // 添加药材到玩家仓库
  async addMaterial(playerId, materialId, quantity) {
    const [existing] = await pool.execute(
      'SELECT * FROM player_alchemy_materials WHERE player_id = ? AND material_id = ?',
      [playerId, materialId]
    );

    if (existing.length > 0) {
      await pool.execute(
        'UPDATE player_alchemy_materials SET quantity = quantity + ? WHERE player_id = ? AND material_id = ?',
        [quantity, playerId, materialId]
      );
    } else {
      await pool.execute(
        'INSERT INTO player_alchemy_materials (player_id, material_id, quantity) VALUES (?, ?, ?)',
        [playerId, materialId, quantity]
      );
    }
  },

  // 消耗玩家药材
  async consumeMaterial(playerId, materialId, quantity) {
    const [existing] = await pool.execute(
      'SELECT * FROM player_alchemy_materials WHERE player_id = ? AND material_id = ?',
      [playerId, materialId]
    );

    if (existing.length === 0 || existing[0].quantity < quantity) {
      return false;
    }

    await pool.execute(
      'UPDATE player_alchemy_materials SET quantity = quantity - ? WHERE player_id = ? AND material_id = ?',
      [quantity, playerId, materialId]
    );
    return true;
  }
};

// 丹炉数据存储
const alchemyFurnaceStorage = {
  // 获取玩家丹炉信息
  async getFurnace(playerId) {
    const [rows] = await pool.execute(
      'SELECT * FROM player_alchemy_furnace WHERE player_id = ?',
      [playerId]
    );
    
    if (rows.length === 0) {
      // 创建默认丹炉
      await pool.execute(
        'INSERT INTO player_alchemy_furnace (player_id) VALUES (?)',
        [playerId]
      );
      return this.getFurnace(playerId);
    }
    return rows[0];
  },

  // 升级丹炉
  async upgradeFurnace(playerId) {
    const furnace = await this.getFurnace(playerId);
    const nextLevel = furnace.furnace_level + 1;
    
    // 升级所需经验公式: level * 1000
    const expNeeded = nextLevel * 1000;
    
    if (furnace.furnace_exp < expNeeded) {
      throw new Error(`升级需要 ${expNeeded} 丹炉经验，当前仅有 ${furnace.furnace_exp}`);
    }

    await pool.execute(
      'UPDATE player_alchemy_furnace SET furnace_level = ? WHERE player_id = ?',
      [nextLevel, playerId]
    );

    return this.getFurnace(playerId);
  },

  // 增加丹炉经验
  async addExp(playerId, exp) {
    await pool.execute(
      'UPDATE player_alchemy_furnace SET furnace_exp = furnace_exp + ? WHERE player_id = ?',
      [exp, playerId]
    );
  },

  // 记录炼丹统计
  async recordCraft(playerId, success) {
    await pool.execute(
      'UPDATE player_alchemy_furnace SET total_crafts = total_crafts + 1, successful_crafts = successful_crafts + ? WHERE player_id = ?',
      [success ? 1 : 0, playerId]
    );
  },

  // 获取丹炉升级所需经验
  getUpgradeExp(level) {
    return level * 1000;
  },

  // 获取丹炉加成 (基于等级)
  getFurnaceBonus(level) {
    return {
      success_rate_bonus: (level - 1) * 2, // 每级+2%成功率
      exp_bonus: (level - 1) * 10, // 每级+10%经验获取
      yield_bonus: Math.floor((level - 1) / 2) // 每2级+1产出
    };
  }
};

// 丹药库存存储
const alchemyPillStorage = {
  // 获取玩家丹药
  async getPlayerPills(playerId) {
    const [rows] = await pool.execute(
      `SELECT pap.*, ar.name, ar.type, ar.description, ar.rarity, ar.icon, ar.effects 
       FROM player_alchemy_pills pap 
       JOIN alchemy_recipes ar ON pap.recipe_id = ar.id 
       WHERE pap.player_id = ? AND pap.quantity > 0 
       ORDER BY ar.rarity DESC, ar.name ASC`,
      [playerId]
    );
    return rows;
  },

  // 添加丹药
  async addPill(playerId, recipeId, quantity) {
    const [existing] = await pool.execute(
      'SELECT * FROM player_alchemy_pills WHERE player_id = ? AND recipe_id = ?',
      [playerId, recipeId]
    );

    if (existing.length > 0) {
      await pool.execute(
        'UPDATE player_alchemy_pills SET quantity = quantity + ? WHERE player_id = ? AND recipe_id = ?',
        [quantity, playerId, recipeId]
      );
    } else {
      await pool.execute(
        'INSERT INTO player_alchemy_pills (player_id, recipe_id, quantity) VALUES (?, ?, ?)',
        [playerId, recipeId, quantity]
      );
    }
  },

  // 消耗丹药
  async consumePill(playerId, recipeId, quantity) {
    const [existing] = await pool.execute(
      'SELECT * FROM player_alchemy_pills WHERE player_id = ? AND recipe_id = ?',
      [playerId, recipeId]
    );

    if (existing.length === 0 || existing[0].quantity < quantity) {
      return false;
    }

    await pool.execute(
      'UPDATE player_alchemy_pills SET quantity = quantity - ? WHERE player_id = ? AND recipe_id = ?',
      [quantity, playerId, recipeId]
    );
    return true;
  }
};

module.exports = {
  pool,
  alchemyRecipeStorage,
  alchemyMaterialStorage,
  alchemyFurnaceStorage,
  alchemyPillStorage
};
