const express = require('express');
const router = express.Router();
const path = require('path');

// 模块级 DB 连接（避免 TDZ）
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');
let db = null;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
} catch (e) {
  console.log('[sect] DB 连接失败:', e.message);
}

// 初始化 sect_applications 表
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sect_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sect_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      message TEXT DEFAULT '',
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reviewed_at DATETIME,
      reviewer_id INTEGER,
      UNIQUE(sect_id, player_id)
    )
  `);
} catch (e) {
  console.log('[sect] sect_applications 表初始化:', e.message);
}

// 初始化 SectMembers 表
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS SectMembers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      sectId INTEGER NOT NULL,
      role TEXT DEFAULT '成员' CHECK(role IN ('掌门','长老','成员')),
      contribution INTEGER DEFAULT 0,
      joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(userId, sectId)
    )
  `);
} catch (e) {
  console.log('[sect] SectMembers 表初始化:', e.message);
}

// 初始化宗门模板数据（如果 DB sects 表为空）
try {
  const { sectTemplates } = require('../../data/sect_templates');
  const count = db.prepare('SELECT COUNT(*) as c FROM sects').get().c;
  if (count === 0) {
    const insert = db.prepare(`
      INSERT INTO sects (name, level, icon, description, leaderId, members, contribution, rank, max_members, spirit_stones, level_req, realm_level_req, welfare)
      VALUES (?, ?, ?, ?, 0, ?, ?, ?, 50, 100000, 1, 1, ?)
    `);
    for (const sect of sectTemplates) {
      insert.run(sect.name, sect.level, sect.icon, sect.description || '', sect.members, sect.contribution, sect.rank, sect.welfare || '');
    }
    console.log(`[sect] 宗门模板初始化完成: ${sectTemplates.length} 个宗门已写入`);
  }
} catch (e) {
  console.error('[sect] 宗门模板初始化失败:', e.message);
}

