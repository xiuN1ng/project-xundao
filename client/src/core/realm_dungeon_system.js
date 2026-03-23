/**
 * 境界副本系统 v5.0
 * 专属境界挑战 - 每个境界有独特的副本关卡
 */

const REALM_DUNGEON_DATA = {
  // 练气期副本
  '练气期': {
    name: '练气期试炼',
    desc: '刚刚踏入修仙之路的试炼',
    reqRealm: '练气期',
    floors: [
      { id: 1, name: '灵气山谷', enemy: '灵气蛇', hp: 200, atk: 15, def: 2, exp: 50, stones: 10, items: ['herbal_medicine'] },
      { id: 2, name: '灵草园', enemy: '守护灵草', hp: 350, atk: 25, def: 5, exp: 80, stones: 20, items: ['herbal_medicine', 'spirit_grass'] },
      { id: 3, name: '山洞秘径', enemy: '山魈', hp: 500, atk: 40, def: 8, exp: 120, stones: 35, items: ['spirit_grass', 'beast_core'] },
      { id: 4, name: '灵气泉眼', enemy: '灵泉守卫', hp: 800, atk: 60, def: 12, exp: 200, stones: 50, items: ['spirit_grass', 'pure_spirit'] },
      { id: 5, name: '试炼终点', enemy: '试炼长老', hp: 1200, atk: 80, def: 15, exp: 300, stones: 100, items: ['cultivation_manual'] }
    ],
    boss: { name: '试炼长老', hp: 1200, atk: 80, def: 15, rewards: { exp: 500, stones: 200, items: ['realm_token_qi'] } },
    clearRewards: { exp: 1000, stones: 300, items: ['realm_token_qi', 'spirit_pill'] }
  },
  // 筑基期副本
  '筑基期': {
    name: '筑基期挑战',
    desc: '筑就仙道根基的考验',
    reqRealm: '筑基期',
    floors: [
      { id: 1, name: '寒冰洞窟', enemy: '冰魔', hp: 2000, atk: 120, def: 30, exp: 400, stones: 150, items: ['ice_crystal'] },
      { id: 2, name: '烈焰山谷', enemy: '火麒麟幼崽', hp: 3000, atk: 180, def: 45, exp: 600, stones: 250, items: ['fire_essence'] },
      { id: 3, name: '雷霆深渊', enemy: '雷蛟', hp: 4500, atk: 250, def: 60, exp: 900, stones: 400, items: ['thunder_核心'] },
      { id: 4, name: '阴阳池', enemy: '阴阳兽', hp: 6000, atk: 320, def: 80, exp: 1200, stones: 600, items: ['yin_yang_orb'] },
      { id: 5, name: '筑基之巅', enemy: '金丹真人', hp: 10000, atk: 450, def: 100, exp: 2000, stones: 1000, items: ['foundation_building_pill'] }
    ],
    boss: { name: '金丹真人', hp: 10000, atk: 450, def: 100, rewards: { exp: 5000, stones: 3000, items: ['realm_token_foundation'] } },
    clearRewards: { exp: 8000, stones: 5000, items: ['realm_token_foundation', 'golden_核心'] }
  },
  // 金丹期副本
  '金丹期': {
    name: '金丹期劫难',
    desc: '金丹凝聚的劫难考验',
    reqRealm: '金丹期',
    floors: [
      { id: 1, name: '万魔坑', enemy: '魔兵', hp: 15000, atk: 600, def: 150, exp: 3000, stones: 2000, items: ['demon_blood'] },
      { id: 2, name: '妖神山脉', enemy: '大妖', hp: 25000, atk: 900, def: 220, exp: 5000, stones: 3500, items: ['beast_ancestor_bone'] },
      { id: 3, name: '幽冥鬼域', enemy: '鬼王', hp: 35000, atk: 1200, def: 300, exp: 7000, stones: 5000, items: ['ghost_king_ling'] },
      { id: 4, name: '上古遗迹', enemy: '守护傀儡', hp: 50000, atk: 1600, def: 400, exp: 10000, stones: 8000, items: ['ancient_artifact_shard'] },
      { id: 5, name: '渡劫台', enemy: '天劫化身', hp: 80000, atk: 2200, def: 500, exp: 15000, stones: 12000, items: ['lightning_核心'] }
    ],
    boss: { name: '天劫化身', hp: 80000, atk: 2200, def: 500, rewards: { exp: 50000, stones: 30000, items: ['realm_token_golden'] } },
    clearRewards: { exp: 80000, stones: 50000, items: ['realm_token_golden', 'golden_核心'] }
  },
  // 元婴期副本
  '元婴期': {
    name: '元婴期历练',
    desc: '元婴出窍的神通试炼',
    reqRealm: '元婴期',
    floors: [
      { id: 1, name: '虚空裂缝', enemy: '虚空怪物', hp: 100000, atk: 3000, def: 800, exp: 20000, stones: 15000, items: ['void_essence'] },
      { id: 2, name: '上古仙府', enemy: '仙府守卫', hp: 150000, atk: 4500, def: 1200, exp: 35000, stones: 25000, items: ['immortal_artifact'] },
      { id: 3, name: '神魔战场', enemy: '古魔将', hp: 200000, atk: 6000, def: 1600, exp: 50000, stones: 40000, items: ['demon_god_heart'] },
      { id: 4, name: '天宫外围', enemy: '天兵', hp: 300000, atk: 8000, def: 2000, exp: 80000, stones: 60000, items: ['divine_iron'] },
      { id: 5, name: '封神台', enemy: '封神使', hp: 500000, atk: 12000, def: 3000, exp: 120000, stones: 100000, items: ['god_seal_fragment'] }
    ],
    boss: { name: '封神使', hp: 500000, atk: 12000, def: 3000, rewards: { exp: 500000, stones: 300000, items: ['realm_token_nascent'] } },
    clearRewards: { exp: 800000, stones: 500000, items: ['realm_token_nascent', 'divine_核心'] }
  },
  // 化神期副本
  '化神期': {
    name: '化神期飞升关',
    desc: '化神返虚的神通考验',
    reqRealm: '化神期',
    floors: [
      { id: 1, name: '混沌空间', enemy: '混沌生物', hp: 800000, atk: 20000, def: 5000, exp: 150000, stones: 100000, items: ['chaos_essence'] },
      { id: 2, name: '星河深处', enemy: '星河巨兽', hp: 1200000, atk: 30000, def: 8000, exp: 250000, stones: 180000, items: ['star_core'] },
      { id: 3, name: '法则之河', enemy: '法则守护', hp: 1800000, atk: 45000, def: 12000, exp: 400000, stones: 300000, items: ['law_crystal'] },
      { id: 4, name: '大道之门前', enemy: '大道守卫', hp: 2500000, atk: 60000, def: 15000, exp: 600000, stones: 500000, items: ['dao_crystal'] },
      { id: 5, name: '大道之门', enemy: '天道意志', hp: 4000000, atk: 80000, def: 20000, exp: 1000000, stones: 800000, items: ['heaven_核心'] }
    ],
    boss: { name: '天道意志', hp: 4000000, atk: 80000, def: 20000, rewards: { exp: 5000000, stones: 3000000, items: ['realm_token_transcendent'] } },
    clearRewards: { exp: 8000000, stones: 5000000, items: ['realm_token_transcendent', 'heaven_核心'] }
  },
  // 炼虚期副本
  '炼虚期': {
    name: '炼虚期合体',
    desc: '炼虚合道的最终试炼',
    reqRealm: '炼虚期',
    floors: [
      { id: 1, name: '虚实之间', enemy: '虚影魔', hp: 6000000, atk: 100000, def: 30000, exp: 1000000, stones: 800000, items: ['void_king_crystal'] },
      { id: 2, name: '万界战场', enemy: '万界主宰', hp: 10000000, atk: 150000, def: 45000, exp: 2000000, stones: 1500000, items: ['universe_核心'] },
      { id: 3, name: '时间长河', enemy: '时间巨兽', hp: 15000000, atk: 220000, def: 60000, exp: 3500000, stones: 2500000, items: ['time_crystal'] },
      { id: 4, name: '空间风暴', enemy: '空间毁灭者', hp: 22000000, atk: 300000, def: 80000, exp: 5000000, stones: 4000000, items: ['space_核心'] },
      { id: 5, name: '合道之巅', enemy: '大道化身', hp: 35000000, atk: 400000, def: 100000, exp: 8000000, stones: 6000000, items: ['unity_核心'] }
    ],
    boss: { name: '大道化身', hp: 35000000, atk: 400000, def: 100000, rewards: { exp: 50000000, stones: 30000000, items: ['realm_token_void'] } },
    clearRewards: { exp: 80000000, stones: 50000000, items: ['realm_token_void', 'unity_核心'] }
  },
  // 合体期副本
  '合体期': {
    name: '合体期天劫',
    desc: '天人合一的极致挑战',
    reqRealm: '合体期',
    floors: [
      { id: 1, name: '诸天万界', enemy: '界主', hp: 50000000, atk: 500000, def: 150000, exp: 10000000, stones: 8000000, items: ['world_origin'] },
      { id: 2, name: '混沌原点', enemy: '混沌原兽', hp: 80000000, atk: 700000, def: 200000, exp: 20000000, stones: 15000000, items: ['chaos_origin'] },
      { id: 3, name: '命运长河', enemy: '命运主宰', hp: 120000000, atk: 1000000, def: 280000, exp: 35000000, stones: 25000000, items: ['destiny_crystal'] },
      { id: 4, name: '因果之轮', enemy: '因果律', hp: 180000000, atk: 1400000, def: 350000, exp: 50000000, stones: 40000000, items: ['karma_核心'] },
      { id: 5, name: '天道轮回', enemy: '轮回主宰', hp: 280000000, atk: 2000000, def: 450000, exp: 80000000, stones: 60000000, items: ['reincarnation_核心'] }
    ],
    boss: { name: '轮回主宰', hp: 280000000, atk: 2000000, def: 450000, rewards: { exp: 500000000, stones: 300000000, items: ['realm_token_divine'] } },
    clearRewards: { exp: 800000000, stones: 500000000, items: ['realm_token_divine', 'reincarnation_核心'] }
  },
  // 大乘期副本
  '大乘期': {
    name: '大乘期飞升',
    desc: '渡劫飞升的最后考验',
    reqRealm: '大乘期',
    floors: [
      { id: 1, name: '九重天外', enemy: '天帝卫队', hp: 400000000, atk: 3000000, def: 800000, exp: 100000000, stones: 80000000, items: ['divine_essence'] },
      { id: 2, name: '诸神战场', enemy: '古神残魂', hp: 600000000, atk: 4500000, def: 1200000, exp: 200000000, stones: 150000000, items: ['ancient_god_spirit'] },
      { id: 3, name: '法则源泉', enemy: '法则之神', hp: 1000000000, atk: 6500000, def: 1600000, exp: 400000000, stones: 300000000, items: ['law_origin'] },
      { id: 4, name: '大道尽头', enemy: '大道守护', hp: 1500000000, atk: 9000000, def: 2000000, exp: 600000000, stones: 500000000, items: ['ultimate_核心'] },
      { id: 5, name: '飞升之门', enemy: '天劫真身', hp: 2500000000, atk: 12000000, def: 2500000, exp: 1000000000, stones: 800000000, items: ['immortal_core'] }
    ],
    boss: { name: '天劫真身', hp: 2500000000, atk: 12000000, def: 2500000, rewards: { exp: 5000000000, stones: 3000000000, items: ['realm_token_ascended'] } },
    clearRewards: { exp: 8000000000, stones: 5000000000, items: ['realm_token_ascended', 'immortal_core'] }
  },
  // 渡劫期副本
  '渡劫期': {
    name: '渡劫期最终试炼',
    desc: '渡过天劫的最后关卡',
    reqRealm: '渡劫期',
    floors: [
      { id: 1, name: '混沌开天', enemy: '开天辟地者', hp: 5000000000, atk: 20000000, def: 5000000, exp: 2000000000, stones: 1500000000, items: ['kaijian_essence'] },
      { id: 2, name: '时空尽头', enemy: '时空掌控者', hp: 8000000000, atk: 30000000, def: 8000000, exp: 4000000000, stones: 3000000000, items: ['time_space_origin'] },
      { id: 3, name: '命运终点', enemy: '命运编织者', hp: 12000000000, atk: 45000000, def: 12000000, exp: 7000000000, stones: 5000000000, items: ['destiny_origin'] },
      { id: 4, name: '因果终极', enemy: '因果创世神', hp: 18000000000, atk: 60000000, def: 15000000, exp: 10000000000, stones: 8000000000, items: ['creation_核心'] },
      { id: 5, name: '成就真仙', enemy: '天道化身', hp: 30000000000, atk: 80000000, def: 20000000, exp: 20000000000, stones: 15000000000, items: ['true_god_核心'] }
    ],
    boss: { name: '天道化身', hp: 30000000000, atk: 80000000, def: 20000000, rewards: { exp: 100000000000, stones: 50000000000, items: ['realm_token_tribulation'] } },
    clearRewards: { exp: 150000000000, stones: 80000000000, items: ['realm_token_tribulation', 'true_god_核心'] }
  }
};

