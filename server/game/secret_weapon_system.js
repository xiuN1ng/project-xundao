/**
 * 秘宝/神器系统
 * 包含：秘宝数据、装备系统、强化系统、秘宝技能
 */

// ============ 秘宝品质定义 ============
const SECRET_WEAPON_QUALITY = {
  blue: { name: '蓝色', color: '#4169E1', upgrade_rate: 0.5, max_level: 30, exp_factor: 1 },
  purple: { name: '紫色', color: '#9370DB', upgrade_rate: 0.7, max_level: 50, exp_factor: 1.5 },
  orange: { name: '橙色', color: '#FF8C00', upgrade_rate: 0.9, max_level: 80, exp_factor: 2 }
};

// ============ 秘宝类型定义 ============
const SECRET_WEAPON_TYPES = {
  weapon: { name: '武器', icon: '⚔️', slot: 'weapon', primary_attr: 'atk' },
  armor: { name: '防具', icon: '🛡️', slot: 'armor', primary_attr: 'def' },
  accessory: { name: '饰品', icon: '💎', slot: 'accessory', primary_attr: 'all' }
};

// ============ 秘宝技能定义 ============
const SECRET_WEAPON_SKILLS = {
  // 武器技能
  'blade_fury': { 
    name: '刀锋 Fury', 
    type: 'attack', 
    damage: 1.8, 
    cooldown: 8,
    description: '造成180%伤害，附加流血效果'
  },
  'shadow_strike': { 
    name: '暗影打击', 
    type: 'attack', 
    damage: 2.2, 
    cooldown: 12,
    description: '造成220%伤害，概率隐身'
  },
  'dragon_slayer': { 
    name: '屠龙击', 
    type: 'attack', 
    damage: 3.0, 
    cooldown: 20,
    description: '造成300%伤害，对BOSS额外200%'
  },
  
  // 防具技能
  'iron_wall': { 
    name: '铁壁', 
    type: 'defense', 
    shield: 0.4, 
    cooldown: 25,
    description: '获得40%最大HP护盾'
  },
  'phoenix_armor': { 
    name: '凤凰甲', 
    type: 'defense', 
    shield: 0.6, 
    hp_regen: 0.1,
    cooldown: 40,
    description: '获得60%护盾，每秒回复1%生命'
  },
  'immortal_barrier': { 
    name: '不朽之壁', 
    type: 'defense', 
    shield: 1.0, 
    cooldown: 60,
    description: '获得100%护盾，免疫致命一击'
  },
  
  // 饰品技能
  'spirit_boost': { 
    name: '灵气激发', 
    type: 'support', 
    crit_rate: 0.15,
    cooldown: 30,
    description: '暴击率+15%'
  },
  'life_siphon': { 
    name: '生命汲取', 
    type: 'support', 
    lifesteal: 0.2,
    cooldown: 20,
    description: '攻击时吸取20%伤害转化为生命'
  },
  'time_stop': { 
    name: '时间静止', 
    type: 'support', 
    duration: 5,
    cooldown: 120,
    description: '停止时间5秒，免疫所有伤害'
  },
  
  // 橙色神器通用技能
  'god_blessing': { 
    name: '神祝福', 
    type: 'passive', 
    all_stats: 0.3,
    description: '全属性+30%'
  },
  'last_stand': { 
    name: '背水一战', 
    type: 'passive', 
    hp_below: 0.3,
    damage_boost: 1.0,
    description: '生命低于30%时，伤害翻倍'
  }
};

