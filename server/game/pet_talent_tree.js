/**
 * 宠物/灵兽天赋树系统 v1.0
 * P52-2: 宠物天赋树系统
 * 
 * 天赋树：攻击/防御/辅助三大分支
 * 每个分支10级，解锁需满足前置天赋和灵兽等级
 */

const PET_TALENT = {
  // ============ 天赋树配置 ============
  branches: {
    attack: {
      name: '战斗天赋',
      icon: '⚔️',
      color: '#FF6B6B',
      description: '提升灵兽的攻击能力和伤害输出',
      talents: [
        // T1
        { id: 'atk_1', name: '利爪', tier: 1, pos: 0, cost: 1, req_level: 5, effect: { atk_percent: 0.05 }, desc: '攻击力+5%' },
        // T2
        { id: 'atk_2', name: '撕裂', tier: 2, pos: 1, cost: 2, req_level: 10, req_talent: 'atk_1', effect: { bleed_damage: 0.10 }, desc: '流血伤害+10%' },
        // T3
        { id: 'atk_3', name: '狂暴', tier: 3, pos: 2, cost: 3, req_level: 15, req_talent: 'atk_2', effect: { atk_boost_hp_low: 0.15 }, desc: '低血量攻击+15%' },
        // T4
        { id: 'atk_4', name: '致命', tier: 4, pos: 3, cost: 4, req_level: 20, req_talent: 'atk_3', effect: { crit_rate: 0.08 }, desc: '暴击率+8%' },
        // T5
        { id: 'atk_5', name: '灭绝', tier: 5, pos: 4, cost: 5, req_level: 25, req_talent: 'atk_4', effect: { execute_damage: 0.20 }, desc: '斩杀伤害+20%' },
        // T6
        { id: 'atk_6', name: '连击', tier: 6, pos: 5, cost: 6, req_level: 30, req_talent: 'atk_5', effect: { double_strike: 0.10 }, desc: '连击概率+10%' },
        // T7
        { id: 'atk_7', name: '灭世', tier: 7, pos: 6, cost: 8, req_level: 35, req_talent: 'atk_6', effect: { aoe_damage: 0.25 }, desc: 'AOE伤害+25%' },
        // T8
        { id: 'atk_8', name: '天罚', tier: 8, pos: 7, cost: 10, req_level: 40, req_talent: 'atk_7', effect: { true_damage: 0.15 }, desc: '真实伤害+15%' },
        // T9
        { id: 'atk_9', name: '神灭', tier: 9, pos: 8, cost: 12, req_level: 45, req_talent: 'atk_8', effect: { all_damage_boost: 0.20 }, desc: '所有伤害+20%' },
        // T10 终极
        { id: 'atk_10', name: '混沌之噬', tier: 10, pos: 9, cost: 20, req_level: 50, req_talent: 'atk_9', effect: { attack_all: 0.35, crit_damage: 0.30 }, desc: '攻击+35% 暴击伤害+30%' }
      ]
    },
    defense: {
      name: '防御天赋',
      icon: '🛡️',
      color: '#4ECDC4',
      description: '提升灵兽的生存能力和抗性',
      talents: [
        // T1
        { id: 'def_1', name: '护体', tier: 1, pos: 0, cost: 1, req_level: 5, effect: { def_percent: 0.05 }, desc: '防御+5%' },
        // T2
        { id: 'def_2', name: '硬化', tier: 2, pos: 1, cost: 2, req_level: 10, req_talent: 'def_1', effect: { damage_reduce: 0.05 }, desc: '受伤-5%' },
        // T3
        { id: 'def_3', name: '铁壁', tier: 3, pos: 2, cost: 3, req_level: 15, req_talent: 'def_2', effect: { block_rate: 0.08 }, desc: '格挡率+8%' },
        // T4
        { id: 'def_4', name: '再生', tier: 4, pos: 3, cost: 4, req_level: 20, req_talent: 'def_3', effect: { hp_regen: 0.03 }, desc: '生命回复+3%/秒' },
        // T5
        { id: 'def_5', name: '护盾', tier: 5, pos: 4, cost: 5, req_level: 25, req_talent: 'def_4', effect: { shield_create: 0.10 }, desc: '护盾效果+10%' },
        // T6
        { id: 'def_6', name: '反伤', tier: 6, pos: 5, cost: 6, req_level: 30, req_talent: 'def_5', effect: { counter_attack: 0.12 }, desc: '反击率+12%' },
        // T7
        { id: 'def_7', name: '不死', tier: 7, pos: 6, cost: 8, req_level: 35, req_talent: 'def_6', effect: { revive_hp: 0.50, revive_count: 1 }, desc: '复活恢复50%HP' },
        // T8
        { id: 'def_8', name: '魔抗', tier: 8, pos: 7, cost: 10, req_level: 40, req_talent: 'def_7', effect: { resistance_all: 0.20 }, desc: '全抗性+20%' },
        // T9
        { id: 'def_9', name: '不灭', tier: 9, pos: 8, cost: 12, req_level: 45, req_talent: 'def_8', effect: { hp_all: 0.25, def_all: 0.20 }, desc: '生命+25% 防御+20%' },
        // T10 终极
        { id: 'def_10', name: '玄武之躯', tier: 10, pos: 9, cost: 20, req_level: 50, req_talent: 'def_9', effect: { all_damage_reduce: 0.25, hp_all: 0.40 }, desc: '全伤害-25% 生命+40%' }
      ]
    },
    utility: {
      name: '辅助天赋',
      icon: '✨',
      color: '#FFD93D',
      description: '提升灵兽的速度和辅助能力',
      talents: [
        // T1
        { id: 'util_1', name: '疾风', tier: 1, pos: 0, cost: 1, req_level: 5, effect: { speed: 0.08 }, desc: '速度+8%' },
        // T2
        { id: 'util_2', name: '灵敏', tier: 2, pos: 1, cost: 2, req_level: 10, req_talent: 'util_1', effect: { dodge_rate: 0.05 }, desc: '闪避率+5%' },
        // T3
        { id: 'util_3', name: '协同', tier: 3, pos: 2, cost: 3, req_level: 15, req_talent: 'util_2', effect: { master_damage_boost: 0.10 }, desc: '主人伤害+10%' },
        // T4
        { id: 'util_4', name: '敏锐', tier: 4, pos: 3, cost: 4, req_level: 20, req_talent: 'util_3', effect: { first_strike: 0.10 }, desc: '先手概率+10%' },
        // T5
        { id: 'util_5', name: '治疗', tier: 5, pos: 4, cost: 5, req_level: 25, req_talent: 'util_4', effect: { heal_master: 0.08 }, desc: '治疗主人+8%' },
        // T6
        { id: 'util_6', name: '护主', tier: 6, pos: 5, cost: 6, req_level: 30, req_talent: 'util_5', effect: { protect_master: 0.15 }, desc: '保护主人概率+15%' },
        // T7
        { id: 'util_7', name: '鼓舞', tier: 7, pos: 6, cost: 8, req_level: 35, req_talent: 'util_6', effect: { buff_duration: 0.25 }, desc: 'BUFF持续+25%' },
        // T8
        { id: 'util_8', name: '祝福', tier: 8, pos: 7, cost: 10, req_level: 40, req_talent: 'util_7', effect: { master_exp_bonus: 0.20 }, desc: '主人经验+20%' },
        // T9
        { id: 'util_9', name: '灵犀', tier: 9, pos: 8, cost: 12, req_level: 45, req_talent: 'util_8', effect: { skill_cd_reduce: 0.20 }, desc: '技能CD-20%' },
        // T10 终极
        { id: 'util_10', name: '天命共鸣', tier: 10, pos: 9, cost: 20, req_level: 50, req_talent: 'util_9', effect: { all_stats_boost: 0.25, master_all: 0.15 }, desc: '全属性+25% 主人全属性+15%' }
      ]
    }
  },

  // ============ 天赋重置配置 ============
  reset: {
    full_reset_cost: 500,      // 全重置消耗灵石
    single_reset_cost: 50,     // 单天赋重置消耗
    talent_point_per_level: 1 // 每级获得1点天赋点
  },

  // ============ 天赋点获取配置 ============
  points: {
    per_pet_level: 1,   // 每级获得1点
    per_quality_bonus: { // 品质额外奖励
      normal: 0,
      rare: 5,
      epic: 10,
      legendary: 20
    }
  }
};

