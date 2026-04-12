/**
 * 套装进阶配置 v1.0
 * P87-5: 神器炼制/套装进阶系统
 * 
 * 套装品质：凡品/精品/极品/绝世/神话（5档）
 * 套装件数：2件套/4件套/6件套触发不同效果
 */

// 套装品质配置
const SET_QUALITY = {
  mortal: { name: '凡品', tier: 1, color: '#9B9B9B', upgradeCost: { lingshi: 10000, material: 'mortal_stone' } },
  refined: { name: '精品', tier: 2, color: '#00FF7F', upgradeCost: { lingshi: 30000, material: 'refined_stone' } },
  excellent: { name: '极品', tier: 3, color: '#1E90FF', upgradeCost: { lingshi: 80000, material: 'excellent_stone' } },
  supreme: { name: '绝世', tier: 4, color: '#FFD700', upgradeCost: { lingshi: 200000, material: 'supreme_stone' } },
  mythic: { name: '神话', tier: 5, color: '#FF4500', upgradeCost: { lingshi: 500000, material: 'mythic_stone' } }
};

// 套装类型配置
const SET_TYPES = {
  // 磐龙套装 - 攻击型
  'panlong': {
    id: 'panlong',
    name: '磐龙',
    baseType: 'atk',
    icon: '🐉',
    pieces: ['panlong_helmet', 'panlong_armor', 'panlong_weapon', 'panlong_boots', 'panlong_ring', 'panlong_amulet'],
    pieceNames: {
      'panlong_helmet': '磐龙头盔',
      'panlong_armor': '磐龙战甲',
      'panlong_weapon': '磐龙之刃',
      'panlong_boots': '磐龙战靴',
      'panlong_ring': '磐龙指环',
      'panlong_amulet': '磐龙护符'
    },
    baseStats: { atk: 500, def: 200, hp: 5000 },
    setBonus: {
      2: {
        mortal: { atk_percent: 0.05, desc: '攻击+5%' },
        refined: { atk_percent: 0.10, desc: '攻击+10%' },
        excellent: { atk_percent: 0.15, crit_rate: 0.03, desc: '攻击+15% 暴击+3%' },
        supreme: { atk_percent: 0.20, crit_rate: 0.05, crit_dmg: 0.10, desc: '攻击+20% 暴击+5% 爆伤+10%' },
        mythic: { atk_percent: 0.25, crit_rate: 0.08, crit_dmg: 0.20, skill_cd: 0.10, desc: '攻击+25% 暴击+8% 爆伤+20% CD-10%' }
      },
      4: {
        mortal: { atk_percent: 0.10, atk_speed: 0.05, desc: '攻击+10% 攻速+5%' },
        refined: { atk_percent: 0.18, atk_speed: 0.08, desc: '攻击+18% 攻速+8%' },
        excellent: { atk_percent: 0.25, atk_speed: 0.12, armor_break: 0.15, desc: '攻击+25% 攻速+12% 破甲+15%' },
        supreme: { atk_percent: 0.35, atk_speed: 0.15, armor_break: 0.25, life_steal: 0.08, desc: '攻击+35% 攻速+15% 破甲+25% 吸血+8%' },
        mythic: { atk_percent: 0.50, atk_speed: 0.20, armor_break: 0.35, life_steal: 0.15, rage_gain: 0.30, desc: '攻击+50% 攻速+20% 破甲+35% 吸血+15% 怒气+30%' }
      },
      6: {
        mortal: { atk_percent: 0.20, atk_speed: 0.10, max_hp: 0.10, desc: '攻击+20% 攻速+10% 气血+10%' },
        refined: { atk_percent: 0.30, atk_speed: 0.15, max_hp: 0.15, desc: '攻击+30% 攻速+15% 气血+15%' },
        excellent: { atk_percent: 0.40, atk_speed: 0.20, max_hp: 0.20, real_damage: 0.10, desc: '攻击+40% 攻速+20% 气血+20% 真伤+10%' },
        supreme: { atk_percent: 0.55, atk_speed: 0.25, max_hp: 0.25, real_damage: 0.18, all_resist: 0.15, desc: '攻击+55% 攻速+25% 气血+25% 真伤+18% 全抗+15%' },
        mythic: { atk_percent: 0.80, atk_speed: 0.35, max_hp: 0.30, real_damage: 0.30, all_resist: 0.25, skill_damage: 0.25, desc: '攻击+80% 攻速+35% 气血+30% 真伤+30% 全抗+25% 技能伤害+25%' }
      }
    }
  },

  // 玄武套装 - 防御型
  'xuanwu': {
    id: 'xuanwu',
    name: '玄武',
    baseType: 'def',
    icon: '🐢',
    pieces: ['xuanwu_helmet', 'xuanwu_armor', 'xuanwu_shield', 'xuanwu_boots', 'xuanwu_ring', 'xuanwu_amulet'],
    pieceNames: {
      'xuanwu_helmet': '玄武头盔',
      'xuanwu_armor': '玄武战甲',
      'xuanwu_shield': '玄武之盾',
      'xuanwu_boots': '玄武战靴',
      'xuanwu_ring': '玄武指环',
      'xuanwu_amulet': '玄武护符'
    },
    baseStats: { atk: 200, def: 500, hp: 8000 },
    setBonus: {
      2: {
        mortal: { def_percent: 0.08, desc: '防御+8%' },
        refined: { def_percent: 0.15, damage_reduce: 0.05, desc: '防御+15% 减伤+5%' },
        excellent: { def_percent: 0.20, damage_reduce: 0.10, hp_regen: 0.05, desc: '防御+20% 减伤+10% 生命回复+5%' },
        supreme: { def_percent: 0.28, damage_reduce: 0.15, hp_regen: 0.10, shield: 0.10, desc: '防御+28% 减伤+15% 生命回复+10% 护盾+10%' },
        mythic: { def_percent: 0.40, damage_reduce: 0.20, hp_regen: 0.15, shield: 0.20, counter: 0.15, desc: '防御+40% 减伤+20% 生命回复+15% 护盾+20% 反击+15%' }
      },
      4: {
        mortal: { def_percent: 0.15, max_hp: 0.10, desc: '防御+15% 气血+10%' },
        refined: { def_percent: 0.25, max_hp: 0.18, damage_reduce: 0.10, desc: '防御+25% 气血+18% 减伤+10%' },
        excellent: { def_percent: 0.35, max_hp: 0.25, damage_reduce: 0.15, shield_reflect: 0.10, desc: '防御+35% 气血+25% 减伤+15% 护盾反伤+10%' },
        supreme: { def_percent: 0.45, max_hp: 0.35, damage_reduce: 0.20, shield_reflect: 0.18, cc_immune: 0.10, desc: '防御+45% 气血+35% 减伤+20% 护盾反伤+18% 免疫控制+10%' },
        mythic: { def_percent: 0.60, max_hp: 0.50, damage_reduce: 0.30, shield_reflect: 0.25, cc_immune: 0.20, thorns: 0.30, desc: '防御+60% 气血+50% 减伤+30% 护盾反伤+25% 免疫控制+20% 荆棘+30%' }
      },
      6: {
        mortal: { def_percent: 0.25, max_hp: 0.18, damage_reduce: 0.08, desc: '防御+25% 气血+18% 减伤+8%' },
        refined: { def_percent: 0.40, max_hp: 0.28, damage_reduce: 0.12, revive: 1, desc: '防御+40% 气血+28% 减伤+12% 复活1次' },
        excellent: { def_percent: 0.50, max_hp: 0.40, damage_reduce: 0.20, revive: 1, immortal_shield: 0.10, desc: '防御+50% 气血+40% 减伤+20% 复活1次 无敌护盾+10%' },
        supreme: { def_percent: 0.65, max_hp: 0.55, damage_reduce: 0.28, revive: 2, immortal_shield: 0.18, desc: '防御+65% 气血+55% 减伤+28% 复活2次 无敌护盾+18%' },
        mythic: { def_percent: 0.80, max_hp: 0.80, damage_reduce: 0.40, revive: 3, immortal_shield: 0.30, all_damage_reduce: 0.15, desc: '防御+80% 气血+80% 减伤+40% 复活3次 无敌护盾+30% 全伤害减免+15%' }
      }
    }
  },

  // 朱雀套装 - 灵力/辅助型
  'zhuque': {
    id: 'zhuque',
    name: '朱雀',
    baseType: 'spirit',
    icon: '🦅',
    pieces: ['zhuque_headdress', 'zhuque_robes', 'zhuque_staff', 'zhuque_boots', 'zhuque_ring', 'zhuque_amulet'],
    pieceNames: {
      'zhuque_headdress': '朱雀头饰',
      'zhuque_robes': '朱雀羽袍',
      'zhuque_staff': '朱雀之杖',
      'zhuque_boots': '朱雀翔靴',
      'zhuque_ring': '朱雀指环',
      'zhuque_amulet': '朱雀护符'
    },
    baseStats: { atk: 300, def: 300, hp: 10000 },
    setBonus: {
      2: {
        mortal: { spirit_percent: 0.08, cultivation_speed: 0.05, desc: '灵力+8% 修炼速度+5%' },
        refined: { spirit_percent: 0.15, cultivation_speed: 0.10, desc: '灵力+15% 修炼速度+10%' },
        excellent: { spirit_percent: 0.22, cultivation_speed: 0.15, realm_speed: 0.10, desc: '灵力+22% 修炼+15% 境界速度+10%' },
        supreme: { spirit_percent: 0.30, cultivation_speed: 0.20, realm_speed: 0.18, comprehension_boost: 0.15, desc: '灵力+30% 修炼+20% 境界速度+18% 悟性+15%' },
        mythic: { spirit_percent: 0.45, cultivation_speed: 0.30, realm_speed: 0.25, comprehension_boost: 0.25, skill_range: 0.20, desc: '灵力+45% 修炼+30% 境界+25% 悟性+25% 技能范围+20%' }
      },
      4: {
        mortal: { spirit_percent: 0.15, heal_effect: 0.10, desc: '灵力+15% 治疗效果+10%' },
        refined: { spirit_percent: 0.25, heal_effect: 0.18, cooldown_reduce: 0.10, desc: '灵力+25% 治疗效果+18% CD-10%' },
        excellent: { spirit_percent: 0.35, heal_effect: 0.28, cooldown_reduce: 0.18, mana_cost_reduce: 0.15, desc: '灵力+35% 治疗+28% CD-18% 蓝耗-15%' },
        supreme: { spirit_percent: 0.45, heal_effect: 0.40, cooldown_reduce: 0.25, mana_cost_reduce: 0.25, buff_duration: 0.30, desc: '灵力+45% 治疗+40% CD-25% 蓝耗-25% Buff持续+30%' },
        mythic: { spirit_percent: 0.60, heal_effect: 0.60, cooldown_reduce: 0.35, mana_cost_reduce: 0.35, buff_duration: 0.50, skill_power: 0.30, desc: '灵力+60% 治疗+60% CD-35% 蓝耗-35% Buff+50% 技能效果+30%' }
      },
      6: {
        mortal: { spirit_percent: 0.25, all_attr_percent: 0.08, desc: '灵力+25% 全属性+8%' },
        refined: { spirit_percent: 0.38, all_attr_percent: 0.15, skill_power: 0.12, desc: '灵力+38% 全属性+15% 技能效果+12%' },
        excellent: { spirit_percent: 0.50, all_attr_percent: 0.22, skill_power: 0.20, aoe_damage: 0.15, desc: '灵力+50% 全属性+22% 技能效果+20% AOE伤害+15%' },
        supreme: { spirit_percent: 0.65, all_attr_percent: 0.30, skill_power: 0.30, aoe_damage: 0.25, aoe_range: 0.20, desc: '灵力+65% 全属性+30% 技能效果+30% AOE伤害+25% AOE范围+20%' },
        mythic: { spirit_percent: 0.80, all_attr_percent: 0.45, skill_power: 0.45, aoe_damage: 0.40, aoe_range: 0.35, mana_on_hit: 0.20, desc: '灵力+80% 全属性+45% 技能效果+45% AOE伤害+40% AOE范围+35% 命中回蓝+20%' }
      }
    }
  },

  // 青龙套装 - 均衡型
  'qinglong': {
    id: 'qinglong',
    name: '青龙',
    baseType: 'balanced',
    icon: '🐉',
    pieces: ['qinglong_helm', 'qinglong_armor', 'qinglong_blade', 'qinglong_boots', 'qinglong_ring', 'qinglong_medallion'],
    pieceNames: {
      'qinglong_helm': '青龙头盔',
      'qinglong_armor': '青龙战袍',
      'qinglong_blade': '青龙之刃',
      'qinglong_boots': '青龙战靴',
      'qinglong_ring': '青龙指环',
      'qinglong_medallion': '青龙徽章'
    },
    baseStats: { atk: 400, def: 400, hp: 8000 },
    setBonus: {
      2: {
        mortal: { all_attr_percent: 0.06, desc: '全属性+6%' },
        refined: { all_attr_percent: 0.12, move_speed: 0.05, desc: '全属性+12% 移动速度+5%' },
        excellent: { all_attr_percent: 0.18, move_speed: 0.08, dodge: 0.05, desc: '全属性+18% 移速+8% 闪避+5%' },
        supreme: { all_attr_percent: 0.25, move_speed: 0.12, dodge: 0.08, crit_immune: 0.05, desc: '全属性+25% 移速+12% 闪避+8% 暴击免疫+5%' },
        mythic: { all_attr_percent: 0.38, move_speed: 0.18, dodge: 0.12, crit_immune: 0.10, xp_bonus: 0.20, desc: '全属性+38% 移速+18% 闪避+12% 暴击免疫+10% 经验+20%' }
      },
      4: {
        mortal: { all_attr_percent: 0.12, crit_rate: 0.05, desc: '全属性+12% 暴击+5%' },
        refined: { all_attr_percent: 0.20, crit_rate: 0.08, hp_regen: 0.05, desc: '全属性+20% 暴击+8% 生命回复+5%' },
        excellent: { all_attr_percent: 0.28, crit_rate: 0.12, hp_regen: 0.08, def_break: 0.10, desc: '全属性+28% 暴击+12% 生命回复+8% 防穿+10%' },
        supreme: { all_attr_percent: 0.38, crit_rate: 0.15, hp_regen: 0.12, def_break: 0.18, atk_speed: 0.10, desc: '全属性+38% 暴击+15% 生命回复+12% 防穿+18% 攻速+10%' },
        mythic: { all_attr_percent: 0.55, crit_rate: 0.20, hp_regen: 0.18, def_break: 0.28, atk_speed: 0.18, drop_rate: 0.25, desc: '全属性+55% 暴击+20% 生命回复+18% 防穿+28% 攻速+18% 掉率+25%' }
      },
      6: {
        mortal: { all_attr_percent: 0.20, atk_percent: 0.10, def_percent: 0.10, desc: '全属性+20% 攻击+10% 防御+10%' },
        refined: { all_attr_percent: 0.30, atk_percent: 0.18, def_percent: 0.18, crit_dmg: 0.10, desc: '全属性+30% 攻击+18% 防御+18% 爆伤+10%' },
        excellent: { all_attr_percent: 0.42, atk_percent: 0.25, def_percent: 0.25, crit_dmg: 0.18, damage_reduce: 0.10, desc: '全属性+42% 攻击+25% 防御+25% 爆伤+18% 减伤+10%' },
        supreme: { all_attr_percent: 0.55, atk_percent: 0.35, def_percent: 0.35, crit_dmg: 0.28, damage_reduce: 0.18, skill_cd: 0.10, desc: '全属性+55% 攻击+35% 防御+35% 爆伤+28% 减伤+18% CD-10%' },
        mythic: { all_attr_percent: 0.75, atk_percent: 0.50, def_percent: 0.50, crit_dmg: 0.45, damage_reduce: 0.30, skill_cd: 0.20, all_speed: 0.20, desc: '全属性+75% 攻击+50% 防御+50% 爆伤+45% 减伤+30% CD-20% 全速+20%' }
      }
    }
  }
};

