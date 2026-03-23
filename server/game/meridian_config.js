/**
 * 经脉穴位系统配置
 * 定义穴位类型、效果和冲穴规则
 */

// ==================== 经脉体系配置 ====================
const MERIDIAN_CONFIG = {
  // 是否启用经脉系统
  enabled: true,
  
  // 冲穴冷却时间(毫秒)
  cooldownMs: 0,
  
  // 失败返还灵气比例
  refundRatio: 0.5,
  
  // 境界成功率加成
  // 每提升1个境界阶，加成多少成功率
  realmSuccessBonus: 0.1,
  
  // 最大成功率上限
  maxSuccessRate: 0.95,
  
  // 最小成功率下限
  minSuccessRate: 0.1
};

// ==================== 穴位效果类型 ====================
const ACUPOINT_EFFECT_TYPES = {
  ATK: 'atk',           // 攻击加成
  DEF: 'def',           // 防御加成
  HP: 'hp',             // 生命加成
  SPIRIT: 'spirit',     // 灵气加成
  CRIT: 'crit',         // 暴击率加成
  DODGE: 'dodge',      // 闪避率加成
  ATK_PERCENT: 'atk_percent',   // 攻击百分比加成
  DEF_PERCENT: 'def_percent',   // 防御百分比加成
  HP_PERCENT: 'hp_percent'      // 生命百分比加成
};

