/**
 * 自动技能施放系统 (Auto-Cast System)
 * 智能技能施放控制，支持：
 * 1. 技能优先级设置（玩家可设置技能释放顺序）
 * 2. 条件触发（血量低于X%时释放治疗技能等）
 * 3. 冷却管理（自动跳过冷却中的技能）
 * 4. 技能组合（多个技能自动连招）
 * 5. 战斗自动施法（挂机时自动释放技能）
 */

import Router from 'koa-router';

const router = new Router();

// ==================== 类型定义 ====================

/** 触发条件类型 */
export type TriggerCondition = 
  | 'health_below'        // 血量低于X%
  | 'health_above'        // 血量高于X%
  | 'mana_below'          // 魔法值低于X%
  | 'mana_above'          // 魔法值高于X%
  | 'enemy_count'         // 敌人数量
  | 'enemy_health_below'  // 敌人血量低于X%
  | 'combo_count'         // 连击数达到
  | 'buff_missing'        // 缺少某个增益
  | 'time_elapsed'        // 时间经过
  | 'always'              // 总是触发（默认）;

/** 技能类型 */
export type SkillType = 'attack' | 'defense' | 'heal' | 'buff' | 'debuff' | 'ultimate' | 'passive';

/** 技能目标类型 */
export type SkillTargetType = 'self' | 'enemy' | 'ally' | 'area' | 'single';

/** 触发条件配置 */
export interface TriggerConfig {
  condition: TriggerCondition;
  value: number;           // 阈值
  skillId?: string;         // 关联的技能ID
  priority?: number;       // 条件优先级
}

/** 技能配置 */
export interface AutoCastSkillConfig {
  skillId: string;
  skillName: string;
  skillNameCN: string;
  type: SkillType;
  targetType: SkillTargetType;
  cooldown: number;        // 冷却时间(ms)
  manaCost: number;        // 魔法消耗
  priority: number;        // 优先级(越小越优先)
  enabled: boolean;        // 是否启用
  triggers: TriggerConfig[]; // 触发条件
}

/** 技能连招配置 */
export interface SkillCombo {
  comboId: string;
  comboName: string;
  comboNameCN: string;
  skills: string[];        // 技能ID序列
  triggerCondition: TriggerConfig;
  repeatCount: number;     // 重复次数
  enabled: boolean;
}

/** 玩家自动施法配置 */
export interface PlayerAutoCastConfig {
  playerId: string;
  enabled: boolean;                    // 总开关
  autoBattleEnabled: boolean;          // 战斗自动施法
  idleCastEnabled: boolean;             // 挂机自动施法
  skillPriority: AutoCastSkillConfig[]; // 技能优先级列表
  combos: SkillCombo[];                 // 连招配置
  globalTriggers: TriggerConfig[];      // 全局触发条件
  settings: AutoCastSettings;           // 详细设置
}

/** 自动施法设置 */
export interface AutoCastSettings {
  checkInterval: number;        // 检查间隔(ms), 默认1000ms
  maxSkillPerTick: number;      // 每tick最大技能数, 默认1
  useComboOnCD: boolean;        // 技能冷却时是否继续连招
  prioritizeHeal: boolean;      // 优先治疗
  prioritizeBuff: boolean;      // 优先增益
  respectPriority: boolean;     // 遵守优先级设置
  smartTargeting: boolean;      // 智能目标选择
}

/** 技能冷却状态 */
export interface SkillCooldownState {
  skillId: string;
  lastCastTime: number;
  remainingCooldown: number;
}

/** 技能施放结果 */
export interface CastResult {
  success: boolean;
  skillId?: string;
  skillName?: string;
  reason?: string;
  damage?: number;
  heal?: number;
  buffs?: string[];
}

// ==================== 常量配置 ====================

/** 默认自动施法设置 */
export const DEFAULT_AUTO_CAST_SETTINGS: AutoCastSettings = {
  checkInterval: 1000,
  maxSkillPerTick: 1,
  useComboOnCD: true,
  prioritizeHeal: true,
  prioritizeBuff: true,
  respectPriority: true,
  smartTargeting: true
};

