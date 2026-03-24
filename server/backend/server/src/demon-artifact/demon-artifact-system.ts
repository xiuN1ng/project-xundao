// 魔器装备系统 v1.0
// 魔器属性、特效、魔器商店
// 魔器是独立于神器的装备体系，蕴含魔界力量

// ============== 魔器基础类型 ==============

export type DemonArtifactType =
  | 'demon_weapon' | 'demon_armor' | 'demon_helmet'
  | 'demon_boots' | 'demon_accessory'

export type DemonArtifactQuality =
  | 'green' | 'blue' | 'purple' | 'orange' | 'red' | 'black'

export type DemonArtifactPosition =
  | 'demon_weapon' | 'demon_armor' | 'demon_helmet'
  | 'demon_boots' | 'demon_accessory1' | 'demon_accessory2'

export type DemonEffectTrigger =
  | 'on_attack' | 'on_hit' | 'on_crit' | 'on_kill'
  | 'on_hp_below_30' | 'on_hp_full'
  | 'on_round_start' | 'on_round_end'
  | 'on_damage_received' | 'passive'

export type DemonEffectType =
  | 'damage' | 'heal' | 'buff' | 'debuff' | 'shield'
  | 'reflect' | 'drain' | 'instant_kill' | 'revive'
  | 'attribute_boost' | 'cc'

// ============== 魔器属性 ==============

export interface DemonAttributes {
  attack: number; defense: number; hp: number
  crit: number; critDamage: number; dodge: number
  speed: number; lifesteal: number; damageReduction: number
  trueDamage: number; attackSpeed: number
}

// ============== 魔器特效定义 ==============

export interface DemonEffect {
  effectId: string; name: string; nameCN: string; description: string
  trigger: DemonEffectTrigger; triggerRate: number
  effectType: DemonEffectType; potency: number
  duration?: number; stackable: boolean; maxStacks?: number; buffId?: string
}

