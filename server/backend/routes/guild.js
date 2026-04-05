/**
 * Guild 仙盟系统 API - SQLite 持久化版本
 * 仙盟创建/列表/加入/信息/技能
 */
const express = require('express');
const path = require('path');
const router = express.Router();

const Logger = {
  info: (...args) => console.log('[guild]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[guild:error]', new Date().toISOString(), ...args),
  warn: (...args) => console.warn('[guild:warn]', new Date().toISOString(), ...args)
};

// DB path: server/backend/data/game.db
const DB_PATH = path.join(__dirname, '..', 'data', 'game.db');
let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  Logger.info('仙盟数据库连接成功');
} catch (err) {
  Logger.error('数据库连接失败:', err.message);
  db = null;
}

// ============ 仙盟配置 ============
const guildConfig = {
  maxMembers: 50,
  maxNameLength: 10,
  createCost: 10000,
  levelExp: [0, 1000, 3000, 8000, 20000, 50000],
  skillLevels: {
    1: { name: '灵兽祝福', desc: '灵兽属性+5%', cost: 5000 },
    2: { name: '功法加成', desc: '功法效果+5%', cost: 8000 },
    3: { name: '修炼加速', desc: '修炼速度+10%', cost: 10000 },
    4: { name: '掉落提升', desc: '掉落率+5%', cost: 15000 },
    5: { name: '全员守护', desc: '全体防御+10%', cost: 20000 }
  }
};

// ============ 仙盟模板 ============
const GUILD_TEMPLATES = [
  { id: 1, name: '青云宗', icon: '🏔️', desc: '正道之首，修仙界泰斗', leaderId: 1, leaderName: '青云掌门', level: 5, memberCapacity: 50 },
  { id: 2, name: '天剑宗', icon: '⚔️', desc: '以剑入道，剑意通天', leaderId: 0, leaderName: '天剑真人', level: 4, memberCapacity: 40 },
  { id: 3, name: '万法宗', icon: '📖', desc: '博采众长，精通万法', leaderId: 0, leaderName: '万法仙尊', level: 4, memberCapacity: 45 },
  { id: 4, name: '百花宗', icon: '🌸', desc: '以医入道，济世救人', leaderId: 0, leaderName: '百花仙子', level: 3, memberCapacity: 35 },
  { id: 5, name: '御兽宗', icon: '🐉', desc: '驯养灵兽，人兽合一', leaderId: 0, leaderName: '御兽真人', level: 3, memberCapacity: 40 },
];