// 初始化 campfire_messages 表（宗门篝火聊天）
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS campfire_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sect_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      player_name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_campfire_sect ON campfire_messages(sect_id, created_at DESC)`);
} catch (e) {
  console.log('[sect] campfire_messages 表初始化:', e.message);
}

// 初始化默认宗门「青云宗」到 Sects 表（如不存在则插入）
try {
  const existingSect = db.prepare('SELECT id FROM sects WHERE id = 1').get();
  if (!existingSect) {
    const now = new Date().toISOString();
    // 青云宗：id=1, level=8, members=1, contribution=0, rank=1
    db.prepare(`
      INSERT INTO sects (id, name, leaderId, level, members, contribution, rank, createdAt, updatedAt)
      VALUES (1, '青云宗', 1, 8, 1, 0, 1, ?, ?)
    `).run(now, now);

    // 初始化 SectMembers：掌门真人(id=1)作为掌门
    db.prepare(`
      INSERT INTO SectMembers (userId, sectId, role, contribution, joinedAt)
      VALUES (1, 1, '掌门', 0, ?)
    `).run(now);

    console.log('[sect] 青云宗初始化完成');
  }
} catch (e) {
  console.log('[sect] 青云宗初始化:', e.message);
}

// 模拟数据
let sect = {
  id: 1,
  name: '青云宗',
  level: 5,
  icon: '🏯',
  members: 28,
  rank: 15,
  contribution: 12500,
  buildings: [
    { id: 1, icon: '🏠', name: '主殿', level: 5 },
    { id: 2, icon: '⛩️', name: '修炼室', level: 3 },
    { id: 3, icon: '💰', name: '仓库', level: 4 },
    { id: 4, icon: '⚔️', name: '传功堂', level: 2 }
  ]
};

let members = [
  { id: 1, name: '掌门真人', role: '掌门', contribution: 5000 },
  { id: 2, name: '大长老', role: '长老', contribution: 3000 },
  { id: 3, name: '内门弟子', role: '成员', contribution: 1500 }
];

const sectSkills = [
  { key: 'attack_boost', name: '攻击增强', level: 1, effect: '攻击+5%' },
  { key: 'defense_boost', name: '防御增强', level: 1, effect: '防御+5%' },
  { key: 'cultivation_boost', name: '修炼加速', level: 1, effect: '修炼效率+10%' }
];

const sectDungeons = [
  { floor: 1, name: '宗门禁地', difficulty: 'easy', unlocked: true },
  { floor: 2, name: '幽冥洞窟', difficulty: 'normal', unlocked: false }
];

const redPackets = [];
const sectBonuses = { attack: 5, defense: 3, cultivation: 10 };

// 获取宗门信息
// GET / - 宗门列表（分页 + 过滤）
router.get('/', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 10));
  const keyword = (req.query.keyword || '').trim();
  const sort = req.query.sort || 'rank'; // rank | members | level | contribution
  const offset = (page - 1) * pageSize;

  if (!db) {
    return res.json({ success: false, message: '数据库未连接' });
  }

  try {
    let whereClause = '';
    let params = [];
    if (keyword) {
      whereClause = ' WHERE name LIKE ?';
      params.push(`%${keyword}%`);
    }

    // 排序字段映射
    const sortFieldMap = {
      rank: 'rank ASC',
      members: 'members DESC',
      level: 'level DESC',
      contribution: 'contribution DESC'
    };
    const orderClause = sortFieldMap[sort] || 'rank ASC';

    // 总数
    const countRow = db.prepare(`SELECT COUNT(*) as total FROM sects${whereClause}`).get(...params);
    const total = countRow ? countRow.total : 0;

    // 列表（JOIN Users 获取掌门名称）
    const list = db.prepare(`
      SELECT s.*, COALESCE(u.username, '掌门') as leader_name
      FROM sects s
      LEFT JOIN Users u ON u.id = s.leaderId
      ${whereClause}
      ORDER BY ${orderClause}
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    return res.json({
      success: true,
      list: list.map(s => ({
        id: s.id,
        name: s.name,
        level: s.level,
        members: s.members,
        contribution: s.contribution,
        rank: s.rank,
        leaderId: s.leaderId,
        leaderName: s.leader_name,
        createdAt: s.created_at
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (e) {
    console.error('[sect] / 错误:', e.message);
    return res.json({ success: false, message: '获取宗门列表失败: ' + e.message });
  }
});

// /list - 宗门列表别名（分页 + 过滤）
router.get('/list', (req, res) => {
  // 委托给 / 处理，保持参数一致
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 10));
  const keyword = (req.query.keyword || '').trim();
  const sort = req.query.sort || 'rank';
  const offset = (page - 1) * pageSize;

  if (!db) {
    return res.json({ success: false, message: '数据库未连接' });
  }

  try {
    let whereClause = '';
    let params = [];
    if (keyword) {
      whereClause = ' WHERE name LIKE ?';
      params.push(`%${keyword}%`);
    }

    const sortFieldMap = {
      rank: 'rank ASC',
      members: 'members DESC',
      level: 'level DESC',
      contribution: 'contribution DESC'
    };
    const orderClause = sortFieldMap[sort] || 'rank ASC';

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM sects${whereClause}`).get(...params);
    const total = countRow ? countRow.total : 0;

    const list = db.prepare(`
      SELECT s.*, COALESCE(u.username, '掌门') as leader_name
      FROM sects s
      LEFT JOIN Users u ON u.id = s.leaderId
      ${whereClause}
      ORDER BY ${orderClause}
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    return res.json({
      success: true,
      list: list.map(s => ({
        id: s.id,
        name: s.name,
        level: s.level,
        icon: s.icon || '🏯',
        memberCount: s.members || 0,
        contribution: s.contribution || 0,
        rank: s.rank || 0,
        leaderName: s.leader_name,
        welfare: s.welfare || '',
        createdAt: s.created_at
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (e) {
    console.error('[sect] /list 错误:', e.message);
    return res.json({ success: false, message: '获取宗门列表失败: ' + e.message });
  }
});

// /info - 宗门详细信息（按 playerId 查询其所属宗门）
router.get('/info', (req, res) => {
  const playerId = parseInt(req.query.player_id) || parseInt(req.query.userId) || 1;

  if (!db) {
    return res.json({ success: false, message: '数据库未连接' });
  }

  try {
    // 先查玩家所属宗门
    const user = db.prepare('SELECT sectId FROM Users WHERE id = ?').get(playerId);
    if (!user || !user.sectId) {
      return res.json({ success: true, sect: null, inSect: false, message: '未加入宗门' });
    }

    // 从 DB 查询宗门信息
    const sectInfo = db.prepare(`
      SELECT s.*, COALESCE(u.username, '掌门') as leader_name
      FROM sects s
      LEFT JOIN Users u ON u.id = s.leaderId
      WHERE s.id = ?
    `).get(user.sectId);

    if (!sectInfo) {
      return res.json({ success: true, sect: null, inSect: false, message: '宗门不存在' });
    }

    // 查询宗门成员数量（SectMembers 表）
    let memberCount = 1;
    try {
      const cnt = db.prepare('SELECT COUNT(*) as c FROM SectMembers WHERE sectId = ?').get(user.sectId);
      memberCount = cnt ? cnt.c : memberCount;
    } catch (e) { /* SectMembers 可能不存在 */ }

    return res.json({
      success: true,
      inSect: true,
      sect: {
        id: sectInfo.id,
        name: sectInfo.name,
        level: sectInfo.level,
        icon: '🏯',
        members: sectInfo.members,
        memberCount: memberCount,
        contribution: sectInfo.contribution,
        rank: sectInfo.rank,
        leaderId: sectInfo.leaderId,
        leaderName: sectInfo.leader_name || '未知',
        createdAt: sectInfo.createdAt
      }
    });
  } catch (e) {
    console.error('[sect] /info 错误:', e.message);
    return res.json({ success: false, message: '获取宗门信息失败: ' + e.message });
  }
});

// /my - 获取当前玩家所属宗门
router.get('/my', (req, res) => {
  const playerId = parseInt(req.query.player_id) || parseInt(req.query.playerId) || 1;
  try {
    if (!db) return res.json({ success: false, message: '数据库未连接' });
    const user = db.prepare('SELECT sectId FROM Users WHERE id = ?').get(playerId);
    if (!user || !user.sectId) {
      return res.json({ success: true, inSect: false, message: '未加入宗门' });
    }
    const sectInfo = db.prepare('SELECT * FROM sects WHERE id = ?').get(user.sectId);
    if (!sectInfo) {
      return res.json({ success: true, inSect: false, message: '宗门不存在' });
    }
    const memberRole = db.prepare('SELECT role FROM SectMembers WHERE userId = ? AND sectId = ?').get(playerId, user.sectId);
    return res.json({
      success: true,
      inSect: true,
      sect: sectInfo,
      role: memberRole ? memberRole.role : '成员'
    });
  } catch(e) {
    // SectMembers表可能不存在，降级到内存数据
    return res.json({ success: true, inSect: true, sect, members, role: '成员' });
  }
});

// /bonus - 宗门加成
router.get('/bonus', (req, res) => {
  res.json({ success: true, bonuses: sectBonuses });
});

// 从数据库加载成员列表
function loadMembersFromDb(sectId) {
  if (!db) return members; // 降级到内存
  try {
    return db.prepare(`
      SELECT u.id, u.nickname as name, sm.role, sm.contribution, sm.joinedAt
      FROM SectMembers sm
      JOIN Users u ON u.id = sm.userId
      WHERE sm.sectId = ?
      ORDER BY sm.role = '掌门' DESC, sm.contribution DESC, sm.joinedAt ASC
    `).all(sectId);
  } catch (e) {
    console.error('[sect] loadMembersFromDb error:', e.message);
    return members;
  }
}

// /members - 宗门成员列表（从DB加载）
router.get('/members', (req, res) => {
  const playerId = parseInt(req.query.player_id) || 1;
  if (!db) return res.json({ success: true, members });

  try {
    const user = db.prepare('SELECT sectId FROM Users WHERE id = ?').get(playerId);
    if (!user || !user.sectId) {
      return res.json({ success: false, message: '未加入宗门' });
    }
    const memberList = loadMembersFromDb(user.sectId);
    res.json({ success: true, members: memberList });
  } catch (e) {
    console.error('[sect] GET /members error:', e.message);
    res.json({ success: true, members });
  }
});

// 权限检查辅助函数
function requireLeader(db, playerId, callback) {
  if (!db) return callback({ success: false, message: '数据库不可用' }, null);
  try {
    const user = db.prepare('SELECT sectId FROM Users WHERE id = ?').get(playerId);
    if (!user || !user.sectId) return callback({ success: false, message: '未加入宗门' }, null);
    const member = db.prepare('SELECT role FROM SectMembers WHERE userId = ? AND sectId = ?').get(playerId, user.sectId);
    if (!member || member.role !== '掌门') return callback({ success: false, message: '只有掌门可以执行此操作' }, null);
    callback(null, { user, member });
  } catch (e) {
    callback({ success: false, message: e.message }, null);
  }
}

// /member/kick - 踢出成员（掌门权限 + DB持久化）
router.post('/member/kick', (req, res) => {
  const { player_id, target_id } = req.body;
  if (!player_id || !target_id) return res.json({ success: false, message: '参数不足' });

  requireLeader(db, parseInt(player_id), (err, ctx) => {
    if (err) return res.json(err);

    // 不能踢自己
    if (parseInt(target_id) === parseInt(player_id)) {
      return res.json({ success: false, message: '不能踢出自己' });
    }

    // 不能踢掌门
    const target = db.prepare('SELECT role FROM SectMembers WHERE userId = ? AND sectId = ?').get(parseInt(target_id), ctx.user.sectId);
    if (!target) return res.json({ success: false, message: '成员不存在' });
    if (target.role === '掌门') return res.json({ success: false, message: '不能踢出掌门' });

    try {
      db.prepare('DELETE FROM SectMembers WHERE userId = ? AND sectId = ?').run(parseInt(target_id), ctx.user.sectId);
      db.prepare("UPDATE Sects SET members = MAX(0, members - 1), updatedAt = datetime('now') WHERE id = ?").run(ctx.user.sectId);
      res.json({ success: true, message: '成员已移除' });
    } catch (e) {
      res.json({ success: false, message: '操作失败: ' + e.message });
    }
  });
});

// /member/promote - 晋升/任命成员（掌门权限 + DB持久化）
router.post('/member/promote', (req, res) => {
  const { player_id, target_id, new_role } = req.body;
  if (!player_id || !target_id) return res.json({ success: false, message: '参数不足' });

  const validRoles = ['掌门', '长老', '成员'];
  const role = new_role || '长老';
  if (!validRoles.includes(role)) return res.json({ success: false, message: '无效的职位' });

  requireLeader(db, parseInt(player_id), (err, ctx) => {
    if (err) return res.json(err);

    // 不能操作自己
    if (parseInt(target_id) === parseInt(player_id)) {
      return res.json({ success: false, message: '不能修改自己的职位' });
    }

    try {
      const result = db.prepare("UPDATE SectMembers SET role = ? WHERE userId = ? AND sectId = ? AND role != '掌门'").run(role, parseInt(target_id), ctx.user.sectId);
      if (result.changes === 0) {
        return res.json({ success: false, message: '成员不存在或无法修改掌门职位' });
      }
      const updated = db.prepare('SELECT u.id, u.nickname as name, sm.role, sm.contribution FROM SectMembers sm JOIN Users u ON u.id = sm.userId WHERE sm.userId = ?').get(parseInt(target_id));
      res.json({ success: true, member: updated, message: `已任命为${role}` });
    } catch (e) {
      res.json({ success: false, message: '操作失败: ' + e.message });
    }
  });
});

// /member/transfer - 转让掌门（掌门权限 + DB持久化）
router.post('/member/transfer', (req, res) => {
  const { player_id, target_id } = req.body;
  if (!player_id || !target_id) return res.json({ success: false, message: '参数不足' });
  if (parseInt(target_id) === parseInt(player_id)) return res.json({ success: false, message: '不能转让给自己' });

  requireLeader(db, parseInt(player_id), (err, ctx) => {
    if (err) return res.json(err);

    try {
      // 检查目标成员是否存在且是宗门成员
      const target = db.prepare('SELECT role FROM SectMembers WHERE userId = ? AND sectId = ?').get(parseInt(target_id), ctx.user.sectId);
      if (!target) return res.json({ success: false, message: '目标成员不存在' });

      const transaction = db.transaction(() => {
        // 原掌门降为成员
        db.prepare("UPDATE SectMembers SET role = '成员' WHERE userId = ? AND sectId = ?").run(parseInt(player_id), ctx.user.sectId);
        // 新掌门上任
        db.prepare("UPDATE SectMembers SET role = '掌门' WHERE userId = ? AND sectId = ?").run(parseInt(target_id), ctx.user.sectId);
      });
      transaction();
      res.json({ success: true, message: '掌门已转让' });
    } catch (e) {
      res.json({ success: false, message: '转让失败: ' + e.message });
    }
  });
});

// /skills - 宗门技能列表
router.get('/skills', (req, res) => {
  res.json({ success: true, skills: sectSkills });
});

// /skill/learn - 学习宗门技能
router.post('/skill/learn', (req, res) => {
  const { player_id, skill_key } = req.body;
  const skill = sectSkills.find(s => s.key === skill_key);
  if (skill) {
    skill.level += 1;
    res.json({ success: true, skill });
  } else {
    res.json({ success: false, message: '技能不存在' });
  }
});

// /dungeon - 宗门副本信息
// ==================== 宗门副本系统 ====================

// 宗门试炼副本配置
const SECT_DUNGEON_CONFIG = {
  1: { name: '宗门禁地', difficulty: 'easy', baseHp: 1000, baseReward: 100, reqLevel: 1 },
  2: { name: '幽冥洞窟', difficulty: 'normal', baseHp: 3000, baseReward: 300, reqLevel: 5 },
  3: { name: '深渊魔域', difficulty: 'hard', baseHp: 8000, baseReward: 800, reqLevel: 10 },
  4: { name: '天劫之地', difficulty: 'nightmare', baseHp: 20000, baseReward: 2000, reqLevel: 15 },
  5: { name: '混沌虚空', difficulty: 'chaos', baseHp: 50000, baseReward: 5000, reqLevel: 20 }
};

// 初始化 sect_dungeons 表
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sect_dungeons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sect_id INTEGER NOT NULL,
      floor INTEGER NOT NULL DEFAULT 1,
      status TEXT DEFAULT 'open' CHECK(status IN ('open','locked','completed')),
      best_score INTEGER DEFAULT 0,
      challenge_count INTEGER DEFAULT 0,
      last_challenge_at DATETIME,
      reset_at DATETIME DEFAULT (datetime('now', '+1 day')),
      UNIQUE(sect_id, floor)
    )
  `);
} catch(e) { console.log('[sect] sect_dungeons:', e.message); }

// 获取宗门副本状态
router.get('/dungeon', (req, res) => {
  const sectId = parseInt(req.query.sectId) || parseInt(req.query.sect_id);
  if (!sectId) return res.json({ success: false, message: '缺少宗门ID' });
  if (!db) return res.json({ success: false, message: '数据库未连接' });

  try {
    // 获取宗门的副本状态
    let dungeons = db.prepare('SELECT * FROM sect_dungeons WHERE sect_id = ? ORDER BY floor').all(sectId);
    
    // 如果没有记录，初始化所有副本
    if (dungeons.length === 0) {
      const insert = db.prepare('INSERT INTO sect_dungeons (sect_id, floor, status) VALUES (?, ?, ?)');
      for (const [floor, config] of Object.entries(SECT_DUNGEON_CONFIG)) {
        const status = floor === '1' ? 'open' : 'locked';
        insert.run(sectId, parseInt(floor), status);
      }
      dungeons = db.prepare('SELECT * FROM sect_dungeons WHERE sect_id = ? ORDER BY floor').all(sectId);
    }

    // 附加配置信息
    const result = dungeons.map(d => {
      const config = SECT_DUNGEON_CONFIG[d.floor] || {};
      return {
        ...d,
        name: config.name || `副本${d.floor}`,
        difficulty: config.difficulty || 'normal',
        baseHp: config.baseHp || 1000,
        baseReward: config.baseReward || 100,
        reqLevel: config.reqLevel || 1
      };
    });

    res.json({ success: true, dungeons: result });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// 进入副本
router.post('/dungeon/enter', (req, res) => {
  const playerId = parseInt(req.body.player_id) || 1;
  const sectId = parseInt(req.body.sectId) || parseInt(req.body.sect_id);
  const floor = parseInt(req.body.floor) || 1;

  if (!db) return res.json({ success: false, message: '数据库未连接' });

  try {
    // 检查玩家宗门
    const player = db.prepare('SELECT sectId FROM Users WHERE id = ?').get(playerId);
    if (!player || player.sectId !== sectId) {
      return res.json({ success: false, message: '你不是该宗门成员' });
    }

    // 检查副本状态
    const dungeon = db.prepare('SELECT * FROM sect_dungeons WHERE sect_id = ? AND floor = ?').get(sectId, floor);
    if (!dungeon || dungeon.status === 'locked') {
      return res.json({ success: false, message: '副本未解锁' });
    }

    // 生成战斗对象
    const config = SECT_DUNGEON_CONFIG[floor] || {};
    const boss = {
      floor,
      name: config.name || `Boss`,
      hp: config.baseHp || 1000,
      maxHp: config.baseHp || 1000,
      attack: Math.floor((config.baseHp || 1000) / 10),
      difficulty: config.difficulty || 'normal'
    };

    // 更新挑战次数
    db.prepare('UPDATE sect_dungeons SET challenge_count = challenge_count + 1, last_challenge_at = datetime("now") WHERE sect_id = ? AND floor = ?').run(sectId, floor);

    res.json({ success: true, message: `进入${config.name || '宗门试炼'}`, boss, sectId, floor });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// 副本战斗
router.post('/dungeon/battle', (req, res) => {
  const playerId = parseInt(req.body.player_id) || 1;
  const sectId = parseInt(req.body.sectId) || parseInt(req.body.sect_id);
  const floor = parseInt(req.body.floor) || 1;
  const damage = parseInt(req.body.damage) || 0;

  if (!db) return res.json({ success: false, message: '数据库未连接' });

  try {
    // 检查玩家宗门
    const player = db.prepare('SELECT sectId, attack FROM Users WHERE id = ?').get(playerId);
    if (!player || player.sectId !== sectId) {
      return res.json({ success: false, message: '你不是该宗门成员' });
    }

    // 获取副本配置
    const config = SECT_DUNGEON_CONFIG[floor] || {};
    const baseHp = config.baseHp || 1000;
    
    // 计算玩家伤害 (基础伤害 + 攻击力)
    const playerDamage = damage || Math.floor((player.attack || 100) * (1 + Math.random() * 0.5));
    
    // 模拟Boss反击
    const bossAttack = Math.floor(baseHp / 15);
    const playerHp = 1000; // 简化：固定玩家血量
    const playerRemainingHp = Math.max(0, playerHp - bossAttack);
    
    // 计算收益
    const isWin = playerDamage >= baseHp * 0.3; // 造成30%Boss血量即算胜利
    
    let rewards = {};
    let buildingGain = 0;
    
    if (isWin) {
      const baseReward = config.baseReward || 100;
      const contribution = Math.floor(baseReward * (1 + floor * 0.2));
      const exp = Math.floor(baseReward * 2 * (1 + floor * 0.3));
      const spiritStones = Math.floor(baseReward * 0.5 * (1 + floor * 0.2));
      
      rewards = { contribution, exp, spiritStones };
      buildingGain = Math.floor(baseReward * 0.1 * floor);
      
      // 更新玩家和宗门
      db.prepare('UPDATE SectMembers SET contribution = contribution + ? WHERE userId = ? AND sectId = ?').run(contribution, playerId, sectId);
      db.prepare('UPDATE sects SET contribution = contribution + ? WHERE id = ?').run(contribution, sectId);
      
      // 如果是首次通关，解锁下一层
      if (floor < 5) {
        db.prepare('UPDATE sect_dungeons SET status = "open" WHERE sect_id = ? AND floor = ?').run(sectId, floor + 1);
      }
    }

    // 更新最佳成绩
    if (playerDamage > (db.prepare('SELECT best_score FROM sect_dungeons WHERE sect_id = ? AND floor = ?').get(sectId, floor)?.best_score || 0)) {
      db.prepare('UPDATE sect_dungeons SET best_score = ? WHERE sect_id = ? AND floor = ?').run(playerDamage, sectId, floor);
    }

    res.json({ 
      success: true, 
      win: isWin,
      playerDamage,
      bossDamage: bossAttack,
      playerRemainingHp,
      rewards,
      buildingGain,
      message: isWin ? '战斗胜利！' : '战斗失败'
    });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// 宗门副本重置 (每日/每周)
router.post('/dungeon/reset', (req, res) => {
  const sectId = parseInt(req.body.sectId) || parseInt(req.body.sect_id);
  const type = req.body.type || 'daily'; // daily 或 weekly
  
  if (!db) return res.json({ success: false, message: '数据库未连接' });
  
  try {
    // 每周重置：清空所有进度，重新从第一层开始
    if (type === 'weekly') {
      db.prepare('UPDATE sect_dungeons SET status = CASE WHEN floor = 1 THEN "open" ELSE "locked" END, challenge_count = 0, best_score = 0, reset_at = datetime("now", "+7 days") WHERE sect_id = ?').run(sectId);
      return res.json({ success: true, message: '宗门副本已每周重置' });
    }
    
    // 每日重置：重置挑战次数
    db.prepare('UPDATE sect_dungeons SET challenge_count = 0, reset_at = datetime("now", "+1 day") WHERE sect_id = ?').run(sectId);
    res.json({ success: true, message: '宗门副本已每日重置' });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// 旧版兼容 - 挑战宗门副本 (简化版)
router.post('/dungeon/challenge', (req, res) => {
  const { player_id, floor, difficulty } = req.body;
  const playerId = parseInt(player_id) || 1;
  
  // 获取玩家宗门
  if (!db) return res.json({ success: false, message: '数据库未连接' });
  const player = db.prepare('SELECT sectId FROM Users WHERE id = ?').get(playerId);
  if (!player || !player.sectId) {
    return res.json({ success: false, message: '未加入宗门' });
  }
  
  // 转发到新接口
  req.body.sectId = player.sectId;
  req.body.floor = parseInt(floor) || 1;
  
  // 模拟伤害触发战斗
  req.body.damage = Math.floor((SECT_DUNGEON_CONFIG[req.body.floor]?.baseHp || 1000) * 0.5);
  
  // 调用battle接口
  const battleRes = require('./sect').Router?.post ? res : null;
  
  // 直接返回简化结果
  const config = SECT_DUNGEON_CONFIG[req.body.floor] || {};
  const success = Math.random() > 0.3;
  res.json({ 
    success, 
    message: success ? '挑战成功!' : '挑战失败', 
    dungeon: { floor: req.body.floor, name: config.name, difficulty: config.difficulty },
    rewards: success ? { exp: config.baseReward * 2 || 200, contribution: config.baseReward || 100 } : null
  });
});

// /redpackets - 红包列表
router.get('/redpackets', (req, res) => {
  res.json({ success: true, redPackets });
});

// /redpacket/send - 发送红包
router.post('/redpacket/send', (req, res) => {
  const { player_id, amount, type, message } = req.body;
  const packet = { id: Date.now(), playerId: player_id, amount, type, message, totalRecipients: 10, remaining: 10, createdAt: new Date() };
  redPackets.push(packet);
  res.json({ success: true, packet });
});

// /redpacket/claim - 领取红包
router.post('/redpacket/claim', (req, res) => {
  const { player_id, packet_id } = req.body;
  const packet = redPackets.find(p => p.id === packet_id);
  if (!packet) return res.json({ success: false, message: '红包不存在' });
  if (packet.remaining <= 0) return res.json({ success: false, message: '红包已领完' });
  
  const claimAmount = Math.floor(packet.amount / (packet.totalRecipients || 10));
  packet.remaining -= 1;
  res.json({ success: true, amount: claimAmount, message: `领取成功，获得 ${claimAmount} 灵石` });
});

// /admin - 宗门管理信息
router.get('/admin', (req, res) => {
  res.json({ success: true, sect, members, buildings: sect.buildings });
});

// /donate - 捐赠
router.post('/donate', (req, res) => {
  const userId = parseInt(req.body.player_id || req.body.userId || req.body.playerId) || (req.user && req.user.id) || 1;
  const amount = parseInt(req.body.amount || req.body.lingshi || req.body.spirit_stones) || 100;

  if (!db) {
    return res.status(500).json({ success: false, message: '数据库未连接' });
  }

  try {
    // 检查玩家是否存在，是否有宗门
    const player = db.prepare('SELECT id, sectId, lingshi FROM Users WHERE id = ?').get(userId);
    if (!player) {
      return res.status(404).json({ success: false, message: '玩家不存在' });
    }
    if (!player.sectId) {
      return res.status(400).json({ success: false, message: '未加入宗门' });
    }
    if (player.lingshi < amount) {
      return res.status(400).json({ success: false, message: '灵石不足' });
    }

    // 扣除玩家灵石
    const updateUser = db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ? AND lingshi >= ?').run(amount, userId, amount);
    if (updateUser.changes === 0) {
      return res.status(400).json({ success: false, message: '灵石扣除失败' });
    }

    // 更新宗门成员贡献
    const sectId = player.sectId;
    db.prepare('UPDATE SectMembers SET contribution = contribution + ? WHERE userId = ? AND sectId = ?').run(amount, userId, sectId);

    // 更新宗门总贡献
    db.prepare('UPDATE sects SET contribution = contribution + ? WHERE id = ?').run(amount, sectId);

    // 查询最新贡献
    const member = db.prepare('SELECT contribution FROM SectMembers WHERE userId = ? AND sectId = ?').get(userId, sectId);
    const newLingshi = db.prepare('SELECT lingshi FROM Users WHERE id = ?').get(userId);

    res.json({
      success: true,
      message: '捐赠成功',
      contributed: amount,
      totalContribution: member ? member.contribution : 0,
      remainingLingshi: newLingshi ? newLingshi.lingshi : 0
    });
  } catch (e) {
    console.error('[sect] donate error:', e.message);
    res.status(500).json({ success: false, message: '服务器错误: ' + e.message });
  }
});

// ==================== 宗门商店系统 ====================

// 初始化 sect_shop_items 表
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sect_shop_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT DEFAULT '📦',
      cost INTEGER NOT NULL,
      reward_type TEXT NOT NULL,
      reward_id TEXT,
      reward_count INTEGER NOT NULL DEFAULT 1,
      stock INTEGER DEFAULT -1,
      player_limit INTEGER DEFAULT 0,
      sect_level_req INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // 初始化默认商店物品
  const defaultItems = [
    { key: 'ss_title_1', name: '宗门弟子称号', desc: '宗门成员专属称号', icon: '📛', cost: 500, type: 'title', id: 'sect_disciple', count: 1, level: 1 },
    { key: 'ss_title_2', name: '宗门长老称号', desc: '宗门长老专属称号', icon: '📛', cost: 2000, type: 'title', id: 'sect_elder', count: 1, level: 3 },
    { key: 'ss_title_3', name: '宗门太上长老', desc: '宗门太上长老专属称号', icon: '📛', cost: 5000, type: 'title', id: 'sect_senior', count: 1, level: 5 },
    { key: 'ss_gongfa_1', name: '基础功法', desc: '宗门基础修炼功法', icon: '📖', cost: 1000, type: 'gongfa', id: 'sect_basic_gongfa', count: 1, level: 2 },
    { key: 'ss_gongfa_2', name: '中级功法', desc: '宗门中级修炼功法', icon: '📖', cost: 3000, type: 'gongfa', id: 'sect_mid_gongfa', count: 1, level: 4 },
    { key: 'ss_gongfa_3', name: '高级功法', desc: '宗门高级修炼功法', icon: '📖', cost: 8000, type: 'gongfa', id: 'sect_high_gongfa', count: 1, level: 6 },
    { key: 'ss_pill_1', name: '修炼丹', desc: '提升修炼速度', icon: '🧪', cost: 500, type: 'pill', id: 'cultivation_pill', count: 1, level: 1 },
    { key: 'ss_pill_2', name: '灵力丹', desc: '恢复灵力', icon: '🧪', cost: 300, type: 'pill', id: 'spirit_pill', count: 1, level: 1 },
    { key: 'ss_pill_3', name: '气血散', desc: '恢复气血', icon: '🧪', cost: 200, type: 'pill', id: 'hp_pill', count: 1, level: 1 },
    { key: 'ss_material_1', name: '破境石', desc: '增加突破成功率', icon: '💎', cost: 1000, type: 'material', id: 'breakthrough_stone', count: 1, level: 3 },
    { key: 'ss_material_2', name: '聚灵石', desc: '增加灵石获取', icon: '💎', cost: 800, type: 'material', id: 'spirit_stone_material', count: 1, level: 2 },
    { key: 'ss_box_1', name: '宗门礼包', desc: '随机获得宗门道具', icon: '🎁', cost: 1500, type: 'box', id: 'sect_gift_box', count: 1, level: 1 },
  ];
  
  const insertItem = db.prepare(`
    INSERT OR IGNORE INTO sect_shop_items (item_key, name, description, icon, cost, reward_type, reward_id, reward_count, sect_level_req)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const item of defaultItems) {
    insertItem.run(item.key, item.name, item.desc, item.icon, item.cost, item.type, item.id, item.count, item.level);
  }
  console.log('[sect] 宗门商店物品初始化完成');
} catch(e) { console.log('[sect] sect_shop_items:', e.message); }

// 玩家购买记录
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sect_shop_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      item_key TEXT NOT NULL,
      cost INTEGER NOT NULL,
      purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, item_key)
    )
  `);
} catch(e) {}

// 获取宗门商店列表
router.get('/shop', (req, res) => {
  const playerId = parseInt(req.query.player_id) || parseInt(req.query.playerId) || 1;
  const sectId = parseInt(req.query.sectId) || parseInt(req.query.sect_id);
  
  if (!db) return res.json({ success: false, message: '数据库未连接' });
  
  try {
    // 获取玩家所在宗门
    if (!sectId) {
      const player = db.prepare('SELECT sectId FROM Users WHERE id = ?').get(playerId);
      if (!player || !player.sectId) {
        return res.json({ success: false, message: '未加入宗门' });
      }
    }
    const actualSectId = sectId || player?.sectId;
    
    // 获取宗门等级
    const sect = db.prepare('SELECT level FROM sects WHERE id = ?').get(actualSectId);
    const sectLevel = sect?.level || 1;
    
    // 获取商店物品 (根据宗门等级过滤)
    const items = db.prepare(`
      SELECT * FROM sect_shop_items WHERE sect_level_req <= ? ORDER BY sect_level_req, cost
    `).all(sectLevel);
    
    // 获取玩家已购买记录
    const purchased = db.prepare('SELECT item_key FROM sect_shop_purchases WHERE player_id = ?').all(playerId);
    const purchasedKeys = new Set(purchased.map(p => p.item_key));
    
    // 标记已购买物品
    const result = items.map(item => ({
      ...item,
      canBuy: !purchasedKeys.has(item.item_key) && item.player_limit === 0,
      purchased: purchasedKeys.has(item.item_key)
    }));
    
    res.json({ success: true, items: result, sectLevel });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// 购买物品
router.post('/shop/buy', (req, res) => {
  const playerId = parseInt(req.body.player_id) || parseInt(req.body.playerId) || 1;
  const sectId = parseInt(req.body.sectId) || parseInt(req.body.sect_id);
  const itemKey = req.body.item_key || req.body.itemKey || req.body.item;
  
  if (!itemKey) return res.json({ success: false, message: '请选择物品' });
  if (!db) return res.json({ success: false, message: '数据库未连接' });
  
  try {
    // 获取玩家信息和宗门
    const player = db.prepare('SELECT id, sectId, lingshi FROM Users WHERE id = ?').get(playerId);
    if (!player) return res.json({ success: false, message: '玩家不存在' });
    if (!player.sectId) return res.json({ success: false, message: '未加入宗门' });
    
    const actualSectId = sectId || player.sectId;
    
    // 获取物品信息
    const item = db.prepare('SELECT * FROM sect_shop_items WHERE item_key = ?').get(itemKey);
    if (!item) return res.json({ success: false, message: '物品不存在' });
    
    // 检查宗门等级
    const sect = db.prepare('SELECT level FROM sects WHERE id = ?').get(actualSectId);
    if (sect && sect.level < item.sect_level_req) {
      return res.json({ success: false, message: `宗门等级不足，需要 ${item.sect_level_req} 级` });
    }
    
    // 检查玩家灵石
    if (player.lingshi < item.cost) {
      return res.json({ success: false, message: `灵石不足，需要 ${item.cost} 灵石` });
    }
    
    // 检查是否已购买 (针对限购物品)
    if (item.player_limit > 0) {
      const existing = db.prepare('SELECT * FROM sect_shop_purchases WHERE player_id = ? AND item_key = ?').get(playerId, itemKey);
      if (existing) {
        return res.json({ success: false, message: '该物品已购买过' });
      }
    }
    
    // 扣除灵石
    db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(item.cost, playerId);
    
    // 记录购买
    try {
      db.prepare('INSERT INTO sect_shop_purchases (player_id, item_key, cost) VALUES (?, ?, ?)').run(playerId, itemKey, item.cost);
    } catch(e) {}
    
    // 返回物品
    res.json({
      success: true,
      message: `购买成功！获得 ${item.name}`,
      item: {
        key: item.item_key,
        name: item.name,
        type: item.reward_type,
        id: item.reward_id,
        count: item.reward_count,
        icon: item.icon
      },
      remainingLingshi: player.lingshi - item.cost
    });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// 创建宗门
router.post('/create', (req, res) => {
  const { player_id, name } = req.body;
  const creatorId = parseInt(player_id) || 1;
  const sectName = name || '新宗门';
  const now = new Date().toISOString();
  const CREATE_COST = 5000; // 创建宗门消耗5000灵石

  if (!db) {
    return res.json({ success: false, message: '数据库未连接' });
  }

  try {
    // 检查玩家是否存在
    const player = db.prepare('SELECT id, sectId, lingshi FROM Users WHERE id = ?').get(creatorId);
    if (!player) {
      return res.json({ success: false, message: '玩家不存在' });
    }

    // 检查是否已有宗门
    if (player.sectId) {
      return res.json({ success: false, message: '已有宗门，无法创建' });
    }

    // 检查灵石是否足够
    if (player.lingshi < CREATE_COST) {
      return res.json({ success: false, message: `灵石不足，需要 ${CREATE_COST} 灵石才能创建宗门` });
    }

    // 扣除灵石
    db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(CREATE_COST, creatorId);

    // 检查宗门名称是否已存在
    const existingSect = db.prepare('SELECT id FROM sects WHERE name = ?').get(sectName);
    if (existingSect) {
      // 退还灵石
      db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(CREATE_COST, creatorId);
      return res.json({ success: false, message: '宗门名称已存在' });
    }

    // 插入 Sects 表
    const stmt = db.prepare(`
      INSERT INTO sects (name, leaderId, level, members, contribution, rank, createdAt, updatedAt)
      VALUES (?, ?, 1, 1, 0, 999, ?, ?)
    `);
    const result = stmt.run(sectName, creatorId, now, now);
    const newSectId = result.lastInsertRowid;

    // 更新玩家的 sectId
    db.prepare('UPDATE Users SET sectId = ? WHERE id = ?').run(newSectId, creatorId);

    // 插入 SectMembers（创始人作为掌门）
    try {
      db.prepare(`
        INSERT INTO SectMembers (userId, sectId, role, contribution, joinedAt)
        VALUES (?, ?, '掌门', 0, ?)
      `).run(creatorId, newSectId, now);
    } catch (e) {
      console.log('[sect] create SectMembers 插入:', e.message);
    }

    // 初始化宗门资金
    db.prepare('UPDATE sects SET spirit_stones = 0, funds = 0 WHERE id = ?').run(newSectId);

    const newSect = db.prepare('SELECT * FROM sects WHERE id = ?').get(newSectId);

    return res.json({
      success: true,
      message: `宗门「${sectName}」创建成功！消耗 ${CREATE_COST} 灵石`,
      sect: {
        id: newSect.id,
        name: newSect.name,
        level: newSect.level,
        icon: '🏯',
        memberCount: newSect.members,
        leaderId: newSect.leaderId,
        rank: newSect.rank,
        contribution: newSect.contribution,
        createdAt: newSect.createdAt,
        funds: 0,
        spiritStones: 0
      },
      remainingLingshi: player.lingshi - CREATE_COST
    });
  } catch (e) {
    console.log('[sect] create错误:', e.message);
    return res.json({ success: false, message: '创建宗门失败: ' + e.message });
  }
});

// ==================== 宗门升级系统 ====================

// 宗门升级配置
const SECT_UPGRADE_CONFIG = {
  1: { level: 2, reqContrib: 5000, reqFunds: 1000, maxMembers: 25, name: '二级宗门' },
  2: { level: 3, reqContrib: 15000, reqFunds: 3000, maxMembers: 30, name: '三级宗门' },
  3: { level: 4, reqContrib: 40000, reqFunds: 8000, maxMembers: 35, name: '四级宗门' },
  4: { level: 5, reqContrib: 100000, reqFunds: 20000, maxMembers: 40, name: '五级宗门' },
  5: { level: 6, reqContrib: 250000, reqFunds: 50000, maxMembers: 45, name: '六级宗门' },
  6: { level: 7, reqContrib: 600000, reqFunds: 120000, maxMembers: 50, name: '七级宗门' },
  7: { level: 8, reqContrib: 1500000, reqFunds: 300000, maxMembers: 55, name: '八级宗门' },
  8: { level: 9, reqContrib: 4000000, reqFunds: 800000, maxMembers: 60, name: '九级宗门' },
  9: { level: 10, reqContrib: 10000000, reqFunds: 2000000, maxMembers: 70, name: '十级宗门（顶级）' }
};

// 添加 funds 字段到 sects 表（如不存在）
try {
  db.exec(`ALTER TABLE sects ADD COLUMN funds INTEGER DEFAULT 0`);
} catch(e) {}

// 升级宗门
router.post('/upgrade', (req, res) => {
  const playerId = parseInt(req.body.player_id) || 1;
  const sectId = parseInt(req.body.sectId) || parseInt(req.body.sect_id);
  
  if (!db) return res.json({ success: false, message: '数据库未连接' });
  
  try {
    // 获取玩家宗门身份
    const member = db.prepare('SELECT sm.*, s.level as sectLevel, s.contribution, s.funds, s.max_members FROM SectMembers sm JOIN sects s ON s.id = sm.sectId WHERE sm.userId = ? AND sm.sectId = ?').get(playerId, sectId);
    if (!member) return res.json({ success: false, message: '你不是该宗门成员' });
    
    // 只有掌门可以升级
    if (member.role !== '掌门') {
      return res.json({ success: false, message: '只有掌门才能升级宗门' });
    }
    
    const currentLevel = member.sectLevel;
    if (currentLevel >= 10) {
      return res.json({ success: false, message: '宗门已达最高等级' });
    }
    
    const upgradeConfig = SECT_UPGRADE_CONFIG[currentLevel];
    if (!upgradeConfig) {
      return res.json({ success: false, message: '升级配置不存在' });
    }
    
    // 检查资源
    if (member.contribution < upgradeConfig.reqContrib) {
      return res.json({ success: false, message: `宗门贡献不足，需要 ${upgradeConfig.reqContrib} 贡献度，当前 ${member.contribution}` });
    }
    
    if ((member.funds || 0) < upgradeConfig.reqFunds) {
      return res.json({ success: false, message: `宗门资金不足，需要 ${upgradeConfig.reqFunds} 灵石，当前 ${member.funds || 0}` });
    }
    
    // 执行升级
    db.prepare('UPDATE sects SET level = ?, max_members = ? WHERE id = ?').run(upgradeConfig.level, upgradeConfig.maxMembers, sectId);
    
    res.json({
      success: true,
      message: `宗门升级成功！现在是 ${upgradeConfig.name}`,
      newLevel: upgradeConfig.level,
      maxMembers: upgradeConfig.maxMembers
    });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// 获取升级信息
router.get('/upgrade/info', (req, res) => {
  const sectId = parseInt(req.query.sectId) || parseInt(req.query.sect_id);
  
  if (!db) return res.json({ success: false, message: '数据库未连接' });
  
  try {
    const sect = db.prepare('SELECT level, contribution, funds, max_members FROM sects WHERE id = ?').get(sectId);
    if (!sect) return res.json({ success: false, message: '宗门不存在' });
    
    const currentLevel = sect.level;
    const upgradeConfig = SECT_UPGRADE_CONFIG[currentLevel];
    
    if (!upgradeConfig) {
      return res.json({ success: true, message: '已达最高等级', isMaxLevel: true, level: currentLevel });
    }
    
    res.json({
      success: true,
      currentLevel,
      nextLevel: upgradeConfig.level,
      reqContrib: upgradeConfig.reqContrib,
      reqFunds: upgradeConfig.reqFunds,
      newMaxMembers: upgradeConfig.maxMembers,
      currentContrib: sect.contribution,
      currentFunds: sect.funds || 0,
      currentMaxMembers: sect.max_members,
      canUpgrade: sect.contribution >= upgradeConfig.reqContrib && (sect.funds || 0) >= upgradeConfig.reqFunds
    });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// /building - 查询宗门建筑
router.get('/building', (req, res) => {
  res.json({ success: true, buildings: sect.buildings });
});

// 升级建筑
router.post('/building/upgrade', (req, res) => {
  const { buildingId } = req.body;
  const building = sect.buildings.find(b => b.id === buildingId);
  if (building) {
    building.level += 1;
    res.json({ success: true, building });
  } else {
    res.json({ success: false, message: '建筑不存在' });
  }
});

// 宗门列表 (分页)
router.get('/list', (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  if (db) {
    try {
      const total = db.prepare('SELECT COUNT(*) as count FROM sects').get().count || 0;
      const sects = db.prepare(`
        SELECT s.*, COALESCE(u.username, '掌门') as leader_name
        FROM sects s
        LEFT JOIN Users u ON u.id = s.leaderId
        ORDER BY s.level DESC, s.members DESC
        LIMIT ? OFFSET ?
      `).all(parseInt(limit), offset);

      return res.json({
        success: true,
        sects: sects.map(s => ({
          id: s.id,
          name: s.name,
          level: s.level,
          icon: s.icon || '🏯',
          memberCount: s.members || 0,
          leaderName: s.leader_name,
          rank: s.rank || 0,
          contribution: s.contribution || 0
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (e) {
      console.log('[sect] list查询:', e.message);
    }
  }
  
  // 无数据库时返回模拟数据
  const mockSects = [
    { id: 1, name: '青云宗', level: 8, icon: '🏯', memberCount: 128, leaderName: '掌门真人', rank: 1, contribution: 580000 },
    { id: 2, name: '天机阁', level: 7, icon: '🔮', memberCount: 95, leaderName: '天机子', rank: 2, contribution: 420000 },
    { id: 3, name: '万剑宗', level: 6, icon: '⚔️', memberCount: 156, leaderName: '剑圣', rank: 3, contribution: 380000 },
    { id: 4, name: '玄冰宫', level: 5, icon: '❄️', memberCount: 72, leaderName: '冰皇', rank: 4, contribution: 290000 },
    { id: 5, name: '烈火门', level: 4, icon: '🔥', memberCount: 88, leaderName: '火神', rank: 5, contribution: 210000 }
  ];
  
  res.json({
    success: true,
    sects: mockSects.slice(offset, offset + parseInt(limit)),
    pagination: { page: parseInt(page), limit: parseInt(limit), total: mockSects.length, totalPages: 1 }
  });
});

// POST /join - 玩家加入宗门
router.post('/join', (req, res) => {
  const player_id = parseInt(req.body.player_id) || parseInt(req.body.userId) || 1;
  const sectId = parseInt(req.body.sectId);

  if (!sectId) {
    return res.status(400).json({ success: false, message: '缺少 sectId 参数' });
  }

  if (!db) {
    return res.status(500).json({ success: false, message: '数据库不可用' });
  }

  try {
    // 检查玩家是否存在
    const player = db.prepare('SELECT * FROM Users WHERE id = ?').get(player_id);
    if (!player) {
      return res.status(404).json({ success: false, message: '玩家不存在' });
    }

    // 检查玩家是否已在宗门
    if (player.sectId) {
      const currentSect = db.prepare('SELECT name FROM sects WHERE id = ?').get(player.sectId);
      return res.status(400).json({
        success: false,
        message: `你已在宗门「${currentSect?.name || '未知'}」中，请先退出再申请`
      });
    }

    // 检查宗门是否存在
    const sect = db.prepare('SELECT * FROM sects WHERE id = ?').get(sectId);
    if (!sect) {
      return res.status(404).json({ success: false, message: '宗门不存在' });
    }

    // 宗门人数上限（根据宗门等级：10 + level * 5，默认上限50）
    const maxMembers = 10 + (sect.level || 1) * 5;
    if ((sect.members || 1) >= maxMembers) {
      return res.status(400).json({
        success: false,
        message: `宗门人数已满（${sect.members}/${maxMembers}），无法加入`
      });
    }

    // 更新玩家宗门
    db.prepare("UPDATE Users SET sectId = ?, updatedAt = datetime('now') WHERE id = ?").run(sectId, player_id);

    // 宗门成员+1
    db.prepare("UPDATE Sects SET members = members + 1, updatedAt = datetime('now') WHERE id = ?").run(sectId);

    return res.json({
      success: true,
      message: `成功加入宗门「${sect.name}」！`,
      data: {
        sectId: sect.id,
        sectName: sect.name,
        sectLevel: sect.level,
        memberCount: (sect.members || 0) + 1,
        maxMembers
      }
    });
  } catch (error) {
    console.error('[sect] /join 错误:', error.message);
    return res.status(500).json({ success: false, message: '加入宗门失败: ' + error.message });
  }
});

// ========== P0-2703: 兼容路由 ==========

// GET /api/sect/missions → 宗门每日任务（代理到 sect-missions/daily）
router.get('/missions', (req, res) => {
  const { playerId, userId } = req.query;
  const targetId = parseInt(playerId) || parseInt(userId) || 1;
  try {
    const sectMissionRouter = require('./sect-missions');
    const mockReq = Object.assign({}, req, { query: { playerId: targetId }, body: {} });
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (d) => res.status(code).json(d) })
    };
    // 找到 sect-missions 的 /daily 处理器并调用
    const dailyLayer = sectMissionRouter.stack.find(l => l.route && l.route.path === '/daily');
    if (dailyLayer) {
      dailyLayer.route.stack[0].handle(mockReq, mockRes, () => {});
    } else {
      res.status(500).json({ success: false, message: '宗门任务模块未就绪' });
    }
  } catch (e) {
    res.status(500).json({ success: false, message: '宗门任务加载失败: ' + e.message });
  }
});

// POST /api/sect/dungeon/enter → 宗门副本挑战（兼容路由，代理到 dungeon/challenge）
router.post('/dungeon/enter', (req, res) => {
  const { playerId, userId, sectId, floor } = req.body;
  const targetId = parseInt(playerId) || parseInt(userId) || 1;
  const mockReq = Object.assign({}, req, {
    body: { playerId: targetId, sectId, floor }
  });
  const mockRes = {
    json: (data) => res.json(data),
    status: (code) => ({ json: (d) => res.status(code).json(d) })
  };
  const challengeLayer = router.stack.find(l => l.route && l.route.path === '/dungeon/challenge');
  if (challengeLayer) {
    challengeLayer.route.stack[0].handle(mockReq, mockRes, () => {});
  } else {
    res.status(404).json({ success: false, message: '宗门副本未开放' });
  }
});

// ========== 宗门申请审批系统 ==========

// POST /leave - 玩家离开宗门
router.post('/leave', (req, res) => {
  const player_id = parseInt(req.body.player_id) || parseInt(req.body.userId) || 1;

  if (!db) {
    return res.status(500).json({ success: false, message: '数据库不可用' });
  }

  try {
    const player = db.prepare('SELECT * FROM Users WHERE id = ?').get(player_id);
    if (!player) {
      return res.status(404).json({ success: false, message: '玩家不存在' });
    }
    if (!player.sectId) {
      return res.status(400).json({ success: false, message: '你不在任何宗门中' });
    }

    const sectId = player.sectId;

    // 掌门不能直接离开宗门
    const sect = db.prepare('SELECT * FROM sects WHERE id = ?').get(sectId);
    if (sect && sect.leaderId === player_id) {
      return res.status(400).json({
        success: false,
        message: '掌门不能直接离开宗门，请先转让掌门权'
      });
    }

    // 更新玩家 sectId
    db.prepare("UPDATE Users SET sectId = NULL, updatedAt = datetime('now') WHERE id = ?").run(player_id);
    // 宗门成员-1
    db.prepare("UPDATE Sects SET members = MAX(0, members - 1), updatedAt = datetime('now') WHERE id = ?").run(sectId);

    // 尝试从 SectMembers 删除记录（如果表存在）
    try {
      db.prepare('DELETE FROM SectMembers WHERE userId = ?').run(player_id);
    } catch (e) { /* 静默忽略 */ }

    return res.json({
      success: true,
      message: `已离开宗门「${sect?.name || '宗门'}」`
    });
  } catch (error) {
    console.error('[sect] /leave 错误:', error.message);
    return res.status(500).json({ success: false, message: '离开宗门失败: ' + error.message });
  }
});

// POST /apply - 玩家申请加入宗门
router.post('/apply', (req, res) => {
  const player_id = parseInt(req.body.player_id) || parseInt(req.body.userId) || 1;
  const sectId = parseInt(req.body.sectId);
  const message = req.body.message || '';

  if (!sectId) {
    return res.status(400).json({ success: false, message: '缺少 sectId 参数' });
  }

  if (!db) {
    return res.status(500).json({ success: false, message: '数据库不可用' });
  }

  try {
    // 检查玩家是否存在
    const player = db.prepare('SELECT * FROM Users WHERE id = ?').get(player_id);
    if (!player) {
      return res.status(404).json({ success: false, message: '玩家不存在' });
    }

    // 检查玩家是否已在宗门
    if (player.sectId) {
      return res.status(400).json({
        success: false,
        message: '你已在宗门中，请先退出当前宗门'
      });
    }

    // 检查宗门是否存在
    const sect = db.prepare('SELECT * FROM sects WHERE id = ?').get(sectId);
    if (!sect) {
      return res.status(404).json({ success: false, message: '宗门不存在' });
    }

    // 检查是否已有待处理的申请
    const existingApp = db.prepare(
      "SELECT * FROM sect_applications WHERE sect_id = ? AND player_id = ? AND status = 'pending'"
    ).get(sectId, player_id);
    if (existingApp) {
      return res.status(400).json({ success: false, message: '已有待处理的申请，请等待审批' });
    }

    // 插入申请记录
    db.prepare(
      "INSERT INTO sect_applications (sect_id, player_id, message, status, created_at) VALUES (?, ?, ?, 'pending', datetime('now'))"
    ).run(sectId, player_id, message);

    return res.json({
      success: true,
      message: `已提交加入「${sect.name}」的申请，请等待审批`
    });
  } catch (error) {
    // UNIQUE 约束冲突（已有申请）
    if (error.message.includes('UNIQUE')) {
      return res.status(400).json({ success: false, message: '已有待处理的申请，请等待审批' });
    }
    console.error('[sect] /apply 错误:', error.message);
    return res.status(500).json({ success: false, message: '申请失败: ' + error.message });
  }
});

// GET /applications - 查看当前玩家宗门的待处理申请（无需sectId参数，自动查找玩家宗门）
router.get('/applications', (req, res) => {
  const userId = req.userId || parseInt(req.query.userId) || parseInt(req.query.player_id) || 1;

  if (!db) {
    return res.status(500).json({ success: false, message: '数据库不可用' });
  }

  try {
    // 获取玩家宗门ID
    const player = db.prepare('SELECT sectId FROM Users WHERE id = ?').get(userId);
    if (!player || !player.sectId) {
      return res.json({ success: true, applications: [], message: '你尚未加入宗门' });
    }

    const applications = db.prepare(`
      SELECT sa.*, u.nickname as player_name, u.level as player_level
      FROM sect_applications sa
      LEFT JOIN Users u ON u.id = sa.player_id
      WHERE sa.sect_id = ? AND sa.status = 'pending'
      ORDER BY sa.created_at ASC
    `).all(player.sectId);

    return res.json({
      success: true,
      sectId: player.sectId,
      applications: applications.map(a => ({
        id: a.id,
        playerId: a.player_id,
        playerName: a.player_name || '玩家' + a.player_id,
        playerLevel: a.player_level || 1,
        message: a.message || '',
        status: a.status,
        createdAt: a.created_at
      }))
    });
  } catch (error) {
    console.error('[sect] /applications 错误:', error.message);
    return res.status(500).json({ success: false, message: '查询失败: ' + error.message });
  }
});

// GET /applications/:sectId - 查看宗门的待处理申请（掌门/长老）
router.get('/applications/:sectId', (req, res) => {
  const sectId = parseInt(req.params.sectId);

  if (!db) {
    return res.status(500).json({ success: false, message: '数据库不可用' });
  }

  try {
    const applications = db.prepare(`
      SELECT sa.*, u.nickname as player_name, u.level as player_level
      FROM sect_applications sa
      LEFT JOIN Users u ON u.id = sa.player_id
      WHERE sa.sect_id = ? AND sa.status = 'pending'
      ORDER BY sa.created_at ASC
    `).all(sectId);

    return res.json({
      success: true,
      applications: applications.map(a => ({
        id: a.id,
        playerId: a.player_id,
        playerName: a.player_name || '玩家' + a.player_id,
        playerLevel: a.player_level || 1,
        message: a.message || '',
        status: a.status,
        createdAt: a.created_at
      }))
    });
  } catch (error) {
    console.error('[sect] /applications 错误:', error.message);
    return res.status(500).json({ success: false, message: '查询失败: ' + error.message });
  }
});

// GET /my-applications - 查看当前玩家提交的入宗申请记录
router.get('/my-applications', (req, res) => {
  const playerId = parseInt(req.query.player_id) || parseInt(req.query.userId) || 1;

  if (!db) {
    return res.status(500).json({ success: false, message: '数据库不可用' });
  }

  try {
    // 获取当前玩家已提交的申请记录
    const applications = db.prepare(`
      SELECT sa.*, s.name as sect_name, s.icon as sect_icon, s.level as sect_level
      FROM sect_applications sa
      LEFT JOIN sects s ON s.id = sa.sect_id
      WHERE sa.player_id = ?
      ORDER BY sa.created_at DESC
      LIMIT 20
    `).all(playerId);

    return res.json({
      success: true,
      applications: applications.map(a => ({
        id: a.id,
        sectId: a.sect_id,
        sectName: a.sect_name || '宗门' + a.sect_id,
        sectIcon: a.sect_icon || '🏛️',
        sectLevel: a.sect_level || 1,
        message: a.message || '',
        status: a.status, // pending / approved / rejected
        createdAt: a.created_at,
        reviewedAt: a.reviewed_at
      }))
    });
  } catch (error) {
    console.error('[sect] /my-applications 错误:', error.message);
    return res.status(500).json({ success: false, message: '查询失败: ' + error.message });
  }
});

// POST /approve - 审批申请（approve=true通过，approve=false拒绝）
router.post('/approve', (req, res) => {
  const approver_id = parseInt(req.body.approver_id) || parseInt(req.body.userId) || 1;
  const applicationId = parseInt(req.body.applicationId);
  const approved = req.body.approved !== false; // 默认为 true（通过）

  if (!applicationId) {
    return res.status(400).json({ success: false, message: '缺少 applicationId 参数' });
  }

  if (!db) {
    return res.status(500).json({ success: false, message: '数据库不可用' });
  }

  try {
    // 查找申请
    const application = db.prepare('SELECT * FROM sect_applications WHERE id = ?').get(applicationId);
    if (!application) {
      return res.status(404).json({ success: false, message: '申请不存在' });
    }
    if (application.status !== 'pending') {
      return res.status(400).json({ success: false, message: '该申请已处理' });
    }

    const sectId = application.sect_id;
    const player_id = application.player_id;

    // 检查审批人是否是宗门掌门
    const approver = db.prepare('SELECT * FROM Users WHERE id = ?').get(approver_id);
    if (!approver || approver.sectId !== sectId) {
      return res.status(403).json({ success: false, message: '只有宗门成员可以审批' });
    }

    // 检查宗门人数上限
    const sect = db.prepare('SELECT * FROM sects WHERE id = ?').get(sectId);
    if (!sect) {
      return res.status(404).json({ success: false, message: '宗门不存在' });
    }
    const maxMembers = 10 + (sect.level || 1) * 5;
    if ((sect.members || 0) >= maxMembers) {
      return res.status(400).json({ success: false, message: `宗门人数已满（${sect.members}/${maxMembers}）` });
    }

    if (approved) {
      // 通过：更新 Users.sectId + Sects.members
      db.prepare("UPDATE Users SET sectId = ?, updatedAt = datetime('now') WHERE id = ?").run(sectId, player_id);
      db.prepare("UPDATE Sects SET members = members + 1, updatedAt = datetime('now') WHERE id = ?").run(sectId);

      // 更新申请状态
      db.prepare(
        "UPDATE sect_applications SET status = 'approved', reviewed_at = datetime('now'), reviewer_id = ? WHERE id = ?"
      ).run(approver_id, applicationId);

      // 尝试将申请者写入 SectMembers 表（如果该表存在）
      try {
        db.prepare(
          "INSERT INTO SectMembers (userId, sectId, role, joinedAt) VALUES (?, ?, '成员', datetime('now'))"
        ).run(player_id, sectId);
      } catch (e) {
        // SectMembers 表可能不存在，静默忽略
      }

      return res.json({
        success: true,
        message: `已批准玩家「${approver.nickname || '玩家' + player_id}」加入宗门`
      });
    } else {
      // 拒绝
      db.prepare(
        "UPDATE sect_applications SET status = 'rejected', reviewed_at = datetime('now'), reviewer_id = ? WHERE id = ?"
      ).run(approver_id, applicationId);

      return res.json({
        success: true,
        message: '已拒绝该申请'
      });
    }
  } catch (error) {
    console.error('[sect] /approve 错误:', error.message);
    return res.status(500).json({ success: false, message: '审批失败: ' + error.message });
  }
});

// GET /campfire/:sectId - 获取宗门篝火聊天历史
router.get('/campfire/:sectId', (req, res) => {
  const sectId = parseInt(req.params.sectId);
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const before = req.query.before; // optional cursor for pagination

  if (!db) return res.status(500).json({ success: false, message: '数据库不可用' });

  try {
    let messages;
    if (before) {
      messages = db.prepare(
        'SELECT * FROM campfire_messages WHERE sect_id = ? AND id < ? ORDER BY id DESC LIMIT ?'
      ).all(sectId, parseInt(before), limit);
    } else {
      messages = db.prepare(
        'SELECT * FROM campfire_messages WHERE sect_id = ? ORDER BY id DESC LIMIT ?'
      ).all(sectId, limit);
    }
    // 返回正序（ oldest → newest）
    res.json({ success: true, messages: messages.reverse(), hasMore: messages.length === limit });
  } catch (e) {
    console.error('[sect] /campfire/:sectId 错误:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /campfire/send - 发送篝火消息
router.post('/campfire/send', (req, res) => {
  const userId = parseInt(req.body.userId) || parseInt(req.body.player_id) || 1;
  const sectId = parseInt(req.body.sectId);
  const content = (req.body.content || '').trim();

  if (!sectId) return res.status(400).json({ success: false, message: '缺少 sectId' });
  if (!content || content.length === 0) return res.status(400).json({ success: false, message: '消息不能为空' });
  if (content.length > 200) return res.status(400).json({ success: false, message: '消息不能超过200字' });
  if (!db) return res.status(500).json({ success: false, message: '数据库不可用' });

  try {
    // 获取玩家宗门身份和昵称
    const player = db.prepare('SELECT nickname, sectId FROM Users WHERE id = ?').get(userId);
    if (!player) return res.status(404).json({ success: false, message: '玩家不存在' });
    if (player.sectId !== sectId) return res.status(403).json({ success: false, message: '你不在该宗门中' });

    const playerName = player.nickname || `玩家${userId}`;

    const result = db.prepare(
      'INSERT INTO campfire_messages (sect_id, player_id, player_name, content) VALUES (?, ?, ?, ?)'
    ).run(sectId, userId, playerName, content);

    res.json({
      success: true,
      message: {
        id: result.lastInsertRowid,
        sect_id: sectId,
        player_id: userId,
        player_name: playerName,
        content,
        created_at: new Date().toISOString()
      }
    });
  } catch (e) {
    console.error('[sect] /campfire/send 错误:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /campfire/members/:sectId - 获取宗门在线成员（本周有活跃的成员）
router.get('/campfire/members/:sectId', (req, res) => {
  const sectId = parseInt(req.params.sectId);
  if (!db) return res.status(500).json({ success: false, message: '数据库不可用' });

  try {
    const members = db.prepare(`
      SELECT u.id as player_id, u.nickname, sm.role, sm.contribution,
             COALESCE(messages.recent_count, 0) as message_count,
             messages.last_message_at
      FROM SectMembers sm
      JOIN Users u ON u.id = sm.userId
      LEFT JOIN (
        SELECT player_id, COUNT(*) as recent_count, MAX(created_at) as last_message_at
        FROM campfire_messages
        WHERE sect_id = ? AND created_at > datetime('now', '-7 days')
        GROUP BY player_id
      ) messages ON messages.player_id = sm.userId
      WHERE sm.sectId = ?
      ORDER BY sm.role = '掌门' DESC, sm.contribution DESC, sm.joinedAt ASC
    `).all(sectId, sectId);

    res.json({ success: true, sectId, members });
  } catch (e) {
    console.error('[sect] /campfire/members/:sectId 错误:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});


// =============================================
// 宗门科技树系统
// =============================================

// 创建 sect_techs 表
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sect_techs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sect_id INTEGER NOT NULL UNIQUE,
      tech_levels TEXT DEFAULT '{}',
      last_research_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('[sect] sect_techs 表检查完成');
} catch(e) {}

// 科技树定义
const SECT_TECHS = {
  attack: {
    name: '攻击研究',
    icon: '⚔️',
    color: '#e8a87c',
    tiers: [
      { level: 1, name: '基础攻击', cost: 1000, bonus: { attack: 10 }, desc: '全员攻击+10' },
      { level: 2, name: '攻击强化', cost: 3000, bonus: { attack: 25 }, desc: '全员攻击+25' },
      { level: 3, name: '攻击精通', cost: 8000, bonus: { attack: 50 }, desc: '全员攻击+50' },
      { level: 4, name: '攻击极致', cost: 20000, bonus: { attack: 100 }, desc: '全员攻击+100' },
      { level: 5, name: '天剑之境', cost: 50000, bonus: { attack: 200 }, desc: '全员攻击+200' },
    ]
  },
  defense: {
    name: '防御研究',
    icon: '🛡️',
    color: '#6ec6ca',
    tiers: [
      { level: 1, name: '基础防御', cost: 1000, bonus: { defense: 10 }, desc: '全员防御+10' },
      { level: 2, name: '防御强化', cost: 3000, bonus: { defense: 25 }, desc: '全员防御+25' },
      { level: 3, name: '防御精通', cost: 8000, bonus: { defense: 50 }, desc: '全员防御+50' },
      { level: 4, name: '防御极致', cost: 20000, bonus: { defense: 100 }, desc: '全员防御+100' },
      { level: 5, name: '不动如山', cost: 50000, bonus: { defense: 200 }, desc: '全员防御+200' },
    ]
  },
  cultivation: {
    name: '修炼研究',
    icon: '🧘',
    color: '#c9a96e',
    tiers: [
      { level: 1, name: '聚灵阵', cost: 1000, bonus: { cultivation_speed: 5 }, desc: '修炼效率+5%' },
      { level: 2, name: '聚灵阵·大', cost: 3000, bonus: { cultivation_speed: 12 }, desc: '修炼效率+12%' },
      { level: 3, name: '聚灵阵·极', cost: 8000, bonus: { cultivation_speed: 25 }, desc: '修炼效率+25%' },
      { level: 4, name: '万灵归元', cost: 20000, bonus: { cultivation_speed: 40 }, desc: '修炼效率+40%' },
      { level: 5, name: '天道感悟', cost: 50000, bonus: { cultivation_speed: 60 }, desc: '修炼效率+60%' },
    ]
  },
  resource: {
    name: '资源研究',
    icon: '💎',
    color: '#7ec8e3',
    tiers: [
      { level: 1, name: '灵石探测', cost: 1000, bonus: { spirit_stone_rate: 5 }, desc: '灵石收益+5%' },
      { level: 2, name: '灵石精炼', cost: 3000, bonus: { spirit_stone_rate: 12 }, desc: '灵石收益+12%' },
      { level: 3, name: '灵石聚拢', cost: 8000, bonus: { spirit_stone_rate: 25 }, desc: '灵石收益+25%' },
      { level: 4, name: '灵石通天', cost: 20000, bonus: { spirit_stone_rate: 40 }, desc: '灵石收益+40%' },
      { level: 5, name: '点石成金', cost: 50000, bonus: { spirit_stone_rate: 60 }, desc: '灵石收益+60%' },
    ]
  },
  luck: {
    name: '气运研究',
    icon: '🍀',
    color: '#a8e6cf',
    tiers: [
      { level: 1, name: '小吉', cost: 1000, bonus: { crit_rate: 3 }, desc: '暴击率+3%' },
      { level: 2, name: '中吉', cost: 3000, bonus: { crit_rate: 7 }, desc: '暴击率+7%' },
      { level: 3, name: '大吉', cost: 8000, bonus: { crit_rate: 12 }, desc: '暴击率+12%' },
      { level: 4, name: '大吉·极', cost: 20000, bonus: { crit_rate: 20 }, desc: '暴击率+20%' },
      { level: 5, name: '天命所归', cost: 50000, bonus: { crit_rate: 30 }, desc: '暴击率+30%' },
    ]
  },
  dungeon: {
    name: '副本研究',
    icon: '🏰',
    color: '#dda0dd',
    tiers: [
      { level: 1, name: '副本入门', cost: 1000, bonus: { dungeon_drop: 5 }, desc: '副本奖励+5%' },
      { level: 2, name: '副本精通', cost: 3000, bonus: { dungeon_drop: 12 }, desc: '副本奖励+12%' },
      { level: 3, name: '副本大师', cost: 8000, bonus: { dungeon_drop: 25 }, desc: '副本奖励+25%' },
      { level: 4, name: '副本宗师', cost: 20000, bonus: { dungeon_drop: 40 }, desc: '副本奖励+40%' },
      { level: 5, name: '副本主宰', cost: 50000, bonus: { dungeon_drop: 60 }, desc: '副本奖励+60%' },
    ]
  }
};

// 初始化宗门科技记录
function ensureSectTech(sectId) {
  try {
    const existing = db.prepare('SELECT * FROM sect_techs WHERE sect_id = ?').get(sectId);
    if (!existing) {
      db.prepare('INSERT INTO sect_techs (sect_id, tech_levels) VALUES (?, ?)').run(sectId, JSON.stringify({}));
    }
  } catch(e) {}
}

// 获取宗门科技状态
function getSectTechLevels(sectId) {
  try {
    const row = db.prepare('SELECT tech_levels FROM sect_techs WHERE sect_id = ?').get(sectId);
    return row ? JSON.parse(row.tech_levels || '{}') : {};
  } catch(e) { return {}; }
}

// 获取宗门科技提供的全员加成
function getSectTechBonuses(sectId) {
  const levels = getSectTechLevels(sectId);
  const bonuses = { attack: 0, defense: 0, cultivation_speed: 0, spirit_stone_rate: 0, crit_rate: 0, dungeon_drop: 0 };
  
  for (const [category, level] of Object.entries(levels)) {
    const tech = SECT_TECHS[category];
    if (!tech || level < 1) continue;
    const tier = tech.tiers[level - 1];
    if (!tier) continue;
    for (const [stat, value] of Object.entries(tier.bonus)) {
      if (bonuses.hasOwnProperty(stat)) bonuses[stat] += value;
    }
  }
  return bonuses;
}

// 科技树列表
router.get('/tech', (req, res) => {
  const { sectId } = req.query;
  if (!sectId) return res.json({ success: false, message: '缺少宗门ID' });
  
  ensureSectTech(sectId);
  const levels = getSectTechLevels(sectId);
  const bonuses = getSectTechBonuses(sectId);
  
  // 组装前端需要的格式
  const techTree = Object.entries(SECT_TECHS).map(([key, cat]) => {
    const currentLevel = levels[key] || 0;
    const nextTier = cat.tiers[currentLevel];
    const canResearch = nextTier ? { ...nextTier } : null;
    
    return {
      category: key,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      currentLevel,
      maxLevel: cat.tiers.length,
      currentBonus: currentLevel > 0 ? cat.tiers[currentLevel - 1].bonus : {},
      nextTier,
      isMaxed: currentLevel >= cat.tiers.length
    };
  });
  
  res.json({ success: true, techTree, totalBonuses: bonuses });
});

// 研究科技
router.post('/tech/research', (req, res) => {
  const { sectId, playerId, category } = req.body;
  if (!sectId || !playerId || !category) {
    return res.json({ success: false, message: '参数不完整' });
  }
  
  const tech = SECT_TECHS[category];
  if (!tech) return res.json({ success: false, message: '科技类别不存在' });
  
  ensureSectTech(sectId);
  const levels = getSectTechLevels(sectId);
  const currentLevel = levels[category] || 0;
  
  if (currentLevel >= tech.tiers.length) {
    return res.json({ success: false, message: '科技已满级' });
  }
  
  const nextTier = tech.tiers[currentLevel];
  
  // 检查玩家是否是宗门掌门（简化：掌门或长老）
  const sect = db.prepare('SELECT leaderId FROM sects WHERE id = ?').get(sectId);
  if (!sect) return res.json({ success: false, message: '宗门不存在' });
  if (sect.leaderId !== parseInt(playerId)) {
    return res.json({ success: false, message: '只有掌门才能研究科技' });
  }
  
  // 检查宗门资金（灵石）是否足够
  const sectData = db.prepare('SELECT funds FROM sects WHERE id = ?').get(sectId);
  if (!sectData || sectData.funds < nextTier.cost) {
    return res.json({ success: false, message: `宗门资金不足（需要${nextTier.cost}灵石）` });
  }
  
  // 扣除资金并升级科技
  db.prepare('UPDATE sects SET funds = funds - ? WHERE id = ?').run(nextTier.cost, sectId);
  levels[category] = currentLevel + 1;
  db.prepare('UPDATE sect_techs SET tech_levels = ?, updated_at = CURRENT_TIMESTAMP WHERE sect_id = ?').run(JSON.stringify(levels), sectId);
  
  res.json({
    success: true,
    newLevel: currentLevel + 1,
    cost: nextTier.cost,
    bonus: nextTier.bonus,
    totalBonuses: getSectTechBonuses(sectId),
    remainingFunds: sectData.funds - nextTier.cost
  });
});

// 获取宗门成员科技加成
router.get('/tech/bonuses', (req, res) => {
  const { sectId } = req.query;
  if (!sectId) return res.json({ success: false, message: '缺少宗门ID' });
  
  ensureSectTech(sectId);
  const bonuses = getSectTechBonuses(sectId);
  const levels = getSectTechLevels(sectId);
  
  res.json({ success: true, bonuses, techLevels: levels });
});

// ==================== 宗门战系统 (帮战/跨服联赛) ====================

// 宗门战配置
const SECT_WAR_CONFIG = {
  seasonDuration: 7 * 24 * 60 * 60 * 1000, // 赛季7天
  matchDuration: 15 * 60 * 1000, // 比赛15分钟
  entryCost: 1000, // 参赛费用1000灵石
  maxMembersPerSide: 10, // 每边最多10人参战
  winPoints: 3, // 胜利获得3分
  drawPoints: 1, // 平局获得1分
  losePoints: 0  // 失败获得0分
};

// 初始化 sect_war 表
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sect_wars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      season_id INTEGER DEFAULT 1,
      sect_a_id INTEGER NOT NULL,
      sect_b_id INTEGER NOT NULL,
      sect_a_score INTEGER DEFAULT 0,
      sect_b_score INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','fighting','finished')),
      winner_id INTEGER,
      started_at DATETIME,
      finished_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(season_id, sect_a_id, sect_b_id)
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_war_season ON sect_wars(season_id)`);
  
  // 宗门战赛季表
  db.exec(`
    CREATE TABLE IF NOT EXISTS sect_war_seasons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      season_num INTEGER NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','fighting','finished')),
      started_at DATETIME,
      finished_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // 宗门参战记录
  db.exec(`
    CREATE TABLE IF NOT EXISTS sect_war_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      war_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      sect_id INTEGER NOT NULL,
      kill_count INTEGER DEFAULT 0,
      damage_dealt INTEGER DEFAULT 0,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(war_id, player_id)
    )
  `);
  console.log('[sect] 宗门战表初始化完成');
} catch(e) { console.log('[sect] sect_wars:', e.message); }

// 获取当前赛季信息
function getCurrentSeason() {
  try {
    let season = db.prepare('SELECT * FROM sect_war_seasons WHERE status != "finished" ORDER BY id DESC LIMIT 1').get();
    if (!season) {
      // 创建新赛季
      const result = db.prepare('INSERT INTO sect_war_seasons (season_num, status, started_at) VALUES (?, "pending", datetime("now"))').run(1);
      season = { id: result.lastInsertRowid, season_num: 1, status: 'pending' };
    }
    return season;
  } catch(e) { return { id: 1, season_num: 1, status: 'pending' }; }
}

// 获取当前赛季排名
router.get('/war/ranking', (req, res) => {
  const sectId = parseInt(req.query.sectId);
  
  try {
    const season = getCurrentSeason();
    const rankings = db.prepare(`
      SELECT s.id, s.name, s.level,
        COALESCE(SUM(CASE WHEN w.winner_id = s.id THEN 3 ELSE 0 END), 0) as wins,
        COALESCE(SUM(CASE WHEN w.sect_a_id = s.id OR w.sect_b_id = s.id THEN 1 ELSE 0 END), 0) as battles,
        COALESCE(SUM(CASE WHEN w.sect_a_id = s.id THEN w.sect_a_score ELSE w.sect_b_score END), 0) as total_score
      FROM sects s
      LEFT JOIN sect_wars w ON (w.sect_a_id = s.id OR w.sect_b_id = s.id) AND w.season_id = ?
      WHERE s.members > 0
      GROUP BY s.id
      ORDER BY wins DESC, total_score DESC
      LIMIT 20
    `).all(season.id);
    
    // 玩家宗门排名
    let myRank = null;
    if (sectId) {
      myRank = rankings.findIndex(r => r.id === sectId) + 1;
    }
    
    res.json({ success: true, rankings, myRank, season });
  } catch(e) {
    res.json({ success: false, message: e.message });
  }
});

// 宗门战报名
router.post('/war/signup', (req, res) => {
  const playerId = parseInt(req.body.player_id) || 1;
  const sectId = parseInt(req.body.sectId);
  
  if (!db) return res.json({ success: false, message: '数据库未连接' });
  if (!sectId) return res.json({ success: false, message: '缺少宗门ID' });
  
  try {
    // 检查玩家是否是掌门/长老
    const member = db.prepare('SELECT role FROM SectMembers WHERE userId = ? AND sectId = ?').get(playerId, sectId);
    if (!member || !['掌门', '长老'].includes(member.role)) {
      return res.json({ success: false, message: '只有掌门或长老可以发起宗门战' });
    }
    
    // 检查宗门是否有足够资金
    const sect = db.prepare('SELECT funds FROM sects WHERE id = ?').get(sectId);
    if (!sect || (sect.funds || 0) < SECT_WAR_CONFIG.entryCost) {
      return res.json({ success: false, message: `宗门资金不足，需要${SECT_WAR_CONFIG.entryCost}灵石` });
    }
    
    // 检查是否有待匹配的宗门
    const pending = db.prepare(`
      SELECT w.*, s.name as sect_name FROM sect_wars w
      JOIN sects s ON s.id = CASE WHEN w.sect_a_id = ? THEN w.sect_b_id ELSE w.sect_a_id END
      WHERE w.status = 'pending' AND w.season_id = ? AND w.sect_a_id != ? AND w.sect_b_id != ?
      LIMIT 1
    `).get(sectId, getCurrentSeason().id, sectId, sectId);
    
    if (pending) {
      // 匹配成功，开始战斗
      db.prepare('UPDATE sect_wars SET status = "fighting", started_at = datetime("now") WHERE id = ?').run(pending.id);
      db.prepare('UPDATE sects SET funds = funds - ? WHERE id = ?').run(SECT_WAR_CONFIG.entryCost, sectId);
      
      return res.json({
        success: true,
        matched: true,
        warId: pending.id,
        opponent: { id: pending.sect_a_id === sectId ? pending.sect_b_id : pending.sect_a_id, name: pending.sect_name },
        message: `匹配成功！宗门战开始！`
      });
    } else {
      // 创建等待匹配
      db.prepare('UPDATE sects SET funds = funds - ? WHERE id = ?').run(SECT_WAR_CONFIG.entryCost, sectId);
      db.prepare(`INSERT INTO sect_wars (season_id, sect_a_id, status) VALUES (?, ?, 'pending')`).run(getCurrentSeason().id, sectId);
      
      return res.json({ success: true, matched: false, message: '已发布宗门战匹配，等待其他宗门应战...' });
    }
  } catch(e) {
    res.json({ success: false, message: e.message });
  }
});

// 宗门战斗/攻击
router.post('/war/attack', (req, res) => {
  const playerId = parseInt(req.body.player_id) || 1;
  const warId = parseInt(req.body.warId);
  const damage = parseInt(req.body.damage) || 0;
  
  if (!db) return res.json({ success: false, message: '数据库未连接' });
  
  try {
    const war = db.prepare('SELECT * FROM sect_wars WHERE id = ?').get(warId);
    if (!war || war.status !== 'fighting') {
      return res.json({ success: false, message: '战斗不存在或已结束' });
    }
    
    // 获取玩家宗门
    const player = db.prepare('SELECT sectId FROM Users WHERE id = ?').get(playerId);
    if (!player || (player.sectId !== war.sect_a_id && player.sectId !== war.sect_b_id)) {
      return res.json({ success: false, message: '你不是参战宗门成员' });
    }
    
    const isSideA = player.sectId === war.sect_a_id;
    
    // 更新参战记录
    const existingMember = db.prepare('SELECT * FROM sect_war_members WHERE war_id = ? AND player_id = ?').get(warId, playerId);
    if (!existingMember) {
      db.prepare('INSERT INTO sect_war_members (war_id, player_id, sect_id, damage_dealt) VALUES (?, ?, ?, ?)').run(warId, playerId, player.sectId, damage);
    } else {
      db.prepare('UPDATE sect_war_members SET damage_dealt = damage_dealt + ?, kill_count = kill_count + (CASE WHEN ? > 500 THEN 1 ELSE 0 END) WHERE war_id = ? AND player_id = ?').run(damage, damage, warId, playerId);
    }
    
    // 更新比分
    if (isSideA) {
      db.prepare('UPDATE sect_wars SET sect_a_score = sect_a_score + ? WHERE id = ?').run(Math.floor(damage / 100), warId);
    } else {
      db.prepare('UPDATE sect_wars SET sect_b_score = sect_b_score + ? WHERE id = ?').run(Math.floor(damage / 100), warId);
    }
    
    // 获取更新后的比分
    const updatedWar = db.prepare('SELECT sect_a_score, sect_b_score FROM sect_wars WHERE id = ?').get(warId);
    
    res.json({
      success: true,
      damage,
      score: { sectA: updatedWar.sect_a_score, sectB: updatedWar.sect_b_score },
      message: `攻击造成${damage}伤害`
    });
  } catch(e) {
    res.json({ success: false, message: e.message });
  }
});

// 结束宗门战（定时器或手动）
router.post('/war/finish', (req, res) => {
  const warId = parseInt(req.body.warId);
  
  if (!db) return res.json({ success: false, message: '数据库未连接' });
  
  try {
    const war = db.prepare('SELECT * FROM sect_wars WHERE id = ?').get(warId);
    if (!war || war.status !== 'fighting') {
      return res.json({ success: false, message: '战斗不存在或已结束' });
    }
    
    const winnerId = war.sect_a_score >= war.sect_b_score ? war.sect_a_id : war.sect_b_id;
    const isDraw = war.sect_a_score === war.sect_b_score;
    
    db.prepare('UPDATE sect_wars SET status = "finished", winner_id = ?, finished_at = datetime("now") WHERE id = ?').run(winnerId || null, warId);
    
    // 奖励获胜宗门
    if (!isDraw && winnerId) {
      const reward = 2000; // 获胜奖励
      db.prepare('UPDATE sects SET contribution = contribution + ?, funds = funds + ? WHERE id = ?').run(reward, reward, winnerId);
    }
    
    res.json({
      success: true,
      winnerId,
      isDraw,
      score: { sectA: war.sect_a_score, sectB: war.sect_b_score },
      reward: isDraw ? 0 : 2000,
      message: isDraw ? '平局！双方不分胜负' : `宗门战结束，获胜方获得2000贡献度和灵石！`
    });
  } catch(e) {
    res.json({ success: false, message: e.message });
  }
});

// 获取宗门战详情
router.get('/war/info', (req, res) => {
  const warId = parseInt(req.query.warId);
  
  if (!db) return res.json({ success: false, message: '数据库未连接' });
  
  try {
    const war = db.prepare(`
      SELECT w.*, 
        sa.name as sect_a_name, sb.name as sect_b_name
      FROM sect_wars w
      JOIN sects sa ON sa.id = w.sect_a_id
      JOIN sects sb ON sb.id = w.sect_b_id
      WHERE w.id = ?
    `).get(warId);
    
    if (!war) return res.json({ success: false, message: '战斗不存在' });
    
    const members = db.prepare('SELECT * FROM sect_war_members WHERE war_id = ? ORDER BY damage_dealt DESC LIMIT 10').all(warId);
    
    res.json({ success: true, war, members });
  } catch(e) {
    res.json({ success: false, message: e.message });
  }
});

// ==================== 贡献兑换系统 ====================

// 贡献商店配置
const CONTRIBUTION_SHOP = {
  // 称号类
  'title_elder': { name: '长老称号', icon: '📛', cost: 1000, type: 'title', value: '长老', desc: '宗门长老专属称号' },
  'title_senior': { name: '太上长老', icon: '📛', cost: 5000, type: 'title', value: '太上长老', desc: '宗门太上长老专属称号' },
  'title_founder': { name: '创派祖师', icon: '📛', cost: 20000, type: 'title', value: '创派祖师', desc: '开宗立派的传奇称号' },
  // 功法类
  'gongfa_basic': { name: '基础功法', icon: '📖', cost: 2000, type: 'gongfa', value: 'sect_basic', desc: '宗门基础修炼功法' },
  'gongfa_advanced': { name: '玄阶功法', icon: '📖', cost: 8000, type: 'gongfa', value: 'sect_advanced', desc: '宗门进阶修炼功法' },
  // 道具类
  'pill_cultivation': { name: '修炼加速丸', icon: '🧪', cost: 500, type: 'item', value: 'cultivation_speed', count: 10, desc: '提升修炼速度50%' },
  'pill_breakthrough': { name: '破境丹', icon: '💊', cost: 2000, type: 'item', value: 'breakthrough', count: 1, desc: '增加突破成功率30%' },
  'material_strengthen': { name: '强化石', icon: '💎', cost: 800, type: 'item', value: 'strengthen', count: 5, desc: '装备强化材料' }
};

// 获取贡献商店列表
router.get('/contribution/shop', (req, res) => {
  const playerId = parseInt(req.query.player_id) || 1;
  
  if (!db) return res.json({ success: false, message: '数据库未连接' });
  
  try {
    const member = db.prepare('SELECT contribution FROM SectMembers WHERE userId = ?').get(playerId);
    const currentContrib = member?.contribution || 0;
    
    const items = Object.entries(CONTRIBUTION_SHOP).map(([key, item]) => ({
      key,
      ...item,
      canBuy: currentContrib >= item.cost
    }));
    
    res.json({ success: true, items, currentContrib });
  } catch(e) {
    res.json({ success: false, message: e.message });
  }
});

// 兑换物品
router.post('/contribution/exchange', (req, res) => {
  const playerId = parseInt(req.body.player_id) || 1;
  const itemKey = req.body.item_key;
  
  if (!db) return res.json({ success: false, message: '数据库未连接' });
  if (!itemKey || !CONTRIBUTION_SHOP[itemKey]) {
    return res.json({ success: false, message: '物品不存在' });
  }
  
  try {
    const member = db.prepare('SELECT contribution, sectId FROM SectMembers WHERE userId = ?').get(playerId);
    if (!member) return res.json({ success: false, message: '你还没有加入宗门' });
    
    const item = CONTRIBUTION_SHOP[itemKey];
    if (member.contribution < item.cost) {
      return res.json({ success: false, message: `贡献度不足，需要${item.cost}贡献度` });
    }
    
    // 扣除贡献度
    db.prepare('UPDATE SectMembers SET contribution = contribution - ? WHERE userId = ?').run(item.cost, playerId);
    
    // TODO: 发放物品到玩家背包（需要背包系统）
    // 这里先记录到日志
    console.log(`[sect] 玩家${playerId}兑换${item.name}，消耗${item.cost}贡献度`);
    
    res.json({
      success: true,
      item: item.name,
      cost: item.cost,
      remainingContrib: member.contribution - item.cost,
      message: `成功兑换${item.name}！`
    });
  } catch(e) {
    res.json({ success: false, message: e.message });
  }
});

module.exports = router;
