/**
 * 灵兽进化系统 - 核心逻辑 (JavaScript版本)
 */

const Database = require('better-sqlite3');

// ========== 进化形态配置 ==========
const EVOLUTION_CONFIGS = [
  {
    form: 1,
    name: 'Infant',
    nameCn: '幼年期',
    maxLevel: 20,
    attributeMultiplier: 1.0,
    appearance: 'infant',
    description: '灵兽的幼年形态，还处于成长期'
  },
  {
    form: 2,
    name: 'Youth',
    nameCn: '成长期',
    maxLevel: 40,
    attributeMultiplier: 1.5,
    appearance: 'youth',
    description: '灵兽的成长形态，实力逐渐增强'
  },
  {
    form: 3,
    name: 'Adult',
    nameCn: '成熟期',
    maxLevel: 60,
    attributeMultiplier: 2.0,
    appearance: 'adult',
    description: '灵兽的成熟形态，实力已经相当强大'
  },
  {
    form: 4,
    name: 'Perfect',
    nameCn: '完全体',
    maxLevel: 80,
    attributeMultiplier: 2.5,
    appearance: 'perfect',
    description: '灵兽的完全体形态，已经达到巅峰'
  },
  {
    form: 5,
    name: 'Ultimate',
    nameCn: '究极体',
    maxLevel: 100,
    attributeMultiplier: 3.0,
    appearance: 'ultimate',
    description: '灵兽的究极形态，拥有毁天灭地的力量'
  }
];

// ========== 资质等级配置 ==========
const TALENT_CONFIGS = {
  normal: { level: 'normal', name: 'Normal', nameCn: '普通', multiplier: 1.0, color: '#999999', probability: 1.0 },
  good: { level: 'good', name: 'Good', nameCn: '优秀', multiplier: 1.25, color: '#00FF00', probability: 0.8 },
  excellent: { level: 'excellent', name: 'Excellent', nameCn: '卓越', multiplier: 1.5, color: '#00BFFF', probability: 0.6 },
  legendary: { level: 'legendary', name: 'Legendary', nameCn: '传说', multiplier: 2.0, color: '#FF8C00', probability: 0.4 },
  godlike: { level: 'godlike', name: 'Godlike', nameCn: '神品', multiplier: 3.0, color: '#FF0000', probability: 0.2 }
};

// ========== 灵兽技能配置 ==========
const PET_SKILLS = [
  { skillId: 'pet_skill_fire_breath', name: 'Fire Breath', nameCn: '火焰吐息', description: '喷出火焰攻击敌人，造成150%攻击力的伤害', type: 'active', effect: { damage: 1.5, element: 'fire' } },
  { skillId: 'pet_skill_ice_shield', name: 'Ice Shield', nameCn: '冰霜护盾', description: '召唤冰霜护盾，提升自身30%防御力', type: 'active', effect: { defense: 0.3, element: 'ice' } },
  { skillId: 'pet_skill_thunder_strike', name: 'Thunder Strike', nameCn: '雷击', description: '召唤雷电攻击敌人，造成180%攻击力的伤害', type: 'active', effect: { damage: 1.8, element: 'thunder' } },
  { skillId: 'pet_skill_healing', name: 'Healing', nameCn: '治愈', description: '恢复主人30%最大生命值的血量', type: 'active', effect: { heal: 0.3 } },
  { skillId: 'pet_skill_power_strike', name: 'Power Strike', nameCn: '强力一击', description: '全力一击，造成200%攻击力的伤害', type: 'active', effect: { damage: 2.0 } },
  { skillId: 'pet_skill_passive_strength', name: 'Passive Strength', nameCn: '力量强化', description: '永久提升主人10点攻击力', type: 'passive', effect: { attack: 10 } },
  { skillId: 'pet_skill_passive_vitality', name: 'Passive Vitality', nameCn: '生命强化', description: '永久提升主人100点生命值', type: 'passive', effect: { health: 100 } },
  { skillId: 'pet_skill_passive_defense', name: 'Passive Defense', nameCn: '防御强化', description: '永久提升主人10点防御力', type: 'passive', effect: { defense: 10 } }
];

// 数据库变量
let db;

/**
 * 初始化灵兽系统数据库
 */