// ============ 数据库初始化 ============
function initGuildTables() {
  if (!db) return;
  try {
    // 检查 guilds 表是否存在
    const guildsExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='guilds'").get();
    if (!guildsExists) {
      db.exec(`
        CREATE TABLE guilds (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          icon TEXT DEFAULT '🏛️',
          description TEXT,
          leader_id INTEGER DEFAULT 0,
          leader_name TEXT DEFAULT '系统',
          level INTEGER DEFAULT 1,
          experience INTEGER DEFAULT 0,
          member_count INTEGER DEFAULT 0,
          member_capacity INTEGER DEFAULT 50,
          notice TEXT DEFAULT '欢迎加入本仙盟',
          created_at TEXT DEFAULT (datetime('now', '+8 hours'))
        )
      `);
    } else {
      // 迁移旧表：添加缺失的列
      try { db.exec("ALTER TABLE guilds ADD COLUMN icon TEXT DEFAULT '🏛️'"); } catch (e) {}
      try { db.exec("ALTER TABLE guilds ADD COLUMN description TEXT"); } catch (e) {}
      try { db.exec("ALTER TABLE guilds ADD COLUMN notice TEXT DEFAULT '欢迎加入本仙盟'"); } catch (e) {}
      try { db.exec("ALTER TABLE guilds ADD COLUMN created_at TEXT"); } catch (e) {}
      try { db.exec("ALTER TABLE guilds ADD COLUMN experience INTEGER DEFAULT 0"); } catch (e) {}
      try { db.exec("ALTER TABLE guilds ADD COLUMN member_count INTEGER DEFAULT 0"); } catch (e) {}
      try { db.exec("ALTER TABLE guilds ADD COLUMN member_capacity INTEGER DEFAULT 50"); } catch (e) {}
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS guild_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        player_name TEXT,
        role TEXT DEFAULT 'member' CHECK(role IN ('leader','elder','member')),
        contribution INTEGER DEFAULT 0,
        joined_at TEXT DEFAULT (datetime('now', '+8 hours')),
        UNIQUE(guild_id, player_id)
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS guild_skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id INTEGER NOT NULL,
        skill_id INTEGER NOT NULL,
        level INTEGER DEFAULT 0,
        upgraded_at TEXT DEFAULT (datetime('now', '+8 hours')),
        UNIQUE(guild_id, skill_id)
      )
    `);

    // 初始化默认仙盟
    for (const tpl of GUILD_TEMPLATES) {
      const existing = db.prepare('SELECT id FROM guilds WHERE id = ?').get(tpl.id);
      if (!existing) {
        db.prepare(`
          INSERT INTO guilds (id, name, icon, description, leader_id, leader_name, level, member_count, member_capacity)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
        `).run(tpl.id, tpl.name, tpl.icon, tpl.desc || '', tpl.leaderId, tpl.leaderName, tpl.level, tpl.memberCapacity);

        if (tpl.leaderId > 0) {
          db.prepare(`
            INSERT OR IGNORE INTO guild_members (guild_id, player_id, player_name, role, contribution)
            VALUES (?, ?, ?, 'leader', 0)
          `).run(tpl.id, tpl.leaderId, tpl.leaderName);
          db.prepare('UPDATE guilds SET member_count = 1 WHERE id = ?').run(tpl.id);
        }

        for (let s = 1; s <= 5; s++) {
          db.prepare(`
            INSERT OR IGNORE INTO guild_skills (guild_id, skill_id, level)
            VALUES (?, ?, 0)
          `).run(tpl.id, s);
        }
      }
    }
    Logger.info('仙盟表初始化完成');
  } catch (err) {
    Logger.error('初始化失败:', err.message);
  }
}

// 启动时初始化
if (db) {
  initGuildTables();
}

// ============ 辅助函数 ============
function getGuildWithMembers(guildId) {
  if (!db) return null;
  const guild = db.prepare('SELECT * FROM guilds WHERE id = ?').get(guildId);
  if (!guild) return null;
  const members = db.prepare(
    'SELECT player_id, player_name, role, contribution, joined_at FROM guild_members WHERE guild_id = ? ORDER BY role DESC, contribution DESC'
  ).all(guildId);
  const skills = db.prepare('SELECT skill_id, level FROM guild_skills WHERE guild_id = ?').all(guildId);
  const skillMap = {};
  for (const s of skills) { skillMap[s.skill_id] = s.level; }
  return { ...guild, members, skills: skillMap };
}

function getPlayerGuild(playerId) {
  if (!db) return null;
  const member = db.prepare('SELECT * FROM guild_members WHERE player_id = ?').get(playerId);
  if (!member) return null;
  return getGuildWithMembers(member.guild_id);
}

// ============ 路由 ============

// GET /api/guild — 根路由
router.get('/', (req, res) => {
  res.json({ success: true, message: '仙盟系统 API', guilds: '使用 /list' });
});

// 获取仙盟列表
router.get('/list', (req, res) => {
  if (!db) return res.json({ success: false, message: '数据库未连接' });
  const { page, limit, keyword } = req.query;
  let query = 'SELECT id, name, icon, description, leader_id, leader_name, level, member_count, member_capacity FROM guilds';
  const params = [];
  if (keyword) {
    query += ' WHERE name LIKE ?';
    params.push(`%${keyword}%`);
  }
  query += ' ORDER BY level DESC, experience DESC';

  const pageNum = parseInt(page) || 1;
  const pageSize = parseInt(limit) || 20;
  const offset = (pageNum - 1) * pageSize;

  const countQuery = keyword
    ? 'SELECT COUNT(*) as total FROM guilds WHERE name LIKE ?'
    : 'SELECT COUNT(*) as total FROM guilds';
  const total = db.prepare(countQuery).get(...(keyword ? [`%${keyword}%`] : [])).total;

  const list = db.prepare(`${query} LIMIT ? OFFSET ?`).all(...params, pageSize, offset);
  res.json({ success: true, list, total, page: pageNum, pageSize });
});

// 获取仙盟详情
router.get('/:id', (req, res) => {
  if (!db) return res.json({ success: false, message: '数据库未连接' });
  const guildId = parseInt(req.params.id);
  const guild = getGuildWithMembers(guildId);
  if (!guild) return res.json({ success: false, message: '仙盟不存在' });
  res.json({ success: true, guild });
});

// 玩家所属仙盟
router.get('/player/:userId', (req, res) => {
  if (!db) return res.json({ success: false, message: '数据库未连接' });
  const userId = parseInt(req.params.userId);
  const guild = getPlayerGuild(userId);
  if (!guild) return res.json({ success: false, guild: null });
  const member = db.prepare('SELECT * FROM guild_members WHERE player_id = ?').get(userId);
  res.json({ success: true, guild: { ...guild, myRole: member?.role, joinTime: member?.joined_at } });
});

// 创建仙盟
router.post('/create', (req, res) => {
  if (!db) return res.json({ success: false, message: '数据库未连接' });
  const { userId, name, leaderName } = req.body;

  if (!name || name.length < 2 || name.length > guildConfig.maxNameLength) {
    return res.json({ success: false, message: '仙盟名称长度需2-10字' });
  }

  // 检查是否已有仙盟
  const existing = db.prepare('SELECT guild_id FROM guild_members WHERE player_id = ?').get(userId);
  if (existing) {
    return res.json({ success: false, message: '已有仙盟' });
  }

  // 检查名称是否重复
  const nameExists = db.prepare('SELECT id FROM guilds WHERE name = ?').get(name);
  if (nameExists) {
    return res.json({ success: false, message: '仙盟名称已存在' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO guilds (name, leader_id, leader_name, level, experience, member_count, member_capacity, notice)
      VALUES (?, ?, ?, 1, 0, 1, ?, '欢迎加入')
    `).run(name, userId, leaderName || `玩家${userId}`, guildConfig.maxMembers);

    const guildId = result.lastInsertRowid;

    // 创建者加入
    db.prepare(`
      INSERT INTO guild_members (guild_id, player_id, player_name, role, contribution)
      VALUES (?, ?, ?, 'leader', 0)
    `).run(guildId, userId, leaderName || `玩家${userId}`);

    // 初始化5个技能
    for (let s = 1; s <= 5; s++) {
      db.prepare('INSERT INTO guild_skills (guild_id, skill_id, level) VALUES (?, ?, 0)').run(guildId, s);
    }

    const guild = getGuildWithMembers(guildId);
    Logger.info(`仙盟创建成功: ${name} (ID:${guildId}) by player ${userId}`);
    res.json({ success: true, guild, message: '仙盟创建成功' });
  } catch (err) {
    Logger.error('创建仙盟失败:', err.message);
    res.json({ success: false, message: '创建失败: ' + err.message });
  }
});

