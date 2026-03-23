/**
 * 缓存存储层 - 带缓存的数据操作封装
 * 在原有 storage.js 基础上添加缓存加速
 */

const {
  playerCache,
  sectCache,
  beastCache,
  equipmentCache,
  configCache,
  cachedLoad,
  cacheInvalidation,
  startCleanup,
  hotDataManager
} = require('./cache');

// 引入原始存储
const originalStorage = require('./storage');

// ============================================================
// 1. 缓存化玩家数据操作
// ============================================================

const playerStorage = {
  // 创建或获取玩家
  getOrCreatePlayer(playerId, username = null) {
    // 直接操作数据库，不缓存（需要立即获取最新数据）
    return originalStorage.playerStorage.getOrCreatePlayer(playerId, username);
  },

  // 获取玩家数据（带缓存）
  async getPlayer(playerId) {
    const cacheKey = `player:${playerId}`;
    return cachedLoad(
      playerCache,
      () => originalStorage.playerStorage.getOrCreatePlayer(playerId),
      cacheKey,
      [`player:${playerId}`],
      3 * 60 * 1000  // 3分钟缓存
    );
  },

  // 更新玩家灵石（失效缓存）
  updateSpiritStones(playerId, amount) {
    const result = originalStorage.playerStorage.updateSpiritStones(playerId, amount);
    cacheInvalidation.invalidateResources(playerId);
    cacheInvalidation.invalidatePlayer(playerId);
    return result;
  },

  // 更新玩家强化石（失效缓存）
  updateQianghuaStones(playerId, amount) {
    const result = originalStorage.playerStorage.updateQianghuaStones(playerId, amount);
    cacheInvalidation.invalidateResources(playerId);
    return result;
  },

  // 获取玩家强化石数量（带缓存）
  getQianghuaStones(playerId) {
    const cacheKey = `qianghua:${playerId}`;
    const cached = playerCache.get(cacheKey, [`player:${playerId}`]);
    if (cached !== null) return cached;
    
    const value = originalStorage.playerStorage.getQianghuaStones(playerId);
    playerCache.set(cacheKey, value, [`player:${playerId}`], 2 * 60 * 1000);
    return value;
  },

  // 检查玩家是否有足够灵石
  async hasEnoughSpiritStones(playerId, amount) {
    // 实时查询，不缓存（涉及交易安全）
    return originalStorage.playerStorage.hasEnoughSpiritStones(playerId, amount);
  },

  // 扣除玩家灵石（失效缓存）
  async deductSpiritStones(playerId, amount) {
    const result = await originalStorage.playerStorage.deductSpiritStones(playerId, amount);
    cacheInvalidation.invalidateResources(playerId);
    return result;
  },

  // 添加资源（失效缓存）
  async addResources(playerId, spiritStones = 0, exp = 0) {
    const result = await originalStorage.playerStorage.addResources(playerId, spiritStones, exp);
    if (spiritStones > 0) {
      cacheInvalidation.invalidateResources(playerId);
    }
    return result;
  },

  // 更新玩家境界（失效缓存）
  updateRealmLevel(playerId, realmLevel) {
    const result = originalStorage.playerStorage.updateRealmLevel(playerId, realmLevel);
    cacheInvalidation.invalidatePlayer(playerId);
    return result;
  },

  // 更新玩家等级（失效缓存）
  updateLevel(playerId, level) {
    const result = originalStorage.playerStorage.updateLevel(playerId, level);
    cacheInvalidation.invalidatePlayer(playerId);
    return result;
  },

  // 更新玩家经验
  updateExperience(playerId, exp) {
    return originalStorage.playerStorage.updateExperience(playerId, exp);
  }
};

// ============================================================
// 2. 缓存化功法数据操作
// ============================================================

// 功法配置缓存
let gongfaListCache = null;
let gongfaListCacheTime = 0;
const GONGFA_LIST_CACHE_TTL = 30 * 60 * 1000; // 30分钟