/** 默认技能类型优先级 */
export const DEFAULT_SKILL_TYPE_PRIORITY: Record<SkillType, number> = {
  heal: 1,        // 治疗最高优先
  buff: 2,        // 增益次之
  defense: 3,     // 防御
  debuff: 4,      // 减益
  attack: 5,     // 攻击
  ultimate: 6,   // 大招
  passive: 7     // 被动
};

// ==================== 存储 ====================

// 玩家自动施法配置存储
const playerAutoCastConfigs = new Map<string, PlayerAutoCastConfig>();

// 技能冷却状态存储
const skillCooldowns = new Map<string, Map<string, SkillCooldownState>>();

// 技能模板库（可以从数据库加载，这里用内存模拟）
const skillTemplateLibrary = new Map<string, AutoCastSkillConfig>();

// ==================== 核心功能 ====================

/**
 * 初始化技能模板库
 */
export function initSkillTemplateLibrary(): void {
  // 攻击技能
  skillTemplateLibrary.set('slash', {
    skillId: 'slash',
    skillName: 'Slash',
    skillNameCN: '横斩',
    type: 'attack',
    targetType: 'single',
    cooldown: 2000,
    manaCost: 10,
    priority: 10,
    enabled: true,
    triggers: [{ condition: 'always', value: 0 }]
  });

  skillTemplateLibrary.set('double_strike', {
    skillId: 'double_strike',
    skillName: 'Double Strike',
    skillNameCN: '连击',
    type: 'attack',
    targetType: 'single',
    cooldown: 4000,
    manaCost: 20,
    priority: 8,
    enabled: true,
    triggers: [{ condition: 'combo_count', value: 3 }]
  });

  skillTemplateLibrary.set('fire_ball', {
    skillId: 'fire_ball',
    skillName: 'Fire Ball',
    skillNameCN: '火球术',
    type: 'attack',
    targetType: 'area',
    cooldown: 5000,
    manaCost: 30,
    priority: 6,
    enabled: true,
    triggers: [{ condition: 'enemy_count', value: 2 }]
  });

  // 治疗技能
  skillTemplateLibrary.set('heal', {
    skillId: 'heal',
    skillName: 'Heal',
    skillNameCN: '治疗术',
    type: 'heal',
    targetType: 'ally',
    cooldown: 8000,
    manaCost: 25,
    priority: 1,
    enabled: true,
    triggers: [{ condition: 'health_below', value: 40 }]
  });

  skillTemplateLibrary.set('group_heal', {
    skillId: 'group_heal',
    skillName: 'Group Heal',
    skillNameCN: '群体治疗',
    type: 'heal',
    targetType: 'area',
    cooldown: 15000,
    manaCost: 50,
    priority: 2,
    enabled: true,
    triggers: [{ condition: 'health_below', value: 30 }]
  });

  // 防御技能
  skillTemplateLibrary.set('shield', {
    skillId: 'shield',
    skillName: 'Shield',
    skillNameCN: '护盾',
    type: 'defense',
    targetType: 'self',
    cooldown: 10000,
    manaCost: 15,
    priority: 3,
    enabled: true,
    triggers: [{ condition: 'health_below', value: 25 }]
  });

  skillTemplateLibrary.set('iron_body', {
    skillId: 'iron_body',
    skillName: 'Iron Body',
    skillNameCN: '铁布衫',
    type: 'defense',
    targetType: 'self',
    cooldown: 20000,
    manaCost: 30,
    priority: 4,
    enabled: true,
    triggers: [{ condition: 'health_below', value: 50 }, { condition: 'enemy_count', value: 3 }]
  });

  // 增益技能
  skillTemplateLibrary.set('power_up', {
    skillId: 'power_up',
    skillName: 'Power Up',
    skillNameCN: '力量祝福',
    type: 'buff',
    targetType: 'self',
    cooldown: 30000,
    manaCost: 20,
    priority: 2,
    enabled: true,
    triggers: [{ condition: 'buff_missing', value: 1 }]
  });

  skillTemplateLibrary.set('speed_up', {
    skillId: 'speed_up',
    skillName: 'Speed Up',
    skillNameCN: '加速',
    type: 'buff',
    targetType: 'self',
    cooldown: 25000,
    manaCost: 15,
    priority: 2,
    enabled: true,
    triggers: [{ condition: 'always', value: 0 }]
  });

  // 终极技能
  skillTemplateLibrary.set('ultimate_slash', {
    skillId: 'ultimate_slash',
    skillName: 'Ultimate Slash',
    skillNameCN: '终极斩',
    type: 'ultimate',
    targetType: 'area',
    cooldown: 60000,
    manaCost: 80,
    priority: 10,
    enabled: true,
    triggers: [{ condition: 'enemy_health_below', value: 15 }, { condition: 'combo_count', value: 5 }]
  });

  skillTemplateLibrary.set('meteor_strike', {
    skillId: 'meteor_strike',
    skillName: 'Meteor Strike',
    skillNameCN: '陨石术',
    type: 'ultimate',
    targetType: 'area',
    cooldown: 90000,
    manaCost: 100,
    priority: 10,
    enabled: true,
    triggers: [{ condition: 'enemy_count', value: 5 }]
  });
}

