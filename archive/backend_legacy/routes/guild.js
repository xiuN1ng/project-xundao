const express = require('express');
const router = express.Router();

// 仙盟配置
const guildConfig = {
  maxMembers: 50,
  maxNameLength: 10,
  createCost: 10000, // 创建消耗灵石
  levelExp: [0, 1000, 3000, 8000, 20000, 50000], // 每级经验
  skillLevels: {
    1: { name: '灵兽祝福', desc: '灵兽属性+5%', cost: 5000 },
    2: { name: '功法加成', desc: '功法效果+5%', cost: 8000 },
    3: { name: '修炼加速', desc: '修炼速度+10%', cost: 10000 },
    4: { name: '掉落提升', desc: '掉落率+5%', cost: 15000 },
    5: { name: '全员守护', desc: '全体防御+10%', cost: 20000 }
  }
};

// 仙盟数据
let guilds = {
  1: {
    id: 1,
    name: '青云宗',
    leaderId: 1,
    leaderName: 'test',
    level: 3,
    exp: 1500,
    notice: '欢迎加入青云宗！',
    members: [
      { id: 1, name: 'test', role: 'leader', joinTime: Date.now() - 86400000 * 30 }
    ],
    skills: { 1: 3, 2: 2, 3: 1 },
    createTime: Date.now() - 86400000 * 30
  }
};

let guildIdCounter = 2;

// 获取仙盟列表
router.get('/list', (req, res) => {
  const { page, limit, keyword } = req.query;
  let list = Object.values(guilds);
  
  if (keyword) {
    list = list.filter(g => g.name.includes(keyword));
  }
  
  const pageNum = parseInt(page) || 1;
  const pageSize = parseInt(limit) || 20;
  const total = list.length;
  
  list = list.slice((pageNum - 1) * pageSize, pageNum * pageSize);
  
  // 不返回成员详情
  const simpleList = list.map(g => ({
    id: g.id,
    name: g.name,
    level: g.level,
    memberCount: g.members.length,
    leaderName: g.leaderName
  }));
  
  res.json({ list: simpleList, total, page: pageNum });
});

// 获取仙盟详情
router.get('/:id', (req, res) => {
  const guildId = parseInt(req.params.id);
  const guild = guilds[guildId];
  
  if (!guild) {
    return res.json({ success: false, message: '仙盟不存在' });
  }
  
  res.json(guild);
});

// 玩家所属仙盟
router.get('/player/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  
  const playerGuild = Object.values(guilds).find(g => 
    g.members.some(m => m.id === userId)
  );
  
  if (!playerGuild) {
    return res.json({ guild: null });
  }
  
  const member = playerGuild.members.find(m => m.id === userId);
  
  res.json({
    guild: {
      ...playerGuild,
      myRole: member?.role,
      joinTime: member?.joinTime
    }
  });
});

// 创建仙盟
router.post('/create', (req, res) => {
  const { userId, name, leaderName } = req.body;
  
  // 检查名称
  if (!name || name.length < 2 || name.length > guildConfig.maxNameLength) {
    return res.json({ success: false, message: '仙盟名称长度需2-10字' });
  }
  
  // 检查是否已有仙盟
  const existingGuild = Object.values(guilds).find(g => 
    g.members.some(m => m.id === userId)
  );
  
  if (existingGuild) {
    return res.json({ success: false, message: '已有仙盟' });
  }
  
  // 检查名称是否重复
  const nameExists = Object.values(guilds).some(g => g.name === name);
  if (nameExists) {
    return res.json({ success: false, message: '仙盟名称已存在' });
  }
  
  const guild = {
    id: guildIdCounter++,
    name,
    leaderId: userId,
    leaderName,
    level: 1,
    exp: 0,
    notice: '欢迎加入' + name,
    members: [
      { id: userId, name: leaderName, role: 'leader', joinTime: Date.now() }
    ],
    skills: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    createTime: Date.now()
  };
  
  guilds[guild.id] = guild;
  
  res.json({ success: true, guild, message: '仙盟创建成功' });
});

// 加入仙盟
router.post('/join', (req, res) => {
  const { userId, userName, guildId } = req.body;
  const guild = guilds[guildId];
  
  if (!guild) {
    return res.json({ success: false, message: '仙盟不存在' });
  }
  
  if (guild.members.length >= guildConfig.maxMembers) {
    return res.json({ success: false, message: '仙盟已满' });
  }
  
  // 检查是否已有仙盟
  const existingGuild = Object.values(guilds).find(g => 
    g.members.some(m => m.id === userId)
  );
  
  if (existingGuild) {
    return res.json({ success: false, message: '已有仙盟' });
  }
  
  guild.members.push({
    id: userId,
    name: userName,
    role: 'member',
    joinTime: Date.now()
  });
  
  res.json({ success: true, message: '加入成功' });
});

// 退出仙盟
router.post('/leave', (req, res) => {
  const { userId, guildId } = req.body;
  const guild = guilds[guildId];
  
  if (!guild) {
    return res.json({ success: false, message: '仙盟不存在' });
  }
  
  if (guild.leaderId === userId) {
    return res.json({ success: false, message: '盟主无法退出' });
  }
  
  guild.members = guild.members.filter(m => m.id !== userId);
  
  res.json({ success: true, message: '已退出仙盟' });
});

// 修改公告
router.post('/notice', (req, res) => {
  const { userId, guildId, notice } = req.body;
  const guild = guilds[guildId];
  
  if (!guild) {
    return res.json({ success: false, message: '仙盟不存在' });
  }
  
  if (guild.leaderId !== userId) {
    return res.json({ success: false, message: '只有盟主可修改公告' });
  }
  
  guild.notice = notice || '';
  
  res.json({ success: true, message: '公告已更新' });
});

// 升级仙盟技能
router.post('/skill/upgrade', (req, res) => {
  const { userId, guildId, skillId } = req.body;
  const guild = guilds[guildId];
  
  if (!guild) {
    return res.json({ success: false, message: '仙盟不存在' });
  }
  
  if (guild.leaderId !== userId) {
    return res.json({ success: false, message: '只有盟主可升级技能' });
  }
  
  const skillConfig = guildConfig.skillLevels[skillId];
  if (!skillConfig) {
    return res.json({ success: false, message: '技能不存在' });
  }
  
  const currentLevel = guild.skills[skillId] || 0;
  if (currentLevel >= 5) {
    return res.json({ success: false, message: '技能已满级' });
  }
  
  guild.skills[skillId] = currentLevel + 1;
  
  res.json({ 
    success: true, 
    skill: skillId,
    level: guild.skills[skillId],
    message: `${skillConfig.name}升级到${guild.skills[skillId]}级` 
  });
});

// 获取仙盟技能效果
router.get('/skill/:guildId', (req, res) => {
  const guildId = parseInt(req.params.guildId);
  const guild = guilds[guildId];
  
  if (!guild) {
    return res.json({ success: false, message: '仙盟不存在' });
  }
  
  const skills = Object.entries(guild.skills).map(([id, level]) => ({
    id: parseInt(id),
    ...guildConfig.skillLevels[id],
    level
  }));
  
  res.json({ skills });
});

module.exports = router;
