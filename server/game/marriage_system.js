/**
 * 婚姻系统 v1.0
 * 结婚判定、亲密度、双修效率加成
 */

const { MARRIAGE_CONFIG, MARRIAGE_GIFTS } = require('./marriage_config');
const marriageDB = require('./marriage_storage');

// 游戏状态引用（由server注入）
let gameState = null;
function setGameState(gs) { gameState = gs; }
function getPlayerData(playerId) {
  if (gameState && gameState.players && gameState.players[playerId]) {
    return gameState.players[playerId];
  }
  return null;
}

// ============ 亲密度等级计算 ============
function getIntimacyLevel(intimacy) {
  const levels = MARRIAGE_CONFIG.INTIMACY_LEVELS;
  for (let i = levels.length - 1; i >= 0; i--) {
    if (intimacy >= levels[i].min) return levels[i];
  }
  return levels[0];
}

function getIntimacyProgress(intimacy) {
  const level = getIntimacyLevel(intimacy);
  const levels = MARRIAGE_CONFIG.INTIMACY_LEVELS;
  const idx = levels.indexOf(level);
  const nextLevel = levels[idx + 1];
  if (!nextLevel) return { current: intimacy, required: intimacy, percent: 100 };
  const progress = (intimacy - level.min) / (nextLevel.min - level.min);
  return {
    current: intimacy - level.min,
    required: nextLevel.min - level.min,
    percent: Math.round(progress * 100),
    levelName: level.name,
    nextLevelName: nextLevel.name
  };
}

// ============ 戒指加成计算 ============
function getRingBonus(ringQuality) {
  return MARRIAGE_CONFIG.RING_LEVELS.find(r => r.quality === ringQuality) || MARRIAGE_CONFIG.RING_LEVELS[0];
}

function getRingInfo(ringQuality) {
  return MARRIAGE_CONFIG.RING_LEVELS.find(r => r.quality === ringQuality) || MARRIAGE_CONFIG.RING_LEVELS[0];
}

// ============ 双修效率加成 ============
async function getDualCultivationBonus(playerId, spouseId) {
  const marriage = await marriageDB.getMarriage(playerId);
  if (!marriage || !marriage.is_active) return 1.0;

  const ringBonus = getRingBonus(marriage.ring_quality || 'iron');
  const intimacyLevel = getIntimacyLevel(marriage.intimacy || 0);
  
  // 亲密度等级加成（最高+30%）
  const intimacyBonus = Math.min(0.30, intimacyLevel.level * 0.05);
  
  // 戒指加成
  const ringSpiritBonus = ringBonus.spirit_bonus || 0;
  
  // 总加成 = 1 + 亲密度加成 + 戒指加成
  return 1 + intimacyBonus + ringSpiritBonus;
}

// ============ 属性加成（战斗加成） ============
async function getMarriageBonus(playerId) {
  const marriage = await marriageDB.getMarriage(playerId);
  if (!marriage || !marriage.is_active) {
    return { atk: 0, def: 0, spirit: 0, exp: 1.0 };
  }

  const ring = getRingBonus(marriage.ring_quality || 'iron');
  const intimacyLevel = getIntimacyLevel(marriage.intimacy || 0);
  
  // 亲密度等级加成
  const intimacyBonus = intimacyLevel.level * 0.02; // 每级+2%
  
  return {
    atk: ring.atk_bonus + intimacyBonus,
    def: ring.def_bonus + intimacyBonus,
    spirit: ring.spirit_bonus + intimacyBonus,
    exp: 1 + intimacyBonus, // 经验加成
  };
}

// ============ 求婚 ============
async function proposeMarital(playerId, proposeeId, playerData) {
  const req = MARRIAGE_CONFIG.REQUIREMENTS;

  // 检查自己是否已婚
  if (await marriageDB.isMarried(playerId)) {
    return { success: false, message: '你已经有道侣了' };
  }
  if (await marriageDB.isMarried(proposeeId)) {
    return { success: false, message: '对方已经有道侣了' };
  }

  // 检查等级
  const playerLevel = playerData?.level || 1;
  if (playerLevel < req.MIN_LEVEL) {
    return { success: false, message: `需要达到 ${req.MIN_LEVEL} 级才能求婚` };
  }

  // 检查灵石
  if (playerData && (playerData.spiritStones || playerData.lingshi || 0) < req.PROPOSE_COST) {
    return { success: false, message: `求婚需要 ${req.PROPOSE_COST} 灵石` };
  }

  // 检查离婚冷却
  if (!(await marriageDB.checkDivorceCooldown(playerId))) {
    return { success: false, message: '离婚后需要24小时才能再次求婚' };
  }

  // 创建求婚请求
  await marriageDB.createProposal(playerId, proposeeId);
  
  // 扣除灵石
  if (playerData) {
    const stones = playerData.spiritStones || playerData.lingshi || 0;
    if (playerData.spiritStones !== undefined) {
      playerData.spiritStones -= req.PROPOSE_COST;
    } else if (playerData.lingshi !== undefined) {
      playerData.lingshi -= req.PROPOSE_COST;
    }
  }

  return { success: true, message: '求婚请求已发送！等待对方回应' };
}

