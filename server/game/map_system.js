/**
 * 挂机修仙 - 洞天福地系统
 * 地图探索与区域系统
 */

// ==================== 地图区域配置 ====================
const MAP_AREAS = {
  // 新手村 - 起始区域
  'newbie_village': {
    id: 'newbie_village',
    name: '新手村',
    emoji: '🏘️',
    description: '灵气稀薄的凡人村落，是修仙的起点',
    minLevel: 1,
    minRealm: 0,
    // 背景图预留接口
    background: null,  // 替换为: 'assets/backgrounds/newbie_village.jpg'
    // 怪物列表
    monsters: [
      { id: 'rabbit', name: '野兔', hp: 20, atk: 3, def: 0, exp: 10, stones: 5, emoji: '🐰' },
      { id: 'chicken', name: '野鸡', hp: 15, atk: 2, def: 0, exp: 8, stones: 3, emoji: '🐔' },
      { id: 'wolf', name: '野狼', hp: 40, atk: 8, def: 2, exp: 25, stones: 15, emoji: '🐺' }
    ],
    // 产出资源
    resources: [
      { id: 'grass', name: '杂草', emoji: '🌿', minAmount: 1, maxAmount: 3, chance: 0.3 },
      { id: 'herb_low', name: '低阶灵草', emoji: '🌱', minAmount: 1, maxAmount: 2, chance: 0.15 },
      { id: 'stone_low', name: '低级矿石', emoji: '🪨', minAmount: 1, maxAmount: 2, chance: 0.2 }
    ],
    // 探索事件权重
    eventWeights: {
      combat: 30,      // 战斗
      gather: 40,      // 采集
      treasure: 10,    // 宝藏
      portal: 5,       // 传送门
      nothing: 15      // 空手而归
    },
    // 可传送到的其他区域
    connectedAreas: ['qingfeng_mountain'],
    // 探索消耗
    exploreCost: 5    // 灵气
  },

  // 清风山 - 第一进阶区域
  'qingfeng_mountain': {
    id: 'qingfeng_mountain',
    name: '清风山',
    emoji: '⛰️',
    description: '山清水秀，灵气比新手村浓郁许多',
    minLevel: 5,
    minRealm: 1,
    background: null,
    monsters: [
      { id: 'snake', name: '毒蛇', hp: 60, atk: 12, def: 3, exp: 40, stones: 20, emoji: '🐍' },
      { id: 'monkey', name: '灵猴', hp: 80, atk: 15, def: 5, exp: 55, stones: 30, emoji: '🐒' },
      { id: 'tiger', name: '猛虎', hp: 120, atk: 25, def: 8, exp: 80, stones: 50, emoji: '🐅' }
    ],
    resources: [
      { id: 'herb_low', name: '低阶灵草', emoji: '🌱', minAmount: 1, maxAmount: 3, chance: 0.35 },
      { id: 'herb_mid', name: '中阶灵草', emoji: '🌿', minAmount: 1, maxAmount: 2, chance: 0.2 },
      { id: 'stone_mid', name: '中级矿石', emoji: '💎', minAmount: 1, maxAmount: 2, chance: 0.25 }
    ],
    eventWeights: {
      combat: 35,
      gather: 35,
      treasure: 15,
      portal: 10,
      nothing: 5
    },
    connectedAreas: ['newbie_village', 'heishui_cave'],
    exploreCost: 10
  },

  // 黑水洞 - 第二进阶区域
  'heishui_cave': {
    id: 'heishui_cave',
    name: '黑水洞',
    emoji: '🕳️',
    description: '阴暗潮湿的洞穴，栖息着许多妖邪之物',
    minLevel: 15,
    minRealm: 2,
    background: null,
    monsters: [
      { id: 'bat', name: '吸血蝠', hp: 100, atk: 20, def: 5, exp: 70, stones: 40, emoji: '🦇' },
      { id: 'spider', name: '毒蜘蛛', hp: 150, atk: 30, def: 10, exp: 100, stones: 60, emoji: '🕷️' },
      { id: 'skeleton', name: '骷髅怪', hp: 200, atk: 40, def: 15, exp: 150, stones: 80, emoji: '💀' },
      { id: 'ghost', name: '游魂', hp: 180, atk: 35, def: 8, exp: 120, stones: 70, emoji: '👻' }
    ],
    resources: [
      { id: 'herb_mid', name: '中阶灵草', emoji: '🌿', minAmount: 2, maxAmount: 4, chance: 0.3 },
      { id: 'herb_high', name: '高阶灵草', emoji: '🍀', minAmount: 1, maxAmount: 2, chance: 0.15 },
      { id: 'stone_high', name: '高级矿石', emoji: '💠', minAmount: 1, maxAmount: 2, chance: 0.2 },
      { id: 'bone', name: '骸骨', emoji: '🦴', minAmount: 1, maxAmount: 3, chance: 0.25 }
    ],
    eventWeights: {
      combat: 45,
      gather: 25,
      treasure: 15,
      portal: 10,
      nothing: 5
    },
    connectedAreas: ['qingfeng_mountain', 'tianyun_peak'],
    exploreCost: 20
  },

  // 天云峰 - 第三进阶区域
  'tianyun_peak': {
    id: 'tianyun_peak',
    name: '天云峰',
    emoji: '🏔️',
    description: '高耸入云的山峰，是修仙者们的圣地',
    minLevel: 25,
    minRealm: 3,
    background: null,
    monsters: [
      { id: 'eagle', name: '云鹰', hp: 300, atk: 50, def: 20, exp: 200, stones: 120, emoji: '🦅' },
      { id: 'wolf_spirit', name: '狼灵', hp: 400, atk: 65, def: 25, exp: 280, stones: 160, emoji: '🐺' },
      { id: 'demon', name: '妖魔', hp: 500, atk: 80, def: 30, exp: 350, stones: 200, emoji: '👹' },
      { id: 'dragon_spawn', name: '蛟龙幼崽', hp: 800, atk: 120, def: 50, exp: 600, stones: 400, emoji: '🐉' }
    ],
    resources: [
      { id: 'herb_high', name: '高阶灵草', emoji: '🍀', minAmount: 2, maxAmount: 4, chance: 0.35 },
      { id: 'herb_rare', name: '稀有灵草', emoji: '🌺', minAmount: 1, maxAmount: 2, chance: 0.15 },
      { id: 'crystal', name: '灵石原矿', emoji: '💎', minAmount: 1, maxAmount: 3, chance: 0.25 },
      { id: 'jade', name: '玉髓', emoji: '🀄', minAmount: 1, maxAmount: 2, chance: 0.1 }
    ],
    eventWeights: {
      combat: 40,
      gather: 25,
      treasure: 20,
      portal: 10,
      nothing: 5
    },
    connectedAreas: ['heishui_cave'],
    exploreCost: 35
  }
};

