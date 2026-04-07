/**
 * achievement.js - 成就系统增强版
 * P1-6: 成就系统重构
 *
 * 新增:
 * - 挑战类成就 (challenge)
 * - 累计类成就 (accumulation)
 * - 称号系统: 成就奖励称号可装备，额外属性加成
 *
 * API:
 *   GET  /api/achievement/list          - 成就列表(含分类)
 *   GET  /api/achievement/titles        - 称号列表
 *   POST /api/achievement/title/equip   - 装备称号
 *   GET  /api/achievement/bonuses       - 当前装备称号的战斗加成
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const Database = require('better-sqlite3');

const Logger = {
  info: (...args) => console.log('[achievement]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[achievement:error]', new Date().toISOString(), ...args)
};

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db;
try {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  Logger.info('数据库连接成功');
} catch (err) {
  Logger.error('数据库连接失败:', err.message);
  db = { prepare: () => ({ run: () => {}, get: () => null, all: () => [] }), exec: () => {} };
}

// ============================================================
// 称号配置：成就奖励的称号，可装备
// ============================================================
const TITLE_TEMPLATES = {
  // 修炼成就奖励称号
  '筑基成功':      { name: '筑基修士',    icon: '🏔️', slot: 'title', effects: { attack: 10,  defense: 5  } },
  '金丹大道':      { name: '金丹真人',    icon: '🌟', slot: 'title', effects: { attack: 25,  defense: 12 } },
  '元婴真君':      { name: '元婴大能',    icon: '👼', slot: 'title', effects: { attack: 50,  defense: 25 } },
  '化神大能':      { name: '化神尊者',    icon: '✨', slot: 'title', effects: { attack: 100, defense: 50 } },
  '炼虚合道':      { name: '炼虚至尊',    icon: '💫', slot: 'title', effects: { attack: 200, defense: 100 } },
  // 战斗成就奖励称号
  '战神降临':      { name: '战神',        icon: '⚔️', slot: 'title', effects: { attack: 80,  crit: 5 } },
  '天下无敌':      { name: '无敌战神',    icon: '🔥', slot: 'title', effects: { attack: 150, crit: 10 } },
  // 装备成就奖励称号
  '神装满身':      { name: '神装收藏家',  icon: '💎', slot: 'title', effects: { defense: 60, hp: 500 } },
  // 副本成就奖励称号
  '江湖高手':      { name: '江湖高手',    icon: '🎌', slot: 'title', effects: { attack: 30, defense: 30 } },
  // 竞技成就奖励称号
  '竞技大师':      { name: '竞技冠军',    icon: '🏆', slot: 'title', effects: { attack: 40, speed: 10 } },
  // 社交成就奖励称号
  '朋友遍天下':    { name: '交际花',      icon: '🌸', slot: 'title', effects: { hp: 200, defense: 20 } },
  // 天梯成就奖励称号
  '飞升成仙':      { name: '飞升仙人',    icon: '🛤️', slot: 'title', effects: { attack: 180, defense: 90, hp: 1000 } },
  // 挑战类成就奖励称号
  '不屈意志':      { name: '不屈勇者',    icon: '🛡️', slot: 'title', effects: { hp: 300, defense: 40 } },
  '极限挑战':      { name: '极限挑战者',  icon: '🔥', slot: 'title', effects: { attack: 60, crit: 8 } },
  // 累计类成就奖励称号
  '灵石达人':      { name: '灵石达人',    icon: '💰', slot: 'title', effects: { lingshi_rate: 0.05 } },
  '修炼狂人':      { name: '修炼狂人',    icon: '🌀', slot: 'title', effects: { cultivation_rate: 0.1 } },
};

// ============================================================
// 成就模板扩展：新增挑战(challenge)和累计(accumulation)分类
// ============================================================
const ACHIEVEMENT_TEMPLATES = [
  // === 修炼类 cultivate ===
  { id: 1,  category: 'cultivate',  name: '初入修仙',       desc: '达到练气期',           target: 2,  reward: { diamonds: 10,  title: null } },
  { id: 2,  category: 'cultivate',  name: '筑基成功',       desc: '达到筑基期',           target: 3,  reward: { diamonds: 50,  title: '筑基成功' } },
  { id: 3,  category: 'cultivate',  name: '金丹大道',       desc: '达到金丹期',           target: 4,  reward: { diamonds: 100, title: '金丹大道' } },
  { id: 4,  category: 'cultivate',  name: '元婴真君',       desc: '达到元婴期',           target: 5,  reward: { diamonds: 200, title: '元婴真君' } },
  { id: 5,  category: 'cultivate',  name: '化神大能',       desc: '达到化神期',           target: 6,  reward: { diamonds: 500, title: '化神大能' } },
  { id: 6,  category: 'cultivate',  name: '炼虚合道',       desc: '达到炼虚期',           target: 7,  reward: { diamonds: 1000, title: '炼虚合道' } },

  // === 战斗类 combat ===
  { id: 10, category: 'combat',     name: '初战告捷',       desc: '赢得1场战斗',          target: 1,  reward: { diamonds: 10,  title: null } },
  { id: 11, category: 'combat',     name: '百战百胜',       desc: '赢得10场战斗',         target: 10, reward: { diamonds: 50,  title: null } },
  { id: 12, category: 'combat',     name: '战神降临',       desc: '赢得100场战斗',        target: 100, reward: { diamonds: 200, title: '战神降临' } },
  { id: 13, category: 'combat',     name: '天下无敌',       desc: '赢得500场战斗',        target: 500, reward: { diamonds: 500, title: '天下无敌' } },

  // === 装备类 equipment ===
  { id: 20, category: 'equipment',  name: '初获装备',       desc: '获得第1件装备',        target: 1,  reward: { diamonds: 10,  title: null } },
  { id: 21, category: 'equipment',  name: '装备收藏家',     desc: '拥有10件装备',         target: 10, reward: { diamonds: 50,  title: null } },
  { id: 22, category: 'equipment',  name: '神装满身',       desc: '拥有50件装备',         target: 50, reward: { diamonds: 200, title: '神装满身' } },

  // === 副本类 chapter ===
  { id: 30, category: 'chapter',    name: '初入江湖',       desc: '通关第1章',            target: 1,  reward: { diamonds: 10,  title: null } },
  { id: 31, category: 'chapter',    name: '江湖新秀',       desc: '通关第5章',            target: 5,  reward: { diamonds: 50,  title: null } },
  { id: 32, category: 'chapter',    name: '江湖高手',       desc: '通关第10章',           target: 10, reward: { diamonds: 100, title: '江湖高手' } },

  // === 竞技类 arena ===
  { id: 40, category: 'arena',      name: '竞技新星',       desc: '进入竞技场前10',       target: 10, reward: { diamonds: 50,  title: null } },
  { id: 41, category: 'arena',      name: '竞技大师',       desc: '获得竞技场冠军',        target: 1,  reward: { diamonds: 200, title: '竞技大师' } },

  // === 社交类 social ===
  { id: 50, category: 'social',     name: '广结善缘',       desc: '拥有5个好友',           target: 5,  reward: { diamonds: 20,  title: null } },
  { id: 51, category: 'social',     name: '朋友遍天下',     desc: '拥有20个好友',         target: 20, reward: { diamonds: 100, title: '朋友遍天下' } },

  // === 天梯类 realm ===
  { id: 60, category: 'realm',      name: '一重天内',       desc: '通关1层天梯',          target: 1,  reward: { diamonds: 30,  title: null } },
  { id: 61, category: 'realm',      name: '九重天内',       desc: '通关9层天梯',          target: 9,  reward: { diamonds: 200, title: null } },
  { id: 62, category: 'realm',      name: '飞升成仙',       desc: '通关全部天梯',          target: 20, reward: { diamonds: 500, title: '飞升成仙' } },

  // === 挑战类 challenge (新增) ===
  { id: 70, category: 'challenge',  name: '极限挑战',       desc: '通关噩梦难度副本',      target: 1,  reward: { diamonds: 300, title: '极限挑战' } },
  { id: 71, category: 'challenge',  name: '不屈意志',       desc: '连续7天登录',          target: 7,  reward: { diamonds: 150, title: '不屈意志' } },
  { id: 72, category: 'challenge',  name: '一命通关',       desc: '无伤通关任意副本',     target: 1,  reward: { diamonds: 500, title: null } },
  { id: 73, category: 'challenge',  name: '速战速决',       desc: '3回合内击败Boss',      target: 1,  reward: { diamonds: 200, title: null } },
  { id: 74, category: 'challenge',  name: '万人敌',         desc: '单次战斗造成10000伤害', target: 10000, reward: { diamonds: 300, title: null } },

  // === 累计类 accumulation (新增) ===
  { id: 80, category: 'accumulation', name: '灵石达人',     desc: '累计消耗100000灵石',   target: 100000, reward: { diamonds: 100, title: '灵石达人' } },
  { id: 81, category: 'accumulation', name: '灵石富豪',     desc: '累计消耗1000000灵石',  target: 1000000, reward: { diamonds: 500, title: null } },
  { id: 82, category: 'accumulation', name: '修炼狂人',     desc: '累计修炼10000次',      target: 10000, reward: { diamonds: 200, title: '修炼狂人' } },
  { id: 83, category: 'accumulation', name: '挂机之王',     desc: '离线挂机满24小时',     target: 24,   reward: { diamonds: 150, title: null } },
  { id: 84, category: 'accumulation', name: '击杀一千',     desc: '累计击杀怪物1000只',   target: 1000, reward: { diamonds: 200, title: null } },
  { id: 85, category: 'accumulation', name: '副本探索者',   desc: '通关不同副本50种',     target: 50,   reward: { diamonds: 300, title: null } },
];

const CATEGORY_NAMES = {
  cultivate:     { name: '修炼成就', icon: '🧘' },
  combat:        { name: '战斗成就', icon: '⚔️' },
  equipment:     { name: '装备成就', icon: '🛡️' },
  chapter:       { name: '副本成就', icon: '📜' },
  arena:         { name: '竞技成就', icon: '🏆' },
  social:        { name: '社交成就', icon: '🤝' },
  realm:         { name: '天梯成就', icon: '🛤️' },
  challenge:     { name: '挑战成就', icon: '🔥' },
  accumulation:  { name: '累计成就', icon: '📊' },
};

// ============================================================
// 初始化 player_titles 表
// ============================================================
function initTables() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS player_titles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        title_key TEXT NOT NULL,
        obtained_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(player_id, title_key)
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS player_equipped_title (
        player_id INTEGER PRIMARY KEY,
        title_key TEXT NOT NULL,
        equipped_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    Logger.info('player_titles / player_equipped_title 表初始化完成');
  } catch (e) {
    Logger.error('initTables error:', e.message);
  }
}
initTables();

// ============================================================
// 辅助函数
// ============================================================
function getPlayerId(req) {
  return Number(req.userId || req.query.userId || req.body?.userId || 1);
}

function loadUserProgress(userId) {
  try {
    const rows = db.prepare('SELECT achievement_id, progress, completed, claimed FROM achievement_progress WHERE user_id = ?').all(userId);
    const result = {};
    rows.forEach(row => {
      result[Number(row.achievement_id)] = {
        progress: row.progress || 0,
        completed: !!row.completed,
        claimed: !!row.claimed,
      };
    });
    return result;
  } catch (e) {
    return {};
  }
}

function getPlayerTitles(playerId) {
  try {
    const rows = db.prepare('SELECT title_key, obtained_at FROM player_titles WHERE player_id = ?').all(playerId);
    return rows.map(r => r.title_key);
  } catch (e) {
    return [];
  }
}

function getEquippedTitle(playerId) {
  try {
    const row = db.prepare('SELECT title_key FROM player_equipped_title WHERE player_id = ?').get(playerId);
    return row?.title_key || null;
  } catch (e) {
    return null;
  }
}

function calcTitleBonuses(titleKey) {
  const tpl = TITLE_TEMPLATES[titleKey];
  if (!tpl || !tpl.effects) return {};
  return tpl.effects;
}

// ============================================================
// GET /api/achievement/list - 成就列表
// ============================================================
router.get('/list', (req, res) => {
  const playerId = getPlayerId(req);
  const userProgress = loadUserProgress(playerId);
  const ownedTitles = getPlayerTitles(playerId);
  const equippedTitle = getEquippedTitle(playerId);

  const achievements = ACHIEVEMENT_TEMPLATES.map(ach => {
    const uAch = userProgress[ach.id] || { progress: 0, completed: false, claimed: false };
    const titleReward = ach.reward?.title ? {
      key: ach.reward.title,
      ...(TITLE_TEMPLATES[ach.reward.title] || {}),
      owned: ownedTitles.includes(ach.reward.title),
    } : null;

    return {
      ...ach,
      progress: uAch.progress,
      completed: uAch.completed,
      claimed: uAch.claimed,
      titleReward,
    };
  });

  // 按分类组织
  const categories = {};
  for (const [catKey, catInfo] of Object.entries(CATEGORY_NAMES)) {
    const catAchievements = achievements.filter(a => a.category === catKey);
    if (catAchievements.length > 0) {
      categories[catKey] = {
        ...catInfo,
        achievements: catAchievements,
        total: catAchievements.length,
        completed: catAchievements.filter(a => a.completed).length,
      };
    }
  }

  const totalCompleted = achievements.filter(a => a.completed).length;
  const totalClaimed = achievements.filter(a => a.claimed).length;

  res.json({
    success: true,
    playerId,
    achievements,
    categories,
    stats: {
      total: achievements.length,
      completed: totalCompleted,
      claimed: totalClaimed,
    },
    equippedTitle: equippedTitle ? {
      key: equippedTitle,
      ...(TITLE_TEMPLATES[equippedTitle] || {}),
    } : null,
  });
});

// ============================================================
// GET /api/achievement/titles - 称号列表
// ============================================================
router.get('/titles', (req, res) => {
  const playerId = getPlayerId(req);
  const ownedTitles = getPlayerTitles(playerId);
  const equippedTitle = getEquippedTitle(playerId);

  const allTitles = Object.entries(TITLE_TEMPLATES).map(([key, tpl]) => ({
    key,
    ...tpl,
    owned: ownedTitles.includes(key),
    equipped: equippedTitle === key,
  }));

  res.json({
    success: true,
    playerId,
    titles: allTitles,
    equippedTitle: equippedTitle ? { key: equippedTitle, ...(TITLE_TEMPLATES[equippedTitle] || {}) } : null,
    totalTitles: allTitles.length,
    ownedCount: ownedTitles.length,
  });
});

// ============================================================
// POST /api/achievement/title/equip - 装备称号
// ============================================================
router.post('/title/equip', (req, res) => {
  const playerId = getPlayerId(req);
  const { titleKey } = req.body;

  if (!titleKey) {
    return res.json({ success: false, message: '请指定要装备的称号' });
  }

  const ownedTitles = getPlayerTitles(playerId);
  if (!ownedTitles.includes(titleKey)) {
    return res.json({ success: false, message: '尚未获得此称号' });
  }

  if (!TITLE_TEMPLATES[titleKey]) {
    return res.json({ success: false, message: '称号不存在' });
  }

  try {
    // 如果已装备其他称号，先卸下
    db.prepare('DELETE FROM player_equipped_title WHERE player_id = ?').run(playerId);
    // 装备新称号
    db.prepare('INSERT INTO player_equipped_title (player_id, title_key) VALUES (?, ?)').run(playerId, titleKey);

    const title = TITLE_TEMPLATES[titleKey];
    Logger.info(`[称号装备] playerId=${playerId} title=${titleKey}`);

    res.json({
      success: true,
      message: `成功装备称号: ${titleKey}`,
      equippedTitle: { key: titleKey, ...title },
    });
  } catch (err) {
    Logger.error('POST /title/equip error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// ============================================================
// POST /api/achievement/title/unequip - 卸下称号
// ============================================================
router.post('/title/unequip', (req, res) => {
  const playerId = getPlayerId(req);
  try {
    db.prepare('DELETE FROM player_equipped_title WHERE player_id = ?').run(playerId);
    res.json({ success: true, message: '称号已卸下' });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ============================================================
// GET /api/achievement/bonuses - 当前装备称号的战斗加成
// ============================================================
router.get('/bonuses', (req, res) => {
  const playerId = getPlayerId(req);
  const equippedTitle = getEquippedTitle(playerId);

  if (!equippedTitle) {
    return res.json({ success: true, playerId, equipped: false, bonuses: {} });
  }

  const title = TITLE_TEMPLATES[equippedTitle] || {};
  const bonuses = calcTitleBonuses(equippedTitle);

  res.json({
    success: true,
    playerId,
    equipped: true,
    equippedTitle: { key: equippedTitle, ...title },
    bonuses,
  });
});

// ============================================================
// POST /api/achievement/progress - 更新成就进度（供其他系统调用）
// ============================================================
router.post('/progress', (req, res) => {
  const { playerId, category, value } = req.body;
  const pid = Number(playerId) || 1;

  try {
    // 找到对应 category 的成就，更新进度
    const templates = ACHIEVEMENT_TEMPLATES.filter(t => t.category === category);
    const results = [];

    for (const tpl of templates) {
      // 检查进度记录
      let row = db.prepare('SELECT * FROM achievement_progress WHERE user_id = ? AND achievement_id = ?').get(pid, tpl.id);
      if (!row) {
        db.prepare('INSERT INTO achievement_progress (user_id, achievement_id, progress, completed, claimed) VALUES (?, ?, 0, 0, 0)').run(pid, tpl.id);
        row = db.prepare('SELECT * FROM achievement_progress WHERE user_id = ? AND achievement_id = ?').get(pid, tpl.id);
      }

      if (row.completed) continue; // 已完成跳过

      const newProgress = Math.max(row.progress || 0, value);
      const completed = newProgress >= tpl.target;

      if (completed && !row.completed) {
        db.prepare('UPDATE achievement_progress SET progress = ?, completed = 1 WHERE user_id = ? AND achievement_id = ?').run(newProgress, pid, tpl.id);
        results.push({ id: tpl.id, name: tpl.name, completed: true, titleReward: tpl.reward?.title || null });
      } else if (newProgress !== row.progress) {
        db.prepare('UPDATE achievement_progress SET progress = ? WHERE user_id = ? AND achievement_id = ?').run(newProgress, pid, tpl.id);
      }
    }

    res.json({ success: true, updated: results });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

module.exports = router;
