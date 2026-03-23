/**
 * 结婚系统 - 业务逻辑服务
 */

import { Response } from 'express';
import Database from 'better-sqlite3';
import { WeddingType, CoupleSkillConfig } from './types';
import { MARRIAGE_CONFIG, getWeddingConfig, getSkillsByWeddingType, getIntimacyLevel } from './config';
import * as models from './models';

let db: Database.Database;

/**
 * 初始化婚姻服务
 */
export function initMarriageService(database: Database.Database) {
  db = database;
  models.initMarriageDatabase(database);
  console.log('[Marriage] 婚姻服务初始化完成');
}

/**
 * 获取玩家婚姻信息
 */
export function getMarriageInfo(playerId: number) {
  const playerMarriage = models.getOrCreatePlayerMarriage(playerId);
  const spouseId = playerMarriage.spouse_id;
  
  let spouseInfo = null;
  if (spouseId && playerMarriage.status === 'married') {
    const spouse = models.getOrCreatePlayerMarriage(spouseId);
    const spousePlayer = db.prepare('SELECT id, username, level, realm_level FROM player WHERE id = ?').get(spouseId) as any;
    
    if (spousePlayer) {
      spouseInfo = {
        playerId: spouseId,
        playerName: spousePlayer.username,
        level: spousePlayer.level,
        realmLevel: spousePlayer.realm_level,
        weddingType: spouse.wedding_type,
        weddingTime: spouse.wedding_time,
        weddingExpireTime: spouse.wedding_expire_time,
        status: spouse.status,
      };
    }
  }
  
  // 解析技能列表
  let coupleSkills: string[] = [];
  try {
    coupleSkills = JSON.parse(playerMarriage.couple_skills || '[]');
  } catch (e) {
    coupleSkills = [];
  }
  
  // 获取技能详情
  const skills = coupleSkills.map(skillId => {
    return MARRIAGE_CONFIG.coupleSkills.find(s => s.skillId === skillId);
  }).filter(Boolean);
  
  // 计算剩余天数
  let remainingDays = 0;
  if (playerMarriage.wedding_expire_time && playerMarriage.wedding_expire_time > 0) {
    remainingDays = Math.max(0, Math.ceil((playerMarriage.wedding_expire_time - Date.now()) / (1000 * 60 * 60 * 24)));
  }
  
  return {
    playerId,
    married: playerMarriage.status === 'married',
    status: playerMarriage.status,
    spouseId: playerMarriage.spouse_id,
    spouseInfo,
    weddingType: playerMarriage.wedding_type,
    weddingTypeName: playerMarriage.wedding_type ? MARRIAGE_CONFIG.weddingTypes[playerMarriage.wedding_type]?.name : null,
    weddingTime: playerMarriage.wedding_time,
    weddingExpireTime: playerMarriage.wedding_expire_time,
    remainingDays,
    divorceStatus: playerMarriage.divorce_status,
    divorceRequestTime: playerMarriage.divorce_request_time,
    coupleSkills: skills,
    availableSkills: playerMarriage.wedding_type ? getSkillsByWeddingType(playerMarriage.wedding_type) : [],
  };
}

/**
 * 获取婚礼类型列表
 */
export function getWeddingTypes() {
  return Object.entries(MARRIAGE_CONFIG.weddingTypes).map(([type, config]) => ({
    type,
    name: config.name,
    cost: config.cost,
    duration: config.duration,
    bonus: config.bonus,
    requiredLevel: config.requiredLevel,
  }));
}

/**
 * 发送结婚申请
 */
