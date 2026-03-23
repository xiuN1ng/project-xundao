// 翅膀系统 - 飞行翅膀外观与属性加成
// v1.0 版本：翅膀外观、翅膀属性加成

export interface Wing {
  wingId: string
  playerId: string
  templateId: string      // 翅膀模板ID
  name: string
  nameCN: string
  icon: string            // 翅膀图标
  description: string    // 翅膀描述
  
  // 属性加成
  attributes: Record<string, number>  // 基础属性加成
  
  // 状态
  isEquipped: boolean     // 是否已装备
  equippedAt?: number    // 装备时间
  
  // 时间戳
  obtainedAt: number     // 获取时间
  updatedAt: number      // 更新时间
}

export interface WingTemplate {
  templateId: string
  name: string
  nameCN: string
  icon: string
  description: string
  attributes: Record<string, number>  // 属性加成
  rarity: WingRarity  // 稀有度
  unlockLevel: number  // 解锁等级
}

export type WingRarity = 
  | 'common'     // 普通
  | 'rare'       // 稀有
  | 'epic'       // 史诗
  | 'legendary'  // 传说

// 翅膀模板配置
export const WING_TEMPLATES: WingTemplate[] = [
  {
    templateId: 'wing_qingyun',
    name: 'Qingyun Wing',
    nameCN: '青云翅',
    icon: 'wing_qingyun',
    description: '青云之翼，散发淡淡的青色光芒，增加50点攻击力',
    attributes: {
      attack: 50
    },
    rarity: 'rare',
    unlockLevel: 1
  },
  {
    templateId: 'wing_lieyan',
    name: 'Lieyan Wing',
    nameCN: '烈焰翅',
    icon: 'wing_lieyan',
    description: '烈焰之翼，燃烧着炽热的火焰，增加100点攻击力',
    attributes: {
      attack: 100
    },
    rarity: 'legendary',
    unlockLevel: 20
  },
  {
    templateId: 'wing_bingjing',
    name: 'Bingjing Wing',
    nameCN: '冰晶翅',
    icon: 'wing_bingjing',
    description: '冰晶之翼，由千年寒冰凝聚而成，增加80点防御力',
    attributes: {
      defense: 80
    },
    rarity: 'epic',
    unlockLevel: 10
  }
];

// 翅膀系统类
export class WingSystem {
  private playerWings: Map<string, Wing[]> = new Map();
  private playerEquippedWing: Map<string, string> = new Map();  // playerId -> wingId

  // 获取玩家拥有的翅膀列表
  getPlayerWings(playerId: string): Wing[] {
    return this.playerWings.get(playerId) || [];
  }

  // 获取玩家已装备的翅膀
  getEquippedWing(playerId: string): Wing | null {
    const wingId = this.playerEquippedWing.get(playerId);
    if (!wingId) return null;
    
    const wings = this.playerWings.get(playerId) || [];
    return wings.find(w => w.wingId === wingId) || null;
  }

  // 玩家是否拥有某个翅膀
  hasWing(playerId: string, templateId: string): boolean {
    const wings = this.playerWings.get(playerId) || [];
    return wings.some(w => w.templateId === templateId);
  }

  // 给予玩家翅膀
  giveWing(playerId: string, templateId: string): Wing | null {
    // 检查是否已有这个翅膀
    if (this.hasWing(playerId, templateId)) {
      return null;
    }

    const template = WING_TEMPLATES.find(t => t.templateId === templateId);
    if (!template) {
      return null;
    }

    const now = Date.now();
    const wing: Wing = {
      wingId: `wing_${playerId}_${templateId}_${now}`,
      playerId,
      templateId: template.templateId,
      name: template.name,
      nameCN: template.nameCN,
      icon: template.icon,
      description: template.description,
      attributes: { ...template.attributes },
      isEquipped: false,
      obtainedAt: now,
      updatedAt: now
    };

    const wings = this.playerWings.get(playerId) || [];
    wings.push(wing);
    this.playerWings.set(playerId, wings);

    return wing;
  }

  // 装备翅膀
  equipWing(playerId: string, wingId: string): { success: boolean; message: string; wing?: Wing } {
    const wings = this.playerWings.get(playerId) || [];
    const wing = wings.find(w => w.wingId === wingId);

    if (!wing) {
      return { success: false, message: '翅膀不存在' };
    }

    // 先卸下当前装备的翅膀
    const currentEquipped = this.playerEquippedWing.get(playerId);
    if (currentEquipped) {
      const currentWing = wings.find(w => w.wingId === currentEquipped);
      if (currentWing) {
        currentWing.isEquipped = false;
        currentWing.equippedAt = undefined;
      }
    }

    // 装备新翅膀
    wing.isEquipped = true;
    wing.equippedAt = Date.now();
    wing.updatedAt = Date.now();
    this.playerEquippedWing.set(playerId, wingId);

    return { success: true, message: '装备翅膀成功', wing };
  }

  // 卸下翅膀
  unequipWing(playerId: string): { success: boolean; message: string } {
    const wingId = this.playerEquippedWing.get(playerId);
    if (!wingId) {
      return { success: false, message: '未装备翅膀' };
    }

    const wings = this.playerWings.get(playerId) || [];
    const wing = wings.find(w => w.wingId === wingId);
    
    if (wing) {
      wing.isEquipped = false;
      wing.equippedAt = undefined;
      wing.updatedAt = Date.now();
    }

    this.playerEquippedWing.delete(playerId);
    return { success: true, message: '卸下翅膀成功' };
  }

  // 获取翅膀模板列表
  getWingTemplates(): WingTemplate[] {
    return WING_TEMPLATES.map(t => ({
      templateId: t.templateId,
      name: t.name,
      nameCN: t.nameCN,
      icon: t.icon,
      description: t.description,
      attributes: t.attributes,
      rarity: t.rarity,
      unlockLevel: t.unlockLevel
    }));
  }

  // 计算翅膀提供的总属性加成
  getWingAttributes(playerId: string): Record<string, number> {
    const equippedWing = this.getEquippedWing(playerId);
    if (!equippedWing) {
      return {};
    }
    return { ...equippedWing.attributes };
  }
}
