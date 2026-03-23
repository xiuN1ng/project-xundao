/**
 * MySQL 数据库配置
 */

let pool = null;
try {
  const mysql = require('mysql2/promise');
  require('dotenv').config();

  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'idle_cultivation',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  // 创建连接池
  pool = mysql.createPool(dbConfig);
  console.log('✓ MySQL 连接池已创建');
} catch (err) {
  console.log('⚠ MySQL 不可用，将使用本地存储');
}

// 测试连接
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL 数据库连接成功');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MySQL 数据库连接失败:', error.message);
    return false;
  }
}

// 更新玩家强化石数量
async function updatePlayerQianghuaStones(playerId, amount) {
  if (!pool) return;
  try {
    await pool.execute(
      'UPDATE player SET qianghua_stones = COALESCE(qianghua_stones, 0) + ? WHERE id = ?',
      [amount, playerId]
    );
  } catch (error) {
    console.error('更新强化石失败:', error.message);
  }
}

// 获取玩家强化石数量
async function getPlayerQianghuaStones(playerId) {
  if (!pool) return 0;
  try {
    const [rows] = await pool.execute(
      'SELECT qianghua_stones FROM player WHERE id = ?',
      [playerId]
    );
    return rows[0]?.qianghua_stones || 0;
  } catch (error) {
    console.error('获取强化石失败:', error.message);
    return 0;
  }
}

