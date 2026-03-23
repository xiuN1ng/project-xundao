/**
 * 经脉系统 - 核心业务逻辑
 * 处理经脉相关功能：获取信息、穴位激活、属性加成计算
 */

const meridianConfig = require('./meridian_config');
const meridianStorage = require('./meridian_storage');

const { MERIDIAN_CONFIG, MERIDIANS, getAllMeridians, getMeridian, getAcupoint, getPrevAcupoint, calculateSuccessRate, calculateMeridianEffects, formatEffectDisplay } = meridianConfig;

// ============ 玩家数据获取 ============

/**
 * 获取玩家数据
 */
function getPlayerData(playerId) {
  try {
    // 尝试从 server 获取玩家数据
    const server = require('../../server');
    if (server.getPlayerData) {
      return server.getPlayerData(playerId);
    }
    // 尝试直接查询数据库
    if (server.db) {
      const player = server.db.prepare('SELECT * FROM player WHERE id = ?').get(playerId);
      return player;
    }
  } catch (e) {
    console.error('获取玩家数据失败:', e.message);
  }
  return null;
}

// ============ 经脉系统核心逻辑 ============

/**
 * 获取经脉信息
 */
function getMeridianInfo(playerId) {
  const meridianData = meridianStorage.getPlayerMeridian(playerId);
  const activatedAcupoints = meridianStorage.getAllActivatedAcupoints(playerId);
  const meridians = meridianData.meridiansData || {};
  
  // 计算进度
  const totalAcupoints = Object.values(MERIDIANS).reduce((sum, m) => sum + m.acupoints.length, 0);
  const activatedCount = activatedAcupoints.length;
  const progress = totalAcupoints > 0 ? Math.floor((activatedCount / totalAcupoints) * 100) : 0;
  
  // 计算经脉加成
  const effects = calculateMeridianEffects(activatedAcupoints);
  
  // 各经脉进度
  const meridianProgress = {};
  for (const [meridianId, meridian] of Object.entries(MERIDIANS)) {
    const activatedInMeridian = meridians[meridianId]?.acupoints?.length || 0;
    meridianProgress[meridianId] = {
      total: meridian.acupoints.length,
      activated: activatedInMeridian,
      progress: meridian.acupoints.length > 0 ? Math.floor((activatedInMeridian / meridian.acupoints.length) * 100) : 0
    };
  }
  
  return {
    success: true,
    data: {
      enabled: MERIDIAN_CONFIG.enabled,
      totalAcupoints,
      activatedCount,
      progress,
      meridianProgress,
      meridians: getAllMeridians().map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        type: m.type,
        color: m.color,
        icon: m.icon,
        acupointsCount: m.acupoints.length,
        activatedCount: meridianProgress[m.id]?.activated || 0,
        progress: meridianProgress[m.id]?.progress || 0
      })),
      effects,
      bonuses: meridianStorage.getMeridianBonuses(playerId)
    }
  };
}

/**
 * 获取穴位列表
 */
function getAcupointsList(playerId) {
  const meridianData = meridianStorage.getPlayerMeridian(playerId);
  const meridians = meridianData.meridiansData || {};
  const playerData = getPlayerData(playerId);
  const playerRealm = playerData?.realmLevel || 0;
  const playerLevel = playerData?.level || 1;
  
  const result = [];
  
  for (const meridian of getAllMeridians()) {
    const activatedAcupoints = meridians[meridian.id]?.acupoints || [];
    const activatedIds = new Set(activatedAcupoints.map(a => a.id));
    
    for (const acupoint of meridian.acupoints) {
      const isActivated = activatedIds.has(acupoint.id);
      
      // 获取前置穴位
      const prevAcupoint = getPrevAcupoint(meridian.id, acupoint.position);
      const prevActivated = prevAcupoint ? activatedIds.has(prevAcupoint.id) : true;
      
      // 计算成功率
      let successRate = 0;
      let canActivate = false;
      if (!isActivated && prevActivated) {
        successRate = calculateSuccessRate(playerRealm, acupoint.reqRealm);
        canActivate = playerRealm >= acupoint.reqRealm && playerLevel >= acupoint.reqLevel;
      }
      
      result.push({
        meridianId: meridian.id,
        meridianName: meridian.name,
        meridianColor: meridian.color,
        meridianIcon: meridian.icon,
        id: acupoint.id,
        name: acupoint.name,
        position: acupoint.position,
        effect: acupoint.effect,
        effectDisplay: formatEffectDisplay(acupoint.effect),
        reqRealm: acupoint.reqRealm,
        reqLevel: acupoint.reqLevel,
        cost: acupoint.cost,
        isActivated,
        canActivate,
        prevActivated,
        successRate: successRate.toFixed(2)
      });
    }
  }
  
  // 按经脉和位置排序
  result.sort((a, b) => {
    if (a.meridianId !== b.meridianId) {
      return a.meridianId.localeCompare(b.meridianId);
    }
    return a.position - b.position;
  });
  
  return {
    success: true,
    data: {
      acupoints: result,
      total: result.length,
      activated: result.filter(a => a.isActivated).length
    }
  };
}