// 加入仙盟
router.post('/join', (req, res) => {
  if (!db) return res.json({ success: false, message: '数据库未连接' });
  const { userId, userName, guildId } = req.body;

  const guild = db.prepare('SELECT * FROM guilds WHERE id = ?').get(guildId);
  if (!guild) return res.json({ success: false, message: '仙盟不存在' });

  if (guild.member_count >= guild.member_capacity) {
    return res.json({ success: false, message: '仙盟已满' });
  }

  // 检查是否已有仙盟
  const existing = db.prepare('SELECT guild_id FROM guild_members WHERE player_id = ?').get(userId);
  if (existing) {
    return res.json({ success: false, message: '已有仙盟' });
  }

  try {
    db.prepare(`
      INSERT INTO guild_members (guild_id, player_id, player_name, role, contribution)
      VALUES (?, ?, ?, 'member', 0)
    `).run(guildId, userId, userName || `玩家${userId}`);

    db.prepare('UPDATE guilds SET member_count = member_count + 1 WHERE id = ?').run(guildId);

    Logger.info(`玩家 ${userId} 加入仙盟 ${guildId}`);
    res.json({ success: true, message: '加入成功' });
  } catch (err) {
    Logger.error('加入仙盟失败:', err.message);
    res.json({ success: false, message: '加入失败: ' + err.message });
  }
});

