// 战斗技能系统 - 主动技能释放
// 支持技能学习、冷却、效果

export interface Skill {
  skillId: string
  name: string
  nameCN: string
  description: string
  type: 'attack' | 'defense' | 'support' | 'ultimate'
  cooldown: number  // 冷却时间(毫秒)
  manaCost: number // 魔法消耗
  damage?: number   // 伤害系数
  heal?: number    // 治疗系数
  effect?: string  // 附加效果ID
  range: number    // 释放范围
  targetType: 'enemy' | 'ally' | 'self' | 'area'
  icon: string
}

export interface PlayerSkill {
  skillId: string
  level: number
  unlocked: boolean
  mastery: number  // 熟练度 0-100
}

export interface SkillEffect {
  effectId: string
  name: string
  duration: number      // 持续时间
  attributes: {         // 属性变化
    attack?: number
    defense?: number
    speed?: number
    crit?: number
  }
  tags: string[]        // 效果标签
}

// 技能配置
export const SKILL_CATALOG: Skill[] = [
  // 攻击技能
  {
    skillId: 'slash',
    name: 'Slash',
    nameCN: '横斩',
    description: '挥刀斩向敌人',
    type: 'attack',
    cooldown: 2000,
    manaCost: 10,
    damage: 1.2,
    range: 1,
    targetType: 'enemy',
    icon: '⚔️'
  },
  {
    skillId: 'double_strike',
    name: 'Double Strike',
    nameCN: '连击',
    description: '快速攻击两次',
    type: 'attack',
    cooldown: 4000,
    manaCost: 20,
    damage: 0.8,
    effect: 'combo',
    range: 1,
    targetType: 'enemy',
    icon: '🗡️'
  },
  {
    skillId: 'fire_ball',
    name: 'Fire Ball',
    nameCN: '火球术',
    description: '发射火球攻击敌人',
    type: 'attack',
    cooldown: 5000,
    manaCost: 30,
    damage: 1.5,
    range: 5,
    targetType: 'area',
    icon: '🔥'
  },
  {
    skillId: 'thunder_strike',
    name: 'Thunder Strike',
    nameCN: '雷击',
    description: '召唤雷电打击敌人',
    type: 'attack',
    cooldown: 8000,
    manaCost: 50,
    damage: 2.0,
    range: 4,
    targetType: 'enemy',
    icon: '⚡'
  },
  // 防御技能
  {
    skillId: 'shield',
    name: 'Shield',
    nameCN: '护盾',
    description: '开启防御护盾',
    type: 'defense',
    cooldown: 10000,
    manaCost: 25,
    effect: 'shield',
    range: 0,
    targetType: 'self',
    icon: '🛡️'
  },
  {
    skillId: 'counter',
    name: 'Counter',
    nameCN: '反击',
    description: '反击敌人攻击',
    type: 'defense',
    cooldown: 6000,
    manaCost: 15,
    effect: 'counter',
    range: 1,
    targetType: 'enemy',
    icon: '🔄'
  },
  // 辅助技能
  {
    skillId: 'heal',
    name: 'Heal',
    nameCN: '治疗',
    description: '治疗友方目标',
    type: 'support',
    cooldown: 8000,
    manaCost: 30,
    heal: 1.0,
    range: 3,
    targetType: 'ally',
    icon: '💚'
  },
  {
    skillId: 'buff',
    name: 'Power Buff',
    nameCN: '强化',
    description: '提升队友攻击力',
    type: 'support',
    cooldown: 15000,
    manaCost: 40,
    effect: 'attack_buff',
    range: 3,
    targetType: 'ally',
    icon: '💪'
  },
  // 大招
  {
    skillId: 'meteor',
    name: 'Meteor',
    nameCN: '陨石',
    description: '召唤陨石毁灭敌人',
    type: 'ultimate',
    cooldown: 60000,
    manaCost: 100,
    damage: 3.0,
    range: 6,
    targetType: 'area',
    icon: '☄️'
  },
  {
    skillId: 'sanctuary',
    name: 'Sanctuary',
    nameCN: '圣域',
    description: '创造无敌领域',
    type: 'ultimate',
    cooldown: 90000,
    manaCost: 150,
    effect: 'invincible',
    range: 4,
    targetType: 'area',
    icon: '✨'
  },
]