/**
 * 激活穴位
 */
function activateAcupoint(playerId, acupointId) {
  // 获取穴位信息
  const acupoint = getAcupoint(acupointId);
  if (!acupoint) {
    return { success: false, message: '穴位不存在' };
  }
  
  // 获取经脉信息
  const meridian = getMeridian(acupointId.split('_')[0]);
  if (!meridian) {
    return { success: false, message: '经脉不存在' };
  }
  
  // 检查是否已激活
  if (meridianStorage.isAcupointActivated(playerId, acupointId)) {
    return { success: false, message: '穴位已激活' };
  }
  
  // 获取玩家数据
  const playerData = getPlayerData(playerId);
  if (!playerData) {
    return { success: false, message: '玩家数据不存在' };
  }
  
  // 检查境界和等级要求
  if (playerData.realmLevel < acupoint.reqRealm) {
    return { success: false, message: `需要境界达到 ${acupoint.reqRealm} 重` };
  }
  if (playerData.level < acupoint.reqLevel) {
    return { success: false, message: `需要等级达到 ${acupoint.reqLevel} 级` };
  }
  
  // 检查灵气是否足够
  const playerSpirit = playerData.spirit_stones || 0;
  if (playerSpirit < acupoint.cost) {
    return { success: false, message: `灵气不足，需要 ${acupoint.cost} 灵气` };
  }
  
  // 检查前置穴位
  const prevAcupoint = getPrevAcupoint(meridian.id, acupoint.position);
  if (prevAcupoint && !meridianStorage.isAcupointActivated(playerId, prevAcupoint.id)) {
    return { success: false, message: `需要先激活前置穴位: ${prevAcupoint.name}` };
  }
  
  // 计算成功率
  const successRate = calculateSuccessRate(playerData.realmLevel, acupoint.reqRealm);
  
  // 扣除灵气
  playerData.spirit_stones -= acupoint.cost;
  
  // 随机冲穴成功/失败
  const roll = Math.random();
  const success = roll < successRate;
  
  const result = {
    acupointId,
    acupointName: acupoint.name,
    meridianId: meridian.id,
    meridianName: meridian.name,
    cost: acupoint.cost,
    successRate,
    roll,
    success,
    effect: acupoint.effect,
    effectDisplay: formatEffectDisplay(acupoint.effect)
  };
  
  if (success) {
    // 激活穴位
    meridianStorage.activateAcupoint(playerId, meridian.id, acupointId, acupoint);
    
    // 更新加成
    const allAcupoints = meridianStorage.getAllActivatedAcupoints(playerId);
    const effects = calculateMeridianEffects(allAcupoints);
    meridianStorage.calculateAndUpdateBonuses(playerId, allAcupoints, effects);
    
    // 记录日志
    meridianStorage.addMeridianLog(playerId, 'activate', meridian.id, acupointId, { success: true, cost: acupoint.cost });
    
    return {
      success: true,
      message: `冲穴成功！${acupoint.name} 已激活`,
      data: {
        ...result,
        spiritRemaining: playerData.spirit_stones,
        totalActivated: allAcupoints.length,
        effects
      }
    };
  } else {
    // 失败返还部分灵气
    const refund = Math.floor(acupoint.cost * MERIDIAN_CONFIG.refundRatio);
    playerData.spirit_stones += refund;
    
    // 记录日志
    meridianStorage.addMeridianLog(playerId, 'activate', meridian.id, acupointId, { success: false, cost: acupoint.cost, refund });
    
    return {
      success: false,
      message: `冲穴失败！返还 ${refund} 灵气`,
      data: {
        ...result,
        refund,
        spiritRemaining: playerData.spirit_stones
      }
    };
  }
}