function initPetEvolveDatabase(database) {
  db = database;
  
  // 灵兽表
  db.exec(`
    CREATE TABLE IF NOT EXISTS pets_evolve (
      pet_id TEXT PRIMARY KEY,
      player_id INTEGER NOT NULL,
      template_id TEXT NOT NULL,
      name TEXT NOT NULL,
      name_cn TEXT,
      level INTEGER DEFAULT 1,
      exp INTEGER DEFAULT 0,
      form INTEGER DEFAULT 1,
      talent_level TEXT DEFAULT 'normal',
      max_level INTEGER DEFAULT 20,
      health INTEGER DEFAULT 1000,
      attack INTEGER DEFAULT 100,
      defense INTEGER DEFAULT 50,
      speed INTEGER DEFAULT 50,
      skills TEXT DEFAULT '[]',
      innate_skills TEXT DEFAULT '[]',
      appearance TEXT DEFAULT 'infant',
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);
  
  // 灵兽模板表
  db.exec(`
    CREATE TABLE IF NOT EXISTS pet_templates_evolve (
      template_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_cn TEXT,
      description TEXT,
      base_health INTEGER DEFAULT 1000,
      base_attack INTEGER DEFAULT 100,
      base_defense INTEGER DEFAULT 50,
      base_speed INTEGER DEFAULT 50,
      max_form INTEGER DEFAULT 5,
      evolution_items TEXT DEFAULT '[]',
      talent_items TEXT DEFAULT '[]',
      learnable_skills TEXT DEFAULT '[]',
      innate_skills TEXT DEFAULT '[]',
      icon TEXT,
      rarity TEXT DEFAULT 'normal'
    )
  `);
  
  // 创建索引
  db.exec(`CREATE INDEX IF NOT EXISTS idx_pets_evolve_player ON pets_evolve(player_id)`);
  
  // 初始化默认模板
  initDefaultTemplates();
  
  console.log('[PetEvolve] 数据库表初始化完成');
}

/**
 * 初始化默认灵兽模板
 */
function initDefaultTemplates() {
  const templates = db.prepare('SELECT COUNT(*) as count FROM pet_templates_evolve').get();
  
  if (templates.count === 0) {
    console.log('[PetEvolve] 初始化默认灵兽模板...');
    
    const defaultTemplates = [
      {
        template_id: 'pet_xiaohuang',
        name: 'Little Yellow',
        name_cn: '小黄',
        description: '一只可爱的小黄鸡资质平庸，但性格温顺',
        base_health: 1000, base_attack: 100, base_defense: 50, base_speed: 50,
        max_form: 5,
        evolution_items: JSON.stringify([{ itemId: 'evolution_stone_basic', itemName: '进化石', amount: 1 }]),
        talent_items: JSON.stringify([
          { itemId: 'talent_pill_good', itemName: '资质丹(优秀)', amount: 1, talentUp: 1 },
          { itemId: 'talent_pill_excellent', itemName: '资质丹(卓越)', amount: 1, talentUp: 2 }
        ]),
        learnable_skills: JSON.stringify(['pet_skill_fire_breath', 'pet_skill_ice_shield', 'pet_skill_passive_strength', 'pet_skill_passive_vitality']),
        innate_skills: JSON.stringify(['pet_skill_passive_strength']),
        icon: 'pet_xiaohuang',
        rarity: 'normal'
      },
      {
        template_id: 'pet_xuanwu',
        name: 'Xuanwu',
        name_cn: '玄武',
        description: '神兽玄武，天生具有强大的防御力',
        base_health: 2000, base_attack: 80, base_defense: 150, base_speed: 30,
        max_form: 5,
        evolution_items: JSON.stringify([{ itemId: 'evolution_stone_advanced', itemName: '高级进化石', amount: 1 }]),
        talent_items: JSON.stringify([
          { itemId: 'talent_pill_excellent', itemName: '资质丹(卓越)', amount: 1, talentUp: 2 },
          { itemId: 'talent_pill_legendary', itemName: '资质丹(传说)', amount: 1, talentUp: 3 }
        ]),
        learnable_skills: JSON.stringify(['pet_skill_ice_shield', 'pet_skill_thunder_strike', 'pet_skill_passive_defense', 'pet_skill_passive_vitality']),
        innate_skills: JSON.stringify(['pet_skill_passive_defense']),
        icon: 'pet_xuanwu',
        rarity: 'legendary'
      },
      {
        template_id: 'pet_baihu',
        name: 'Baihu',
        name_cn: '白虎',
        description: '神兽白虎，天生具有强大的攻击力',
        base_health: 1500, base_attack: 200, base_defense: 60, base_speed: 80,
        max_form: 5,
        evolution_items: JSON.stringify([{ itemId: 'evolution_stone_advanced', itemName: '高级进化石', amount: 1 }]),
        talent_items: JSON.stringify([
          { itemId: 'talent_pill_excellent', itemName: '资质丹(卓越)', amount: 1, talentUp: 2 },
          { itemId: 'talent_pill_legendary', itemName: '资质丹(传说)', amount: 1, talentUp: 3 }
        ]),
        learnable_skills: JSON.stringify(['pet_skill_fire_breath', 'pet_skill_power_strike', 'pet_skill_passive_strength', 'pet_skill_thunder_strike']),
        innate_skills: JSON.stringify(['pet_skill_passive_strength']),
        icon: 'pet_baihu',
        rarity: 'legendary'
      },
      {
        template_id: 'pet_qilin',
        name: 'Qilin',
        name_cn: '麒麟',
        description: '神兽麒麟，天生具有治愈能力',
        base_health: 1800, base_attack: 120, base_defense: 80, base_speed: 100,
        max_form: 5,
        evolution_items: JSON.stringify([{ itemId: 'evolution_stone_advanced', itemName: '高级进化石', amount: 1 }]),
        talent_items: JSON.stringify([
          { itemId: 'talent_pill_legendary', itemName: '资质丹(传说)', amount: 1, talentUp: 3 },
          { itemId: 'talent_pill_godlike', itemName: '资质丹(神品)', amount: 1, talentUp: 4 }
        ]),
        learnable_skills: JSON.stringify(['pet_skill_healing', 'pet_skill_ice_shield', 'pet_skill_passive_vitality', 'pet_skill_passive_defense']),
        innate_skills: JSON.stringify(['pet_skill_healing']),
        icon: 'pet_qilin',
        rarity: 'godlike'
      }
    ];
    
    const insertStmt = db.prepare(`
      INSERT INTO pet_templates_evolve (template_id, name, name_cn, description, base_health, 
        base_attack, base_defense, base_speed, max_form, evolution_items, talent_items, 
        learnable_skills, innate_skills, icon, rarity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const t of defaultTemplates) {
      insertStmt.run(t.template_id, t.name, t.name_cn, t.description, t.base_health, 
        t.base_attack, t.base_defense, t.base_speed, t.max_form, t.evolution_items, t.talent_items, 
        t.learnable_skills, t.innate_skills, t.icon, t.rarity);
    }
    
    console.log('[PetEvolve] 默认灵兽模板初始化完成');
  }
}

