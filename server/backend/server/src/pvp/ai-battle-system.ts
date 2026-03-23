// AI战斗系统 - 自动躲避、智能施法

import { SKILL_CATALOG, SKILL_EFFECTS, Skill } from './battle-skill-system'

export interface AIBattleConfig {
  // 自动躲避
  autoDodge: {
    enabled: boolean
    reactionTime: number       // 反应时间 (毫秒)
    dodgeChance: number        // 基础闪避概率 0-1
    predictAttack: boolean     // 预测攻击
    minHPToDodge: number       // 最低血量百分比触发躲避
  }
  // 智能施法
  smartCasting: {
    enabled: boolean
    priorityHeal: number       // 血量低于此百分比时优先治疗
    priorityDefend: number    // 血量低于此百分比时优先防御
    offensiveBias: number      // 进攻倾向 0-1 (1=完全进攻)
    saveUltimate: boolean      // 是否保留大招
    comboSkills: string[]      // 连招技能组合
  }
  // 战斗策略
  strategy: {
    aggressiveWeight: number   // 进攻权重
    defensiveWeight: number    // 防御权重
    healThreshold: number       // 治疗阈值
    fleeThreshold: number       // 逃跑阈值
  }
}

export const DEFAULT_AI_BATTLE_CONFIG: AIBattleConfig = {
  autoDodge: {
    enabled: true,
    reactionTime: 200,
    dodgeChance: 0.3,
    predictAttack: true,
    minHPToDodge: 0.5
  },
  smartCasting: {
    enabled: true,
    priorityHeal: 0.4,
    priorityDefend: 0.3,
    offensiveBias: 0.5,
    saveUltimate: false,
    comboSkills: ['slash', 'double_strike']
  },
  strategy: {
    aggressiveWeight: 0.5,
    defensiveWeight: 0.5,
    healThreshold: 0.3,
    fleeThreshold: 0.1
  }
}

export interface BattleState {
  playerId: string
  hp: number
  maxHp: number
  mana: number
  maxMana: number
  attack: number
  defense: number
  speed: number
  position: number
  status: 'idle' | 'fighting' | 'dead'
  buffs: string[]
}

export interface EnemyAttack {
  enemyId: string
  attackTime: number
  damage: number
  type: 'physical' | 'magical'
  canDodge: boolean
}

export interface AISuggestion {
  action: 'attack' | 'defend' | 'dodge' | 'heal' | 'cast_skill' | 'wait'
  skillId?: string
  targetId?: string
  reason: string
  confidence: number  // 置信度 0-100
  priority: number    // 优先级 1-10
}

export class AIBattleSystem {
  private playerConfigs: Map<string, AIBattleConfig> = new Map()
  private battleStates: Map<string, BattleState> = new Map()
  private enemyAttackHistory: Map<string, EnemyAttack[]> = new Map()  // playerId -> attack history
  private cooldowns: Map<string, Map<string, number>> = new Map()  // playerId -> skillId -> cooldownEnd

  // 初始化玩家AI配置
  initPlayerAI(playerId: string, config?: Partial<AIBattleConfig>): AIBattleConfig {
    const defaultConfig = JSON.parse(JSON.stringify(DEFAULT_AI_BATTLE_CONFIG))
    const playerConfig = { ...defaultConfig, ...config }
    this.playerConfigs.set(playerId, playerConfig)
    return playerConfig
  }

  // 更新AI配置
  updateConfig(playerId: string, updates: Partial<AIBattleConfig>): AIBattleConfig {
    const currentConfig = this.playerConfigs.get(playerId) || JSON.parse(JSON.stringify(DEFAULT_AI_BATTLE_CONFIG))
    const newConfig = {
      ...currentConfig,
      autoDodge: { ...currentConfig.autoDodge, ...updates.autoDodge },
      smartCasting: { ...currentConfig.smartCasting, ...updates.smartCasting },
      strategy: { ...currentConfig.strategy, ...updates.strategy }
    }
    this.playerConfigs.set(playerId, newConfig)
    return newConfig
  }

  // 获取玩家配置
  getConfig(playerId: string): AIBattleConfig {
    return this.playerConfigs.get(playerId) || this.initPlayerAI(playerId)
  }

