/**
 * 法宝系统 v4.0 (养成优化版)
 * 包含：法宝数据、炼器系统、天材地宝、法宝技能
 */

const ARTIFACT_QUALITY = {
  mortal: { name: '法器', color: '#8B8B8B', upgrade_rate: 0.3, max_level: 20, exp_factor: 1 },
  spirit: { name: '灵器', color: '#00FF7F', upgrade_rate: 0.5, max_level: 40, exp_factor: 1.5 },
  treasure: { name: '宝器', color: '#1E90FF', upgrade_rate: 0.7, max_level: 60, exp_factor: 2 },
  immortal: { name: '仙器', color: '#FFD700', upgrade_rate: 0.85, max_level: 80, exp_factor: 3 },
  divine: { name: '神器', color: '#FF4500', upgrade_rate: 1.0, max_level: 100, exp_factor: 5 }
};

const ARTIFACT_SLOTS = {
  weapon: { name: '飞剑', icon: '⚔️', skill_type: 'attack' },
  armor: { name: '宝甲', icon: '🛡️', skill_type: 'defense' },
  accessory: { name: '配饰', icon: '💍', skill_type: 'support' },
  companion: { name: '伴生', icon: '🔮', skill_type: 'special' }
};

const ARTIFACT_DATA = {
  // 飞剑类
  'iron_sword': { name: '铁剑', type: 'weapon', quality: 'mortal', base_atk: 20, base_def: 0, skill: 'slash', price: 100 },
  'flame_sword': { name: '赤焰剑', type: 'weapon', quality: 'spirit', base_atk: 80, base_def: 5, skill: 'fire_slash', price: 1000 },
  'thunder_sword': { name: '雷霆剑', type: 'weapon', quality: 'treasure', base_atk: 250, base_def: 15, skill: 'thunder_strike', price: 10000 },
  'immortal_sword': { name: '仙剑', type: 'weapon', quality: 'immortal', base_atk: 800, base_def: 50, skill: 'immortal_slash', price: 100000 },
  'world_sword': { name: '开天剑', type: 'weapon', quality: 'divine', base_atk: 3000, base_def: 200, skill: 'world_slice', price: 1000000 },
  
  // 宝甲类
  'iron_armor': { name: '铁甲', type: 'armor', quality: 'mortal', base_atk: 0, base_def: 25, skill: 'iron_shield', price: 100 },
  'jade_armor': { name: '玉甲', type: 'armor', quality: 'spirit', base_atk: 8, base_def: 80, skill: 'jade_shield', price: 1000 },
  'dragon_armor': { name: '龙鳞甲', type: 'armor', quality: 'treasure', base_atk: 25, base_def: 250, skill: 'dragon_scale', price: 10000 },
  'immortal_robe': { name: '仙衣', type: 'armor', quality: 'immortal', base_atk: 80, base_def: 800, skill: 'immortal_aura', price: 100000 },
  'divine_robe': { name: '天衣', type: 'armor', quality: 'divine', base_atk: 300, base_def: 3000, skill: 'divine_protection', price: 1000000 },
  
  // 配饰类
  'jade_ring': { name: '玉佩', type: 'accessory', quality: 'mortal', base_atk: 8, base_def: 8, skill: 'spirit_flow', price: 100 },
  'spirit_pendant': { name: '灵玉', type: 'accessory', quality: 'spirit', base_atk: 30, base_def: 30, spirit_bonus: 0.2, price: 1000 },
  'void_bracelet': { name: '虚空镯', type: 'accessory', quality: 'treasure', base_atk: 100, base_def: 100, spirit_bonus: 0.5, price: 10000 },
  'immortal_token': { name: '仙符', type: 'accessory', quality: 'immortal', base_atk: 300, base_def: 300, spirit_bonus: 1.0, price: 100000 },
  'world_seed': { name: '道种', type: 'accessory', quality: 'divine', base_atk: 1200, base_def: 1200, spirit_bonus: 2.0, price: 1000000 },
  
  // 伴生类
  'spirit_bead': { name: '灵珠', type: 'companion', quality: 'mortal', base_atk: 15, base_def: 8, skill: 'life_boost', price: 100 },
  'fire_bead': { name: '火灵珠', type: 'companion', quality: 'spirit', base_atk: 60, base_def: 40, skill: 'fire_heart', price: 1000 },
  'thunder_bead': { name: '雷灵珠', type: 'companion', quality: 'treasure', base_atk: 180, base_def: 120, skill: 'thunder_heart', price: 10000 },
  'immortal_bead': { name: '仙灵珠', type: 'companion', quality: 'immortal', base_atk: 600, base_def: 400, skill: 'immortal_heart', price: 100000 },
  'world_core': { name: '世界之心', type: 'companion', quality: 'divine', base_atk: 2000, base_def: 1500, skill: 'world_power', price: 1000000 }
};

