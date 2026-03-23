/**
 * 挂机修仙 - 一键操作功能系统
 * 
 * 功能：
 * 1. 一键修炼：自动修炼N次
 * 2. 一键收集：自动收集洞府资源
 * 3. 一键升级：自动升级建筑
 * 4. 一键战斗：自动挑战N次
 * 5. 可设置次数或时间
 */

// ==================== 一键操作配置 ====================
const QUICK_ACTIONS = {
  // 一键修炼
  cultivate: {
    name: '一键修炼',
    icon: '🧘',
    description: '自动修炼指定次数',
    maxTimes: 1000,
    cost: null
  },
  
  // 一键收集
  collect: {
    name: '一键收集',
    icon: '🎒',
    description: '一键收集洞府资源',
    cost: null
  },
  
  // 一键战斗
  battle: {
    name: '一键战斗',
    icon: '⚔️',
    description: '自动挑战敌人',
    maxTimes: 100,
    cost: { stamina: 1 }
  },
  
  // 一键升级建筑
  upgrade_building: {
    name: '一键升级',
    icon: '🏗️',
    description: '升级洞府建筑',
    cost: { resource: true }
  },
  
  // 一键强化装备
  enhance_equipment: {
    name: '一键强化',
    icon: '🔨',
    description: '自动强化装备',
    maxTimes: 50,
    cost: { stone: true }
  },
  
  // 一键突破
  breakthrough: {
    name: '一键突破',
    icon: '🚀',
    description: '自动突破境界',
    cost: { spirit: true }
  }
};

/**
 * 一键操作结果
 */
class QuickActionResult {
  constructor(success, message, data = {}) {
    this.success = success;
    this.message = message;
    this.data = data;
  }
}

/**
 * 一键操作服务
 */
class QuickActionService {
  constructor(game) {
    this.game = game;
    this.actions = QUICK_ACTIONS;
  }
  
  /**
   * 一键修炼
   */
  quickCultivate(player, times = 10) {
    const maxTimes = Math.min(times, this.actions.cultivate.maxTimes);
    let actualTimes = 0;
    let totalSpirit = 0;
    
    for (let i = 0; i < maxTimes; i++) {
      // 检查灵气是否足够
      if (player.spirit >= player.maxSpirit) {
        return new QuickActionResult(false, '灵气已满', { actualTimes, totalSpirit });
      }
      
      // 修炼一次
      const spiritGain = Math.floor(player.spiritRate * (1 + player.bonuses?.spiritRate || 0));
      player.spirit = Math.min(player.spirit + spiritGain, player.maxSpirit);
      player.stats.cultivateCount = (player.stats.cultivateCount || 0) + 1;
      
      actualTimes++;
      totalSpirit += spiritGain;
    }
    
    return new QuickActionResult(true, `修炼 ${actualTimes} 次，获得 ${totalSpirit} 灵气`, {
      times: actualTimes,
      spirit: totalSpirit
    });
  }
  
  /**
   * 一键收集（洞府资源）
   */
  quickCollect(player) {
    if (!player.cave) {
      return new QuickActionResult(false, '尚未开启洞府');
    }
    
    const resources = ['herbs', 'pills', 'materials', 'equipment'];
    let totalCollected = {};
    
    for (const resource of resources) {
      const baseAmount = Math.floor(Math.random() * 5) + 1; // 1-5
      const multiplier = 1 + (player.cave.buildings?.jilingzhen?.level || 0) * 0.5;
      const amount = Math.floor(baseAmount * multiplier);
      
      if (!player.cave.resources) {
        player.cave.resources = {};
      }
      player.cave.resources[resource] = (player.cave.resources[resource] || 0) + amount;
      
      totalCollected[resource] = amount;
    }
    
    return new QuickActionResult(true, '收集资源成功！', totalCollected);
  }
  
  /**
   * 一键战斗
   */
  quickBattle(player, times = 10) {
    const maxTimes = Math.min(times, this.actions.battle.maxTimes);
    let wins = 0;
    let losses = 0;
    let totalExp = 0;
    let totalStones = 0;
    
    for (let i = 0; i < maxTimes; i++) {
      // 检查体力
      if ((player.stamina || 100) <= 0) {
        break;
      }
      
      // 简单战斗逻辑
      const playerStats = this.game.calculatePlayerStats(player);
      const enemyHp = 100 * (player.level || 1);
      const enemyAtk = 10 * (player.level || 1);
      
      // 玩家攻击
      const playerDamage = playerStats.atk;
      const rounds = Math.ceil(enemyHp / playerDamage);
      const playerTotalDamage = rounds * playerDamage;
      
      // 敌人攻击
      const playerDef = playerStats.def || 0;
      const damageTaken = Math.max(0, enemyAtk - playerDef * 0.5);
      const totalDamageTaken = rounds * damageTaken;
      
      // 判定胜负
      if (totalDamageTaken < playerStats.hp) {
        wins++;
        totalExp += 10 * (player.level || 1);
        if (Math.random() < 0.3) {
          totalStones += Math.floor(Math.random() * 5) + 1;
        }
      } else {
        losses++;
      }
      
      // 消耗体力
      player.stamina = (player.stamina || 100) - 1;
    }
    
    // 发放奖励
    player.exp = (player.exp || 0) + totalExp;
    player.spiritStones = (player.spiritStones || 0) + totalStones;
    
    return new QuickActionResult(true, `战斗 ${wins + losses} 次，胜 ${wins} 负 ${losses}`, {
      wins, losses, exp: totalExp, stones: totalStones
    });
  }
  