// 退出仙盟
router.post('/leave', (req, res) => {
  if (!db) return res.json({ success: false, message: '数据库未连接' });
  const { userId, guildId } = req.body;

  const guild = db.prepare('SELECT * FROM guilds WHERE id = ?').get(guildId);
  if (!guild) return res.json({ success: false, message: '仙盟不存在' });

  const member = db.prepare('SELECT * FROM guild_members WHERE guild_id = ? AND player_id = ?').get(guildId, userId);
  if (!member) return res.json({ success: false, message: '不在该仙盟' });

  if (member.role === 'leader') {
    return res.json({ success: false, message: '盟主无法退出，请先转让' });
  }

  try {
    db.prepare('DELETE FROM guild_members WHERE guild_id = ? AND player_id = ?').run(guildId, userId);
    db.prepare('UPDATE guilds SET member_count = MAX(0, member_count - 1) WHERE id = ?').run(guildId);
    Logger.info(`玩家 ${userId} 退出仙盟 ${guildId}`);
    res.json({ success: true, message: '已退出仙盟' });
  } catch (err) {
    Logger.error('退出失败:', err.message);
    res.json({ success: false, message: '退出失败' });
  }
});

// 修改公告
router.post('/notice', (req, res) => {
  if (!db) return res.json({ success: false, message: '数据库未连接' });
  const { userId, guildId, notice } = req.body;

  const guild = db.prepare('SELECT * FROM guilds WHERE id = ?').get(guildId);
  if (!guild) return res.json({ success: false, message: '仙盟不存在' });

  const member = db.prepare('SELECT role FROM guild_members WHERE guild_id = ? AND player_id = ?').get(guildId, userId);
  if (!member || member.role === 'member') {
    return res.json({ success: false, message: '权限不足' });
  }

  try {
    db.prepare('UPDATE guilds SET notice = ? WHERE id = ?').run(notice || '', guildId);
    res.json({ success: true, message: '公告已更新' });
  } catch (err) {
    res.json({ success: false, message: '更新失败' });
  }
});

// 升级仙盟技能
router.post('/skill/upgrade', (req, res) => {
  if (!db) return res.json({ success: false, message: '数据库未连接' });
  const { userId, guildId, skillId } = req.body;

  const guild = db.prepare('SELECT * FROM guilds WHERE id = ?').get(guildId);
  if (!guild) return res.json({ success: false, message: '仙盟不存在' });

  const member = db.prepare('SELECT role FROM guild_members WHERE guild_id = ? AND player_id = ?').get(guildId, userId);
  if (!member || member.role === 'member') {
    return res.json({ success: false, message: '权限不足' });
  }

  const skillConfig = guildConfig.skillLevels[skillId];
  if (!skillConfig) return res.json({ success: false, message: '技能不存在' });

  const current = db.prepare('SELECT level FROM guild_skills WHERE guild_id = ? AND skill_id = ?').get(guildId, skillId);
  const currentLevel = current?.level || 0;
  if (currentLevel >= 5) return res.json({ success: false, message: '技能已满级' });

  try {
    db.prepare(`
      INSERT INTO guild_skills (guild_id, skill_id, level, upgraded_at)
      VALUES (?, ?, 1, datetime('now', '+8 hours'))
      ON CONFLICT(guild_id, skill_id) DO UPDATE SET level = level + 1, upgraded_at = datetime('now', '+8 hours')
    `).run(guildId, skillId);

    const newLevel = currentLevel + 1;
    res.json({
      success: true,
      skill: skillId,
      level: newLevel,
      message: `${skillConfig.name}升级到${newLevel}级`
    });
  } catch (err) {
    Logger.error('升级技能失败:', err.message);
    res.json({ success: false, message: '升级失败' });
  }
});

