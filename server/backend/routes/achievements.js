/**
 * achievements.js - 成就系统前端兼容路由 (plural)
 * 前端调用 /api/achievements/* 但后端路径是 /api/achievement/*
 * 本文件提供 /api/achievements/list 等端点作为别名
 */
const express = require('express');
const router = express.Router();
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
} catch (e) {
  console.error('[achievements] DB连接失败:', e.message);
}

// 成就配置模板（与 achievement.js 保持一致）
const ACHIEVEMENT_TEMPLATES = [
  { id: 1, category: 'cultivate', name: '初入修仙', desc: '达到练气期', target: 2, reward: { diamonds: 10 } },
  { id: 2, category: 'cultivate', name: '筑基成功', desc: '达到筑基期', target: 3, reward: { diamonds: 50 } },
  { id: 3, category: 'cultivate', name: '金丹大道', desc: '达到金学期', target: 4, reward: { diamonds: 100 } },
  { id: 4, category: 'cultivate', name: '元婴真君', desc: '达到元婴期', target: 5, reward: { diamonds: 200 } },
  { id: 5, category: 'cultivate', name: '化神大能', desc: '达到化神期', target: 6, reward: { diamonds: 500 } },
  { id: 6, category: 'cultivate', name: '炼虚合道', desc: '达到炼虚期', target: 7, reward: { diamonds: 1000 } },
  { id: 10, category: 'combat', name: '初战告捷', desc: '赢得1场战斗', target: 1, reward: { diamonds: 10 } },
  { id: 11, category: 'combat', name: '百战百胜', desc: '赢得10场战斗', target: 10, reward: { diamonds: 50 } },
  { id: 12, category: 'combat', name: '战神降临', desc: '赢得100场战斗', target: 100, reward: { diamonds: 200 } },
  { id: 13, category: 'combat', name: '天下无敌', desc: '赢得500场战斗', target: 500, reward: { diamonds: 500 } },
  { id: 20, category: 'equipment', name: '初获装备', desc: '获得第1件装备', target: 1, reward: { diamonds: 10 } },
  { id: 21, category: 'equipment', name: '装备收藏家', desc: '拥有10件装备', target: 10, reward: { diamonds: 50 } },
  { id: 22, category: 'equipment', name: '神装满身', desc: '拥有50件装备', target: 50, reward: { diamonds: 200 } },
  { id: 30, category: 'chapter', name: '初入江湖', desc: '通关第1章', target: 1, reward: { diamonds: 10 } },
  { id: 31, category: 'chapter', name: '江湖新秀', desc: '通关第5章', target: 5, reward: { diamonds: 50 } },
  { id: 32, category: 'chapter', name: '江湖高手', desc: '通关第10章', target: 10, reward: { diamonds: 100 } },
  { id: 40, category: 'arena', name: '竞技新星', desc: '进入竞技场前10', target: 10, reward: { diamonds: 50 } },
  { id: 41, category: 'arena', name: '竞技大师', desc: '获得竞技场冠军', target: 1, reward: { diamonds: 200 } },
  { id: 50, category: 'social', name: '广结善缘', desc: '拥有5个好友', target: 5, reward: { diamonds: 20 } },
  { id: 51, category: 'social', name: '朋友遍天下', desc: '拥有20个好友', target: 20, reward: { diamonds: 100 } },
  { id: 60, category: 'realm', name: '一重天内', desc: '通关1层天梯', target: 1, reward: { diamonds: 30 } },
  { id: 61, category: 'realm', name: '九重天内', desc: '通关9层天梯', target: 9, reward: { diamonds: 200 } },
  { id: 62, category: 'realm', name: '飞升成仙', desc: '通关全部天梯', target: 20, reward: { diamonds: 500 } },
];

// 统一用户ID提取
function extractUserId(req) {
  return parseInt(req.query.player_id) || parseInt(req.query.userId) || parseInt(req.params.userId) || 1;
}