const ARTIFACT_SKILLS = {
  // 攻击技能
  'slash': { name: '普通斩击', type: 'attack', damage: 1.5, cooldown: 0, description: '造成150%伤害' },
  'fire_slash': { name: '火焰斩', type: 'attack', damage: 2.0, cooldown: 10, description: '造成200%伤害，并灼烧' },
  'thunder_strike': { name: '雷霆一击', type: 'attack', damage: 2.5, cooldown: 15, description: '造成250%伤害，概率眩晕' },
  'immortal_slash': { name: '仙剑斩', type: 'attack', damage: 3.0, cooldown: 20, description: '造成300%伤害，无视防御' },
  'world_slice': { name: '开天辟地', type: 'attack', damage: 5.0, cooldown: 60, description: '造成500%伤害，秒杀同级' },
  
  // 防御技能
  'iron_shield': { name: '铁壁', type: 'defense', shield: 0.3, cooldown: 30, description: '获得30%最大HP护盾' },
  'jade_shield': { name: '玉屏', type: 'defense', shield: 0.5, cooldown: 45, description: '获得50%最大HP护盾，回复10%' },
  'dragon_scale': { name: '龙鳞护体', type: 'defense', shield: 0.7, cooldown: 60, description: '获得70%最大HP护盾，反弹30%' },
  'immortal_aura': { name: '仙灵护体', type: 'defense', shield: 1.0, cooldown: 90, description: '获得100%最大HP护盾，免疫控制' },
  'divine_protection': { name: '天道护法', type: 'defense', shield: 1.5, cooldown: 120, description: '获得150%最大HP护盾，持续30秒' },
  
  // 辅助技能
  'spirit_flow': { name: '灵气流转', type: 'support', spirit_restore: 50, cooldown: 60, description: '回复50点灵气' },
  'life_boost': { name: '生机激发', type: 'support', hp_restore: 0.3, cooldown: 45, description: '回复30%最大生命' },
  'fire_heart': { name: '心火燃烧', type: 'support', atk_boost: 0.3, duration: 30, cooldown: 90, description: '攻击+30%，持续30秒' },
  'thunder_heart': { name: '雷劫锻体', type: 'support', def_boost: 0.3, duration: 30, cooldown: 90, description: '防御+30%，持续30秒' },
  'immortal_heart': { name: '仙人模式', type: 'support', all_boost: 0.5, duration: 30, cooldown: 120, description: '全属性+50%，持续30秒' },
  'world_power': { name: '世界之力', type: 'support', all_boost: 1.0, duration: 60, cooldown: 180, description: '全属性翻倍，持续60秒' }
};

// ============ 炼器系统 ============
const FORGING_RECIPES = {
  // 法器
  'flame_sword': { quality: 'spirit', materials: { 'iron_sword': 1, 'fire_essence': 3, 'forging_ore': 10 }, success_rate: 0.7, time: 60 },
  'thunder_sword': { quality: 'treasure', materials: { 'flame_sword': 1, 'thunder_essence': 3, 'refined_gold': 20 }, success_rate: 0.6, time: 120 },
  'immortal_sword': { quality: 'immortal', materials: { 'thunder_sword': 1, 'immortal_iron': 5, 'world_dust': 10 }, success_rate: 0.5, time: 300 },
  
  // 宝甲
  'jade_armor': { quality: 'spirit', materials: { 'iron_armor': 1, 'jade_essence': 3, 'forging_ore': 10 }, success_rate: 0.7, time: 60 },
  'dragon_armor': { quality: 'treasure', materials: { 'jade_armor': 1, 'dragon_scale': 3, 'refined_gold': 20 }, success_rate: 0.6, time: 120 },
  'immortal_robe': { quality: 'immortal', materials: { 'dragon_armor': 1, 'immortal_jade': 5, 'world_dust': 10 }, success_rate: 0.5, time: 300 },
  
  // 配饰
  'spirit_pendant': { quality: 'spirit', materials: { 'jade_ring': 1, 'spirit_essence': 3, 'forging_ore': 10 }, success_rate: 0.7, time: 60 },
  'void_bracelet': { quality: 'treasure', materials: { 'spirit_pendant': 1, 'void_essence': 3, 'refined_gold': 20 }, success_rate: 0.6, time: 120 },
  'immortal_token': { quality: 'immortal', materials: { 'void_bracelet': 1, 'immortal_stone': 5, 'world_dust': 10 }, success_rate: 0.5, time: 300 },
  
  // 伴生
  'fire_bead': { quality: 'spirit', materials: { 'spirit_bead': 1, 'fire_essence': 3, 'forging_ore': 10 }, success_rate: 0.7, time: 60 },
  'thunder_bead': { quality: 'treasure', materials: { 'fire_bead': 1, 'thunder_essence': 3, 'refined_gold': 20 }, success_rate: 0.6, time: 120 },
  'immortal_bead': { quality: 'immortal', materials: { 'thunder_bead': 1, 'immortal_core': 5, 'world_dust': 10 }, success_rate: 0.5, time: 300 },
  
  // 升级材料合成
  'refined_gold': { quality: 'material', materials: { 'forging_ore': 10 }, success_rate: 0.9, time: 30 },
  'high_refined_gold': { quality: 'material', materials: { 'refined_gold': 5 }, success_rate: 0.8, time: 60 }
};