// 技能效果配置
export const SKILL_EFFECTS: SkillEffect[] = [
  {
    effectId: 'combo',
    name: '连击',
    duration: 2000,
    attributes: {},
    tags: ['attack', 'combo']
  },
  {
    effectId: 'shield',
    name: '护盾',
    duration: 5000,
    attributes: { defense: 50 },
    tags: ['defense', 'shield']
  },
  {
    effectId: 'counter',
    name: '反击',
    duration: 3000,
    attributes: {},
    tags: ['defense', 'counter']
  },
  {
    effectId: 'attack_buff',
    name: '攻击强化',
    duration: 10000,
    attributes: { attack: 30 },
    tags: ['buff', 'attack']
  },
  {
    effectId: 'defense_buff',
    name: '防御强化',
    duration: 10000,
    attributes: { defense: 30 },
    tags: ['buff', 'defense']
  },
  {
    effectId: 'speed_buff',
    name: '速度强化',
    duration: 8000,
    attributes: { speed: 20 },
    tags: ['buff', 'speed']
  },
  {
    effectId: 'invincible',
    name: '无敌',
    duration: 5000,
    attributes: {},
    tags: ['buff', 'invincible']
  },
]

export class BattleSkillSystem {
  private playerSkills: Map<string, Map<string, PlayerSkill>> = new Map()  // playerId -> skillId -> PlayerSkill
  private skillCooldowns: Map<string, Map<string, number>> = new Map()     // playerId -> skillId -> cooldownEndTime
  private activeEffects: Map<string, { effectId: string, endTime: number }[]> = new Map()  // playerId -> effects

  // 初始化玩家技能
  initPlayerSkills(playerId: string, unlockedSkills: string[] = []): void {
    if (!this.playerSkills.has(playerId)) {
      this.playerSkills.set(playerId, new Map())
      this.skillCooldowns.set(playerId, new Map())
      this.activeEffects.set(playerId, [])
    }

    const playerSkillMap = this.playerSkills.get(playerId)!
    
    // 解锁初始技能
    const initialSkills = ['slash', 'shield']  // 初始技能
    const allSkills = [...new Set([...initialSkills, ...unlockedSkills])]
    
    allSkills.forEach(skillId => {
      if (!playerSkillMap.has(skillId)) {
        playerSkillMap.set(skillId, {
          skillId,
          level: 1,
          unlocked: true,
          mastery: 0
        })
      }
    })
  }

  // 学习新技能
  learnSkill(playerId: string, skillId: string): { success: boolean, message: string } {
    const skill = SKILL_CATALOG.find(s => s.skillId === skillId)
    if (!skill) {
      return { success: false, message: '技能不存在' }
    }

    if (!this.playerSkills.has(playerId)) {
      this.initPlayerSkills(playerId)
    }

    const playerSkillMap = this.playerSkills.get(playerId)!
    
    if (playerSkillMap.has(skillId)) {
      return { success: false, message: '已学会该技能' }
    }

    playerSkillMap.set(skillId, {
      skillId,
      level: 1,
      unlocked: true,
      mastery: 0
    })

    return { success: true, message: `学会技能: ${skill.nameCN}` }
  }

  // 使用技能
  useSkill(playerId: string, skillId: string, targetId: string): { success: boolean, message: string, result?: any } {
    if (!this.playerSkills.has(playerId)) {
      return { success: false, message: '请先学习技能' }
    }

    const playerSkillMap = this.playerSkills.get(playerId)!
    const playerSkill = playerSkillMap.get(skillId)
    
    if (!playerSkill || !playerSkill.unlocked) {
      return { success: false, message: '技能未解锁' }
    }

    const skill = SKILL_CATALOG.find(s => s.skillId === skillId)
    if (!skill) {
      return { success: false, message: '技能不存在' }
    }

    // 检查冷却
    const cooldowns = this.skillCooldowns.get(playerId)!
    const cooldownEnd = cooldowns.get(skillId) || 0
    if (Date.now() < cooldownEnd) {
      const remaining = Math.ceil((cooldownEnd - Date.now()) / 1000)
      return { success: false, message: `技能冷却中，${remaining}秒后可使用` }
    }

    // 检查魔法值（这里应该从玩家数据获取，这里简化处理）
    // const playerMana = playerData.mana
    // if (playerMana < skill.manaCost) {
    //   return { success: false, message: '魔法值不足' }
    // }

    // 设置冷却
    cooldowns.set(skillId, Date.now() + skill.cooldown)

    // 应用效果
    if (skill.effect) {
      this.applyEffect(playerId, skill.effect)
    }

    // 计算伤害/治疗（这里应该结合玩家属性计算）
    const result: any = {
      skillId,
      skillName: skill.nameCN,
      type: skill.type,
      targetId,
      cooldown: skill.cooldown,
    }

    if (skill.damage) {
      result.damage = Math.floor(skill.damage * 100)  // 简化计算
    }
    if (skill.heal) {
      result.heal = Math.floor(skill.heal * 100)
    }
    if (skill.effect) {
      result.effect = skill.effect
    }

    return { success: true, message: `使用技能: ${skill.nameCN}`, result }
  }

