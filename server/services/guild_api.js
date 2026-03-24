/**
 * 仙盟系统 API (guild_api.js)
 * 完整的仙盟 CRUD + 建筑 + 技能树
 */

const express = require('express');
const router = express.Router();

// 延迟加载依赖
let guildStorage, db;

function loadDeps() {
  if (!guildStorage) {
    try {
      guildStorage = require('./guild_storage');
      guildStorage.initGuildTables();
    } catch (e) {
      console.error('加载guild_storage失败:', e.message);
    }
  }
  if (!db) {
    try {
      const server = require('../../server');
      db = server.db;
    } catch (e) {
      const Database = require('better-sqlite3');
      const path = require('path');
      const dbPath = path.join(__dirname, '..', 'data', 'game.db');
      db = new Database(dbPath);
    }
  }
}

// ============================================================
// 仙盟列表
// ============================================================
router.get('/list', (req, res) => {
  loadDeps();
  const { page, limit, keyword } = req.query;
  const result = guildStorage.getGuildList({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    keyword: keyword || '',
  });
  res.json({ success: true, ...result });
});

// ============================================================
// 仙盟详情
// ============================================================
router.get('/:id', (req, res) => {
  loadDeps();
  const guildId = parseInt(req.params.id);
  const guild = guildStorage.getGuild(guildId);
  if (!guild) return res.json({ success: false, message: '仙盟不存在' });
  res.json({ success: true, guild });
});

// ============================================================
// 玩家仙盟
// ============================================================
router.get('/player/:userId', (req, res) => {
  loadDeps();
  const userId = parseInt(req.params.userId);
  const result = guildStorage.getPlayerGuild(userId);
  res.json({ guild: result });
});

// ============================================================
// 创建仙盟
// ============================================================
router.post('/create', (req, res) => {
  loadDeps();
  const { userId, name, leaderName, realmLevel } = req.body;

  if (!name || name.length < 2 || name.length > 10) {
    return res.json({ success: false, message: '仙盟名称长度需2-10字' });
  }

  const result = guildStorage.createGuild({ name, leaderId: userId, leaderName, realmLevel: realmLevel || 0 });
  res.json(result);
});

// ============================================================
// 解散仙盟
// ============================================================
router.post('/dissolve', (req, res) => {
  loadDeps();
  const { guildId, playerId } = req.body;
  const result = guildStorage.dissolveGuild(guildId, playerId);
  res.json(result);
});

// ============================================================
// 升级仙盟
// ============================================================
router.post('/upgrade', (req, res) => {
  loadDeps();
  const { guildId, playerId } = req.body;
  const result = guildStorage.upgradeGuild(guildId, playerId);
  res.json(result);
});

// ============================================================
// 申请加入
// ============================================================
router.post('/apply', (req, res) => {
  loadDeps();
  const { guildId, playerId, playerName, message } = req.body;
  const result = guildStorage.applyToGuild({ guildId, playerId, playerName, message });
  res.json(result);
});

// ============================================================
// 获取申请列表
// ============================================================
router.get('/applications/:guildId', (req, res) => {
  loadDeps();
  const guildId = parseInt(req.params.guildId);
  const playerId = parseInt(req.query.playerId) || 0;
  const result = guildStorage.getGuildApplications(guildId, playerId);
  res.json(result);
});

// ============================================================
// 审批申请
// ============================================================
router.post('/application/review', (req, res) => {
  loadDeps();
  const { guildId, applicantId, reviewerId, approved } = req.body;
  const result = guildStorage.reviewApplication({ guildId, applicantId, reviewerId, approved });
  res.json(result);
});

// ============================================================
// 踢出成员
// ============================================================
router.post('/member/kick', (req, res) => {
  loadDeps();
  const { guildId, kickerId, targetId } = req.body;
  const result = guildStorage.kickMember(guildId, kickerId, targetId);
  res.json(result);
});

// ============================================================
// 退出仙盟
// ============================================================
router.post('/leave', (req, res) => {
  loadDeps();
  const { guildId, playerId } = req.body;
  const result = guildStorage.leaveGuild(guildId, playerId);
  res.json(result);
});

// ============================================================
// 转让盟主
// ============================================================
router.post('/transfer', (req, res) => {
  loadDeps();
  const { guildId, currentLeaderId, newLeaderId } = req.body;
  const result = guildStorage.transferLeader(guildId, currentLeaderId, newLeaderId);
  res.json(result);
});

// ============================================================
// 任命/撤销长老
// ============================================================
router.post('/elder', (req, res) => {
  loadDeps();
  const { guildId, leaderId, targetId, isElder } = req.body;
  const result = guildStorage.setElder(guildId, leaderId, targetId, !!isElder);
  res.json(result);
});

// ============================================================
// 修改公告
// ============================================================
router.post('/notice', (req, res) => {
  loadDeps();
  const { guildId, playerId, notice } = req.body;
  const result = guildStorage.updateNotice(guildId, playerId, notice);
  res.json(result);
});

// ============================================================
// 贡献仙盟资金
// ============================================================
router.post('/contribute', (req, res) => {
  loadDeps();
  const { guildId, playerId, amount } = req.body;
  if (!amount || amount <= 0) return res.json({ success: false, message: '请输入有效金额' });
  const result = guildStorage.contributeFund(guildId, playerId, parseInt(amount));
  res.json(result);
});

// ============================================================
// 仙盟建筑
// ============================================================
router.get('/building/:guildId', (req, res) => {
  loadDeps();
  const guildId = parseInt(req.params.guildId);
  const buildings = guildStorage.getBuildings(guildId);
  res.json({ success: true, buildings });
});

router.post('/building/upgrade', (req, res) => {
  loadDeps();
  const { guildId, playerId, buildingKey } = req.body;
  const result = guildStorage.upgradeBuilding(guildId, playerId, buildingKey);
  res.json(result);
});

// ============================================================
// 仙盟技能
// ============================================================
router.get('/skill/:guildId', (req, res) => {
  loadDeps();
  const guildId = parseInt(req.params.guildId);
  const skills = guildStorage.getGuildSkills(guildId);
  res.json({ success: true, skills });
});

router.post('/skill/upgrade', (req, res) => {
  loadDeps();
  const { guildId, playerId, skillId } = req.body;
  const result = guildStorage.upgradeGuildSkill(guildId, playerId, parseInt(skillId));
  res.json(result);
});

// ============================================================
// 仙盟加成
// ============================================================
router.get('/bonus/:guildId', (req, res) => {
  loadDeps();
  const guildId = parseInt(req.params.guildId);
  const playerId = parseInt(req.query.playerId) || 0;
  const bonus = guildStorage.calcGuildBonus(guildId, playerId);
  res.json({ success: true, bonus });
});

// ============================================================
// 仙盟排行榜
// ============================================================
router.get('/rankings/list', (req, res) => {
  loadDeps();
  const limit = parseInt(req.query.limit) || 20;
  const rankings = guildStorage.getGuildRankings(limit);
  res.json({ success: true, rankings });
});

// ============================================================
// 配置信息
// ============================================================
router.get('/config/info', (req, res) => {
  loadDeps();
  res.json({
    success: true,
    config: guildStorage.GUILD_CONFIG,
    buildings: guildStorage.GUILD_BUILDINGS,
    skills: guildStorage.GUILD_SKILLS,
  });
});

module.exports = router;
