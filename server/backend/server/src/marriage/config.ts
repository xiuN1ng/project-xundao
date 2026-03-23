/**
 * 结婚系统 - 配置文件
 */

import { WeddingConfig, CoupleSkillConfig } from './types';

/** 结婚系统配置 */
export const MARRIAGE_CONFIG = {
  /** 最低结婚等级 */
  minPlayerLevel: 10,
  
  /** 最低友好度要求 */
  minFriendship: 1000,
  
  /** 离婚冷静期（毫秒）24小时 */
  divorceCooldown: 24 * 60 * 60 * 1000,
  
  /** 申请有效期（毫秒）7天 */
  applicationExpireTime: 7 * 24 * 60 * 60 * 1000,
  
  /** 婚礼类型配置 */
  weddingTypes: {
    simple: {
      name: '简约婚礼',
      cost: 9999,
      duration: 7,
      bonus: 1.1,
      requiredLevel: 10,
    },
    grand: {
      name: '豪华婚礼',
      cost: 99999,
      duration: 30,
      bonus: 1.2,
      requiredLevel: 30,
    },
    legendary: {
      name: '传奇婚礼',
      cost: 999999,
      duration: 365,
      bonus: 1.5,
      requiredLevel: 50,
    },
  } as Record<string, WeddingConfig>,
  
  /** 夫妻技能配置 */
  coupleSkills: [
    {
      skillId: 'couple_001',
      name: '同心协力',
      description: '夫妻同时在线修炼经验+10%',
      effect: { type: 'exp_bonus', value: 0.1 },
      requiredWeddingType: 'simple',
    },
    {
      skillId: 'couple_002',
      name: '双修加成',
      description: '双修获得经验+20%',
      effect: { type: 'exp_bonus', value: 0.2 },
      requiredWeddingType: 'simple',
    },
    {
      skillId: 'couple_003',
      name: '灵犀一点',
      description: '战斗支援速度+15%',
      effect: { type: 'battle_support', value: 0.15 },
      requiredWeddingType: 'grand',
    },
    {
      skillId: 'couple_004',
      name: '心有灵犀',
      description: '灵石获取+15%',
      effect: { type: 'spirit_bonus', value: 0.15 },
      requiredWeddingType: 'grand',
    },
    {
      skillId: 'couple_005',
      name: '神仙眷侣',
      description: '全属性加成+20%',
      effect: { type: 'defense_bonus', value: 0.2 },
      requiredWeddingType: 'legendary',
    },
    {
      skillId: 'couple_006',
      name: '天作之合',
      description: '渡劫成功率+10%',
      effect: { type: 'defense_bonus', value: 0.1 },
      requiredWeddingType: 'legendary',
    },
  ] as CoupleSkillConfig[],
  
  /** 亲密度等级配置 */
  intimacyLevels: [
    { level: '萍水', min: 0, max: 499, title: '初识', spiritBonus: 0.05, expBonus: 0.05 },
    { level: '知己', min: 500, max: 1999, title: '知己', spiritBonus: 0.10, expBonus: 0.10 },
    { level: '伴侣', min: 2000, max: 4999, title: '道侣', spiritBonus: 0.15, expBonus: 0.15 },
    { level: '神仙眷侣', min: 5000, max: 9999, title: '神仙眷侣', spiritBonus: 0.25, expBonus: 0.25 },
    { level: '天作之合', min: 10000, max: 999999, title: '天作之合', spiritBonus: 0.40, expBonus: 0.40 },
  ],
};

/** 获取亲密度等级 */
export function getIntimacyLevel(intimacy: number) {
  for (const level of MARRIAGE_CONFIG.intimacyLevels) {
    if (intimacy >= level.min && intimacy <= level.max) {
      return level;
    }
  }
  return MARRIAGE_CONFIG.intimacyLevels[0];
}

/** 获取婚礼配置 */
export function getWeddingConfig(type: string): WeddingConfig | null {
  return MARRIAGE_CONFIG.weddingTypes[type] || null;
}

/** 根据婚礼类型获取可用技能 */
export function getSkillsByWeddingType(weddingType: string): CoupleSkillConfig[] {
  const typeOrder = ['simple', 'grand', 'legendary'];
  const typeIndex = typeOrder.indexOf(weddingType);
  
  if (typeIndex === -1) return [];
  
  return MARRIAGE_CONFIG.coupleSkills.filter(
    skill => typeOrder.indexOf(skill.requiredWeddingType) <= typeIndex
  );
}