// ============ 天材地宝系统 ============
const HEAVEN_TREASURE_DATA = {
  // 仙品
  'immortal_essence': { name: '灵气之源', quality: 'immortal', type: 'essence', effect: { spirit_rate: 0.5 }, duration: 3600, cooldown: 86400, description: '灵气获取+50%，持续1小时', rarity: 0.02 },
  'world_frag': { name: '世界碎片', quality: 'divine', type: 'core', effect: { all_stats: 0.3 }, duration: 1800, cooldown: 172800, description: '全属性+30%，持续30分钟', rarity: 0.005 },
  
  // 精品
  'fire_essence': { name: '离火之精', quality: 'treasure', type: 'element', effect: { atk_boost: 0.3 }, duration: 1800, cooldown: 43200, description: '攻击+30%，持续30分钟', rarity: 0.1 },
  'thunder_essence': { name: '九天玄雷', quality: 'treasure', type: 'element', effect: { atk_boost: 0.3 }, duration: 1800, cooldown: 43200, description: '攻击+30%，持续30分钟', rarity: 0.1 },
  'void_essence': { name: '虚空之力', quality: 'treasure', type: 'element', effect: { spirit_rate: 0.3 }, duration: 1800, cooldown: 43200, description: '灵气+30%，持续30分钟', rarity: 0.1 },
  'jade_essence': { name: '万年寒玉', quality: 'treasure', type: 'element', effect: { def_boost: 0.3 }, duration: 1800, cooldown: 43200, description: '防御+30%，持续30分钟', rarity: 0.1 },
  'dragon_scale': { name: '龙鳞', quality: 'treasure', type: 'material', for_smith: 'dragon_armor', rarity: 0.08 },
  'immortal_iron': { name: '仙灵铁', quality: 'immortal', type: 'material', for_smith: 'immortal_sword', rarity: 0.03 },
  'immortal_jade': { name: '仙灵玉', quality: 'immortal', type: 'material', for_smith: 'immortal_robe', rarity: 0.03 },
  'immortal_stone': { name: '仙灵石', quality: 'immortal', type: 'material', for_smith: 'immortal_token', rarity: 0.03 },
  'immortal_core': { name: '仙灵核', quality: 'immortal', type: 'material', for_smith: 'immortal_bead', rarity: 0.03 },
  'world_dust': { name: '世界尘埃', quality: 'divine', type: 'material', for_smith: 'divine', rarity: 0.01 },
  
  // 普通
  'forging_ore': { name: '锻造矿石', quality: 'common', type: 'ore', for_smith: 'refined_gold', rarity: 0.5 },
  'spirit_essence': { name: '灵气结晶', quality: 'common', type: 'essence', effect: { spirit_rate: 0.1 }, duration: 600, cooldown: 3600, description: '灵气+10%，持续10分钟', rarity: 0.3 },
  'jade_ore': { name: '玉石', quality: 'common', type: 'ore', for_smith: 'jade_armor', rarity: 0.3 },
  'iron_ore': { name: '铁矿', quality: 'common', type: 'ore', for_smith: 'iron_sword', rarity: 0.4 },
  
  // 器灵
  'fire_spirit': { name: '火灵', quality: 'treasure', type: 'spirit', effect: { skill_damage: 0.2 }, duration: 3600, cooldown: 86400, description: '法宝技能伤害+20%', rarity: 0.05 },
  'thunder_spirit': { name: '雷灵', quality: 'treasure', type: 'spirit', effect: { skill_damage: 0.2 }, duration: 3600, cooldown: 86400, description: '法宝技能伤害+20%', rarity: 0.05 },
  'immortal_spirit': { name: '仙灵', quality: 'immortal', type: 'spirit', effect: { skill_damage: 0.5 }, duration: 3600, cooldown: 172800, description: '法宝技能伤害+50%', rarity: 0.01 }
};

// ============ 天材地宝获取频率 ============
const HEAVEN_TREASURE_SPAWN = {
  // 野外采集
  'mining': { interval: 300, materials: ['iron_ore', 'jade_ore', 'forging_ore'], weights: [0.4, 0.3, 0.2], rare: { 'spirit_essence': 0.1 } },
  
  // 灵气副本 (每日次数限制)
  'spirit_arena': { daily_limit: 10, materials: ['spirit_essence', 'jade_essence'], weights: [0.5, 0.3], rare: { 'fire_essence': 0.1, 'thunder_essence': 0.1 } },
  
  // 元素试炼 (每周)
  'element_trial': { weekly_limit: 3, materials: ['fire_essence', 'thunder_essence', 'void_essence', 'jade_essence'], weights: [0.25, 0.25, 0.25, 0.25], rare: { 'fire_spirit': 0.1, 'thunder_spirit': 0.1 } },
  
  // 仙府遗迹 (每周)
  'immortal_ruins': { weekly_limit: 1, materials: ['immortal_iron', 'immortal_jade', 'immortal_stone', 'immortal_core'], weights: [0.25, 0.25, 0.25, 0.25], rare: { 'immortal_spirit': 0.1 } },
  
  // 世界BOSS (每日)
  'world_boss': { daily_limit: 1, guaranteed: ['world_dust'], chance: { 'world_frag': 0.1 } },
  
  // 仙缘触发
  'opportunity': { chance: 0.05, materials: ['spirit_essence', 'jade_essence', 'fire_essence'], weights: [0.6, 0.2, 0.2] },
  
  // 成就奖励
  'achievement': { one_time: true }
};