export function sendMarriageApplication(applicantId: number, targetId: number, weddingType: WeddingType, message?: string) {
  // 验证玩家
  const applicant = db.prepare('SELECT * FROM player WHERE id = ?').get(applicantId);
  const target = db.prepare('SELECT * FROM player WHERE id = ?').get(targetId);
  
  if (!applicant) {
    return { success: false, error: '申请人不存在' };
  }
  if (!target) {
    return { success: false, error: '目标玩家不存在' };
  }
  
  if (applicantId === targetId) {
    return { success: false, error: '不能与自己结婚' };
  }
  
  // 验证婚礼类型
  const weddingConfig = getWeddingConfig(weddingType);
  if (!weddingConfig) {
    return { success: false, error: '无效的婚礼类型' };
  }
  
  // 验证等级要求
  const applicantPlayer = applicant as any;
  const targetPlayer = target as any;
  
  if (applicantPlayer.level < weddingConfig.requiredLevel) {
    return { success: false, error: `等级不足，需要达到${weddingConfig.requiredLevel}级` };
  }
  if (targetPlayer.level < weddingConfig.requiredLevel) {
    return { success: false, error: `对方等级不足，需要达到${weddingConfig.requiredLevel}级` };
  }
  
  // 验证灵石
  if (applicantPlayer.spirit_stones < weddingConfig.cost) {
    return { success: false, error: `灵石不足，需要${weddingConfig.cost}灵石` };
  }
  
  // 检查是否已婚
  if (models.isPlayerMarried(applicantId)) {
    return { success: false, error: '您已结婚' };
  }
  if (models.isPlayerMarried(targetId)) {
    return { success: false, error: '对方已结婚' };
  }
  
  // 检查是否已有待处理的申请
  const existingApps = models.getMarriageApplications(applicantId, 'sent');
  const hasExistingApp = existingApps.some((app: any) => app.target_id === targetId && app.status === 'pending');
  
  if (hasExistingApp) {
    return { success: false, error: '已有待处理的结婚申请' };
  }
  
  // 扣除灵石
  db.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?').run(weddingConfig.cost, applicantId);
  
  // 创建申请
  const application = models.createMarriageApplication(applicantId, targetId, weddingType, message);
  
  return {
    success: true,
    message: '结婚申请已发送',
    data: {
      applicationId: application.id,
      applicantId,
      targetId: targetId,
      targetName: targetPlayer.username,
      weddingType,
      weddingTypeName: weddingConfig.name,
      cost: weddingConfig.cost,
      remainingSpiritStones: applicantPlayer.spirit_stones - weddingConfig.cost,
    },
  };
}

/**
 * 获取收到的结婚申请
 */
export function getReceivedApplications(playerId: number) {
  const apps = models.getMarriageApplications(playerId, 'received');
  
  return apps.map((app: any) => {
    const applicant = db.prepare('SELECT id, username, level, realm_level FROM player WHERE id = ?').get(app.applicant_id) as any;
    return {
      id: app.id,
      applicantId: app.applicant_id,
      applicantName: applicant?.username || '未知',
      applicantLevel: applicant?.level || 0,
      applicantRealmLevel: applicant?.realm_level || 0,
      weddingType: app.wedding_type,
      weddingTypeName: MARRIAGE_CONFIG.weddingTypes[app.wedding_type]?.name || '未知',
      message: app.message,
      createdAt: app.created_at,
    };
  });
}

/**
 * 接受结婚申请
 */
export function acceptMarriageApplication(playerId: number, applicationId: number) {
  const application = db.prepare('SELECT * FROM marriage_applications WHERE id = ? AND status = ?').get(applicationId, 'pending') as any;
  
  if (!application) {
    return { success: false, error: '申请不存在或已处理' };
  }
  
  if (application.target_id !== playerId) {
    return { success: false, error: '这不是您的申请' };
  }
  
  const applicantId = application.applicant_id;
  const targetId = playerId;
  const weddingType = application.wedding_type as WeddingType;
  const weddingConfig = getWeddingConfig(weddingType);
  
  if (!weddingConfig) {
    return { success: false, error: '婚礼配置错误' };
  }
  
  // 再次检查双方是否已婚
  if (models.isPlayerMarried(applicantId)) {
    return { success: false, error: '对方已结婚' };
  }
  if (models.isPlayerMarried(targetId)) {
    return { success: false, error: '您已结婚' };
  }
  
  // 获取可用技能
  const availableSkills = getSkillsByWeddingType(weddingType);
  const skillIds = availableSkills.map(s => s.skillId);
  
  const now = Date.now();
  const expireTime = weddingConfig.duration > 0 ? now + weddingConfig.duration * 24 * 60 * 60 * 1000 : 0;
  
  // 更新申请人婚姻状态
  models.updatePlayerMarriage(applicantId, {
    spouseId: targetId,
    status: 'married',
    weddingType,
    weddingTime: now,
    weddingExpireTime: expireTime,
    divorceStatus: 'none',
    coupleSkills: skillIds,
  });
  
  // 更新被申请人婚姻状态
  models.updatePlayerMarriage(targetId, {
    spouseId: applicantId,
    status: 'married',
    weddingType,
    weddingTime: now,
    weddingExpireTime: expireTime,
    divorceStatus: 'none',
    coupleSkills: skillIds,
  });
  
  // 更新申请状态
  models.acceptMarriageApplication(applicationId);
  
  // 创建婚礼记录
  models.createWeddingRecord(applicantId, targetId, weddingType, expireTime);
  
  // 赋予技能
  models.unlockCoupleSkills(applicantId, skillIds);
  models.unlockCoupleSkills(targetId, skillIds);
  
  const applicant = db.prepare('SELECT username FROM player WHERE id = ?').get(applicantId) as any;
  
  return {
    success: true,
    message: `与 ${applicant?.username || 'TA'} 结婚成功！`,
    data: {
      spouseId: applicantId,
      spouseName: applicant?.username || '未知',
      weddingType,
      weddingTypeName: weddingConfig.name,
      weddingTime: now,
      weddingExpireTime: expireTime,
      duration: weddingConfig.duration,
      bonus: weddingConfig.bonus,
      coupleSkills: availableSkills,
    },
  };
}

