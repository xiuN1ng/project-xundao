const express = require('express');
const router = express.Router();

// 亲密度等级配置
const INTIMACY_LEVELS = [
  { level: '萍水', min: 0, max: 499, title: '初识', spirit_bonus: 0.05, exp_bonus: 0.05 },
  { level: '知己', min: 500, max: 1999, title: '知己', spirit_bonus: 0.10, exp_bonus: 0.10 },
  { level: '伴侣', min: 2000, max: 4999, title: '道侣', spirit_bonus: 0.15, exp_bonus: 0.15 },
  { level: '神仙眷侣', min: 5000, max: 9999, title: '神仙眷侣', spirit_bonus: 0.25, exp_bonus: 0.25 },
  { level: '天作之合', min: 10000, max: 999999, title: '天作之合', spirit_bonus: 0.40, exp_bonus: 0.40 }
];

function getIntimacyLevel(intimacy) {
  for (const level of INTIMACY_LEVELS) {
    if (intimacy >= level.min && intimacy <= level.max) return level;
  }
  return INTIMACY_LEVELS[0];
}

// 模拟玩家数据（共享全局player对象）
global.playerData = global.playerData || {
  id: 1, name: '修仙者', level: 5, realm: 1, realm_level: 1,
  lingshi: 125680, spirit_stones: 125680, friendship: 2000,
  online_status: 'online'
};

global.allPlayers = global.allPlayers || {
  1: { id: 1, name: '修仙者', level: 5, realm_level: 1, realm_name: '筑基期', spirit_stones: 125680, friendship: 2000, online_status: 'online' },
  2: { id: 2, name: '小仙女', level: 4, realm_level: 1, realm_name: '筑基期', spirit_stones: 8000, friendship: 1500, online_status: 'online' },
  3: { id: 3, name: '剑仙', level: 6, realm_level: 2, realm_name: '金丹期', spirit_stones: 20000, friendship: 3000, online_status: 'offline' },
  4: { id: 4, name: '丹师', level: 5, realm_level: 1, realm_name: '筑基期', spirit_stones: 15000, friendship: 1200, online_status: 'online' },
  5: { id: 5, name: '炼器师', level: 5, realm_level: 1, realm_name: '筑基期', spirit_stones: 18000, friendship: 2500, online_status: 'offline' }
};

// 仙侣关系
global.partnerRelations = global.partnerRelations || {}; // playerId -> { partnerId, intimacy, intimacy_level, marriage_date, double_cultivate_count, daily_double_cultivate_used, last_double_cultivate }
// 待处理的申请
global.partnerApplications = global.partnerApplications || []; // { id, applicant_id, target_id, status, created_at, responded_at }

function getPlayer(pid) {
  if (pid == global.playerData.id) return global.playerData;
  return global.allPlayers[pid];
}

function getRealmName(level) {
  const realms = ['炼气期', '筑基期', '金丹期', '元婴期', '化神期', '炼虚期', '合体期', '大乘期', '渡劫期', '地仙', '天仙', '金仙', '太乙', '大罗', '道祖'];
  return realms[level] || '炼气期';
}