// ==================== 经脉定义 ====================
const MERIDIANS = {
  // 任脉 - 阴脉之海
  ren: {
    id: 'ren',
    name: '任脉',
    description: '阴脉之海，主生殖、消化',
    type: 'yin',
    color: '#4FC3F7',
    icon: '🌊',
    acupoints: [
      { id: 'ren_1', name: '会阴', position: 1, effect: { type: 'hp', value: 50 }, reqRealm: 0, reqLevel: 1, cost: 100 },
      { id: 'ren_2', name: '曲骨', position: 2, effect: { type: 'hp', value: 80 }, reqRealm: 0, reqLevel: 3, cost: 200 },
      { id: 'ren_3', name: '中极', position: 3, effect: { type: 'atk', value: 10 }, reqRealm: 1, reqLevel: 1, cost: 400 },
      { id: 'ren_4', name: '关元', position: 4, effect: { type: 'hp', value: 120 }, reqRealm: 1, reqLevel: 3, cost: 600 },
      { id: 'ren_5', name: '石门', position: 5, effect: { type: 'def', value: 5 }, reqRealm: 2, reqLevel: 1, cost: 1000 },
      { id: 'ren_6', name: '气海', position: 6, effect: { type: 'spirit', value: 20 }, reqRealm: 2, reqLevel: 3, cost: 1500 },
      { id: 'ren_7', name: '阴交', position: 7, effect: { type: 'hp_percent', value: 0.05 }, reqRealm: 3, reqLevel: 1, cost: 2500 },
      { id: 'ren_8', name: '神阙', position: 8, effect: { type: 'atk', value: 20 }, reqRealm: 3, reqLevel: 3, cost: 3500 },
      { id: 'ren_9', name: '水分', position: 9, effect: { type: 'def', value: 10 }, reqRealm: 4, reqLevel: 1, cost: 5000 },
      { id: 'ren_10', name: '下脘', position: 10, effect: { type: 'hp', value: 200 }, reqRealm: 4, reqLevel: 3, cost: 7000 },
      { id: 'ren_11', name: '建里', position: 11, effect: { type: 'crit', value: 0.02 }, reqRealm: 5, reqLevel: 1, cost: 10000 },
      { id: 'ren_12', name: '中脘', position: 12, effect: { type: 'atk_percent', value: 0.08 }, reqRealm: 5, reqLevel: 3, cost: 15000 },
      { id: 'ren_13', name: '上脘', position: 13, effect: { type: 'def_percent', value: 0.08 }, reqRealm: 6, reqLevel: 1, cost: 22000 },
      { id: 'ren_14', name: '巨阙', position: 14, effect: { type: 'hp_percent', value: 0.1 }, reqRealm: 6, reqLevel: 3, cost: 30000 },
      { id: 'ren_15', name: '鸠尾', position: 15, effect: { type: 'spirit', value: 50 }, reqRealm: 7, reqLevel: 1, cost: 45000 },
      { id: 'ren_16', name: '中庭', position: 16, effect: { type: 'atk', value: 40 }, reqRealm: 7, reqLevel: 3, cost: 60000 },
      { id: 'ren_17', name: '膻中', position: 17, effect: { type: 'hp_percent', value: 0.12 }, reqRealm: 8, reqLevel: 1, cost: 80000 },
      { id: 'ren_18', name: '玉堂', position: 18, effect: { type: 'def_percent', value: 0.1 }, reqRealm: 8, reqLevel: 3, cost: 100000 },
      { id: 'ren_19', name: '紫宫', position: 19, effect: { type: 'crit', value: 0.03 }, reqRealm: 9, reqLevel: 1, cost: 130000 },
      { id: 'ren_20', name: '华盖', position: 20, effect: { type: 'atk_percent', value: 0.1 }, reqRealm: 9, reqLevel: 3, cost: 160000 },
      { id: 'ren_21', name: '璇玑', position: 21, effect: { type: 'dodge', value: 0.02 }, reqRealm: 10, reqLevel: 1, cost: 200000 },
      { id: 'ren_22', name: '天突', position: 22, effect: { type: 'spirit', value: 100 }, reqRealm: 10, reqLevel: 3, cost: 250000 },
      { id: 'ren_23', name: '廉泉', position: 23, effect: { type: 'hp_percent', value: 0.15 }, reqRealm: 11, reqLevel: 1, cost: 320000 },
      { id: 'ren_24', name: '承浆', position: 24, effect: { type: 'atk_def_hp_percent', value: 0.08 }, reqRealm: 11, reqLevel: 3, cost: 400000 }
    ]
  },
  
  // 督脉 - 阳脉之海
  du: {
    id: 'du',
    name: '督脉',
    description: '阳脉之海，主阳气、脑部',
    type: 'yang',
    color: '#EF5350',
    icon: '🔥',
    acupoints: [
      { id: 'du_1', name: '长强', position: 1, effect: { type: 'def', value: 5 }, reqRealm: 0, reqLevel: 1, cost: 100 },
      { id: 'du_2', name: '腰俞', position: 2, effect: { type: 'hp', value: 60 }, reqRealm: 0, reqLevel: 3, cost: 200 },
      { id: 'du_3', name: '腰阳关', position: 3, effect: { type: 'def', value: 8 }, reqRealm: 1, reqLevel: 1, cost: 400 },
      { id: 'du_4', name: '命门', position: 4, effect: { type: 'hp_percent', value: 0.03 }, reqRealm: 1, reqLevel: 3, cost: 600 },
      { id: 'du_5', name: '悬枢', position: 5, effect: { type: 'atk', value: 8 }, reqRealm: 2, reqLevel: 1, cost: 1000 },
      { id: 'du_6', name: '脊中', position: 6, effect: { type: 'def', value: 12 }, reqRealm: 2, reqLevel: 3, cost: 1500 },
      { id: 'du_7', name: '中枢', position: 7, effect: { type: 'atk_percent', value: 0.05 }, reqRealm: 3, reqLevel: 1, cost: 2500 },
      { id: 'du_8', name: '筋缩', position: 8, effect: { type: 'hp', value: 150 }, reqRealm: 3, reqLevel: 3, cost: 3500 },
      { id: 'du_9', name: '至阳', position: 9, effect: { type: 'crit', value: 0.015 }, reqRealm: 4, reqLevel: 1, cost: 5000 },
      { id: 'du_10', name: '灵台', position: 10, effect: { type: 'def_percent', value: 0.05 }, reqRealm: 4, reqLevel: 3, cost: 7000 },
      { id: 'du_11', name: '神道', position: 11, effect: { type: 'atk', value: 15 }, reqRealm: 5, reqLevel: 1, cost: 10000 },
      { id: 'du_12', name: '身柱', position: 12, effect: { type: 'hp_percent', value: 0.08 }, reqRealm: 5, reqLevel: 3, cost: 15000 },
      { id: 'du_13', name: '陶道', position: 13, effect: { type: 'def', value: 20 }, reqRealm: 6, reqLevel: 1, cost: 22000 },
      { id: 'du_14', name: '大椎', position: 14, effect: { type: 'atk_percent', value: 0.1 }, reqRealm: 6, reqLevel: 3, cost: 30000 },
      { id: 'du_15', name: '哑门', position: 15, effect: { type: 'spirit', value: 30 }, reqRealm: 7, reqLevel: 1, cost: 45000 },
      { id: 'du_16', name: '风府', position: 16, effect: { type: 'crit', value: 0.025 }, reqRealm: 7, reqLevel: 3, cost: 60000 },
      { id: 'du_17', name: '脑户', position: 17, effect: { type: 'dodge', value: 0.015 }, reqRealm: 8, reqLevel: 1, cost: 80000 },
      { id: 'du_18', name: '强间', position: 18, effect: { type: 'hp_percent', value: 0.12 }, reqRealm: 8, reqLevel: 3, cost: 100000 },
      { id: 'du_19', name: '后顶', position: 19, effect: { type: 'def_percent', value: 0.1 }, reqRealm: 9, reqLevel: 1, cost: 130000 },
      { id: 'du_20', name: '百会', position: 20, effect: { type: 'atk_def_hp_percent', value: 0.1 }, reqRealm: 9, reqLevel: 3, cost: 160000 },
      { id: 'du_21', name: '前顶', position: 21, effect: { type: 'spirit', value: 80 }, reqRealm: 10, reqLevel: 1, cost: 200000 },
      { id: 'du_22', name: '囟会', position: 22, effect: { type: 'crit', value: 0.04 }, reqRealm: 10, reqLevel: 3, cost: 250000 },
      { id: 'du_23', name: '上星', position: 23, effect: { type: 'atk_percent', value: 0.12 }, reqRealm: 11, reqLevel: 1, cost: 320000 },
      { id: 'du_24', name: '神庭', position: 24, effect: { type: 'all_stats_percent', value: 0.15 }, reqRealm: 11, reqLevel: 3, cost: 400000 }
    ]
  },
  
  // 带脉 - 约束诸经
  dai: {
    id: 'dai',
    name: '带脉',
    description: '约束诸经，主腰部力量',
    type: 'balance',
    color: '#66BB6A',
    icon: '⭕',
    acupoints: [
      { id: 'dai_1', name: '带脉穴', position: 1, effect: { type: 'def', value: 10 }, reqRealm: 0, reqLevel: 5, cost: 500 },
      { id: 'dai_2', name: '五枢', position: 2, effect: { type: 'hp', value: 100 }, reqRealm: 1, reqLevel: 5, cost: 1000 },
      { id: 'dai_3', name: '维道', position: 3, effect: { type: 'dodge', value: 0.02 }, reqRealm: 2, reqLevel: 5, cost: 2000 },
      { id: 'dai_4', name: '居髎', position: 4, effect: { type: 'atk', value: 15 }, reqRealm: 3, reqLevel: 5, cost: 4000 },
      { id: 'dai_5', name: '京门', position: 5, effect: { type: 'hp_percent', value: 0.06 }, reqRealm: 4, reqLevel: 5, cost: 8000 },
      { id: 'dai_6', name: '天枢', position: 6, effect: { type: 'def_percent', value: 0.06 }, reqRealm: 5, reqLevel: 5, cost: 15000 },
      { id: 'dai_7', name: '大横', position: 7, effect: { type: 'atk_percent', value: 0.06 }, reqRealm: 6, reqLevel: 5, cost: 25000 },
      { id: 'dai_8', name: '腹结', position: 8, effect: { type: 'crit', value: 0.02 }, reqRealm: 7, reqLevel: 5, cost: 40000 },
      { id: 'dai_9', name: '府舍', position: 9, effect: { type: 'hp', value: 300 }, reqRealm: 8, reqLevel: 5, cost: 60000 },
      { id: 'dai_10', name: '冲门', position: 10, effect: { type: 'def', value: 30 }, reqRealm: 9, reqLevel: 5, cost: 90000 },
      { id: 'dai_11', name: '腹哀', position: 11, effect: { type: 'spirit', value: 60 }, reqRealm: 10, reqLevel: 5, cost: 130000 },
      { id: 'dai_12', name: '大包', position: 12, effect: { type: 'atk_def_hp_percent', value: 0.12 }, reqRealm: 11, reqLevel: 5, cost: 200000 }
    ]
  },
  
  // 冲脉 - 十二经之海
  chong: {
    id: 'chong',
    name: '冲脉',
    description: '十二经之海，主气血运行',
    type: 'balance',
    color: '#AB47BC',
    icon: '🌊',
    acupoints: [
      { id: 'chong_1', name: '气冲', position: 1, effect: { type: 'atk', value: 12 }, reqRealm: 1, reqLevel: 1, cost: 800 },
      { id: 'chong_2', name: '水道', position: 2, effect: { type: 'hp', value: 120 }, reqRealm: 2, reqLevel: 1, cost: 1600 },
      { id: 'chong_3', name: '归来', position: 3, effect: { type: 'def', value: 10 }, reqRealm: 3, reqLevel: 1, cost: 3000 },
      { id: 'chong_4', name: '气穴', position: 4, effect: { type: 'spirit', value: 25 }, reqRealm: 4, reqLevel: 1, cost: 6000 },
      { id: 'chong_5', name: '四满', position: 5, effect: { type: 'hp_percent', value: 0.05 }, reqRealm: 5, reqLevel: 1, cost: 12000 },
      { id: 'chong_6', name: '中注', position: 6, effect: { type: 'crit', value: 0.02 }, reqRealm: 6, reqLevel: 1, cost: 20000 },
      { id: 'chong_7', name: '盲俞', position: 7, effect: { type: 'atk_percent', value: 0.07 }, reqRealm: 7, reqLevel: 1, cost: 35000 },
      { id: 'chong_8', name: '商曲', position: 8, effect: { type: 'def_percent', value: 0.07 }, reqRealm: 8, reqLevel: 1, cost: 55000 },
      { id: 'chong_9', name: '石关', position: 9, effect: { type: 'dodge', value: 0.02 }, reqRealm: 9, reqLevel: 1, cost: 80000 },
      { id: 'chong_10', name: '阴都', position: 10, effect: { type: 'atk_def_hp_percent', value: 0.1 }, reqRealm: 10, reqLevel: 1, cost: 120000 },
      { id: 'chong_11', name: '腹通谷', position: 11, effect: { type: 'spirit', value: 80 }, reqRealm: 11, reqLevel: 1, cost: 180000 },
      { id: 'chong_12', name: '幽门', position: 12, effect: { type: 'all_stats_percent', value: 0.12 }, reqRealm: 12, reqLevel: 1, cost: 300000 }
    ]
  },
  
  // 阴跷脉 - 主阴气
  yinqiao: {
    id: 'yinqiao',
    name: '阴跷脉',
    description: '主阴气调节，影响防御',
    type: 'yin',
    color: '#26C6DA',
    icon: '🌙',
    acupoints: [
      { id: 'yinqiao_1', name: '照海', position: 1, effect: { type: 'hp', value: 80 }, reqRealm: 1, reqLevel: 2, cost: 600 },
      { id: 'yinqiao_2', name: '交信', position: 2, effect: { type: 'def', value: 8 }, reqRealm: 2, reqLevel: 2, cost: 1200 },
      { id: 'yinqiao_3', name: '筑宾', position: 3, effect: { type: 'dodge', value: 0.015 }, reqRealm: 4, reqLevel: 2, cost: 5000 },
      { id: 'yinqiao_4', name: '阴谷', position: 4, effect: { type: 'def_percent', value: 0.05 }, reqRealm: 6, reqLevel: 2, cost: 18000 },
      { id: 'yinqiao_5', name: '横骨', position: 5, effect: { type: 'hp_percent', value: 0.08 }, reqRealm: 8, reqLevel: 2, cost: 70000 },
      { id: 'yinqiao_6', name: '大赫', position: 6, effect: { type: 'atk_def_hp_percent', value: 0.08 }, reqRealm: 10, reqLevel: 2, cost: 150000 },
      { id: 'yinqiao_7', name: '气穴', position: 7, effect: { type: 'spirit', value: 70 }, reqRealm: 12, reqLevel: 2, cost: 280000 }
    ]
  },
  
  // 阳跷脉 - 主阳气
  yangqiao: {
    id: 'yangqiao',
    name: '阳跷脉',
    description: '主阳气调节，影响攻击',
    type: 'yang',
    color: '#FFA726',
    icon: '☀️',
    acupoints: [
      { id: 'yangqiao_1', name: '申脉', position: 1, effect: { type: 'atk', value: 10 }, reqRealm: 1, reqLevel: 2, cost: 600 },
      { id: 'yangqiao_2', name: '仆参', position: 2, effect: { type: 'crit', value: 0.015 }, reqRealm: 2, reqLevel: 2, cost: 1200 },
      { id: 'yangqiao_3', name: '跗阳', position: 3, effect: { type: 'atk_percent', value: 0.05 }, reqRealm: 4, reqLevel: 2, cost: 5000 },
      { id: 'yangqiao_4', name: '飞扬', position: 4, effect: { type: 'dodge', value: 0.02 }, reqRealm: 6, reqLevel: 2, cost: 18000 },
      { id: 'yangqiao_5', name: '承山', position: 5, effect: { type: 'atk', value: 25 }, reqRealm: 8, reqLevel: 2, cost: 70000 },
      { id: 'yangqiao_6', name: '臑会', position: 6, effect: { type: 'atk_percent', value: 0.1 }, reqRealm: 10, reqLevel: 2, cost: 150000 },
      { id: 'yangqiao_7', name: '肩髃', position: 7, effect: { type: 'all_stats_percent', value: 0.1 }, reqRealm: 12, reqLevel: 2, cost: 280000 }
    ]
  },
  
  // 阴维脉 - 维系阴经
  yinwei: {
    id: 'yinwei',
    name: '阴维脉',
    description: '维系阴经，增强防御',
    type: 'yin',
    color: '#5C6BC0',
    icon: '🔮',
    acupoints: [
      { id: 'yinwei_1', name: '筑宾', position: 1, effect: { type: 'def', value: 12 }, reqRealm: 2, reqLevel: 2, cost: 1500 },
      { id: 'yinwei_2', name: '腹哀', position: 2, effect: { type: 'hp_percent', value: 0.06 }, reqRealm: 4, reqLevel: 2, cost: 6000 },
      { id: 'yinwei_3', name: '大横', position: 3, effect: { type: 'def_percent', value: 0.06 }, reqRealm: 6, reqLevel: 2, cost: 20000 },
      { id: 'yinwei_4', name: '期门', position: 4, effect: { type: 'dodge', value: 0.025 }, reqRealm: 8, reqLevel: 2, cost: 80000 },
      { id: 'yinwei_5', name: '天突', position: 5, effect: { type: 'hp_def_percent', value: 0.1 }, reqRealm: 10, reqLevel: 2, cost: 180000 },
      { id: 'yinwei_6', name: '廉泉', position: 6, effect: { type: 'spirit', value: 90 }, reqRealm: 12, reqLevel: 2, cost: 350000 }
    ]
  },
  
  // 阳维脉 - 维系阳经
  yangwei: {
    id: 'yangwei',
    name: '阳维脉',
    description: '维系阳经，增强攻击',
    type: 'yang',
    color: '#FF7043',
    icon: '⚡',
    acupoints: [
      { id: 'yangwei_1', name: '金门', position: 1, effect: { type: 'atk', value: 15 }, reqRealm: 2, reqLevel: 2, cost: 1500 },
      { id: 'yangwei_2', name: '阳交', position: 2, effect: { type: 'crit', value: 0.02 }, reqRealm: 4, reqLevel: 2, cost: 6000 },
      { id: 'yangwei_3', name: '臑会', position: 3, effect: { type: 'atk_percent', value: 0.06 }, reqRealm: 6, reqLevel: 2, cost: 20000 },
      { id: 'yangwei_4', name: '肩井', position: 4, effect: { type: 'atk_percent', value: 0.08 }, reqRealm: 8, reqLevel: 2, cost: 80000 },
      { id: 'yangwei_5', name: '风池', position: 5, effect: { type: 'atk_hp_percent', value: 0.1 }, reqRealm: 10, reqLevel: 2, cost: 180000 },
      { id: 'yangwei_6', name: '风府', position: 6, effect: { type: 'all_stats_percent', value: 0.12 }, reqRealm: 12, reqLevel: 2, cost: 350000 }
    ]
  }
};