export const DEMON_EFFECTS: DemonEffect[] = [
  { effectId: 'demon_effect_001', name: 'Soul Drain', nameCN: '噬魂', description: '攻击时，10%概率吸取目标10%当前生命', trigger: 'on_attack', triggerRate: 0.10, effectType: 'drain', potency: 10, stackable: false },
  { effectId: 'demon_effect_002', name: 'Shadow Shield', nameCN: '暗影护盾', description: '受到攻击时，15%概率生成抵挡50点伤害的护盾', trigger: 'on_damage_received', triggerRate: 0.15, effectType: 'shield', potency: 50, stackable: true, maxStacks: 3 },
  { effectId: 'demon_effect_003', name: 'Cursed Strike', nameCN: '诅咒打击', description: '攻击时，15%概率造成额外30%伤害', trigger: 'on_attack', triggerRate: 0.15, effectType: 'damage', potency: 30, stackable: false },
  { effectId: 'demon_effect_004', name: 'Blood Fury', nameCN: '血之狂暴', description: '生命低于30%时，暴击率提升15%', trigger: 'on_hp_below_30', triggerRate: 1.0, effectType: 'attribute_boost', potency: 15, duration: 3, stackable: false, buffId: 'demon_buff_004' },
  { effectId: 'demon_effect_005', name: 'Soul Harvest', nameCN: '灵魂收割', description: '击杀目标时，恢复15%最大生命值', trigger: 'on_kill', triggerRate: 1.0, effectType: 'heal', potency: 15, stackable: false },
  { effectId: 'demon_effect_006', name: 'Void Curse', nameCN: '虚空诅咒', description: '攻击时，20%概率降低目标20%防御，持续2回合', trigger: 'on_attack', triggerRate: 0.20, effectType: 'debuff', potency: 20, duration: 2, stackable: false, buffId: 'demon_debuff_006' },
  { effectId: 'demon_effect_007', name: 'Demon Lord Rage', nameCN: '魔主之怒', description: '生命低于30%时，攻击提升25%，持续3回合', trigger: 'on_hp_below_30', triggerRate: 1.0, effectType: 'attribute_boost', potency: 25, duration: 3, stackable: false, buffId: 'demon_buff_007' },
  { effectId: 'demon_effect_008', name: 'Shadow Step', nameCN: '暗影步', description: '闪避率提升10%', trigger: 'passive', triggerRate: 1.0, effectType: 'attribute_boost', potency: 10, stackable: false, buffId: 'demon_buff_008' },
  { effectId: 'demon_effect_009', name: 'Life Drain Aura', nameCN: '生命汲取光环', description: '每回合结束，吸取场上生命最低敌人5%最大生命', trigger: 'on_round_end', triggerRate: 1.0, effectType: 'drain', potency: 5, stackable: false },
  { effectId: 'demon_effect_010', name: 'Abyss Devour', nameCN: '深渊吞噬', description: '攻击时，25%概率造成150%伤害', trigger: 'on_attack', triggerRate: 0.25, effectType: 'damage', potency: 150, stackable: false },
  { effectId: 'demon_effect_011', name: 'Demon Rebirth', nameCN: '魔主重生', description: '死亡时，30%概率复活并恢复30%最大生命（每场战斗限1次）', trigger: 'on_damage_received', triggerRate: 0.30, effectType: 'revive', potency: 30, stackable: false },
  { effectId: 'demon_effect_012', name: 'Chaos Field', nameCN: '混沌领域', description: '战斗开始时，提升全体队友10%攻击和10%防御', trigger: 'on_round_start', triggerRate: 1.0, effectType: 'buff', potency: 10, duration: -1, stackable: false, buffId: 'demon_buff_012' },
  { effectId: 'demon_effect_013', name: 'Blood Pact', nameCN: '血之契约', description: '生命吸取提升15%，造成伤害的5%转化为护盾', trigger: 'passive', triggerRate: 1.0, effectType: 'attribute_boost', potency: 15, stackable: false },
  { effectId: 'demon_effect_014', name: 'Doom Execution', nameCN: '末日处决', description: '攻击生命低于20%的目标时，30%概率直接击杀', trigger: 'on_attack', triggerRate: 0.30, effectType: 'instant_kill', potency: 20, stackable: false },
  { effectId: 'demon_effect_015', name: 'Demon King Throne', nameCN: '魔王朝圣', description: '敌方每次死亡，永久提升3%攻击，最高叠加10次', trigger: 'on_kill', triggerRate: 1.0, effectType: 'attribute_boost', potency: 3, duration: -1, stackable: true, maxStacks: 10, buffId: 'demon_buff_015' },
  { effectId: 'demon_effect_016', name: 'Hell Gate', nameCN: '地狱之门', description: '受到致命伤害时，免疫本次伤害并进入地狱之门状态3回合（每场战斗限1次）', trigger: 'on_damage_received', triggerRate: 1.0, effectType: 'revive', potency: 100, duration: 3, stackable: false },
  { effectId: 'demon_effect_017', name: 'Original Sin', nameCN: '原罪', description: '战斗开始时，对所有敌人施加每回合50点真实伤害', trigger: 'on_round_start', triggerRate: 1.0, effectType: 'damage', potency: 50, duration: -1, stackable: false, buffId: 'demon_debuff_017' },
  { effectId: 'demon_effect_018', name: 'Demon Supremacy', nameCN: '魔威', description: '攻击时，35%概率造成200%伤害，击杀后刷新冷却', trigger: 'on_attack', triggerRate: 0.35, effectType: 'damage', potency: 200, stackable: false },
  { effectId: 'demon_effect_019', name: 'Soul Eater', nameCN: '噬魂者', description: '每次攻击吸血效果额外提升10%，可叠加5次', trigger: 'on_attack', triggerRate: 1.0, effectType: 'attribute_boost', potency: 10, duration: 3, stackable: true, maxStacks: 5, buffId: 'demon_buff_019' },
  { effectId: 'demon_effect_020', name: 'Undying Darkness', nameCN: '不死暗影', description: '死亡时必定复活，属性降低50%，持续3回合后恢复（每场战斗限1次）', trigger: 'on_damage_received', triggerRate: 1.0, effectType: 'revive', potency: 50, duration: 3, stackable: false },
]

// ============== 魔器套装 ==============

export interface DemonArtifactSet {
  setId: string; name: string; nameCN: string
  pieces: DemonArtifactPosition[]; setBonus: DemonSetBonus[]
}

export interface DemonSetBonus {
  requiredPieces: number; name: string; nameCN: string; description: string
  attributes: Partial<DemonAttributes>; specialEffect?: string
}

