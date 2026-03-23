/**
 * 坐骑/御剑系统
 * 剑、葫芦、仙鹤、麒麟
 */

// 坐骑类型定义
const MOUNT_TYPES = {
  sword: {
    name: '剑',
    icon: '⚔️',
    description: '御剑飞行，剑气凌人'
  },
  gourd: {
    name: '葫芦',
    icon: '🍶',
    description: '宝葫芦载人，悠然而去'
  },
  crane: {
    name: '仙鹤',
    icon: '🦢',
    description: '仙鹤展翅，云端漫步'
  },
  qilin: {
    name: '麒麟',
    icon: '🦄',
    description: '麒麟瑞兽，祥云随行'
  }
};

// 坐骑数据配置
const MOUNT_DATA = {
  // ========== 剑类坐骑 ==========
  iron_sword: {
    id: 'iron_sword',
    name: '铁剑',
    type: 'sword',
    quality: 'common',
    speed: 50,
    attributes: { atk: 10, def: 5 },
    description: '基础御剑，适合初学者'
  },
  steel_sword: {
    id: 'steel_sword',
    name: '钢剑',
    type: 'sword',
    quality: 'uncommon',
    speed: 80,
    attributes: { atk: 30, def: 15 },
    description: '精炼钢剑，飞行更稳'
  },
  spirit_sword: {
    id: 'spirit_sword',
    name: '灵剑',
    type: 'sword',
    quality: 'rare',
    speed: 120,
    attributes: { atk: 80, def: 40, crit: 5 },
    description: '蕴含灵性的飞剑'
  },
  immortal_sword: {
    id: 'immortal_sword',
    name: '仙剑',
    type: 'sword',
    quality: 'epic',
    speed: 180,
    attributes: { atk: 200, def: 100, crit: 15, dodge: 10 },
    description: '仙人遗留的仙剑'
  },
  heavenly_sword: {
    id: 'heavenly_sword',
    name: '天剑',
    type: 'sword',
    quality: 'legendary',
    speed: 250,
    attributes: { atk: 500, def: 250, crit: 30, dodge: 25, hp: 1000 },
    description: '天界神剑，威力无穷'
  },

  // ========== 葫芦类坐骑 ==========
  bamboo_gourd: {
    id: 'bamboo_gourd',
    name: '竹葫芦',
    type: 'gourd',
    quality: 'common',
    speed: 40,
    attributes: { hp: 50, def: 10 },
    description: '普通竹制葫芦'
  },
  jade_gourd: {
    id: 'jade_gourd',
    name: '玉葫芦',
    type: 'gourd',
    quality: 'uncommon',
    speed: 70,
    attributes: { hp: 150, def: 25 },
    description: '玉石雕刻的葫芦'
  },
  treasure_gourd: {
    id: 'treasure_gourd',
    name: '聚宝葫芦',
    type: 'gourd',
    quality: 'rare',
    speed: 110,
    attributes: { hp: 400, def: 60, lifesteal: 5 },
    description: '可吸纳天地财气'
  },
  immortal_gourd: {
    id: 'immortal_gourd',
    name: '仙葫芦',
    type: 'gourd',
    quality: 'epic',
    speed: 160,
    attributes: { hp: 1000, def: 150, lifesteal: 15, hp_regen: 10 },
    description: '仙人所用的仙宝'
  },
  heavenly_gourd: {
    id: 'heavenly_gourd',
    name: '天葫芦',
    type: 'gourd',
    quality: 'legendary',
    speed: 220,
    attributes: { hp: 2500, def: 300, lifesteal: 30, hp_regen: 30, atk: 200 },
    description: '天界至宝，可装山河'
  },

  // ========== 仙鹤类坐骑 ==========
  white_crane: {
    id: 'white_crane',
    name: '白鹤',
    type: 'crane',
    quality: 'common',
    speed: 60,
    attributes: { atk: 5, hp: 30, dodge: 5 },
    description: '普通白鹤，性情温顺'
  },
  scarlet_crane: {
    id: 'scarlet_crane',
    name: '丹顶鹤',
    type: 'crane',
    quality: 'uncommon',
    speed: 90,
    attributes: { atk: 20, hp: 80, dodge: 12 },
    description: '头顶丹红，姿态优美'
  },
  thunder_crane: {
    id: 'thunder_crane',
    name: '雷鹤',
    type: 'crane',
    quality: 'rare',
    speed: 130,
    attributes: { atk: 60, hp: 200, dodge: 20, crit: 8 },
    description: '驾驭雷电的仙鹤'
  },
  phoenix_crane: {
    id: 'phoenix_crane',
    name: '火鹤',
    type: 'crane',
    quality: 'epic',
    speed: 190,
    attributes: { atk: 180, hp: 500, dodge: 35, crit: 20, atk_speed: 10 },
    description: '浴火重生的仙鹤'
  },
  celestial_crane: {
    id: 'celestial_crane',
    name: '天鹤',
    type: 'crane',
    quality: 'legendary',
    speed: 260,
    attributes: { atk: 450, hp: 1200, dodge: 50, crit: 40, atk_speed: 25, all_attributes: 50 },
    description: '天界神禽，超凡脱俗'
  },

  // ========== 麒麟类坐骑 ==========
  stone_qilin: {
    id: 'stone_qilin',
    name: '石麒麟',
    type: 'qilin',
    quality: 'common',
    speed: 30,
    attributes: { hp: 100, def: 20 },
    description: '石质麒麟，稳重耐用'
  },
  jade_qilin: {
    id: 'jade_qilin',
    name: '玉麒麟',
    type: 'qilin',
    quality: 'uncommon',
    speed: 60,
    attributes: { hp: 250, def: 50, atk: 15 },
    description: '玉石所化，瑞气盈盈'
  },
  azure_qilin: {
    id: 'azure_qilin',
    name: '青麒麟',
    type: 'qilin',
    quality: 'rare',
    speed: 100,
    attributes: { hp: 600, def: 120, atk: 50, hp_regen: 5 },
    description: '青色神兽，掌控生机'
  },
  divine_qilin: {
    id: 'divine_qilin',
    name: '神麒麟',
    type: 'qilin',
    quality: 'epic',
    speed: 150,
    attributes: { hp: 1500, def: 250, atk: 150, hp_regen: 15, dodge: 15 },
    description: '神兽麒麟，祥瑞之兆'
  },
  primordial_qilin: {
    id: 'primordial_qilin',
    name: '祖麒麟',
    type: 'qilin',
    quality: 'legendary',
    speed: 200,
    attributes: { hp: 3500, def: 500, atk: 400, hp_regen: 40, dodge: 30, crit: 25, all_attributes: 100 },
    description: '麒麟始祖，混沌瑞兽'
  }
};