// ============ 回收系统 ============
const ARTIFACT_RECYCLE = {
  // 基础返还
  base_return: {
    'mortal': { ore: 5, exp: 10 },
    'spirit': { ore: 15, exp: 50, gold: 1 },
    'treasure': { ore: 50, exp: 200, gold: 5, essence: 1 },
    'immortal': { ore: 150, exp: 1000, gold: 15, essence: 5 },
    'divine': { ore: 500, exp: 5000, gold: 50, essence: 20, world_frag: 1 }
  },
  
  // 强化等级加成
  level_bonus: {
    return_rate: 0.1, // 每级返还+10%
    max_bonus: 1.0    // 最高100%加成
  },
  
  // 精炼返还 (返还部分升级材料)
  refine_return: {
    'mortal': 0.3,
    'spirit': 0.5,
    'treasure': 0.7,
    'immortal': 0.9,
    'divine': 1.0
  }
};

// ============ 法宝属性计算 ============
function calculateArtifactStats(artifactId, level, quality) {
  const data = ARTIFACT_DATA[artifactId];
  if (!data) return null;
  
  const q = ARTIFACT_QUALITY[quality] || ARTIFACT_QUALITY.mortal;
  const levelBonus = 1 + level * 0.1;
  
  return {
    atk: Math.floor(data.base_atk * q.exp_factor * levelBonus),
    def: Math.floor(data.base_def * q.exp_factor * levelBonus),
    spiritBonus: (data.spirit_bonus || 0) * levelBonus,
    skill: data.skill,
    skillLevel: level
  };
}

// ============ 法宝升级 ============
async function upgradeArtifact(artifact, materials) {
  const data = ARTIFACT_DATA[artifact.id];
  const q = ARTIFACT_QUALITY[data.quality];
  const maxLevel = q.max_level;
  
  if (artifact.level >= maxLevel) {
    return { success: false, message: '已达最大等级' };
  }
  
  const expNeeded = artifact.level * 100 * q.exp_factor;
  let expGain = 0;
  
  for (const mat of materials) {
    const matData = HEAVEN_TREASURE_DATA[mat.id];
    if (!matData) continue;
    expGain += mat.count * (matData.type === 'ore' ? 10 : 50);
  }
  
  if (expGain < expNeeded) {
    return { success: false, message: `需要 ${expNeeded} 经验，当前 ${expGain}` };
  }
  
  // 调用后端API
  const result = await artifactAPI.upgrade(artifact.id);
  
  if (result.success) {
    // 成功率
    const baseSuccessRate = q.upgrade_rate;
    
    // 检查是否有保底
    const pityInfo = getEnhancePityInfo(artifact);
    let actualSuccessRate = baseSuccessRate;
    let pityMessage = '';
    let isPityTriggered = false;
    
    // 如果触发了保底，100%成功
    if (pityInfo && pityInfo.isPityTriggered) {
      actualSuccessRate = 1.0;
      isPityTriggered = true;
      pityMessage = ' (保底触发！)';
    }
    
    if (Math.random() > actualSuccessRate) {
      // 失败返还部分经验
      artifact.exp = Math.floor(expGain * 0.5);
      
      // 增加保底计数
      if (pityInfo) {
        incrementEnhancePity(artifact, false);
        const newPityInfo = getEnhancePityInfo(artifact);
        if (newPityInfo) {
          pityMessage = ` 距离保底还需${newPityInfo.remainingCount}次`;
        }
      }
      
      return { success: false, message: '升级失败！' + pityMessage, exp: artifact.exp };
    }
    
    artifact.level++;
    artifact.exp = expGain - expNeeded;
    
    // 成功时重置保底计数
    if (pityInfo) {
      incrementEnhancePity(artifact, true);
    }
    
    let successMessage = `🎉 法宝升级到 +${artifact.level} 级！`;
    if (isPityTriggered) {
      successMessage = `🎉 法宝升级到 +${artifact.level} 级！保底已重置！`;
    }
    
    return { success: true, message: successMessage, artifact, isPityTriggered: isPityTriggered };
  }
  
  return result;
}