// ========== 玩家背包（模拟） ==========
const playerBackpack = new Map();

function addItem(playerId, itemId, amount) {
  if (!playerBackpack.has(playerId)) {
    playerBackpack.set(playerId, new Map());
  }
  const backpack = playerBackpack.get(playerId);
  const current = backpack.get(itemId) || 0;
  backpack.set(itemId, current + amount);
}

function consumeItem(playerId, itemId, amount) {
  if (!playerBackpack.has(playerId)) {
    return false;
  }
  const backpack = playerBackpack.get(playerId);
  const current = backpack.get(itemId) || 0;
  if (current < amount) {
    return false;
  }
  backpack.set(itemId, current - amount);
  return true;
}

function getItemCount(playerId, itemId) {
  if (!playerBackpack.has(playerId)) {
    return 0;
  }
  return playerBackpack.get(playerId).get(itemId) || 0;
}

// ========== 灵兽系统 API ==========

// 获取玩家的所有灵兽
function getPetList(playerId) {
  const pets = db.prepare('SELECT * FROM pets_evolve WHERE player_id = ? ORDER BY level DESC').all(playerId);
  return pets.map(p => ({
    ...p,
    skills: JSON.parse(p.skills || '[]'),
    innateSkills: JSON.parse(p.innate_skills || '[]'),
    appearance: p.appearance || 'infant'
  }));
}

