/**
 * 灵兽进化系统 - 模块导出
 */

export { petSystem, petSystem as PetSystem, EVOLUTION_CONFIGS, TALENT_CONFIGS, PET_SKILLS } from './pet-system';
export type { 
  Pet, 
  PetTemplate, 
  PetSkill, 
  EvolutionConfig, 
  TalentLevel,
  TalentConfig,
  EvolutionItem,
  TalentItem
} from './types';

// 数据库模型导出
export * from './pet-models';

// API导出
export { default as petApiRouter } from './pet-api';

// 初始化函数
export function initPetSystem(db: any) {
  // 初始化数据库表
  const { initPetDatabase } = require('./pet-models');
  initPetDatabase(db);
  
  // 初始化默认灵兽模板
  const { insertPetTemplate, getAllPetTemplates } = require('./pet-models');
  const templates = getAllPetTemplates();
  
  if (templates.length === 0) {
    console.log('[Pet] 初始化默认灵兽模板...');
    insertPetTemplate({
      templateId: 'pet_xiaohuang',
      name: 'Little Yellow',
      nameCn: '小黄',
      description: '一只可爱的小黄鸡资质平庸，但性格温顺',
      baseHealth: 1000,
      baseAttack: 100,
      baseDefense: 50,
      baseSpeed: 50,
      maxForm: 5,
      evolutionItems: [
        { itemId: 'evolution_stone_basic', itemName: '进化石', amount: 1 }
      ],
      talentItems: [
        { itemId: 'talent_pill_good', itemName: '资质丹(优秀)', amount: 1, talentUp: 1 },
        { itemId: 'talent_pill_excellent', itemName: '资质丹(卓越)', amount: 1, talentUp: 2 }
      ],
      learnableSkills: [
        'pet_skill_fire_breath',
        'pet_skill_ice_shield',
        'pet_skill_passive_strength',
        'pet_skill_passive_vitality'
      ],
      innateSkills: [
        'pet_skill_passive_strength'
      ],
      icon: 'pet_xiaohuang',
      rarity: 'normal'
    });
    
    insertPetTemplate({
      templateId: 'pet_xuanwu',
      name: 'Xuanwu',
      nameCn: '玄武',
      description: '神兽玄武，天生具有强大的防御力',
      baseHealth: 2000,
      baseAttack: 80,
      baseDefense: 150,
      baseSpeed: 30,
      maxForm: 5,
      evolutionItems: [
        { itemId: 'evolution_stone_advanced', itemName: '高级进化石', amount: 1 }
      ],
      talentItems: [
        { itemId: 'talent_pill_excellent', itemName: '资质丹(卓越)', amount: 1, talentUp: 2 },
        { itemId: 'talent_pill_legendary', itemName: '资质丹(传说)', amount: 1, talentUp: 3 }
      ],
      learnableSkills: [
        'pet_skill_ice_shield',
        'pet_skill_thunder_strike',
        'pet_skill_passive_defense',
        'pet_skill_passive_vitality'
      ],
      innateSkills: [
        'pet_skill_passive_defense'
      ],
      icon: 'pet_xuanwu',
      rarity: 'legendary'
    });
    
    insertPetTemplate({
      templateId: 'pet_baihu',
      name: 'Baihu',
      nameCn: '白虎',
      description: '神兽白虎，天生具有强大的攻击力',
      baseHealth: 1500,
      baseAttack: 200,
      baseDefense: 60,
      baseSpeed: 80,
      maxForm: 5,
      evolutionItems: [
        { itemId: 'evolution_stone_advanced', itemName: '高级进化石', amount: 1 }
      ],
      talentItems: [
        { itemId: 'talent_pill_excellent', itemName: '资质丹(卓越)', amount: 1, talentUp: 2 },
        { itemId: 'talent_pill_legendary', itemName: '资质丹(传说)', amount: 1, talentUp: 3 }
      ],
      learnableSkills: [
        'pet_skill_fire_breath',
        'pet_skill_power_strike',
        'pet_skill_passive_strength',
        'pet_skill_thunder_strike'
      ],
      innateSkills: [
        'pet_skill_passive_strength'
      ],
      icon: 'pet_baihu',
      rarity: 'legendary'
    });
    
    insertPetTemplate({
      templateId: 'pet_qilin',
      name: 'Qilin',
      nameCn: '麒麟',
      description: '神兽麒麟，天生具有治愈能力',
      baseHealth: 1800,
      baseAttack: 120,
      baseDefense: 80,
      baseSpeed: 100,
      maxForm: 5,
      evolutionItems: [
        { itemId: 'evolution_stone_advanced', itemName: '高级进化石', amount: 1 }
      ],
      talentItems: [
        { itemId: 'talent_pill_legendary', itemName: '资质丹(传说)', amount: 1, talentUp: 3 },
        { itemId: 'talent_pill_godlike', itemName: '资质丹(神品)', amount: 1, talentUp: 4 }
      ],
      learnableSkills: [
        'pet_skill_healing',
        'pet_skill_ice_shield',
        'pet_skill_passive_vitality',
        'pet_skill_passive_defense'
      ],
      innateSkills: [
        'pet_skill_healing'
      ],
      icon: 'pet_qilin',
      rarity: 'godlike'
    });
    
    console.log('[Pet] 默认灵兽模板初始化完成');
  }
}