// ==================== 辅助函数 ====================

/**
 * 获取所有经脉列表
 */
function getAllMeridians() {
  return Object.values(MERIDIANS);
}

/**
 * 获取指定经脉
 */
function getMeridian(meridianId) {
  return MERIDIANS[meridianId];
}

/**
 * 获取指定穴位
 */
function getAcupoint(acupointId) {
  for (const meridian of Object.values(MERIDIANS)) {
    const acupoint = meridian.acupoints.find(a => a.id === acupointId);
    if (acupoint) return acupoint;
  }
  return null;
}

/**
 * 获取穴位的前置穴位
 */
function getPrevAcupoint(meridianId, position) {
  const meridian = MERIDIANS[meridianId];
  if (!meridian) return null;
  
  // 查找前一个穴位
  const prevAcupoint = meridian.acupoints.find(a => a.position === position - 1);
  return prevAcupoint;
}

/**
 * 计算冲穴成功率
 * @param {number} playerRealm - 玩家境界阶数
 * @param {number} acupointReqRealm - 穴位要求境界
 * @returns {number} 成功率 (0-1)
 */
function calculateSuccessRate(playerRealm, acupointReqRealm) {
  // 基础成功率根据境界差距计算
  let baseRate = 0.5; // 50% 基础成功率
  
  // 境界加成
  const realmDiff = playerRealm - acupointReqRealm;
  
  if (realmDiff >= 2) {
    // 境界高于要求2阶以上，高成功率
    baseRate = 0.8;
  } else if (realmDiff >= 1) {
    // 境界高于要求1阶
    baseRate = 0.7;
  } else if (realmDiff >= 0) {
    // 境界等于要求
    baseRate = 0.5;
  } else if (realmDiff >= -1) {
    // 境界低于要求1阶
    baseRate = 0.35;
  } else {
    // 境界低于要求2阶以上
    baseRate = 0.2;
  }
  
  // 应用配置限制
  return Math.min(
    Math.max(baseRate, MERIDIAN_CONFIG.minSuccessRate),
    MERIDIAN_CONFIG.maxSuccessRate
  );
}