export const DEMON_ARTIFACT_SETS: DemonArtifactSet[] = [
  {
    setId: 'demon_set_2pc', name: 'Shadow Walker', nameCN: '暗影行者',
    pieces: ['demon_weapon', 'demon_armor'],
    setBonus: [
      { requiredPieces: 2, name: 'Shadow Essence', nameCN: '暗影精华', description: '攻击时，5%概率进入暗影状态，下回合攻击必定暴击', attributes: { attack: 20 } }
    ]
  },
  {
    setId: 'demon_set_4pc', name: 'Demon Lord', nameCN: '魔主',
    pieces: ['demon_weapon', 'demon_armor', 'demon_helmet', 'demon_boots'],
    setBonus: [
      { requiredPieces: 2, name: 'Demon Ambition', nameCN: '魔意', description: '生命值提升10%', attributes: { hp: 500 } },
      { requiredPieces: 4, name: 'Demon Lord Wrath', nameCN: '魔主之怒', description: '生命低于50%时，所有属性提升15%', attributes: { attack: 100, defense: 80 } }
    ]
  },
  {
    setId: 'demon_set_6pc', name: 'Origin Sin', nameCN: '原罪全套',
    pieces: ['demon_weapon', 'demon_armor', 'demon_helmet', 'demon_boots', 'demon_accessory1', 'demon_accessory2'],
    setBonus: [
      { requiredPieces: 2, name: 'Sin Corruption', nameCN: '原罪侵蚀', description: '攻击附带5%真实伤害', attributes: { trueDamage: 50 } },
      { requiredPieces: 4, name: 'Seven Sins', nameCN: '七宗罪', description: '所有属性提升20%', attributes: { attack: 200, defense: 150, hp: 2000 } },
      { requiredPieces: 6, name: 'Original Demon', nameCN: '原初之魔', description: '死亡时必定复活，属性降低30%持续3回合后恢复（每场战斗1次）', attributes: { attack: 500, defense: 400, hp: 5000 } }
    ]
  }
]

// ============== 魔器模板 ==============

export interface DemonArtifactTemplate {
  templateId: string; name: string; nameCN: string; description: string
  type: DemonArtifactType; quality: DemonArtifactQuality; level: number
  position: DemonArtifactPosition
  baseAttributes: DemonAttributes
  effects: string[]
  upgradeCost: { gold: number; demonSoul: number; materials: { itemId: string; count: number }[] }
  advanceCost: { gold: number; materials: { itemId: string; count: number }[]; requiredQuality: DemonArtifactQuality }
  dropSources: string[]
}

// 品质顺序
export const QUALITY_ORDER: DemonArtifactQuality[] = ['green', 'blue', 'purple', 'orange', 'red', 'black']

