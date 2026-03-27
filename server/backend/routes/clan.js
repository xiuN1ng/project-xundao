/**
 * Clan 宗门系统 API - 完整实现
 * 宗门创建/列表/加入/信息
 */
const express = require('express');
const path = require('path');
const router = express.Router();

const Logger = {
  info: (...args) => console.log('[clan]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[clan:error]', new Date().toISOString(), ...args),
  warn: (...args) => console.warn('[clan:warn]', new Date().toISOString(), ...args)
};

// DB path: server/backend/data/game.db
const DB_PATH = path.join(__dirname, '..', 'data', 'game.db');
let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  Logger.info('宗门数据库连接成功');
} catch (err) {
  Logger.error('数据库连接失败:', err.message);
  db = null;
}

// ============ 宗门模板 ============
const CLAN_TEMPLATES = [
  { id: 1, name: '青云宗', icon: '🏔️', desc: '正道之首，修仙界泰斗', memberCapacity: 50, level: 5 },
  { id: 2, name: '天剑宗', icon: '⚔️', desc: '以剑入道，剑意通天', memberCapacity: 40, level: 4 },
  { id: 3, name: '万法宗', icon: '📖', desc: '博采众长，精通万法', memberCapacity: 45, level: 4 },
  { id: 4, name: '百花宗', icon: '🌸', desc: '以医入道，济世救人', memberCapacity: 35, level: 3 },
  { id: 5, name: '御兽宗', icon: '🐉', desc: '驯养灵兽，人兽合一', memberCapacity: 40, level: 3 },
  { id: 6, name: '炼器宗', icon: '🔨', desc: '铸器宗师，神兵利器', memberCapacity: 30, level: 3 },
  { id: 7, name: '丹道宗', icon: '🧪', desc: '炼丹炼药，起死回生', memberCapacity: 35, level: 3 },
  { id: 8, name: '阵法宗', icon: '🔮', desc: '布阵设禁，困敌杀敌', memberCapacity: 25, level: 2 },
];

