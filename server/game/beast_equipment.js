/**
 * 灵兽装备系统 API
 * 灵兽装备：装备、坐骑、饰品
 * 功能：穿戴、卸下、强化、合成
 */

/**
 * 灵兽装备系统 API (独立SQLite版本)
 * 灵兽装备：装备、坐骑、饰品
 * 功能：穿戴、卸下、强化、合成
 */

const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');

// 独立数据库连接
let db = null;

function getDb() {
  if (!db) {
    const dbPath = path.join(__dirname, '..', 'backend', 'data', 'game.db');
    db = new Database(dbPath);
    initTables();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS beast_equipment_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      equipment_id TEXT NOT NULL,
      enhance_level INTEGER DEFAULT 0,
      obtained_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, equipment_id)
    )
  `);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS beast_equipment_equipped (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      beast_db_id INTEGER NOT NULL,
      gear_id TEXT,
      mount_id TEXT,
      accessory_id TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, beast_db_id)
    )
  `);
}

// ============ 灵兽装备配置数据 ============

// 灵兽装备类型
const EQUIPMENT_TYPES = {
  gear: { name: '装备', slot: 'gear', icon: '⚔️' },
  mount: { name: '坐骑', slot: 'mount', icon: '🐎' },
  accessory: { name: '饰品', slot: 'accessory', icon: '💍' }
};

// 灵兽装备稀有度
const EQUIPMENT_QUALITY = {
  common: { name: '普通', color: '#8B8B8B', bonus: 1.0 },
  uncommon: { name: '优秀', color: '#00FF7F', bonus: 1.2 },
  rare: { name: '稀有', color: '#1E90FF', bonus: 1.5 },
  epic: { name: '史诗', color: '#9932CC', bonus: 2.0 },
  legendary: { name: '传说', color: '#FFD700', bonus: 3.0 },
  mythical: { name: '神话', color: '#FF4500', bonus: 5.0 }
};