/**
 * 获取玩家自动施法配置
 */
export function getPlayerAutoCastConfig(playerId: string): PlayerAutoCastConfig {
  return playerAutoCastConfigs.get(playerId) || createDefaultConfig(playerId);
}

/**
 * 创建默认配置
 */
function createDefaultConfig(playerId: string): PlayerAutoCastConfig {
  const defaultSkills: AutoCastSkillConfig[] = [];
  
  // 从模板库加载默认技能
  skillTemplateLibrary.forEach((skill) => {
    defaultSkills.push({ ...skill });
  });

  const config: PlayerAutoCastConfig = {
    playerId,
    enabled: false,
    autoBattleEnabled: false,
    idleCastEnabled: false,
    skillPriority: defaultSkills,
    combos: [],
    globalTriggers: [],
    settings: { ...DEFAULT_AUTO_CAST_SETTINGS }
  };

  playerAutoCastConfigs.set(playerId, config);
  return config;
}

/**
 * 更新玩家自动施法配置
 */
export function updatePlayerAutoCastConfig(
  playerId: string, 
  updates: Partial<PlayerAutoCastConfig>
): PlayerAutoCastConfig {
  const config = getPlayerAutoCastConfig(playerId);
  const updatedConfig = { ...config, ...updates };
  playerAutoCastConfigs.set(playerId, updatedConfig);
  return updatedConfig;
}

/**
 * 更新技能优先级
 */
export function updateSkillPriority(
  playerId: string, 
  skillPriorities: { skillId: string; priority: number }[]
): PlayerAutoCastConfig {
  const config = getPlayerAutoCastConfig(playerId);
  
  skillPriorities.forEach(({ skillId, priority }) => {
    const skillIndex = config.skillPriority.findIndex(s => s.skillId === skillId);
    if (skillIndex !== -1) {
      config.skillPriority[skillIndex].priority = priority;
    }
  });

  // 按优先级排序
  config.skillPriority.sort((a, b) => a.priority - b.priority);
  playerAutoCastConfigs.set(playerId, config);
  return config;
}

/**
 * 更新技能触发条件
 */
export function updateSkillTrigger(
  playerId: string,
  skillId: string,
  triggers: TriggerConfig[]
): PlayerAutoCastConfig {
  const config = getPlayerAutoCastConfig(playerId);
  
  const skillIndex = config.skillPriority.findIndex(s => s.skillId === skillId);
  if (skillIndex !== -1) {
    config.skillPriority[skillIndex].triggers = triggers;
  }

  playerAutoCastConfigs.set(playerId, config);
  return config;
}

/**
 * 添加/更新连招
 */
export function updateSkillCombo(
  playerId: string,
  combo: SkillCombo
): PlayerAutoCastConfig {
  const config = getPlayerAutoCastConfig(playerId);
  
  const comboIndex = config.combos.findIndex(c => c.comboId === combo.comboId);
  if (comboIndex !== -1) {
    config.combos[comboIndex] = combo;
  } else {
    config.combos.push(combo);
  }

  playerAutoCastConfigs.set(playerId, config);
  return config;
}

/**
 * 删除连招
 */