// 副本状态
let realmDungeonState = {
  currentRealm: null,     // 当前正在挑战的境界副本
  currentFloor: 0,        // 当前层数
  hp: 0,                  // 当前敌人HP
  maxHp: 0,               // 最大HP
  enemy: null,           // 当前敌人数据
  status: 'idle',        // idle, fighting, victory, defeated
  progress: {},           // { realm: { highestFloor: x, cleared: bool } }
  dailyChallenges: {},   // { realm: date: count }
  lastChallengeTime: {}  // { realm: timestamp }
};

// 获取玩家当前境界可挑战的副本
function getAvailableRealmDungeons() {
  const playerRealm = gameState.player.realm;
  const realmOrder = ['练气期', '筑基期', '金丹期', '元婴期', '化神期', '炼虚期', '合体期', '大乘期', '渡劫期'];
  
  // 找到玩家当前境界的索引
  let currentIndex = realmOrder.indexOf(playerRealm);
  if (currentIndex === -1) currentIndex = 0;
  
  // 玩家可以挑战当前境界和之前境界的副本
  const available = [];
  for (let i = 0; i <= currentIndex; i++) {
    if (REALM_DUNGEON_DATA[realmOrder[i]]) {
      available.push({
        id: realmOrder[i],
        ...REALM_DUNGEON_DATA[realmOrder[i]]
      });
    }
  }
  return available;
}

