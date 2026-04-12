/**
 * PVP房间系统 + 天地规则
 * 提供PVP房间创建、加入、观战以及每日天地规则功能
 */
const express = require('express');
const path = require('path');
const router = express.Router();

const Logger = {
  info: (...args) => console.log('[pvp-room]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[pvp-room:error]', new Date().toISOString(), ...args),
  warn: (...args) => console.warn('[pvp-room:warn]', new Date().toISOString(), ...args)
};

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  initTables();
  Logger.info('数据库连接成功');
} catch (err) {
  Logger.error('数据库连接失败:', err.message);
  db = {
    _data: {}, _rooms: {}, _viewers: {},
    prepare() { return this; },
    get() { return null; },
    all() { return []; },
    run() { return { changes: 0, lastInsertRowid: 1 }; }
  };
}

// ─────────────────────────────────────────────
// 数据库初始化
// ─────────────────────────────────────────────
function initTables() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS pvp_rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        host_id INTEGER NOT NULL,
        mode TEXT NOT NULL DEFAULT '1v1',
        map_id INTEGER DEFAULT 1,
        rules TEXT DEFAULT '{}',
        status TEXT DEFAULT 'waiting',
        invite_code TEXT UNIQUE,
        round_time INTEGER DEFAULT 300,
        team_a TEXT DEFAULT '[]',
        team_b TEXT DEFAULT '[]',
        viewers TEXT DEFAULT '[]',
        world_rule TEXT DEFAULT '',
        created_at INTEGER DEFAULT (strftime('%s','now'))
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS pvp_world_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rule_key TEXT UNIQUE NOT NULL,
        rule_name TEXT NOT NULL,
        rule_desc TEXT,
        updated_at INTEGER DEFAULT (strftime('%s','now'))
      );
    `);

    // 初始化天地规则数据
    const worldRules = [
      { key: 'spirit_seal', name: '灵力封印', desc: '所有技能伤害降低50%，无法使用主动技能' },
      { key: 'double_damage', name: '双倍伤害', desc: '所有伤害翻倍' },
      { key: 'heal_ban', name: '治疗禁止', desc: '禁止使用任何治疗手段' },
      { key: 'speed_double', name: '速度翻倍', desc: '所有角色速度翻倍，先手优势最大化' },
      { key: 'crit_boom', name: '暴击风暴', desc: '暴击率提升至80%，暴击伤害+50%' },
      { key: 'fist_fly', name: '拳脚飞扬', desc: '禁用所有武器和法术，仅可使用拳脚攻击' },
      { key: 'one_punch', name: '一击必杀', desc: '所有攻击直接清空目标生命值' },
    ];

    const insertRule = db.prepare(`
      INSERT OR IGNORE INTO pvp_world_rules (rule_key, rule_name, rule_desc) VALUES (?, ?, ?)
    `);
    for (const r of worldRules) {
      insertRule.run(r.key, r.name, r.desc);
    }

    Logger.info('PVP房间表初始化完成');
  } catch (err) {
    Logger.error('初始化表失败:', err.message);
  }
}

// ─────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function getPlayerInfo(userId) {
  if (!db) return { id: userId, nickname: `玩家${userId}`, level: 1, realm: 1, power: 0 };
  try {
    return db.prepare('SELECT id, nickname, level, realm FROM Users WHERE id = ?').get(userId)
      || db.prepare('SELECT id, nickname, level, realm FROM player WHERE id = ?').get(userId)
      || { id: userId, nickname: `玩家${userId}`, level: 1, realm: 1, power: 0 };
  } catch (e) {
    return { id: userId, nickname: `玩家${userId}`, level: 1, realm: 1, power: 0 };
  }
}

// 获取当天的天地规则（每天固定规则，根据日期确定）
function getDailyWorldRule() {
  const rules = [
    { key: 'spirit_seal', name: '灵力封印', desc: '所有技能伤害降低50%，无法使用主动技能' },
    { key: 'double_damage', name: '双倍伤害', desc: '所有伤害翻倍' },
    { key: 'heal_ban', name: '治疗禁止', desc: '禁止使用任何治疗手段' },
    { key: 'speed_double', name: '速度翻倍', desc: '所有角色速度翻倍，先手优势最大化' },
    { key: 'crit_boom', name: '暴击风暴', desc: '暴击率提升至80%，暴击伤害+50%' },
    { key: 'fist_fly', name: '拳脚飞扬', desc: '禁用所有武器和法术，仅可使用拳脚攻击' },
    { key: 'one_punch', name: '一击必杀', desc: '所有攻击直接清空目标生命值' },
  ];

  const now = new Date();
  const today = Math.floor(now.getTime() / 86400000); // 天数种子
  const todayIdx = today % rules.length;
  const tomorrowIdx = (todayIdx + 1) % rules.length;

  return {
    todayRule: rules[todayIdx],
    tomorrowRule: rules[tomorrowIdx],
  };
}

function roomToJSON(room) {
  try {
    return {
      id: room.id,
      hostId: room.host_id,
      mode: room.mode,
      mapId: room.map_id,
      rules: JSON.parse(room.rules || '{}'),
      status: room.status,
      inviteCode: room.invite_code,
      roundTime: room.round_time,
      teamA: JSON.parse(room.team_a || '[]'),
      teamB: JSON.parse(room.team_b || '[]'),
      viewers: JSON.parse(room.viewers || '[]'),
      worldRule: room.world_rule,
      createdAt: room.created_at,
    };
  } catch (e) {
    return { ...room };
  }
}

// ─────────────────────────────────────────────
// 中间件：获取当前玩家ID
// ─────────────────────────────────────────────
function getUserId(req) {
  return parseInt(req.body.userId) || parseInt(req.body.playerId)
    || parseInt(req.headers['x-user-id']) || parseInt(req.query.userId) || 0;
}

// ─────────────────────────────────────────────
// API 1: POST /api/pvp-room/create
// ─────────────────────────────────────────────
router.post('/create', (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: '未登录' });

    const { mode = '1v1', mapId = 1, rules = {} } = req.body;

    if (!['1v1', '3v3', '5v5'].includes(mode)) {
      return res.json({ success: false, message: '不支持的房间模式' });
    }

    const inviteCode = generateInviteCode();
    const worldRule = getDailyWorldRule().todayRule.key;

    const rulesStr = typeof rules === 'string' ? rules : JSON.stringify(rules);

    const teamA = JSON.stringify([userId]);
    const teamB = JSON.stringify([]);

    const result = db.prepare(`
      INSERT INTO pvp_rooms (host_id, mode, map_id, rules, status, invite_code, team_a, team_b, world_rule)
      VALUES (?, ?, ?, ?, 'waiting', ?, ?, ?, ?)
    `).run(userId, mode, mapId, rulesStr, inviteCode, teamA, teamB, worldRule);

    const roomId = result.lastInsertRowid;

    Logger.info(`房间创建: userId=${userId}, roomId=${roomId}, mode=${mode}, inviteCode=${inviteCode}`);

    res.json({
      success: true,
      roomId,
      inviteCode,
      mode,
      mapId,
      worldRule,
    });
  } catch (err) {
    Logger.error('创建房间失败:', err.message);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ─────────────────────────────────────────────
// API 2: GET /api/pvp-room/list
// ─────────────────────────────────────────────
router.get('/list', (req, res) => {
  try {
    const rooms = db.prepare(`
      SELECT * FROM pvp_rooms WHERE status IN ('waiting', 'ready')
      ORDER BY created_at DESC LIMIT 50
    `).all();

    const result = rooms.map(room => {
      const r = roomToJSON(room);
      const host = getPlayerInfo(room.host_id);
      return {
        ...r,
        hostName: host.nickname,
        hostLevel: host.level,
        playerCount: JSON.parse(room.team_a || '[]').length + JSON.parse(room.team_b || '[]').length,
        requiredCount: parseInt(room.mode) * 2,
      };
    });

    res.json({ success: true, rooms: result });
  } catch (err) {
    Logger.error('获取房间列表失败:', err.message);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ─────────────────────────────────────────────
// API 3: POST /api/pvp-room/join
// ─────────────────────────────────────────────
router.post('/join', (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: '未登录' });

    const { roomId } = req.body;
    if (!roomId) return res.json({ success: false, message: 'roomId不能为空' });

    const room = db.prepare('SELECT * FROM pvp_rooms WHERE id = ?').get(roomId);
    if (!room) return res.json({ success: false, message: '房间不存在' });
    if (room.status !== 'waiting') return res.json({ success: false, message: '房间已开始或已结束' });

    const teamA = JSON.parse(room.team_a || '[]');
    const teamB = JSON.parse(room.team_b || '[]');

    if (teamA.includes(userId) || teamB.includes(userId)) {
      return res.json({ success: false, message: '已在房间中' });
    }

    // 加入人数上限
    const maxPerTeam = parseInt(room.mode);
    if (teamA.length < maxPerTeam) {
      teamA.push(userId);
    } else if (teamB.length < maxPerTeam) {
      teamB.push(userId);
    } else {
      return res.json({ success: false, message: '房间已满' });
    }

    db.prepare('UPDATE pvp_rooms SET team_a = ?, team_b = ? WHERE id = ?')
      .run(JSON.stringify(teamA), JSON.stringify(teamB), roomId);

    // 如果两队都满了，状态改为ready
    if (teamA.length === maxPerTeam && teamB.length === maxPerTeam) {
      db.prepare("UPDATE pvp_rooms SET status = 'ready' WHERE id = ?").run(roomId);
    }

    Logger.info(`玩家加入房间: userId=${userId}, roomId=${roomId}`);
    res.json({ success: true, room: roomToJSON({ ...room, team_a: JSON.stringify(teamA), team_b: JSON.stringify(teamB) }) });
  } catch (err) {
    Logger.error('加入房间失败:', err.message);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ─────────────────────────────────────────────
// API 4: POST /api/pvp-room/join-code
// ─────────────────────────────────────────────
router.post('/join-code', (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: '未登录' });

    const { code } = req.body;
    if (!code) return res.json({ success: false, message: '邀请码不能为空' });

    const room = db.prepare('SELECT * FROM pvp_rooms WHERE invite_code = ?').get(code.toUpperCase());
    if (!room) return res.json({ success: false, message: '邀请码无效' });
    if (room.status !== 'waiting') return res.json({ success: false, message: '房间已开始或已结束' });

    const teamA = JSON.parse(room.team_a || '[]');
    const teamB = JSON.parse(room.team_b || '[]');

    if (teamA.includes(userId) || teamB.includes(userId)) {
      return res.json({ success: false, message: '已在房间中' });
    }

    const maxPerTeam = parseInt(room.mode);
    if (teamA.length < maxPerTeam) {
      teamA.push(userId);
    } else if (teamB.length < maxPerTeam) {
      teamB.push(userId);
    } else {
      return res.json({ success: false, message: '房间已满' });
    }

    db.prepare('UPDATE pvp_rooms SET team_a = ?, team_b = ? WHERE id = ?')
      .run(JSON.stringify(teamA), JSON.stringify(teamB), room.id);

    if (teamA.length === maxPerTeam && teamB.length === maxPerTeam) {
      db.prepare("UPDATE pvp_rooms SET status = 'ready' WHERE id = ?").run(room.id);
    }

    Logger.info(`玩家通过邀请码加入: userId=${userId}, code=${code}, roomId=${room.id}`);
    res.json({ success: true, roomId: room.id });
  } catch (err) {
    Logger.error('邀请码加入失败:', err.message);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ─────────────────────────────────────────────
// API 5: POST /api/pvp-room/ready
// ─────────────────────────────────────────────
router.post('/ready', (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: '未登录' });

    const { roomId } = req.body;
    if (!roomId) return res.json({ success: false, message: 'roomId不能为空' });

    const room = db.prepare('SELECT * FROM pvp_rooms WHERE id = ?').get(roomId);
    if (!room) return res.json({ success: false, message: '房间不存在' });

    // 检查玩家是否在房间中
    const teamA = JSON.parse(room.team_a || '[]');
    const teamB = JSON.parse(room.team_b || '[]');
    const inRoom = teamA.includes(userId) || teamB.includes(userId);
    if (!inRoom) return res.json({ success: false, message: '不在房间中' });

    // 将状态设为ready（实际实现可能需要每个玩家单独ready状态）
    db.prepare("UPDATE pvp_rooms SET status = 'ready' WHERE id = ? AND status = 'waiting'").run(roomId);

    res.json({ success: true, ready: true, status: 'ready' });
  } catch (err) {
    Logger.error('准备失败:', err.message);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ─────────────────────────────────────────────
// API 6: POST /api/pvp-room/start
// ─────────────────────────────────────────────
router.post('/start', (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: '未登录' });

    const { roomId } = req.body;
    if (!roomId) return res.json({ success: false, message: 'roomId不能为空' });

    const room = db.prepare('SELECT * FROM pvp_rooms WHERE id = ?').get(roomId);
    if (!room) return res.json({ success: false, message: '房间不存在' });
    if (room.host_id !== userId) return res.json({ success: false, message: '只有房主可以开始战斗' });

    const teamA = JSON.parse(room.team_a || '[]');
    const teamB = JSON.parse(room.team_b || '[]');
    const maxPerTeam = parseInt(room.mode);

    if (teamA.length !== maxPerTeam || teamB.length !== maxPerTeam) {
      return res.json({ success: false, message: `需要${maxPerTeam}v${maxPerTeam}名玩家才能开始` });
    }

    // 生成battleId（简单用时间戳+随机数模拟）
    const battleId = `pvp_${roomId}_${Date.now()}`;

    db.prepare("UPDATE pvp_rooms SET status = 'playing' WHERE id = ?").run(roomId);

    Logger.info(`PVP战斗开始: roomId=${roomId}, battleId=${battleId}, mode=${room.mode}, worldRule=${room.world_rule}`);

    res.json({
      success: true,
      battleId,
      mode: room.mode,
      mapId: room.map_id,
      worldRule: room.world_rule,
      teamA: teamA.map(id => getPlayerInfo(id)),
      teamB: teamB.map(id => getPlayerInfo(id)),
    });
  } catch (err) {
    Logger.error('开始战斗失败:', err.message);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ─────────────────────────────────────────────
// API 7: GET /api/pvp-room/world-rules (必须在 /:roomId 之前)
// ─────────────────────────────────────────────
router.get('/world-rules', (req, res) => {
  try {
    const { todayRule, tomorrowRule } = getDailyWorldRule();
    res.json({
      success: true,
      todayRule,
      tomorrowRule,
    });
  } catch (err) {
    Logger.error('获取天地规则失败:', err.message);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});



function getWorldRuleName(ruleKey) {
  const rules = {
    spirit_seal: '灵力封印',
    double_damage: '双倍伤害',
    heal_ban: '治疗禁止',
    speed_double: '速度翻倍',
    crit_boom: '暴击风暴',
    fist_fly: '拳脚飞扬',
    one_punch: '一击必杀',
  };
  return rules[ruleKey] || ruleKey;
}

// ─────────────────────────────────────────────
// API 8: POST /api/pvp-room/leave
// ─────────────────────────────────────────────
router.post('/leave', (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: '未登录' });

    const { roomId } = req.body;
    if (!roomId) return res.json({ success: false, message: 'roomId不能为空' });

    const room = db.prepare('SELECT * FROM pvp_rooms WHERE id = ?').get(roomId);
    if (!room) return res.json({ success: false, message: '房间不存在' });

    const teamA = JSON.parse(room.team_a || '[]');
    const teamB = JSON.parse(room.team_b || '[]');
    const viewers = JSON.parse(room.viewers || '[]');

    let newTeamA = teamA.filter(id => id !== userId);
    let newTeamB = teamB.filter(id => id !== userId);
    let newViewers = viewers.filter(id => id !== userId);

    // 如果是房主离开，转移房主或关闭房间
    let newHostId = room.host_id;
    let newStatus = room.status;

    if (room.host_id === userId) {
      const allPlayers = [...newTeamA, ...newTeamB];
      if (allPlayers.length > 0) {
        newHostId = allPlayers[0];
        // 转移后原host移出
        if (newTeamA.includes(newHostId)) {
          newTeamA = newTeamA.filter(id => id !== newHostId);
        } else {
          newTeamB = newTeamB.filter(id => id !== newHostId);
        }
      } else {
        // 没人了，删除房间
        db.prepare('DELETE FROM pvp_rooms WHERE id = ?').run(roomId);
        return res.json({ success: true, message: '房间已解散' });
      }
    }

    if (room.status === 'playing') {
      newStatus = 'finished';
    }

    db.prepare('UPDATE pvp_rooms SET team_a = ?, team_b = ?, viewers = ?, host_id = ?, status = ? WHERE id = ?')
      .run(JSON.stringify(newTeamA), JSON.stringify(newTeamB), JSON.stringify(newViewers), newHostId, newStatus, roomId);

    Logger.info(`玩家离开房间: userId=${userId}, roomId=${roomId}`);
    res.json({ success: true });
  } catch (err) {
    Logger.error('离开房间失败:', err.message);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ─────────────────────────────────────────────
// API 10: GET /api/pvp-room/watch/:roomId
// ─────────────────────────────────────────────
router.get('/watch/:roomId', (req, res) => {
  try {
    const userId = getUserId(req);
    const roomId = parseInt(req.params.roomId);

    const room = db.prepare('SELECT * FROM pvp_rooms WHERE id = ?').get(roomId);
    if (!room) return res.status(404).json({ success: false, message: '房间不存在' });

    const viewers = JSON.parse(room.viewers || '[]');
    const canWatch = room.status === 'playing' || room.status === 'ready' || room.status === 'waiting';

    if (canWatch && userId) {
      // 自动添加为观战者（如果不在队伍中且不在观战中）
      const teamA = JSON.parse(room.team_a || '[]');
      const teamB = JSON.parse(room.team_b || '[]');
      if (!teamA.includes(userId) && !teamB.includes(userId) && !viewers.includes(userId)) {
        viewers.push(userId);
        db.prepare('UPDATE pvp_rooms SET viewers = ? WHERE id = ?').run(JSON.stringify(viewers), roomId);
      }
    }

    res.json({
      success: true,
      canWatch,
      viewers: viewers.map(id => getPlayerInfo(id)),
      roomStatus: room.status,
    });
  } catch (err) {
    Logger.error('观战失败:', err.message);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ─────────────────────────────────────────────
// API 8: GET /api/pvp-room/:roomId
// ─────────────────────────────────────────────
router.get('/:roomId', (req, res) => {
  try {
    const userId = getUserId(req);
    const roomId = parseInt(req.params.roomId);

    const room = db.prepare('SELECT * FROM pvp_rooms WHERE id = ?').get(roomId);
    if (!room) return res.status(404).json({ success: false, message: '房间不存在' });

    const r = roomToJSON(room);
    const teamA = JSON.parse(room.team_a || '[]');
    const teamB = JSON.parse(room.team_b || '[]');
    const viewers = JSON.parse(room.viewers || '[]');

    res.json({
      success: true,
      room: {
        ...r,
        hostName: getPlayerInfo(room.host_id).nickname,
        teamA: teamA.map(id => getPlayerInfo(id)),
        teamB: teamB.map(id => getPlayerInfo(id)),
        viewers: viewers.map(id => getPlayerInfo(id)),
        worldRuleName: getWorldRuleName(room.world_rule),
      },
    });
  } catch (err) {
    Logger.error('获取房间详情失败:', err.message);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