export function removeSkillCombo(
  playerId: string,
  comboId: string
): PlayerAutoCastConfig {
  const config = getPlayerAutoCastConfig(playerId);
  config.combos = config.combos.filter(c => c.comboId !== comboId);
  playerAutoCastConfigs.set(playerId, config);
  return config;
}

/**
 * 检查并更新技能冷却
 */
export function checkSkillCooldown(playerId: string, skillId: string): boolean {
  const playerCDs = skillCooldowns.get(playerId);
  if (!playerCDs) return true;

  const skillCD = playerCDs.get(skillId);
  if (!skillCD) return true;

  const now = Date.now();
  const remaining = skillCD.lastCastTime + skillCD.cooldown - now;
  
  if (remaining > 0) {
    skillCD.remainingCooldown = remaining;
    return false;
  }

  return true;
}

/**
 * 使用技能并记录冷却
 */
export function recordSkillCast(playerId: string, skillId: string, cooldown: number): void {
  let playerCDs = skillCooldowns.get(playerId);
  if (!playerCDs) {
    playerCDs = new Map();
    skillCooldowns.set(playerId, playerCDs);
  }

  playerCDs.set(skillId, {
    skillId,
    lastCastTime: Date.now(),
    remainingCooldown: 0
  });
}

/**
 * 获取技能剩余冷却时间
 */
export function getSkillCooldown(playerId: string, skillId: string): number {
  const playerCDs = skillCooldowns.get(playerId);
  if (!playerCDs) return 0;

  const skillCD = playerCDs.get(skillId);
  if (!skillCD) return 0;

  const now = Date.now();
  const remaining = skillCD.lastCastTime + skillCD.cooldown - now;
  return Math.max(0, remaining);
}

/**
 * 评估触发条件
 */
function evaluateTrigger(
  condition: TriggerCondition, 
  value: number, 
  battleState: BattleState
): boolean {
  switch (condition) {
    case 'health_below':
      return battleState.selfHealthPercent <= value;
    case 'health_above':
      return battleState.selfHealthPercent >= value;
    case 'mana_below':
      return battleState.selfManaPercent <= value;
    case 'mana_above':
      return battleState.selfManaPercent >= value;
    case 'enemy_count':
      return battleState.enemyCount >= value;
    case 'enemy_health_below':
      return battleState.enemyHealthPercent <= value;
    case 'combo_count':
      return battleState.comboCount >= value;
    case 'buff_missing':
      return !battleState.activeBuffs?.includes(`buff_${value}`);
    case 'time_elapsed':
      return battleState.battleElapsedTime >= value;
    case 'always':
    default:
      return true;
  }
}

/**
 * 战斗状态接口
 */
export interface BattleState {
  selfHealthPercent: number;     // 自己血量百分比 0-100
  selfManaPercent: number;       // 自己魔法值百分比 0-100
  enemyCount: number;            // 敌人数量
  enemyHealthPercent: number;    // 敌人血量百分比 0-100
  comboCount: number;            // 当前连击数
  battleElapsedTime: number;     // 战斗经过时间(ms)
  activeBuffs?: string[];        // 当前激活的增益
  activeDebuffs?: string[];      // 当前激活的减益
}

/**
 * 智能技能选择
 */