// 坐骑品质配置
const MOUNT_QUALITY = {
  common: { name: '普通', color: '#8B8B8B', speed_bonus: 1.0 },
  uncommon: { name: '优秀', color: '#00FF7F', speed_bonus: 1.2 },
  rare: { name: '稀有', color: '#1E90FF', speed_bonus: 1.5 },
  epic: { name: '史诗', color: '#9932CC', speed_bonus: 2.0 },
  legendary: { name: '传说', color: '#FFD700', speed_bonus: 3.0 }
};

/**
 * 获取所有可用坐骑
 * @returns {Array} 坐骑列表
 */
function getMounts() {
  return Object.values(MOUNT_DATA).map(mount => ({
    id: mount.id,
    name: mount.name,
    type: MOUNT_TYPES[mount.type].name,
    type_icon: MOUNT_TYPES[mount.type].icon,
    quality: MOUNT_QUALITY[mount.quality].name,
    quality_color: MOUNT_QUALITY[mount.quality].color,
    speed: Math.floor(mount.speed * MOUNT_QUALITY[mount.quality].speed_bonus),
    attributes: mount.attributes,
    description: mount.description
  }));
}

/**
 * 获取指定坐骑详情
 * @param {string} id - 坐骑ID
 * @returns {Object|null} 坐骑详情
 */
function getMountById(id) {
  const mount = MOUNT_DATA[id];
  if (!mount) return null;

  return {
    id: mount.id,
    name: mount.name,
    type: MOUNT_TYPES[mount.type].name,
    type_icon: MOUNT_TYPES[mount.type].icon,
    quality: MOUNT_QUALITY[mount.quality].name,
    quality_color: MOUNT_QUALITY[mount.quality].color,
    speed: Math.floor(mount.speed * MOUNT_QUALITY[mount.quality].speed_bonus),
    attributes: mount.attributes,
    description: mount.description
  };
}

/**
 * 骑乘坐骑
 * @param {string} id - 坐骑ID
 * @returns {Object} 骑乘结果
 */
function ride(id) {
  const mount = MOUNT_DATA[id];
  
  if (!mount) {
    return { success: false, message: '坐骑不存在' };
  }

  const qualityConfig = MOUNT_QUALITY[mount.quality];
  const typeConfig = MOUNT_TYPES[mount.type];
  const speedBonus = qualityConfig.speed_bonus;

  // 计算实际属性加成
  const actualSpeed = Math.floor(mount.speed * speedBonus);
  const actualAttributes = {};
  
  for (const [key, value] of Object.entries(mount.attributes)) {
    actualAttributes[key] = Math.floor(value * speedBonus);
  }

  return {
    success: true,
    message: `成功骑乘 ${typeConfig.icon}${mount.name}，速度+${actualSpeed}`,
    mount: {
      id: mount.id,
      name: mount.name,
      type: typeConfig.name,
      type_icon: typeConfig.icon,
      speed: actualSpeed,
      attributes: actualAttributes,
      description: mount.description
    },
    attributes_bonus: actualAttributes,
    speed_bonus: actualSpeed
  };
}

/**
 * 按类型获取坐骑
 * @param {string} type - 坐骑类型 (sword/gourd/crane/qilin)
 * @returns {Array} 该类型的坐骑列表
 */
function getMountsByType(type) {
  return Object.values(MOUNT_DATA)
    .filter(mount => mount.type === type)
    .map(mount => ({
      id: mount.id,
      name: mount.name,
      quality: MOUNT_QUALITY[mount.quality].name,
      speed: Math.floor(mount.speed * MOUNT_QUALITY[mount.quality].speed_bonus),
      attributes: mount.attributes,
      description: mount.description
    }));
}

/**
 * 按品质获取坐骑
 * @param {string} quality - 品质等级
 * @returns {Array} 该品质的坐骑列表
 */
function getMountsByQuality(quality) {
  return Object.values(MOUNT_DATA)
    .filter(mount => mount.quality === quality)
    .map(mount => ({
      id: mount.id,
      name: mount.name,
      type: MOUNT_TYPES[mount.type].name,
      speed: Math.floor(mount.speed * MOUNT_QUALITY[mount.quality].speed_bonus),
      attributes: mount.attributes,
      description: mount.description
    }));
}

module.exports = {
  MOUNT_TYPES,
  MOUNT_DATA,
  MOUNT_QUALITY,
  getMounts,
  getMountById,
  ride,
  getMountsByType,
  getMountsByQuality
};