// 进入副本
function enterRealmDungeon(realmId) {
  const dungeonData = REALM_DUNGEON_DATA[realmId];
  if (!dungeonData) {
    return { success: false, message: '副本不存在' };
  }
  
  // 检查是否已经有正在进行中的副本
  if (realmDungeonState.status === 'fighting') {
    return { success: false, message: '请先完成当前战斗' };
  }
  
  // 初始化副本
  realmDungeonState.currentRealm = realmId;
  realmDungeonState.currentFloor = 0;
  realmDungeonState.status = 'ready';
  
  // 初始化进度
  if (!realmDungeonState.progress[realmId]) {
    realmDungeonState.progress[realmId] = { highestFloor: 0, cleared: false };
  }
  
  return { 
    success: true, 
    message: `进入${dungeonData.name}！准备挑战第一关`,
    dungeon: dungeonData,
    progress: realmDungeonState.progress[realmId]
  };
}

// 开始战斗
function startRealmDungeonBattle() {
  if (!realmDungeonState.currentRealm) {
    return { success: false, message: '请先选择副本' };
  }
  
  const dungeonData = REALM_DUNGEON_DATA[realmDungeonState.currentRealm];
  if (!dungeonData) return { success: false, message: '副本数据错误' };
  
  // 下一层
  realmDungeonState.currentFloor++;
  
  if (realmDungeonState.currentFloor > dungeonData.floors.length) {
    // 挑战BOSS
    const boss = dungeonData.boss;
    realmDungeonState.enemy = { ...boss };
    realmDungeonState.maxHp = boss.hp;
    realmDungeonState.hp = boss.hp;
  } else {
    // 普通关卡
    const floor = dungeonData.floors[realmDungeonState.currentFloor - 1];
    realmDungeonState.enemy = { ...floor };
    realmDungeonState.maxHp = floor.hp;
    realmDungeonState.hp = floor.hp;
  }
  
  realmDungeonState.status = 'fighting';
  
  return {
    success: true,
    enemy: realmDungeonState.enemy,
    floor: realmDungeonState.currentFloor,
    totalFloors: dungeonData.floors.length + 1,
    isBoss: realmDungeonState.currentFloor > dungeonData.floors.length
  };
}