// ============ 响应求婚 ============
async function respondPropose(proposalId, accept, respondPlayerId) {
  const proposal = await marriageDB.getProposalById(proposalId);
  if (!proposal) {
    return { success: false, message: '求婚请求不存在' };
  }
  if (proposal.proposee_id !== respondPlayerId) {
    return { success: false, message: '只有被求婚者才能回应' };
  }
  if (proposal.status !== 'pending') {
    return { success: false, message: '该求婚请求已过期' };
  }

  if (!accept) {
    await marriageDB.respondProposal(proposalId, false);
    return { success: true, message: '已拒绝求婚' };
  }

  // 接受求婚
  await marriageDB.respondProposal(proposalId, true);
  await marriageDB.createMarriage(proposal.proposer_id, proposal.proposee_id);

  return { success: true, message: '恭喜！已结为道侣！' };
}

// ============ 赠送礼物增加亲密度 ============
async function sendGift(playerId, giftKey, playerData) {
  const gift = MARRIAGE_GIFTS[giftKey];
  if (!gift) {
    return { success: false, message: '礼物类型不存在' };
  }

  const marriage = await marriageDB.getMarriage(playerId);
  if (!marriage) {
    return { success: false, message: '你还没有道侣，无法赠送礼物' };
  }

  // 检查灵石
  const stones = playerData?.spiritStones || playerData?.lingshi || 0;
  if (stones < gift.cost) {
    return { success: false, message: `灵石不足，需要 ${gift.cost} 灵石` };
  }

  // 扣除灵石
  if (playerData) {
    if (playerData.spiritStones !== undefined) {
      playerData.spiritStones -= gift.cost;
    } else if (playerData.lingshi !== undefined) {
      playerData.lingshi -= gift.cost;
    }
  }

  // 获取今日已获得亲密度
  const daily = await marriageDB.getOrCreateDaily(playerId);
  const intimacyGain = gift.intimacy;
  
  // 检查每日上限
  const req = MARRIAGE_CONFIG.REQUIREMENTS;
  if (daily.intimacy_gained >= req.DAILY_INTIMACY_CAP) {
    return { success: false, message: `今日亲密度已达上限(${req.DAILY_INTIMACY_CAP})，明天再来吧` };
  }

  // 应用上限
  const actualGain = Math.min(intimacyGain, req.DAILY_INTIMACY_CAP - daily.intimacy_gained);
  
  // 更新亲密度
  const newIntimacy = await marriageDB.updateIntimacy(playerId, actualGain);
  await marriageDB.updateDailyIntimacy(playerId, actualGain);

  const level = getIntimacyLevel(newIntimacy);
  return {
    success: true,
    message: `赠送 ${gift.icon} ${gift.name} 成功！亲密度 +${actualGain}`,
    intimacy: newIntimacy,
    intimacyLevel: level.name,
    dailyGained: daily.intimacy_gained + actualGain,
    dailyCap: req.DAILY_INTIMACY_CAP
  };
}