/**
 * 拒绝结婚申请
 */
export function rejectMarriageApplication(playerId: number, applicationId: number) {
  const application = db.prepare('SELECT * FROM marriage_applications WHERE id = ? AND status = ?').get(applicationId, 'pending') as any;
  
  if (!application) {
    return { success: false, error: '申请不存在或已处理' };
  }
  
  if (application.target_id !== playerId) {
    return { success: false, error: '这不是您的申请' };
  }
  
  models.rejectMarriageApplication(applicationId);
  
  const applicant = db.prepare('SELECT username FROM player WHERE id = ?').get(application.applicant_id) as any;
  
  return {
    success: true,
    message: `已拒绝 ${applicant?.username || 'TA'} 的结婚申请`,
  };
}

/**
 * 申请离婚
 */
export function applyForDivorce(playerId: number) {
  const playerMarriage = models.getOrCreatePlayerMarriage(playerId);
  
  if (playerMarriage.status !== 'married' || !playerMarriage.spouse_id) {
    return { success: false, error: '您还未结婚' };
  }
  
  const spouseId = playerMarriage.spouse_id;
  const spouse = models.getOrCreatePlayerMarriage(spouseId);
  
  // 检查是否已经在离婚流程中
  if (playerMarriage.divorce_status === 'pending') {
    const timeSinceRequest = Date.now() - (playerMarriage.divorce_request_time || 0);
    const remainingTime = MARRIAGE_CONFIG.divorceCooldown - timeSinceRequest;
    
    if (remainingTime > 0) {
      const remainingHours = Math.ceil(remainingTime / (1000 * 60 * 60));
      return {
        success: false,
        error: `离婚申请已提交，需等待 ${remainingHours} 小时才能正式离婚`,
        data: {
          divorceRequested: true,
          requestTime: playerMarriage.divorce_request_time,
          cooldownRemaining: remainingHours,
        },
      };
    }
  }
  
  // 提交离婚申请
  const now = Date.now();
  models.updatePlayerMarriage(playerId, {
    divorceStatus: 'pending',
    divorceRequestTime: now,
  });
  
  const spousePlayer = db.prepare('SELECT username FROM player WHERE id = ?').get(spouseId) as any;
  
  return {
    success: true,
    message: '离婚申请已提交，需等待24小时冷静期',
    data: {
      divorceRequested: true,
      requestTime: now,
      cooldownHours: MARRIAGE_CONFIG.divorceCooldown / (1000 * 60 * 60),
      spouseName: spousePlayer?.username || 'TA',
    },
  };
}

/**
 * 确认离婚
 */
export function confirmDivorce(playerId: number) {
  const playerMarriage = models.getOrCreatePlayerMarriage(playerId);
  
  if (playerMarriage.status !== 'married' || !playerMarriage.spouse_id) {
    return { success: false, error: '您还未结婚' };
  }
  
  if (playerMarriage.divorce_status !== 'pending') {
    return { success: false, error: '您还未提交离婚申请' };
  }
  
  // 检查冷静期
  const timeSinceRequest = Date.now() - (playerMarriage.divorce_request_time || 0);
  if (timeSinceRequest < MARRIAGE_CONFIG.divorceCooldown) {
    const remainingHours = Math.ceil((MARRIAGE_CONFIG.divorceCooldown - timeSinceRequest) / (1000 * 60 * 60));
    return {
      success: false,
      error: `需等待 ${remainingHours} 小时后才能正式离婚`,
    };
  }
  
  const spouseId = playerMarriage.spouse_id;
  const spousePlayer = db.prepare('SELECT username FROM player WHERE id = ?').get(spouseId) as any;
  
  // 清除双方婚姻数据
  models.clearPlayerMarriage(playerId);
  models.clearPlayerMarriage(spouseId);
  
  return {
    success: true,
    message: `与 ${spousePlayer?.username || 'TA'} 离婚成功`,
    data: {
      divorceCost: 0, // 免费离婚
    },
  };
}

/**
 * 获取夫妻技能列表
 */