// 获取仙盟技能
router.get('/skill/:guildId', (req, res) => {
  if (!db) return res.json({ success: false, message: '数据库未连接' });
  const guildId = parseInt(req.params.guildId);

  const guild = db.prepare('SELECT id FROM guilds WHERE id = ?').get(guildId);
  if (!guild) return res.json({ success: false, message: '仙盟不存在' });

  const skills = db.prepare('SELECT skill_id, level FROM guild_skills WHERE guild_id = ?').all(guildId);
  const result = skills.map(s => ({
    id: s.skill_id,
    ...guildConfig.skillLevels[s.skill_id],
    level: s.level
  }));

  res.json({ success: true, skills: result });
});

// 转让盟主
router.post('/transfer', (req, res) => {
  if (!db) return res.json({ success: false, message: '数据库未连接' });
  const { userId, guildId, targetPlayerId } = req.body;

  const member = db.prepare('SELECT role FROM guild_members WHERE guild_id = ? AND player_id = ?').get(guildId, userId);
  if (!member || member.role !== 'leader') {
    return res.json({ success: false, message: '只有盟主可转让' });
  }

  const target = db.prepare('SELECT * FROM guild_members WHERE guild_id = ? AND player_id = ?').get(guildId, targetPlayerId);
  if (!target) return res.json({ success: false, message: '目标成员不存在' });

  try {
    db.prepare('UPDATE guild_members SET role = ? WHERE guild_id = ? AND player_id = ?').run('member', guildId, userId);
    db.prepare('UPDATE guild_members SET role = ? WHERE guild_id = ? AND player_id = ?').run('leader', guildId, targetPlayerId);
    const targetName = target.player_name || `玩家${targetPlayerId}`;
    db.prepare('UPDATE guilds SET leader_id = ?, leader_name = ? WHERE id = ?').run(targetPlayerId, targetName, guildId);
    res.json({ success: true, message: '盟主已转让' });
  } catch (err) {
    res.json({ success: false, message: '转让失败' });
  }
});

// 任命长老
router.post('/set-role', (req, res) => {
  if (!db) return res.json({ success: false, message: '数据库未连接' });
  const { userId, guildId, targetPlayerId, role } = req.body;

  const member = db.prepare('SELECT role FROM guild_members WHERE guild_id = ? AND player_id = ?').get(guildId, userId);
  if (!member || member.role === 'member') {
    return res.json({ success: false, message: '权限不足' });
  }

  if (!['elder', 'member'].includes(role)) {
    return res.json({ success: false, message: '无效角色' });
  }

  try {
    db.prepare('UPDATE guild_members SET role = ? WHERE guild_id = ? AND player_id = ?').run(role, guildId, targetPlayerId);
    res.json({ success: true, message: `已任命为${role === 'elder' ? '长老' : '成员'}` });
  } catch (err) {
    res.json({ success: false, message: '设置失败' });
  }
});

// 踢出成员
router.post('/kick', (req, res) => {
  if (!db) return res.json({ success: false, message: '数据库未连接' });
  const { userId, guildId, targetPlayerId } = req.body;

  const member = db.prepare('SELECT role FROM guild_members WHERE guild_id = ? AND player_id = ?').get(guildId, userId);
  if (!member || member.role === 'member') {
    return res.json({ success: false, message: '权限不足' });
  }

  if (targetPlayerId === userId) {
    return res.json({ success: false, message: '无法踢出自己' });
  }

  try {
    db.prepare('DELETE FROM guild_members WHERE guild_id = ? AND player_id = ?').run(guildId, targetPlayerId);
    db.prepare('UPDATE guilds SET member_count = MAX(0, member_count - 1) WHERE id = ?').run(guildId);
    res.json({ success: true, message: '已踢出成员' });
  } catch (err) {
    res.json({ success: false, message: '操作失败' });
  }
});

// 获取成员列表
router.get('/members/:guildId', (req, res) => {
  if (!db) return res.json({ success: false, message: '数据库未连接' });
  const guildId = parseInt(req.params.guildId);
  const members = db.prepare(
    'SELECT player_id as id, player_name as name, role, contribution, joined_at as joinTime FROM guild_members WHERE guild_id = ? ORDER BY role DESC, contribution DESC'
  ).all(guildId);

  // 计算个人排名
  const sorted = [...members].sort((a, b) => b.contribution - a.contribution);
  const ranked = sorted.map((m, idx) => ({ ...m, rank: idx + 1 }));

  // 补充贡献度百分比 (相对于排名第一)
  const topContrib = ranked.length > 0 ? ranked[0].contribution : 1;
  const enriched = ranked.map(m => ({
    ...m,
    contributionPercent: topContrib > 0 ? Math.round((m.contribution / topContrib) * 100) : 0
  }));

  res.json({ success: true, members: enriched });
});

