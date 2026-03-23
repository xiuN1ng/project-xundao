/**
 * 器灵系统 - 挂机修仙
 * 器灵可以为装备提供额外加成
 */

// 器灵类型
const SPIRIT_TYPES = {
  ATTACK: 'attack',   // 攻击型
  DEFENSE: 'defense', // 防御型
  SUPPORT: 'support'  // 辅助型
};

// 器灵品质
const SPIRIT_QUALITY = {
  WHITE: 'white',   // 白色
  GREEN: 'green',   // 绿色
  BLUE: 'blue',     // 蓝色
  PURPLE: 'purple', // 紫色
  ORANGE: 'orange', // 橙色
  GOLD: 'gold'      // 金色
};

// 品质加成倍率
const QUALITY_MULTIPLIER = {
  [SPIRIT_QUALITY.WHITE]: 1.0,
  [SPIRIT_QUALITY.GREEN]: 1.5,
  [SPIRIT_QUALITY.BLUE]: 2.0,
  [SPIRIT_QUALITY.PURPLE]: 3.0,
  [SPIRIT_QUALITY.ORANGE]: 5.0,
  [SPIRIT_QUALITY.GOLD]: 8.0
};

// 器灵数据定义
const SPIRITS_DATA = {
  // ============ 攻击型器灵 ============
  'spirit_fire_sword': {
    id: 'spirit_fire_sword',
    name: '火焰剑灵',
    type: SPIRIT_TYPES.ATTACK,
    quality: SPIRIT_QUALITY.BLUE,
    baseStats: { atk: 50, crit: 5 },
    skill: { name: '火焰斩', description: '攻击时额外造成30%火焰伤害', effect: 'fire_damage', value: 0.3 }
  },
  'spirit_thunder_blade': {
    id: 'spirit_thunder_blade',
    name: '雷鸣刀灵',
    type: SPIRIT_TYPES.ATTACK,
    quality: SPIRIT_QUALITY.PURPLE,
    baseStats: { atk: 80, crit: 10 },
    skill: { name: '天雷击', description: '攻击时有15%几率触发额外200%雷伤害', effect: 'thunder_strike', value: 0.15, multiplier: 2.0 }
  },
  'spirit_void_needle': {
    id: 'spirit_void_needle',
    name: '虚空针灵',
    type: SPIRIT_TYPES.ATTACK,
    quality: SPIRIT_QUALITY.ORANGE,
    baseStats: { atk: 120, crit: 20, dodge: 10 },
    skill: { name: '穿心刺', description: '攻击时有25%几率无视防御', effect: 'pierce', value: 0.25 }
  },

  // ============ 防御型器灵 ============
  'spirit_stone_golem': {
    id: 'spirit_stone_golem',
    name: '石甲灵',
    type: SPIRIT_TYPES.DEFENSE,
    quality: SPIRIT_QUALITY.GREEN,
    baseStats: { def: 30, hp: 100 },
    skill: { name: '石肤术', description: '受到的伤害降低10%', effect: 'damage_reduction', value: 0.1 }
  },
  'spirit_ice_wall': {
    id: 'spirit_ice_wall',
    name: '冰墙灵',
    type: SPIRIT_TYPES.DEFENSE,
    quality: SPIRIT_QUALITY.BLUE,
    baseStats: { def: 60, hp: 200 },
    skill: { name: '冰封护体', description: '攻击者有20%几率被冰冻1回合', effect: 'freeze', value: 0.2 }
  },
  'spirit_dragon_scale': {
    id: 'spirit_dragon_scale',
    name: '龙鳞灵',
    type: SPIRIT_TYPES.DEFENSE,
    quality: SPIRIT_QUALITY.GOLD,
    baseStats: { def: 150, hp: 500, atk: 30 },
    skill: { name: '龙魂护体', description: '受到致命伤害时减免80%', effect: 'lethal_reduction', value: 0.8 }
  },

  // ============ 辅助型器灵 ============
  'spirit_healing_sprite': {
    id: 'spirit_healing_sprite',
    name: '治愈精灵',
    type: SPIRIT_TYPES.SUPPORT,
    quality: SPIRIT_QUALITY.WHITE,
    baseStats: { hp: 50, spiritRate: 5 },
    skill: { name: '生命汲取', description: '每5秒恢复1%最大生命', effect: 'regen', value: 0.01 }
  },
  'spirit_wind_racer': {
    id: 'spirit_wind_racer',
    name: '风速灵',
    type: SPIRIT_TYPES.SUPPORT,
    quality: SPIRIT_QUALITY.BLUE,
    baseStats: { spiritRate: 15, dodge: 10 },
    skill: { name: '御风而行', description: '修炼效率提升20%', effect: 'spirit_boost', value: 0.2 }
  },
  'spirit_phoenix_feather': {
    id: 'spirit_phoenix_feather',
    name: '凤凰羽灵',
    type: SPIRIT_TYPES.SUPPORT,
    quality: SPIRIT_QUALITY.ORANGE,
    baseStats: { hp: 300, spiritRate: 25, atk: 20 },
    skill: { name: '浴火重生', description: '死亡时原地复活并恢复50%生命', effect: 'revive', value: 0.5 }
  }
};