// ==================== 宝藏配置 ====================
const TREASURE_DATA = {
  // 普通宝箱
  common: [
    { id: 'stone_small', name: '小袋灵石', amount: [10, 50], chance: 0.4 },
    { id: 'herb_low', name: '低阶灵草', amount: [1, 3], chance: 0.3 },
    { id: 'equipment_wood', name: '木剑', chance: 0.2 },
    { id: 'potion_heal', name: '疗伤丹', amount: [1, 2], chance: 0.1 }
  ],
  // 中级宝箱
  medium: [
    { id: 'stone_medium', name: '中袋灵石', amount: [50, 200], chance: 0.35 },
    { id: 'herb_mid', name: '中阶灵草', amount: [2, 5], chance: 0.25 },
    { id: 'equipment_iron', name: '铁剑', chance: 0.2 },
    { id: 'potion_spirit', name: '灵气丹', amount: [1, 3], chance: 0.15 },
    { id: 'technique_book', name: '功法残页', chance: 0.05 }
  ],
  // 高级宝箱
  rare: [
    { id: 'stone_large', name: '大袋灵石', amount: [200, 1000], chance: 0.3 },
    { id: 'herb_high', name: '高阶灵草', amount: [3, 8], chance: 0.25 },
    { id: 'equipment_silver', name: '银剑', chance: 0.15 },
    { id: 'potion_realm', name: '境界突破丹', chance: 0.1 },
    { id: 'artifact_random', name: '随机法宝', chance: 0.1 },
    { id: 'technique_book', name: '功法秘典', chance: 0.1 }
  ]
};

// ==================== 传送门配置 ====================
const PORTAL_DATA = {
  // 固定传送点
  fixed: [
    { from: 'newbie_village', to: 'qingfeng_mountain', name: '上山之路' },
    { from: 'qingfeng_mountain', to: 'heishui_cave', name: '山洞入口' },
    { from: 'heishui_cave', to: 'tianyun_peak', name: '云端之路' }
  ],
  // 随机传送点（探索时触发）
  random: [
    { to: 'newbie_village', name: '回村传送', weight: 10 },
    { to: 'qingfeng_mountain', name: '清风山传送', weight: 25 },
    { to: 'heishui_cave', name: '黑水洞传送', weight: 20 },
    { to: 'tianyun_peak', name: '天云峰传送', weight: 15 }
  ]
};