// ============ 秘宝数据定义 ============
const SECRET_WEAPON_DATA = {
  // 武器 - 蓝色
  'blue_blade': { 
    name: '蓝钢刀', 
    type: 'weapon', 
    quality: 'blue', 
    base_atk: 100, 
    base_def: 10, 
    skill: 'blade_fury',
    price: 1000
  },
  'blue_sword': { 
    name: '蓝晶剑', 
    type: 'weapon', 
    quality: 'blue', 
    base_atk: 120, 
    base_def: 15, 
    skill: 'blade_fury',
    price: 1200
  },
  
  // 武器 - 紫色
  'purple_blade': { 
    name: '紫电刀', 
    type: 'weapon', 
    quality: 'purple', 
    base_atk: 350, 
    base_def: 35, 
    skill: 'shadow_strike',
    price: 10000
  },
  'purple_sword': { 
    name: '紫霞剑', 
    type: 'weapon', 
    quality: 'purple', 
    base_atk: 400, 
    base_def: 40, 
    skill: 'shadow_strike',
    price: 12000
  },
  
  // 武器 - 橙色
  'orange_blade': { 
    name: '灭神刀', 
    type: 'weapon', 
    quality: 'orange', 
    base_atk: 1200, 
    base_def: 120, 
    skill: 'dragon_slayer',
    price: 100000
  },
  'orange_sword': { 
    name: '封神剑', 
    type: 'weapon', 
    quality: 'orange', 
    base_atk: 1500, 
    base_def: 150, 
    skill: 'dragon_slayer',
    price: 150000
  },
  
  // 防具 - 蓝色
  'blue_armor': { 
    name: '蓝鳞甲', 
    type: 'armor', 
    quality: 'blue', 
    base_atk: 10, 
    base_def: 100, 
    skill: 'iron_wall',
    price: 1000
  },
  'blue_robe': { 
    name: '蓝羽袍', 
    type: 'armor', 
    quality: 'blue', 
    base_atk: 15, 
    base_def: 120, 
    skill: 'iron_wall',
    price: 1200
  },
  
  // 防具 - 紫色
  'purple_armor': { 
    name: '紫晶甲', 
    type: 'armor', 
    quality: 'purple', 
    base_atk: 35, 
    base_def: 350, 
    skill: 'phoenix_armor',
    price: 10000
  },
  'purple_robe': { 
    name: '紫霞衣', 
    type: 'armor', 
    quality: 'purple', 
    base_atk: 40, 
    base_def: 400, 
    skill: 'phoenix_armor',
    price: 12000
  },
  
  // 防具 - 橙色
  'orange_armor': { 
    name: '天魔甲', 
    type: 'armor', 
    quality: 'orange', 
    base_atk: 120, 
    base_def: 1200, 
    skill: 'immortal_barrier',
    price: 100000
  },
  'orange_robe': { 
    name: '封神衣', 
    type: 'armor', 
    quality: 'orange', 
    base_atk: 150, 
    base_def: 1500, 
    base_def: 1500, 
    skill: 'immortal_barrier',
    price: 150000
  },
  
  // 饰品 - 蓝色
  'blue_ring': { 
    name: '蓝玉戒指', 
    type: 'accessory', 
    quality: 'blue', 
    base_atk: 30, 
    base_def: 30, 
    skill: 'spirit_boost',
    price: 1000
  },
  'blue_amulet': { 
    name: '蓝玉项链', 
    type: 'accessory', 
    quality: 'blue', 
    base_atk: 35, 
    base_def: 35, 
    skill: 'spirit_boost',
    price: 1200
  },
  
  // 饰品 - 紫色
  'purple_ring': { 
    name: '紫金戒指', 
    type: 'accessory', 
    quality: 'purple', 
    base_atk: 100, 
    base_def: 100, 
    skill: 'life_siphon',
    price: 10000
  },
  'purple_amulet': { 
    name: '紫金项链', 
    type: 'accessory', 
    quality: 'purple', 
    base_atk: 120, 
    base_def: 120, 
    skill: 'life_siphon',
    price: 12000
  },
  
  // 饰品 - 橙色
  'orange_ring': { 
    name: '神赐戒指', 
    type: 'accessory', 
    quality: 'orange', 
    base_atk: 400, 
    base_def: 400, 
    skill: 'time_stop',
    price: 100000
  },
  'orange_amulet': { 
    name: '神器项链', 
    type: 'accessory', 
    quality: 'orange', 
    base_atk: 500, 
    base_def: 500, 
    skill: 'time_stop',
    price: 150000
  }
};

