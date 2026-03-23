/**
 * 宗门系统 v4.0 (单机版)
 * 创建门派/招收弟子/传承功法
 */

const SECT_DATA = {
  // 宗门类型
  'tianjian': {
    name: '天剑宗', type: 'sword',
    bonus_atk: 0.2, bonus_def: 0.1, bonus_spirit: 0.1,
    description: '剑修圣地，攻击加成'
  },
  'tiandao': {
    name: '天道宫', type: 'dao',
    bonus_atk: 0.1, bonus_def: 0.2, bonus_spirit: 0.15,
    description: '道法自然，全面加成'
  },
  'buddha': {
    name: '大佛寺', type: 'buddha',
    bonus_atk: 0.1, bonus_def: 0.3, bonus_spirit: 0.05,
    description: '佛门圣地，防御无双'
  },
  'demon': {
    name: '魔渊', type: 'demon',
    bonus_atk: 0.3, bonus_def: 0.05, bonus_spirit: 0.1,
    description: '魔道凶险，攻击至上'
  },
  'immortal': {
    name: '逍遥仙府', type: 'immortal',
    bonus_atk: 0.15, bonus_def: 0.15, bonus_spirit: 0.25,
    description: '逍遥自在，灵气无双'
  }
};

// 宗门建筑
const SECT_BUILDINGS = {
  'mountain_gate': { name: '山门', max_level: 10, cost_factor: 1.5, effect: { type: 'disciple_cap', value: 2 } },
  'main_hall': { name: '主殿', max_level: 10, cost_factor: 1.8, effect: { type: 'all_bonus', value: 0.05 } },
  'training_field': { name: '练功场', max_level: 10, cost_factor: 1.6, effect: { type: 'exp_bonus', value: 0.1 } },
  'meditation_room': { name: '静修室', max_level: 10, cost_factor: 1.6, effect: { type: 'spirit_bonus', value: 0.1 } },
  'treasure_pavilion': { name: '藏宝阁', max_level: 10, cost_factor: 2.0, effect: { type: 'drop_bonus', value: 0.15 } },
  'arena': { name: '竞技场', max_level: 10, cost_factor: 1.7, effect: { type: 'pvp_bonus', value: 0.1 } }
};

// 弟子职业
const DISCIPLE_CLASS = {
  'sword_disciple': { name: '剑修', atk_ratio: 1.5, def_ratio: 0.8, spirit_ratio: 1.0 },
  'dao_disciple': { name: '法修', atk_ratio: 1.2, def_ratio: 0.7, spirit_ratio: 1.5 },
  'body_disciple': { name: '体修', atk_ratio: 1.0, def_ratio: 1.5, spirit_ratio: 0.8 },
  'healer': { name: '医师', atk_ratio: 0.6, def_ratio: 1.0, spirit_ratio: 1.3 }
};

// 宗门技能
const SECT_TECH = {
  'sword_boost': { name: '剑意冲天', type: 'atk', value: 0.2, cost: 1000, req_sect_level: 3 },
  'defense_boost': { name: '铜墙铁壁', type: 'def', value: 0.2, cost: 1000, req_sect_level: 3 },
  'spirit_boost': { name: '灵气汇聚', type: 'spirit', value: 0.2, cost: 1000, req_sect_level: 5 },
  'luck_boost': { name: '福源深厚', type: 'luck', value: 0.3, cost: 2000, req_sect_level: 7 },
  'realm_accel': { name: '境界顿悟', type: 'realm_speed', value: 0.5, cost: 5000, req_sect_level: 10 }
};

// ============ 创建宗门 ============
function createSect(sectType) {
  const player = gameState.player;
  if (player.sect) {
    return { success: false, message: '已有宗门' };
  }
  
  const data = SECT_DATA[sectType];
  if (!data) {
    return { success: false, message: '宗门类型不存在' };
  }
  
  if (player.spiritStones < 1000) {
    return { success: false, message: '需要 1000 灵石创建宗门' };
  }
  
  // 直接创建（单机模式）
  player.spiritStones -= 1000;
  player.sect = {
    type: sectType,
    name: data.name,
    level: 1,
    exp: 0,
    buildings: {},
    disciples: [],
    techs: [],
    contribution: 0,
    createdAt: Date.now()
  };
  
  gameState.stats.sectsCreated = (gameState.stats.sectsCreated || 0) + 1;
  
  return { success: true, message: `成功创建 ${data.name}！` };
}

