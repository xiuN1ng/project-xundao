/**
 * 挂机修仙 - 资源副本系统
 * 5个资源副本：灵气洞、灵石矿、功法阁、炼器室、炼丹炉
 */

// 资源副本配置
const RESOURCE_DUNGEON_DATA = {
  // 灵气洞 - 产出灵气
  'spirit_cave': {
    id: 'spirit_cave',
    name: '灵气洞',
    icon: '💨',
    desc: '天地灵气汇聚之地，挂机获得大量灵气',
    openHour: 0, // 0-24小时开放，0表示全天开放
    closeHour: 24,
    resource: 'spirit',
    baseRate: 10, // 每秒基础产出
    level: 1,
    requirement: null
  },
  // 灵石矿 - 产出灵石
  'spirit_mine': {
    id: 'spirit_mine',
    name: '灵石矿',
    icon: '💎',
    desc: '蕴藏丰富灵石的矿脉，挂机获得灵石',
    openHour: 0,
    closeHour: 24,
    resource: 'spiritStones',
    baseRate: 1,
    level: 1,
    requirement: null
  },
  // 功法阁 - 产出功法经验
  'technique_library': {
    id: 'technique_library',
    name: '功法阁',
    icon: '📚',
    desc: '收藏万千功法的殿堂，挂机获得功法经验',
    openHour: 6, // 6:00 - 22:00 开放
    closeHour: 22,
    resource: 'technique',
    baseRate: 5,
    level: 1,
    requirement: { realmLevel: 2 } // 筑基期解锁
  },
  // 炼器室 - 产出装备强化材料
  'forge': {
    id: 'forge',
    name: '炼器室',
    icon: '🔨',
    desc: '锤炼法宝的圣地，挂机获得炼器材料',
    openHour: 8,
    closeHour: 20,
    resource: 'forge_material',
    baseRate: 2,
    level: 1,
    requirement: { realmLevel: 3 } // 金丹期解锁
  },
  // 炼丹炉 - 产出炼丹材料
  'alchemy_furnace': {
    id: 'alchemy_furnace',
    name: '炼丹炉',
    icon: '⚗️',
    desc: '炼制仙丹的丹炉，挂机获得炼丹材料',
    openHour: 10,
    closeHour: 18,
    resource: 'alchemy_material',
    baseRate: 2,
    level: 1,
    requirement: { realmLevel: 2 } // 筑基期解锁
  }
};

// 获取资源副本状态
function getResourceDungeonStatus() {
  const player = gameState.player;
  if (!player.resourceDungeons) {
    player.resourceDungeons = {};
    // 初始化所有副本状态
    for (const [id, data] of Object.entries(RESOURCE_DUNGEON_DATA)) {
      player.resourceDungeons[id] = {
        unlocked: !data.requirement, // 无要求则默认解锁
        level: 1,
        enterTime: 0, // 进入时间
        lastCollectTime: 0, // 上次收获时间
        totalCollected: 0 // 总收获
      };
    }
  }
  return player.resourceDungeons;
}

// 检查副本是否开放
function isDungeonOpen(dungeonId) {
  const data = RESOURCE_DUNGEON_DATA[dungeonId];
  if (!data) return false;
  
  const now = new Date();
  const hour = now.getHours();
  
  // 全天开放
  if (data.openHour === 0 && data.closeHour === 24) return true;
  
  return hour >= data.openHour && hour < data.closeHour;
}

// 检查副本是否解锁
function isDungeonUnlocked(dungeonId) {
  const status = getResourceDungeonStatus()[dungeonId];
  if (!status) return false;
  
  const data = RESOURCE_DUNGEON_DATA[dungeonId];
  if (!data.requirement) return status.unlocked;
  
  // 检查境界要求
  if (data.requirement.realmLevel) {
    return gameState.player.realmLevel >= data.requirement.realmLevel;
  }
  
  return status.unlocked;
}

// 进入副本
function enterResourceDungeon(dungeonId) {
  const data = RESOURCE_DUNGEON_DATA[dungeonId];
  if (!data) return { success: false, message: '副本不存在' };
  
  if (!isDungeonUnlocked(dungeonId)) {
    const reqRealm = ['练气期', '筑基期', '金丹期', '元婴期', '化神期'][data.requirement?.realmLevel - 1] || '筑基期';
    return { success: false, message: `需要达到${reqRealm}境界解锁` };
  }
  
  if (!isDungeonOpen(dungeonId)) {
    return { success: false, message: `副本开放时间: ${data.openHour}:00 - ${data.closeHour}:00` };
  }
  
  const status = getResourceDungeonStatus()[dungeonId];
  status.enterTime = Date.now();
  
  return { success: true, message: `进入${data.name}成功！` };
}