  // 应用技能效果
  private applyEffect(playerId: string, effectId: string): void {
    const effect = SKILL_EFFECTS.find(e => e.effectId === effectId)
    if (!effect) return

    if (!this.activeEffects.has(playerId)) {
      this.activeEffects.set(playerId, [])
    }

    const effects = this.activeEffects.get(playerId)!
    effects.push({
      effectId,
      endTime: Date.now() + effect.duration
    })
  }

  // 获取玩家当前效果
  getActiveEffects(playerId: string): SkillEffect[] {
    const effects = this.activeEffects.get(playerId) || []
    const now = Date.now()
    
    return effects
      .filter(e => e.endTime > now)
      .map(e => SKILL_EFFECTS.find(ef => ef.effectId === e.effectId)!)
      .filter(Boolean)
  }

  // 获取玩家技能列表
  getPlayerSkills(playerId: string): PlayerSkill[] {
    const playerSkillMap = this.playerSkills.get(playerId)
    if (!playerSkillMap) return []
    
    return Array.from(playerSkillMap.values()).map(ps => {
      const skill = SKILL_CATALOG.find(s => s.skillId === ps.skillId)
      return {
        ...ps,
        skillName: skill?.nameCN || ps.skillId,
        skillNameEN: skill?.name || ps.skillId,
        cooldown: skill?.cooldown || 0,
        cooldownEnd: this.skillCooldowns.get(playerId)?.get(ps.skillId) || 0
      }
    })
  }

  // 获取技能冷却状态
  getCooldownStatus(playerId: string, skillId: string): { ready: boolean, remaining: number } {
    const cooldowns = this.skillCooldowns.get(playerId)
    if (!cooldowns) return { ready: true, remaining: 0 }

    const cooldownEnd = cooldowns.get(skillId) || 0
    const remaining = Math.max(0, cooldownEnd - Date.now())
    
    return {
      ready: remaining <= 0,
      remaining
    }
  }

  // 升级技能
  upgradeSkill(playerId: string, skillId: string): { success: boolean, message: string } {
    const playerSkillMap = this.playerSkills.get(playerId)
    if (!playerSkillMap) {
      return { success: false, message: '未学习该技能' }
    }

    const playerSkill = playerSkillMap.get(skillId)
    if (!playerSkill) {
      return { success: false, message: '未学习该技能' }
    }

    if (playerSkill.level >= 10) {
      return { success: false, message: '技能等级已达上限' }
    }

    playerSkill.level++
    
    return { success: true, message: `技能升级成功，当前等级: ${playerSkill.level}` }
  }

  // 增加熟练度
  addMastery(playerId: string, skillId: string, amount: number): void {
    const playerSkillMap = this.playerSkills.get(playerId)
    if (!playerSkillMap) return

    const playerSkill = playerSkillMap.get(skillId)
    if (!playerSkill) return

    playerSkill.mastery = Math.min(100, playerSkill.mastery + amount)

    // 熟练度达到一定程度可以升级
    if (playerSkill.mastery >= 100 && playerSkill.level < 10) {
      playerSkill.level++
      playerSkill.mastery = 0
    }
  }

  // 获取所有可用技能
  getAllSkills(): Skill[] {
    return SKILL_CATALOG
  }

  // 获取技能详情
  getSkillInfo(skillId: string): Skill | undefined {
    return SKILL_CATALOG.find(s => s.skillId === skillId)
  }
}

export default BattleSkillSystem