// 灵兽装备数据模板
const BEAST_EQUIPMENT_DATA = {
  // 装备类型
  'beast_gear_common': {
    id: 'beast_gear_common',
    name: '灵兽护甲',
    type: 'gear',
    quality: 'common',
    icon: '🛡️',
    atk_bonus: 10,
    hp_bonus: 50,
    description: '基础的灵兽护甲',
    level_req: 1
  },
  'beast_gear_uncommon': {
    id: 'beast_gear_uncommon',
    name: '精炼兽甲',
    type: 'gear',
    quality: 'uncommon',
    icon: '🛡️',
    atk_bonus: 25,
    hp_bonus: 120,
    description: '精炼过的灵兽护甲',
    level_req: 10
  },
  'beast_gear_rare': {
    id: 'beast_gear_rare',
    name: '镶嵌兽甲',
    type: 'gear',
    quality: 'rare',
    icon: '🛡️',
    atk_bonus: 60,
    hp_bonus: 300,
    description: '镶嵌了宝石的灵兽护甲',
    level_req: 25
  },
  'beast_gear_epic': {
    id: 'beast_gear_epic',
    name: '灵器兽甲',
    type: 'gear',
    quality: 'epic',
    icon: '🛡️',
    atk_bonus: 150,
    hp_bonus: 750,
    description: '蕴含灵气的护甲',
    level_req: 40
  },
  'beast_gear_legendary': {
    id: 'beast_gear_legendary',
    name: '仙器兽甲',
    type: 'gear',
    quality: 'legendary',
    icon: '🛡️',
    atk_bonus: 400,
    hp_bonus: 2000,
    description: '仙人打造的护甲',
    level_req: 60
  },
  
  // 坐骑类型
  'beast_mount_common': {
    id: 'beast_mount_common',
    name: '普通坐骑',
    type: 'mount',
    quality: 'common',
    icon: '🐴',
    atk_bonus: 5,
    hp_bonus: 30,
    speed_bonus: 10,
    description: '普通的出行坐骑',
    level_req: 1
  },
  'beast_mount_uncommon': {
    id: 'beast_mount_uncommon',
    name: '疾风马',
    type: 'mount',
    quality: 'uncommon',
    icon: '🐎',
    atk_bonus: 15,
    hp_bonus: 80,
    speed_bonus: 25,
    description: '奔跑如风的骏马',
    level_req: 15
  },
  'beast_mount_rare': {
    id: 'beast_mount_rare',
    name: '云雾兽',
    type: 'mount',
    quality: 'rare',
    icon: '🦄',
    atk_bonus: 40,
    hp_bonus: 200,
    speed_bonus: 50,
    description: '能腾云驾雾的灵兽',
    level_req: 30
  },
  'beast_mount_epic': {
    id: 'beast_mount_epic',
    name: '御天兽',
    type: 'mount',
    quality: 'epic',
    icon: '🦅',
    atk_bonus: 100,
    hp_bonus: 500,
    speed_bonus: 80,
    description: '可御空飞行的神兽',
    level_req: 50
  },
  'beast_mount_legendary': {
    id: 'beast_mount_legendary',
    name: '九龙辇',
    type: 'mount',
    quality: 'legendary',
    icon: '🐉',
    atk_bonus: 250,
    hp_bonus: 1500,
    speed_bonus: 150,
    description: '九龙拉车，极品仙辇',
    level_req: 70
  },
  
  // 饰品类型
  'beast_accessory_common': {
    id: 'beast_accessory_common',
    name: '灵兽铃铛',
    type: 'accessory',
    quality: 'common',
    icon: '🔔',
    atk_bonus: 8,
    hp_bonus: 40,
    crit_bonus: 1,
    description: '基础的灵兽饰品',
    level_req: 1
  },
  'beast_accessory_uncommon': {
    id: 'beast_accessory_uncommon',
    name: '灵气玉佩',
    type: 'accessory',
    quality: 'uncommon',
    icon: '🪙',
    atk_bonus: 20,
    hp_bonus: 100,
    crit_bonus: 3,
    description: '蕴含灵气的玉佩',
    level_req: 12
  },
  'beast_accessory_rare': {
    id: 'beast_accessory_rare',
    name: '仙兽之魂',
    type: 'accessory',
    quality: 'rare',
    icon: '💎',
    atk_bonus: 50,
    hp_bonus: 250,
    crit_bonus: 5,
    description: '仙兽灵魂所化',
    level_req: 28
  },
  'beast_accessory_epic': {
    id: 'beast_accessory_epic',
    name: '神兽精魄',
    type: 'accessory',
    quality: 'epic',
    icon: '🔮',
    atk_bonus: 120,
    hp_bonus: 600,
    crit_bonus: 10,
    description: '神兽精华凝聚',
    level_req: 45
  },
  'beast_accessory_legendary': {
    id: 'beast_accessory_legendary',
    name: '混沌珠',
    type: 'accessory',
    quality: 'legendary',
    icon: '⚫',
    atk_bonus: 300,
    hp_bonus: 1800,
    crit_bonus: 20,
    description: '混沌至宝',
    level_req: 65
  }
};

// 强化成功率配置
const ENHANCE_SUCCESS_RATES = {
  1: 0.9,   // +1: 90%
  2: 0.8,   // +2: 80%
  3: 0.7,   // +3: 70%
  4: 0.6,   // +4: 60%
  5: 0.5,   // +5: 50%
  6: 0.4,   // +6: 40%
  7: 0.3,   // +7: 30%
  8: 0.2,   // +8: 20%
  9: 0.1,   // +9: 10%
  10: 0.05  // +10: 5%
};

// 强化消耗
const ENHANCE_COST = {
  spirit_stones: [100, 300, 700, 1500, 3000, 6000, 12000, 25000, 50000, 100000],
  materials: {
    common: ['enhance_stone_1', 'enhance_stone_1', 'enhance_stone_1'],
    uncommon: ['enhance_stone_2', 'enhance_stone_2'],
    rare: ['enhance_stone_3'],
    epic: ['enhance_stone_4'],
    legendary: ['enhance_stone_5']
  }
};

