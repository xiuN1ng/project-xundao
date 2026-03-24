/**
 * 仙盟系统数据层 (guild_storage.js)
 * 数据库持久化 + 仙盟业务逻辑
 */

const Database = require('better-sqlite3');
const path = require('path');

// 延迟初始化
let db = null;

function getDb() {
  if (!db) {
    const dbPath = path.join(__dirname, '..', 'data', 'game.db');
    db = new Database(dbPath);
  }
  return db;
}

// ============================================================
// 仙盟配置
// ============================================================
const GUILD_CONFIG = {
  maxMembers: 50,
  maxNameLength: 10,
  createCost: 10000,
  levelExp: [0, 1000, 3000, 8000, 20000, 50000, 100000, 200000, 500000],
  levelMemberCap: [0, 20, 30, 40, 50, 60, 80, 100, 150],
};

// 仙盟建筑配置
const GUILD_BUILDINGS = {
  guild_hall: {
    name: '议事堂',
    icon: '🏛️',
    maxLevel: 10,
    costFactor: 1.5,
    effect: { type: 'member_cap', value: 5 },
    desc: '提升仙盟成员上限',
  },
  meditation_hall: {
    name: '修炼殿',
    icon: '📖',
    maxLevel: 10,
    costFactor: 1.6,
    effect: { type: 'cultivation_speed', value: 0.05 },
    desc: '提升仙盟成员修炼效率',
  },
  treasure_pavilion: {
    name: '藏宝阁',
    icon: '💎',
    maxLevel: 10,
    costFactor: 1.8,
    effect: { type: 'drop_rate', value: 0.05 },
    desc: '提升仙盟成员物品掉落率',
  },
  arena: {
    name: '演武场',
    icon: '⚔️',
    maxLevel: 10,
    costFactor: 1.7,
    effect: { type: 'pvp_bonus', value: 0.05 },
    desc: '提升仙盟成员PVP属性',
  },
  warehouse: {
    name: '宗门仓库',
    icon: '📦',
    maxLevel: 10,
    costFactor: 1.5,
    effect: { type: 'tax_reduction', value: 0.02 },
    desc: '降低仙盟成员交易税率',
  },
  alchemy_lab: {
    name: '炼丹室',
    icon: '⚗️',
    maxLevel: 10,
    costFactor: 2.0,
    effect: { type: 'alchemy_speed', value: 0.1 },
    desc: '提升仙盟炼丹效率',
  },
};

// 仙盟技能配置
const GUILD_SKILLS = {
  1: { name: '灵兽祝福', desc: '灵兽属性+5%/级', icon: '🐉', cost: 5000, reqGuildLevel: 1, effect: { type: 'pet_bonus', value: 0.05 } },
  2: { name: '功法加成', desc: '功法效果+5%/级', icon: '📚', cost: 8000, reqGuildLevel: 2, effect: { type: 'skill_bonus', value: 0.05 } },
  3: { name: '修炼加速', desc: '修炼速度+10%/级', icon: '🌀', cost: 10000, reqGuildLevel: 3, effect: { type: 'cult_speed', value: 0.1 } },
  4: { name: '掉落提升', desc: '掉落率+5%/级', icon: '💰', cost: 15000, reqGuildLevel: 3, effect: { type: 'drop_bonus', value: 0.05 } },
  5: { name: '全员守护', desc: '全体防御+10%/级', icon: '🛡️', cost: 20000, reqGuildLevel: 5, effect: { type: 'defense_bonus', value: 0.1 } },
  6: { name: '攻击祝福', desc: '全体攻击+10%/级', icon: '⚔️', cost: 20000, reqGuildLevel: 5, effect: { type: 'attack_bonus', value: 0.1 } },
  7: { name: '气血护盾', desc: '全体生命+10%/级', icon: '❤️', cost: 25000, reqGuildLevel: 7, effect: { type: 'hp_bonus', value: 0.1 } },
  8: { name: '仙盟秘境', desc: '解锁仙盟副本', icon: '🏔️', cost: 50000, reqGuildLevel: 8, effect: { type: 'unlock_dungeon', value: 1 } },
};

// ============================================================
// 数据库操作
// ============================================================

