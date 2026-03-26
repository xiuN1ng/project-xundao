/**
 * 宗门战系统 - sect-war.js
 * 宗门战匹配、宣战、战斗、奖励完整后端
 *
 * 端点:
 * GET  /              - 宗门战概览
 * GET  /info          - 当前赛季/开战状态
 * POST /declare       - 宗主发起宣战
 * GET  /matches       - 宗门战匹配列表
 * GET  /matches/:id   - 宗门战详情
 * POST /join          - 加入宗门战
 * GET  /battle        - 战斗页面
 * POST /battle        - 发起战斗
 * GET  /ranking       - 宗门战排行榜
 * GET  /my            - 我的宗门战状态
 * POST /claim         - 领取奖励
 */

const express = require('express');
const router = express.Router();
const path = require('path');

// 模块级 DB 连接
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');
let db = null;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
} catch (e) {
  console.log('[sect-war] DB 连接失败:', e.message);
}

// ============================================================
// 初始化：建表
// ============================================================
function initSectWarTables() {
  if (!db) return;
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS sect_war_schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        war_type TEXT NOT NULL DEFAULT 'weekly',
        start_time TEXT,
        end_time TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS sect_war_matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        attacker_id INTEGER,
        defender_id INTEGER,
        attacker_name TEXT DEFAULT '待定',
        defender_name TEXT DEFAULT '待定',
        attacker_score INTEGER DEFAULT 0,
        defender_score INTEGER DEFAULT 0,
        status TEXT DEFAULT 'matching',
        war_type TEXT DEFAULT 'weekly',
        schedule_id INTEGER,
        winner_id INTEGER,
        started_at TEXT DEFAULT (datetime('now')),
        ended_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS sect_war_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id INTEGER,
        user_id INTEGER,
        sect_id INTEGER,
        kills INTEGER DEFAULT 0,
        deaths INTEGER DEFAULT 0,
        contribution INTEGER DEFAULT 0,
        is_online INTEGER DEFAULT 1,
        joined_at TEXT DEFAULT (datetime('now')),
        UNIQUE(match_id, user_id)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS sect_war_battles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id INTEGER,
        attacker_id INTEGER,
        defender_id INTEGER,
        attacker_name TEXT,
        defender_name TEXT,
        attacker_hp_before INTEGER,
        defender_hp_before INTEGER,
        damage_dealt INTEGER DEFAULT 0,
        result TEXT,
        is_attacker_win INTEGER,
        battle_time TEXT DEFAULT (datetime('now'))
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS sect_war_rewards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        match_id INTEGER,
        rank INTEGER,
        reward_type TEXT,
        reward_amount INTEGER DEFAULT 0,
        claimed INTEGER DEFAULT 0,
        claimed_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(user_id, match_id)
      )
    `);

    console.log('[sect-war] 表初始化完成');
  } catch (e) {
    console.error('[sect-war] 建表错误:', e.message);
  }
}

initSectWarTables();

// ============================================================
// 工具函数
// ============================================================

function getCurrentSchedule() {
  if (!db) return null;
  try {
    const row = db.prepare(`
      SELECT * FROM sect_war_schedules
      WHERE status IN ('matching', 'war')
      ORDER BY id DESC LIMIT 1
    `).get();
    if (row) return row;

    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - now.getDay()));
    endOfWeek.setHours(20, 0, 0, 0);

    const result = db.prepare(`
      INSERT INTO sect_war_schedules (war_type, start_time, end_time, status)
      VALUES ('weekly', datetime('now'), ?, 'matching')
    `).run(endOfWeek.toISOString());

    return db.prepare('SELECT * FROM sect_war_schedules WHERE id = ?').get(result.lastInsertRowid);
  } catch (e) {
    return null;
  }
}

function getUserSect(userId) {
  if (!db) return null;
  try {
    return db.prepare('SELECT sectId FROM Users WHERE id = ?').get(userId);
  } catch (e) {
    return null;
  }
}

function getSectInfo(sectId) {
  if (!db) return null;
  try {
    return db.prepare('SELECT * FROM Sects WHERE id = ?').get(sectId);
  } catch (e) {
    return null;
  }
}

function isSectLeader(userId, sectId) {
  if (!db) return false;
  try {
    const member = db.prepare('SELECT role FROM SectMembers WHERE userId = ? AND sectId = ?').get(userId, sectId);
    return member && member.role === '掌门';
  } catch (e) {
    return false;
  }
}

function computeWarRanking() {
  if (!db) return [];
  try {
    return db.prepare(`
      SELECT
        s.id, s.name, s.level,
        COALESCE(SUM(swp.kills), 0) as total_kills,
        COALESCE(SUM(swm.attacker_score + swm.defender_score), 0) as total_score,
        COUNT(DISTINCT swm.id) as war_count,
        SUM(CASE WHEN swm.winner_id = s.id THEN 1 ELSE 0 END) as win_count
      FROM Sects s
      LEFT JOIN sect_war_matches swm ON (swm.attacker_id = s.id OR swm.defender_id = s.id)
      LEFT JOIN sect_war_participants swp ON swp.sect_id = s.id
      WHERE swm.status = 'ended'
      GROUP BY s.id
      ORDER BY total_score DESC, total_kills DESC
      LIMIT 50
    `).all();
  } catch (e) {
    return [];
  }
}

// ============================================================
// 路由实现
// ============================================================

// GET / - 宗门战概览
router.get('/', (req, res) => {
  const schedule = getCurrentSchedule();
  const now = new Date();
  const isWarTime = schedule && schedule.status === 'war';
  const matchingOpen = schedule && schedule.status === 'matching';

  let recentMatches = [];
  if (db) {
    try {
      recentMatches = db.prepare('SELECT * FROM sect_war_matches ORDER BY id DESC LIMIT 5').all();
    } catch (e) {}
  }

  res.json({
    success: true,
    schedule: schedule ? {
      id: schedule.id,
      warType: schedule.war_type,
      status: schedule.status,
      startTime: schedule.start_time,
      endTime: schedule.end_time
    } : null,
    isWarTime,
    matchingOpen,
    currentTime: now.toISOString(),
    recentMatches
  });
});

// GET /info - 当前赛季信息
router.get('/info', (req, res) => {
  const userId = parseInt(req.query.player_id) || parseInt(req.query.playerId) || 1;
  const schedule = getCurrentSchedule();
  const userSect = getUserSect(userId);

  if (!userSect || !userSect.sectId) {
    return res.json({ success: false, message: '你尚未加入宗门', inWar: false });
  }

  const sectInfo = getSectInfo(userSect.sectId);
  let myMatch = null;
  if (db && schedule) {
    try {
      myMatch = db.prepare(`
        SELECT * FROM sect_war_matches
        WHERE schedule_id = ? AND (attacker_id = ? OR defender_id = ?)
        ORDER BY id DESC LIMIT 1
      `).get(schedule.id, userSect.sectId, userSect.sectId);
    } catch (e) {}
  }

  res.json({
    success: true,
    inWar: !!myMatch,
    schedule: schedule ? {
      id: schedule.id,
      warType: schedule.war_type,
      status: schedule.status,
      startTime: schedule.start_time,
      endTime: schedule.end_time
    } : null,
    sect: sectInfo ? {
      id: sectInfo.id,
      name: sectInfo.name,
      level: sectInfo.level,
      members: sectInfo.members,
      rank: sectInfo.rank
    } : null,
    currentMatch: myMatch
  });
});

// POST /declare - 宗主发起宣战
router.post('/declare', (req, res) => {
  const userId = parseInt(req.body.player_id) || parseInt(req.body.userId) || 1;
  const targetSectId = parseInt(req.body.target_sect_id);
  const userSect = getUserSect(userId);

  if (!userSect || !userSect.sectId) {
    return res.json({ success: false, message: '你尚未加入宗门' });
  }
  if (!isSectLeader(userId, userSect.sectId)) {
    return res.json({ success: false, message: '只有宗主才能发起宣战' });
  }
  if (!targetSectId) {
    return res.json({ success: false, message: '缺少目标宗门ID' });
  }
  if (targetSectId === userSect.sectId) {
    return res.json({ success: false, message: '不能向自己的宗门宣战' });
  }

  const attackerSect = getSectInfo(userSect.sectId);
  const defenderSect = getSectInfo(targetSectId);
  if (!attackerSect || !defenderSect) {
    return res.json({ success: false, message: '宗门不存在' });
  }

  const schedule = getCurrentSchedule();

  if (!db) {
    return res.json({ success: true, message: '模拟宣战成功', mock: true });
  }

  try {
    const existing = db.prepare(`
      SELECT * FROM sect_war_matches
      WHERE schedule_id = ? AND status = 'matching'
      AND ((attacker_id = ? AND defender_id = ?) OR (attacker_id = ? AND defender_id = ?))
    `).get(schedule?.id, userSect.sectId, targetSectId, targetSectId, userSect.sectId);

    if (existing) {
      return res.json({ success: false, message: '已有进行中的对战' });
    }

    const result = db.prepare(`
      INSERT INTO sect_war_matches (attacker_id, defender_id, attacker_name, defender_name, status, war_type, schedule_id)
      VALUES (?, ?, ?, ?, 'matching', 'weekly', ?)
    `).run(userSect.sectId, targetSectId, attackerSect.name, defenderSect.name, schedule?.id || 1);

    res.json({
      success: true,
      message: `已向 ${defenderSect.name} 宣战`,
      matchId: result.lastInsertRowid,
      attacker: { id: attackerSect.id, name: attackerSect.name },
      defender: { id: defenderSect.id, name: defenderSect.name }
    });
  } catch (e) {
    res.json({ success: false, message: '宣战失败: ' + e.message });
  }
});

// GET /matches - 宗门战匹配列表
router.get('/matches', (req, res) => {
  const status = req.query.status;
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const offset = (page - 1) * limit;

  if (!db) {
    return res.json({ success: true, matches: [], pagination: { page, limit, total: 0 } });
  }

  try {
    let query = 'SELECT * FROM sect_war_matches';
    let countQuery = 'SELECT COUNT(*) as total FROM sect_war_matches';
    const params = [];

    if (status) {
      query += ' WHERE status = ?';
      countQuery += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    const total = db.prepare(countQuery).get(...params).total;
    const matches = db.prepare(query).all(...params, limit, offset);

    res.json({
      success: true,
      matches: matches.map(m => ({
        id: m.id, attackerId: m.attacker_id, defenderId: m.defender_id,
        attackerName: m.attacker_name, defenderName: m.defender_name,
        attackerScore: m.attacker_score, defenderScore: m.defender_score,
        status: m.status, warType: m.war_type, winnerId: m.winner_id,
        startedAt: m.started_at, endedAt: m.ended_at
      })),
      pagination: { page, limit, total }
    });
  } catch (e) {
    res.json({ success: false, message: e.message, matches: [] });
  }
});

// GET /matches/:id - 宗门战详情
router.get('/matches/:id', (req, res) => {
  const matchId = parseInt(req.params.id);

  if (!db) return res.json({ success: false, message: '数据库未连接' });

  try {
    const match = db.prepare('SELECT * FROM sect_war_matches WHERE id = ?').get(matchId);
    if (!match) return res.json({ success: false, message: '宗门战不存在' });

    const participants = db.prepare(`
      SELECT swp.*, u.nickname, u.level as user_level, u.attack, u.hp
      FROM sect_war_participants swp
      LEFT JOIN Users u ON u.id = swp.user_id
      WHERE swp.match_id = ?
      ORDER BY swp.contribution DESC
    `).all(matchId);

    const battles = db.prepare(`
      SELECT * FROM sect_war_battles WHERE match_id = ?
      ORDER BY id DESC LIMIT 20
    `).all(matchId);

    res.json({
      success: true,
      match: {
        id: match.id, attackerId: match.attacker_id, defenderId: match.defender_id,
        attackerName: match.attacker_name, defenderName: match.defender_name,
        attackerScore: match.attacker_score, defenderScore: match.defender_score,
        status: match.status, warType: match.war_type, winnerId: match.winner_id,
        startedAt: match.started_at, endedAt: match.ended_at
      },
      participants,
      recentBattles: battles
    });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// POST /join - 加入宗门战（成员报名）
router.post('/join', (req, res) => {
  const userId = parseInt(req.body.player_id) || parseInt(req.body.userId) || 1;
  const matchId = parseInt(req.body.match_id);
  const userSect = getUserSect(userId);

  if (!userSect || !userSect.sectId) {
    return res.json({ success: false, message: '你尚未加入宗门' });
  }

  if (!db) {
    return res.json({ success: true, message: '模拟加入成功', mock: true });
  }

  try {
    let targetMatchId = matchId;
    if (!matchId) {
      const schedule = getCurrentSchedule();
      const m = db.prepare(`
        SELECT id FROM sect_war_matches
        WHERE schedule_id = ? AND (attacker_id = ? OR defender_id = ?) AND status IN ('matching', 'war')
        ORDER BY id DESC LIMIT 1
      `).get(schedule?.id, userSect.sectId, userSect.sectId);
      if (!m) return res.json({ success: false, message: '当前没有可加入的宗门战' });
      targetMatchId = m.id;
    }

    const match = db.prepare('SELECT * FROM sect_war_matches WHERE id = ?').get(targetMatchId);
    if (!match) return res.json({ success: false, message: '宗门战不存在' });
    if (match.attacker_id !== userSect.sectId && match.defender_id !== userSect.sectId) {
      return res.json({ success: false, message: '你不是该宗门战的参战方' });
    }

    db.prepare(`
      INSERT OR IGNORE INTO sect_war_participants (match_id, user_id, sect_id)
      VALUES (?, ?, ?)
    `).run(targetMatchId, userId, userSect.sectId);

    res.json({ success: true, message: '加入成功', matchId: targetMatchId });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// GET /battle - 战斗页面（可挑战的敌方成员列表）
router.get('/battle', (req, res) => {
  const userId = parseInt(req.query.player_id) || parseInt(req.query.playerId) || 1;
  const matchId = parseInt(req.query.match_id);
  const userSect = getUserSect(userId);

  if (!userSect || !userSect.sectId) {
    return res.json({ success: false, message: '你尚未加入宗门' });
  }

  if (!db) {
    return res.json({ success: true, opponents: [], mock: true });
  }

  try {
    let targetMatchId = matchId;
    if (!matchId) {
      const schedule = getCurrentSchedule();
      const m = db.prepare(`
        SELECT id FROM sect_war_matches
        WHERE schedule_id = ? AND (attacker_id = ? OR defender_id = ?) AND status IN ('matching', 'war')
        ORDER BY id DESC LIMIT 1
      `).get(schedule?.id, userSect.sectId, userSect.sectId);
      if (!m) return res.json({ success: false, message: '当前没有进行中的宗门战' });
      targetMatchId = m.id;
    }

    const match = db.prepare('SELECT * FROM sect_war_matches WHERE id = ?').get(targetMatchId);
    if (!match) return res.json({ success: false, message: '宗门战不存在' });

    const enemySectId = match.attacker_id === userSect.sectId ? match.defender_id : match.attacker_id;
    const opponents = db.prepare(`
      SELECT swp.*, u.nickname, u.level as user_level, u.attack, u.hp, u.defense, u.speed
      FROM sect_war_participants swp
      LEFT JOIN Users u ON u.id = swp.user_id
      WHERE swp.match_id = ? AND swp.sect_id = ?
      ORDER BY swp.contribution DESC
    `).all(targetMatchId, enemySectId);

    const myTeam = db.prepare(`
      SELECT swp.*, u.nickname, u.level as user_level, u.attack, u.hp
      FROM sect_war_participants swp
      LEFT JOIN Users u ON u.id = swp.user_id
      WHERE swp.match_id = ? AND swp.sect_id = ?
    `).all(targetMatchId, userSect.sectId);

    res.json({
      success: true,
      matchId: targetMatchId,
      mySectId: userSect.sectId,
      enemySectId,
      opponents: opponents.map(o => ({
        userId: o.user_id, nickname: o.nickname, level: o.user_level,
        hp: o.hp, attack: o.attack, defense: o.defense, speed: o.speed,
        kills: o.kills, deaths: o.deaths, contribution: o.contribution
      })),
      myTeam: myTeam.map(p => ({
        userId: p.user_id, nickname: p.nickname, level: p.user_level,
        hp: p.hp, attack: p.attack, kills: p.kills, deaths: p.deaths
      }))
    });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// POST /battle - 发起战斗
router.post('/battle', (req, res) => {
  const userId = parseInt(req.body.player_id) || parseInt(req.body.userId) || 1;
  const targetUserId = parseInt(req.body.target_user_id);
  const matchId = parseInt(req.body.match_id);

  if (!targetUserId) return res.json({ success: false, message: '缺少目标用户ID' });

  const userSect = getUserSect(userId);
  if (!userSect || !userSect.sectId) {
    return res.json({ success: false, message: '你尚未加入宗门' });
  }

  if (!db) {
    const atk = 500 + Math.floor(Math.random() * 300);
    const def = 300 + Math.floor(Math.random() * 200);
    const damage = Math.max(1, atk - def * 0.5);
    const win = Math.random() > 0.4;
    return res.json({
      success: true, mock: true,
      battle: {
        attackerId: userId, defenderId: targetUserId,
        damageDealt: Math.floor(damage),
        attackerHpLeft: win ? 800 : 0, defenderHpLeft: win ? 0 : 300,
        result: win ? 'win' : 'lose', contribution: win ? 10 : 2
      }
    });
  }

  try {
    let targetMatchId = matchId;
    if (!matchId) {
      const schedule = getCurrentSchedule();
      const m = db.prepare(`
        SELECT id FROM sect_war_matches
        WHERE schedule_id = ? AND (attacker_id = ? OR defender_id = ?) AND status IN ('matching', 'war')
        ORDER BY id DESC LIMIT 1
      `).get(schedule?.id, userSect.sectId, userSect.sectId);
      if (!m) return res.json({ success: false, message: '当前没有进行中的宗门战' });
      targetMatchId = m.id;
    }

    const match = db.prepare('SELECT * FROM sect_war_matches WHERE id = ?').get(targetMatchId);
    if (!match) return res.json({ success: false, message: '宗门战不存在' });

    const attacker = db.prepare('SELECT * FROM Users WHERE id = ?').get(userId);
    const defender = db.prepare('SELECT * FROM Users WHERE id = ?').get(targetUserId);
    if (!attacker || !defender) return res.json({ success: false, message: '用户不存在' });

    const atkVal = attacker.attack || 100;
    const defVal = defender.defense || 50;
    const atkHp = attacker.hp || 1000;
    const defHp = defender.hp || 1000;

    const baseDamage = Math.max(1, atkVal - defVal * 0.5 + Math.floor(Math.random() * 50));
    const isCrit = Math.random() < 0.15;
    const damage = isCrit ? Math.floor(baseDamage * 2) : baseDamage;
    const defenderHpLeft = Math.max(0, defHp - damage);
    const isWin = defenderHpLeft <= 0;

    const attackerParticipant = db.prepare('SELECT * FROM sect_war_participants WHERE match_id = ? AND user_id = ?').get(targetMatchId, userId);
    const defenderParticipant = db.prepare('SELECT * FROM sect_war_participants WHERE match_id = ? AND user_id = ?').get(targetMatchId, targetUserId);

    if (attackerParticipant) {
      db.prepare('UPDATE sect_war_participants SET kills = kills + ?, contribution = contribution + ? WHERE id = ?')
        .run(isWin ? 1 : 0, isWin ? 10 : 2, attackerParticipant.id);
    }
    if (defenderParticipant && !isWin) {
      db.prepare('UPDATE sect_war_participants SET deaths = deaths + 1 WHERE id = ?').run(defenderParticipant.id);
    }

    db.prepare(`
      INSERT INTO sect_war_battles (match_id, attacker_id, defender_id, attacker_name, defender_name, attacker_hp_before, defender_hp_before, damage_dealt, result, is_attacker_win)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(targetMatchId, userId, targetUserId, attacker.nickname, defender.nickname, atkHp, defHp, damage, isWin ? 'win' : 'lose', isWin ? 1 : 0);

    const isAttackerSide = match.attacker_id === userSect.sectId;
    const scoreField = isAttackerSide ? 'attacker_score' : 'defender_score';
    db.prepare(`UPDATE sect_war_matches SET ${scoreField} = ${scoreField} + ? WHERE id = ?`).run(isWin ? 1 : 0, targetMatchId);

    // 检查宗门战是否结束（先到10分获胜）
    const updatedMatch = db.prepare('SELECT * FROM sect_war_matches WHERE id = ?').get(targetMatchId);
    if (updatedMatch.attacker_score >= 10 || updatedMatch.defender_score >= 10) {
      const winnerId = updatedMatch.attacker_score >= 10 ? updatedMatch.attacker_id : updatedMatch.defender_id;
      db.prepare(`UPDATE sect_war_matches SET status = 'ended', winner_id = ?, ended_at = datetime('now') WHERE id = ?`)
        .run(winnerId, targetMatchId);

      const reward = winnerId === userSect.sectId ? 5000 : 2000;
      db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(reward, userId);

      return res.json({
        success: true,
        battle: {
          attackerId: userId, defenderId: targetUserId,
          attackerName: attacker.nickname, defenderName: defender.nickname,
          damageDealt: damage, isCrit, defenderHpLeft,
          result: isWin ? 'win' : 'lose', contribution: isWin ? 10 : 2,
          warEnded: true, winnerId, reward
        }
      });
    }

    res.json({
      success: true,
      battle: {
        attackerId: userId, defenderId: targetUserId,
        attackerName: attacker.nickname, defenderName: defender.nickname,
        damageDealt: damage, isCrit, defenderHpLeft,
        result: isWin ? 'win' : 'lose', contribution: isWin ? 10 : 2
      }
    });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// GET /ranking - 宗门战排行榜
