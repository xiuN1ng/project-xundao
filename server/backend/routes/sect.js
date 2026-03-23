const express = require('express');
const router = express.Router();

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
  const packet = { id: Date.now(), playerId: player_id, amount, type, message, remaining: amount, createdAt: new Date() };
  redPackets.push(packet);
  res.json({ success: true, packet });
});

// /redpacket/claim - 领取红包
router.post('/redpacket/claim', (req, res) => {
  const { player_id, packet_id } = req.body;
  const packet = redPackets.find(p => p.id === packet_id);
  if (!packet) return res.json({ success: false, message: '红包不存在' });
  if (packet.remaining <= 0) return res.json({ success: false, message: '红包已领完' });
  
  const claimAmount = Math.floor(packet.amount / packet.remaining);
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
  const { name } = req.body;
  sect = {
    id: Date.now(),
    name: name || '新宗门',
    level: 1,
    icon: '🏯',
    members: 1,
    rank: 999,
    contribution: 0
  };
  res.json(sect);
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

module.exports = router;