// 辅助函数：创建某个品质的全部类型魔器
function makeTemplates(quality: DemonArtifactQuality, level: number, qualityIdx: number): DemonArtifactTemplate[] {
  const q = quality
  const idx = qualityIdx
  const gold = Math.floor(1000 * Math.pow(3, idx))
  const soul = Math.floor(10 * Math.pow(3, idx))
  const frag = `demon_frag_${idx + 1}`
  const nextFrag = `demon_frag_${idx + 2}`
  const nextQual = QUALITY_ORDER[idx + 1] || 'black'
  const isMax = idx === 5

  const types: Array<{ type: DemonArtifactType, position: DemonArtifactPosition, atk: number, def: number, hp: number, crit: number, critD: number, dod: number, spd: number, ls: number, dr: number, td: number, aspd: number, effs: string[] }> = [
    { type: 'demon_weapon', position: 'demon_weapon', atk: 50 + idx * 80, def: idx * 10, hp: idx * 50, crit: 1 + idx, critD: 5 + idx * 10, dod: 0, spd: idx * 3, ls: 2 + idx, dr: 0, td: idx * 10, aspd: idx * 2, effs: idx < 2 ? ['demon_effect_001'] : idx < 4 ? ['demon_effect_003', 'demon_effect_005'] : ['demon_effect_010', 'demon_effect_013'] },
    { type: 'demon_armor', position: 'demon_armor', atk: 0, def: 40 + idx * 60, hp: 200 + idx * 400, crit: 0, critD: 0, dod: 1 + idx, spd: 0, ls: idx, dr: 3 + idx * 3, td: 0, aspd: 0, effs: idx < 2 ? ['demon_effect_002'] : idx < 4 ? ['demon_effect_004', 'demon_effect_002'] : ['demon_effect_011', 'demon_effect_012'] },
    { type: 'demon_helmet', position: 'demon_helmet', atk: 20 + idx * 30, def: 20 + idx * 30, hp: 100 + idx * 200, crit: 1 + idx, critD: 5 + idx * 10, dod: 0, spd: idx * 2, ls: 0, dr: 1 + idx, td: idx * 10, aspd: 0, effs: idx < 2 ? ['demon_effect_001'] : idx < 4 ? ['demon_effect_006', 'demon_effect_010'] : ['demon_effect_014', 'demon_effect_018'] },
    { type: 'demon_boots', position: 'demon_boots', atk: 0, def: 10 + idx * 20, hp: 30 + idx * 100, crit: 0, critD: 3 + idx * 5, dod: 3 + idx * 2, spd: 8 + idx * 5, ls: 0, dr: 0, td: 0, aspd: idx * 2, effs: idx < 2 ? ['demon_effect_002'] : idx < 4 ? ['demon_effect_008'] : ['demon_effect_015'] },
  ]

  const names: Record<DemonArtifactType, { base: string; baseCN: string }> = {
    demon_weapon: { base: 'Demon Blade', baseCN: '魔刃' },
    demon_armor: { base: 'Demon Armor', baseCN: '魔甲' },
    demon_helmet: { base: 'Demon Helm', baseCN: '魔盔' },
    demon_boots: { base: 'Demon Boots', baseCN: '魔靴' },
    demon_accessory: { base: 'Demon Accessory', baseCN: '魔饰' },
  }

  return types.map(t => ({
    templateId: `${t.type}_${q}_1`,
    name: `${names[t.type].base} +${qualityIdx}`,
    nameCN: `${names[t.type].baseCN}+${qualityIdx}`,
    description: `第${qualityIdx + 1}阶${q}品质${names[t.type].baseCN}`,
    type: t.type,
    quality: q,
    level,
    position: t.position,
    baseAttributes: {
      attack: t.atk, defense: t.def, hp: t.hp, crit: t.crit, critDamage: t.critD,
      dodge: t.dod, speed: t.spd, lifesteal: t.ls, damageReduction: t.dr,
      trueDamage: t.td, attackSpeed: t.aspd
    },
    effects: t.effs,
    upgradeCost: { gold, demonSoul: soul, materials: [{ itemId: frag, count: 5 + idx * 5 }] },
    advanceCost: isMax
      ? { gold: 0, materials: [], requiredQuality: q }
      : { gold: gold * 5, materials: [{ itemId: nextFrag, count: 10 + idx * 10 }], requiredQuality: nextQual },
    dropSources: [`demon_dungeon_${qualityIdx + 1}`, 'demon_world_boss']
  }))
}

// 生成所有品质模板
export const DEMON_ARTIFACT_TEMPLATES: DemonArtifactTemplate[] = [
  ...makeTemplates('green', 30, 0),
  ...makeTemplates('blue', 50, 1),
  ...makeTemplates('purple', 70, 2),
  ...makeTemplates('orange', 85, 3),
  ...makeTemplates('red', 100, 4),
  ...makeTemplates('black', 120, 5),
]

// 魔器实例
export interface DemonArtifact {
  artifactId: string; playerId: string; templateId: string
  name: string; nameCN: string; type: DemonArtifactType
  quality: DemonArtifactQuality; level: number
  tier: number; position: DemonArtifactPosition; isEquipped: boolean
  baseAttributes: DemonAttributes; upgradeAttributes: DemonAttributes
  advanceAttributes: DemonAttributes; totalAttributes: DemonAttributes
  effects: DemonArtifactEffectInstance[]
  corruptionLevel: number; corruptionAttributes: DemonAttributes
  forgingLevel: number; resonanceLevel: number
  obtainedAt: number; updatedAt: number
}

export interface DemonArtifactEffectInstance {
  effectId: string; nameCN: string; trigger: DemonEffectTrigger
  triggerRate: number; effectType: DemonEffectType; potency: number
  duration?: number; currentStacks: number; maxStacks: number; isActive: boolean
}

// ============== 魔器系统类 ==============

export class DemonArtifactSystem {
  private artifacts: Map<string, DemonArtifact[]> = new Map()
  private playerResources: Map<string, { gold: number; demonSoul: number; fragments: Map<string, number> }> = new Map()

  // 获取玩家魔器列表
  getPlayerArtifacts(playerId: string): DemonArtifact[] {
    return this.artifacts.get(playerId) || []
  }