// 获取仙盟日志
router.get('/logs/:guildId', (req, res) => {
  if (!db) return res.json({ success: false, message: '数据库未连接' });
  const guildId = parseInt(req.params.guildId);
  const logs = db.prepare(
    'SELECT id, player_id, player_name, action, detail, created_at as time FROM guild_logs WHERE guild_id = ? ORDER BY id DESC LIMIT 50'
  ).all(guildId);
  res.json({ success: true, logs });
});

// 获取玩家仙盟信息（含 hasGuild 标志）
router.get('/info', (req, res) => {
  if (!db) return res.json({ success: false, message: '数据库未连接' });
  const userId = parseInt(req.query.userId) || parseInt(req.body?.userId);
  if (!userId) return res.json({ success: false, message: '缺少 userId' });

  const member = db.prepare('SELECT * FROM guild_members WHERE player_id = ?').get(userId);
  if (!member) return res.json({ success: false, hasGuild: false, guild: null });

  const guild = db.prepare('SELECT * FROM guilds WHERE id = ?').get(member.guild_id);
  if (!guild) return res.json({ success: false, hasGuild: false, guild: null });

  // 获取建筑信息
  const buildings = db.prepare('SELECT building_key, level FROM guild_buildings WHERE guild_id = ?').all(guild.id);
  const buildingMap = {};
  for (const b of buildings) { buildingMap[b.building_key] = b.level; }

  // 获取我的贡献信息
  const myContrib = member.contribution || 0;
  const totalContrib = db.prepare('SELECT SUM(contribution) as total FROM guild_members WHERE guild_id = ?').get(guild.id);
  const guildRank = db.prepare('SELECT COUNT(*) as rank FROM guild_members WHERE guild_id = ? AND contribution > ?').get(guild.id, myContrib);

  res.json({
    success: true,
    hasGuild: true,
    guild: {
      id: guild.id,
      name: guild.name,
      level: guild.level,
      exp: guild.experience || guild.exp,
      notice: guild.notice,
      icon: guild.icon || '🏛️',
      resources: { gold: guild.fund || 0, contribution: myContrib },
      memberCount: guild.member_count,
      maxMembers: guild.member_capacity,
      myRole: member.role,
      myContribution: myContrib,
      myRank: (guildRank?.rank || 0) + 1,
      totalMembers: guild.member_count,
      buildings: buildingMap
    }
  });
});