// ============ 双修 ============
async function doSharedCultivation(playerId, playerData) {
  const marriage = await marriageDB.getMarriage(playerId);
  if (!marriage) {
    return { success: false, message: '你还没有道侣，无法双修' };
  }

  const cfg = MARRIAGE_CONFIG.SHARED_CULTIVATION;
  
  // 检查每日次数限制
  const daily = await marriageDB.getOrCreateDaily(playerId);
  if (daily.shared_cultivation_count >= cfg.DAILY_LIMIT) {
    return { success: false, message: `今日双修次数已用完（${cfg.DAILY_LIMIT}/${cfg.DAILY_LIMIT}）` };
  }

  // 计算双修经验收益
  const level = playerData?.level || 1;
  const realmLevel = playerData?.realm_level || 1;
  
  const baseExp = cfg.BASE_EXP;
  const levelBonus = 1 + (level - 1) * cfg.LEVEL_BONUS / 100;
  const realmBonus = 1 + realmLevel * cfg.REALM_BONUS / 100;
  
  const ring = getRingBonus(marriage.ring_quality || 'iron');
  const intimacyLevel = getIntimacyLevel(marriage.intimacy || 0);
  const intimacyBonus = Math.min(cfg.RING_BONUS_MAX, intimacyLevel.level * 0.05);
  const ringBonus = ring.spirit_bonus || 0;
  
  const totalExp = Math.round(baseExp * levelBonus * realmBonus * (1 + intimacyBonus + ringBonus));

  // 增加亲密度
  const intimacyGain = MARRIAGE_CONFIG.INTIMACY_GAIN.SHARED_CULTIVATION;
  const newIntimacy = await marriageDB.updateIntimacy(playerId, intimacyGain);
  await marriageDB.incrementSharedCultivation(playerId);
  await marriageDB.updateDailyIntimacy(playerId, intimacyGain);

  // 增加经验（这里只更新，返回给调用者处理具体经验系统）
  if (playerData) {
    playerData.exp = (playerData.exp || 0) + totalExp;
    playerData.cultivationExp = (playerData.cultivationExp || 0) + totalExp;
  }

  return {
    success: true,
    message: `双修完成！获得修为 +${totalExp}，亲密度 +${intimacyGain}`,
    expGained: totalExp,
    intimacyGained: intimacyGain,
    newIntimacy,
    intimacyLevel: getIntimacyLevel(newIntimacy).name,
    remainingCultivations: cfg.DAILY_LIMIT - daily.shared_cultivation_count - 1
  };
}

// ============ 离婚 ============
async function divorce(playerId, playerData) {
  const req = MARRIAGE_CONFIG.DIVORCE;
  
  if (!(await marriageDB.isMarried(playerId))) {
    return { success: false, message: '你还没有道侣' };
  }

  // 扣除灵石
  const stones = playerData?.spiritStones || playerData?.lingshi || 0;
  if (stones < req.COST_STONES) {
    return { success: false, message: `离婚需要 ${req.COST_STONES} 灵石` };
  }

  if (playerData) {
    if (playerData.spiritStones !== undefined) {
      playerData.spiritStones -= req.COST_STONES;
    } else if (playerData.lingshi !== undefined) {
      playerData.lingshi -= req.COST_STONES;
    }
  }

  await marriageDB.divorce(playerId);
  return { success: true, message: `已解除道侣关系（花费 ${req.COST_STONES} 灵石）` };
}

// ============ 获取婚姻信息 ============
async function getMarriageInfo(playerId) {
  const marriage = await marriageDB.getMarriage(playerId);
  if (!marriage) {
    return { success: false, isMarried: false };
  }

  const spouseId = marriage.player1_id === playerId ? marriage.player2_id : marriage.player1_id;
  const spouse = await marriageDB.getPlayerInfo(spouseId);
  
  const ring = getRingInfo(marriage.ring_quality || 'iron');
  const intimacyLevel = getIntimacyLevel(marriage.intimacy || 0);
  const intimacyProgress = getIntimacyProgress(marriage.intimacy || 0);
  const bonus = getMarriageBonus(playerId);

  const daily = await marriageDB.getOrCreateDaily(playerId);

  return {
    success: true,
    isMarried: true,
    spouseId,
    spouseName: spouse?.username || '未知修士',
    spouseLevel: spouse?.level || 1,
    intimacy: marriage.intimacy || 0,
    intimacyLevel: intimacyLevel.name,
    intimacyProgress,
    ringQuality: marriage.ring_quality || 'iron',
    ringName: ring.name,
    ringBonus: {
      atk: Math.round(ring.atk_bonus * 100),
      def: Math.round(ring.def_bonus * 100),
      spirit: Math.round(ring.spirit_bonus * 100),
    },
    marriageBonuses: {
      atkBonus: Math.round(bonus.atk * 100),
      defBonus: Math.round(bonus.def * 100),
      spiritBonus: Math.round(bonus.spirit * 100),
      expBonus: Math.round((bonus.exp - 1) * 100),
    },
    dailyStats: {
      intimacyGained: daily.intimacy_gained || 0,
      intimacyCap: MARRIAGE_CONFIG.REQUIREMENTS.DAILY_INTIMACY_CAP,
      sharedCultivationCount: daily.shared_cultivation_count || 0,
      sharedCultivationLimit: MARRIAGE_CONFIG.SHARED_CULTIVATION.DAILY_LIMIT,
    },
    marriedAt: marriage.married_at,
  };
}