  // 开始战斗
  startBattle(playerId: string, initialState: Partial<BattleState>): void {
    const state: BattleState = {
      playerId,
      hp: initialState.hp || 1000,
      maxHp: initialState.maxHp || 1000,
      mana: initialState.mana || 100,
      maxMana: initialState.maxMana || 100,
      attack: initialState.attack || 100,
      defense: initialState.defense || 50,
      speed: initialState.speed || 10,
      position: initialState.position || 0,
      status: 'fighting',
      buffs: []
    }
    this.battleStates.set(playerId, state)
    this.enemyAttackHistory.set(playerId, [])
  }

  // 结束战斗
  endBattle(playerId: string): void {
    this.battleStates.delete(playerId)
    this.enemyAttackHistory.delete(playerId)
  }

  // 获取战斗状态
  getBattleState(playerId: string): BattleState | null {
    return this.battleStates.get(playerId) || null
  }

  // 记录敌人攻击
  recordEnemyAttack(playerId: string, attack: EnemyAttack): void {
    const history = this.enemyAttackHistory.get(playerId) || []
    history.push(attack)
    // 只保留最近10次攻击记录
    if (history.length > 10) {
      history.shift()
    }
    this.enemyAttackHistory.set(playerId, history)
  }

  // 预测下一次攻击
  predictNextAttack(playerId: string): { willAttack: boolean, estimatedDamage: number, attackType: 'physical' | 'magical' } {
    const history = this.enemyAttackHistory.get(playerId) || []
    const config = this.getConfig(playerId)

    if (history.length === 0) {
      return { willAttack: true, estimatedDamage: 100, attackType: 'physical' }
    }

    // 简单预测：基于历史平均值
    const recentAttacks = history.slice(-3)
    const avgDamage = recentAttacks.reduce((sum, a) => sum + a.damage, 0) / recentAttacks.length

    // 判断攻击类型
    const attackTypes = recentAttacks.map(a => a.type)
    const mostCommonType = attackTypes.sort((a, b) =>
      attackTypes.filter(v => v === a).length - attackTypes.filter(v => v === b).length
    ).pop() || 'physical'

    return {
      willAttack: true,
      estimatedDamage: avgDamage,
      attackType: mostCommonType as 'physical' | 'magical'
    }
  }

  // 计算闪避概率
  calculateDodgeChance(playerId: string, attackType: 'physical' | 'magical'): number {
    const state = this.battleStates.get(playerId)
    const config = this.getConfig(playerId)

    if (!state || !config.autoDodge.enabled) return 0

    // 基础闪避概率
    let dodgeChance = config.autoDodge.dodgeChance

    // 血量低于阈值时增加闪避
    const hpPercent = state.hp / state.maxHp
    if (hpPercent < config.autoDodge.minHPToDodge) {
      dodgeChance += 0.2
    }

    // 速度加成
    dodgeChance += (state.speed / 100) * 0.1

    // 预测攻击加成
    if (config.autoDodge.predictAttack) {
      const prediction = this.predictNextAttack(playerId)
      if (prediction.willAttack) {
        dodgeChance += 0.1
      }
    }

    return Math.min(0.8, dodgeChance)  // 最大80%
  }

  // 尝试闪避
  tryDodge(playerId: string, attackType: 'physical' | 'magical'): { dodged: boolean, action?: AISuggestion } {
    const state = this.battleStates.get(playerId)
    const config = this.getConfig(playerId)

    if (!state || !config.autoDodge.enabled) {
      return { dodged: false }
    }

    const dodgeChance = this.calculateDodgeChance(playerId, attackType)
    const roll = Math.random()

    if (roll < dodgeChance) {
      return {
        dodged: true,
        action: {
          action: 'dodge',
          reason: '成功闪避攻击',
          confidence: Math.floor(dodgeChance * 100),
          priority: 10
        }
      }
    }

    return { dodged: false }
  }

  // 获取可用技能
  getAvailableSkills(playerId: string): Skill[] {
    const cooldowns = this.cooldowns.get(playerId) || new Map()
    const now = Date.now()

    return SKILL_CATALOG.filter(skill => {
      const cooldownEnd = cooldowns.get(skill.skillId) || 0
      return now >= cooldownEnd
    })
  }

  // 设置技能冷却
  setSkillCooldown(playerId: string, skillId: string, cooldown: number): void {
    if (!this.cooldowns.has(playerId)) {
      this.cooldowns.set(playerId, new Map())
    }
    this.cooldowns.get(playerId)!.set(skillId, Date.now() + cooldown)
  }

