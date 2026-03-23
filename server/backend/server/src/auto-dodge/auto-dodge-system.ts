/**
 * 自动躲避系统
 * 战斗中有几率自动闪避敌方攻击
 */

// 闪避类型
export const DODGE_TYPE = {
  PHYSICAL: 'physical',  // 物理闪避
  MAGICAL: 'magical',    // 法术闪避
  ALL: 'all'            // 全部闪避
};

// 闪避效果配置
const DODGE_CONFIG = {
  // 基础闪避率
  baseDodgeRate: 0.05,
  // 最高闪避率
  maxDodgeRate: 0.5,
  // 每点敏捷提供的闪避率
  dodgePerAgility: 0.001,
  // 闪避成功判定阈值
  dodgeCheckBase: 0.3,
  // 完美闪避(完全不受伤)概率
  perfectDodgeRate: 0.1,
  // 闪避冷却(毫秒)
  dodgeCooldown: 500,
  // 闪避加成技能ID列表
  dodgeSkillIds: [1001, 1002, 1003, 2001, 2002]
};

// 玩家闪避数据
const playerDodgeData = new Map<number, any>();

// 初始化玩家闪避数据
export function initPlayerDodge(playerId: number): any {
  let data = playerDodgeData.get(playerId);
  
  if (!data) {
    data = {
      enabled: false,
      dodgeType: DODGE_TYPE.ALL,
      dodgeRate: DODGE_CONFIG.baseDodgeRate,
      perfectDodgeRate: DODGE_CONFIG.perfectDodgeRate,
      lastDodgeTime: 0,
      dodgeCount: 0,
      perfectDodgeCount: 0,
      skills: []
    };
    playerDodgeData.set(playerId, data);
  }
  
  return data;
}

// 获取玩家闪避设置
export function getDodgeSettings(playerId: number): any {
  const data = initPlayerDodge(playerId);
  
  return {
    enabled: data.enabled,
    dodgeType: data.dodgeType,
    dodgeRate: data.dodgeRate,
    perfectDodgeRate: data.perfectDodgeRate,
    dodgeCount: data.dodgeCount,
    perfectDodgeCount: data.perfectDodgeCount
  };
}

// 更新闪避设置
export function updateDodgeSettings(
  playerId: number, 
  settings: { 
    enabled?: boolean; 
    dodgeType?: string;
    dodgeRate?: number;
  }
): any {
  const data = initPlayerDodge(playerId);
  
  if (settings.enabled !== undefined) {
    data.enabled = settings.enabled;
  }
  
  if (settings.dodgeType && Object.values(DODGE_TYPE).includes(settings.dodgeType)) {
    data.dodgeType = settings.dodgeType;
  }
  
  if (settings.dodgeRate !== undefined) {
    data.dodgeRate = Math.min(DODGE_CONFIG.maxDodgeRate, Math.max(0, settings.dodgeRate));
  }
  
  return {
    success: true,
    message: '闪避设置已更新',
    settings: getDodgeSettings(playerId)
  };
}

// 计算玩家闪避率
export function calculateDodgeRate(playerId: number, agility: number = 0): number {
  const data = initPlayerDodge(playerId);
  
  if (!data.enabled) {
    return 0;
  }
  
  // 基础闪避率 + 敏捷加成
  let rate = data.dodgeRate + (agility * DODGE_CONFIG.dodgePerAgility);
  
  // 技能加成
  if (data.skills && data.skills.length > 0) {
    for (const skill of data.skills) {
      rate += skill.bonusRate || 0;
    }
  }
  
  // 限制最大闪避率
  return Math.min(DODGE_CONFIG.maxDodgeRate, rate);
}

// 执行闪避判定
export function performDodgeCheck(
  playerId: number, 
  attackType: string,
  agility: number = 0
): { dodged: boolean; perfectDodge: boolean; damageReduction: number } {
  const data = initPlayerDodge(playerId);
  
  if (!data.enabled) {
    return { dodged: false, perfectDodge: false, damageReduction: 0 };
  }
  
  // 检查冷却
  const now = Date.now();
  if (now - data.lastDodgeTime < DODGE_CONFIG.dodgeCooldown) {
    return { dodged: false, perfectDodge: false, damageReduction: 0 };
  }
  
  // 检查闪避类型是否匹配
  if (attackType === DODGE_TYPE.PHYSICAL && data.dodgeType === DODGE_TYPE.MAGICAL) {
    return { dodged: false, perfectDodge: false, damageReduction: 0 };
  }
  if (attackType === DODGE_TYPE.MAGICAL && data.dodgeType === DODGE_TYPE.PHYSICAL) {
    return { dodged: false, perfectDodge: false, damageReduction: 0 };
  }
  
  // 计算闪避率
  const dodgeRate = calculateDodgeRate(playerId, agility);
  
  // 随机判定
  const roll = Math.random();
  
  // 完美闪避判定
  if (roll < dodgeRate * DODGE_CONFIG.perfectDodgeRate) {
    data.lastDodgeTime = now;
    data.dodgeCount++;
    data.perfectDodgeCount++;
    
    return { dodged: true, perfectDodge: true, damageReduction: 1.0 };
  }
  
  // 普通闪避判定
  if (roll < dodgeRate) {
    data.lastDodgeTime = now;
    data.dodgeCount++;
    
    // 闪避成功，减少一定伤害
    return { dodged: true, perfectDodge: false, damageReduction: 0.8 };
  }
  
  return { dodged: false, perfectDodge: false, damageReduction: 0 };
}

// 学习闪避技能
export function learnDodgeSkill(playerId: number, skillId: number, skillBonusRate: number): any {
  if (!DODGE_CONFIG.dodgeSkillIds.includes(skillId)) {
    return { success: false, message: '这不是闪避技能' };
  }
  
  const data = initPlayerDodge(playerId);
  
  // 检查是否已学习
  if (data.skills?.some((s: any) => s.id === skillId)) {
    return { success: false, message: '已学习该技能' };
  }
  
  // 添加技能
  if (!data.skills) data.skills = [];
  data.skills.push({ id: skillId, bonusRate: skillBonusRate });
  
  return {
    success: true,
    message: '闪避技能学习成功',
    skills: data.skills
  };
}

// 重置闪避统计
export function resetDodgeStats(playerId: number): any {
  const data = initPlayerDodge(playerId);
  
  data.dodgeCount = 0;
  data.perfectDodgeCount = 0;
  
  return {
    success: true,
    message: '闪避统计已重置'
  };
}

export default {
  initPlayerDodge,
  getDodgeSettings,
  updateDodgeSettings,
  calculateDodgeRate,
  performDodgeCheck,
  learnDodgeSkill,
  resetDodgeStats,
  DODGE_CONFIG,
  DODGE_TYPE
};