/**
 * 计算穴位效果
 * @param {Array} acupoints - 已激活的穴位数组
 * @returns {Object} 效果汇总
 */
function calculateMeridianEffects(acupoints) {
  const effects = {
    atk: 0,
    def: 0,
    hp: 0,
    spirit: 0,
    crit: 0,
    dodge: 0,
    atk_percent: 0,
    def_percent: 0,
    hp_percent: 0,
    atk_def_hp_percent: 0,
    hp_def_percent: 0,
    atk_hp_percent: 0,
    hp_atk_percent: 0,
    all_stats_percent: 0
  };
  
  for (const acupoint of acupoints) {
    const effectType = acupoint.effect.type;
    const effectValue = acupoint.effect.value;
    
    if (effectType === 'atk_def_hp_percent') {
      effects.atk_percent += effectValue;
      effects.def_percent += effectValue;
      effects.hp_percent += effectValue;
    } else if (effectType === 'hp_def_percent') {
      effects.hp_percent += effectValue;
      effects.def_percent += effectValue;
    } else if (effectType === 'atk_hp_percent') {
      effects.atk_percent += effectValue;
      effects.hp_percent += effectValue;
    } else if (effectType === 'atk_def_percent') {
      effects.atk_percent += effectValue;
      effects.def_percent += effectValue;
    } else if (effects.hasOwnProperty(effectType)) {
      effects[effectType] += effectValue;
    }
  }
  
  return effects;
}