// ============ 数据库初始化 ============
function initClanTables() {
  if (!db) return;
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS clans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        icon TEXT DEFAULT '🏛️',
        description TEXT,
        leader_id INTEGER,
        leader_name TEXT,
        level INTEGER DEFAULT 1,
        member_count INTEGER DEFAULT 1,
        member_capacity INTEGER DEFAULT 50,
        experience INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now', '+8 hours'))
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS clan_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clan_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        role TEXT DEFAULT 'member',
        contribution INTEGER DEFAULT 0,
        joined_at TEXT DEFAULT (datetime('now', '+8 hours')),
        UNIQUE(clan_id, player_id)
      )
    `);

    // 初始化默认宗门
    for (const tpl of CLAN_TEMPLATES) {
      const existing = db.prepare('SELECT id FROM clans WHERE id = ?').get(tpl.id);
      if (!existing) {
        db.prepare(`
          INSERT OR IGNORE INTO clans (id, name, icon, description, leader_id, leader_name, level, member_count, member_capacity)
          VALUES (?, ?, ?, ?, 0, '系统', ?, 0, ?)
        `).run(tpl.id, tpl.name, tpl.icon, tpl.desc, tpl.level, tpl.memberCapacity);
      }
    }
    Logger.info('宗门表初始化完成');
  } catch (err) {
    Logger.error('初始化宗门表失败:', err.message);
  }
}

initClanTables();

// ============ 工具函数 ============
function getUserId(req) {
  return req.userId || parseInt(req.body.player_id) || parseInt(req.body.userId) || parseInt(req.query.player_id) || parseInt(req.query.userId) || 1;
}

function getPlayerName(userId) {
  if (!db) return `玩家${userId}`;
  try {
    const user = db.prepare('SELECT nickname FROM Users WHERE id = ?').get(userId);
    return user ? user.nickname : `玩家${userId}`;
  } catch {
    return `玩家${userId}`;
  }
}

// ============ 路由 ============

// GET /api/clan - 宗门列表
router.get('/', (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });
  try {
    const { page = 1, pageSize = 20, keyword, sort = 'level' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let sql = 'SELECT * FROM clans';
    let countSql = 'SELECT COUNT(*) as total FROM clans';
    const params = [];
    const countParams = [];

    if (keyword) {
      sql += ' WHERE name LIKE ?';
      countSql += ' WHERE name LIKE ?';
      params.push(`%${keyword}%`);
      countParams.push(`%${keyword}%`);
    }

    sql += ` ORDER BY ${sort === 'members' ? 'member_count' : 'level'} DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(pageSize), offset);

    const clans = db.prepare(sql).all(...params);
    const { total } = db.prepare(countSql).get(...countParams);

    res.json({
      success: true,
      data: {
        clans,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / parseInt(pageSize))
        }
      }
    });
  } catch (err) {
    Logger.error('获取宗门列表失败:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/clan/list - 宗门列表 (别名)
router.get('/list', (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });
  try {
    const { page = 1, pageSize = 20, keyword, sort = 'level' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let sql = 'SELECT * FROM clans';
    let countSql = 'SELECT COUNT(*) as total FROM clans';
    const params = [];
    const countParams = [];

    if (keyword) {
      sql += ' WHERE name LIKE ?';
      countSql += ' WHERE name LIKE ?';
      params.push(`%${keyword}%`);
      countParams.push(`%${keyword}%`);
    }

    sql += ` ORDER BY ${sort === 'members' ? 'member_count' : 'level'} DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(pageSize), offset);

    const clans = db.prepare(sql).all(...params);
    const { total } = db.prepare(countSql).get(...countParams);

    res.json({
      success: true,
      data: {
        clans,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / parseInt(pageSize))
        }
      }
    });
  } catch (err) {
    Logger.error('GET /list 获取宗门列表失败:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/clan/info - 玩家所在宗门信息
router.get('/info', (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });
  try {
    const userId = getUserId(req);

    // 先查玩家所在宗门
    const member = db.prepare('SELECT clan_id, role, contribution FROM clan_members WHERE player_id = ?').get(userId);
    if (!member) {
      return res.json({ success: true, data: { inClan: false, clan: null } });
    }

    const clan = db.prepare('SELECT * FROM clans WHERE id = ?').get(member.clan_id);
    if (!clan) {
      return res.json({ success: true, data: { inClan: false, clan: null } });
    }

    // 获取成员列表
    const members = db.prepare(`
      SELECT cm.player_id, cm.role, cm.contribution, cm.joined_at, u.nickname, u.level, u.realm
      FROM clan_members cm
      LEFT JOIN Users u ON u.id = cm.player_id
      WHERE cm.clan_id = ?
      ORDER BY cm.role DESC, cm.contribution DESC
    `).all(clan.id);

    res.json({
      success: true,
      data: {
        inClan: true,
        clan,
        memberRole: member.role,
        memberContribution: member.contribution,
        members: members.map(m => ({
          playerId: m.player_id,
          nickname: m.nickname || `玩家${m.player_id}`,
          level: m.level || 1,
          realm: m.realm || 1,
          role: m.role,
          contribution: m.contribution,
          joinedAt: m.joined_at
        })),
        memberCount: members.length
      }
    });
  } catch (err) {
    Logger.error('获取宗门信息失败:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/clan/create - 创建宗门
router.post('/create', (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });
  try {
    const userId = getUserId(req);
    const { name, icon = '🏛️', description = '' } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: '宗门名称至少2个字符' });
    }

    // 检查是否已有宗门
    const existingMember = db.prepare('SELECT clan_id FROM clan_members WHERE player_id = ?').get(userId);
    if (existingMember) {
      return res.status(400).json({ success: false, error: '已在宗门中，请先离开原宗门' });
    }

    // 检查宗门名是否重复
    const nameExists = db.prepare('SELECT id FROM clans WHERE name = ?').get(name.trim());
    if (nameExists) {
      return res.status(400).json({ success: false, error: '宗门名已被占用' });
    }

    const leaderName = getPlayerName(userId);

    // 创建宗门
    const result = db.prepare(`
      INSERT INTO clans (name, icon, description, leader_id, leader_name, level, member_count, member_capacity)
      VALUES (?, ?, ?, ?, ?, 1, 1, 50)
    `).run(name.trim(), icon, description, userId, leaderName);

    const clanId = result.lastInsertRowid;

    // 加入宗门
    db.prepare(`
      INSERT INTO clan_members (clan_id, player_id, role, contribution)
      VALUES (?, ?, 'leader', 0)
    `).run(clanId, userId);

    // 更新 Users 表的 sectId
    try {
      db.prepare('UPDATE Users SET sectId = ? WHERE id = ?').run(clanId, userId);
    } catch { /* ignore */ }

    const clan = db.prepare('SELECT * FROM clans WHERE id = ?').get(clanId);

    Logger.info(`宗门创建: ${name} by player ${userId}`);
    res.json({ success: true, data: { clan, message: '宗门创建成功' } });
  } catch (err) {
    Logger.error('创建宗门失败:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/clan/join - 加入宗门
router.post('/join', (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });
  try {
    const userId = getUserId(req);
    const { clanId } = req.body;

    if (!clanId) {
      return res.status(400).json({ success: false, error: '缺少宗门ID' });
    }

    // 检查是否已有宗门
    const existingMember = db.prepare('SELECT clan_id FROM clan_members WHERE player_id = ?').get(userId);
    if (existingMember) {
      return res.status(400).json({ success: false, error: '已在宗门中，请先离开原宗门' });
    }

    const clan = db.prepare('SELECT * FROM clans WHERE id = ?').get(clanId);
    if (!clan) {
      return res.status(404).json({ success: false, error: '宗门不存在' });
    }

    if (clan.member_count >= clan.member_capacity) {
      return res.status(400).json({ success: false, error: '宗门已满员' });
    }

    // 加入宗门
    db.prepare(`
      INSERT INTO clan_members (clan_id, player_id, role, contribution)
      VALUES (?, ?, 'member', 0)
    `).run(clanId, userId);

    // 更新宗门人数
    db.prepare('UPDATE clans SET member_count = member_count + 1 WHERE id = ?').run(clanId);

    // 更新 Users 表
    try {
      db.prepare('UPDATE Users SET sectId = ? WHERE id = ?').run(clanId, userId);
    } catch { /* ignore */ }

    Logger.info(`玩家 ${userId} 加入宗门 ${clanId}`);
    res.json({ success: true, data: { clan, message: '加入宗门成功' } });
  } catch (err) {
    Logger.error('加入宗门失败:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/clan/leave - 离开宗门
router.post('/leave', (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });
  try {
    const userId = getUserId(req);

    const member = db.prepare('SELECT clan_id, role FROM clan_members WHERE player_id = ?').get(userId);
    if (!member) {
      return res.status(400).json({ success: false, error: '未加入任何宗门' });
    }

    if (member.role === 'leader') {
      return res.status(400).json({ success: false, error: '宗主需转让宗门后才能离开' });
    }

    // 离开宗门
    db.prepare('DELETE FROM clan_members WHERE player_id = ?').run(userId);

    // 更新宗门人数
    db.prepare('UPDATE clans SET member_count = MAX(0, member_count - 1) WHERE id = ?').run(member.clan_id);

    // 更新 Users 表
    try {
      db.prepare('UPDATE Users SET sectId = NULL WHERE id = ?').run(userId);
    } catch { /* ignore */ }

    Logger.info(`玩家 ${userId} 离开宗门 ${member.clan_id}`);
    res.json({ success: true, message: '离开宗门成功' });
  } catch (err) {
    Logger.error('离开宗门失败:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/clan/:id - 宗门详情
router.get('/:id', (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });
  try {
    const clanId = parseInt(req.params.id);
    const userId = getUserId(req);

    const clan = db.prepare('SELECT * FROM clans WHERE id = ?').get(clanId);
    if (!clan) {
      return res.status(404).json({ success: false, error: '宗门不存在' });
    }

    const members = db.prepare(`
      SELECT cm.player_id, cm.role, cm.contribution, cm.joined_at, u.nickname, u.level, u.realm
      FROM clan_members cm
      LEFT JOIN Users u ON u.id = cm.player_id
      WHERE cm.clan_id = ?
      ORDER BY cm.role DESC, cm.contribution DESC
    `).all(clanId);

    const userMember = db.prepare('SELECT role FROM clan_members WHERE player_id = ? AND clan_id = ?').get(userId, clanId);

    res.json({
      success: true,
      data: {
        clan,
        members: members.map(m => ({
          playerId: m.player_id,
          nickname: m.nickname || `玩家${m.player_id}`,
          level: m.level || 1,
          realm: m.realm || 1,
          role: m.role,
          contribution: m.contribution,
          joinedAt: m.joined_at
        })),
        myRole: userMember ? userMember.role : null,
        memberCount: members.length
      }
    });
  } catch (err) {
    Logger.error('获取宗门详情失败:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
module.exports.__clans = CLAN_TEMPLATES;