  // 智能选择技能
  selectSmartSkill(playerId: string, enemies: { id: string, hp: number, maxHp: number, distance: number }[], allies: { id: string, hp: number, maxHp: number }[]): AISuggestion | null {
    const state = this.battleStates.get(playerId)
    const config = this.getConfig(playerId)

    if (!state || !config.smartCasting.enabled) return null

    const availableSkills = this.getAvailableSkills(playerId)
    if (availableSkills.length === 0) {
      return {
        action: 'wait',
        reason: '所有技能冷却中',
        confidence: 100,
        priority: 1
      }
    }

    const hpPercent = state.hp / state.maxHp
    const manaPercent = state.mana / state.maxMana
    const suggestions: AISuggestion[] = []

    // 1. 血量低于防御阈值 - 优先防御/治疗
    if (hpPercent < config.smartCasting.priorityDefend) {
      const defenseSkills = availableSkills.filter(s => s.type === 'defense' || s.effect === 'shield' || s.effect === 'invincible')
      for (const skill of defenseSkills) {
        if (skill.manaCost <= state.mana) {
          suggestions.push({
            action: 'cast_skill',
            skillId: skill.skillId,
            targetId: playerId,
            reason: `血量过低(${Math.floor(hpPercent * 100)}%), 开启防御`,
            confidence: 95,
            priority: 10
          })
        }
      }

      // 寻找治疗技能
      const healSkills = availableSkills.filter(s => s.type === 'support' && s.heal)
      for (const skill of healSkills) {
        if (skill.manaCost <= state.mana) {
          // 找到血量最低的友方
          const lowestAlly = allies.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]
          if (lowestAlly) {
            suggestions.push({
              action: 'cast_skill',
              skillId: skill.skillId,
              targetId: lowestAlly.id,
              reason: `队友血量过低, 释放治疗`,
              confidence: 90,
              priority: 9
            })
          }
        }
      }
    }

    // 2. 血量低于治疗阈值 - 寻找治疗
    if (hpPercent < config.smartCasting.priorityHeal && suggestions.length === 0) {
      const healSkills = availableSkills.filter(s => s.type === 'support' && s.heal)
      for (const skill of healSkills) {
        if (skill.manaCost <= state.mana) {
          suggestions.push({
            action: 'cast_skill',
            skillId: skill.skillId,
            targetId: playerId,
            reason: `血量不足(${Math.floor(hpPercent * 100)}%), 自我治疗`,
            confidence: 85,
            priority: 8
          })
        }
      }
    }

    // 3. 进攻策略
    if (suggestions.length === 0) {
      // 检查连招
      const comboSkills = config.smartCasting.comboSkills
      const comboAvailable = comboSkills.map(id => availableSkills.find(s => s.skillId === id)).filter(Boolean) as Skill[]

      if (comboAvailable.length >= 2 && Math.random() < config.smartCasting.offensiveBias) {
        // 执行连招
        for (const skill of comboAvailable) {
          if (skill.manaCost <= state.mana) {
            const target = enemies.find(e => e.distance <= skill.range)
            if (target) {
              suggestions.push({
                action: 'cast_skill',
                skillId: skill.skillId,
                targetId: target.id,
                reason: '执行连招',
                confidence: 80,
                priority: 7
              })
            }
          }
        }
      }

      // 普通攻击
      const attackSkills = availableSkills.filter(s => s.type === 'attack' || s.type === 'ultimate')
      for (const skill of attackSkills) {
        if (skill.manaCost <= state.mana) {
          // 找到最佳目标（血量最低或距离最近）
          const sortedEnemies = [...enemies].sort((a, b) => {
            if (a.hp / a.maxHp !== b.hp / b.maxHp) {
              return a.hp / a.maxHp - b.hp / b.maxHp
            }
            return a.distance - b.distance
          })

          const target = sortedEnemies.find(e => e.distance <= skill.range)
          if (target) {
            const isUltimate = skill.type === 'ultimate'
            const shouldSave = config.smartCasting.saveUltimate && !this.shouldUseUltimate(state, enemies)

            if (!shouldSave || !isUltimate) {
              suggestions.push({
                action: 'cast_skill',
                skillId: skill.skillId,
                targetId: target.id,
                reason: isUltimate ? '释放大招' : `攻击敌人 ${target.id}`,
                confidence: 70,
                priority: isUltimate ? 6 : 5
              })
            }
          }
        }
      }

      // 辅助技能
      const supportSkills = availableSkills.filter(s => s.type === 'support' && !s.heal)
      for (const skill of supportSkills) {
        if (skill.manaCost <= state.mana) {
          const target = allies.find(a => a.hp / a.maxHp < 0.8)
          if (target) {
            suggestions.push({
              action: 'cast_skill',
              skillId: skill.skillId,
              targetId: target.id,
              reason: '为队友施加buff',
              confidence: 65,
              priority: 4
            })
          }
        }
      }
    }