// ============ 炼器合成 ============
async function forgeArtifact(recipeId) {
  const recipe = FORGING_RECIPES[recipeId];
  if (!recipe) return { success: false, message: '配方不存在' };
  
  const player = gameState.player;
  const inventory = player.artifacts_inventory || {};
  
  // 检查材料
  for (const [mat, count] of Object.entries(recipe.materials)) {
    const has = inventory[mat] || 0;
    if (has < count) {
      return { success: false, message: `材料不足: 需要 ${mat} x${count}` };
    }
  }
  
  // 调用后端API
  const result = await artifactAPI.forge(recipeId);
  
  if (result.success) {
    // 扣除材料
    for (const [mat, count] of Object.entries(recipe.materials)) {
      inventory[mat] -= count;
    }
    
    // 成功率判定
    const roll = Math.random();
    if (roll > recipe.success_rate) {
      player.artifacts_inventory = inventory;
      return { success: false, message: `炼器失败！${recipe.materials[0]} 化为乌有...`, materials_lost: true };
    }
    
    // 成功
    const artifactId = recipeId;
    const newArtifact = {
      id: artifactId,
      level: 1,
      exp: 0,
      quality: recipe.quality,
      bound: true,
      obtainedAt: Date.now()
    };
    
    if (!player.owned_artifacts) player.owned_artifacts = [];
    player.owned_artifacts.push(newArtifact);
    player.artifacts_inventory = inventory;
    
    return { success: true, message: `🎊 炼器成功！获得 ${ARTIFACT_DATA[artifactId].name}`, artifact: newArtifact };
  }
  
  return result;
}

// ============ 回收法宝 ============
async function recycleArtifact(artifact) {
  const data = ARTIFACT_DATA[artifact.id];
  const base = ARTIFACT_RECYCLE.base_return[data.quality];
  
  // 计算返还
  const levelBonus = Math.min(artifact.level * ARTIFACT_RECYCLE.level_bonus.return_rate, ARTIFACT_RECYCLE.level_bonus.max_bonus);
  const returnRate = 1 + levelBonus;
  
  const returns = {
    ore: Math.floor((base.ore || 0) * returnRate),
    exp: Math.floor((base.exp || 0) * returnRate),
    gold: Math.floor((base.gold || 0) * returnRate),
    essence: Math.floor((base.essence || 0) * returnRate),
    world_frag: Math.floor((base.world_frag || 0) * returnRate)
  };
  
  // 调用后端API
  const result = await artifactAPI.recycle(artifact.id);
  
  if (result.success) {
    const player = gameState.player;
    if (!player.artifacts_inventory) player.artifacts_inventory = {};
    
    for (const [item, count] of Object.entries(returns)) {
      if (count > 0) {
        const itemId = item === 'ore' ? 'forging_ore' : item === 'gold' ? 'refined_gold' : item === 'essence' ? 'spirit_essence' : item;
        player.artifacts_inventory[itemId] = (player.artifacts_inventory[itemId] || 0) + count;
      }
    }
    
    // 移除法宝
    const idx = player.owned_artifacts.findIndex(a => a.id === artifact.id && a.obtainedAt === artifact.obtainedAt);
    if (idx >= 0) player.owned_artifacts.splice(idx, 1);
    
    return { success: true, message: `♻️ 回收成功！获得 ${returns.ore} 矿石，${returns.exp} 经验`, returns };
  }
  
  return result;
}