/**
 * 获取所有器灵
 * @returns {Array} 器灵列表
 */
function getAllSpirits() {
  return Object.values(SPIRITS_DATA).map(spirit => ({
    id: spirit.id,
    name: spirit.name,
    type: spirit.type,
    quality: spirit.quality,
    baseStats: { ...spirit.baseStats },
    skill: { ...spirit.skill }
  }));
}

/**
 * 根据ID获取器灵
 * @param {string} spiritId 器灵ID
 * @returns {Object|null} 器灵数据
 */
function getSpiritById(spiritId) {
  return SPIRITS_DATA[spiritId] || null;
}

/**
 * 计算器灵属性加成（根据品质）
 * @param {Object} spirit 器灵数据
 * @returns {Object} 加成后的属性
 */
function calculateSpiritStats(spirit) {
  const multiplier = QUALITY_MULTIPLIER[spirit.quality] || 1.0;
  return {
    atk: Math.floor((spirit.baseStats.atk || 0) * multiplier),
    def: Math.floor((spirit.baseStats.def || 0) * multiplier),
    hp: Math.floor((spirit.baseStats.hp || 0) * multiplier),
    crit: Math.floor((spirit.baseStats.crit || 0) * multiplier),
    dodge: Math.floor((spirit.baseStats.dodge || 0) * multiplier),
    spiritRate: Math.floor((spirit.baseStats.spiritRate || 0) * multiplier)
  };
}

/**
 * 装备器灵到装备
 * @param {Object} player 玩家数据
 * @param {string} equipmentId 装备槽位ID (weapon/armor/accessory)
 * @param {string} spiritId 器灵ID
 * @returns {Object} 操作结果
 */
function equipSpirit(player, equipmentId, spiritId) {
  // 验证装备槽位
  const validSlots = ['weapon', 'armor', 'accessory'];
  if (!validSlots.includes(equipmentId)) {
    return { success: false, message: '无效的装备槽位' };
  }

  // 验证器灵是否存在
  const spirit = getSpiritById(spiritId);
  if (!spirit) {
    return { success: false, message: '器灵不存在' };
  }

  // 初始化器灵数据
  if (!player.spirits) {
    player.spirits = {
      owned: [],           // 已拥有的器灵列表
      equipped: {},        // 装备的器灵 { slot: spiritId }
      activated: []         // 已激活的器灵ID列表
    };
  }
  if (!player.spirits.equipped) {
    player.spirits.equipped = {};
  }

  // 检查是否已拥有该器灵
  if (!player.spirits.owned.includes(spiritId)) {
    // 添加到已拥有列表
    player.spirits.owned.push(spiritId);
  }

  // 装备器灵
  player.spirits.equipped[equipmentId] = spiritId;

  return {
    success: true,
    message: `成功将 ${spirit.name} 装备到${equipmentId}`,
    equipped: player.spirits.equipped
  };
}

/**
 * 卸下器灵
 * @param {Object} player 玩家数据
 * @param {string} equipmentId 装备槽位ID
 * @returns {Object} 操作结果
 */
function unequipSpirit(player, equipmentId) {
  // 验证装备槽位
  const validSlots = ['weapon', 'armor', 'accessory'];
  if (!validSlots.includes(equipmentId)) {
    return { success: false, message: '无效的装备槽位' };
  }

  // 初始化器灵数据
  if (!player.spirits || !player.spirits.equipped) {
    return { success: false, message: '该槽位没有装备器灵' };
  }

  // 检查该槽位是否有器灵
  if (!player.spirits.equipped[equipmentId]) {
    return { success: false, message: '该槽位没有装备器灵' };
  }

  const spiritId = player.spirits.equipped[equipmentId];
  const spirit = getSpiritById(spiritId);

  // 卸下器灵
  delete player.spirits.equipped[equipmentId];

  return {
    success: true,
    message: `成功卸下 ${spirit ? spirit.name : spiritId}`,
    equipped: player.spirits.equipped
  };
}