// 获取单个灵兽
function getPet(petId) {
  const pet = db.prepare('SELECT * FROM pets_evolve WHERE pet_id = ?').get(petId);
  if (!pet) return null;
  return {
    ...pet,
    skills: JSON.parse(pet.skills || '[]'),
    innateSkills: JSON.parse(pet.innate_skills || '[]'),
    appearance: pet.appearance || 'infant'
  };
}

// 创建灵兽
function createPet(playerId, templateId, name) {
  const template = db.prepare('SELECT * FROM pet_templates_evolve WHERE template_id = ?').get(templateId);
  if (!template) {
    return { success: false, message: '灵兽模板不存在' };
  }
  
  const now = Date.now();
  const petId = `pet_${playerId}_${templateId}_${now}`;
  const innateSkills = JSON.parse(template.innate_skills || '[]');
  
  db.prepare(`
    INSERT INTO pets_evolve (pet_id, player_id, template_id, name, name_cn, level, exp, form, talent_level, 
      max_level, health, attack, defense, speed, skills, innate_skills, appearance, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, 0, 1, 'normal', ?, ?, ?, ?, ?, '[]', ?, 'infant', ?, ?)
  `).run(
    petId, playerId, templateId, name, template.name_cn || name,
    template.max_form * 20 || 100,
    template.base_health || 1000,
    template.base_attack || 100,
    template.base_defense || 50,
    template.base_speed || 50,
    JSON.stringify(innateSkills),
    now, now
  );
  
  const pet = getPet(petId);
  return { success: true, pet, message: '灵兽创建成功' };
}

// 更新灵兽
function updatePet(petId, data) {
  const updates = [];
  const values = [];
  
  if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
  if (data.level !== undefined) { updates.push('level = ?'); values.push(data.level); }
  if (data.exp !== undefined) { updates.push('exp = ?'); values.push(data.exp); }
  if (data.form !== undefined) { updates.push('form = ?'); values.push(data.form); }
  if (data.talentLevel !== undefined) { updates.push('talent_level = ?'); values.push(data.talentLevel); }
  if (data.maxLevel !== undefined) { updates.push('max_level = ?'); values.push(data.maxLevel); }
  if (data.health !== undefined) { updates.push('health = ?'); values.push(data.health); }
  if (data.attack !== undefined) { updates.push('attack = ?'); values.push(data.attack); }
  if (data.defense !== undefined) { updates.push('defense = ?'); values.push(data.defense); }
  if (data.speed !== undefined) { updates.push('speed = ?'); values.push(data.speed); }
  if (data.skills !== undefined) { updates.push('skills = ?'); values.push(JSON.stringify(data.skills)); }
  if (data.innateSkills !== undefined) { updates.push('innate_skills = ?'); values.push(JSON.stringify(data.innateSkills)); }
  if (data.appearance !== undefined) { updates.push('appearance = ?'); values.push(data.appearance); }
  
  if (updates.length > 0) {
    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(petId);
    db.prepare(`UPDATE pets_evolve SET ${updates.join(', ')} WHERE pet_id = ?`).run(...values);
    return true;
  }
  return false;
}