/**
 * 格式化穴位效果显示
 */
function formatEffectDisplay(effect) {
  const type = effect.type;
  const value = effect.value;
  
  const typeNames = {
    atk: '攻击',
    def: '防御',
    hp: '生命',
    spirit: '灵气',
    crit: '暴击率',
    dodge: '闪避率',
    atk_percent: '攻击%',
    def_percent: '防御%',
    hp_percent: '生命%',
    atk_def_hp_percent: '攻防生命%',
    hp_def_percent: '生命防御%',
    atk_hp_percent: '攻击生命%',
    atk_def_percent: '攻防%',
    all_stats_percent: '全属性%'
  };
  
  const name = typeNames[type] || type;
  
  // 格式化数值
  let valueStr;
  if (type.includes('percent') || type === 'crit' || type === 'dodge') {
    valueStr = `+${(value * 100).toFixed(1)}%`;
  } else {
    valueStr = `+${value}`;
  }
  
  return `${name}${valueStr}`;
}

module.exports = {
  MERIDIAN_CONFIG,
  ACUPOINT_EFFECT_TYPES,
  MERIDIANS,
  getAllMeridians,
  getMeridian,
  getAcupoint,
  getPrevAcupoint,
  calculateSuccessRate,
  calculateMeridianEffects,
  formatEffectDisplay
};