// 合成配方
const SYNTHESIS_RECIPES = {
  'beast_gear_rare': {
    ingredients: ['beast_gear_uncommon', 'beast_gear_uncommon', 'enhance_stone_3'],
    success_rate: 0.6,
    cost: 2000
  },
  'beast_gear_epic': {
    ingredients: ['beast_gear_rare', 'beast_gear_rare', 'enhance_stone_4'],
    success_rate: 0.4,
    cost: 8000
  },
  'beast_gear_legendary': {
    ingredients: ['beast_gear_epic', 'beast_gear_epic', 'enhance_stone_5'],
    success_rate: 0.2,
    cost: 50000
  },
  'beast_mount_rare': {
    ingredients: ['beast_mount_uncommon', 'beast_mount_uncommon', 'enhance_stone_3'],
    success_rate: 0.6,
    cost: 2000
  },
  'beast_mount_epic': {
    ingredients: ['beast_mount_rare', 'beast_mount_rare', 'enhance_stone_4'],
    success_rate: 0.4,
    cost: 8000
  },
  'beast_mount_legendary': {
    ingredients: ['beast_mount_epic', 'beast_mount_epic', 'enhance_stone_5'],
    success_rate: 0.2,
    cost: 50000
  },
  'beast_accessory_rare': {
    ingredients: ['beast_accessory_uncommon', 'beast_accessory_uncommon', 'enhance_stone_3'],
    success_rate: 0.6,
    cost: 2000
  },
  'beast_accessory_epic': {
    ingredients: ['beast_accessory_rare', 'beast_accessory_rare', 'enhance_stone_4'],
    success_rate: 0.4,
    cost: 8000
  },
  'beast_accessory_legendary': {
    ingredients: ['beast_accessory_epic', 'beast_accessory_epic', 'enhance_stone_5'],
    success_rate: 0.2,
    cost: 50000
  }
};

// ============ 辅助函数 ============

// 初始化玩家灵兽装备数据
function initPlayerBeastEquipment(player) {
  if (!player.beast_equipment) {
    player.beast_equipment = {
      inventory: [],  // 背包中的装备
      equipped: {}   // 已穿戴的装备 { beastIndex: { gear: null, mount: null, accessory: null } }
    };
  }
  return player.beast_equipment;
}

// 获取装备属性
function getEquipmentStats(equipment) {
  if (!equipment) return null;
  
  const template = BEAST_EQUIPMENT_DATA[equipment.id];
  if (!template) return null;
  
  const quality = EQUIPMENT_QUALITY[template.quality];
  const enhanceBonus = 1 + (equipment.enhance_level || 0) * 0.1;
  
  return {
    id: equipment.id,
    name: template.name,
    type: template.type,
    quality: template.quality,
    quality_name: quality?.name || template.quality,
    icon: template.icon,
    enhance_level: equipment.enhance_level || 0,
    atk_bonus: Math.floor((template.atk_bonus || 0) * quality.bonus * enhanceBonus),
    hp_bonus: Math.floor((template.hp_bonus || 0) * quality.bonus * enhanceBonus),
    speed_bonus: Math.floor((template.speed_bonus || 0) * quality.bonus * enhanceBonus),
    crit_bonus: (template.crit_bonus || 0) * quality.bonus,
    description: template.description,
    level_req: template.level_req
  };
}

// ============ API 路由 ============