// 捐献灵石/资源
router.post('/contribute', (req, res) => {
  if (!db) return res.json({ success: false, message: '数据库未连接' });
  const { userId, userName, guildId, amount, type } = req.body;

  if (!userId || !guildId || !amount) {
    return res.json({ success: false, message: '参数不完整' });
  }
  if (amount <= 0) return res.json({ success: false, message: '捐献数量必须大于0' });

  const guild = db.prepare('SELECT * FROM guilds WHERE id = ?').get(guildId);
  if (!guild) return res.json({ success: false, message: '仙盟不存在' });

  const member = db.prepare('SELECT * FROM guild_members WHERE guild_id = ? AND player_id = ?').get(guildId, userId);
  if (!member) return res.json({ success: false, message: '您不是该仙盟成员' });

  try {
    // 更新成员贡献
    db.prepare('UPDATE guild_members SET contribution = contribution + ?, daily_contribution = daily_contribution + ? WHERE guild_id = ? AND player_id = ?')
      .run(amount, amount, guildId, userId);

    // 更新仙盟资金/经验
    if (type === 'gold') {
      db.prepare('UPDATE guilds SET fund = fund + ? WHERE id = ?').run(amount, guildId);
    } else {
      db.prepare('UPDATE guilds SET experience = experience + ? WHERE id = ?').run(amount, guildId);
    }

    // 记录日志
    db.prepare(`
      INSERT INTO guild_logs (guild_id, player_id, player_name, action, detail)
      VALUES (?, ?, ?, 'contribute', ?)
    `).run(guildId, userId, userName || `玩家${userId}`, `捐献 ${amount} ${type === 'gold' ? '灵石' : '经验'}`);

    // 检查是否升级
    const updatedGuild = db.prepare('SELECT * FROM guilds WHERE id = ?').get(guildId);
    const expNeeded = guildConfig.levelExp[updatedGuild.level] || 9999999;
    let leveledUp = false;
    if (updatedGuild.level < 10 && updatedGuild.experience >= expNeeded) {
      db.prepare('UPDATE guilds SET level = level + 1 WHERE id = ?').run(guildId);
      leveledUp = true;
    }

    // 获取更新后的贡献
    const updatedMember = db.prepare('SELECT contribution FROM guild_members WHERE guild_id = ? AND player_id = ?').get(guildId, userId);

    res.json({
      success: true,
      message: leveledUp ? `捐献成功！仙盟升级了！` : '捐献成功',
      contribution: updatedMember?.contribution || 0,
      guildExp: updatedGuild.experience,
      guildLevel: updatedGuild.level,
      leveledUp
    });
  } catch (err) {
    Logger.error('捐献失败:', err.message);
    res.json({ success: false, message: '捐献失败: ' + err.message });
  }
});

// 升级建筑
router.post('/building/upgrade', (req, res) => {
  if (!db) return res.json({ success: false, message: '数据库未连接' });
  const { userId, guildId, buildingKey } = req.body;

  if (!userId || !guildId || !buildingKey) {
    return res.json({ success: false, message: '参数不完整' });
  }

  const guild = db.prepare('SELECT * FROM guilds WHERE id = ?').get(guildId);
  if (!guild) return res.json({ success: false, message: '仙盟不存在' });

  const member = db.prepare('SELECT role, contribution FROM guild_members WHERE guild_id = ? AND player_id = ?').get(guildId, userId);
  if (!member) return res.json({ success: false, message: '您不是该仙盟成员' });
  if (member.role === 'member') return res.json({ success: false, message: '权限不足' });

  const buildingConfigs = {
    hall: { name: '议事大厅', maxLevel: 10, cost: { gold: 50000, contrib: 1000 } },
    depot: { name: '资源仓库', maxLevel: 10, cost: { gold: 30000, contrib: 600 } },
    training: { name: '修炼室', maxLevel: 10, cost: { gold: 20000, contrib: 400 } },
    shop: { name: '仙盟商店', maxLevel: 10, cost: { gold: 25000, contrib: 500 } }
  };

  const config = buildingConfigs[buildingKey];
  if (!config) return res.json({ success: false, message: '建筑不存在' });

  const current = db.prepare('SELECT level FROM guild_buildings WHERE guild_id = ? AND building_key = ?').get(guildId, buildingKey);
  const currentLevel = current?.level || 0;
  if (currentLevel >= config.maxLevel) return res.json({ success: false, message: '建筑已满级' });

  if (guild.fund < config.cost.gold) return res.json({ success: false, message: '仙盟资金不足' });
  if (member.contribution < config.cost.contrib) return res.json({ success: false, message: '个人贡献不足' });

  try {
    db.prepare(`
      INSERT INTO guild_buildings (guild_id, building_key, level)
      VALUES (?, ?, 1)
      ON CONFLICT(guild_id, building_key) DO UPDATE SET level = level + 1
    `).run(guildId, buildingKey);

    db.prepare('UPDATE guilds SET fund = fund - ? WHERE id = ?').run(config.cost.gold, guildId);
    db.prepare('UPDATE guild_members SET contribution = contribution - ? WHERE guild_id = ? AND player_id = ?')
      .run(config.cost.contrib, guildId, userId);

    db.prepare(`
      INSERT INTO guild_logs (guild_id, player_id, player_name, action, detail)
      VALUES (?, ?, ?, 'building_upgrade', ?)
    `).run(guildId, userId, member.player_name || `玩家${userId}`, `升级${config.name}到${currentLevel + 1}级`);

    const newLevel = currentLevel + 1;
    res.json({ success: true, building: buildingKey, level: newLevel, message: `${config.name}升级成功！` });
  } catch (err) {
    Logger.error('升级建筑失败:', err.message);
    res.json({ success: false, message: '升级失败' });
  }
});