// 境界副本战斗攻击
function attackRealmDungeonEnemy() {
  if (realmDungeonState.status !== 'fighting') {
    return { success: false, message: '当前没有进行中的战斗' };
  }
  
  const player = gameState.player;
  const stats = game.calculatePlayerStats();
  const enemy = realmDungeonState.enemy;
  
  // 玩家伤害计算
  let playerDamage = Math.max(1, stats.atk - enemy.def * 0.3);
  playerDamage = Math.floor(playerDamage * (0.9 + Math.random() * 0.2));
  
  // 敌人伤害计算
  let enemyDamage = Math.max(1, enemy.atk - stats.def * 0.5);
  enemyDamage = Math.floor(enemyDamage * (0.9 + Math.random() * 0.2));
  
  // 扣除敌人HP
  realmDungeonState.hp -= playerDamage;
  
  // 检查是否击败敌人
  if (realmDungeonState.hp <= 0) {
    return handleRealmDungeonEnemyDefeated();
  }
  
  // 扣除玩家HP
  player.hp -= enemyDamage;
  if (player.hp <= 0) {
    player.hp = 0;
    realmDungeonState.status = 'defeated';
    return {
      success: true,
      defeated: true,
      playerDamage: enemyDamage,
      enemyRemainingHp: 0,
      message: `你被击败了！挑战失败。`
    };
  }
  
  // 更新统计
  if (!gameState.stats.totalDamage) gameState.stats.totalDamage = 0;
  gameState.stats.totalDamage += playerDamage;
  if (playerDamage > gameState.stats.highestDamage) {
    gameState.stats.highestDamage = playerDamage;
  }
  
  return {
    success: true,
    playerDamage: playerDamage,
    enemyDamage: enemyDamage,
    enemyHp: realmDungeonState.hp,
    enemyMaxHp: realmDungeonState.maxHp,
    playerHp: player.hp,
    playerMaxHp: stats.maxHp
  };
}