// 获取灵兽装备列表
router.get('/list', (req, res) => {
  try {
    const database = getDb();
    const { player_id, type, quality } = req.query;
    
    // 获取玩家背包中的装备
    let ownedIds = new Set();
    if (player_id) {
      const owned = database.prepare('SELECT equipment_id FROM beast_equipment_inventory WHERE player_id = ?').all(player_id);
      ownedIds = new Set(owned.map(e => e.equipment_id));
    }
    
    // 获取装备模板列表
    let equipmentList = Object.values(BEAST_EQUIPMENT_DATA);
    
    if (type) {
      equipmentList = equipmentList.filter(e => e.type === type);
    }
    
    if (quality) {
      equipmentList = equipmentList.filter(e => e.quality === quality);
    }
    
    const result = equipmentList.map(equip => {
      const qual = EQUIPMENT_QUALITY[equip.quality];
      return {
        id: equip.id,
        name: equip.name,
        type: equip.type,
        type_name: EQUIPMENT_TYPES[equip.type]?.name || equip.type,
        quality: equip.quality,
        quality_name: qual?.name || equip.quality,
        quality_color: qual?.color || '#fff',
        icon: equip.icon,
        atk_bonus: equip.atk_bonus,
        hp_bonus: equip.hp_bonus,
        speed_bonus: equip.speed_bonus,
        crit_bonus: equip.crit_bonus,
        description: equip.description,
        level_req: equip.level_req,
        owned: ownedIds.has(equip.id)
      };
    });
    
    res.json({ 
      success: true, 
      data: result,
      inventory_count: ownedIds.size
    });
  } catch (error) {
    console.error('获取灵兽装备列表失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 穿戴装备
router.post('/equip', (req, res) => {
  try {
    const database = getDb();
    const { player_id, beast_db_id, equipment_id } = req.body;
    
    if (!player_id || !beast_db_id || !equipment_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数 player_id/beast_db_id/equipment_id' });
    }
    
    // 检查装备是否在背包中
    const invRecord = database.prepare(
      'SELECT * FROM beast_equipment_inventory WHERE player_id = ? AND equipment_id = ?'
    ).get(player_id, equipment_id);
    
    if (!invRecord) {
      return res.status(404).json({ success: false, error: '装备不存在于背包中' });
    }
    
    const template = BEAST_EQUIPMENT_DATA[equipment_id];
    if (!template) {
      return res.status(404).json({ success: false, error: '装备模板不存在' });
    }
    
    // 初始化装备记录
    const existingEquip = database.prepare(
      'SELECT * FROM beast_equipment_equipped WHERE player_id = ? AND beast_db_id = ?'
    ).get(player_id, beast_db_id);
    
    if (!existingEquip) {
      database.prepare(
        'INSERT INTO beast_equipment_equipped (player_id, beast_db_id) VALUES (?, ?)'
      ).run(player_id, beast_db_id);
    }
    
    // 更新装备槽位
    const slotCol = { gear: 'gear_id', mount: 'mount_id', accessory: 'accessory_id' }[template.type];
    database.prepare(
      `UPDATE beast_equipment_equipped SET ${slotCol} = ?, updated_at = CURRENT_TIMESTAMP WHERE player_id = ? AND beast_db_id = ?`
    ).run(equipment_id, player_id, beast_db_id);
    
    res.json({
      success: true,
      message: `成功穿戴 ${template.name}`,
      data: { equipment_id, slot: template.type, beast_db_id }
    });
  } catch (error) {
    console.error('穿戴装备失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 卸下装备
router.post('/unequip', (req, res) => {
  try {
    const database = getDb();
    const { player_id, beast_db_id, slot } = req.body;
    
    if (!player_id || !beast_db_id || !slot) {
      return res.status(400).json({ success: false, error: '缺少必要参数 player_id/beast_db_id/slot' });
    }
    
    if (!['gear', 'mount', 'accessory'].includes(slot)) {
      return res.status(400).json({ success: false, error: '无效的装备槽位' });
    }
    
    const slotCol = { gear: 'gear_id', mount: 'mount_id', accessory: 'accessory_id' }[slot];
    
    // 获取当前装备
    const equipped = database.prepare(
      'SELECT * FROM beast_equipment_equipped WHERE player_id = ? AND beast_db_id = ?'
    ).get(player_id, beast_db_id);
    
    if (!equipped || !equipped[slotCol]) {
      return res.status(404).json({ success: false, error: '该槽位没有装备' });
    }
    
    const unequippedId = equipped[slotCol];
    const template = BEAST_EQUIPMENT_DATA[unequippedId];
    
    // 清除装备槽位
    database.prepare(
      `UPDATE beast_equipment_equipped SET ${slotCol} = NULL, updated_at = CURRENT_TIMESTAMP WHERE player_id = ? AND beast_db_id = ?`
    ).run(player_id, beast_db_id);
    
    res.json({
      success: true,
      message: `成功卸下 ${template?.name || '装备'}`,
      data: { unequipped_id: unequippedId, slot }
    });
  } catch (error) {
    console.error('卸下装备失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取灵兽装备信息
router.get('/info', (req, res) => {
  try {
    const database = getDb();
    const { player_id, beast_db_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }
    
    // 获取装备信息
    const equipped = beast_db_id
      ? database.prepare('SELECT * FROM beast_equipment_equipped WHERE player_id = ? AND beast_db_id = ?').get(player_id, beast_db_id)
      : database.prepare('SELECT * FROM beast_equipment_equipped WHERE player_id = ? LIMIT 1').get(player_id);
    
    // 获取背包
    const inventory = database.prepare(
      'SELECT equipment_id, enhance_level FROM beast_equipment_inventory WHERE player_id = ?'
    ).all(player_id);
    
    const inventoryStats = inventory.map(inv => {
      const invEquip = { id: inv.equipment_id, enhance_level: inv.enhance_level };
      return getEquipmentStats(invEquip);
    }).filter(Boolean);
    
    // 计算总加成
    let totalBonus = { atk: 0, hp: 0, speed: 0, crit: 0 };
    if (equipped) {
      for (const slotCol of ['gear_id', 'mount_id', 'accessory_id']) {
        if (equipped[slotCol]) {
          const inv = inventory.find(i => i.equipment_id === equipped[slotCol]);
          const invEquip = { id: equipped[slotCol], enhance_level: inv?.enhance_level || 0 };
          const stats = getEquipmentStats(invEquip);
          if (stats) {
            totalBonus.atk += stats.atk_bonus;
            totalBonus.hp += stats.hp_bonus;
            totalBonus.speed += stats.speed_bonus;
            totalBonus.crit += stats.crit_bonus;
          }
        }
      }
    }
    
    res.json({
      success: true,
      data: {
        equipped: equipped ? {
          beast_db_id: equipped.beast_db_id,
          gear: equipped.gear_id ? getEquipmentStats({ id: equipped.gear_id, enhance_level: 0 }) : null,
          mount: equipped.mount_id ? getEquipmentStats({ id: equipped.mount_id, enhance_level: 0 }) : null,
          accessory: equipped.accessory_id ? getEquipmentStats({ id: equipped.accessory_id, enhance_level: 0 }) : null
        } : null,
        total_bonus: totalBonus,
        inventory_count: inventory.length,
        inventory: inventoryStats
      }
    });
  } catch (error) {
    console.error('获取灵兽装备信息失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 强化装备
router.post('/enhance', (req, res) => {
  try {
    const database = getDb();
    const { player_id, equipment_id } = req.body;
    
    if (!player_id || !equipment_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    // 查找装备
    const invRecord = database.prepare(
      'SELECT * FROM beast_equipment_inventory WHERE player_id = ? AND equipment_id = ?'
    ).get(player_id, equipment_id);
    
    if (!invRecord) {
      return res.status(404).json({ success: false, error: '装备不存在' });
    }
    
    const currentLevel = invRecord.enhance_level || 0;
    
    if (currentLevel >= 10) {
      return res.status(400).json({ success: false, error: '装备强化等级已达上限' });
    }
    
    const template = BEAST_EQUIPMENT_DATA[equipment_id];
    const successRate = ENHANCE_SUCCESS_RATES[currentLevel + 1] || 0.5;
    const cost = ENHANCE_COST.spirit_stones[currentLevel] || 100;
    
    // 检查灵石
    const player = database.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }
    
    const playerSpiritStones = player.spirit_stones || player.lingshi || 0;
    if (playerSpiritStones < cost) {
      return res.status(400).json({ success: false, error: `灵石不足，需要 ${cost} 灵石，当前 ${playerSpiritStones}` });
    }
    
    // 扣除灵石
    const stoneCol = player.spirit_stones !== undefined ? 'spirit_stones' : 'lingshi';
    database.prepare(`UPDATE player SET ${stoneCol} = ${stoneCol} - ? WHERE id = ?`).run(cost, player_id);
    
    // 强化判定
    const success = Math.random() < successRate;
    
    if (success) {
      const newLevel = currentLevel + 1;
      database.prepare(
        'UPDATE beast_equipment_inventory SET enhance_level = ? WHERE player_id = ? AND equipment_id = ?'
      ).run(newLevel, player_id, equipment_id);
      
      const newEquip = { id: equipment_id, enhance_level: newLevel };
      res.json({
        success: true,
        message: `强化成功！装备强化等级提升至 +${newLevel}`,
        equipment: getEquipmentStats(newEquip),
        new_bonus: {
          atk: getEquipmentStats(newEquip)?.atk_bonus,
          hp: getEquipmentStats(newEquip)?.hp_bonus
        }
      });
    } else {
      res.json({
        success: false,
        message: `强化失败，装备等级保持 +${currentLevel}`,
        equipment: getEquipmentStats({ id: equipment_id, enhance_level: currentLevel })
      });
    }
  } catch (error) {
    console.error('强化装备失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 合成装备
router.post('/synthesize', (req, res) => {
  try {
    const database = getDb();
    const { player_id, target_equipment_id } = req.body;
    
    if (!player_id || !target_equipment_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const recipe = SYNTHESIS_RECIPES[target_equipment_id];
    if (!recipe) {
      return res.status(404).json({ success: false, error: '没有该装备的合成配方' });
    }
    
    // 检查材料
    const missingMaterials = [];
    for (const ingredientId of recipe.ingredients) {
      const found = database.prepare(
        'SELECT * FROM beast_equipment_inventory WHERE player_id = ? AND equipment_id = ?'
      ).get(player_id, ingredientId);
      if (!found) {
        const template = BEAST_EQUIPMENT_DATA[ingredientId];
        missingMaterials.push(template?.name || ingredientId);
      }
    }
    
    if (missingMaterials.length > 0) {
      return res.status(400).json({ success: false, error: `材料不足: ${missingMaterials.join(', ')}` });
    }
    
    // 检查灵石
    const player = database.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    if (!player) return res.status(404).json({ success: false, error: '玩家不存在' });
    
    const playerSpiritStones = player.spirit_stones || player.lingshi || 0;
    if (playerSpiritStones < recipe.cost) {
      return res.status(400).json({ success: false, error: `灵石不足，需要 ${recipe.cost} 灵石，当前 ${playerSpiritStones}` });
    }
    
    // 扣除灵石和材料
    const stoneCol = player.spirit_stones !== undefined ? 'spirit_stones' : 'lingshi';
    database.prepare(`UPDATE player SET ${stoneCol} = ${stoneCol} - ? WHERE id = ?`).run(recipe.cost, player_id);
    for (const ingredientId of recipe.ingredients) {
      database.prepare('DELETE FROM beast_equipment_inventory WHERE player_id = ? AND equipment_id = ?').run(player_id, ingredientId);
    }
    
    // 合成判定
    const success = Math.random() < recipe.success_rate;
    
    if (success) {
      database.prepare(
        'INSERT INTO beast_equipment_inventory (player_id, equipment_id, enhance_level) VALUES (?, ?, 0)'
      ).run(player_id, target_equipment_id);
      
      const template = BEAST_EQUIPMENT_DATA[target_equipment_id];
      res.json({
        success: true,
        message: `合成成功！获得 ${template?.name || target_equipment_id}`,
        equipment: getEquipmentStats({ id: target_equipment_id, enhance_level: 0 })
      });
    } else {
      res.json({ success: false, message: '合成失败，材料已消耗' });
    }
  } catch (error) {
    console.error('合成装备失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取合成配方列表
router.get('/synthesis/recipes', (req, res) => {
  try {
    const result = Object.entries(SYNTHESIS_RECIPES).map(([targetId, recipe]) => {
      const targetTemplate = BEAST_EQUIPMENT_DATA[targetId];
      return {
        target_id: targetId,
        target_name: targetTemplate?.name || targetId,
        target_icon: targetTemplate?.icon,
        target_quality: targetTemplate?.quality,
        ingredients: recipe.ingredients.map(id => {
          const template = BEAST_EQUIPMENT_DATA[id];
          return {
            id,
            name: template?.name || id,
            icon: template?.icon
          };
        }),
        success_rate: recipe.success_rate,
        cost: recipe.cost
      };
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取合成配方失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 添加装备到玩家背包（GM/奖励用）
router.post('/add', (req, res) => {
  try {
    const database = getDb();
    const { player_id, equipment_id, count = 1 } = req.body;
    
    if (!player_id || !equipment_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const template = BEAST_EQUIPMENT_DATA[equipment_id];
    if (!template) {
      return res.status(404).json({ success: false, error: '装备不存在' });
    }
    
    for (let i = 0; i < count; i++) {
      try {
        database.prepare(
          'INSERT INTO beast_equipment_inventory (player_id, equipment_id, enhance_level) VALUES (?, ?, 0)'
        ).run(player_id, equipment_id);
      } catch (e) {
        // ignore duplicate key errors for same item
      }
    }
    
    const total = database.prepare(
      'SELECT COUNT(*) as cnt FROM beast_equipment_inventory WHERE player_id = ? AND equipment_id = ?'
    ).get(player_id, equipment_id);
    
    res.json({
      success: true,
      message: `获得 ${count} 个 ${template.name}`,
      inventory_count: total.cnt
    });
  } catch (error) {
    console.error('添加装备失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
module.exports.BEAST_EQUIPMENT_DATA = BEAST_EQUIPMENT_DATA;
module.exports.EQUIPMENT_TYPES = EQUIPMENT_TYPES;
module.exports.EQUIPMENT_QUALITY = EQUIPMENT_QUALITY;

console.log('🦁 灵兽装备系统 API 已加载');