export function selectSkill(
  playerId: string,
  battleState: BattleState,
  isBattle: boolean = true
): CastResult {
  const config = getPlayerAutoCastConfig(playerId);

  // 检查总开关
  if (!config.enabled || (isBattle && !config.autoBattleEnabled)) {
    return { success: false, reason: '自动施法未开启' };
  }

  const { settings, skillPriority } = config;

  // 1. 首先检查连招
  if (settings.useComboOnCD) {
    const comboResult = checkAndExecuteCombo(config, battleState);
    if (comboResult.success) {
      return comboResult;
    }
  }

  // 2. 如果优先治疗，检查治疗技能
  if (settings.prioritizeHeal) {
    const healSkill = selectSkillByType(skillPriority, 'heal', battleState, config);
    if (healSkill) {
      return castSkill(playerId, healSkill, battleState);
    }
  }

  // 3. 如果优先增益，检查增益技能
  if (settings.prioritizeBuff) {
    const buffSkill = selectSkillByType(skillPriority, 'buff', battleState, config);
    if (buffSkill) {
      return castSkill(playerId, buffSkill, battleState);
    }
  }

  // 4. 根据优先级选择技能
  if (settings.respectPriority) {
    for (const skill of skillPriority) {
      if (!skill.enabled) continue;
      
      // 检查冷却
      if (!checkSkillCooldown(playerId, skill.skillId)) continue;
      
      // 检查魔法值
      if (battleState.selfManaPercent * 100 < skill.manaCost) continue;

      // 检查触发条件
      const triggered = skill.triggers.some(t => evaluateTrigger(t.condition, t.value, battleState));
      if (!triggered) continue;

      return castSkill(playerId, skill, battleState);
    }
  } else {
    // 不按优先级，按触发条件选择
    const availableSkills = skillPriority.filter(s => {
      if (!s.enabled) return false;
      if (!checkSkillCooldown(playerId, s.skillId)) return false;
      if (battleState.selfManaPercent * 100 < s.manaCost) return false;
      return s.triggers.some(t => evaluateTrigger(t.condition, t.value, battleState));
    });

    if (availableSkills.length > 0) {
      return castSkill(playerId, availableSkills[0], battleState);
    }
  }

  return { success: false, reason: '没有满足条件的技能' };
}

/**
 * 按技能类型选择
 */
function selectSkillByType(
  skills: AutoCastSkillConfig[],
  type: SkillType,
  battleState: BattleState,
  config: PlayerAutoCastConfig
): AutoCastSkillConfig | null {
  const typeSkills = skills.filter(s => s.type === type && s.enabled);
  
  for (const skill of typeSkills) {
    if (!checkSkillCooldown(config.playerId, skill.skillId)) continue;
    if (battleState.selfManaPercent * 100 < skill.manaCost) continue;
    
    const triggered = skill.triggers.some(t => evaluateTrigger(t.condition, t.value, battleState));
    if (triggered) {
      return skill;
    }
  }

  return null;
}

/**
 * 执行连招检查
 */
function checkAndExecuteCombo(
  config: PlayerAutoCastConfig,
  battleState: BattleState
): CastResult {
  for (const combo of config.combos) {
    if (!combo.enabled) continue;

    const triggered = evaluateTrigger(
      combo.triggerCondition.condition,
      combo.triggerCondition.value,
      battleState
    );

    if (triggered) {
      // 返回连招中的第一个技能
      if (combo.skills.length > 0) {
        const firstSkillId = combo.skills[0];
        const skill = config.skillPriority.find(s => s.skillId === firstSkillId);
        
        if (skill && checkSkillCooldown(config.playerId, firstSkillId)) {
          return {
            success: true,
            skillId: firstSkillId,
            skillName: skill.skillNameCN,
            reason: `连招[${combo.comboNameCN}]触发`
          };
        }
      }
    }
  }

  return { success: false };
}

/**
 * 执行技能施放
 */
function castSkill(
  playerId: string,
  skill: AutoCastSkillConfig,
  battleState: BattleState
): CastResult {
  // 记录冷却
  recordSkillCast(playerId, skill.skillId, skill.cooldown);

  // 根据技能类型生成结果
  const result: CastResult = {
    success: true,
    skillId: skill.skillId,
    skillName: skill.skillNameCN
  };

  switch (skill.type) {
    case 'attack':
      result.damage = calculateDamage(skill, battleState);
      break;
    case 'heal':
      result.heal = calculateHeal(skill, battleState);
      break;
    case 'buff':
      result.buffs = [skill.skillId];
      break;
    case 'defense':
      result.buffs = ['shield'];
      break;
    case 'ultimate':
      result.damage = calculateDamage(skill, battleState) * 2;
      break;
  }

  return result;
}

/**
 * 计算伤害
 */
function calculateDamage(skill: AutoCastSkillConfig, battleState: BattleState): number {
  // 基础伤害计算（实际游戏中会有更复杂的公式）
  const baseDamage = 100;
  const multiplier = skill.type === 'ultimate' ? 2.5 : skill.type === 'attack' ? 1.5 : 1;
  const enemyCountBonus = battleState.enemyCount > 1 ? 0.2 : 0;
  
  return Math.floor(baseDamage * multiplier * (1 + enemyCountBonus));
}