// 处理敌人被击败
function handleRealmDungeonEnemyDefeated() {
  const dungeonData = REALM_DUNGEON_DATA[realmDungeonState.currentRealm];
  const floor = realmDungeonState.currentFloor;
  const isBoss = floor > dungeonData.floors.length;
  
  let rewards = {};
  let message = '';
  
  if (isBoss) {
    // 击败BOSS，副本通关
    rewards = dungeonData.boss.rewards;
    realmDungeonState.progress[realmDungeonState.currentRealm].cleared = true;
    realmDungeonState.status = 'victory';
    message = `恭喜！击败${dungeonData.boss.name}，副本通关！`;
    
    // 额外通关奖励
    const clearRewards = dungeonData.clearRewards;
    gameState.player.experience += clearRewards.exp;
    gameState.player.spiritStones += clearRewards.stones;
    addItemsToInventory(clearRewards.items);
    
    // 记录统计数据
    gameState.stats.dungeonsCleared++;
  } else {
    // 击败普通关卡敌人
    const floorData = dungeonData.floors[floor - 1];
    rewards = { exp: floorData.exp, stones: floorData.stones, items: floorData.items };
    realmDungeonState.status = 'ready';
    message = `击败${floorData.enemy}！进入下一关`;
    
    // 更新最高层数
    if (floor > realmDungeonState.progress[realmDungeonState.currentRealm].highestFloor) {
      realmDungeonState.progress[realmDungeonState.currentRealm].highestFloor = floor;
    }
  }
  
  // 发放奖励
  gameState.player.experience += rewards.exp;
  gameState.player.spiritStones += rewards.stones;
  if (rewards.items) {
    addItemsToInventory(rewards.items);
  }
  
  // 检查升级
  game.checkLevelUp();
  
  // 更新状态
  realmDungeonState.enemy = null;
  
  return {
    success: true,
    defeated: true,
    rewards: rewards,
    message: message,
    isBoss: isBoss,
    nextFloor: isBoss ? null : realmDungeonState.currentFloor + 1,
    totalFloors: dungeonData.floors.length + 1,
    cleared: isBoss
  };
}

