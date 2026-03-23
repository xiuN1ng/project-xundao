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

    console.log('✅ 数据库表初始化完成');
  } catch (error) {
    console.error('❌ 数据库表初始化失败:', error.message);
    throw error;
  } finally {
    connection.release();
  }
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

module.exports = {
  pool,
  testConnection,
  initDatabase,
  seedGongfaData
};