router.get('/ranking', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const ranking = computeWarRanking().slice(0, limit);

  if (ranking.length === 0) {
    const mockRanking = [
      { id: 1, name: '青云宗', level: 8, total_kills: 156, total_score: 420, war_count: 12, win_count: 9, rank: 1 },
      { id: 2, name: '天机阁', level: 7, total_kills: 132, total_score: 380, war_count: 12, win_count: 8, rank: 2 },
      { id: 3, name: '万剑门', level: 7, total_kills: 128, total_score: 355, war_count: 12, win_count: 7, rank: 3 },
      { id: 4, name: '紫霄宫', level: 6, total_kills: 110, total_score: 320, war_count: 11, win_count: 6, rank: 4 },
      { id: 5, name: '太虚观', level: 6, total_kills: 95, total_score: 290, war_count: 10, win_count: 5, rank: 5 },
    ];
    return res.json({ success: true, ranking: mockRanking.slice(0, limit), mock: true });
  }

  res.json({ success: true, ranking });
});

// GET /my - 我的宗门战状态
router.get('/my', (req, res) => {
  const userId = parseInt(req.query.player_id) || parseInt(req.query.playerId) || 1;
  const userSect = getUserSect(userId);

  if (!userSect || !userSect.sectId) {
    return res.json({ success: false, message: '你尚未加入宗门', inWar: false });
  }

  const sectInfo = getSectInfo(userSect.sectId);
  const schedule = getCurrentSchedule();

  if (!db) {
    return res.json({
      success: true, mock: true, inWar: false,
      sect: sectInfo ? { id: sectInfo.id, name: sectInfo.name, level: sectInfo.level } : null,
      participant: { kills: 0, deaths: 0, contribution: 0 }
    });
  }

  try {
    let myMatch = null;
    let myParticipant = null;
    let myRank = null;

    if (schedule) {
      myMatch = db.prepare(`
        SELECT * FROM sect_war_matches
        WHERE schedule_id = ? AND (attacker_id = ? OR defender_id = ?)
        ORDER BY id DESC LIMIT 1
      `).get(schedule.id, userSect.sectId, userSect.sectId);
    }

    if (myMatch) {
      myParticipant = db.prepare('SELECT * FROM sect_war_participants WHERE match_id = ? AND user_id = ?').get(myMatch.id, userId);

      const rankRows = db.prepare(`
        SELECT * FROM (
          SELECT *, ROW_NUMBER() OVER (ORDER BY contribution DESC) as my_rank
          FROM sect_war_participants WHERE match_id = ?
        ) WHERE user_id = ?
      `).all(myMatch.id, userId);
      if (rankRows.length > 0) myRank = rankRows[0].my_rank;
    }

    const history = db.prepare(`
      SELECT swm.*, CASE WHEN swm.winner_id = ? THEN 1 ELSE 0 END as won
      FROM sect_war_matches swm
      WHERE swm.attacker_id = ? OR swm.defender_id = ?
      ORDER BY swm.id DESC LIMIT 10
    `).all(userSect.sectId, userSect.sectId, userSect.sectId);

    res.json({
      success: true,
      inWar: !!myMatch,
      schedule: schedule ? { id: schedule.id, status: schedule.status, warType: schedule.war_type } : null,
      sect: sectInfo ? { id: sectInfo.id, name: sectInfo.name, level: sectInfo.level } : null,
      match: myMatch ? {
        id: myMatch.id, status: myMatch.status,
        attackerName: myMatch.attacker_name, defenderName: myMatch.defender_name,
        attackerScore: myMatch.attacker_score, defenderScore: myMatch.defender_score
      } : null,
      participant: myParticipant ? {
        kills: myParticipant.kills, deaths: myParticipant.deaths,
        contribution: myParticipant.contribution, personalRank: myRank
      } : null,
      history: history || []
    });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// POST /claim - 领取宗门战奖励
router.post('/claim', (req, res) => {
  const userId = parseInt(req.body.player_id) || parseInt(req.body.userId) || 1;
  const matchId = parseInt(req.body.match_id);
  const userSect = getUserSect(userId);

  if (!userSect || !userSect.sectId) {
    return res.json({ success: false, message: '你尚未加入宗门' });
  }

  if (!db) {
    return res.json({ success: true, message: '模拟领取成功', reward: 3000, mock: true });
  }

  try {
    const existing = db.prepare('SELECT * FROM sect_war_rewards WHERE user_id = ? AND match_id = ?').get(userId, matchId);
    if (existing && existing.claimed) {
      return res.json({ success: false, message: '奖励已领取' });
    }

    const match = db.prepare('SELECT * FROM sect_war_matches WHERE id = ?').get(matchId);
    if (!match) return res.json({ success: false, message: '宗门战不存在' });
    if (match.status !== 'ended') return res.json({ success: false, message: '宗门战尚未结束' });

    const won = match.winner_id === userSect.sectId;
    const baseReward = won ? 5000 : 2000;

    let participant = null;
    try {
      participant = db.prepare('SELECT * FROM sect_war_participants WHERE match_id = ? AND user_id = ?').get(matchId, userId);
    } catch (e) {}

    const contributionBonus = participant ? Math.floor(participant.contribution * 10) : 0;
    const totalReward = baseReward + contributionBonus;

    db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(totalReward, userId);

    if (existing) {
      db.prepare('UPDATE sect_war_rewards SET claimed = 1, claimed_at = datetime("now"), reward_amount = ? WHERE id = ?')
        .run(totalReward, existing.id);
    } else {
      db.prepare(`
        INSERT INTO sect_war_rewards (user_id, match_id, rank, reward_type, reward_amount, claimed, claimed_at)
        VALUES (?, ?, ?, 'lingshi', ?, 1, datetime('now'))
      `).run(userId, matchId, won ? 1 : 2, totalReward);
    }

    res.json({
      success: true,
      message: won ? '胜利奖励领取成功' : '参与奖励领取成功',
      reward: totalReward,
      breakdown: { base: baseReward, contributionBonus, total: totalReward }
    });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

module.exports = router;