// 申请结缘
router.post('/apply', (req, res) => {
  const { player_id, target_id } = req.body;
  if (!player_id || !target_id) return res.status(400).json({ success: false, error: '缺少必要参数' });
  if (player_id == target_id) return res.status(400).json({ success: false, error: '不能与自己结缘' });

  const player = getPlayer(player_id);
  const target = getPlayer(target_id);
  if (!player) return res.status(404).json({ success: false, error: '玩家不存在' });
  if (!target) return res.status(404).json({ success: false, error: '目标玩家不存在' });

  if (player.level < 3) return res.status(400).json({ success: false, error: '等级不足，需要达到炼气期三层' });
  if (target.level < 3) return res.status(400).json({ success: false, error: '对方等级不足，需要达到炼气期三层' });
  if ((player.friendship || 0) < 1000) return res.status(400).json({ success: false, error: '友好度不足，需要达到1000' });
  if ((target.friendship || 0) < 1000) return res.status(400).json({ success: false, error: '对方友好度不足，需要达到1000' });
  if (global.partnerRelations[player_id]) return res.status(400).json({ success: false, error: '您已有仙侣伴侣' });
  if (global.partnerRelations[target_id]) return res.status(400).json({ success: false, error: '对方已有仙侣伴侣' });

  const marriageCost = 1000;
  if ((player.spirit_stones || 0) < marriageCost) return res.status(400).json({ success: false, error: '灵石不足，需要1000灵石' });

  const existing = global.partnerApplications.find(a => a.applicant_id == player_id && a.target_id == target_id && a.status == 'pending');
  if (existing) return res.status(400).json({ success: false, error: '已有待处理的结缘申请' });

  // 扣除灵石
  player.spirit_stones = (player.spirit_stones || 0) - marriageCost;

  const app = { id: Date.now(), applicant_id: player_id, target_id: target_id, status: 'pending', created_at: new Date().toISOString() };
  global.partnerApplications.push(app);

  res.json({ success: true, message: '结缘申请已发送，等待对方确认', data: { applicant_id: player_id, target_id: target_id, cost: marriageCost, remaining_spirit_stones: player.spirit_stones } });
});

// 接受结缘
router.post('/accept', (req, res) => {
  const { player_id, applicant_id } = req.body;
  if (!player_id || !applicant_id) return res.status(400).json({ success: false, error: '缺少必要参数' });

  const player = getPlayer(player_id);
  const applicant = getPlayer(applicant_id);
  if (!player) return res.status(404).json({ success: false, error: '玩家不存在' });
  if (!applicant) return res.status(404).json({ success: false, error: '申请人不存在' });

  const appIdx = global.partnerApplications.findIndex(a => a.applicant_id == applicant_id && a.target_id == player_id && a.status == 'pending');
  if (appIdx < 0) return res.status(400).json({ success: false, error: '没有待处理的结缘申请' });

  if (global.partnerRelations[player_id]) return res.status(400).json({ success: false, error: '您已有仙侣伴侣' });
  if (global.partnerRelations[applicant_id]) return res.status(400).json({ success: false, error: '对方已有仙侣伴侣' });

  const intimacyLevel = getIntimacyLevel(0);
  const now = new Date().toISOString();

  global.partnerRelations[player_id] = { partnerId: applicant_id, intimacy: 0, intimacy_level: intimacyLevel.level, marriage_date: now, double_cultivate_count: 0, daily_double_cultivate_used: 0, last_double_cultivate: null };
  global.partnerRelations[applicant_id] = { partnerId: player_id, intimacy: 0, intimacy_level: intimacyLevel.level, marriage_date: now, double_cultivate_count: 0, daily_double_cultivate_used: 0, last_double_cultivate: null };

  global.partnerApplications[appIdx].status = 'accepted';
  global.partnerApplications[appIdx].responded_at = now;

  res.json({ success: true, message: '恭喜！成功结为仙侣伴侣', data: { partner_id: applicant_id, partner_name: applicant.name, intimacy: 0, intimacy_level: intimacyLevel.level, title: intimacyLevel.title, spirit_bonus: intimacyLevel.spirit_bonus, exp_bonus: intimacyLevel.exp_bonus } });
});

// 拒绝结缘
router.post('/reject', (req, res) => {
  const { player_id, application_id } = req.body;
  if (!player_id || !application_id) return res.status(400).json({ success: false, error: '缺少必要参数' });

  const idx = global.partnerApplications.findIndex(a => a.id == application_id && a.target_id == player_id && a.status == 'pending');
  if (idx < 0) return res.status(400).json({ success: false, error: '申请不存在或已被处理' });

  global.partnerApplications[idx].status = 'rejected';
  global.partnerApplications[idx].responded_at = new Date().toISOString();

  res.json({ success: true, message: '已拒绝结缘申请' });
});

