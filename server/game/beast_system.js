/**
 * 灵兽系统 v5.0 (养成优化版)
 * 捕捉/培养/协同战斗
 * 数值优化：基础属性提升50%，增加境界加成
 */

const BEAST_DATA = {
  // 灵兽类型 (养成优化版 - 属性提升50%)
  'spirit_beast': {
    name: '灵狐', type: 'beast', quality: 'common',
    base_atk: 15, base_hp: 75, growth_atk: 3, growth_hp: 15,  // +50%
    skill: 'spirit_bite', skill_name: '灵气撕咬', description: '普通攻击',
    capture_rate: 0.5, habitat: 'forest'
  },
  'thunder_beast': {
    name: '雷鹰', type: 'beast', quality: 'uncommon',
    base_atk: 45, base_hp: 180, growth_atk: 8, growth_hp: 30,  // +50%
    skill: 'thunder_claw', skill_name: '雷爪', description: '高伤害攻击',
    capture_rate: 0.3, habitat: 'mountain'
  },
  'flame_beast': {
    name: '火麒麟', type: 'beast', quality: 'rare',
    base_atk: 120, base_hp: 450, growth_atk: 18, growth_hp: 75,  // +50%
    skill: 'flame_breath', skill_name: '火焰吐息', description: '范围伤害',
    capture_rate: 0.15, habitat: 'volcano'
  },
  'ice_beast': {
    name: '冰凤凰', type: 'beast', quality: 'epic',
    base_atk: 300, base_hp: 1200, growth_atk: 45, growth_hp: 180,  // +50%
    skill: 'ice_freeze', skill_name: '冰封', description: '冰冻敌人',
    capture_rate: 0.08, habitat: 'ice_plain'
  },
  'divine_beast': {
    name: '神龙', type: 'beast', quality: 'legendary',
    base_atk: 750, base_hp: 3000, growth_atk: 120, growth_hp: 450,  // +50%
    skill: 'dragon_roar', skill_name: '龙吟', description: '终极技能',
    capture_rate: 0.03, habitat: 'sky'
  },
  'primordial_beast': {
    name: '混沌兽', type: 'beast', quality: 'mythical',
    base_atk: 2250, base_hp: 9000, growth_atk: 300, growth_hp: 1200,  // +50%
    skill: 'chaos_annihilation', skill_name: '混沌灭世', description: '毁天灭地',
    capture_rate: 0.01, habitat: 'void'
  }
};
    skill: 'chaos_annihilation', skill_name: '混沌灭世', description: '毁天灭地',
    capture_rate: 0.01, habitat: 'void'
  }
};

const BEAST_QUALITY = {
  common: { name: '普通', color: '#8B8B8B', capture_bonus: 1.0 },
  uncommon: { name: '优秀', color: '#00FF7F', capture_bonus: 1.2 },
  rare: { name: '稀有', color: '#1E90FF', capture_bonus: 1.5 },
  epic: { name: '史诗', color: '#9932CC', capture_bonus: 2.0 },
  legendary: { name: '传说', color: '#FFD700', capture_bonus: 3.0 },
  mythical: { name: '神话', color: '#FF4500', capture_bonus: 5.0 }
};

const BEAST_SKILLS = {
  'spirit_bite': { name: '灵气撕咬', damage: 1.2, effect: null },
  'thunder_claw': { name: '雷爪', damage: 1.5, effect: 'stun' },
  'flame_breath': { name: '火焰吐息', damage: 1.8, effect: 'burn' },
  'ice_freeze': { name: '冰封', damage: 1.3, effect: 'freeze' },
  'dragon_roar': { name: '龙吟', damage: 2.5, effect: 'fear' },
  'chaos_annihilation': { name: '混沌灭世', damage: 5.0, effect: 'chaos' }
};

// 灵兽升级经验曲线
const BEAST_EXP_CURVE = level => Math.floor(100 * Math.pow(1.5, level));

// 灵兽心情系统
const BEAST_MOOD = {
  happy: { bonus: 1.3, name: '开心' },
  normal: { bonus: 1.0, name: '普通' },
  sad: { bonus: 0.7, name: '低落' },
  angry: { bonus: 0.5, name: '愤怒' }
};