/**
 * 获取经脉加成
 */
function getMeridianBonuses(playerId) {
  const bonuses = meridianStorage.getMeridianBonuses(playerId);
  const activatedAcupoints = meridianStorage.getAllActivatedAcupoints(playerId);
  const effects = calculateMeridianEffects(activatedAcupoints);
  
  // 计算套装效果
  const meridianData = meridianStorage.getPlayerMeridian(playerId);
  const meridians = meridianData.meridiansData || {};
  
  // 检查每条经脉是否全部激活
  const setEffects = [];
  for (const meridian of getAllMeridians()) {
    const activatedInMeridian = meridians[meridian.id]?.acupoints?.length || 0;
    if (activatedInMeridian === meridian.acupoints.length && meridian.acupoints.length > 0) {
      // 全部激活，获得套装效果
      setEffects.push({
        meridianId: meridian.id,
        meridianName: meridian.name,
        bonus: `全穴位激活: ${meridian.type === 'yin' ? '阴' : meridian.type === 'yang' ? '阳' : '平衡'}系威力+10%`
      });
    }
  }
  
  return {
    success: true,
    data: {
      bonuses,
      effects,
      setEffects,
      totalActivated: activatedAcupoints.length,
      setEffectsCount: setEffects.length
    }
  };
}

// ============ API路由注册 ============

/**
 * 注册经脉系统API路由
 * @param {Express} app - Express应用实例
 */
function registerMeridianRoutes(app) {
  // 获取经脉信息
  app.get('/api/meridian/info', (req, res) => {
    try {
      const playerId = parseInt(req.query.playerId) || 1;
      const result = getMeridianInfo(playerId);
      res.json(result);
    } catch (error) {
      console.error('获取经脉信息失败:', error);
      res.json({ success: false, message: '服务器错误' });
    }
  });
  
  // 获取穴位列表
  app.get('/api/meridian/points', (req, res) => {
    try {
      const playerId = parseInt(req.query.playerId) || 1;
      const result = getAcupointsList(playerId);
      res.json(result);
    } catch (error) {
      console.error('获取穴位列表失败:', error);
      res.json({ success: false, message: '服务器错误' });
    }
  });
  
  // 激活穴位
  app.post('/api/meridian/activate', (req, res) => {
    try {
      const playerId = parseInt(req.body.playerId) || 1;
      const acupointId = req.body.acupointId;
      
      if (!acupointId) {
        return res.json({ success: false, message: '请指定穴位ID' });
      }
      
      const result = activateAcupoint(playerId, acupointId);
      res.json(result);
    } catch (error) {
      console.error('激活穴位失败:', error);
      res.json({ success: false, message: '服务器错误' });
    }
  });
  
  // 获取经脉加成
  app.get('/api/meridian/bonus', (req, res) => {
    try {
      const playerId = parseInt(req.query.playerId) || 1;
      const result = getMeridianBonuses(playerId);
      res.json(result);
    } catch (error) {
      console.error('获取经脉加成失败:', error);
      res.json({ success: false, message: '服务器错误' });
    }
  });
  
  console.log('✓ 经脉系统API路由已注册');
}

// ============ 导出 ============

module.exports = {
  registerMeridianRoutes,
  getMeridianInfo,
  getAcupointsList,
  activateAcupoint,
  getMeridianBonuses,
  MERIDIAN_CONFIG,
  MERIDIANS
};
