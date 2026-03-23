/**
 * 器灵系统存储层
 * 器灵是装备在武器上的灵体，提供额外属性和特殊效果
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

// 初始化器灵相关表
function initSpiritArtifactTables() {
  const database = getDb();
  
  // 器灵定义表
  database.exec(`
    CREATE TABLE IF NOT EXISTS spirit_artifacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      rarity TEXT NOT NULL,
      description TEXT,
      base_attributes TEXT,
      special_effect TEXT,
      unlock_level INTEGER DEFAULT 1,
      unlock_realm INTEGER DEFAULT 1,
      image_url TEXT
    )
  `);
  
  // 玩家器灵表
  database.exec(`
    CREATE TABLE IF NOT EXISTS player_spirit_artifacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      artifact_id INTEGER NOT NULL,
      level INTEGER DEFAULT 1,
      exp INTEGER DEFAULT 0,
      is_equipped INTEGER DEFAULT 0,
      equipped_slot TEXT,
      obtained_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, artifact_id)
    )
  `);
  
  console.log('✅ 器灵表初始化完成');
}

// 器灵配置数据
const SPIRIT_ARTIFACTS = [
  // 稀有器灵
  {
    id: 1,
    name: '小火灵',
    type: 'fire',
    rarity: 'rare',
    description: '蕴含火焰之力的灵体',
    base_attributes: { attack: 50, crit: 3 },
    special_effect: 'fire_damage',
    unlock_level: 10,
    unlock_realm: 1
  },
  {
    id: 2,
    name: '小冰灵',
    type: 'ice',
    rarity: 'rare',
    description: '蕴含冰霜之力的灵体',
    base_attributes: { defense: 40, hp: 200 },
    special_effect: 'ice_shield',
    unlock_level: 10,
    unlock_realm: 1
  },
  // 史诗器灵
  {
    id: 3,
    name: '雷鸣兽',
    type: 'thunder',
    rarity: 'epic',
    description: '掌控雷电的远古灵兽',
    base_attributes: { attack: 120, speed: 15, crit: 5 },
    special_effect: 'thunder_strike',
    unlock_level: 30,
    unlock_realm: 2
  },
  {
    id: 4,
    name: '碧睛虎',
    type: 'wind',
    rarity: 'epic',
    description: '风之化身的高速灵兽',
    base_attributes: { speed: 30, dodge: 8, attack: 80 },
    special_effect: 'wind_rush',
    unlock_level: 30,
    unlock_realm: 2
  },
  // 传说器灵
  {
    id: 5,
    name: '青龙魂',
    type: 'dragon',
    rarity: 'legendary',
    description: '东方神龙的灵魂碎片',
    base_attributes: { attack: 250, crit: 15, crit_damage: 30 },
    special_effect: 'dragon_blood',
    unlock_level: 50,
    unlock_realm: 4
  },
  {
    id: 6,
    name: '白虎魄',
    type: 'metal',
    rarity: 'legendary',
    description: '西方神虎的灵魂碎片',
    base_attributes: { defense: 200, hp: 1000, dodge: 10 },
    special_effect: 'metal_body',
    unlock_level: 50,
    unlock_realm: 4
  },
  // 神话器灵
  {
    id: 7,
    name: '混沌之灵',
    type: 'chaos',
    rarity: 'mythic',
    description: '天地初开时的原始灵体',
    base_attributes: { attack: 500, defense: 300, hp: 2000, speed: 20 },
    special_effect: 'chaos_blessing',
    unlock_level: 80,
    unlock_realm: 6
  }
];

// 稀有度配置
const RARITY_CONFIG = {
  common: { color: '#94a3b8', bonus: 1.0 },
  uncommon: { color: '#22c55e', bonus: 1.2 },
  rare: { color: '#3b82f6', bonus: 1.5 },
  epic: { color: '#a855f7', bonus: 2.0 },
  legendary: { color: '#f59e0b', bonus: 3.0 },
  mythic: { color: '#ef4444', bonus: 5.0 }
};

// 存储层
const spiritArtifactStorage = {
  // 获取所有器灵配置
  getAllArtifacts() {
    return SPIRIT_ARTIFACTS.map(a => ({
      id: a.id,
      name: a.name,
      type: a.type,
      rarity: a.rarity,
      description: a.description,
      base_attributes: a.base_attributes,
      special_effect: a.special_effect,
      unlock_level: a.unlock_level,
      unlock_realm: a.unlock_realm,
      rarity_config: RARITY_CONFIG[a.rarity]
    }));
  },
  
  // 获取玩家可解锁的器灵
  getUnlockedArtifacts(playerId) {
    const database = getDb();
    const player = database.prepare('SELECT level, realm FROM player WHERE id = ?').get(playerId);
    
    if (!player) return [];
    
    return SPIRIT_ARTIFACTS.filter(a => 
      player.level >= a.unlock_level && player.realm >= a.unlock_realm
    );
  },
  
  // 获取玩家的器灵列表
  getPlayerArtifacts(playerId) {
    const database = getDb();
    
    // 获取玩家拥有的器灵
    const owned = database.prepare(`
      SELECT psa.*, sa.name, sa.type, sa.rarity, sa.description, 
             sa.base_attributes, sa.special_effect
      FROM player_spirit_artifacts psa
      JOIN spirit_artifacts sa ON psa.artifact_id = sa.id
      WHERE psa.player_id = ?
    `).all(playerId);
    
    return owned.map(a => ({
      ...a,
      base_attributes: JSON.parse(a.base_attributes || '{}'),
      is_equipped: !!a.is_equipped
    }));
  },
  
  // 获取玩家已装备的器灵
  getEquippedArtifacts(playerId) {
    const database = getDb();
    
    const equipped = database.prepare(`
      SELECT psa.*, sa.name, sa.type, sa.rarity, sa.base_attributes, sa.special_effect
      FROM player_spirit_artifacts psa
      JOIN spirit_artifacts sa ON psa.artifact_id = sa.id
      WHERE psa.player_id = ? AND psa.is_equipped = 1
    `).all(playerId);
    
    return equipped.map(a => ({
      ...a,
      base_attributes: JSON.parse(a.base_attributes || '{}')
    }));
  },
  
  // 激活器灵（获取）
  acquireArtifact(playerId, artifactId) {
    const database = getDb();
    
    // 检查是否已拥有
    const existing = database.prepare(
      'SELECT * FROM player_spirit_artifacts WHERE player_id = ? AND artifact_id = ?'
    ).get(playerId, artifactId);
    
    if (existing) {
      return { success: false, error: '已拥有该器灵' };
    }
    
    // 检查器灵是否存在
    const artifact = SPIRIT_ARTIFACTS.find(a => a.id === artifactId);
    if (!artifact) {
      return { success: false, error: '器灵不存在' };
    }
    
    // 添加器灵
    database.prepare(`
      INSERT INTO player_spirit_artifacts (player_id, artifact_id, level, exp)
      VALUES (?, ?, 1, 0)
    `).run(playerId, artifactId);
    
    return { 
      success: true, 
      data: { artifact: artifact }
    };
  },
  
  // 装备器灵
  equipArtifact(playerId, artifactId, slot = 'weapon') {
    const database = getDb();
    
    // 检查是否拥有该器灵
    const owned = database.prepare(
      'SELECT * FROM player_spirit_artifacts WHERE player_id = ? AND artifact_id = ?'
    ).get(playerId, artifactId);
    
    if (!owned) {
      return { success: false, error: '未拥有该器灵' };
    }
    
    // 卸下同槽位的其他器灵
    database.prepare(`
      UPDATE player_spirit_artifacts 
      SET is_equipped = 0, equipped_slot = NULL
      WHERE player_id = ? AND equipped_slot = ? AND is_equipped = 1
    `).run(playerId, slot);
    
    // 装备该器灵
    database.prepare(`
      UPDATE player_spirit_artifacts 
      SET is_equipped = 1, equipped_slot = ?
      WHERE player_id = ? AND artifact_id = ?
    `).run(slot, playerId, artifactId);
    
    return { success: true };
  },
  
  // 卸下器灵
  unequipArtifact(playerId, artifactId) {
    const database = getDb();
    
    database.prepare(`
      UPDATE player_spirit_artifacts 
      SET is_equipped = 0, equipped_slot = NULL
      WHERE player_id = ? AND artifact_id = ?
    `).run(playerId, artifactId);
    
    return { success: true };
  },
  
  // 器灵升级
  upgradeArtifact(playerId, artifactId) {
    const database = getDb();
    
    const owned = database.prepare(
      'SELECT * FROM player_spirit_artifacts WHERE player_id = ? AND artifact_id = ?'
    ).get(playerId, artifactId);
    
    if (!owned) {
      return { success: false, error: '未拥有该器灵' };
    }
    
    const artifact = SPIRIT_ARTIFACTS.find(a => a.id === artifactId);
    if (!artifact) {
      return { success: false, error: '器灵不存在' };
    }
    
    // 升级消耗
    const upgradeCost = Math.floor(100 * Math.pow(1.5, owned.level));
    
    // 检查玩家灵石
    const player = database.prepare('SELECT spirit_stones FROM player WHERE id = ?').get(playerId);
    if (player.spirit_stones < upgradeCost) {
      return { success: false, error: '灵石不足' };
    }
    
    // 扣除灵石并升级
    database.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?')
      .run(upgradeCost, playerId);
    
    const newLevel = owned.level + 1;
    database.prepare(`
      UPDATE player_spirit_artifacts SET level = ? WHERE player_id = ? AND artifact_id = ?
    `).run(newLevel, playerId, artifactId);
    
    // 计算新属性
    const levelBonus = 1 + (newLevel - 1) * 0.1;
    const newAttributes = {};
    Object.entries(artifact.base_attributes).forEach(([key, value]) => {
      newAttributes[key] = Math.floor(value * levelBonus);
    });
    
    return {
      success: true,
      data: {
        old_level: owned.level,
        new_level: newLevel,
        cost: upgradeCost,
        attributes: newAttributes
      }
    };
  },
  
  // 计算器灵总属性加成
  getTotalBonus(playerId) {
    const equipped = this.getEquippedArtifacts(playerId);
    const totals = {};
    
    equipped.forEach(artifact => {
      const rarity = RARITY_CONFIG[artifact.rarity];
      const levelBonus = 1 + (artifact.level - 1) * 0.1;
      
      Object.entries(artifact.base_attributes).forEach(([key, value]) => {
        const finalValue = Math.floor(value * levelBonus * rarity.bonus);
        totals[key] = (totals[key] || 0) + finalValue;
      });
    });
    
    return totals;
  },
  
  // 初始化器灵数据
  seedArtifacts() {
    const database = getDb();
    
    // 检查是否已有数据
    const count = database.prepare('SELECT COUNT(*) as count FROM spirit_artifacts').get();
    
    if (count.count === 0) {
      // 插入器灵数据
      const stmt = database.prepare(`
        INSERT INTO spirit_artifacts (name, type, rarity, description, base_attributes, special_effect, unlock_level, unlock_realm)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      SPIRIT_ARTIFACTS.forEach(a => {
        stmt.run(
          a.name, a.type, a.rarity, a.description,
          JSON.stringify(a.base_attributes), a.special_effect,
          a.unlock_level, a.unlock_realm
        );
      });
      
      console.log('✅ 器灵种子数据已插入');
    }
  }
};

// 初始化
initSpiritArtifactTables();
spiritArtifactStorage.seedArtifacts();

module.exports = { spiritArtifactStorage, SPIRIT_ARTIFACTS, RARITY_CONFIG };
