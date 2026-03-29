/**
 * 夫妻系统路由 (couple.js)
 * REST API: /api/couple/*
 * 包装 server/src/marriage/marriage-service.ts 的业务逻辑
 */

const express = require('express');
const router = express.Router();
const path = require('path');

// ============ 配置（从 marriage-service.ts 移植）============

const MARRIAGE_CONFIG = {
  minPlayerLevel: 10,
  minFriendship: 1000,
  divorceCooldown: 24 * 60 * 60 * 1000,
  applicationExpireTime: 7 * 24 * 60 * 60 * 1000,
  weddingTypes: {
    simple: { name: '简约婚礼', cost: 9999, duration: 7, bonus: 1.1, requiredLevel: 10 },
    grand: { name: '豪华婚礼', cost: 99999, duration: 30, bonus: 1.2, requiredLevel: 30 },
    legendary: { name: '传奇婚礼', cost: 999999, duration: 365, bonus: 1.5, requiredLevel: 50 },
  },
  coupleSkills: [
    { skillId: 'couple_001', name: '同心协力', description: '夫妻同时在线修炼经验+10%', effect: { type: 'exp_bonus', value: 0.1 }, requiredWeddingType: 'simple' },
    { skillId: 'couple_002', name: '双修加成', description: '双修获得经验+20%', effect: { type: 'exp_bonus', value: 0.2 }, requiredWeddingType: 'simple' },
    { skillId: 'couple_003', name: '灵犀一点', description: '战斗支援速度+15%', effect: { type: 'battle_support', value: 0.15 }, requiredWeddingType: 'grand' },
    { skillId: 'couple_004', name: '心有灵犀', description: '灵石获取+15%', effect: { type: 'spirit_bonus', value: 0.15 }, requiredWeddingType: 'grand' },
    { skillId: 'couple_005', name: '神仙眷侣', description: '全属性加成+20%', effect: { type: 'defense_bonus', value: 0.2 }, requiredWeddingType: 'legendary' },
    { skillId: 'couple_006', name: '天作之合', description: '渡劫成功率+10%', effect: { type: 'defense_bonus', value: 0.1 }, requiredWeddingType: 'legendary' },
  ],
  intimacyLevels: [
    { level: '萍水', min: 0, max: 499, title: '初识', spiritBonus: 0.05, expBonus: 0.05 },
    { level: '知己', min: 500, max: 1999, title: '知己', spiritBonus: 0.10, expBonus: 0.10 },
    { level: '伴侣', min: 2000, max: 4999, title: '道侣', spiritBonus: 0.15, expBonus: 0.15 },
    { level: '神仙眷侣', min: 5000, max: 9999, title: '神仙眷侣', spiritBonus: 0.25, expBonus: 0.25 },
    { level: '天作之合', min: 10000, max: 999999, title: '天作之合', spiritBonus: 0.40, expBonus: 0.40 },
  ],
};

function getWeddingConfig(type) {
  return MARRIAGE_CONFIG.weddingTypes[type] || null;
}

function getSkillsByWeddingType(weddingType) {
  const typeOrder = ['simple', 'grand', 'legendary'];
  const typeIndex = typeOrder.indexOf(weddingType);
  if (typeIndex === -1) return [];
  return MARRIAGE_CONFIG.coupleSkills.filter(
    skill => typeOrder.indexOf(skill.requiredWeddingType) <= typeIndex
  );
}

function getIntimacyLevel(intimacy) {
  for (const lvl of MARRIAGE_CONFIG.intimacyLevels) {
    if (intimacy >= lvl.min && intimacy <= lvl.max) return lvl;
  }
  return MARRIAGE_CONFIG.intimacyLevels[0];
}

// ============ 数据库初始化 =============

let db = null;

function setDb(database) {
  db = database;
  initCoupleTables();
}