// 从DB加载用户成就进度
function loadUserProgress(userId) {
  if (!db) return {};
  try {
    const rows = db.prepare('SELECT achievement_id, progress, completed, claimed FROM achievement_progress WHERE user_id = ?').all(userId);
    const result = {};
    rows.forEach(row => {
      result[Number(row.achievement_id)] = {
        progress: row.progress || 0,
        completed: !!row.completed,
        claimed: !!row.claimed
      };
    });
    return result;
  } catch (e) {
    return {};
  }
}

// GET /api/achievements/list?player_id=X → 返回用户成就列表
router.get('/list', (req, res) => {
  const userId = extractUserId(req);
  const userProgress = loadUserProgress(userId);

  const achievements = ACHIEVEMENT_TEMPLATES.map(ach => {
    const uAch = userProgress[ach.id] || { progress: 0, completed: false, claimed: false };
    return {
      ...ach,
      progress: uAch.progress,
      completed: uAch.completed,
      claimed: uAch.claimed
    };
  });

  const categories = {};
  achievements.forEach(ach => {
    if (!categories[ach.category]) categories[ach.category] = [];
    categories[ach.category].push(ach);
  });

  const totalCompleted = achievements.filter(a => a.completed).length;
  const totalClaimed = achievements.filter(a => a.claimed).length;

  res.json({
    achievements,
    categories,
    stats: {
      total: achievements.length,
      completed: totalCompleted,
      claimed: totalClaimed
    }
  });
});

// GET /api/achievements/stats → 成就统计
router.get('/stats', (req, res) => {
  const userId = extractUserId(req);
  const userProgress = loadUserProgress(userId);
  const totalCompleted = Object.values(userProgress).filter(v => v.completed).length;
  const totalClaimed = Object.values(userProgress).filter(v => v.claimed).length;
  res.json({
    success: true,
    stats: {
      total: ACHIEVEMENT_TEMPLATES.length,
      completed: totalCompleted,
      claimed: totalClaimed
    }
  });
});

// POST /api/achievements/claim → 领取成就奖励
router.post('/claim', (req, res) => {
  const { achievementId, playerId } = req.body;
  const userId = playerId || extractUserId(req);
  const achId = parseInt(achievementId);

  if (!db || !achId) {
    return res.json({ success: false, message: '参数错误' });
  }

  try {
    const row = db.prepare('SELECT * FROM achievement_progress WHERE user_id = ? AND achievement_id = ?').get(userId, achId);
    if (!row || !row.completed) {
      return res.json({ success: false, message: '成就未完成' });
    }
    if (row.claimed) {
      return res.json({ success: false, message: '奖励已领取' });
    }

    const ach = ACHIEVEMENT_TEMPLATES.find(a => a.id === achId);
    if (!ach) {
      return res.json({ success: false, message: '成就不存在' });
    }

    // 发放奖励
    const diamonds = ach.reward?.diamonds || 0;
    if (diamonds > 0) {
      db.prepare('UPDATE Users SET diamonds = diamonds + ? WHERE id = ?').run(diamonds, userId);
    }

    // 标记已领取
    db.prepare('UPDATE achievement_progress SET claimed = 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND achievement_id = ?').run(userId, achId);

    res.json({ success: true, message: '奖励领取成功', diamonds });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// GET /api/achievements/progress/:achievementId → 单个成就进度
router.get('/progress/:achievementId', (req, res) => {
  const achievementId = parseInt(req.params.achievementId);
  const userId = extractUserId(req);
  const userProgress = loadUserProgress(userId);
  const uAch = userProgress[achievementId] || { progress: 0, completed: false, claimed: false };
  const ach = ACHIEVEMENT_TEMPLATES.find(a => a.id === achievementId) || {};
  res.json({
    success: true,
    achievement: { ...ach, ...uAch }
  });
});

module.exports = router;