// 添加物品到背包
function addItemsToInventory(items) {
  if (!items || !Array.isArray(items)) return;
  
  if (!gameState.player.materials) {
    gameState.player.materials = {};
  }
  
  for (const item of items) {
    if (!gameState.player.materials[item]) {
      gameState.player.materials[item] = 0;
    }
    gameState.player.materials[item]++;
  }
}

// 退出副本
function exitRealmDungeon() {
  const result = {
    realm: realmDungeonState.currentRealm,
    floor: realmDungeonState.currentFloor,
    progress: realmDungeonState.progress[realmDungeonState.currentRealm]
  };
  
  realmDungeonState.currentRealm = null;
  realmDungeonState.currentFloor = 0;
  realmDungeonState.enemy = null;
  realmDungeonState.status = 'idle';
  
  return result;
}

// 获取副本状态
function getRealmDungeonStatus() {
  return {
    currentRealm: realmDungeonState.currentRealm,
    currentFloor: realmDungeonState.currentFloor,
    enemyHp: realmDungeonState.hp,
    enemyMaxHp: realmDungeonState.maxHp,
    enemy: realmDungeonState.enemy,
    status: realmDungeonState.status,
    progress: realmDungeonState.progress,
    inDungeon: realmDungeonState.status === 'fighting' || realmDungeonState.status === 'ready'
  };
}

// 初始化玩家境界副本数据
function initRealmDungeonData() {
  if (!gameState.player.realmDungeonProgress) {
    gameState.player.realmDungeonProgress = {};
  }
  
  // 合并存档数据
  if (gameState.player.realmDungeonProgress) {
    for (const [realm, data] of Object.entries(gameState.player.realmDungeonProgress)) {
      if (!realmDungeonState.progress[realm]) {
        realmDungeonState.progress[realm] = data;
      }
    }
  }
}

// 保存境界副本数据
function saveRealmDungeonData() {
  gameState.player.realmDungeonProgress = realmDungeonState.progress;
}

// 导出到全局 (浏览器环境)
if (typeof window !== 'undefined') {
  window.REALM_DUNGEON_DATA = REALM_DUNGEON_DATA;
  window.realmDungeonState = realmDungeonState;
  window.getAvailableRealmDungeons = getAvailableRealmDungeons;
  window.enterRealmDungeon = enterRealmDungeon;
  window.startRealmDungeonBattle = startRealmDungeonBattle;
  window.attackRealmDungeonEnemy = attackRealmDungeonEnemy;
  window.exitRealmDungeon = exitRealmDungeon;
  window.getRealmDungeonStatus = getRealmDungeonStatus;
  window.initRealmDungeonData = initRealmDungeonData;
  window.saveRealmDungeonData = saveRealmDungeonData;
}