// 获取所有套装类型
function getSetTypes() {
  return Object.entries(SET_TYPES).map(([id, cfg]) => ({
    id,
    name: cfg.name,
    icon: cfg.icon,
    baseType: cfg.baseType,
    pieceCount: cfg.pieces.length,
    pieces: cfg.pieces.map(p => ({ id: p, name: cfg.pieceNames[p] })),
    qualities: Object.entries(SET_QUALITY).map(([qId, qCfg]) => ({
      id: qId,
      name: qCfg.name,
      color: qCfg.color,
      tier: qCfg.tier
    }))
  }));
}

// 获取指定套装的加成
function getSetBonus(setId, pieceCount, quality) {
  const set = SET_TYPES[setId];
  if (!set) return null;

  const bonusByPieces = set.setBonus[pieceCount];
  if (!bonusByPieces) return null;

  const qualityBonus = bonusByPieces[quality];
  if (!qualityBonus) return null;

  return { ...qualityBonus, desc: qualityBonus.desc };
}

// 计算套装加成预览
function calcSetBonusPreview(setId, playerPieces) {
  const set = SET_TYPES[setId];
  if (!set) return null;

  const owned = playerPieces.filter(p => set.pieces.includes(p)).length;
  
  const previews = {};
  for (const quality of Object.keys(SET_QUALITY)) {
    const preview = [];
    for (const [pieces, bonuses] of Object.entries(set.setBonus)) {
      const bonus = bonuses[quality];
      if (bonus) {
        preview.push({
          pieces: parseInt(pieces),
          owned: owned >= parseInt(pieces),
          desc: bonus.desc
        });
      }
    }
    previews[quality] = preview;
  }

  return { setId, setName: set.name, owned, totalPieces: set.pieces.length, previews };
}

