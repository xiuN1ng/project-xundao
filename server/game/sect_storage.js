/**
 * 宗门系统存储层 - SQLite版本
 * 优化：使用批量查询减少N+1查询问题
 */

let db;

// 批量查询优化模块
let batchQuery;
try {
  batchQuery = require('./batch_query');
} catch (e) {
  console.log('批量查询模块未加载');
}
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

// MySQL pool兼容层 - 将SQLite调用转换为Promise形式
const pool = {
  execute(sql, params) {
    return new Promise((resolve, reject) => {
      try {
        // 将MySQL的ON DUPLICATE KEY UPDATE转换为SQLite的ON CONFLICT
        if (sql.includes('ON DUPLICATE KEY UPDATE')) {
          sql = sql.replace(/ON DUPLICATE KEY UPDATE (\w+) = \1 \+ 1/i, 
            (match, col) => `ON CONFLICT(player_id, building_id) DO UPDATE SET ${col} = ${col} + 1`);
        }
        
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
          if (sql.includes('WHERE') || sql.includes(' LIMIT')) {
            const stmt = db.prepare(sql);
            const result = params ? stmt.get(...params) : stmt.get();
            // 修复：空结果返回空数组而不是包含undefined的数组
            resolve([result ? [result] : []]);
          } else {
            const stmt = db.prepare(sql);
            const result = params ? stmt.all(...params) : stmt.all();
            resolve([result || []]);
          }
        } else {
          const stmt = db.prepare(sql);
          const result = params ? stmt.run(...params) : stmt.run();
          resolve([{ affectedRows: result.changes }]);
        }
      } catch (e) {
        reject(e);
      }
    });
  }
};