// ==================== 区域头像配置 ====================
const AREA_AVATARS = {
  // 格式: 'areaId': '图片URL'
  // 示例: 'newbie_village': 'assets/backgrounds/newbie_village.png'
  // 暂时使用 emoji 备选
};

// ==================== 怪物头像配置 ====================
const MAP_MONSTER_AVATARS = {
  // 预留图片接口，格式: 'monsterId': '图片URL'
  // 示例: 'rabbit': 'assets/monsters/rabbit.png'
};

// ==================== 洞天福地系统类 ====================
class MapSystem {
  constructor() {
    this.areas = MAP_AREAS;
    this.treasures = TREASURE_DATA;
    this.portals = PORTAL_DATA;
    this.areaAvatars = AREA_AVATARS;
    this.monsterAvatars = MAP_MONSTER_AVATARS;
    
    // 玩家区域探索记录
    this.exploreHistory = [];
    
    // 当前所在区域
    this.currentArea = 'newbie_village';
  }

  /**
   * 初始化洞天福地系统
   * @param {object} gameState - 游戏状态
   */
  init(gameState) {
    if (!gameState.map) {
      gameState.map = {
        currentArea: 'newbie_village',
        visitedAreas: ['newbie_village'],
        exploreCount: 0,
        treasuresFound: 0,
        resourcesGathered: {},
        monstersKilled: {}
      };
    }
    this.currentArea = gameState.map.currentArea || 'newbie_village';
    return gameState.map;
  }

  /**
   * 获取所有可访问的区域
   * @param {object} player - 玩家数据
   * @returns {array} - 可访问区域列表
   */
  getAreas(player) {
    const result = [];
    for (const [id, area] of Object.entries(this.areas)) {
      // 检查等级和境界要求
      const canAccess = player.level >= area.minLevel && player.realmLevel >= area.minRealm;
      result.push({
        id: area.id,
        name: area.name,
        emoji: area.emoji,
        description: area.description,
        minLevel: area.minLevel,
        minRealm: area.minRealm,
        canAccess: canAccess,
        // 头像预留接口
        avatar: this.areaAvatars[id] || area.emoji,
        background: area.background
      });
    }
    return result;
  }

  /**
   * 获取指定区域的详细信息
   * @param {string} areaId - 区域ID
   * @returns {object|null} - 区域数据
   */
  getAreaInfo(areaId) {
    return this.areas[areaId] || null;
  }

  /**
   * 获取当前所在区域
   * @returns {object} - 当前区域数据
   */
  getCurrentArea() {
    return this.areas[this.currentArea] || this.areas['newbie_village'];
  }

  /**
   * 传送到指定区域
   * @param {string} areaId - 目标区域ID
   * @param {object} player - 玩家数据
   * @returns {object} - 传送结果
   */
  travel(areaId, player) {
    const targetArea = this.areas[areaId];
    if (!targetArea) {
      return { success: false, message: '❌ 区域不存在' };
    }

    // 检查是否已访问过或是否有连接
    const currentAreaData = this.areas[this.currentArea];
    const isConnected = currentAreaData?.connectedAreas.includes(areaId);
    const isVisited = player.map?.visitedAreas?.includes(areaId);

    if (!isConnected && !isVisited) {
      return { success: false, message: '❌ 无法直接传送到该区域' };
    }

    // 检查等级和境界要求
    if (player.level < targetArea.minLevel) {
      return { success: false, message: `❌ 需要等级 ${targetArea.minLevel}` };
    }
    if (player.realmLevel < targetArea.minRealm) {
      const realmNames = ['凡人', '练气期', '筑基期', '金丹期', '元婴期', '化神期'];
      return { success: false, message: `❌ 需要境界 ${realmNames[targetArea.minRealm] || '更高境界'}` };
    }

    // 传送成功
    this.currentArea = areaId;
    if (player.map) {
      if (!player.map.visitedAreas.includes(areaId)) {
        player.map.visitedAreas.push(areaId);
      }
      player.map.currentArea = areaId;
    }

    return {
      success: true,
      message: `✨ 传送到 ${targetArea.emoji} ${targetArea.name}`,
      area: {
        id: targetArea.id,
        name: targetArea.name,
        emoji: targetArea.emoji,
        description: targetArea.description
      }
    };
  }