// ============ 升级宗门 ============
function upgradeSect() {
  const player = gameState.player;
  if (!player.sect) {
    return { success: false, message: '没有宗门' };
  }
  
  const expNeeded = player.sect.level * 5000;
  if (player.sect.exp < expNeeded) {
    return { success: false, message: `需要 ${expNeeded} 宗门经验，当前 ${player.sect.exp}` };
  }
  
  player.sect.exp -= expNeeded;
  player.sect.level++;
  
  return { success: true, message: `宗门升级到 Lv.${player.sect.level}！` };
}

// ============ 宗门建筑 ============
function upgradeSectBuilding(buildingId) {
  const player = gameState.player;
  if (!player.sect) return { success: false, message: '没有宗门' };
  
  const data = SECT_BUILDINGS[buildingId];
  if (!data) return { success: false, message: '建筑不存在' };
  
  const current = player.sect.buildings[buildingId] || 0;
  if (current >= data.max_level) return { success: false, message: '已满级' };
  
  const cost = Math.floor(500 * Math.pow(data.cost_factor, current));
  if (player.spiritStones < cost) return { success: false, message: `需要 ${cost} 灵石` };
  
  player.spiritStones -= cost;
  player.sect.buildings[buildingId] = current + 1;
  
  return { success: true, message: `${data.name} 升级到 Lv.${current + 1}！` };
}

// ============ 招收弟子 ============
function recruitSectDisciple(classType) {
  const player = gameState.player;
  if (!player.sect) return { success: false, message: '没有宗门' };
  
  const classData = DISCIPLE_CLASS[classType];
  if (!classData) return { success: false, message: '弟子类型不存在' };
  
  const discipleCap = 5 + (player.sect.buildings.mountain_gate || 0) * 2;
  if (player.sect.disciples.length >= discipleCap) {
    return { success: false, message: `宗门最多 ${discipleCap} 名弟子` };
  }
  
  const cost = Math.floor(500 * Math.pow(1.5, player.sect.disciples.length));
  if (player.spiritStones < cost) return { success: false, message: `需要 ${Math.floor(cost)} 灵石` };
  
  player.spiritStones -= Math.floor(cost);
  
  const disciple = {
    class: classType,
    name: generateDiscipleName(),
    level: 1,
    cultivation: 0,
    loyalty: 50,
    assigned: null,
    obtainedAt: Date.now()
  };
  
  player.sect.disciples.push(disciple);
  
  return { success: true, message: `成功招收弟子 ${disciple.name}！` };
}

// ============ 弟子修炼 ============
function trainDisciple(discipleIndex) {
  const player = gameState.player;
  if (!player.sect || !player.sect.disciples[discipleIndex]) {
    return { success: false, message: '弟子不存在' };
  }
  
  const disciple = player.sect.disciples[discipleIndex];
  const classData = DISCIPLE_CLASS[disciple.class];
  
  // 弟子自动修炼产出
  const baseExp = 10 * player.sect.level;
  const classBonus = classData.spirit_ratio;
  const exp = Math.floor(baseExp * classBonus);
  
  disciple.cultivation += exp;
  disciple.loyalty = Math.max(0, disciple.loyalty - 1);
  
  // 升级
  if (disciple.cultivation >= disciple.level * 100) {
    disciple.cultivation -= disciple.level * 100;
    disciple.level++;
    return { success: true, message: `弟子 ${disciple.name} 升级到 Lv.${disciple.level}！`, leveled: true };
  }
  
  return { success: true, message: `弟子 ${disciple.name} 修炼获得 ${exp} 修为` };
}

// ============ 宗门技能 ============
function learnSectTech(techId) {
  const player = gameState.player;
  if (!player.sect) return { success: false, message: '没有宗门' };
  
  const tech = SECT_TECH[techId];
  if (!tech) return { success: false, message: '技能不存在' };
  
  if (player.sect.level < tech.req_sect_level) {
    return { success: false, message: `需要宗门 Lv.${tech.req_sect_level}` };
  }
  
  if (player.sect.techs && player.sect.techs.includes(techId)) {
    return { success: false, message: '已学会此技能' };
  }
  
  if (player.spiritStones < tech.cost) {
    return { success: false, message: `需要 ${tech.cost} 灵石` };
  }
  
  player.spiritStones -= tech.cost;
  player.sect.techs = player.sect.techs || [];
  player.sect.techs.push(techId);
  
  return { success: true, message: `学会 ${tech.name}！` };
}

