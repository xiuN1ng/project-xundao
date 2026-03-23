/**
 * 境界压制系统 - 跨境界战斗
 * 实现不同境界之间的战斗压制效果
 */

import { Router, Request, Response } from 'express';

const router = Router();

// 境界配置
const REALM_CONFIG = {
  '凡人': {
    level: 0,
    attackBonus: 1.0,
    defenseBonus: 1.0,
    hpBonus: 1.0,
    critBonus: 0,
   压制: [],
  },
  '练气期': {
    level: 10,
    attackBonus: 1.1,
    defenseBonus: 1.05,
    hpBonus: 1.1,
    critBonus: 0.05,
    压制: ['凡人'],
  },
  '筑基期': {
    level: 20,
    attackBonus: 1.2,
    defenseBonus: 1.1,
    hpBonus: 1.2,
    critBonus: 0.1,
    压制: ['凡人', '练气期'],
  },
  '金丹期': {
    level: 30,
    attackBonus: 1.3,
    defenseBonus: 1.15,
    hpBonus: 1.3,
    critBonus: 0.15,
    压制: ['凡人', '练气期', '筑基期'],
  },
  '元婴期': {
    level: 40,
    attackBonus: 1.4,
    defenseBonus: 1.2,
    hpBonus: 1.4,
    critBonus: 0.2,
    压制: ['凡人', '练气期', '筑基期', '金丹期'],
  },
  '化神期': {
    level: 50,
    attackBonus: 1.5,
    defenseBonus: 1.25,
    hpBonus: 1.5,
    critBonus: 0.25,
    压制: ['凡人', '练气期', '筑基期', '金丹期', '元婴期'],
  },
  '炼虚期': {
    level: 60,
    attackBonus: 1.6,
    defenseBonus: 1.3,
    hpBonus: 1.6,
    critBonus: 0.3,
    压制: ['凡人', '练气期', '筑基期', '金丹期', '元婴期', '化神期'],
  },
  '合体期': {
    level: 70,
    attackBonus: 1.7,
    defenseBonus: 1.35,
    hpBonus: 1.7,
    critBonus: 0.35,
    压制: ['凡人', '练气期', '筑基期', '金丹期', '元婴期', '化神期', '炼虚期'],
  },
  '大乘期': {
    level: 80,
    attackBonus: 1.8,
    defenseBonus: 1.4,
    hpBonus: 1.8,
    critBonus: 0.4,
    压制: ['凡人', '练气期', '筑基期', '金丹期', '元婴期', '化神期', '炼虚期', '合体期'],
  },
  '真仙': {
    level: 90,
    attackBonus: 2.0,
    defenseBonus: 1.5,
    hpBonus: 2.0,
    critBonus: 0.5,
    压制: ['凡人', '练气期', '筑基期', '金丹期', '元婴期', '化神期', '炼虚期', '合体期', '大乘期'],
  },
  '金仙': {
    level: 100,
    attackBonus: 2.2,
    defenseBonus: 1.6,
    hpBonus: 2.2,
    critBonus: 0.55,
    压制: ['凡人', '练气期', '筑基期', '金丹期', '元婴期', '化神期', '炼虚期', '合体期', '大乘期', '真仙'],
  },
  '大罗金仙': {
    level: 120,
    attackBonus: 2.5,
    defenseBonus: 1.8,
    hpBonus: 2.5,
    critBonus: 0.6,
    压制: ['凡人', '练气期', '筑基期', '金丹期', '元婴期', '化神期', '炼虚期', '合体期', '大乘期', '真仙', '金仙'],
  },
};

// 压制效果配置
const SUPPRESSION_EFFECT = {
  damageReduction: 0.2, // 压制方受到的伤害减少20%
  damageIncrease: 0.3,   // 压制方造成的伤害增加30%
  critReduction: 0.1,   // 被压制方暴击率减少10%
  critIncrease: 0.1,    // 压制方暴击率增加10%
};

// 玩家境界数据
interface PlayerRealm {
  playerId: string;
  realm: string;
  realmLevel: number;
  cultivation: number; // 修炼值
  breakthroughChance: number; // 突破成功率
}

// 玩家境界数据存储
const realmStore: Map<string, PlayerRealm> = new Map();