// 初始化数据库表
function initSectTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sect (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER UNIQUE NOT NULL,
      sect_type TEXT NOT NULL,
      name TEXT,
      level INTEGER DEFAULT 1,
      exp INTEGER DEFAULT 0,
      contribution INTEGER DEFAULT 0,
      resources TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS sect_buildings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      building_id TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      UNIQUE(player_id, building_id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS sect_disciples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      disciple_class TEXT NOT NULL,
      name TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      cultivation INTEGER DEFAULT 0,
      talent INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS sect_techs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      tech_id TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      UNIQUE(player_id, tech_id)
    )
  `);

  // 灵石消耗日志表
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_lingshi_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      consume_type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      balance_before INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_player_lingshi_logs (player_id, created_at)
    )
  `);

  console.log('✅ 宗门系统数据库表初始化完成');

  // 数据迁移：修复旧数据的列名问题
  try {
    db.exec(`
      UPDATE sect SET 
        name = COALESCE(name, sect_name),
        level = COALESCE(level, sect_level),
        exp = COALESCE(exp, sect_exp)
      WHERE name IS NULL OR name = ''
    `);
    console.log('✅ 宗门数据迁移完成');
  } catch {
    console.log('ℹ️ 宗门数据迁移跳过（可能无需迁移）');
  }

  // 性能优化：添加数据库索引
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_sect_player ON sect(player_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_sect_buildings_player ON sect_buildings(player_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_sect_disciples_player ON sect_disciples(player_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_sect_techs_player ON sect_techs(player_id)`);
    console.log('✅ 宗门系统索引优化完成');
  } catch {
    console.log('ℹ️ 索引创建跳过（可能已存在）');
  }
}

// 初始化表
initSectTables();

// 宗门配置数据
const SECT_DATA = {
  'tianjian': {
    name: '天剑宗', type: 'sword',
    bonus_atk: 0.2, bonus_def: 0.1, bonus_spirit: 0.1,
    description: '剑修圣地，攻击加成'
  },
  'tiandao': {
    name: '天道宫', type: 'dao',
    bonus_atk: 0.1, bonus_def: 0.2, bonus_spirit: 0.15,
    description: '道法自然，全面加成'
  },
  'buddha': {
    name: '大佛寺', type: 'buddha',
    bonus_atk: 0.1, bonus_def: 0.3, bonus_spirit: 0.05,
    description: '佛门圣地，防御无双'
  },
  'demon': {
    name: '魔渊', type: 'demon',
    bonus_atk: 0.3, bonus_def: 0.05, bonus_spirit: 0.1,
    description: '魔道凶险，攻击至上'
  },
  'immortal': {
    name: '逍遥仙府', type: 'immortal',
    bonus_atk: 0.15, bonus_def: 0.15, bonus_spirit: 0.25,
    description: '逍遥自在，灵气无双'
  }
};

// 宗门建筑配置
// 建筑等级费用：初级(1-3级)100灵石，中级(4-6级)500灵石，高级(7-10级)2000灵石
const SECT_BUILDINGS = {
  'mountain_gate': { name: '山门', max_level: 10, cost_factor: 1.0, tier: 'primary', effect: { type: 'disciple_cap', value: 2 } },
  'main_hall': { name: '主殿', max_level: 10, cost_factor: 1.2, tier: 'advanced', effect: { type: 'all_bonus', value: 0.05 } },
  'training_field': { name: '练功场', max_level: 10, cost_factor: 1.0, tier: 'primary', effect: { type: 'exp_bonus', value: 0.1 } },
  'meditation_room': { name: '静修室', max_level: 10, cost_factor: 1.0, tier: 'primary', effect: { type: 'spirit_bonus', value: 0.1 } },
  'treasure_pavilion': { name: '藏宝阁', max_level: 10, cost_factor: 1.3, tier: 'advanced', effect: { type: 'drop_bonus', value: 0.15 } },
  'arena': { name: '竞技场', max_level: 10, cost_factor: 1.1, tier: 'intermediate', effect: { type: 'pvp_bonus', value: 0.1 } }
};

// 弟子职业配置
const DISCIPLE_CLASS = {
  'sword_disciple': { name: '剑修', atk_ratio: 1.5, def_ratio: 0.8, spirit_ratio: 1.0 },
  'dao_disciple': { name: '法修', atk_ratio: 1.2, def_ratio: 0.7, spirit_ratio: 1.5 },
  'body_disciple': { name: '体修', atk_ratio: 1.0, def_ratio: 1.5, spirit_ratio: 0.8 },
  'healer': { name: '医师', atk_ratio: 0.6, def_ratio: 1.0, spirit_ratio: 1.3 }
};

// 宗门技能配置
const SECT_TECH = {
  'sword_boost': { name: '剑意冲天', type: 'atk', value: 0.2, cost: 1000, req_sect_level: 3 },
  'defense_boost': { name: '铜墙铁壁', type: 'def', value: 0.2, cost: 1000, req_sect_level: 3 },
  'spirit_boost': { name: '灵气汇聚', type: 'spirit', value: 0.2, cost: 1000, req_sect_level: 5 },
  'luck_boost': { name: '福源深厚', type: 'luck', value: 0.3, cost: 2000, req_sect_level: 7 },
  'realm_accel': { name: '境界顿悟', type: 'realm_speed', value: 0.5, cost: 5000, req_sect_level: 10 }
};

// 宗门存储操作
const sectStorage = {
  // ============ 灵石消耗辅助方法 ============
  
  // 获取玩家灵石余额
  getLingshiBalance(playerId) {
    const player = db.prepare('SELECT spirit_stones FROM player WHERE id = ?').get(playerId);
    return player ? player.spirit_stones : 0;
  },
  
  // 记录灵石消耗日志
  logLingshiConsume(playerId, type, amount, balanceBefore, balanceAfter, details = {}) {
    try {
      db.prepare(
        'INSERT INTO player_lingshi_logs (player_id, consume_type, amount, balance_before, balance_after, details) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(
        playerId,
        type,
        amount,
        balanceBefore,
        balanceAfter,
        JSON.stringify(details)
      );
    } catch (e) {
      console.error('记录灵石消耗日志失败:', e.message);
    }
  },
  
  // 消耗灵石（带日志记录）
  async consumeLingshi(playerId, type, amount, details = {}) {
    const balanceBefore = this.getLingshiBalance(playerId);
    
    if (balanceBefore < amount) {
      throw new Error(`灵石不足：需要 ${amount} 灵石，当前只有 ${balanceBefore} 灵石`);
    }
    
    // 扣除灵石
    db.prepare(
      'UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?'
    ).run(amount, playerId);
    
    const balanceAfter = this.getLingshiBalance(playerId);
    
    // 记录日志
    this.logLingshiConsume(playerId, type, amount, balanceBefore, balanceAfter, details);
    
    return { balanceBefore, balanceAfter, amount };
  },
  
  // 获取灵石消耗日志
  getLingshiLogs(playerId, limit = 20, offset = 0) {
    const logs = db.prepare(
      `SELECT * FROM player_lingshi_logs 
       WHERE player_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`
    ).all(playerId, limit, offset);
    
    const countResult = db.prepare(
      'SELECT COUNT(*) as total FROM player_lingshi_logs WHERE player_id = ?'
    ).get(playerId);
    
    return {
      logs: logs.map(log => ({
        id: log.id,
        consume_type: log.consume_type,
        amount: log.amount,
        balance_before: log.balance_before,
        balance_after: log.balance_after,
        details: log.details ? JSON.parse(log.details) : {},
        created_at: log.created_at
      })),
      total: countResult.total
    };
  },

  // 获取宗门配置列表
  getSectTypes() {
    return Object.entries(SECT_DATA).map(([id, data]) => ({
      id,
      name: data.name,
      type: data.type,
      description: data.description,
      bonus_atk: data.bonus_atk,
      bonus_def: data.bonus_def,
      bonus_spirit: data.bonus_spirit
    }));
  },

  // 获取建筑配置列表
  getBuildingTypes() {
    return Object.entries(SECT_BUILDINGS).map(([id, data]) => ({
      id,
      name: data.name,
      max_level: data.max_level,
      cost_factor: data.cost_factor,
      effect: data.effect
    }));
  },

  // 获取弟子职业配置
  getDiscipleClasses() {
    return Object.entries(DISCIPLE_CLASS).map(([id, data]) => ({
      id,
      name: data.name,
      atk_ratio: data.atk_ratio,
      def_ratio: data.def_ratio,
      spirit_ratio: data.spirit_ratio
    }));
  },

  // 获取宗门技能配置
  getTechTypes() {
    return Object.entries(SECT_TECH).map(([id, data]) => ({
      id,
      name: data.name,
      type: data.type,
      value: data.value,
      cost: data.cost,
      req_sect_level: data.req_sect_level
    }));
  },

  // 获取玩家宗门信息 - 优化版（使用批量查询）
  async getSect(playerId) {
    // 优先使用优化的批量查询
    if (batchQuery && batchQuery.queryOptimizer) {
      const sect = await batchQuery.queryOptimizer.getSectOptimized(playerId);
      return sect;
    }
    
    // 回退到原来的实现
    const [rows] = await pool.execute(
      'SELECT * FROM sect WHERE player_id = ?',
      [playerId]
    );

    if (rows.length === 0) return null;

    const sect = rows[0];
    const buildings = await this.getBuildings(playerId);
    const disciples = await this.getDisciples(playerId);
    const techs = await this.getTechs(playerId);

    // 兼容处理：优先使用正确的列名，回退到旧列名
    const sectName = sect.name || sect.sect_name || null;
    const sectLevel = sect.level || sect.sect_level || 1;
    const sectExp = sect.exp || sect.sect_exp || 0;

    return {
      id: sect.id,
      player_id: sect.player_id,
      sect_type: sect.sect_type,
      sect_name: sectName,
      sect_level: sectLevel,
      sect_exp: sectExp,
      contribution: sect.contribution || 0,
      buildings,
      disciples,
      techs,
      created_at: sect.created_at
    };
  },

  // 批量获取多个玩家的宗门信息 - 优化版
  async getSects(playerIds) {
    if (!playerIds || playerIds.length === 0) return [];
    
    // 使用批量查询优化
    if (batchQuery && batchQuery.batchQuery) {
      const sectsMap = await batchQuery.batchQuery.getSectsWithRelations(playerIds);
      return playerIds.map(id => sectsMap.get(id)).filter(Boolean);
    }
    
    // 回退到原来的实现
    const result = [];
    for (const playerId of playerIds) {
      const sect = await this.getSect(playerId);
      if (sect) result.push(sect);
    }
    return result;
  },

  // 获取宗门建筑
  async getBuildings(playerId) {
    const [rows] = await pool.execute(
      'SELECT * FROM sect_buildings WHERE player_id = ?',
      [playerId]
    );

    const buildings = {};
    rows.forEach(row => {
      buildings[row.building_id] = row.level;
    });
    return buildings;
  },

  // 获取宗门弟子
  async getDisciples(playerId) {
    const [rows] = await pool.execute(
      'SELECT * FROM sect_disciples WHERE player_id = ?',
      [playerId]
    );

    return rows.map((row, index) => ({
      disciple_id: row.disciple_id || `disciple_${index}_${Date.now()}`,
      name: row.disciple_name || row.name || '未知弟子',
      class: row.disciple_class,
      level: row.disciple_level || row.level || 1,
      cultivation: row.cultivation || 0,
      talent: row.talent || 1,
      loyalty: row.loyalty ?? 50,  // 默认忠诚度50
      created_at: row.created_at || new Date().toISOString()
    }));
  },

  // 获取宗门技能
  async getTechs(playerId) {
    const [rows] = await pool.execute(
      'SELECT * FROM sect_techs WHERE player_id = ?',
      [playerId]
    );

    return rows.map(row => row.tech_id);
  },

  // 创建宗门
  async createSect(playerId, sectType) {
    const sectData = SECT_DATA[sectType];
    if (!sectData) {
      throw new Error('宗门类型不存在');
    }

    // 检查是否已有宗门
    const existing = await this.getSect(playerId);
    if (existing) {
      throw new Error('已有宗门');
    }

    await pool.execute(
      'INSERT INTO sect (player_id, sect_type, name, level, exp, contribution) VALUES (?, ?, ?, ?, ?, ?)',
      [playerId, sectType, sectData.name, 1, 0, 0]
    );

    return await this.getSect(playerId);
  },

  // 升级宗门
  async upgradeSect(playerId) {
    const sect = await this.getSect(playerId);
    if (!sect) {
      throw new Error('没有宗门');
    }

    const expNeeded = sect.sect_level * 5000;
    if (sect.sect_exp < expNeeded) {
      throw new Error(`需要 ${expNeeded} 宗门经验`);
    }

    await pool.execute(
      'UPDATE sect SET exp = exp - ?, level = level + 1 WHERE player_id = ?',
      [expNeeded, playerId]
    );

    return await this.getSect(playerId);
  },

  // 添加宗门经验
  async addSectExp(playerId, exp) {
    const sect = await this.getSect(playerId);
    if (!sect) return null;

    await pool.execute(
      'UPDATE sect SET exp = exp + ? WHERE player_id = ?',
      [exp, playerId]
    );

    return await this.getSect(playerId);
  },

  // 升级建筑
  async upgradeBuilding(playerId, buildingId, deductLingshi = true) {
    const sect = await this.getSect(playerId);
    if (!sect) {
      throw new Error('没有宗门');
    }

    const buildingData = SECT_BUILDINGS[buildingId];
    if (!buildingData) {
      throw new Error('建筑不存在');
    }

    const currentLevel = sect.buildings[buildingId] || 0;
    if (currentLevel >= buildingData.max_level) {
      throw new Error('已满级');
    }

    const cost = Math.floor(500 * Math.pow(buildingData.cost_factor, currentLevel));

    // 如果需要扣除灵石
    if (deductLingshi) {
      const result = await this.consumeLingshi(playerId, 'building_upgrade', cost, {
        building_id: buildingId,
        building_name: buildingData.name,
        from_level: currentLevel,
        to_level: currentLevel + 1
      });
      
      // 更新数据库 - 使用SQLite的UPSERT语法
      await pool.execute(
        `INSERT INTO sect_buildings (player_id, building_id, level) VALUES (?, ?, ?)
         ON CONFLICT(player_id, building_id) DO UPDATE SET level = level + 1`,
        [playerId, buildingId, currentLevel + 1]
      );

      return { 
        cost, 
        newLevel: currentLevel + 1,
        balance_before: result.balanceBefore,
        balance_after: result.balanceAfter
      };
    } else {
      // 仅查询费用，不实际扣除
      return { cost, newLevel: currentLevel + 1 };
    }
  },

  // 建筑费用缓存 - 避免重复计算
  _buildingCostCache: {},

  // 获取建筑升级费用 - 分级费用制度
  // 初级建筑：1-3级 100灵石，4-6级 500灵石，7-10级 2000灵石
  // 中级建筑：基础费用翻倍
  // 高级建筑：基础费用翻4倍
  getBuildingCost(buildingId, currentLevel) {
    const buildingData = SECT_BUILDINGS[buildingId];
    if (!buildingData) return null;
    
    // 使用缓存避免重复计算
    const cacheKey = `${buildingId}_${currentLevel}`;
    if (this._buildingCostCache[cacheKey] !== undefined) {
      return this._buildingCostCache[cacheKey];
    }
    
    // 获取目标等级（当前等级+1）
    const targetLevel = currentLevel + 1;
    
    // 根据建筑等级计算基础费用
    let baseCost;
    if (targetLevel <= 3) {
      baseCost = 100; // 初级
    } else if (targetLevel <= 6) {
      baseCost = 500; // 中级
    } else {
      baseCost = 2000; // 高级
    }
    
    // 根据建筑类型调整费用
    let multiplier = 1;
    const tier = buildingData.tier || 'primary';
    if (tier === 'intermediate') {
      multiplier = 2;
    } else if (tier === 'advanced') {
      multiplier = 4;
    }
    
    // 应用cost_factor和类型倍数
    const cost = Math.floor(baseCost * multiplier * Math.pow(buildingData.cost_factor || 1.0, currentLevel));
    this._buildingCostCache[cacheKey] = cost;
    return cost;
  },

  // 招收弟子
  async recruitDisciple(playerId, classType) {
    const sect = await this.getSect(playerId);
    if (!sect) {
      throw new Error('没有宗门');
    }

    const classData = DISCIPLE_CLASS[classType];
    if (!classData) {
      throw new Error('弟子类型不存在');
    }

    const discipleCap = 5 + (sect.buildings.mountain_gate || 0) * 2;
    if (sect.disciples.length >= discipleCap) {
      throw new Error(`宗门最多 ${discipleCap} 名弟子`);
    }

    const cost = Math.floor(500 * Math.pow(1.5, sect.disciples.length));

    // 使用UUID风格生成唯一ID，避免并发创建时ID冲突
    const discipleId = `disciple_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const discipleName = generateDiscipleName();

    await pool.execute(
      'INSERT INTO sect_disciples (player_id, disciple_id, disciple_name, disciple_class, disciple_level, cultivation, loyalty) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [playerId, discipleId, discipleName, classType, 1, 0, 50]
    );

    return { cost, disciple: { disciple_id: discipleId, name: discipleName, class: classType } };
  },

  // 弟子修炼
  async trainDisciple(playerId, discipleIndex) {
    const sect = await this.getSect(playerId);
    if (!sect) {
      throw new Error('没有宗门');
    }

    const disciples = sect.disciples;
    if (!disciples[discipleIndex]) {
      throw new Error('弟子不存在');
    }

    const disciple = disciples[discipleIndex];
    const classData = DISCIPLE_CLASS[disciple.class];

    // 计算修炼产出
    const baseExp = 10 * sect.sect_level;
    const classBonus = classData.spirit_ratio;
    const exp = Math.floor(baseExp * classBonus);

    // 更新弟子修为
    let newLevel = disciple.level;
    let newCultivation = disciple.cultivation + exp;
    const expToLevel = newLevel * 100;

    if (newCultivation >= expToLevel) {
      newCultivation -= expToLevel;
      newLevel++;
    }

    // 更新忠诚度
    const newLoyalty = Math.max(0, disciple.loyalty - 1);

    await pool.execute(
      'UPDATE sect_disciples SET cultivation = ?, disciple_level = ?, loyalty = ? WHERE player_id = ? AND disciple_id = ?',
      [newCultivation, newLevel, newLoyalty, playerId, disciple.disciple_id]
    );

    return { expGained: exp, newLevel, newCultivation, newLoyalty };
  },

  // 学习宗门技能
  async learnTech(playerId, techId) {
    const sect = await this.getSect(playerId);
    if (!sect) {
      throw new Error('没有宗门');
    }

    const tech = SECT_TECH[techId];
    if (!tech) {
      throw new Error('技能不存在');
    }

    if (sect.sect_level < tech.req_sect_level) {
      throw new Error(`需要宗门 Lv.${tech.req_sect_level}`);
    }

    if (sect.techs.includes(techId)) {
      throw new Error('已学会此技能');
    }

    await pool.execute(
      'INSERT INTO sect_techs (player_id, tech_id) VALUES (?, ?)',
      [playerId, techId]
    );

    return { tech, cost: tech.cost };
  },

  // 捐赠宗门
  async donate(playerId, amount) {
    const sect = await this.getSect(playerId);
    if (!sect) {
      throw new Error('没有宗门');
    }

    const contribution = Math.floor(amount / 10);

    await pool.execute(
      'UPDATE sect SET contribution = contribution + ? WHERE player_id = ?',
      [contribution, playerId]
    );

    return { amount, contribution };
  },

  // 离开宗门
  async leaveSect(playerId) {
    const sect = await this.getSect(playerId);
    if (!sect) {
      throw new Error('没有宗门');
    }

    // 删除相关数据
    await pool.execute('DELETE FROM sect_techs WHERE player_id = ?', [playerId]);
    await pool.execute('DELETE FROM sect_disciples WHERE player_id = ?', [playerId]);
    await pool.execute('DELETE FROM sect_buildings WHERE player_id = ?', [playerId]);
    await pool.execute('DELETE FROM sect WHERE player_id = ?', [playerId]);

    return { success: true };
  },

  // 计算宗门加成
  async getSectBonus(playerId) {
    const sect = await this.getSect(playerId);
    if (!sect) {
      return { atk: 1, def: 1, spirit: 1, exp: 1, drop: 1 };
    }

    const sectData = SECT_DATA[sect.sect_type] || { bonus_atk: 0, bonus_def: 0, bonus_spirit: 0 };
    const bonus = {
      atk: 1 + (sectData.bonus_atk || 0),
      def: 1 + (sectData.bonus_def || 0),
      spirit: 1 + (sectData.bonus_spirit || 0),
      exp: 1,
      drop: 1
    };

    // 建筑加成
    for (const [buildingId, level] of Object.entries(sect.buildings)) {
      const building = SECT_BUILDINGS[buildingId];
      if (!building) continue;
      const effect = building.effect;
      // all_bonus 增加所有属性
      if (effect.type === 'all_bonus') {
        const value = effect.value * level;
        bonus.atk += value;
        bonus.def += value;
        bonus.spirit += value;
      }
      if (effect.type === 'exp_bonus') bonus.exp += effect.value * level;
      if (effect.type === 'drop_bonus') bonus.drop += effect.value * level;
      if (effect.type === 'spirit_bonus') bonus.spirit += effect.value * level;
    }

    // 技能加成
    for (const techId of sect.techs) {
      const tech = SECT_TECH[techId];
      if (!tech) continue;
      if (tech.type === 'atk') bonus.atk += tech.value;
      if (tech.type === 'def') bonus.def += tech.value;
      if (tech.type === 'spirit') bonus.spirit += tech.value;
      if (tech.type === 'luck') bonus.drop += tech.value;
    }

    return bonus;
  }
};

// 随机弟子名
function generateDiscipleName() {
  const surnames = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴'];
  const names = ['云', '风', '山', '水', '火', '雷', '剑', '道', '心', '悟'];
  return surnames[Math.floor(Math.random() * surnames.length)] + names[Math.floor(Math.random() * names.length)];
}

module.exports = {
  sectStorage,
  SECT_DATA,
  SECT_BUILDINGS,
  DISCIPLE_CLASS,
  SECT_TECH
};