// ==================== 核心函数 ====================

/**
 * 获取灵兽天赋树信息
 */
function getPetTalentTree(pet) {
  const petLevel = pet.level || 1;
  const tree = {};

  for (const [branchKey, branch] of Object.entries(PET_TALENT.branches)) {
    const talents = branch.talents.map(t => {
      const learned = pet.talent_tree && pet.talent_tree[branchKey] && 
                      pet.talent_tree[branchKey].includes(t.id);
      const available = canLearnTalent(pet, t);
      return {
        ...t,
        learned,
        available,
        locked: !available && !learned
      };
    });
    tree[branchKey] = { ...branch, talents };
  }

  return tree;
}

/**
 * 判断灵兽是否可以学习某天赋
 */
function canLearnTalent(pet, talent) {
  const petLevel = pet.level || 1;
  if (petLevel < talent.req_level) return false;
  if (talent.req_talent) {
    const learned = pet.talent_tree && 
                    Object.values(pet.talent_tree).flat().includes(talent.req_talent);
    if (!learned) return false;
  }
  return true;
}

/**
 * 获取灵兽已分配的天赋点总数
 */
function getUsedTalentPoints(pet) {
  if (!pet.talent_tree) return 0;
  let count = 0;
  for (const talents of Object.values(pet.talent_tree)) {
    count += (talents || []).length;
  }
  return count;
}

