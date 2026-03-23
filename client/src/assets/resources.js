/**
 * 游戏资源映射表
 * 对应美术资源清单的228个资源
 * 
 * 使用方式:
 * import Resources from '@/assets/resources'
 * const icon = Resources.ui.iconHp
 * 
 * 当资源不存在时会返回undefined，显示默认占位符
 */

const Resources = {
  // ==================== UI界面 ====================
  ui: {
    topBarBg: null,  // require('@/assets/images/ui/top_bar_bg.png'),
    barLingshiIcon: null,
    barDiamondIcon: null,
    barXiuweiIcon: null,
    barExpIcon: null,
    bottomNavBg: null,
    navHomeIcon: null,
    navCultivateIcon: null,
    navSectIcon: null,
    navBattleIcon: null,
    navProfileIcon: null,
    btnNormalGreen: null,
    btnNormalGray: null,
    btnStrengthen: null,
    btnVip: null,
    btnBack: null,
    btnClose: null,
    btnBuy: null,
    btnConfirm: null,
    btnCancel: null,
    iconHp: null,
    iconAttack: null,
    iconDefense: null,
    iconSpeed: null,
    iconCrit: null,
    iconDodge: null
  },

  // ==================== 主角立绘 ====================
  player: {
    male: {
      mortal: null,
      qi: null,
      zhuJi: null,
      jinDan: null,
      yuanYing: null,
      huaShen: null,
      duJie: null,
      xianWang: null
    },
    female: {
      mortal: null,
      qi: null,
      zhuJi: null,
      jinDan: null,
      yuanYing: null,
      huaShen: null,
      duJie: null,
      xianWang: null
    }
  },

  // ==================== 境界特效 ====================
  effect: {
    qiWhite: null,
    zhuJiGold: null,
    jinDanRainbow: null,
    yuanYingShadow: null,
    huaShenFaxiang: null,
    duJieTianlei: null,
    feiShengGuang: null
  },

  // ==================== 灵兽 ====================
  beast: {
    fox: {
      normal: null,
      mutation: null,
      evolution: null
    },
    qingLong: null,
    baiHu: null,
    zhuQue: null,
    xuanWu: null,
    qiLin: null,
    kunPeng: null
  },

  // ==================== 灵兽品质光效 ====================
  glow: {
    common: null,
    uncommon: null,
    rare: null,
    epic: null,
    legendary: null,
    mythical: null
  },

  // ==================== 装备 ====================
  equipment: {
    sword: {
      common: null,
      uncommon: null,
      rare: null,
      epic: null,
      legendary: null,
      mythical: null
    },
    blade: {
      common: null,
      uncommon: null,
      rare: null,
      epic: null,
      legendary: null,
      mythical: null
    },
    staff: {
      common: null,
      uncommon: null,
      rare: null,
      epic: null,
      legendary: null,
      mythical: null
    },
    helmet: {
      common: null,
      uncommon: null,
      rare: null,
      epic: null,
      legendary: null,
      mythical: null
    },
    armor: {
      common: null,
      uncommon: null,
      rare: null,
      epic: null,
      legendary: null,
      mythical: null
    },
    boots: {
      common: null,
      uncommon: null,
      rare: null,
      epic: null,
      legendary: null,
      mythical: null
    },
    ring: {
      common: null,
      uncommon: null,
      rare: null,
      epic: null,
      legendary: null
    },
    necklace: {
      common: null,
      uncommon: null,
      rare: null,
      epic: null,
      legendary: null
    }
  },

  // ==================== 技能特效 ====================
  skill: {
    fireball: null,
    iceLance: null,
    thunder: null,
    swordRain: null,
    explosion: null,
    poisonFog: null,
    windBlade: null,
    heal: null,
    shield: null,
    freeze: null,
    buffAttack: null,
    buffDefense: null,
    buffSpeed: null,
    buffCrit: null,
    buffLifesteal: null,
    buffReflect: null,
    debuffPoison: null,
    debuffBurn: null,
    debuffFreeze: null,
    debuffStun: null,
    debuffSilence: null,
    debuffSlow: null
  },

  // ==================== NPC ====================
  npc: {
    merchantElder: null,
    merchantMiddle: null,
    merchantBeauty: null,
    merchantTaoist: null,
    villageChief: null,
    immortal: null,
    leader: null,
    elder: null
  },

  // ==================== 怪物 ====================
  monster: {
    bandit: null,
    skeleton: null,
    zombie: null,
    wolf: null,
    snake: null,
    spider: null,
    bat: null,
    centipede: null,
    tiger: null,
    bear: null
  },

  // ==================== BOSS ====================
  boss: {
    cultivatorJinDan: null,
    cultivatorYuanYing: null,
    cultivatorHuaShen: null,
    dragonJiao: null,
    phoenix: null,
    qiLin: null,
    demonLord: null,
    emperor: null
  },

  // ==================== 场景背景 ====================
  bg: {
    cultivate: null,
    battle: null,
    sect: null,
    beast: null,
    alchemy: null,
    battleField: null,
    battleArena: null,
    battleSectWar: null
  },

  // ==================== 丹药物品 ====================
  pill: {
    peiYuan: null,
    zhuJi: null,
    juQi: null,
    huiXue: null,
    gu: null,
    qingXin: null,
    daHuan: null
  },

  // ==================== 材料 ====================
  material: {
    herb: null,
    ore: null,
    skin: null,
    feather: null,
    bone: null,
    bead: null
  },

  // ==================== 宝箱 ====================
  chest: {
    wood: null,
    silver: null,
    gold: null,
    jade: null,
    immortal: null
  },

  // ==================== 坐骑 ====================
  mount: {
    whiteHorse: null,
    blackHorse: null,
    horseKing: null,
    crane: null,
    sword: null,
    gourd: null,
    cloud: null,
    dragon: null
  },

  // ==================== 翅膀 ====================
  wing: {
    white: null,
    blue: null,
    gold: null,
    purple: null,
    rainbow: null,
    dark: null,
    immortal: null
  },

  // ==================== 战斗UI ====================
  battle: {
    hpBarPlayer: null,
    hpBarEnemy: null,
    mpBar: null,
    btnNextRound: null,
    btnAutoBattle: null,
    btnSpeed2x: null,
    btnSkillUlti: null,
    popupDamage: null,
    popupCrit: null,
    popupHeal: null,
    popupDodge: null,
    popupExp: null
  },

  // ==================== 通用动画 ====================
  anim: {
    loading: null,
    levelup: null,
    getItem: null,
    signIn: null,
    reward: null,
    particleStar: null,
    particleCloud: null,
    particleFire: null,
    particleSnow: null,
    particlePetal: null
  }
}

/**
 * 资源就绪检查
 */
export function isResourceReady(path) {
  const parts = path.split('.')
  let result = Resources
  for (const part of parts) {
    result = result?.[part]
  }
  return result !== null && result !== undefined
}

export default Resources