// 初始化数据库表
async function initDatabase() {
  const connection = await pool.getConnection();
  
  try {
    // 创建功法表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS gongfa (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(20) NOT NULL,
        description TEXT,
        rarity INT DEFAULT 1,
        realm_req INT DEFAULT 0,
        level_req INT DEFAULT 1,
        icon VARCHAR(10),
        skill_id VARCHAR(50),
        set_bonus TEXT,
        base_stats JSON,
        effects JSON,
        max_level INT DEFAULT 5,
        upgrade_cost JSON
      )
    `);

    // 创建玩家功法表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS player_gongfa (
        id INT PRIMARY KEY AUTO_INCREMENT,
        player_id INT NOT NULL,
        gongfa_id VARCHAR(50) NOT NULL,
        level INT DEFAULT 1,
        exp INT DEFAULT 0,
        learned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_player_gongfa (player_id, gongfa_id)
      )
    `);

    // 创建玩家功法装备表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS player_gongfa_equipment (
        id INT PRIMARY KEY AUTO_INCREMENT,
        player_id INT NOT NULL,
        slot VARCHAR(20) NOT NULL,
        gongfa_id VARCHAR(50),
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_player_slot (player_id, slot)
      )
    `);

    // 创建玩家表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS player (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(100) UNIQUE NOT NULL,
        spirit_stones INT DEFAULT 1000,
        qianghua_stones INT DEFAULT 0,
        level INT DEFAULT 1,
        realm_level INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建玩家游戏数据表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS player_game_data (
        id INT PRIMARY KEY AUTO_INCREMENT,
        player_id INT NOT NULL UNIQUE,
        player_data JSON,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (player_id) REFERENCES player(id) ON DELETE CASCADE
      )
    `);

    // 创建境界副本进度表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS realm_dungeon_progress (
        id INT PRIMARY KEY AUTO_INCREMENT,
        player_id INT NOT NULL,
        realm VARCHAR(20) NOT NULL,
        highest_floor INT DEFAULT 0,
        cleared TINYINT DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_player_realm (player_id, realm),
        FOREIGN KEY (player_id) REFERENCES player(id) ON DELETE CASCADE
      )
    `);

    // 创建宗门表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sect (
        id INT PRIMARY KEY AUTO_INCREMENT,
        player_id INT NOT NULL UNIQUE,
        sect_type VARCHAR(20) NOT NULL,
        sect_name VARCHAR(50) NOT NULL,
        sect_level INT DEFAULT 1,
        sect_exp INT DEFAULT 0,
        contribution INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (player_id) REFERENCES player(id) ON DELETE CASCADE
      )
    `);

    // 创建宗门建筑表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sect_buildings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        player_id INT NOT NULL,
        building_id VARCHAR(30) NOT NULL,
        level INT DEFAULT 1,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_player_building (player_id, building_id),
        FOREIGN KEY (player_id) REFERENCES player(id) ON DELETE CASCADE
      )
    `);

    // 创建宗门弟子表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sect_disciples (
        id INT PRIMARY KEY AUTO_INCREMENT,
        player_id INT NOT NULL,
        disciple_id VARCHAR(30) NOT NULL,
        disciple_name VARCHAR(20) NOT NULL,
        disciple_class VARCHAR(30) NOT NULL,
        disciple_level INT DEFAULT 1,
        cultivation INT DEFAULT 0,
        loyalty INT DEFAULT 50,
        assigned_to VARCHAR(30),
        obtained_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (player_id) REFERENCES player(id) ON DELETE CASCADE
      )
    `);

    // 创建宗门技能表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sect_techs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        player_id INT NOT NULL,
        tech_id VARCHAR(30) NOT NULL,
        learned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_player_tech (player_id, tech_id),
        FOREIGN KEY (player_id) REFERENCES player(id) ON DELETE CASCADE
      )
    `);

    // 创建世界BOSS表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS world_boss (
        id INT PRIMARY KEY AUTO_INCREMENT,
        boss_id VARCHAR(30) NOT NULL,
        hp INT DEFAULT 0,
        max_hp INT DEFAULT 0,
        status VARCHAR(20) DEFAULT 'dead',
        spawn_time DATETIME,
        killed_by VARCHAR(50),
        killed_at DATETIME,
        participant_count INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建世界BOSS伤害记录表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS world_boss_damage (
        id INT PRIMARY KEY AUTO_INCREMENT,
        boss_id VARCHAR(30) NOT NULL,
        player_id VARCHAR(50) NOT NULL,
        damage BIGINT DEFAULT 0,
        last_attack DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_boss_player (boss_id, player_id)
      )
    `);

    // 创建活动表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS activities (
        id INT PRIMARY KEY AUTO_INCREMENT,
        activity_id VARCHAR(30) NOT NULL,
        type VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        start_time DATETIME,
        end_time DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建活动签到表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS activity_sign (
        id INT PRIMARY KEY AUTO_INCREMENT,
        player_id VARCHAR(50) NOT NULL,
        sign_date DATE NOT NULL,
        streak INT DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_player_date (player_id, sign_date)
      )
    `);

    // 创建活动进度表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS activity_progress (
        id INT PRIMARY KEY AUTO_INCREMENT,
        player_id VARCHAR(50) NOT NULL,
        activity_id VARCHAR(30) NOT NULL,
        progress INT DEFAULT 0,
        claimed TINYINT DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_player_activity (player_id, activity_id)
      )
    `);

    // 创建活动重置记录表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS activity_reset (
        id INT PRIMARY KEY AUTO_INCREMENT,
        reset_type VARCHAR(20) NOT NULL,
        reset_date DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_reset_type_date (reset_type, reset_date)
      )
    `);

    // 创建每日副本挑战记录表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS daily_dungeon_challenges (
        id INT PRIMARY KEY AUTO_INCREMENT,
        player_id VARCHAR(50) NOT NULL,
        dungeon_id VARCHAR(30) NOT NULL,
        difficulty INT DEFAULT 1,
        current_stage INT DEFAULT 1,
        current_hp INT DEFAULT 0,
        max_hp INT DEFAULT 0,
        time_limit INT DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pending',
        completed_stage INT DEFAULT 0,
        time_used INT DEFAULT 0,
        reward_claimed TINYINT DEFAULT 0,
        start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_time DATETIME,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_player_dungeon (player_id, dungeon_id),
        INDEX idx_status (status)
      )
    `);

    // 创建每日副本进度表（记录每日通关状态）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS daily_dungeon_progress (
        id INT PRIMARY KEY AUTO_INCREMENT,
        player_id VARCHAR(50) NOT NULL,
        dungeon_id VARCHAR(30) NOT NULL,
        progress_date DATE NOT NULL,
        completed TINYINT DEFAULT 0,
        best_time INT DEFAULT 0,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_player_dungeon_date (player_id, dungeon_id, progress_date)
      )
    `);

    // 创建经脉穴位表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS player_meridian (
        id INT PRIMARY KEY AUTO_INCREMENT,
        player_id VARCHAR(50) NOT NULL UNIQUE,
        meridians_data JSON,
        total_spirit_bonus INT DEFAULT 0,
        total_atk_bonus INT DEFAULT 0,
        total_def_bonus INT DEFAULT 0,
        total_hp_bonus INT DEFAULT 0,
        total_crit_bonus DECIMAL(5,4) DEFAULT 0,
        total_dodge_bonus DECIMAL(5,4) DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_player_meridian_player_id (player_id)
      )
    `);

    // 创建经脉操作日志表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS meridian_log (
        id INT PRIMARY KEY AUTO_INCREMENT,
        player_id VARCHAR(50) NOT NULL,
        action VARCHAR(30) NOT NULL,
        meridian_id VARCHAR(30),
        acupoint_id VARCHAR(30),
        result JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_meridian_log_player_id (player_id),
        INDEX idx_meridian_log_created_at (created_at)
      )
    `);

    console.log('✅ 数据库表初始化完成');

    // 创建索引优化查询性能
    await createIndexes(connection);
  } catch (error) {
    console.error('❌ 数据库表初始化失败:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

// 创建索引优化查询性能
async function createIndexes(connection) {
  const indexes = [
    // 玩家数据索引
    'CREATE INDEX IF NOT EXISTS idx_player_id ON player(player_id)',
    'CREATE INDEX IF NOT EXISTS idx_player_game_data_player_id ON player_game_data(player_id)',
    
    // 功法系统索引
    'CREATE INDEX IF NOT EXISTS idx_player_gongfa_player_id ON player_gongfa(player_id)',
    'CREATE INDEX IF NOT EXISTS idx_player_gongfa_equipment_player_id ON player_gongfa_equipment(player_id)',
    
    // 境界副本索引
    'CREATE INDEX IF NOT EXISTS idx_realm_dungeon_player_id ON realm_dungeon_progress(player_id)',
    
    // 活动系统索引
    'CREATE INDEX IF NOT EXISTS idx_activity_sign_player_id ON activity_sign(player_id)',
    'CREATE INDEX IF NOT EXISTS idx_activity_progress_player_id ON activity_progress(player_id)',
    
    // 世界BOSS索引
    'CREATE INDEX IF NOT EXISTS idx_world_boss_damage_player_id ON world_boss_damage(player_id)',
    'CREATE INDEX IF NOT EXISTS idx_world_boss_damage_boss_id ON world_boss_damage(boss_id)',

    // 每日副本索引
    'CREATE INDEX IF NOT EXISTS idx_daily_dungeon_progress_player_id ON daily_dungeon_progress(player_id)',
    'CREATE INDEX IF NOT EXISTS idx_daily_dungeon_progress_date ON daily_dungeon_progress(progress_date)',
    'CREATE INDEX IF NOT EXISTS idx_daily_dungeon_challenges_player_id ON daily_dungeon_challenges(player_id)',

    // 经脉系统索引
    'CREATE INDEX IF NOT EXISTS idx_player_meridian_player_id ON player_meridian(player_id)',
    'CREATE INDEX IF NOT EXISTS idx_meridian_log_player_id ON meridian_log(player_id)',
    'CREATE INDEX IF NOT EXISTS idx_meridian_log_created_at ON meridian_log(created_at)'
  ];

  for (const idx of indexes) {
    try {
      await connection.execute(idx);
    } catch {
      // 索引可能已存在，忽略错误
    }
  }
  console.log('✅ 数据库索引优化完成');
}

// 种子数据
async function seedGongfaData() {
  const connection = await pool.getConnection();
  
  try {
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM gongfa');
    if (rows[0].count > 0) return;

    const gongfaData = [
      { id: 'basic_breath', name: '引气术', type: 'cultivation', description: '最简单的呼吸吐纳之法', rarity: 1, realm_req: 0, level_req: 1, icon: '🌬️', skill_id: null, base_stats: { spirit_rate: 1.1 }, effects: { 1: { spirit_rate: 0.1 }, 2: { spirit_rate: 0.15 }, 3: { spirit_rate: 0.2 }, 4: { spirit_rate: 0.25 }, 5: { spirit_rate: 0.3 } }, max_level: 5, upgrade_cost: { 1: { spirit_stones: 100 }, 2: { spirit_stones: 200 }, 3: { spirit_stones: 400 }, 4: { spirit_stones: 800 }, 5: { spirit_stones: 1600 } } },
      { id: 'spirit_absorption', name: '聚气诀', type: 'cultivation', description: '聚集周围灵气的法门', rarity: 2, realm_req: 2, level_req: 10, icon: '🌀', skill_id: null, base_stats: { spirit_rate: 1.2 }, effects: { 1: { spirit_rate: 0.2 }, 2: { spirit_rate: 0.25 }, 3: { spirit_rate: 0.3 }, 4: { spirit_rate: 0.35 }, 5: { spirit_rate: 0.4 } }, max_level: 5, upgrade_cost: { 1: { spirit_stones: 500 }, 2: { spirit_stones: 1000 }, 3: { spirit_stones: 2000 }, 4: { spirit_stones: 4000 }, 5: { spirit_stones: 8000 } } },
      { id: 'celestial_breath', name: '先天混元功', type: 'cultivation', description: '沟通天地元气的无上功法', rarity: 4, realm_req: 5, level_req: 50, icon: '✨', skill_id: 'celestial_spirit', base_stats: { spirit_rate: 1.5 }, effects: { 1: { spirit_rate: 0.5 }, 2: { spirit_rate: 0.6 }, 3: { spirit_rate: 0.7 }, 4: { spirit_rate: 0.8 }, 5: { spirit_rate: 1.0 } }, max_level: 5, upgrade_cost: { 1: { spirit_stones: 50000 }, 2: { spirit_stones: 100000 }, 3: { spirit_stones: 200000 }, 4: { spirit_stones: 400000 }, 5: { spirit_stones: 800000 } } },
      { id: 'sword_manifesto', name: '剑诀', type: 'attack', description: '基础剑修法门', rarity: 1, realm_req: 0, level_req: 1, icon: '⚔️', skill_id: null, base_stats: { atk: 1.1 }, effects: { 1: { atk: 0.1 }, 2: { atk: 0.15 }, 3: { atk: 0.2 }, 4: { atk: 0.25 }, 5: { atk: 0.3 } }, max_level: 5, upgrade_cost: { 1: { spirit_stones: 100 }, 2: { spirit_stones: 200 }, 3: { spirit_stones: 400 }, 4: { spirit_stones: 800 }, 5: { spirit_stones: 1600 } } },
      { id: 'flame_sword', name: '赤焰剑诀', type: 'attack', description: '蕴含火焰之力的剑技', rarity: 3, realm_req: 3, level_req: 20, icon: '🔥', skill_id: 'flame_slash', base_stats: { atk: 1.2 }, effects: { 1: { atk: 0.3, fire_dmg: 0.1 }, 2: { atk: 0.35, fire_dmg: 0.15 }, 3: { atk: 0.4, fire_dmg: 0.2 }, 4: { atk: 0.45, fire_dmg: 0.25 }, 5: { atk: 0.5, fire_dmg: 0.3 } }, max_level: 5, upgrade_cost: { 1: { spirit_stones: 2000 }, 2: { spirit_stones: 4000 }, 3: { spirit_stones: 8000 }, 4: { spirit_stones: 16000 }, 5: { spirit_stones: 32000 } } },
      { id: 'thunder_sword', name: '奔雷剑诀', type: 'attack', description: '引动天雷的剑技', rarity: 4, realm_req: 5, level_req: 50, icon: '⚡', skill_id: 'thunder_strike', base_stats: { atk: 1.3 }, effects: { 1: { atk: 0.5, thunder_dmg: 0.2, crit_rate: 0.05 }, 2: { atk: 0.55, thunder_dmg: 0.25, crit_rate: 0.08 }, 3: { atk: 0.6, thunder_dmg: 0.3, crit_rate: 0.1 }, 4: { atk: 0.65, thunder_dmg: 0.35, crit_rate: 0.12 }, 5: { atk: 0.7, thunder_dmg: 0.4, crit_rate: 0.15 } }, max_level: 5, upgrade_cost: { 1: { spirit_stones: 50000 }, 2: { spirit_stones: 100000 }, 3: { spirit_stones: 200000 }, 4: { spirit_stones: 400000 }, 5: { spirit_stones: 800000 } } },
      { id: 'iron_body', name: '铁布衫', type: 'defense', description: '基础的护体功法', rarity: 1, realm_req: 0, level_req: 1, icon: '🛡️', skill_id: null, base_stats: { def: 1.1 }, effects: { 1: { def: 0.1 }, 2: { def: 0.15 }, 3: { def: 0.2 }, 4: { def: 0.25 }, 5: { def: 0.3 } }, max_level: 5, upgrade_cost: { 1: { spirit_stones: 100 }, 2: { spirit_stones: 200 }, 3: { spirit_stones: 400 }, 4: { spirit_stones: 800 }, 5: { spirit_stones: 1600 } } },
      { id: 'jade_shield', name: '玉清护体', type: 'defense', description: '玉石俱焚的防御绝技', rarity: 3, realm_req: 3, level_req: 20, icon: '💎', skill_id: 'jade_barrier', base_stats: { def: 1.2 }, effects: { 1: { def: 0.3, damage_reduction: 0.1 }, 2: { def: 0.35, damage_reduction: 0.12 }, 3: { def: 0.4, damage_reduction: 0.15 }, 4: { def: 0.45, damage_reduction: 0.18 }, 5: { def: 0.5, damage_reduction: 0.2 } }, max_level: 5, upgrade_cost: { 1: { spirit_stones: 2000 }, 2: { spirit_stones: 4000 }, 3: { spirit_stones: 8000 }, 4: { spirit_stones: 16000 }, 5: { spirit_stones: 32000 } } },
      { id: 'healing_arts', name: '长春功', type: 'auxiliary', description: '恢复生命力的法门', rarity: 2, realm_req: 1, level_req: 5, icon: '🌿', skill_id: 'regeneration', base_stats: { hp_regen: 1.1 }, effects: { 1: { hp_regen: 0.1 }, 2: { hp_regen: 0.15 }, 3: { hp_regen: 0.2 }, 4: { hp_regen: 0.25 }, 5: { hp_regen: 0.3 } }, max_level: 5, upgrade_cost: { 1: { spirit_stones: 300 }, 2: { spirit_stones: 600 }, 3: { spirit_stones: 1200 }, 4: { spirit_stones: 2400 }, 5: { spirit_stones: 4800 } } },
      { id: 'spirit_root_awakening', name: '灵根觉醒', type: 'passive', description: '激发灵根潜力', rarity: 3, realm_req: 2, level_req: 15, icon: '🌟', skill_id: null, base_stats: { all_stats: 1.1 }, effects: { 1: { all_stats: 0.05 }, 2: { all_stats: 0.08 }, 3: { all_stats: 0.1 }, 4: { all_stats: 0.12 }, 5: { all_stats: 0.15 } }, max_level: 5, upgrade_cost: { 1: { spirit_stones: 1500 }, 2: { spirit_stones: 3000 }, 3: { spirit_stones: 6000 }, 4: { spirit_stones: 12000 }, 5: { spirit_stones: 24000 } } },
      { id: 'immortal_way', name: '仙道篇', type: 'passive', description: '成仙之道，蕴含无上奥秘', rarity: 5, realm_req: 7, level_req: 80, icon: '🏔️', skill_id: 'immortal_transcendence', set_bonus: ['celestial_breath', 'thunder_sword'], base_stats: { all_stats: 1.5 }, effects: { 1: { all_stats: 0.3, exp_rate: 0.2 }, 2: { all_stats: 0.35, exp_rate: 0.25 }, 3: { all_stats: 0.4, exp_rate: 0.3 }, 4: { all_stats: 0.45, exp_rate: 0.35 }, 5: { all_stats: 0.5, exp_rate: 0.4 } }, max_level: 5, upgrade_cost: { 1: { spirit_stones: 500000 }, 2: { spirit_stones: 1000000 }, 3: { spirit_stones: 2000000 }, 4: { spirit_stones: 4000000 }, 5: { spirit_stones: 8000000 } } }
    ];

    for (const g of gongfaData) {
      await connection.execute(
        `INSERT INTO gongfa (id, name, type, description, rarity, realm_req, level_req, icon, skill_id, set_bonus, base_stats, effects, max_level, upgrade_cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [g.id, g.name, g.type, g.description, g.rarity, g.realm_req, g.level_req, g.icon, g.skill_id, g.set_bonus ? JSON.stringify(g.set_bonus) : null, JSON.stringify(g.base_stats), JSON.stringify(g.effects), g.max_level, JSON.stringify(g.upgrade_cost)]
      );
    }

    console.log('✅ 功法数据种子完成');
  } catch (error) {
    console.error('❌ 种子数据插入失败:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

// 种子数据 - 炼丹系统
async function seedAlchemyData() {
  const connection = await pool.getConnection();
  
  try {
    // 种子药材数据
    const [materialCount] = await connection.execute('SELECT COUNT(*) as count FROM alchemy_materials');
    if (materialCount[0].count === 0) {
      const materials = [
        { id: 'lingzhi', name: '灵芝', type: 'herb', description: '百年灵芝，具有延年益寿之效', rarity: 2, realm_req: 1, icon: '🍄', source: '采集', attributes: { hp: 100, spirit: 50 } },
        { id: 'renshen', name: '人参', type: 'herb', description: '千年老参，大补元气', rarity: 3, realm_req: 2, icon: '🥕', source: '采集', attributes: { hp: 200, atk: 10 } },
        { id: 'huanglian', name: '黄连', type: 'herb', description: '清热解毒的良药', rarity: 1, realm_req: 0, icon: '🌿', source: '采集', attributes: { def: 5 } },
        { id: 'dongguazi', name: '冬瓜子', type: 'herb', description: '润肺止咳的药材', rarity: 1, realm_req: 0, icon: '🌱', source: '采集', attributes: { hp_regen: 5 } },
        { id: 'baishao', name: '白芍', type: 'herb', description: '养血柔肝的药材', rarity: 2, realm_req: 1, icon: '🌸', source: '采集', attributes: { hp: 80, def: 5 } },
        { id: 'chuanxiong', name: '川芎', type: 'herb', description: '活血行气的药材', rarity: 2, realm_req: 1, icon: '🌺', source: '采集', attributes: { atk: 8, speed: 5 } },
        { id: 'gouqi', name: '枸杞', type: 'herb', description: '滋补肝肾，明目养血', rarity: 2, realm_req: 1, icon: '🍒', source: '采集', attributes: { hp: 120, spirit: 30 } },
        { id: 'tianqi', name: '天奇花', type: 'herb', description: '天山雪莲的伴生植物', rarity: 4, realm_req: 3, icon: '❄️', source: '副本掉落', attributes: { all_stats: 20 } },
        { id: 'xuanshen', name: '玄参', type: 'herb', description: '清热凉血，养阴生津', rarity: 3, realm_req: 2, icon: '🫐', source: '采集', attributes: { spirit: 100, hp_regen: 10 } },
        { id: 'shudihuang', name: '熟地黄', type: 'herb', description: '补血滋阴的珍贵药材', rarity: 3, realm_req: 2, icon: '🟤', source: '采集', attributes: { hp: 250, def: 15 } },
        { id: 'linghuahong', name: '凌花红', type: 'herb', description: '高山雪岭的珍稀药材', rarity: 5, realm_req: 5, icon: '🌹', source: '副本掉落', attributes: { atk: 50, crit_rate: 0.05 } },
        { id: 'jiuxiaohua', name: '九霄花', type: 'herb', description: '吸纳天地灵气所化', rarity: 5, realm_req: 5, icon: '✨', source: '副本掉落', attributes: { spirit: 500, exp_rate: 0.1 } },
        { id: 'longgu', name: '龙骨', type: 'mineral', description: '真龙陨落遗留的骨骼', rarity: 4, realm_req: 3, icon: '🦴', source: '副本掉落', attributes: { def: 30, hp: 300 } },
        { id: 'chishizhi', name: '赤石脂', type: 'mineral', description: '蕴含火灵之力的矿石', rarity: 3, realm_req: 2, icon: '💎', source: '采矿', attributes: { fire_dmg: 20 } },
        { id: 'yuanshi', name: '原石', type: 'mineral', description: '未经提炼的矿石', rarity: 1, realm_req: 0, icon: '🪨', source: '采矿', attributes: { def: 3 } },
        { id: 'bailian', name: '白莲', type: 'herb', description: '净化一切邪秽的圣洁之花', rarity: 5, realm_req: 5, icon: '🪷', source: '副本掉落', attributes: { hp: 500, damage_reduction: 0.1 } },
        { id: 'qianye', name: '千叶草', type: 'herb', description: '蕴含千年人参精华', rarity: 4, realm_req: 4, icon: '🍃', source: '采集', attributes: { hp: 400, atk: 25 } },
        { id: 'moyao', name: '魔药', type: 'special', description: '危险的魔法药剂', rarity: 3, realm_req: 2, icon: '🧪', source: '炼金', attributes: { atk: 30, risk: 0.2 } },
        { id: 'fenghuangshi', name: '凤凰石', type: 'mineral', description: '凤凰涅槃遗留的宝石', rarity: 5, realm_req: 6, icon: '🔥', source: '世界Boss', attributes: { fire_dmg: 100, atk: 50 } },
        { id: 'leiyuanshi', name: '雷元石', type: 'mineral', description: '蕴含天雷之力的宝石', rarity: 5, realm_req: 6, icon: '⚡', source: '世界Boss', attributes: { thunder_dmg: 100, crit_rate: 0.1 } }
      ];

      for (const m of materials) {
        await connection.execute(
          `INSERT INTO alchemy_materials (id, name, type, description, rarity, realm_req, icon, source, attributes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [m.id, m.name, m.type, m.description, m.rarity, m.realm_req, m.icon, m.source, JSON.stringify(m.attributes)]
        );
      }
      console.log('✅ 药材数据种子完成');
    }

    // 种子丹方数据
    const [recipeCount] = await connection.execute('SELECT COUNT(*) as count FROM alchemy_recipes');
    if (recipeCount[0].count === 0) {
      const recipes = [
        { id: 'qi_breath_pill', name: '灵气丹', type: 'buff', description: '短时间内提升灵气吸收速度', rarity: 1, realm_req: 0, level_req: 1, icon: '💊', effects: { spirit_rate: 0.2, duration: 300 }, materials: { lingzhi: 1, dongguazi: 2 }, success_rate: 95, crafting_time: 1, yield_min: 1, yield_max: 3 },
        { id: 'hp_pill', name: '血气丹', type: 'restore', description: '恢复大量生命值', rarity: 1, realm_req: 0, level_req: 1, icon: '❤️', effects: { hp_restore: 500 }, materials: { renshen: 2, huanglian: 1 }, success_rate: 95, crafting_time: 1, yield_min: 1, yield_max: 2 },
        { id: 'attack_pill', name: '力量丹', type: 'buff', description: '短时间内提升攻击力', rarity: 2, realm_req: 1, level_req: 10, icon: '⚔️', effects: { atk: 50, duration: 600 }, materials: { renshen: 3, chuanxiong: 2, huanglian: 1 }, success_rate: 85, crafting_time: 2, yield_min: 1, yield_max: 2 },
        { id: 'defense_pill', name: '铁甲丹', type: 'buff', description: '短时间内提升防御力', rarity: 2, realm_req: 1, level_req: 10, icon: '🛡️', effects: { def: 30, duration: 600 }, materials: { baishao: 3, yuanshi: 3, huanglian: 1 }, success_rate: 85, crafting_time: 2, yield_min: 1, yield_max: 2 },
        { id: 'spirit_pill', name: '灵神丹', type: 'buff', description: '短时间内提升神识强度', rarity: 2, realm_req: 2, level_req: 15, icon: '🧠', effects: { spirit: 100, duration: 600 }, materials: { lingzhi: 2, gouqi: 3, xuanshen: 2 }, success_rate: 80, crafting_time: 2, yield_min: 1, yield_max: 2 },
        { id: 'realm_breaking_pill', name: '破境丹', type: 'special', description: '帮助突破境界瓶颈', rarity: 3, realm_req: 2, level_req: 20, icon: '🌟', effects: { realm_break_bonus: 0.3 }, materials: { tianqi: 2, xuanshen: 3, shudihuang: 3 }, success_rate: 60, crafting_time: 5, yield_min: 1, yield_max: 1 },
        { id: 'fire_enhance_pill', name: '烈焰丹', type: 'buff', description: '增强火焰伤害', rarity: 3, realm_req: 3, level_req: 30, icon: '🔥', effects: { fire_dmg: 50, duration: 1800 }, materials: { chishizhi: 3, tianqi: 2, moyao: 2 }, success_rate: 70, crafting_time: 3, yield_min: 1, yield_max: 1 },
        { id: 'thunder_enhance_pill', name: '奔雷丹', type: 'buff', description: '增强雷系伤害和暴击率', rarity: 4, realm_req: 4, level_req: 40, icon: '⚡', effects: { thunder_dmg: 80, crit_rate: 0.08, duration: 1800 }, materials: { leiyuanshi: 2, tianqi: 3, lingzhi: 3 }, success_rate: 60, crafting_time: 5, yield_min: 1, yield_max: 1 },
        { id: 'immortal_pill', name: '仙丹', type: 'special', description: '大幅提升全属性', rarity: 5, realm_req: 5, level_req: 50, icon: '🏆', effects: { all_stats: 100, exp_rate: 0.2 }, materials: { bailian: 1, linghuahong: 1, jiuxiaohua: 1, fenghuangshi: 1, leiyuanshi: 1 }, success_rate: 30, crafting_time: 10, yield_min: 1, yield_max: 1 },
        { id: 'speed_pill', name: '疾风丹', type: 'buff', description: '提升移动和攻击速度', rarity: 2, realm_req: 1, level_req: 12, icon: '💨', effects: { speed: 30, duration: 600 }, materials: { dongguazi: 3, baishao: 2 }, success_rate: 85, crafting_time: 2, yield_min: 1, yield_max: 3 },
        { id: 'crit_pill', name: '暴击丹', type: 'buff', description: '提升暴击率和暴击伤害', rarity: 3, realm_req: 3, level_req: 25, icon: '💥', effects: { crit_rate: 0.1, crit_dmg: 0.3, duration: 900 }, materials: { linghuahong: 2, tianqi: 2, chishizhi: 2 }, success_rate: 65, crafting_time: 3, yield_min: 1, yield_max: 1 },
        { id: 'health_boost_pill', name: '气血升仙丹', type: 'passive', description: '永久提升最大生命值', rarity: 4, realm_req: 4, level_req: 35, icon: '💖', effects: { max_hp: 500, hp_regen: 10 }, materials: { qianye: 3, renshen: 3, shudihuang: 3, longgu: 2 }, success_rate: 50, crafting_time: 5, yield_min: 1, yield_max: 1 },
        { id: 'purification_pill', name: '清心丹', type: 'special', description: '清除所有负面状态', rarity: 2, realm_req: 1, level_req: 8, icon: '🧘', effects: { cleanse: true, duration: 0 }, materials: { baishao: 2, huanglian: 3 }, success_rate: 90, crafting_time: 1, yield_min: 2, yield_max: 4 },
        { id: 'philosopher_stone', name: '贤者之石', type: 'special', description: '传说中的至高炼金产物', rarity: 5, realm_req: 6, level_req: 60, icon: '💎', effects: { all_stats: 500, exp_rate: 0.5, realm_break_bonus: 0.5 }, materials: { bailian: 2, fenghuangshi: 2, leiyuanshi: 2, jiuxiaohua: 2, linghuahong: 2 }, success_rate: 10, crafting_time: 30, yield_min: 1, yield_max: 1 }
      ];

      for (const r of recipes) {
        await connection.execute(
          `INSERT INTO alchemy_recipes (id, name, type, description, rarity, realm_req, level_req, icon, effects, materials, success_rate, crafting_time, yield_min, yield_max) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [r.id, r.name, r.type, r.description, r.rarity, r.realm_req, r.level_req, r.icon, JSON.stringify(r.effects), JSON.stringify(r.materials), r.success_rate, r.crafting_time, r.yield_min, r.yield_max]
        );
      }
      console.log('✅ 丹方数据种子完成');
    }
  } catch (error) {
    console.error('❌ 炼丹种子数据插入失败:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

// 装备配方种子数据
async function seedEquipmentData() {
  const connection = await pool.getConnection();
  
  try {
    // 检查是否已有数据
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM equipment_recipes');
    if (rows[0].count > 0) return;

    const equipmentData = [
      // 武器
      { id: 'iron_sword', name: '铁剑', type: 'weapon', rarity: 1, level_req: 1, realm_req: 0, icon: '⚔️', description: '最基础的铁制长剑', base_stats: { atk: 10 }, materials: { iron_ingot: 3 }, success_rate: 100 },
      { id: 'steel_sword', name: '钢剑', type: 'weapon', rarity: 2, level_req: 10, realm_req: 1, icon: '⚔️', description: '精炼钢打造的剑', base_stats: { atk: 25 }, materials: { steel_ingot: 5, iron_ingot: 3 }, success_rate: 90 },
      { id: 'spirit_sword', name: '灵剑', type: 'weapon', rarity: 3, level_req: 25, realm_req: 2, icon: '⚔️', description: '蕴含灵气的法剑', base_stats: { atk: 50, spirit: 20 }, materials: { spirit_crystal: 3, steel_ingot: 5 }, success_rate: 80 },
      { id: 'flame_sword', name: '烈焰剑', type: 'weapon', rarity: 4, level_req: 40, realm_req: 4, icon: '🔥', description: '附有火焰之力的宝剑', base_stats: { atk: 100, fire_dmg: 30 }, materials: { fire_essence: 3, spirit_crystal: 5, steel_ingot: 10 }, success_rate: 70 },
      { id: 'thunder_blade', name: '惊雷刀', type: 'weapon', rarity: 4, level_req: 45, realm_req: 5, icon: '⚡', description: '引动天雷的神兵', base_stats: { atk: 120, thunder_dmg: 40, crit_rate: 0.1 }, materials: { thunder_essence: 3, spirit_crystal: 8, fire_essence: 3 }, success_rate: 65 },
      { id: 'immortal_sword', name: '仙剑', type: 'weapon', rarity: 5, level_req: 70, realm_req: 7, icon: '✨', description: '蕴含仙灵之气的无上飞剑', base_stats: { atk: 200, all_stats: 50 }, materials: { immortal_essence: 1, thunder_essence: 5, fire_essence: 5, spirit_crystal: 10 }, success_rate: 50 },
      
      // 防具
      { id: 'leather_armor', name: '皮甲', type: 'armor', rarity: 1, level_req: 1, realm_req: 0, icon: '🛡️', description: '简单的皮革护甲', base_stats: { def: 5 }, materials: { leather: 3 }, success_rate: 100 },
      { id: 'iron_armor', name: '铁甲', type: 'armor', rarity: 2, level_req: 10, realm_req: 1, icon: '🛡️', description: '铁片制成的护甲', base_stats: { def: 15, hp: 50 }, materials: { iron_ingot: 5, leather: 3 }, success_rate: 90 },
      { id: 'spirit_armor', name: '灵甲', type: 'armor', rarity: 3, level_req: 25, realm_req: 2, icon: '🛡️', description: '刻有防护阵法的铠甲', base_stats: { def: 35, hp: 100, damage_reduction: 0.05 }, materials: { spirit_crystal: 3, iron_ingot: 8 }, success_rate: 80 },
      { id: 'jade_armor', name: '玉清甲', type: 'armor', rarity: 4, level_req: 45, realm_req: 5, icon: '💎', description: '玉石精英打造的护甲', base_stats: { def: 70, hp: 200, damage_reduction: 0.1 }, materials: { jade: 5, spirit_crystal: 8, iron_ingot: 10 }, success_rate: 70 },
      { id: 'immortal_robe', name: '仙袍', type: 'armor', rarity: 5, level_req: 70, realm_req: 7, icon: '🏔️', description: '仙人所穿的法袍', base_stats: { def: 120, hp: 500, damage_reduction: 0.15, all_stats: 30 }, materials: { immortal_essence: 1, jade: 8, spirit_crystal: 10 }, success_rate: 50 },
      
      // 饰品
      { id: 'spirit_ring', name: '灵戒', type: 'accessory', rarity: 2, level_req: 5, realm_req: 0, icon: '💍', description: '蕴含微量灵气的戒指', base_stats: { spirit: 10 }, materials: { spirit_crystal: 1 }, success_rate: 95 },
      { id: 'health_pendant', name: '生命玉', type: 'accessory', rarity: 2, level_req: 10, realm_req: 1, icon: '📿', description: '可储存生命力的玉佩', base_stats: { hp: 50, hp_regen: 5 }, materials: { jade: 2, spirit_crystal: 1 }, success_rate: 90 },
      { id: 'attack_badge', name: '攻击令', type: 'accessory', rarity: 3, level_req: 20, realm_req: 2, icon: '⚔️', description: '增强攻击力的令牌', base_stats: { atk: 20, crit_rate: 0.05 }, materials: { iron_ingot: 5, spirit_crystal: 3 }, success_rate: 85 },
      { id: 'thunder_brace', name: '雷击镯', type: 'accessory', rarity: 4, level_req: 40, realm_req: 4, icon: '⚡', description: '可引动雷电的手镯', base_stats: { atk: 40, thunder_dmg: 20, crit_rate: 0.08 }, materials: { thunder_essence: 3, spirit_crystal: 5 }, success_rate: 75 },
      { id: 'immortal_amulet', name: '仙符', type: 'accessory', rarity: 5, level_req: 65, realm_req: 7, icon: '✨', description: '蕴含仙力的护身符', base_stats: { all_stats: 30, damage_reduction: 0.1, hp_regen: 20 }, materials: { immortal_essence: 1, thunder_essence: 3, jade: 5 }, success_rate: 55 }
    ];

    for (const e of equipmentData) {
      await connection.execute(
        `INSERT INTO equipment_recipes (id, name, type, rarity, level_req, realm_req, icon, description, base_stats, materials, success_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [e.id, e.name, e.type, e.rarity, e.level_req, e.realm_req, e.icon, e.description, JSON.stringify(e.base_stats), JSON.stringify(e.materials), e.success_rate]
      );
    }

    // 强化材料种子数据
    const enhancementData = [
      { id: 'iron_ingot', name: '铁锭', type: 'metal', rarity: 1, level_req: 1, icon: '🧱', description: '最基础的金属材料', stats_bonus: { atk: 1, def: 1 }, drop_source: '矿石采集' },
      { id: 'steel_ingot', name: '钢锭', type: 'metal', rarity: 2, level_req: 10, icon: '🧱', description: '精炼后的金属', stats_bonus: { atk: 3, def: 2 }, drop_source: '矿石精炼' },
      { id: 'spirit_crystal', name: '灵石', type: 'crystal', rarity: 2, level_req: 15, icon: '💎', description: '蕴含灵气的晶体', stats_bonus: { spirit: 10, atk: 2 }, drop_source: '矿脉挖掘' },
      { id: 'leather', name: '兽皮', type: 'material', rarity: 1, level_req: 1, icon: '📜', description: '普通野兽的皮毛', stats_bonus: { def: 1, hp: 10 }, drop_source: '猎杀野兽' },
      { id: 'jade', name: '玉石', type: 'gem', rarity: 3, level_req: 25, icon: '💚', description: '蕴含灵力的玉石', stats_bonus: { def: 5, hp: 30, damage_reduction: 0.02 }, drop_source: '玉矿挖掘' },
      { id: 'fire_essence', name: '火精', type: 'essence', rarity: 4, level_req: 35, icon: '🔥', description: '火焰精华凝结而成', stats_bonus: { atk: 10, fire_dmg: 15 }, drop_source: '火山遗迹' },
      { id: 'thunder_essence', name: '雷精', type: 'essence', rarity: 4, level_req: 40, icon: '⚡', description: '雷电精华凝结而成', stats_bonus: { atk: 12, thunder_dmg: 20, crit_rate: 0.03 }, drop_source: '雷劫区域' },
      { id: 'immortal_essence', name: '仙精', type: 'essence', rarity: 5, level_req: 60, icon: '✨', description: '仙人陨落后留下的精华', stats_bonus: { all_stats: 20, damage_reduction: 0.05 }, drop_source: '仙府遗迹' }
    ];

    for (const m of enhancementData) {
      await connection.execute(
        `INSERT INTO enhancement_materials (id, name, type, rarity, level_req, icon, description, stats_bonus, drop_source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [m.id, m.name, m.type, m.rarity, m.level_req, m.icon, m.description, JSON.stringify(m.stats_bonus), m.drop_source]
      );
    }

    console.log('✅ 炼器数据种子完成');
  } catch (error) {
    console.error('❌ 炼器种子数据插入失败:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

// 数据库迁移 - 添加缺失的列
async function runMigrations() {
  const connection = await pool.getConnection();
  try {
    // 检查并添加 qianghua_stones 列
    const [columns] = await connection.execute('SHOW COLUMNS FROM player LIKE "qianghua_stones"');
    if (columns.length === 0) {
      await connection.execute('ALTER TABLE player ADD COLUMN qianghua_stones INT DEFAULT 0');
      console.log('✅ 迁移: 已添加 qianghua_stones 列到 player 表');
    }
    
    console.log('✅ 数据库迁移完成');
  } catch (error) {
    console.error('❌ 数据库迁移失败:', error.message);
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  testConnection,
  initDatabase,
  seedGongfaData,
  seedAlchemyData,
  seedEquipmentData,
  runMigrations,
  updatePlayerQianghuaStones,
  getPlayerQianghuaStones
};