/**
 * 获取灵兽可用的天赋点
 */
function getAvailableTalentPoints(pet) {
  const petLevel = pet.level || 1;
  const quality = pet.quality || 'normal';
  const totalEarned = petLevel * PET_TALENT.points.per_pet_level + 
                       (PET_TALENT.points.per_quality_bonus[quality] || 0);
  return totalEarned - getUsedTalentPoints(pet);
}

/**
 * 学习天赋
 */
function learnTalent(pet, talentId) {
  const talent = findTalentById(talentId);
  if (!talent) return { success: false, message: '天赋不存在' };

  const branchKey = talent.branch;
  const petLevel = pet.level || 1;

  // 检查等级要求
  if (petLevel < talent.req_level) {
    return { success: false, message: `灵兽等级不足，需要${talent.req_level}级` };
  }

  // 检查前置天赋
  if (talent.req_talent) {
    const hasPrereq = pet.talent_tree && 
                      pet.talent_tree[branchKey] && 
                      pet.talent_tree[branchKey].includes(talent.req_talent);
    if (!hasPrereq) {
      const prereqTalent = findTalentById(talent.req_talent);
      return { success: false, message: `需要先学习「${prereqTalent?.name || talent.req_talent}」` };
    }
  }

  // 检查是否已学
  if (pet.talent_tree && pet.talent_tree[branchKey] && 
      pet.talent_tree[branchKey].includes(talentId)) {
    return { success: false, message: '已学习此天赋' };
  }

  // 检查天赋点
  const availPoints = getAvailableTalentPoints(pet);
  if (availPoints < talent.cost) {
    return { success: false, message: `天赋点不足，需要${talent.cost}点` };
  }

  // 学习天赋
  if (!pet.talent_tree) pet.talent_tree = {};
  if (!pet.talent_tree[branchKey]) pet.talent_tree[branchKey] = [];
  pet.talent_tree[branchKey].push(talentId);

  return {
    success: true,
    message: `成功学习「${talent.name}」`,
    talent: { ...talent, learned: true },
    newAvailablePoints: getAvailableTalentPoints(pet) - talent.cost
  };
}

/**
 * 重置天赋
 */
