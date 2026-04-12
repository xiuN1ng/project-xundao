/**
 * 钓鱼系统配置
 * 钓鱼点、鱼种、品质等级等配置
 */

module.exports = {
  // 钓鱼品质等级定义
  qualityTiers: [
    { name: '普通', color: '#FFFFFF', multiplier: 1.0, suffix: '' },
    { name: '优秀', color: '#00FF00', multiplier: 1.3, suffix: '优秀' },
    { name: '精良', color: '#0070FF', multiplier: 1.6, suffix: '精良' },
    { name: '史诗', color: '#A335EE', multiplier: 2.0, suffix: '史诗' },
    { name: '传说', color: '#FF8000', multiplier: 2.5, suffix: '传说' },
  ],

  // 鱼竿等级配置
  rodLevels: [
    { level: 1, name: '木制鱼竿', exp: 0, cost: 0 },
    { level: 2, name: '竹制鱼竿', exp: 100, cost: 100 },
    { level: 3, name: '铁制鱼竿', exp: 300, cost: 250 },
    { level: 4, name: '精钢鱼竿', exp: 600, cost: 500 },
    { level: 5, name: '白银鱼竿', exp: 1000, cost: 1000 },
    { level: 6, name: '黄金鱼竿', exp: 1500, cost: 2000 },
    { level: 7, name: '灵玉鱼竿', exp: 2200, cost: 3500 },
    { level: 8, name: '龙魂鱼竿', exp: 3000, cost: 5000 },
    { level: 9, name: '天蚕鱼竿', exp: 4000, cost: 8000 },
    { level: 10, name: '仙灵鱼竿', exp: 5200, cost: 12000 },
  ],

  // 钓鱼等待时间配置（秒）
  waitTime: {
    base: 8,
    min: 3,
    reductionPerLevel: 0.05, // 每级减少5%
  },

  // 钓鱼成功率基础值
  catchRate: {
    base: 0.5,
    max: 0.95,
    bonusPerLevel: 0.08,
  },

  // 钓鱼统计配置
  stats: {
    expPerCatch: 5,
    expPerCast: 1,
  },
};
