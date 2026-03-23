/**
 * 结婚系统 - 类型定义
 */

/** 婚礼类型 */
export type WeddingType = 'simple' | 'grand' | 'legendary';

/** 婚姻状态 */
export type MarriageStatus = 'single' | 'engaged' | 'married' | 'divorce_pending';

/** 离婚状态 */
export type DivorceStatus = 'none' | 'pending' | 'confirmed';

/** 婚礼配置 */
export interface WeddingConfig {
  name: string;
  cost: number;
  duration: number;
  bonus: number;
  requiredLevel: number;
}

/** 夫妻技能配置 */
export interface CoupleSkillConfig {
  skillId: string;
  name: string;
  description: string;
  effect: {
    type: 'exp_bonus' | 'spirit_bonus' | 'battle_support' | 'defense_bonus';
    value: number;
  };
  requiredWeddingType: WeddingType;
}

/** 玩家婚姻数据 */
export interface PlayerMarriage {
  playerId: number;
  spouseId: number | null;
  status: MarriageStatus;
  weddingType: WeddingType | null;
  weddingTime: number | null;
  weddingExpireTime: number | null;
  divorceStatus: DivorceStatus;
  divorceRequestTime: number | null;
  coupleSkills: string[];
  createdAt: number;
  updatedAt: number;
}

/** 结婚申请 */
export interface MarriageApplication {
  id: number;
  applicantId: number;
  targetId: number;
  weddingType: WeddingType;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  giftItems?: string;
  message?: string;
  createdAt: number;
  respondedAt: number | null;
}

/** 婚礼记录 */
export interface WeddingRecord {
  id: number;
  player1Id: number;
  player2Id: number;
  weddingType: WeddingType;
  weddingTime: number;
  expireTime: number;
  witness1?: string;
  witness2?: string;
  blessings?: string;
}

/** 夫妻技能实例 */
export interface PlayerCoupleSkill {
  id: number;
  playerId: number;
  skillId: string;
  level: number;
  unlockedAt: number;
}