/**
 * 计算治疗量
 */
function calculateHeal(skill: AutoCastSkillConfig, battleState: BattleState): number {
  const baseHeal = 80;
  const multiplier = skill.type === 'ultimate' ? 2 : 1;
  const missingHealthBonus = (100 - battleState.selfHealthPercent) / 100;
  
  return Math.floor(baseHeal * multiplier * (1 + missingHealthBonus));
}

/**
 * 重置玩家所有技能冷却
 */
export function resetAllCooldowns(playerId: string): void {
  skillCooldowns.delete(playerId);
}

/**
 * 获取所有可用的技能模板
 */
export function getAvailableSkillTemplates(): AutoCastSkillConfig[] {
  return Array.from(skillTemplateLibrary.values());
}

/**
 * 添加自定义技能到模板库
 */
export function addSkillTemplate(skill: AutoCastSkillConfig): void {
  skillTemplateLibrary.set(skill.skillId, skill);
}

/**
 * 批量施放技能（用于连招）
 */
export function executeCombo(
  playerId: string,
  comboId: string,
  battleState: BattleState
): CastResult[] {
  const config = getPlayerAutoCastConfig(playerId);
  const combo = config.combos.find(c => c.comboId === comboId);
  
  if (!combo || !combo.enabled) {
    return [{ success: false, reason: '连招不存在或未启用' }];
  }

  const results: CastResult[] = [];
  
  for (let i = 0; i < Math.min(combo.skills.length, config.settings.maxSkillPerTick * 3); i++) {
    const skillId = combo.skills[i];
    const skill = config.skillPriority.find(s => s.skillId === skillId);
    
    if (!skill) continue;
    if (!checkSkillCooldown(playerId, skillId)) continue;
    
    const result = castSkill(playerId, skill, battleState);
    results.push(result);
    
    // 如果是最后一个技能，记录连招完成
    if (i === combo.skills.length - 1) {
      result.reason = `连招[${combo.comboNameCN}]完成`;
    }
  }

  return results;
}

// ==================== API 接口 ====================

/**
 * 获取玩家自动施法配置
 */
router.get('/api/auto-cast/config/:playerId', async (ctx) => {
  const { playerId } = ctx.params;
  
  const config = getPlayerAutoCastConfig(playerId);
  
  ctx.body = {
    success: true,
    data: config
  };
});

/**
 * 更新自动施法总开关
 */
router.post('/api/auto-cast/toggle', async (ctx) => {
  const { playerId, enabled, autoBattleEnabled, idleCastEnabled } = ctx.request.body as any;
  
  if (!playerId) {
    ctx.status = 400;
    ctx.body = { error: '缺少玩家ID' };
    return;
  }

  const config = updatePlayerAutoCastConfig(playerId, {
    enabled: enabled ?? true,
    autoBattleEnabled: autoBattleEnabled ?? true,
    idleCastEnabled: idleCastEnabled ?? false
  });

  ctx.body = {
    success: true,
    data: {
      enabled: config.enabled,
      autoBattleEnabled: config.autoBattleEnabled,
      idleCastEnabled: config.idleCastEnabled
    }
  };
});

/**
 * 更新技能优先级
 */
router.post('/api/auto-cast/priority', async (ctx) => {
  const { playerId, skillPriorities } = ctx.request.body as any;
  
  if (!playerId || !skillPriorities || !Array.isArray(skillPriorities)) {
    ctx.status = 400;
    ctx.body = { error: '参数不完整' };
    return;
  }

  const config = updateSkillPriority(playerId, skillPriorities);

  ctx.body = {
    success: true,
    data: config.skillPriority
  };
});

/**
 * 更新技能触发条件
 */
router.post('/api/auto-cast/trigger', async (ctx) => {
  const { playerId, skillId, triggers } = ctx.request.body as any;
  
  if (!playerId || !skillId || !triggers) {
    ctx.status = 400;
    ctx.body = { error: '参数不完整' };
    return;
  }

  const config = updateSkillTrigger(playerId, skillId, triggers);

  ctx.body = {
    success: true,
    message: '触发条件更新成功'
  };
});

