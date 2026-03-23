/**
 * 经脉穴位系统 - API层
 * 处理经脉相关的前端请求
 */

const meridianStorage = require('./meridian_storage');
const { 
  MERIDIAN_CONFIG, 
  MERIDIANS, 
  getAllMeridians, 
  getMeridian, 
  getAcupoint, 
  getPrevAcupoint, 
  calculateSuccessRate, 
  calculateMeridianEffects,
  formatEffectDisplay 
} = require('./meridian_config');

// ==================== API函数 ====================

/**
 * 获取玩家经脉数据
 */
function getPlayerMeridianData(playerId) {
  const meridianData = meridianStorage.getPlayerMeridian(playerId);
  const allMeridians = getAllMeridians();
  const activatedAcupoints = meridianStorage.getAllActivatedAcupoints(playerId);
  const activatedIds = new Set(activatedAcupoints.map(a => a.id));
  
  // 构建经脉信息
  const meridians = allMeridians.map(meridian => {
    const playerMeridian = meridianData.meridiansData?.[meridian.id];
    const acupoints = meridian.acupoints.map(acupoint => ({
      ...acupoint,
      activated: activatedIds.has(acupoint.id),
      effectDisplay: formatEffectDisplay(acupoint.effect)
    }));
    
    return {
      id: meridian.id,
      name: meridian.name,
      description: meridian.description,
      type: meridian.type,
      color: meridian.color,
      icon: meridian.icon,
      acupoints,
      activatedCount: playerMeridian?.acupoints?.length || 0,
      totalCount: meridian.acupoints.length
    };
  });
  
  // 计算总加成
  const effects = calculateMeridianEffects(activatedAcupoints);
  
  return {
    meridians,
    summary: {
      totalAcupoints: activatedAcupoints.length,
      totalMeridians: allMeridians.length,
      effects,
      bonuses: meridianStorage.getMeridianBonuses(playerId)
    }
  };
}

/**
 * 获取可冲穴位列表
 */
function getAvailableAcupoints(playerId, playerRealm, playerLevel) {
  const allMeridians = getAllMeridians();
  const available = [];
  
  for (const meridian of allMeridians) {
    for (const acupoint of meridian.acupoints) {
      // 检查是否已激活
      if (meridianStorage.isAcupointActivated(playerId, acupoint.id)) {
        continue;
      }
      
      // 检查是否满足前置条件
      const prevAcupoint = getPrevAcupoint(meridian.id, acupoint.position);
      if (prevAcupoint && !meridianStorage.isAcupointActivated(playerId, prevAcupoint.id)) {
        continue;
      }
      
      // 检查境界和等级要求
      if (playerRealm < acupoint.reqRealm || playerLevel < acupoint.reqLevel) {
        continue;
      }
      
      // 计算成功率
      const successRate = calculateSuccessRate(playerRealm, acupoint.reqRealm);
      
      available.push({
        meridianId: meridian.id,
        meridianName: meridian.name,
        meridianColor: meridian.color,
        meridianIcon: meridian.icon,
        ...acupoint,
        successRate,
        effectDisplay: formatEffectDisplay(acupoint.effect)
      });
    }
  }
  
  return available.sort((a, b) => a.cost - b.cost);
}

/**
 * 冲穴
 */
function attemptAcupoint(playerId, acupointId, playerRealm, playerLevel, spiritStones) {
  // 获取穴位信息
  const acupoint = getAcupoint(acupointId);
  if (!acupoint) {
    return {
      success: false,
      message: '穴位不存在'
    };
  }
  
  // 检查是否已激活
  if (meridianStorage.isAcupointActivated(playerId, acupointId)) {
    return {
      success: false,
      message: '穴位已激活'
    };
  }
  
  // 获取穴位所属经脉
  let meridianId = null;
  let meridian = null;
  for (const m of getAllMeridians()) {
    if (m.acupoints.some(a => a.id === acupointId)) {
      meridianId = m.id;
      meridian = m;
      break;
    }
  }
  
  // 检查前置穴位
  const prevAcupoint = getPrevAcupoint(meridianId, acupoint.position);
  if (prevAcupoint && !meridianStorage.isAcupointActivated(playerId, prevAcupoint.id)) {
    return {
      success: false,
      message: `需要先激活前置穴位: ${prevAcupoint.name}`
    };
  }
  
  // 检查境界要求
  if (playerRealm < acupoint.reqRealm) {
    return {
      success: false,
      message: `境界不足，需要${getRealmName(acupoint.reqRealm)}境界`
    };
  }
  
  // 检查等级要求
  if (playerLevel < acupoint.reqLevel) {
    return {
      success: false,
      message: `等级不足，需要${acupoint.reqLevel}级`
    };
  }
  
  // 检查灵气是否足够
  if (spiritStones < acupoint.cost) {
    return {
      success: false,
      message: `灵气不足，需要${acupoint.cost}点灵气`
    };
  }
  
  // 计算成功率
  const successRate = calculateSuccessRate(playerRealm, acupoint.reqRealm);
  const roll = Math.random();
  const isSuccess = roll < successRate;
  
  const result = {
    acupointId,
    acupointName: acupoint.name,
    meridianId,
    meridianName: meridian.name,
    cost: acupoint.cost,
    successRate,
    roll,
    isSuccess
  };
  
  if (isSuccess) {
    // 激活穴位
    meridianStorage.activateAcupoint(playerId, meridianId, acupointId, acupoint);
    
    // 更新加成
    const activatedAcupoints = meridianStorage.getAllActivatedAcupoints(playerId);
    const effects = calculateMeridianEffects(activatedAcupoints);
    meridianStorage.calculateAndUpdateBonuses(playerId, activatedAcupoints, effects);
    
    // 记录日志
    meridianStorage.addMeridianLog(playerId, 'activate', meridianId, acupointId, {
      ...result,
      message: `成功激活穴位: ${acupoint.name}`
    });
    
    return {
      success: true,
      message: `🎉 冲穴成功！成功激活穴位: ${acupoint.name}`,
      result: {
        ...result,
        effects
      }
    };
  } else {
    // 失败，返还部分灵气
    const refund = Math.floor(acupoint.cost * MERIDIAN_CONFIG.refundRatio);
    
    // 记录日志
    meridianStorage.addMeridianLog(playerId, 'attempt_failed', meridianId, acupointId, {
      ...result,
      refund,
      message: `冲穴失败，返还${refund}点灵气`
    });
    
    return {
      success: false,
      message: `💔 冲穴失败！返还${refund}点灵气`,
      refund,
      result: {
        ...result,
        refund
      }
    };
  }
}