    // 选择最佳建议
    if (suggestions.length > 0) {
      suggestions.sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority
        return b.confidence - a.confidence
      })
      return suggestions[0]
    }

    return {
      action: 'wait',
      reason: '无可用行动',
      confidence: 100,
      priority: 1
    }
  }

  // 判断是否应该使用大招
  private shouldUseUltimate(state: BattleState, enemies: { id: string, hp: number, maxHp: number }[]): boolean {
    // 敌人血量都很低，不需要大招
    const totalEnemyHp = enemies.reduce((sum, e) => sum + e.hp, 0)
    const totalEnemyMaxHp = enemies.reduce((sum, e) => sum + e.maxHp, 0)

    if (totalEnemyMaxHp > 0 && totalEnemyHp / totalEnemyMaxHp < 0.3) {
      return false
    }

    // 玩家血量危险，保留
    if (state.hp / state.maxHp < 0.3) {
      return false
    }

    return true
  }

  // 获取完整战斗建议
  getBattleSuggestion(playerId: string, enemies: { id: string, hp: number, maxHp: number, distance: number, attackType: 'physical' | 'magical' }[], allies: { id: string, hp: number, maxHp: number }[]): AISuggestion {
    const state = this.battleStates.get(playerId)
    const config = this.getConfig(playerId)

    // 没有战斗状态，返回等待
    if (!state) {
      return {
        action: 'wait',
        reason: '未在战斗中',
        confidence: 100,
        priority: 1
      }
    }

    // 检查是否可以闪避
    if (config.autoDodge.enabled && enemies.length > 0) {
      const predicted = this.predictNextAttack(playerId)
      if (predicted.willAttack) {
        const dodgeResult = this.tryDodge(playerId, predicted.attackType)
        if (dodgeResult.dodged && dodgeResult.action) {
          return dodgeResult.action
        }
      }
    }

    // 智能选择技能
    const skillSuggestion = this.selectSmartSkill(playerId, enemies, allies)
    if (skillSuggestion) {
      return skillSuggestion
    }

    // 默认等待
    return {
      action: 'wait',
      reason: '等待最佳时机',
      confidence: 50,
      priority: 1
    }
  }

  // 更新战斗状态
  updateBattleState(playerId: string, updates: Partial<BattleState>): void {
    const state = this.battleStates.get(playerId)
    if (state) {
      Object.assign(state, updates)
      if (state.hp <= 0) {
        state.status = 'dead'
      }
    }
  }

  // 受伤处理
  takeDamage(playerId: string, damage: number, attackType: 'physical' | 'magical'): number {
    const state = this.battleStates.get(playerId)
    if (!state) return 0

    // 尝试闪避
    const dodgeResult = this.tryDodge(playerId, attackType)
    if (dodgeResult.dodged) {
      return 0  // 闪避成功
    }

    // 计算实际伤害
    const defenseReduction = state.defense / (state.defense + 100)
    const actualDamage = Math.floor(damage * (1 - defenseReduction))

    state.hp = Math.max(0, state.hp - actualDamage)
    if (state.hp <= 0) {
      state.status = 'dead'
    }

    return actualDamage
  }

  // 获取战斗统计
  getBattleStats(playerId: string): {
    totalBattles: number
    wins: number
    losses: number
    damageDealt: number
    damageTaken: number
    dodges: number
    skillsUsed: number
  } {
    // 简化实现，实际应持久化
    return {
      totalBattles: 0,
      wins: 0,
      losses: 0,
      damageDealt: 0,
      damageTaken: 0,
      dodges: 0,
      skillsUsed: 0
    }
  }
}

export const aiBattleSystem = new AIBattleSystem()
