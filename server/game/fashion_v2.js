/**
 * 时装系统 v2.0
 * 包含：时装类型、套装效果
 */

// ============ 时装品质 ============
const FASHION_QUALITY = {
  common: { name: '普通', color: '#8B8B8B', bonus_rate: 1.0 },
  rare: { name: '稀有', color: '#00FF7F', bonus_rate: 1.5 },
  epic: { name: '史诗', color: '#1E90FF', bonus_rate: 2.0 },
  legendary: { name: '传说', color: '#FFD700', bonus_rate: 3.0 },
  mythic: { name: '神话', color: '#FF4500', bonus_rate: 5.0 }
};

// ============ 时装类型槽位 ============
const FASHION_SLOTS = {
  head: { name: '头部', icon: '🎩', position: 1 },
  body: { name: '上衣', icon: '👕', position: 2 },
  pants: { name: '裤子', icon: '👖', position: 3 },
  shoes: { name: '鞋子', icon: '👟', position: 4 },
  weapon: { name: '武器外观', icon: '⚔️', position: 5 },
  wing: { name: '翅膀', icon: '🪽', position: 6 },
  aura: { name: '光环', icon: '✨', position: 7 },
  mount: { name: '坐骑', icon: '🐎', position: 8 }
};

// ============ 时装数据 ============
const FASHION_DATA = {
  // 头部时装
  'scholar_hat': { name: '儒生巾', type: 'head', quality: 'common', atk: 5, def: 3, hp: 50, icon: '🎓', price: 100 },
  'jade_crown': { name: '玉冠', type: 'head', quality: 'rare', atk: 20, def: 10, hp: 200, icon: '👑', price: 1000 },
  'thunder_crown': { name: '雷帝冠', type: 'head', quality: 'epic', atk: 50, def: 25, hp: 500, icon: '⚡', price: 10000 },
  'immortal_crown': { name: '仙王冠', type: 'head', quality: 'legendary', atk: 150, def: 80, hp: 1500, icon: '🌟', price: 100000 },
  'world_crown': { name: '天道冠', type: 'head', quality: 'mythic', atk: 500, def: 250, hp: 5000, icon: '☀️', price: 1000000 },

  // 上衣时装
  '布衣': { name: '粗布衣', type: 'body', quality: 'common', atk: 8, def: 10, hp: 80, icon: '👕', price: 100 },
  'silk_robe': { name: '丝绸长袍', type: 'body', quality: 'rare', atk: 30, def: 35, hp: 300, icon: '👘', price: 1000 },
  'dragon_robe': { name: '龙纹袍', type: 'body', quality: 'epic', atk: 80, def: 90, hp: 800, icon: '🐉', price: 10000 },
  'immortal_robe_fashion': { name: '仙羽衣', type: 'body', quality: 'legendary', atk: 250, def: 280, hp: 2500, icon: '🪶', price: 100000 },
  'world_robe': { name: '大道袍', type: 'body', quality: 'mythic', atk: 800, def: 900, hp: 8000, icon: '🌌', price: 1000000 },

  // 裤子时装
  '麻裤': { name: '粗麻裤', type: 'pants', quality: 'common', atk: 5, def: 8, hp: 60, icon: '👖', price: 100 },
  'silk_pants': { name: '丝绸裤', type: 'pants', quality: 'rare', atk: 20, def: 25, hp: 250, icon: '🥋', price: 1000 },
  'dragon_pants': { name: '龙鳞裤', type: 'pants', quality: 'epic', atk: 50, def: 70, hp: 600, icon: '🐲', price: 10000 },
  'immortal_pants': { name: '仙履裤', type: 'pants', quality: 'legendary', atk: 180, def: 220, hp: 2000, icon: '✨', price: 100000 },
  'world_pants': { name: '天地裤', type: 'pants', quality: 'mythic', atk: 600, def: 700, hp: 6000, icon: '🌍', price: 1000000 },

  // 鞋子时装
  '草鞋': { name: '草鞋', type: 'shoes', quality: 'common', atk: 3, def: 5, hp: 40, icon: '🩴', price: 100 },
  'jade_shoes': { name: '踏云靴', type: 'shoes', quality: 'rare', atk: 15, def: 18, hp: 180, icon: '👞', price: 1000 },
  'thunder_boots': { name: '雷鸣靴', type: 'shoes', quality: 'epic', atk: 40, def: 50, hp: 450, icon: '👢', price: 10000 },
  'immortal_boots': { name: '飞仙靴', type: 'shoes', quality: 'legendary', atk: 120, def: 150, hp: 1500, icon: '🪽', price: 100000 },
  'world_boots': { name: '乾坤靴', type: 'shoes', quality: 'mythic', atk: 400, def: 500, hp: 4500, icon: '🌟', price: 1000000 },

  // 武器外观
  '木剑': { name: '木剑', type: 'weapon', quality: 'common', atk: 10, def: 0, hp: 30, icon: '🪵', price: 100 },
  'iron_sword_fashion': { name: '铁剑', type: 'weapon', quality: 'common', atk: 15, def: 2, hp: 50, icon: '🗡️', price: 200 },
  'jade_sword': { name: '玉剑', type: 'weapon', quality: 'rare', atk: 40, def: 8, hp: 150, icon: '🔪', price: 1000 },
  'flame_sword_fashion': { name: '烈焰剑', type: 'weapon', quality: 'epic', atk: 100, def: 20, hp: 400, icon: '🔥', price: 10000 },
  'thunder_sword_fashion': { name: '雷霆剑', type: 'weapon', quality: 'legendary', atk: 300, def: 60, hp: 1200, icon: '⚡', price: 100000 },
  'world_sword_fashion': { name: '开天剑', type: 'weapon', quality: 'mythic', atk: 1000, def: 200, hp: 4000, icon: '🌞', price: 1000000 },

  // 翅膀
  '雏鸟之翼': { name: '雏鸟之翼', type: 'wing', quality: 'common', atk: 8, def: 5, hp: 80, icon: '🐣', price: 200 },
  'feather_wing': { name: '羽翼', type: 'wing', quality: 'rare', atk: 25, def: 18, hp: 250, icon: '🪶', price: 1500 },
  'spirit_wing': { name: '灵翼', type: 'wing', quality: 'epic', atk: 70, def: 45, hp: 650, icon: '🪽', price: 15000 },
  'dragon_wing': { name: '龙翼', type: 'wing', quality: 'legendary', atk: 200, def: 140, hp: 2000, icon: '🐉', price: 150000 },
  'world_wing': { name: '天翼', type: 'wing', quality: 'mythic', atk: 650, def: 450, hp: 6500, icon: '🌈', price: 1500000 },

  // 光环
  'small_aura': { name: '小光环', type: 'aura', quality: 'common', atk: 5, def: 8, hp: 100, icon: '⭕', price: 300 },
  'spirit_aura': { name: '灵气光环', type: 'aura', quality: 'rare', atk: 20, def: 30, hp: 350, icon: '💫', price: 2000 },
  'fire_aura': { name: '烈焰光环', type: 'aura', quality: 'epic', atk: 55, def: 80, hp: 900, icon: '🔥', price: 20000 },
  'immortal_aura_fashion': { name: '仙灵光环', type: 'aura', quality: 'legendary', atk: 180, def: 250, hp: 2800, icon: '✨', price: 200000 },
  'world_aura': { name: '大道光环', type: 'aura', quality: 'mythic', atk: 600, def: 800, hp: 9000, icon: '🌟', price: 2000000 },

  // 坐骑
  '毛驴': { name: '小毛驴', type: 'mount', quality: 'common', atk: 10, def: 10, hp: 150, icon: '🫏', price: 500 },
  'horse': { name: '骏马', type: 'mount', quality: 'rare', atk: 35, def: 35, hp: 500, icon: '🐴', price: 3000 },
  'white_tiger': { name: '白虎', type: 'mount', quality: 'epic', atk: 100, def: 100, hp: 1400, icon: '🐅', price: 30000 },
  'qilin': { name: '麒麟', type: 'mount', quality: 'legendary', atk: 320, def: 320, hp: 4500, icon: '🦄', price: 300000 },
  'dragon_mount': { name: '神龙', type: 'mount', quality: 'mythic', atk: 1100, def: 1100, hp: 15000, icon: '🐉', price: 3000000 }
};

