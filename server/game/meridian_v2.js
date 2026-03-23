/**
 * 挂机修仙 - 经脉系统 v2.0 (扩展版)
 * 
 * 优化策略：
 * 1. 穴位扩展：6穴 → 30+穴
 * 2. 风格化：每条经脉有独特属性
 * 3. 冲穴效果更丰富
 */

// ==================== 经脉定义 v2 ====================
const MERIDIANS_V2 = {
  // 任脉 - 灵气类
  ren: {
    id: 'ren',
    name: '任脉',
    description: '阴脉之海，主灵气汇聚',
    type: 'spirit',
    color: '#4FC3F7',
    icon: '🌊',
    bonus: { spirit_rate: 0.1 },
    acupoints: [
      { id: 'ren_chengshi', name: '承泣穴', effect: { spirit_rate: 0.05 }, position: 1 },
      { id: 'ren_yingxiang', name: '迎香穴', effect: { spirit_rate: 0.08 }, position: 2 },
      { id: 'ren_kuqi', name: '口奎穴', effect: { spirit_rate: 0.1 }, position: 3 },
      { id: 'ren_tianchi', name: '天池穴', effect: { spirit_rate: 0.15 }, position: 4 },
      { id: 'ren_shangwan', name: '上脘穴', effect: { spirit_rate: 0.2 }, position: 5 }
    ]
  },
  
  // 督脉 - 攻击类
  du: {
    id: 'du',
    name: '督脉',
    description: '阳脉之海，主攻击爆发',
    type: 'attack',
    color: '#FF5252',
    icon: '🔥',
    bonus: { atk: 0.1 },
    acupoints: [
      { id: 'du_changqiang', name: '长强穴', effect: { atk: 0.05 }, position: 1 },
      { id: 'du_yaoyang', name: '腰阳关', effect: { atk: 0.08 }, position: 2 },
      { id: 'du_mingmen', name: '命门穴', effect: { atk: 0.1 }, position: 3 },
      { id: 'du_zhiyang', name: '至阳穴', effect: { atk: 0.15 }, position: 4 },
      { id: 'du_fengfu', name: '风府穴', effect: { atk: 0.2 }, position: 5 }
    ]
  },
  
  // 带脉 - 防御类
  dai: {
    id: 'dai',
    name: '带脉',
    description: '束缚之脉，主防御护体',
    type: 'defense',
    color: '#FFD54F',
    icon: '⛓️',
    bonus: { def: 0.1 },
    acupoints: {
      acupoints: [
      { id: 'dai_zhangmen', name: '章门穴', effect: { def: 0.05 }, position: 1 },
      { id: 'dai_wushu', name: '五枢穴', effect: { def: 0.08 }, position: 2 },
      { id: 'dai_weidao', name: '维道穴', effect: { def: 0.1 }, position: 3 },
      { id: 'dai_huaiqiao', name: '外踝尖', effect: { def: 0.15 }, position: 4 },
      { id: 'dai_qixue', name: '期穴', effect: { def: 0.2 }, position: 5 }
    ]
  },
  
  // 冲脉 - 暴击类
  chong: {
    id: 'chong',
    name: '冲脉',
    description: '血气之脉，主暴击爆发',
    type: 'crit',
    color: '#E040FB',
    icon: '⚡',
    bonus: { crit: 0.1 },
    acupoints: [
      { id: 'chong_henggu', name: '横骨穴', effect: { crit: 0.03 }, position: 1 },
      { id: 'chong_daheng', name: '大横穴', effect: { crit: 0.05 }, position: 2 },
      { id: 'chong_fuanyang', name: '腹结穴', effect: { crit: 0.07 }, position: 3 },
      { id: 'chong_daimai', name: '带脉穴', effect: { crit: 0.1 }, position: 4 },
      { id: 'chong_zigong', name: '子宫穴', effect: { crit: 0.15 }, position: 5 }
    ]
  },
  
  // 阴维脉 - 生命类
  yinwei: {
    id: 'yinwei',
    name: '阴维脉',
    description: '阴维之脉，主生命上限',
    type: 'health',
    color: '#69F0AE',
    icon: '❤️',
    bonus: { hp: 0.1 },
    acupoints: [
      { id: 'yinwei_jinmai', name: '金门穴', effect: { hp: 0.05 }, position: 1 },
      { id: 'yinwei_jiaoxin', name: '交信穴', effect: { hp: 0.08 }, position: 2 },
      { id: 'yinwei_zhubin', name: '筑宾穴', effect: { hp: 0.1 }, position: 3 },
      { id: 'yinwei_fu鲁迅', name: '腹哀穴', effect: { hp: 0.15 }, position: 4 },
      { id: 'yinwei_lianquan', name: '廉泉穴', effect: { hp: 0.2 }, position: 5 }
    ]
  },
  
  // 阳维脉 - 闪避类
  yangwei: {
    id: 'yangwei',
    name: '阳维脉',
    description: '阳维之脉，主闪避敏捷',
    type: 'dodge',
    color: '#40C4FF',
    icon: '💨',
    bonus: { dodge: 0.1 },
    acupoints: [
      { id: 'yangwei_fuyang', name: '跗阳穴', effect: { dodge: 0.03 }, position: 1 },
      { id: 'yangwei_xuanwu', name: '悬厘穴', effect: { dodge: 0.05 }, position: 2 },
      { id: 'yangwei_tianzhong', name: '天冲穴', effect: { dodge: 0.07 }, position: 3 },
      { id: 'yangwei_naoqin', name: '脑空穴', effect: { dodge: 0.1 }, position: 4 },
      { id: 'yangwei_chengqi', name: '承泣穴', effect: { dodge: 0.15 }, position: 5 }
    ]
  },
  
  // 阴跷脉 - 灵气回复
  yinqiao: {
    id: 'yinqiao',
    name: '阴跷脉',
    description: '阴跷之脉，主灵气回复',
    type: 'spirit_regen',
    color: '#80D8FF',
    icon: '💧',
    bonus: { spirit_rate: 0.15 },
    acupoints: [
      { id: 'yinqiao_zhaohai', name: '照海穴', effect: { spirit_rate: 0.05 }, position: 1 },
      { id: 'yinqiao_fuqing', name: '浮郄穴', effect: { spirit_rate: 0.08 }, position: 2 },
      { id: 'yinqiao_xianv', name: '臑会穴', effect: { spirit_rate: 0.1 }, position: 3 },
      { id: 'yinqiao_jianjing', name: '肩井穴', effect: { spirit_rate: 0.15 }, position: 4 },
      { id: 'yinqiao_chengmu', name: '睛明穴', effect: { spirit_rate: 0.2 }, position: 5 }
    ]
  },
  
  // 阳跷脉 - 攻击速度
  yangqiao: {
    id: 'yangqiao',
    name: '阳跷脉',
    description: '阳跷之脉，主攻击速度',
    type: 'speed',
    color: '#FFAB40',
    icon: '⚔️',
    bonus: { atk_speed: 0.1 },
    acupoints: [
      { id: 'yangqiao_jiaohe', name: '交信穴', effect: { atk_speed: 0.03 }, position: 1 },
      { id: 'yangqiao_pucan', name: '仆参穴', effect: { atk_speed: 0.05 }, position: 2 },
      { id: 'yangqiao_shenmai', name: '申脉穴', effect: { atk_speed: 0.07 }, position: 3 },
      { id: 'yangqiao_fengshi', name: '风市穴', effect: { atk_speed: 0.1 }, position: 4 },
      { id: 'yangqiao_tianliao', name: '天髎穴', effect: { atk_speed: 0.15 }, position: 5 }
    ]
  }
};

// ==================== 经脉冲穴配置 ====================
const ACUPOINT_CONFIG = {
  // 冲穴成功率基础值
  baseSuccessRate: 0.5,
  
  // 每点满熟练度加成
  proficiencyBonus: 0.02,
  
  // 最大成功率
  maxSuccessRate: 0.95,
  
  // 最小成功率
  minSuccessRate: 0.1,
  
  // 失败返还比例
  refundRatio: 0.8,
  
  // 冲穴冷却(毫秒)
  cooldownMs: 60000,
  
  // 境界成功率加成
  realmBonus: 0.05
};

/**
 * 计算经脉属性加成
 */
function calculateMeridianBonus(acupoints) {
  const totalBonus = {
    atk: 0,
    def: 0,
    hp: 0,
    spirit_rate: 0,
    crit: 0,
    dodge: 0,
    atk_speed: 0
  };
  
  for (const meridianId in acupoints) {
    const meridian = MERIDIANS_V2[meridianId];
    const points = acupoints[meridianId] || [];
    
    // 穴位加成
    for (const pointId of points) {
      const acupoint = meridian.acupoints.find(a => a.id === pointId);
      if (acupoint && acupoint.effect) {
        for (const [key, value] of Object.entries(acupoint.effect)) {
          totalBonus[key] = (totalBonus[key] || 0) + value;
        }
      }
    }
    
    // 经脉套装加成
    if (points.length >= 3) {
      for (const [key, value] of Object.entries(meridian.bonus || {})) {
        totalBonus[key] = (totalBonus[key] || 0) + value;
      }
    }
  }
  
  return totalBonus;
}

/**
 * 获取经脉详情
 */
function getMeridian(id) {
  return MERIDIANS_V2[id];
}

/**
 * 获取所有经脉
 */
function getAllMeridians() {
  return MERIDIANS_V2;
}

/**
 * 冲穴
 */
function openAcupoint(meridianId, acupointId, player) {
  const meridian = MERIDIANS_V2[meridianId];
  if (!meridian) {
    return { success: false, message: '经脉不存在' };
  }
  
  const acupoint = meridian.acupoints.find(a => a.id === acupointId);
  if (!acupoint) {
    return { success: false, message: '穴位不存在' };
  }
  
  // 检查前置穴位
  const acupointIndex = meridian.acupoints.findIndex(a => a.id === acupointId);
  const playerPoints = player.acupoints?.[meridianId] || [];
  
  if (acupointIndex > 0) {
    const prevAcupoint = meridian.acupoints[acupointIndex - 1];
    if (!playerPoints.includes(prevAcupoint.id)) {
      return { success: false, message: `需要先打通 ${prevAcupoint.name}` };
    }
  }
  
  // 计算成功率
  const realmLevel = player.realmLevel || 1;
  let successRate = ACUPOINT_CONFIG.baseSuccessRate + realmLevel * ACUPOINT_CONFIG.realmBonus;
  successRate = Math.min(successRate, ACUPOINT_CONFIG.maxSuccessRate);
  successRate = Math.max(successRate, ACUPOINT_CONFIG.minSuccessRate);
  
  // 冲穴
  const success = Math.random() < successRate;
  
  if (success) {
    // 初始化玩家穴位
    if (!player.acupoints) player.acupoints = {};
    if (!player.acupoints[meridianId]) player.acupoints[meridianId] = [];
    player.acupoints[meridianId].push(acupointId);
    
    return { 
      success: true, 
      message: `冲穴成功！${acupoint.name}已打通`,
      effect: acupoint.effect
    };
  } else {
    return { 
      success: false, 
      message: `冲穴失败，返还${ACUPOINT_CONFIG.refundRatio * 100}%灵气`,
      refundRatio: ACUPOINT_CONFIG.refundRatio
    };
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MERIDIANS_V2,
    ACUPOINT_CONFIG,
    calculateMeridianBonus,
    getMeridian,
    getAllMeridians,
    openAcupoint
  };
}