// ============ 强化消耗配置 ============
const ENHANCE_COSTS = {
  blue: {
    gold: [100, 200, 300, 500, 800, 1200, 1800, 2500, 3500, 5000],
    materials: {
      'blue_essence': [1, 2, 3, 5, 8, 12, 18, 25, 35, 50]
    }
  },
  purple: {
    gold: [500, 1000, 2000, 3500, 5500, 8000, 12000, 17000, 25000, 35000],
    materials: {
      'purple_essence': [1, 2, 3, 5, 8, 12, 18, 25, 35, 50]
    }
  },
  orange: {
    gold: [2000, 5000, 10000, 18000, 28000, 40000, 60000, 85000, 120000, 180000],
    materials: {
      'orange_essence': [1, 2, 3, 5, 8, 12, 18, 25, 35, 50]
    }
  }
};

/**
 * 秘宝系统类
 */
class SecretWeaponSystem {
  constructor() {
    this.qualityConfig = SECRET_WEAPON_QUALITY;
    this.typeConfig = SECRET_WEAPON_TYPES;
    this.skillConfig = SECRET_WEAPON_SKILLS;
    this.weaponData = SECRET_WEAPON_DATA;
    this.enhanceCosts = ENHANCE_COSTS;
  }

  /**
   * 获取所有秘宝列表
   * @param {Object} options - 过滤选项
   * @param {string} options.type - 秘宝类型 (weapon/armor/accessory)
   * @param {string} options.quality - 秘宝品质 (blue/purple/orange)
   * @returns {Array} 秘宝列表
   */
  getSecretWeapons(options = {}) {
    let weapons = Object.entries(this.weaponData).map(([id, data]) => ({
      id,
      ...data,
      qualityInfo: this.qualityConfig[data.quality],
      typeInfo: this.typeConfig[data.type],
      skillInfo: this.skillConfig[data.skill]
    }));

    if (options.type) {
      weapons = weapons.filter(w => w.type === options.type);
    }

    if (options.quality) {
      weapons = weapons.filter(w => w.quality === options.quality);
    }

    return weapons;
  }

  /**
   * 根据ID获取秘宝详情
   * @param {string} id - 秘宝ID
   * @returns {Object|null} 秘宝详情
   */
  getSecretWeaponById(id) {
    const data = this.weaponData[id];
    if (!data) return null;

    return {
      id,
      ...data,
      qualityInfo: this.qualityConfig[data.quality],
      typeInfo: this.typeConfig[data.type],
      skillInfo: this.skillConfig[data.skill]
    };
  }

  /**
   * 装备秘宝
   * @param {Object} player - 玩家对象
   * @param {string} weaponId - 秘宝ID
   * @returns {Object} 装备结果
   */
  equip(player, weaponId) {
    const weapon = this.getSecretWeaponById(weaponId);
    if (!weapon) {
      return { success: false, message: '秘宝不存在' };
    }

    // 检查玩家是否拥有该秘宝
    if (!player.secret_weapons || !player.secret_weapons.includes(weaponId)) {
      return { success: false, message: '未拥有该秘宝' };
    }

    // 检查是否已装备
    const slot = weapon.typeInfo.slot;
    const currentEquipped = player.equipped_secret_weapons || {};
    
    if (currentEquipped[slot] === weaponId) {
      return { success: false, message: '该秘宝已装备' };
    }

    // 检查是否可装备（每类型只能装备一件）
    if (currentEquipped[slot] && currentEquipped[slot] !== weaponId) {
      // 卸下当前装备的同类型秘宝
      const oldWeapon = this.getSecretWeaponById(currentEquipped[slot]);
      player.combat_stats.atk -= oldWeapon.base_atk;
      player.combat_stats.def -= oldWeapon.base_def;
    }

    // 装备新秘宝
    if (!player.equipped_secret_weapons) {
      player.equipped_secret_weapons = {};
    }
    player.equipped_secret_weapons[slot] = weaponId;

    // 更新玩家属性
    if (!player.combat_stats) {
      player.combat_stats = { atk: 0, def: 0, hp: 1000 };
    }
    player.combat_stats.atk += weapon.base_atk;
    player.combat_stats.def += weapon.base_def;

    return {
      success: true,
      message: `成功装备 ${weapon.name}`,
      equipped: player.equipped_secret_weapons,
      stats: {
        atk: player.combat_stats.atk,
        def: player.combat_stats.def
      }
    };
  }

