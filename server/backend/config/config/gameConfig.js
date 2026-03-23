/**
 * 游戏数值配置
 */

module.exports = {
  // 伤害公式
  damage: {
    base: 100,
    attackFactor: 1.5,
    defenseFactor: 0.5,
    speedFactor: 0.1,
    criticalRate: 0.1,
    criticalDamage: 1.5
  },

  // 升级经验
  levelExp: [
    0, 100, 200, 400, 800, 1500, 2500, 4000, 6000, 8500,
    12000, 16000, 21000, 27000, 34000, 42000, 52000, 64000, 78000, 95000
  ],

  // 境界配置
  realms: [
    { id: 1, name: '凡人', cost: 0, hp: 1000, attack: 100, defense: 50 },
    { id: 2, name: '练气', cost: 1000, hp: 2000, attack: 200, defense: 100 },
    { id: 3, name: '筑基', cost: 10000, hp: 5000, attack: 500, defense: 250 },
    { id: 4, name: '金丹', cost: 100000, hp: 15000, attack: 1500, defense: 750 },
    { id: 5, name: '元婴', cost: 1000000, hp: 50000, attack: 5000, defense: 2500 },
    { id: 6, name: '化神', cost: 10000000, hp: 150000, attack: 15000, defense: 7500 },
    { id: 7, name: '渡劫', cost: 100000000, hp: 500000, attack: 50000, defense: 25000 }
  ],

  // 掉落概率
  dropRates: {
    common: 0.5,
    uncommon: 0.3,
    rare: 0.15,
    epic: 0.04,
    legendary: 0.01
  },

  // 修炼效率
  cultivation: {
    basePerSecond: 1,
    offlineMaxHours: 8,
    realmBonus: 0.1
  },

  // 经济系统
  economy: {
    dailyFreeDiamonds: 10,
    maxLingshi: 999999999,
    transactionTax: 0.05
  },

  // 装备强化概率
  enhanceRates: [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 5, 5, 3, 3, 2, 1],
  
  // VIP配置
  vip: {
    1: { price: 30, dailyDiamonds: 10, shopDiscount: 0.05 },
    2: { price: 98, dailyDiamonds: 20, shopDiscount: 0.08 },
    3: { price: 298, dailyDiamonds: 30, shopDiscount: 0.10 },
    4: { price: 698, dailyDiamonds: 50, shopDiscount: 0.12 },
    5: { price: 1998, dailyDiamonds: 100, shopDiscount: 0.15 },
    6: { price: 4998, dailyDiamonds: 200, shopDiscount: 0.18 },
    7: { price: 9998, dailyDiamonds: 500, shopDiscount: 0.20 }
  }
};