  /**
   * 探索指定区域
   * @param {string} areaId - 区域ID
   * @param {object} player - 玩家数据
   * @param {number} playerSpirit - 当前灵气
   * @returns {object} - 探索结果
   */
  explore(areaId, player, playerSpirit) {
    const area = this.areas[areaId];
    if (!area) {
      return { success: false, message: '❌ 区域不存在' };
    }

    // 检查等级和境界要求
    if (player.level < area.minLevel) {
      return { success: false, message: `❌ 需要等级 ${area.minLevel}` };
    }
    if (player.realmLevel < area.minRealm) {
      const realmNames = ['凡人', '练气期', '筑基期', '金丹期', '元婴期', '化神期'];
      return { success: false, message: `❌ 需要境界 ${realmNames[area.minRealm] || '更高境界'}` };
    }

    // 检查灵气是否足够
    if (playerSpirit < area.exploreCost) {
      return { success: false, message: `❌ 探索需要 ${area.exploreCost} 灵气，当前只有 ${playerSpirit} 灵气` };
    }

    // 执行探索
    const event = this.getRandomEvent(area.eventWeights);
    const result = this.processEvent(event, area, player);

    // 记录探索历史
    this.exploreHistory.push({
      areaId: areaId,
      event: event,
      timestamp: Date.now()
    });

    // 更新统计
    if (player.map) {
      player.map.exploreCount = (player.map.exploreCount || 0) + 1;
    }

    return {
      success: true,
      event: event,
      cost: area.exploreCost,
      ...result
    };
  }

  /**
   * 根据权重随机获取事件类型
   * @param {object} weights - 事件权重配置
   * @returns {string} - 事件类型
   */
  getRandomEvent(weights) {
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let random = Math.random() * total;
    
    for (const [event, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) return event;
    }
    return 'nothing';
  }

  /**
   * 处理探索事件
   * @param {string} event - 事件类型
   * @param {object} area - 区域数据
   * @param {object} player - 玩家数据
   * @returns {object} - 事件处理结果
   */
  processEvent(event, area, player) {
    switch (event) {
      case 'combat':
        return this.handleCombat(area, player);
      case 'gather':
        return this.handleGather(area, player);
      case 'treasure':
        return this.handleTreasure(area, player);
      case 'portal':
        return this.handlePortal(area, player);
      case 'nothing':
      default:
        return this.handleNothing(area);
    }
  }

  /**
   * 处理战斗事件
   */
  handleCombat(area, player) {
    // 随机选择一个怪物
    const monster = area.monsters[Math.floor(Math.random() * area.monsters.length)];
    const monsterWithAvatar = {
      ...monster,
      avatar: this.monsterAvatars[monster.id] || monster.emoji
    };

    // 更新击杀统计
    if (player.map) {
      player.map.monstersKilled[monster.id] = (player.map.monstersKilled[monster.id] || 0) + 1;
    }

    return {
      type: 'combat',
      message: `⚔️ 遭遇 ${monster.emoji} ${monster.name}!`,
      monster: monsterWithAvatar,
      // 返回战斗所需数据
      battle: {
        monsterId: monster.id,
        monsterName: monster.name,
        monsterHp: monster.hp,
        monsterAtk: monster.atk,
        monsterDef: monster.def,
        monsterExp: monster.exp,
        monsterStones: monster.stones,
        emoji: monster.emoji
      }
    };
  }

  /**
   * 处理采集事件
   */
  handleGather(area, player) {
    const resources = area.resources.filter(() => Math.random() < 0.7);
    
    if (resources.length === 0) {
      return this.handleNothing(area);
    }

    const gathered = [];
    for (const res of resources) {
      const amount = Math.floor(Math.random() * (res.maxAmount - res.minAmount + 1)) + res.minAmount;
      if (amount > 0) {
        gathered.push({
          id: res.id,
          name: res.name,
          emoji: res.emoji,
          amount: amount
        });

        // 更新采集统计
        if (player.map) {
          player.map.resourcesGathered[res.id] = (player.map.resourcesGathered[res.id] || 0) + amount;
        }
      }
    }

    return {
      type: 'gather',
      message: `🌿 采集到 ${gathered.map(r => `${r.emoji}${r.name}x${r.amount}`).join(' ')}`,
      resources: gathered
    };
  }