  /**
   * 卸下秘宝
   * @param {Object} player - 玩家对象
   * @param {string} slot - 装备槽位
   * @returns {Object} 卸下结果
   */
  unequip(player, slot) {
    const currentEquipped = player.equipped_secret_weapons || {};
    const weaponId = currentEquipped[slot];

    if (!weaponId) {
      return { success: false, message: '该槽位没有装备秘宝' };
    }

    const weapon = this.getSecretWeaponById(weaponId);
    if (!weapon) {
      return { success: false, message: '秘宝不存在' };
    }

    // 移除装备
    delete player.equipped_secret_weapons[slot];

    // 更新玩家属性
    if (player.combat_stats) {
      player.combat_stats.atk -= weapon.base_atk;
      player.combat_stats.def -= weapon.base_def;
    }

    return {
      success: true,
      message: `已卸下 ${weapon.name}`,
      equipped: player.equipped_secret_weapons
    };
  }

  /**
   * 强化秘宝
   * @param {Object} player - 玩家对象
   * @param {string} weaponId - 秘宝ID
   * @returns {Object} 强化结果
   */
  enhance(player, weaponId) {
    const weapon = this.getSecretWeaponById(weaponId);
    if (!weapon) {
      return { success: false, message: '秘宝不存在' };
    }

    // 检查玩家是否拥有该秘宝
    if (!player.secret_weapons || !player.secret_weapons.includes(weaponId)) {
      return { success: false, message: '未拥有该秘宝' };
    }

    // 初始化玩家秘宝强化数据
    if (!player.secret_weapon_levels) {
      player.secret_weapon_levels = {};
    }

    const currentLevel = player.secret_weapon_levels[weaponId] || 0;
    const qualityInfo = this.qualityConfig[weapon.quality];

    // 检查是否达到最大等级
    if (currentLevel >= qualityInfo.max_level) {
      return { success: false, message: `已达到最大等级 ${qualityInfo.max_level}` };
    }

    // 计算强化消耗
    const levelIndex = Math.min(currentLevel, 9);
    const costData = this.enhanceCosts[weapon.quality];
    const goldCost = costData.gold[levelIndex];
    const materialCost = costData.materials[Object.keys(costData.materials)[0]][levelIndex];

    // 检查玩家资源是否足够
    if (player.gold < goldCost) {
      return { success: false, message: `金币不足，需要 ${goldCost} 金币` };
    }

    const materialName = Object.keys(costData.materials)[0];
    const playerMaterials = player.materials || {};
    if ((playerMaterials[materialName] || 0) < materialCost) {
      return { success: false, message: `材料不足，需要 ${materialCost} 个 ${materialName}` };
    }

    // 扣除资源
    player.gold -= goldCost;
    playerMaterials[materialName] = (playerMaterials[materialName] || 0) - materialCost;

    // 计算强化成功率
    const successRate = qualityInfo.upgrade_rate;
    const isSuccess = Math.random() < successRate;

    if (isSuccess) {
      player.secret_weapon_levels[weaponId] = currentLevel + 1;
      
      // 计算升级后的属性加成
      const newLevel = currentLevel + 1;
      const atkBonus = Math.floor(weapon.base_atk * (newLevel * 0.1));
      const defBonus = Math.floor(weapon.base_def * (newLevel * 0.1));

      return {
        success: true,
        message: `强化成功！${weapon.name} 等级提升至 ${newLevel}`,
        newLevel,
        atkBonus,
        defBonus,
        nextCost: this.getEnhanceCost(weaponId, newLevel)
      };
    } else {
      return {
        success: false,
        message: `强化失败，材料已消耗`,
        currentLevel,
        nextCost: this.getEnhanceCost(weaponId, currentLevel)
      };
    }
  }

