/**
 * 挂机修仙 - 境界系统 v3.1 (数值优化版)
 * 99阶境界体系 - 数值曲线优化
 * 
 * 优化策略：
 * 1. 突破消耗使用分段增长：1-30阶增长率1.2，31-60阶1.4，61-90阶1.6，91-99阶1.8
 * 2. realm_bonus 从 1.0~50.0 改为 1.0~10.0
 * 3. 灵气获取效率提升，保持可玩性
 */

// 分段增长率
const CULTIVATION_GROWTH = {
  1: 1.15,   // 凡人
  10: 1.18,  // 练气
  19: 1.20,  // 筑基
  28: 1.22,  // 金丹
  37: 1.25,  // 元婴
  46: 1.28,  // 化神
  55: 1.32,  // 炼虚
  64: 1.35,  // 合体
  73: 1.40,  // 大乘
  82: 1.45,  // 渡劫
  91: 1.50   // 仙人
};

// 计算突破消耗
function calculateCultivationReq(order) {
  let base = 100;
  for (const [threshold, growth] of Object.entries(CULTIVATION_GROWTH)) {
    if (order >= parseInt(threshold)) {
      const diff = order - parseInt(threshold) + 1;
      base = base * Math.pow(growth, diff);
    }
  }
  return Math.floor(base);
}

// 境界名称映射
const REALM_NAMES = {
  0: '凡人', 1: '练气期', 2: '筑基期', 3: '金丹期', 4: '元婴期',
  5: '化神期', 6: '炼虚期', 7: '合体期', 8: '大乘期', 9: '渡劫期', 10: '仙人'
};

const REALM_DATA_V3_OPTIMIZED = {};

// 生成优化的境界数据
function generateOptimizedRealmData() {
  let cultivationReq = 0;
  
  for (let order = 1; order <= 99; order++) {
    // 计算当前阶的突破消耗
    const prevReq = cultivationReq;
    cultivationReq = calculateCultivationReq(order);
    
    // 境界和阶段
    const realmIndex = Math.floor((order - 1) / 9);
    const phaseIndex = Math.floor(((order - 1) % 9) / 3);
    const phaseNames = ['前期', '中期', '后期'];
    const realmName = REALM_NAMES[realmIndex] || '仙人';
    const phaseName = phaseNames[phaseIndex];
    const realmOrder = ((order - 1) % 3) + 1;
    
    // 计算属性（使用较平缓的成长曲线）
    const baseMultiplier = Math.pow(1.08, order - 1);  // 8%每阶
    
    const spirit_base = Math.floor(50 * baseMultiplier);
    const spirit_rate = Math.floor(5 * baseMultiplier);
    const hp_base = Math.floor(100 * baseMultiplier);
    const atk_base = Math.floor(10 * baseMultiplier);
    const def_base = Math.floor(2 * baseMultiplier);
    
    // realm_bonus: 1.0 -> 10.0 (线性增长)
    const realm_bonus = 1.0 + (order - 1) * 0.09;
    
    const key = `${realmName}-${phaseName}-${realmOrder}阶`;
    
    REALM_DATA_V3_OPTIMIZED[key] = {
      name: realmName,
      phase: phaseName,
      order: order,
      cultivation_req: cultivationReq,
      spirit_base: spirit_base,
      spirit_rate: spirit_rate,
      hp_base: hp_base,
      atk_base: atk_base,
      def_base: def_base,
      realm_bonus: Math.round(realm_bonus * 100) / 100,
      desc: getRealmDescription(realmName, phaseName)
    };
  }
  
  // 凡人第一阶不需要突破
  REALM_DATA_V3_OPTIMIZED['凡人-前期-1阶'].cultivation_req = 0;
}

function getRealmDescription(realm, phase) {
  const descriptions = {
    '凡人': '刚刚踏入修仙之路的凡人',
    '练气期': '吸纳灵气入体，初步感应天地',
    '筑基期': '灵气化液，筑就仙道根基',
    '金丹期': '金丹凝聚，法力大增',
    '元婴期': '元婴出窍，神通广大',
    '化神期': '化神返虚，已非凡人',
    '炼虚期': '炼虚合道，虚实转换',
    '合体期': '身与道合，超凡入圣',
    '大乘期': '功德圆满，只待飞升',
    '渡劫期': '历经天劫，逆天改命',
    '仙人': '跳出三界外，不在五行中'
  };
  return descriptions[realm] || '';
}

// 生成数据
generateOptimizedRealmData();

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    REALM_DATA_V3_OPTIMIZED,
    CULTIVATION_GROWTH,
    calculateCultivationReq
  };
}