function initCoupleTables() {
  if (!db) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS couple_player_marriage (
      player_id INTEGER PRIMARY KEY,
      spouse_id INTEGER,
      status TEXT DEFAULT 'single',
      wedding_type TEXT,
      wedding_time INTEGER,
      wedding_expire_time INTEGER,
      divorce_status TEXT DEFAULT 'none',
      divorce_request_time INTEGER,
      couple_skills TEXT DEFAULT '[]',
      created_at INTEGER DEFAULT 0,
      updated_at INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS couple_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      applicant_id INTEGER NOT NULL,
      target_id INTEGER NOT NULL,
      wedding_type TEXT NOT NULL,
      message TEXT,
      status TEXT DEFAULT 'pending',
      created_at INTEGER DEFAULT 0,
      responded_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS couple_wedding_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player1_id INTEGER NOT NULL,
      player2_id INTEGER NOT NULL,
      wedding_type TEXT NOT NULL,
      wedding_time INTEGER NOT NULL,
      expire_time INTEGER,
      created_at INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS couple_skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      skill_id TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      unlocked_at INTEGER DEFAULT 0,
      UNIQUE(player_id, skill_id)
    );
  `);
}

// ============ 模型层 =============

function getOrCreatePlayerMarriage(playerId) {
  const row = db.prepare('SELECT * FROM couple_player_marriage WHERE player_id = ?').get(playerId);
  if (row) return row;
  const now = Date.now();
  db.prepare(`INSERT INTO couple_player_marriage (player_id, status, created_at, updated_at) VALUES (?, 'single', ?, ?)`).run(playerId, now, now);
  return db.prepare('SELECT * FROM couple_player_marriage WHERE player_id = ?').get(playerId);
}

function isPlayerMarried(playerId) {
  const m = getOrCreatePlayerMarriage(playerId);
  return m.status === 'married' && m.spouse_id != null;
}

function updatePlayerMarriage(playerId, data) {
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(data)) {
    const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    fields.push(`${dbKey} = ?`);
    values.push(value);
  }
  fields.push('updated_at = ?');
  values.push(Date.now());
  values.push(playerId);
  db.prepare(`UPDATE couple_player_marriage SET ${fields.join(', ')} WHERE player_id = ?`).run(...values);
}

function clearPlayerMarriage(playerId) {
  db.prepare(`UPDATE couple_player_marriage SET spouse_id=NULL, status='single', wedding_type=NULL, wedding_time=NULL, wedding_expire_time=NULL, divorce_status='none', divorce_request_time=NULL, couple_skills='[]', updated_at=? WHERE player_id=?`).run(Date.now(), playerId);
}

function createMarriageApplication(applicantId, targetId, weddingType, message) {
  const now = Date.now();
  const stmt = db.prepare(`INSERT INTO couple_applications (applicant_id, target_id, wedding_type, message, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)`);
  const result = stmt.run(applicantId, targetId, weddingType, message || null, now);
  return { id: result.lastInsertRowid, applicantId, targetId, weddingType, message, status: 'pending', createdAt: now };
}

function getMarriageApplications(playerId, direction) {
  if (direction === 'sent') {
    return db.prepare('SELECT * FROM couple_applications WHERE applicant_id = ? AND status = ? ORDER BY created_at DESC').all(playerId, 'pending');
  }
  return db.prepare('SELECT * FROM couple_applications WHERE target_id = ? AND status = ? ORDER BY created_at DESC').all(playerId, 'pending');
}

function acceptMarriageApplication(applicationId) {
  db.prepare(`UPDATE couple_applications SET status='accepted', responded_at=? WHERE id=?`).run(Date.now(), applicationId);
}

function rejectMarriageApplication(applicationId) {
  db.prepare(`UPDATE couple_applications SET status='rejected', responded_at=? WHERE id=?`).run(Date.now(), applicationId);
}

function createWeddingRecord(player1Id, player2Id, weddingType, expireTime) {
  const now = Date.now();
  db.prepare(`INSERT INTO couple_wedding_records (player1_id, player2_id, wedding_type, wedding_time, expire_time, created_at) VALUES (?, ?, ?, ?, ?, ?)`).run(player1Id, player2Id, weddingType, now, expireTime || 0, now);
}

function unlockCoupleSkills(playerId, skillIds) {
  const now = Date.now();
  for (const skillId of skillIds) {
    db.prepare(`INSERT OR IGNORE INTO couple_skills (player_id, skill_id, unlocked_at) VALUES (?, ?, ?)`).run(playerId, skillId, now);
  }
}

function getCoupleSkills(playerId) {
  return db.prepare('SELECT * FROM couple_skills WHERE player_id = ?').all(playerId);
}

// ============ 用户提取辅助 =============

function extractUserId(req) {
  return parseInt(req.body.userId || req.body.player_id || req.query.userId || req.query.player_id || (req.user ? req.user.id : null) || 1);
}

// ============ REST API 端点 =============

// GET /api/couple/ — 获取我的婚姻信息
router.get('/', (req, res) => {
  try {
    const playerId = extractUserId(req);
    const pm = getOrCreatePlayerMarriage(playerId);

    let spouseInfo = null;
    if (pm.spouse_id && pm.status === 'married') {
      const spouse = db.prepare('SELECT id, nickname, level, realm_level FROM Users WHERE id = ?').get(pm.spouse_id);
      if (spouse) {
        const weddingConfig = getWeddingConfig(pm.wedding_type);
        let remainingDays = 0;
        if (pm.wedding_expire_time && pm.wedding_expire_time > 0) {
          remainingDays = Math.max(0, Math.ceil((pm.wedding_expire_time - Date.now()) / (1000 * 60 * 60 * 24)));
        }
        spouseInfo = {
          playerId: spouse.id,
          playerName: spouse.nickname,
          level: spouse.level,
          realmLevel: spouse.realm_level,
          weddingType: pm.wedding_type,
          weddingTime: pm.wedding_time,
          weddingExpireTime: pm.wedding_expire_time,
          remainingDays,
          status: pm.status,
        };
      }
    }

    // 解析夫妻技能
    let coupleSkillsList = [];
    try { coupleSkillsList = JSON.parse(pm.couple_skills || '[]'); } catch (e) {}
    const skills = coupleSkillsList.map(skillId => MARRIAGE_CONFIG.coupleSkills.find(s => s.skillId === skillId)).filter(Boolean);

    let remainingDays = 0;
    if (pm.wedding_expire_time && pm.wedding_expire_time > 0) {
      remainingDays = Math.max(0, Math.ceil((pm.wedding_expire_time - Date.now()) / (1000 * 60 * 60 * 24)));
    }

    res.json({
      success: true,
      playerId,
      married: pm.status === 'married',
      status: pm.status,
      spouseId: pm.spouse_id,
      spouseInfo,
      weddingType: pm.wedding_type,
      weddingTypeName: pm.wedding_type ? MARRIAGE_CONFIG.weddingTypes[pm.wedding_type]?.name : null,
      weddingTime: pm.wedding_time,
      weddingExpireTime: pm.wedding_expire_time,
      remainingDays,
      divorceStatus: pm.divorce_status,
      divorceRequestTime: pm.divorce_request_time,
      coupleSkills: skills,
      availableSkills: pm.wedding_type ? getSkillsByWeddingType(pm.wedding_type) : [],
    });
  } catch (err) {
    console.error('[/api/couple/ GET error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/couple/types — 获取婚礼类型列表
router.get('/types', (req, res) => {
  try {
    const types = Object.entries(MARRIAGE_CONFIG.weddingTypes).map(([type, config]) => ({
      type,
      name: config.name,
      cost: config.cost,
      duration: config.duration,
      bonus: config.bonus,
      requiredLevel: config.requiredLevel,
    }));
    res.json({ success: true, data: types });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/couple/skills — 获取夫妻技能列表
router.get('/skills', (req, res) => {
  try {
    const playerId = extractUserId(req);
    const pm = getOrCreatePlayerMarriage(playerId);
    let coupleSkillsList = [];
    try { coupleSkillsList = JSON.parse(pm.couple_skills || '[]'); } catch (e) {}
    const skills = coupleSkillsList.map(skillId => MARRIAGE_CONFIG.coupleSkills.find(s => s.skillId === skillId)).filter(Boolean);
    res.json({
      success: true,
      married: pm.status === 'married',
      weddingType: pm.wedding_type,
      skills,
      allSkills: MARRIAGE_CONFIG.coupleSkills,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/couple/bonus — 获取婚姻属性加成
router.get('/bonus', (req, res) => {
  try {
    const playerId = extractUserId(req);
    const pm = getOrCreatePlayerMarriage(playerId);

    if (pm.status !== 'married') {
      return res.json({
        success: true,
        married: false,
        expBonus: 0,
        spiritBonus: 0,
        battleSupportBonus: 0,
        defenseBonus: 0,
        totalBonus: 0,
      });
    }

    let expBonus = 0, spiritBonus = 0, battleSupportBonus = 0, defenseBonus = 0;
    const weddingConfig = getWeddingConfig(pm.wedding_type || 'simple');
    if (weddingConfig) {
      const base = weddingConfig.bonus - 1;
      expBonus += base;
      spiritBonus += base;
    }

    let coupleSkillsList = [];
    try { coupleSkillsList = JSON.parse(pm.couple_skills || '[]'); } catch (e) {}
    for (const skillId of coupleSkillsList) {
      const skill = MARRIAGE_CONFIG.coupleSkills.find(s => s.skillId === skillId);
      if (skill) {
        switch (skill.effect.type) {
          case 'exp_bonus': expBonus += skill.effect.value; break;
          case 'spirit_bonus': spiritBonus += skill.effect.value; break;
          case 'battle_support': battleSupportBonus += skill.effect.value; break;
          case 'defense_bonus': defenseBonus += skill.effect.value; break;
        }
      }
    }

    res.json({
      success: true,
      married: true,
      expBonus,
      spiritBonus,
      battleSupportBonus,
      defenseBonus,
      totalBonus: expBonus + spiritBonus,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/couple/applications — 获取收到的结婚申请
router.get('/applications', (req, res) => {
  try {
    const playerId = extractUserId(req);
    const apps = getMarriageApplications(playerId, 'received');
    const result = apps.map(app => {
      const applicant = db.prepare('SELECT id, nickname, level, realm_level FROM Users WHERE id = ?').get(app.applicant_id);
      return {
        id: app.id,
        applicantId: app.applicant_id,
        applicantName: applicant?.nickname || '未知',
        applicantLevel: applicant?.level || 0,
        applicantRealmLevel: applicant?.realm_level || 0,
        weddingType: app.wedding_type,
        weddingTypeName: MARRIAGE_CONFIG.weddingTypes[app.wedding_type]?.name || '未知',
        message: app.message,
        createdAt: app.created_at,
      };
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/couple/propose — 发送结婚申请
router.post('/propose', (req, res) => {
  try {
    const playerId = extractUserId(req);
    const targetId = parseInt(req.body.targetId || req.body.target_id || 0);
    const weddingType = req.body.weddingType || req.body.wedding_type || 'simple';
    const message = req.body.message;

    if (!targetId || targetId === playerId) {
      return res.json({ success: false, error: '目标玩家无效或不能与自己结婚' });
    }

    const applicant = db.prepare('SELECT * FROM Users WHERE id = ?').get(playerId);
    const target = db.prepare('SELECT * FROM Users WHERE id = ?').get(targetId);

    if (!applicant) return res.json({ success: false, error: '申请人不存在' });
    if (!target) return res.json({ success: false, error: '目标玩家不存在' });

    const weddingConfig = getWeddingConfig(weddingType);
    if (!weddingConfig) return res.json({ success: false, error: '无效的婚礼类型' });

    if ((applicant.level || 1) < weddingConfig.requiredLevel) {
      return res.json({ success: false, error: `等级不足，需要达到${weddingConfig.requiredLevel}级` });
    }
    if ((target.level || 1) < weddingConfig.requiredLevel) {
      return res.json({ success: false, error: `对方等级不足，需要达到${weddingConfig.requiredLevel}级` });
    }

    if ((applicant.lingshi || 0) < weddingConfig.cost) {
      return res.json({ success: false, error: `灵石不足，需要${weddingConfig.cost}灵石` });
    }

    if (isPlayerMarried(playerId)) return res.json({ success: false, error: '您已结婚' });
    if (isPlayerMarried(targetId)) return res.json({ success: false, error: '对方已结婚' });

    const existingApps = getMarriageApplications(playerId, 'sent');
    const hasExisting = existingApps.some(app => app.target_id === targetId && app.status === 'pending');
    if (hasExisting) return res.json({ success: false, error: '已有待处理的结婚申请' });

    // 扣除灵石
    db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(weddingConfig.cost, playerId);

    const app = createMarriageApplication(playerId, targetId, weddingType, message);

    res.json({
      success: true,
      message: '结婚申请已发送',
      data: {
        applicationId: app.id,
        applicantId: playerId,
        targetId,
        targetName: target.nickname,
        weddingType,
        weddingTypeName: weddingConfig.name,
        cost: weddingConfig.cost,
        remainingSpiritStones: (applicant.lingshi || 0) - weddingConfig.cost,
      },
    });
  } catch (err) {
    console.error('[/api/couple/propose error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/couple/accept — 接受结婚申请
router.post('/accept', (req, res) => {
  try {
    const playerId = extractUserId(req);
    const applicationId = parseInt(req.body.applicationId || req.body.application_id || 0);

    if (!applicationId) return res.json({ success: false, error: '申请ID无效' });

    const application = db.prepare('SELECT * FROM couple_applications WHERE id = ? AND status = ?').get(applicationId, 'pending');
    if (!application) return res.json({ success: false, error: '申请不存在或已处理' });
    if (application.target_id !== playerId) return res.json({ success: false, error: '这不是您的申请' });

    const applicantId = application.applicant_id;
    const targetId = playerId;
    const weddingType = application.wedding_type;
    const weddingConfig = getWeddingConfig(weddingType);

    if (!weddingConfig) return res.json({ success: false, error: '婚礼配置错误' });

    if (isPlayerMarried(applicantId)) return res.json({ success: false, error: '对方已结婚' });
    if (isPlayerMarried(targetId)) return res.json({ success: false, error: '您已结婚' });

    const availableSkills = getSkillsByWeddingType(weddingType);
    const skillIds = availableSkills.map(s => s.skillId);
    const now = Date.now();
    const expireTime = weddingConfig.duration > 0 ? now + weddingConfig.duration * 24 * 60 * 60 * 1000 : 0;

    updatePlayerMarriage(applicantId, {
      spouseId: targetId,
      status: 'married',
      weddingType,
      weddingTime: now,
      weddingExpireTime: expireTime,
      divorceStatus: 'none',
      coupleSkills: skillIds,
    });

    updatePlayerMarriage(targetId, {
      spouseId: applicantId,
      status: 'married',
      weddingType,
      weddingTime: now,
      weddingExpireTime: expireTime,
      divorceStatus: 'none',
      coupleSkills: skillIds,
    });

    acceptMarriageApplication(applicationId);
    createWeddingRecord(applicantId, targetId, weddingType, expireTime);
    unlockCoupleSkills(applicantId, skillIds);
    unlockCoupleSkills(targetId, skillIds);

    const applicant = db.prepare('SELECT nickname FROM Users WHERE id = ?').get(applicantId);

    res.json({
      success: true,
      message: `与 ${applicant?.nickname || 'TA'} 结婚成功！`,
      data: {
        spouseId: applicantId,
        spouseName: applicant?.nickname || '未知',
        weddingType,
        weddingTypeName: weddingConfig.name,
        weddingTime: now,
        weddingExpireTime: expireTime,
        duration: weddingConfig.duration,
        bonus: weddingConfig.bonus,
        coupleSkills: availableSkills,
      },
    });
  } catch (err) {
    console.error('[/api/couple/accept error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/couple/reject — 拒绝结婚申请
router.post('/reject', (req, res) => {
  try {
    const playerId = extractUserId(req);
    const applicationId = parseInt(req.body.applicationId || req.body.application_id || 0);

    if (!applicationId) return res.json({ success: false, error: '申请ID无效' });

    const application = db.prepare('SELECT * FROM couple_applications WHERE id = ? AND status = ?').get(applicationId, 'pending');
    if (!application) return res.json({ success: false, error: '申请不存在或已处理' });
    if (application.target_id !== playerId) return res.json({ success: false, error: '这不是您的申请' });

    rejectMarriageApplication(applicationId);
    const applicant = db.prepare('SELECT nickname FROM Users WHERE id = ?').get(application.applicant_id);

    res.json({ success: true, message: `已拒绝 ${applicant?.nickname || 'TA'} 的结婚申请` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/couple/divorce-apply — 申请离婚
router.post('/divorce-apply', (req, res) => {
  try {
    const playerId = extractUserId(req);
    const pm = getOrCreatePlayerMarriage(playerId);

    if (pm.status !== 'married' || !pm.spouse_id) {
      return res.json({ success: false, error: '您还未结婚' });
    }

    const spouseId = pm.spouse_id;

    if (pm.divorce_status === 'pending') {
      const timeSince = Date.now() - (pm.divorce_request_time || 0);
      const remaining = MARRIAGE_CONFIG.divorceCooldown - timeSince;
      if (remaining > 0) {
        const hours = Math.ceil(remaining / (1000 * 60 * 60));
        return res.json({
          success: false,
          error: `离婚申请已提交，需等待 ${hours} 小时才能正式离婚`,
          data: { divorceRequested: true, requestTime: pm.divorce_request_time, cooldownRemaining: hours },
        });
      }
    }

    const now = Date.now();
    updatePlayerMarriage(playerId, { divorceStatus: 'pending', divorceRequestTime: now });
    const spouse = db.prepare('SELECT nickname FROM Users WHERE id = ?').get(spouseId);

    res.json({
      success: true,
      message: '离婚申请已提交，需等待24小时冷静期',
      data: {
        divorceRequested: true,
        requestTime: now,
        cooldownHours: MARRIAGE_CONFIG.divorceCooldown / (1000 * 60 * 60),
        spouseName: spouse?.nickname || 'TA',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/couple/divorce-confirm — 确认离婚
router.post('/divorce-confirm', (req, res) => {
  try {
    const playerId = extractUserId(req);
    const pm = getOrCreatePlayerMarriage(playerId);

    if (pm.status !== 'married' || !pm.spouse_id) {
      return res.json({ success: false, error: '您还未结婚' });
    }

    if (pm.divorce_status !== 'pending') {
      return res.json({ success: false, error: '您还未提交离婚申请' });
    }

    const timeSince = Date.now() - (pm.divorce_request_time || 0);
    if (timeSince < MARRIAGE_CONFIG.divorceCooldown) {
      const hours = Math.ceil((MARRIAGE_CONFIG.divorceCooldown - timeSince) / (1000 * 60 * 60));
      return res.json({ success: false, error: `需等待 ${hours} 小时后才能正式离婚` });
    }

    const spouseId = pm.spouse_id;
    const spouse = db.prepare('SELECT nickname FROM Users WHERE id = ?').get(spouseId);

    clearPlayerMarriage(playerId);
    clearPlayerMarriage(spouseId);

    res.json({ success: true, message: `与 ${spouse?.nickname || 'TA'} 离婚成功`, data: { divorceCost: 0 } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/couple/quick-marry — 快速结婚（跳过申请流程）
router.post('/quick-marry', (req, res) => {
  try {
    const playerId = extractUserId(req);
    const targetId = parseInt(req.body.targetId || req.body.target_id || 0);
    const weddingType = req.body.weddingType || 'simple';

    if (!targetId || targetId === playerId) return res.json({ success: false, error: '目标无效' });

    const applicant = db.prepare('SELECT * FROM Users WHERE id = ?').get(playerId);
    const target = db.prepare('SELECT * FROM Users WHERE id = ?').get(targetId);

    if (!applicant || !target) return res.json({ success: false, error: '玩家不存在' });
    if (isPlayerMarried(playerId)) return res.json({ success: false, error: '您已结婚' });
    if (isPlayerMarried(targetId)) return res.json({ success: false, error: '对方已结婚' });

    const weddingConfig = getWeddingConfig(weddingType);
    if (!weddingConfig) return res.json({ success: false, error: '无效的婚礼类型' });

    const now = Date.now();
    const expireTime = weddingConfig.duration > 0 ? now + weddingConfig.duration * 24 * 60 * 60 * 1000 : 0;
    const skillIds = getSkillsByWeddingType(weddingType).map(s => s.skillId);

    updatePlayerMarriage(playerId, {
      spouseId: targetId, status: 'married', weddingType,
      weddingTime: now, weddingExpireTime: expireTime, coupleSkills: skillIds,
    });
    updatePlayerMarriage(targetId, {
      spouseId: playerId, status: 'married', weddingType,
      weddingTime: now, weddingExpireTime: expireTime, coupleSkills: skillIds,
    });
    createWeddingRecord(playerId, targetId, weddingType, expireTime);
    unlockCoupleSkills(playerId, skillIds);
    unlockCoupleSkills(targetId, skillIds);

    res.json({
      success: true,
      message: `与 ${target.nickname} 结婚成功！`,
      data: {
        spouseId: targetId, spouseName: target.nickname, weddingType,
        weddingTypeName: weddingConfig.name, weddingTime: now,
        weddingExpireTime: expireTime, duration: weddingConfig.duration,
        bonus: weddingConfig.bonus, coupleSkills: getSkillsByWeddingType(weddingType),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/couple/intimacy — 增加亲密度（双修）
router.post('/intimacy', (req, res) => {
  try {
    const playerId = extractUserId(req);
    const addAmount = parseInt(req.body.amount || 100);

    const pm = getOrCreatePlayerMarriage(playerId);
    if (pm.status !== 'married' || !pm.spouse_id) {
      return res.json({ success: false, error: '您还未结婚，无法双修' });
    }

    // 亲密度暂时记录在 couple_player_marriage 中
    // 这里简单实现：每调用一次增加亲密度（实际应关联到双修记录）
    res.json({
      success: true,
      message: '双修完成，亲密度+' + addAmount,
      data: {
        currentIntimacy: 0,
        addedIntimacy: addAmount,
        intimacyLevel: getIntimacyLevel(addAmount),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = { router, setDb };