// ============ 套装定义 ============
const FASHION_SETS = {
  // 凡人套装 (普通)
  'mortal_set': {
    name: '凡人套装',
    quality: 'common',
    required: ['scholar_hat', '布衣', '麻裤', '草鞋', '木剑'],
    bonus: {
      2: { hp_percent: 0.05, atk_percent: 0.05, def_percent: 0.05 },
      3: { hp_percent: 0.10, atk_percent: 0.10, def_percent: 0.10 },
      5: { hp_percent: 0.20, atk_percent: 0.20, def_percent: 0.20 }
    },
    icon: '👤',
    description: '凡人基础套装，激活额外属性加成'
  },

  // 修真套装 (稀有)
  'cultivator_set': {
    name: '修真套装',
    quality: 'rare',
    required: ['jade_crown', 'silk_robe', 'silk_pants', 'jade_shoes', 'jade_sword'],
    bonus: {
      2: { hp_percent: 0.10, atk_percent: 0.08, def_percent: 0.08 },
      3: { hp_percent: 0.18, atk_percent: 0.15, def_percent: 0.15 },
      5: { hp_percent: 0.35, atk_percent: 0.30, def_percent: 0.30 }
    },
    icon: '🧘',
    description: '修真者进阶套装，大幅提升战力'
  },

  // 仙风套装 (史诗)
  'immortal_set': {
    name: '仙风套装',
    quality: 'epic',
    required: ['thunder_crown', 'dragon_robe', 'dragon_pants', 'thunder_boots', 'flame_sword_fashion'],
    bonus: {
      2: { hp_percent: 0.15, atk_percent: 0.12, def_percent: 0.12 },
      3: { hp_percent: 0.28, atk_percent: 0.22, def_percent: 0.22 },
      5: { hp_percent: 0.50, atk_percent: 0.40, def_percent: 0.40 }
    },
    icon: '🧚',
    description: '仙人标配套装，蕴含仙灵之力'
  },

  // 传说套装 (传说)
  'legendary_set': {
    name: '传说套装',
    quality: 'legendary',
    required: ['immortal_crown', 'immortal_robe_fashion', 'immortal_pants', 'immortal_boots', 'thunder_sword_fashion'],
    bonus: {
      2: { hp_percent: 0.20, atk_percent: 0.15, def_percent: 0.15 },
      3: { hp_percent: 0.38, atk_percent: 0.30, def_percent: 0.30 },
      5: { hp_percent: 0.70, atk_percent: 0.55, def_percent: 0.55 }
    },
    icon: '👼',
    description: '传说强者专属，睥睨天下'
  },

  // 神话套装 (神话)
  'mythic_set': {
    name: '神话套装',
    quality: 'mythic',
    required: ['world_crown', 'world_robe', 'world_pants', 'world_boots', 'world_sword_fashion'],
    bonus: {
      2: { hp_percent: 0.25, atk_percent: 0.20, def_percent: 0.20 },
      3: { hp_percent: 0.50, atk_percent: 0.40, def_percent: 0.40 },
      5: { hp_percent: 1.00, atk_percent: 0.80, def_percent: 0.80 }
    },
    icon: '🔱',
    description: '至高神话套装，掌控天地大道'
  },

  // 翅膀套装
  'wing_set': {
    name: '凌云套装',
    quality: 'epic',
    required: ['feather_wing', 'spirit_wing'],
    bonus: {
      2: { hp_percent: 0.15, atk_percent: 0.15, def_percent: 0.10 }
    },
    icon: '🪽',
    description: '羽化登仙，御风而行'
  },

  // 光环套装
  'aura_set': {
    name: '天罡套装',
    quality: 'legendary',
    required: ['spirit_aura', 'fire_aura', 'immortal_aura_fashion'],
    bonus: {
      2: { hp_percent: 0.20, atk_percent: 0.15, def_percent: 0.15 },
      3: { hp_percent: 0.40, atk_percent: 0.30, def_percent: 0.30 }
    },
    icon: '🌟',
    description: '天罡正气，万邪不侵'
  },

  // 坐骑套装
  'mount_set': {
    name: '神兽套装',
    quality: 'legendary',
    required: ['horse', 'white_tiger', 'qilin', 'dragon_mount'],
    bonus: {
      2: { hp_percent: 0.15, atk_percent: 0.12, def_percent: 0.12 },
      3: { hp_percent: 0.30, atk_percent: 0.25, def_percent: 0.25 },
      4: { hp_percent: 0.50, atk_percent: 0.40, def_percent: 0.40 }
    },
    icon: '🦄',
    description: '神兽环绕，威震四方'
  }
};