// ============ 宗门贡献 ============
function donateToSect(amount) {
  const player = gameState.player;
  if (!player.sect) return { success: false, message: '没有宗门' };
  
  if (player.spiritStones < amount) {
    return { success: false, message: '灵石不足' };
  }
  
  player.spiritStones -= amount;
  player.sect.contribution = (player.sect.contribution || 0) + Math.floor(amount / 10);
  
  return { success: true, message: `捐献 ${amount} 灵石，获得 ${Math.floor(amount / 10)} 贡献度` };
}

// ============ 离开宗门 ============
function leaveSect() {
  const player = gameState.player;
  if (!player.sect) return { success: false, message: '没有宗门' };
  
  player.sect = null;
  
  return { success: true, message: '已离开宗门' };
}

// ============ 宗门加成计算 ============
function getSectBonus() {
  const player = gameState.player;
  if (!player.sect) return { atk: 1, def: 1, spirit: 1, exp: 1, drop: 1 };
  
  const sectData = SECT_DATA[player.sect.type];
  let bonus = {
    atk: 1 + (sectData.bonus_atk || 0),
    def: 1 + (sectData.bonus_def || 0),
    spirit: 1 + (sectData.bonus_spirit || 0),
    exp: 1,
    drop: 1
  };
  
  // 建筑加成
  for (const [bid, lvl] of Object.entries(player.sect.buildings || {})) {
    const building = SECT_BUILDINGS[bid];
    if (!building) continue;
    const effect = building.effect;
    if (effect.type === 'all_bonus') {
      bonus.atk += effect.value * lvl;
      bonus.def += effect.value * lvl;
    }
    if (effect.type === 'exp_bonus') bonus.exp += effect.value * lvl;
    if (effect.type === 'drop_bonus') bonus.drop += effect.value * lvl;
    if (effect.type === 'spirit_bonus') bonus.spirit += effect.value * lvl;
    if (effect.type === 'pvp_bonus') bonus.atk += effect.value * lvl;
  }
  
  // 技能加成
  for (const techId of player.sect.techs || []) {
    const tech = SECT_TECH[techId];
    if (!tech) continue;
    if (tech.type === 'atk') bonus.atk += tech.value;
    if (tech.type === 'def') bonus.def += tech.value;
    if (tech.type === 'spirit') bonus.spirit += tech.value;
    if (tech.type === 'luck') bonus.drop += tech.value;
  }
  
  return bonus;
}

// ============ 随机弟子名 ============
function generateDiscipleName() {
  const surnames = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴'];
  const names = ['云', '风', '山', '水', '火', '雷', '剑', '道', '心', '悟'];
  return surnames[Math.floor(Math.random() * surnames.length)] + names[Math.floor(Math.random() * names.length)];
}

// ============ 宗门任务系统 ============
const SECT_QUESTS = {
  'collect_spirit': {
    id: 'collect_spirit',
    name: '收集灵气',
    desc: '在宗门修炼时收集灵气',
    type: 'daily',
    target: 1000,
    reward: { spiritStones: 50, contribution: 10 },
    progressType: 'spirit'
  },
  'train_disciple': {
    id: 'train_disciple',
    name: '指导弟子',
    desc: '让弟子修炼提升修为',
    type: 'daily',
    target: 5,
    reward: { spiritStones: 100, contribution: 20 },
    progressType: 'disciple_train'
  },
  'defend_sect': {
    id: 'defend_sect',
    name: '宗门守护',
    desc: '击退入侵的敌人',
    type: 'daily',
    target: 3,
    reward: { spiritStones: 150, contribution: 30 },
    progressType: 'enemy_defeat'
  },
  'donate_resource': {
    id: 'donate_resource',
    name: '资源捐献',
    desc: '向宗门捐献灵石',
    type: 'daily',
    target: 500,
    reward: { spiritStones: 25, contribution: 50 },
    progressType: 'donate'
  },
  'upgrade_building': {
    id: 'upgrade_building',
    name: '建筑升级',
    desc: '升级宗门建筑',
    type: 'daily',
    target: 1,
    reward: { spiritStones: 200, contribution: 40 },
    progressType: 'building_upgrade'
  },
  'recruit_disciple': {
    id: 'recruit_disciple',
    name: '招收新人',
    desc: '招收新的弟子加入宗门',
    type: 'weekly',
    target: 2,
    reward: { spiritStones: 300, contribution: 60 },
    progressType: 'disciple_recruit'
  },
  'sect_battle': {
    id: 'sect_battle',
    name: '宗门试炼',
    desc: '参与宗门战斗演练',
    type: 'weekly',
    target: 5,
    reward: { spiritStones: 500, contribution: 100 },
    progressType: 'battle'
  }
};

