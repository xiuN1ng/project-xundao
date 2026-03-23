/**
 * 自动战斗系统 - 智能战斗AI
 * 根据战斗情况自动选择最优行动
 */

import Router from 'koa-router';

const router = new Router();

// 智能战斗AI配置
export const AUTO_BATTLE_CONFIG = {
  // AI决策间隔(毫秒)
  decisionInterval: 2000,
  // 血量低于多少百分比时使用恢复技能
  healthThreshold: 0.3,
  // 敌人血量低于多少百分比时使用终结技能
  killThreshold: 0.15,
  // 连击数达到多少时释放终结技
  comboKillThreshold: 5,
  // AI技能优先级
  skillPriority: {
    heal: 1,      // 恢复技能
    defense: 2,    // 防御技能
    buff: 3,      // 增益技能
    attack: 4,    // 攻击技能
    ultimate: 5   // 终结技能
  }
};

// 玩家自动战斗状态
interface AutoBattleState {
  playerId: string;
  enabled: boolean;
  aiLevel: 'basic' | 'smart' | 'expert';
  skills: string[];
  lastAction: number;
}

// 自动战斗状态存储
const autoBattleStates = new Map<string, AutoBattleState>();

// AI决策逻辑
function makeAIDecision(playerId: string, battleState: any): {
  action: string;
  target?: string;
  skillId?: string;
} {
  const state = autoBattleStates.get(playerId);
  if (!state || !state.enabled) {
    return { action: 'auto_attack' };
  }

  const { healthPercent, enemyHealthPercent, currentCombo, availableSkills } = battleState;

  // 血量危险，使用恢复
  if (healthPercent < AUTO_BATTLE_CONFIG.healthThreshold) {
    const healSkill = availableSkills.find((s: any) => s.type === 'heal');
    if (healSkill) {
      return { action: 'use_skill', skillId: healSkill.id };
    }
  }

  // 敌人血量低，使用终结技
  if (enemyHealthPercent < AUTO_BATTLE_CONFIG.killThreshold || 
      currentCombo >= AUTO_BATTLE_CONFIG.comboKillThreshold) {
    const ultimateSkill = availableSkills.find((s: any) => s.type === 'ultimate');
    if (ultimateSkill) {
      return { action: 'use_skill', skillId: ultimateSkill.id };
    }
  }

  // 智能选择技能
  const sortedSkills = [...availableSkills].sort((a: any, b: any) => {
    const priorityA = AUTO_BATTLE_CONFIG.skillPriority[a.type] || 10;
    const priorityB = AUTO_BATTLE_CONFIG.skillPriority[b.type] || 10;
    return priorityA - priorityB;
  });

  if (sortedSkills.length > 0 && Math.random() > 0.3) {
    return { action: 'use_skill', skillId: sortedSkills[0].id };
  }

  return { action: 'auto_attack' };
}

// 开启/关闭自动战斗
router.post('/api/auto-battle/toggle', async (ctx) => {
  const { playerId, enabled, aiLevel = 'smart' } = ctx.request.body as any;
  
  if (!playerId) {
    ctx.status = 400;
    ctx.body = { error: '缺少玩家ID' };
    return;
  }

  const state: AutoBattleState = {
    playerId,
    enabled: enabled ?? true,
    aiLevel,
    skills: [],
    lastAction: Date.now()
  };

  autoBattleStates.set(playerId, state);

  ctx.body = {
    success: true,
    data: {
      enabled: state.enabled,
      aiLevel: state.aiLevel
    }
  };
});

// 获取自动战斗状态
router.get('/api/auto-battle/status/:playerId', async (ctx) => {
  const { playerId } = ctx.params;
  
  const state = autoBattleStates.get(playerId);
  
  ctx.body = {
    success: true,
    data: state || { playerId, enabled: false, aiLevel: 'basic' }
  };
});

// AI决策接口
router.post('/api/auto-battle/decision', async (ctx) => {
  const { playerId, battleState } = ctx.request.body as any;
  
  if (!playerId || !battleState) {
    ctx.status = 400;
    ctx.body = { error: '参数不完整' };
    return;
  }

  const decision = makeAIDecision(playerId, battleState);
  
  // 更新最后行动时间
  const state = autoBattleStates.get(playerId);
  if (state) {
    state.lastAction = Date.now();
  }

  ctx.body = {
    success: true,
    data: decision
  };
});

// 设置AI等级
router.post('/api/auto-battle/ai-level', async (ctx) => {
  const { playerId, aiLevel } = ctx.request.body as any;
  
  if (!playerId || !aiLevel) {
    ctx.status = 400;
    ctx.body = { error: '参数不完整' };
    return;
  }

  const state = autoBattleStates.get(playerId);
  if (state) {
    state.aiLevel = aiLevel;
  }

  ctx.body = {
    success: true,
    data: { aiLevel }
  };
});

export default router;
export { AUTO_BATTLE_CONFIG, AutoBattleState, autoBattleStates };