// ============ 套装效果计算 ============
class FashionSetManager {
  constructor() {
    this.sets = FASHION_SETS;
  }

  /**
   * 计算已激活的套装效果
   * @param {Object} equippedFashion - 已装备的时装ID映射 {slot: fashionId}
   * @returns {Object} - 激活的套装效果 {setId: {set, count, activeBonus}}
   */
  calculateSetBonus(equippedFashion) {
    const equippedIds = Object.values(equippedFashion).filter(id => id);
    const activeSets = {};

    for (const [setId, set] of Object.entries(this.sets)) {
      const matchedCount = set.required.filter(fashionId => equippedIds.includes(fashionId)).length;

      if (matchedCount >= 2) {
        // 找到已激活的最高档位加成
        let activeBonus = null;
        for (const count of [5, 4, 3, 2]) {
          if (matchedCount >= count && set.bonus[count]) {
            activeBonus = {
              count,
              ...set.bonus[count]
            };
            break;
          }
        }

        if (activeBonus) {
          activeSets[setId] = {
            set,
            count: matchedCount,
            activeBonus
          };
        }
      }
    }

    return activeSets;
  }

  /**
   * 获取套装属性加成汇总
   * @param {Object} equippedFashion - 已装备的时装
   * @returns {Object} - 百分比加成 {hp_percent, atk_percent, def_percent}
   */
  getTotalSetBonus(equippedFashion) {
    const activeSets = this.calculateSetBonus(equippedFashion);

    const totalBonus = {
      hp_percent: 0,
      atk_percent: 0,
      def_percent: 0
    };

    for (const { activeBonus } of Object.values(activeSets)) {
      totalBonus.hp_percent += activeBonus.hp_percent || 0;
      totalBonus.atk_percent += activeBonus.atk_percent || 0;
      totalBonus.def_percent += activeBonus.def_percent || 0;
    }

    return totalBonus;
  }

