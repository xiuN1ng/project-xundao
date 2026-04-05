// 装备套装系统 - 套装效果触发逻辑
// v25 版本：套装收集、2件套/3件套/4件套效果

export interface SuitBonus {
  name: string           // 效果名称
  description: string    // 效果描述
  stats: Record<string, number>  // 效果属性 { attr: percent }
}

export interface EquipmentSuit {
  suitId: string
  name: string
  nameCN: string
  icon: string           // emoji图标
  rarity: number          // 稀有度 1-5 对应 白/绿/蓝/紫/橙
  description: string     // 套装描述
  
  // 套装部件 { position: templateId }
  pieces: Record<string, string>
  
  // 套装效果
  bonuses: {
    2?: SuitBonus   // 2件套效果
    3?: SuitBonus   // 3件套效果
    4?: SuitBonus   // 4件套效果
  }
}

// 套装配置
// 套装效果：2件套(+10%防御)、3件套(+20%生命)、4件套(+30%攻击)
export const EQUIPMENT_SUIT_CONFIGS: Record<string, EquipmentSuit> = {
  flame_set: {
    suitId: 'flame_set',
    name: 'Flame Set',
    nameCN: '烈焰套装',
    icon: '🔥',
    rarity: 4,
    description: '传说中驾驭烈焰的勇者所穿戴的套装，激活后可召唤火焰之力。',
    pieces: {
      weapon: 'flame_sword',
      armor: 'flame_armor',
      helmet: 'flame_helm',
      accessory: 'flame_ring',
    },
    bonuses: {
      2: {
        name: '烈焰之心',
        description: '攻击时附加15%火焰伤害',
        stats: { fire_dmg: 15 },
      },
      4: {
        name: '焚天灭世',
        description: '火焰伤害提升50%，暴击伤害+25%',
        stats: { fire_dmg: 50, crit_dmg: 25 },
      },
    },
  },
  thunder_set: {
    suitId: 'thunder_set',
    name: 'Thunder Set',
    nameCN: '雷霆套装',
    icon: '⚡',
    rarity: 5,
    description: '汇聚九天雷霆之威，佩戴者可引雷入体，威力无边。',
    pieces: {
      weapon: 'thunder_blade',
      armor: 'thunder_armor',
      helmet: 'thunder_crown',
      accessory: 'thunder_brace',
    },
    bonuses: {
      2: {
        name: '雷鸣之力',
        description: '攻击速度+20%，闪避率+10%',
        stats: { speed: 20, dodge: 10 },
      },
      4: {
        name: '天罚降临',
        description: '暴击率+30%，暴击伤害+50%',
        stats: { crit_rate: 30, crit_dmg: 50 },
      },
    },
  },
  ice_set: {
    suitId: 'ice_set',
    name: 'Ice Set',
    nameCN: '寒冰套装',
    icon: '❄️',
    rarity: 3,
    description: '取自万年寒冰精炼而成，佩戴者身法如风寒冰彻骨。',
    pieces: {
      weapon: 'ice_sword',
      armor: 'ice_armor',
      helmet: 'ice_helm',
      accessory: 'ice_amulet',
    },
    bonuses: {
      2: {
        name: '冰封护体',
        description: '受到伤害-10%，生命回复+5%/秒',
        stats: { damage_reduction: 10, hp_regen: 5 },
      },
      4: {
        name: '绝对零度',
        description: '冰冻几率+15%，防御+30%',
        stats: { frost_dmg: 15, def: 30 },
      },
    },
  },
  dragon_set: {
    suitId: 'dragon_set',
    name: 'Dragon Set',
    nameCN: '龙鳞套装',
    icon: '🐉',
    rarity: 5,
    description: '以真龙鳞片铸就，传说穿戴者可获龙之守护。',
    pieces: {
      weapon: 'dragon_blade',
      armor: 'dragon_armor',
      helmet: 'dragon_helm',
      accessory: 'dragon_pendant',
    },
    bonuses: {
      2: {
        name: '龙之守护',
        description: '生命上限+30%，伤害减免+15%',
        stats: { hp: 30, damage_reduction: 15 },
      },
      4: {
        name: '龙威降临',
        description: '全属性+15%，受到致命伤害时有20%几率无敌1秒',
        stats: { all_stats: 15, damage_reduction: 20 },
      },
    },
  },
  shadow_set: {
    suitId: 'shadow_set',
    name: 'Shadow Set',
    nameCN: '暗影套装',
    icon: '🌑',
    rarity: 4,
    description: '源自幽冥深处的暗影之力，适合刺客类修士。',
    pieces: {
      weapon: 'shadow_dagger',
      armor: 'shadow_cloak',
      helmet: 'shadow_hood',
      accessory: 'shadow_ring',
    },
    bonuses: {
      2: {
        name: '暗影步伐',
        description: '闪避率+25%，攻击速度+15%',
        stats: { dodge: 25, speed: 15 },
      },
      4: {
        name: '影分身术',
        description: '击杀目标后生成一个影子分身协助作战',
        stats: { atk: 40, crit_rate: 15 },
      },
    },
  },
  immortal_set: {
    suitId: 'immortal_set',
    name: 'Immortal Set',
    nameCN: '仙风套装',
    icon: '☁️',
    rarity: 5,
    description: '飞升成仙者遗留的套装，蕴含天道法则之力。',
    pieces: {
      weapon: 'immortal_sword',
      armor: 'immortal_robe',
      helmet: 'immortal_crown',
      accessory: 'immortal_jade',
    },
    bonuses: {
      2: {
        name: '仙气缭绕',
        description: '灵气回复+50%，技能冷却-20%',
        stats: { spirit_regen: 50, speed: 20 },
      },
      4: {
        name: '天人合一',
        description: '全属性+25%，每次攻击回复生命+3%',
        stats: { all_stats: 25, hp_regen: 3 },
      },
    },
  },
}