  /**
   * 处理宝藏事件
   */
  handleTreasure(area, player) {
    // 根据区域等级决定宝箱品质
    let treasureLevel = 'common';
    if (area.minLevel >= 25) {
      treasureLevel = 'rare';
    } else if (area.minLevel >= 15) {
      treasureLevel = 'medium';
    }

    const treasures = this.treasures[treasureLevel];
    const treasure = treasures[Math.floor(Math.random() * treasures.length)];
    
    // 计算实际获得数量
    let amount = 1;
    if (treasure.amount) {
      amount = Math.floor(Math.random() * (treasure.amount[1] - treasure.amount[0] + 1)) + treasure.amount[0];
    }

    // 更新宝藏统计
    if (player.map) {
      player.map.treasuresFound = (player.map.treasuresFound || 0) + 1;
    }

    return {
      type: 'treasure',
      message: `🎁 发现${treasureLevel === 'rare' ? '稀有' : treasureLevel === 'medium' ? '中级' : ''}宝箱，获得 ${treasure.name}${amount > 1 ? `x${amount}` : ''}`,
      treasure: {
        id: treasure.id,
        name: treasure.name,
        amount: amount
      }
    };
  }

  /**
   * 处理传送门事件
   */
  handlePortal(area, player) {
    // 筛选可用的随机传送点
    const availablePortals = this.portals.random.filter(p => {
      const targetArea = this.areas[p.to];
      return targetArea && player.level >= targetArea.minLevel;
    });

    if (availablePortals.length === 0) {
      return this.handleNothing(area);
    }

    // 根据权重随机选择传送点
    const totalWeight = availablePortals.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;
    
    let selectedPortal = availablePortals[0];
    for (const portal of availablePortals) {
      random -= portal.weight;
      if (random <= 0) {
        selectedPortal = portal;
        break;
      }
    }

    const targetArea = this.areas[selectedPortal.to];

    return {
      type: 'portal',
      message: `🌀 发现传送门：${selectedPortal.name} → ${targetArea.emoji} ${targetArea.name}`,
      portal: {
        to: selectedPortal.to,
        name: selectedPortal.name,
        targetArea: {
          id: targetArea.id,
          name: targetArea.name,
          emoji: targetArea.emoji
        }
      }
    };
  }

  /**
   * 处理空手而归
   */
  handleNothing(area) {
    const messages = [
      '🔍 在区域内搜索一番，什么也没发现...',
      '😔 这里似乎已经被探索过了...',
      '🌫️ 一阵风吹过，什么都没有...',
      '💨 尘土飞扬，却一无所获...'
    ];
    const message = messages[Math.floor(Math.random() * messages.length)];

    return {
      type: 'nothing',
      message: message
    };
  }

  /**
   * 获取可探索的区域列表（基于玩家等级）
   * @param {object} player - 玩家数据
   * @returns {array} - 可探索区域列表
   */
  getExplorableAreas(player) {
    const result = [];
    for (const [id, area] of Object.entries(this.areas)) {
      if (player.level >= area.minLevel && player.realmLevel >= area.minRealm) {
        result.push({
          id: area.id,
          name: area.name,
          emoji: area.emoji,
          description: area.description,
          exploreCost: area.exploreCost,
          canTravel: area.connectedAreas.length > 0
        });
      }
    }
    return result;
  }

  /**
   * 获取探索统计
   * @param {object} player - 玩家数据
   * @returns {object} - 探索统计
   */
  getExploreStats(player) {
    if (!player.map) {
      return {
        currentArea: 'newbie_village',
        visitedAreas: ['newbie_village'],
        exploreCount: 0,
        treasuresFound: 0,
        resourcesGathered: {},
        monstersKilled: {}
      };
    }
    return player.map;
  }

  /**
   * 获取探索历史
   * @param {number} limit - 返回最近N条记录
   * @returns {array} - 探索历史
   */
  getHistory(limit = 10) {
    return this.exploreHistory.slice(-limit);
  }
}

// 创建单例实例
const mapSystem = new MapSystem();

// 导出到全局
window.MAP_AREAS = MAP_AREAS;
window.TREASURE_DATA = TREASURE_DATA;
window.PORTAL_DATA = PORTAL_DATA;
window.MAP_MONSTER_AVATARS = MAP_MONSTER_AVATARS;
window.AREA_AVATARS = AREA_AVATARS;
window.MapSystem = MapSystem;
window.mapSystem = mapSystem;