// ============ 使用天材地宝 ============
async function useHeavenTreasure(treasureId) {
  const data = HEAVEN_TREASURE_DATA[treasureId];
  if (!data) return { success: false, message: '物品不存在' };
  
  const player = gameState.player;
  const now = Date.now();
  
  // 检查冷却
  const lastUse = player.treasure_cooldowns?.[treasureId] || 0;
  if (now - lastUse < (data.cooldown || 0) * 1000) {
    const remaining = Math.ceil((data.cooldown * 1000 - (now - lastUse)) / 1000);
    return { success: false, message: `冷却中，${remaining}秒后可使用` };
  }
  
  // 检查物品
  const inventory = player.artifacts_inventory || {};
  if ((inventory[treasureId] || 0) < 1) {
    return { success: false, message: '物品不足' };
  }
  
  // 调用后端API
  const result = await artifactAPI.useTreasure(treasureId);
  
  if (result.success) {
    inventory[treasureId]--;
    
    if (!player.treasure_cooldowns) player.treasure_cooldowns = {};
    player.treasure_cooldowns[treasureId] = now;
    
    // 应用效果
    if (data.effect) {
      if (data.effect.spirit_rate) {
        player.bonuses.heaven_spirit_rate = (player.bonuses.heaven_spirit_rate || 0) + data.effect.spirit_rate;
        setTimeout(() => {
          player.bonuses.heaven_spirit_rate = Math.max(0, (player.bonuses.heaven_spirit_rate || 0) - data.effect.spirit_rate);
        }, data.duration * 1000);
      }
      if (data.effect.atk_boost) {
        player.bonuses.heaven_atk = (player.bonuses.heaven_atk || 0) + data.effect.atk_boost;
        setTimeout(() => {
          player.bonuses.heaven_atk = Math.max(0, (player.bonuses.heaven_atk || 0) - data.effect.atk_boost);
      }, data.duration * 1000);
    }
    if (data.effect.def_boost) {
      player.bonuses.heaven_def = (player.bonuses.heaven_def || 0) + data.effect.def_boost;
      setTimeout(() => {
        player.bonuses.heaven_def = Math.max(0, (player.bonuses.heaven_def || 0) - data.effect.def_boost);
      }, data.duration * 1000);
    }
    if (data.effect.all_stats) {
      player.bonuses.heaven_all = (player.bonuses.heaven_all || 0) + data.effect.all_stats;
      setTimeout(() => {
        player.bonuses.heaven_all = Math.max(0, (player.bonuses.heaven_all || 0) - data.effect.all_stats);
      }, data.duration * 1000);
    }
  }
  
  return { success: true, message: `✨ 使用 ${data.name}！${data.description}`, effect: data.effect, duration: data.duration };
}

// ============ 获取天材地宝 ============
function spawnHeavenTreasure(source) {
  const config = HEAVEN_TREASURE_SPAWN[source];
  if (!config) return null;
  
  const weights = config.weights || [];
  const materials = config.materials || [];
  
  // 基础掉落
  const result = [];
  for (let i = 0; i < materials.length; i++) {
    if (Math.random() < weights[i]) {
      result.push({ id: materials[i], count: 1 });
    }
  }
  
  // 稀有掉落
  if (config.rare) {
    for (const [item, chance] of Object.entries(config.rare)) {
      if (Math.random() < chance) {
        result.push({ id: item, count: 1 });
      }
    }
  }
  
  // 保底
  if (config.guaranteed) {
    for (const item of config.guaranteed) {
      result.push({ id: item, count: 1 });
    }
  }
  
  return result.length > 0 ? result : null;
}

// 导出全局
window.ARTIFACT_QUALITY = ARTIFACT_QUALITY;
window.ARTIFACT_SLOTS = ARTIFACT_SLOTS;
window.ARTIFACT_DATA = ARTIFACT_DATA;
window.ARTIFACT_SKILLS = ARTIFACT_SKILLS;
// ============ 强化保底系统配置 ============
const ENHANCE_PITY_CONFIG = {
  // 强化等级 >= 4 时启用保底
  minPityLevel: 4,
  // 保底配置：等级 -> { 成功率, 保底次数 }
  pityTable: {
    7: { successRate: 0.20, pityCount: 20 },
    8: { successRate: 0.10, pityCount: 30 },
    9: { successRate: 0.05, pityCount: 50 },
    10: { successRate: 0.02, pityCount: 100 }
  }
};

// ============ 获取保底信息 ============
function getEnhancePityInfo(artifact) {
  const level = artifact.level || 1;
  
  // 只有 +4~+10 才有保底
  if (level < ENHANCE_PITY_CONFIG.minPityLevel || level > 10) {
    return null;
  }
  
  const pityData = ENHANCE_PITY_CONFIG.pityTable[level];
  if (!pityData) {
    return null;
  }
  
  // 获取当前保底计数
  const player = gameState.player;
  const pityKey = `artifact_pity_${artifact.id}_${level}`;
  const pityCount = player.enhance_pity?.[pityKey] || 0;
  
  return {
    level: level,
    successRate: pityData.successRate,
    pityCount: pityData.pityCount,
    currentCount: pityCount,
    remainingCount: Math.max(0, pityData.pityCount - pityCount),
    isPityTriggered: pityCount >= pityData.pityCount
  };
}

// ============ 重置保底计数 ============
function resetEnhancePity(artifact) {
  const player = gameState.player;
  if (!player.enhance_pity) {
    player.enhance_pity = {};
  }
  
  const level = artifact.level || 1;
  const pityKey = `artifact_pity_${artifact.id}_${level}`;
  
  // 重置当前等级的保底计数
  player.enhance_pity[pityKey] = 0;
}

// ============ 增加保底计数 ============
function incrementEnhancePity(artifact, success) {
  const player = gameState.player;
  if (!player.enhance_pity) {
    player.enhance_pity = {};
  }
  
  const level = artifact.level || 1;
  const pityKey = `artifact_pity_${artifact.id}_${level}`;
  
  // 如果成功，重置保底计数
  if (success) {
    player.enhance_pity[pityKey] = 0;
  } else {
    // 失败则增加计数
    player.enhance_pity[pityKey] = (player.enhance_pity[pityKey] || 0) + 1;
  }
}

window.FORGING_RECIPES = FORGING_RECIPES;
window.HEAVEN_TREASURE_DATA = HEAVEN_TREASURE_DATA;
window.HEAVEN_TREASURE_SPAWN = HEAVEN_TREASURE_SPAWN;
window.ARTIFACT_RECYCLE = ARTIFACT_RECYCLE;
window.ENHANCE_PITY_CONFIG = ENHANCE_PITY_CONFIG;
window.getEnhancePityInfo = getEnhancePityInfo;
window.resetEnhancePity = resetEnhancePity;
window.incrementEnhancePity = incrementEnhancePity;
window.calculateArtifactStats = calculateArtifactStats;
window.upgradeArtifact = upgradeArtifact;
window.forgeArtifact = forgeArtifact;
window.recycleArtifact = recycleArtifact;
window.useHeavenTreasure = useHeavenTreasure;
window.spawnHeavenTreasure = spawnHeavenTreasure;

// ==================== 强化系统 ====================

// 强化配置
const ENHANCE_CONFIG = {
  // 强化成功率（按等级）
  success_rate: {
    1: 100, 2: 100, 3: 100, 4: 100, 5: 100,  // +1~+5: 100%
    6: 90, 7: 85, 8: 80, 9: 75, 10: 70,        // +6~+10: 90%~70%
    11: 60, 12: 55, 13: 50, 14: 45, 15: 40,    // +11~+15: 60%~40%
    16: 35, 17: 30, 18: 25, 19: 20, 20: 15    // +16~+20: 35%~15%
  },
  
  // 强化费用（按等级）
  enhance_cost: {
    1: 50, 2: 100, 3: 200, 4: 400, 5: 800,
    6: 1600, 7: 3200, 8: 6400, 9: 12800, 10: 25600,
    11: 51200, 12: 100000, 13: 200000, 14: 400000, 15: 800000,
    16: 1600000, 17: 3200000, 18: 6400000, 19: 12800000, 20: 25600000
  },
  
  // 强化保底次数（失败多少次后必成功）
  pity_count: {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
    6: 3, 7: 5, 8: 7, 9: 10, 10: 15,
    11: 20, 12: 30, 13: 40, 14: 60, 15: 80,
    16: 100, 17: 150, 18: 200, 19: 300, 20: 500
  },
  
  // 强化属性加成（每级）
  stat_bonus: {
    atk: 0.1,    // 攻击+10%/级
    def: 0.1,    // 防御+10%/级
    hp: 0.15,    // 生命+15%/级
    crit: 0.02,  // 暴击+2%/级
    dodge: 0.02  // 闪避+2%/级
  },
  
  // 保护符消耗（使用后失败不降级）
  protect_item: {
    'protect_scroll': { name: '保护符', cost: 1000, desc: '失败不降级' },
    'advanced_protect': { name: '高级保护符', cost: 5000, desc: '失败返还材料' }
  }
};

// 玩家强化数据
const enhanceData = {
  pityCounter: {},  // 保底计数器 { artifactId: count }
  enhanceHistory: [] // 强化历史
};

// 强化法宝
function enhanceArtifact(artifactId, useProtect = false) {
  const player = gameState.player;
  const artifact = player.owned_artifacts?.find(a => a.id === artifactId);
  
  if (!artifact) {
    return { success: false, message: '法宝不存在' };
  }
  
  const currentLevel = artifact.enhance_level || 0;
  const nextLevel = currentLevel + 1;
  
  // 检查是否达到最高强化等级
  if (currentLevel >= 20) {
    return { success: false, message: '已达到最高强化等级(+20)' };
  }
  
  // 获取强化配置
  const successRate = ENHANCE_CONFIG.success_rate[currentLevel] || 10;
  const cost = ENHANCE_CONFIG.enhance_cost[currentLevel] || 100;
  const pityCount = ENHANCE_CONFIG.pity_count[currentLevel] || 0;
  
  // 检查灵石
  if (player.spiritStones < cost) {
    return { success: false, message: `需要 ${cost} 灵石` };
  }
  
  // 检查保护符
  if (useProtect) {
    const protectItem = player.artifacts_inventory?.['protect_scroll'] || 0;
    if (protectItem <= 0) {
      return { success: false, message: '没有保护符' };
    }
    player.artifacts_inventory['protect_scroll']--;
  }
  
  // 扣除灵石
  player.spiritStones -= cost;
  
  // 检查保底
  const pityCounter = enhanceData.pityCounter[artifactId] || 0;
  const isPity = pityCounter >= pityCount && pityCount > 0;
  
  // 计算成功率
  let finalSuccessRate = successRate;
  if (isPity) {
    finalSuccessRate = 100; // 保底必成功
    enhanceData.pityCounter[artifactId] = 0; // 重置计数器
  }
  
  // 随机判定
  const roll = Math.random() * 100;
  const isSuccess = roll < finalSuccessRate;
  
  // 记录强化历史
  enhanceData.enhanceHistory.push({
    artifactId,
    level: currentLevel,
    result: isSuccess ? 'success' : 'fail',
    time: Date.now()
  });
  
  if (isSuccess) {
    // 强化成功
    artifact.enhance_level = nextLevel;
    
    // 计算属性加成
    const statBonus = {};
    for (const [stat, bonus] of Object.entries(ENHANCE_CONFIG.stat_bonus)) {
      statBonus[stat] = bonus * nextLevel;
    }
    artifact.enhance_bonus = statBonus;
    
    addLog(`✨ 强化成功！${artifact.name} → +${nextLevel}`, 'success');
    
    return {
      success: true,
      message: `强化成功！+${nextLevel}`,
      level: nextLevel,
      stats: statBonus
    };
  } else {
    // 强化失败
    if (useProtect) {
      // 使用保护符，不降级
      addLog(`💪 强化失败，但保护符发挥了作用，等级保住了(+${currentLevel})`, 'warning');
    } else {
      // 降级
      artifact.enhance_level = Math.max(0, currentLevel - 1);
      enhanceData.pityCounter[artifactId] = pityCounter + 1;
      
      addLog(`❌ 强化失败，${artifact.name} 降至 +${artifact.enhance_level}`, 'error');
    }
    
    return {
      success: false,
      message: useProtect ? '强化失败，等级保留' : `强化失败，降至 +${artifact.enhance_level}`,
      level: artifact.enhance_level,
      pityCount: pityCount + 1,
      pityRequired: pityCount
    };
  }
}

// 获取强化信息
function getEnhanceInfo(artifactId) {
  const player = gameState.player;
  const artifact = player.owned_artifacts?.find(a => a.id === artifactId);
  
  if (!artifact) {
    return null;
  }
  
  const currentLevel = artifact.enhance_level || 0;
  const nextLevel = currentLevel + 1;
  
  if (currentLevel >= 20) {
    return { maxLevel: true };
  }
  
  const successRate = ENHANCE_CONFIG.success_rate[currentLevel] || 10;
  const cost = ENHANCE_CONFIG.enhance_cost[currentLevel] || 100;
  const pityCount = ENHANCE_CONFIG.pity_count[currentLevel] || 0;
  const pityCounter = enhanceData.pityCounter[artifactId] || 0;
  
  // 计算下级属性加成
  const nextBonus = {};
  for (const [stat, bonus] of Object.entries(ENHANCE_CONFIG.stat_bonus)) {
    nextBonus[stat] = bonus;
  }
  
  return {
    artifactId,
    currentLevel,
    nextLevel,
    successRate,
    cost,
    pityCount,
    pityCounter,
    pityProgress: pityCount > 0 ? `${pityCounter}/${pityCount}` : '无保底',
    nextBonus,
    isPity: pityCounter >= pityCount && pityCount > 0
  };
}

// 批量强化
function batchEnhance(artifactId, count = 10) {
  const results = [];
  let totalCost = 0;
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < count; i++) {
    const result = enhanceArtifact(artifactId, false);
    results.push(result);
    
    if (result.success) {
      successCount++;
      if (result.level >= 20) break; // 满级停止
    } else {
      failCount++;
    }
    totalCost += result.cost || 0;
    
    // 检查灵石是否足够
    if (gameState.player.spiritStones < ENHANCE_CONFIG.enhance_cost[result.level || 0]) {
      break;
    }
  }
  
  addLog(`⚡ 批量强化完成: 成功${successCount}次, 失败${failCount}次, 消耗${totalCost}灵石`, 'info');
  
  return {
    totalCost,
    successCount,
    failCount,
    results
  };
}