// 套装效果计算结果
export interface SuitEffectResult {
  suitId: string
  nameCN: string
  icon: string
  count: number           // 当前穿着的套装件数
  activeBonuses: number[]  // 已激活的套装档位 [2, 4]
  bonuses: {
    tier: number
    name: string
    description: string
    stats: Record<string, number>
  }[]
}

/**
 * 根据套装件数获取激活的套装效果属性
 * @param suitId 套装ID
 * @param count 穿着的套装件数
 * @param baseAttributes 玩家基础属性（用于计算百分比加成）
 * @returns 套装效果属性加成
 */
export function calculateSuitBonusAttributes(
  suitId: string,
  count: number,
  baseAttributes: Record<string, number>
): Record<string, number> {
  const suit = EQUIPMENT_SUIT_CONFIGS[suitId]
  if (!suit || count < 2) return {}

  const result: Record<string, number> = {}
  const tiers = [2, 3, 4].filter(t => t <= count)

  for (const tier of tiers) {
    const bonus = suit.bonuses[tier as 2 | 3 | 4]
    if (!bonus) continue

    for (const [attr, percent] of Object.entries(bonus.stats)) {
      if (attr === 'all_stats') {
        // all_stats 对所有基础属性生效
        for (const key of ['attack', 'defense', 'hp', 'crit', 'dodge', 'speed']) {
          const baseVal = baseAttributes[key] || 0
          result[key] = (result[key] || 0) + Math.floor(baseVal * percent / 100)
        }
      } else if (attr === 'fire_dmg' || attr === 'frost_dmg' ||
                 attr === 'crit_rate' || attr === 'crit_dmg' || attr === 'dodge' ||
                 attr === 'speed' || attr === 'damage_reduction' || attr === 'hp_regen' ||
                 attr === 'spirit_regen') {
        // 百分比属性直接加成
        result[attr] = (result[attr] || 0) + percent
      } else if (attr === 'atk' || attr === 'def' || attr === 'hp') {
        // 攻击/防御/生命百分比加成
        const keyMap: Record<string, string> = { atk: 'attack', def: 'defense', hp: 'hp' }
        const key = keyMap[attr]
        const baseVal = baseAttributes[key] || 0
        result[key] = (result[key] || 0) + Math.floor(baseVal * percent / 100)
      } else {
        // 其他属性：相对于基础属性计算百分比加成
        const baseVal = baseAttributes[attr] || 0
        result[attr] = (result[attr] || 0) + Math.floor(baseVal * percent / 100)
      }
    }
  }

  return result
}

/**
 * 获取套装配置列表（用于API返回）
 */
export function getAllSuitConfigs(): EquipmentSuit[] {
  return Object.values(EQUIPMENT_SUIT_CONFIGS)
}