function resetTalent(pet, talentId = null) {
  if (!pet.talent_tree) return { success: false, message: '没有可重置的天赋' };

  if (talentId) {
    // 单个天赋重置
    let found = false;
    for (const [branch, talents] of Object.entries(pet.talent_tree)) {
      const idx = talents.indexOf(talentId);
      if (idx !== -1) {
        const talent = findTalentById(talentId);
        talents.splice(idx, 1);
        // 重置下游天赋（依赖此天赋的所有天赋）
        const downstream = findDownstreamTalents(talentId);
        for (const downId of downstream) {
          for (const [b, t] of Object.entries(pet.talent_tree)) {
            const i = t.indexOf(downId);
            if (i !== -1) t.splice(i, 1);
          }
        }
        found = true;
        break;
      }
    }
    if (!found) return { success: false, message: '天赋不存在或未学习' };

    // 返还50%天赋点
    const talent = findTalentById(talentId);
    const refund = Math.ceil(talent.cost * 0.5);
    return { success: true, message: `重置「${talent?.name}」，返还${refund}点`, refund };
  } else {
    // 全重置
    const refunded = getUsedTalentPoints(pet);
    pet.talent_tree = {};
    return { success: true, message: '天赋已全重置', refund: refunded };
  }
}

/**
 * 查找天赋ID
 */
function findTalentById(id) {
  for (const [branchKey, branch] of Object.entries(PET_TALENT.branches)) {
    for (const t of branch.talents) {
      if (t.id === id) return { ...t, branch: branchKey };
    }
  }
  return null;
}

/**
 * 查找下游天赋（被当前天赋解锁的所有天赋）
 */
function findDownstreamTalents(talentId) {
  const downstream = [];
  const visited = new Set();

  function dfs(id) {
    for (const [branchKey, branch] of Object.entries(PET_TALENT.branches)) {
      for (const t of branch.talents) {
        if (t.req_talent === id && !visited.has(t.id)) {
          visited.add(t.id);
          downstream.push(t.id);
          dfs(t.id);
        }
      }
    }
  }
  dfs(talentId);
  return downstream;
}

/**
 * 计算天赋对宠物的属性加成
 */
function calculateTalentBonus(pet) {
  const bonuses = {
    atk_percent: 0, def_percent: 0, hp_percent: 0,
    crit_rate: 0, crit_damage: 0, speed: 0, dodge_rate: 0,
    damage_reduce: 0, lifesteal: 0, hp_regen: 0,
    master_damage_boost: 0, master_exp_bonus: 0, all_stats_boost: 0,
    shield_create: 0, heal_master: 0, protect_master: 0,
    aoe_damage: 0, true_damage: 0, all_damage_boost: 0,
    all_damage_reduce: 0, resistance_all: 0
  };

  if (!pet.talent_tree) return bonuses;

  for (const [branchKey, talentIds] of Object.entries(pet.talent_tree)) {
    for (const tid of talentIds) {
      const talent = findTalentById(tid);
      if (talent) {
        for (const [stat, val] of Object.entries(talent.effect)) {
          bonuses[stat] = (bonuses[stat] || 0) + val;
        }
      }
    }
  }

  return bonuses;
}

/**
 * 获取天赋树总览（分支进度）
 */
function getTalentTreeSummary(pet) {
  const summary = {};
  let totalTalents = 0;
  let totalLearned = 0;

  for (const [branchKey, branch] of Object.entries(PET_TALENT.branches)) {
    const learned = pet.talent_tree && pet.talent_tree[branchKey] ? 
                   pet.talent_tree[branchKey].length : 0;
    totalLearned += learned;
    totalTalents += branch.talents.length;
    summary[branchKey] = {
      name: branch.name,
      icon: branch.icon,
      color: branch.color,
      learned,
      total: branch.talents.length,
      progress: `${learned}/${branch.talents.length}`
    };
  }

  return {
    branches: summary,
    totalLearned,
    totalTalents,
    availablePoints: getAvailableTalentPoints(pet),
    petLevel: pet.level || 1,
    quality: pet.quality || 'normal'
  };
}

module.exports = {
  PET_TALENT,
  getPetTalentTree,
  canLearnTalent,
  getAvailableTalentPoints,
  learnTalent,
  resetTalent,
  calculateTalentBonus,
  getTalentTreeSummary,
  findTalentById
};
