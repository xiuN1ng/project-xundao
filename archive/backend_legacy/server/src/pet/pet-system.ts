/**
 * 灵兽进化系统 - 核心逻辑
 */

import * as PetModels from './pet-models';
import { Pet, PetTemplate, PetSkill, EvolutionConfig, TalentLevel, TalentConfig } from './types';

// ========== 进化形态配置 ==========
export const EVOLUTION_CONFIGS: EvolutionConfig[] = [
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
export const TALENT_CONFIGS: Record<TalentLevel, TalentConfig> = {
  normal: {
    level: 'normal',
    name: 'Normal',
    nameCn: '普通',
    multiplier: 1.0,
    color: '#999999',
    probability: 1.0
  },
  good: {
    level: 'good',
    name: 'Good',
    nameCn: '优秀',
    multiplier: 1.25,
    color: '#00FF00',
    probability: 0.8
  },
  excellent: {
    level: 'excellent',
    name: 'Excellent',
    nameCn: '卓越',
    multiplier: 1.5,
    color: '#00BFFF',
    probability: 0.6
  },
  legendary: {
    level: 'legendary',
    name: 'Legendary',
    nameCn: '传说',
    multiplier: 2.0,
    color: '#FF8C00',
    probability: 0.4
  },
  godlike: {
    level: 'godlike',
    name: 'Godlike',
    nameCn: '神品',
    multiplier: 3.0,
    color: '#FF0000',
    probability: 0.2
  }
};

// ========== 灵兽技能配置 ==========
export const PET_SKILLS: PetSkill[] = [
  {
    skillId: 'pet_skill_fire_breath',
    name: 'Fire Breath',
    nameCn: '火焰吐息',
    description: '喷出火焰攻击敌人，造成150%攻击力的伤害',
    type: 'active',
    effect: { damage: 1.5, element: 'fire' }
  },
  {
    skillId: 'pet_skill_ice_shield',
    name: 'Ice Shield',
    nameCn: '冰霜护盾',
    description: '召唤冰霜护盾，提升自身30%防御力',
    type: 'active',
    effect: { defense: 0.3, element: 'ice' }
  },
  {
    skillId: 'pet_skill_thunder_strike',
    name: 'Thunder Strike',
    nameCn: '雷击',
    description: '召唤雷电攻击敌人，造成180%攻击力的伤害',
    type: 'active',
    effect: { damage: 1.8, element: 'thunder' }
  },
  {
    skillId: 'pet_skill_healing',
    name: 'Healing',
    nameCn: '治愈',
    description: '恢复主人30%最大生命值的血量',
    type: 'active',
    effect: { heal: 0.3 }
  },
  {
    skillId: 'pet_skill_power_strike',
    name: 'Power Strike',
    nameCn: '强力一击',
    description: '全力一击，造成200%攻击力的伤害',
    type: 'active',
    effect: { damage: 2.0 }
  },
  {
    skillId: 'pet_skill_passive_strength',
    name: 'Passive Strength',
    nameCn: '力量强化',
    description: '永久提升主人10点攻击力',
    type: 'passive',
    effect: { attack: 10 }
  },
  {
    skillId: 'pet_skill_passive_vitality',
    name: 'Passive Vitality',
    nameCn: '生命强化',
    description: '永久提升主人100点生命值',
    type: 'passive',
    effect: { health: 100 }
  },
  {
    skillId: 'pet_skill_passive_defense',
    name: 'Passive Defense',
    nameCn: '防御强化',
    description: '永久提升主人10点防御力',
    type: 'passive',
    effect: { defense: 10 }
  }
];

// 进化所需道具配置（默认）
export const DEFAULT_EVOLUTION_ITEMS = [
  { itemId: 'evolution_stone_basic', itemName: '进化石', amount: 1 },
  { itemId: 'evolution_stone_advanced', itemName: '高级进化石', amount: 1 }
];

// 资质丹配置
export const TALENT_ITEMS = [
  { itemId: 'talent_pill_good', itemName: '资质丹(优秀)', amount: 1, talentUp: 1 },
  { itemId: 'talent_pill_excellent', itemName: '资质丹(卓越)', amount: 1, talentUp: 2 },
  { itemId: 'talent_pill_legendary', itemName: '资质丹(传说)', amount: 1, talentUp: 3 },
  { itemId: 'talent_pill_godlike', itemName: '资质丹(神品)', amount: 1, talentUp: 4 }
];

// ========== 灵兽系统类 ==========
export class PetSystem {
  // 玩家背包（模拟，实际应该从背包系统获取）
  private playerBackpack: Map<number, Map<string, number>> = new Map();

  // 初始化玩家背包
  initPlayerBackpack(playerId: number): void {
    if (!this.playerBackpack.has(playerId)) {
      this.playerBackpack.set(playerId, new Map());
    }
  }

  // 添加物品到背包
  addItem(playerId: number, itemId: string, amount: number): void {
    this.initPlayerBackpack(playerId);
    const backpack = this.playerBackpack.get(playerId)!;
    const current = backpack.get(itemId) || 0;
    backpack.set(itemId, current + amount);
  }

  // 消耗物品
  consumeItem(playerId: number, itemId: string, amount: number): boolean {
    this.initPlayerBackpack(playerId);
    const backpack = this.playerBackpack.get(playerId)!;
    const current = backpack.get(itemId) || 0;
    
    if (current < amount) {
      return false;
    }
    
    backpack.set(itemId, current - amount);
    return true;
  }

  // 获取物品数量
  getItemCount(playerId: number, itemId: string): number {
    this.initPlayerBackpack(playerId);
    return this.playerBackpack.get(playerId)!.get(itemId) || 0;
  }

  // ========== 灵兽列表 ==========
  getPetList(playerId: number): Pet[] {
    return PetModels.getPlayerPets(playerId);
  }

  // ========== 获取单个灵兽 ==========
  getPet(petId: string): Pet | null {
    return PetModels.getPet(petId);
  }

  // ========== 创建灵兽 ==========
  createPet(playerId: number, templateId: string, name: string): { success: boolean; pet?: Pet; message: string } {
    const template = PetModels.getPetTemplate(templateId);
    
    if (!template) {
      return { success: false, message: '灵兽模板不存在' };
    }
    
    const pet = PetModels.createPet(playerId, templateId, name);
    
    if (!pet) {
      return { success: false, message: '创建灵兽失败' };
    }
    
    return { success: true, pet, message: '灵兽创建成功' };
  }

  // ========== 进化 ==========
  evolvePet(playerId: number, petId: string, itemId?: string): { success: boolean; pet?: Pet; message: string } {
    const pet = PetModels.getPet(petId);
    
    if (!pet) {
      return { success: false, message: '灵兽不存在' };
    }
    
    if (pet.playerId !== playerId) {
      return { success: false, message: '这不是你的灵兽' };
    }
    
    const template = PetModels.getPetTemplate(pet.templateId);
    if (!template) {
      return { success: false, message: '灵兽模板不存在' };
    }
    
    // 检查是否已达到最大形态
    if (pet.form >= template.maxForm) {
      return { success: false, message: '灵兽已达到最大形态，无法继续进化' };
    }
    
    // 检查是否达到等级上限
    const currentFormConfig = EVOLUTION_CONFIGS.find(c => c.form === pet.form);
    if (!currentFormConfig) {
      return { success: false, message: '灵兽形态配置错误' };
    }
    
    if (pet.level < currentFormConfig.maxLevel) {
      return { success: false, message: `灵兽等级未达到进化要求，需要${currentFormConfig.maxLevel}级` };
    }
    
    // 确定使用的进化石
    let evolutionItem = template.evolutionItems.find(e => e.itemId === itemId);
    if (!evolutionItem && template.evolutionItems.length > 0) {
      evolutionItem = template.evolutionItems[0];
    }
    
    // 如果没有配置进化物品，使用默认
    if (!evolutionItem) {
      evolutionItem = { itemId: 'evolution_stone_basic', itemName: '进化石', amount: 1 };
    }
    
    // 检查进化石
    if (!this.consumeItem(playerId, evolutionItem.itemId, evolutionItem.amount)) {
      return { success: false, message: `进化石不足，需要${evolutionItem.itemName}x${evolutionItem.amount}` };
    }
    
    // 执行进化
    const nextForm = pet.form + 1;
    const nextFormConfig = EVOLUTION_CONFIGS.find(c => c.form === nextForm);
    
    if (!nextFormConfig) {
      return { success: false, message: '进化配置错误' };
    }
    
    // 计算进化后的属性
    const talentConfig = TALENT_CONFIGS[pet.talentLevel];
    const baseHealth = template.baseHealth * nextFormConfig.attributeMultiplier;
    const baseAttack = template.baseAttack * nextFormConfig.attributeMultiplier;
    const baseDefense = template.baseDefense * nextFormConfig.attributeMultiplier;
    const baseSpeed = template.baseSpeed * nextFormConfig.attributeMultiplier;
    
    // 更新灵兽
    const updated = PetModels.updatePet(petId, {
      form: nextForm,
      maxLevel: nextFormConfig.maxLevel,
      appearance: nextFormConfig.appearance,
      health: Math.floor(baseHealth * talentConfig.multiplier),
      attack: Math.floor(baseAttack * talentConfig.multiplier),
      defense: Math.floor(baseDefense * talentConfig.multiplier),
      speed: Math.floor(baseSpeed * talentConfig.multiplier)
    });
    
    if (!updated) {
      return { success: false, message: '进化失败' };
    }
    
    const evolvedPet = PetModels.getPet(petId);
    
    return {
      success: true,
      pet: evolvedPet || undefined,
      message: `进化成功！灵兽进化为${nextFormConfig.nameCn}，属性大幅提升！`
    };
  }

  // ========== 资质提升 ==========
  improveTalent(playerId: number, petId: string, itemId?: string): { success: boolean; pet?: Pet; message: string; improved: boolean } {
    const pet = PetModels.getPet(petId);
    
    if (!pet) {
      return { success: false, message: '灵兽不存在', improved: false };
    }
    
    if (pet.playerId !== playerId) {
      return { success: false, message: '这不是你的灵兽', improved: false };
    }
    
    // 检查是否已经是神品
    if (pet.talentLevel === 'godlike') {
      return { success: false, message: '灵兽资质已经是神品，无法继续提升', improved: false };
    }
    
    const template = PetModels.getPetTemplate(pet.templateId);
    if (!template) {
      return { success: false, message: '灵兽模板不存在', improved: false };
    }
    
    // 确定使用的资质丹
    let talentItem = template.talentItems.find(t => t.itemId === itemId);
    if (!talentItem && template.talentItems.length > 0) {
      talentItem = template.talentItems[0];
    }
    
    // 如果没有配置资质丹，使用默认
    if (!talentItem) {
      talentItem = { itemId: 'talent_pill_good', itemName: '资质丹', amount: 1, talentUp: 1 };
    }
    
    // 检查资质丹
    if (!this.consumeItem(playerId, talentItem.itemId, talentItem.amount)) {
      return { success: false, message: `资质丹不足，需要${talentItem.itemName}x${talentItem.amount}`, improved: false };
    }
    
    // 计算提升后的资质
    const talentLevels: TalentLevel[] = ['normal', 'good', 'excellent', 'legendary', 'godlike'];
    const currentIndex = talentLevels.indexOf(pet.talentLevel);
    const talentUp = talentItem.talentUp || 1;
    const newIndex = Math.min(currentIndex + talentUp, talentLevels.length - 1);
    const newTalentLevel = talentLevels[newIndex];
    
    // 概率判断（高资质有失败概率）
    const talentConfig = TALENT_CONFIGS[newTalentLevel];
    const roll = Math.random();
    let improved = false;
    
    if (roll < talentConfig.probability) {
      improved = true;
      
      // 计算新的属性
      const currentFormConfig = EVOLUTION_CONFIGS.find(c => c.form === pet.form) || EVOLUTION_CONFIGS[0];
      const newTalentConfig = TALENT_CONFIGS[newTalentLevel];
      
      const baseHealth = template.baseHealth * currentFormConfig.attributeMultiplier;
      const baseAttack = template.baseAttack * currentFormConfig.attributeMultiplier;
      const baseDefense = template.baseDefense * currentFormConfig.attributeMultiplier;
      const baseSpeed = template.baseSpeed * currentFormConfig.attributeMultiplier;
      
      // 更新灵兽
      PetModels.updatePet(petId, {
        talentLevel: newTalentLevel,
        health: Math.floor(baseHealth * newTalentConfig.multiplier),
        attack: Math.floor(baseAttack * newTalentConfig.multiplier),
        defense: Math.floor(baseDefense * newTalentConfig.multiplier),
        speed: Math.floor(baseSpeed * newTalentConfig.multiplier)
      });
    } else {
      // 返还道具（可选，这里选择不返还增加难度）
    }
    
    const updatedPet = PetModels.getPet(petId);
    
    if (improved) {
      return {
        success: true,
        pet: updatedPet || undefined,
        message: `资质提升成功！灵兽资质提升为${newTalentConfig.nameCn}！`,
        improved: true
      };
    } else {
      return {
        success: true,
        pet: updatedPet || undefined,
        message: `资质提升失败！${newTalentConfig.nameCn}突破失败，请再接再厉。`,
        improved: false
      };
    }
  }

  // ========== 学习技能 ==========
  learnSkill(playerId: number, petId: string, skillId: string): { success: boolean; pet?: Pet; message: string } {
    const pet = PetModels.getPet(petId);
    
    if (!pet) {
      return { success: false, message: '灵兽不存在' };
    }
    
    if (pet.playerId !== playerId) {
      return { success: false, message: '这不是你的灵兽' };
    }
    
    const template = PetModels.getPetTemplate(pet.templateId);
    if (!template) {
      return { success: false, message: '灵兽模板不存在' };
    }
    
    // 检查技能是否可学习
    if (!template.learnableSkills.includes(skillId)) {
      return { success: false, message: '该灵兽无法学习此技能' };
    }
    
    // 检查是否已学会
    if (pet.skills.includes(skillId)) {
      return { success: false, message: '灵兽已经学会此技能' };
    }
    
    // 检查技能数量上限
    const maxSkills = 4;
    if (pet.skills.length >= maxSkills) {
      return { success: false, message: `灵兽技能栏已满，最多学习${maxSkills}个技能` };
    }
    
    // 获取技能信息
    const skillInfo = PET_SKILLS.find(s => s.skillId === skillId);
    if (!skillInfo) {
      return { success: false, message: '技能不存在' };
    }
    
    // 添加技能
    const newSkills = [...pet.skills, skillId];
    PetModels.updatePet(petId, { skills: newSkills });
    
    const updatedPet = PetModels.getPet(petId);
    
    return {
      success: true,
      pet: updatedPet || undefined,
      message: `灵兽学会技能：${skillInfo.nameCn}！`
    };
  }

  // ========== 获取可用技能列表 ==========
  getLearnableSkills(petId: string): PetSkill[] {
    const pet = PetModels.getPet(petId);
    if (!pet) return [];
    
    const template = PetModels.getPetTemplate(pet.templateId);
    if (!template) return [];
    
    return PET_SKILLS.filter(s => template.learnableSkills.includes(s.skillId));
  }

  // ========== 获取灵兽模板列表 ==========
  getPetTemplates(): PetTemplate[] {
    return PetModels.getAllPetTemplates();
  }

  // ========== 获取进化配置 ==========
  getEvolutionConfigs(): EvolutionConfig[] {
    return EVOLUTION_CONFIGS;
  }

  // ========== 获取资质配置 ==========
  getTalentConfigs(): TalentConfig[] {
    return Object.values(TALENT_CONFIGS);
  }

  // ========== 获取所有技能 ==========
  getAllSkills(): PetSkill[] {
    return PET_SKILLS;
  }

  // ========== 获取灵兽属性（含资质加成） ==========
  getPetAttributes(petId: string): { health: number; attack: number; defense: number; speed: number } | null {
    const pet = PetModels.getPet(petId);
    if (!pet) return null;
    
    return {
      health: pet.health,
      attack: pet.attack,
      defense: pet.defense,
      speed: pet.speed
    };
  }

  // ========== 升级灵兽（消耗经验） ==========
  upgradePet(playerId: number, petId: string, expAmount: number): { success: boolean; pet?: Pet; message: string } {
    const pet = PetModels.getPet(petId);
    
    if (!pet) {
      return { success: false, message: '灵兽不存在' };
    }
    
    if (pet.playerId !== playerId) {
      return { success: false, message: '这不是你的灵兽' };
    }
    
    // 检查是否达到等级上限
    if (pet.level >= pet.maxLevel) {
      return { success: false, message: `灵兽已达到等级上限${pet.maxLevel}级` };
    }
    
    // 添加经验
    const newExp = pet.exp + expAmount;
    
    // 计算升级所需经验 (每级需要的经验 = 等级 * 100)
    const expToNextLevel = pet.level * 100;
    
    let newLevel = pet.level;
    let remainingExp = newExp;
    let leveledUp = false;
    
    // 循环升级直到不能升为止
    while (remainingExp >= (newLevel * 100) && newLevel < pet.maxLevel) {
      remainingExp -= newLevel * 100;
      newLevel++;
      leveledUp = true;
    }
    
    if (!leveledUp && newLevel === pet.level) {
      return {
        success: true,
        pet: pet,
        message: `获得${expAmount}点经验，当前经验 ${pet.exp}/${pet.level * 100}`
      };
    }
    
    // 计算新属性 (每升一级属性增加5%)
    const template = PetModels.getPetTemplate(pet.templateId);
    if (!template) {
      return { success: false, message: '灵兽模板不存在' };
    }
    
    const formConfig = EVOLUTION_CONFIGS.find(c => c.form === pet.form) || EVOLUTION_CONFIGS[0];
    const talentConfig = TALENT_CONFIGS[pet.talentLevel];
    
    const baseHealthPerLevel = template.baseHealth * formConfig.attributeMultiplier * 0.05;
    const baseAttackPerLevel = template.baseAttack * formConfig.attributeMultiplier * 0.05;
    const baseDefensePerLevel = template.baseDefense * formConfig.attributeMultiplier * 0.05;
    const baseSpeedPerLevel = template.baseSpeed * formConfig.attributeMultiplier * 0.05;
    
    const healthIncrease = Math.floor(baseHealthPerLevel * talentConfig.multiplier * (newLevel - pet.level));
    const attackIncrease = Math.floor(baseAttackPerLevel * talentConfig.multiplier * (newLevel - pet.level));
    const defenseIncrease = Math.floor(baseDefensePerLevel * talentConfig.multiplier * (newLevel - pet.level));
    const speedIncrease = Math.floor(baseSpeedPerLevel * talentConfig.multiplier * (newLevel - pet.level));
    
    // 更新灵兽
    const updated = PetModels.updatePet(petId, {
      level: newLevel,
      exp: remainingExp,
      health: pet.health + healthIncrease,
      attack: pet.attack + attackIncrease,
      defense: pet.defense + defenseIncrease,
      speed: pet.speed + speedIncrease
    });
    
    if (!updated) {
      return { success: false, message: '升级失败' };
    }
    
    const upgradedPet = PetModels.getPet(petId);
    
    return {
      success: true,
      pet: upgradedPet || undefined,
      message: `灵兽升级成功！等级 ${pet.level} → ${newLevel}，属性大幅提升！`
    };
  }

  // ========== 使用道具直接升级 ==========
  upgradePetWithItem(playerId: number, petId: string, itemId: string): { success: boolean; pet?: Pet; message: string } {
    const pet = PetModels.getPet(petId);
    
    if (!pet) {
      return { success: false, message: '灵兽不存在' };
    }
    
    if (pet.playerId !== playerId) {
      return { success: false, message: '这不是你的灵兽' };
    }
    
    // 检查是否达到等级上限
    if (pet.level >= pet.maxLevel) {
      return { success: false, message: `灵兽已达到等级上限${pet.maxLevel}级` };
    }
    
    // 升级道具配置
    const upgradeItems: Record<string, { exp: number; name: string }> = {
      'pet_exp_pill_small': { exp: 100, name: '小经验丹' },
      'pet_exp_pill_medium': { exp: 500, name: '中经验丹' },
      'pet_exp_pill_large': { exp: 2000, name: '大经验丹' },
      'pet_exp_pill_giant': { exp: 10000, name: '巨经验丹' }
    };
    
    const itemConfig = upgradeItems[itemId];
    if (!itemConfig) {
      return { success: false, message: '无效的升级道具' };
    }
    
    // 检查道具是否足够
    if (!this.consumeItem(playerId, itemId, 1)) {
      return { success: false, message: `${itemConfig.name}不足` };
    }
    
    // 直接使用升级方法
    return this.upgradePet(playerId, petId, itemConfig.exp);
  }

  // ========== 合成灵兽 ==========
  combinePets(playerId: number, petId1: string, petId2: string): { success: boolean; pet?: Pet; message: string } {
    const pet1 = PetModels.getPet(petId1);
    const pet2 = PetModels.getPet(petId2);
    
    if (!pet1 || !pet2) {
      return { success: false, message: '灵兽不存在' };
    }
    
    if (pet1.playerId !== playerId || pet2.playerId !== playerId) {
      return { success: false, message: '这两只灵兽不是你的' };
    }
    
    if (petId1 === petId2) {
      return { success: false, message: '不能使用同一只灵兽进行合成' };
    }
    
    // 检查两只灵兽是否为同一模板
    if (pet1.templateId !== pet2.templateId) {
      return { success: false, message: '只能合成相同品种的灵兽' };
    }
    
    // 检查两只灵兽等级
    const minLevel = Math.min(pet1.level, pet2.level);
    if (minLevel < 10) {
      return { success: false, message: '两只灵兽都需要达到10级才能进行合成' };
    }
    
    const template = PetModels.getPetTemplate(pet1.templateId);
    if (!template) {
      return { success: false, message: '灵兽模板不存在' };
    }
    
    // 计算合成后的资质 (取两只灵兽资质的平均值，有概率提升)
    const talentLevels: TalentLevel[] = ['normal', 'good', 'excellent', 'legendary', 'godlike'];
    const talent1Index = talentLevels.indexOf(pet1.talentLevel);
    const talent2Index = talentLevels.indexOf(pet2.talentLevel);
    const avgTalentIndex = Math.floor((talent1Index + talent2Index) / 2);
    
    // 30%概率提升一级资质
    let newTalentLevel: TalentLevel = talentLevels[avgTalentIndex];
    if (Math.random() < 0.3 && avgTalentIndex < 4) {
      newTalentLevel = talentLevels[avgTalentIndex + 1];
    }
    
    // 合并技能
    const combinedSkills = [...new Set([...pet1.skills, ...pet2.skills, ...pet1.innateSkills, ...pet2.innateSkills])].slice(0, 4);
    
    // 计算合成后的属性 (取两只灵兽属性的平均值，等级继承较高的)
    const formConfig = EVOLUTION_CONFIGS.find(c => c.form === pet1.form) || EVOLUTION_CONFIGS[0];
    const talentConfig = TALENT_CONFIGS[newTalentLevel];
    
    const avgHealth = Math.floor((pet1.health + pet2.health) / 2 * 1.2);
    const avgAttack = Math.floor((pet1.attack + pet2.attack) / 2 * 1.2);
    const avgDefense = Math.floor((pet1.defense + pet2.defense) / 2 * 1.2);
    const avgSpeed = Math.floor((pet1.speed + pet2.speed) / 2 * 1.2);
    
    const newLevel = Math.max(pet1.level, pet2.level);
    
    // 创建新灵兽
    const newPet = PetModels.createPet(playerId, pet1.templateId, `${pet1.name}+${pet2.name}`);
    
    if (!newPet) {
      return { success: false, message: '合成失败' };
    }
    
    // 更新新灵兽的属性
    PetModels.updatePet(newPet.petId, {
      level: newLevel,
      exp: 0,
      talentLevel: newTalentLevel,
      health: avgHealth,
      attack: avgAttack,
      defense: avgDefense,
      speed: avgSpeed,
      skills: combinedSkills,
      form: Math.max(pet1.form, pet2.form),
      maxLevel: formConfig.maxLevel,
      appearance: formConfig.appearance
    });
    
    // 删除用于合成的两只灵兽
    PetModels.deletePet(petId1);
    PetModels.deletePet(petId2);
    
    const resultPet = PetModels.getPet(newPet.petId);
    
    return {
      success: true,
      pet: resultPet || undefined,
      message: `合成成功！两只${pet1.nameCn}合成为高品质灵兽，资质提升为${talentConfig.nameCn}！`
    };
  }

  // ========== 获取升级所需经验 ==========
  getExpRequired(playerId: number, petId: string): { success: boolean; data?: any; message: string } {
    const pet = PetModels.getPet(petId);
    
    if (!pet) {
      return { success: false, message: '灵兽不存在' };
    }
    
    const expToNextLevel = pet.level * 100;
    
    return {
      success: true,
      data: {
        currentLevel: pet.level,
        currentExp: pet.exp,
        expToNextLevel: expToNextLevel,
        maxLevel: pet.maxLevel,
        expProgress: Math.floor((pet.exp / expToNextLevel) * 100)
      }
    };
  }

  // ========== 获取合成信息 ==========
  getCombineInfo(playerId: number, petId: string): { success: boolean; data?: any; message: string } {
    const pet = PetModels.getPet(petId);
    
    if (!pet) {
      return { success: false, message: '灵兽不存在' };
    }
    
    if (pet.playerId !== playerId) {
      return { success: false, message: '这不是你的灵兽' };
    }
    
    // 获取玩家同模板的灵兽
    const playerPets = PetModels.getPlayerPets(playerId);
    const sameTemplatePets = playerPets.filter(p => 
      p.templateId === pet.templateId && 
      p.petId !== petId &&
      p.level >= 10
    );
    
    return {
      success: true,
      data: {
        currentPet: {
          petId: pet.petId,
          name: pet.name,
          level: pet.level,
          talentLevel: pet.talentLevel,
          form: pet.form
        },
        combineablePets: sameTemplatePets.map(p => ({
          petId: p.petId,
          name: p.name,
          level: p.level,
          talentLevel: p.talentLevel,
          form: p.form
        })),
        requirements: {
          minLevel: 10,
          sameTemplate: true,
          note: '需要两只相同品种且等级≥10的灵兽进行合成'
        }
      }
    };
  }
}

// 导出单例
export const petSystem = new PetSystem();