// 进化灵兽
function evolvePet(playerId, petId, itemId) {
  const pet = getPet(petId);
  if (!pet) {
    return { success: false, message: '灵兽不存在' };
  }
  if (pet.player_id !== playerId) {
    return { success: false, message: '这不是你的灵兽' };
  }
  
  const template = db.prepare('SELECT * FROM pet_templates_evolve WHERE template_id = ?').get(pet.template_id);
  if (!template) {
    return { success: false, message: '灵兽模板不存在' };
  }
  
  // 检查是否已达到最大形态
  if (pet.form >= template.max_form) {
    return { success: false, message: '灵兽已达到最大形态，无法继续进化' };
  }
  
  // 检查等级
  const currentFormConfig = EVOLUTION_CONFIGS.find(c => c.form === pet.form);
  if (!currentFormConfig) {
    return { success: false, message: '灵兽形态配置错误' };
  }
  if (pet.level < currentFormConfig.maxLevel) {
    return { success: false, message: `灵兽等级未达到进化要求，需要${currentFormConfig.maxLevel}级` };
  }
  
  // 确定使用的进化石
  let evolutionItems = JSON.parse(template.evolution_items || '[]');
  let evolutionItem = evolutionItems.find(e => e.itemId === itemId) || evolutionItems[0];
  if (!evolutionItem) {
    evolutionItem = { itemId: 'evolution_stone_basic', itemName: '进化石', amount: 1 };
  }
  
  // 检查进化石
  if (!consumeItem(playerId, evolutionItem.itemId, evolutionItem.amount)) {
    return { success: false, message: `进化石不足，需要${evolutionItem.itemName}x${evolutionItem.amount}` };
  }
  
  // 执行进化
  const nextForm = pet.form + 1;
  const nextFormConfig = EVOLUTION_CONFIGS.find(c => c.form === nextForm);
  if (!nextFormConfig) {
    return { success: false, message: '进化配置错误' };
  }
  
  const talentConfig = TALENT_CONFIGS[pet.talent_level];
  const baseHealth = template.base_health * nextFormConfig.attributeMultiplier;
  const baseAttack = template.base_attack * nextFormConfig.attributeMultiplier;
  const baseDefense = template.base_defense * nextFormConfig.attributeMultiplier;
  const baseSpeed = template.base_speed * nextFormConfig.attributeMultiplier;
  
  updatePet(petId, {
    form: nextForm,
    maxLevel: nextFormConfig.maxLevel,
    appearance: nextFormConfig.appearance,
    health: Math.floor(baseHealth * talentConfig.multiplier),
    attack: Math.floor(baseAttack * talentConfig.multiplier),
    defense: Math.floor(baseDefense * talentConfig.multiplier),
    speed: Math.floor(baseSpeed * talentConfig.multiplier)
  });
  
  const evolvedPet = getPet(petId);
  return {
    success: true,
    pet: evolvedPet,
    message: `进化成功！灵兽进化为${nextFormConfig.nameCn}，属性大幅提升！`
  };
}

// 提升资质
function improveTalent(playerId, petId, itemId) {
  const pet = getPet(petId);
  if (!pet) {
    return { success: false, message: '灵兽不存在', improved: false };
  }
  if (pet.player_id !== playerId) {
    return { success: false, message: '这不是你的灵兽', improved: false };
  }
  if (pet.talent_level === 'godlike') {
    return { success: false, message: '灵兽资质已经是神品，无法继续提升', improved: false };
  }
  
  const template = db.prepare('SELECT * FROM pet_templates_evolve WHERE template_id = ?').get(pet.template_id);
  if (!template) {
    return { success: false, message: '灵兽模板不存在', improved: false };
  }
  
  // 确定使用的资质丹
  let talentItems = JSON.parse(template.talent_items || '[]');
  let talentItem = talentItems.find(t => t.itemId === itemId) || talentItems[0];
  if (!talentItem) {
    talentItem = { itemId: 'talent_pill_good', itemName: '资质丹', amount: 1, talentUp: 1 };
  }
  
  // 检查资质丹
  if (!consumeItem(playerId, talentItem.itemId, talentItem.amount)) {
    return { success: false, message: `资质丹不足，需要${talentItem.itemName}x${talentItem.amount}`, improved: false };
  }
  
  // 计算提升后的资质
  const talentLevels = ['normal', 'good', 'excellent', 'legendary', 'godlike'];
  const currentIndex = talentLevels.indexOf(pet.talent_level);
  const talentUp = talentItem.talentUp || 1;
  const newIndex = Math.min(currentIndex + talentUp, talentLevels.length - 1);
  const newTalentLevel = talentLevels[newIndex];
  
  // 概率判断
  const talentConfig = TALENT_CONFIGS[newTalentLevel];
  const roll = Math.random();
  let improved = false;
  
  if (roll < talentConfig.probability) {
    improved = true;
    const currentFormConfig = EVOLUTION_CONFIGS.find(c => c.form === pet.form) || EVOLUTION_CONFIGS[0];
    
    const baseHealth = template.base_health * currentFormConfig.attributeMultiplier;
    const baseAttack = template.base_attack * currentFormConfig.attributeMultiplier;
    const baseDefense = template.base_defense * currentFormConfig.attributeMultiplier;
    const baseSpeed = template.base_speed * currentFormConfig.attributeMultiplier;
    
    updatePet(petId, {
      talentLevel: newTalentLevel,
      health: Math.floor(baseHealth * talentConfig.multiplier),
      attack: Math.floor(baseAttack * talentConfig.multiplier),
      defense: Math.floor(baseDefense * talentConfig.multiplier),
      speed: Math.floor(baseSpeed * talentConfig.multiplier)
    });
  }
  
  const updatedPet = getPet(petId);
  
  if (improved) {
    return {
      success: true,
      pet: updatedPet,
      message: `资质提升成功！灵兽资质提升为${talentConfig.nameCn}！`,
      improved: true
    };
  } else {
    return {
      success: true,
      pet: updatedPet,
      message: `资质提升失败！${talentConfig.nameCn}突破失败，请再接再厉。`,
      improved: false
    };
  }
}