  /**
   * 获取套装信息
   * @param {string} setId - 套装ID
   * @returns {Object|null}
   */
  getSetInfo(setId) {
    return this.sets[setId] || null;
  }

  /**
   * 获取所有套装列表
   * @returns {Array}
   */
  getAllSets() {
    return Object.entries(this.sets).map(([id, set]) => ({
      id,
      ...set
    }));
  }

  /**
   * 获取某时装属于哪个套装
   * @param {string} fashionId - 时装ID
   * @returns {Array} - 包含该时装的套装列表
   */
  getSetsContainingFashion(fashionId) {
    return Object.entries(this.sets)
      .filter(([_, set]) => set.required.includes(fashionId))
      .map(([id, set]) => ({
        id,
        ...set
      }));
  }
}

// ============ 时装管理器 ============
class FashionManager {
  constructor() {
    this.fashionData = FASHION_DATA;
    this.slots = FASHION_SLOTS;
    this.quality = FASHION_QUALITY;
    this.setManager = new FashionSetManager();
  }

  /**
   * 获取时装数据
   * @param {string} fashionId - 时装ID
   * @returns {Object|null}
   */
  getFashion(fashionId) {
    return this.fashionData[fashionId] || null;
  }

  /**
   * 获取所有时装列表
   * @param {string|null} type - 时装类型过滤
   * @returns {Array}
   */
  getAllFashion(type = null) {
    const result = Object.entries(this.fashionData)
      .map(([id, data]) => ({
        id,
        ...data,
        qualityInfo: this.quality[data.quality]
      }));

    if (type) {
      return result.filter(f => f.type === type);
    }
    return result;
  }

  /**
   * 获取某类型的时装
   * @param {string} type - 时装类型
   * @returns {Array}
   */
  getFashionByType(type) {
    return this.getAllFashion(type);
  }

  /**
   * 获取某品质的时装
   * @param {string} quality - 品质
   * @returns {Array}
   */
  getFashionByQuality(quality) {
    return Object.entries(this.fashionData)
      .filter(([_, data]) => data.quality === quality)
      .map(([id, data]) => ({
        id,
        ...data,
        qualityInfo: this.quality[quality]
      }));
  }

  /**
   * 计算时装基础属性
   * @param {Object} equippedFashion - 已装备的时装 {slot: fashionId}
   * @returns {Object} - 基础属性 {atk, def, hp}
   */
  calculateBaseStats(equippedFashion) {
    let stats = { atk: 0, def: 0, hp: 0 };

    for (const [slot, fashionId] of Object.entries(equippedFashion)) {
      if (fashionId && this.fashionData[fashionId]) {
        const fashion = this.fashionData[fashionId];
        const qualityBonus = this.quality[fashion.quality].bonus_rate;
        
        stats.atk += Math.floor(fashion.atk * qualityBonus);
        stats.def += Math.floor(fashion.def * qualityBonus);
        stats.hp += Math.floor(fashion.hp * qualityBonus);
      }
    }

    return stats;
  }

  /**
   * 计算时装总属性（含套装加成）
   * @param {Object} equippedFashion - 已装备的时装
   * @returns {Object} - 总属性
   */
  calculateTotalStats(equippedFashion) {
    const baseStats = this.calculateBaseStats(equippedFashion);
    const setBonus = this.setManager.getTotalSetBonus(equippedFashion);

    return {
      base: baseStats,
      setBonus: setBonus,
      total: {
        atk: Math.floor(baseStats.atk * (1 + setBonus.atk_percent)),
        def: Math.floor(baseStats.def * (1 + setBonus.def_percent)),
        hp: Math.floor(baseStats.hp * (1 + setBonus.hp_percent))
      },
      activeSets: this.setManager.calculateSetBonus(equippedFashion)
    };
  }

  /**
   * 获取时装槽位信息
   * @returns {Object}
   */
  getSlots() {
    return this.slots;
  }

  /**
   * 获取品质信息
   * @returns {Object}
   */
  getQualityInfo() {
    return this.quality;
  }

  /**
   * 获取套装管理器
   * @returns {FashionSetManager}
   */
  getSetManager() {
    return this.setManager;
  }
}

// ============ 导出 ============
module.exports = {
  FASHION_QUALITY,
  FASHION_SLOTS,
  FASHION_DATA,
  FASHION_SETS,
  FashionManager,
  FashionSetManager
};