// ============ 初始化宗门任务 ============
function initSectQuests() {
  const player = gameState.player;
  if (!player.sect) return;
  
  if (!player.sect.quests) {
    player.sect.quests = {};
    // 初始化每日任务
    for (const [id, quest] of Object.entries(SECT_QUESTS)) {
      if (quest.type === 'daily') {
        player.sect.quests[id] = {
          id: id,
          progress: 0,
          completed: false,
          claimed: false,
          resetAt: getDailyResetTime()
        };
      }
    }
  }
  
  // 检查是否需要重置每日任务
  const now = Date.now();
  for (const [id, questData] of Object.entries(player.sect.quests)) {
    const quest = SECT_QUESTS[id];
    if (!quest) continue;
    
    if (quest.type === 'daily' && questData.resetAt && now > questData.resetAt) {
      // 重置任务
      player.sect.quests[id] = {
        id: id,
        progress: 0,
        completed: false,
        claimed: false,
        resetAt: getDailyResetTime()
      };
    }
  }
}

// ============ 更新任务进度 ============
function updateSectQuestProgress(type, amount) {
  const player = gameState.player;
  if (!player.sect || !player.sect.quests) return;
  
  for (const [id, questData] of Object.entries(player.sect.quests)) {
    const quest = SECT_QUESTS[id];
    if (!quest || quest.progressType !== type) continue;
    if (questData.completed || questData.claimed) continue;
    
    questData.progress = (questData.progress || 0) + amount;
    
    if (questData.progress >= quest.target) {
      questData.progress = quest.target;
      questData.completed = true;
      addLog(`🎯 宗门任务[${quest.name}]已完成！`, 'success');
    }
  }
}

// ============ 领取任务奖励 ============
function claimSectQuestReward(questId) {
  const player = gameState.player;
  if (!player.sect || !player.sect.quests) {
    return { success: false, message: '没有宗门' };
  }
  
  const questData = player.sect.quests[questId];
  const quest = SECT_QUESTS[questId];
  
  if (!questData || !quest) {
    return { success: false, message: '任务不存在' };
  }
  
  if (!questData.completed) {
    return { success: false, message: '任务未完成' };
  }
  
  if (questData.claimed) {
    return { success: false, message: '奖励已领取' };
  }
  
  // 发放奖励
  player.spiritStones = (player.spiritStones || 0) + (quest.reward.spiritStones || 0);
  player.sect.contribution = (player.sect.contribution || 0) + (quest.reward.contribution || 0);
  questData.claimed = true;
  
  return { 
    success: true, 
    message: `领取${quest.name}奖励：${quest.reward.spiritStones}灵石，${quest.reward.contribution}贡献度` 
  };
}

// ============ 获取每日重置时间 ============
function getDailyResetTime() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.getTime();
}

// 导出到全局
window.SECT_DATA = SECT_DATA;
window.SECT_BUILDINGS = SECT_BUILDINGS;
window.DISCIPLE_CLASS = DISCIPLE_CLASS;
window.SECT_TECH = SECT_TECH;
window.SECT_QUESTS = SECT_QUESTS;
window.createSect = createSect;
window.upgradeSect = upgradeSect;
window.upgradeSectBuilding = upgradeSectBuilding;
window.recruitSectDisciple = recruitSectDisciple;
window.trainDisciple = trainDisciple;
window.learnSectTech = learnSectTech;
window.donateToSect = donateToSect;
window.leaveSect = leaveSect;
window.getSectBonus = getSectBonus;
window.initSectQuests = initSectQuests;
window.updateSectQuestProgress = updateSectQuestProgress;
window.claimSectQuestReward = claimSectQuestReward;

console.log('🏛️ 宗门系统 v4.0 (单机版) 已加载');