// 计算收获资源
function calculateResourceDungeonYield(dungeonId) {
  const status = getResourceDungeonStatus()[dungeonId];
  const data = RESOURCE_DUNGEON_DATA[dungeonId];
  
  if (!status || !data || status.enterTime === 0) return 0;
  
  const elapsed = (Date.now() - status.enterTime) / 1000; // 秒
  const yieldAmount = Math.floor(data.baseRate * elapsed);
  
  return yieldAmount;
}

// 收获资源
function collectResourceDungeon(dungeonId) {
  const data = RESOURCE_DUNGEON_DATA[dungeonId];
  if (!data) return { success: false, message: '副本不存在' };
  
  const status = getResourceDungeonStatus()[dungeonId];
  if (status.enterTime === 0) return { success: false, message: '请先进入副本' };
  
  const yieldAmount = calculateResourceDungeonYield(dungeonId);
  if (yieldAmount <= 0) return { success: false, message: '还没有产出任何资源' };
  
  // 根据资源类型添加对应资源
  switch (data.resource) {
    case 'spirit':
      gameState.player.spirit = Math.min(gameState.player.spirit + yieldAmount, gameState.player.maxSpirit);
      break;
    case 'spiritStones':
      gameState.player.spiritStones += yieldAmount;
      break;
    case 'technique':
      if (!gameState.player.techniqueExp) gameState.player.techniqueExp = 0;
      gameState.player.techniqueExp += yieldAmount;
      break;
    case 'forge_material':
      if (!gameState.player.forgeMaterials) gameState.player.forgeMaterials = 0;
      gameState.player.forgeMaterials += yieldAmount;
      break;
    case 'alchemy_material':
      if (!gameState.player.alchemyMaterials) gameState.player.alchemyMaterials = 0;
      gameState.player.alchemyMaterials += yieldAmount;
      break;
  }
  
  status.totalCollected += yieldAmount;
  status.lastCollectTime = Date.now();
  status.enterTime = 0; // 重置进入时间
  
  return { 
    success: true, 
    message: `收获成功！获得 ${yieldAmount} ${getResourceName(data.resource)}`,
    amount: yieldAmount,
    resource: data.resource
  };
}

// 获取资源名称
function getResourceName(resourceType) {
  const names = {
    'spirit': '灵气',
    'spiritStones': '灵石',
    'technique': '功法经验',
    'forge_material': '炼器材料',
    'alchemy_material': '炼丹材料'
  };
  return names[resourceType] || resourceType;
}

// 获取所有副本信息（API用）
function getAllResourceDungeons() {
  const status = getResourceDungeonStatus();
  const now = new Date();
  const hour = now.getHours();
  
  const result = [];
  for (const [id, data] of Object.entries(RESOURCE_DUNGEON_DATA)) {
    const s = status[id];
    const isOpen = isDungeonOpen(id);
    const isUnlocked = isDungeonUnlocked(id);
    let yieldAmount = 0;
    
    if (s.enterTime > 0 && isOpen) {
      yieldAmount = calculateResourceDungeonYield(id);
    }
    
    result.push({
      id: data.id,
      name: data.name,
      icon: data.icon,
      desc: data.desc,
      openHour: data.openHour,
      closeHour: data.closeHour,
      resource: data.resource,
      resourceName: getResourceName(data.resource),
      baseRate: data.baseRate,
      level: s.level,
      unlocked: isUnlocked,
      isOpen: isOpen,
      inDungeon: s.enterTime > 0 && isOpen,
      yieldAmount: yieldAmount,
      enterTime: s.enterTime,
      lastCollectTime: s.lastCollectTime,
      totalCollected: s.totalCollected,
      requirement: data.requirement
    });
  }
  
  return result;
}

// 导出
if (typeof window !== 'undefined') {
  window.RESOURCE_DUNGEON_DATA = RESOURCE_DUNGEON_DATA;
  window.getResourceDungeonStatus = getResourceDungeonStatus;
  window.isDungeonOpen = isDungeonOpen;
  window.isDungeonUnlocked = isDungeonUnlocked;
  window.enterResourceDungeon = enterResourceDungeon;
  window.collectResourceDungeon = collectResourceDungeon;
  window.calculateResourceDungeonYield = calculateResourceDungeonYield;
  window.getAllResourceDungeons = getAllResourceDungeons;
  window.getResourceName = getResourceName;
}