  /**
   * 一键升级建筑
   */
  quickUpgradeBuilding(player, buildingId) {
    if (!player.cave || !player.cave.buildings || !player.cave.buildings[buildingId]) {
      return new QuickActionResult(false, '建筑不存在');
    }
    
    const building = player.cave.buildings[buildingId];
    const currentLevel = building.level || 1;
    
    // 计算升级成本
    const upgradeCost = Math.floor(10 * Math.pow(1.5, currentLevel));
    
    // 检查灵石
    if ((player.spiritStones || 0) < upgradeCost) {
      return new QuickActionResult(false, `灵石不足，需要 ${upgradeCost}`);
    }
    
    // 升级
    player.spiritStones -= upgradeCost;
    building.level = currentLevel + 1;
    
    return new QuickActionResult(true, `${building.name} 升级到 ${building.level} 级`, {
      building: buildingId,
      level: building.level,
      cost: upgradeCost
    });
  }
  
  /**
   * 一键强化装备
   */
  quickEnhanceEquipment(player, slot = 'weapon', times = 5) {
    const maxTimes = Math.min(times, this.actions.enhance_equipment.maxTimes);
    let actualTimes = 0;
    let totalCost = 0;
    
    for (let i = 0; i < maxTimes; i++) {
      const cost = Math.floor(10 * Math.pow(1.2, (player.equipment?.[slot]?.level || 1)));
      
      if ((player.spiritStones || 0) < cost) {
        break;
      }
      
      player.spiritStones -= cost;
      
      // 初始化装备
      if (!player.equipment) player.equipment = {};
      if (!player.equipment[slot]) {
        player.equipment[slot] = { level: 0, atk: 0, def: 0, hp: 0 };
      }
      
      player.equipment[slot].level++;
      player.equipment[slot].atk += Math.floor(5 * Math.pow(1.1, player.equipment[slot].level));
      
      actualTimes++;
      totalCost += cost;
    }
    
    return new QuickActionResult(true, `强化 ${slot} ${actualTimes} 次`, {
      slot, times: actualTimes, cost: totalCost
    });
  }
  
  /**
   * 一键突破
   */
  quickBreakthrough(player) {
    const currentRealm = player.realm || '凡人-前期-1阶';
    const REALM_DATA = this.game.realmData || {};
    const realmInfo = REALM_DATA[currentRealm];
    
    if (!realmInfo) {
      return new QuickActionResult(false, '境界数据不存在');
    }
    
    const required = realmInfo.cultivation_req || 100;
    
    if (player.spirit < required) {
      return new QuickActionResult(false, `灵气不足，还需 ${required - player.spirit} 灵气`);
    }
    
    // 执行突破
    player.spirit -= required;
    player.realm = realmInfo.nextRealm || currentRealm;
    
    return new QuickActionResult(true, `突破到 ${player.realm} 成功！`, {
      from: currentRealm,
      to: player.realm
    });
  }
}

/**
 * 生成一键操作UI数据
 */
function generateQuickActionUI(player) {
  const actions = [];
  
  // 修炼
  actions.push({
    id: 'cultivate',
    name: '一键修炼',
    icon: '🧘',
    available: player.spirit < player.maxSpirit,
    hint: `${player.spirit}/${player.maxSpirit} 灵气`
  });
  
  // 收集
  actions.push({
    id: 'collect',
    name: '一键收集',
    icon: '🎒',
    available: !!player.cave,
    hint: player.cave ? '洞府资源' : '未开启洞府'
  });
  
  // 战斗
  actions.push({
    id: 'battle',
    name: '一键战斗',
    icon: '⚔️',
    available: (player.stamina || 100) > 0,
    hint: `${player.stamina || 100} 体力`
  });
  
  // 突破
  actions.push({
    id: 'breakthrough',
    name: '一键突破',
    icon: '🚀',
    available: player.spirit >= 100,
    hint: `${player.spirit} 灵气`
  });
  
  return actions;
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    QuickActionService,
    QUICK_ACTIONS,
    generateQuickActionUI
  };
}