/**
 * 添加/更新连招
 */
router.post('/api/auto-cast/combo', async (ctx) => {
  const { playerId, combo } = ctx.request.body as any;
  
  if (!playerId || !combo || !combo.comboId) {
    ctx.status = 400;
    ctx.body = { error: '参数不完整' };
    return;
  }

  const config = updateSkillCombo(playerId, combo);

  ctx.body = {
    success: true,
    data: config.combos
  };
});

/**
 * 删除连招
 */
router.delete('/api/auto-cast/combo/:playerId/:comboId', async (ctx) => {
  const { playerId, comboId } = ctx.params;
  
  const config = removeSkillCombo(playerId, comboId);

  ctx.body = {
    success: true,
    data: config.combos
  };
});

/**
 * 获取技能冷却状态
 */
router.get('/api/auto-cast/cooldown/:playerId', async (ctx) => {
  const { playerId } = ctx.params;
  
  const config = getPlayerAutoCastConfig(playerId);
  const cooldowns: Record<string, number> = {};
  
  config.skillPriority.forEach(skill => {
    cooldowns[skill.skillId] = getSkillCooldown(playerId, skill.skillId);
  });

  ctx.body = {
    success: true,
    data: cooldowns
  };
});

/**
 * 重置冷却
 */
router.post('/api/auto-cast/reset-cooldown', async (ctx) => {
  const { playerId } = ctx.request.body as any;
  
  if (!playerId) {
    ctx.status = 400;
    ctx.body = { error: '缺少玩家ID' };
    return;
  }

  resetAllCooldowns(playerId);

  ctx.body = {
    success: true,
    message: '技能冷却已重置'
  };
});

/**
 * 执行自动技能选择（核心接口）
 */
router.post('/api/auto-cast/select', async (ctx) => {
  const { playerId, battleState, isBattle = true } = ctx.request.body as any;
  
  if (!playerId || !battleState) {
    ctx.status = 400;
    ctx.body = { error: '参数不完整' };
    return;
  }

  const result = selectSkill(playerId, battleState, isBattle);

  ctx.body = {
    success: true,
    data: result
  };
});

/**
 * 执行连招
 */
router.post('/api/auto-cast/execute-combo', async (ctx) => {
  const { playerId, comboId, battleState } = ctx.request.body as any;
  
  if (!playerId || !comboId || !battleState) {
    ctx.status = 400;
    ctx.body = { error: '参数不完整' };
    return;
  }

  const results = executeCombo(playerId, comboId, battleState);

  ctx.body = {
    success: true,
    data: results
  };
});

/**
 * 更新自动施法设置
 */
router.post('/api/auto-cast/settings', async (ctx) => {
  const { playerId, settings } = ctx.request.body as any;
  
  if (!playerId || !settings) {
    ctx.status = 400;
    ctx.body = { error: '参数不完整' };
    return;
  }

  const config = getPlayerAutoCastConfig(playerId);
  config.settings = { ...config.settings, ...settings };
  playerAutoCastConfigs.set(playerId, config);

  ctx.body = {
    success: true,
    data: config.settings
  };
});

/**
 * 获取可用技能模板
 */
router.get('/api/auto-cast/templates', async (ctx) => {
  const templates = getAvailableSkillTemplates();
  
  ctx.body = {
    success: true,
    data: templates
  };
});

// ==================== 导出 ====================

export default router;
export {
  router as autoCastRouter,
  initSkillTemplateLibrary,
  getPlayerAutoCastConfig,
  updatePlayerAutoCastConfig,
  updateSkillPriority,
  updateSkillTrigger,
  updateSkillCombo,
  removeSkillCombo,
  checkSkillCooldown,
  recordSkillCast,
  getSkillCooldown,
  selectSkill,
  executeCombo,
  resetAllCooldowns,
  getAvailableSkillTemplates,
  addSkillTemplate,
  DEFAULT_AUTO_CAST_SETTINGS,
  DEFAULT_SKILL_TYPE_PRIORITY
};