  /**
   * 获取强化消耗
   * @param {string} weaponId - 秘宝ID
   * @param {number} currentLevel - 当前等级
   * @returns {Object} 强化消耗
   */
  getEnhanceCost(weaponId, currentLevel) {
    const weapon = this.getSecretWeaponById(weaponId);
    if (!weapon) return null;

    const costData = this.enhanceCosts[weapon.quality];
    const levelIndex = Math.min(currentLevel, 9);

    return {
      gold: costData.gold[levelIndex],
      material: {
        name: Object.keys(costData.materials)[0],
        count: costData.materials[Object.keys(costData.materials)[0]][levelIndex]
      }
    };
  }

  /**
   * 获取秘宝强化后的属性
   * @param {string} weaponId - 秘宝ID
   * @param {number} level - 强化等级
   * @returns {Object} 属性值
   */
  getEnhancedStats(weaponId, level = 0) {
    const weapon = this.getSecretWeaponById(weaponId);
    if (!weapon) return null;

    const atkBonus = Math.floor(weapon.base_atk * (level * 0.1));
    const defBonus = Math.floor(weapon.base_def * (level * 0.1));

    return {
      base_atk: weapon.base_atk,
      bonus_atk: atkBonus,
      total_atk: weapon.base_atk + atkBonus,
      base_def: weapon.base_def,
      bonus_def: defBonus,
      total_def: weapon.base_def + defBonus
    };
  }

  /**
   * 获取玩家装备的秘宝提供的属性加成
   * @param {Object} player - 玩家对象
   * @returns {Object} 总属性加成
   */
  getEquippedBonuses(player) {
    const equipped = player.equipped_secret_weapons || {};
    let totalAtk = 0;
    let totalDef = 0;
    const activeSkills = [];

    for (const slot in equipped) {
      const weaponId = equipped[slot];
      const weapon = this.getSecretWeaponById(weaponId);
      if (!weapon) continue;

      const level = (player.secret_weapon_levels || {})[weaponId] || 0;
      const stats = this.getEnhancedStats(weaponId, level);

      totalAtk += stats.total_atk;
      totalDef += stats.total_def;

      // 收集技能
      if (weapon.skillInfo) {
        activeSkills.push({
          slot,
          skill: weapon.skillInfo
        });
      }
    }

    return {
      atk: totalAtk,
      def: totalDef,
      skills: activeSkills
    };
  }

  /**
   * 激活秘宝（获得秘宝）
   * @param {Object} player - 玩家对象
   * @param {string} weaponId - 秘宝ID
   * @returns {Object} 激活结果
   */
  acquireWeapon(player, weaponId) {
    const weapon = this.getSecretWeaponById(weaponId);
    if (!weapon) {
      return { success: false, message: '秘宝不存在' };
    }

    if (!player.secret_weapons) {
      player.secret_weapons = [];
    }

    if (player.secret_weapons.includes(weaponId)) {
      return { success: false, message: '已拥有该秘宝' };
    }

    player.secret_weapons.push(weaponId);

    return {
      success: true,
      message: `获得秘宝 ${weapon.name}`,
      weapon: {
        id: weaponId,
        name: weapon.name,
        quality: weapon.quality,
        type: weapon.type,
        skill: weapon.skillInfo
      }
    };
  }
}

// 导出系统
module.exports = new SecretWeaponSystem();
module.exports.SecretWeaponSystem = SecretWeaponSystem;