const gongfaStorage = {
  // 获取所有功法（带缓存）
  getGongfaList(filters = {}) {
    const cacheKey = `gongfa:list:${JSON.stringify(filters)}`;
    
    // 检查是否有有效缓存
    if (!filters.type && !filters.rarity && !filters.realm_req && !filters.level_req) {
      // 全量列表使用更长的缓存
      if (gongfaListCache && Date.now() - gongfaListCacheTime < GONGFA_LIST_CACHE_TTL) {
        hotDataManager.recordAccess('gongfa:list');
        return gongfaListCache;
      }
    }
    
    const value = originalStorage.gongfaStorage.getGongfaList(filters);
    
    // 缓存全量列表
    if (!filters.type && !filters.rarity && !filters.realm_req && !filters.level_req) {
      gongfaListCache = value;
      gongfaListCacheTime = Date.now();
    }
    
    return value;
  },

  // 获取单个功法（带缓存）
  getGongfaById(gongfaId) {
    const cacheKey = `gongfa:${gongfaId}`;
    const cached = configCache.get(cacheKey);
    if (cached !== null) return cached;
    
    const value = originalStorage.gongfaStorage.getGongfaById(gongfaId);
    if (value) {
      configCache.set(cacheKey, value, ['gongfa'], 30 * 60 * 1000);
    }
    return value;
  },

  // 获取玩家已学习的功法（带缓存）
  getLearnedGongfa(playerId) {
    const cacheKey = `learned:${playerId}`;
    return cachedLoad(
      playerCache,
      () => originalStorage.gongfaStorage.getLearnedGongfa(playerId),
      cacheKey,
      [`player:${playerId}`, 'gongfa'],
      5 * 60 * 1000
    );
  },

  // 学习功法（失效缓存）
  learnGongfa(playerId, gongfaId) {
    const result = originalStorage.gongfaStorage.learnGongfa(playerId, gongfaId);
    playerCache.delete(`learned:${playerId}`, [`player:${playerId}`, 'gongfa']);
    return result;
  },

  // 检查是否已学习
  hasLearned(playerId, gongfaId) {
    return originalStorage.gongfaStorage.hasLearned(playerId, gongfaId);
  },

  // 升级功法（失效缓存）
  upgradeGongfa(playerId, gongfaId) {
    const result = originalStorage.gongfaStorage.upgradeGongfa(playerId, gongfaId);
    playerCache.delete(`learned:${playerId}`, [`player:${playerId}`, 'gongfa']);
    return result;
  },

  // 获取玩家功法经验
  getGongfaExp(playerId, gongfaId) {
    return originalStorage.gongfaStorage.getGongfaExp(playerId, gongfaId);
  },

  // 消耗功法经验
  consumeGongfaExp(playerId, gongfaId, exp) {
    return originalStorage.gongfaStorage.consumeGongfaExp(playerId, gongfaId, exp);
  }
};

// ============================================================
// 3. 缓存化装备数据操作
// ============================================================

const equipmentStorage = {
  // 获取装备列表（带缓存）
  getEquipment(playerId) {
    const cacheKey = `equip:${playerId}`;
    return cachedLoad(
      equipmentCache,
      () => originalStorage.equipmentStorage.getEquipment(playerId),
      cacheKey,
      [`equip:${playerId}`],
      5 * 60 * 1000
    );
  },

  // 装备功法（失效缓存）
  equipGongfa(playerId, slot, gongfaId) {
    const result = originalStorage.equipmentStorage.equipGongfa(playerId, slot, gongfaId);
    equipmentCache.delete(`equip:${playerId}`, [`equip:${playerId}`]);
    return result;
  },

  // 卸下功法（失效缓存）
  unequipGongfa(playerId, slot) {
    const result = originalStorage.equipmentStorage.unequipGongfa(playerId, slot);
    equipmentCache.delete(`equip:${playerId}`, [`equip:${playerId}`]);
    return result;
  }
};

// ============================================================
// 4. 缓存化玩家游戏数据操作
// ============================================================

const gameDataStorage = {
  // 获取玩家游戏数据（带缓存）
  getPlayerGameData(playerId) {
    const cacheKey = `gamedata:${playerId}`;
    return cachedLoad(
      playerCache,
      () => originalStorage.gameDataStorage.getPlayerGameData(playerId),
      cacheKey,
      [`player:${playerId}`],
      2 * 60 * 1000
    );
  },

  // 保存玩家游戏数据（失效缓存）
  savePlayerGameData(playerId, gameData) {
    const result = originalStorage.gameDataStorage.savePlayerGameData(playerId, gameData);
    playerCache.delete(`gamedata:${playerId}`, [`player:${playerId}`]);
    return result;
  }
};

// ============================================================
// 5. 缓存化境界副本进度操作
// ============================================================