  // 获取玩家装备的魔器
  getEquippedArtifacts(playerId: string): DemonArtifact[] {
    return this.getPlayerArtifacts(playerId).filter(a => a.isEquipped)
  }

  // 获取玩家资源
  getPlayerResources(playerId: string) {
    if (!this.playerResources.has(playerId)) {
      this.playerResources.set(playerId, {
        gold: 1000000,
        demonSoul: 500,
        fragments: new Map([
          ['demon_frag_1', 100], ['demon_frag_2', 50],
          ['demon_frag_3', 20], ['demon_frag_4', 10],
          ['demon_frag_5', 5], ['demon_frag_6', 1],
        ])
      })
    }
    return this.playerResources.get(playerId)!
  }

  // 初始化玩家资源
  initPlayerResources(playerId: string, gold: number, demonSoul: number, fragments: Map<string, number>) {
    this.playerResources.set(playerId, { gold, demonSoul, fragments })
  }

  // 生成魔器实例（从模板）
  createArtifact(playerId: string, templateId: string): DemonArtifact | null {
    const template = DEMON_ARTIFACT_TEMPLATES.find(t => t.templateId === templateId)
    if (!template) return null

    const effects: DemonArtifactEffectInstance[] = template.effects.map(eid => {
      const def = DEMON_EFFECTS.find(e => e.effectId === eid)
      if (!def) return null as any
      return {
        effectId: eid, nameCN: def.nameCN, trigger: def.trigger,
        triggerRate: def.triggerRate, effectType: def.effectType, potency: def.potency,
        duration: def.duration, currentStacks: 0, maxStacks: def.maxStacks || 1, isActive: false
      }
    }).filter(Boolean)

    const artifact: DemonArtifact = {
      artifactId: `da_${playerId}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      playerId, templateId,
      name: template.name, nameCN: template.nameCN, type: template.type,
      quality: template.quality, level: template.level,
      tier: 1, position: template.position, isEquipped: false,
      baseAttributes: { ...template.baseAttributes },
      upgradeAttributes: { attack: 0, defense: 0, hp: 0, crit: 0, critDamage: 0, dodge: 0, speed: 0, lifesteal: 0, damageReduction: 0, trueDamage: 0, attackSpeed: 0 },
      advanceAttributes: { attack: 0, defense: 0, hp: 0, crit: 0, critDamage: 0, dodge: 0, speed: 0, lifesteal: 0, damageReduction: 0, trueDamage: 0, attackSpeed: 0 },
      totalAttributes: { ...template.baseAttributes },
      effects,
      corruptionLevel: 0,
      corruptionAttributes: { attack: 0, defense: 0, hp: 0, crit: 0, critDamage: 0, dodge: 0, speed: 0, lifesteal: 0, damageReduction: 0, trueDamage: 0, attackSpeed: 0 },
      forgingLevel: 0, resonanceLevel: 0,
      obtainedAt: Date.now(), updatedAt: Date.now()
    }

    const list = this.artifacts.get(playerId) || []
    list.push(artifact)
    this.artifacts.set(playerId, list)
    return artifact
  }

  // 装备魔器
  equipArtifact(playerId: string, artifactId: string): { success: boolean; message: string } {
    const list = this.artifacts.get(playerId)
    if (!list) return { success: false, message: '玩家不存在' }
    const artifact = list.find(a => a.artifactId === artifactId)
    if (!artifact) return { success: false, message: '魔器不存在' }

    // 卸下同位置的装备
    const existing = list.find(a => a.isEquipped && a.position === artifact.position && a.artifactId !== artifactId)
    if (existing) existing.isEquipped = false

    artifact.isEquipped = true
    return { success: true, message: `已装备${artifact.nameCN}` }
  }

  // 卸下魔器
  unequipArtifact(playerId: string, artifactId: string): { success: boolean; message: string } {
    const list = this.artifacts.get(playerId)
    if (!list) return { success: false, message: '玩家不存在' }
    const artifact = list.find(a => a.artifactId === artifactId)
    if (!artifact) return { success: false, message: '魔器不存在' }
    artifact.isEquipped = false
    return { success: true, message: `已卸下${artifact.nameCN}` }
  }

  // 升级魔器（强化）
  upgradeArtifact(playerId: string, artifactId: string): { success: boolean; message: string; newLevel?: number; cost?: { gold: number; demonSoul: number } } {
    const list = this.artifacts.get(playerId)
    if (!list) return { success: false, message: '玩家不存在' }
    const artifact = list.find(a => a.artifactId === artifactId)
    if (!artifact) return { success: false, message: '魔器不存在' }

    const template = DEMON_ARTIFACT_TEMPLATES.find(t => t.templateId === artifact.templateId)
    if (!template) return { success: false, message: '模板不存在' }

    const cost = template.upgradeCost
    const res = this.getPlayerResources(playerId)
    if (res.gold < cost.gold) return { success: false, message: '金币不足' }
    if (res.demonSoul < cost.demonSoul) return { success: false, message: '魔魂不足' }
    for (const mat of cost.materials) {
      if ((res.fragments.get(mat.itemId) || 0) < mat.count) {
        return { success: false, message: `材料${mat.itemId}不足` }
      }
    }

    // 消耗
    res.gold -= cost.gold
    res.demonSoul -= cost.demonSoul
    for (const mat of cost.materials) {
      res.fragments.set(mat.itemId, (res.fragments.get(mat.itemId) || 0) - mat.count)
    }

    // 升级：提升upgradeAttributes，每级+2%基础属性
    const newLevel = artifact.tier + 1
    artifact.tier = newLevel
    const bonus = 0.02 * newLevel
    const addAttr = (base: number) => Math.floor(base * bonus)
    artifact.upgradeAttributes = {
      attack: addAttr(artifact.baseAttributes.attack),
      defense: addAttr(artifact.baseAttributes.defense),
      hp: addAttr(artifact.baseAttributes.hp),
      crit: addAttr(artifact.baseAttributes.crit),
      critDamage: addAttr(artifact.baseAttributes.critDamage),
      dodge: addAttr(artifact.baseAttributes.dodge),
      speed: addAttr(artifact.baseAttributes.speed),
      lifesteal: addAttr(artifact.baseAttributes.lifesteal),
      damageReduction: addAttr(artifact.baseAttributes.damageReduction),
      trueDamage: addAttr(artifact.baseAttributes.trueDamage),
      attackSpeed: addAttr(artifact.baseAttributes.attackSpeed),
    }
    this.recalculateTotalAttributes(artifact)
    artifact.updatedAt = Date.now()
    return { success: true, message: `强化成功！魔器等阶提升至${newLevel}阶`, newLevel, cost: { gold: cost.gold, demonSoul: cost.demonSoul } }
  }

  // 进阶魔器（品质提升）
  advanceArtifact(playerId: string, artifactId: string): { success: boolean; message: string; newQuality?: DemonArtifactQuality; newArtifact?: DemonArtifact } {
    const list = this.artifacts.get(playerId)
    if (!list) return { success: false, message: '玩家不存在' }
    const artifact = list.find(a => a.artifactId === artifactId)
    if (!artifact) return { success: false, message: '魔器不存在' }

    const template = DEMON_ARTIFACT_TEMPLATES.find(t => t.templateId === artifact.templateId)
    if (!template) return { success: false, message: '模板不存在' }

    const cost = template.advanceCost
    if (cost.gold === 0 && cost.materials.length === 0) {
      return { success: false, message: '已达最高品质' }
    }

    const res = this.getPlayerResources(playerId)
    if (res.gold < cost.gold) return { success: false, message: '金币不足' }
    for (const mat of cost.materials) {
      if ((res.fragments.get(mat.itemId) || 0) < mat.count) {
        return { success: false, message: `材料${mat.itemId}不足` }
      }
    }

    res.gold -= cost.gold
    for (const mat of cost.materials) {
      res.fragments.set(mat.itemId, (res.fragments.get(mat.itemId) || 0) - mat.count)
    }

    // 找到下一品质模板
    const nextIdx = QUALITY_ORDER.indexOf(artifact.quality) + 1
    const nextQual = QUALITY_ORDER[nextIdx]
    const nextTemplateId = `${artifact.type}_${nextQual}_1`
    const nextTemplate = DEMON_ARTIFACT_TEMPLATES.find(t => t.templateId === nextTemplateId)
    if (!nextTemplate) return { success: false, message: '进阶失败，无更高品质' }

    // 移除当前魔器，生成新魔器
    const idx = list.indexOf(artifact)
    list.splice(idx, 1)

    const newArtifact = this.createArtifact(playerId, nextTemplateId)
    if (!newArtifact) return { success: false, message: '进阶失败' }

    // 保留强化等级和铸造等级
    newArtifact.tier = artifact.tier
    newArtifact.forgingLevel = artifact.forgingLevel
    newArtifact.upgradeAttributes = { ...artifact.upgradeAttributes }
    this.recalculateTotalAttributes(newArtifact)

    return { success: true, message: `进阶成功！品质提升为${nextQual}！`, newQuality: nextQual, newArtifact }
  }

  // 铸造魔器
  forgeArtifact(playerId: string, artifactId: string): { success: boolean; message: string; newForgingLevel?: number } {
    const list = this.artifacts.get(playerId)
    if (!list) return { success: false, message: '玩家不存在' }
    const artifact = list.find(a => a.artifactId === artifactId)
    if (!artifact) return { success: false, message: '魔器不存在' }
    if (artifact.forgingLevel >= 15) return { success: false, message: '铸造等级已达上限' }

    const goldCost = 2000 * (artifact.forgingLevel + 1)
    const fragCost = Math.floor(10 * (artifact.forgingLevel + 1))
    const fragId = `demon_frag_${Math.min(6, Math.floor(artifact.forgingLevel / 3) + 1)}`
    const res = this.getPlayerResources(playerId)
    if (res.gold < goldCost) return { success: false, message: '金币不足' }
    if ((res.fragments.get(fragId) || 0) < fragCost) return { success: false, message: `材料${fragId}不足` }

    res.gold -= goldCost
    res.fragments.set(fragId, (res.fragments.get(fragId) || 0) - fragCost)

    artifact.forgingLevel++
    // 铸造每级+1%全属性
    const forgeBonus = artifact.forgingLevel * 0.01
    for (const key of Object.keys(artifact.totalAttributes) as (keyof DemonAttributes)[]) {
      const baseVal = artifact.baseAttributes[key] + artifact.upgradeAttributes[key] + artifact.advanceAttributes[key]
      const bonus = Math.floor(baseVal * forgeBonus)
      artifact.totalAttributes[key] = baseVal + artifact.corruptionAttributes[key] + bonus
    }
    artifact.updatedAt = Date.now()
    return { success: true, message: `铸造成功！铸造等级提升至${artifact.forgingLevel}`, newForgingLevel: artifact.forgingLevel }
  }

  // 魔化（特殊养成）
  applyCorruption(playerId: string, artifactId: string, amount: number = 10): { success: boolean; message: string; newCorruptionLevel?: number } {
    const list = this.artifacts.get(playerId)
    if (!list) return { success: false, message: '玩家不存在' }
    const artifact = list.find(a => a.artifactId === artifactId)
    if (!artifact) return { success: false, message: '魔器不存在' }
    if (artifact.corruptionLevel >= 100) return { success: false, message: '魔化已达上限' }

    const soulCost = amount * 5
    const res = this.getPlayerResources(playerId)
    if (res.demonSoul < soulCost) return { success: false, message: '魔魂不足' }

    res.demonSoul -= soulCost
    artifact.corruptionLevel = Math.min(100, artifact.corruptionLevel + amount)

    // 魔化每点+0.5%攻击和防御
    const bonus = artifact.corruptionLevel * 0.005
    artifact.corruptionAttributes = {
      attack: Math.floor(artifact.baseAttributes.attack * bonus),
      defense: Math.floor(artifact.baseAttributes.defense * bonus),
      hp: Math.floor(artifact.baseAttributes.hp * bonus),
      crit: Math.floor(artifact.baseAttributes.crit * bonus),
      critDamage: Math.floor(artifact.baseAttributes.critDamage * bonus),
      dodge: Math.floor(artifact.baseAttributes.dodge * bonus),
      speed: Math.floor(artifact.baseAttributes.speed * bonus),
      lifesteal: Math.floor(artifact.baseAttributes.lifesteal * bonus),
      damageReduction: Math.floor(artifact.baseAttributes.damageReduction * bonus),
      trueDamage: Math.floor(artifact.baseAttributes.trueDamage * bonus),
      attackSpeed: Math.floor(artifact.baseAttributes.attackSpeed * bonus),
    }
    this.recalculateTotalAttributes(artifact)
    artifact.updatedAt = Date.now()
    return { success: true, message: `魔化成功！魔化等级${artifact.corruptionLevel}`, newCorruptionLevel: artifact.corruptionLevel }
  }

  // 计算总属性
  private recalculateTotalAttributes(artifact: DemonArtifact) {
    for (const key of Object.keys(artifact.totalAttributes) as (keyof DemonAttributes)[]) {
      artifact.totalAttributes[key] =
        artifact.baseAttributes[key] +
        artifact.upgradeAttributes[key] +
        artifact.advanceAttributes[key] +
        artifact.corruptionAttributes[key]
    }
  }

  // 获取玩家总魔器属性（所有已装备的）
  getTotalDemonAttributes(playerId: string): DemonAttributes {
    const zero: DemonAttributes = { attack: 0, defense: 0, hp: 0, crit: 0, critDamage: 0, dodge: 0, speed: 0, lifesteal: 0, damageReduction: 0, trueDamage: 0, attackSpeed: 0 }
    const result = { ...zero }

    for (const artifact of this.getEquippedArtifacts(playerId)) {
      for (const key of Object.keys(result) as (keyof DemonAttributes)[]) {
        result[key] += artifact.totalAttributes[key]
      }
    }

    // 套装加成
    const setBonus = this.getActiveSetBonus(playerId)
    for (const key of Object.keys(result) as (keyofDemonAttributes)[]) {
      result[key] += setBonus[key] || 0
    }
    return result
  }

  // 获取激活的套装加成
  getActiveSetBonus(playerId: string): Partial<DemonAttributes> {
    const equipped = this.getEquippedArtifacts(playerId)
    const positionCounts: Partial<Record<DemonArtifactPosition, number>> = {}
    for (const a of equipped) {
      positionCounts[a.position] = (positionCounts[a.position] || 0) + 1
    }

    let totalBonus: Partial<DemonAttributes> = {}
    for (const set of DEMON_ARTIFACT_SETS) {
      const equippedCount = set.pieces.filter(p => (positionCounts[p] || 0) > 0).length
      if (equippedCount === 0) continue

      for (const bonus of set.setBonus) {
        if (equippedCount >= bonus.requiredPieces) {
          for (const [key, val] of Object.entries(bonus.attributes)) {
            totalBonus[key as keyof DemonAttributes] = (totalBonus[key as keyof DemonAttributes] || 0) + (val || 0)
          }
        }
      }
    }
    return totalBonus
  }

  // 计算战斗力
  getCombatPower(playerId: string): number {
    const attrs = this.getTotalDemonAttributes(playerId)
    return Math.floor(
      attrs.attack * 2 +
      attrs.defense * 1.5 +
      attrs.hp * 0.1 +
      attrs.crit * 8 +
      attrs.critDamage * 5 +
      attrs.dodge * 10 +
      attrs.speed * 3 +
      attrs.lifesteal * 5 +
      attrs.damageReduction * 5 +
      attrs.trueDamage * 3 +
      attrs.attackSpeed * 3
    )
  }

  // 分解魔器
  decomposeArtifact(playerId: string, artifactId: string): { success: boolean; message: string; rewards?: { demonSoul: number; fragments: Map<string, number> } } {
    const list = this.artifacts.get(playerId)
    if (!list) return { success: false, message: '玩家不存在' }
    const artifact = list.find(a => a.artifactId === artifactId)
    if (!artifact) return { success: false, message: '魔器不存在' }
    if (artifact.isEquipped) return { success: false, message: '请先卸下装备' }

    const qualityIdx = QUALITY_ORDER.indexOf(artifact.quality)
    const soulReward = Math.floor(10 * Math.pow(3, qualityIdx) * (1 + artifact.tier * 0.1))
    const fragId = `demon_frag_${qualityIdx + 1}`
    const fragReward = Math.floor(3 * (qualityIdx + 1) * (1 + artifact.forgingLevel * 0.2))

    const rewards = { demonSoul: soulReward, fragments: new Map([[fragId, fragReward]]) }
    const idx = list.indexOf(artifact)
    list.splice(idx, 1)

    const res = this.getPlayerResources(playerId)
    res.demonSoul += soulReward
    res.fragments.set(fragId, (res.fragments.get(fragId) || 0) + fragReward)

    return { success: true, message: `分解成功，获得${soulReward}魔魂和${fragReward}个${fragId}`, rewards }
  }
}

export const demonArtifactSystem = new DemonArtifactSystem()
export default DemonArtifactSystem