// 获取境界压制效果
router.get('/realm/suppression/:attackerRealm/:defenderRealm', (req: Request, res: Response) => {
  const { attackerRealm, defenderRealm } = req.params;
  
  const attacker = REALM_CONFIG[attackerRealm as keyof typeof REALM_CONFIG];
  const defender = REALM_CONFIG[defenderRealm as keyof typeof REALM_CONFIG];
  
  if (!attacker || !defender) {
    return res.json({ success: false, message: '境界不存在' });
  }
  
  // 检查是否存在压制关系
  const isSuppressing = attacker.压制.includes(defenderRealm);
  const isSuppressed = defender.压制.includes(attackerRealm);
  
  if (!isSuppressing && !isSuppressed && attackerRealm !== defenderRealm) {
    // 无压制关系，返回基础属性
    return res.json({
      success: true,
      data: {
        suppressionType: 'none',
        attackerBonus: {
          attack: attacker.attackBonus,
          defense: attacker.defenseBonus,
          hp: attacker.hpBonus,
          crit: attacker.critBonus,
        },
        defenderBonus: {
          attack: defender.attackBonus,
          defense: defender.defenseBonus,
          hp: defender.hpBonus,
          crit: defender.critBonus,
        },
      }
    });
  }
  
  if (isSuppressing) {
    // 攻击方压制防守方
    return res.json({
      success: true,
      data: {
        suppressionType: 'suppressing',
        message: `${attackerRealm} 压制 ${defenderRealm}`,
        attackerBonus: {
          attack: attacker.attackBonus * (1 + SUPPRESSION_EFFECT.damageIncrease),
          defense: attacker.defenseBonus * (1 + SUPPRESSION_EFFECT.damageReduction),
          hp: attacker.hpBonus,
          crit: attacker.critBonus + SUPPRESSION_EFFECT.critIncrease,
        },
        defenderBonus: {
          attack: defender.attackBonus,
          defense: defender.defenseBonus * (1 - SUPPRESSION_EFFECT.damageReduction),
          hp: defender.hpBonus,
          crit: defender.critBonus - SUPPRESSION_EFFECT.critReduction,
        },
        effects: {
          damageIncrease: `${SUPPRESSION_EFFECT.damageIncrease * 100}%`,
          damageReduction: `${SUPPRESSION_EFFECT.damageReduction * 100}%`,
          critIncrease: `${SUPPRESSION_EFFECT.critIncrease * 100}%`,
        }
      }
    });
  }
  
  // 防守方压制攻击方
  return res.json({
    success: true,
    data: {
      suppressionType: 'suppressed',
      message: `${defenderRealm} 压制 ${attackerRealm}`,
      attackerBonus: {
        attack: attacker.attackBonus * (1 - SUPPRESSION_EFFECT.damageReduction),
        defense: attacker.defenseBonus,
        hp: attacker.hpBonus,
        crit: attacker.critBonus - SUPPRESSION_EFFECT.critReduction,
      },
      defenderBonus: {
        attack: defender.attackBonus * (1 + SUPPRESSION_EFFECT.damageIncrease),
        defense: defender.defenseBonus * (1 + SUPPRESSION_EFFECT.damageReduction),
        hp: defender.hpBonus,
        crit: defender.critBonus + SUPPRESSION_EFFECT.critIncrease,
      },
      effects: {
        damageIncrease: `${SUPPRESSION_EFFECT.damageIncrease * 100}%`,
        damageReduction: `${SUPPRESSION_EFFECT.damageReduction * 100}%`,
        critReduction: `${SUPPRESSION_EFFECT.critReduction * 100}%`,
      }
    }
  });
});

// 获取玩家境界信息
router.get('/realm/:playerId', (req: Request, res: Response) => {
  const { playerId } = req.params;
  
  let playerRealm = realmStore.get(playerId);
  if (!playerRealm) {
    // 初始化玩家境界
    playerRealm = {
      playerId,
      realm: '凡人',
      realmLevel: 1,
      cultivation: 0,
      breakthroughChance: 0.1,
    };
    realmStore.set(playerId, playerRealm);
  }
  
  const realmConfig = REALM_CONFIG[playerRealm.realm as keyof typeof REALM_CONFIG];
  
  res.json({
    success: true,
    data: {
      ...playerRealm,
      config: realmConfig,
      canBreakthrough: playerRealm.cultivation >= 1000,
      nextRealm: getNextRealm(playerRealm.realm),
    }
  });
});