const realmDungeonStorage = {
  // 获取玩家副本进度（带缓存）
  getProgress(playerId) {
    const cacheKey = `dungeon:${playerId}`;
    return cachedLoad(
      playerCache,
      () => originalStorage.realmDungeonStorage.getProgress(playerId),
      cacheKey,
      [`player:${playerId}`],
      5 * 60 * 1000
    );
  },

  // 更新副本进度（失效缓存）
  updateProgress(playerId, realm, highestFloor, cleared) {
    const result = originalStorage.realmDungeonStorage.updateProgress(playerId, realm, highestFloor, cleared);
    playerCache.delete(`dungeon:${playerId}`, [`player:${playerId}`]);
    return result;
  }
};

// ============================================================
// 6. 缓存化经脉数据操作
// ============================================================

const meridianStorage = {
  // 获取玩家经脉数据（带缓存）
  getPlayerMeridian(playerId) {
    const cacheKey = `meridian:${playerId}`;
    return cachedLoad(
      playerCache,
      () => originalStorage.meridianStorage.getPlayerMeridian(playerId),
      cacheKey,
      [`player:${playerId}`],
      5 * 60 * 1000
    );
  },

  // 初始化玩家经脉数据
  initPlayerMeridian(playerId) {
    return originalStorage.meridianStorage.initPlayerMeridian(playerId);
  },

  // 保存玩家经脉数据（失效缓存）
  savePlayerMeridian(playerId, data) {
    const result = originalStorage.meridianStorage.savePlayerMeridian(playerId, data);
    playerCache.delete(`meridian:${playerId}`, [`player:${playerId}`]);
    return result;
  },

  // 激活穴位（失效缓存）
  activateAcupoint(playerId, meridianId, acupointId, acupointData) {
    const result = originalStorage.meridianStorage.activateAcupoint(playerId, meridianId, acupointId, acupointData);
    playerCache.delete(`meridian:${playerId}`, [`player:${playerId}`]);
    return result;
  },

  // 检查穴位是否已激活
  isAcupointActivated(playerId, acupointId) {
    return originalStorage.meridianStorage.isAcupointActivated(playerId, acupointId);
  },

  // 获取所有已激活穴位
  getAllActivatedAcupoints(playerId) {
    return originalStorage.meridianStorage.getAllActivatedAcupoints(playerId);
  },

  // 获取穴位总数
  getTotalAcupointsCount(playerId) {
    return originalStorage.meridianStorage.getTotalAcupointsCount(playerId);
  },

  // 获取经脉加成
  getMeridianBonuses(playerId) {
    return originalStorage.meridianStorage.getMeridianBonuses(playerId);
  },

  // 计算并更新经脉加成（失效缓存）
  calculateAndUpdateBonuses(playerId, acupoints, effects) {
    const result = originalStorage.meridianStorage.calculateAndUpdateBonuses(playerId, acupoints, effects);
    playerCache.delete(`meridian:${playerId}`, [`player:${playerId}`]);
    return result;
  },

  // 添加经脉操作日志
  addMeridianLog(playerId, action, meridianId, acupointId, result) {
    return originalStorage.meridianStorage.addMeridianLog(playerId, action, meridianId, acupointId, result);
  },

  // 获取经脉日志
  getMeridianLog(playerId, limit = 10) {
    return originalStorage.meridianStorage.getMeridianLog(playerId, limit);
  }
};

// ============================================================
// 7. 导出与启动
// ============================================================

module.exports = {
  playerStorage,
  gongfaStorage,
  equipmentStorage,
  gameDataStorage,
  realmDungeonStorage,
  meridianStorage,
  
  // 缓存管理
  cache: {
    // 获取缓存统计
    getStats: () => ({
      player: playerCache.getStats(),
      sect: sectCache.getStats(),
      beast: beastCache.getStats(),
      equipment: equipmentCache.getStats(),
      config: configCache.getStats(),
      hotData: hotDataManager.getHotKeys()
    }),
    
    // 清理过期缓存
    cleanup: () => {
      playerCache.cleanup();
      sectCache.cleanup();
      beastCache.cleanup();
      equipmentCache.cleanup();
      configCache.cleanup();
    },
    
    // 失效玩家所有缓存
    invalidatePlayer: (playerId) => cacheInvalidation.invalidatePlayer(playerId),
    
    // 失效宗门所有缓存
    invalidateSect: (sectId) => cacheInvalidation.invalidateSect(sectId),
    
    // 启动定期清理
    startCleanup,
    
    // 热点数据
    hotDataManager
  }
};