// 获取仙侣状态
router.get('/status', (req, res) => {
  const { player_id } = req.query;
  if (!player_id) return res.status(400).json({ success: false, error: '缺少 player_id' });

  const player = getPlayer(player_id);
  if (!player) return res.status(404).json({ success: false, error: '玩家不存在' });

  const rel = global.partnerRelations[player_id];
  if (!rel) {
    // 无伴侣，检查待处理申请
    const pendingApp = global.partnerApplications.find(a => a.target_id == player_id && a.status == 'pending');
    let pendingInfo = null;
    if (pendingApp) {
      const appPlayer = getPlayer(pendingApp.applicant_id);
      pendingInfo = { id: pendingApp.id, applicant_id: pendingApp.applicant_id, applicant_name: appPlayer?.name || '未知', created_at: pendingApp.created_at };
    }
    return res.json({ success: true, data: { has_partner: false, player: { id: player.id, username: player.name, level: player.level, realm_level: player.realm_level, realm_name: player.realm_name || getRealmName(player.realm_level), online_status: player.online_status }, pending_application: pendingInfo } });
  }

  const partner = getPlayer(rel.partnerId);
  if (!partner) return res.status(500).json({ success: false, error: '伴侣数据异常' });

  const intimacyLevel = getIntimacyLevel(rel.intimacy);
  const pendingApp = global.partnerApplications.find(a => a.target_id == player_id && a.status == 'pending');
  let pendingInfo = null;
  if (pendingApp) {
    const appPlayer = getPlayer(pendingApp.applicant_id);
    pendingInfo = { id: pendingApp.id, applicant_id: pendingApp.applicant_id, applicant_name: appPlayer?.name || '未知', created_at: pendingApp.created_at };
  }

  res.json({ success: true, data: { has_partner: true, player: { id: player.id, username: player.name, level: player.level, realm_level: player.realm_level, realm_name: player.realm_name || getRealmName(player.realm_level), online_status: player.online_status }, partner: { id: partner.id, username: partner.name, level: partner.level, realm_level: partner.realm_level, realm_name: partner.realm_name || getRealmName(partner.realm_level), online_status: partner.online_status }, intimacy: rel.intimacy, intimacy_level: rel.intimacy_level, title: intimacyLevel.title, spirit_bonus: intimacyLevel.spirit_bonus, exp_bonus: intimacyLevel.exp_bonus, marriage_date: rel.marriage_date, double_cultivate_count: rel.double_cultivate_count || 0, daily_double_cultivate_used: rel.daily_double_cultivate_used || 0, last_double_cultivate: rel.last_double_cultivate, pending_application: pendingInfo } });
});