// 灵兽亲密度系统
const BEAST_AFFECTION = {
  love: { threshold: 100, bonus: 1.5, name: '生死与共' },
  close: { threshold: 70, bonus: 1.3, name: '亲密' },
  friendly: { threshold: 40, bonus: 1.1, name: '友好' },
  neutral: { threshold: 10, bonus: 1.0, name: '陌生' },
  hostile: { threshold: 0, bonus: 0.5, name: '敌对' }
};

// ============ 捕捉灵兽 ============
async function captureBeast(beastId) {
  const player = gameState.player;
  const data = BEAST_DATA[beastId];
  if (!data) return { success: false, message: '灵兽不存在' };
  
  // 检查是否有空位
  if (!player.beasts) player.beasts = [];
  if (player.beasts.length >= (player.beast_slots || 5)) {
    return { success: false, message: '灵兽栏已满' };
  }
  
  // 捕捉成功率
  const baseRate = data.capture_rate || 0.3;
  const realmBonus = player.realmLevel * 0.02;
  const toolBonus = (player.capture_tool === beastId) ? 0.2 : 0;
  const rate = Math.min(0.8, (baseRate + realmBonus + toolBonus) * (BEAST_QUALITY[data.quality]?.capture_bonus || 1));
  
  if (Math.random() > rate) {
    return { success: false, message: `捕捉${data.name}失败！它逃走了` };
  }
  
  // 调用后端API
  const result = await beastAPI.capture(beastId);
  
  if (result.success) {
    // 成功捕捉
    const newBeast = {
      id: beastId,
      level: 1,
      exp: 0,
      affection: 50,  // 初始亲密度
      mood: 'normal',
      mood_timer: 0,
      equip: null,
      obtainedAt: Date.now()
    };
    
    player.beasts.push(newBeast);
    gameState.stats.beastsCaptured = (gameState.stats.beastsCaptured || 0) + 1;
  }
  
  return result;
}

// ============ 灵兽升级 ============
async function levelupBeast(beastIndex) {
  const player = gameState.player;
  if (!player.beasts || !player.beasts[beastIndex]) {
    return { success: false, message: '灵兽不存在' };
  }
  
  const beast = player.beasts[beastIndex];
  const data = BEAST_DATA[beast.id];
  const expNeeded = BEAST_EXP_CURVE(beast.level);
  
  if (beast.exp < expNeeded) {
    return { success: false, message: `需要 ${expNeeded} 经验，当前 ${beast.exp}` };
  }
  
  // 调用后端API
  const result = await beastAPI.levelUp(beastIndex);
  
  if (result.success) {
    beast.exp -= expNeeded;
    beast.level++;
  }
  
  return result;
}

// ============ 灵兽战斗 ============
async function beastAttack(beastIndex) {
  const player = gameState.player;
  if (!player.beasts || !player.beasts[beastIndex]) {
    return { success: false, message: '灵兽不存在' };
  }
  
  const beast = player.beasts[beastIndex];
  const data = BEAST_DATA[beast.id];
  const skill = BEAST_SKILLS[data.skill];
  
  // 调用后端API
  const result = await beastAPI.attack(beastIndex);
  
  if (result.success) {
    // 计算伤害
    const baseAtk = data.base_atk + (beast.level - 1) * data.growth_atk;
    const moodBonus = BEAST_MOOD[beast.mood]?.bonus || 1;
    const affectionData = Object.values(BEAST_AFFECTION).reverse().find(a => beast.affection >= a.threshold);
    const affectionBonus = affectionData?.bonus || 1;
    
    const damage = Math.floor(baseAtk * skill.damage * moodBonus * affectionBonus);
    
    // 亲密度变化
    if (Math.random() < 0.3) {
      beast.affection = Math.min(100, beast.affection + 2);
    }
    
    return { 
      success: true, 
      damage, 
      skill: skill.name,
      effect: skill.effect,
      message: `${data.name} 使用${skill.name}，造成 ${damage} 伤害！`
    };
  }
  
  return result;
}

// ============ 灵兽心情 ============
function updateBeastMood() {
  const player = gameState.player;
  if (!player.beasts) return;
  
  const now = Date.now();
  for (const beast of player.beasts) {
    // 每小时更新一次心情
    if (!beast.mood_timer || now - beast.mood_timer > 3600000) {
      const rand = Math.random();
      if (rand < 0.2) beast.mood = 'happy';
      else if (rand < 0.6) beast.mood = 'normal';
      else if (rand < 0.85) beast.mood = 'sad';
      else beast.mood = 'angry';
      
      beast.mood_timer = now;
    }
  }
}