/**
 * 获取经脉加成
 */
function getMeridianBonus(playerId) {
  return meridianStorage.getMeridianBonuses(playerId);
}

/**
 * 应用经脉加成到属性
 */
function applyMeridianBonus(baseStats, playerId) {
  const bonuses = meridianStorage.getMeridianBonuses(playerId);
  
  const result = { ...baseStats };
  
  // 应用固定加成
  if (bonuses.totalAtkBonus > 0) {
    result.atk = (result.atk || 0) + bonuses.totalAtkBonus;
  }
  if (bonuses.totalDefBonus > 0) {
    result.def = (result.def || 0) + bonuses.totalDefBonus;
  }
  if (bonuses.totalHpBonus > 0) {
    result.maxHp = (result.maxHp || result.hp || 0) + bonuses.totalHpBonus;
    result.hp = result.maxHp;
  }
  
  // 应用百分比加成
  const activatedAcupoints = meridianStorage.getAllActivatedAcupoints(playerId);
  const effects = calculateMeridianEffects(activatedAcupoints);
  
  if (effects.atk_percent > 0) {
    result.atk = Math.floor(result.atk * (1 + effects.atk_percent));
  }
  if (effects.def_percent > 0) {
    result.def = Math.floor(result.def * (1 + effects.def_percent));
  }
  if (effects.hp_percent > 0) {
    const baseHp = result.maxHp || result.hp || 0;
    result.maxHp = Math.floor(baseHp * (1 + effects.hp_percent));
    result.hp = result.maxHp;
  }
  if (effects.crit > 0) {
    result.crit = (result.crit || 0) + effects.crit;
  }
  if (effects.dodge > 0) {
    result.dodge = (result.dodge || 0) + effects.dodge;
  }
  
  // 灵气加成需要特殊处理
  if (bonuses.totalSpiritBonus > 0 || effects.spirit > 0) {
    result.spiritBonus = (bonuses.totalSpiritBonus || 0) + effects.spirit;
  }
  
  result.meridianBonus = bonuses;
  
  return result;
}

/**
 * 辅助函数：获取境界名称
 */
function getRealmName(realmOrder) {
  const realmNames = [
    '凡人', '练气', '筑基', '金丹', '元婴', '化神', 
    '炼虚', '合体', '大乘', '渡劫', '仙人', '天仙', '金仙'
  ];
  return realmNames[realmOrder] || '凡人';
}

/**
 * 获取经脉日志
 */
function getMeridianLog(playerId, limit = 10) {
  return meridianStorage.getMeridianLog(playerId, limit);
}

/**
 * 获取经脉系统状态
 */
function getMeridianStatus(playerId) {
  const totalCount = meridianStorage.getTotalAcupointsCount(playerId);
  const bonuses = meridianStorage.getMeridianBonuses(playerId);
  
  return {
    enabled: MERIDIAN_CONFIG.enabled,
    totalActivated: totalCount,
    hasBonus: totalCount > 0,
    bonuses
  };
}

module.exports = {
  getPlayerMeridianData,
  getAvailableAcupoints,
  attemptAcupoint,
  getMeridianBonus,
  applyMeridianBonus,
  getMeridianLog,
  getMeridianStatus,
  getAllMeridians,
  getMeridian,
  getAcupoint,
  calculateSuccessRate,
  formatEffectDisplay
};