export function getCoupleSkills(playerId: number) {
  const playerMarriage = models.getOrCreatePlayerMarriage(playerId);
  
  let coupleSkills: string[] = [];
  try {
    coupleSkills = JSON.parse(playerMarriage.couple_skills || '[]');
  } catch (e) {
    coupleSkills = [];
  }
  
  const skills = coupleSkills.map(skillId => {
    return MARRIAGE_CONFIG.coupleSkills.find(s => s.skillId === skillId);
  }).filter(Boolean);
  
  return {
    married: playerMarriage.status === 'married',
    weddingType: playerMarriage.wedding_type,
    skills,
    allSkills: MARRIAGE_CONFIG.coupleSkills,
  };
}

/**
 * 计算婚姻属性加成
 */
export function getMarriageBonus(playerId: number) {
  const playerMarriage = models.getOrCreatePlayerMarriage(playerId);
  
  if (playerMarriage.status !== 'married') {
    return {
      expBonus: 0,
      spiritBonus: 0,
      battleSupportBonus: 0,
      defenseBonus: 0,
      totalBonus: 0,
    };
  }
  
  let expBonus = 0;
  let spiritBonus = 0;
  let battleSupportBonus = 0;
  let defenseBonus = 0;
  
  // 从婚礼类型获取基础加成
  const weddingConfig = getWeddingConfig(playerMarriage.wedding_type || 'simple');
  if (weddingConfig) {
    const baseBonus = weddingConfig.bonus - 1;
    expBonus += baseBonus;
    spiritBonus += baseBonus;
  }
  
  // 从技能获取额外加成
  let coupleSkills: string[] = [];
  try {
    coupleSkills = JSON.parse(playerMarriage.couple_skills || '[]');
  } catch (e) {
    coupleSkills = [];
  }
  
  for (const skillId of coupleSkills) {
    const skill = MARRIAGE_CONFIG.coupleSkills.find(s => s.skillId === skillId);
    if (skill) {
      switch (skill.effect.type) {
        case 'exp_bonus':
          expBonus += skill.effect.value;
          break;
        case 'spirit_bonus':
          spiritBonus += skill.effect.value;
          break;
        case 'battle_support':
          battleSupportBonus += skill.effect.value;
          break;
        case 'defense_bonus':
          defenseBonus += skill.effect.value;
          break;
      }
    }
  }
  
  return {
    expBonus,
    spiritBonus,
    battleSupportBonus,
    defenseBonus,
    totalBonus: expBonus + spiritBonus,
  };
}

/**
 * 快速结婚（直接结婚，用于测试或简化流程）
 */
export function quickMarriage(playerId: number, targetId: number, weddingType: WeddingType = 'simple') {
  // 验证玩家
  const applicant = db.prepare('SELECT * FROM player WHERE id = ?').get(playerId);
  const target = db.prepare('SELECT * FROM player WHERE id = ?').get(targetId);
  
  if (!applicant || !target) {
    return { success: false, error: '玩家不存在' };
  }
  
  if (playerId === targetId) {
    return { success: false, error: '不能与自己结婚' };
  }
  
  // 检查是否已婚
  if (models.isPlayerMarried(playerId)) {
    return { success: false, error: '您已结婚' };
  }
  if (models.isPlayerMarried(targetId)) {
    return { success: false, error: '对方已结婚' };
  }
  
  const weddingConfig = getWeddingConfig(weddingType);
  if (!weddingConfig) {
    return { success: false, error: '无效的婚礼类型' };
  }
  
  const now = Date.now();
  const expireTime = weddingConfig.duration > 0 ? now + weddingConfig.duration * 24 * 60 * 60 * 1000 : 0;
  const skillIds = getSkillsByWeddingType(weddingType).map(s => s.skillId);
  
  // 更新双方婚姻状态
  models.updatePlayerMarriage(playerId, {
    spouseId: targetId,
    status: 'married',
    weddingType,
    weddingTime: now,
    weddingExpireTime: expireTime,
    coupleSkills: skillIds,
  });
  
  models.updatePlayerMarriage(targetId, {
    spouseId: playerId,
    status: 'married',
    weddingType,
    weddingTime: now,
    weddingExpireTime: expireTime,
    coupleSkills: skillIds,
  });
  
  // 创建婚礼记录
  models.createWeddingRecord(playerId, targetId, weddingType, expireTime);
  
  // 赋予技能
  models.unlockCoupleSkills(playerId, skillIds);
  models.unlockCoupleSkills(targetId, skillIds);
  
  const targetPlayer = target as any;
  
  return {
    success: true,
    message: `与 ${targetPlayer.username} 结婚成功！`,
    data: {
      spouseId: targetId,
      spouseName: targetPlayer.username,
      weddingType,
      weddingTypeName: weddingConfig.name,
      weddingTime: now,
      weddingExpireTime: expireTime,
      duration: weddingConfig.duration,
      bonus: weddingConfig.bonus,
      coupleSkills: getSkillsByWeddingType(weddingType),
    },
  };
}