// 双修
router.post('/doublecultivate', (req, res) => {
  const { player_id } = req.body;
  if (!player_id) return res.status(400).json({ success: false, error: '缺少 player_id' });

  const player = getPlayer(player_id);
  if (!player) return res.status(404).json({ success: false, error: '玩家不存在' });

  const rel = global.partnerRelations[player_id];
  if (!rel) return res.status(400).json({ success: false, error: '您还没有仙侣伴侣' });

  const partner = getPlayer(rel.partnerId);
  if (!partner) return res.status(500).json({ success: false, error: '伴侣数据异常' });

  if (partner.online_status !== 'online') return res.status(400).json({ success: false, error: '伴侣当前不在线，无法双修' });

  // 境界差距检查
  const realmDiff = Math.abs((player.realm_level || 1) - (partner.realm_level || 1));
  if (realmDiff > 1) return res.status(400).json({ success: false, error: '境界差距过大，无法双修（境界差距不能超过1个大境界）' });

  // 冷却检查（5分钟）
  if (rel.last_double_cultivate) {
    const lastTime = new Date(rel.last_double_cultivate).getTime();
    const now = Date.now();
    const cooldown = 5 * 60 * 1000;
    if (now - lastTime < cooldown) {
      const remaining = Math.ceil((cooldown - (now - lastTime)) / 1000);
      return res.status(400).json({ success: false, error: `双修冷却中，需要等待${remaining}秒` });
    }
  }

  // 每日次数检查（3次）
  const today = new Date().toDateString();
  const lastDate = rel.last_double_cultivate ? new Date(rel.last_double_cultivate).toDateString() : null;
  let dailyUsed = rel.daily_double_cultivate_used || 0;
  if (lastDate !== today) dailyUsed = 0;
  if (dailyUsed >= 3) return res.status(400).json({ success: false, error: '今日双修次数已用完（每日上限3次）' });

  // 计算产出
  const baseSpiritPerLevel = [100, 500, 2000, 8000, 30000, 50000, 80000, 120000, 200000];
  const playerRealmSpirit = baseSpiritPerLevel[player.realm_level] || 100;
  const partnerRealmSpirit = baseSpiritPerLevel[partner.realm_level] || 100;
  const avgSpirit = Math.floor((playerRealmSpirit + partnerRealmSpirit) / 2);
  const baseSpirit = avgSpirit * 10; // 10分钟等效

  const realmBonus = 1.5;
  const intimacyBonus = 1 + Math.floor(rel.intimacy / 1000) * 0.1;
  const spiritGained = Math.floor(baseSpirit * realmBonus * intimacyBonus);
  const intimacyGained = 50;

  // 更新灵石
  player.spirit_stones = (player.spirit_stones || 0) + spiritGained;
  partner.spirit_stones = (partner.spirit_stones || 0) + Math.floor(spiritGained * 0.5);

  // 更新亲密度
  const newIntimacy = rel.intimacy + intimacyGained;
  const newIntimacyLevel = getIntimacyLevel(newIntimacy);
  const now = new Date().toISOString();
  rel.intimacy = newIntimacy;
  rel.intimacy_level = newIntimacyLevel.level;
  rel.double_cultivate_count = (rel.double_cultivate_count || 0) + 1;
  rel.daily_double_cultivate_used = dailyUsed + 1;
  rel.last_double_cultivate = now;

  // 更新伴侣方
  const partnerRel = global.partnerRelations[rel.partnerId];
  if (partnerRel) {
    partnerRel.intimacy = newIntimacy;
    partnerRel.intimacy_level = newIntimacyLevel.level;
    partnerRel.double_cultivate_count = (partnerRel.double_cultivate_count || 0) + 1;
    partnerRel.daily_double_cultivate_used = dailyUsed + 1;
    partnerRel.last_double_cultivate = now;
  }

  res.json({ success: true, message: '双修完成！', data: { spirit_stones_gained: spiritGained, partner_spirit_gained: Math.floor(spiritGained * 0.5), intimacy_gained: intimacyGained, current_intimacy: newIntimacy, new_intimacy_level: newIntimacyLevel.level, title: newIntimacyLevel.title, spirit_bonus: newIntimacyLevel.spirit_bonus, exp_bonus: newIntimacyLevel.exp_bonus, daily_remaining: 3 - (dailyUsed + 1) } });
});

// 获取所有玩家列表（用于寻找道侣）
router.get('/players', (req, res) => {
  const { player_id } = req.query;
  const players = Object.values(global.allPlayers).filter(p => p.id != player_id && !global.partnerRelations[p.id]).map(p => ({
    id: p.id, username: p.name, level: p.level, realm_level: p.realm_level, realm_name: p.realm_name || getRealmName(p.realm_level), online_status: p.online_status
  }));
  res.json({ success: true, data: players });
});

// 亲密度等级说明
router.get('/levels', (req, res) => {
  res.json({ success: true, data: INTIMACY_LEVELS });
});

module.exports = router;