// 学习技能
function learnSkill(playerId, petId, skillId) {
  const pet = getPet(petId);
  if (!pet) {
    return { success: false, message: '灵兽不存在' };
  }
  if (pet.player_id !== playerId) {
    return { success: false, message: '这不是你的灵兽' };
  }
  
  const template = db.prepare('SELECT * FROM pet_templates_evolve WHERE template_id = ?').get(pet.template_id);
  if (!template) {
    return { success: false, message: '灵兽模板不存在' };
  }
  
  let learnableSkills = [];
  try {
    learnableSkills = JSON.parse(template.learnable_skills || '[]');
  } catch (e) {
    learnableSkills = [];
  }
  if (!learnableSkills.includes(skillId)) {
    return { success: false, message: '该灵兽无法学习此技能' };
  }
  
  let skills = [];
  try {
    skills = Array.isArray(pet.skills) ? pet.skills : JSON.parse(pet.skills || '[]');
  } catch (e) {
    skills = [];
  }
  if (skills.includes(skillId)) {
    return { success: false, message: '灵兽已经学会此技能' };
  }
  
  const maxSkills = 4;
  if (skills.length >= maxSkills) {
    return { success: false, message: `灵兽技能栏已满，最多学习${maxSkills}个技能` };
  }
  
  const skillInfo = PET_SKILLS.find(s => s.skillId === skillId);
  if (!skillInfo) {
    return { success: false, message: '技能不存在' };
  }
  
  skills.push(skillId);
  updatePet(petId, { skills });
  
  const updatedPet = getPet(petId);
  return {
    success: true,
    pet: updatedPet,
    message: `灵兽学会技能：${skillInfo.nameCn}！`
  };
}

// 获取灵兽模板列表
function getPetTemplates() {
  const templates = db.prepare('SELECT * FROM pet_templates_evolve').all();
  return templates.map(t => ({
    ...t,
    evolutionItems: JSON.parse(t.evolution_items || '[]'),
    talentItems: JSON.parse(t.talent_items || '[]'),
    learnableSkills: JSON.parse(t.learnable_skills || '[]'),
    innateSkills: JSON.parse(t.innate_skills || '[]')
  }));
}

// 获取进化配置
function getEvolutionConfigs() {
  return EVOLUTION_CONFIGS;
}

// 获取资质配置
function getTalentConfigs() {
  return Object.values(TALENT_CONFIGS);
}

// 获取所有技能
function getAllSkills() {
  return PET_SKILLS;
}

// 获取灵兽可学习的技能
function getLearnableSkills(petId) {
  const pet = getPet(petId);
  if (!pet) return [];
  
  const template = db.prepare('SELECT * FROM pet_templates_evolve WHERE template_id = ?').get(pet.template_id);
  if (!template) return [];
  
  const learnableSkillIds = JSON.parse(template.learnable_skills || '[]');
  return PET_SKILLS.filter(s => learnableSkillIds.includes(s.skillId));
}

// 获取灵兽属性
function getPetAttributes(petId) {
  const pet = getPet(petId);
  if (!pet) return null;
  
  return {
    health: pet.health,
    attack: pet.attack,
    defense: pet.defense,
    speed: pet.speed
  };
}

// 导出模块
module.exports = {
  initPetEvolveDatabase,
  getPetList,
  getPet,
  createPet,
  updatePet,
  evolvePet,
  improveTalent,
  learnSkill,
  getPetTemplates,
  getEvolutionConfigs,
  getTalentConfigs,
  getAllSkills,
  getLearnableSkills,
  getPetAttributes,
  addItem,
  consumeItem,
  getItemCount
};
