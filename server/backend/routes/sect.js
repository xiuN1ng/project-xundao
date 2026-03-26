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
router.get('/', (req, res) => {
  res.json({ sect, members });
});

// /info - 宗门详细信息
router.get('/info', (req, res) => {
  const playerId = parseInt(req.query.player_id) || 1;
  res.json({ success: true, sect, memberCount: members.length });
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
    const sectInfo = db.prepare('SELECT * FROM Sects WHERE id = ?').get(user.sectId);
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

// /members - 宗门成员列表
router.get('/members', (req, res) => {
  res.json({ success: true, members });
});

// /member/kick - 踢出成员
router.post('/member/kick', (req, res) => {
  const { player_id, target_id } = req.body;
  const idx = members.findIndex(m => m.id === target_id);
  if (idx !== -1) {
    members.splice(idx, 1);
    res.json({ success: true, message: '成员已移除' });
  } else {
    res.json({ success: false, message: '成员不存在' });
  }
});

// /member/promote - 晋升成员
router.post('/member/promote', (req, res) => {
  const { player_id, target_id, new_role } = req.body;
  const member = members.find(m => m.id === target_id);
  if (member) {
    member.role = new_role || '长老';
    res.json({ success: true, member });
  } else {
    res.json({ success: false, message: '成员不存在' });
  }
});

// /member/transfer - 转让掌门
router.post('/member/transfer', (req, res) => {
  const { player_id, target_id } = req.body;
  const oldLeader = members.find(m => m.role === '掌门');
  const newLeader = members.find(m => m.id === target_id);
  if (oldLeader && newLeader) {
    oldLeader.role = '成员';
    newLeader.role = '掌门';
    res.json({ success: true, message: '掌门已转让' });
  } else {
    res.json({ success: false, message: '转让失败' });
  }
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
router.get('/dungeon', (req, res) => {
  res.json({ success: true, dungeons: sectDungeons });
});

// /dungeon/challenge - 挑战宗门副本
router.post('/dungeon/challenge', (req, res) => {
  const { player_id, floor, difficulty } = req.body;
  const dungeon = sectDungeons.find(d => d.floor === floor);
  if (!dungeon) return res.json({ success: false, message: '副本不存在' });
  if (!dungeon.unlocked) return res.json({ success: false, message: '副本未解锁' });
  
  const success = Math.random() > 0.3;
  res.json({ success, message: success ? '挑战成功!' : '挑战失败', dungeon, rewards: success ? { exp: 1000, contribution: 50 } : null });
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
  const { player_id, amount } = req.body;
  sect.contribution += amount || 100;
  res.json({ success: true, message: '捐赠成功', contribution: sect.contribution });
});

// 创建宗门
router.post('/create', (req, res) => {
  const { player_id, name } = req.body;
  const creatorId = parseInt(player_id) || 1;
  const sectName = name || '新宗门';
  const now = new Date().toISOString();

  if (!db) {
    return res.json({ success: false, message: '数据库未连接' });
  }

  try {
    // 检查玩家是否存在
    const player = db.prepare('SELECT id, sectId FROM Users WHERE id = ?').get(creatorId);
    if (!player) {
      return res.json({ success: false, message: '玩家不存在' });
    }

    // 检查是否已有宗门
    if (player.sectId) {
      return res.json({ success: false, message: '已有宗门，无法创建' });
    }

    // 插入 Sects 表
    const stmt = db.prepare(`
      INSERT INTO Sects (name, leaderId, level, members, contribution, rank, createdAt, updatedAt)
      VALUES (?, ?, 1, 1, 0, 999, ?, ?)
    `);
    const result = stmt.run(sectName, creatorId, now, now);
    const newSectId = result.lastInsertRowid;

    // 更新玩家的 sectId
    db.prepare('UPDATE Users SET sectId = ? WHERE id = ?').run(newSectId, creatorId);

    const newSect = db.prepare('SELECT * FROM Sects WHERE id = ?').get(newSectId);

    return res.json({
      success: true,
      sect: {
        id: newSect.id,
        name: newSect.name,
        level: newSect.level,
        icon: '🏯',
        memberCount: newSect.members,
        leaderId: newSect.leaderId,
        rank: newSect.rank,
        contribution: newSect.contribution,
        createdAt: newSect.createdAt
      }
    });
  } catch (e) {
    console.log('[sect] create错误:', e.message);
    return res.json({ success: false, message: '创建宗门失败: ' + e.message });
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
        SELECT s.*, COALESCE(u.nickname, '掌门') as leader_name
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
      const currentSect = db.prepare('SELECT name FROM Sects WHERE id = ?').get(player.sectId);
      return res.status(400).json({
        success: false,
        message: `你已在宗门「${currentSect?.name || '未知'}」中，请先退出再申请`
      });
    }

    // 检查宗门是否存在
    const sect = db.prepare('SELECT * FROM Sects WHERE id = ?').get(sectId);
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
    db.prepare('UPDATE Users SET sectId = ?, updatedAt = datetime("now") WHERE id = ?').run(sectId, player_id);

    // 宗门成员+1
    db.prepare('UPDATE Sects SET members = members + 1, updatedAt = datetime("now") WHERE id = ?').run(sectId);

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

module.exports = router;