function initGuildTables() {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS guilds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      leader_id INTEGER NOT NULL,
      leader_name TEXT,
      level INTEGER DEFAULT 1,
      exp INTEGER DEFAULT 0,
      notice TEXT DEFAULT '欢迎加入本仙盟！',
      fund INTEGER DEFAULT 0,
      max_members INTEGER DEFAULT 20,
      realm_level_req INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS guild_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      player_name TEXT,
      role TEXT DEFAULT 'member',
      contribution INTEGER DEFAULT 0,
      daily_contribution INTEGER DEFAULT 0,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(guild_id, player_id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS guild_buildings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id INTEGER NOT NULL,
      building_key TEXT NOT NULL,
      level INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(guild_id, building_key)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS guild_skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id INTEGER NOT NULL,
      skill_id INTEGER NOT NULL,
      level INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(guild_id, skill_id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS guild_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id INTEGER NOT NULL,
      player_id INTEGER,
      player_name TEXT,
      action TEXT NOT NULL,
      detail TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS guild_contribution_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      contribution INTEGER DEFAULT 0,
      UNIQUE(guild_id, player_id, date)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS guild_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      player_name TEXT,
      message TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(guild_id, player_id)
    )
  `);
}

// ============================================================
// 仙盟 CRUD
// ============================================================

function createGuild({ name, leaderId, leaderName, realmLevel = 0 }) {
  const database = getDb();

  const existing = database.prepare('SELECT id FROM guilds WHERE name = ?').get(name);
  if (existing) return { success: false, message: '仙盟名称已存在' };

  const inGuild = database.prepare('SELECT guild_id FROM guild_members WHERE player_id = ?').get(leaderId);
  if (inGuild) return { success: false, message: '您已在仙盟中' };

  const maxMembers = GUILD_CONFIG.levelMemberCap[1] || 20;

  const result = database.prepare(
    'INSERT INTO guilds (name, leader_id, leader_name, max_members, realm_level_req) VALUES (?, ?, ?, ?, ?)'
  ).run(name, leaderId, leaderName, maxMembers, realmLevel);

  const guildId = result.lastInsertRowid;

  database.prepare(
    'INSERT INTO guild_members (guild_id, player_id, player_name, role) VALUES (?, ?, ?, ?)'
  ).run(guildId, leaderId, leaderName, 'leader');

  for (const key of Object.keys(GUILD_BUILDINGS)) {
    database.prepare(
      'INSERT INTO guild_buildings (guild_id, building_key, level) VALUES (?, ?, ?)'
    ).run(guildId, key, 0);
  }

  for (const skillId of Object.keys(GUILD_SKILLS)) {
    database.prepare(
      'INSERT INTO guild_skills (guild_id, skill_id, level) VALUES (?, ?, ?)'
    ).run(guildId, parseInt(skillId), 0);
  }

  addGuildLog(guildId, leaderId, leaderName, 'create', `创建了仙盟 ${name}`);

  return { success: true, guildId, message: '仙盟创建成功' };
}

function getGuild(guildId) {
  const database = getDb();
  const guild = database.prepare('SELECT * FROM guilds WHERE id = ?').get(guildId);
  if (!guild) return null;

  const members = database.prepare(
    'SELECT player_id, player_name, role, contribution, daily_contribution, joined_at FROM guild_members WHERE guild_id = ? ORDER BY role DESC, contribution DESC'
  ).all(guildId);

  const buildings = database.prepare(
    'SELECT building_key, level FROM guild_buildings WHERE guild_id = ?'
  ).all(guildId);

  const skills = database.prepare(
    'SELECT skill_id, level FROM guild_skills WHERE guild_id = ?'
  ).all(guildId);

  const logs = database.prepare(
    'SELECT * FROM guild_logs WHERE guild_id = ? ORDER BY created_at DESC LIMIT 20'
  ).all(guildId);

  return {
    ...guild,
    members,
    buildings: buildings.reduce((acc, b) => { acc[b.building_key] = b.level; return acc; }, {}),
    skills: skills.reduce((acc, s) => { acc[s.skill_id] = s.level; return acc; }, {}),
    logs,
  };
}

function getPlayerGuild(playerId) {
  const database = getDb();
  const membership = database.prepare(
    'SELECT guild_id, role, contribution, joined_at FROM guild_members WHERE player_id = ?'
  ).get(playerId);
  if (!membership) return null;

  const guild = getGuild(membership.guild_id);
  if (!guild) return null;

  return {
    ...guild,
    myRole: membership.role,
    myContribution: membership.contribution,
    myJoinTime: membership.joined_at,
  };
}

function getGuildList({ page = 1, limit = 20, keyword = '' }) {
  const database = getDb();
  let where = '1=1';
  const params = [];

  if (keyword) {
    where += ' AND name LIKE ?';
    params.push(`%${keyword}%`);
  }

  const countResult = database.prepare(`SELECT COUNT(*) as total FROM guilds WHERE ${where}`).get(...params);
  const total = countResult.total;

  const offset = (page - 1) * limit;
  const guilds = database.prepare(
    `SELECT id, name, level, exp, leader_name,
            (SELECT COUNT(*) FROM guild_members gm WHERE gm.guild_id = g.id) as member_count,
            max_members, realm_level_req, created_at
     FROM guilds g WHERE ${where} ORDER BY level DESC, exp DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  return { guilds, total, page, limit };
}

function dissolveGuild(guildId, playerId) {
  const database = getDb();
  const guild = database.prepare('SELECT * FROM guilds WHERE id = ?').get(guildId);
  if (!guild) return { success: false, message: '仙盟不存在' };
  if (guild.leader_id !== playerId) return { success: false, message: '只有盟主可以解散仙盟' };

  database.prepare('DELETE FROM guild_logs WHERE guild_id = ?').run(guildId);
  database.prepare('DELETE FROM guild_skills WHERE guild_id = ?').run(guildId);
  database.prepare('DELETE FROM guild_buildings WHERE guild_id = ?').run(guildId);
  database.prepare('DELETE FROM guild_members WHERE guild_id = ?').run(guildId);
  database.prepare('DELETE FROM guild_applications WHERE guild_id = ?').run(guildId);
  database.prepare('DELETE FROM guilds WHERE id = ?').run(guildId);

  return { success: true, message: '仙盟已解散' };
}

function upgradeGuild(guildId, playerId) {
  const database = getDb();
  const guild = database.prepare('SELECT * FROM guilds WHERE id = ?').get(guildId);
  if (!guild) return { success: false, message: '仙盟不存在' };
  if (guild.leader_id !== playerId) return { success: false, message: '只有盟主可以升级仙盟' };

  const currentLevel = guild.level;
  if (currentLevel >= GUILD_CONFIG.levelExp.length - 1) {
    return { success: false, message: '仙盟已达最高级' };
  }

  const expNeeded = GUILD_CONFIG.levelExp[currentLevel + 1];
  if (guild.fund < expNeeded) {
    return { success: false, message: `需要 ${expNeeded} 仙盟资金，当前资金 ${guild.fund}` };
  }

  const newFund = guild.fund - expNeeded;
  const newLevel = currentLevel + 1;
  const newMaxMembers = GUILD_CONFIG.levelMemberCap[newLevel] || guild.max_members;

  database.prepare('UPDATE guilds SET fund = ?, level = ?, max_members = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(newFund, newLevel, newMaxMembers, guildId);

  addGuildLog(guildId, playerId, null, 'upgrade', `仙盟升级至 ${newLevel} 级`);

  return { success: true, newLevel, newFund, message: `仙盟升级至 ${newLevel} 级` };
}

// ============================================================
// 仙盟成员管理
// ============================================================

function applyToGuild({ guildId, playerId, playerName, message = '' }) {
  const database = getDb();

  const existing = database.prepare('SELECT guild_id FROM guild_members WHERE player_id = ?').get(playerId);
  if (existing) return { success: false, message: '您已在仙盟中' };

  const pending = database.prepare(
    "SELECT id FROM guild_applications WHERE guild_id = ? AND player_id = ? AND status = 'pending'"
  ).get(guildId, playerId);
  if (pending) return { success: false, message: '已有待处理申请' };

  database.prepare(
    'INSERT INTO guild_applications (guild_id, player_id, player_name, message) VALUES (?, ?, ?, ?)'
  ).run(guildId, playerId, playerName, message);

  return { success: true, message: '申请已提交' };
}

function getGuildApplications(guildId, playerId) {
  const database = getDb();
  const guild = database.prepare('SELECT leader_id FROM guilds WHERE id = ?').get(guildId);
  if (!guild) return { success: false, message: '仙盟不存在' };
  if (guild.leader_id !== playerId) return { success: false, message: '只有盟主可查看申请' };

  const apps = database.prepare(
    "SELECT * FROM guild_applications WHERE guild_id = ? AND status = 'pending' ORDER BY created_at DESC"
  ).all(guildId);

  return { success: true, applications: apps };
}

function reviewApplication({ guildId, applicantId, reviewerId, approved }) {
  const database = getDb();
  const guild = database.prepare('SELECT * FROM guilds WHERE id = ?').get(guildId);
  if (!guild) return { success: false, message: '仙盟不存在' };
  if (guild.leader_id !== reviewerId) return { success: false, message: '只有盟主可审批' };

  const app = database.prepare('SELECT * FROM guild_applications WHERE guild_id = ? AND player_id = ? AND status = ?')
    .get(guildId, applicantId, 'pending');
  if (!app) return { success: false, message: '申请不存在' };

  if (approved) {
    const memberCount = database.prepare('SELECT COUNT(*) as count FROM guild_members WHERE guild_id = ?').get(guildId).count;
    if (memberCount >= guild.max_members) {
      return { success: false, message: '仙盟成员已满' };
    }
    database.prepare(
      'INSERT OR IGNORE INTO guild_members (guild_id, player_id, player_name, role) VALUES (?, ?, ?, ?)'
    ).run(guildId, applicantId, app.player_name, 'member');
    addGuildLog(guildId, applicantId, app.player_name, 'join', `${app.player_name} 加入了仙盟`);
  }

  database.prepare("UPDATE guild_applications SET status = ? WHERE guild_id = ? AND player_id = ?")
    .run(approved ? 'approved' : 'rejected', guildId, applicantId);

  return { success: true, message: approved ? '已批准加入' : '已拒绝申请' };
}

function kickMember(guildId, kickerId, targetId) {
  const database = getDb();
  const guild = database.prepare('SELECT * FROM guilds WHERE id = ?').get(guildId);
  if (!guild) return { success: false, message: '仙盟不存在' };

  const kickerRole = database.prepare('SELECT role FROM guild_members WHERE guild_id = ? AND player_id = ?')
    .get(guildId, kickerId)?.role;
  const targetRole = database.prepare('SELECT role FROM guild_members WHERE guild_id = ? AND player_id = ?')
    .get(guildId, targetId)?.role;

  if (kickerId !== guild.leader_id && kickerRole !== 'elder') {
    return { success: false, message: '无权限踢出成员' };
  }
  if (targetRole === 'leader') return { success: false, message: '无法踢出盟主' };
  if (targetRole === 'elder' && kickerRole !== 'leader') {
    return { success: false, message: '无法踢出长老' };
  }

  const target = database.prepare('SELECT player_name FROM guild_members WHERE guild_id = ? AND player_id = ?').get(guildId, targetId);
  database.prepare('DELETE FROM guild_members WHERE guild_id = ? AND player_id = ?').run(guildId, targetId);
  addGuildLog(guildId, kickerId, null, 'kick', `踢出了 ${target?.player_name || targetId}`);

  return { success: true, message: '已踢出成员' };
}

function leaveGuild(guildId, playerId) {
  const database = getDb();
  const guild = database.prepare('SELECT leader_id FROM guilds WHERE id = ?').get(guildId);
  if (!guild) return { success: false, message: '仙盟不存在' };
  if (guild.leader_id === playerId) return { success: false, message: '盟主无法退出，请先转让盟主' };

  const member = database.prepare('SELECT player_name FROM guild_members WHERE guild_id = ? AND player_id = ?').get(guildId, playerId);
  database.prepare('DELETE FROM guild_members WHERE guild_id = ? AND player_id = ?').run(guildId, playerId);
  addGuildLog(guildId, playerId, null, 'leave', `${member?.player_name || playerId} 退出了仙盟`);

  return { success: true, message: '已退出仙盟' };
}

function transferLeader(guildId, currentLeaderId, newLeaderId) {
  const database = getDb();
  const guild = database.prepare('SELECT leader_id FROM guilds WHERE id = ?').get(guildId);
  if (!guild) return { success: false, message: '仙盟不存在' };
  if (guild.leader_id !== currentLeaderId) return { success: false, message: '只有盟主可以转让' };

  const newLeader = database.prepare('SELECT player_name FROM guild_members WHERE guild_id = ? AND player_id = ?')
    .get(guildId, newLeaderId);
  if (!newLeader) return { success: false, message: '目标成员不在仙盟中' };

  database.prepare("UPDATE guild_members SET role = 'elder' WHERE guild_id = ? AND player_id = ?").run(guildId, currentLeaderId);
  database.prepare("UPDATE guild_members SET role = 'leader' WHERE guild_id = ? AND player_id = ?").run(guildId, newLeaderId);
  database.prepare('UPDATE guilds SET leader_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newLeaderId, guildId);

  addGuildLog(guildId, newLeaderId, newLeader.player_name, 'transfer_leader', `盟主转让给 ${newLeader.player_name}`);

  return { success: true, message: `盟主已转让给 ${newLeader.player_name}` };
}

function setElder(guildId, leaderId, targetId, isElder) {
  const database = getDb();
  const guild = database.prepare('SELECT leader_id FROM guilds WHERE id = ?').get(guildId);
  if (!guild) return { success: false, message: '仙盟不存在' };
  if (guild.leader_id !== leaderId) return { success: false, message: '只有盟主可以任命长老' };

  const target = database.prepare('SELECT player_name FROM guild_members WHERE guild_id = ? AND player_id = ?')
    .get(guildId, targetId);
  if (!target) return { success: false, message: '目标成员不在仙盟中' };

  const newRole = isElder ? 'elder' : 'member';
  database.prepare('UPDATE guild_members SET role = ? WHERE guild_id = ? AND player_id = ?')
    .run(newRole, guildId, targetId);
  addGuildLog(guildId, leaderId, null, isElder ? 'set_elder' : 'remove_elder',
    `${target.player_name} 被${isElder ? '任命为' : '撤销'}长老`);

  return { success: true, message: isElder ? '已任命为长老' : '已撤销长老身份' };
}

function updateNotice(guildId, playerId, notice) {
  const database = getDb();
  const guild = database.prepare('SELECT leader_id FROM guilds WHERE id = ?').get(guildId);
  if (!guild) return { success: false, message: '仙盟不存在' };
  if (guild.leader_id !== playerId) return { success: false, message: '只有盟主可修改公告' };

  database.prepare('UPDATE guilds SET notice = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(notice, guildId);
  return { success: true, message: '公告已更新' };
}

function contributeFund(guildId, playerId, amount) {
  const database = getDb();
  const member = database.prepare('SELECT player_name, contribution, daily_contribution FROM guild_members WHERE guild_id = ? AND player_id = ?')
    .get(guildId, playerId);
  if (!member) return { success: false, message: '不是仙盟成员' };

  const today = new Date().toISOString().slice(0, 10);

  database.prepare(
    'INSERT INTO guild_contribution_daily (guild_id, player_id, date, contribution) VALUES (?, ?, ?, ?) ' +
    'ON CONFLICT(guild_id, player_id, date) DO UPDATE SET contribution = contribution + ?'
  ).run(guildId, playerId, today, amount, amount);

  const newContrib = member.contribution + amount;
  const newDailyContrib = member.daily_contribution + amount;
  database.prepare('UPDATE guild_members SET contribution = ?, daily_contribution = ?, last_active_at = CURRENT_TIMESTAMP WHERE guild_id = ? AND player_id = ?')
    .run(newContrib, newDailyContrib, guildId, playerId);

  database.prepare('UPDATE guilds SET fund = fund + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(amount, guildId);

  return { success: true, newContribution: newContrib, newDailyContrib, addedFund: amount };
}

function resetDailyContribution() {
  const database = getDb();
  database.prepare('UPDATE guild_members SET daily_contribution = 0').run();
}

// ============================================================
// 仙盟建筑
// ============================================================

function upgradeBuilding(guildId, playerId, buildingKey) {
  const database = getDb();
  const config = GUILD_BUILDINGS[buildingKey];
  if (!config) return { success: false, message: '建筑不存在' };

  const guild = database.prepare('SELECT * FROM guilds WHERE id = ?').get(guildId);
  if (!guild) return { success: false, message: '仙盟不存在' };
  if (guild.leader_id !== playerId) return { success: false, message: '只有盟主可以升级建筑' };

  const current = database.prepare('SELECT level FROM guild_buildings WHERE guild_id = ? AND building_key = ?')
    .get(guildId, buildingKey);
  const currentLevel = current?.level || 0;
  if (currentLevel >= config.maxLevel) return { success: false, message: '建筑已满级' };

  const cost = Math.floor(config.costFactor ** currentLevel * 1000);
  if (guild.fund < cost) return { success: false, message: `需要 ${cost} 仙盟资金` };

  database.prepare('UPDATE guilds SET fund = fund - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(cost, guildId);
  database.prepare('UPDATE guild_buildings SET level = ?, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ? AND building_key = ?')
    .run(currentLevel + 1, guildId, buildingKey);

  addGuildLog(guildId, playerId, null, 'upgrade_building', `${config.name} 升级至 ${currentLevel + 1} 级`);

  return { success: true, newLevel: currentLevel + 1, cost, message: `${config.name} 升级至 ${currentLevel + 1} 级` };
}

function getBuildings(guildId) {
  const database = getDb();
  const buildings = database.prepare('SELECT building_key, level FROM guild_buildings WHERE guild_id = ?').all(guildId);
  return buildings.reduce((acc, b) => {
    const config = GUILD_BUILDINGS[b.building_key];
    if (config) {
      acc[b.building_key] = {
        ...config,
        level: b.level,
        nextCost: Math.floor(config.costFactor ** b.level * 1000),
      };
    }
    return acc;
  }, {});
}

// ============================================================
// 仙盟技能
// ============================================================

function upgradeGuildSkill(guildId, playerId, skillId) {
  const database = getDb();
  const guild = database.prepare('SELECT * FROM guilds WHERE id = ?').get(guildId);
  if (!guild) return { success: false, message: '仙盟不存在' };
  if (guild.leader_id !== playerId) return { success: false, message: '只有盟主可以升级技能' };

  const skillConfig = GUILD_SKILLS[skillId];
  if (!skillConfig) return { success: false, message: '技能不存在' };

  if (guild.level < skillConfig.reqGuildLevel) {
    return { success: false, message: `需要仙盟 ${skillConfig.reqGuildLevel} 级` };
  }

  const current = database.prepare('SELECT level FROM guild_skills WHERE guild_id = ? AND skill_id = ?')
    .get(guildId, skillId);
  const currentLevel = current?.level || 0;
  if (currentLevel >= 5) return { success: false, message: '技能已满级' };

  const cost = skillConfig.cost * (currentLevel + 1);
  if (guild.fund < cost) return { success: false, message: `需要 ${cost} 仙盟资金` };

  database.prepare('UPDATE guilds SET fund = fund - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(cost, guildId);
  database.prepare('UPDATE guild_skills SET level = ?, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ? AND skill_id = ?')
    .run(currentLevel + 1, guildId, skillId);

  addGuildLog(guildId, playerId, null, 'upgrade_skill', `${skillConfig.name} 升级至 ${currentLevel + 1} 级`);

  return { success: true, newLevel: currentLevel + 1, cost, message: `${skillConfig.name} 升级至 ${currentLevel + 1} 级` };
}

function getGuildSkills(guildId) {
  const database = getDb();
  const guild = database.prepare('SELECT level as guild_level FROM guilds WHERE id = ?').get(guildId);
  const skills = database.prepare('SELECT skill_id, level FROM guild_skills WHERE guild_id = ?').all(guildId);

  return skills.map(s => {
    const config = GUILD_SKILLS[s.skill_id];
    if (!config) return null;
    return {
      ...config,
      level: s.level,
      canUpgrade: guild && guild.level >= config.reqGuildLevel && s.level < 5,
    };
  }).filter(Boolean);
}

// ============================================================
// 仙盟加成计算
// ============================================================

function calcGuildBonus(guildId, playerId) {
  const database = getDb();
  const guild = database.prepare('SELECT * FROM guilds WHERE id = ?').get(guildId);
  if (!guild) return {};

  const buildings = database.prepare('SELECT building_key, level FROM guild_buildings WHERE guild_id = ?').all(guildId);
  const skills = database.prepare('SELECT skill_id, level FROM guild_skills WHERE guild_id = ?').all(guildId);

  const bonus = {
    cultivationSpeed: 0,
    dropRate: 0,
    pvpBonus: 0,
    taxReduction: 0,
    alchemySpeed: 0,
    petBonus: 0,
    skillBonus: 0,
    defenseBonus: 0,
    attackBonus: 0,
    hpBonus: 0,
    hasDungeon: false,
  };

  for (const b of buildings) {
    const config = GUILD_BUILDINGS[b.building_key];
    if (!config || b.level === 0) continue;
    switch (config.effect.type) {
      case 'cultivation_speed': bonus.cultivationSpeed += config.effect.value * b.level; break;
      case 'drop_rate': bonus.dropRate += config.effect.value * b.level; break;
      case 'pvp_bonus': bonus.pvpBonus += config.effect.value * b.level; break;
      case 'tax_reduction': bonus.taxReduction += config.effect.value * b.level; break;
      case 'alchemy_speed': bonus.alchemySpeed += config.effect.value * b.level; break;
    }
  }

  for (const s of skills) {
    const config = GUILD_SKILLS[s.skill_id];
    if (!config || s.level === 0) continue;
    switch (config.effect.type) {
      case 'pet_bonus': bonus.petBonus += config.effect.value * s.level; break;
      case 'skill_bonus': bonus.skillBonus += config.effect.value * s.level; break;
      case 'cult_speed': bonus.cultivationSpeed += config.effect.value * s.level; break;
      case 'drop_bonus': bonus.dropRate += config.effect.value * s.level; break;
      case 'defense_bonus': bonus.defenseBonus += config.effect.value * s.level; break;
      case 'attack_bonus': bonus.attackBonus += config.effect.value * s.level; break;
      case 'hp_bonus': bonus.hpBonus += config.effect.value * s.level; break;
      case 'unlock_dungeon': bonus.hasDungeon = true; break;
    }
  }

  return bonus;
}

// ============================================================
// 日志
// ============================================================

function addGuildLog(guildId, playerId, playerName, action, detail) {
  try {
    const database = getDb();
    database.prepare(
      'INSERT INTO guild_logs (guild_id, player_id, player_name, action, detail) VALUES (?, ?, ?, ?, ?)'
    ).run(guildId, playerId, playerName, action, detail);
  } catch (e) {
    // silent fail
  }
}

// ============================================================
// 仙盟排行榜
// ============================================================

function getGuildRankings(limit = 20) {
  const database = getDb();
  return database.prepare(
    `SELECT g.id, g.name, g.level, g.exp, g.fund, g.leader_name,
            (SELECT COUNT(*) FROM guild_members gm WHERE gm.guild_id = g.id) as member_count
     FROM guilds g ORDER BY g.level DESC, g.exp DESC LIMIT ?`
  ).all(limit);
}

// ============================================================
// 导出
// ============================================================

module.exports = {
  initGuildTables,
  getDb,
  GUILD_CONFIG,
  GUILD_BUILDINGS,
  GUILD_SKILLS,
  createGuild,
  getGuild,
  getPlayerGuild,
  getGuildList,
  dissolveGuild,
  upgradeGuild,
  applyToGuild,
  getGuildApplications,
  reviewApplication,
  kickMember,
  leaveGuild,
  transferLeader,
  setElder,
  updateNotice,
  contributeFund,
  resetDailyContribution,
  upgradeBuilding,
  getBuildings,
  upgradeGuildSkill,
  getGuildSkills,
  calcGuildBonus,
  addGuildLog,
  getGuildRankings,
};