// 套装觉醒配置
const SET_AWAKEN = {
  // 从凡品觉醒到精品需要材料
  mortal_to_refined: {
    from: 'mortal',
    to: 'refined',
    materials: [{ id: 'awaken_stone_1', count: 5 }],
    lingshi: 20000,
    successRate: 0.90
  },
  refined_to_excellent: {
    from: 'refined',
    to: 'excellent',
    materials: [{ id: 'awaken_stone_2', count: 5 }],
    lingshi: 50000,
    successRate: 0.80
  },
  excellent_to_supreme: {
    from: 'excellent',
    to: 'supreme',
    materials: [{ id: 'awaken_stone_3', count: 5 }],
    lingshi: 120000,
    successRate: 0.70
  },
  supreme_to_mythic: {
    from: 'supreme',
    to: 'mythic',
    materials: [{ id: 'awaken_stone_4', count: 5 }],
    lingshi: 300000,
    successRate: 0.50
  }
};

function getAwakenRecipe(fromQuality, toQuality) {
  const key = `${fromQuality}_to_${toQuality}`;
  return SET_AWAKEN[key] || null;
}

module.exports = {
  SET_QUALITY,
  SET_TYPES,
  SET_AWAKEN,
  getSetTypes,
  getSetBonus,
  calcSetBonusPreview,
  getAwakenRecipe
};
