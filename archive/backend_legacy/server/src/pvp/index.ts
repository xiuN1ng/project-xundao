// PVP系统导出

// PVP战斗系统
export { 
  PVPSystem, 
  PVP_MODES 
} from './pvp-system'

export type { 
  PVPMatch, 
  PVPMatchResult, 
  PVPConfig 
} from './pvp-system'

// 战斗技能系统
export { 
  BattleSkillSystem, 
  SKILL_CATALOG, 
  SKILL_EFFECTS 
} from './battle-skill-system'

export type { 
  Skill, 
  PlayerSkill, 
  SkillEffect 
} from './battle-skill-system'

// AI战斗系统
export { 
  AIBattleSystem, 
  aiBattleSystem, 
  DEFAULT_AI_BATTLE_CONFIG 
} from './ai-battle-system'

export type { 
  AIBattleConfig, 
  BattleState, 
  EnemyAttack, 
  AISuggestion 
} from './ai-battle-system'
