/**
 * 功法系统 API 路由
 * 提供功法学习/装备/列表等 RESTful API
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
  initGongfaTables();
} catch (e) {
  console.log('[gongfa] DB连接失败:', e.message);
  db = null;
}

function initGongfaTables() {
  if (!db) return;
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS player_gongfa (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        gongfa_id INTEGER NOT NULL,
        gongfa_name TEXT,
        gongfa_type TEXT,
        level INTEGER DEFAULT 1,
        is_equipped INTEGER DEFAULT 0,
        learned_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, gongfa_id)
      );
    `);
  } catch (e) {
    console.error('[gongfa] 建表失败:', e.message);
  }
}

// 功法模板
const GONGFAS = [
  // 攻击系
  { id: 1, name: '九天真元诀', type: 'attack', level: 1, attackBonus: 50, desc: '提升基础攻击力50点', cost: 1000 },
  { id: 2, name: '烈焰焚天诀', type: 'attack', level: 2, attackBonus: 120, desc: '提升基础攻击力120点', cost: 5000 },
  { id: 3, name: '天雷破空诀', type: 'attack', level: 3, attackBonus: 300, desc: '提升基础攻击力300点', cost: 20000 },
  { id: 4, name: '混沌灭世诀', type: 'attack', level: 4, attackBonus: 800, desc: '提升基础攻击力800点', cost: 100000 },
  // 防御系
  { id: 5, name: '金刚护体术', type: 'defense', level: 1, defenseBonus: 30, desc: '提升基础防御力30点', cost: 800 },
  { id: 6, name: '玄冥护甲诀', type: 'defense', level: 2, defenseBonus: 80, desc: '提升基础防御力80点', cost: 4000 },
  { id: 7, name: '天地护元术', type: 'defense', level: 3, defenseBonus: 200, desc: '提升基础防御力200点', cost: 15000 },
  // 生命系
  { id: 8, name: '生生不息诀', type: 'hp', level: 1, hpBonus: 500, desc: '提升最大生命值500点', cost: 800 },
  { id: 9, name: '造化长春功', type: 'hp', level: 2, hpBonus: 1500, desc: '提升最大生命值1500点', cost: 5000 },
  { id: 10, name: '不死凤凰诀', type: 'hp', level: 3, hpBonus: 5000, desc: '提升最大生命值5000点', cost: 30000 },
  // 速度系
  { id: 11, name: '流光掠影术', type: 'speed', level: 1, speedBonus: 5, desc: '提升速度5点', cost: 600 },
  { id: 12, name: '瞬风千里诀', type: 'speed', level: 2, speedBonus: 15, desc: '提升速度15点', cost: 3000 },
];

// 玩家已学功法映射（内存缓存）
const playerGongfaCache = {};

function getPlayerGongfa(userId) {
  if (!db) return [];
  try {
    const rows = db.prepare('SELECT * FROM player_gongfa WHERE user_id = ?').all(userId);
    return rows;
  } catch (e) {
    return [];
  }
}

function syncGongfaToCache(userId) {
  playerGongfaCache[userId] = getPlayerGongfa(userId);
}

/**
 * GET /api/gongfa/list
 * 获取功法列表（模板 + 玩家已学状态）
 */
router.get('/list', (req, res) => {
  const userId = parseInt(req.query.userId) || 1;
  
  // 获取玩家已学功法
  const learned = getPlayerGongfa(userId);
  const learnedIds = new Set(learned.map(g => g.gongfa_id));
  const equippedIds = new Set(learned.filter(g => g.is_equipped).map(g => g.gongfa_id));
  
  const list = GONGFAS.map(g => ({
    ...g,
    learned: learnedIds.has(g.id),
    equipped: equippedIds.has(g.id),
    // 如果已学，附加玩家学习的等级
    playerLevel: learned.find(l => l.gongfa_id === g.id)?.level || null
  }));
  
  res.json({ success: true, gongfas: list });
});

/**
 * POST /api/gongfa/learn
 * 学习功法
 */
router.post('/learn', (req, res) => {
  const userId = parseInt(req.body.userId) || 1;
  const gongfaId = parseInt(req.body.gongfaId);
  
  if (!gongfaId) return res.json({ success: false, message: '缺少gongfaId' });
  
  const template = GONGFAS.find(g => g.id === gongfaId);
  if (!template) return res.json({ success: false, message: '功法不存在' });
  
  // 检查灵石
  if (db) {
    try {
      const user = db.prepare('SELECT lingshi FROM Users WHERE id = ?').get(userId);
      if (!user || user.lingshi < template.cost) {
        return res.json({ success: false, message: '灵石不足' });
      }
      
      // 扣除灵石
      db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(template.cost, userId);
      
      // 写入 player_gongfa（REPLACE on conflict）
      db.prepare(`
        INSERT OR REPLACE INTO player_gongfa (user_id, gongfa_id, gongfa_name, gongfa_type, level, is_equipped, learned_at)
        VALUES (?, ?, ?, ?, 1, 0, CURRENT_TIMESTAMP)
      `).run(userId, template.id, template.name, template.type);
      
      syncGongfaToCache(userId);
      
      res.json({ success: true, message: `成功学习【${template.name}】`, cost: template.cost });
    } catch (e) {
      console.error('[gongfa] learn错误:', e.message);
      res.json({ success: false, message: e.message });
    }
  } else {
    res.json({ success: false, message: '数据库未连接' });
  }
});

/**
 * POST /api/gongfa/equip
 * 装备功法（最多同时装备3个）
 */
router.post('/equip', (req, res) => {
  const userId = parseInt(req.body.userId) || 1;
  const gongfaId = parseInt(req.body.gongfaId);
  const equip = req.body.equip !== false; // 默认装备
  
  if (!gongfaId) return res.json({ success: false, message: '缺少gongfaId' });
  
  if (db) {
    try {
      // 检查是否已学
      const learned = db.prepare('SELECT * FROM player_gongfa WHERE user_id = ? AND gongfa_id = ?').get(userId, gongfaId);
      if (!learned) return res.json({ success: false, message: '尚未学习此功法' });
      
      if (equip) {
        // 检查装备数量（最多3个）
        const equipped = db.prepare('SELECT COUNT(*) as cnt FROM player_gongfa WHERE user_id = ? AND is_equipped = 1').get(userId);
        if (equipped.cnt >= 3) {
          return res.json({ success: false, message: '最多同时装备3个功法' });
        }
        db.prepare('UPDATE player_gongfa SET is_equipped = 1 WHERE id = ?').run(learned.id);
      } else {
        db.prepare('UPDATE player_gongfa SET is_equipped = 0 WHERE id = ?').run(learned.id);
      }
      
      syncGongfaToCache(userId);
      
      const template = GONGFAS.find(g => g.id === gongfaId);
      res.json({ success: true, message: equip ? `已装备【${template?.name}】` : `已卸下【${template?.name}】` });
    } catch (e) {
      console.error('[gongfa] equip错误:', e.message);
      res.json({ success: false, message: e.message });
    }
  } else {
    res.json({ success: false, message: '数据库未连接' });
  }
});

module.exports = router;