// ============ 灵兽放生 ============
async function releaseBeast(beastIndex) {
  const player = gameState.player;
  if (!player.beasts || !player.beasts[beastIndex]) {
    return { success: false, message: '灵兽不存在' };
  }
  
  const beast = player.beasts[beastIndex];
  const data = BEAST_DATA[beast.id];
  
  // 调用后端API
  const result = await beastAPI.release(beastIndex);
  
  if (result.success) {
    // 传说及以上返还道具
    if (data.quality === 'legendary' || data.quality === 'mythical') {
      if (!player.artifacts_inventory) player.artifacts_inventory = {};
      player.artifacts_inventory['beast_soul'] = (player.artifacts_inventory['beast_soul'] || 0) + 1;
    }
    
    player.beasts.splice(beastIndex, 1);
  }
  
  return result;
}

// ============ 灵兽亲密度 ============
async function feedBeast(beastIndex, foodId) {
  const player = gameState.player;
  if (!player.beasts || !player.beasts[beastIndex]) {
    return { success: false, message: '灵兽不存在' };
  }
  
  const beast = player.beasts[beastIndex];
  const data = BEAST_DATA[beast.id];
  
  const foods = {
    'beast_food': { affection: 10, cost: 10 },
    'beast_treat': { affection: 30, cost: 50 },
    'beast_meat': { affection: 50, cost: 200 },
    'divine_food': { affection: 100, cost: 1000 }
  };
  
  const food = foods[foodId];
  if (!food) return { success: false, message: '饲料不存在' };
  
  if (player.spiritStones < food.cost) {
    return { success: false, message: `需要 ${food.cost} 灵石` };
  }
  
  // 调用后端API
  const result = await beastAPI.feed(beastIndex, foodId);
  
  if (result.success) {
    player.spiritStones -= food.cost;
    beast.affection = Math.min(100, beast.affection + food.affection);
    
    // 心情变好
    if (beast.mood === 'sad') beast.mood = 'normal';
    else if (beast.mood === 'angry') beast.mood = 'sad';
  }
  
  return result;
}

// ============ 灵兽属性计算 ============
function calculateBeastStats(beastIndex) {
  const player = gameState.player;
  if (!player.beasts || !player.beasts[beastIndex]) return null;
  
  const beast = player.beasts[beastIndex];
  const data = BEAST_DATA[beast.id];
  if (!data) return null;
  
  const affectionData = Object.values(BEAST_AFFECTION).reverse().find(a => beast.affection >= a.threshold);
  const moodBonus = BEAST_MOOD[beast.mood]?.bonus || 1;
  // 境界加成：每个境界等级+5%属性
  const realmBonus = 1 + (player.realmLevel || 0) * 0.05;
  
  return {
    atk: Math.floor((data.base_atk + (beast.level - 1) * data.growth_atk) * affectionData.bonus * moodBonus * realmBonus),
    hp: Math.floor((data.base_hp + (beast.level - 1) * data.growth_hp) * affectionData.bonus * moodBonus * realmBonus),
    level: beast.level,
    affection: beast.affection,
    mood: beast.mood,
    skill: data.skill_name,
    realmBonus: realmBonus
  };
}

// ============ 刷新灵兽列表 ============
async function refreshBeasts() {
  const result = await beastAPI.getList();
  if (result.success && result.beasts) {
    const player = gameState.player;
    player.beasts = result.beasts;
  }
  return result;
}

// 导出
window.BEAST_DATA = BEAST_DATA;
window.BEAST_QUALITY = BEAST_QUALITY;
window.BEAST_SKILLS = BEAST_SKILLS;
window.captureBeast = captureBeast;
window.levelupBeast = levelupBeast;
window.beastAttack = beastAttack;
window.updateBeastMood = updateBeastMood;
window.releaseBeast = releaseBeast;
window.feedBeast = feedBeast;
window.calculateBeastStats = calculateBeastStats;
window.refreshBeasts = refreshBeasts;

console.log('🦊 灵兽系统 v5.0 (养成优化版) 已加载');