// 获取强化历史
function getEnhanceHistory(limit = 20) {
  return enhanceData.enhanceHistory.slice(-limit).reverse();
}

// 强化转移（将装备强化等级转移到新装备）
function transferEnhance(sourceId, targetId) {
  const player = gameState.player;
  const source = player.owned_artifacts?.find(a => a.id === sourceId);
  const target = player.owned_artifacts?.find(a => a.id === targetId);
  
  if (!source || !target) {
    return { success: false, message: '法宝不存在' };
  }
  
  if (!source.enhance_level || source.enhance_level <= 0) {
    return { success: false, message: '源法宝没有强化等级' };
  }
  
  if (target.enhance_level >= 20) {
    return { success: false, message: '目标法宝已达满级' };
  }
  
  // 消耗转移石
  const transferStone = player.artifacts_inventory?.['transfer_stone'] || 0;
  if (transferStone < 1) {
    return { success: false, message: '需要转移石' };
  }
  
  player.artifacts_inventory['transfer_stone']--;
  
  // 转移强化等级
  const transferLevel = source.enhance_level;
  target.enhance_level = (target.enhance_level || 0) + transferLevel;
  target.enhance_bonus = { ...source.enhance_bonus };
  
  // 源法宝清空强化
  source.enhance_level = 0;
  source.enhance_bonus = null;
  
  addLog(`🔄 强化等级转移成功: ${source.name} → ${target.name} (+${transferLevel})`, 'success');
  
  return {
    success: true,
    message: `转移成功，+${transferLevel}级`,
    level: transferLevel
  };
}

// 导出强化系统
window.ENHANCE_CONFIG = ENHANCE_CONFIG;
window.enhanceData = enhanceData;
window.enhanceArtifact = enhanceArtifact;
window.getEnhanceInfo = getEnhanceInfo;
window.batchEnhance = batchEnhance;
window.getEnhanceHistory = getEnhanceHistory;
window.transferEnhance = transferEnhance;

console.log('⚡ 强化系统已加载 - 含保底机制');