// 境界突破
router.post('/realm/breakthrough', (req: Request, res: Response) => {
  const { playerId } = req.body;
  
  if (!playerId) {
    return res.json({ success: false, message: '玩家ID不能为空' });
  }
  
  let playerRealm = realmStore.get(playerId);
  if (!playerRealm) {
    return res.json({ success: false, message: '玩家境界数据不存在' });
  }
  
  const nextRealm = getNextRealm(playerRealm.realm);
  if (!nextRealm) {
    return res.json({ success: false, message: '已达到最高境界' });
  }
  
  // 检查修炼值是否足够
  if (playerRealm.cultivation < 1000) {
    return res.json({ success: false, message: '修炼值不足，需要1000点' });
  }
  
  // 模拟突破成功率
  const success = Math.random() < playerRealm.breakthroughChance;
  
  if (success) {
    playerRealm.realm = nextRealm;
    playerRealm.realmLevel = 1;
    playerRealm.cultivation = 0;
    playerRealm.breakthroughChance = Math.max(0.05, playerRealm.breakthroughChance - 0.02);
    realmStore.set(playerId, playerRealm);
    
    const realmConfig = REALM_CONFIG[nextRealm as keyof typeof REALM_CONFIG];
    
    return res.json({
      success: true,
      message: `突破成功！恭喜进入 ${nextRealm}`,
      data: {
        newRealm: nextRealm,
        newRealmLevel: 1,
        bonuses: realmConfig,
      }
    });
  }
  
  // 突破失败
  playerRealm.cultivation = Math.max(0, playerRealm.cultivation - 500);
  realmStore.set(playerId, playerRealm);
  
  return res.json({
    success: false,
    message: '突破失败！修炼值损失500点',
    data: {
      remainingCultivation: playerRealm.cultivation,
      successChance: playerRealm.breakthroughChance,
    }
  });
});

// 修炼增加
router.post('/realm/cultivate', (req: Request, res: Response) => {
  const { playerId, amount } = req.body;
  
  if (!playerId) {
    return res.json({ success: false, message: '玩家ID不能为空' });
  }
  
  let playerRealm = realmStore.get(playerId);
  if (!playerRealm) {
    playerRealm = {
      playerId,
      realm: '凡人',
      realmLevel: 1,
      cultivation: 0,
      breakthroughChance: 0.1,
    };
  }
  
  const cultivationAmount = amount || 100;
  playerRealm.cultivation += cultivationAmount;
  
  // 计算突破成功率
  playerRealm.breakthroughChance = Math.min(0.9, 0.1 + playerRealm.cultivation / 10000);
  
  realmStore.set(playerId, playerRealm);
  
  res.json({
    success: true,
    message: `修炼增加 ${cultivationAmount} 点`,
    data: {
      cultivation: playerRealm.cultivation,
      breakthroughChance: Math.round(playerRealm.breakthroughChance * 100) / 100,
      canBreakthrough: playerRealm.cultivation >= 1000,
    }
  });
});

// 获取境界列表
router.get('/realm/list/all', (req: Request, res: Response) => {
  const realms = Object.entries(REALM_CONFIG).map(([name, config]) => ({
    name,
    level: config.level,
    attackBonus: config.attackBonus,
    defenseBonus: config.defenseBonus,
    hpBonus: config.hpBonus,
    critBonus: config.critBonus,
    suppressedRealms: config.压制,
  }));
  
  res.json({
    success: true,
    data: realms
  });
});

// 跨境界战斗计算
router.post('/realm/battle/calculate', (req: Request, res: Response) => {
  const { attackerRealm, defenderRealm, baseDamage } = req.body;
  
  if (!attackerRealm || !defenderRealm) {
    return res.json({ success: false, message: '境界参数不完整' });
  }
  
  const attacker = REALM_CONFIG[attackerRealm as keyof typeof REALM_CONFIG];
  const defender = REALM_CONFIG[defenderRealm as keyof typeof REALM_CONFIG];
  
  if (!attacker || !defender) {
    return res.json({ success: false, message: '境界不存在' });
  }
  
  let finalDamage = baseDamage || 100;
  let suppressionMessage = '';
  
  if (attacker.压制.includes(defenderRealm)) {
    // 攻击方压制防守方
    finalDamage *= (1 + SUPPRESSION_EFFECT.damageIncrease);
    suppressionMessage = `${attackerRealm} 压制 ${defenderRealm}，伤害提升${SUPPRESSION_EFFECT.damageIncrease * 100}%`;
  } else if (defender.压制.includes(attackerRealm)) {
    // 防守方压制攻击方
    finalDamage *= (1 - SUPPRESSION_EFFECT.damageReduction);
    suppressionMessage = `${defenderRealm} 压制 ${attackerRealm}，伤害降低${SUPPRESSION_EFFECT.damageReduction * 100}%`;
  }
  
  res.json({
    success: true,
    data: {
      baseDamage: baseDamage || 100,
      finalDamage: Math.round(finalDamage),
      suppressionMessage,
      suppressionType: attacker.压制.includes(defenderRealm) ? 'suppressing' : 
                       defender.压制.includes(attackerRealm) ? 'suppressed' : 'none',
    }
  });
});

// 获取下一个境界
function getNextRealm(currentRealm: string): string | null {
  const realmOrder = Object.keys(REALM_CONFIG);
  const currentIndex = realmOrder.indexOf(currentRealm);
  
  if (currentIndex < 0 || currentIndex >= realmOrder.length - 1) {
    return null;
  }
  
  return realmOrder[currentIndex + 1];
}

export default router;