/**
 * 激活器灵
 * @param {Object} player 玩家数据
 * @param {string} spiritId 器灵ID
 * @returns {Object} 操作结果
 */
function activateSpirit(player, spiritId) {
  // 验证器灵是否存在
  const spirit = getSpiritById(spiritId);
  if (!spirit) {
    return { success: false, message: '器灵不存在' };
  }

  // 初始化器灵数据
  if (!player.spirits) {
    player.spirits = {
      owned: [],
      equipped: {},
      activated: []
    };
  }
  if (!player.spirits.owned) player.spirits.owned = [];
  if (!player.spirits.activated) player.spirits.activated = [];

  // 检查是否已拥有该器灵
  if (!player.spirits.owned.includes(spiritId)) {
    return { success: false, message: '尚未获得该器灵' };
  }

  // 检查是否已激活
  if (player.spirits.activated.includes(spiritId)) {
    return { success: false, message: '该器灵已经激活' };
  }

  // 激活器灵
  player.spirits.activated.push(spiritId);

  return {
    success: true,
    message: `成功激活 ${spirit.name}！${spirit.skill ? `获得技能: ${spirit.skill.name}` : ''}`,
    activated: player.spirits.activated
  };
}

/**
 * 获取器灵系统加成
 * @param {Object} player 玩家数据
 * @returns {Object} 加成属性
 */
function getSpiritBonus(player) {
  const bonus = {
    atkMultiplier: 1,
    defMultiplier: 1,
    hpMultiplier: 1,
    spiritMultiplier: 1,
    critBonus: 0,
    dodgeBonus: 0,
    skills: []
  };

  if (!player.spirits || !player.spirits.activated || player.spirits.activated.length === 0) {
    return bonus;
  }

  for (const spiritId of player.spirits.activated) {
    const spirit = getSpiritById(spiritId);
    if (!spirit) continue;

    const stats = calculateSpiritStats(spirit);

    // 根据器灵类型应用加成
    if (spirit.type === SPIRIT_TYPES.ATTACK) {
      bonus.atkMultiplier += stats.atk * 0.01;
      bonus.critBonus += stats.crit;
    } else if (spirit.type === SPIRIT_TYPES.DEFENSE) {
      bonus.defMultiplier += stats.def * 0.01;
      bonus.hpMultiplier += stats.hp * 0.001;
    } else if (spirit.type === SPIRIT_TYPES.SUPPORT) {
      bonus.spiritMultiplier += stats.spiritRate * 0.01;
      bonus.hpMultiplier += stats.hp * 0.001;
      bonus.dodgeBonus += stats.dodge;
    }

    // 添加技能效果
    if (spirit.skill) {
      bonus.skills.push({
        id: spirit.id,
        name: spirit.name,
        skill: spirit.skill
      });
    }
  }

  return bonus;
}

/**
 * 获取玩家装备的器灵信息
 * @param {Object} player 玩家数据
 * @returns {Object} 器灵装备信息
 */
function getEquippedSpirits(player) {
  if (!player.spirits || !player.spirits.equipped) {
    return {};
  }
  return player.spirits.equipped;
}

/**
 * 获取玩家已激活的器灵列表
 * @param {Object} player 玩家数据
 * @returns {Array} 激活的器灵列表
 */
function getActivatedSpirits(player) {
  if (!player.spirits || !player.spirits.activated) {
    return [];
  }
  return player.spirits.activated.map(id => getSpiritById(id)).filter(s => s !== null);
}

/**
 * 获取玩家拥有的器灵列表
 * @param {Object} player 玩家数据
 * @returns {Array} 拥有的器灵列表
 */
function getOwnedSpirits(player) {
  if (!player.spirits || !player.spirits.owned) {
    return [];
  }
  return player.spirits.owned.map(id => getSpiritById(id)).filter(s => s !== null);
}

module.exports = {
  SPIRIT_TYPES,
  SPIRIT_QUALITY,
  SPIRITS_DATA,
  getAllSpirits,
  getSpiritById,
  calculateSpiritStats,
  equipSpirit,
  unequipSpirit,
  activateSpirit,
  getSpiritBonus,
  getEquippedSpirits,
  getActivatedSpirits,
  getOwnedSpirits
};