// 成员职位变更 (支持 /member/position 和 /set-role)
router.post('/member/position', (req, res) => {
  const { userId, guildId, targetPlayerId, role } = req.body;
  if (!userId || !guildId || !targetPlayerId || !role) {
    return res.json({ success: false, message: '参数不完整' });
  }
  if (!['elder', 'core', 'normal', 'member'].includes(role)) {
    return res.json({ success: false, message: '无效角色' });
  }

  const member = db.prepare('SELECT role FROM guild_members WHERE guild_id = ? AND player_id = ?').get(guildId, userId);
  if (!member || member.role === 'member') return res.json({ success: false, message: '权限不足' });

  try {
    db.prepare('UPDATE guild_members SET role = ? WHERE guild_id = ? AND player_id = ?').run(role, guildId, targetPlayerId);
    db.prepare(`
      INSERT INTO guild_logs (guild_id, player_id, player_name, action, detail)
      VALUES (?, ?, ?, 'set_role', ?)
    `).run(guildId, userId, member.player_name || `玩家${userId}`, `设置玩家${targetPlayerId}为${role}`);

    res.json({ success: true, message: `已任命为${role === 'elder' ? '长老' : role === 'core' ? '核心弟子' : '普通弟子'}` });
  } catch (err) {
    res.json({ success: false, message: '设置失败' });
  }
});

// 活动列表
router.get('/activity/list', (req, res) => {
  if (!db) return res.json({ success: false, message: '数据库未连接' });
  const { guildId } = req.query;
  if (!guildId) return res.json({ success: false, message: '缺少 guildId' });

  // 模拟活动数据 (可扩展为数据库存储)
  const activities = [
    { id: 1, name: '仙盟战', icon: '⚔️', reward: '大量贡献+灵石', status: 'available', nextTime: Date.now() + 3600000 },
    { id: 2, name: '副本挑战', icon: '🗝️', reward: '稀有装备', status: 'available', nextTime: Date.now() + 7200000 },
    { id: 3, name: '资源采集', icon: '⛏️', reward: '灵石+贡献', status: 'available', nextTime: Date.now() + 10800000 }
  ];
  res.json({ success: true, activities });
});

// 参加活动
router.post('/activity/join', (req, res) => {
  if (!db) return res.json({ success: false, message: '数据库未连接' });
  const { userId, guildId, activityId } = req.body;
  if (!userId || !guildId || !activityId) return res.json({ success: false, message: '参数不完整' });

  const member = db.prepare('SELECT * FROM guild_members WHERE guild_id = ? AND player_id = ?').get(guildId, userId);
  if (!member) return res.json({ success: false, message: '您不是该仙盟成员' });

  try {
    db.prepare(`
      INSERT INTO guild_logs (guild_id, player_id, player_name, action, detail)
      VALUES (?, ?, ?, 'activity_join', ?)
    `).run(guildId, userId, member.player_name || `玩家${userId}`, `参加了活动 ID:${activityId}`);

    res.json({ success: true, message: '参加成功！' });
  } catch (err) {
    res.json({ success: false, message: '参加失败' });
  }
});

// 仓库申请 (占位，后续可接入物品系统)
router.post('/warehouse/request', (req, res) => {
  if (!db) return res.json({ success: false, message: '数据库未连接' });
  const { userId, guildId, itemId } = req.body;
  if (!userId || !guildId) return res.json({ success: false, message: '参数不完整' });

  const member = db.prepare('SELECT * FROM guild_members WHERE guild_id = ? AND player_id = ?').get(guildId, userId);
  if (!member) return res.json({ success: false, message: '您不是该仙盟成员' });

  res.json({ success: true, message: '已提交申请，等待审批' });
});

// setDb 注入（兼容主 server.js 模式）
router.setDb = function (database) {
  db = database;
  if (db) {
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
    initGuildTables();
  }
};

module.exports = router;