// ============ 获取求婚列表 ============
async function getIncomingProposals(playerId) {
  const proposals = await marriageDB.getProposals(playerId);
  const result = [];
  for (const p of proposals) {
    const proposer = await marriageDB.getPlayerInfo(p.proposer_id);
    result.push({
      id: p.id,
      proposerId: p.proposer_id,
      proposerName: proposer?.username || '未知修士',
      proposerLevel: proposer?.level || 1,
      message: p.message || '',
      createdAt: p.created_at,
    });
  }
  return result;
}

async function getOutgoingProposals(playerId) {
  const proposals = await marriageDB.getSentProposals(playerId);
  const result = [];
  for (const p of proposals) {
    const proposee = await marriageDB.getPlayerInfo(p.proposee_id);
    result.push({
      id: p.id,
      proposeeId: p.proposee_id,
      proposeeName: proposee?.username || '未知修士',
      proposeeLevel: proposee?.level || 1,
      status: p.status,
      createdAt: p.created_at,
    });
  }
  return result;
}

// ============ 升级戒指 ============
async function upgradeRing(playerId, ringQuality, playerData) {
  const targetRing = MARRIAGE_CONFIG.RING_LEVELS.find(r => r.quality === ringQuality);
  if (!targetRing) {
    return { success: false, message: '戒指类型不存在' };
  }

  const marriage = await marriageDB.getMarriage(playerId);
  if (!marriage) {
    return { success: false, message: '你还没有道侣' };
  }

  const currentRing = getRingInfo(marriage.ring_quality || 'iron');
  const currentIdx = MARRIAGE_CONFIG.RING_LEVELS.indexOf(currentRing);
  const targetIdx = MARRIAGE_CONFIG.RING_LEVELS.indexOf(targetRing);

  if (targetIdx <= currentIdx) {
    return { success: false, message: '戒指等级不能低于当前等级' };
  }

  const cost = targetRing.cost;
  const stones = playerData?.spiritStones || playerData?.lingshi || 0;
  if (stones < cost) {
    return { success: false, message: `灵石不足，需要 ${cost} 灵石` };
  }

  if (playerData) {
    if (playerData.spiritStones !== undefined) {
      playerData.spiritStones -= cost;
    } else if (playerData.lingshi !== undefined) {
      playerData.lingshi -= cost;
    }
  }

  await marriageDB.updateRing(playerId, ringQuality);
  return {
    success: true,
    message: `戒指升级为 ${targetRing.name}！攻击/防御/灵气各+${Math.round(targetRing.atk_bonus * 100)}%`,
    newRing: targetRing.name,
    newBonus: {
      atk: Math.round(targetRing.atk_bonus * 100),
      def: Math.round(targetRing.def_bonus * 100),
      spirit: Math.round(targetRing.spirit_bonus * 100),
    }
  };
}

// ============ 每日互动 ============
async function dailyInteraction(playerId) {
  const marriage = await marriageDB.getMarriage(playerId);
  if (!marriage) {
    return { success: false, message: '你还没有道侣' };
  }

  const daily = await marriageDB.getOrCreateDaily(playerId);
  if (daily.interacted >= 1) {
    return { success: false, message: '今日已互动，明天再来吧' };
  }

  const gain = MARRIAGE_CONFIG.INTIMACY_GAIN.DAILY_INTERACTION;
  const newIntimacy = await marriageDB.updateIntimacy(playerId, gain);
  await marriageDB.incrementInteraction(playerId);
  await marriageDB.updateDailyIntimacy(playerId, gain);

  return {
    success: true,
    message: `每日互动完成！亲密度 +${gain}`,
    intimacyGained: gain,
    newIntimacy,
    intimacyLevel: getIntimacyLevel(newIntimacy).name
  };
}

module.exports = {
  setGameState,
  getIntimacyLevel,
  getIntimacyProgress,
  getRingBonus,
  getMarriageBonus,
  proposeMarital,
  respondPropose,
  sendGift,
  doSharedCultivation,
  divorce,
  getMarriageInfo,
  getIncomingProposals,
  getOutgoingProposals,
  upgradeRing,
  dailyInteraction,
  MARRIAGE_CONFIG,
  MARRIAGE_GIFTS,
};
