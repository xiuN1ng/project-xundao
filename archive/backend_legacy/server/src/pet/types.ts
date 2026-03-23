/**
 * 灵兽进化系统 - 类型定义
 */

// 资质等级
export type TalentLevel = 'normal' | 'good' | 'excellent' | 'legendary' | 'godlike';

// 灵兽
export interface Pet {
  petId: string;
  playerId: number;
  templateId: string;
  name: string;
  nameCn?: string;
  level: number;
  exp: number;
  form: number;              // 形态（进化阶段）
  talentLevel: TalentLevel;
  maxLevel: number;          // 当前形态的最大等级
  health: number;
  attack: number;
  defense: number;
  speed: number;
  skills: string[];          // 已学习技能ID列表
  innateSkills: string[];    // 天赋技能ID列表
  appearance: string;       // 外观
  createdAt: number;
  updatedAt: number;
}

// 灵兽模板
export interface PetTemplate {
  templateId: string;
  name: string;
  nameCn?: string;
  description?: string;
  baseHealth: number;
  baseAttack: number;
  baseDefense: number;
  baseSpeed: number;
  maxForm: number;           // 最大形态数
  evolutionItems: EvolutionItem[];  // 进化所需道具
  talentItems: TalentItem[];         // 资质提升所需道具
  learnableSkills: string[];         // 可学习的技能ID列表
  innateSkills: string[];            // 天赋技能ID列表
  icon?: string;
  rarity: string;
}

// 进化所需道具
export interface EvolutionItem {
  itemId: string;
  itemName: string;
  amount: number;
}

// 资质提升所需道具
export interface TalentItem {
  itemId: string;
  itemName: string;
  amount: number;
  talentUp?: number;        // 资质提升值
}

// 技能
export interface PetSkill {
  skillId: string;
  name: string;
  nameCn: string;
  description: string;
  type: 'passive' | 'active';
  effect: Record<string, any>;
  icon?: string;
}

// 进化配置
export interface EvolutionConfig {
  form: number;                    // 形态
  name: string;                    // 形态名称
  nameCn: string;                  // 中文名称
  maxLevel: number;                // 该形态最大等级
  attributeMultiplier: number;     // 属性倍数
  appearance: string;              // 外观ID
  description: string;             // 描述
}

// 资质提升配置
export interface TalentConfig {
  level: TalentLevel;
  name: string;
  nameCn: string;
  multiplier: number;             // 属性倍数
  color: string;                   // 显示颜色
  probability: number;             // 成功概率
}

// API 请求/响应类型
export interface PetListResponse {
  pets: Pet[];
}

export interface PetEvolveRequest {
  petId: string;
  itemId?: string;                 // 可选，使用指定进化石
}

export interface PetEvolveResponse {
  success: boolean;
  message: string;
  pet?: Pet;
}

export interface PetImproveTalentRequest {
  petId: string;
  itemId?: string;                 // 可选，使用指定资质丹
}

export interface PetImproveTalentResponse {
  success: boolean;
  message: string;
  pet?: Pet;
  improved?: boolean;
}

export interface PetLearnSkillRequest {
  petId: string;
  skillId: string;
}

export interface PetLearnSkillResponse {
  success: boolean;
  message: string;
  pet?: Pet;
}
